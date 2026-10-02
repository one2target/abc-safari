'use strict';
/* Reusable river-crossing rules and markup. Course routing, training routing,
   persistence, audio and the shared Marius renderer stay in play/index.html. */
const RiverCrossingGame=(()=>{
  const TYPES=Object.freeze(['name','sound','word','pictureLetter','letterPicture']);
  const CONFIG=Object.freeze({
    id:'marius-river-jkl',targets:Object.freeze(['J','K','L']),totalQuestions:12,
    stages:Object.freeze([
      Object.freeze({id:'names',type:'name',title:'Названия букв',prompt:'Послушай и найди букву'}),
      Object.freeze({id:'sounds',type:'sound',title:'Звуки букв',prompt:'Найди букву по звуку'}),
      Object.freeze({id:'words',type:'word',title:'Слова',prompt:'Послушай и выбери картинку'}),
      Object.freeze({id:'final',type:'mixed',title:'Финальное испытание',prompt:'Слушай внимательно и выбирай'})
    ]),
    answers:Object.freeze({J:Object.freeze({word:'Juice',visual:'🧃'}),K:Object.freeze({word:'Kite',visual:'🪁'}),L:Object.freeze({word:'Lion',visual:'🦁'})}),
    route:Object.freeze([
      Object.freeze({x:51,y:77,label:'Стартовый берег'}),Object.freeze({x:45,y:68,label:'Первый камень'}),
      Object.freeze({x:51,y:59,label:'Второй камень'}),Object.freeze({x:64,y:51,label:'Третий камень'}),
      Object.freeze({x:54,y:44.5,label:'Четвёртый камень'}),Object.freeze({x:40,y:38,label:'Пятый камень'}),
      Object.freeze({x:63,y:28,label:'Противоположный берег'})
    ])
  });

  function shuffle(items,random=Math.random){const result=[...items];for(let index=result.length-1;index>0;index--){const other=Math.floor(random()*(index+1));[result[index],result[other]]=[result[other],result[index]];}return result;}
  function validate(config){
    return Boolean(config&&config.id&&Number.isInteger(config.totalQuestions)&&config.totalQuestions>0&&
      Array.isArray(config.targets)&&config.targets.length>=3&&new Set(config.targets).size===config.targets.length&&
      Array.isArray(config.stages)&&config.stages.length>=1&&config.targets.every(letter=>config.answers?.[letter]?.word&&config.answers?.[letter]?.visual)&&
      Array.isArray(config.route)&&config.route.length>=2&&config.route.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y))&&
      (!config.questions||(Array.isArray(config.questions)&&config.questions.length===config.totalQuestions)));
  }
  function createQuestions(config=CONFIG,random=Math.random){
    if(!validate(config))throw new Error('Invalid river-crossing config');
    if(config.questions)return config.questions.map((question,index)=>({...question,id:question.id||`question-${index+1}`,options:[...question.options]}));
    const questions=[];
    for(let stageIndex=0;stageIndex<3;stageIndex++){
      const stage=config.stages[stageIndex];
      for(const letter of shuffle(config.targets,random))questions.push({id:`${stage.id}-${letter.toLowerCase()}`,stage:stage.id,type:stage.type,letter,options:shuffle(config.targets,random)});
    }
    const mixedTypes=shuffle(TYPES.slice(0,3),random);
    for(const [index,letter] of shuffle(config.targets,random).entries())questions.push({id:`final-${index+1}-${letter.toLowerCase()}`,stage:'final',type:mixedTypes[index],letter,options:shuffle(config.targets,random)});
    return questions;
  }
  function validQuestion(config,question){
    const stage=config.stages.find(item=>item.id===question?.stage);
    return Boolean(question&&typeof question.id==='string'&&stage&&TYPES.includes(question.type)&&config.targets.includes(question.letter)&&
      Array.isArray(question.options)&&question.options.length>=3&&question.options.length<=4&&new Set(question.options).size===question.options.length&&
      question.options.includes(question.letter)&&question.options.every(letter=>config.targets.includes(letter))&&(stage.type==='mixed'||question.type===stage.type));
  }
  function initialState(config=CONFIG,random=Math.random){return {gameId:config.id,questionIndex:0,correct:0,wrongAttempts:0,questions:createQuestions(config,random),gameCompleted:false};}
  function restore(config=CONFIG,saved,random=Math.random){
    if(!saved||saved.gameId!==config.id||!Array.isArray(saved.questions)||saved.questions.length!==config.totalQuestions||saved.questions.some(question=>!validQuestion(config,question)))return initialState(config,random);
    const correct=Number.isInteger(saved.correct)?Math.max(0,Math.min(config.totalQuestions,saved.correct)):0;
    const questionIndex=Number.isInteger(saved.questionIndex)?Math.max(0,Math.min(config.totalQuestions,saved.questionIndex)):correct;
    if(questionIndex!==correct)return initialState(config,random);
    return {gameId:config.id,questionIndex,correct,wrongAttempts:Number.isInteger(saved.wrongAttempts)?Math.max(0,Math.min(99,saved.wrongAttempts)):0,questions:saved.questions.map(question=>({...question,options:[...question.options]})),gameCompleted:correct===config.totalQuestions};
  }
  function currentQuestion(config=CONFIG,state){return state?.questions?.[state.questionIndex]||null;}
  function currentStage(config=CONFIG,state){const question=currentQuestion(config,state),stage=config.stages.find(item=>item.id===question?.stage);return stage||config.stages.at(-1);}
  function platformIndex(config=CONFIG,state){const correct=Math.max(0,Math.min(config.totalQuestions,state?.correct||0));return Math.max(0,Math.min(config.route.length-1,Math.floor(correct*(config.route.length-1)/config.totalQuestions)));}
  function hint(config=CONFIG,state){const threshold=Number.isInteger(config.hintAfterMistakes)?Math.max(1,config.hintAfterMistakes):3;return state?.wrongAttempts>=threshold?currentQuestion(config,state)?.letter||null:null;}
  function progress(config=CONFIG,state){return {value:state?.correct||0,max:config.totalQuestions,platform:platformIndex(config,state)};}
  function answer(config=CONFIG,state,letter){
    const question=currentQuestion(config,state);if(!question||state.gameCompleted)return 'ignored';
    if(letter!==question.letter){state.wrongAttempts++;return 'wrong';}
    const before=platformIndex(config,state);state.correct++;state.questionIndex++;state.wrongAttempts=0;
    if(state.correct>=config.totalQuestions){state.correct=config.totalQuestions;state.questionIndex=config.totalQuestions;state.gameCompleted=true;return 'game-complete';}
    return platformIndex(config,state)>before?'jump':'reaction';
  }
  function escapeHTML(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function answerMarkup(config,question,letter,hinted,action){
    const item=config.answers[letter],pictureAnswer=question.answerType==='image'||['word','letterPicture'].includes(question.type);
    const visible=pictureAnswer?`<span class="river-answer-picture" aria-hidden="true">${escapeHTML(item.visual)}</span>`:`<span class="river-answer-letter" aria-hidden="true">${escapeHTML(letter)}</span>`,label=pictureAnswer?item.word:`Буква ${letter}`;
    return `<button class="river-answer${hinted===letter?' is-hint':''}" data-action="${escapeHTML(action)}" data-letter="${escapeHTML(letter)}" aria-label="${escapeHTML(label)}">${visible}</button>`;
  }
  function render(config=CONFIG,state,options={}){
    const progressValue=progress(config,state),stage=currentStage(config,state),background=options.backgroundSource||'',character=options.characterHTML||'',icons=options.icons||{},copy=options.copy||{},actions=options.actions||{};
    const action={answer:actions.answer||'river-answer',repeat:actions.repeat||'river-repeat',continue:actions.continue||'river-continue',replay:actions.replay||'river-replay'};
    const routeAnchors=config.route.slice(1,-1).map((point,index)=>`<span class="river-route-anchor river-route-anchor-${index+1}" style="--stone-x:${point.x}%;--stone-y:${point.y}%" aria-hidden="true"></span>`).join('');
    const backgroundMarkup=background?`<img class="river-background" src="${escapeHTML(background)}" data-river-background alt="Иллюстрированная переправа через реку с водопадом и сундуком" draggable="false">`:`<p class="river-asset-error" role="alert">Не удалось загрузить фон переправы.</p>`;
    const chestGlow=`<span class="river-chest-hotspot${state.gameCompleted?' is-open':''}" aria-hidden="true"></span>`;
    const sparkX=[-58,-38,0,40,60,42,0,-44],sparkY=[-24,-50,-58,-48,-18,34,48,32],sparkDelay=[.58,.66,.72,.62,.76,.84,.9,.8];
    const rewardAnimation=`<div class="river-reward-animation" aria-hidden="true"><span class="river-reward-star river-reward-star-1">★</span><span class="river-reward-star river-reward-star-2">★</span><span class="river-reward-star river-reward-star-3">★</span>${sparkX.map((x,index)=>`<i class="river-reward-spark" style="--spark-dx:${x}px;--spark-dy:${sparkY[index]}px;--spark-delay:${sparkDelay[index]}s"></i>`).join('')}</div>`;
    const actorPoint=config.route[progressValue.platform],actor=`<div id="river-marius" class="river-marius${state.gameCompleted?' is-celebrating':''}" data-platform="${progressValue.platform}" style="--river-x:${actorPoint.x}%;--river-y:${actorPoint.y}%">${character}</div>`;
    const backgroundMode=background?'image':'missing',title=copy.title||'Переправа Мариуса';
    if(state.gameCompleted)return `<section class="river-game is-complete" data-river-game data-background-mode="${backgroundMode}"><header class="river-game-header"><div><p>${escapeHTML(title)}</p><h1>${escapeHTML(copy.successTitle||'Мы на другом берегу!')}</h1></div><strong id="river-progress">${progressValue.max} / ${progressValue.max}</strong></header><div class="river-scene" aria-label="Мариус завершил переправу">${backgroundMarkup}${routeAnchors}${chestGlow}${actor}${rewardAnimation}</div><div class="river-finish"><h2>${escapeHTML(copy.successMessage||'Ура! Ты помог Мариусу перебраться через реку!')}</h2><p>${escapeHTML(copy.successDetail||'Буквы J, K и L теперь знакомы ещё лучше.')}</p><button class="primary" data-action="${escapeHTML(action.continue)}">${escapeHTML(copy.continueLabel||'Продолжить')} ${icons.arrow||''}</button>${copy.hideReplay?'':`<button class="text-button" data-action="${escapeHTML(action.replay)}">${escapeHTML(copy.replayLabel||'Сыграть ещё раз')}</button>`}</div></section>`;
    const question=currentQuestion(config,state),hinted=hint(config,state),visualPrompt=question.type==='pictureLetter'?`<span class="river-training-cue" aria-hidden="true">${escapeHTML(config.answers[question.letter].visual)}</span>`:question.type==='letterPicture'?`<span class="river-training-cue is-letter" aria-hidden="true">${escapeHTML(question.letter)}</span>`:'';
    return `<section class="river-game" data-river-game data-background-mode="${backgroundMode}"><header class="river-game-header"><div><p>${escapeHTML(title)}</p><h1>${escapeHTML(stage.title)}</h1></div><strong id="river-progress" role="status">${progressValue.value} / ${progressValue.max}</strong></header><div class="river-progress-track" role="progressbar" aria-label="Прогресс переправы" aria-valuemin="0" aria-valuemax="${progressValue.max}" aria-valuenow="${progressValue.value}">${Array.from({length:progressValue.max},(_,index)=>`<i class="${index<progressValue.value?'done':index===progressValue.value?'current':''}"></i>`).join('')}</div><div class="river-scene" aria-label="Путь Мариуса через реку">${backgroundMarkup}${routeAnchors}${chestGlow}${actor}<div id="river-particles" aria-hidden="true"></div></div><div class="river-task"><p class="river-task-label">${escapeHTML(question.prompt||stage.prompt)}</p>${visualPrompt||`<button class="river-repeat" data-action="${escapeHTML(action.repeat)}" aria-label="Повторить текущее задание">${icons.speaker||'🔊'}<span>Послушать ещё</span></button>`}</div><div class="river-answers river-answers--${question.options.length}" data-answer-count="${question.options.length}" role="group" aria-label="Варианты ответа">${question.options.map(letter=>answerMarkup(config,question,letter,hinted,action.answer)).join('')}</div><p id="river-feedback" class="river-feedback" role="status" aria-live="polite">${hinted?'Посмотри: нужный вариант мягко светится.':' '}</p></section>`;
  }
  return Object.freeze({CONFIG,TYPES,shuffle,validate,createQuestions,initialState,restore,currentQuestion,currentStage,platformIndex,hint,progress,answer,render});
})();
