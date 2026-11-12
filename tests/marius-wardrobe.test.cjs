const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createContext,saved}=require('./support/trainer-harness.cjs');

;(async()=>{
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'play/index.html'),'utf8');
const catalogSource=fs.readFileSync(path.join(root,'play/marius-wardrobe-catalog.js'),'utf8');
const preview=createContext({search:'?demo=1&screen=marius_wardrobe'});

assert.equal(preview.run('view'),'wardrobe-preview');
assert.equal(preview.store.size,0);
assert.deepEqual(JSON.parse(preview.run('JSON.stringify(MARIUS_EQUIPMENT_SLOTS)')),[
 'body_variant','bottom','top','vest','outerwear','neck','head','face','back',
 'hand_left','hand_right','extra','background'
]);
assert.equal(preview.run('MARIUS_WARDROBE_ITEMS.length'),23);
assert.equal(preview.run('new Set(MARIUS_WARDROBE_ITEMS.map(item=>item.id)).size'),23);
assert.equal(preview.run("MARIUS_WARDROBE_ITEMS.every(item=>Number.isInteger(item.priceStars)&&item.priceStars>0&&item.currency==='stars'&&item.priceMoney===null)"),true);
assert.equal(preview.run("MARIUS_WARDROBE_ITEMS.filter(item=>item.availability==='reward').length"),12);
assert.equal(preview.run("MARIUS_WARDROBE_ITEMS.filter(item=>item.availability==='shop').length"),11);
assert.equal(preview.run('ITEMS.length'),8);
assert.equal(preview.run('SHOP_ITEMS.length'),31);
assert.deepEqual(JSON.parse(preview.run('JSON.stringify(rewardConfig.map(reward=>reward.itemIds))')),[
 ['jacket_stars','jacket_racer'],['accessory_bouquet','accessory_balloon'],['hat_straw_bow','hat_adventure'],
 ['marius_hand_fishing_rod','marius_hand_satchel'],['marius_hand_harvest_basket','marius_head_harvest_hat'],
 ['marius_head_cap_blue','marius_bottom_denim'],['marius_top_plaid_shirt','marius_vest_harvest'],
 ['marius_outerwear_raincoat','marius_outerwear_field_jacket'],['marius_hand_umbrella','marius_hand_lantern']
]);

const transform=JSON.parse(preview.run('JSON.stringify(MARIUS_SOURCE_TRANSFORM)'));
assert.deepEqual(transform,{sourceWidth:794,sourceHeight:1191,scale:1536/794,x:-228,y:-383,width:1536,height:2304});
assert.equal(transform.width/transform.sourceWidth,transform.height/transform.sourceHeight);
assert.notEqual(transform.width/transform.sourceWidth,1024/794,'artwork must not be stretched to the old canvas width');

const items=JSON.parse(preview.run('JSON.stringify(MARIUS_WARDROBE_ITEMS.map(item=>({id:item.id,asset:item.asset,slot:item.slot})))'));
const pngSize=file=>{const data=fs.readFileSync(file);assert.equal(data.toString('ascii',1,4),'PNG');return [data.readUInt32BE(16),data.readUInt32BE(20),data[25]];};
for(const item of items){
 const asset=JSON.parse(preview.run(`JSON.stringify(MEDIA_ASSETS.images[${JSON.stringify(item.asset)}])`));
 assert.ok(asset,`missing registry asset ${item.asset}`);
 assert.deepEqual([asset.width,asset.height],[794,1191]);
 const relative=asset.src.replace(/^\.\//,'').split('?')[0];
 const file=path.join(root,'play',relative.replace(/^images\//,'images/'));
 assert.ok(fs.existsSync(file),`missing PNG ${file}`);
 assert.deepEqual(pngSize(file),[794,1191,6],`${item.id} must remain RGBA`);
}
for(const key of ['rain','harvest','forest','fishing']){
 const asset=JSON.parse(preview.run(`JSON.stringify(MEDIA_ASSETS.images.marius_wardrobe_reference_${key})`));
 assert.ok(fs.existsSync(path.join(root,'play',asset.src.replace(/^\.\//,'').split('?')[0])));
}

assert.equal(preview.run('MARIUS_WARDROBE_PRESETS.length'),4);
assert.equal(preview.run('MARIUS_WARDROBE_PRESETS.every(preset=>JSON.stringify(normalizeMariusEquipment(preset.equipment))===JSON.stringify({...blankMariusPreviewEquipment(),...preset.equipment}))'),true);
const harvestSlots=JSON.parse(preview.run("JSON.stringify(mariusEquipmentLayerEntries(MARIUS_WARDROBE_PRESETS.find(p=>p.id==='harvest_festival').equipment).map(entry=>entry.slot))"));
assert.deepEqual(harvestSlots,['body','bottom','top','vest','neck','head','hand_right']);

const ordinary=JSON.parse(preview.run("JSON.stringify(mariusCompositeLayout(mariusEquipmentLayerEntries({top:'marius_top_plaid_shirt'})))"));
assert.deepEqual([ordinary.originX,ordinary.originY,ordinary.width,ordinary.height],[0,0,1024,1536]);
const rain=JSON.parse(preview.run("JSON.stringify(mariusCompositeLayout(mariusEquipmentLayerEntries(MARIUS_WARDROBE_PRESETS.find(p=>p.id==='autumn_rain').equipment)))"));
assert.equal(rain.originX,0);assert.equal(rain.width,1295);assert.equal(rain.height,1536);
const harvest=JSON.parse(preview.run("JSON.stringify(mariusCompositeLayout(mariusEquipmentLayerEntries(MARIUS_WARDROBE_PRESETS.find(p=>p.id==='harvest_festival').equipment)))"));
assert.equal(harvest.width,1094);
const fishing=JSON.parse(preview.run("JSON.stringify(mariusCompositeLayout(mariusEquipmentLayerEntries(MARIUS_WARDROBE_PRESETS.find(p=>p.id==='happy_fishing').equipment)))"));
assert.ok(fishing.originX<0&&fishing.originY<0);
assert.ok(fishing.width>1024&&fishing.height>1536);

// Every visible alpha bound is inside its computed canvas after the origin shift.
assert.equal(preview.run(`MARIUS_WARDROBE_ITEMS.every(item=>{
 const layout=mariusCompositeLayout(mariusEquipmentLayerEntries({[item.slot]:item.id}));
 const bounds=mariusItemRenderBounds(item);
 return bounds.left-layout.originX>=0&&bounds.top-layout.originY>=0&&bounds.right-layout.originX<=layout.width&&bounds.bottom-layout.originY<=layout.height;
})`),true);

const rainMarkup=preview.run("renderCharacter('wardrobe-lab',{includeBackground:false,previewEquipment:MARIUS_WARDROBE_PRESETS.find(p=>p.id==='autumn_rain').equipment})");
assert.match(rainMarkup,/<canvas class="marius-composite" width="1295" height="1536"/);
assert.ok(rainMarkup.includes('marius_wardrobe_hand_umbrella'));
const fishingMarkup=preview.run("renderCharacter('wardrobe-lab',{includeBackground:false,previewEquipment:MARIUS_WARDROBE_PRESETS.find(p=>p.id==='happy_fishing').equipment})");
assert.match(fishingMarkup,/data-marius-origin="-12,-62"/);
assert.match(fishingMarkup,/<canvas class="marius-composite" width="1038" height="1598"/);
const umbrellaCard=preview.run("renderItemPreview(mariusWardrobeCatalog.get('marius_hand_umbrella'))");
assert.match(umbrellaCard,/<canvas class="marius-composite" width="1295" height="1536"/);
const rodCard=preview.run("renderItemPreview(mariusWardrobeCatalog.get('marius_hand_fishing_rod'))");
assert.match(rodCard,/data-marius-origin="-12,-62"/);

const draw=JSON.parse(await preview.run(`(async()=>{
 const calls=[],entries=mariusEquipmentLayerEntries(MARIUS_WARDROBE_PRESETS.find(p=>p.id==='happy_fishing').equipment);
 const canvas={dataset:{},width:0,height:0,isConnected:true,getContext(){return {clearRect(...args){calls.push(['clearRect',...args]);},drawImage(image,...args){calls.push(['drawImage',image.key,...args]);}}}};
 await setMariusCanvasComposition(canvas,entries,'wardrobe-lab',async source=>({key:source}));
 return JSON.stringify({width:canvas.width,height:canvas.height,calls});
})()`));
assert.deepEqual([draw.width,draw.height],[1038,1598]);
assert.deepEqual(draw.calls[0],['clearRect',0,0,1038,1598]);
assert.deepEqual(draw.calls[1].slice(-4),[12,62,1024,1536]);
assert.deepEqual(draw.calls.at(-1).slice(-4),[-216,-321,1536,2304]);

// The preview state is ephemeral and compatibility switching is explicit.
const appBefore=preview.run('JSON.stringify(AppState)');
preview.run("applyMariusPreviewPreset('harvest_festival')");
assert.equal(preview.run("mariusPreviewEquipment.vest==='marius_vest_harvest'&&mariusPreviewEquipment.top==='marius_top_plaid_shirt'"),true);
preview.run("chooseMariusPreviewItem('jacket_stars')");
assert.equal(preview.run("mariusPreviewEquipment.body_variant"),'jacket_stars');
assert.equal(preview.run('MARIUS_WEARABLE_SLOTS.every(slot=>mariusPreviewEquipment[slot]===null)'),true);
assert.equal(preview.run("mariusPreviewEquipment.head==='marius_head_harvest_hat'&&mariusPreviewEquipment.hand_right==='marius_hand_harvest_basket'"),true);
preview.run("chooseMariusPreviewItem('marius_top_plaid_shirt')");
assert.equal(preview.run('mariusPreviewEquipment.body_variant'),null);
assert.equal(preview.run('JSON.stringify(AppState)'),appBefore);
preview.run('saveProgress()');
assert.equal(preview.store.size,0);

const fresh=createContext();
fresh.run("unlockItem('jacket_stars');unlockItem('hat_straw_bow');unlockItem('accessory_balloon');equipItem('accessory_balloon');awardStars(50,'test_seed','test:seed',1);awardStars(3,'block_completed','block:reward_abc',2);purchaseCatalogItem('background_jungle');AppState.claimedRewards=['reward_abc'];AppState.completedBlocks=['reward_abc'];saveProgress()");
const oldSave=JSON.parse(fresh.store.get('alfie-abc-v1'));
delete oldSave.equipmentSchemaVersion;
for(const slot of ['body_variant','bottom','top','vest','outerwear','neck'])delete oldSave.characterState.equipped[slot];
oldSave.characterState.equipped.outfit=null;
oldSave.characterState.equipped.head=null;
const migrated=createContext({saved:{'alfie-abc-v1':JSON.stringify(oldSave)}});
assert.equal(migrated.run('AppState.rewardStateVersion'),3);
assert.equal(migrated.run('AppState.equipmentSchemaVersion'),1);
assert.equal(migrated.run("getEquippedItem('outfit')"),null);
assert.equal(migrated.run("getEquippedItem('head')"),null);
assert.equal(migrated.run("getEquippedItem('hand_right').id"),'accessory_balloon');
assert.equal(migrated.run("isItemOwned('jacket_stars')&&isItemOwned('hat_straw_bow')&&isItemOwned('background_jungle')"),true);
assert.equal(migrated.run("AppState.student.purchasedItemIds.includes('background_jungle')"),true);
assert.equal(migrated.run('AppState.student.starBalance'),35);
assert.equal(migrated.run("['body_variant','bottom','top','vest','outerwear','neck'].every(slot=>AppState.characterState.equipped[slot]===null)"),true);

assert.match(source,/DEMO_WARDROBE_PREVIEW=DEMO&&DEMO_SCREEN==='marius_wardrobe'/);
assert.match(source,/@media\(max-width:820px\)[\s\S]*\.wardrobe-lab-workbench \{grid-template-columns:1fr;\}/);
assert.ok(!source.match(/data-action="[^\"]*marius[^\"]*"/g)?.some(markup=>markup.includes('topbar')));
assert.match(catalogSource,/MARIUS_REWARD_BLOCK_BY_ITEM/);

console.log(JSON.stringify({
 passed:true,catalogItems:items.length,presets:4,sourceSize:[794,1191],
 sourceTransform:[-228,-383,1536,2304],expandedCanvases:{rain:[1295,1536],harvest:[1094,1536],fishing:[1038,1598]},
 isolatedPreview:true,legacyBodyVariants:true,migrationPreservesUnequipped:true,mobileLayout:true
},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
