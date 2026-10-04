const assert=require('node:assert/strict');
const {createContext,saved}=require('./support/trainer-harness.cjs');

// Preview is ephemeral and uses the requested item without granting ownership.
const preview=createContext();
preview.run("unlockItem('jacket_stars');equipItem('jacket_stars');AppState.completedBlocks=['reward_abc'];StudentDomain.awardStars(AppState.student,3,'block_completed','block:reward_abc');StudentDomain.awardStars(AppState.student,7,'test_seed','test:scenario-a');view='profile';profileSection='shop'");
assert.equal(preview.run("tryShopItem('jacket_racer')"),true);
assert.equal(preview.run('shopPreviewItemId'),'jacket_racer');
assert.equal(preview.run("isItemOwned('jacket_racer')"),false);
assert.equal(preview.run("AppState.characterState.equipped.outfit"),'jacket_stars');
assert.ok(preview.run("renderCharacter('home',{previewItem:getItemById(shopPreviewItemId)})").includes('giraffe_jacket_racer.png'));
assert.ok(preview.run("renderShopCard(getItemById('jacket_racer'))").includes('Не хватает 20 ⭐'));
preview.run("actions['profile-section']({dataset:{section:'marius'}})");
assert.equal(preview.run('shopPreviewItemId'),null);
assert.equal(preview.run("AppState.characterState.equipped.outfit"),'jacket_stars');
const previewReload=createContext({saved:saved(preview)});
assert.equal(previewReload.run("isItemOwned('jacket_racer')"),false);
assert.equal(previewReload.run("AppState.characterState.equipped.outfit"),'jacket_stars');

// Persistent equip is protected for every slot, including backgrounds.
assert.equal(preview.run("equipItem('jacket_racer')"),false);
assert.equal(preview.run("equipItem('background_sunset')"),false);
assert.equal(preview.run("AppState.characterState.equipped.background"),null);

// Sufficient balance: preview -> atomic purchase -> owned + equipped.
const purchase=createContext();
purchase.run("AppState.completedBlocks=['reward_abc'];StudentDomain.awardStars(AppState.student,3,'block_completed','block:reward_abc');StudentDomain.awardStars(AppState.student,32,'test_seed','test:racer');view='profile';profileSection='shop';tryShopItem('jacket_racer')");
assert.equal(purchase.run("buyShopItem('jacket_racer')"),true);
assert.equal(purchase.run('AppState.student.starBalance'),5);
assert.equal(purchase.run("isItemOwned('jacket_racer')"),true);
assert.equal(purchase.run("getEquippedItem('outfit').id"),'jacket_racer');
assert.equal(purchase.run("AppState.student.starTransactions.some(t=>t.amount===-30&&t.reason==='shop_purchase'&&t.sourceId==='shop:jacket_racer')"),true);
assert.ok(purchase.run("renderWardrobeProfile()").includes('Гоночная куртка'));
assert.ok(purchase.run("renderShopCard(getItemById('jacket_racer'))").includes('✓ Уже твоё'));
assert.ok(purchase.run("renderShopCard(getItemById('jacket_racer'))").includes('Надето ✓'));
const purchaseReload=createContext({saved:saved(purchase)});
assert.equal(purchaseReload.run('AppState.student.starBalance'),5);
assert.equal(purchaseReload.run("isItemOwned('jacket_racer')"),true);
assert.equal(purchaseReload.run("getEquippedItem('outfit').id"),'jacket_racer');

// Insufficient balance is enforced in UI and domain/API paths.
const poor=createContext();
poor.run("AppState.completedBlocks=['reward_abc'];StudentDomain.awardStars(AppState.student,3,'block_completed','block:reward_abc');StudentDomain.awardStars(AppState.student,9,'test_seed','test:poor');view='profile';profileSection='shop';tryShopItem('jacket_racer')");
assert.ok(poor.run("renderShopCard(getItemById('jacket_racer'))").includes('Не хватает 18 ⭐'));
assert.equal(poor.run("buyShopItem('jacket_racer')"),false);
assert.equal(poor.run('AppState.student.starBalance'),12);
assert.equal(poor.run("isItemOwned('jacket_racer')"),false);
assert.equal(poor.run("AppState.student.starBalance>=0"),true);

// An owned item cannot be bought or charged twice.
const transactionsBefore=purchase.run('AppState.student.starTransactions.length');
assert.equal(purchase.run("purchaseCatalogItem('jacket_racer').ok"),false);
assert.equal(purchase.run('AppState.student.starBalance'),5);
assert.equal(purchase.run('AppState.student.starTransactions.length'),transactionsBefore);

// Premium-only items are rejected by the central domain purchase operation.
const premium=createContext();
premium.run("StudentDomain.awardStars(AppState.student,100,'test_seed','test:premium')");
assert.equal(premium.run("StudentDomain.purchaseItem(AppState.student,AppState.characterState,{id:'premium_test',slot:'head',priceStars:1,currency:'stars',isPremium:true}).reason"),'premium');
assert.equal(premium.run('AppState.student.starBalance'),100);
assert.equal(premium.run("AppState.characterState.ownedItems.includes('premium_test')"),false);

// Scenario C: an insufficient background preview never replaces the owned background.
const backgroundPreview=createContext();
backgroundPreview.run("unlockItem('background_jungle');equipItem('background_jungle');StudentDomain.awardStars(AppState.student,20,'test_seed','test:scenario-c');view='profile';profileSection='shop';tryShopItem('background_sunset')");
assert.ok(backgroundPreview.run("renderShopCard(getItemById('background_sunset'))").includes('Не хватает 8 ⭐'));
assert.equal(backgroundPreview.run("getEquippedItem('background').id"),'background_jungle');
backgroundPreview.run("go('home')");
assert.equal(backgroundPreview.run('shopPreviewItemId'),null);
assert.equal(backgroundPreview.run("getEquippedItem('background').id"),'background_jungle');
const backgroundPreviewReload=createContext({saved:saved(backgroundPreview)});
assert.equal(backgroundPreviewReload.run("getEquippedItem('background').id"),'background_jungle');
assert.equal(backgroundPreviewReload.run("isItemOwned('background_sunset')"),false);

// Backgrounds follow the same preview/purchase/equip path and persist only after purchase.
const background=createContext();
background.run("StudentDomain.awardStars(AppState.student,30,'test_seed','test:background');view='profile';profileSection='shop';tryShopItem('background_sunset')");
assert.equal(background.run("getEquippedItem('background')"),null);
assert.equal(background.run("buyShopItem('background_sunset')"),true);
assert.equal(background.run('AppState.student.starBalance'),2);
assert.equal(background.run("getEquippedItem('background').id"),'background_sunset');
assert.ok(background.run("renderShopCard(getItemById('background_sunset'))").includes('Выбран ✓'));
const backgroundReload=createContext({saved:saved(background)});
assert.equal(backgroundReload.run("getEquippedItem('background').id"),'background_sunset');

// Every catalog card includes its own asset; outfit thumbnails use the shared compositor.
const thumbnails=createContext();
const starThumbnail=thumbnails.run("renderCatalogArt(getItemById('jacket_stars'))");
const racerThumbnail=thumbnails.run("renderCatalogArt(getItemById('jacket_racer'))");
assert.ok(starThumbnail.includes('data-character-context="item-preview"'));
assert.ok(starThumbnail.includes('giraffe_jacket_stars.png'));
assert.ok(!starThumbnail.includes('giraffe_jacket_racer.png'));
assert.ok(racerThumbnail.includes('data-character-context="item-preview"'));
assert.ok(racerThumbnail.includes('giraffe_jacket_racer.png'));
assert.ok(!racerThumbnail.includes('giraffe_jacket_stars.png'));
assert.equal(thumbnails.run("ITEMS.every(item=>renderCatalogArt(item).includes(MEDIA_ASSETS.images[item.asset].src))"),true);

console.log(JSON.stringify({
  passed:true,previewWithoutOwnership:true,previewDoesNotEquip:true,previewClearsOnExitAndReload:true,
  equipUnownedGuard:true,backgroundEquipGuard:true,purchase:true,starDebit:true,ownedAfterPurchase:true,
  wardrobeAfterPurchase:true,insufficientFundsGuard:true,nonNegativeBalance:true,repeatPurchaseGuard:true,
  premiumGuard:true,previewPurchaseEquip:true,backgroundPreviewIsolation:true,ownedControls:true,
  outfitThumbnailsByItemId:true,allCatalogAssets:true
},null,2));
