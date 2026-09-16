'use strict';
/* Coordinates are percentages of the complete image, measured from its top left.
   Change only this flag/config to inspect or tune a scene; no player debug UI. */
const DEBUG_HOTSPOTS = false;
const ROOM_HOTSPOTS = {
  letterA: {x:56,   y:11,   width:12,   height:10,   label:'Letter A',    audio:'a_name'},
  letterB: {x:68,   y:24,   width:11.5, height:10,   label:'Letter B',    audio:'b_name'},
  letterC: {x:61.5, y:37,   width:12.5, height:11, label:'Letter C',    audio:'c_name'},
  apple:   {x:81.5, y:44,   width:10,   height:8,    label:'Apple',       audio:'apple'},
  ball:    {x:65,   y:73.5, width:18,   height:15,   label:'Soccer ball', audio:'ball'},
  cat:     {x:0.5,  y:39,   width:17.5, height:17,   label:'Cat',         audio:'cat'}
};
const ROOM_ROUNDS = [
  {id:'a', targets:['letterA','apple'], instruction:'Найди A и apple!'},
  {id:'b', targets:['letterB','ball'],  instruction:'Найди B и ball!'},
  {id:'c', targets:['letterC','cat'],   instruction:'Найди C и cat!'}
];
const MARIUS_ROOM = {
  image:MEDIA_ASSETS.images.marius_room_abc,
  title:'Комната Мариуса',
  hotspots:ROOM_HOTSPOTS,
  rounds:ROOM_ROUNDS
};

/* Reusable, DOM-independent rules. Persistence and navigation belong to AppState. */
const HiddenObjectGame = {
  initialState() {
    return {currentRound:0, foundObjects:[], wrongAttempts:0, gameCompleted:false};
  },
  restore(config, saved) {
    const state=this.initialState();
    if (!saved || typeof saved!=='object') return state;
    if (Number.isInteger(saved.currentRound) && saved.currentRound>=0 && saved.currentRound<config.rounds.length) state.currentRound=saved.currentRound;
    const targets=config.rounds[state.currentRound].targets;
    state.foundObjects=Array.isArray(saved.foundObjects) ? [...new Set(saved.foundObjects.filter(id=>targets.includes(id)))] : [];
    state.wrongAttempts=Number.isInteger(saved.wrongAttempts) ? Math.max(0,Math.min(999,saved.wrongAttempts)) : 0;
    state.gameCompleted=state.currentRound===config.rounds.length-1 && this.roundComplete(config,state);
    return state;
  },
  roundComplete(config,state) {
    return config.rounds[state.currentRound].targets.every(id=>state.foundObjects.includes(id));
  },
  hint(config,state) {
    return state.wrongAttempts>=3 ? config.rounds[state.currentRound].targets.find(id=>!state.foundObjects.includes(id)) : null;
  },
  choose(config,state,id) {
    if (state.gameCompleted || this.roundComplete(config,state)) return 'ignored';
    if (state.foundObjects.includes(id)) return 'ignored';
    if (!config.rounds[state.currentRound].targets.includes(id)) {
      state.wrongAttempts=Math.min(999,state.wrongAttempts+1);
      return 'retry';
    }
    state.foundObjects.push(id);
    if (this.roundComplete(config,state)) {
      if (state.currentRound===config.rounds.length-1) state.gameCompleted=true;
      return 'round-complete';
    }
    return 'correct';
  },
  next(config,state) {
    if (state.gameCompleted || !this.roundComplete(config,state)) return false;
    state.currentRound++;
    state.foundObjects=[];
    state.wrongAttempts=0;
    return true;
  },
  render(config,state) {
    const round=config.rounds[state.currentRound];
    return `<section class="hidden-game" aria-labelledby="room-title">
      <p class="eyebrow">${escapeHTML(config.title)} · ${state.currentRound+1} / ${config.rounds.length}</p>
      <h1 id="room-title">${escapeHTML(round.instruction)}</h1>
      <p id="room-count" class="room-count">Найдено: ${state.foundObjects.length} / ${round.targets.length}</p>
      <div class="hidden-scene ${DEBUG_HOTSPOTS?'debug-hotspots':''}" role="group" aria-label="Предметы в комнате Мариуса" style="--scene-ratio:${config.image.width/config.image.height};--scene-max:${Math.min(560,config.image.width)}px">
        <img id="room-image" src="${escapeHTML(config.image.src)}" width="${config.image.width}" height="${config.image.height}" alt="Комната Мариуса со шкафом, кроватью и письменным столом" draggable="false" decoding="async">
        ${Object.entries(config.hotspots).map(([id,h])=>`<button type="button" class="hidden-hotspot" data-action="room-pick" data-object="${id}" aria-label="${escapeHTML(h.label)}" aria-pressed="${state.foundObjects.includes(id)}" disabled style="left:${h.x+h.width/2}%;top:${h.y+h.height/2}%;width:${h.width}%;height:${h.height}%"><span class="hotspot-debug" aria-hidden="true">${id}</span><span class="hotspot-check" aria-hidden="true">✓</span></button>`).join('')}
      </div>
      <p id="room-load-error" class="room-load-error" role="alert" hidden>Комната не загрузилась. <button class="text-button" data-action="room-reload">Попробовать ещё</button></p>
      <div class="room-controls">
        <p id="room-feedback" class="room-feedback" role="status" aria-live="polite" aria-atomic="true"></p>
        <button class="primary" id="room-next" data-action="room-next" hidden>Дальше ${icons.arrow}</button>
        <button class="repeat" data-action="repeat" aria-label="Повторить задание">${icons.speaker} Послушать</button>
      </div>
    </section>`;
  }
};
