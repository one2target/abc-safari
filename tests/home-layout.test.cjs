const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');

const html=fs.readFileSync(path.resolve(__dirname,'../play/index.html'),'utf8');

// The complete Training/Profile stylesheets are intentionally lazy. Their
// home-only declarations must therefore remain in the critical inline CSS.
assert.match(html,/\.home-actions\s*>\s*\.marius-home-button\s*\{[^}]*margin-top:14px[^}]*linear-gradient\(135deg,#7961bd,#5d4aa0\)/s);
assert.match(html,/\.home-actions\s*>\s*\.training-home-card\s*\{[^}]*width:100%[^}]*margin-top:18px/s);
assert.match(html,/\.home-actions\s*>\s*\.training-home-card\s+\.training-button\s*\{[^}]*linear-gradient\(135deg,#ef7b45,#e6a825\)/s);
assert.match(html,/\.home-actions\s*>\s*\.training-home-card p\s*\{[^}]*margin:11px 0 0/s);
assert.match(html,/@media\(max-width:650px\)\s*\{\s*\.home-actions\s*>\s*\.training-home-card\s*\{\s*margin-top:12px/s);

const renderHome=html.match(/function renderHome\(\)\{return `([\s\S]*?)`;\}/)?.[1]||'';
const order=['data-action="start"','data-action="open-profile"','renderTrainingHomeCard()'];
assert.ok(order.every(item=>renderHome.includes(item)));
assert.ok(order.every((item,index)=>index===0||renderHome.indexOf(order[index-1])<renderHome.indexOf(item)));

const baselineDir=path.resolve(__dirname,'visual-baselines/home');
const manifest=JSON.parse(fs.readFileSync(path.join(baselineDir,'manifest.json'),'utf8'));
const expectedSizes=[{width:1440,height:900},{width:390,height:844},{width:320,height:568}];
const expectedNames=['locked','unlocked'].flatMap(state=>expectedSizes.map(size=>`home-${state}-${size.width}x${size.height}.jpg`));
assert.equal(manifest.source,'https://abcsafari.ru/play/');
assert.equal(manifest.format,'image/jpeg');
assert.deepEqual(manifest.states,['locked','unlocked']);
assert.deepEqual(manifest.sizes,expectedSizes);
assert.deepEqual(manifest.baselines.map(entry=>entry.name).sort(),[...expectedNames].sort());
for(const entry of manifest.baselines){
 const file=path.join(baselineDir,entry.name),data=fs.readFileSync(file);
 assert.deepEqual([...data.subarray(0,3)],[0xff,0xd8,0xff],`${entry.name} is not a JPEG`);
 assert.equal(data.length,entry.bytes,`${entry.name} byte length changed`);
 assert.equal(crypto.createHash('sha256').update(data).digest('hex'),entry.sha256,`${entry.name} hash changed`);
}

console.log(JSON.stringify({
  passed:true,
  mariusButtonGapPx:14,
  trainingButtonGapPx:{desktop:18,mobile:12},
  trainingCaptionGapPx:11,
  criticalLazyStyleFallback:true,
  productionVisualBaselines:expectedNames.length,
  designAndActionsPreserved:true
},null,2));
