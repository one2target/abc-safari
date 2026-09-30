const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createContext}=require('./support/trainer-harness.cjs');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'play/index.html'),'utf8');

function waitingMarkup(app){
 const html=app.nodes.get('#main').innerHTML;
 assert.match(html,/data-lesson-continue/);
 assert.match(html,/data-audio-state="waitingForAudio"/);
 assert.match(html,/aria-disabled="true" disabled/);
 assert.match(html,/data-action="repeat"/);
 assert.match(html,/👂/);
 assert.match(html,/>Слушай</);
 assert.doesNotMatch(html,/>ЖМИ!</);
 assert.doesNotMatch(html,/>NEXT</);
 assert.doesNotMatch(html,/>LET'S PLAY</);
}

function readyButton(app){
 assert.equal(app.run('lessonCardAudioState.status'),'readyToContinue');
 const button=app.nodes.get('[data-lesson-continue]');
 assert.equal(button.disabled,false);
 assert.equal(button.dataset.audioState,'readyToContinue');
 assert.match(button.innerHTML,/☝️/);
 assert.match(button.innerHTML,/>ЖМИ!</);
}

async function finishCard(app,duration){
 await app.tick(duration-1);
 assert.equal(app.run('lessonCardAudioState.status'),'waitingForAudio');
 assert.equal(app.run('nextLessonStep()'),false);
 await app.tick(1);
 readyButton(app);
}

(async()=>{
 const app=createContext();
 app.run('begin()');
 waitingMarkup(app);
 assert.equal(app.run('currentLessonStep().id'),'letter');
 assert.equal(app.run('lessonCardAudioState.status'),'waitingForAudio');
 assert.equal(app.run('nextLessonStep()'),false);
 assert.equal(app.run('AppState.cursor.step'),0);
 await finishCard(app,1500);

 assert.equal(app.run('nextLessonStep()'),true);
 assert.equal(app.run('currentLessonStep().id'),'word');
 waitingMarkup(app);
 await finishCard(app,1000);

 const playedBeforeRepeat=app.played.length;
 app.run('repeatInstruction()');
 assert.equal(app.run('lessonCardAudioState.status'),'readyToContinue');
 assert.equal(app.run('nextLessonStep()'),true);
 assert.equal(app.run('currentLessonStep().id'),'wordMeaning');
 assert.ok(app.played.length>playedBeforeRepeat);
 waitingMarkup(app);
 await finishCard(app,500);
 assert.equal(app.run('nextLessonStep()'),true);
 assert.equal(app.run('currentLessonStep().type'),'translationPicture');
 assert.doesNotMatch(app.nodes.get('#main').innerHTML,/data-lesson-continue/);
 let lessonQuestions=0;
 while(app.run('AppState.cursor.phase')==='lesson'){
  app.run('ensureQuestion();completeQuestion();go("course")');
  lessonQuestions++;
 }
 assert.equal(lessonQuestions,4);
 assert.equal(app.run('AppState.cursor.phase'),'letterReward');

 const repeatedWhileWaiting=createContext();
 repeatedWhileWaiting.run('begin()');
 await finishCard(repeatedWhileWaiting,1500);
 repeatedWhileWaiting.run('nextLessonStep()');
 await repeatedWhileWaiting.tick(200);
 repeatedWhileWaiting.run('repeatInstruction()');
 await repeatedWhileWaiting.micro();
 assert.equal(repeatedWhileWaiting.run('lessonCardAudioState.status'),'waitingForAudio');
 await repeatedWhileWaiting.tick(999);
 assert.equal(repeatedWhileWaiting.run('lessonCardAudioState.status'),'waitingForAudio');
 await repeatedWhileWaiting.tick(1);
 readyButton(repeatedWhileWaiting);

 for(const index of [1,12,25]){
  app.run(`AppState.cursor={phase:'lesson',index:${index},step:0};go('course')`);
  const wordDuration=index>=6?500:1000;
  for(const [id,duration] of [['letter',1500],['word',wordDuration],['wordMeaning',500]]){
   assert.equal(app.run('currentLessonStep().id'),id);
   waitingMarkup(app);
   assert.equal(app.run('nextLessonStep()'),false);
   await finishCard(app,duration);
   assert.equal(app.run('nextLessonStep()'),true);
  }
  assert.equal(app.run('currentLessonStep().type'),'translationPicture');
 }

 const muted=createContext();
 muted.run('toggleSound();begin()');
 assert.equal(muted.run('AppState.soundEnabled'),false);
 for(const id of ['letter','word','wordMeaning']){
  assert.equal(muted.run('currentLessonStep().id'),id);
  readyButton(muted);
  assert.equal(muted.run('nextLessonStep()'),true);
 }

 const interrupted=createContext();
 interrupted.run('begin();toggleSound()');
 await interrupted.micro();
 assert.equal(interrupted.run('AppState.soundEnabled'),false);
 assert.equal(interrupted.run('lessonCardAudioState.status'),'readyToContinue');
 assert.equal(interrupted.run('nextLessonStep()'),true);

 const reset=createContext();
 reset.run('begin()');
 await finishCard(reset,1500);
 reset.run('resetProgress();begin()');
 waitingMarkup(reset);
 assert.equal(reset.run('lessonCardAudioState.status'),'waitingForAudio');

 assert.match(source,/lesson-continue-activate \.42s/);
 assert.match(source,/transform:scale\(1\.07\)/);
 assert.match(source,/lesson-continue-ring \.65s/);
 assert.match(source,/lesson-continue-pulse 2\.6s/);
 assert.match(source,/transform:scale\(1\.025\)/);
 assert.match(source,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(source,/@media\(max-width:650px\)[\s\S]*?\.lesson-actions \.primary \{\s*width:100%/);

 console.log(JSON.stringify({
  passed:true,
  cardTypes:['letter','word','wordMeaning'],
  initialState:'waitingForAudio',
  blockedUntilSequenceEnds:true,
  completionSource:'AudioManager promise',
  readyState:'readyToContinue',
  resetsForEveryCard:true,
  fullLessonA:true,
  restartWaitsForLatestSequence:true,
  repeatDoesNotRelock:true,
  navigationAfterReady:true,
  representativeLetters:['A','B','M','Z'],
  muteDoesNotBlock:true,
  resetRestoresWaiting:true,
  activationScale:1.07,
  idlePulseScale:1.025,
  pulseIntervalSeconds:2.6,
  mobileFullWidthTouchTarget:true,
  reducedMotion:true
 },null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
