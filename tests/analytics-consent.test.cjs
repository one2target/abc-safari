const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.resolve(__dirname,'../analytics-consent.js'),'utf8');
const CONSENT_KEY='abc-safari-analytics-consent-v1';

function loadLayer({saved,search=''}={}){
 const store=new Map(saved?[[CONSENT_KEY,saved]]:[]),elements=new Map(),scripts=[],listeners={},logs=[];
 const makeButton=()=>({addEventListener(type,handler){this[type]=handler;}});
 const document={
  readyState:'loading',referrer:'https://example.test/',
  head:{appendChild(node){scripts.push(node);if(node.id)elements.set(node.id,node);}},
  body:{appendChild(node){if(node.id)elements.set(node.id,node);}},
  getElementById:id=>elements.get(id)||null,
  createElement(tag){
   const node={tagName:tag.toUpperCase(),setAttribute(){},remove(){if(this.id)elements.delete(this.id);}};
   if(tag==='aside'){
    const allow=makeButton(),deny=makeButton();
    node.querySelector=selector=>selector.includes('__allow')?allow:selector.includes('__deny')?deny:null;
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
assert.equal(denied.store.get(CONSENT_KEY),'denied');
assert.equal(denied.window.ABCAnalytics.getQueuedEventCount(),0);
assert.equal(denied.scripts.length,0,'denial must keep trackers unloaded');
assert.equal(denied.window.ABCAnalytics.trackEvent('letter_started',{letter:'A'}),false);

const allowed=loadLayer();
allowed.window.ABCAnalytics.trackEvent('start_learning');
allowed.window.ABCAnalytics.trackEvent('letter_started',{letter:'A'});
allowed.window.ABCAnalytics.allow();
assert.equal(allowed.store.get(CONSENT_KEY),'allowed');
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

const allowedReload=loadLayer({saved:'allowed'});
assert.equal(allowedReload.scripts.length,2,'saved consent must start both trackers on reload');
assert.equal(allowedReload.listeners.DOMContentLoaded,undefined,'saved consent must not show the banner again');
const deniedReload=loadLayer({saved:'denied'});
assert.equal(deniedReload.scripts.length,0,'saved denial must keep both trackers off on reload');
assert.equal(deniedReload.listeners.DOMContentLoaded,undefined,'saved denial must not show the banner again');

const banner=loadLayer();
banner.listeners.DOMContentLoaded();
assert.ok(banner.elements.get('analytics-consent'),'first visit must render the consent banner');
assert.match(banner.elements.get('analytics-consent').innerHTML,/Разрешить аналитику/);
assert.match(banner.elements.get('analytics-consent').innerHTML,/Только необходимые/);

const debug=loadLayer({saved:'denied',search:'?analytics_debug=1'});
debug.window.ABCAnalytics.trackEvent('activity_completed',{activity:'maze_def',mistakes_bucket:'3_5',hints_used:true,email:'child@example.test'});
assert.deepEqual(debug.logs[0].slice(0,2),['[Analytics]','activity_completed']);
assert.equal(debug.logs[0][2].email,undefined,'unknown and personal-looking params must be dropped');
debug.window.ABCAnalytics.trackEvent('reward_received',{reward:'child_name',source:'parent_name'});
assert.equal(Object.keys(debug.logs[1][2]).length,0,'reward and source accept only centralized product IDs');

console.log(JSON.stringify({
 passed:true,
 firstVisitNoTrackers:true,
 denyClearsQueue:true,
 allowLoadsAndFlushes:true,
 reloadRespectsChoice:true,
 webvisorPreserved:true,
 ecommerceDataLayerPreserved:true,
 debugMode:true
},null,2));
