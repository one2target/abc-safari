'use strict';

/* Training statistics live inside the existing AppState/localStorage record. */
const TrainingState=(()=>{
  const SKILLS=Object.freeze(['letterName','sound','word']);
  const blankSkill=()=>({attempts:0,mistakes:0});
  const blankLetter=()=>({
    attempts:0,correct:0,mistakes:0,lastSeen:null,
    letterName:blankSkill(),sound:blankSkill(),word:blankSkill()
  });
  const initialState=()=>({version:1,progress:{},activeSession:null,lastSignature:null,history:[]});
  const integer=value=>Number.isFinite(value)?Math.max(0,Math.floor(value)):0;

  function restoreLetter(saved){
    const fresh=blankLetter();
    if(!saved||typeof saved!=='object')return fresh;
    fresh.attempts=integer(saved.attempts);
    fresh.correct=integer(saved.correct);
    fresh.mistakes=integer(saved.mistakes);
    fresh.lastSeen=Number.isFinite(saved.lastSeen)?saved.lastSeen:null;
    for(const skill of SKILLS){
      fresh[skill].attempts=integer(saved[skill]?.attempts);
      fresh[skill].mistakes=integer(saved[skill]?.mistakes);
    }
    return fresh;
  }

  function validSession(session,knownLetters){
    const kinds=new Set(['quick','balloon','river','blitz']);
    return Boolean(session&&typeof session.id==='string'&&Array.isArray(session.pool)&&
      session.pool.length>=3&&session.pool.every(letter=>knownLetters.includes(letter))&&
      Array.isArray(session.activities)&&session.activities.length>0&&
      session.activities.every(activity=>activity&&kinds.has(activity.kind))&&
      Number.isInteger(session.activityIndex)&&session.activityIndex>=0&&session.activityIndex<=session.activities.length);
  }

  function restore(saved,knownLetters=[]){
    const fresh=initialState(),known=[...new Set(knownLetters.filter(letter=>typeof letter==='string'))];
    if(!saved||typeof saved!=='object')return fresh;
    for(const letter of known)if(saved.progress?.[letter])fresh.progress[letter]=restoreLetter(saved.progress[letter]);
    fresh.lastSignature=typeof saved.lastSignature==='string'?saved.lastSignature:null;
    fresh.history=Array.isArray(saved.history)?saved.history.filter(item=>item&&typeof item.id==='string').slice(-20).map(item=>({
      id:item.id,
      completedAt:Number.isFinite(item.completedAt)?item.completedAt:null,
      letters:Array.isArray(item.letters)?[...new Set(item.letters.filter(letter=>known.includes(letter)))]:[],
      bestStreak:integer(item.bestStreak),
      correct:integer(item.correct),
      mistakes:integer(item.mistakes),
      attempts:integer(item.attempts)||integer(item.correct)+integer(item.mistakes),
      perfect:item.perfect===true,
      signature:typeof item.signature==='string'?item.signature:null
    })):[];
    if(validSession(saved.activeSession,known)){
      try{fresh.activeSession=JSON.parse(JSON.stringify(saved.activeSession));}catch(_){fresh.activeSession=null;}
    }
    return fresh;
  }

  function ensureLetter(state,letter){
    if(!state.progress[letter])state.progress[letter]=blankLetter();
    return state.progress[letter];
  }

  function recordAttempt(state,letter,skill,correct,now=Date.now()){
    const entry=ensureLetter(state,letter),bucket=SKILLS.includes(skill)?entry[skill]:entry.letterName;
    entry.attempts++;bucket.attempts++;entry.lastSeen=now;
    if(correct)entry.correct++;else{entry.mistakes++;bucket.mistakes++;}
    return entry;
  }

  function startSession(state,session){state.activeSession=session;return session;}

  function completeSession(state){
    const session=state.activeSession;if(!session)return null;
    session.completed=true;session.completedAt=session.completedAt||Date.now();
    state.lastSignature=session.signature||null;
    state.history.push({
      id:session.id,completedAt:session.completedAt,letters:[...(session.seenLetters||[])],
      bestStreak:session.bestStreak||0,correct:integer(session.correct),mistakes:integer(session.mistakes),
      attempts:integer(session.answers)||integer(session.correct)+integer(session.mistakes),
      perfect:integer(session.mistakes)===0,signature:session.signature||null
    });
    state.history=state.history.slice(-20);
    return session;
  }

  return Object.freeze({SKILLS,blankLetter,initialState,restore,ensureLetter,recordAttempt,startSession,completeSession});
})();
