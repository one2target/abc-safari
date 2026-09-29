'use strict';
/* Pure rules and markup for the J/K/L river-crossing practice. Course routing,
   persistence, audio and the shared Marius renderer stay in play/index.html. */
const RiverCrossingGame=(()=>{
  const TYPES=Object.freeze(['name','sound','word']);
  const CONFIG=Object.freeze({
    id:'marius-river-jkl',
    targets:Object.freeze(['J','K','L']),
    totalQuestions:12,
    stages:Object.freeze([
      Object.freeze({id:'names',type:'name',title:'Названия букв',prompt:'Послушай и найди букву'}),
      Object.freeze({id:'sounds',type:'sound',title:'Звуки букв',prompt:'Найди букву по звуку'}),
      Object.freeze({id:'words',type:'word',title:'Слова',prompt:'Послушай и выбери картинку'}),
      Object.freeze({id:'final',type:'mixed',title:'Финальное испытание',prompt:'Слушай внимательно и выбирай'})
    ]),
    answers:Object.freeze({
      J:Object.freeze({word:'Juice',visual:'🧃'}),
      K:Object.freeze({word:'Kite',visual:'🪁'}),
      L:Object.freeze({word:'Lion',visual:'🦁'})
    }),
    route:Object.freeze([
      Object.freeze({x:51,y:77,label:'Стартовый берег'}),
      Object.freeze({x:45,y:68,label:'Первый камень'}),
      Object.freeze({x:51,y:59,label:'Второй камень'}),
      Object.freeze({x:64,y:51,label:'Третий камень'}),
      Object.freeze({x:54,y:44.5,label:'Четвёртый камень'}),
      Object.freeze({x:40,y:38,label:'Пятый камень'}),
      Object.freeze({x:63,y:28,label:'Противоположный берег'})
    ])
  });

  function shuffle(items,random=Math.random){
    const result=[...items];
    for(let index=result.length-1;index>0;index--){
      const other=Math.floor(random()*(index+1));
      [result[index],result[other]]=[result[other],result[index]];
    }
    return result;
  }
  function validate(config){
    return Boolean(config&&config.id&&config.totalQuestions===12&&
      Array.isArray(config.targets)&&config.targets.length===3&&new Set(config.targets).size===3&&
      Array.isArray(config.stages)&&config.stages.length===4&&
      config.targets.every(letter=>config.answers?.[letter]?.word&&config.answers?.[letter]?.visual)&&
      Array.isArray(config.route)&&config.route.length===7&&config.route.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)));
  }
  function createQuestions(config=CONFIG,random=Math.random){
    if(!validate(config))throw new Error('Invalid river-crossing config');
    const questions=[];
    for(let stageIndex=0;stageIndex<3;stageIndex++){
      const stage=config.stages[stageIndex];
      for(const letter of shuffle(config.targets,random))questions.push({
        id:`${stage.id}-${letter.toLowerCase()}`,
        stage:stage.id,
        type:stage.type,
        letter,
        options:shuffle(config.targets,random)
      });
    }
    const mixedTypes=shuffle(TYPES,random);
    for(const [index,letter] of shuffle(config.targets,random).entries())questions.push({
      id:`final-${index+1}-${letter.toLowerCase()}`,
      stage:'final',
      type:mixedTypes[index],
      letter,
      options:shuffle(config.targets,random)
    });
    return questions;
  }
  function validQuestion(config,question,index){
    const expectedStage=config.stages[Math.floor(index/3)]?.id;
    return Boolean(question&&typeof question.id==='string'&&question.stage===expectedStage&&
      TYPES.includes(question.type)&&config.targets.includes(question.letter)&&
      Array.isArray(question.options)&&question.options.length===3&&
      new Set(question.options).size===3&&question.options.includes(question.letter)&&
      question.options.every(letter=>config.targets.includes(letter))&&
      (expectedStage==='final'||question.type===config.stages[Math.floor(index/3)].type));
  }
  function initialState(config=CONFIG,random=Math.random){
    return {gameId:config.id,questionIndex:0,correct:0,wrongAttempts:0,questions:createQuestions(config,random),gameCompleted:false};
  }
  function restore(config=CONFIG,saved,random=Math.random){
    if(!saved||saved.gameId!==config.id||!Array.isArray(saved.questions)||
      saved.questions.length!==config.totalQuestions||!saved.questions.every((question,index)=>validQuestion(config,question,index)))return initialState(config,random);
    const correct=Number.isInteger(saved.correct)?Math.max(0,Math.min(config.totalQuestions,saved.correct)):0;
    const questionIndex=Number.isInteger(saved.questionIndex)?Math.max(0,Math.min(config.totalQuestions,saved.questionIndex)):correct;
    if(questionIndex!==correct)return initialState(config,random);
    return {
      gameId:config.id,
      questionIndex,
      correct,
      wrongAttempts:Number.isInteger(saved.wrongAttempts)?Math.max(0,Math.min(99,saved.wrongAttempts)):0,
      questions:saved.questions.map(question=>({...question,options:[...question.options]})),
      gameCompleted:correct===config.totalQuestions
    };
  }
  function currentQuestion(config=CONFIG,state){return state?.questions?.[state.questionIndex]||null;}
  function currentStage(config=CONFIG,state){return config.stages[Math.min(config.stages.length-1,Math.floor((state?.questionIndex||0)/3))];}
  function platformIndex(config=CONFIG,state){return Math.max(0,Math.min(config.route.length-1,Math.floor((state?.correct||0)/2)));}
  function hint(config=CONFIG,state){return state?.wrongAttempts>=3?currentQuestion(config,state)?.letter||null:null;}
  function progress(config=CONFIG,state){return {value:state?.correct||0,max:config.totalQuestions,platform:platformIndex(config,state)};}
  function answer(config=CONFIG,state,letter){
    const question=currentQuestion(config,state);
    if(!question||state.gameCompleted)return 'ignored';
    if(letter!==question.letter){state.wrongAttempts++;return 'wrong';}
    state.correct++;state.questionIndex++;state.wrongAttempts=0;
    if(state.correct>=config.totalQuestions){state.correct=config.totalQuestions;state.questionIndex=config.totalQuestions;state.gameCompleted=true;return 'game-complete';}
    return state.correct%2===0?'jump':'reaction';
  }
  function escapeHTML(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function answerMarkup(config,question,letter,hinted){
    const item=config.answers[letter],wordQuestion=question.type==='word';
    const visible=wordQuestion?`<span class="river-answer-picture" aria-hidden="true">${escapeHTML(item.visual)}</span>`:`<span class="river-answer-letter" aria-hidden="true">${escapeHTML(letter)}</span>`;
    const label=wordQuestion?item.word:`Буква ${letter}`;
    return `<button class="river-answer${hinted===letter?' is-hint':''}" data-action="river-answer" data-letter="${escapeHTML(letter)}" aria-label="${escapeHTML(label)}">${visible}</button>`;
  }
  function render(config=CONFIG,state,options={}){
    const progressValue=progress(config,state),stage=currentStage(config,state),background=options.backgroundSource||'',character=options.characterHTML||'',icons=options.icons||{};
    const routeAnchors=config.route.slice(1,-1).map((point,index)=>`<span class="river-route-anchor river-route-anchor-${index+1}" style="--stone-x:${point.x}%;--stone-y:${point.y}%" aria-hidden="true"></span>`).join('');
    const backgroundMarkup=background?`<img class="river-background" src="${escapeHTML(background)}" data-river-background alt="Иллюстрированная переправа через реку с водопадом и сундуком" draggable="false">`:`<p class="river-asset-error" role="alert">Не удалось загрузить фон переправы.</p>`;
    const chestGlow=`<span class="river-chest-hotspot${state.gameCompleted?' is-open':''}" aria-hidden="true"></span>`;
    const rewardAnimation=`<div class="river-reward-animation" aria-hidden="true">
      <span class="river-reward-star river-reward-star-1">★</span><span class="river-reward-star river-reward-star-2">★</span><span class="river-reward-star river-reward-star-3">★</span>
      <i class="river-reward-spark" style="--spark-dx:-58px;--spark-dy:-24px;--spark-delay:.58s"></i><i class="river-reward-spark" style="--spark-dx:-38px;--spark-dy:-50px;--spark-delay:.66s"></i><i class="river-reward-spark" style="--spark-dx:0px;--spark-dy:-58px;--spark-delay:.72s"></i><i class="river-reward-spark" style="--spark-dx:40px;--spark-dy:-48px;--spark-delay:.62s"></i><i class="river-reward-spark" style="--spark-dx:60px;--spark-dy:-18px;--spark-delay:.76s"></i><i class="river-reward-spark" style="--spark-dx:42px;--spark-dy:34px;--spark-delay:.84s"></i><i class="river-reward-spark" style="--spark-dx:0px;--spark-dy:48px;--spark-delay:.9s"></i><i class="river-reward-spark" style="--spark-dx:-44px;--spark-dy:32px;--spark-delay:.8s"></i>
    </div>`;
    const actorPoint=config.route[progressValue.platform];
    const actor=`<div id="river-marius" class="river-marius${state.gameCompleted?' is-celebrating':''}" data-platform="${progressValue.platform}" style="--river-x:${actorPoint.x}%;--river-y:${actorPoint.y}%">${character}</div>`;
    const backgroundMode=background?'image':'missing';
    if(state.gameCompleted)return `<section class="river-game is-complete" data-river-game data-background-mode="${backgroundMode}">
      <header class="river-game-header"><div><p>Переправа Мариуса</p><h1>Мы на другом берегу!</h1></div><strong id="river-progress">12 / 12</strong></header>
      <div class="river-scene" aria-label="Мариус завершил переправу">${backgroundMarkup}${routeAnchors}${chestGlow}${actor}${rewardAnimation}</div>
      <div class="river-finish"><h2>Ура! Ты помог Мариусу перебраться через реку!</h2><p>Буквы J, K и L теперь знакомы ещё лучше.</p><button class="primary" data-action="river-continue">Продолжить ${icons.arrow||''}</button><button class="text-button" data-action="river-replay">Сыграть ещё раз</button></div>
    </section>`;
    const question=currentQuestion(config,state),hinted=hint(config,state);
    return `<section class="river-game" data-river-game data-background-mode="${backgroundMode}">
      <header class="river-game-header"><div><p>Переправа Мариуса</p><h1>${escapeHTML(stage.title)}</h1></div><strong id="river-progress" role="status">${progressValue.value} / ${progressValue.max}</strong></header>
      <div class="river-progress-track" role="progressbar" aria-label="Прогресс переправы" aria-valuemin="0" aria-valuemax="12" aria-valuenow="${progressValue.value}">${Array.from({length:12},(_,index)=>`<i class="${index<progressValue.value?'done':index===progressValue.value?'current':''}"></i>`).join('')}</div>
      <div class="river-scene" aria-label="Путь Мариуса через реку">${backgroundMarkup}${routeAnchors}${chestGlow}${actor}<div id="river-particles" aria-hidden="true"></div></div>
      <div class="river-task"><p class="river-task-label">${escapeHTML(stage.prompt)}</p><button class="river-repeat" data-action="river-repeat" aria-label="Повторить текущее задание">${icons.speaker||'🔊'}<span>Послушать ещё</span></button></div>
      <div class="river-answers" role="group" aria-label="Три варианта ответа">${question.options.map(letter=>answerMarkup(config,question,letter,hinted)).join('')}</div>
      <p id="river-feedback" class="river-feedback" role="status" aria-live="polite">${hinted?'Посмотри: нужный вариант мягко светится.':' '}</p>
    </section>`;
  }

  return Object.freeze({CONFIG,TYPES,shuffle,validate,createQuestions,initialState,restore,currentQuestion,currentStage,platformIndex,hint,progress,answer,render});
})();
