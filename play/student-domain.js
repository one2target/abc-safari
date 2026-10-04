'use strict';

/* Pure student-profile domain. It deliberately knows nothing about the DOM or
   localStorage so the same state can later be moved behind a server adapter. */
const StudentDomain=(()=>{
  const VERSION=1;
  const STAR_REWARDS=Object.freeze({
    letterCompleted:1,
    blockCompleted:3,
    trainingCompleted:2,
    perfectTraining:1
  });
  const LEVELS=Object.freeze([
    Object.freeze({min:0,max:3,icon:'🌱',title:'Новичок'}),
    Object.freeze({min:4,max:6,icon:'🗺️',title:'Исследователь'}),
    Object.freeze({min:7,max:12,icon:'🌴',title:'Путешественник'}),
    Object.freeze({min:13,max:18,icon:'🧭',title:'Следопыт'}),
    Object.freeze({min:19,max:25,icon:'🏆',title:'Мастер букв'}),
    Object.freeze({min:26,max:26,icon:'👑',title:'Знаток алфавита'})
  ]);
  const ACHIEVEMENTS=Object.freeze([
    Object.freeze({id:'first_step',title:'Первый шаг',description:'Изучена первая буква.',icon:'🌱',condition:'learnedCount',threshold:1,rewardStars:2,rewardItemId:null,isSecret:false}),
    Object.freeze({id:'abc_expert',title:'Знаток ABC',description:'Изучены A–C.',icon:'🔤',condition:'abcLearned',threshold:true,rewardStars:3,rewardItemId:null,isSecret:false}),
    Object.freeze({id:'sharpshooter',title:'Снайпер',description:'10 правильных ответов подряд.',icon:'🎯',condition:'bestAnswerStreak',threshold:10,rewardStars:3,rewardItemId:null,isSecret:false}),
    Object.freeze({id:'great_memory',title:'Отличная память',description:'Тренировка без ошибок.',icon:'🧠',condition:'perfectTrainingCount',threshold:1,rewardStars:2,rewardItemId:null,isSecret:false}),
    Object.freeze({id:'unstoppable',title:'Не остановить!',description:'Серия занятий 5 дней.',icon:'🔥',condition:'activityStreak',threshold:5,rewardStars:5,rewardItemId:null,isSecret:false}),
    Object.freeze({id:'marius_friend',title:'Друг Мариуса',description:'Получено 10 предметов.',icon:'🦒',condition:'ownedItemCount',threshold:10,rewardStars:5,rewardItemId:null,isSecret:false}),
    Object.freeze({id:'alphabet_expert',title:'Знаток алфавита',description:'Изучены все 26 букв.',icon:'🏆',condition:'learnedCount',threshold:26,rewardStars:10,rewardItemId:null,futureRewardItemId:'golden_crown',isSecret:false})
  ]);

  const integer=value=>Number.isFinite(value)?Math.max(0,Math.floor(value)):0;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const initialStudentState=()=>({
    version:VERSION,
    studentId:null,
    starBalance:0,
    starTransactions:[],
    purchasedItemIds:[],
    achievements:{unlocked:[],notified:[]},
    activityDays:[]
  });

  function restoreStudentState(saved){
    const fresh=initialStudentState();
    if(!saved||typeof saved!=='object')return fresh;
    fresh.studentId=typeof saved.studentId==='string'&&saved.studentId?saved.studentId:null;
    const seenSources=new Set();
    if(Array.isArray(saved.starTransactions))for(const transaction of saved.starTransactions){
      const amount=Number(transaction?.amount),sourceId=typeof transaction?.sourceId==='string'?transaction.sourceId:'';
      if(!Number.isFinite(amount)||!sourceId||seenSources.has(sourceId))continue;
      seenSources.add(sourceId);
      fresh.starTransactions.push({
        amount:Math.trunc(amount),
        reason:typeof transaction.reason==='string'?transaction.reason:'legacy',
        sourceId,
        timestamp:Number.isFinite(transaction.timestamp)?transaction.timestamp:0
      });
    }
    const transactionBalance=fresh.starTransactions.reduce((sum,item)=>sum+item.amount,0);
    fresh.starBalance=Math.max(0,fresh.starTransactions.length?transactionBalance:integer(saved.starBalance));
    fresh.purchasedItemIds=[...new Set(Array.isArray(saved.purchasedItemIds)?saved.purchasedItemIds.filter(id=>typeof id==='string'):[])];
    const unlocked=Array.isArray(saved.achievements?.unlocked)?saved.achievements.unlocked:[];
    const seenAchievements=new Set();
    for(const entry of unlocked){
      const id=typeof entry==='string'?entry:entry?.id;
      if(!ACHIEVEMENTS.some(item=>item.id===id)||seenAchievements.has(id))continue;
      seenAchievements.add(id);
      fresh.achievements.unlocked.push({id,timestamp:Number.isFinite(entry?.timestamp)?entry.timestamp:0});
    }
    fresh.achievements.notified=[...new Set(Array.isArray(saved.achievements?.notified)?saved.achievements.notified.filter(id=>seenAchievements.has(id)):[])];
    fresh.activityDays=[...new Set(Array.isArray(saved.activityDays)?saved.activityDays.filter(day=>/^\d{4}-\d{2}-\d{2}$/.test(day)):[])].sort();
    return fresh;
  }

  function hasTransaction(state,sourceId){return state.starTransactions.some(item=>item.sourceId===sourceId);}
  function awardStars(state,amount,reason,sourceId,timestamp=Date.now()){
    const value=integer(amount);
    if(!value||typeof reason!=='string'||!reason||typeof sourceId!=='string'||!sourceId||hasTransaction(state,sourceId))return false;
    state.starTransactions.push({amount:value,reason,sourceId,timestamp:Number.isFinite(timestamp)?timestamp:Date.now()});
    state.starBalance=integer(state.starBalance)+value;
    return true;
  }

  function purchaseItem(state,inventory,item,timestamp=Date.now()){
    if(!item||typeof item.id!=='string'||!item.id||!inventory||!Array.isArray(inventory.ownedItems))return {ok:false,reason:'unknown'};
    if(item.isPremium||item.currency==='money')return {ok:false,reason:'premium'};
    if(inventory.ownedItems.includes(item.id)||state.purchasedItemIds.includes(item.id))return {ok:false,reason:'owned'};
    const price=integer(item.priceStars);
    if(!price)return {ok:false,reason:'unavailable'};
    if(integer(state.starBalance)<price)return {ok:false,reason:'insufficient'};
    const sourceId=`shop:${item.id}`;
    if(hasTransaction(state,sourceId))return {ok:false,reason:'owned'};
    // All validation happens before either side of the transaction is mutated.
    state.starBalance-=price;
    state.starTransactions.push({amount:-price,reason:'shop_purchase',sourceId,timestamp:Number.isFinite(timestamp)?timestamp:Date.now()});
    state.purchasedItemIds.push(item.id);
    inventory.ownedItems.push(item.id);
    return {ok:true,reason:'purchased'};
  }

  function localDayKey(timestamp=Date.now()){
    const date=new Date(timestamp);
    if(Number.isNaN(date.getTime()))return null;
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function recordActivity(state,timestamp=Date.now()){
    const day=localDayKey(timestamp);if(!day||state.activityDays.includes(day))return false;
    state.activityDays.push(day);state.activityDays.sort();return true;
  }
  function dayOrdinal(day){const [year,month,date]=day.split('-').map(Number);return Math.floor(new Date(year,month-1,date).getTime()/86400000);}
  function activityStreak(state,now=Date.now()){
    const days=[...new Set(state.activityDays)].sort();if(!days.length)return 0;
    const latest=dayOrdinal(days.at(-1)),today=dayOrdinal(localDayKey(now));
    if(today-latest>1)return 0;
    let streak=1;
    for(let index=days.length-2;index>=0;index--){if(dayOrdinal(days[index+1])-dayOrdinal(days[index])!==1)break;streak++;}
    return streak;
  }

  function letterMastery(courseStat={},trainingStat={}){
    if(integer(courseStat.mastery)<3)return 0;
    const attempts=integer(trainingStat.attempts),correct=integer(trainingStat.correct);
    if(attempts>=5&&correct>=4&&correct/attempts>=.8)return 3;
    if(correct>=2)return 2;
    return 1;
  }
  function levelFor(learnedCount){const count=Math.max(0,Math.min(26,integer(learnedCount)));return LEVELS.find(level=>count>=level.min&&count<=level.max)||LEVELS[0];}
  function meetsCondition(achievement,facts){
    const value=facts?.[achievement.condition];
    return typeof achievement.threshold==='boolean'?value===achievement.threshold:Number(value)>=achievement.threshold;
  }
  function evaluateAchievements(state,facts,timestamp=Date.now()){
    const unlocked=new Set(state.achievements.unlocked.map(entry=>entry.id)),newlyUnlocked=[];
    for(const achievement of ACHIEVEMENTS){
      if(unlocked.has(achievement.id)||!meetsCondition(achievement,facts))continue;
      state.achievements.unlocked.push({id:achievement.id,timestamp});unlocked.add(achievement.id);newlyUnlocked.push(achievement.id);
      if(achievement.rewardStars)awardStars(state,achievement.rewardStars,'achievement',`achievement:${achievement.id}`,timestamp);
    }
    return newlyUnlocked;
  }
  function markAchievementNotified(state,id){
    if(!state.achievements.unlocked.some(entry=>entry.id===id)||state.achievements.notified.includes(id))return false;
    state.achievements.notified.push(id);return true;
  }

  function createStorageAdapter(storage,key){
    return Object.freeze({
      read(){const raw=storage.getItem(key);return raw?JSON.parse(raw):null;},
      write(state){storage.setItem(key,JSON.stringify(state));return true;}
    });
  }

  return Object.freeze({
    VERSION,STAR_REWARDS,LEVELS,ACHIEVEMENTS,initialStudentState,restoreStudentState,
    awardStars,purchaseItem,recordActivity,activityStreak,letterMastery,levelFor,
    evaluateAchievements,markAchievementNotified,createStorageAdapter,clone
  });
})();
