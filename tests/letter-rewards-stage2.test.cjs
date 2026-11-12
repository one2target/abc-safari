const assert=require('node:assert/strict');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const newRewards=[
 {id:'reward_jkl',end:11,items:['marius_hand_fishing_rod','marius_hand_satchel']},
 {id:'reward_mno',end:14,items:['marius_hand_harvest_basket','marius_head_harvest_hat']},
 {id:'reward_pqr',end:17,items:['marius_head_cap_blue','marius_bottom_denim']},
 {id:'reward_stu',end:20,items:['marius_top_plaid_shirt','marius_vest_harvest']},
 {id:'reward_vwx',end:23,items:['marius_outerwear_raincoat','marius_outerwear_field_jacket']},
 {id:'reward_yz',end:25,items:['marius_hand_umbrella','marius_hand_lantern']}
];

;(async()=>{
 const catalog=createContext();
 assert.deepEqual(JSON.parse(catalog.run("JSON.stringify(rewardConfig.filter(reward=>!reward.awardsBlockStars).map(reward=>({id:reward.id,items:reward.itemIds})))")),newRewards.map(({id,items})=>({id,items})));
 assert.equal(catalog.run("REWARD_WARDROBE_ITEMS.length"),12);
 assert.equal(catalog.run("MARIUS_WARDROBE_ITEMS.filter(item=>item.availability==='shop').length"),11);
 assert.equal(catalog.run("ITEMS.length"),8);
 assert.equal(catalog.run("ITEMS.every(item=>Number.isFinite(item.priceStars)&&!item.id.startsWith('marius_'))"),true);
 assert.equal(catalog.run("REWARD_WARDROBE_ITEMS.every(item=>item.rewardId&&getItemById(item.id)?.id===item.id&&Number.isInteger(item.priceStars))"),true);

 for(const reward of newRewards){
  const flow=createContext();
  flow.run(`for(const previous of rewardConfig.filter(entry=>letters.findIndex(letter=>letter.letter===entry.afterLetters.at(-1))<${reward.end})){AppState.completedBlocks.push(previous.id);AppState.claimedRewards.push(previous.id);unlockItem(previous.itemIds[0],AppState,false);}AppState.cursor={phase:'cumulativeResult',index:${reward.end},step:7};saveProgress()`);
  assert.equal(flow.run('AppState.rewardFlow'),null,`${reward.id} must not appear before review continuation`);
  const beforeReload=createContext({saved:saved(flow)});
  assert.equal(beforeReload.run('AppState.rewardFlow'),null,`${reward.id} must stay pending before the completion event`);
  flow.run('advanceAfterReview()');
  assert.equal(flow.run('AppState.rewardFlow.id'),reward.id);
  assert.equal(flow.run(`AppState.completedBlocks.filter(id=>id==='${reward.id}').length`),1);
  assert.equal(flow.run(`AppState.student.starTransactions.some(item=>item.sourceId==='block:${reward.id}')`),false);

  const pending=createContext({saved:saved(flow)});
  assert.equal(pending.run('view'),'reward');
  assert.equal(pending.run('AppState.rewardFlow.selected'),null);
  assert.equal(pending.run(`chooseReward('${reward.items[0]}')`),true);
  assert.equal(pending.run(`chooseReward('${reward.items[1]}')`),false);
  assert.equal(pending.run(`isItemOwned('${reward.items[0]}')`),true);
  assert.equal(pending.run(`isItemOwned('${reward.items[1]}')`),false);
  assert.equal(pending.run(`AppState.claimedRewards.filter(id=>id==='${reward.id}').length`),1);
  const inventoryMarkup=pending.run('renderWardrobeProfile()');
  assert.ok(inventoryMarkup.includes(reward.items[0]));
  assert.ok(!inventoryMarkup.includes(`data-item="${reward.items[1]}"`));
  assert.equal(pending.run(`purchaseCatalogItem('${reward.items[1]}').reason`),'insufficient');

  const selected=createContext({saved:saved(pending)});
  assert.equal(selected.run('view'),'reward');
  assert.equal(selected.run('rewardReady'),true);
  assert.equal(selected.run('AppState.rewardFlow.selected'),reward.items[0]);
  assert.equal(selected.run(`isItemOwned('${reward.items[1]}')`),false);
  selected.run('continueReward()');
  assert.equal(selected.run('AppState.rewardFlow'),null);
  selected.run(`AppState.cursor.index=${reward.end};finishBlock()`);
  assert.equal(selected.run('AppState.rewardFlow'),null,`${reward.id} cannot be claimed twice`);
  assert.equal(selected.run(`AppState.completedBlocks.filter(id=>id==='${reward.id}').length`),1);
  assert.equal(selected.run(`AppState.claimedRewards.filter(id=>id==='${reward.id}').length`),1);
 }

 // The six independent wearable/accessory slots compose together.
 const equipment=createContext();
 equipment.run("['marius_bottom_denim','marius_top_plaid_shirt','marius_vest_harvest','marius_head_cap_blue','marius_hand_fishing_rod','marius_hand_lantern','jacket_stars','marius_outerwear_raincoat'].forEach(id=>unlockItem(id,AppState,false))");
 equipment.run("['marius_bottom_denim','marius_top_plaid_shirt','marius_vest_harvest','marius_head_cap_blue','marius_hand_fishing_rod','marius_hand_lantern'].forEach(id=>equipItem(id,AppState,false))");
 assert.equal(equipment.run("['bottom','top','vest','head','hand_left','hand_right'].every(slot=>Boolean(getEquippedItem(slot)))"),true);
 assert.equal(equipment.run("mariusEquipmentLayerEntries({bottom:'marius_bottom_denim',top:'marius_top_plaid_shirt',vest:'marius_vest_harvest',neck:'marius_neck_leaf_scarf',head:'marius_head_cap_blue',hand_left:'marius_hand_fishing_rod',hand_right:'marius_hand_lantern'}).map(entry=>entry.slot).join(',')"),'body,bottom,top,vest,neck,head,hand_left,hand_right');
 equipment.run("equipItem('jacket_stars',AppState,false)");
 assert.equal(equipment.run("getEquippedItem('outfit').id"),'jacket_stars');
 assert.equal(equipment.run("MARIUS_WEARABLE_SLOTS.every(slot=>getEquippedItem(slot)===null)"),true);
 assert.equal(equipment.run("getEquippedItem('head').id==='marius_head_cap_blue'&&getEquippedItem('hand_left').id==='marius_hand_fishing_rod'&&getEquippedItem('hand_right').id==='marius_hand_lantern'"),true);
 equipment.run("equipItem('marius_top_plaid_shirt',AppState,false);equipItem('marius_vest_harvest',AppState,false);equipItem('marius_outerwear_raincoat',AppState,false)");
 assert.equal(equipment.run("getEquippedItem('outfit')"),null);
 assert.equal(equipment.run("getEquippedItem('top').id"),'marius_top_plaid_shirt');
 assert.equal(equipment.run("getEquippedItem('vest')"),null);
 assert.equal(equipment.run("getEquippedItem('outerwear').id"),'marius_outerwear_raincoat');
 equipment.run('saveProgress()');
 const equipmentReload=createContext({saved:saved(equipment)});
 assert.equal(equipmentReload.run("getEquippedItem('top').id"),'marius_top_plaid_shirt');
 assert.equal(equipmentReload.run("getEquippedItem('outerwear').id"),'marius_outerwear_raincoat');
 assert.equal(equipmentReload.run("getEquippedItem('head').id"),'marius_head_cap_blue');

 // Large reward art carries its expanded bounds into cards and the main actor.
 const bounds=JSON.parse(catalog.run("JSON.stringify(['marius_hand_fishing_rod','marius_hand_umbrella'].map(id=>{const item=getItemById(id),layout=mariusCompositeLayout(mariusEquipmentLayerEntries({[item.slot]:id}));return {id,originX:layout.originX,originY:layout.originY,width:layout.width,height:layout.height,markup:renderItemPreview(item)};}))"));
 assert.ok(bounds[0].originX<0&&bounds[0].originY<0&&bounds[0].width>1024&&bounds[0].height>1536);
 assert.ok(bounds[1].width>1024);
 assert.ok(bounds.every(item=>item.markup.includes(`aspect-ratio:${item.width}/${item.height}`)));

 // Every reward pair has a non-persistent, directly reviewable demo route.
 for(const reward of newRewards){
  const demo=createContext({search:`?demo=1&screen=${reward.id}`});
  assert.equal(demo.run('view'),'reward');
  assert.equal(demo.run('visibleRewardFlow().id'),reward.id);
  assert.equal(demo.run(`chooseReward('${reward.items[0]}')`),true);
  assert.equal(demo.run('demoRewardItemId'),reward.items[0]);
  assert.equal(demo.store.size,0);
  const markup=demo.run('renderReward()');
  assert.ok(markup.includes(`data-item="${reward.items[0]}"`)&&markup.includes(`data-item="${reward.items[1]}"`));
  assert.ok(markup.includes(getComputedAssetName(reward.items[0])));
 }

 console.log(JSON.stringify({
  passed:true,newRewardPairs:newRewards.length,rewardItems:12,shopExclusiveItems:11,
  pendingReload:true,selectedReload:true,singleChoice:true,replaySafe:true,
  economyUnchanged:true,inventoryIntegrated:true,compatibilityRules:true,
  expandedBounds:true,demoRoutes:newRewards.map(reward=>reward.id)
 },null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});

function getComputedAssetName(itemId){
 return {
  marius_hand_fishing_rod:'marius_wardrobe_hand_fishing_rod',marius_hand_harvest_basket:'marius_wardrobe_hand_harvest_basket',
  marius_head_cap_blue:'marius_wardrobe_head_cap_blue',marius_top_plaid_shirt:'marius_wardrobe_top_plaid_shirt',
  marius_outerwear_raincoat:'marius_wardrobe_outerwear_raincoat',marius_hand_umbrella:'marius_wardrobe_hand_umbrella'
 }[itemId];
}
