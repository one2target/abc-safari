'use strict';

const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const play=path.join(root,'play');
const registryVersion='course-packs-2';
const blocks=[
  ['ABC',['A','B','C']],['DEF',['D','E','F']],['GHI',['G','H','I']],
  ['JKL',['J','K','L']],['MNO',['M','N','O']],['PQR',['P','Q','R']],
  ['STU',['S','T','U']],['VWX',['V','W','X']],['YZ',['Y','Z']]
];
const letterToBlock=new Map(blocks.flatMap(([block,letters])=>letters.map(letter=>[letter,block])));
const words={A:'apple',B:'ball',C:'cat',D:'dog',E:'egg',F:'fish',G:'goat',H:'hat',I:'iguana',J:'juice',K:'kite',L:'lion',M:'monkey',N:'nest',O:'octopus',P:'panda',Q:'queen',R:'rabbit',S:'sun',T:'tiger',U:'umbrella',V:'van',W:'whale',X:'fox',Y:'yoyo',Z:'zebra'};

const context={};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(play,'assets.js'),'utf8')+';globalThis.__media=MEDIA_ASSETS;',context);
const media=context.__media;
const groups=Object.fromEntries(['core',...blocks.map(([name])=>name),'training','profile','shop','wardrobe'].map(name=>[name,[]]));
const seen=new Map();

function sizeFor(url){
  const clean=url.split('?')[0];
  const absolute=clean.startsWith('/')?path.join(root,clean.slice(1)):path.resolve(play,clean);
  try{return fs.statSync(absolute).size;}catch{return 0;}
}
function add(group,url,type,tier='lesson',extra={}){
  if(!groups[group])throw new Error(`Unknown resource group ${group}`);
  const key=`${group}|${url}`;
  if(seen.has(key))return;
  const item=Object.freeze({url,type,bytes:sizeFor(url),tier,...extra});
  groups[group].push(item);seen.set(key,item);
}

// Files that are required to restore state and draw the home screen.
for(const url of [
  '/analytics-consent.css?v=consent-v2','/analytics-consent.js?v=consent-v2',
  './manifest.webmanifest','./assets.js?v=resource-packs2','./marius-wardrobe-catalog.js?v=marius-collections4',
  './audio-manager.js?v=critical-audio2','./resource-registry.js?v=course-packs-2','./resource-loader.js?v=critical-audio3',
  './training-config.js?v=training-v1','./training-state.js?v=training-v1','./student-domain.js?v=student-profile-v2'
])add('core',url,url.endsWith('.css')||url.includes('.css?')?'style':url.includes('.js')?'script':'manifest','core');
for(const key of ['background_home','giraffe_home'])add('core',media.images[key].src,'image','core',{assetKey:key});
// The full 1024×1536 source is retained for course Canvas, rewards and
// wardrobe/profile screens, but it no longer blocks the first home screen.
for(const [block] of blocks)add(block,media.images.giraffe_base.src,'image','lesson',{assetKey:'giraffe_base'});

const commonAudio=new Set(['welcome','start','new_letter','look_letter','listen','find_letter','find_small_letter','find_picture','which_starts','which_letter','choose_letter','choose_picture','listen_word','repeat','try_again','almost','correct','great','well_done','super','amazing','next','level_complete','reward','choose_reward','new_clothes','new_item','dress_giraffe','challenge','final_challenge','three_correct','all_done','come_again','repeat_letters','need_practice','giraffe_happy']);
function audioLetter(key){
  for(const [letter,word] of Object.entries(words)){
    const lower=letter.toLowerCase();
    if([`${lower}_name`,`${lower}_sound`,`${lower}_${word}`,word,`${word}_ru`].includes(key))return letter;
  }
  return null;
}
for(const [key,asset] of Object.entries(media.audio)){
  if(key.startsWith('river_')){add('JKL',asset.src,'audio','game',{assetKey:key});continue;}
  if(commonAudio.has(key)){for(const [block] of blocks)add(block,asset.src,'audio',key==='welcome'?'first':'lesson',{assetKey:key,shared:true});continue;}
  const letter=audioLetter(key),block=letterToBlock.get(letter);
  if(block)add(block,asset.src,'audio',letter==='A'?'first':'lesson',{assetKey:key,letters:[letter]});
}

const blockRuntime={
  ABC:{scripts:['find-object-scenes.js','hidden-object-game.js'],styles:['hidden-object-game.css']},
  DEF:{scripts:['letter-maze-scenes.js?v=letter-maze-def3','letter-maze-game.js?v=letter-maze-def3'],styles:['letter-maze-game.css?v=letter-maze-def3']},
  GHI:{scripts:['balloon-pop-game.js?v=training-v1'],styles:['balloon-pop-game.css']},
  JKL:{scripts:['river-crossing-game.js?v=river-training-v1'],styles:['river-crossing-game.css?v=river-finale3']},
  MNO:{scripts:['fruit-rain-game.js?v=fruit-rain-v6'],styles:['fruit-rain-game.css?v=fruit-rain-v6']},
  PQR:{scripts:['bubble-cannon-game.js?v=bubble-cannon-pqr1'],styles:['bubble-cannon-game.css?v=bubble-cannon-pqr1']},
  STU:{scripts:['treehouse-stu-game.js?v=treehouse-stu6'],styles:['treehouse-stu-game.css?v=treehouse-stu6']},
  VWX:{scripts:['railway-vwx-game.js?v=railway-vwx2'],styles:['railway-vwx-game.css?v=railway-vwx2']},
  YZ:{scripts:['flight-yz-game.js?v=flight-yz13'],styles:['flight-yz-game.css?v=flight-yz13']}
};
for(const [group,runtime] of Object.entries(blockRuntime)){
  runtime.scripts.forEach(file=>add(group,'./'+file,'script','runtime'));
  runtime.styles.forEach(file=>add(group,'./'+file,'style','runtime'));
}

const imageKeyGroups={
  ABC:['marius_room_abc','background_reward','giraffe_jacket_racer','giraffe_jacket_stars','reward_icon_jacket_racer','reward_icon_jacket_stars'],
  DEF:['maze_d','maze_e','maze_f','maze_dog','maze_egg','maze_fish','marius_letter_maze_def','accessory_balloon','accessory_bouquet'],
  GHI:['marius_hat_straw_bow','marius_hat_adventure'],
  JKL:['river_crossing_background','river_stone_top_left','river_stone_top_right','river_stone_bottom_left','river_stone_bottom_center','river_stone_bottom_right'],
  MNO:['marius_wardrobe_hand_harvest_basket','marius_wardrobe_head_harvest_hat'],
  PQR:['marius_wardrobe_head_cap_blue','marius_wardrobe_bottom_denim'],
  STU:['marius_wardrobe_top_plaid_shirt','marius_wardrobe_vest_harvest'],
  VWX:['marius_wardrobe_outerwear_raincoat','marius_wardrobe_outerwear_field_jacket'],
  YZ:['marius_wardrobe_hand_umbrella','marius_wardrobe_hand_lantern']
};
for(const [group,keys] of Object.entries(imageKeyGroups))for(const key of keys){const asset=media.images[key];if(asset)add(group,asset.src,'image',key.startsWith('reward_')||key.startsWith('giraffe_')||key.startsWith('accessory_')||key.startsWith('marius_wardrobe_')||key.startsWith('marius_hat_')?'reward':'game',{assetKey:key});}

const directoryGroups={'fruit-rain':'MNO','bubble-cannon':'PQR','treehouse-stu':'STU','railway-vwx':'VWX','flight-yz':'YZ'};
for(const [directory,group] of Object.entries(directoryGroups)){
  const absolute=path.join(play,'images',directory);
  for(const name of fs.readdirSync(absolute)){
    const file=path.join(absolute,name);if(!fs.statSync(file).isFile()||directory==='railway-vwx'&&name==='references')continue;
    add(group,`./images/${directory}/${name}`,'image','game');
  }
}
for(const name of fs.readdirSync(path.join(play,'images','stickers')))add('ABC',`./images/stickers/${name}`,'image','feedback');

// Section-only resources. They are never part of automatic course look-ahead.
add('training','./training-engine.js?v=training-v1','script','runtime');
add('training','./training.css?v=training-layout-v4','style','runtime');
for(const url of ['./balloon-pop-game.js?v=training-v1','./balloon-pop-game.css','./river-crossing-game.js?v=river-training-v1','./river-crossing-game.css?v=river-finale3'])add('training',url,url.includes('.css')?'style':'script','runtime');
for(const key of ['river_crossing_background','river_stone_top_left','river_stone_top_right','river_stone_bottom_left','river_stone_bottom_center','river_stone_bottom_right'])add('training',media.images[key].src,'image','game',{assetKey:key});
add('profile','./student-profile.css?v=student-collections-v1','style','runtime');
add('shop','./student-profile.css?v=student-collections-v1','style','runtime');
add('wardrobe','./student-profile.css?v=student-collections-v1','style','runtime');
for(const section of ['profile','shop','wardrobe'])add(section,media.images.giraffe_base.src,'image','section',{assetKey:'giraffe_base'});
for(const [key,asset] of Object.entries(media.images))if(key.startsWith('marius_wardrobe_')){add('shop',asset.src,'image','section',{assetKey:key});add('wardrobe',asset.src,'image','section',{assetKey:key});}

const generatedAt=new Date().toISOString();
const buildOutput=()=>({version:registryVersion,generatedAt,blockOrder:blocks.map(([name])=>name),letterToBlock:Object.fromEntries(letterToBlock),groups:Object.fromEntries(Object.entries(groups))});
const render=output=>`// Generated by scripts/generate-resource-registry.cjs. Do not edit by hand.\n`+
  `'use strict';\nconst RESOURCE_REGISTRY=Object.freeze(${JSON.stringify(output,null,2)});\n`+
  `if(typeof window!=='undefined')window.RESOURCE_REGISTRY=RESOURCE_REGISTRY;\n`+
  `if(typeof module!=='undefined'&&module.exports)module.exports=RESOURCE_REGISTRY;\n`;
// The registry lists itself as a core resource. Resolve that byte count to a
// fixed point so one generator run always produces a fresh, self-consistent file.
const selfIndex=groups.core.findIndex(item=>item.url.startsWith('./resource-registry.js'));
let output=buildOutput(),source=render(output);
for(let attempt=0;attempt<4;attempt++){
  const bytes=Buffer.byteLength(source);
  if(groups.core[selfIndex].bytes===bytes)break;
  groups.core[selfIndex]=Object.freeze({...groups.core[selfIndex],bytes});
  output=buildOutput();source=render(output);
}
fs.writeFileSync(path.join(play,'resource-registry.js'),source);
console.log(JSON.stringify(Object.fromEntries(Object.entries(groups).map(([name,resources])=>[name,{count:resources.length,bytes:resources.reduce((sum,item)=>sum+item.bytes,0)}])),null,2));
