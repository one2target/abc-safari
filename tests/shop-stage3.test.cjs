const assert=require('node:assert/strict');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const exclusivePrices={
 marius_bottom_sport_red:6,marius_bottom_sport_brown:6,marius_top_crop_blue:7,marius_top_sport_white:7,
 marius_neck_striped_scarf:5,marius_neck_leaf_scarf:5,marius_neck_plaid_tie:4,marius_head_cap_brown:7,
 marius_head_rain_hat:8,marius_head_forest_hat:8,marius_hand_fish_keepnet:9
};
const rewardPrices={reward_jkl:10,reward_mno:10,reward_pqr:10,reward_stu:11,reward_vwx:14,reward_yz:14};

const catalog=createContext();
assert.equal(catalog.run('SHOP_ITEMS.length'),31);
assert.equal(catalog.run('new Set(SHOP_ITEMS.map(item=>item.id)).size'),31);
assert.equal(catalog.run('EXCLUSIVE_WARDROBE_ITEMS.length'),11);
assert.deepEqual(JSON.parse(catalog.run('JSON.stringify(Object.fromEntries(EXCLUSIVE_WARDROBE_ITEMS.map(item=>[item.id,item.priceStars])))')),exclusivePrices);
for(const [rewardId,price] of Object.entries(rewardPrices))assert.equal(catalog.run(`rewardItems(rewardConfig.find(reward=>reward.id==='${rewardId}')).every(item=>item.priceStars===${price})`),true);
assert.deepEqual(JSON.parse(catalog.run("JSON.stringify(ITEMS.map(item=>[item.id,item.priceStars]))")),[
 ['jacket_stars',30],['jacket_racer',30],['accessory_bouquet',22],['accessory_balloon',22],
 ['hat_straw_bow',26],['hat_adventure',26],['background_jungle',18],['background_sunset',28]
]);

// All 23 new items are visible immediately; reward alternatives stay locked.
assert.equal(catalog.run("SHOP_WARDROBE_ITEMS.every(shopItemVisible)"),true);
assert.equal(catalog.run("REWARD_WARDROBE_ITEMS.every(item=>shopItemState(item)==='locked')"),true);
assert.equal(catalog.run("purchaseCatalogItem('marius_hand_satchel').reason"),'locked');
assert.ok(catalog.run("renderShopCard(getItemById('marius_hand_satchel'))").includes('После блока J–L'));
catalog.run("AppState.completedBlocks=['reward_jkl']");
assert.equal(catalog.run("shopItemState(getItemById('marius_hand_satchel'))"),'locked');
assert.ok(catalog.run("renderShopCard(getItemById('marius_hand_satchel'))").includes('Сначала выбери награду'));

// Free selection unlocks only the unchosen item for purchase.
const alternative=createContext();
alternative.run("AppState.completedBlocks=['reward_jkl'];AppState.rewardFlow={id:'reward_jkl',resume:'course',selected:null};chooseReward('marius_hand_fishing_rod');rewardReady=true;continueReward()");
assert.equal(alternative.run("shopItemState(getItemById('marius_hand_fishing_rod'))"),'reward');
assert.equal(alternative.run("shopItemState(getItemById('marius_hand_satchel'))"),'available');
assert.ok(alternative.run("renderShopCard(getItemById('marius_hand_fishing_rod'))").includes('Получено как награда'));
assert.equal(alternative.run("isItemOwned('marius_hand_satchel')"),false);
alternative.run("StudentDomain.awardStars(AppState.student,10,'test_seed','test:reward-alternative');view='profile';profileSection='shop';shopCategoryId='hands';tryShopItem('marius_hand_satchel')");
assert.equal(alternative.run("renderCharacter('home',{previewItem:getItemById(shopPreviewItemId)}).includes('marius_wardrobe_hand_satchel')"),true);
assert.equal(alternative.run("buyShopItem('marius_hand_satchel')"),true);
assert.equal(alternative.run('AppState.student.starBalance'),0);
assert.equal(alternative.run("isItemOwned('marius_hand_fishing_rod')&&isItemOwned('marius_hand_satchel')"),true);
assert.equal(alternative.run("getEquippedItem('hand_left').id"),'marius_hand_satchel');
assert.equal(alternative.run("AppState.student.starTransactions.filter(item=>item.sourceId==='shop:marius_hand_satchel'&&item.amount===-10).length"),1);
const transactionCount=alternative.run('AppState.student.starTransactions.length');
assert.equal(alternative.run("purchaseCatalogItem('marius_hand_satchel').reason"),'owned');
assert.equal(alternative.run('AppState.student.starTransactions.length'),transactionCount);
const alternativeReload=createContext({saved:saved(alternative)});
assert.equal(alternativeReload.run("isItemOwned('marius_hand_fishing_rod')&&isItemOwned('marius_hand_satchel')"),true);
assert.equal(alternativeReload.run("getEquippedItem('hand_left').id"),'marius_hand_satchel');

// Exclusive purchase, insufficient balance and old-save restoration.
const exclusive=createContext();
exclusive.run("StudentDomain.awardStars(AppState.student,4,'test_seed','test:exclusive');view='profile';profileSection='shop';shopCategoryId='neck';tryShopItem('marius_neck_plaid_tie')");
assert.equal(exclusive.run("buyShopItem('marius_neck_plaid_tie')"),true);
assert.equal(exclusive.run("isItemOwned('marius_neck_plaid_tie')"),true);
assert.equal(exclusive.run("getEquippedItem('neck').id"),'marius_neck_plaid_tie');
const exclusiveReload=createContext({saved:saved(exclusive)});
assert.equal(exclusiveReload.run("isItemOwned('marius_neck_plaid_tie')"),true);
assert.equal(exclusiveReload.run("getEquippedItem('neck').id"),'marius_neck_plaid_tie');
const poor=createContext();poor.run("StudentDomain.awardStars(AppState.student,5,'test_seed','test:poor-new')");
assert.equal(poor.run("purchaseCatalogItem('marius_top_crop_blue').reason"),'insufficient');
assert.equal(poor.run('AppState.student.starBalance'),5);

// Five-category navigation renders one bounded group and one full-size main canvas.
assert.deepEqual(JSON.parse(catalog.run("JSON.stringify(SHOP_CATEGORY_CONFIG.map(category=>category.id))")),['collections','head','clothing','neck','hands','background']);
assert.equal(catalog.run("SHOP_ITEMS.every(item=>SHOP_CATEGORY_CONFIG.some(category=>category.id===shopCategoryFor(item)))"),true);
catalog.run("view='profile';profileSection='shop';shopCategoryId='clothing'");
const shopMarkup=catalog.run('renderShopProfile()');
assert.equal((shopMarkup.match(/<canvas/g)||[]).length,1);
assert.equal((shopMarkup.match(/data-shop-thumbnail=/g)||[]).length,catalog.run("SHOP_ITEMS.filter(shopItemVisible).filter(item=>shopCategoryFor(item)==='clothing'&&item.slot!=='background').length"));
assert.ok(!shopMarkup.includes('marius_hand_fish_keepnet'));
assert.equal(catalog.run('SHOP_THUMBNAIL_WIDTH'),240);assert.equal(catalog.run('SHOP_THUMBNAIL_HEIGHT'),320);
assert.equal(catalog.run('SHOP_THUMBNAIL_CACHE_LIMIT'),12);assert.equal(catalog.run('SHOP_THUMBNAIL_IMAGE_CACHE_LIMIT'),8);
assert.equal(catalog.run("(()=>{const cache=new Map();for(let i=0;i<20;i++)touchLimitedCache(cache,String(i),i,SHOP_THUMBNAIL_CACHE_LIMIT);return cache.size===12&&!cache.has('0')&&cache.has('19');})()"),true);
assert.equal(catalog.run("['marius_hand_fishing_rod','marius_hand_umbrella','marius_hand_harvest_basket'].every(id=>{const plan=shopThumbnailPlan(getItemById(id)),bounds=plan.itemBounds;return bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=plan.width+.01&&bounds.y+bounds.height<=plan.height+.01;})"),true);

// Preview route is isolated and exposes locked, reward and purchasable states.
const demo=createContext({search:'?demo=1&screen=shop'});
assert.equal(demo.run('view'),'profile');assert.equal(demo.run('profileSection'),'shop');assert.equal(demo.run('shopCategoryId'),'hands');
assert.equal(demo.run('AppState.student.starBalance'),24);assert.equal(demo.run("shopItemState(getItemById('marius_hand_fishing_rod'))"),'reward');assert.equal(demo.run("shopItemState(getItemById('marius_hand_satchel'))"),'available');
assert.equal(demo.store.size,0);

// Economy simulation: current unmodified earnings and cheapest-purchase strategy.
const balances=[11,17,23,26,32,38,44,50,65];
assert.equal(balances[0]>=Math.min(...Object.values(exclusivePrices)),true);
const endgamePrices=[...Object.values(exclusivePrices),...Object.values(rewardPrices)].sort((a,b)=>a-b);
let balance=balances.at(-1),owned=9,purchased=0;
for(const price of endgamePrices){if(balance<price)continue;balance-=price;owned++;purchased++;if(owned===10)balance+=5;}
assert.equal(purchased,10);assert.equal(balance,7);
const autumnSetCost=exclusivePrices.marius_bottom_sport_red+exclusivePrices.marius_neck_leaf_scarf+exclusivePrices.marius_head_rain_hat;
assert.equal(autumnSetCost,19);
const perfectTrainingsNeeded=Math.ceil(Math.max(0,autumnSetCost-balances.at(-1))/3);
assert.equal(perfectTrainingsNeeded,0);

console.log(JSON.stringify({
 passed:true,catalogItems:31,newItems:23,exclusiveItems:11,rewardAlternatives:12,productCategories:5,collectionTabs:1,
 freeChoiceThenPurchase:true,lockedUntilClaim:true,exclusivePurchase:true,persistence:true,
 shopCanvasesPerCategory:1,thumbnailCanvas:[240,320],thumbnailCacheLimit:12,imageCacheLimit:8,
 economy:{balances,maxPurchasesWithoutTraining:purchased,remainingStars:balance,autumnSetCost,perfectTrainingsNeeded}
},null,2));
