(function(window,document){
  'use strict';

  const CONSENT_KEY='abc-safari-analytics-consent-v1';
  const CONSENT_VERSION='1';
  const STATUS=Object.freeze({UNKNOWN:'unknown',ALLOWED:'allowed',DENIED:'denied'});
  const EVENTS=Object.freeze({
    START_LEARNING:'start_learning',
    LETTER_STARTED:'letter_started',
    LETTER_COMPLETED:'letter_completed',
    LEGACY_LETTER_COMPLETED:'complete_letter',
    ACTIVITY_STARTED:'activity_started',
    ACTIVITY_COMPLETED:'activity_completed',
    REWARD_RECEIVED:'reward_received',
    START_TRAINING:'start_training',
    TRAINING_STARTED:'training_started',
    TRAINING_COMPLETED:'training_completed'
  });
  const ACTIVITIES=Object.freeze({
    ROOM_ABC:'room_abc',
    ABC_CHECK:'abc_check',
    DEF_CHECK:'def_check',
    GHI_CHECK:'ghi_check',
    MAZE_DEF:'maze_def',
    BALLOONS_GHI:'balloons_ghi',
    RIVER_JKL:'river_jkl',
    REVIEW_JKL:'review_jkl',
    REVIEW_MNO:'review_mno',
    REVIEW_PQR:'review_pqr',
    REVIEW_STU:'review_stu',
    REVIEW_VWX:'review_vwx',
    REVIEW_YZ:'review_yz',
    CUMULATIVE_AO:'cumulative_review_ao',
    CUMULATIVE_AU:'cumulative_review_au',
    CUMULATIVE_AZ:'cumulative_review_az',
    FINAL_ALPHABET:'final_alphabet_check'
  });
  const REWARDS=Object.freeze({
    JACKET_STARS:'jacket_stars',
    JACKET_RACER:'jacket_racer',
    ACCESSORY_BOUQUET:'accessory_bouquet',
    ACCESSORY_BALLOON:'accessory_balloon',
    HAT_STRAW_BOW:'hat_straw_bow',
    HAT_ADVENTURE:'hat_adventure'
  });
  const METRIKA_COUNTER_ID=113436900;
  const VK_COUNTER_ID=3799663;
  const EVENT_NAMES=new Set(Object.values(EVENTS));
  const ACTIVITY_IDS=new Set(Object.values(ACTIVITIES));
  const REWARD_IDS=new Set(Object.values(REWARDS));
  const MISTAKE_BUCKETS=new Set(['0','1_2','3_5','6_10','10_plus']);
  const VK_GOALS=Object.freeze({
    [EVENTS.START_LEARNING]:'startLearning',
    [EVENTS.START_TRAINING]:'startTraining',
    [EVENTS.LEGACY_LETTER_COMPLETED]:'completeLetter'
  });
  const queue=[];
  const sentOnce=new Set();
  let trackersStarted=false;
  const storedConsent=readConsent();
  let consentRecord=storedConsent.record;
  let status=consentRecord.status;

  function readConsent(){
    try{
      const saved=window.localStorage?.getItem(CONSENT_KEY);
      if(saved===STATUS.ALLOWED||saved===STATUS.DENIED){
        return {record:createConsentRecord(saved),needsMigration:true};
      }
      const parsed=JSON.parse(saved);
      const validStatus=parsed?.status===STATUS.ALLOWED||parsed?.status===STATUS.DENIED;
      const validDate=typeof parsed?.decidedAt==='string'&&!Number.isNaN(Date.parse(parsed.decidedAt));
      if(validStatus&&parsed.version===CONSENT_VERSION&&validDate){
        return {record:{status:parsed.status,version:parsed.version,decidedAt:parsed.decidedAt},needsMigration:false};
      }
    }catch(_){/* Missing, blocked or unsupported consent is treated as unknown. */}
    return {record:{status:STATUS.UNKNOWN,version:CONSENT_VERSION,decidedAt:null},needsMigration:false};
  }

  function createConsentRecord(value,decidedAt=new Date().toISOString()){
    return {status:value,version:CONSENT_VERSION,decidedAt};
  }

  function persistConsent(record){
    try{window.localStorage?.setItem(CONSENT_KEY,JSON.stringify(record));}catch(_){/* The choice still applies for this page view. */}
  }

  function updateConsent(value){
    status=value;consentRecord=createConsentRecord(value);persistConsent(consentRecord);
    // This record/API is the future synchronization boundary for a parent account backend.
    return status;
  }

  function debugEnabled(){
    try{return new URLSearchParams(window.location?.search||'').get('analytics_debug')==='1';}catch(_){return false;}
  }

  function debug(event,params){
    if(debugEnabled())window.console?.log?.('[Analytics]',event,params);
  }

  function safeToken(value,maxLength=80){
    const token=String(value??'').trim();
    return token.length<=maxLength&&/^[a-z0-9_-]+$/i.test(token)?token:null;
  }

  function sanitizeParams(params){
    if(!params||typeof params!=='object'||Array.isArray(params))return {};
    const safe={};
    if(typeof params.letter==='string'&&/^[A-Z]$/.test(params.letter))safe.letter=params.letter;
    if(typeof params.activity==='string'&&ACTIVITY_IDS.has(params.activity))safe.activity=params.activity;
    if(typeof params.mistakes_bucket==='string'&&MISTAKE_BUCKETS.has(params.mistakes_bucket))safe.mistakes_bucket=params.mistakes_bucket;
    if(typeof params.hints_used==='boolean')safe.hints_used=params.hints_used;
    if(typeof params.reward==='string'&&REWARD_IDS.has(params.reward))safe.reward=params.reward;
    if(typeof params.source==='string'&&ACTIVITY_IDS.has(params.source))safe.source=params.source;
    return safe;
  }

  function loadMetrika(){
    if(typeof window.ym!=='function'){
      window.ym=function(){(window.ym.a=window.ym.a||[]).push(arguments);};
      window.ym.l=Date.now();
    }
    window.ym(METRIKA_COUNTER_ID,'init',{
      ssr:true,
      webvisor:true,
      clickmap:true,
      ecommerce:'dataLayer',
      referrer:document.referrer,
      url:window.location?.href||'',
      accurateTrackBounce:true,
      trackLinks:true
    });
    if(!document.getElementById('yandex-metrika-tag')){
      const script=document.createElement('script');
      script.id='yandex-metrika-tag';script.async=true;
      script.src='https://mc.yandex.ru/metrika/tag.js?id='+METRIKA_COUNTER_ID;
      document.head.appendChild(script);
    }
  }

  function loadVkCounter(){
    const counter=window._tmr||(window._tmr=[]);
    counter.push({id:VK_COUNTER_ID,type:'pageView',start:Date.now()});
    if(!document.getElementById('tmr-code')){
      const script=document.createElement('script');
      script.type='text/javascript';script.async=true;script.id='tmr-code';
      script.src='https://top-fwz1.mail.ru/js/code.js';
      document.head.appendChild(script);
    }
  }

  function startTrackers(){
    if(trackersStarted||status!==STATUS.ALLOWED)return false;
    trackersStarted=true;
    try{loadMetrika();}catch(error){if(debugEnabled())window.console?.warn?.('[Analytics] Yandex Metrika failed',error);}
    try{loadVkCounter();}catch(error){if(debugEnabled())window.console?.warn?.('[Analytics] VK counter failed',error);}
    return true;
  }

  function dispatch(event,params){
    try{
      if(Object.keys(params).length)window.ym?.(METRIKA_COUNTER_ID,'reachGoal',event,params);
      else window.ym?.(METRIKA_COUNTER_ID,'reachGoal',event);
    }catch(error){if(debugEnabled())window.console?.warn?.('[Analytics] Yandex goal failed',event,error);}
    try{
      const counter=window._tmr||(window._tmr=[]);
      counter.push({id:VK_COUNTER_ID,type:'reachGoal',goal:VK_GOALS[event]||event});
    }catch(error){if(debugEnabled())window.console?.warn?.('[Analytics] VK goal failed',event,error);}
  }

  function trackEvent(event,params={},options={}){
    if(!EVENT_NAMES.has(event))return false;
    const safeParams=sanitizeParams(params),onceKey=safeToken(options?.onceKey,120);
    debug(event,safeParams);
    if(onceKey&&sentOnce.has(onceKey))return false;
    if(onceKey)sentOnce.add(onceKey);
    if(status===STATUS.DENIED)return false;
    if(status===STATUS.UNKNOWN){
      if(queue.length<50)queue.push({event,params:safeParams});
      return true;
    }
    startTrackers();dispatch(event,safeParams);return true;
  }

  function removeBanner(){document.getElementById('analytics-consent')?.remove();}

  function allow(){
    updateConsent(STATUS.ALLOWED);removeBanner();startTrackers();
    queue.splice(0).forEach(item=>dispatch(item.event,item.params));
    return status;
  }

  function deny(){
    updateConsent(STATUS.DENIED);queue.length=0;removeBanner();
    return status;
  }

  function renderBanner(force=false){
    const existing=document.getElementById('analytics-consent');
    if(existing){(existing.querySelector('.is-current')||existing.querySelector('.analytics-consent__allow'))?.focus?.();return true;}
    if((status!==STATUS.UNKNOWN&&!force)||!document.body)return false;
    const allowed=status===STATUS.ALLOWED,denied=status===STATUS.DENIED;
    const current=allowed?'Разрешена аналитика':denied?'Только необходимые':'';
    const banner=document.createElement('aside');banner.id='analytics-consent';banner.className='analytics-consent';
    banner.setAttribute('role','region');banner.setAttribute('aria-label','Настройки аналитики');
    banner.innerHTML=`<div class="analytics-consent__copy"><strong>Для взрослого</strong><p>ABC Safari использует аналитику, чтобы понимать, где детям удобно, а где нужна доработка. Без разрешения аналитика не запускается. <a href="/privacy/">Подробнее</a></p>${current?`<p class="analytics-consent__current">Текущий выбор: <b>${current}</b></p>`:''}</div><div class="analytics-consent__actions"><button type="button" class="analytics-consent__allow${allowed?' is-current':''}" aria-pressed="${allowed}">Разрешить аналитику</button><button type="button" class="analytics-consent__deny${denied?' is-current':''}" aria-pressed="${denied}">Только необходимые</button></div>`;
    banner.querySelector('.analytics-consent__allow').addEventListener('click',allow);
    banner.querySelector('.analytics-consent__deny').addEventListener('click',deny);
    document.body.appendChild(banner);
    if(force)(banner.querySelector('.is-current')||banner.querySelector('.analytics-consent__allow'))?.focus?.();
    return true;
  }

  function openAnalyticsSettings(){
    if(!document.body){document.addEventListener('DOMContentLoaded',()=>renderBanner(true),{once:true});return true;}
    return renderBanner(true);
  }

  const api=Object.freeze({CONSENT_KEY,CONSENT_VERSION,STATUS,EVENTS,ACTIVITIES,REWARDS,trackEvent,allow,deny,openAnalyticsSettings,getStatus:()=>status,getConsentRecord:()=>({...consentRecord}),getQueuedEventCount:()=>queue.length,mistakesBucket(value){const count=Math.max(0,Number(value)||0);return count===0?'0':count<=2?'1_2':count<=5?'3_5':count<=10?'6_10':'10_plus';}});
  window.ABCAnalytics=api;
  window.trackEvent=trackEvent;
  window.openAnalyticsSettings=openAnalyticsSettings;

  document.addEventListener('click',event=>{
    if(!event.target?.closest?.('[data-analytics-settings]'))return;
    event.preventDefault();openAnalyticsSettings();
  });

  if(storedConsent.needsMigration)persistConsent(consentRecord);
  if(status===STATUS.ALLOWED)startTrackers();
  else if(status===STATUS.UNKNOWN){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>renderBanner(),{once:true});
    else renderBanner();
  }
})(window,document);
