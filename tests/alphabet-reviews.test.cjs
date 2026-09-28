const assert=require('node:assert/strict');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const expectedLocal={
 review_JKL:['J','K','L'],review_MNO:['M','N','O'],review_PQR:['P','Q','R'],
 review_STU:['S','T','U'],review_VWX:['V','W','X'],review_YZ:['Y','Z']
};
const expectedCumulative={
 cumulative_review_AO:['A','O',14],cumulative_review_AU:['A','U',20],cumulative_review_AZ:['A','Z',25]
};

const data=createContext();
assert.equal(data.run("letters.map(d=>d.letter).join('')"),'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
assert.equal(data.run('letters.length'),26);
assert.equal(data.run('REVIEW_LENGTH'),6);
assert.deepEqual(JSON.parse(data.run('JSON.stringify(REVIEW_TYPES)')),['find','soundLetter','pictureLetter','letterPicture','wordPicture','lowercase']);
assert.deepEqual(JSON.parse(data.run('JSON.stringify(LOCAL_REVIEW_BLOCKS.map(({id,letters,afterIndex,cumulative})=>({id,letters,afterIndex,cumulative:cumulative||null})))')),[
 {id:'review_JKL',letters:['J','K','L'],afterIndex:11,cumulative:null},
 {id:'review_MNO',letters:['M','N','O'],afterIndex:14,cumulative:'cumulative_review_AO'},
 {id:'review_PQR',letters:['P','Q','R'],afterIndex:17,cumulative:null},
 {id:'review_STU',letters:['S','T','U'],afterIndex:20,cumulative:'cumulative_review_AU'},
 {id:'review_VWX',letters:['V','W','X'],afterIndex:23,cumulative:null},
 {id:'review_YZ',letters:['Y','Z'],afterIndex:25,cumulative:'cumulative_review_AZ'}
]);
assert.deepEqual(JSON.parse(data.run('JSON.stringify(CUMULATIVE_REVIEW_BLOCKS.map(({id,start,end,afterIndex,recent})=>({id,start,end,afterIndex,recent})))')),[
 {id:'cumulative_review_AO',start:'A',end:'O',afterIndex:14,recent:['M','N','O']},
 {id:'cumulative_review_AU',start:'A',end:'U',afterIndex:20,recent:['S','T','U']},
 {id:'cumulative_review_AZ',start:'A',end:'Z',afterIndex:25,recent:['Y','Z']}
]);

for(const [id,reviewLetters] of Object.entries(expectedLocal)){
 const afterIndex=data.run(`LOCAL_REVIEW_BLOCKS.find(block=>block.id==='${id}').afterIndex`);
 data.run(`AppState.cursor={phase:'reviewIntro',index:${afterIndex},step:0};AppState.game=null;AppState.question=null;startReview(false)`);
 const game=JSON.parse(data.run('JSON.stringify(AppState.game)'));
 assert.equal(game.id,id);
 assert.equal(game.types.length,6);
 assert.equal(new Set(game.types).size,6);
 assert.equal(game.letterOrder.length,6);
 assert.ok(game.letterOrder.every(letter=>reviewLetters.includes(letter)));
 assert.ok(reviewLetters.every(letter=>game.letterOrder.includes(letter)));
 const question=JSON.parse(data.run('JSON.stringify(ensureQuestion())'));
 assert.ok(reviewLetters.includes(question.letter));
 assert.ok(question.options.every(letter=>reviewLetters.includes(letter)));
 assert.equal(question.options.length,Math.min(3,reviewLetters.length));
}

const cumulativeVariants={};
for(const [id,[start,end,afterIndex]] of Object.entries(expectedCumulative)){
 const variants=new Set();
 for(let trial=0;trial<80;trial++){
  data.run(`AppState.cursor={phase:'cumulativeIntro',index:${afterIndex},step:0};AppState.game=null;AppState.question=null;startReview(true)`);
  const game=JSON.parse(data.run('JSON.stringify(AppState.game)'));
  const recent=JSON.parse(data.run(`JSON.stringify(CUMULATIVE_REVIEW_BLOCKS.find(block=>block.id==='${id}').recent)`));
  assert.equal(game.id,id);
  assert.equal(game.poolLetters[0],start);
  assert.equal(game.poolLetters.at(-1),end);
  assert.equal(game.poolLetters.length,afterIndex+1);
  assert.equal(game.letterOrder.length,6);
  assert.equal(new Set(game.letterOrder).size,6);
  assert.equal(game.letterOrder.filter(letter=>recent.includes(letter)).length,2);
  assert.equal(game.letterOrder.filter(letter=>!recent.includes(letter)).length,4);
  variants.add(game.letterOrder.join(''));
 }
 assert.ok(variants.size>1,`${id} should vary between runs`);
 cumulativeVariants[id]=variants.size;
}

const transitions=createContext();
for(const [index,phase,next] of [
 [11,'reviewResult',{phase:'lesson',index:12,step:0}],
 [14,'reviewResult',{phase:'cumulativeIntro',index:14,step:0}],
 [14,'cumulativeResult',{phase:'lesson',index:15,step:0}],
 [20,'reviewResult',{phase:'cumulativeIntro',index:20,step:0}],
 [20,'cumulativeResult',{phase:'lesson',index:21,step:0}],
 [23,'reviewResult',{phase:'lesson',index:24,step:0}],
 [25,'reviewResult',{phase:'cumulativeIntro',index:25,step:0}]
]){
 transitions.run(`AppState.cursor={phase:'${phase}',index:${index},step:0};AppState.game=null;AppState.question=null;advanceAfterReview()`);
 assert.deepEqual(JSON.parse(transitions.run('JSON.stringify(AppState.cursor)')),next);
}
transitions.run("AppState.cursor={phase:'cumulativeResult',index:25,step:0};advanceAfterReview()");
assert.equal(transitions.run('AppState.cursor.phase'),'results');
assert.equal(transitions.run('AppState.completed'),true);

const midReview=createContext();
midReview.run("AppState.started=true;AppState.cursor={phase:'reviewIntro',index:11,step:0};startReview(false);ensureQuestion();saveProgress()");
const restoredReview=createContext({saved:saved(midReview)});
assert.equal(restoredReview.run('AppState.cursor.phase'),'review');
assert.equal(restoredReview.run('AppState.game.id'),'review_JKL');
assert.equal(restoredReview.run('AppState.game.types.length'),6);
assert.ok(restoredReview.run('Boolean(AppState.question)'));

const legacyBase=createContext();
const legacy=JSON.parse(legacyBase.run('JSON.stringify(AppState)'));
legacy.started=true;legacy.completed=true;legacy.cursor={phase:'results',index:8,step:6};
for(const letter of 'ABCDEFGHI')legacy.stats[letter]={attempts:3,correct:3,mistakes:0,mastery:3,skills:['find','letterPicture','pictureLetter'],practiceDebt:0};
for(const letter of 'JKLMNOPQRSTUVWXYZ')delete legacy.stats[letter];
legacy.completedBlocks=['reward_abc','reward_def','reward_ghi'];legacy.claimedRewards=['reward_abc','reward_def','reward_ghi'];legacy.rewardFlow=null;
legacy.characterState.ownedItems=['jacket_stars','accessory_balloon','hat_straw_bow'];
legacy.characterState.equipped={outfit:'jacket_stars',head:'hat_straw_bow',face:null,hand_left:null,hand_right:'accessory_balloon',back:null,extra:null,background:null};
const migrated=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});
assert.deepEqual(JSON.parse(migrated.run('JSON.stringify(AppState.cursor)')),{phase:'lesson',index:9,step:0});
assert.equal(migrated.run('AppState.completed'),false);
assert.deepEqual(JSON.parse(migrated.run('JSON.stringify(AppState.characterState.ownedItems)')),legacy.characterState.ownedItems);
assert.equal(migrated.run('AppState.characterState.equipped.outfit'),'jacket_stars');
assert.equal(migrated.run('AppState.characterState.equipped.hand_right'),'accessory_balloon');
assert.equal(migrated.run('AppState.characterState.equipped.head'),'hat_straw_bow');

console.log(JSON.stringify({
 passed:true,alphabet:'A-Z',localReviews:Object.keys(expectedLocal),cumulativeReviews:Object.keys(expectedCumulative),
 questionsPerReview:6,cumulativeUniqueLetters:true,cumulativeRecentLetters:2,cumulativeVariants,
 reviewPersistence:true,completedAIResumesAt:'J',inventoryPreserved:true
},null,2));
