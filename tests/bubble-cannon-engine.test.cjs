const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const root=path.resolve(__dirname,'..');
const engineSource=fs.readFileSync(path.join(root,'play/bubble-cannon-game.js'),'utf8');
const appSource=fs.readFileSync(path.join(root,'play/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'play/bubble-cannon-game.css'),'utf8');
const context=vm.createContext({});
vm.runInContext(`${engineSource}\nthis.engine=BubbleCannonGame;`,context);
const engine=context.engine,config=engine.CONFIG;

assert.equal(engine.validate(config),true);
assert.equal(config.id,'bubble-cannon-pqr');
assert.equal(config.rewardSourceId,'minigame:bubble-cannon-pqr');
assert.deepEqual(Array.from(config.letters,item=>item.letter),['P','Q','R']);
assert.deepEqual(Array.from(config.letters,item=>item.word),['Panda','Queen','Rabbit']);
assert.deepEqual(Array.from(config.letters,item=>item.nameAudio),['p_name','q_name','r_name']);
assert.deepEqual(Array.from(config.letters,item=>item.soundAudio),['p_sound','q_sound','r_sound']);
assert.deepEqual(Array.from(config.letters,item=>item.wordAudio),['panda','queen','rabbit']);
assert.deepEqual(Array.from(config.rounds,round=>round.id),['names','sounds','words']);
assert.deepEqual(Array.from(config.rounds,round=>round.hitsPerTask),[1,1,2]);
assert.equal(engine.totalTasks(config),9);
assert.equal(engine.totalHits(config),12);
assert.equal(config.minDragPx,8);
const firstRoundHTML=engine.render(config,engine.initialState(config,()=>.2),{characterHTML:'<i>Marius</i>'});
assert.match(firstRoundHTML,/data-round="names"/);assert.match(firstRoundHTML,/<strong class="bubble-cannon-target-content">P<\/strong>/);assert.match(firstRoundHTML,/<strong class="bubble-cannon-target-content">Q<\/strong>/);assert.match(firstRoundHTML,/<strong class="bubble-cannon-target-content">R<\/strong>/);
assert.equal((firstRoundHTML.match(/draggable="false"/g)||[]).length,16);

// Every round contains P/Q/R once. The final round keeps the same task after
// hit one and advances only after hit two.
const state=engine.initialState(config,()=>.2),seen=[];
while(!state.gameCompleted){
  const task=engine.currentTask(config,state),beforeRound=state.currentRound,beforeIndex=state.taskIndex;
  seen.push(`${task.roundId}:${task.letter}`);
  const first=engine.hitTarget(config,state,task.letter);
  if(task.roundId==='words'){
    assert.equal(first,'task-hit');assert.equal(state.currentRound,beforeRound);assert.equal(state.taskIndex,beforeIndex);assert.equal(state.hitsForTask,1);
    assert.ok(['correct','game-complete'].includes(engine.hitTarget(config,state,task.letter))||state.currentRound>beforeRound);
  }
}
assert.equal(state.successfulHits,12);
assert.equal(state.completedTasks.length,9);
for(const round of config.rounds)assert.deepEqual(seen.filter(value=>value.startsWith(`${round.id}:`)).map(value=>value.at(-1)).sort(),['P','Q','R']);

// Wrong bubble hits teach and reveal hints; missing every bubble does not.
const errors=engine.initialState(config,()=>.1),task=engine.currentTask(config,errors),wrong=config.letters.find(item=>item.letter!==task.letter).letter;
assert.equal(engine.miss(config,errors),'miss');assert.equal(errors.errors,0);assert.equal(errors.successfulHits,0);
assert.equal(engine.hitTarget(config,errors,wrong),'retry');assert.equal(errors.errors,1);
assert.equal(engine.hitTarget(config,errors,wrong),'retry-hint');assert.equal(engine.hint(config,errors),task.letter);assert.equal(engine.hintStrength(errors),'soft');
assert.equal(engine.hitTarget(config,errors,wrong),'retry-strong');assert.equal(engine.hintStrength(errors),'strong');assert.equal(errors.successfulHits,0);
assert.equal(engine.hitTarget(config,errors,task.letter),'correct');assert.equal(errors.errors,0);assert.equal(errors.successfulHits,1);

// Aim assist only corrects a near miss of the current answer. A direct hit on
// a wrong target stays wrong, and a distant shot remains a miss.
const targets=[{id:'P',x:100,y:0,radius:12},{id:'Q',x:100,y:55,radius:12},{id:'R',x:100,y:-55,radius:12}];
const assisted=engine.resolveAim({x:0,y:0},{x:100,y:29},targets,'P',22);
assert.equal(assisted.kind,'hit');assert.equal(assisted.target.id,'P');assert.equal(assisted.assisted,true);
const wrongHit=engine.resolveAim({x:0,y:0},{x:100,y:55},targets,'P',22);
assert.equal(wrongHit.kind,'hit');assert.equal(wrongHit.target.id,'Q');assert.equal(wrongHit.assisted,false);
assert.equal(engine.resolveAim({x:0,y:0},{x:100,y:100},targets,'P',22).kind,'miss');
assert.equal(engine.resolveAim({x:0,y:0},{x:4,y:2},targets,'P',22).kind,'cancel');

// Pointer tracking measures the user's actual gesture, survives lost capture,
// cancels safely and consumes every pointerup exactly once.
const pointer=engine.createPointerTracker(config.minDragPx);
assert.equal(pointer.begin({pointerId:1,pointerType:'mouse',clientX:100,clientY:200}).distance,0);
assert.equal(pointer.move({pointerId:2,clientX:180,clientY:120}),null);
assert.equal(pointer.move({pointerId:1,clientX:115,clientY:185}).distance>8,true);
assert.equal(pointer.loseCapture({pointerId:1}).captureLost,true);
const releasedOutside=pointer.finish({pointerId:1,clientX:250,clientY:80});assert.equal(releasedOutside.shouldShoot,true);assert.equal(pointer.finish({pointerId:1,clientX:250,clientY:80}),null);
pointer.begin({pointerId:3,pointerType:'mouse',clientX:10,clientY:10});assert.equal(pointer.finish({pointerId:3,clientX:15,clientY:13}).shouldShoot,false);
pointer.begin({pointerId:4,pointerType:'touch',clientX:20,clientY:20});pointer.move({pointerId:4,clientX:24,clientY:22});assert.equal(pointer.cancel({pointerId:4}),true);assert.equal(pointer.current(),null);
pointer.begin({pointerId:5,pointerType:'touch',clientX:30,clientY:30});for(let step=1;step<=5;step++)pointer.move({pointerId:5,clientX:30+step*3,clientY:30-step*2});assert.equal(pointer.finish({pointerId:5,clientX:48,clientY:18}).shouldShoot,true);
let trackerShots=0;
for(let attempt=0;attempt<30;attempt++){
  const pointerId=100+attempt,startX=200+(attempt%3),startY=300+(attempt%5);assert.ok(pointer.begin({pointerId,pointerType:'mouse',clientX:startX,clientY:startY}));
  const shot=pointer.finish({pointerId,clientX:startX+20+(attempt%7),clientY:startY-14-(attempt%4)});if(shot?.shouldShoot)trackerShots++;
  assert.equal(pointer.finish({pointerId,clientX:startX+30,clientY:startY-20}),null);
}
assert.equal(trackerShots,30);

// Save/restore keeps the logical scene, including one of two word hits.
const partial=engine.initialState(config,()=>.3);
while(partial.currentRound<2){const current=engine.currentTask(config,partial);engine.hitTarget(config,partial,current.letter);}
const wordTask=engine.currentTask(config,partial);assert.equal(engine.hitTarget(config,partial,wordTask.letter),'task-hit');
const restored=engine.restore(config,JSON.parse(JSON.stringify(partial)),()=>.9);
assert.equal(restored.currentRound,2);assert.equal(restored.taskIndex,0);assert.equal(restored.hitsForTask,1);assert.equal(restored.successfulHits,7);
const html=engine.render(config,restored,{characterHTML:'<i>Marius</i>'});
assert.match(html,/data-round="words"/);assert.equal((html.match(/data-bubble-cannon-hit-slot/g)||[]).length,2);assert.equal((html.match(/class="is-filled"/g)||[]).length,1);assert.match(html,/panda|queen|rabbit/i);assert.match(html,/data-bubble-cannon-control/);assert.match(html,/data-bubble-cannon-asset/);
assert.equal((html.match(/bubble-cannon-hint-image/g)||[]).length,3);
assert.match(html,/<strong class="bubble-cannon-target-content">🐼<\/strong>/);assert.match(html,/<strong class="bubble-cannon-target-content">👸<\/strong>/);assert.match(html,/<strong class="bubble-cannon-target-content">🐰<\/strong>/);assert.doesNotMatch(html,/<strong class="bubble-cannon-target-content">[PQR]<\/strong>/);
const completeHTML=engine.render(config,state,{characterHTML:'<i>Marius</i>'});
assert.match(completeHTML,/Все пузыри лопнули!/);assert.equal((completeHTML.match(/<span>★<\/span>/g)||[]).length,3);

// Existing PQR review remains and hands off to the cannon; completion hands
// off to S. Progress and the idempotent reward survive reload.
const course=createContext();
assert.ok(course.run("LOCAL_REVIEW_BLOCKS.some(block=>block.id==='review_PQR')"));
course.run("view='course';AppState.cursor={phase:'reviewResult',index:17,step:0};advanceAfterReview()");
assert.equal(course.run('AppState.cursor.phase'),'bubble_cannon');
course.run("let shotTask=BubbleCannonGame.currentTask(PQR_BUBBLE_CANNON_GAME,bubbleCannonState());BubbleCannonGame.hitTarget(PQR_BUBBLE_CANNON_GAME,bubbleCannonState(),shotTask.letter);saveProgress()");
const resumed=createContext({saved:saved(course)});
assert.equal(resumed.run('AppState.cursor.phase'),'bubble_cannon');assert.equal(resumed.run('bubbleCannonState().successfulHits'),1);
resumed.run("while(!bubbleCannonState().gameCompleted){const shotTask=BubbleCannonGame.currentTask(PQR_BUBBLE_CANNON_GAME,bubbleCannonState());BubbleCannonGame.hitTarget(PQR_BUBBLE_CANNON_GAME,bubbleCannonState(),shotTask.letter)};awardStars(StudentDomain.STAR_REWARDS.blockCompleted,'minigame_completed',PQR_BUBBLE_CANNON_GAME.rewardSourceId);saveProgress()");
assert.equal(resumed.run("awardStars(3,'minigame_completed',PQR_BUBBLE_CANNON_GAME.rewardSourceId)"),false);
assert.equal(resumed.run("AppState.student.starTransactions.filter(item=>item.sourceId===PQR_BUBBLE_CANNON_GAME.rewardSourceId).length"),1);
resumed.run('continueBubbleCannon()');assert.deepEqual(JSON.parse(resumed.run('JSON.stringify(AppState.cursor)')),{phase:'lesson',index:18,step:0});

// A learner from the previous schema who already passed PQR stays in place
// and receives the replay entry instead of being moved backwards.
const legacyContext=createContext(),legacy=JSON.parse(legacyContext.run('JSON.stringify(AppState)'));
legacy.version=5;delete legacy.bubbleCannon;delete legacy.bubbleCannonReturn;legacy.started=true;legacy.cursor={phase:'lesson',index:20,step:3};
const legacyLoaded=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});
assert.deepEqual(JSON.parse(legacyLoaded.run('JSON.stringify(AppState.cursor)')),{phase:'lesson',index:20,step:3});assert.equal(legacyLoaded.run('bubbleCannonUnlocked()'),true);assert.ok(legacyLoaded.run('renderHome()').includes('bubble-cannon-open'));

// The shared voice manager supplies the exact cue and global mute blocks it.
const audio=createContext();audio.run("unlockAudio();view='course';AppState.cursor={phase:'bubble_cannon',index:17,step:0}");
assert.equal(audio.run('bubbleCannonAudioItem().key'),audio.run('BubbleCannonGame.currentTask(PQR_BUBBLE_CANNON_GAME,bubbleCannonState()).letter.toLowerCase()+"_name"'));
audio.run('AudioManager.play(bubbleCannonAudioItem())');const beforeMute=audio.played.length;audio.run('AudioManager.setEnabled(false);AudioManager.play(bubbleCannonAudioItem())');assert.equal(audio.played.length,beforeMute);

// Static browser guarantees: Pointer Events, direct projectile animation,
// cleanup, touch lock, mobile layouts and the complete supplied PNG set.
assert.match(appSource,/addEventListener\('pointerdown'/);assert.match(appSource,/window\.addEventListener\('pointermove'/);assert.match(appSource,/window\.addEventListener\('pointerup'/);assert.match(appSource,/window\.addEventListener\('pointercancel'/);assert.match(appSource,/addEventListener\('lostpointercapture'/);assert.match(appSource,/addEventListener\('dragstart'/);assert.match(appSource,/BubbleCannonGame\.resolveAim/);assert.match(appSource,/clearBubbleCannonRuntime\(\)/);assert.match(appSource,/wireBubbleCannonAssets/);assert.match(appSource,/updateBubbleCannonHitProgress\(result===['"]task-hit['"]\?state\.hitsForTask:taskBefore\.hitsPerTask/);assert.match(appSource,/renderCharacter\('gameplay'.*bubble-cannon-marius-stage/);
assert.match(appSource,/preloadBubbleCannonAssets/);assert.match(appSource,/data-bubble-cannon-muzzle/);assert.match(appSource,/PNG failed to load/);assert.match(appSource,/--shot-angle/);
assert.match(css,/touch-action:none/);assert.match(css,/-webkit-user-drag:none/);assert.match(css,/@media\(max-width:520px\)/);assert.match(css,/@media\(orientation:landscape\) and \(max-height:500px\)/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/bubble-cannon-target-fallback/);assert.match(css,/object-position:50% 61%/);assert.match(css,/bubble-cannon-pivot-point/);
assert.match(css,/data-round="words"[^}]*\.bubble-cannon-target-image\{[^}]*mask-image:radial-gradient/);assert.match(css,/data-round="words"[^}]*\.bubble-cannon-target-content\{[^}]*width:74%;height:74%/);
const assetSources=[config.assets.background,config.assets.base,config.assets.barrel,config.assets.muzzleFlash,config.assets.projectile,config.assets.projectileTrail,config.assets.hit,config.assets.wrong,config.assets.hintGlow,...config.assets.targets,...config.assets.leaves,...config.assets.clouds];
assert.equal(assetSources.length,16);assert.equal(new Set(assetSources).size,16);
for(const source of assetSources){
  assert.ok(source.startsWith('./images/bubble-cannon/'));const file=path.join(root,'play',source.slice(2));assert.equal(fs.existsSync(file),true,`Missing Bubble Cannon PNG: ${file}`);const png=fs.readFileSync(file);assert.equal(png.subarray(1,4).toString(),'PNG');assert.ok(png.readUInt32BE(16)>0);assert.ok(png.readUInt32BE(20)>0);
}
assert.equal(fs.existsSync(path.join(root,'play/images/bubble-cannon/README.md')),true);

console.log(JSON.stringify({passed:true,rounds:3,tasks:9,successfulHits:12,targets:['P','Q','R'],words:['Panda','Queen','Rabbit'],thirdRoundHitsPerWord:2,aimAssist:true,missAndWrongSeparated:true,hintAfterWrongHits:2,slowAfterWrongHits:3,persistence:true,rewardSourceId:config.rewardSourceId,duplicateRewardGuard:true,pointerEvents:true,pointerDragPx:config.minDragPx,pointerTrackerShots:trackerShots,windowPointerFallback:true,nativeDragPrevention:true,sharedAudioManager:true,globalMute:true,pngAssets:16,assetPreload:true,assetFailureFallback:true,mobileCSS:true},null,2));
