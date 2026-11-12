'use strict';

/* Catalog for the supplied Marius wardrobe artwork.
   The source files share one 794x1191 coordinate system. The transform below
   registers that source system against the current 1024x1536 Marius canvas. */
const MARIUS_EQUIPMENT_SCHEMA_VERSION=1;
const MARIUS_EQUIPMENT_SLOTS=Object.freeze([
 'body_variant','bottom','top','vest','outerwear','neck','head','face','back',
 'hand_left','hand_right','extra','background'
]);
const MARIUS_WEARABLE_SLOTS=Object.freeze(['bottom','top','vest','outerwear','neck']);
const MARIUS_LAYER_ORDER=Object.freeze([
 'back','body_variant','bottom','top','vest','outerwear','neck','face','head',
 'hand_left','hand_right','extra'
]);
const MARIUS_LAYER_Z=Object.freeze(Object.fromEntries(MARIUS_LAYER_ORDER.map((slot,index)=>[slot,(index+1)*10])));
const MARIUS_SOURCE_TRANSFORM=Object.freeze({
 sourceWidth:794,sourceHeight:1191,
 scale:1536/794,x:-228,y:-383,width:1536,height:2304
});
const MARIUS_REWARD_BLOCK_BY_ITEM=Object.freeze({
 marius_hand_fishing_rod:'reward_jkl',marius_hand_satchel:'reward_jkl',
 marius_hand_harvest_basket:'reward_mno',marius_head_harvest_hat:'reward_mno',
 marius_head_cap_blue:'reward_pqr',marius_bottom_denim:'reward_pqr',
 marius_top_plaid_shirt:'reward_stu',marius_vest_harvest:'reward_stu',
 marius_outerwear_raincoat:'reward_vwx',marius_outerwear_field_jacket:'reward_vwx',
 marius_hand_umbrella:'reward_yz',marius_hand_lantern:'reward_yz'
});
const MARIUS_PRICE_STARS_BY_ITEM=Object.freeze({
 marius_bottom_sport_red:6,marius_bottom_sport_brown:6,marius_bottom_denim:10,
 marius_top_crop_blue:7,marius_top_sport_white:7,marius_top_plaid_shirt:11,
 marius_vest_harvest:11,marius_outerwear_raincoat:14,marius_outerwear_field_jacket:14,
 marius_neck_striped_scarf:5,marius_neck_leaf_scarf:5,marius_neck_plaid_tie:4,
 marius_head_cap_blue:10,marius_head_cap_brown:7,marius_head_rain_hat:8,
 marius_head_harvest_hat:10,marius_head_forest_hat:8,
 marius_hand_umbrella:14,marius_hand_harvest_basket:10,marius_hand_lantern:14,
 marius_hand_satchel:10,marius_hand_fish_keepnet:9,marius_hand_fishing_rod:10
});

const mariusWardrobeItem=(id,name,category,slot,asset,sourceBounds,compatibility={})=>Object.freeze({
 id,name,category,slot,asset,rewardId:MARIUS_REWARD_BLOCK_BY_ITEM[id]||null,
 priceStars:MARIUS_PRICE_STARS_BY_ITEM[id],priceMoney:null,currency:'stars',isPremium:false,
 unlockCondition:MARIUS_REWARD_BLOCK_BY_ITEM[id]||'always',
 positioning:MARIUS_SOURCE_TRANSFORM,
 sourceBounds:Object.freeze(sourceBounds),
 layerOrder:MARIUS_LAYER_Z[slot],
 compatibility:Object.freeze({
  incompatibleSlots:Object.freeze([...(compatibility.incompatibleSlots||[])]),
  requiresSlots:Object.freeze([...(compatibility.requiresSlots||[])])
 }),
 availability:MARIUS_REWARD_BLOCK_BY_ITEM[id]?'reward':'shop'
});
const incompatibleWithBody=Object.freeze({incompatibleSlots:['body_variant']});

const MARIUS_WARDROBE_ITEMS=Object.freeze([
 mariusWardrobeItem('marius_bottom_sport_red','Красные спортивные шорты','Низ','bottom','marius_wardrobe_bottom_sport_red',{x:314,y:608,width:172,height:182},incompatibleWithBody),
 mariusWardrobeItem('marius_bottom_sport_brown','Коричневые спортивные шорты','Низ','bottom','marius_wardrobe_bottom_sport_brown',{x:314,y:608,width:172,height:182},incompatibleWithBody),
 mariusWardrobeItem('marius_bottom_denim','Джинсовые шорты','Низ','bottom','marius_wardrobe_bottom_denim',{x:325,y:617,width:160,height:163},incompatibleWithBody),
 mariusWardrobeItem('marius_top_crop_blue','Голубая короткая майка','Верх','top','marius_wardrobe_top_crop_blue',{x:350,y:479,width:121,height:124},incompatibleWithBody),
 mariusWardrobeItem('marius_top_sport_white','Белая спортивная майка','Верх','top','marius_wardrobe_top_sport_white',{x:336,y:472,width:144,height:199},incompatibleWithBody),
 mariusWardrobeItem('marius_top_plaid_shirt','Клетчатая рубашка','Верх','top','marius_wardrobe_top_plaid_shirt',{x:292,y:451,width:221,height:239},incompatibleWithBody),
 mariusWardrobeItem('marius_vest_harvest','Стёганый жилет','Жилет','vest','marius_wardrobe_vest_harvest',{x:330,y:443,width:152,height:245},{incompatibleSlots:['body_variant','outerwear']}),
 mariusWardrobeItem('marius_outerwear_raincoat','Жёлтый дождевик','Верхняя одежда','outerwear','marius_wardrobe_outerwear_raincoat',{x:270,y:417,width:296,height:351},{incompatibleSlots:['body_variant','vest']}),
 mariusWardrobeItem('marius_outerwear_field_jacket','Зелёная куртка','Верхняя одежда','outerwear','marius_wardrobe_outerwear_field_jacket',{x:274,y:446,width:272,height:310},{incompatibleSlots:['body_variant','vest']}),
 mariusWardrobeItem('marius_neck_striped_scarf','Полосатый шарф','На шею','neck','marius_wardrobe_neck_striped_scarf',{x:262,y:437,width:211,height:209},incompatibleWithBody),
 mariusWardrobeItem('marius_neck_leaf_scarf','Шарф с листьями','На шею','neck','marius_wardrobe_neck_leaf_scarf',{x:344,y:427,width:144,height:222},incompatibleWithBody),
 mariusWardrobeItem('marius_neck_plaid_tie','Клетчатый галстук','На шею','neck','marius_wardrobe_neck_plaid_tie',{x:359,y:418,width:101,height:138},incompatibleWithBody),
 mariusWardrobeItem('marius_head_cap_blue','Синяя бейсболка','На голове','head','marius_wardrobe_head_cap_blue',{x:314,y:230,width:151,height:87}),
 mariusWardrobeItem('marius_head_cap_brown','Коричневая бейсболка','На голове','head','marius_wardrobe_head_cap_brown',{x:314,y:230,width:151,height:87}),
 mariusWardrobeItem('marius_head_rain_hat','Жёлтая панама','На голове','head','marius_wardrobe_head_rain_hat',{x:303,y:237,width:189,height:135}),
 mariusWardrobeItem('marius_head_harvest_hat','Осенняя соломенная шляпа','На голове','head','marius_wardrobe_head_harvest_hat',{x:264,y:199,width:198,height:153}),
 mariusWardrobeItem('marius_head_forest_hat','Лесная шляпа','На голове','head','marius_wardrobe_head_forest_hat',{x:288,y:243,width:189,height:127}),
 mariusWardrobeItem('marius_hand_umbrella','Большой осенний зонтик','В руки','hand_right','marius_wardrobe_hand_umbrella',{x:477,y:237,width:310,height:282}),
 mariusWardrobeItem('marius_hand_harvest_basket','Корзинка с урожаем','В руки','hand_right','marius_wardrobe_hand_harvest_basket',{x:494,y:501,width:189,height:223}),
 mariusWardrobeItem('marius_hand_lantern','Фонарик исследователя','В руки','hand_right','marius_wardrobe_hand_lantern',{x:525,y:409,width:113,height:476}),
 mariusWardrobeItem('marius_hand_satchel','Кожаная сумка','В руки','hand_left','marius_wardrobe_hand_satchel',{x:212,y:675,width:160,height:203}),
 mariusWardrobeItem('marius_hand_fish_keepnet','Садок с рыбой','В руки','hand_right','marius_wardrobe_hand_fish_keepnet',{x:491,y:491,width:157,height:329}),
 mariusWardrobeItem('marius_hand_fishing_rod','Удочка','В руки','hand_left','marius_wardrobe_hand_fishing_rod',{x:112,y:166,width:233,height:620})
]);

const MARIUS_WARDROBE_PRESETS=Object.freeze([
 Object.freeze({
  id:'autumn_rain',name:'Осенний дождик',referenceAsset:'marius_wardrobe_reference_rain',
  equipment:Object.freeze({bottom:'marius_bottom_sport_red',outerwear:'marius_outerwear_raincoat',neck:'marius_neck_leaf_scarf',head:'marius_head_rain_hat',hand_right:'marius_hand_umbrella'})
 }),
 Object.freeze({
  id:'harvest_festival',name:'Праздник урожая',referenceAsset:'marius_wardrobe_reference_harvest',
  equipment:Object.freeze({bottom:'marius_bottom_sport_brown',top:'marius_top_plaid_shirt',vest:'marius_vest_harvest',neck:'marius_neck_plaid_tie',head:'marius_head_harvest_hat',hand_right:'marius_hand_harvest_basket'})
 }),
 Object.freeze({
  id:'forest_explorer',name:'Лесной исследователь',referenceAsset:'marius_wardrobe_reference_forest',
  equipment:Object.freeze({outerwear:'marius_outerwear_field_jacket',neck:'marius_neck_striped_scarf',head:'hat_adventure',hand_left:'marius_hand_satchel',hand_right:'marius_hand_lantern'})
 }),
 Object.freeze({
  id:'happy_fishing',name:'Весёлая рыбалка',referenceAsset:'marius_wardrobe_reference_fishing',
  equipment:Object.freeze({bottom:'marius_bottom_denim',top:'marius_top_crop_blue',head:'marius_head_cap_blue',hand_left:'marius_hand_fishing_rod',hand_right:'marius_hand_fish_keepnet'})
 })
]);

/* Collections deliberately reuse catalog IDs. Ownership continues to live in
   RewardState. The presets are also the renderer source of truth, so the shop
   can never drift away from the approved freelancer combinations. */
const MARIUS_COLLECTIONS=Object.freeze(MARIUS_WARDROBE_PRESETS.map(preset=>Object.freeze({
 id:preset.id,
 name:preset.name,
 referenceAsset:preset.referenceAsset,
 equipment:preset.equipment,
 itemIds:Object.freeze(Object.values(preset.equipment))
})));
