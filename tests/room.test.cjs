const assert=require('node:assert/strict');
const {createContext,saved}=require('./support/trainer-harness.cjs');
const state=a=>JSON.parse(a.run('JSON.stringify(findObjectState(ABC_FIND_OBJECT_GAME))'));
const phase=a=>a.run('AppState.cursor.phase');
function reachRoom(a){
 a.run('begin()');
 for(let letter=0;letter<3;letter++){
  assert.equal(a.run('AppState.cursor.index'),letter);
  a.run('nextLessonStep();nextLessonStep();nextLessonStep();ensureQuestion();completeQuestion();go("course")');
  for(let question=0;question<3;question++)a.run('ensureQuestion();completeQuestion();go("course")');
  assert.equal(phase(a),'letterReward');a.run('advanceAfterLetter()');
 }
 assert.equal(phase(a),'room');
}
function finishRoom(a){
 for(let round=state(a).currentRound;round<3;round++){
  a.run('for(const id of HiddenObjectGame.currentRound(ABC_FIND_OBJECT_GAME,findObjectState()).targets)selectFindObject(id,ABC_FIND_OBJECT_GAME.id)');
  if(round<2)a.run('nextFindObjectRound(ABC_FIND_OBJECT_GAME.id)');
 }
 assert.equal(state(a).gameCompleted,true);
}
const a=createContext();reachRoom(a);
const beforeStats=a.run('JSON.stringify(AppState.stats)'),beforeSerial=a.run('AppState.questionSerial');
assert.equal(a.run('AppState.completedBlocks.length'),0);
a.run('continueFindObjectGame(ABC_FIND_OBJECT_GAME.id);nextFindObjectRound(ABC_FIND_OBJECT_GAME.id)');assert.equal(phase(a),'room');assert.equal(state(a).currentRound,0);
// All six true buttons are rendered once, with readable labels and percentage boxes.
const html=a.nodes.get('#main').innerHTML;
assert.equal((html.match(/class="find-object-hotspot"/g)||[]).length,6);
assert.equal((html.match(/id="find-object-image"/g)||[]).length,1);
for(const label of ['Letter A','Letter B','Letter C','Apple','Soccer ball','Cat'])assert.ok(html.includes(`aria-label="${label}"`));
// Wrong object and background taps never penalise stats. Hint starts only at 3.
a.run('selectFindObject("letterB",ABC_FIND_OBJECT_GAME.id);selectFindObject(null,ABC_FIND_OBJECT_GAME.id)');assert.equal(a.run('HiddenObjectGame.hint(ABC_FIND_OBJECT_GAME,findObjectState())'),null);
a.run('selectFindObject("cat",ABC_FIND_OBJECT_GAME.id)');assert.equal(a.run('HiddenObjectGame.hint(ABC_FIND_OBJECT_GAME,findObjectState())'),'letterA');
assert.equal(a.run('JSON.stringify(AppState.stats)'),beforeStats);
// Either order works; repeated clicks cannot count twice or become mistakes.
a.run('selectFindObject("apple",ABC_FIND_OBJECT_GAME.id)');assert.deepEqual(state(a).foundObjects,['apple']);
a.run('selectFindObject("apple",ABC_FIND_OBJECT_GAME.id)');assert.deepEqual(state(a).foundObjects,['apple']);assert.equal(state(a).wrongAttempts,3);
let resumed=createContext({saved:saved(a)});resumed.run('begin()');assert.equal(phase(resumed),'room');assert.deepEqual(state(resumed),state(a));
resumed.run('selectFindObject("letterA",ABC_FIND_OBJECT_GAME.id)');assert.equal(resumed.run('HiddenObjectGame.roundComplete(ABC_FIND_OBJECT_GAME,findObjectState())'),true);
const roundReady=createContext({saved:saved(resumed)});roundReady.run('begin()');assert.deepEqual(state(roundReady).foundObjects,['apple','letterA']);
roundReady.run('nextFindObjectRound(ABC_FIND_OBJECT_GAME.id);nextFindObjectRound(ABC_FIND_OBJECT_GAME.id)');assert.equal(state(roundReady).currentRound,1);assert.deepEqual(state(roundReady).foundObjects,[]);assert.equal(state(roundReady).wrongAttempts,0);
roundReady.run('selectFindObject("letterB",ABC_FIND_OBJECT_GAME.id);selectFindObject("ball",ABC_FIND_OBJECT_GAME.id);nextFindObjectRound(ABC_FIND_OBJECT_GAME.id);selectFindObject("cat",ABC_FIND_OBJECT_GAME.id)');
resumed=createContext({saved:saved(roundReady)});resumed.run('begin()');assert.equal(state(resumed).currentRound,2);assert.deepEqual(state(resumed).foundObjects,['cat']);
resumed.run('selectFindObject("letterC",ABC_FIND_OBJECT_GAME.id);selectFindObject("letterC",ABC_FIND_OBJECT_GAME.id)');assert.equal(state(resumed).gameCompleted,true);
assert.ok(resumed.nodes.get('#main').innerHTML.includes('Отличная работа!'));
assert.equal(resumed.run('JSON.stringify(AppState.stats)'),beforeStats);assert.equal(resumed.run('AppState.questionSerial'),beforeSerial);
assert.equal(resumed.run('AppState.completedBlocks.length'),0);
const finished=createContext({saved:saved(resumed)});finished.run('begin()');assert.equal(phase(finished),'room');assert.equal(state(finished).gameCompleted,true);
finished.run('continueFindObjectGame(ABC_FIND_OBJECT_GAME.id);continueFindObjectGame(ABC_FIND_OBJECT_GAME.id)');assert.equal(phase(finished),'miniIntro');
finished.run('startGame(false)');assert.equal(phase(finished),'mini');assert.equal(finished.run('AppState.game.types.length'),5);
for(let i=0;i<5;i++)finished.run('ensureQuestion();completeQuestion();go("course")');
assert.equal(finished.run('view'),'reward');assert.equal(finished.run('AppState.rewardFlow.id'),'reward_abc');
// Replay only the room, preserving the learned letters and all other progress.
resumed.run('replayFindObjectGame(ABC_FIND_OBJECT_GAME.id)');assert.deepEqual(state(resumed),{gameId:'marius-room-abc',currentRound:0,foundObjects:[],wrongAttempts:0,gameCompleted:false});assert.equal(resumed.run('JSON.stringify(AppState.stats)'),beforeStats);
finishRoom(resumed);resumed.run('continueFindObjectGame(ABC_FIND_OBJECT_GAME.id);replayFindObjectGame(ABC_FIND_OBJECT_GAME.id)');assert.equal(phase(resumed),'room');assert.equal(state(resumed).gameCompleted,false);
// Before an old ABC test: insert room. Mid-test or later: retain the exact lesson.
const legacy=JSON.parse(a.store.get('alfie-abc-v1'));delete legacy.findObjectGames;delete legacy.roomABC;legacy.cursor={phase:'miniIntro',index:2,step:4};
const oldStart=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});oldStart.run('begin()');assert.equal(phase(oldStart),'room');
const legacyRoom={...legacy,cursor:{phase:'room',index:2,step:4},roomABC:{currentRound:1,foundObjects:['letterB'],wrongAttempts:1,gameCompleted:false}};
const oldRoom=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacyRoom)}});oldRoom.run('begin()');assert.deepEqual(state(oldRoom),{gameId:'marius-room-abc',currentRound:1,foundObjects:['letterB'],wrongAttempts:1,gameCompleted:false});
legacy.cursor={phase:'lesson',index:3,step:1};const oldLater=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});oldLater.run('begin()');assert.equal(phase(oldLater),'lesson');assert.equal(oldLater.run('AppState.cursor.index'),3);assert.equal(oldLater.run('AppState.cursor.step'),1);
legacy.cursor={phase:'mini',index:2,step:4};legacy.game={index:2,types:['find','letterPicture','pictureLetter','wordPicture','find'],recent:['A','B']};
const oldMid=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});oldMid.run('begin()');assert.equal(phase(oldMid),'mini');assert.equal(oldMid.run('AppState.game.index'),2);
// Corrupt or duplicated fields cannot claim completion or introduce foreign targets.
const corrupt=a.run('JSON.stringify(HiddenObjectGame.restore(ABC_FIND_OBJECT_GAME,{currentRound:42,foundObjects:["apple","apple","ball"],wrongAttempts:-2,gameCompleted:true}))');
assert.deepEqual(JSON.parse(corrupt),{gameId:'marius-room-abc',currentRound:0,foundObjects:['apple'],wrongAttempts:0,gameCompleted:false});
const blocked=createContext({blocked:true});reachRoom(blocked);finishRoom(blocked);assert.equal(state(blocked).gameCompleted,true);
resumed.run('toggleSound();resetProgress()');assert.equal(resumed.run('AppState.soundEnabled'),false);assert.deepEqual(state(resumed),{gameId:'marius-room-abc',currentRound:0,foundObjects:[],wrongAttempts:0,gameCompleted:false});
// Loading/error states prevent blind play and allow retry without losing progress.
const imageTest=createContext();reachRoom(imageTest);
imageTest.run('findObjectPick("apple",ABC_FIND_OBJECT_GAME.id)');assert.deepEqual(state(imageTest).foundObjects,[]);
imageTest.run("$('#find-object-image').dataset.findObjectReady='true';findObjectPick('apple',ABC_FIND_OBJECT_GAME.id);findObjectPick('apple',ABC_FIND_OBJECT_GAME.id)");assert.deepEqual(state(imageTest).foundObjects,['apple']);
imageTest.run("$('#find-object-image').complete=true;$('#find-object-image').naturalWidth=0;wireFindObjectScene()");assert.equal(imageTest.nodes.get('#find-object-load-error').hidden,false);
imageTest.run("$('#find-object-image').naturalWidth=1122;wireFindObjectScene()");assert.equal(imageTest.nodes.get('#find-object-load-error').hidden,true);assert.deepEqual(state(imageTest).foundObjects,['apple']);
// A single percentage config keeps expanded targets inside the scene and disjoint.
const hotspots=JSON.parse(a.run('JSON.stringify(Object.fromEntries(ABC_FIND_OBJECT_GAME.objects.map(object=>[object.id,object.hotspot])))'));
const image=JSON.parse(a.run('JSON.stringify(ABC_FIND_OBJECT_GAME.image)'));
const viewports=[[1440,900],[1024,768],[768,1024],[390,844],[360,800],[844,390],[320,740],[280,640]];
for(const [width,height] of viewports){
 const padding=width<=350?28:width<=650?40:60;
 const available=Math.min(width,1020)-padding;
 const sceneWidth=width>=701&&height>=650?Math.max(Math.min(available,360),Math.min(available,560,.76*height*image.width/image.height)):Math.min(available,560);
 const sceneHeight=sceneWidth*image.height/image.width;const min=width<=300?40:44;
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
