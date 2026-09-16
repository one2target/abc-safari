// Existing course regression suite, extended to visit the new room phase.
const assert=require('node:assert/strict');
const {createContext,saved}=require('./support/trainer-harness.cjs');
function playRoom(a){a.run(`for(let round=0;round<3;round++){for(const id of ROOM_ROUNDS[round].targets)selectRoomObject(id);if(round<2)nextRoomRound();}continueAfterRoom();`);}
(async()=>{
 const a=createContext();assert.equal(a.played.length,0);assert.equal(a.run('AppState.version'),2);assert.equal(a.run('AppState.characterState.ownedItems.length'),0);
 a.run('toggleSound();begin()');let phases=[],answers=0,rewards=[];
 for(let guard=0;guard<170;guard++){
  const c=JSON.parse(a.run('JSON.stringify(AppState.cursor)'));phases.push(c.phase);
  if(a.run('Boolean(AppState.rewardFlow)')){
   const id=a.run('AppState.rewardFlow.id');rewards.push(id);
   const pending=createContext({saved:saved(a)});assert.equal(pending.run('view'),'reward');assert.equal(pending.run('AppState.rewardFlow.id'),id);
   if(id==='reward_abc')assert.equal(a.run('AppState.characterState.ownedItems.length'),0);
   else assert.equal(a.run('AppState.characterState.equipped.outfit'),'jacket_stars');
   a.run(`chooseReward('${id==='reward_abc'?'jacket_stars':'accessory_balloon'}')`);
   assert.equal(a.run('rewardReady'),false);const chosen=a.run('AppState.rewardFlow.selected');assert.equal(a.run(`chooseReward('${id==='reward_abc'?'jacket_racer':'accessory_bouquet'}')`),false);assert.equal(a.run('AppState.rewardFlow.selected'),chosen);a.run('continueReward()');assert.equal(a.run('Boolean(AppState.rewardFlow)'),true);
   const selected=createContext({saved:saved(a)});assert.equal(selected.run('view'),'reward');assert.equal(selected.run('rewardReady'),true);
   await a.tick(1000);a.run('continueReward()');continue;
  }
  if(c.phase==='results')break;
  if(c.phase==='lesson'&&c.step<2)a.run('nextLessonStep()');
  else if(c.phase==='lesson'||['mini','final'].includes(c.phase)){
   const q=JSON.parse(a.run('JSON.stringify(ensureQuestion())'));assert.equal(q.options.length,3);assert.equal(new Set(q.options).size,3);assert.ok(q.options.includes(q.letter));
   if(!answers){a.run('registerMistake(AppState.question)');const same=createContext({saved:saved(a)});assert.equal(same.run('AppState.stats.A.mistakes'),1);assert.equal(same.run('AppState.cursor.step'),2);}
   a.run('completeQuestion();go("course")');answers++;
  }else if(c.phase==='letterReward')a.run('advanceAfterLetter()');else if(c.phase==='room')playRoom(a);else if(c.phase==='miniIntro')a.run('startGame(false)');else if(c.phase==='miniResult')a.run('advanceAfterMini()');else if(c.phase==='finalIntro')a.run('startGame(true)');else throw Error(c.phase);
 }
 assert.equal(answers,38);assert.deepEqual(rewards,['reward_abc','reward_def']);assert.equal(a.run('AppState.completed'),true);assert.equal(a.run('letters.every(d=>AppState.stats[d.letter].mastery===3)'),true);assert.equal(a.run('AppState.characterState.ownedItems.length'),2);
 assert.equal(a.run("equipItem('jacket_racer')"),false);assert.equal(a.run("equipItem('accessory_bouquet')"),false);const resumed=createContext({saved:saved(a)});assert.equal(resumed.run('AppState.characterState.equipped.outfit'),'jacket_stars');assert.equal(resumed.run('AppState.characterState.equipped.hand_right'),'accessory_balloon');assert.equal(resumed.run('AppState.rewardFlow'),null);

 // Upgrade legacy v2 with both category options unlocked: retain only equipped.
 const legacy=JSON.parse(a.store.get('alfie-abc-v1'));
 delete legacy.rewardStateVersion;
 legacy.characterState={unlockedItems:['jacket_01','jacket_02','headwear_01','headwear_02'],equipped:{jacket:'jacket_02',headwear:'headwear_01'}};
 legacy.rewardFlow=null;
 const migration=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});
 assert.equal(migration.run('JSON.stringify(AppState.characterState.ownedItems)'),JSON.stringify(['jacket_racer']));
 assert.equal(migration.run('AppState.characterState.equipped.outfit'),'jacket_racer');
 assert.equal(migration.run('AppState.rewardFlow.id'),'reward_def');
 assert.equal(migration.run('equipItem("jacket_stars")'),false);
 assert.equal(migration.run('JSON.stringify(AppState.stats)'),JSON.stringify(legacy.stats));
 assert.equal(migration.run('JSON.stringify(AppState.cursor)'),JSON.stringify(legacy.cursor));
 migration.run('chooseReward("accessory_bouquet")');
 const migratedAgain=createContext({saved:saved(migration)});
 assert.equal(migratedAgain.run('AppState.characterState.ownedItems.length'),2);
 assert.equal(migratedAgain.run('AppState.characterState.equipped.hand_right'),'accessory_bouquet');
 assert.equal(migratedAgain.run('AppState.rewardFlow.selected'),'accessory_bouquet');
 migratedAgain.run('continueReward()');
 assert.equal(migratedAgain.run('AppState.rewardFlow'),null);
 assert.equal(migratedAgain.run('AppState.completed'),true);
 // Development saves already using new IDs but missing a reward schema version.
 legacy.characterState={unlockedItems:['jacket_stars','jacket_racer','accessory_bouquet','accessory_balloon'],equipped:{giraffeVariant:'jacket_stars',handItem:'accessory_balloon'}};
 const development=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});
 assert.equal(development.run('JSON.stringify(AppState.characterState.ownedItems)'),JSON.stringify(['jacket_stars','accessory_balloon']));
 assert.equal(development.run('AppState.rewardFlow'),null);
 // Flow B through all real course handlers, then reload and verify locks.
 const b=createContext();b.run('toggleSound();begin()');let bAnswers=0;
 for(let i=0;i<160;i++){
  const c=JSON.parse(b.run('JSON.stringify(AppState.cursor)'));
  if(b.run('Boolean(AppState.rewardFlow)')){b.run('chooseReward(AppState.rewardFlow.id==="reward_abc"?"jacket_racer":"accessory_bouquet")');await b.tick(1000);b.run('continueReward()');continue;}
  if(c.phase==='results')break;
  if(c.phase==='lesson'&&c.step<2)b.run('nextLessonStep()');
  else if(c.phase==='lesson'||['mini','final'].includes(c.phase)){b.run('ensureQuestion();completeQuestion();go("course")');bAnswers++;}
  else if(c.phase==='letterReward')b.run('advanceAfterLetter()');else if(c.phase==='room')playRoom(b);else if(c.phase==='miniIntro')b.run('startGame(false)');else if(c.phase==='miniResult')b.run('advanceAfterMini()');else if(c.phase==='finalIntro')b.run('startGame(true)');else throw Error(c.phase);
 }
 assert.equal(bAnswers,38);
 const bReload=createContext({saved:saved(b)});
 assert.equal(bReload.run('AppState.characterState.equipped.outfit'),'jacket_racer');
 assert.equal(bReload.run('AppState.characterState.equipped.hand_right'),'accessory_bouquet');
 assert.equal(bReload.run('equipItem("jacket_stars")'),false);assert.equal(bReload.run('equipItem("accessory_balloon")'),false);
 assert.equal(bReload.run('AppState.characterState.ownedItems.length'),2);
 assert.ok(bReload.run('renderHome()').includes('giraffe_jacket_racer.png'));
 assert.ok(bReload.run('renderHome()').includes('background_home.png'));
 assert.ok(!bReload.run('renderHome()').includes('reward_icon_jacket'));
 // Completed gifts never become mandatory again.
 a.run('AppState.cursor.index=2;AppState.cursor.phase="miniResult";finishBlock()');assert.equal(a.run('AppState.rewardFlow'),null);
 // A partially learned or mastered block without the mini challenge earns no gift.
 const old=JSON.parse(a.store.get('alfie-abc-v1'));old.version=1;delete old.characterState;delete old.claimedRewards;delete old.completedBlocks;delete old.rewardFlow;old.completed=false;old.cursor={index:2,phase:'miniIntro',step:4};
 const noGift=createContext({saved:{'alfie-abc-v1':JSON.stringify(old)}});assert.equal(noGift.run('AppState.completedBlocks.length'),0);
 old.cursor={index:3,phase:'lesson',step:2};old.stats.D.correct=4;old.stats.D.mistakes=2;
 const migrated=createContext({saved:{'alfie-abc-v1':JSON.stringify(old)}});assert.equal(migrated.run('AppState.cursor.index'),3);assert.equal(migrated.run('AppState.cursor.step'),2);assert.equal(migrated.run('AppState.stats.D.correct'),4);assert.equal(migrated.run('AppState.stats.D.mistakes'),2);assert.equal(migrated.run('AppState.rewardFlow.id'),'reward_abc');
 migrated.run("chooseReward('jacket_racer')");await migrated.tick(1000);migrated.run('continueReward()');assert.equal(migrated.run('AppState.cursor.index'),3);assert.equal(migrated.run('AppState.cursor.step'),2);
 old.completed=true;old.cursor={index:5,phase:'results',step:4};const oldDone=createContext({saved:{'alfie-abc-v1':JSON.stringify(old)}});assert.equal(oldDone.run('AppState.completedBlocks.length'),2);assert.equal(oldDone.run('AppState.completed'),true);
 resumed.run('resetProgress()');assert.equal(resumed.run('AppState.soundEnabled'),false);assert.equal(resumed.run('AppState.claimedRewards.length'),0);assert.equal(resumed.run('AppState.characterState.ownedItems.length'),0);assert.equal(resumed.run("ITEM_SLOTS.every(slot=>AppState.characterState.equipped[slot]===null)"),true);
 const blocked=createContext({blocked:true});blocked.run('begin();nextLessonStep()');assert.equal(blocked.run('storageAvailable'),false);
 const extended=createContext({saved:{'alfie-abc-v1':JSON.stringify(old)},extraLetter:true});assert.equal(extended.run('AppState.completed'),false);assert.equal(extended.run('AppState.cursor.index'),6);
 a.run("AppState.reviews=[{letter:'E',due:AppState.questionSerial}]");assert.equal(a.run('getWeightedRandomLetter(letters).letter'),'E');
 for(let i=0;i<500;i++)assert.equal(a.run("(()=>{const q=createQuestion('find',letters[0],letters,true);return q.options.length===3&&new Set(q.options).size===3&&q.options.includes('A');})()"),true);
 for(let i=0;i<40;i++){a.run('startGame(true)');assert.equal(a.run('new Set(AppState.game.types).size'),5);}
 const clicks=createContext();clicks.run("toggleSound();begin();AppState.cursor.step=2;showScreen();var target={dataset:{answer:'A'},classList:{add(){},remove(){}}};checkAnswer(target);checkAnswer(target);");assert.equal(clicks.run('AppState.stats.A.correct'),1);assert.equal(clicks.run('AppState.cursor.step'),3);await clicks.tick(1100);assert.equal(clicks.run('answerLocked'),false);
 const midway=createContext({saved:saved(clicks)});assert.equal(midway.run('AppState.cursor.step'),3);
 const audio=createContext();audio.run('begin()');await audio.tick(3000);assert.deepEqual(audio.played.map(x=>x.src),['./audio/03_new_letter.mp3','./audio/a_name.mp3','./audio/a_sound.mp3','./audio/apple.mp3']);assert.equal(audio.spoken.length,0);assert.ok(audio.played.slice(1).every((x,i)=>x.at-audio.played[i].at>=500));
 audio.run('AppState.cursor.step=2;showScreen()');await audio.tick(1000);assert.deepEqual(audio.played.slice(-2).map(x=>x.src),['./audio/06_find_letter.mp3','./audio/a_name.mp3']);const before=audio.played.length;
 audio.run('repeatInstruction()');await audio.tick(1000);assert.deepEqual(audio.played.slice(before).map(x=>x.src),['./audio/06_find_letter.mp3','./audio/a_name.mp3']);
 audio.run('repeatInstruction();repeatInstruction();repeatInstruction();toggleSound()');await audio.tick(3000);const count=audio.played.length;audio.run('repeatInstruction()');await audio.tick(3000);assert.equal(audio.played.length,count);assert.equal(audio.stats().objects,1);assert.equal(audio.stats().maxActive,1);
 // Cancellation during a 500ms pause prevents the following stale letter.
 const cancel=createContext();cancel.run('begin()');await cancel.tick(200);cancel.run('stopAudio()');await cancel.tick(1000);assert.equal(cancel.played.length,1);
 const missing=createContext({audioResult:'missing'});missing.run('unlockAudio();AudioManager.play(enName(letters[0]))');await missing.tick(10);assert.equal(missing.spoken[0].lang,'en-US');
 missing.run("AudioManager.play(ru('find_letter'))");await missing.tick(10);assert.equal(missing.spoken.at(-1).lang,'ru-RU');
 const autoplay=createContext({audioResult:'blocked'});autoplay.run('begin()');await autoplay.tick(3000);assert.equal(autoplay.spoken.length,0);
 // A broken clothing image hides only that image; the character renderer survives.
 const imageFailure=createContext();imageFailure.context.brokenClothing={complete:true,naturalWidth:0,hidden:false,dataset:{characterAsset:'jacket_stars'},getAttribute(){return './images/missing-test.png'},addEventListener(){},parentElement:{classList:{add(){}}}};
 imageFailure.run("document.querySelectorAll=selector=>selector==='img[data-character-asset]'?[brokenClothing]:[];wireMedia();wireMedia()");assert.equal(imageFailure.context.brokenClothing.hidden,true);assert.equal(imageFailure.warnings.length,1);
 // Parent access still uses a two-second hold.
 const hold=createContext();hold.run("startHold({type:'keydown',key:'Enter',repeat:false,preventDefault(){}})");await hold.tick(1999);assert.equal(hold.nodes.get('#modal-layer')?.innerHTML||'','');await hold.tick(1);assert.ok(hold.nodes.get('#modal-layer').innerHTML.includes('Для родителей'));
 console.log(JSON.stringify({passed:true,answers,miniQuestions:10,finalQuestions:10,rewards,wardrobePersistence:true,lockedAlternatives:true,flowBAnswers:bAnswers,legacyBothUnlockedMigration:true,retiredHeadwearReplacement:true,doubleRewardTapGuard:true,pendingRewardResume:true,selectedRewardResume:true,oldProgressMigration:true,noPrematureGifts:true,noRepeatedGifts:true,resetAndMute:true,questionResume:true,doubleTapGuard:true,weightedReview:true,choiceTrials:500,finalCoverageTrials:40,audioSequenceAndPause:true,audioRepeat:true,audioCancellation:true,audioMute:true,reusedAudioObjects:audio.stats().objects,maxConcurrentAudio:audio.stats().maxActive,normalTTSCalls:audio.spoken.length,missingFileFallbackLanguages:true,autoplayDoesNotTriggerTTS:true,parentHold:true,brokenImageFallback:true},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
