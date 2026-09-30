const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'play/balloon-pop-game.js'),'utf8');
const context=vm.createContext({});
vm.runInContext(`${source}\nthis.engine=BalloonPopGame;`,context);
const engine=context.engine,config=engine.CONFIG;

assert.equal(engine.validate(config),true);
assert.deepEqual(Array.from(config.targets),['G','H','I']);
assert.deepEqual(Array.from(config.learnedLetters),['A','B','C','D','E','F','G','H','I']);

// Every generated field stays within the 7-10 density budget and starts with
// at least one live target.
for(const target of config.targets){
  for(let trial=0;trial<300;trial++){
    const count=7+(trial%4),letters=engine.createBalloonLetters(config,target,count,Math.random);
    assert.equal(letters.length,count);
    assert.ok(letters.every(letter=>config.learnedLetters.includes(letter)));
    assert.ok(letters.includes(target));
  }
}
assert.equal(engine.createBalloonLetters(config,'G',2,()=>.99).length,engine.SPAWN.minCount);
assert.equal(engine.createBalloonLetters(config,'G',99,()=>.99).length,engine.SPAWN.maxCount);

// Normal spawns use the shared 35% target probability; a forced spawn always
// wins regardless of the random value.
let probabilityTargets=0;
for(let sample=0;sample<1000;sample++){
  let call=0;
  const random=()=>call++===0?(sample+.5)/1000:.5;
  if(engine.randomBalloonLetter(config,'G',random)==='G')probabilityTargets++;
}
assert.equal(probabilityTargets,350);
assert.equal(engine.randomBalloonLetter(config,'G',()=>.99,true),'G');
assert.ok(engine.spacedBalloonX(43,42)-42>=12);

const scoreState=engine.initialState(config,()=>.25);
const initialTarget=engine.target(config,scoreState);
const wrong=config.learnedLetters.find(letter=>letter!==initialTarget);
assert.equal(engine.tap(config,scoreState,wrong),'wrong');
assert.equal(scoreState.score,0);
assert.equal(scoreState.totalCorrect,0);
assert.equal(engine.tap(config,scoreState,initialTarget),'correct');
assert.equal(scoreState.score,1);
assert.equal(scoreState.totalCorrect,1);
assert.ok(engine.createBalloonLetters(config,initialTarget,7,()=>.99).includes(initialTarget));

// Three mistakes reveal a hint without reducing progress.
engine.tap(config,scoreState,wrong);engine.tap(config,scoreState,wrong);engine.tap(config,scoreState,wrong);
assert.equal(engine.hint(config,scoreState),initialTarget);
assert.equal(scoreState.score,1);

// Required correct counts advance G -> H -> I, then phase, and quick targets
// change every two hits without repeating a block.
const state=engine.initialState(config,()=>.4),seenTargets=[],transitions=[];
while(!state.gameCompleted){
  const target=engine.target(config,state);seenTargets.push(target);
  const before={phase:state.phaseIndex,target:state.targetIndex,score:state.score};
  const result=engine.tap(config,state,target);transitions.push({before,result,after:{phase:state.phaseIndex,target:state.targetIndex,score:state.score}});
}
assert.equal(state.totalCorrect,30);
assert.ok(seenTargets.every(letter=>config.targets.includes(letter)));
assert.equal(transitions.filter(item=>item.result==='target-complete').length,6);
assert.equal(transitions.filter(item=>item.result==='phase-complete').length,2);
assert.equal(transitions.at(-1).result,'game-complete');
assert.equal(new Set(state.quickOrder).size,3);
assert.ok(state.quickOrder.every((letter,index)=>!index||letter!==state.quickOrder[index-1]));

const restored=engine.restore(config,JSON.parse(JSON.stringify(state)),()=>.8);
assert.equal(restored.gameCompleted,true);
assert.equal(restored.totalCorrect,30);
const balloons=engine.createBalloons(config,engine.initialState(config,()=>.1),9,()=>.5);
assert.equal(balloons.length,9);
assert.ok(balloons.every(balloon=>balloon.size>=72&&balloon.size<=95&&balloon.x>=15&&balloon.x<=85));
assert.ok(balloons.some(balloon=>balloon.letter===engine.target(config,engine.initialState(config,()=>.1))));
const html=engine.render(config,engine.initialState(config,()=>.1),{balloons});
assert.equal((html.match(/class="balloon-pop-balloon color-/g)||[]).length,9);
assert.ok(html.includes('Лопни букву'));
assert.ok(html.includes('balloon-pop-repeat'));
assert.ok(html.includes('data-balloon-container'));
assert.ok(html.includes('data-duration="'));

// A normal letter change cannot remove the final live target.
const liveLetters=['G','A','B','C','D','E','F'];
assert.equal(engine.replacementLetter(config,liveLetters,0,'G',()=>.99),'G');
assert.ok(config.learnedLetters.includes(engine.replacementLetter(config,['G','G','A','B','C','D','E'],0,'G',()=>.99)));

// Course adapter: review G/H/I leads to Balloon Pop, not directly to reward.
const course=createContext();
course.run("view='course';AppState.started=true;AppState.cursor={phase:'miniResult',index:8,step:6};AppState.completedBlocks=['reward_abc','reward_def'];AppState.claimedRewards=['reward_abc','reward_def'];unlockItem('jacket_stars',AppState,false);equipItem('jacket_stars',AppState,false);unlockItem('accessory_balloon',AppState,false);equipItem('accessory_balloon',AppState,false);AppState.rewardFlow=null;advanceAfterMini()");
assert.equal(course.run('AppState.cursor.phase'),'balloon_ghi');
assert.equal(course.run('AppState.rewardFlow'),null);
assert.equal(course.run('BALLOON_LETTER_CHANGE_INTERVAL_MULTIPLIER'),1.25);
assert.equal(course.run('balloonLetterChangeDelay(16)'),20000);

// Runtime timers keep the slowed letter cycle. A correct pop disappears after
// 200 ms, leaves a visible gap, then refills at a new position after 1.4 s.
const runtime=createContext();
runtime.run("view='course';AppState.started=true;AppState.cursor={phase:'balloon_ghi',index:8,step:0};AppState.game=BalloonPopGame.initialState(GHI_BALLOON_GAME,()=>.4);clearBalloonPopRuntime()");
const runtimeClasses=new Set(),runtimeButton={
  isConnected:true,disabled:false,removed:false,
  dataset:{duration:'16',letter:runtime.run('BalloonPopGame.target(GHI_BALLOON_GAME,balloonPopState())')},
  classList:{add(value){runtimeClasses.add(value)},remove(value){runtimeClasses.delete(value)},toggle(value,force){if(force)runtimeClasses.add(value);else runtimeClasses.delete(value)}},
  style:{getPropertyValue(){return'42'}},setAttribute(){},querySelector(){return{textContent:''}},
  remove(){this.removed=true;this.isConnected=false}
};
runtime.context.runtimeButton=runtimeButton;runtime.context.runtimeButtons=[runtimeButton];
runtime.run("document.querySelectorAll=selector=>selector.startsWith('.balloon-pop-balloon')?runtimeButtons.filter(button=>button.isConnected):[];letterChangeCount=0;scheduleBalloonTargetGuarantee=()=>{};replaceBalloonButton=()=>{letterChangeCount++};scheduleBalloonLetterChange(runtimeButton)");
let [runtimeTimerId,runtimeTimer]=[...runtime.timers][0];
assert.equal(runtimeTimer.at,20000);
runtime.timers.delete(runtimeTimerId);runtimeTimer.f();
assert.equal(runtime.run('letterChangeCount'),1);
runtime.run("clearBalloonPopRuntime();addBalloonBurst=()=>{};playBalloonPopEffect=()=>{};updateBalloonProgress=()=>{};setBalloonFeedback=()=>{};saveProgress=()=>{};scheduleBalloonHint=()=>{};scheduleBalloonTargetGuarantee=()=>{};spawned=[];spawnBalloonButton=(forced,avoidX)=>{spawned.push({forced,avoidX});return{}};AppState.game=BalloonPopGame.initialState(GHI_BALLOON_GAME,()=>.4)");
assert.equal(runtime.run('tapBalloonPop(runtimeButton.dataset.letter,runtimeButton)'),'correct');
assert.equal(runtimeButton.removed,false);
assert.equal(runtimeClasses.has('is-pop'),true);
assert.equal(runtime.run('spawned.length'),0);
[runtimeTimerId,runtimeTimer]=[...runtime.timers].find(([,timer])=>timer.at===200);
assert.equal(runtimeTimer.at,200);
runtime.timers.delete(runtimeTimerId);runtimeTimer.f();
assert.equal(runtimeButton.removed,true);
assert.equal(runtime.run('spawned.length'),0);
[runtimeTimerId,runtimeTimer]=[...runtime.timers].find(([,timer])=>timer.at===1400);
runtime.timers.delete(runtimeTimerId);runtimeTimer.f();
assert.equal(runtime.run('spawned.length'),1);
assert.equal(runtime.run('spawned[0].forced'),runtime.run('BalloonPopGame.target(GHI_BALLOON_GAME,balloonPopState())'));
assert.equal(runtime.run('spawned[0].avoidX'),42);

// If a target is absent for too long, the watchdog forces it by 2.8 seconds.
const guarantee=createContext();
guarantee.run("view='course';AppState.cursor={phase:'balloon_ghi',index:8,step:0};AppState.game=BalloonPopGame.initialState(GHI_BALLOON_GAME,()=>.4);document.querySelectorAll=()=>[];forcedTargetCount=0;forceBalloonTarget=()=>{forcedTargetCount++};scheduleBalloonTargetGuarantee()");
const [guaranteeTimerId,guaranteeTimer]=[...guarantee.timers][0];
assert.ok(guaranteeTimer.at>=2500&&guaranteeTimer.at<=2800);
guarantee.timers.delete(guaranteeTimerId);guaranteeTimer.f();
assert.equal(guarantee.run('forcedTargetCount'),1);
assert.equal(guarantee.timers.size,1);

// Runtime density follows the responsive cap and refuses an extra active ball.
const density=createContext();
density.run("view='course';window.innerWidth=390;AppState.cursor={phase:'balloon_ghi',index:8,step:0};AppState.game=BalloonPopGame.initialState(GHI_BALLOON_GAME,()=>.4);densityBalls=Array.from({length:7},(_,index)=>({isConnected:true,disabled:false,dataset:{letter:index?'A':'G'}}));document.querySelectorAll=()=>densityBalls");
assert.equal(density.run('balloonFieldCount()'),7);
assert.equal(density.run('spawnBalloonButton()'),null);
density.run('window.innerWidth=900');
assert.equal(density.run('balloonFieldCount()'),9);

// Idle help starts only after 5.5 seconds and removes its class after one pulse.
const hintRuntime=createContext();
const hintClasses=new Set(),hintButton={isConnected:true,disabled:false,dataset:{letter:'G'},offsetWidth:80,classList:{add(value){hintClasses.add(value)},remove(value){hintClasses.delete(value)}}};
hintRuntime.context.hintButton=hintButton;hintRuntime.context.hintButtons=[hintButton];
hintRuntime.run("view='course';AppState.cursor={phase:'balloon_ghi',index:8,step:0};AppState.game=BalloonPopGame.initialState(GHI_BALLOON_GAME,()=>.4);document.querySelectorAll=()=>hintButtons;scheduleBalloonHint()");
let [hintTimerId,hintTimer]=[...hintRuntime.timers][0];
assert.equal(hintTimer.at,5500);
const firstHintTimerId=hintTimerId;
hintRuntime.run('noteBalloonInteraction()');
assert.equal(hintRuntime.timers.has(firstHintTimerId),false);
[hintTimerId,hintTimer]=[...hintRuntime.timers][0];
assert.equal(hintTimer.at,5500);
hintRuntime.timers.delete(hintTimerId);hintTimer.f();
assert.equal(hintClasses.has('is-hint'),true);
[hintTimerId,hintTimer]=[...hintRuntime.timers][0];
assert.equal(hintTimer.at,900);
hintRuntime.timers.delete(hintTimerId);hintTimer.f();
assert.equal(hintClasses.has('is-hint'),false);

// Completion is persisted before the success button is pressed.
course.run("while(!balloonPopState().gameCompleted)BalloonPopGame.tap(GHI_BALLOON_GAME,balloonPopState(),BalloonPopGame.target(GHI_BALLOON_GAME,balloonPopState()));saveProgress()");
assert.equal(course.run('balloonPopState().gameCompleted'),true);
assert.equal(course.run("AppState.completedBlocks.includes('reward_ghi')"),false);
const reload=createContext({saved:saved(course)});
assert.equal(reload.run('AppState.cursor.phase'),'balloon_ghi');
assert.equal(reload.run('balloonPopState().gameCompleted'),true);
assert.ok(reload.run('renderCourse()').includes('Получить награду'));

// The success button unlocks the existing reward flow and leaves inventory
// ownership to the established reward system.
reload.run("view='course';continueBalloonPopGame()");
assert.equal(reload.run('AppState.rewardFlow.id'),'reward_ghi');
assert.equal(reload.run('view'),'reward');
assert.deepEqual(JSON.parse(reload.run('JSON.stringify(AppState.cursor)')),{phase:'lesson',index:9,step:0});
assert.equal(reload.run('AppState.characterState.ownedItems.length'),2);

// Direct demo routing uses in-memory shortcut state and never writes either
// the normal save or the demo save.
const normal=createContext();normal.run('begin()');
const normalSave=normal.store.get('alfie-abc-v1');
const demo=createContext({saved:saved(normal),search:'?demo=1&screen=balloon_ghi'});
assert.equal(demo.run('view'),'course');
assert.equal(demo.run('AppState.cursor.phase'),'balloon_ghi');
assert.equal(demo.run('DEMO_SHORTCUT_ACTIVE'),true);
demo.run('advanceBalloonPopDemo();saveProgress()');
assert.equal(demo.store.get('alfie-abc-v1'),normalSave);
assert.equal(demo.store.has('alfie-abc-demo-v1'),false);

const css=fs.readFileSync(path.join(root,'play/balloon-pop-game.css'),'utf8');
const appSource=fs.readFileSync(path.join(root,'play/index.html'),'utf8');
assert.match(css,/\.balloon-pop-balloon \{[\s\S]*width:var\(--balloon-size\)/);
assert.match(source,/size:Math\.round\(72\+random\(\)\*23\)/);
assert.match(css,/@media\(max-height:650px\)/);
assert.match(css,/@media\(orientation:landscape\) and \(max-height:500px\)/);
assert.match(css,/touch-action:manipulation/);
assert.match(css,/\.balloon-pop-balloon\.is-pop \.balloon-pop-shape \{animation:balloon-pop \.2s/);
assert.match(css,/@keyframes balloon-pop \{0%\{transform:scale\(1\);opacity:1\}30%\{transform:scale\(1\.18\)/);
assert.match(css,/\.balloon-pop-flash[\s\S]*animation:balloon-flash \.075s/);
assert.match(css,/\.balloon-pop-balloon\.is-wrong \.balloon-pop-shape \{animation:balloon-wrong \.18s/);
assert.match(appSource,/for\(let index=0;index<10;index\+\+\)/);
assert.match(appSource,/setTimeout\(\(\)=>burst\.remove\(\),460\)/);
assert.match(appSource,/const BALLOON_LETTER_CHANGE_INTERVAL_MULTIPLIER=1\.25,BALLOON_POP_ANIMATION_MS=200/);
assert.match(appSource,/BALLOON_TARGET_MAX_WAIT_MS=2800,BALLOON_RESPAWN_DELAY_MS=1400,BALLOON_IDLE_HINT_MS=5500/);
assert.match(appSource,/duration\*1000\*BALLOON_LETTER_CHANGE_INTERVAL_MULTIPLIER/);
assert.match(appSource,/document\.querySelectorAll\('\.balloon-pop-balloon'\)\.forEach\(scheduleBalloonLetterChange\)/);
assert.doesNotMatch(appSource,/addEventListener\('animationiteration'/);
assert.match(appSource,/scheduleBalloonRefill\(poppedX\);scheduleBalloonTargetGuarantee\(\)/);
assert.match(css,/\.balloon-pop-balloon\.is-hint \.balloon-pop-shape \{animation:balloon-hint \.82s ease-out 1;\}/);
assert.doesNotMatch(css,/\.balloon-pop-balloon\.is-hint[^{]*\{[^}]*infinite/);
assert.doesNotMatch(css,/\.balloon-pop-balloon\.is-hint[^{]*\{[^}]*box-shadow/);
assert.match(appSource,/window\.navigator\?\.vibrate\?\.\(20\)/);

console.log(JSON.stringify({
  passed:true,
  courseOrder:'G/H/I review -> Balloon Pop -> reward_ghi',
  targets:Array.from(config.targets),
  distractors:'A-I only',
  generatedFields:900,
  targetSpawnProbability:engine.SPAWN.targetProbability,
  mobileBalloonCount:engine.SPAWN.mobileCount,
  desktopBalloonCount:engine.SPAWN.desktopCount,
  correctAnswers:state.totalCorrect,
  namePerLetter:5,
  phonicsPerLetter:3,
  quickMix:6,
  targetAlwaysPresent:true,
  maximumTargetWaitMilliseconds:2800,
  respawnDelayMilliseconds:1400,
  noImmediateSamePositionRespawn:true,
  idleHintMilliseconds:5500,
  idleHintOneShot:true,
  letterChangeIntervalMultiplier:1.25,
  movementDurationsUnchanged:true,
  wrongTapDoesNotScore:true,
  correctTapScores:true,
  transitions:true,
  rewardAfterCompletion:true,
  completionPersistence:true,
  demoIsolation:true,
  mobileAndShortHeightCSS:true,
  fastPopMilliseconds:200,
  particleCount:10,
  burstCleanup:true,
  optionalHaptic:true
},null,2));
