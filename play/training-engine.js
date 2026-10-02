'use strict';

/* Pure session builder. UI, audio and game animation stay in the existing adapters. */
const TrainingEngine=(()=>{
  const QUESTION_TYPES=Object.freeze(['soundLetter','letterPicture','pictureLetter','wordPicture']);
  const SKILL_TYPES=Object.freeze({
    letterName:Object.freeze(['soundLetter']),
    sound:Object.freeze(['soundLetter']),
    word:Object.freeze(['letterPicture','pictureLetter','wordPicture'])
  });

  function shuffle(items,random=Math.random){
    const result=[...items];
    for(let index=result.length-1;index>0;index--){
      const other=Math.floor(random()*(index+1));
      [result[index],result[other]]=[result[other],result[index]];
    }
    return result;
  }

  function weightedPick(items,weight,random=Math.random){
    if(!items.length)return null;
    const weights=items.map(item=>Math.max(.01,Number(weight(item))||0));
    let pick=random()*weights.reduce((sum,value)=>sum+value,0);
    return items.find((item,index)=>(pick-=weights[index])<0)||items.at(-1);
  }

  function statFor(progress,letter){return progress?.[letter]||{};}
  function letterWeight(progress,letter,config=TRAINING_CONFIG){
    const stat=statFor(progress,letter);
    const skillMistakes=['letterName','sound','word'].reduce((sum,skill)=>sum+(Number(stat[skill]?.mistakes)||0),0);
    return 1+Math.min(12,Number(stat.mistakes)||0)*config.mistakeWeight+Math.min(12,skillMistakes)*.08;
  }
  function skillFor(type,promptMode){return type==='soundLetter'?(promptMode==='name'?'letterName':'sound'):'word';}
  function typeWeight(progress,letter,type,config=TRAINING_CONFIG){
    const skill=type==='soundLetter'?'sound':'word',stat=statFor(progress,letter);
    return 1+Math.min(12,Number(stat[skill]?.mistakes)||0)*config.skillMistakeWeight;
  }

  function chooseLetterOrder(pool,total,progress,config,random){
    const order=[],remaining=[...pool],coverage=Math.min(total,Math.max(1,Math.ceil(pool.length*config.coverageRatio)));
    while(remaining.length&&order.length<coverage){
      const chosen=weightedPick(remaining,letter=>letterWeight(progress,letter,config),random);
      order.push(chosen);remaining.splice(remaining.indexOf(chosen),1);
    }
    while(order.length<total){
      const repeated=order.length>=config.maxSameLetterInARow&&order.slice(-config.maxSameLetterInARow).every(letter=>letter===order.at(-1));
      const candidates=repeated?pool.filter(letter=>letter!==order.at(-1)):pool;
      order.push(weightedPick(candidates,letter=>letterWeight(progress,letter,config),random));
    }
    return order;
  }

  function chooseType(letter,progress,recentTypes,config,random){
    const repeated=recentTypes.length>=2&&recentTypes.at(-1)===recentTypes.at(-2);
    const candidates=repeated?QUESTION_TYPES.filter(type=>type!==recentTypes.at(-1)):QUESTION_TYPES;
    return weightedPick(candidates,type=>typeWeight(progress,letter,type,config),random);
  }

  function createQuestion(letter,type,pool,positionState,progress,config,random=Math.random,forcedSkill=null){
    const answerCount=Math.min(config.answerCount,pool.length),wrong=shuffle(pool.filter(item=>item!==letter),random).slice(0,answerCount-1);
    const blocked=new Set([positionState.lastCorrectIndex,...(positionState.blockedPositions||[])].filter(Number.isInteger));
    let possiblePositions=Array.from({length:answerCount},(_,index)=>index).filter(index=>!blocked.has(index));
    if(!possiblePositions.length)possiblePositions=Array.from({length:answerCount},(_,index)=>index).filter(index=>index!==positionState.lastCorrectIndex);
    const correctIndex=possiblePositions[Math.floor(random()*possiblePositions.length)]??0,options=[...wrong];
    options.splice(correctIndex,0,letter);positionState.lastCorrectIndex=correctIndex;
    let promptMode=null;
    if(type==='soundLetter'){
      const stat=statFor(progress,letter),nameWeight=1+(Number(stat.letterName?.mistakes)||0)*config.skillMistakeWeight,soundWeight=1+(Number(stat.sound?.mistakes)||0)*config.skillMistakeWeight;
      promptMode=random()*(nameWeight+soundWeight)<nameWeight?'name':'sound';
    }
    if(forcedSkill==='letterName')promptMode='name';
    if(forcedSkill==='sound')promptMode='sound';
    const definition={
      soundLetter:{promptType:promptMode,answerType:'letter'},
      letterPicture:{promptType:'letter',answerType:'image'},
      pictureLetter:{promptType:'image',answerType:'letter'},
      wordPicture:{promptType:'wordAudio',answerType:'image'}
    }[type];
    return {
      id:`training-question-${Math.floor(random()*1e9).toString(36)}-${Date.now().toString(36)}`,
      type,letter,promptType:definition.promptType,answerType:definition.answerType,
      skill:forcedSkill||skillFor(type,promptMode),options,correctIndex,mistakes:0,retryScheduled:false,completed:false
    };
  }

  function buildOnce(pool,progress,config,random){
    const activities=Array.from({length:config.sessionLength},(_,index)=>({id:`training-activity-${index+1}`,kind:'quick'}));
    const lastIndex=activities.length-1;activities[lastIndex].kind='blitz';
    const balloonCandidates=[];for(let index=2;index<=Math.min(4,lastIndex-2);index++)balloonCandidates.push(index);
    const balloonIndex=balloonCandidates[Math.floor(random()*balloonCandidates.length)]??Math.max(1,lastIndex-3);
    activities[balloonIndex].kind='balloon';
    const riverCandidates=[];for(let index=Math.max(balloonIndex+1,5);index<lastIndex;index++)riverCandidates.push(index);
    const riverIndex=riverCandidates[Math.floor(random()*riverCandidates.length)]??Math.max(balloonIndex+1,lastIndex-1);
    activities[riverIndex].kind='river';
    const quickCount=activities.filter(activity=>activity.kind==='quick').length;
    const totalQuestions=quickCount+1+config.river.steps+config.blitz.questions;
    const order=chooseLetterOrder(pool,totalQuestions,progress,config,random),positionState={lastCorrectIndex:null},recentTypes=[];
    let orderIndex=0;
    const nextQuestion=()=>{
      const letter=order[orderIndex++],type=chooseType(letter,progress,recentTypes,config,random);
      recentTypes.push(type);recentTypes.splice(0,Math.max(0,recentTypes.length-2));
      return createQuestion(letter,type,pool,positionState,progress,config,random);
    };
    for(const activity of activities){
      if(activity.kind==='quick'){activity.questions=[nextQuestion()];activity.questionIndex=0;}
      else if(activity.kind==='balloon'){
        activity.targetLetter=order[orderIndex++];activity.skill='letterName';activity.gameState=null;
      }else if(activity.kind==='river'){
        activity.questions=Array.from({length:config.river.steps},nextQuestion);activity.gameState=null;
      }else{
        activity.questions=Array.from({length:config.blitz.questions},nextQuestion);activity.questionIndex=0;
      }
    }
    const signature=activities.map(activity=>`${activity.kind}:${activity.targetLetter||activity.questions?.map(question=>`${question.letter}${question.type[0]}${question.promptType?.[0]||''}`).join('')}`).join('|');
    return {activities,signature};
  }

  function createSession(completedLetters,progress={},config=TRAINING_CONFIG,random=Math.random,lastSignature=null){
    const pool=[...new Set(completedLetters.filter(letter=>typeof letter==='string'&&letter.length))];
    if(pool.length<config.minCompletedLetters)throw new Error('Training needs at least three completed letters');
    let built;
    for(let attempt=0;attempt<4;attempt++){built=buildOnce(pool,progress,config,random);if(built.signature!==lastSignature)break;}
    if(built.signature===lastSignature){
      const first=built.activities.find(activity=>activity.kind==='quick'),current=first.questions[0],avoid=built.activities.find(activity=>activity!==first&&activity.kind==='quick')?.questions?.[0]?.letter;
      const alternate=pool.find(letter=>letter!==current.letter&&letter!==avoid)||pool.find(letter=>letter!==current.letter);
      first.questions[0]=createQuestion(alternate,current.type,pool,{lastCorrectIndex:current.correctIndex},progress,config,random,current.skill);
      built.signature=built.activities.map(activity=>`${activity.kind}:${activity.targetLetter||activity.questions?.map(question=>`${question.letter}${question.type[0]}${question.promptType?.[0]||''}`).join('')}`).join('|');
    }
    return {
      version:1,id:`training-${Date.now().toString(36)}-${Math.floor(random()*1e6).toString(36)}`,
      createdAt:Date.now(),completedAt:null,completed:false,pool,activities:built.activities,activityIndex:0,
      streak:0,bestStreak:0,mistakes:0,seenLetters:[],signature:built.signature
    };
  }

  function currentActivity(session){return session?.activities?.[session.activityIndex]||null;}
  function currentQuestion(session){
    const activity=currentActivity(session);
    return ['quick','blitz'].includes(activity?.kind)?activity.questions?.[activity.questionIndex||0]||null:null;
  }
  function noteCorrect(session,question){
    session.streak=(session.streak||0)+1;session.bestStreak=Math.max(session.bestStreak||0,session.streak);
    question.completed=true;
    if(!session.seenLetters.includes(question.letter))session.seenLetters.push(question.letter);
  }
  function noteMistake(session,question){session.streak=0;session.mistakes=(session.mistakes||0)+1;question.mistakes=(question.mistakes||0)+1;}
  function typeForSkill(skill,random){const types=SKILL_TYPES[skill]||QUESTION_TYPES;return types[Math.floor(random()*types.length)];}

  function activitySlots(session){
    return session.activities.flatMap((activity,activityIndex)=>activity.kind==='balloon'?[{activity,activityIndex,question:null,questionIndex:null,letter:activity.targetLetter}]:(activity.questions||[]).map((question,questionIndex)=>({activity,activityIndex,question,questionIndex,letter:question.letter})));
  }

  function deferImmediateRepeat(session,question,progress,config,random){
    const slots=activitySlots(session),currentIndex=slots.findIndex(slot=>slot.question===question||(slot.activityIndex===session.activityIndex&&slot.activity.kind==='balloon'));
    const next=slots[currentIndex+1];if(currentIndex<0||!next||next.letter!==question.letter)return false;
    const after=slots[currentIndex+2],alternatives=shuffle(session.pool.filter(letter=>letter!==question.letter),random);
    for(const alternate of alternatives){
      const proposed=slots.map((slot,index)=>index===currentIndex+1?alternate:slot.letter);
      if(proposed.some((letter,index)=>index>=2&&letter===proposed[index-1]&&letter===proposed[index-2]))continue;
      if(next.activity.kind==='balloon')next.activity.targetLetter=alternate;
      else{
        const positionState={lastCorrectIndex:question.correctIndex,blockedPositions:[after?.question?.correctIndex]};
        next.activity.questions[next.questionIndex]=createQuestion(alternate,next.question.type,session.pool,positionState,progress,config,random,next.question.skill);
      }
      return true;
    }
    return false;
  }

  function scheduleRetry(session,question,progress={},config=TRAINING_CONFIG,random=Math.random){
    if(!question||question.retryScheduled)return false;
    deferImmediateRepeat(session,question,progress,config,random);
    const gaps=shuffle(Array.from({length:config.retryAfterMax-config.retryAfterMin+1},(_,index)=>config.retryAfterMin+index),random);
    for(const gap of gaps){
      const activityIndex=session.activityIndex+gap+1,activity=session.activities[activityIndex];
      if(!activity||!['quick','blitz'].includes(activity.kind))continue;
      const targetIndex=activity.kind==='quick'?0:Math.min(activity.questions.length-1,Math.max(0,activity.questionIndex||0));
      let previousCorrectIndex=targetIndex>0?activity.questions[targetIndex-1]?.correctIndex:null;
      for(let index=activityIndex-1;previousCorrectIndex==null&&index>=0;index--)previousCorrectIndex=session.activities[index].questions?.at(-1)?.correctIndex??null;
      let nextCorrectIndex=activity.questions[targetIndex+1]?.correctIndex??null;
      for(let index=activityIndex+1;nextCorrectIndex==null&&index<session.activities.length;index++)nextCorrectIndex=session.activities[index].questions?.[0]?.correctIndex??null;
      const positionState={lastCorrectIndex:previousCorrectIndex,blockedPositions:[nextCorrectIndex]};
      const replacement=createQuestion(question.letter,typeForSkill(question.skill,random),session.pool,positionState,progress,config,random,question.skill);
      const targets=session.activities.flatMap(item=>item.kind==='balloon'?[item.targetLetter]:(item.questions||[]).map(candidate=>candidate===activity.questions[targetIndex]?replacement.letter:candidate.letter));
      if(targets.some((letter,index)=>index>=2&&letter===targets[index-1]&&letter===targets[index-2]))continue;
      replacement.retryOf=question.id;activity.questions[targetIndex]=replacement;question.retryScheduled=true;return true;
    }
    return false;
  }

  function advanceQuestion(session){
    const activity=currentActivity(session);if(!activity||!['quick','blitz'].includes(activity.kind))return false;
    if((activity.questionIndex||0)<activity.questions.length-1){activity.questionIndex=(activity.questionIndex||0)+1;return true;}
    return false;
  }
  function advanceActivity(session){session.activityIndex++;return session.activityIndex<session.activities.length;}

  return Object.freeze({QUESTION_TYPES,shuffle,weightedPick,letterWeight,createQuestion,createSession,currentActivity,currentQuestion,noteCorrect,noteMistake,scheduleRetry,advanceQuestion,advanceActivity});
})();
