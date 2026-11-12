const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const expected={
 autumn_rain:['marius_bottom_sport_red','marius_outerwear_raincoat','marius_neck_leaf_scarf','marius_head_rain_hat','marius_hand_umbrella'],
 harvest_festival:['marius_bottom_sport_brown','marius_top_plaid_shirt','marius_vest_harvest','marius_neck_plaid_tie','marius_head_harvest_hat','marius_hand_harvest_basket'],
 forest_explorer:['marius_outerwear_field_jacket','marius_neck_striped_scarf','hat_adventure','marius_hand_satchel','marius_hand_lantern'],
 happy_fishing:['marius_bottom_denim','marius_top_crop_blue','marius_head_cap_blue','marius_hand_fishing_rod','marius_hand_fish_keepnet']
};

const catalog=createContext();
assert.equal(catalog.run('MARIUS_COLLECTIONS.length'),4);
assert.deepEqual(JSON.parse(catalog.run('JSON.stringify(Object.fromEntries(MARIUS_COLLECTIONS.map(collection=>[collection.id,collection.itemIds])))')),expected);
assert.equal(catalog.run('MARIUS_COLLECTIONS.every(collection=>new Set(collection.itemIds).size===collection.itemIds.length&&collection.itemIds.every(id=>itemCatalog.has(id)))'),true);
assert.equal(catalog.run('typeof AppState.ownedCollections'), 'undefined');
assert.equal(catalog.run("collectionAvailableTotal(getMariusCollection('autumn_rain'))"),19);
assert.equal(catalog.run("collectionAvailableTotal(getMariusCollection('harvest_festival'))"),10);

// Progress is derived only from ownedItems and shared items count everywhere.
const progress=createContext();
progress.run("unlockItem('marius_bottom_sport_brown',AppState,false);unlockItem('marius_top_plaid_shirt',AppState,false)");
assert.equal(progress.run("collectionOwnedCount(getMariusCollection('harvest_festival'))"),2);
assert.equal(progress.run("collectionOwnedCount(getMariusCollection('forest_explorer'))"),0);
assert.equal(progress.run("collectionComplete(getMariusCollection('harvest_festival'))"),false);

// Already purchased and rewarded items survive reload and remain counted.
const restored=createContext();
restored.run("unlockItem('marius_hand_fishing_rod',AppState,false);StudentDomain.awardStars(AppState.student,7,'test_seed','test:collection-reload');purchaseCatalogItem('marius_top_crop_blue');saveProgress()");
const restoredReload=createContext({saved:saved(restored)});
assert.equal(restoredReload.run("collectionOwnedCount(getMariusCollection('happy_fishing'))"),2);
assert.equal(restoredReload.run("isItemOwned('marius_hand_fishing_rod')&&AppState.student.purchasedItemIds.includes('marius_top_crop_blue')"),true);

// A collection item is bought explicitly, once, and is not auto-equipped.
const purchase=createContext();
purchase.run("StudentDomain.awardStars(AppState.student,6,'test_seed','test:collection-purchase');shopCategoryId='collections';shopCollectionId='autumn_rain'");
const equipmentBefore=purchase.run('JSON.stringify(AppState.characterState.equipped)');
assert.equal(purchase.run("buyCollectionItem('marius_bottom_sport_red')"),true);
assert.equal(purchase.run('AppState.student.starBalance'),0);
assert.equal(purchase.run("isItemOwned('marius_bottom_sport_red')"),true);
assert.equal(purchase.run('JSON.stringify(AppState.characterState.equipped)'),equipmentBefore);
const transactionCount=purchase.run("AppState.student.starTransactions.filter(entry=>entry.sourceId==='shop:marius_bottom_sport_red').length");
assert.equal(purchase.run("buyCollectionItem('marius_bottom_sport_red')"),false);
assert.equal(purchase.run("AppState.student.starTransactions.filter(entry=>entry.sourceId==='shop:marius_bottom_sport_red').length"),transactionCount);

// Bulk collection purchase is all-or-nothing, skips owned items and preserves
// the current equipment until the child explicitly presses “Надеть”.
const lockedBulk=createContext();
lockedBulk.run("StudentDomain.awardStars(AppState.student,100,'test_seed','test:bulk-locked')");
const lockedBefore=lockedBulk.run('JSON.stringify({student:AppState.student,character:AppState.characterState})');
assert.equal(lockedBulk.run("purchaseCollection('autumn_rain').reason"),'locked');
assert.equal(lockedBulk.run('JSON.stringify({student:AppState.student,character:AppState.characterState})'),lockedBefore);

const poorBulk=createContext();
poorBulk.run("AppState.completedBlocks=['reward_vwx','reward_yz'];AppState.claimedRewards=['reward_vwx','reward_yz'];StudentDomain.awardStars(AppState.student,46,'test_seed','test:bulk-poor')");
const poorBefore=poorBulk.run('JSON.stringify({student:AppState.student,character:AppState.characterState})');
assert.equal(poorBulk.run("purchaseCollection('autumn_rain').reason"),'insufficient');
assert.equal(poorBulk.run('JSON.stringify({student:AppState.student,character:AppState.characterState})'),poorBefore);

const bulk=createContext();
bulk.run("AppState.completedBlocks=['reward_vwx','reward_yz'];AppState.claimedRewards=['reward_vwx','reward_yz'];unlockItem('marius_bottom_sport_red',AppState,false);StudentDomain.awardStars(AppState.student,41,'test_seed','test:bulk-success')");
const bulkEquipment=bulk.run('JSON.stringify(AppState.characterState.equipped)');
assert.equal(bulk.run("purchaseCollection('autumn_rain').ok"),true);
assert.equal(bulk.run('AppState.student.starBalance'),0);
assert.equal(bulk.run("collectionComplete(getMariusCollection('autumn_rain'))"),true);
assert.equal(bulk.run("AppState.student.purchasedItemIds.length"),4);
assert.equal(bulk.run("AppState.student.starTransactions.filter(entry=>entry.reason==='shop_purchase').length"),4);
assert.equal(bulk.run('JSON.stringify(AppState.characterState.equipped)'),bulkEquipment);
const bulkReload=createContext({saved:saved(bulk)});
assert.equal(bulkReload.run("collectionComplete(getMariusCollection('autumn_rain'))"),true);
assert.equal(bulkReload.run('AppState.student.starBalance'),0);

// Full-look preview is transient and never changes ownership or equipment.
const preview=createContext();
const previewState=preview.run('JSON.stringify(AppState)');
assert.equal(preview.run("tryCollection('autumn_rain')"),true);
assert.equal(preview.run('shopCollectionPreviewId'),'autumn_rain');
assert.equal(preview.run('JSON.stringify(AppState)'),previewState);
assert.equal(preview.store.size,0);

// Complete looks equip atomically, clear conflicting look slots and persist.
const wearing=createContext();
wearing.run("MARIUS_COLLECTIONS.flatMap(collection=>collection.itemIds).forEach(id=>unlockItem(id,AppState,false));equipCollection('autumn_rain')");
assert.equal(wearing.run("collectionEquipped(getMariusCollection('autumn_rain'))"),true);
assert.equal(wearing.run("equipCollection('happy_fishing')"),true);
assert.equal(wearing.run("collectionEquipped(getMariusCollection('happy_fishing'))"),true);
assert.equal(wearing.run("AppState.characterState.equipped.outerwear===null&&AppState.characterState.equipped.neck===null&&AppState.characterState.equipped.hand_left==='marius_hand_fishing_rod'&&AppState.characterState.equipped.hand_right==='marius_hand_fish_keepnet'"),true);
assert.equal(wearing.run("MARIUS_COLLECTIONS.every(collection=>JSON.stringify(normalizeMariusEquipment(collection.equipment))===JSON.stringify({...blankMariusPreviewEquipment(),...collection.equipment}))"),true);
const wearingReload=createContext({saved:saved(wearing)});
assert.equal(wearingReload.run("collectionEquipped(getMariusCollection('happy_fishing'))"),true);

// Completion celebration is persisted, does not grant stars and is not repeated.
const celebration=createContext();
celebration.run("getMariusCollection('autumn_rain').itemIds.forEach(id=>unlockItem(id,AppState,false))");
const celebrationBalance=celebration.run('AppState.student.starBalance');
assert.equal(celebration.run("pendingCompletedCollection().id"),'autumn_rain');
assert.equal(celebration.run('showPendingCollectionCelebration()'),true);
assert.equal(celebration.run("AppState.collectionCelebrations.includes('autumn_rain')"),true);
assert.equal(celebration.run('AppState.student.starBalance'),celebrationBalance);
celebration.run('closeModal()');
assert.equal(celebration.run('showPendingCollectionCelebration()'),false);
const celebrationReload=createContext({saved:saved(celebration)});
assert.equal(celebrationReload.run('pendingCompletedCollection()'),null);

// Collection cards use the shared lazy thumbnail pipeline; detail has one canvas.
const overview=catalog.run('renderCollectionsOverview()');
assert.equal((overview.match(/data-collection-thumbnail=/g)||[]).length,4);
assert.equal((overview.match(/<canvas/g)||[]).length,0);
const detail=catalog.run("renderCollectionDetail(getMariusCollection('autumn_rain'))");
assert.equal((detail.match(/<canvas/g)||[]).length,1);
assert.equal((detail.match(/data-shop-thumbnail=/g)||[]).length,5);
assert.equal(catalog.run("MARIUS_COLLECTIONS.every(collection=>{const plan=collectionThumbnailPlan(collection);return plan.width===240&&plan.height===320&&plan.layers.length===collection.itemIds.length+1;})"),true);
assert.ok(detail.includes('Пока закрыто'));
assert.ok(detail.includes('⭐ 6'));
assert.ok(detail.includes('Стоимость недостающих'));
const overviewCard=catalog.run("renderCollectionCard(getMariusCollection('autumn_rain'))");
assert.ok(overviewCard.includes('Примерить'));
assert.ok(overviewCard.includes('Докупить')||overviewCard.includes('Закрыто'));
assert.ok(overviewCard.includes('Жёлтый дождевик'));

// Direct preview routes and mobile layout remain isolated from localStorage.
for(const id of Object.keys(expected)){
 const demo=createContext({search:`?demo=1&screen=shop&collection=${id}`});
 assert.equal(demo.run('view'),'profile');
 assert.equal(demo.run('profileSection'),'shop');
 assert.equal(demo.run('shopCategoryId'),'collections');
 assert.equal(demo.run('shopCollectionId'),id);
 assert.equal(demo.store.size,0);
}
const overviewDemo=createContext({search:'?demo=1&screen=shop&category=collections'});
assert.equal(overviewDemo.run('shopCategoryId'),'collections');
assert.equal(overviewDemo.run('shopCollectionId'),null);

const css=fs.readFileSync(path.resolve(__dirname,'../play/student-profile.css'),'utf8');
assert.match(css,/@media\(max-width:520px\)[\s\S]*\.collection-grid,\.collection-item-grid,\.wardrobe-collection-shortcuts\{grid-template-columns:1fr\}/);
assert.match(css,/\.collection-detail-layout\{display:grid;grid-template-columns:/);

console.log(JSON.stringify({
 passed:true,collections:4,collectionSizes:Object.fromEntries(Object.entries(expected).map(([id,items])=>[id,items.length])),
 progressFromOwnedItems:true,directPurchase:true,noRepeatPurchase:true,atomicBulkPurchase:true,lockedBulkRollback:true,insufficientBulkRollback:true,previewIsolated:true,
 equipAndReload:true,dualHands:true,celebrationOnce:true,noEconomyChange:true,lazyCollectionThumbnails:true,
 collectionDetailCanvases:1,mobile390x844:true,demoRoutes:Object.keys(expected)
},null,2));
