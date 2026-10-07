const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const pages=['index.html','play/index.html','about/index.html','contacts/index.html','privacy/index.html','articles/angliyskiy-alfavit-dlya-detey/index.html'];
const count=(text,pattern)=>(text.match(pattern)||[]).length;

for(const page of pages){
 const html=fs.readFileSync(path.join(root,page),'utf8');
 assert.equal(count(html,/\/analytics-consent\.js\?v=consent-v1/g),1,`${page} must load the shared consent module once`);
 assert.equal(count(html,/\/analytics-consent\.css\?v=consent-v1/g),1,`${page} must load the shared consent styles once`);
 assert.equal(count(html,/mc\.yandex\.ru|top-fwz1\.mail\.ru/g),0,`${page} must not load optional trackers before consent`);
 assert.equal(count(html,/type:\s*["']pageView["']/g),0,`${page} must not enqueue pageView inline`);
}

const analytics=fs.readFileSync(path.join(root,'analytics-consent.js'),'utf8');
assert.match(analytics,/const VK_COUNTER_ID=3799663/);
assert.match(analytics,/src='https:\/\/top-fwz1\.mail\.ru\/js\/code\.js'/);
assert.match(analytics,/type:'pageView'/);
assert.match(analytics,/\[EVENTS\.START_LEARNING\]:'startLearning'/);
assert.match(analytics,/\[EVENTS\.START_TRAINING\]:'startTraining'/);
assert.match(analytics,/\[EVENTS\.LEGACY_LETTER_COMPLETED\]:'completeLetter'/);

console.log(JSON.stringify({
 passed:true,
 counterId:'3799663',
 pages,
 sharedConsentModule:true,
 optionalTrackersAbsentFromHtml:true,
 legacyVkGoals:['startLearning','startTraining','completeLetter']
},null,2));
