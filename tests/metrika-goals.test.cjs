const assert=require('node:assert/strict');
const {createContext}=require('./support/trainer-harness.cjs');

const events=app=>app.analyticsEvents.map(item=>item.event);

const learning=createContext();
assert.deepEqual(events(learning),[],'opening /play must not emit funnel events');
learning.run('begin()');
assert.equal(learning.run('view'),'course');
assert.deepEqual(events(learning),['start_learning','letter_started']);
assert.equal(JSON.stringify(learning.analyticsEvents[1].params),JSON.stringify({letter:'A'}));
learning.run("go('course');showScreen()");
assert.deepEqual(events(learning),['start_learning','letter_started'],'screen transitions must not repeat starts');

const training=createContext();
training.run("for(const letter of ['A','B','C']){AppState.stats[letter].skills=[...CORE_TYPES];AppState.stats[letter].mastery=3}");
assert.equal(training.run('startTraining(false)'),true);
assert.equal(training.run('view'),'training');
assert.deepEqual(events(training),['start_training','training_started']);

const completion=createContext();
completion.run("AppState.started=true;AppState.cursor={phase:'lesson',index:0,step:lessonSteps(letters[0]).length-1};AppState.stats.A.skills=['find','letterPicture'];AppState.stats.A.mastery=2;AppState.question={type:'pictureLetter',letter:'A',options:['A','B','C'],hadMistake:false,serial:0}");
completion.run('completeQuestion()');
assert.equal(completion.run('AppState.cursor.phase'),'letterReward');
assert.equal(completion.run('AppState.stats.A.mastery'),3);
assert.deepEqual(events(completion),['letter_completed','complete_letter']);
assert.equal(JSON.stringify(completion.analyticsEvents.map(item=>item.params)),JSON.stringify([{letter:'A'},{letter:'A'}]));
completion.run("AppState.cursor.phase='mini';AppState.game={recent:[],index:0};AppState.question={type:'find',letter:'A',options:['A','B','C'],hadMistake:false,serial:1};completeQuestion()");
assert.equal(events(completion).filter(event=>event==='letter_completed').length,1,'mastered letter must not emit twice');
assert.equal(events(completion).filter(event=>event==='complete_letter').length,1,'legacy complete_letter must not emit twice');

const unavailable=createContext();
unavailable.run('window.ABCAnalytics=undefined');
assert.doesNotThrow(()=>unavailable.run('begin()'));
assert.equal(unavailable.run('view'),'course');

console.log(JSON.stringify({
  passed:true,
  legacyEvents:['start_learning','start_training','complete_letter'],
  funnelEvents:['letter_started','letter_completed','training_started','training_completed'],
  completeLetterPayload:{letter:'A'},
  duplicateCompletionGuard:true,
  unavailableAnalyticsSafe:true
},null,2));
