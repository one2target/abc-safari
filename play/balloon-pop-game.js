'use strict';
/* Reusable Balloon Pop rules and markup. Course navigation, persistence,
   audio, timers and character rendering are supplied by the caller. */
const BalloonPopGame = {
  CONFIG:Object.freeze({
    id:'balloon-ghi',
    targets:Object.freeze(['G','H','I']),
    learnedLetters:Object.freeze(['A','B','C','D','E','F','G','H','I']),
    phases:Object.freeze([
      Object.freeze({id:'name',label:'Имя буквы',perTarget:5}),
      Object.freeze({id:'phonics',label:'Звук буквы',perTarget:3}),
      Object.freeze({id:'quick',label:'Быстрый микс',perTarget:2})
    ])
  }),

  validate(config=this.CONFIG) {
    if(!config || typeof config.id!=='string' || !config.id)throw new TypeError('Balloon Pop needs a stable id');
    if(!Array.isArray(config.targets) || config.targets.length!==3 || new Set(config.targets).size!==3 || config.targets.some(letter=>!config.learnedLetters.includes(letter)))throw new TypeError('Balloon Pop needs three distinct learned targets');
    if(!Array.isArray(config.learnedLetters) || config.learnedLetters.join('')!=='ABCDEFGHI')throw new TypeError('Balloon Pop distractors must be A-I');
    if(!Array.isArray(config.phases) || config.phases.length!==3 || config.phases.some(phase=>!phase.id || !Number.isInteger(phase.perTarget) || phase.perTarget<1))throw new TypeError('Invalid Balloon Pop phases');
    return true;
  },

  shuffledTargets(config=this.CONFIG,random=Math.random) {
    const result=[...config.targets];
    for(let index=result.length-1;index>0;index--){
      const swap=Math.floor(random()*(index+1));
      [result[index],result[swap]]=[result[swap],result[index]];
    }
    return result;
  },

  initialState(config=this.CONFIG,random=Math.random) {
    this.validate(config);
    return {gameId:config.id,phaseIndex:0,targetIndex:0,score:0,totalCorrect:0,wrongStreak:0,quickOrder:this.shuffledTargets(config,random),gameCompleted:false};
  },

  restore(config=this.CONFIG,saved,random=Math.random) {
    const state=this.initialState(config,random);
    if(!saved || typeof saved!=='object' || (saved.gameId!=null && saved.gameId!==config.id))return state;
    const quick=Array.isArray(saved.quickOrder)?saved.quickOrder:[];
    if(quick.length===config.targets.length && new Set(quick).size===config.targets.length && quick.every(letter=>config.targets.includes(letter)))state.quickOrder=[...quick];
    if(Number.isInteger(saved.phaseIndex) && saved.phaseIndex>=0 && saved.phaseIndex<config.phases.length)state.phaseIndex=saved.phaseIndex;
    if(Number.isInteger(saved.targetIndex) && saved.targetIndex>=0 && saved.targetIndex<config.targets.length)state.targetIndex=saved.targetIndex;
    const required=this.currentPhase(config,state).perTarget;
    state.score=Number.isInteger(saved.score)?Math.max(0,Math.min(required,saved.score)):0;
    state.totalCorrect=Number.isInteger(saved.totalCorrect)?Math.max(0,Math.min(30,saved.totalCorrect)):0;
    state.wrongStreak=Number.isInteger(saved.wrongStreak)?Math.max(0,Math.min(999,saved.wrongStreak)):0;
    state.gameCompleted=Boolean(saved.gameCompleted && state.phaseIndex===config.phases.length-1 && state.targetIndex===config.targets.length-1 && state.score===required);
    return state;
  },

  currentPhase(config=this.CONFIG,state) {
    return config.phases[state.phaseIndex];
  },

  target(config=this.CONFIG,state) {
    return state.phaseIndex===config.phases.length-1?state.quickOrder[state.targetIndex]:config.targets[state.targetIndex];
  },

  progress(config=this.CONFIG,state) {
    const phase=this.currentPhase(config,state);
    if(phase.id==='quick')return {value:state.targetIndex*phase.perTarget+state.score,max:config.targets.length*phase.perTarget};
    return {value:state.score,max:phase.perTarget};
  },

  hint(config=this.CONFIG,state) {
    return state.wrongStreak>=3?this.target(config,state):null;
  },

  tap(config=this.CONFIG,state,letter) {
    if(state.gameId!==config.id || state.gameCompleted || !config.learnedLetters.includes(letter))return 'ignored';
    if(letter!==this.target(config,state)){
      state.wrongStreak=Math.min(999,state.wrongStreak+1);
      return 'wrong';
    }
    state.score++;
    state.totalCorrect=Math.min(30,state.totalCorrect+1);
    state.wrongStreak=0;
    const phase=this.currentPhase(config,state);
    if(state.score<phase.perTarget)return 'correct';
    if(state.targetIndex<config.targets.length-1){
      state.targetIndex++;
      state.score=0;
      return 'target-complete';
    }
    if(state.phaseIndex<config.phases.length-1){
      state.phaseIndex++;
      state.targetIndex=0;
      state.score=0;
      return 'phase-complete';
    }
    state.gameCompleted=true;
    return 'game-complete';
  },

  createBalloonLetters(config=this.CONFIG,target,count=6,random=Math.random) {
    const length=Math.max(5,Math.min(7,Math.round(count)));
    if(!config.targets.includes(target))throw new TypeError('Balloon target must be G, H or I');
    const weighted=[...config.learnedLetters,...config.targets,...config.targets];
    const letters=[target];
    if(length>=6)letters.push(target);
    while(letters.length<length)letters.push(weighted[Math.floor(random()*weighted.length)]);
    for(let index=letters.length-1;index>0;index--){
      const swap=Math.floor(random()*(index+1));
      [letters[index],letters[swap]]=[letters[swap],letters[index]];
    }
    return letters;
  },

  replacementLetter(config=this.CONFIG,letters,replacingIndex,target,random=Math.random) {
    if(!config.targets.includes(target))return target;
    const remaining=letters.filter((_,index)=>index!==replacingIndex);
    if(!remaining.includes(target))return target;
    const weighted=[...config.learnedLetters,...config.targets,...config.targets];
    return weighted[Math.floor(random()*weighted.length)];
  },

  createBalloons(config=this.CONFIG,state,count=6,random=Math.random) {
    const target=this.target(config,state),letters=this.createBalloonLetters(config,target,count,random);
    const lanes=letters.map((_,index)=>16+(68*(index+.5)/letters.length));
    for(let index=lanes.length-1;index>0;index--){
      const swap=Math.floor(random()*(index+1));
      [lanes[index],lanes[swap]]=[lanes[swap],lanes[index]];
    }
    const speed=this.currentPhase(config,state).id==='quick'?.82:1;
    return letters.map((letter,index)=>({
      id:`balloon-${index}`,
      letter,
      x:Math.max(15,Math.min(85,lanes[index]+(random()-.5)*4)),
      size:Math.round(72+random()*23),
      duration:Number(((13+random()*5)*speed).toFixed(2)),
      delay:Number((-(index/letters.length)*(11+random()*3)).toFixed(2)),
      drift:Math.round(10+random()*16),
      staticY:[7,31,57,18,44,68,76][index],
      color:index%6
    }));
  },

  render(config=this.CONFIG,state,options={}) {
    this.validate(config);
    const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const game=escape(config.id),copy=options.copy||{},actions=options.actions||{};
    const action={pop:actions.pop||'balloon-pop',repeat:actions.repeat||'balloon-repeat',continue:actions.continue||'balloon-continue'};
    if(state.gameCompleted){
      return `<section class="balloon-pop-game balloon-pop-success" data-balloon-pop-game="${game}">${options.successVisual||''}<p class="eyebrow">${escape(copy.successEyebrow||'Balloon Pop')}</p><h1>${escape(copy.successTitle||'Отлично! G, H и I готовы!')}</h1><p>${escape(copy.successMessage||'Все шарики лопнули — время за наградой.')}</p><button class="primary" data-action="${escape(action.continue)}">${escape(copy.continueLabel||'Получить награду')} ${options.icons?.arrow||''}</button></section>`;
    }
    const phase=this.currentPhase(config,state),target=this.target(config,state),progress=this.progress(config,state),balloons=options.balloons||this.createBalloons(config,state);
    const phaseTitle=copy[phase.id]||phase.label;
    return `<section class="balloon-pop-game" data-balloon-pop-game="${game}" data-phase="${escape(phase.id)}" aria-labelledby="balloon-pop-title">
      <header class="balloon-pop-header">
        <p class="balloon-pop-kicker">${escape(copy.title||'Balloon Pop')} · ${state.phaseIndex+1} / ${config.phases.length}</p>
        <div class="balloon-pop-task">
          <div><p>${escape(copy.instruction||'Лопни букву')}</p><h1 id="balloon-pop-title" class="balloon-pop-target" data-balloon-target data-letter="${escape(target)}">${escape(target)}</h1></div>
          <button class="balloon-pop-repeat" data-action="${escape(action.repeat)}" aria-label="${escape(copy.repeatLabel||'Повторить задание')}">${options.icons?.speaker||'🔊'}</button>
        </div>
        <div class="balloon-pop-meta"><span>${escape(phaseTitle)}</span><strong id="balloon-pop-score">${progress.value} / ${progress.max}</strong></div>
        <div class="balloon-pop-progress" role="progressbar" aria-label="${escape(copy.progressLabel||'Прогресс раунда')}" aria-valuemin="0" aria-valuemax="${progress.max}" aria-valuenow="${progress.value}">${Array.from({length:progress.max},(_,index)=>`<span class="${index<progress.value?'done':index===progress.value?'current':''}"></span>`).join('')}</div>
      </header>
      <div class="balloon-pop-field" role="group" aria-label="${escape(copy.fieldLabel||'Воздушные шарики с буквами')}">
        ${balloons.map((balloon,index)=>`<button type="button" class="balloon-pop-balloon color-${balloon.color}" data-action="${escape(action.pop)}" data-index="${index}" data-letter="${escape(balloon.letter)}" aria-label="Буква ${escape(balloon.letter)}" style="--balloon-x:${balloon.x};--balloon-size:${balloon.size}px;--balloon-duration:${balloon.duration}s;--balloon-delay:${balloon.delay}s;--balloon-drift:${balloon.drift}px;--balloon-y:${balloon.staticY}%"><span class="balloon-pop-shape"><span class="balloon-pop-letter">${escape(balloon.letter)}</span></span></button>`).join('')}
        <div class="balloon-pop-character" aria-hidden="true">${options.characterHTML||''}</div>
        <div id="balloon-pop-feedback" class="balloon-pop-feedback" role="status" aria-live="polite"></div>
      </div>
    </section>`;
  }
};
