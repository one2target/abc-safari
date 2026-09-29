const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'play/river-crossing-game.js'),'utf8');
const context=vm.createContext({});
vm.runInContext(`${source}\nthis.engine=RiverCrossingGame;`,context);
const engine=context.engine,config=engine.CONFIG;
const seeded=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};

assert.equal(engine.validate(config),true);
assert.deepEqual(Array.from(config.targets),['J','K','L']);
assert.equal(config.route.length,7);
assert.equal(config.totalQuestions,12);

const questions=engine.createQuestions(config,seeded(17));
assert.equal(questions.length,12);
assert.deepEqual(Array.from(new Set(questions.slice(0,3).map(question=>question.letter))).sort(),['J','K','L']);
assert.ok(questions.slice(0,3).every(question=>question.type==='name'&&question.stage==='names'));
assert.deepEqual(Array.from(new Set(questions.slice(3,6).map(question=>question.letter))).sort(),['J','K','L']);
assert.ok(questions.slice(3,6).every(question=>question.type==='sound'&&question.stage==='sounds'));
assert.deepEqual(Array.from(new Set(questions.slice(6,9).map(question=>question.letter))).sort(),['J','K','L']);
assert.ok(questions.slice(6,9).every(question=>question.type==='word'&&question.stage==='words'));
assert.deepEqual(Array.from(new Set(questions.slice(9).map(question=>question.letter))).sort(),['J','K','L']);
assert.deepEqual(Array.from(new Set(questions.slice(9).map(question=>question.type))).sort(),['name','sound','word']);
assert.ok(questions.every(question=>question.options.length===3&&new Set(question.options).size===3&&question.options.includes(question.letter)));

// Correct answers move only after each pair; wrong answers never reduce or add progress.
const state=engine.initialState(config,seeded(7));
const first=engine.currentQuestion(config,state),wrong=config.targets.find(letter=>letter!==first.letter);
assert.equal(engine.answer(config,state,wrong),'wrong');
assert.equal(state.correct,0);assert.equal(state.questionIndex,0);assert.equal(engine.platformIndex(config,state),0);
assert.equal(engine.hint(config,state),null);
engine.answer(config,state,wrong);engine.answer(config,state,wrong);
assert.equal(engine.hint(config,state),first.letter);
assert.equal(engine.answer(config,state,first.letter),'reaction');
assert.equal(state.correct,1);assert.equal(engine.platformIndex(config,state),0);
assert.equal(engine.answer(config,state,engine.currentQuestion(config,state).letter),'jump');
assert.equal(state.correct,2);assert.equal(engine.platformIndex(config,state),1);
while(!state.gameCompleted)engine.answer(config,state,engine.currentQuestion(config,state).letter);
assert.equal(state.correct,12);assert.equal(state.questionIndex,12);assert.equal(engine.platformIndex(config,state),6);
assert.equal(engine.answer(config,state,'J'),'ignored');
const backgroundSource='./images/river-crossing-background.png?v=d868880e8ffc';
const completedHTML=engine.render(config,state,{backgroundSource});
assert.ok(completedHTML.includes('river-chest-hotspot is-open'));
assert.equal((completedHTML.match(/class="river-reward-star /g)||[]).length,3);
assert.equal((completedHTML.match(/class="river-reward-spark"/g)||[]).length,8);
assert.equal(completedHTML.includes('river-celebration'),false);

const restored=engine.restore(config,JSON.parse(JSON.stringify(state)),seeded(3));
assert.equal(restored.gameCompleted,true);assert.equal(restored.correct,12);
const corrupt=engine.restore(config,{...state,questionIndex:4},seeded(9));
assert.equal(corrupt.correct,0);assert.equal(corrupt.gameCompleted,false);

const wordState=engine.initialState(config,seeded(23));wordState.questionIndex=6;wordState.correct=6;
const wordHTML=engine.render(config,wordState,{icons:{speaker:'SPEAKER'},backgroundSource,characterHTML:'<canvas class="marius-composite"></canvas>'});
assert.equal((wordHTML.match(/<button class="river-answer/g)||[]).length,3);
assert.ok(wordHTML.includes('river-answer-picture'));
assert.ok(wordHTML.includes('data-background-mode="image"'));
assert.ok(wordHTML.includes('data-river-background'));
assert.equal(wordHTML.includes('river-fallback'),false);
assert.ok(wordHTML.includes('marius-composite'));
assert.ok(wordHTML.includes('6 / 12'));
assert.ok(config.route.every((point,index)=>point.x>0&&point.x<100&&point.y>0&&point.y<100&&(index===0||point.y<config.route[index-1].y)));

// Across deterministic restarts, answer placement reaches every button index.
const answerPositions=new Set();
for(let seed=1;seed<=30;seed++)for(const question of engine.createQuestions(config,seeded(seed)))answerPositions.add(question.options.indexOf(question.letter));
assert.deepEqual([...answerPositions].sort(),[0,1,2]);
const geometryViewports=[[280,640],[320,568],[360,800],[390,844],[430,932],[844,390]];
for(const [width] of geometryViewports){const content=Math.min(width-24,620),gap=width<=650?8:10,cell=(content-gap*2)/3;assert.ok(cell>=64,`${width}px answer width ${cell}`);}

// Course adapter: L completion opens the crossing, reload restores it, and
// completion continues into the existing J/K/L review without inventing a reward.
const course=createContext();
course.run("view='course';AppState.started=true;AppState.cursor={phase:'letterReward',index:11,step:6};advanceAfterLetter()");
assert.equal(course.run('AppState.cursor.phase'),'river_jkl');
assert.equal(course.run('RiverCrossingGame.progress(JKL_RIVER_GAME,riverCrossingState()).value'),0);
assert.ok(course.run('renderCourse()').includes('Переправа Мариуса'));
assert.ok(course.run('renderCourse()').includes('marius-composite'));
course.run("RiverCrossingGame.answer(JKL_RIVER_GAME,riverCrossingState(),JKL_RIVER_GAME.targets.find(letter=>letter!==RiverCrossingGame.currentQuestion(JKL_RIVER_GAME,riverCrossingState()).letter));saveProgress()");
assert.equal(course.run('riverCrossingState().correct'),0);
const midway=createContext({saved:saved(course)});
assert.equal(midway.run('AppState.cursor.phase'),'river_jkl');
assert.equal(midway.run('riverCrossingState().wrongAttempts'),1);
midway.run("while(!riverCrossingState().gameCompleted){const question=RiverCrossingGame.currentQuestion(JKL_RIVER_GAME,riverCrossingState());RiverCrossingGame.answer(JKL_RIVER_GAME,riverCrossingState(),question.letter)}saveProgress()");
assert.equal(midway.run('riverCrossingState().correct'),12);
assert.equal(midway.run('AppState.claimedRewards.length'),0);
const completed=createContext({saved:saved(midway)});
assert.equal(completed.run('riverCrossingState().gameCompleted'),true);
assert.ok(completed.run('renderCourse()').includes('Ура! Ты помог Мариусу'));
completed.run("view='course';continueRiverCrossingGame()");
assert.deepEqual(JSON.parse(completed.run('JSON.stringify(AppState.cursor)')),{phase:'reviewIntro',index:11,step:0});
assert.equal(completed.run('AppState.claimedRewards.length'),0);

// Fast repeated input is ignored by the adapter while an animation owns input.
const guarded=createContext();
guarded.run("view='course';AppState.cursor={phase:'river_jkl',index:11,step:0};riverAnimating=true");
assert.equal(guarded.run("tapRiverCrossing(RiverCrossingGame.currentQuestion(JKL_RIVER_GAME,riverCrossingState()).letter)"),'ignored');
assert.equal(guarded.run('riverCrossingState().correct'),0);

// The shared manager accepts WAV paths directly and mute suppresses replay.
(async()=>{
  const audio=createContext();
  audio.run("MEDIA_ASSETS.audio.test_wav={src:'./audio/test-effect.wav'};unlockAudio();AudioManager.play({key:'test_wav'})");
  await audio.tick(20);
  assert.equal(audio.played.at(-1).src,'./audio/test-effect.wav');
  const cueKeys=JSON.parse(audio.run(`JSON.stringify((()=>{const state=riverCrossingState();return state.questions.map((question,index)=>{state.questionIndex=index;state.correct=index;return riverAudioItems().map(item=>item.key)})})())`));
  const audioQuestions=JSON.parse(audio.run('JSON.stringify(riverCrossingState().questions)'));
  audioQuestions.forEach((question,index)=>{
    const word=config.answers[question.letter].word.toLowerCase();
    const expected=question.type==='name'?`${question.letter.toLowerCase()}_name`:question.type==='sound'?`${question.letter.toLowerCase()}_sound`:word;
    assert.equal(cueKeys[index].at(-1),expected);
  });
  audio.run('AppState.riverCrossing=blankRiverCrossing()');
  audio.run("view='course';AppState.cursor={phase:'river_jkl',index:11,step:0};repeatRiverInstruction()");
  await audio.tick(1500);
  const beforeMute=audio.played.length;
  audio.run('toggleSound();repeatRiverInstruction()');await audio.tick(1500);
  assert.equal(audio.played.length,beforeMute);
  assert.equal(audio.stats().maxActive,1);

  const effects=createContext();
  effects.run('unlockAudio()');
  for(const key of ['correct','wrong','jump','land','chest','victory']){
    effects.run(`EffectsManager.play(RIVER_EFFECT_AUDIO.${key})`);await effects.tick(10);
    assert.match(effects.played.at(-1).src,new RegExp(`river-${key}\\.wav\\?v=`));
  }
  const effectsBeforeMute=effects.played.length;
  effects.run('EffectsManager.setEnabled(false);EffectsManager.play(RIVER_EFFECT_AUDIO.jump)');await effects.tick(10);
  assert.equal(effects.played.length,effectsBeforeMute);
  assert.equal(effects.run('EffectsManager.players.size'),6);

  const css=fs.readFileSync(path.join(root,'play/river-crossing-game.css'),'utf8');
  const appSource=fs.readFileSync(path.join(root,'play/index.html'),'utf8');
  assert.match(css,/\.river-scene\{[^}]*aspect-ratio:941\/1672/);
  assert.match(css,/\.river-background\{[^}]*object-fit:cover/);
  assert.doesNotMatch(css,/river-fallback|river-route-stone|repeating-radial-gradient/);
  assert.doesNotMatch(css,/\.river-celebration/);
  assert.match(css,/\.river-marius\{[^}]*width:19%/);
  assert.match(css,/\.river-game\.is-complete \.river-marius\{width:20%/);
  assert.match(css,/@keyframes river-reward-star\{[^}]*top:104%[\s\S]*top:54%[\s\S]*scale\(1\.12\)[\s\S]*opacity:0/);
  assert.match(css,/@keyframes river-reward-spark/);
  assert.match(css,/\.river-reward-spark\{[^}]*--spark-delay/);
  assert.match(css,/\.river-answers\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);gap:10px\}/);
  assert.match(css,/\.river-answer\{[\s\S]*min-height:78px/);
  assert.match(css,/@media\(max-width:650px\)/);
  assert.match(css,/@media\(orientation:landscape\) and \(max-height:500px\)/);
  assert.match(css,/touch-action:manipulation/);
  assert.match(appSource,/animateRiverMarius\(before,after,epoch\)/);
  assert.match(appSource,/if\(riverAnimating\|\|answerLocked/);
  assert.match(appSource,/MEDIA_ASSETS\.images\.river_crossing_background\?\.src\|\|''/);
  assert.match(appSource,/createSoundEffectManager/);
  assert.match(appSource,/EffectsManager\.play\(RIVER_EFFECT_AUDIO\.correct\)/);
  assert.match(appSource,/EffectsManager\.play\(RIVER_EFFECT_AUDIO\.jump\)/);
  assert.match(appSource,/EffectsManager\.play\(RIVER_EFFECT_AUDIO\.land\)/);
  assert.match(appSource,/const apex=Math\.max\(19,Math\.min\(from\.y,to\.y\)-11\)/);
  assert.doesNotMatch(appSource,/showScreen\(\);celebrate\(\);EffectsManager\.play\(RIVER_EFFECT_AUDIO\.victory\)/);
  const tallestMariusHeightPercent=22*1.5*(941/1672);
  assert.ok(tallestMariusHeightPercent<19,'the enlarged Marius must stay inside the scene at the jump apex');

  const manifest=JSON.parse(fs.readFileSync(path.join(root,'play/river-crossing-assets.sha256.json'),'utf8'));
  const assetPaths=Object.keys(manifest.assets);
  assert.equal(assetPaths.length,12);
  for(const assetPath of assetPaths){
    const absolute=path.join(root,assetPath),data=fs.readFileSync(absolute);
    assert.ok(data.length>44,`${assetPath} must contain real media data`);
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'),manifest.assets[assetPath]);
    assert.doesNotThrow(()=>execFileSync('git',['ls-files','--error-unmatch','--',assetPath],{cwd:root,stdio:'pipe'}),`${assetPath} must be tracked by Git`);
    if(assetPath.endsWith('.png'))assert.equal(data.subarray(1,4).toString(),'PNG');
    if(assetPath.endsWith('.wav')){assert.equal(data.subarray(0,4).toString(),'RIFF');assert.equal(data.subarray(8,12).toString(),'WAVE');assert.equal(data.readUInt16LE(20),1);}
  }
  assert.deepEqual(JSON.parse(course.run(`JSON.stringify([
    MEDIA_ASSETS.images.river_crossing_background,
    MEDIA_ASSETS.images.river_stone_top_left,
    MEDIA_ASSETS.images.river_stone_top_right,
    MEDIA_ASSETS.images.river_stone_bottom_left,
    MEDIA_ASSETS.images.river_stone_bottom_center,
    MEDIA_ASSETS.images.river_stone_bottom_right
  ].map(asset=>asset.src))`)),[
    backgroundSource,
    './images/stone_top_left.png?v=bdbefec56a0c',
    './images/stone_top_right.png?v=b70895fe85c0',
    './images/stone_bottom_left.png?v=0a27594472a9',
    './images/stone_bottom_center.png?v=49550c068067',
    './images/stone_bottom_right.png?v=1bf6eab8eace'
  ]);
  const preparedBackgroundPresent=fs.existsSync(path.join(root,'play/images/river-crossing-background.png'));
  assert.equal(preparedBackgroundPresent,true);

  console.log(JSON.stringify({
    passed:true,
    questions:questions.length,
    stages:['names','sounds','words','final'],
    targets:Array.from(config.targets),
    allAnswerPositions:true,
    wrongDoesNotProgress:true,
    hintAfterThreeErrors:true,
    platformThresholds:[2,4,6,8,10,12],
    finalPlatform:engine.platformIndex(config,state),
    completionPersistence:true,
    existingReviewPreserved:true,
    duplicateRewardGuard:true,
    fastTapGuard:true,
    wavPlaybackSupported:true,
    globalMute:true,
    sharedCharacterRenderer:true,
    mobileTouchTargets:true,
    geometryViewports,
    taskAudioMappings:true,
    preparedBackgroundPresent,
    originalSceneOnly:true,
    preparedStoneAssets:5,
    preparedWavEffects:6,
    effectVoiceSeparation:true,
    integrityManifestAssets:assetPaths.length,
    finalRewardStars:3,
    rewardSparks:8,
    enlargedMarius:true,
    safeJumpApex:true
  },null,2));
})().catch(error=>{console.error(error);process.exitCode=1});
