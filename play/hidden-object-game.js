'use strict';
/* Generic find-object rules and markup. Scene data, persistence, audio and
   course navigation are supplied by the caller. */
const HiddenObjectGame = {
  validate(config) {
    if (!config || typeof config.id!=='string' || !config.id) throw new TypeError('Find-object config needs a stable id');
    const image=config.image;
    if (!image || typeof image.src!=='string' || !Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width<=0 || image.height<=0) throw new TypeError(`Invalid image for ${config.id}`);
    if (!Array.isArray(config.objects) || !config.objects.length) throw new TypeError(`No objects in ${config.id}`);
    const ids=new Set();
    for(const object of config.objects){
      if(!object || typeof object.id!=='string' || !object.id || ids.has(object.id))throw new TypeError(`Invalid or duplicate object id in ${config.id}`);
      if(typeof object.label!=='string' || !object.label)throw new TypeError(`Missing label for ${object.id}`);
      ids.add(object.id);
      const h=object.hotspot;
      if(!h || ![h.x,h.y,h.width,h.height].every(Number.isFinite) || h.x<0 || h.y<0 || h.width<=0 || h.height<=0 || h.x+h.width>100 || h.y+h.height>100)throw new TypeError(`Invalid hotspot for ${object.id}`);
    }
    if(!Array.isArray(config.rounds) || !config.rounds.length)throw new TypeError(`No rounds in ${config.id}`);
    const roundIDs=new Set();
    for(const round of config.rounds){
      if(!round || typeof round.id!=='string' || !round.id || roundIDs.has(round.id) || typeof round.instruction!=='string' || !round.instruction || !Array.isArray(round.targets) || !round.targets.length || new Set(round.targets).size!==round.targets.length || round.targets.some(id=>!ids.has(id)))throw new TypeError(`Invalid round in ${config.id}`);
      roundIDs.add(round.id);
    }
    return true;
  },
  initialState(config) {
    this.validate(config);
    return {gameId:config.id,currentRound:0,foundObjects:[],wrongAttempts:0,gameCompleted:false};
  },
  restore(config,saved) {
    const state=this.initialState(config);
    if(!saved || typeof saved!=='object' || (saved.gameId!=null&&saved.gameId!==config.id))return state;
    if(Number.isInteger(saved.currentRound)&&saved.currentRound>=0&&saved.currentRound<config.rounds.length)state.currentRound=saved.currentRound;
    const targets=this.currentRound(config,state).targets;
    state.foundObjects=Array.isArray(saved.foundObjects)?[...new Set(saved.foundObjects.filter(id=>targets.includes(id)))]:[];
    state.wrongAttempts=Number.isInteger(saved.wrongAttempts)?Math.max(0,Math.min(999,saved.wrongAttempts)):0;
    state.gameCompleted=state.currentRound===config.rounds.length-1&&this.roundComplete(config,state);
    return state;
  },
  currentRound(config,state) {
    return config.rounds[state.currentRound];
  },
  getObject(config,id) {
    return config.objects.find(object=>object.id===id)||null;
  },
  progress(config,state) {
    const total=this.currentRound(config,state).targets.length;
    const found=state.foundObjects.length;
    return {found,total,remaining:Math.max(0,total-found)};
  },
  remaining(config,state) {
    return this.progress(config,state).remaining;
  },
  roundComplete(config,state) {
    return this.currentRound(config,state).targets.every(id=>state.foundObjects.includes(id));
  },
  hint(config,state) {
    return state.wrongAttempts>=3?this.currentRound(config,state).targets.find(id=>!state.foundObjects.includes(id))||null:null;
  },
  choose(config,state,id) {
    if(state.gameId!==config.id || state.gameCompleted || this.roundComplete(config,state))return 'ignored';
    if(state.foundObjects.includes(id))return 'ignored';
    if(!this.currentRound(config,state).targets.includes(id)){
      state.wrongAttempts=Math.min(999,state.wrongAttempts+1);
      return 'retry';
    }
    state.foundObjects.push(id);
    if(!this.roundComplete(config,state))return 'correct';
    if(state.currentRound===config.rounds.length-1){state.gameCompleted=true;return 'game-complete';}
    return 'round-complete';
  },
  next(config,state) {
    if(state.gameId!==config.id || state.gameCompleted || !this.roundComplete(config,state) || state.currentRound>=config.rounds.length-1)return false;
    state.currentRound++;
    state.foundObjects=[];
    state.wrongAttempts=0;
    return true;
  },
  render(config,state,options={}) {
    this.validate(config);
    const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const actions=options.actions||{};
    const action={pick:actions.pick||'find-object-pick',next:actions.next||'find-object-next',continue:actions.continue||'find-object-continue',replay:actions.replay||'find-object-replay',reload:actions.reload||'find-object-reload',repeat:actions.repeat||'repeat'};
    const icon=options.icons||{};
    const game=escape(config.id);
    if(state.gameCompleted){
      const done=config.completion||{};
      return `<section class="interlude find-object-completed" data-find-object-game="${game}">${options.completionVisual||''}<p class="eyebrow">${escape(done.eyebrow||config.title)}</p><h1>${escape(done.title||'Отличная работа!')}</h1>${done.badge?`<div class="group-badge">${escape(done.badge)}</div>`:''}<p>${escape(done.message||'Все предметы найдены!')}</p><button class="primary" data-action="${escape(action.continue)}" data-game="${game}">${escape(done.continueLabel||'Продолжить')} ${icon.arrow||''}</button><button class="text-button" data-action="${escape(action.replay)}" data-game="${game}">${escape(done.replayLabel||'Сыграть ещё раз')}</button></section>`;
    }
    const round=this.currentRound(config,state),progress=this.progress(config,state),copy=config.copy||{};
    const maxWidth=Math.min(config.maxWidth||560,config.image.width);
    return `<section class="find-object-game" data-find-object-game="${game}" aria-labelledby="find-object-title">
      <p class="eyebrow">${escape(config.title)} · ${state.currentRound+1} / ${config.rounds.length}</p>
      <h1 id="find-object-title">${escape(round.instruction)}</h1>
      <p id="find-object-count" class="find-object-count">${escape(copy.foundLabel||'Найдено')}: ${progress.found} / ${progress.total}</p>
      <div class="find-object-scene ${options.debugHotspots?'debug-hotspots':''}" role="group" aria-label="${escape(config.sceneAriaLabel||config.title)}" style="--scene-ratio:${config.image.width/config.image.height};--scene-max:${maxWidth}px">
        <img id="find-object-image" data-game="${game}" src="${escape(config.image.src)}" width="${config.image.width}" height="${config.image.height}" alt="${escape(config.imageAlt||config.title)}" draggable="false" decoding="async">
        ${config.objects.map(object=>{const h=object.hotspot;return `<button type="button" class="find-object-hotspot" data-action="${escape(action.pick)}" data-game="${game}" data-object="${escape(object.id)}" aria-label="${escape(object.label)}" aria-pressed="${state.foundObjects.includes(object.id)}" disabled style="left:${h.x+h.width/2}%;top:${h.y+h.height/2}%;width:${h.width}%;height:${h.height}%"><span class="hotspot-debug" aria-hidden="true">${escape(object.id)}</span><span class="hotspot-check" aria-hidden="true">✓</span></button>`;}).join('')}
      </div>
      <p id="find-object-load-error" class="find-object-load-error" role="alert" hidden>${escape(copy.loadError||'Изображение не загрузилось.')} <button class="text-button" data-action="${escape(action.reload)}" data-game="${game}">${escape(copy.reload||'Попробовать ещё')}</button></p>
      <div class="find-object-controls">
        <p id="find-object-feedback" class="find-object-feedback" role="status" aria-live="polite" aria-atomic="true"></p>
        <button class="primary" id="find-object-next" data-action="${escape(action.next)}" data-game="${game}" hidden>${escape(copy.next||'Дальше')} ${icon.arrow||''}</button>
        <button class="repeat" data-action="${escape(action.repeat)}" aria-label="Повторить задание">${icon.speaker||''} ${escape(copy.repeat||'Послушать')}</button>
      </div>
    </section>`;
  }
};
