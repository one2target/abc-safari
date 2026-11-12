const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const play=path.join(root,'play');
const html=fs.readFileSync(path.join(play,'index.html'),'utf8');
const loaderSource=fs.readFileSync(path.join(play,'resource-loader.js'),'utf8');
const registry=require('../play/resource-registry.js');
const netlifyHeaders=fs.readFileSync(path.join(root,'_headers'),'utf8');

test('registry covers every A-Z block and every listed file exists',()=>{
  const courseGroups=['ABC','DEF','GHI','JKL','MNO','PQR','STU','VWX','YZ'];
  assert.deepEqual(registry.blockOrder,courseGroups);
  assert.deepEqual(Object.keys(registry.letterToBlock),'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
  for(const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')assert.ok(courseGroups.includes(registry.letterToBlock[letter]));
  for(const group of ['core',...courseGroups,'training','profile','shop','wardrobe']){
    assert.ok(registry.groups[group].length>0,`${group} is empty`);
    for(const item of registry.groups[group]){
      const clean=item.url.split('?')[0];
      const file=clean.startsWith('/')?path.join(root,clean.slice(1)):path.resolve(play,clean);
      assert.equal(fs.existsSync(file),true,`${group}: ${item.url}`);
      assert.equal(fs.statSync(file).size,item.bytes,`${group}: stale byte size for ${item.url}`);
    }
  }
  const assetsContext=vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(play,'assets.js'),'utf8')+';globalThis.media=MEDIA_ASSETS;',assetsContext);
  const listedURLs=new Set(Object.values(registry.groups).flat().map(item=>item.url));
  for(const audio of Object.values(assetsContext.media.audio))assert.ok(listedURLs.has(audio.src),`unassigned audio: ${audio.src}`);
  for(const group of courseGroups)assert.ok(registry.groups[group].some(item=>item.assetKey==='new_letter'),`${group}: shared instruction audio missing`);
  assert.ok(registry.groups.VWX.some(item=>item.assetKey==='fox'));
  assert.equal(registry.groups.DEF.some(item=>item.assetKey==='fox'),false);
});

test('late screens are absent from initial HTML and present in their packages',()=>{
  const lateFiles=[
    'hidden-object-game.js','letter-maze-game.js','balloon-pop-game.js','river-crossing-game.js',
    'fruit-rain-game.js','bubble-cannon-game.js','treehouse-stu-game.js','railway-vwx-game.js',
    'flight-yz-game.js','training-engine.js','student-profile.css'
  ];
  for(const file of lateFiles){
    assert.doesNotMatch(html,new RegExp(`<(?:script|link)[^>]+${file.replaceAll('.','\\.')}`));
    assert.ok(Object.values(registry.groups).flat().some(item=>item.url.includes(file)),`${file} missing from registry`);
  }
  assert.match(html,/resource-registry\.js\?v=course-packs-2/);
  assert.match(html,/resource-loader\.js\?v=critical-audio3/);
  assert.ok(registry.groups.core.some(item=>item.assetKey==='giraffe_home'));
  assert.equal(registry.groups.core.some(item=>item.assetKey==='giraffe_base'),false);
  assert.ok(registry.groups.ABC.some(item=>item.assetKey==='giraffe_base'));
});

function loaderContext(connection={effectiveType:'4g',saveData:false}){
  const appended=[],fetchCalls=[];
  const documentElement={dataset:{}};
  const document={
    baseURI:'https://example.test/play/',documentElement,readyState:'complete',
    querySelectorAll:()=>[],
    createElement:tag=>({tagName:tag.toUpperCase(),dataset:{}}),
    head:{appendChild(node){appended.push(node);queueMicrotask(()=>node.onload?.());}}
  };
  const sampleRegistry={
    blockOrder:['ABC','DEF','GHI'],letterToBlock:{A:'ABC',B:'ABC',C:'ABC',D:'DEF',E:'DEF',F:'DEF',G:'GHI'},
    groups:{
      ABC:[
        {url:'./03.mp3',type:'audio',bytes:100,tier:'lesson',assetKey:'new_letter',shared:true},
        {url:'./a-name.mp3',type:'audio',bytes:100,tier:'first',assetKey:'a_name',letters:['A']},
        {url:'./a-sound.mp3',type:'audio',bytes:100,tier:'first',assetKey:'a_sound',letters:['A']},
        {url:'./apple.mp3',type:'audio',bytes:100,tier:'first',assetKey:'apple',letters:['A']},
        {url:'./apple-ru.mp3',type:'audio',bytes:100,tier:'first',assetKey:'apple_ru',letters:['A']},
        {url:'./scene.webp',type:'image',bytes:200,tier:'game'},
        {url:'./abc.js',type:'script',bytes:200,tier:'runtime'}
      ],
      DEF:[{url:'./d.mp3',type:'audio',bytes:300,tier:'lesson',letters:['D']}],GHI:[]
    }
  };
  let clock=10;
  const runIdle=callback=>queueMicrotask(callback);
  const window={RESOURCE_REGISTRY:sampleRegistry,addEventListener(){},requestIdleCallback:runIdle};
  const context=vm.createContext({
    window,document,navigator:{connection},URL,Blob,AbortController,Date,Promise,Object,Map,Set,Array,String,Math,
    globalThis:null,performance:{now:()=>++clock,mark(){}},
    fetch:async(url,options)=>{fetchCalls.push({url:String(url),priority:options.priority});return {ok:true,blob:async()=>new Blob([new Uint8Array(100)],{type:'audio/mpeg'}),arrayBuffer:async()=>new ArrayBuffer(100),headers:{get:()=>null}};},
    requestIdleCallback:runIdle,setTimeout,clearTimeout,queueMicrotask
  });
  context.globalThis=context;
  vm.runInContext(loaderSource,context);
  return {loader:window.ResourceLoader,documentElement,appended,fetchCalls};
}

test('network policy caps concurrency and background budget on slow links',()=>{
  const slow=loaderContext({effectiveType:'2g',saveData:false}).loader.config;
  assert.equal(slow.concurrency,1);
  assert.equal(slow.backgroundBudget,768*1024);
  const medium=loaderContext({effectiveType:'3g',saveData:false}).loader.config;
  assert.equal(medium.concurrency,2);
  assert.equal(medium.backgroundBudget,4*1024*1024);
  const saveData=loaderContext({effectiveType:'4g',saveData:true}).loader.config;
  assert.equal(saveData.concurrency,1);
  assert.equal(saveData.backgroundBudget,0);
});

test('new and returning users start from the relevant packages without executing cached JS',async()=>{
  const fresh=loaderContext();
  assert.equal(fresh.loader.groupForIndex(0),'ABC');
  assert.equal(fresh.loader.groupForIndex(6),'GHI');
  fresh.loader.startBackgroundPlan('ABC');
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(fresh.documentElement.dataset.resourceBackgroundGroups,'ABC,DEF');
  assert.equal(fresh.appended.length,0,'background fetch must not execute a script');

  const returning=loaderContext();
  returning.loader.startBackgroundPlan('DEF');
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(returning.documentElement.dataset.resourceBackgroundGroups,'DEF,GHI');
  assert.equal(returning.appended.length,0);
  await returning.loader.ensureRuntime('ABC');
  assert.equal(returning.appended.filter(node=>node.tagName==='SCRIPT').length,1);
});

test('current-letter audio is prepared once in spoken order and excluded from background packages',async()=>{
  const current=loaderContext();
  const result=await current.loader.warmLetter('A');
  assert.equal(result.every(item=>item.status==='fulfilled'),true);
  assert.deepEqual(current.fetchCalls.map(call=>new URL(call.url).pathname),['/play/03.mp3','/play/a-name.mp3','/play/a-sound.mp3','/play/apple.mp3']);
  assert.equal(current.fetchCalls.every(call=>call.priority==='high'),true);
  await current.loader.warmLetter('A');
  assert.equal(current.fetchCalls.length,4,'prepared Blob URLs must be reused');
  await current.loader.prefetchGroup('ABC');
  assert.equal(current.fetchCalls.some(call=>call.url.endsWith('/scene.webp')),true);
  assert.equal(current.fetchCalls.filter(call=>call.url.endsWith('.mp3')).length,4,'background plan must not refetch audio');
});

test('app warms the current letter before idle package prefetch and keeps section bundles on demand',()=>{
  const init=html.match(/\/\* INIT — current-letter audio starts first; home images follow immediately\. \*\/[\s\S]+?if\(AppState\.started\)saveProgress\(\);/)?.[0]||'';
  assert.ok(init.indexOf('ResourceLoader.warmLetter')<init.indexOf('ResourceLoader.startBackgroundPlan'));
  assert.match(init,/shouldPlan=\['home','course','reward'\]\.includes\(view\)/);
  assert.match(init,/view==='course'\?currentResourceGroup\(\)/);
  assert.match(loaderSource,/connection\.saveData===true\?0/);
  assert.match(loaderSource,/function ensureSection\(section\)/);
  assert.match(loaderSource,/cache:'force-cache'/);
  assert.match(loaderSource,/function prepareAudio\(source/);
  assert.match(loaderSource,/objectUrl:URL\.createObjectURL\(blob\)/);
  assert.match(loaderSource,/item\.type!=='audio'/);
  assert.match(loaderSource,/for\(const controller of activeBackground\.keys\(\)\)controller\.abort\(\)/);
  assert.match(netlifyHeaders,/\/play\/audio\/\*/);
  assert.match(netlifyHeaders,/max-age=604800/);
  assert.match(netlifyHeaders,/\/play\/index\.html[\s\S]+max-age=0, must-revalidate/);
});
