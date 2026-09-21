const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const root=path.resolve(__dirname,'..');
const a=createContext();
a.run("['jacket_stars','jacket_racer','accessory_bouquet','accessory_balloon'].forEach(id=>unlockItem(id))");

// Different slots share one actor coordinate system and a deterministic order.
assert.deepEqual(
 JSON.parse(a.run('JSON.stringify(CHARACTER_LAYER_ORDER)')),
 ['back','body','face','head','hand_left','hand_right','extra']
);
a.run("equipItem('jacket_stars');equipItem('accessory_bouquet')");
let compact=a.run("renderCharacter('gameplay',{includeBackground:false,className:'gameplay-marius',decorative:true})");
assert.ok(compact.includes('giraffe_jacket_stars.png'));
assert.ok(compact.includes('accessory_bouquet.png'));
assert.ok(!compact.includes('background_home.png'));
assert.ok(compact.includes('data-layer="body" data-layer-order="2"'));
assert.ok(compact.includes('data-slot="hand_right" style="--character-layer:6"'));
assert.equal((compact.match(/class="character-actor"/g)||[]).length,1);

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
 assert.ok(!screen.includes('background_home.png'));
}
for(const screen of [a.run('renderHome()'),a.run('renderWardrobe()'),a.run('renderResults()')]){
 assert.ok(screen.includes('giraffe_jacket_stars.png'));
 assert.ok(screen.includes('accessory_bouquet.png'));
}
a.run("AppState.completedBlocks=['reward_abc','reward_def'];AppState.claimedRewards=['reward_abc','reward_def'];AppState.rewardFlow={id:'reward_def',resume:'after-mini',selected:'accessory_bouquet'}");
const reward=a.run('renderReward()');
assert.ok(reward.includes('giraffe_jacket_stars.png'));
assert.ok(reward.includes('accessory_bouquet.png'));

// The maze moves the same complete actor stack, including outfit and handheld item.
a.run("AppState.cursor={phase:'maze',index:5,step:4}");
const maze=a.run('renderLetterMazeGame()');
assert.ok(maze.includes('marius-letter-maze-def.png'));
assert.ok(maze.includes('letter-maze-marius'));
assert.ok(maze.includes('gameplay-marius letter-maze-marius'));
assert.ok(maze.includes('giraffe_jacket_stars.png'));
assert.ok(maze.includes('accessory_bouquet.png'));
assert.equal((maze.match(/class="character-actor"/g)||[]).length,1);

// One item per slot: replacement removes the previous layer.
a.run("equipItem('jacket_racer')");
let rendered=a.run("renderCharacter('gameplay',{includeBackground:false})");
assert.ok(rendered.includes('giraffe_jacket_racer.png'));
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
assert.equal(reloaded.run("getEquippedItem('outfit').id"),'jacket_racer');
assert.equal(reloaded.run("getEquippedItem('hand_right').id"),'accessory_bouquet');

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
 unequip:true,
 reload:true,
 storyArtIsolated:true
},null,2));
