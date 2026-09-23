const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createContext,saved}=require('./support/trainer-harness.cjs');
const {verifyCharacterAssets}=require('./character-assets.test.cjs');

;(async()=>{
const root=path.resolve(__dirname,'..');
const trainerSource=fs.readFileSync(path.join(root,'play/index.html'),'utf8');
const verifiedAssets=verifyCharacterAssets();
const a=createContext();
a.run("['jacket_stars','jacket_racer','accessory_bouquet','accessory_balloon','hat_straw_bow','hat_adventure'].forEach(id=>unlockItem(id))");

assert.deepEqual(
 JSON.parse(a.run('JSON.stringify(CHARACTER_LAYER_ORDER)')),
 ['back','body','face','head','hand_left','hand_right','extra']
);

const canvasAssets=html=>{
 const value=html.match(/<canvas class="marius-composite"[^>]+data-marius-assets="([^"]*)"/)?.[1];
 assert.notEqual(value,undefined,'large character must contain one canvas compositor');
 return value?value.split(','):[];
};
const renderWith=({outfit=null,head=null,hand=null,scene='gameplay',background=false}={})=>{
 a.run(`AppState.characterState.equipped.outfit=${JSON.stringify(outfit)};AppState.characterState.equipped.head=${JSON.stringify(head)};AppState.characterState.equipped.hand_right=${JSON.stringify(hand)}`);
 return a.run(`renderCharacter(${JSON.stringify(scene)},{includeBackground:${background}})`);
};

// Acceptance combinations: selection and draw order are fixed before JS paints
// every source at the same 0,0,1024,1536 rectangle.
const combinations=[
 [{head:'hat_adventure'},['giraffe_base','marius_hat_adventure']],
 [{head:'hat_straw_bow'},['giraffe_base','marius_hat_straw_bow']],
 [{hand:'accessory_bouquet'},['giraffe_base','accessory_bouquet']],
 [{hand:'accessory_balloon'},['giraffe_base','accessory_balloon']],
 [{outfit:'jacket_racer',head:'hat_adventure'},['giraffe_jacket_racer','marius_hat_adventure']],
 [{outfit:'jacket_stars',head:'hat_adventure'},['giraffe_jacket_stars','marius_hat_adventure']],
 [{outfit:'jacket_stars',head:'hat_adventure',hand:'accessory_bouquet'},['giraffe_jacket_stars','marius_hat_adventure','accessory_bouquet']],
 [{},['giraffe_base']]
];
for(const [state,expected] of combinations){
 const rendered=renderWith(state);
 assert.deepEqual(canvasAssets(rendered),expected);
 assert.equal((rendered.match(/<canvas /g)||[]).length,1);
 assert.ok(!rendered.includes('marius-stack'));
 assert.ok(!rendered.includes('marius-stack-layer'));
 assert.ok(!rendered.includes('character-layer'));
}

const dressed=renderWith({outfit:'jacket_stars',head:'hat_adventure',hand:'accessory_bouquet'});
assert.match(dressed,/<canvas class="marius-composite" width="1024" height="1536"/);
assert.ok(dressed.includes('./images/giraffe_jacket_stars.png?v=character-canvas4'));
assert.ok(dressed.includes('./images/marius_hat_adventure.png?v=character-canvas4'));
assert.ok(dressed.includes('./images/accessory_bouquet.png?v=character-canvas4'));
assert.ok(!dressed.includes('headwear_01'));
assert.ok(!dressed.includes('headwear_02'));

const home=renderWith({outfit:'jacket_stars',head:'hat_adventure',hand:'accessory_bouquet',scene:'home',background:true});
assert.ok(home.includes('class="marius-stage-background"'));
assert.ok(home.indexOf('marius-stage-background')<home.indexOf('class="marius-composite"'));
assert.ok(!canvasAssets(home).includes('background_home'));

// The compositor clears once, then paints every loaded image into exactly the
// canonical rectangle. There are no per-slot coordinates.
const drawCalls=JSON.parse(await a.run(`(async()=>{
 const calls=[];
 const canvas={dataset:{},isConnected:true,getContext(){return {clearRect(...args){calls.push(['clearRect',...args]);},drawImage(image,...args){calls.push(['drawImage',image.key,...args]);}}}};
 await renderMariusComposite(canvas,{body:'body',head:'head',hand_right:'hand'},async key=>({key}));
 return JSON.stringify(calls);
})()`));
assert.deepEqual(drawCalls,[
 ['clearRect',0,0,1024,1536],
 ['drawImage','body',0,0,1024,1536],
 ['drawImage','head',0,0,1024,1536],
 ['drawImage','hand',0,0,1024,1536]
]);

// Reusing a canvas after equipment changes performs a new clear + full draw,
// so pixels from a previously equipped item cannot survive.
const redrawCalls=JSON.parse(await a.run(`(async()=>{
 const calls=[];
 const stage={classList:{add(){},remove(){}}};
 const canvas={dataset:{mariusAssets:'giraffe_base,marius_hat_adventure',mariusSlots:'body,head',mariusSources:'giraffe_base|marius_hat_adventure'},isConnected:true,closest(){return stage;},getContext(){return {clearRect(...args){calls.push(['clearRect',...args]);},drawImage(image,...args){calls.push(['drawImage',image.key,...args]);}}}};
 const root={querySelectorAll(){return [canvas];}};
 const load=async key=>({key});
 await wireCharacterComposites(root,load);
 canvas.dataset.mariusAssets='giraffe_jacket_stars,accessory_bouquet';
 canvas.dataset.mariusSlots='body,hand_right';
 canvas.dataset.mariusSources='giraffe_jacket_stars|accessory_bouquet';
 await wireCharacterComposites(root,load);
 return JSON.stringify(calls);
})()`));
assert.equal(redrawCalls.filter(call=>call[0]==='clearRect').length,2);
assert.deepEqual(redrawCalls.slice(-3),[
 ['clearRect',0,0,1024,1536],
 ['drawImage','giraffe_jacket_stars',0,0,1024,1536],
 ['drawImage','accessory_bouquet',0,0,1024,1536]
]);

assert.match(trainerSource,/\.marius-composite \{position:relative;z-index:1;display:block;width:100%;height:auto;aspect-ratio:2\/3;/);
assert.ok(!trainerSource.includes('.marius-stack'));
assert.ok(!trainerSource.includes('.marius-stack-layer'));
assert.ok(!trainerSource.includes('.character-layer'));
assert.ok(!trainerSource.includes('--character-x'));
assert.ok(!trainerSource.includes('--character-y'));
assert.ok(!trainerSource.includes('--character-scale'));
assert.ok(!trainerSource.includes('character-pop'));
assert.ok(!trainerSource.includes('debugLayers'));
assert.ok(!trainerSource.includes('rewardLayerDebug'));
assert.ok(trainerSource.includes('function renderMariusComposite(canvas,composition'));
assert.match(trainerSource,/context\.drawImage\(image,0,0,characterConfig\.width,characterConfig\.height\)/);
assert.match(trainerSource,/equip:button=>\{if\(equipItem\(button\.dataset\.item\)\)showScreen\(\);\}/);
assert.match(trainerSource,/unequip:button=>\{if\(unequipItem\(button\.dataset\.item\)\)showScreen\(\);\}/);
assert.match(trainerSource,/function wireMedia\(root=document\)[\s\S]*wireCharacterComposites\(root\);/);
assert.match(trainerSource,/\.item-preview-stage \{position:relative;display:block;/);
assert.match(trainerSource,/\.accessory-art>img \{width:auto;height:240%;left:50%;top:-20%;transform:translateX\(-80%\);\}/);

const runtimeAssets={
 giraffe_base:'giraffe_base.png',
 giraffe_jacket_stars:'giraffe_jacket_stars.png',
 giraffe_jacket_racer:'giraffe_jacket_racer.png',
 marius_hat_adventure:'marius_hat_adventure.png',
 marius_hat_straw_bow:'marius_hat_straw_bow.png',
 accessory_bouquet:'accessory_bouquet.png',
 accessory_balloon:'accessory_balloon.png'
};
const pngSize=file=>{const data=fs.readFileSync(path.join(root,'play/images',file));return [data.readUInt32BE(16),data.readUInt32BE(20)];};
for(const [asset,file] of Object.entries(runtimeAssets)){
 assert.equal(a.run(`MEDIA_ASSETS.images.${asset}.src`),`./images/${file}?v=character-canvas4`);
 assert.deepEqual(pngSize(file),file==='accessory_balloon.png'?[1024,1535]:[1024,1536]);
}
assert.match(trainerSource,/<script src="\.\/assets\.js\?v=character-canvas4"><\/script>/);

// Demo-only visual override ignores equipped state on the large reward canvas.
const demoReward=createContext({search:'?demo=1&screen=reward_ghi'});
assert.equal(demoReward.run('view'),'reward');
assert.equal(demoReward.run('AppState.rewardFlow'),null);
assert.deepEqual(canvasAssets(demoReward.run('renderReward()')),['giraffe_base','marius_hat_adventure','accessory_bouquet']);
assert.equal(demoReward.run("chooseReward('hat_straw_bow')"),true);
assert.deepEqual(canvasAssets(demoReward.run('renderReward()')),['giraffe_base','marius_hat_straw_bow','accessory_bouquet']);
assert.equal(demoReward.run("chooseReward('hat_adventure')"),true);
assert.deepEqual(canvasAssets(demoReward.run('renderReward()')),['giraffe_base','marius_hat_adventure','accessory_bouquet']);
assert.equal(demoReward.run('AppState.characterState.ownedItems.length'),0);
assert.equal(demoReward.store.size,0);
assert.equal(demoReward.run('BUILD_ID'),'character-canvas4');
assert.ok(trainerSource.includes('DEMO · отдельный прогресс · BUILD ${escapeHTML(BUILD_ID)}'));

// URL shortcuts open the requested letter/screen in memory and never persist
// the temporary cursor or grant ownership.
for(const [index,letter] of [...'ABCDEFGHI'].entries()){
 const shortcut=createContext({search:`?demo=1&letter=${letter}`});
 assert.equal(shortcut.run('view'),'course');
 assert.equal(shortcut.run('AppState.cursor.phase'),'lesson');
 assert.equal(shortcut.run('AppState.cursor.index'),index);
 assert.equal(shortcut.run('AppState.cursor.step'),0);
 shortcut.run('saveProgress()');
 assert.equal(shortcut.store.size,0);
 assert.equal(shortcut.run('AppState.characterState.ownedItems.length'),0);
}
const demoInventory=createContext({search:'?demo=1&screen=inventory'});
assert.equal(demoInventory.run('view'),'progress');
assert.equal(demoInventory.store.size,0);

// Every large current-skin display emits the same single-canvas architecture.
a.run("equipItem('jacket_stars');equipItem('accessory_bouquet');equipItem('hat_straw_bow')");
const gameplayScreens=[
 a.run('renderLearnLetter()'),
 a.run('renderWordScreen()'),
 a.run('renderWordMeaningCard()'),
 a.run("renderInterlude('miniIntro')"),
 a.run("renderInterlude('miniResult')"),
 a.run("renderInterlude('finalIntro')"),
 a.run('renderHome()'),
 a.run('renderWardrobe()'),
 a.run('renderResults()')
];
for(const screen of gameplayScreens){
 assert.equal((screen.match(/class="marius-composite"/g)||[]).length,1);
 assert.ok(screen.includes('giraffe_jacket_stars.png'));
 assert.ok(screen.includes('accessory_bouquet.png'));
 assert.ok(screen.includes('marius_hat_straw_bow.png'));
}

// reward_ghi uses one large canvas; choice cards stay on the preview renderer.
a.run("AppState.completedBlocks=['reward_abc','reward_def','reward_ghi'];AppState.claimedRewards=['reward_abc','reward_def'];AppState.rewardFlow={id:'reward_ghi',resume:'finalIntro',selected:null}");
const headReward=a.run('renderReward()');
assert.equal((headReward.match(/class="marius-composite"/g)||[]).length,1);
assert.equal((headReward.match(/class="item-preview-stage"/g)||[]).length,2);
assert.ok(headReward.includes('marius_hat_straw_bow.png'));
assert.ok(headReward.includes('marius_hat_adventure.png'));
const rewardSources=headReward.match(/data-marius-sources="([^"]+)"/)?.[1].split('|')||[];
assert.equal(rewardSources.length,3);
assert.ok(rewardSources.every(source=>/\?reward=\d+$/.test(source)));
assert.equal(new Set(rewardSources.map(source=>source.match(/\?reward=(\d+)$/)?.[1])).size,1);
assert.match(headReward,/marius_hat_straw_bow\.png\?reward=\d+/);
assert.match(headReward,/marius_hat_adventure\.png\?reward=\d+/);
assert.match(trainerSource,/rewardReady=false;if\(r\.id==='reward_ghi'\)refreshRewardGHI\(\);else showScreen\(\);/);

// reward_ghi mutates and repaints one existing canvas instead of rebuilding
// the large-character DOM after the selected head item changes.
const rewardRepaint=JSON.parse(await a.run(`(async()=>{
 const calls=[];
 const canvas={dataset:{},isConnected:true,getContext(){return {clearRect(...args){calls.push(['clearRect',...args]);},drawImage(image,...args){calls.push(['drawImage',image.source,...args]);}}}};
 const sameCanvas=canvas;
 await redrawRewardMarius(canvas,async source=>({source}));
 return JSON.stringify({sameCanvas:canvas===sameCanvas,assets:canvas.dataset.mariusAssets,slots:canvas.dataset.mariusSlots,calls});
})()`));
assert.equal(rewardRepaint.sameCanvas,true);
assert.equal(rewardRepaint.assets,'giraffe_jacket_stars,marius_hat_straw_bow,accessory_bouquet');
assert.equal(rewardRepaint.slots,'body,head,hand_right');
assert.deepEqual(rewardRepaint.calls.map(call=>call.slice(0,1).concat(call.slice(-4))),[
 ['clearRect',0,0,1024,1536],
 ['drawImage',0,0,1024,1536],
 ['drawImage',0,0,1024,1536],
 ['drawImage',0,0,1024,1536]
]);

a.run("AppState.claimedRewards=['reward_abc'];AppState.rewardFlow={id:'reward_def',resume:'after-mini',selected:null}");
const handReward=a.run('renderReward()');
assert.equal((handReward.match(/class="marius-composite"/g)||[]).length,1);
assert.equal((handReward.match(/accessory-art/g)||[]).length,2);

// The maze moves one complete canvas, not separate CSS layers.
a.run("AppState.cursor={phase:'maze',index:5,step:4}");
const maze=a.run('renderLetterMazeGame()');
assert.ok(maze.includes('marius-letter-maze-def.png'));
assert.ok(maze.includes('gameplay-marius letter-maze-marius'));
assert.equal((maze.match(/class="marius-composite"/g)||[]).length,1);

// Slot replacement, unequip, persistence and reload keep the state model.
a.run("equipItem('jacket_racer');equipItem('hat_adventure');equipItem('accessory_balloon')");
let rendered=a.run("renderCharacter('gameplay',{includeBackground:false})");
assert.deepEqual(canvasAssets(rendered),['giraffe_jacket_racer','marius_hat_adventure','accessory_balloon']);
assert.equal(a.run("unequipItem('accessory_balloon')"),true);
rendered=a.run("renderCharacter('gameplay',{includeBackground:false})");
assert.deepEqual(canvasAssets(rendered),['giraffe_jacket_racer','marius_hat_adventure']);
a.run("equipItem('accessory_bouquet');AppState.rewardFlow=null");

const reloaded=createContext({saved:saved(a)});
const afterReload=reloaded.run("renderCharacter('gameplay',{includeBackground:false})");
assert.deepEqual(canvasAssets(afterReload),['giraffe_jacket_racer','marius_hat_adventure','accessory_bouquet']);
assert.equal(reloaded.run("getEquippedItem('outfit').id"),'jacket_racer');
assert.equal(reloaded.run("getEquippedItem('head').id"),'hat_adventure');
assert.equal(reloaded.run("getEquippedItem('hand_right').id"),'accessory_bouquet');

// Story illustrations stay outside the current-skin compositor.
reloaded.run("AppState.cursor={phase:'room',index:2,step:4}");
assert.ok(reloaded.run('renderFindObjectGame()').includes('marius-room-abc.png'));
assert.ok(!reloaded.run('renderFindObjectGame()').includes('marius-composite'));
const landing=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const asset of ['marius-captain.png','marius-traveler.png','marius-surfer.png'])assert.ok(landing.includes(asset));

console.log(JSON.stringify({
 passed:true,
 compositor:'canvas',
 intrinsicSize:[1024,1536],
 verifiedCharacterAssets:verifiedAssets.length,
 acceptanceCombinations:combinations.length,
 canonicalDrawRectangle:[0,0,1024,1536],
 gameplayRendererScreens:gameplayScreens.length+2,
 rewardGHI:true,
 previewIsolated:true,
 demoRewardOverride:true,
 demoNavigationShortcuts:11,
 redraw:true,
 reload:true,
 storyArtIsolated:true
},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
