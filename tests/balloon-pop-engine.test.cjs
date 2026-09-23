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

// Every generated field has 5-7 learned letters and at least one live target.
for(const target of config.targets){
  for(let trial=0;trial<300;trial++){
    const count=5+(trial%3),letters=engine.createBalloonLetters(config,target,count,Math.random);
    assert.equal(letters.length,count);
    assert.ok(letters.every(letter=>config.learnedLetters.includes(letter)));
    assert.ok(letters.includes(target));
  }
}

const scoreState=engine.initialState(config,()=>.25);
const initialTarget=engine.target(config,scoreState);
const wrong=config.learnedLetters.find(letter=>letter!==initialTarget);
assert.equal(engine.tap(config,scoreState,wrong),'wrong');
assert.equal(scoreState.score,0);
assert.equal(scoreState.totalCorrect,0);
assert.equal(engine.tap(config,scoreState,initialTarget),'correct');
assert.equal(scoreState.score,1);
assert.equal(scoreState.totalCorrect,1);
assert.ok(engine.createBalloonLetters(config,initialTarget,6,()=>.99).includes(initialTarget));

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
const balloons=engine.createBalloons(config,engine.initialState(config,()=>.1),6,()=>.5);
assert.equal(balloons.length,6);
assert.ok(balloons.every(balloon=>balloon.size>=72&&balloon.size<=95&&balloon.x>=15&&balloon.x<=85));
const html=engine.render(config,engine.initialState(config,()=>.1),{balloons});
assert.equal((html.match(/class="balloon-pop-balloon/g)||[]).length,6);
assert.ok(html.includes('Лопни букву'));
assert.ok(html.includes('balloon-pop-repeat'));

// Course adapter: review G/H/I leads to Balloon Pop, not directly to reward.
const course=createContext();
course.run("view='course';AppState.started=true;AppState.cursor={phase:'miniResult',index:8,step:6};AppState.completedBlocks=['reward_abc','reward_def'];AppState.claimedRewards=['reward_abc','reward_def'];unlockItem('jacket_stars',AppState,false);equipItem('jacket_stars',AppState,false);unlockItem('accessory_balloon',AppState,false);equipItem('accessory_balloon',AppState,false);AppState.rewardFlow=null;advanceAfterMini()");
assert.equal(course.run('AppState.cursor.phase'),'balloon_ghi');
assert.equal(course.run('AppState.rewardFlow'),null);

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
assert.equal(reload.run('AppState.cursor.phase'),'finalIntro');
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
assert.match(appSource,/replaceBalloonButton\(button\);scheduleBalloonHint\(\);\},155\)/);
assert.match(appSource,/window\.navigator\?\.vibrate\?\.\(20\)/);

console.log(JSON.stringify({
  passed:true,
  courseOrder:'G/H/I review -> Balloon Pop -> reward_ghi',
  targets:Array.from(config.targets),
  distractors:'A-I only',
  generatedFields:900,
  correctAnswers:state.totalCorrect,
  namePerLetter:5,
  phonicsPerLetter:3,
  quickMix:6,
  targetAlwaysPresent:true,
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
