'use strict';
/* Reusable Balloon Pop rules and markup. Course navigation, persistence,
   audio, timers and character rendering are supplied by the caller. */
const BalloonPopGame = {
  SPAWN:Object.freeze({
    targetProbability:.35,
    minCount:7,
    maxCount:10,
    mobileCount:7,
    desktopCount:9
  }),

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

  randomBalloonLetter(config=this.CONFIG,target,random=Math.random,forceTarget=false) {
    if(!config.targets.includes(target))throw new TypeError('Balloon target must be G, H or I');
    if(forceTarget||random()<this.SPAWN.targetProbability)return target;
    const distractors=config.learnedLetters.filter(letter=>letter!==target);
    return distractors[Math.floor(random()*distractors.length)];
  },

  spacedBalloonX(x,previousX,minGap=12) {
    const next=Number(x),previous=Number(previousX),gap=Math.max(0,Number(minGap)||0);
    if(!Number.isFinite(previous)||!Number.isFinite(next)||Math.abs(next-previous)>=gap)return next;
    return previous<50?Math.min(85,previous+Math.max(gap,18)):Math.max(15,previous-Math.max(gap,18));
  },

  createBalloonLetters(config=this.CONFIG,target,count=8,random=Math.random,minimumTargetCount=1) {
    const length=Math.max(this.SPAWN.minCount,Math.min(this.SPAWN.maxCount,Math.round(count)));
    if(!config.targets.includes(target))throw new TypeError('Balloon target must be G, H or I');
    const requestedTargets=Number.isFinite(minimumTargetCount)?Math.round(minimumTargetCount):1;
    const targetCount=Math.max(0,Math.min(length,requestedTargets));
    const letters=Array.from({length},()=>this.randomBalloonLetter(config,target,random));
    for(let missing=targetCount-letters.filter(letter=>letter===target).length;missing>0;missing--){
      const index=letters.findIndex(letter=>letter!==target);
      if(index>=0)letters[index]=target;
    }
    for(let index=letters.length-1;index>0;index--){
      const swap=Math.floor(random()*(index+1));
      [letters[index],letters[swap]]=[letters[swap],letters[index]];
    }
    return letters;
  },

  replacementLetter(config=this.CONFIG,letters,replacingIndex,target,random=Math.random,minimumTargetCount=1) {
    if(!config.targets.includes(target))return target;
    const remaining=letters.filter((_,index)=>index!==replacingIndex);
    const requestedTargets=Number.isFinite(minimumTargetCount)?Math.round(minimumTargetCount):1;
    const requiredTargets=Math.max(1,Math.min(letters.length,requestedTargets));
    if(remaining.filter(letter=>letter===target).length<requiredTargets)return target;
    return this.randomBalloonLetter(config,target,random);
  },

  createBalloons(config=this.CONFIG,state,count=8,random=Math.random) {
    const target=this.target(config,state);
    const letters=this.createBalloonLetters(config,target,count,random,1);
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
      staticY:[7,31,57,18,44,68,76,12,52,34][index],
      color:index%6
    }));
  },

  renderBalloon(balloon,index=0,action='balloon-pop') {
    const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    return `<button type="button" class="balloon-pop-balloon color-${balloon.color}" data-action="${escape(action)}" data-index="${index}" data-letter="${escape(balloon.letter)}" data-duration="${balloon.duration}" aria-label="Буква ${escape(balloon.letter)}" style="--balloon-x:${balloon.x};--balloon-size:${balloon.size}px;--balloon-duration:${balloon.duration}s;--balloon-delay:${balloon.delay}s;--balloon-drift:${balloon.drift}px;--balloon-y:${balloon.staticY}%"><span class="balloon-pop-shape"><span class="balloon-pop-letter">${escape(balloon.letter)}</span></span></button>`;
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
        <div class="balloon-pop-balloons" data-balloon-container>${balloons.map((balloon,index)=>this.renderBalloon(balloon,index,action.pop)).join('')}</div>
        <div class="balloon-pop-character" aria-hidden="true">${options.characterHTML||''}</div>
        <div id="balloon-pop-feedback" class="balloon-pop-feedback" role="status" aria-live="polite"></div>
      </div>
    </section>`;
  }
};
