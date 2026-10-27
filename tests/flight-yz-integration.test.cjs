'use strict';

const assert=require('node:assert/strict');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const production=createContext();
assert.equal(production.run('AppState.version'),9);
assert.equal(production.run('AppState.flightYZ.version'),1);
assert.equal(production.run('AppState.flightYZ.permanent.completed'),false);
assert.equal(production.run("StudentDomain.ACHIEVEMENTS.some(item=>item.id==='alphabet_conqueror'&&item.title==='Покоритель алфавита')"),true);

production.run("AppState.started=true;AppState.cursor={phase:'cumulativeResult',index:25,step:0};AppState.game=null;AppState.question=null;advanceAfterReview()");
assert.deepEqual(JSON.parse(production.run('JSON.stringify(AppState.cursor)')),{phase:'flight_yz',index:25,step:0});
assert.equal(production.run('AppState.flightYZ.session'),null,'the production route must start a new YZ session');

production.run(`
 var integrationSession=FlightYZGame.LearningEngine.initialState(FlightYZGame.EDUCATION,()=>.999);
 FlightYZGame.LearningEngine.start(integrationSession);
 var integrationSequence=JSON.stringify(integrationSession.tasks);
 var integrationAssignment=JSON.stringify(integrationSession.assignment);
 var integrationIsland=Object.keys(integrationSession.assignment).find(id=>integrationSession.assignment[id]===integrationSession.target);
 FlightYZGame.LearningEngine.land(integrationSession,integrationIsland);
 saveFlightYZSession(integrationSession);
`);
const afterCorrect=createContext({saved:saved(production)});
assert.equal(afterCorrect.run('AppState.cursor.phase'),'flight_yz');
assert.equal(afterCorrect.run('AppState.flightYZ.session.status'),'playing');
assert.equal(afterCorrect.run('AppState.flightYZ.session.totalProgress'),1);
assert.equal(afterCorrect.run('AppState.flightYZ.session.taskIndex'),1);
assert.equal(afterCorrect.run('JSON.stringify(AppState.flightYZ.session.tasks)'),production.run('integrationSequence'),'the shuffled task sequence must survive reload');

const unfinished=createContext();
unfinished.run(`
 AppState.cursor={phase:'flight_yz',index:25,step:0};
 var unfinishedSession=FlightYZGame.LearningEngine.initialState(FlightYZGame.EDUCATION,()=>.999);
 FlightYZGame.LearningEngine.start(unfinishedSession);
 var unfinishedAssignment=JSON.stringify(unfinishedSession.assignment);
 saveFlightYZSession(unfinishedSession);
`);
const unfinishedReload=createContext({saved:saved(unfinished)});
assert.equal(unfinishedReload.run('AppState.flightYZ.session.totalProgress'),0);
assert.equal(unfinishedReload.run('JSON.stringify(AppState.flightYZ.session.assignment)'),unfinished.run('unfinishedAssignment'),'the current unfinished assignment must be restored');

const word=createContext();
word.run(`
 AppState.cursor={phase:'flight_yz',index:25,step:0};
 var wordSession=FlightYZGame.LearningEngine.initialState(FlightYZGame.EDUCATION,()=>.999);
 FlightYZGame.LearningEngine.start(wordSession);
 while(wordSession.stage!=='words'){
  var correct=Object.keys(wordSession.assignment).find(id=>wordSession.assignment[id]===wordSession.target);
  FlightYZGame.LearningEngine.land(wordSession,correct);
  FlightYZGame.LearningEngine.resolveLanding(wordSession,FlightYZGame.EDUCATION);
  var moved=FlightYZGame.LearningEngine.finishRespawn(wordSession,FlightYZGame.EDUCATION,()=>.999);
  if(moved.outcome==='stage-transition')FlightYZGame.LearningEngine.finishTransition(wordSession);
 }
 var wordIsland=Object.keys(wordSession.assignment).find(id=>wordSession.assignment[id]===wordSession.target);
 FlightYZGame.LearningEngine.land(wordSession,wordIsland);
 FlightYZGame.LearningEngine.resolveLanding(wordSession,FlightYZGame.EDUCATION);
 saveFlightYZSession(wordSession);
`);
const wordReload=createContext({saved:saved(word)});
assert.equal(wordReload.run('AppState.flightYZ.session.stage'),'words');
assert.equal(wordReload.run('AppState.flightYZ.session.totalProgress'),4,'an interrupted delivery must not increase progress');
assert.equal(wordReload.run('AppState.flightYZ.session.parcelState'),'attached');
assert.equal(wordReload.run('AppState.flightYZ.session.status'),'playing');

const finalStage=createContext();
finalStage.run(`
 AppState.cursor={phase:'flight_yz',index:25,step:0};
 var finalSession=FlightYZGame.LearningEngine.initialState(FlightYZGame.EDUCATION,()=>.999);
 FlightYZGame.LearningEngine.start(finalSession);
 FlightYZGame.LearningEngine.skipToFinalTask(finalSession,FlightYZGame.EDUCATION,()=>.999);
 saveFlightYZSession({...finalSession,taskIndex:1,stageProgress:1,totalProgress:9,journeyProgress:1,status:'playing',taskId:finalSession.tasks[1].id,taskType:finalSession.tasks[1].taskType,audioType:finalSession.tasks[1].audioType,answerMode:finalSession.tasks[1].answerMode,target:finalSession.tasks[1].target,assignment:{left:'Y',right:'Z'}});
`);
const finalReload=createContext({saved:saved(finalStage)});
assert.equal(finalReload.run('AppState.flightYZ.session.stage'),'finalExpedition');
assert.equal(finalReload.run('AppState.flightYZ.session.totalProgress'),9);
assert.equal(finalReload.run('AppState.flightYZ.session.journeyProgress'),1);
assert.equal(finalReload.run('AppState.flightYZ.session.taskIndex'),1);

const finalFlightCrash=createContext();
finalFlightCrash.run(`AppState.cursor={phase:'flight_yz',index:25,step:0};for(const stat of Object.values(AppState.stats)){stat.skills=[...CORE_TYPES];stat.mastery=3;}var crashSession=FlightYZGame.LearningEngine.initialState();FlightYZGame.LearningEngine.start(crashSession);FlightYZGame.LearningEngine.skipToFinalTask(crashSession);var crashIsland=Object.keys(crashSession.assignment).find(id=>crashSession.assignment[id]===crashSession.target);FlightYZGame.LearningEngine.land(crashSession,crashIsland);FlightYZGame.LearningEngine.resolveLanding(crashSession,FlightYZGame.EDUCATION);saveFlightYZSession(crashSession)`);
const finalFlightReload=createContext({saved:saved(finalFlightCrash)});
assert.equal(finalFlightReload.run('AppState.flightYZ.session.status'),'complete');
assert.equal(finalFlightReload.run('AppState.flightYZ.permanent.completed'),true);
assert.equal(finalFlightReload.run('AppState.completed'),true,'task 12 stays completed when the page closes during finalFlight');
assert.equal(finalFlightReload.run("AppState.student.starTransactions.filter(item=>item.sourceId===FlightYZGame.CONFIG.rewardSourceId).length"),1);
assert.equal(finalFlightReload.run("AppState.student.achievements.unlocked.filter(item=>item.id==='alphabet_conqueror').length"),1);

const completion=createContext();
completion.run(`
 AppState.cursor={phase:'flight_yz',index:25,step:0};
 var completedSession=FlightYZGame.LearningEngine.initialState(FlightYZGame.EDUCATION,()=>.999);
 FlightYZGame.LearningEngine.start(completedSession);
 FlightYZGame.LearningEngine.skipToFinalTask(completedSession,FlightYZGame.EDUCATION,()=>.999);
 var finalIsland=Object.keys(completedSession.assignment).find(id=>completedSession.assignment[id]===completedSession.target);
 FlightYZGame.LearningEngine.land(completedSession,finalIsland);
 completeFlightYZ(completedSession,12345);
`);
assert.equal(completion.run('AppState.flightYZ.permanent.completed'),true);
assert.equal(completion.run('AppState.flightYZ.permanent.completedAt'),12345);
assert.equal(completion.run('AppState.completed'),true);
assert.equal(completion.run("AppState.student.starTransactions.filter(item=>item.sourceId===FlightYZGame.CONFIG.rewardSourceId).length"),1);
assert.equal(completion.run("AppState.student.starTransactions.find(item=>item.sourceId===FlightYZGame.CONFIG.rewardSourceId).amount"),3);
assert.equal(completion.run("AppState.student.achievements.unlocked.filter(item=>item.id==='alphabet_conqueror').length"),1);
completion.run('completeFlightYZ(completedSession,23456);completeFlightYZ(completedSession,34567)');
assert.equal(completion.run("AppState.student.starTransactions.filter(item=>item.sourceId===FlightYZGame.CONFIG.rewardSourceId).length"),1,'completion stars must be idempotent');
assert.equal(completion.run("AppState.student.achievements.unlocked.filter(item=>item.id==='alphabet_conqueror').length"),1,'achievement must be idempotent');
completion.run('startFlightYZSession()');
assert.equal(completion.run('AppState.flightYZ.session'),null);
assert.equal(completion.run('AppState.flightYZ.permanent.completed'),true,'a replay resets only the session');
assert.equal(completion.run("AppState.student.starTransactions.filter(item=>item.sourceId===FlightYZGame.CONFIG.rewardSourceId).length"),1);

completion.run("AppState.cursor={phase:'flight_yz',index:25,step:0};exitFlightYZ()");
assert.equal(completion.run('AppState.cursor.phase'),'results','the existing results screen is the production destination after YZ');

const completedReload=createContext({saved:saved(completion)});
assert.equal(completedReload.run('AppState.flightYZ.permanent.completed'),true);
assert.equal(completedReload.run("AppState.student.achievements.unlocked.filter(item=>item.id==='alphabet_conqueror').length"),1);
assert.equal(completedReload.run("AppState.student.starTransactions.filter(item=>item.sourceId===FlightYZGame.CONFIG.rewardSourceId).length"),1);

const productionBeforeDemo=JSON.stringify(saved(completedReload)['alfie-abc-v1']);
const demo=createContext({saved:saved(completedReload),search:'?demo=1&screen=flight_yz&flightDebug=1'});
assert.equal(demo.run('AppState.cursor.phase'),'flight_yz');
assert.equal(demo.run('FLIGHT_YZ_DEBUG'),true);
demo.run(`var demoComplete=FlightYZGame.LearningEngine.initialState();FlightYZGame.LearningEngine.start(demoComplete);FlightYZGame.LearningEngine.skipToFinalTask(demoComplete);var demoIsland=Object.keys(demoComplete.assignment).find(id=>demoComplete.assignment[id]===demoComplete.target);FlightYZGame.LearningEngine.land(demoComplete,demoIsland);completeFlightYZ(demoComplete,99999)`);
assert.equal(JSON.stringify(demo.store.get('alfie-abc-v1')),productionBeforeDemo,'demo completion must not modify the production save');

const legacySource=createContext();
const legacy=JSON.parse(legacySource.run('JSON.stringify(AppState)'));
legacy.version=8;delete legacy.flightYZ;legacy.started=true;legacy.completed=true;legacy.cursor={phase:'results',index:25,step:0};
for(const stat of Object.values(legacy.stats)){stat.skills=['find','letterPicture','pictureLetter'];stat.mastery=3;stat.correct=3;stat.attempts=3;}
const migrated=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});
assert.equal(migrated.run('AppState.completed'),false);
assert.equal(migrated.run('AppState.cursor.phase'),'flight_yz','a pre-integration A–Z save must unlock the new final expedition');

console.log(JSON.stringify({
 passed:true,productionRoute:'cumulative_review_AZ -> flight_yz -> results',sessionRestore:true,
 wordRestore:true,finalExpeditionRestore:true,completionAtTask12:true,starsOnce:true,
 achievement:'alphabet_conqueror',achievementOnce:true,replayPreservesPermanent:true,
 demoIsolation:true,legacyMigration:true
},null,2));
