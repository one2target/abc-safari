'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const game=require('../play/flight-yz-game.js');

assert.equal(game.WIDTH,941);
assert.equal(game.HEIGHT,1672);
assert.equal(game.CONFIG.planeSize,230);
assert.equal(game.CONFIG.rewardSourceId,'minigame:flight-yz');
assert.deepEqual(game.CONFIG.start,{x:470,y:1285});
assert.equal(game.CONFIG.islands.length,2);
assert.equal(game.CONFIG.landingZones.length,2);
assert.equal(game.CONFIG.marius.asset,'./images/giraffe_base.png');
assert.equal(game.CONFIG.assets.parcel,'./images/railway-vwx/railway-cargo-01.png');
assert.deepEqual(game.EDUCATION.letters,['Y','Z']);
assert.deepEqual(game.EDUCATION.stages.map(stage=>stage.id),['letterNames','letterSounds','words','finalExpedition']);
assert.deepEqual(game.EDUCATION.stages.map(stage=>stage.audioType),['name','sound','word','mixed']);
assert.deepEqual(game.EDUCATION.stages.map(stage=>stage.copies),[1,1,2,1]);
assert.equal(game.EDUCATION.totalTasks,12);
assert.ok(game.EDUCATION.respawnFadeOut+game.EDUCATION.respawnFadeIn>=300&&game.EDUCATION.respawnFadeOut+game.EDUCATION.respawnFadeIn<=500);
assert.ok(game.EDUCATION.stageTransitionDelay>=700&&game.EDUCATION.stageTransitionDelay<=1200);
assert.ok(game.EDUCATION.deliveryDuration>=400&&game.EDUCATION.deliveryDuration<=700);
assert.ok(game.EDUCATION.finalFlightDuration>=2000&&game.EDUCATION.finalFlightDuration<=3000);
assert.deepEqual(game.FINAL_LANDING_ZONE,{id:'center',x:470,y:535,rx:112,ry:92});
assert.ok(game.CONFIG.islands.every(island=>['labelAnchor','wordAnchor','deliveryAnchor'].every(key=>Number.isFinite(island[key].x)&&Number.isFinite(island[key].y))));
assert.deepEqual(game.PHYSICS,{maxSpeed:500,maxAcceleration:1080,spring:5.2,damping:3.8,maxBank:11,bankResponse:7.5,pointerOffsetMin:82,pointerOffsetMax:112,pointerOffsetHeightRatio:.11,assistDuration:.56,arrivalHold:.4,rearmScale:1.48},'accepted flight physics must stay unchanged');

for(const zone of game.CONFIG.landingZones){
  assert.ok(zone.x-zone.rx>=0&&zone.x+zone.rx<=game.WIDTH,`${zone.id} landing zone must fit the logical world`);
  assert.ok(zone.y-zone.ry>=0&&zone.y+zone.ry<=game.HEIGHT,`${zone.id} landing zone must fit the logical world`);
}
for(const source of Object.values(game.ASSETS)){
  const file=path.resolve(__dirname,'../play',source);
  assert.ok(fs.existsSync(file),`Missing YZ asset: ${source}`);
  assert.equal(fs.readFileSync(file).subarray(1,4).toString(),'PNG');
}
for(const filename of ['w_name.mp3','w_sound.mp3','whale.mp3','x_name.mp3','x_sound.mp3','fox.mp3','y_name.mp3','z_name.mp3','y_sound.mp3','z_sound.mp3','yoyo.mp3','zebra.mp3','river-victory.wav']){
  assert.ok(fs.existsSync(path.resolve(__dirname,'../play/audio',filename)),`Missing recorded YZ audio: ${filename}`);
}

const markup=game.render(game.CONFIG,{debug:false});
assert.match(markup,/data-yz-flight-scene/);
assert.match(markup,/data-yz-landing-zone="left"/);
assert.match(markup,/data-yz-landing-zone="right"/);
assert.equal((markup.match(/data-yz-island-letter=/g)||[]).length,3,'two island signs and one final-platform sign must render');
assert.equal((markup.match(/data-yz-island-word=/g)||[]).length,3,'two island word visuals and one final-platform visual must render');
assert.equal((markup.match(/data-yz-delivery-anchor=/g)||[]).length,2,'two world-coordinate delivery anchors must render');
assert.equal((markup.match(/data-yz-landing-zone=/g)||[]).length,3,'the final task needs a third landing zone');
assert.match(markup,/data-yz-final-platform[^>]*hidden/,'the lightweight third platform must stay hidden before task 12');
assert.match(markup,/data-yz-flight-plane[^>]*>[\s\S]*data-yz-flight-parcel[^>]*railway-cargo-01\.png/,'parcel must be a child of the moving plane wrapper');
assert.match(markup,/data-yz-repeat-audio[^>]*aria-label="Повторить название буквы"/);
assert.match(markup,/data-yz-flight-progress[^>]*>0 \/ 12</);
assert.match(markup,/data-yz-stage-transition[^>]*hidden[\s\S]*data-yz-stage-transition-text/);
assert.match(markup,/data-yz-flight-replay/);
assert.match(markup,/Алфавит покорён!/);
assert.match(markup,/Покоритель<br>алфавита/);
assert.match(markup,/yz-flight-final-plane[\s\S]*yz-flight-final-marius[\s\S]*yz-flight-final-medal/,'final composition must read as plane, Marius, reward');
assert.match(markup,/yz-flight-medal[^>]*>[\s\S]*<strong>A–Z<\/strong><\/div>\s*<figcaption>Покоритель<br>алфавита<\/figcaption>/,'the medal title must stay outside the gold circle for readability');
assert.match(markup,/A B C D E F/);assert.match(markup,/S T U V W X Y Z/);
assert.equal((markup.match(/<span aria-hidden="true">★<\/span>/g)||[]).length,3,'final screen must reuse the established three-star motif');
assert.doesNotMatch(markup,/data-yz-skip-final/,'debug skip must not exist in the normal UI');
assert.match(game.render(game.CONFIG,{debug:true}),/data-yz-skip-final/,'debug mode must expose a final-task shortcut');
assert.match(game.render(game.CONFIG,{debug:true}),/data-yz-reset-session/,'debug mode must expose a session-only reset');
assert.equal((markup.match(/data-yz-flight-marius/g)||[]).length,1,'Marius must render exactly once');
assert.doesNotMatch(markup,/\b(?:localStorage|reward|saveProgress)\b/i);

const stableRandom=()=>.999;
const state=game.LearningEngine.initialState(game.EDUCATION,stableRandom);
assert.equal(state.status,'ready');assert.equal(state.stage,'letterNames');assert.equal(state.audioType,'name');assert.equal(state.parcelState,'none');
assert.deepEqual(game.LearningEngine.initialState(game.EDUCATION,()=>0).tasks,['Z','Y'],'name task order must be shuffleable');
assert.equal(game.LearningEngine.start(state).outcome,'started');assert.equal(state.status,'playing');
assert.deepEqual(new Set(Object.values(state.assignment)),new Set(['Y','Z']),'Y and Z must be assigned to different islands');

const targetBeforeReplay=state.target,stateBeforeReplay=JSON.stringify(state);
assert.equal(game.LearningEngine.currentTarget(state),targetBeforeReplay);
assert.equal(JSON.stringify(state),stateBeforeReplay,'audio replay target lookup must not mutate the task');

let wrongIsland=Object.keys(state.assignment).find(id=>state.assignment[id]!==state.target);
let correctIsland=Object.keys(state.assignment).find(id=>state.assignment[id]===state.target);
assert.equal(game.LearningEngine.land(state,wrongIsland).outcome,'wrong');assert.equal(state.totalProgress,0);
assert.equal(game.LearningEngine.land(state,correctIsland).outcome,'ignored','resolving state must block double landing events');
let result=game.LearningEngine.resolveLanding(state);
assert.equal(result.outcome,'retry');assert.equal(result.respawn,false);assert.equal(state.totalProgress,0);assert.equal(state.status,'playing');

function finishOrdinaryCorrect(current,random=stableRandom){
  const island=Object.keys(current.assignment).find(id=>current.assignment[id]===current.target);
  assert.equal(game.LearningEngine.land(current,island).outcome,'correct');
  assert.equal(game.LearningEngine.resolveLanding(current).outcome,'respawn');
  return game.LearningEngine.finishRespawn(current,game.EDUCATION,random);
}

result=finishOrdinaryCorrect(state);
assert.equal(result.outcome,'next');assert.equal(state.totalProgress,1);assert.equal(state.stageProgress,1);
result=finishOrdinaryCorrect(state,()=>0);
assert.equal(result.outcome,'stage-transition');assert.equal(state.stage,'letterSounds');assert.equal(state.audioType,'sound');assert.equal(state.totalProgress,2);assert.equal(state.stageProgress,0);
assert.equal(game.LearningEngine.finishTransition(state).outcome,'next-stage');assert.equal(state.status,'playing');

result=finishOrdinaryCorrect(state);
assert.equal(result.outcome,'next');assert.equal(state.totalProgress,3);
result=finishOrdinaryCorrect(state,()=>0);
assert.equal(result.outcome,'stage-transition');assert.equal(state.stage,'words');assert.equal(state.audioType,'word');assert.equal(state.totalProgress,4);assert.equal(state.stageProgress,0);
assert.equal(state.tasks.length,4);assert.equal(state.tasks.filter(letter=>letter==='Y').length,2);assert.equal(state.tasks.filter(letter=>letter==='Z').length,2);
assert.equal(state.status,'transitioning');assert.equal(state.parcelState,'none');
assert.equal(game.LearningEngine.finishTransition(state).outcome,'next-stage');assert.equal(state.status,'playing');assert.equal(state.parcelState,'attached');

wrongIsland=Object.keys(state.assignment).find(id=>state.assignment[id]!==state.target);
assert.equal(game.LearningEngine.land(state,wrongIsland).outcome,'wrong');assert.equal(state.totalProgress,4);assert.equal(state.parcelState,'attached');
result=game.LearningEngine.resolveLanding(state);
assert.equal(result.outcome,'retry');assert.equal(result.respawn,false);assert.equal(state.parcelState,'attached');assert.equal(state.totalProgress,4);

function finishWordDelivery(current,random=stableRandom){
  const island=Object.keys(current.assignment).find(id=>current.assignment[id]===current.target);
  assert.equal(game.LearningEngine.land(current,island).outcome,'correct');
  assert.equal(current.totalProgress,4+current.stageProgress,'word progress must wait for completed delivery');
  const delivery=game.LearningEngine.resolveLanding(current);
  assert.equal(delivery.outcome,'delivery');assert.equal(current.status,'delivering');assert.equal(current.parcelState,'delivering');
  const delivered=game.LearningEngine.finishDelivery(current);
  assert.equal(delivered.outcome,'delivered');assert.equal(current.status,'respawning');assert.equal(current.parcelState,'delivered');
  return game.LearningEngine.finishRespawn(current,game.EDUCATION,random);
}

for(let index=0;index<4;index++){
  result=finishWordDelivery(state,index===3?stableRandom:()=>index/4);
  if(index<3){assert.equal(result.outcome,'next');assert.equal(state.parcelState,'attached');}
  else assert.equal(result.outcome,'stage-transition');
}
assert.equal(state.totalProgress,8);assert.equal(state.stageProgress,0);assert.equal(state.status,'transitioning');assert.equal(state.stage,'finalExpedition');assert.equal(state.parcelState,'none');
assert.equal(state.tasks.length,4);assert.deepEqual(state.tasks.map(task=>task.taskType),['letterName','letterSound','word','word']);
assert.equal(game.LearningEngine.finishTransition(state).outcome,'next-stage');assert.equal(state.status,'playing');

function finishFinalCorrect(current,random=stableRandom){
  const island=Object.keys(current.assignment).find(id=>current.assignment[id]===current.target);
  assert.equal(game.LearningEngine.land(current,island).outcome,'correct');
  const resolved=game.LearningEngine.resolveLanding(current,game.EDUCATION);
  if(resolved.outcome==='respawn')return game.LearningEngine.finishRespawn(current,game.EDUCATION,random);
  return resolved;
}

assert.equal(state.taskType,'letterName');assert.ok(['Y','Z'].includes(state.target));
result=finishFinalCorrect(state,()=>.25);assert.equal(result.outcome,'next');assert.equal(state.totalProgress,9);assert.equal(state.journeyProgress,1);assert.equal(state.taskType,'letterSound');
result=finishFinalCorrect(state,()=>.75);assert.equal(result.outcome,'next');assert.equal(state.totalProgress,10);assert.equal(state.journeyProgress,2);assert.equal(state.taskType,'word');assert.equal(state.answerMode,'word');
result=finishFinalCorrect(state,()=>.5);assert.equal(result.outcome,'next');assert.equal(state.totalProgress,11);assert.equal(state.journeyProgress,3);assert.equal(state.taskId,'final-recap');assert.equal(state.target,'X');assert.deepEqual(new Set(Object.values(state.assignment)),new Set(['W','X','Y']));

wrongIsland=Object.keys(state.assignment).find(id=>state.assignment[id]!==state.target);
assert.equal(game.LearningEngine.land(state,wrongIsland).outcome,'wrong');assert.equal(state.totalProgress,11);
assert.equal(game.LearningEngine.resolveLanding(state,game.EDUCATION).outcome,'retry');assert.equal(state.status,'playing');
result=finishFinalCorrect(state);
assert.equal(result.outcome,'final-flight');assert.equal(state.totalProgress,12);assert.equal(state.journeyProgress,4);assert.equal(state.status,'finalFlight');assert.equal(state.parcelState,'none');
assert.equal(game.LearningEngine.finishRespawn(state,game.EDUCATION).outcome,'ignored','task 12 must never use an ordinary respawn');
assert.equal(game.LearningEngine.land(state,'left').outcome,'ignored','final flight must block further answers');
assert.equal(game.LearningEngine.finishFinalFlight(state).outcome,'final-celebration');assert.equal(state.status,'finalCelebration');
assert.equal(game.LearningEngine.finishFinalCelebration(state).outcome,'complete');assert.equal(state.status,'complete');
assert.equal(game.LearningEngine.finishFinalCelebration(state).outcome,'ignored','final completion must run once');

const skipped=game.LearningEngine.initialState(game.EDUCATION,stableRandom);game.LearningEngine.start(skipped);
assert.equal(game.LearningEngine.skipToFinalTask(skipped,game.EDUCATION,stableRandom).outcome,'skipped-to-final');
assert.equal(skipped.stage,'finalExpedition');assert.equal(skipped.totalProgress,11);assert.equal(skipped.taskId,'final-recap');assert.equal(skipped.target,'X');assert.equal(skipped.status,'playing');

const resumable=game.LearningEngine.initialState(game.EDUCATION,stableRandom);game.LearningEngine.start(resumable);
const savedSequence=JSON.stringify(resumable.tasks),savedAssignment=JSON.stringify(resumable.assignment);
const resumableIsland=Object.keys(resumable.assignment).find(id=>resumable.assignment[id]===resumable.target);
assert.equal(game.LearningEngine.land(resumable,resumableIsland).outcome,'correct');
const restoredAfterCorrect=game.LearningEngine.restore(JSON.parse(JSON.stringify(resumable)),game.EDUCATION,()=>0);
assert.equal(restoredAfterCorrect.status,'playing');assert.equal(restoredAfterCorrect.totalProgress,1);assert.equal(restoredAfterCorrect.taskIndex,1);
assert.equal(JSON.stringify(restoredAfterCorrect.tasks),savedSequence,'restore must retain the generated task sequence');
const restoredUnfinished=game.LearningEngine.restore({...JSON.parse(JSON.stringify(resumable)),status:'resolving',lastOutcome:'wrong',totalProgress:0,stageProgress:0,taskIndex:0,assignment:JSON.parse(savedAssignment)},game.EDUCATION,()=>0);
assert.equal(restoredUnfinished.status,'playing');assert.equal(restoredUnfinished.totalProgress,0);assert.equal(JSON.stringify(restoredUnfinished.assignment),savedAssignment,'unfinished assignment must survive restore');

const wordRestore=game.LearningEngine.initialState(game.EDUCATION,stableRandom);game.LearningEngine.start(wordRestore);
while(wordRestore.stage!=='words'){const step=finishOrdinaryCorrect(wordRestore);if(step.outcome==='stage-transition')game.LearningEngine.finishTransition(wordRestore);}
assert.equal(wordRestore.parcelState,'attached');
const wordIsland=Object.keys(wordRestore.assignment).find(id=>wordRestore.assignment[id]===wordRestore.target);
game.LearningEngine.land(wordRestore,wordIsland);game.LearningEngine.resolveLanding(wordRestore,game.EDUCATION);
const restoredDuringDelivery=game.LearningEngine.restore(JSON.parse(JSON.stringify(wordRestore)),game.EDUCATION,()=>0);
assert.equal(restoredDuringDelivery.status,'playing');assert.equal(restoredDuringDelivery.parcelState,'attached');assert.equal(restoredDuringDelivery.totalProgress,4,'an unfinished delivery must not be counted');
game.LearningEngine.finishDelivery(wordRestore);
const restoredAfterDelivery=game.LearningEngine.restore(JSON.parse(JSON.stringify(wordRestore)),game.EDUCATION,()=>0);
assert.equal(restoredAfterDelivery.status,'playing');assert.equal(restoredAfterDelivery.parcelState,'attached');assert.equal(restoredAfterDelivery.totalProgress,5);assert.equal(restoredAfterDelivery.taskIndex,1);

const restoredFinalFlight=game.LearningEngine.restore({...JSON.parse(JSON.stringify(state)),status:'finalFlight'},game.EDUCATION,()=>0);
assert.equal(restoredFinalFlight.status,'complete');assert.equal(restoredFinalFlight.totalProgress,12);assert.equal(restoredFinalFlight.journeyProgress,4,'closing during final flight must restore the completed final screen');

const runtime={x:810,y:600,targetX:120,targetY:200,vx:321,vy:-98,bank:9,pointerId:42,pointerActive:true,pointerWorld:{x:120,y:200},assist:{zone:{id:'left'}},bounds:{left:130,right:810,top:410,bottom:1510}};
const runtimeZones=[{id:'left',armed:false},{id:'right',armed:false}];
assert.equal(game.RuntimeEngine.clearPointer(runtime),42);
assert.equal(runtime.pointerId,null);assert.equal(runtime.pointerActive,false);assert.equal(runtime.pointerWorld,null);
const reset=game.RuntimeEngine.resetAtStart(runtime,game.CONFIG,runtimeZones);
assert.deepEqual({x:reset.x,y:reset.y},{x:470,y:1285});assert.equal(runtime.targetX,470);assert.equal(runtime.targetY,1285);
assert.equal(runtime.vx,0);assert.equal(runtime.vy,0);assert.equal(runtime.bank,0);assert.equal(runtime.assist,null);assert.ok(runtimeZones.every(zone=>zone.armed));

const source=fs.readFileSync(path.resolve(__dirname,'../play/flight-yz-game.js'),'utf8');
for(const event of ['pointerdown','pointermove','pointerup','pointercancel'])assert.match(source,new RegExp(`['"]${event}['"]`));
for(const cleanup of ['cancelAnimationFrame','removeEventListener','releasePointerCapture','clearDeliveryVisuals'])assert.match(source,new RegExp(cleanup));
for(const lifecycle of ['clearTimers','onDestroy','data-yz-flight-hud','data-yz-island-word','data-yz-flight-parcel','data-yz-delivery-anchor','runtime.finalFlight=null','finalSequenceStarted'])assert.match(source,new RegExp(lifecycle.replace('.','\\.')));
for(const stateName of ['ready','playing','resolving','delivering','respawning','transitioning','finalFlight','finalCelebration','complete'])assert.match(source,new RegExp(`['"]${stateName}['"]`));
assert.match(source,/function respawnPlaneAtStart\(\)/,'all stages must share the dedicated respawn function');
assert.match(source,/function deliverParcel\(\)/,'word success must use a dedicated delivery transition');
assert.match(source,/function beginFinalFlight\(\)/);assert.match(source,/function finishFinalFlight\(\)/);assert.match(source,/function updateFinalFlight\(dt\)/);
assert.match(source,/if\(result\.outcome==='final-flight'\)\{clearAnswerReactions\(\);beginFinalFlight\(\);return;\}/,'task 12 must branch to final flight instead of respawn');
assert.match(source,/finalChoiceScale=.*\.62/,'the three-choice route must not cross a side landing zone accidentally');
assert.match(source,/clearActivePointer\(\);playCurrentTarget\('correct'\)/,'correct answer must clear a held pointer immediately');

const cssSource=fs.readFileSync(path.resolve(__dirname,'../play/flight-yz-game.css'),'utf8');
for(const selector of ['data-journey-progress="1"','is-final-flight','yz-flight-final-alphabet','yz-flight-medal','prefers-reduced-motion:reduce'])assert.match(cssSource,new RegExp(selector));
assert.match(cssSource,/\.yz-flight-journey-sparks i\{/);assert.equal((game.render().match(/--journey-index:/g)||[]).length,14,'final effects must stay within the lightweight particle budget');

const indexSource=fs.readFileSync(path.resolve(__dirname,'../play/index.html'),'utf8');
assert.match(indexSource,/\{letter:'Y',[^\n]*word:'Yo-yo'[^\n]*emoji:'🪀'/,'Y word must come from the existing curriculum');
assert.match(indexSource,/\{letter:'Z',[^\n]*word:'Zebra'[^\n]*emoji:'🦓'/,'Z word must come from the existing curriculum');
assert.match(indexSource,/\{letter:'W',[^\n]*word:'Whale'[^\n]*emoji:'🐋'/,'W recap distractor must come from the existing curriculum');
assert.match(indexSource,/\{letter:'X',[^\n]*word:'Fox'[^\n]*emoji:'🦊'/,'X recap target must come from the existing curriculum');
assert.match(indexSource,/function flightYZCatalogItems\(\)\{return \['W','X','Y','Z'\]\.map\(letter=>\{const data=byLetter\.get\(letter\)/,'all final word data must be derived from the shared curriculum map');
assert.match(indexSource,/audioKey:wordAudioKey\(data\),audioSrc:data\.wordAudio/,'word audio metadata must use the shared resolved assets');
assert.match(indexSource,/audioType==='word'\?enWord\(data\):audioType==='sound'\?enSound\(data\):enName\(data\)/,'the stage must select word, phonics or name audio from shared helpers');
assert.match(indexSource,/function playFlightYZTarget\(letter,context=\{\}\)\{[\s\S]*?setInstruction\(\[item\]\)/,'replay must contain only the current target audio');
assert.match(indexSource,/function playFlightYZRetry[\s\S]*?AudioManager\.playSequence\(\[\{key:'river_wrong'\},\{\.\.\.item,pauseBefore:120\}\]/,'wrong sound and target word must be sequenced without overlap');
assert.match(indexSource,/function playFlightYZFinal\(\)\{AudioManager\.stop\(\);return EffectsManager\.play\('river_victory'\);\}/,'final fanfare must start after voice audio is stopped');
assert.match(indexSource,/function wireFlightYZGame\(\)\{[\s\S]*?clearFlightYZRuntime\(\);[\s\S]*?FlightYZGame\.mount/,'reopening must destroy the previous controller before mounting');

console.log('flight-yz-game tests passed');
