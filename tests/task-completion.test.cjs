const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const rewardPairs={
 reward_abc:['jacket_stars','jacket_racer'],
 reward_def:['accessory_bouquet','accessory_balloon'],
 reward_ghi:['hat_straw_bow','hat_adventure'],
 reward_jkl:['marius_hand_fishing_rod','marius_hand_satchel'],
 reward_mno:['marius_hand_harvest_basket','marius_head_harvest_hat'],
 reward_pqr:['marius_head_cap_blue','marius_bottom_denim'],
 reward_stu:['marius_top_plaid_shirt','marius_vest_harvest'],
 reward_vwx:['marius_outerwear_raincoat','marius_outerwear_field_jacket'],
 reward_yz:['marius_hand_umbrella','marius_hand_lantern']
};

;(async()=>{
 const catalog=createContext();
 assert.deepEqual(JSON.parse(catalog.run('JSON.stringify(Object.fromEntries(rewardConfig.map(reward=>[reward.id,reward.itemIds])))')),rewardPairs);

 // Reward selection is a real preview: ownership, claims and balance change
 // only after explicit confirmation, and the preview survives reload.
 const preview=createContext();
 preview.run("AppState.completedBlocks=['reward_jkl'];AppState.rewardFlow={id:'reward_jkl',resume:'course',selected:null};view='reward';showScreen()");
 const balanceBefore=preview.run('AppState.student.starBalance');
 assert.equal(preview.run("previewReward('marius_hand_fishing_rod')"),true);
 assert.equal(preview.run("isItemOwned('marius_hand_fishing_rod')"),false);
 assert.equal(preview.run("AppState.claimedRewards.includes('reward_jkl')"),false);
 assert.equal(preview.run('AppState.student.starBalance'),balanceBefore);
 assert.ok(preview.run("renderReward().includes('Получить бесплатно')"));
 const previewReload=createContext({saved:saved(preview)});
 assert.equal(previewReload.run('AppState.rewardFlow.selected'),'marius_hand_fishing_rod');
 assert.equal(previewReload.run('rewardReady'),false);
 assert.equal(previewReload.run("isItemOwned('marius_hand_fishing_rod')"),false);
 assert.equal(previewReload.run('confirmReward()'),true);
 assert.equal(previewReload.run("isItemOwned('marius_hand_fishing_rod')"),true);
 assert.equal(previewReload.run("AppState.claimedRewards.includes('reward_jkl')"),true);
 assert.equal(previewReload.run('AppState.student.starBalance'),balanceBefore);
 assert.equal(previewReload.run("shopItemUnlocked(getItemById('marius_hand_satchel'))"),true);
 assert.equal(previewReload.run("AppState.student.purchasedItemIds.includes('marius_hand_fishing_rod')"),false);
 assert.equal(previewReload.run("confirmReward()"),false);

 // A completed legacy course exposes all missed gifts in curriculum order and
 // never requires replaying a lesson, game or review.
 const legacySeed=createContext(),legacy=JSON.parse(legacySeed.run('JSON.stringify(AppState)'));
 legacy.version=10;legacy.started=true;legacy.completed=true;legacy.cursor={phase:'results',index:25,step:0};
 for(const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')legacy.stats[letter]={attempts:3,correct:3,mistakes:0,mastery:3,skills:['find','letterPicture','pictureLetter'],practiceDebt:0};
 legacy.flightYZ={version:1,session:null,permanent:{completed:true,completedAt:1}};
 legacy.completedBlocks=['reward_abc','reward_def','reward_ghi'];legacy.claimedRewards=['reward_abc','reward_def','reward_ghi'];legacy.rewardFlow=null;
 legacy.characterState.ownedItems=['jacket_stars','accessory_balloon','hat_straw_bow'];legacy.characterState.equipped.outfit='jacket_stars';legacy.characterState.equipped.hand_right='accessory_balloon';legacy.characterState.equipped.head='hat_straw_bow';
 const missed=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}}),missedOrder=[];
 const migratedBalance=missed.run('AppState.student.starBalance');
 assert.deepEqual(JSON.parse(missed.run('JSON.stringify(AppState.cursor)')),{phase:'results',index:25,step:0});
 while(missed.run('Boolean(AppState.rewardFlow)')){
  const id=missed.run('AppState.rewardFlow.id');missedOrder.push(id);
  missed.run(`chooseReward(${JSON.stringify(rewardPairs)}[AppState.rewardFlow.id][0]);rewardReady=true;continueReward()`);
 }
 assert.deepEqual(missedOrder,['reward_jkl','reward_mno','reward_pqr','reward_stu','reward_vwx','reward_yz']);
 assert.equal(missed.run('AppState.student.starBalance'),migratedBalance);
 assert.equal(missed.run('AppState.characterState.ownedItems.length'),9);
 assert.equal(missed.run('new Set(AppState.characterState.ownedItems).size'),9);

 // A previously purchased reward item is not mistaken for the free choice.
 const purchasedLegacy=JSON.parse(JSON.stringify(legacy));
 purchasedLegacy.characterState.ownedItems.push('marius_hand_fishing_rod');
 purchasedLegacy.student.purchasedItemIds=['marius_hand_fishing_rod'];
 purchasedLegacy.student.starTransactions=[{amount:20,reason:'legacy_seed',sourceId:'legacy:seed',timestamp:1},{amount:-10,reason:'shop_purchase',sourceId:'shop:marius_hand_fishing_rod',timestamp:2}];
 purchasedLegacy.student.starBalance=10;
 const purchased=createContext({saved:{'alfie-abc-v1':JSON.stringify(purchasedLegacy)}});
 assert.equal(purchased.run('AppState.rewardFlow.id'),'reward_jkl');
 assert.equal(purchased.run("AppState.claimedRewards.includes('reward_jkl')"),false);
 assert.equal(purchased.run("isItemOwned('marius_hand_fishing_rod')"),true);

 // Y and Z picture checks keep the existing distractor, add one A–Z picture,
 // remain stable across rerenders and reshuffle for the next question.
 for(const letter of ['Y','Z'])for(const type of ['letterPicture','wordPicture','translationPicture']){
  const question=JSON.parse(catalog.run(`JSON.stringify(createQuestion('${type}',byLetter.get('${letter}'),[byLetter.get('Y'),byLetter.get('Z')],false))`));
  assert.equal(question.options.length,3);assert.equal(new Set(question.options).size,3);assert.ok(question.options.includes(letter));
  const first=catalog.run(`questionBody(${JSON.stringify(question)})`),second=catalog.run(`questionBody(${JSON.stringify(question)})`);
  assert.equal(first,second);
 }
 const extraDistractors=new Set();
 for(let trial=0;trial<60;trial++)extraDistractors.add(catalog.run("createQuestion('letterPicture',byLetter.get('Y'),[byLetter.get('Y'),byLetter.get('Z')],false).options.find(letter=>!['Y','Z'].includes(letter))"));
 assert.ok(extraDistractors.size>1);

 const trainingCSS=fs.readFileSync(path.resolve(__dirname,'../play/training.css'),'utf8');
 assert.match(trainingCSS,/\.training-audio-cue\{[^}]*width:64px[^}]*height:64px[^}]*min-width:44px[^}]*min-height:44px/);
 assert.match(trainingCSS,/@media\(max-width:650px\)[\s\S]*?\.training-audio-cue\{width:54px;height:54px/);

 console.log(JSON.stringify({
  passed:true,rewardPairs:9,rewardPreviewBeforeConfirm:true,previewReload:true,missedRewardOrder:missedOrder,
  purchasedItemDoesNotConsumeGift:true,yzChoices:3,yzStableRerender:true,yzDistractorVariants:extraDistractors.size,
  trainingSpeakerVisualPx:'30–42',trainingSpeakerTouchPx:'54–64'
 },null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
