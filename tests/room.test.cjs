const assert=require('node:assert/strict');
const {createContext,saved}=require('./support/trainer-harness.cjs');
const state=a=>JSON.parse(a.run('JSON.stringify(AppState.roomABC)'));
const phase=a=>a.run('AppState.cursor.phase');
function reachRoom(a){
 a.run('begin()');
 for(let letter=0;letter<3;letter++){
  assert.equal(a.run('AppState.cursor.index'),letter);
  a.run('nextLessonStep();nextLessonStep()');
  for(let question=0;question<3;question++)a.run('ensureQuestion();completeQuestion();go("course")');
  assert.equal(phase(a),'letterReward');a.run('advanceAfterLetter()');
 }
 assert.equal(phase(a),'room');
}
function finishRoom(a){
 for(let round=state(a).currentRound;round<3;round++){
  a.run('for(const id of ROOM_ROUNDS[AppState.roomABC.currentRound].targets)selectRoomObject(id)');
  if(round<2)a.run('nextRoomRound()');
 }
 assert.equal(state(a).gameCompleted,true);
}
const a=createContext();reachRoom(a);
const beforeStats=a.run('JSON.stringify(AppState.stats)'),beforeSerial=a.run('AppState.questionSerial');
assert.equal(a.run('AppState.completedBlocks.length'),0);
a.run('continueAfterRoom();nextRoomRound()');assert.equal(phase(a),'room');assert.equal(state(a).currentRound,0);
// All six true buttons are rendered once, with readable labels and percentage boxes.
const html=a.nodes.get('#main').innerHTML;
assert.equal((html.match(/class="hidden-hotspot"/g)||[]).length,6);
assert.equal((html.match(/id="room-image"/g)||[]).length,1);
for(const label of ['Letter A','Letter B','Letter C','Apple','Soccer ball','Cat'])assert.ok(html.includes(`aria-label="${label}"`));
// Wrong object and background taps never penalise stats. Hint starts only at 3.
a.run('selectRoomObject("letterB");selectRoomObject(null)');assert.equal(a.run('HiddenObjectGame.hint(MARIUS_ROOM,AppState.roomABC)'),null);
a.run('selectRoomObject("cat")');assert.equal(a.run('HiddenObjectGame.hint(MARIUS_ROOM,AppState.roomABC)'),'letterA');
assert.equal(a.run('JSON.stringify(AppState.stats)'),beforeStats);
// Either order works; repeated clicks cannot count twice or become mistakes.
a.run('selectRoomObject("apple")');assert.deepEqual(state(a).foundObjects,['apple']);
a.run('selectRoomObject("apple")');assert.deepEqual(state(a).foundObjects,['apple']);assert.equal(state(a).wrongAttempts,3);
let resumed=createContext({saved:saved(a)});resumed.run('begin()');assert.equal(phase(resumed),'room');assert.deepEqual(state(resumed),state(a));
resumed.run('selectRoomObject("letterA")');assert.equal(resumed.run('HiddenObjectGame.roundComplete(MARIUS_ROOM,AppState.roomABC)'),true);
const roundReady=createContext({saved:saved(resumed)});roundReady.run('begin()');assert.deepEqual(state(roundReady).foundObjects,['apple','letterA']);
roundReady.run('nextRoomRound();nextRoomRound()');assert.equal(state(roundReady).currentRound,1);assert.deepEqual(state(roundReady).foundObjects,[]);assert.equal(state(roundReady).wrongAttempts,0);
roundReady.run('selectRoomObject("letterB");selectRoomObject("ball");nextRoomRound();selectRoomObject("cat")');
resumed=createContext({saved:saved(roundReady)});resumed.run('begin()');assert.equal(state(resumed).currentRound,2);assert.deepEqual(state(resumed).foundObjects,['cat']);
resumed.run('selectRoomObject("letterC");selectRoomObject("letterC")');assert.equal(state(resumed).gameCompleted,true);
assert.ok(resumed.nodes.get('#main').innerHTML.includes('Отличная работа!'));
assert.equal(resumed.run('JSON.stringify(AppState.stats)'),beforeStats);assert.equal(resumed.run('AppState.questionSerial'),beforeSerial);
assert.equal(resumed.run('AppState.completedBlocks.length'),0);
const finished=createContext({saved:saved(resumed)});finished.run('begin()');assert.equal(phase(finished),'room');assert.equal(state(finished).gameCompleted,true);
finished.run('continueAfterRoom();continueAfterRoom()');assert.equal(phase(finished),'miniIntro');
finished.run('startGame(false)');assert.equal(phase(finished),'mini');assert.equal(finished.run('AppState.game.types.length'),5);
for(let i=0;i<5;i++)finished.run('ensureQuestion();completeQuestion();go("course")');
assert.equal(finished.run('view'),'reward');assert.equal(finished.run('AppState.rewardFlow.id'),'reward_abc');
// Replay only the room, preserving the learned letters and all other progress.
resumed.run('replayRoom()');assert.deepEqual(state(resumed),{currentRound:0,foundObjects:[],wrongAttempts:0,gameCompleted:false});assert.equal(resumed.run('JSON.stringify(AppState.stats)'),beforeStats);
finishRoom(resumed);resumed.run('continueAfterRoom();replayRoom()');assert.equal(phase(resumed),'room');assert.equal(state(resumed).gameCompleted,false);
// Before an old ABC test: insert room. Mid-test or later: retain the exact lesson.
const legacy=JSON.parse(a.store.get('alfie-abc-v1'));delete legacy.roomABC;legacy.cursor={phase:'miniIntro',index:2,step:4};
const oldStart=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});oldStart.run('begin()');assert.equal(phase(oldStart),'room');
legacy.cursor={phase:'lesson',index:3,step:1};const oldLater=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});oldLater.run('begin()');assert.equal(phase(oldLater),'lesson');assert.equal(oldLater.run('AppState.cursor.index'),3);assert.equal(oldLater.run('AppState.cursor.step'),1);
legacy.cursor={phase:'mini',index:2,step:4};legacy.game={index:2,types:['find','letterPicture','pictureLetter','wordPicture','find'],recent:['A','B']};
const oldMid=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});oldMid.run('begin()');assert.equal(phase(oldMid),'mini');assert.equal(oldMid.run('AppState.game.index'),2);
// Corrupt or duplicated fields cannot claim completion or introduce foreign targets.
const corrupt=a.run('JSON.stringify(HiddenObjectGame.restore(MARIUS_ROOM,{currentRound:42,foundObjects:["apple","apple","ball"],wrongAttempts:-2,gameCompleted:true}))');
assert.deepEqual(JSON.parse(corrupt),{currentRound:0,foundObjects:['apple'],wrongAttempts:0,gameCompleted:false});
const blocked=createContext({blocked:true});reachRoom(blocked);finishRoom(blocked);assert.equal(state(blocked).gameCompleted,true);
resumed.run('toggleSound();resetProgress()');assert.equal(resumed.run('AppState.soundEnabled'),false);assert.deepEqual(state(resumed),{currentRound:0,foundObjects:[],wrongAttempts:0,gameCompleted:false});
// Loading/error states prevent blind play and allow retry without losing progress.
const imageTest=createContext();reachRoom(imageTest);
imageTest.run('roomPick("apple")');assert.deepEqual(state(imageTest).foundObjects,[]);
imageTest.run("$('#room-image').dataset.roomReady='true';roomPick('apple');roomPick('apple')");assert.deepEqual(state(imageTest).foundObjects,['apple']);
imageTest.run("$('#room-image').complete=true;$('#room-image').naturalWidth=0;wireRoomScene()");assert.equal(imageTest.nodes.get('#room-load-error').hidden,false);
imageTest.run("$('#room-image').naturalWidth=1122;wireRoomScene()");assert.equal(imageTest.nodes.get('#room-load-error').hidden,true);assert.deepEqual(state(imageTest).foundObjects,['apple']);
// A single percentage config keeps expanded targets inside the scene and disjoint.
const hotspots=JSON.parse(a.run('JSON.stringify(ROOM_HOTSPOTS)'));
const viewports=[[1440,900],[1024,768],[768,1024],[390,844],[360,800],[844,390],[320,740],[280,640]];
for(const [width,height] of viewports){
 const padding=width<=350?28:width<=650?40:60;
 const available=Math.min(width,1020)-padding;
 const sceneWidth=width>=701&&height>=650?Math.max(Math.min(available,360),Math.min(available,560,.76*height*1122/1402)):Math.min(available,560);
 const sceneHeight=sceneWidth*1402/1122;const min=width<=300?40:44;
 const rects=Object.entries(hotspots).map(([id,h])=>{
  const w=Math.max(min,h.width/100*sceneWidth),hgt=Math.max(min,h.height/100*sceneHeight);
  return {id,x:(h.x+h.width/2)/100*sceneWidth-w/2,y:(h.y+h.height/2)/100*sceneHeight-hgt/2,w,h:hgt};
 });
 for(const p of rects){
  assert.ok(p.x>=0&&p.y>=0&&p.x+p.w<=sceneWidth&&p.y+p.h<=sceneHeight,`${width}: ${p.id} outside image`);
  for(const q of rects)if(p.id!==q.id)assert.ok(!(p.x<q.x+q.w&&p.x+p.w>q.x&&p.y<q.y+q.h&&p.y+p.h>q.y),`${width}: ${p.id}/${q.id} overlap`);
 }
 assert.ok(sceneWidth<=available);
}
console.log(JSON.stringify({passed:true,rounds:3,hotspots:6,duplicateClicks:true,hints:true,reloadPartialAndComplete:true,replay:true,legacyProgress:true,noScorePenalty:true,originalFiveQuestionTest:true,rewardAfterTest:true,reset:true,imageFailure:true,storageFailure:true,geometryViewports:viewports},null,2));
