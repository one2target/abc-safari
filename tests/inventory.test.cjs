const assert=require('node:assert/strict');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const slots=['outfit','head','face','hand_left','hand_right','back','extra','background'];
const fresh=createContext();

assert.equal(fresh.run('AppState.rewardStateVersion'),3);
assert.deepEqual(JSON.parse(fresh.run('JSON.stringify(ITEM_SLOTS)')),slots);
assert.equal(fresh.run('ITEMS.length'),6);
assert.equal(fresh.run("ITEMS.every(item=>['id','name','slot','asset','collection'].every(key=>Boolean(item[key])))"),true);
assert.equal(fresh.run('rewardConfig.every(reward=>Array.isArray(reward.itemIds)&&!reward.options)'),true);
assert.equal(fresh.run("getItemById('jacket_stars').slot"),'outfit');
assert.equal(fresh.run("getItemById('accessory_balloon').slot"),'hand_right');
assert.equal(fresh.run("getItemById('hat_straw_bow').slot"),'head');
assert.equal(fresh.run("getItemById('hat_adventure').slot"),'head');
assert.deepEqual(JSON.parse(fresh.run("JSON.stringify(rewardConfig.find(reward=>reward.id==='reward_ghi').itemIds)")),['hat_straw_bow','hat_adventure']);
assert.equal(fresh.run("MEDIA_ASSETS.images.marius_hat_straw_bow.width"),1024);
assert.equal(fresh.run("MEDIA_ASSETS.images.marius_hat_straw_bow.height"),1536);
assert.equal(fresh.run("MEDIA_ASSETS.images.marius_hat_adventure.width"),1024);
assert.equal(fresh.run("MEDIA_ASSETS.images.marius_hat_adventure.height"),1536);
assert.equal(fresh.run("getItemById('missing')"),null);
assert.equal(fresh.run("ITEM_SLOTS.every(slot=>AppState.characterState.equipped[slot]===null)"),true);

assert.equal(fresh.run("isItemOwned('jacket_stars')"),false);
assert.equal(fresh.run("equipItem('jacket_stars')"),false);
assert.equal(fresh.run("unlockItem('missing')"),false);
assert.equal(fresh.run("unlockItem('jacket_stars')"),true);
assert.equal(fresh.run("unlockItem('jacket_stars')"),true);
assert.equal(fresh.run("AppState.characterState.ownedItems.filter(id=>id==='jacket_stars').length"),1);
assert.equal(fresh.run("equipItem('jacket_stars')"),true);
assert.equal(fresh.run("getEquippedItem('outfit').id"),'jacket_stars');

const head=createContext();
head.run("unlockItem('hat_straw_bow');unlockItem('hat_adventure');equipItem('hat_straw_bow')");
assert.equal(head.run("getEquippedItem('head').id"),'hat_straw_bow');
head.run("equipItem('hat_adventure')");
assert.equal(head.run("getEquippedItem('head').id"),'hat_adventure');
assert.equal(head.run("isItemOwned('hat_straw_bow')"),true);
assert.equal(head.run("unequipItem('hat_adventure')"),true);
assert.equal(head.run("getEquippedItem('head')"),null);
const headReload=createContext({saved:saved(head)});
assert.equal(headReload.run("getEquippedItem('head')"),null);
assert.equal(headReload.run("isItemOwned('hat_adventure')"),true);

const hatReward=createContext();
hatReward.run("AppState.completedBlocks=['reward_ghi'];AppState.rewardFlow={id:'reward_ghi',resume:'after-mini',selected:null};chooseReward('hat_straw_bow')");
assert.equal(hatReward.run("isItemOwned('hat_straw_bow')"),true);
assert.equal(hatReward.run("isItemOwned('hat_adventure')"),false);
assert.equal(hatReward.run("getEquippedItem('head').id"),'hat_straw_bow');
assert.equal(hatReward.run("chooseReward('hat_adventure')"),false);
const hatWardrobe=hatReward.run("AppState.rewardFlow=null;renderWardrobe()");
assert.ok(hatWardrobe.includes('data-action="unequip"'));
assert.ok(hatWardrobe.includes('character-art'));
assert.equal((hatWardrobe.match(/class="item-preview-stage"/g)||[]).length,2);
assert.equal((hatWardrobe.match(/data-character-context="item-preview"/g)||[]).length,0);
assert.ok(!hatWardrobe.includes('full-canvas-art'));
hatReward.run("AppState.rewardFlow=null;unequipItem('hat_straw_bow')");
const unequippedHatReload=createContext({saved:saved(hatReward)});
assert.equal(unequippedHatReload.run("getEquippedItem('head')"),null);
assert.equal(unequippedHatReload.run("isItemOwned('hat_straw_bow')"),true);
assert.equal(unequippedHatReload.run("isItemOwned('hat_adventure')"),false);
assert.equal(unequippedHatReload.run('AppState.rewardFlow'),null);

const unlockOnly=createContext();
assert.equal(unlockOnly.run("unlockItem('accessory_balloon')"),true);
const unlockReload=createContext({saved:saved(unlockOnly)});
assert.equal(unlockReload.run("isItemOwned('accessory_balloon')"),true);
assert.equal(unlockReload.run("getEquippedItem('hand_right')"),null);

const outfitReload=createContext({saved:saved(fresh)});
assert.equal(outfitReload.run("getEquippedItem('outfit').id"),'jacket_stars');
assert.ok(outfitReload.run('renderCharacter()').includes('giraffe_jacket_stars.png'));

outfitReload.run("unlockItem('accessory_balloon');equipItem('accessory_balloon')");
assert.equal(outfitReload.run("getEquippedItem('hand_right').id"),'accessory_balloon');
assert.ok(outfitReload.run('renderCharacter()').includes('accessory_balloon.png'));
outfitReload.run("unlockItem('accessory_bouquet');equipItem('accessory_bouquet')");
assert.equal(outfitReload.run("getEquippedItem('hand_right').id"),'accessory_bouquet');
assert.equal(outfitReload.run("isItemOwned('accessory_balloon')"),true);
assert.equal(outfitReload.run("unequipItem('accessory_bouquet')"),true);
assert.equal(outfitReload.run("getEquippedItem('hand_right')"),null);
assert.equal(outfitReload.run("unequipItem('accessory_bouquet')"),false);

const unequippedReload=createContext({saved:saved(outfitReload)});
assert.equal(unequippedReload.run("getEquippedItem('hand_right')"),null);
assert.equal(unequippedReload.run("isItemOwned('accessory_bouquet')"),true);

// Reward schema v2 used giraffeVariant/handItem. Loading keeps ownership,
// equipment, lesson progress and the original localStorage key while upgrading.
const legacy=JSON.parse(fresh.store.get('alfie-abc-v1'));
legacy.rewardStateVersion=2;
legacy.characterState={
 ownedItems:['jacket_racer','accessory_balloon','unknown_item'],
 equipped:{giraffeVariant:'jacket_racer',handItem:'accessory_balloon',head:'jacket_stars'}
};
legacy.completedBlocks=['reward_abc','reward_def'];
legacy.claimedRewards=['reward_abc','reward_def'];
legacy.cursor={phase:'lesson',index:4,step:1};
legacy.stats.E.correct=7;
const migrated=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});
assert.equal(migrated.run('AppState.rewardStateVersion'),3);
assert.equal(migrated.run("getEquippedItem('outfit').id"),'jacket_racer');
assert.equal(migrated.run("getEquippedItem('hand_right').id"),'accessory_balloon');
assert.equal(migrated.run("getEquippedItem('head')"),null);
assert.equal(migrated.run("AppState.characterState.ownedItems.includes('unknown_item')"),false);
assert.equal(migrated.run('AppState.cursor.index'),4);
assert.equal(migrated.run('AppState.cursor.step'),1);
assert.equal(migrated.run('AppState.stats.E.correct'),7);

console.log(JSON.stringify({
 passed:true,
 catalogItems:6,
 slots,
 genericUnlockEquipUnequip:true,
 headSlotEquipSwitchUnequip:true,
 oneOfTwoHatOwnership:true,
 persistence:true,
 rewardStateV2Migration:true,
 lessonProgressPreserved:true,
 invalidItemsRejected:true
},null,2));
