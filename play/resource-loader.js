'use strict';

/* Course-aware loader. Background fetches populate the normal HTTP cache;
   scripts and styles are only executed/applied when their screen is opened. */
const ResourceLoader=(()=>{
  const registry=window.RESOURCE_REGISTRY;
  const fetched=new Map(),audioCache=new Map(),executedScripts=new Set(),appliedStyles=new Set(),queue=[];
  const runtimePromises=new Map(),sectionPromises=new Map();
  const telemetry={backgroundStartedAt:null,backgroundCompletedAt:null,backgroundBytes:0,criticalBytes:0,requests:0,failures:0,groups:[]};
  const activeBackground=new Map(),criticalTokens=new Set();
  let active=0,backgroundSpent=0,idleStarted=false,criticalSerial=0;
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection||{};
  const effectiveType=String(connection.effectiveType||'4g');
  const slow=connection.saveData===true||['slow-2g','2g'].includes(effectiveType);
  const medium=effectiveType==='3g';
  const concurrency=slow?1:medium?2:3;
  const backgroundBudget=connection.saveData===true?0:slow?768*1024:medium?4*1024*1024:32*1024*1024;
  const tierOrder={first:0,lesson:1,runtime:2,game:3,reward:4,feedback:5,section:6,core:7};
  const absolute=url=>new URL(url,document.baseURI).href;
  const resources=group=>registry?.groups?.[group]||[];
  const now=()=>globalThis.performance?.now?.()||Date.now();

  function syncTelemetry(){
    const root=document.documentElement;if(!root)return;
    root.dataset.resourceLoader='ready';
    root.dataset.resourceEffectiveType=effectiveType;
    root.dataset.resourceConcurrency=String(concurrency);
    root.dataset.resourceBackgroundBudget=String(backgroundBudget);
    root.dataset.resourceBackgroundBytes=String(telemetry.backgroundBytes);
    root.dataset.resourceCriticalBytes=String(telemetry.criticalBytes);
    root.dataset.resourceRequests=String(telemetry.requests);
    root.dataset.resourceFailures=String(telemetry.failures);
    root.dataset.resourceBackgroundGroups=telemetry.groups.map(entry=>entry.group).join(',');
    root.dataset.resourceBackgroundStartedAt=telemetry.backgroundStartedAt==null?'':telemetry.backgroundStartedAt.toFixed(1);
    root.dataset.resourceBackgroundCompletedAt=telemetry.backgroundCompletedAt==null?'':telemetry.backgroundCompletedAt.toFixed(1);
    root.dataset.resourceBackgroundPaused=String(criticalTokens.size>0);
    root.dataset.resourceCriticalLocks=String(criticalTokens.size);
    root.dataset.resourcePreparedAudio=String(audioCache.size);
  }

  function networkFetch(item,priority='low',signal){
    const url=absolute(item.url);
    if(fetched.has(url))return fetched.get(url);
    const options={cache:'force-cache',credentials:'same-origin',priority};
    if(signal)options.signal=signal;
    const promise=fetch(url,options).then(async response=>{
      if(!response.ok)throw new Error(`Resource ${response.status}: ${url}`);
      const body=await response.arrayBuffer();
      telemetry.requests++;
      const bytes=body.byteLength||Number(response.headers.get('content-length'))||item.bytes||0;
      if(priority==='low')telemetry.backgroundBytes+=bytes;else telemetry.criticalBytes+=bytes;
      syncTelemetry();
      return {url,bytes,ok:true};
    }).catch(error=>{fetched.delete(url);if(error?.name!=='AbortError')telemetry.failures++;syncTelemetry();throw error;});
    fetched.set(url,promise);return promise;
  }

  function beginCritical(label='critical'){
    const token=`${label}:${++criticalSerial}`;
    criticalTokens.add(token);
    for(const controller of activeBackground.keys())controller.abort();
    syncTelemetry();
    return token;
  }

  function endCritical(token){
    if(token)criticalTokens.delete(token);
    syncTelemetry();
    pump();
  }

  function audioAttemptTimeout(){
    if(slow)return 30000;
    if(medium)return 18000;
    return 10000;
  }

  function fetchAudioBlob(source,{priority='high',timeout=audioAttemptTimeout()}={}){
    const url=absolute(source),Controller=globalThis.AbortController,controller=Controller?new Controller():null;
    let timer=null;
    if(controller)timer=setTimeout(()=>controller.abort(),timeout);
    const options={cache:'force-cache',credentials:'same-origin',priority};
    if(controller)options.signal=controller.signal;
    return fetch(url,options).then(async response=>{
      if(!response.ok)throw new Error(`Audio ${response.status}: ${url}`);
      const blob=typeof response.blob==='function'
        ?await response.blob()
        :new Blob([await response.arrayBuffer()],{type:response.headers?.get?.('content-type')||'audio/mpeg'});
      telemetry.requests++;
      telemetry.criticalBytes+=blob.size;
      syncTelemetry();
      return {url,bytes:blob.size,objectUrl:URL.createObjectURL(blob)};
    }).finally(()=>clearTimeout(timer));
  }

  function prepareAudio(source,{priority='high',retries=1,onRetry}={}){
    const url=absolute(source);
    if(audioCache.has(url))return audioCache.get(url);
    const lock=beginCritical('audio');
    const promise=(async()=>{
      let lastError;
      for(let attempt=0;attempt<=retries;attempt++){
        try{return (await fetchAudioBlob(url,{priority})).objectUrl;}
        catch(error){
          lastError=error;
          if(attempt<retries){onRetry?.(attempt+1,error);continue;}
        }
      }
      throw lastError;
    })().catch(error=>{audioCache.delete(url);telemetry.failures++;syncTelemetry();throw error;}).finally(()=>endCritical(lock));
    audioCache.set(url,promise);
    return promise;
  }

  function loadStyle(item){
    const url=absolute(item.url);
    if(appliedStyles.has(url)||[...document.querySelectorAll('link[rel="stylesheet"]')].some(node=>node.href===url))return Promise.resolve(true);
    appliedStyles.add(url);
    return new Promise((resolve,reject)=>{
      const link=document.createElement('link');
      link.rel='stylesheet';link.href=url;link.dataset.resourceGroup='runtime';
      link.onload=()=>resolve(true);link.onerror=()=>{appliedStyles.delete(url);reject(new Error(`Stylesheet failed: ${url}`));};
      document.head.appendChild(link);
    });
  }

  function loadScript(item){
    const url=absolute(item.url);
    if(executedScripts.has(url)||[...document.querySelectorAll('script[src]')].some(node=>node.src===url))return Promise.resolve(true);
    executedScripts.add(url);
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=url;script.async=false;script.dataset.resourceGroup='runtime';
      script.onload=()=>resolve(true);script.onerror=()=>{executedScripts.delete(url);reject(new Error(`Script failed: ${url}`));};
      document.head.appendChild(script);
    });
  }

  function ensureRuntime(group){
    if(runtimePromises.has(group))return runtimePromises.get(group);
    const selected=resources(group).filter(item=>item.tier==='runtime');
    const promise=(async()=>{
      const lock=beginCritical(`runtime-${group}`);
      try{
        await Promise.all(selected.filter(item=>item.type==='style').map(loadStyle));
        for(const item of selected.filter(item=>item.type==='script'))await loadScript(item);
        return true;
      }finally{endCritical(lock);}
    })().catch(error=>{runtimePromises.delete(group);throw error;});
    runtimePromises.set(group,promise);return promise;
  }

  function ensureSection(section){
    if(sectionPromises.has(section))return sectionPromises.get(section);
    const selected=resources(section);
    const promise=(async()=>{
      const lock=beginCritical(`section-${section}`);
      try{
        await Promise.all(selected.filter(item=>item.type==='style').map(loadStyle));
        for(const item of selected.filter(item=>item.type==='script'))await loadScript(item);
        selected.filter(item=>!['style','script','audio'].includes(item.type)).forEach(item=>networkFetch(item,'high').catch(()=>false));
        return true;
      }finally{endCritical(lock);}
    })().catch(error=>{sectionPromises.delete(section);throw error;});
    sectionPromises.set(section,promise);return promise;
  }

  async function warmLetter(letter){
    const group=registry.letterToBlock[letter];if(!group)return Promise.resolve([]);
    const lower=letter.toLowerCase(),own=resources(group).filter(item=>item.type==='audio'&&item.letters?.includes(letter));
    const word=own.find(item=>!item.assetKey.startsWith(`${lower}_`)&&!item.assetKey.endsWith('_ru'));
    const keys=new Set(['new_letter',`${lower}_name`,`${lower}_sound`,word?.assetKey].filter(Boolean));
    const selected=resources(group).filter(item=>item.type==='audio'&&keys.has(item.assetKey));
    const lock=beginCritical(`letter-${letter}`),result=[];
    try{
      // Sequential order guarantees that the first spoken instruction wins even
      // on a single slow connection. Each result is reused by AudioManager.
      for(const item of selected){
        try{result.push({status:'fulfilled',value:await prepareAudio(item.url,{retries:1})});}
        catch(reason){result.push({status:'rejected',reason});}
      }
      return result;
    }finally{endCritical(lock);}
  }

  async function warmGroupScreen(group,mode='lesson'){
    if(mode==='lesson')return Promise.resolve(true);
    const tiers=mode==='reward'?new Set(['reward']):new Set(['game','reward']);
    const selected=resources(group).filter(item=>tiers.has(item.tier)&&!['script','style','audio'].includes(item.type));
    const lock=beginCritical(`screen-${group}`);
    try{await Promise.allSettled(selected.map(item=>networkFetch(item,'high')));return true;}
    finally{endCritical(lock);}
  }

  function pump(){
    if(criticalTokens.size)return;
    while(active<concurrency&&queue.length){
      const job=queue.shift();
      if(!job.budgeted&&backgroundSpent+job.item.bytes>backgroundBudget){job.resolve({skipped:'budget'});continue;}
      if(!job.budgeted){backgroundSpent+=job.item.bytes;job.budgeted=true;}
      const Controller=globalThis.AbortController,controller=Controller?new Controller():null;
      active++;
      if(controller)activeBackground.set(controller,job);
      networkFetch(job.item,'low',controller?.signal).then(job.resolve,error=>{
        if(error?.name==='AbortError')queue.unshift(job);else job.reject(error);
      }).finally(()=>{
        if(controller)activeBackground.delete(controller);
        active--;pump();
        if(!active&&!queue.length)telemetry.backgroundCompletedAt=now();
        syncTelemetry();
      });
    }
  }

  function enqueue(item){
    const url=absolute(item.url);if(fetched.has(url))return fetched.get(url);
    return new Promise((resolve,reject)=>{queue.push({item,resolve,reject});queue.sort((a,b)=>(tierOrder[a.item.tier]??9)-(tierOrder[b.item.tier]??9)||a.item.bytes-b.item.bytes);pump();});
  }

  async function prefetchGroup(group){
    if(!registry.groups[group]||backgroundBudget===0)return {group,skipped:true};
    telemetry.groups.push({group,at:now()});syncTelemetry();
    // Audio is deliberately demand-warmed as Blob URLs. Background fetches of
    // MP3 files caused a second native media GET and competed with playback.
    const selected=resources(group).filter(item=>item.tier!=='section'&&item.tier!=='core'&&item.type!=='audio');
    const result=await Promise.allSettled(selected.map(enqueue));
    return {group,fulfilled:result.filter(item=>item.status==='fulfilled').length,total:selected.length};
  }

  function startBackgroundPlan(currentGroup='ABC'){
    if(idleStarted)return false;idleStarted=true;
    const order=registry.blockOrder,at=Math.max(0,order.indexOf(currentGroup));
    const plan=currentGroup==='ABC'?['ABC','DEF']:[currentGroup,order[at+1]].filter(Boolean);
    let begun=false;
    const start=async()=>{
      if(begun)return;begun=true;
      telemetry.backgroundStartedAt=now();syncTelemetry();
      globalThis.performance?.mark?.('abc-background-prefetch-start');
      for(const group of plan)await prefetchGroup(group);
    };
    const schedule=()=>{
      // Hidden/background tabs do not reliably service requestIdleCallback even
      // with a timeout. The guarded fallback preserves staged preloading after
      // an immediate transition away from home.
      const fallback=setTimeout(start,2200);
      if('requestIdleCallback'in window)requestIdleCallback(()=>{clearTimeout(fallback);start();},{timeout:1800});
      else{clearTimeout(fallback);setTimeout(start,350);}
    };
    if(document.readyState==='complete')schedule();else window.addEventListener('load',schedule,{once:true});
    return true;
  }

  function prefetchNext(group){
    const order=registry.blockOrder,index=order.indexOf(group),next=order[index+1];
    if(!next)return Promise.resolve(false);
    return prefetchGroup(next);
  }

  function groupForIndex(index){return registry.letterToBlock[String.fromCharCode(65+Math.max(0,Math.min(25,index)))]||'ABC';}
  function groupStats(group){const list=resources(group);return {group,count:list.length,bytes:list.reduce((sum,item)=>sum+item.bytes,0),byTier:list.reduce((out,item)=>(out[item.tier]=(out[item.tier]||0)+item.bytes,out),{})};}
  function snapshot(){return {...telemetry,effectiveType,saveData:connection.saveData===true,concurrency,backgroundBudget,backgroundSpent,queued:queue.length,active,backgroundPaused:criticalTokens.size>0,criticalLocks:criticalTokens.size,preparedAudio:audioCache.size,groups:Object.keys(registry.groups).map(groupStats)};}

  // Existing core tags are already applied/executed; mark them for diagnostics.
  document.querySelectorAll('script[src]').forEach(node=>executedScripts.add(node.src));
  document.querySelectorAll('link[rel="stylesheet"]').forEach(node=>appliedStyles.add(node.href));
  syncTelemetry();
  return Object.freeze({ensureRuntime,ensureSection,warmLetter,warmGroupScreen,prepareAudio,beginCritical,endCritical,prefetchGroup,prefetchNext,startBackgroundPlan,groupForIndex,groupStats,snapshot,config:Object.freeze({effectiveType,slow,medium,concurrency,backgroundBudget})});
})();

window.ResourceLoader=ResourceLoader;
