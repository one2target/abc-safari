const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'play/student-domain.js'),'utf8');
const context=vm.createContext({Date,JSON,Object,Set,Number,String,Math});
vm.runInContext(`${source}\nthis.domain=StudentDomain;`,context);
const domain=context.domain;
const plain=value=>JSON.parse(JSON.stringify(value));

// 1–2. Awards are recorded once by stable source ID.
const economy=domain.initialStudentState();
assert.equal(domain.awardStars(economy,3,'block_completed','block:ABC',100),true);
assert.equal(economy.starBalance,3);
assert.deepEqual(plain(economy.starTransactions[0]),{amount:3,reason:'block_completed',sourceId:'block:ABC',timestamp:100});
assert.equal(domain.awardStars(economy,3,'block_completed','block:ABC',200),false);
assert.equal(economy.starBalance,3);

// 3–5. A purchase changes currency and ownership atomically.
domain.awardStars(economy,30,'test','seed',101);
const inventory={ownedItems:[]},item={id:'hat',priceStars:20,currency:'stars',isPremium:false};
assert.deepEqual(plain(domain.purchaseItem(economy,inventory,item,102)),{ok:true,reason:'purchased'});
assert.equal(economy.starBalance,13);
assert.deepEqual(inventory.ownedItems,['hat']);
assert.deepEqual(plain(economy.starTransactions.at(-1)),{amount:-20,reason:'shop_purchase',sourceId:'shop:hat',timestamp:102});
assert.deepEqual(plain(domain.purchaseItem(economy,inventory,item,103)),{ok:false,reason:'owned'});
const poor=domain.initialStudentState(),poorInventory={ownedItems:[]};
assert.deepEqual(plain(domain.purchaseItem(poor,poorInventory,item,104)),{ok:false,reason:'insufficient'});
assert.equal(poor.starBalance,0);assert.deepEqual(poorInventory.ownedItems,[]);

// 6–7. Existing application inventory remains the authority for equipment.
const equipment=createContext();
assert.ok(equipment.run('renderHome()').includes('Мой Мариус'));
assert.equal(equipment.run('(renderStudentProfile().match(/data-action="profile-section"/g)||[]).length'),6);
assert.equal(equipment.run("equipItem('jacket_stars')"),false);
assert.equal(equipment.run("unlockItem('jacket_stars');equipItem('jacket_stars')"),true);
assert.equal(equipment.run("getEquippedItem('outfit').id"),'jacket_stars');

// 8–9. Achievement conditions and their star reward are idempotent.
const achievements=domain.initialStudentState();
const firstFacts={learnedCount:1,abcLearned:false,bestAnswerStreak:0,perfectTrainingCount:0,activityStreak:0,ownedItemCount:0};
assert.deepEqual(plain(domain.evaluateAchievements(achievements,firstFacts,200)),['first_step']);
assert.equal(achievements.starBalance,2);
assert.deepEqual(plain(domain.evaluateAchievements(achievements,firstFacts,300)),[]);
assert.equal(achievements.starBalance,2);
assert.equal(achievements.starTransactions.filter(item=>item.sourceId==='achievement:first_step').length,1);

// 10. Mastery needs completed learning plus sustained training evidence.
assert.equal(domain.letterMastery({mastery:2},{attempts:20,correct:20}),0);
assert.equal(domain.letterMastery({mastery:3},{}),1);
assert.equal(domain.letterMastery({mastery:3},{attempts:2,correct:2}),2);
assert.equal(domain.letterMastery({mastery:3},{attempts:5,correct:4}),3);
assert.equal(domain.letterMastery({mastery:3},{attempts:5,correct:3}),2);

// 11. Activity is deduplicated per local day and streaks are consecutive.
const activity=domain.initialStudentState();
const day=n=>new Date(2026,9,n,12).getTime();
for(const date of [day(1),day(1),day(2),day(3),day(4)])domain.recordActivity(activity,date);
assert.equal(activity.activityDays.length,4);
assert.equal(domain.activityStreak(activity,day(4)),4);

// 12–13. v3 saves migrate without losing rewards, ownership or equipment.
const legacySeed=createContext();
legacySeed.run("unlockItem('jacket_racer');equipItem('jacket_racer');AppState.completedBlocks=['reward_abc'];AppState.claimedRewards=['reward_abc'];AppState.stats.A.skills=[...CORE_TYPES];AppState.stats.A.mastery=3;saveProgress()");
const legacy=JSON.parse(legacySeed.store.get('alfie-abc-v1'));
legacy.version=3;delete legacy.student;
const migrated=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});
assert.equal(migrated.run('AppState.version'),4);
assert.equal(migrated.run("isItemOwned('jacket_racer')"),true);
assert.equal(migrated.run("getEquippedItem('outfit').id"),'jacket_racer');
assert.equal(migrated.run("AppState.student.starTransactions.some(item=>item.sourceId==='letter:A')"),true);
assert.equal(migrated.run("AppState.student.starTransactions.some(item=>item.sourceId==='block:reward_abc')"),true);

// 14. Store transactions, equipment and balance survive a full reload.
const shopper=createContext();
shopper.run("awardStars(18,'test','seed:shop');purchaseCatalogItem('background_jungle');equipItem('background_jungle');saveProgress()");
const reloaded=createContext({saved:saved(shopper)});
assert.equal(reloaded.run('AppState.student.starBalance'),0);
assert.equal(reloaded.run("isItemOwned('background_jungle')"),true);
assert.equal(reloaded.run("getEquippedItem('background').id"),'background_jungle');
assert.equal(reloaded.run("awardStars(18,'test','seed:shop')"),false);
assert.equal(reloaded.run('AppState.student.starBalance'),0);

// An unchosen block reward becomes a normal shop item after the free choice.
const alternative=createContext();
alternative.run("AppState.completedBlocks=['reward_abc'];AppState.rewardFlow={id:'reward_abc',resume:'course',selected:null};chooseReward('jacket_stars');AppState.rewardFlow=null;awardStars(30,'test','seed:alternative')");
assert.equal(alternative.run("shopItemUnlocked(getItemById('jacket_racer'))"),true);
assert.equal(alternative.run("purchaseCatalogItem('jacket_racer').ok"),true);
assert.equal(alternative.run("isItemOwned('jacket_stars')&&isItemOwned('jacket_racer')"),true);

console.log(JSON.stringify({
  passed:true,
  awards:true,duplicateAwardGuard:true,purchase:true,insufficientFunds:true,repeatPurchaseGuard:true,
  profileNavigation:true,equipOwned:true,equipUnownedGuard:true,achievementUnlock:true,achievementRewardGuard:true,
  mastery:true,streak:true,rewardStateMigration:true,inventoryPreserved:true,reload:true,unchosenRewardInShop:true
},null,2));
