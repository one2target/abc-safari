const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const root=path.resolve(__dirname,'..');
const engineSource=fs.readFileSync(path.join(root,'play/fruit-rain-game.js'),'utf8');
const appSource=fs.readFileSync(path.join(root,'play/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'play/fruit-rain-game.css'),'utf8');
const context=vm.createContext({});
vm.runInContext(`${engineSource}\nthis.engine=FruitRainGame;`,context);
const engine=context.engine,config=engine.CONFIG;
function catchCurrentTask(state){const task=engine.currentTask(config,state);let result;do result=engine.catchItem(config,state,task.letter);while(result==='blitz-catch');return result;}

assert.equal(engine.validate(config),true);
assert.equal(config.id,'fruit-rain-mno');
assert.equal(config.rewardSourceId,'minigame:fruit-rain-mno');
assert.deepEqual(JSON.parse(JSON.stringify(config.layout)),{objectMinPx:68,objectMaxPx:90,mobileObjectPx:66});
assert.equal(config.rounds.length,3);
assert.deepEqual(Array.from(config.rounds,round=>round.id),['names','sounds','words']);
assert.deepEqual(Array.from(config.rounds,round=>round.mode),['wave','wave','blitz']);
assert.deepEqual(Array.from(config.letters,item=>item.letter),['M','N','O']);
assert.deepEqual(Array.from(config.letters,item=>item.word),['Monkey','Nest','Octopus']);
assert.deepEqual(Array.from(config.letters,item=>item.nameAudio),['m_name','n_name','o_name']);
assert.deepEqual(Array.from(config.letters,item=>item.soundAudio),['m_sound','n_sound','o_sound']);
assert.deepEqual(Array.from(config.letters,item=>item.wordAudio),['monkey','nest','octopus']);
assert.deepEqual(Array.from(config.fruits,item=>item.key),['apple','banana','orange','pear','grapes','mango','strawberry','pineapple','peach','watermelon']);
assert.deepEqual(Array.from(config.blitzFruits,item=>item.key),['apple','orange','mango','pear','strawberry','grapes']);
assert.equal(config.blitz.spawnIntervalMs,620);
assert.equal(config.blitz.catchesPerTask,3);
assert.ok(config.blitz.taskCompletePauseMs>=500);
assert.ok(config.blitz.targetMaxWaitMs<=2500);
assert.ok(config.blitz.nextCueGapMs<=250);
assert.ok(config.blitz.fullFallMs<engine.TIMING.fullFallMs);
assert.equal(engine.ASSETS.background,'./images/fruit-rain/fruit-rain-bg.png');
assert.equal(engine.ASSETS.basket,'./images/fruit-rain/fruit-rain-basket.png');
assert.equal(engine.ASSETS.basketFull,'./images/fruit-rain/fruit-rain-basket-full.png');
assert.equal(engine.ASSETS.hit,'./images/fruit-rain/fruit-rain-hit-effect.png');
assert.equal(engine.ASSETS.miss,'./images/fruit-rain/fruit-rain-miss-effect.png');
assert.equal(engine.ASSETS.fruits.watermelon,'./images/fruit-rain/fruit-watermelon.png');
assert.equal(engine.ASSETS.blitzFruits.mango,'./images/fruit-rain/fruit-blitz-mango.png');
assert.equal(engine.ASSETS.branch,'./images/fruit-rain/fruit-rain-branch-01.png');
assert.equal(engine.ASSETS.winStars,undefined);

// Every referenced production PNG is checked in, decodes to a sensible size,
// and uses alpha wherever the game expects an isolated object.
function pngInfo(file){
  const bytes=fs.readFileSync(file);assert.equal(bytes.subarray(1,4).toString(),'PNG');
  return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),colorType:bytes[25],bytes:bytes.length};
}
const assetRoot=path.join(root,'play/images/fruit-rain');
const assetSources=[engine.ASSETS.background,engine.ASSETS.basket,engine.ASSETS.basketFull,engine.ASSETS.hit,engine.ASSETS.miss,engine.ASSETS.hintGlow,engine.ASSETS.branch,...engine.ASSETS.leaves,...Object.values(engine.ASSETS.fruits),...Object.values(engine.ASSETS.blitzFruits)];
assert.equal(new Set(assetSources).size,assetSources.length);
for(const source of assetSources){
  const file=path.join(root,'play',source.replace('./','')),info=pngInfo(file);assert.ok(info.width>=100&&info.height>=100&&info.width<=2000&&info.height<=2000,`${source} has usable dimensions`);assert.ok(info.bytes<3_000_000,`${source} is web-sized`);
  if(source!==engine.ASSETS.background)assert.ok([4,6].includes(info.colorType),`${source} preserves alpha`);
}
assert.equal(fs.existsSync(path.join(assetRoot,'fruit-all.png')),false);
assert.equal(fs.existsSync(path.join(assetRoot,'fruit-all-blitz.png')),false);

// Every round is a permutation of M/N/O: all nine required targets occur once.
for(let trial=0;trial<100;trial++){
  const state=engine.initialState(config,Math.random);
  assert.equal(state.taskOrders.length,3);
  assert.ok(state.taskOrders.every(order=>order.length===3&&new Set(order).size===3&&order.every(letter=>'MNO'.includes(letter))));
  const tasks=[];
  while(!state.gameCompleted){const task=engine.currentTask(config,state);tasks.push(`${task.roundId}:${task.letter}`);catchCurrentTask(state);}
  assert.equal(tasks.length,9);
  for(const round of config.rounds)assert.deepEqual(tasks.filter(id=>id.startsWith(`${round.id}:`)).map(id=>id.at(-1)).sort(),['M','N','O']);
}

// A wave always has three separate lanes, exactly one correct item, and its
// correct lane cannot get stuck in a fixed position across retries.
const waveState=engine.initialState(config,()=>.2),correctLanes=new Set();
for(let waveIndex=0;waveIndex<30;waveIndex++){
  const wave=engine.createWave(config,waveState,()=>((waveIndex%7)+.2)/8);
  assert.equal(wave.length,3);
  assert.equal(new Set(wave.map(item=>item.lane)).size,3);
  assert.equal(new Set(wave.map(item=>item.x)).size,3);
  assert.equal(new Set(wave.map(item=>item.fruitKey)).size,3);
  assert.equal(wave.filter(item=>item.correct).length,1);
  assert.ok(wave.some(item=>item.letter===engine.currentTask(config,waveState).letter));
  correctLanes.add(wave.find(item=>item.correct).lane);
}
assert.ok(correctLanes.size>1);

// The third round switches to a continuous blitz. A target can be forced by
// the runtime deadline, optional random targets can be suppressed while one is
// already falling, and sequential spawns rotate through all fruit artwork.
const blitzState=engine.initialState(config,()=>.1);
while(blitzState.currentRound<2){const task=engine.currentTask(config,blitzState);engine.catchItem(config,blitzState,task.letter);}
assert.equal(engine.roundMode(config,blitzState),'blitz');
assert.equal(engine.currentTask(config,blitzState).mode,'blitz');
const forcedTarget=engine.createBlitzObject(config,blitzState,()=>.99,{forceTarget:true,sequence:0});
assert.equal(forcedTarget.correct,true);
assert.equal(forcedTarget.letter,engine.currentTask(config,blitzState).letter);
const forcedDistractor=engine.createBlitzObject(config,blitzState,()=>.01,{allowTarget:false,sequence:1,avoidXs:[14,32]});
assert.equal(forcedDistractor.correct,false);
assert.ok(![14,32].includes(forcedDistractor.x));
const blitzFruits=Array.from({length:config.blitzFruits.length},(_,sequence)=>engine.createBlitzObject(config,blitzState,()=>.8,{allowTarget:false,sequence}));
assert.deepEqual(blitzFruits.map(item=>item.fruitKey),Array.from(config.blitzFruits,item=>item.key));
assert.ok(blitzFruits.every(item=>item.fruitAsset.includes('/fruit-blitz-')));
assert.equal(engine.fallDuration(blitzState,'blitz'),engine.BLITZ.fullFallMs);
const beforeBlitzProgress=engine.progress(config,blitzState),beforeBlitzIndex=blitzState.nextTaskIndex,blitzTarget=engine.currentTask(config,blitzState).letter;
assert.equal(engine.catchItem(config,blitzState,blitzTarget),'blitz-catch');
assert.equal(engine.progress(config,blitzState),beforeBlitzProgress);
assert.equal(blitzState.nextTaskIndex,beforeBlitzIndex);
assert.equal(engine.blitzProgress(config,blitzState),1);
const restoredPartialBlitz=engine.restore(config,JSON.parse(JSON.stringify(blitzState)),()=>.7);
assert.equal(restoredPartialBlitz.blitzCatches,1);
assert.equal(engine.catchItem(config,restoredPartialBlitz,blitzTarget),'blitz-catch');
assert.equal(restoredPartialBlitz.blitzCatches,2);
const wrongBlitz='MNO'.split('').find(letter=>letter!==blitzTarget);
assert.equal(engine.catchItem(config,restoredPartialBlitz,wrongBlitz),'retry');
assert.equal(restoredPartialBlitz.blitzCatches,2);
assert.equal(engine.catchItem(config,restoredPartialBlitz,blitzTarget),'correct');
assert.equal(engine.progress(config,restoredPartialBlitz),beforeBlitzProgress+1);
assert.equal(restoredPartialBlitz.nextTaskIndex,beforeBlitzIndex+1);
assert.equal(restoredPartialBlitz.blitzCatches,0);
Object.assign(blitzState,restoredPartialBlitz);
const restoredBlitz=engine.restore(config,JSON.parse(JSON.stringify(blitzState)),()=>.7);
assert.equal(restoredBlitz.currentRound,2);
assert.equal(restoredBlitz.nextTaskIndex,beforeBlitzIndex+1);
assert.equal(engine.progress(config,restoredBlitz),beforeBlitzProgress+1);

// Wrong catches and a missed target preserve progress and repeat the same task.
const errorState=engine.initialState(config,()=>.1),firstTask=engine.currentTask(config,errorState),wrong='MNO'.split('').find(letter=>letter!==firstTask.letter);
assert.equal(engine.catchItem(config,errorState,wrong),'retry');
assert.equal(engine.progress(config,errorState),0);
assert.equal(engine.currentTask(config,errorState).letter,firstTask.letter);
assert.equal(engine.catchItem(config,errorState,wrong),'retry-hint');
assert.equal(engine.hint(config,errorState),firstTask.letter);
assert.equal(engine.missCorrect(config,errorState),'retry-slow');
assert.equal(engine.currentTask(config,errorState).letter,firstTask.letter);
assert.equal(engine.progress(config,errorState),0);
assert.equal(engine.fallDuration(errorState),engine.TIMING.slowedFallMs);
assert.ok(engine.TIMING.fullFallMs>=4000&&engine.TIMING.fullFallMs<=5000);
assert.ok(engine.TIMING.slowedFallMs>engine.TIMING.fullFallMs);

// Correct progress resets help, advances exactly one task and survives reload.
assert.equal(engine.catchItem(config,errorState,firstTask.letter),'correct');
assert.equal(errorState.errors,0);
assert.equal(engine.progress(config,errorState),1);
const restored=engine.restore(config,JSON.parse(JSON.stringify(errorState)),()=>.8);
assert.equal(engine.progress(config,restored),1);
assert.equal(restored.currentRound,0);
assert.equal(restored.nextTaskIndex,1);
assert.equal(engine.currentTask(config,restored).letter,errorState.taskOrders[0][1]);
while(!restored.gameCompleted){const task=engine.currentTask(config,restored);engine.catchItem(config,restored,task.letter);}
assert.equal(restored.completedTasks.length,9);
assert.equal(engine.catchItem(config,restored,'M'),'ignored');
const completeRestored=engine.restore(config,JSON.parse(JSON.stringify(restored)));
assert.equal(completeRestored.gameCompleted,true);
assert.equal(completeRestored.completedTasks.length,9);

const gameHTML=engine.render(config,engine.initialState(config,()=>.1),{characterHTML:'<i>Marius</i>'});
assert.match(gameHTML,/Фруктовый дождь/);
assert.match(gameHTML,/data-fruit-rain-scene/);
assert.match(gameHTML,/data-mode="wave"/);
assert.match(gameHTML,/images\/fruit-rain\/fruit-rain-bg\.png/);
assert.match(gameHTML,/data-fruit-rain-asset/);
assert.match(gameHTML,/data-action="fruit-rain-repeat"/);
assert.match(gameHTML,/data-action="fruit-rain-exit"/);
assert.doesNotMatch(gameHTML,/Monkey|Nest|Octopus/);
const finishHTML=engine.render(config,completeRestored,{characterHTML:'<i>Marius</i>'});
assert.match(finishHTML,/Отлично! Сад собран!/);
assert.match(finishHTML,/Полная корзина/);
assert.match(finishHTML,/fruit-rain-basket-full\.png/);
assert.match(finishHTML,/fruit-rain-reward-animation/);
assert.equal((finishHTML.match(/fruit-rain-reward-star fruit-rain-reward-star-/g)||[]).length,3);
assert.equal((finishHTML.match(/fruit-rain-reward-spark/g)||[]).length,8);
assert.doesNotMatch(finishHTML,/fruit-rain-win-stars|class="stars"|★★★/);
const blitzHTML=engine.render(config,blitzState,{characterHTML:'<i>Marius</i>'});
assert.match(blitzHTML,/data-mode="blitz"/);
assert.match(blitzHTML,/Блиц: фрукты падают без остановки!/);
assert.equal((blitzHTML.match(/data-fruit-rain-catch-slot/g)||[]).length,3);
assert.match(blitzHTML,/fruit-rain-progress-fruit/);
assert.doesNotMatch(blitzHTML,/>\s*[0123]\s*\/\s*3\s*</);
const restoredPartialHTML=engine.render(config,engine.restore(config,JSON.parse(JSON.stringify({...blitzState,nextTaskIndex:beforeBlitzIndex,completedTasks:blitzState.completedTasks.slice(0,beforeBlitzProgress),blitzCatches:1}))),{characterHTML:'<i>Marius</i>'});
assert.equal((restoredPartialHTML.match(/fruit-rain-catch-slot is-filled/g)||[]).length,1);

// Course adapter: the existing MNO review remains, Fruit Rain is inserted
// before A-O, and leaving/reopening saves the last completed task.
const course=createContext();
assert.ok(course.run("LOCAL_REVIEW_BLOCKS.some(block=>block.id==='review_MNO')"));
assert.ok(course.run("CUMULATIVE_REVIEW_BLOCKS.some(block=>block.id==='cumulative_review_AO')"));
course.run("view='course';AppState.cursor={phase:'reviewResult',index:14,step:0};advanceAfterReview()");
assert.equal(course.run('AppState.cursor.phase'),'fruit_rain');
course.run("let fruitTask=FruitRainGame.currentTask(MNO_FRUIT_RAIN_GAME,fruitRainState());FruitRainGame.catchItem(MNO_FRUIT_RAIN_GAME,fruitRainState(),fruitTask.letter);saveProgress()");
const resumed=createContext({saved:saved(course)});
assert.equal(resumed.run('AppState.cursor.phase'),'fruit_rain');
assert.equal(resumed.run('fruitRainState().completedTasks.length'),1);
assert.equal(resumed.run('fruitRainState().nextTaskIndex'),1);
resumed.run("while(!fruitRainState().gameCompleted){const task=FruitRainGame.currentTask(MNO_FRUIT_RAIN_GAME,fruitRainState());FruitRainGame.catchItem(MNO_FRUIT_RAIN_GAME,fruitRainState(),task.letter)};awardStars(StudentDomain.STAR_REWARDS.blockCompleted,'minigame_completed',MNO_FRUIT_RAIN_GAME.rewardSourceId);saveProgress()");
assert.equal(resumed.run("awardStars(3,'minigame_completed',MNO_FRUIT_RAIN_GAME.rewardSourceId)"),false);
assert.equal(resumed.run("AppState.student.starTransactions.filter(item=>item.sourceId===MNO_FRUIT_RAIN_GAME.rewardSourceId).length"),1);
assert.equal(resumed.run("AppState.student.starTransactions.find(item=>item.sourceId===MNO_FRUIT_RAIN_GAME.rewardSourceId).amount"),3);
resumed.run('continueFruitRain()');
assert.deepEqual(JSON.parse(resumed.run('JSON.stringify(AppState.cursor)')),{phase:'cumulativeIntro',index:14,step:0});

// A version-4 learner already beyond MNO is not moved backwards, but gets a
// replay entry that returns to the exact previous course cursor.
const oldContext=createContext(),legacy=JSON.parse(oldContext.run('JSON.stringify(AppState)'));
legacy.version=4;delete legacy.fruitRain;delete legacy.fruitRainReturn;legacy.started=true;legacy.cursor={phase:'lesson',index:17,step:3};
const legacyLoaded=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});
assert.deepEqual(JSON.parse(legacyLoaded.run('JSON.stringify(AppState.cursor)')),{phase:'lesson',index:17,step:3});
assert.equal(legacyLoaded.run('fruitRainUnlocked()'),true);
assert.ok(legacyLoaded.run('renderHome()').includes('fruit-rain-open'));
legacyLoaded.run("view='home';openFruitRain()");
assert.equal(legacyLoaded.run('AppState.cursor.phase'),'fruit_rain');
assert.deepEqual(JSON.parse(legacyLoaded.run('JSON.stringify(AppState.fruitRainReturn)')),{phase:'lesson',index:17,step:3});
legacyLoaded.run('exitFruitRain()');
assert.deepEqual(JSON.parse(legacyLoaded.run('JSON.stringify(AppState.cursor)')),{phase:'lesson',index:17,step:3});

// The game uses the single shared voice manager, the exact three cue families,
// and mute prevents a replay from starting another recording.
const audio=createContext();
audio.run("unlockAudio();view='course';AppState.cursor={phase:'fruit_rain',index:14,step:0}");
assert.equal(audio.run('fruitRainAudioItem().key'),audio.run('FruitRainGame.currentTask(MNO_FRUIT_RAIN_GAME,fruitRainState()).letter.toLowerCase()+"_name"'));
audio.run('AudioManager.play(fruitRainAudioItem())');
assert.equal(audio.played.at(-1).src,audio.run('MEDIA_ASSETS.audio[fruitRainAudioItem().key].src'));
const playedBeforeMute=audio.played.length;
audio.run('AudioManager.setEnabled(false);AudioManager.play(fruitRainAudioItem())');
assert.equal(audio.played.length,playedBeforeMute);
assert.equal(audio.stats().objects,1+audio.run('RIVER_EFFECT_KEYS.length'));

// Static runtime guarantees: pointer controls are normalized and clamped,
// movement/falling share requestAnimationFrame, and all runtime handles clear.
assert.match(appSource,/addEventListener\('pointerdown'/);
assert.match(appSource,/addEventListener\('pointermove'/);
assert.match(appSource,/requestAnimationFrame/);
assert.match(appSource,/Math\.max\(half,Math\.min\(100-half/);
assert.match(appSource,/clearFruitRainRuntime\(\)/);
assert.match(appSource,/FruitRainGame\.fallDuration/);
assert.match(appSource,/startFruitRainBlitz/);
assert.match(appSource,/FruitRainGame\.BLITZ\.targetMaxWaitMs/);
assert.match(appSource,/result===['"]blitz-catch['"]/);
assert.match(appSource,/updateFruitRainCatchProgress\(state\.blitzCatches\)/);
assert.match(appSource,/FruitRainGame\.BLITZ\.taskCompletePauseMs/);
assert.match(appSource,/spawnFruitRainBlitzObject/);
assert.match(appSource,/wireFruitRainAssets/);
assert.match(appSource,/preloadFruitRainAssets/);
assert.match(appSource,/fruitRainPreloadedAssets/);
assert.match(appSource,/has-fruit-rain-background/);
assert.match(appSource,/is-catching/);
assert.match(appSource,/naturalWidth>0\?loaded:failed/);
assert.match(appSource,/addFruitRainBurst/);
assert.match(appSource,/fruit-rain-object\[data-correct="true"\].*classList\.add\('is-hint'\)/);
assert.match(appSource,/getBoundingClientRect\(\),basketRect/);
assert.doesNotMatch(appSource,/phase===['"]fruit_rain['"]&&fruitRainState\(\)\.gameCompleted\)celebrate\(\)/);
assert.match(css,/touch-action:none/);
assert.match(css,/@media\(max-width:520px\)/);
assert.match(css,/@media\(orientation:landscape\) and \(max-height:500px\)/);
assert.match(css,/width:clamp\(var\(--fruit-object-min,68px\),18vw,var\(--fruit-object-max,90px\)\)/);
assert.match(css,/\[data-fruit-rain-asset\]\.is-loaded/);
assert.match(css,/\.fruit-rain-fruit-fallback/);
assert.match(css,/\.fruit-rain-object\.has-fruit-rain-art \.fruit-rain-fruit-fallback/);
assert.match(css,/fruit-rain-basket-catch/);
assert.match(css,/\.fruit-rain-object-symbol\{[^}]*box-sizing:border-box[^}]*width:40%[^}]*border:1\.5px/);
assert.match(css,/\.fruit-rain-object\.is-hint\{animation:none/);
assert.match(css,/\.fruit-rain-hint-image\{[^}]*left:50%[^}]*top:50%[^}]*width:156%[^}]*transform:translate\(-50%,-50%\)/);
assert.match(css,/\.fruit-rain-fruit-image\{z-index:2/);
assert.match(css,/fruit-rain-halo-image/);
assert.match(css,/\.fruit-rain-burst/);
assert.match(css,/\.fruit-rain-catch-progress/);
assert.match(css,/fruit-rain-progress-pop/);
assert.match(css,/fruit-rain-progress-complete/);
assert.match(css,/\.fruit-rain-object\.is-word \.fruit-rain-object-symbol\{[^}]*width:38%[^}]*background:rgba\(18,70,49,.84\)/);
assert.doesNotMatch(css,/rgba\(255,250,226/);
assert.match(css,/\.fruit-rain-object\.is-word\{background:transparent/);
assert.match(css,/\.fruit-rain-reward-animation/);
assert.match(css,/@keyframes fruit-rain-reward-star/);
assert.match(css,/@keyframes fruit-rain-reward-spark/);
assert.doesNotMatch(css,/fruit-rain-finish-sky|fruit-rain-win-stars|fruit-rain-game\.is-complete \.stars/);

const cleanup=createContext();
cleanup.run("cleaned=0;fruitRainTimers.add(setTimeout(()=>{},500));fruitRainFrame=setTimeout(()=>{},500);fruitRainWaveActive=true;fruitRainBlitzSequence=9;fruitRainLastSpawnAt=12;fruitRainBlitzNeedsTarget=true;fruitRainCleanup.push(()=>cleaned++);clearFruitRainRuntime()");
assert.equal(cleanup.run('fruitRainTimers.size'),0);
assert.equal(cleanup.run('fruitRainFrame'),null);
assert.equal(cleanup.run('fruitRainWaveActive'),false);
assert.equal(cleanup.run('fruitRainBlitzSequence'),0);
assert.equal(cleanup.run('fruitRainBlitzNeedsTarget'),false);
assert.equal(cleanup.run('cleaned'),1);

console.log(JSON.stringify({
  passed:true,rounds:3,tasks:9,targets:['M','N','O'],words:['Monkey','Nest','Octopus'],
  exactAudioFiles:['m_name.mp3','n_name.mp3','o_name.mp3','m_sound.mp3','n_sound.mp3','o_sound.mp3','monkey.mp3','nest.mp3','octopus.mp3'],
  targetAlwaysPresent:true,oneCorrectPerWave:true,correctLaneVaries:true,thirdRoundMode:'blitz',targetMaxWaitMilliseconds:engine.BLITZ.targetMaxWaitMs,fruitVariants:engine.FRUITS.length,blitzFruitVariants:engine.BLITZ_FRUITS.length,productionPngs:assetSources.length,wrongDoesNotProgress:true,
  missedTargetRetries:true,hintAfterErrors:2,slowAfterErrors:3,fallMilliseconds:engine.TIMING.fullFallMs,
  persistence:true,legacyStatePreserved:true,oldLearnerReplay:true,rewardSourceId:config.rewardSourceId,
  duplicateRewardGuard:true,pointerEvents:true,requestAnimationFrame:true,optionalAssetFallback:true,successAndMissEffects:true,cleanup:true,mobileCSS:true
},null,2));
