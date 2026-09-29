'use strict';
/* Generic letter/word maze rules and markup. Course navigation, persistence,
   character rendering and audio stay in the caller. */
const LetterMazeGame = {
  currentRound(config,state) {
    return config.rounds[state?.currentRound??0];
  },
  layout(config,stateOrRound) {
    const round=stateOrRound?.path?stateOrRound:this.currentRound(config,stateOrRound||{currentRound:0});
    return {
      background:round?.background||config.background,
      backgroundAlt:round?.backgroundAlt||config.backgroundAlt,
      sceneAriaLabel:round?.sceneAriaLabel||config.sceneAriaLabel,
      hitArea:round?.hitArea||config.hitArea,
      cells:round?.cells||config.cells,
      startCell:round?.startCell||config.startCell,
      finishCell:round?.finishCell||config.finishCell
    };
  },
  isCorrectCheckpoint(round,checkpoint) {
    return Boolean(checkpoint)&&(
      (checkpoint.type==='letter'&&checkpoint.value===round.targetLetter)||
      (checkpoint.type==='word'&&checkpoint.value===round.targetWord)
    );
  },
  validate(config) {
    if(!config || typeof config.id!=='string' || !config.id)throw new TypeError('Letter-maze config needs a stable id');
    if(!Array.isArray(config.rounds) || !config.rounds.length)throw new TypeError(`No rounds in ${config.id}`);
    const roundIDs=new Set();
    for(const round of config.rounds){
      if(!round || typeof round.id!=='string' || !round.id || roundIDs.has(round.id) || typeof round.targetLetter!=='string' || !round.targetLetter || typeof round.targetWord!=='string' || !round.targetWord || typeof round.instruction!=='string' || !round.instruction)throw new TypeError(`Invalid round in ${config.id}`);
      roundIDs.add(round.id);
      const layout=this.layout(config,round),background=layout.background;
      if(!background || typeof background.src!=='string' || !Number.isFinite(background.width) || !Number.isFinite(background.height) || background.width<=0 || background.height<=0)throw new TypeError(`Invalid background for ${round.id}`);
      if(!Array.isArray(layout.cells) || layout.cells.length<2)throw new TypeError(`No cells in ${round.id}`);
      const cells=new Map();
      for(const cell of layout.cells){
        if(!cell || typeof cell.id!=='string' || !cell.id || cells.has(cell.id))throw new TypeError(`Invalid or duplicate cell in ${round.id}`);
        if(!Number.isFinite(cell.x) || !Number.isFinite(cell.y) || cell.x<0 || cell.x>100 || cell.y<0 || cell.y>100 || !Array.isArray(cell.neighbors))throw new TypeError(`Invalid geometry for ${cell.id}`);
        cells.set(cell.id,cell);
      }
      if(!cells.has(layout.startCell) || !cells.has(layout.finishCell) || layout.startCell===layout.finishCell)throw new TypeError(`Invalid start or finish in ${round.id}`);
      if(layout.hitArea && (!Number.isFinite(layout.hitArea.x) || !Number.isFinite(layout.hitArea.y) || layout.hitArea.x<=0 || layout.hitArea.y<=0))throw new TypeError(`Invalid hit area in ${round.id}`);
      for(const cell of layout.cells){
        if(new Set(cell.neighbors).size!==cell.neighbors.length || cell.neighbors.some(id=>!cells.has(id) || id===cell.id))throw new TypeError(`Invalid neighbors for ${cell.id}`);
        for(const neighbor of cell.neighbors)if(!cells.get(neighbor).neighbors.includes(cell.id))throw new TypeError(`Neighbor link ${cell.id}/${neighbor} must be reciprocal`);
      }
      if(!round.checkpoints || typeof round.checkpoints!=='object' || !Array.isArray(round.path) || round.path.length<2 || round.path[0]!==layout.startCell || round.path.at(-1)!==layout.finishCell || new Set(round.path).size!==round.path.length)throw new TypeError(`Invalid route in ${round.id}`);
      for(const [cellId,checkpoint] of Object.entries(round.checkpoints)){
        if(!cells.has(cellId) || cellId===layout.startCell || !checkpoint || !['letter','word'].includes(checkpoint.type) || typeof checkpoint.value!=='string' || !checkpoint.value || typeof checkpoint.audioKey!=='string' || !checkpoint.audioKey || typeof checkpoint.spoken!=='string' || !checkpoint.spoken)throw new TypeError(`Invalid checkpoint ${cellId} in ${round.id}`);
        if(checkpoint.type==='word' && (typeof checkpoint.icon!=='string' || !checkpoint.icon))throw new TypeError(`Missing word icon for ${cellId} in ${round.id}`);
      }
      for(let index=1;index<round.path.length;index++){
        const previous=round.path[index-1],current=round.path[index],checkpoint=round.checkpoints[current];
        if(!cells.has(current) || !cells.get(previous)?.neighbors.includes(current) || (checkpoint && !this.isCorrectCheckpoint(round,checkpoint)))throw new TypeError(`Broken target route in ${round.id}`);
      }
      if(!round.checkpoints[layout.finishCell] || !this.isCorrectCheckpoint(round,round.checkpoints[layout.finishCell]))throw new TypeError(`Finish needs a correct checkpoint in ${round.id}`);
    }
    return true;
  },
  initialState(config) {
    this.validate(config);
    const layout=this.layout(config,{currentRound:0});
    return {gameId:config.id,currentRound:0,currentCell:layout.startCell,visited:[layout.startCell],wrongAttempts:0,gameCompleted:false};
  },
  restore(config,saved) {
    const state=this.initialState(config);
    if(!saved || typeof saved!=='object' || (saved.gameId!=null && saved.gameId!==config.id))return state;
    if(Number.isInteger(saved.currentRound) && saved.currentRound>=0 && saved.currentRound<config.rounds.length)state.currentRound=saved.currentRound;
    const round=this.currentRound(config,state),layout=this.layout(config,round),route=new Set(round.path);
    state.currentCell=layout.startCell;
    if(typeof saved.currentCell==='string' && route.has(saved.currentCell))state.currentCell=saved.currentCell;
    state.visited=Array.isArray(saved.visited)?[...new Set(saved.visited.filter(id=>route.has(id)))]:[];
    if(!state.visited.includes(layout.startCell))state.visited.unshift(layout.startCell);
    if(!state.visited.includes(state.currentCell))state.visited.push(state.currentCell);
    state.wrongAttempts=Number.isInteger(saved.wrongAttempts)?Math.max(0,Math.min(999,saved.wrongAttempts)):0;
    state.gameCompleted=state.currentRound===config.rounds.length-1 && state.currentCell===layout.finishCell && saved.gameCompleted!==false;
    return state;
  },
  getCell(config,state,id) {
    if(typeof state==='string' && id===undefined){id=state;state={currentRound:0};}
    return this.layout(config,state).cells.find(cell=>cell.id===id)||null;
  },
  cellAtPoint(config,state,x,y,filter=null) {
    if(!Number.isFinite(x) || !Number.isFinite(y))return null;
    const layout=this.layout(config,state),radiusX=layout.hitArea?.x||6,radiusY=layout.hitArea?.y||3;
    let nearest=null,best=Infinity;
    for(const cell of layout.cells){
      if(cell.id===layout.startCell || (filter && !filter(cell)))continue;
      const score=((x-cell.x)/radiusX)**2+((y-cell.y)/radiusY)**2;
      if(score<=1 && score<best){nearest=cell;best=score;}
    }
    return nearest;
  },
  checkpointAtPoint(config,state,x,y) {
    return this.cellAtPoint(config,state,x,y,cell=>Boolean(this.checkpointAt(config,state,cell.id)));
  },
  // Compatibility alias for older course adapters.
  letterAtPoint(config,state,x,y) {
    return this.checkpointAtPoint(config,state,x,y);
  },
  checkpointAt(config,state,id) {
    return this.currentRound(config,state).checkpoints[id]||null;
  },
  letterAt(config,state,id) {
    const checkpoint=this.checkpointAt(config,state,id);
    return checkpoint?.type==='letter'?checkpoint.value:'';
  },
  roundComplete(config,state) {
    return state.currentCell===this.layout(config,state).finishCell;
  },
  nextPathCell(config,state) {
    const path=this.currentRound(config,state).path,index=path.indexOf(state.currentCell);
    return index>=0?path[index+1]||null:null;
  },
  nextCheckpointCell(config,state) {
    const round=this.currentRound(config,state),index=round.path.indexOf(state.currentCell);
    if(index<0)return null;
    return round.path.slice(index+1).find(id=>Boolean(round.checkpoints[id]))||null;
  },
  // Compatibility alias: callers now receive the next letter or word checkpoint.
  nextLetterCell(config,state) {
    return this.nextCheckpointCell(config,state);
  },
  pathSegmentTo(config,state,id) {
    const round=this.currentRound(config,state),currentIndex=round.path.indexOf(state.currentCell),targetIndex=round.path.indexOf(id),checkpoint=round.checkpoints[id];
    if(currentIndex<0 || targetIndex<=currentIndex || !this.isCorrectCheckpoint(round,checkpoint))return null;
    const segment=round.path.slice(currentIndex+1,targetIndex+1);
    return segment.slice(0,-1).some(cellId=>Boolean(round.checkpoints[cellId]))?null:segment;
  },
  move(config,state,id) {
    if(state.gameId!==config.id || state.gameCompleted || this.roundComplete(config,state))return 'ignored';
    const target=this.getCell(config,state,id),round=this.currentRound(config,state),checkpoint=this.checkpointAt(config,state,id);
    if(target && checkpoint && !this.isCorrectCheckpoint(round,checkpoint)){
      state.wrongAttempts=Math.min(999,state.wrongAttempts+1);
      return 'wrong-checkpoint';
    }
    const segment=target?this.pathSegmentTo(config,state,id):null;
    if(!segment){
      state.wrongAttempts=Math.min(999,state.wrongAttempts+1);
      return 'not-adjacent';
    }
    for(const cellId of segment){state.currentCell=cellId;if(!state.visited.includes(cellId))state.visited.push(cellId);}
    if(!this.roundComplete(config,state))return 'correct-checkpoint';
    if(state.currentRound===config.rounds.length-1){state.gameCompleted=true;return 'game-complete';}
    return 'round-complete';
  },
  next(config,state) {
    if(state.gameId!==config.id || state.gameCompleted || !this.roundComplete(config,state) || state.currentRound>=config.rounds.length-1)return false;
    state.currentRound++;
    const layout=this.layout(config,state);
    state.currentCell=layout.startCell;
    state.visited=[layout.startCell];
    state.wrongAttempts=0;
    return true;
  },
  render(config,state,options={}) {
    this.validate(config);
    const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const round=this.currentRound(config,state),layout=this.layout(config,round),copy=config.copy||{},actions=options.actions||{};
    const action={move:actions.move||'letter-maze-move',next:actions.next||'letter-maze-next',continue:actions.continue||'letter-maze-continue'};
    const game=escape(config.id),ratio=layout.background.width/layout.background.height,maxWidth=Math.min(config.maxWidth||470,layout.background.width);
    const current=this.getCell(config,state,state.currentCell),roundDone=this.roundComplete(config,state);
    const checkpointCells=layout.cells.filter(cell=>cell.id!==layout.startCell && round.checkpoints[cell.id]);
    const cellButtons=checkpointCells.map(cell=>{
      const checkpoint=round.checkpoints[cell.id],visited=state.visited.includes(cell.id),finish=cell.id===layout.finishCell;
      const aria=checkpoint.type==='letter'?`Буква ${checkpoint.value}`:`Картинка ${checkpoint.value}`;
      return `<button type="button" class="letter-maze-cell has-${checkpoint.type}${visited?' is-visited':''}${finish?' is-finish':''}" data-action="${escape(action.move)}" data-game="${game}" data-cell="${escape(cell.id)}" data-checkpoint-type="${checkpoint.type}" aria-label="${escape(aria)}${finish?', финиш':''}" style="left:${cell.x}%;top:${cell.y}%"></button>`;
    }).join('');
    const labels=checkpointCells.map(cell=>{
      const checkpoint=round.checkpoints[cell.id],visited=state.visited.includes(cell.id);
      const content=checkpoint.type==='word'?`<img src="${escape(checkpoint.icon)}" alt="" aria-hidden="true" draggable="false">`:escape(checkpoint.value);
      return `<span class="letter-maze-label is-${checkpoint.type}${visited?' is-visited':''}" data-cell="${escape(cell.id)}" aria-hidden="true" style="left:${cell.x}%;top:${cell.y}%">${content}</span>`;
    }).join('');
    const character=(options.characterHTML||'').replace('class="character-stage ',`style="left:${current.x}%;top:${current.y}%" class="character-stage `);
    return `<section class="letter-maze-game${state.gameCompleted?' is-complete':''}" data-letter-maze-game="${game}" aria-labelledby="letter-maze-title">
      <div class="letter-maze-scene" role="group" aria-label="${escape(layout.sceneAriaLabel||config.title)}" style="--maze-ratio:${ratio};--maze-max:${maxWidth}px">
        <img id="letter-maze-image" class="letter-maze-background" src="${escape(layout.background.src)}" width="${layout.background.width}" height="${layout.background.height}" alt="${escape(layout.backgroundAlt||config.title)}" draggable="false" decoding="async">
        <div class="letter-maze-copy">
          <p>${escape(config.title)} · ${state.currentRound+1} / ${config.rounds.length}</p>
          <h1 id="letter-maze-title">${escape(state.gameCompleted?(copy.completeTitle||'Лабиринт пройден!'):round.instruction)}</h1>
          <div class="letter-maze-rounds" aria-label="Раунд ${state.currentRound+1} из ${config.rounds.length}">${config.rounds.map((item,index)=>`<span class="${index<state.currentRound?'done':index===state.currentRound?'current':''}">${escape(item.targetLetter)}</span>`).join('')}</div>
        </div>
        ${cellButtons}
        ${labels}
        <div id="letter-maze-marius" class="letter-maze-character">${character}</div>
        <div class="letter-maze-status-panel">
          <p id="letter-maze-feedback" role="status" aria-live="polite">${escape(state.gameCompleted?(copy.completeMessage||'Готово!'):roundDone?(copy.roundComplete||'Уровень пройден!'):(copy.ready||`Следуй по ${round.targetLetter}.`))}</p>
          <button class="primary" id="letter-maze-next" data-action="${escape(state.gameCompleted?action.continue:action.next)}" data-game="${game}" ${roundDone?'':'hidden'}>${escape(state.gameCompleted?(copy.continueLabel||'Продолжить'):(copy.nextRound||'Следующий уровень'))} ${options.icons?.arrow||''}</button>
        </div>
      </div>
    </section>`;
  }
};
