const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const root=path.resolve(__dirname,'..');
const source=['training-config.js','training-state.js','training-engine.js'].map(file=>fs.readFileSync(path.join(root,'play',file),'utf8')).join('\n');
const context=vm.createContext({Date,Math});
vm.runInContext(`${source}\nthis.config=TRAINING_CONFIG;this.stateEngine=TrainingState;this.engine=TrainingEngine;`,context);
const config=context.config,TrainingState=context.stateEngine,engine=context.engine;
const seeded=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};

assert.equal(config.minCompletedLetters,3);
assert.equal(config.sessionLength,10);
assert.equal(config.hintAfterMistakes,2);
assert.equal(config.balloon.targetHits,4);
assert.equal(config.balloon.duration,20);
assert.equal(config.river.steps,4);
assert.equal(config.blitz.questions,5);

const pool='ABCDEFGHIJKL'.split(''),progress={};
const session=engine.createSession(pool,progress,config,seeded(42));
assert.equal(session.activities.length,10);
assert.equal(session.activities.filter(activity=>activity.kind==='balloon').length,1);
assert.equal(session.activities.filter(activity=>activity.kind==='river').length,1);
assert.equal(session.activities.filter(activity=>activity.kind==='blitz').length,1);
assert.equal(session.activities.filter(activity=>activity.kind==='quick').length,7);
assert.equal(session.activities.at(-1).kind,'blitz');
assert.equal(session.activities.find(activity=>activity.kind==='river').questions.length,4);
assert.equal(session.activities.at(-1).questions.length,5);

const targets=[],questions=[];
for(const activity of session.activities){
  if(activity.kind==='balloon')targets.push(activity.targetLetter);
  else for(const question of activity.questions){targets.push(question.letter);questions.push(question);}
}
assert.ok(new Set(targets).size>=Math.ceil(pool.length*config.coverageRatio));
for(let index=2;index<targets.length;index++)assert.equal(targets[index]===targets[index-1]&&targets[index]===targets[index-2],false);
for(const question of questions){
  assert.ok(question.options.includes(question.letter));
  assert.equal(new Set(question.options).size,question.options.length);
  assert.ok(question.options.every(letter=>pool.includes(letter)));
}
for(let index=1;index<questions.length;index++)assert.notEqual(questions[index].correctIndex,questions[index-1].correctIndex);

let generatedVariants=0;
for(const size of [3,6,12,17,26])for(let seed=1;seed<=50;seed++){
  const learned='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0,size).split(''),variant=engine.createSession(learned,{},config,seeded(seed));
  const slots=variant.activities.flatMap(activity=>activity.kind==='balloon'?[{letter:activity.targetLetter}]:(activity.questions||[]));
  const variantTargets=slots.map(item=>item.letter),variantQuestions=slots.filter(item=>item.options);
  assert.ok(new Set(variantTargets).size>=Math.ceil(size*config.coverageRatio));
  for(let index=2;index<variantTargets.length;index++)assert.equal(variantTargets[index]===variantTargets[index-1]&&variantTargets[index]===variantTargets[index-2],false);
  for(let index=0;index<variantQuestions.length;index++){
    const question=variantQuestions[index];assert.ok(question.options.every(letter=>learned.includes(letter)));
    if(index)assert.notEqual(question.correctIndex,variantQuestions[index-1].correctIndex);
  }
  generatedVariants++;
}

// The exact previous plan is rejected, even with a degenerate random source.
const first=engine.createSession(['A','B','C'],{},config,()=>0);
const second=engine.createSession(['A','B','C'],{},config,()=>0,first.signature);
assert.notEqual(second.signature,first.signature);

// One mistake schedules a same-skill return 2-4 main stages later.
const retrySession=engine.createSession(pool,{},config,seeded(7));
retrySession.activityIndex=0;
const retryQuestion=engine.currentQuestion(retrySession);
engine.noteMistake(retrySession,retryQuestion);
assert.equal(engine.scheduleRetry(retrySession,retryQuestion,{},config,seeded(5)),true);
let retryIndex=-1,retryCopy=null;
retrySession.activities.forEach((activity,index)=>activity.questions?.forEach(question=>{if(question.retryOf===retryQuestion.id){retryIndex=index;retryCopy=question;}}));
assert.ok(retryIndex>=3&&retryIndex<=5);
assert.equal(retryCopy.letter,retryQuestion.letter);
assert.equal(retryCopy.skill,retryQuestion.skill);
const retryPositions=retrySession.activities.flatMap(activity=>activity.questions||[]).map(question=>question.correctIndex);
for(let index=1;index<retryPositions.length;index++)assert.notEqual(retryPositions[index],retryPositions[index-1]);
const retryTargets=retrySession.activities.flatMap(activity=>activity.kind==='balloon'?[activity.targetLetter]:(activity.questions||[]).map(question=>question.letter));
for(let index=2;index<retryTargets.length;index++)assert.equal(retryTargets[index]===retryTargets[index-1]&&retryTargets[index]===retryTargets[index-2],false);

const immediate=engine.createSession(pool,{},config,seeded(19));
immediate.activityIndex=0;
const immediateQuestion=engine.currentQuestion(immediate);
immediate.activities[1].questions[0].letter=immediateQuestion.letter;
engine.scheduleRetry(immediate,immediateQuestion,{},config,seeded(21));
assert.notEqual(immediate.activities[1].questions[0].letter,immediateQuestion.letter);

// Mistake history raises future selection weight without removing randomness.
assert.ok(engine.letterWeight({A:{mistakes:8,word:{mistakes:4}}},'A',config)>engine.letterWeight({},'B',config));
const training=TrainingState.initialState();
TrainingState.recordAttempt(training,'A','sound',false,100);
TrainingState.recordAttempt(training,'A','sound',false,200);
TrainingState.recordAttempt(training,'A','sound',true,300);
assert.deepEqual(JSON.parse(JSON.stringify(training.progress.A)),{attempts:3,correct:1,mistakes:2,lastSeen:300,letterName:{attempts:0,mistakes:0},sound:{attempts:3,mistakes:2},word:{attempts:0,mistakes:0}});

// Integration: the home CTA uses the real mastery field and active sessions survive reload.
const app=createContext();
assert.ok(app.run('renderHome()').includes('disabled'));
app.run("for(const letter of ['A','B','C']){AppState.stats[letter].skills=[...CORE_TYPES];AppState.stats[letter].mastery=3}");
assert.equal(app.run('trainingUnlocked()'),true);
assert.equal(app.run('startTraining(false)'),true);
assert.equal(app.run('view'),'training');
assert.equal(app.run('trainingSession().pool.join("")'),'ABC');
assert.equal(app.run('trainingSession().activities.length'),10);
assert.equal(app.run('trainingSession().activities.flatMap(a=>a.questions||[]).every(q=>q.options.every(letter=>"ABC".includes(letter)))'),true);
const fourOptionMarkup=app.run(`renderTrainingQuestion({letter:'A',answerType:'letter',promptType:'name',type:'soundLetter',options:['C','A','D','B']})`);
assert.ok(fourOptionMarkup.includes('answers-grid answers-grid--4'));
assert.ok(fourOptionMarkup.includes('data-answer-count="4"'));
assert.ok(fourOptionMarkup.includes('training-question-content'));
assert.deepEqual(['C','A','D','B'].map(letter=>fourOptionMarkup.indexOf(`data-training-answer="${letter}"`)),['C','A','D','B'].map(letter=>fourOptionMarkup.indexOf(`data-training-answer="${letter}"`)).toSorted((a,b)=>a-b));
const threeOptionMarkup=app.run(`renderTrainingQuestion({letter:'A',answerType:'letter',promptType:'name',type:'soundLetter',options:['C','A','B']})`);
assert.ok(threeOptionMarkup.includes('answers-grid answers-grid--3'));
const twoOptionMarkup=app.run(`renderTrainingQuestion({letter:'A',answerType:'letter',promptType:'name',type:'soundLetter',options:['B','A']})`);
assert.ok(twoOptionMarkup.includes('answers-grid answers-grid--2'));
const trainingCSS=fs.readFileSync(path.join(root,'play','training.css'),'utf8');
assert.doesNotMatch(trainingCSS,/\.training-home-card \.training-button\{[^}]*(?:width|min-height|border-radius|padding)/);
const pageSource=fs.readFileSync(path.join(root,'play','index.html'),'utf8');
assert.match(pageSource,/\.training-question \.answers-grid\.answers-grid--4\s*\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\);[\s\S]*?\}/);
assert.match(pageSource,/@media\(max-width:520px\)[\s\S]*?\.answers-grid\.answers-grid--3 \.answer-card:last-child\s*\{\s*grid-column:2 \/ span 2;/);
assert.match(pageSource,/training\.css\?v=training-layout-v3/);
assert.doesNotMatch(trainingCSS,/river-answers\{[^}]*auto-(?:fit|fill)/);
assert.match(trainingCSS,/body\.training-active \.river-answers--4\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(pageSource,/\.home-actions \{[\s\S]*?width:min\(100%,330px\);[\s\S]*?\}/);
assert.match(pageSource,/\.home \.primary \{\s*width:100%;\s*\}/);
app.run('AppState.started=true');
const homeMarkup=app.run('renderHome()');
assert.ok(homeMarkup.includes('Продолжить'));
assert.ok(homeMarkup.includes('Начать заново'));
assert.ok(/<div class="home-actions">[\s\S]*<div class="training-home-card">/.test(homeMarkup));
const riverPositions=JSON.parse(app.run('(()=>{trainingSession().activityIndex=trainingSession().activities.findIndex(a=>a.kind==="river");const c=trainingRiverConfig();return JSON.stringify(c.questions.map(q=>q.options.indexOf(q.letter)))})()'));
for(let index=1;index<riverPositions.length;index++)assert.notEqual(riverPositions[index],riverPositions[index-1]);
app.run('trainingSession().activityIndex=0;saveProgress()');
const resumed=createContext({saved:saved(app)});
assert.equal(resumed.run('trainingSession().completed'),false);
assert.ok(resumed.run('renderHome()').includes('Продолжить тренировку'));

// Complete all activity adapters and verify the positive result/history record.
const demo=createContext({search:'?demo=1&screen=training'});
for(let guard=0;guard<100&&!demo.run('trainingSession().completed');guard++){
  const kind=demo.run('trainingActivity().kind');
  if(kind==='quick'||kind==='blitz')demo.run('recordTrainingAttempt(trainingQuestion(),true);finishTrainingQuestion()');
  else if(kind==='balloon')demo.run('(()=>{const c=activeBalloonConfig(),s=activeBalloonState();while(!s.gameCompleted){recordTrainingAttempt(trainingBalloonStatQuestion(),true);BalloonPopGame.tap(c,s,BalloonPopGame.target(c,s));}continueTrainingBalloonGame()})()');
  else if(kind==='river')demo.run('(()=>{const c=activeRiverConfig(),s=activeRiverState(),activity=trainingActivity();while(!s.gameCompleted){recordTrainingAttempt(activity.questions[s.questionIndex],true);RiverCrossingGame.answer(c,s,RiverCrossingGame.currentQuestion(c,s).letter);}continueTrainingRiverCrossing()})()');
}
assert.equal(demo.run('trainingSession().completed'),true);
assert.equal(demo.run('AppState.training.history.length'),1);
assert.ok(demo.run('trainingSession().seenLetters.length')>=Math.ceil(8*config.coverageRatio));
assert.ok(demo.run('renderTraining().includes("Тренировка закончена")'));
assert.ok(demo.run('renderTraining().includes("Ещё тренировку")'));
assert.ok(demo.run('renderTraining().includes("На главную")'));

console.log(JSON.stringify({
  passed:true,sessionLength:config.sessionLength,atomicPrompts:targets.length,coverage:new Set(targets).size,generatedVariants,
  learnedOnly:true,rotatingAnswerPosition:true,maxSameLetterInARow:config.maxSameLetterInARow,
  delayedRetry:[config.retryAfterMin,config.retryAfterMax],adaptiveWeights:true,persistentStats:true,
  balloonReuse:true,riverReuse:true,blitzQuestions:config.blitz.questions,positiveResults:true
},null,2));
