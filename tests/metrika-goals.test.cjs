const assert=require('node:assert/strict');
const {createContext}=require('./support/trainer-harness.cjs');

const learning=createContext();
learning.run('window.metricCalls=[];window._tmr=[];window.ym=(...args)=>window.metricCalls.push(args)');
assert.equal(learning.run('window.metricCalls.length'),0,'opening /play must not emit start_learning');
assert.equal(learning.run('window._tmr.length'),0,'opening /play must not emit startLearning');
learning.run('begin()');
assert.equal(learning.run('view'),'course');
assert.equal(learning.run('window.metricCalls.length'),1);
assert.equal(learning.run('JSON.stringify(window.metricCalls[0])'),JSON.stringify([113436900,'reachGoal','start_learning']));
assert.equal(learning.run('JSON.stringify(window._tmr)'),JSON.stringify([{id:3799663,type:'reachGoal',goal:'startLearning'}]));
learning.run("go('course');showScreen()");
assert.equal(learning.run('window.metricCalls.length'),1,'screen transitions must not repeat start_learning');
assert.equal(learning.run('window._tmr.length'),1,'screen transitions must not repeat startLearning');

const training=createContext();
training.run('window.metricCalls=[];window._tmr=[];window.ym=(...args)=>window.metricCalls.push(args)');
training.run("for(const letter of ['A','B','C']){AppState.stats[letter].skills=[...CORE_TYPES];AppState.stats[letter].mastery=3}");
assert.equal(training.run('startTraining(false)'),true);
assert.equal(training.run('view'),'training');
assert.equal(training.run('JSON.stringify(window.metricCalls)'),JSON.stringify([[113436900,'reachGoal','start_training']]));
assert.equal(training.run('JSON.stringify(window._tmr)'),JSON.stringify([{id:3799663,type:'reachGoal',goal:'startTraining'}]));

const completion=createContext();
completion.run('window.metricCalls=[];window._tmr=[];window.ym=(...args)=>window.metricCalls.push(args)');
completion.run("AppState.started=true;AppState.cursor={phase:'lesson',index:0,step:lessonSteps(letters[0]).length-1};AppState.stats.A.skills=['find','letterPicture'];AppState.stats.A.mastery=2;AppState.question={type:'pictureLetter',letter:'A',options:['A','B','C'],hadMistake:false,serial:0}");
completion.run('completeQuestion()');
assert.equal(completion.run('AppState.cursor.phase'),'letterReward');
assert.equal(completion.run('AppState.stats.A.mastery'),3);
assert.equal(completion.run('JSON.stringify(window.metricCalls)'),JSON.stringify([[113436900,'reachGoal','complete_letter',{letter:'A'}]]));
assert.equal(completion.run('JSON.stringify(window._tmr)'),JSON.stringify([{id:3799663,type:'reachGoal',goal:'completeLetter'}]));
completion.run("AppState.cursor.phase='mini';AppState.game={recent:[],index:0};AppState.question={type:'find',letter:'A',options:['A','B','C'],hadMistake:false,serial:1};completeQuestion()");
assert.equal(completion.run('window.metricCalls.length'),1,'mastered letter must not emit complete_letter twice');
assert.equal(completion.run('window._tmr.length'),1,'mastered letter must not emit completeLetter twice');

const blocked=createContext();
blocked.run("window.ym=()=>{throw Error('blocked')};window._tmr={push(){throw Error('blocked')}}");
assert.doesNotThrow(()=>blocked.run('begin()'));
assert.equal(blocked.run('view'),'course');
blocked.run("for(const letter of ['A','B','C']){AppState.stats[letter].skills=[...CORE_TYPES];AppState.stats[letter].mastery=3}");
assert.doesNotThrow(()=>blocked.run('startTraining(false)'));
assert.equal(blocked.run('view'),'training');
blocked.run("AppState.cursor={phase:'lesson',index:1,step:lessonSteps(letters[1]).length-1};AppState.stats.B.skills=['find','letterPicture'];AppState.stats.B.mastery=2;AppState.question={type:'pictureLetter',letter:'B',options:['A','B','C'],hadMistake:false,serial:0}");
assert.doesNotThrow(()=>blocked.run('completeQuestion()'));
assert.equal(blocked.run('AppState.stats.B.mastery'),3);
assert.equal(blocked.run('AppState.cursor.phase'),'letterReward');

const unavailable=createContext();
assert.equal(unavailable.run("sendMetrikaGoal('start_learning')"),false);
assert.equal(unavailable.run("sendVkGoal('startLearning')"),true);
assert.equal(unavailable.run('JSON.stringify(window._tmr)'),JSON.stringify([{id:3799663,type:'reachGoal',goal:'startLearning'}]));
assert.doesNotThrow(()=>unavailable.run('begin()'));
assert.equal(unavailable.run('view'),'course');

console.log(JSON.stringify({
  passed:true,
  metrikaGoals:['start_learning','start_training','complete_letter'],
  vkGoals:['startLearning','startTraining','completeLetter'],
  completeLetterPayload:{letter:'A'},
  vkCompleteLetterHasNoPayload:true,
  duplicateCompletionGuard:true,
  blockedMetrikaSafe:true,
  blockedVkSafe:true,
  unavailableMetrikaSafe:true
},null,2));
