const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'analytics-consent.js'),'utf8');
const privacy=fs.readFileSync(path.join(root,'privacy/index.html'),'utf8');
const CONSENT_KEY='abc-safari-analytics-consent-v1';
const savedConsent=(status,decidedAt='2026-10-07T00:00:00.000Z')=>JSON.stringify({status,version:'1',decidedAt});
const storedConsent=layer=>JSON.parse(layer.store.get(CONSENT_KEY));

function loadLayer({saved,search=''}={}){
 const store=new Map(saved?[[CONSENT_KEY,saved]]:[]),elements=new Map(),scripts=[],listeners={},logs=[];
 const makeButton=()=>({addEventListener(type,handler){this[type]=handler;},focus(){this.focused=true;}});
 const document={
  readyState:'loading',referrer:'https://example.test/',
  head:{appendChild(node){scripts.push(node);if(node.id)elements.set(node.id,node);}},
  body:{appendChild(node){if(node.id)elements.set(node.id,node);}},
  getElementById:id=>elements.get(id)||null,
  createElement(tag){
   const node={tagName:tag.toUpperCase(),setAttribute(){},remove(){if(this.id)elements.delete(this.id);}};
   if(tag==='aside'){
    const allow=makeButton(),deny=makeButton();
    node.querySelector=selector=>selector.includes('__deny')?deny:selector.includes('__allow')||selector.includes('is-current')?allow:null;
    node.buttons={allow,deny};
   }
   return node;
  },
  addEventListener(type,handler){listeners[type]=handler;}
 };
 const window={
  document,location:{search,href:`https://abcsafari.ru/play/${search}`},
  localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},
  console:{log(...args){logs.push(args);},warn(...args){logs.push(args);}}
 };
 vm.runInNewContext(source,{window,document,URLSearchParams,Date,Set,Object,Array,Number,String,Boolean,Math});
 return {window,document,store,elements,scripts,listeners,logs};
}

const denied=loadLayer();
assert.equal(denied.window.ABCAnalytics.getStatus(),'unknown');
assert.equal(denied.scripts.length,0,'unknown consent must not load trackers');
assert.equal(denied.window.ABCAnalytics.trackEvent('start_learning'),true);
assert.equal(denied.window.ABCAnalytics.getQueuedEventCount(),1);
denied.window.ABCAnalytics.deny();
assert.equal(storedConsent(denied).status,'denied');
assert.equal(storedConsent(denied).version,'1');
assert.ok(!Number.isNaN(Date.parse(storedConsent(denied).decidedAt)));
assert.equal(denied.window.ABCAnalytics.getQueuedEventCount(),0);
assert.equal(denied.scripts.length,0,'denial must keep trackers unloaded');
assert.equal(denied.window.ABCAnalytics.trackEvent('letter_started',{letter:'A'}),false);

const allowed=loadLayer();
allowed.window.ABCAnalytics.trackEvent('start_learning');
allowed.window.ABCAnalytics.trackEvent('letter_started',{letter:'A'});
allowed.window.ABCAnalytics.allow();
assert.equal(storedConsent(allowed).status,'allowed');
assert.deepEqual(allowed.scripts.map(script=>script.src),[
 'https://mc.yandex.ru/metrika/tag.js?id=113436900',
 'https://top-fwz1.mail.ru/js/code.js'
]);
const ymCalls=allowed.window.ym.a.map(args=>Array.from(args));
assert.equal(ymCalls[0][1],'init');
assert.equal(ymCalls[0][2].webvisor,true);
assert.equal(ymCalls[0][2].ecommerce,'dataLayer');
assert.equal(JSON.stringify(ymCalls.slice(1).map(call=>call.slice(1))),JSON.stringify([
 ['reachGoal','start_learning'],
 ['reachGoal','letter_started',{letter:'A'}]
]));
assert.equal(JSON.stringify(allowed.window._tmr.map(item=>item.type)),JSON.stringify(['pageView','reachGoal','reachGoal']));
assert.equal(JSON.stringify(allowed.window._tmr.slice(1).map(item=>item.goal)),JSON.stringify(['startLearning','letter_started']));

const allowedToDenied=loadLayer({saved:savedConsent('allowed')});
assert.equal(allowedToDenied.scripts.length,2);
assert.equal(allowedToDenied.window.openAnalyticsSettings(),true);
let settings=allowedToDenied.elements.get('analytics-consent');
assert.match(settings.innerHTML,/Текущий выбор: <b>Разрешена аналитика<\/b>/);
assert.match(settings.innerHTML,/analytics-consent__allow is-current/);
const ymBeforeDeny=allowedToDenied.window.ym.a.length,vkBeforeDeny=allowedToDenied.window._tmr.length;
settings.buttons.deny.click();
assert.equal(storedConsent(allowedToDenied).status,'denied');
assert.equal(allowedToDenied.window.ABCAnalytics.trackEvent('letter_started',{letter:'B'}),false);
assert.equal(allowedToDenied.window.ym.a.length,ymBeforeDeny,'denied must stop further Yandex custom events');
assert.equal(allowedToDenied.window._tmr.length,vkBeforeDeny,'denied must stop further VK custom events');
assert.equal(allowedToDenied.window.ABCAnalytics.getQueuedEventCount(),0);
allowedToDenied.window.openAnalyticsSettings();
settings=allowedToDenied.elements.get('analytics-consent');
assert.match(settings.innerHTML,/Текущий выбор: <b>Только необходимые<\/b>/);
assert.match(settings.innerHTML,/analytics-consent__deny is-current/);
const deniedAfterReload=loadLayer({saved:allowedToDenied.store.get(CONSENT_KEY)});
assert.equal(deniedAfterReload.scripts.length,0,'reload after allowed → denied must not load trackers');
assert.equal(deniedAfterReload.listeners.DOMContentLoaded,undefined,'saved denial must not ask again on reload');

const deniedToAllowed=loadLayer({saved:savedConsent('denied')});
assert.equal(deniedToAllowed.scripts.length,0);
deniedToAllowed.window.ABCAnalytics.openAnalyticsSettings();
settings=deniedToAllowed.elements.get('analytics-consent');
assert.match(settings.innerHTML,/Текущий выбор: <b>Только необходимые<\/b>/);
settings.buttons.allow.click();
assert.equal(storedConsent(deniedToAllowed).status,'allowed');
assert.equal(deniedToAllowed.scripts.length,2,'denied → allowed must start both trackers');
deniedToAllowed.window.ABCAnalytics.openAnalyticsSettings();
settings=deniedToAllowed.elements.get('analytics-consent');
assert.match(settings.innerHTML,/Текущий выбор: <b>Разрешена аналитика<\/b>/);
const allowedAfterReload=loadLayer({saved:deniedToAllowed.store.get(CONSENT_KEY)});
assert.equal(allowedAfterReload.scripts.length,2,'reload after denied → allowed must start both trackers');
assert.equal(allowedAfterReload.listeners.DOMContentLoaded,undefined,'saved consent must not ask again on reload');

const legacy=loadLayer({saved:'allowed'});
assert.equal(storedConsent(legacy).status,'allowed','legacy string consent must migrate');
assert.equal(storedConsent(legacy).version,'1');
assert.ok(!Number.isNaN(Date.parse(storedConsent(legacy).decidedAt)));
assert.equal(legacy.scripts.length,2,'legacy allowed consent must keep working during migration');

const banner=loadLayer();
banner.listeners.DOMContentLoaded();
assert.ok(banner.elements.get('analytics-consent'),'first visit must render the consent banner');
assert.match(banner.elements.get('analytics-consent').innerHTML,/Разрешить аналитику/);
assert.match(banner.elements.get('analytics-consent').innerHTML,/Только необходимые/);

assert.match(privacy,/data-analytics-settings/,'privacy page must contain the shared settings trigger');
assert.match(privacy,/>Настройки аналитики<\/button>/);

const debug=loadLayer({saved:savedConsent('denied'),search:'?analytics_debug=1'});
debug.window.ABCAnalytics.trackEvent('activity_completed',{activity:'maze_def',mistakes_bucket:'3_5',hints_used:true,email:'child@example.test'});
assert.deepEqual(debug.logs[0].slice(0,2),['[Analytics]','activity_completed']);
assert.equal(debug.logs[0][2].email,undefined,'unknown and personal-looking params must be dropped');
debug.window.ABCAnalytics.trackEvent('reward_received',{reward:'child_name',source:'parent_name'});
assert.equal(Object.keys(debug.logs[1][2]).length,0,'reward and source accept only centralized product IDs');

console.log(JSON.stringify({
 passed:true,
 structuredConsent:true,
 legacyConsentMigrated:true,
 allowedToDenied:true,
 deniedToAllowed:true,
 reloadRespectsChangedChoice:true,
 repeatedOpenShowsCurrentState:true,
 furtherCustomEventsStopOnDeny:true,
 webvisorPreserved:true,
 ecommerceDataLayerPreserved:true,
 debugMode:true
},null,2));
