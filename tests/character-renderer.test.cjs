const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const root=path.resolve(__dirname,'..');
const a=createContext();
a.run("['jacket_stars','jacket_racer','accessory_bouquet','accessory_balloon','hat_straw_bow','hat_adventure'].forEach(id=>unlockItem(id))");

// Different slots share one actor coordinate system and a deterministic order.
assert.deepEqual(
 JSON.parse(a.run('JSON.stringify(CHARACTER_LAYER_ORDER)')),
 ['back','body','face','head','hand_left','hand_right','extra']
);
a.run("equipItem('jacket_stars');equipItem('accessory_bouquet');equipItem('hat_straw_bow')");
let compact=a.run("renderCharacter('gameplay',{includeBackground:false,className:'gameplay-marius',decorative:true})");
assert.ok(compact.includes('giraffe_jacket_stars.png'));
assert.ok(compact.includes('accessory_bouquet.png'));
assert.ok(compact.includes('marius_hat_straw_bow.png'));
assert.ok(!compact.includes('background_home.png'));
assert.ok(compact.includes('data-layer="body" data-layer-order="2"'));
assert.ok(compact.includes('data-slot="head" style="--character-layer:4"'));
assert.ok(compact.includes('data-slot="hand_right" style="--character-layer:6"'));
assert.equal((compact.match(/class="character-actor"/g)||[]).length,1);
assert.ok(compact.indexOf('data-layer="body"')<compact.indexOf('data-slot="head"'));
assert.ok(compact.indexOf('data-slot="head"')<compact.indexOf('data-slot="hand_right"'));
assert.match(compact,/data-slot="head" style="--character-layer:4"><img src="\.\/images\/marius_hat_straw_bow\.png\?v=reward3" data-character-asset="marius_hat_straw_bow"/);
const trainerCSS=fs.readFileSync(path.join(root,'play/index.html'),'utf8');
assert.match(trainerCSS,/\.character-stage \{position:relative;isolation:isolate;flex:none;/);
assert.match(trainerCSS,/\.character-layer \{position:absolute;inset:0;/);
assert.match(trainerCSS,/\.character-layer img \{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:top center/);
assert.match(trainerCSS,/\.character-art \.character-stage \{width:auto;height:100%;max-width:100%;margin:0;aspect-ratio:2\/3;/);
assert.match(trainerCSS,/\.accessory-art>img \{width:auto;height:240%;left:50%;top:-20%;transform:translateX\(-80%\);\}/);

// Every inventory-compatible screen delegates to the same equipped renderer.
const gameplayScreens=[
 a.run('renderLearnLetter()'),
 a.run('renderWordScreen()'),
 a.run('renderWordMeaningCard()'),
 a.run("renderInterlude('miniIntro')"),
 a.run("renderInterlude('miniResult')"),
 a.run("renderInterlude('finalIntro')")
];
for(const screen of gameplayScreens){
 assert.ok(screen.includes('data-character-context="gameplay"'));
 assert.ok(screen.includes('giraffe_jacket_stars.png'));
 assert.ok(screen.includes('accessory_bouquet.png'));
 assert.ok(screen.includes('marius_hat_straw_bow.png'));
 assert.ok(!screen.includes('background_home.png'));
}
const finalResult=a.run('renderResults()');
assert.ok(finalResult.includes('data-character-context="results"'));
assert.equal((finalResult.match(/class="character-actor"/g)||[]).length,1);
for(const screen of [a.run('renderHome()'),a.run('renderWardrobe()'),finalResult]){
 assert.ok(screen.includes('giraffe_jacket_stars.png'));
 assert.ok(screen.includes('accessory_bouquet.png'));
 assert.ok(screen.includes('marius_hat_straw_bow.png'));
}
a.run("AppState.completedBlocks=['reward_abc','reward_def'];AppState.claimedRewards=['reward_abc','reward_def'];AppState.rewardFlow={id:'reward_def',resume:'after-mini',selected:'accessory_bouquet'}");
const reward=a.run('renderReward()');
assert.ok(reward.includes('giraffe_jacket_stars.png'));
assert.ok(reward.includes('accessory_bouquet.png'));
assert.ok(reward.includes('marius_hat_straw_bow.png'));

// Head reward/wardrobe cards preview the item on the canonical actor instead of
// scaling the raw full-canvas overlay in the card's short artwork viewport.
a.run("AppState.completedBlocks=['reward_abc','reward_def','reward_ghi'];AppState.claimedRewards=['reward_abc','reward_def'];AppState.rewardFlow={id:'reward_ghi',resume:'finalIntro',selected:null}");
const headReward=a.run('renderReward()');
assert.equal((headReward.match(/data-character-context="item-preview"/g)||[]).length,2);
assert.equal((headReward.match(/data-slot="head"/g)||[]).length,3);
assert.ok(headReward.includes('marius_hat_straw_bow.png'));
assert.ok(headReward.includes('marius_hat_adventure.png'));
assert.ok(!headReward.includes('full-canvas-art'));

// Hand reward/wardrobe cards keep the authored raw accessory preview from HEAD;
// unlike head items, these assets intentionally use the accessory-art crop.
a.run("AppState.claimedRewards=['reward_abc'];AppState.rewardFlow={id:'reward_def',resume:'after-mini',selected:null}");
const handReward=a.run('renderReward()');
assert.equal((handReward.match(/data-character-context="item-preview"/g)||[]).length,0);
assert.equal((handReward.match(/accessory-art/g)||[]).length,2);
assert.equal((handReward.match(/data-slot="hand_right"/g)||[]).length,1);
assert.ok(handReward.includes('accessory_bouquet.png'));
assert.ok(handReward.includes('accessory_balloon.png'));

// Every hand/head combination keeps one shared actor stack with the outfit on
// inventory, reward, mini-result celebration, and the explicit results scene.
for(const hand of ['accessory_bouquet','accessory_balloon']){
 for(const hat of ['hat_straw_bow','hat_adventure']){
  a.run(`equipItem('${hand}');equipItem('${hat}')`);
  const equippedScreens=[
   a.run('renderWardrobe()'),
   a.run('renderReward()'),
   a.run("renderInterlude('miniResult')"),
   a.run('renderResults()')
  ];
  for(const screen of equippedScreens){
   assert.ok(screen.includes(`${hand}.png`));
   assert.ok(screen.includes(`marius_${hat}.png`));
   assert.ok(screen.includes('giraffe_jacket_stars.png'));
   assert.match(screen,/data-slot="head" style="--character-layer:4"/);
   assert.match(screen,/data-slot="hand_right" style="--character-layer:6"/);
  }
  const result=equippedScreens.at(-1);
  assert.ok(result.includes('data-character-context="results"'));
  assert.equal((result.match(/class="character-actor"/g)||[]).length,1);
  assert.equal((result.match(/data-slot="head"/g)||[]).length,1);
  assert.equal((result.match(/data-slot="hand_right"/g)||[]).length,1);
  assert.ok(!result.includes('data-character-context="item-preview"'));
 }
}
a.run("equipItem('accessory_bouquet');equipItem('hat_straw_bow')");

// The maze moves the same complete actor stack, including outfit and handheld item.
a.run("AppState.cursor={phase:'maze',index:5,step:4}");
const maze=a.run('renderLetterMazeGame()');
assert.ok(maze.includes('marius-letter-maze-def.png'));
assert.ok(maze.includes('letter-maze-marius'));
assert.ok(maze.includes('gameplay-marius letter-maze-marius'));
assert.ok(maze.includes('giraffe_jacket_stars.png'));
assert.ok(maze.includes('accessory_bouquet.png'));
assert.ok(maze.includes('marius_hat_straw_bow.png'));
assert.equal((maze.match(/class="character-actor"/g)||[]).length,1);

// One item per slot: replacement removes the previous layer.
a.run("equipItem('jacket_racer')");
let rendered=a.run("renderCharacter('gameplay',{includeBackground:false})");
assert.ok(rendered.includes('giraffe_jacket_racer.png'));

// Head items replace each other in the shared full-canvas layer without offsets.
a.run("equipItem('hat_adventure')");
rendered=a.run("renderCharacter('gameplay',{includeBackground:false})");
assert.ok(rendered.includes('marius_hat_adventure.png'));
assert.ok(!rendered.includes('marius_hat_straw_bow.png'));
assert.equal((rendered.match(/data-slot="head"/g)||[]).length,1);
a.run("equipItem('hat_straw_bow')");
assert.ok(!rendered.includes('giraffe_jacket_stars.png'));
a.run("equipItem('accessory_balloon')");
rendered=a.run("renderCharacter('gameplay',{includeBackground:false})");
assert.ok(rendered.includes('accessory_balloon.png'));
assert.ok(!rendered.includes('accessory_bouquet.png'));
assert.ok(rendered.includes('giraffe_jacket_racer.png'));

// Removing a wearable keeps ownership but removes its visual layer.
assert.equal(a.run("unequipItem('accessory_balloon')"),true);
rendered=a.run("renderCharacter('gameplay',{includeBackground:false})");
assert.ok(!rendered.includes('accessory_balloon.png'));
assert.equal(a.run("isItemOwned('accessory_balloon')"),true);
a.run("equipItem('accessory_bouquet');AppState.rewardFlow=null");

const reloaded=createContext({saved:saved(a)});
const afterReload=reloaded.run("renderCharacter('gameplay',{includeBackground:false})");
assert.ok(afterReload.includes('giraffe_jacket_racer.png'));
assert.ok(afterReload.includes('accessory_bouquet.png'));
assert.ok(afterReload.includes('marius_hat_straw_bow.png'));
assert.equal(reloaded.run("getEquippedItem('outfit').id"),'jacket_racer');
assert.equal(reloaded.run("getEquippedItem('hand_right').id"),'accessory_bouquet');
assert.equal(reloaded.run("getEquippedItem('head').id"),'hat_straw_bow');

// Story art keeps its authored pose and never receives inventory overlays.
reloaded.run("AppState.cursor={phase:'room',index:2,step:4}");
assert.ok(reloaded.run('renderFindObjectGame()').includes('marius-room-abc.png'));
assert.ok(!reloaded.run('renderFindObjectGame()').includes('giraffe_jacket_racer.png'));
const letterReward=reloaded.run("renderInterlude('letterReward')");
assert.ok(letterReward.includes('data-feedback-sticker'));
assert.ok(!letterReward.includes('data-character-context="gameplay"'));
const landing=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const asset of ['marius-captain.png','marius-traveler.png','marius-surfer.png'])assert.ok(landing.includes(asset));

console.log(JSON.stringify({
 passed:true,
 layerOrder:['background','back','body/outfit','face','head','hand_left','hand_right','extra'],
 gameplayRendererScreens:gameplayScreens.length+5,
 outfitReplacement:true,
 handReplacement:true,
 multiSlot:true,
 headFullCanvasOverlay:true,
 headPreviewRenderer:true,
 handPreviewRenderer:false,
 handPreviewUsesAuthoredGeometry:true,
 finalRendererContext:true,
 intrinsicCanvasNormalization:true,
 headReplacement:true,
 unequip:true,
 reload:true,
 storyArtIsolated:true
},null,2));
