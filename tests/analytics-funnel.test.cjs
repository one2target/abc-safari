const assert=require('node:assert/strict');
const {createContext}=require('./support/trainer-harness.cjs');
const assertJSON=(actual,expected)=>assert.equal(JSON.stringify(actual),JSON.stringify(expected));

const maze=createContext();
maze.run("AppState.cursor={phase:'maze',index:5,step:lessonSteps(letters[5]).length-1};AppState.mazeGames[DEF_LETTER_MAZE.id]=LetterMazeGame.initialState(DEF_LETTER_MAZE);view='course';trackCourseAnalyticsEntry()");
assertJSON(maze.analyticsEvents,[{event:'activity_started',params:{activity:'maze_def'}}]);

maze.run(`
 const analyticsMazeState=letterMazeState(DEF_LETTER_MAZE);
 const analyticsMazeRound=LetterMazeGame.currentRound(DEF_LETTER_MAZE,analyticsMazeState);
 const analyticsWrongCell=Object.keys(analyticsMazeRound.checkpoints).find(id=>!LetterMazeGame.isCorrectCheckpoint(analyticsMazeRound,analyticsMazeRound.checkpoints[id]));
 selectLetterMazeCell(analyticsWrongCell,DEF_LETTER_MAZE.id);
 selectLetterMazeCell(analyticsWrongCell,DEF_LETTER_MAZE.id);
 selectLetterMazeCell(analyticsWrongCell,DEF_LETTER_MAZE.id);
`);
assert.equal(maze.run("analyticsActivityStats.get('maze_def').mistakes"),3);
assert.equal(maze.run("analyticsActivityStats.get('maze_def').hintsUsed"),true);

maze.run(`
 const analyticsMazeFinishState=letterMazeState(DEF_LETTER_MAZE);
 while(analyticsMazeFinishState.currentRound<DEF_LETTER_MAZE.rounds.length-1){
  while(!LetterMazeGame.roundComplete(DEF_LETTER_MAZE,analyticsMazeFinishState))LetterMazeGame.move(DEF_LETTER_MAZE,analyticsMazeFinishState,LetterMazeGame.nextCheckpointCell(DEF_LETTER_MAZE,analyticsMazeFinishState));
  LetterMazeGame.next(DEF_LETTER_MAZE,analyticsMazeFinishState);
 }
 const analyticsFinish=LetterMazeGame.layout(DEF_LETTER_MAZE,analyticsMazeFinishState).finishCell;
 while(LetterMazeGame.nextCheckpointCell(DEF_LETTER_MAZE,analyticsMazeFinishState)!==analyticsFinish)LetterMazeGame.move(DEF_LETTER_MAZE,analyticsMazeFinishState,LetterMazeGame.nextCheckpointCell(DEF_LETTER_MAZE,analyticsMazeFinishState));
 selectLetterMazeCell(analyticsFinish,DEF_LETTER_MAZE.id);
`);
assert.equal(maze.analyticsEvents.length,2);
assertJSON(maze.analyticsEvents[1],{event:'activity_completed',params:{activity:'maze_def',mistakes_bucket:'3_5',hints_used:true}});
maze.run("completeAnalyticsActivity('maze_def')");
assert.equal(maze.analyticsEvents.length,2,'activity completion must be idempotent');

const abandoned=createContext();
abandoned.run("AppState.cursor={phase:'room',index:2,step:0};view='course';trackCourseAnalyticsEntry()");
assertJSON(abandoned.analyticsEvents,[{event:'activity_started',params:{activity:'room_abc'}}]);
assert.equal(abandoned.analyticsEvents.some(item=>item.event==='activity_completed'),false,'leaving a started activity must not synthesize completion');

const reward=createContext();
reward.run("AppState.completedBlocks.push('reward_abc');AppState.rewardFlow={id:'reward_abc',resume:'after-mini',selected:null};chooseReward('jacket_stars')");
assertJSON(reward.analyticsEvents,[{event:'reward_received',params:{reward:'jacket_stars',source:'abc_check'}}]);
assert.equal(reward.run("chooseReward('jacket_racer')"),false);
assert.equal(reward.analyticsEvents.length,1,'a claimed reward must not emit twice');

console.log(JSON.stringify({
 passed:true,
 mazeStarted:true,
 mazeCompletedOnce:true,
 mazeMistakesBucket:'3_5',
 mazeHintsUsed:true,
 abandonedActivityHasNoCompletion:true,
 rewardReceivedOnce:true
},null,2));
