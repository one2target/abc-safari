const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const pages=['index.html','play/index.html','about/index.html','contacts/index.html','privacy/index.html','articles/angliyskiy-alfavit-dlya-detey/index.html'];
const count=(text,pattern)=>(text.match(pattern)||[]).length;

for(const page of pages){
 const html=fs.readFileSync(path.join(root,page),'utf8');
 assert.equal(count(html,/type:\s*"pageView"/g),1,`${page} must contain one VK pageView`);
 assert.equal(count(html,/https:\/\/top-fwz1\.mail\.ru\/js\/code\.js/g),1,`${page} must load the VK counter once`);
 assert.equal(count(html,/https:\/\/top-fwz1\.mail\.ru\/counter\?id=3799663;js=na/g),1,`${page} must contain one VK noscript fallback`);

 const match=html.match(/<!-- Top\.Mail\.Ru counter -->\s*<script type="text\/javascript">([\s\S]*?)<\/script>\s*<!-- \/Top\.Mail\.Ru counter -->/);
 assert.ok(match,`${page} must contain the VK counter block`);

 const elements=new Map(),inserted=[];
 const firstScript={parentNode:{insertBefore(node){inserted.push(node);elements.set(node.id,node);}}};
 const document={
  getElementById:id=>elements.get(id)||null,
  createElement:()=>({}),
  getElementsByTagName:name=>name==='script'?[firstScript]:[],
  addEventListener(){}
 };
 const window={};
 vm.runInNewContext(match[1],{document,window,Date});

 assert.equal(window._tmr.length,1,`${page} must enqueue one pageView`);
 assert.equal(window._tmr[0].id,'3799663');
 assert.equal(window._tmr[0].type,'pageView');
 assert.equal(typeof window._tmr[0].start,'number');
 assert.equal(inserted.length,1,`${page} must insert one counter script`);
 assert.equal(inserted[0].id,'tmr-code');
 assert.equal(inserted[0].src,'https://top-fwz1.mail.ru/js/code.js');
 assert.equal(inserted[0].async,true);
}

const play=fs.readFileSync(path.join(root,'play/index.html'),'utf8');
assert.equal(count(play,/function sendVkGoal\(/g),1,'sendVkGoal must be defined once');
assert.equal(count(play,/sendVkGoal\('startLearning'\)/g),1,'startLearning must have one call site');
assert.equal(count(play,/sendVkGoal\('startTraining'\)/g),1,'startTraining must have one call site');
assert.equal(count(play,/sendVkGoal\('completeLetter'\)/g),1,'completeLetter must have one call site');

console.log(JSON.stringify({
 passed:true,
 counterId:'3799663',
 pages,
 pageViewsPerPage:1,
 loaderScriptsPerPage:1,
 noscriptFallbacksPerPage:1,
 sendVkGoalDefinitions:1,
 eventCallSites:['startLearning','startTraining','completeLetter']
},null,2));
