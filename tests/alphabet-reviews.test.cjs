const assert=require('node:assert/strict');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const expectedBlocks=[
 {id:'cumulative_review_AC',start:'A',end:'C',afterIndex:2,recent:['A','B','C'],thematicPhase:'room'},
 {id:'cumulative_review_AF',start:'A',end:'F',afterIndex:5,recent:['D','E','F'],thematicPhase:'maze'},
 {id:'cumulative_review_AI',start:'A',end:'I',afterIndex:8,recent:['G','H','I'],thematicPhase:'balloon_ghi'},
 {id:'cumulative_review_AL',start:'A',end:'L',afterIndex:11,recent:['J','K','L'],thematicPhase:'river_jkl'},
 {id:'cumulative_review_AO',start:'A',end:'O',afterIndex:14,recent:['M','N','O'],thematicPhase:'fruit_rain'},
 {id:'cumulative_review_AR',start:'A',end:'R',afterIndex:17,recent:['P','Q','R'],thematicPhase:'bubble_cannon'},
 {id:'cumulative_review_AU',start:'A',end:'U',afterIndex:20,recent:['S','T','U'],thematicPhase:'treehouse_stu'},
 {id:'cumulative_review_AX',start:'A',end:'X',afterIndex:23,recent:['V','W','X'],thematicPhase:'railway_vwx'},
 {id:'cumulative_review_AZ',start:'A',end:'Z',afterIndex:25,recent:['Y','Z'],thematicPhase:'flight_yz'}
];

const data=createContext();
assert.equal(data.run("letters.map(d=>d.letter).join('')"),'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
assert.equal(data.run('letters.length'),26);
assert.equal(data.run('MIN_REVIEW_LENGTH'),6);
assert.equal(data.run('REVIEW_ROUND_COUNT'),3);
assert.deepEqual(JSON.parse(data.run('JSON.stringify(REVIEW_TYPES)')),['find','soundLetter','pictureLetter','letterPicture','wordPicture','lowercase']);
assert.deepEqual(JSON.parse(data.run('JSON.stringify(CUMULATIVE_REVIEW_BLOCKS)')),expectedBlocks);
assert.equal(data.run('LEGACY_LOCAL_REVIEW_BLOCKS.length'),6);

const variants={};
for(const block of expectedBlocks){
 const orders=new Set();
 for(let trial=0;trial<80;trial++){
  data.run(`AppState.cursor={phase:'cumulativeIntro',index:${block.afterIndex},step:0};AppState.game=null;AppState.question=null;startReview(true)`);
  const game=JSON.parse(data.run('JSON.stringify(AppState.game)'));
  assert.equal(game.id,block.id);
  assert.equal(game.poolLetters[0],'A');
  assert.equal(game.poolLetters.at(-1),block.end);
  assert.equal(game.poolLetters.length,block.afterIndex+1);
  const expectedLength=Math.max(6,block.afterIndex+1);
  assert.equal(game.types.length,expectedLength);
  assert.equal(new Set(game.types).size,6);
  assert.equal(game.letterOrder.length,expectedLength);
  assert.equal(game.roundSizes.length,3);
  assert.equal(game.roundSizes.reduce((sum,size)=>sum+size,0),expectedLength);
  assert.ok(game.roundSizes.every(size=>size>=2));
  assert.ok(game.letterOrder.every(letter=>game.poolLetters.includes(letter)));
  assert.ok(game.poolLetters.every(letter=>game.letterOrder.includes(letter)),`${block.id} includes every learned letter`);
  for(let index=1;index<game.letterOrder.length;index++)assert.notEqual(game.letterOrder[index],game.letterOrder[index-1]);
  if(block.afterIndex===2){
   assert.equal(new Set(game.letterOrder).size,3);
   for(const letter of block.recent)assert.equal(game.letterOrder.filter(item=>item===letter).length,2);
  }else{
   assert.equal(new Set(game.letterOrder).size,block.afterIndex+1);
   assert.ok(game.letterOrder.some(letter=>!block.recent.includes(letter)),`${block.id} includes older material`);
  }
  const question=JSON.parse(data.run('JSON.stringify(ensureQuestion())'));
  assert.ok(game.poolLetters.includes(question.letter));
  assert.ok(question.options.every(letter=>game.poolLetters.includes(letter)));
  orders.add(game.letterOrder.join(''));
 }
 assert.ok(orders.size>1,`${block.id} should vary between runs`);
 variants[block.id]=orders.size;
}

// Every learned block enters its thematic game first. If that game's saved
// completion exists, the next resolved phase is its cumulative review.
const routes=createContext();
for(const block of expectedBlocks){
 routes.run(`AppState.cursor={phase:'letterReward',index:${block.afterIndex},step:0};AppState.question=null;advanceAfterLetter()`);
 assert.equal(routes.run('AppState.cursor.phase'),block.thematicPhase,`${block.id} thematic phase`);
}
for(const [index,setup] of [
 [2,"AppState.findObjectGames[ABC_FIND_OBJECT_GAME.id].gameCompleted=true"],
 [5,"AppState.mazeGames[DEF_LETTER_MAZE.id].gameCompleted=true"],
 [8,"AppState.balloonPop.gameCompleted=true"],
 [11,"AppState.riverCrossing.gameCompleted=true"],
 [14,"AppState.fruitRain.gameCompleted=true"],
 [17,"AppState.bubbleCannon.gameCompleted=true"],
 [20,"AppState.treehouse.gameCompleted=true"],
 [23,"AppState.railway.gameCompleted=true"],
 [25,"AppState.flightYZ.permanent.completed=true"]
]){
 routes.run(setup);
 assert.equal(routes.run(`phaseAfterLearnedBlock(AppState,${index})`),'cumulativeIntro');
}

for(const block of expectedBlocks){
 routes.run(`AppState.cursor={phase:'cumulativeResult',index:${block.afterIndex},step:0};AppState.game=null;AppState.question=null;advanceAfterReview()`);
 const cursor=JSON.parse(routes.run('JSON.stringify(AppState.cursor)'));
 if(block.afterIndex===25){assert.deepEqual(cursor,{phase:'results',index:25,step:0});assert.equal(routes.run('AppState.completed'),true);}
 else assert.deepEqual(cursor,{phase:'lesson',index:block.afterIndex+1,step:0});
}

const midReview=createContext();
midReview.run("AppState.started=true;AppState.cursor={phase:'cumulativeIntro',index:11,step:0};startReview(true);ensureQuestion();saveProgress()");
const restoredReview=createContext({saved:saved(midReview)});
assert.equal(restoredReview.run('AppState.cursor.phase'),'cumulative');
assert.equal(restoredReview.run('AppState.game.id'),'cumulative_review_AL');
assert.equal(restoredReview.run('AppState.game.types.length'),12);
assert.deepEqual(JSON.parse(restoredReview.run('JSON.stringify(AppState.game.roundSizes)')),[4,4,4]);
assert.ok(restoredReview.run('Boolean(AppState.question)'));

const midABC=createContext();
midABC.run("AppState.started=true;AppState.cursor={phase:'cumulativeIntro',index:2,step:0};startReview(true);ensureQuestion();completeQuestion();ensureQuestion();saveProgress()");
const restoredABC=createContext({saved:saved(midABC)});
assert.equal(restoredABC.run('AppState.cursor.phase'),'cumulative');
assert.equal(restoredABC.run('AppState.game.id'),'cumulative_review_AC');
assert.equal(restoredABC.run('AppState.game.index'),1);
assert.equal(restoredABC.run('new Set(AppState.game.letterOrder).size'),3);
assert.ok(restoredABC.run("['A','B','C'].every(letter=>AppState.game.letterOrder.filter(item=>item===letter).length===2)"));

// A version-10 six-question review resumes at the same question and expands
// only its unplayed tail so every learned letter is covered.
const previousReview=createContext();
previousReview.run("AppState.started=true;AppState.version=10;AppState.cursor={phase:'cumulative',index:25,step:0};AppState.game={id:'cumulative_review_AZ',index:3,types:[...REVIEW_TYPES],recent:[],poolLetters:letters.map(d=>d.letter),letterOrder:['Y','A','Z','B','C','D'],roundSizes:[2,2,2]};AppState.question=createQuestion(AppState.game.types[3],byLetter.get('B'),letters,false);saveProgress()");
const expandedReview=createContext({saved:saved(previousReview)});
assert.equal(expandedReview.run('AppState.cursor.phase'),'cumulative');
assert.equal(expandedReview.run('AppState.game.index'),3);
assert.equal(expandedReview.run('AppState.game.letterOrder.length'),26);
assert.equal(expandedReview.run('new Set(AppState.game.letterOrder).size'),26);
assert.equal(expandedReview.run('AppState.question.letter'),'B');

// Version-9 cursors are moved forward to the appropriate game/review without
// resetting mastery, inventory, or completed mini-game state.
const legacyBase=createContext(),legacy=JSON.parse(legacyBase.run('JSON.stringify(AppState)'));
legacy.version=9;legacy.started=true;legacy.cursor={phase:'review',index:17,step:0};
for(const letter of 'ABCDEFGHIJKLMNOPQR')legacy.stats[letter]={attempts:3,correct:3,mistakes:0,mastery:3,skills:['find','letterPicture','pictureLetter'],practiceDebt:0};
legacy.characterState.ownedItems=['jacket_stars'];legacy.characterState.equipped.outfit='jacket_stars';
const migrated=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});
assert.deepEqual(JSON.parse(migrated.run('JSON.stringify(AppState.cursor)')),{phase:'bubble_cannon',index:17,step:0});
assert.equal(migrated.run("'ABCDEFGHIJKLMNOPQR'.split('').every(letter=>AppState.stats[letter].mastery===3)"),true);
assert.equal(migrated.run('AppState.characterState.equipped.outfit'),'jacket_stars');

const legacyFinal=JSON.parse(legacyBase.run('JSON.stringify(AppState)'));
legacyFinal.version=9;legacyFinal.started=true;legacyFinal.completed=true;legacyFinal.cursor={phase:'results',index:25,step:0};
for(const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')legacyFinal.stats[letter]={attempts:3,correct:3,mistakes:0,mastery:3,skills:['find','letterPicture','pictureLetter'],practiceDebt:0};
legacyFinal.flightYZ={version:1,session:null,permanent:{completed:true,completedAt:1}};
const migratedFinal=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacyFinal)}});
assert.deepEqual(JSON.parse(migratedFinal.run('JSON.stringify(AppState.cursor)')),{phase:'cumulativeIntro',index:25,step:0});
assert.equal(migratedFinal.run('AppState.completed'),false);
assert.equal(migratedFinal.run('AppState.flightYZ.permanent.completed'),true);

console.log(JSON.stringify({
 passed:true,alphabet:'A-Z',cumulativeReviews:expectedBlocks.map(block=>block.id),questionsPerReview:'6–26',reviewRounds:3,
 everyLearnedLetterGuaranteed:true,olderLettersIncluded:true,maxSameLetterInRow:1,variants,
 route:'learn block -> thematic mini-game -> cumulative review -> next block',reviewPersistence:true,
 abcReviewPersistence:true,version10ReviewExpansion:true,legacyRouteMigration:true,inventoryPreserved:true,completedFlightPreserved:true
},null,2));
