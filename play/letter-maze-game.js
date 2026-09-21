'use strict';
/* Generic letter-maze rules and markup. Course navigation, persistence,
   character rendering and audio stay in the caller. */
const LetterMazeGame = {
  validate(config) {
    if(!config || typeof config.id!=='string' || !config.id)throw new TypeError('Letter-maze config needs a stable id');
    const background=config.background;
    if(!background || typeof background.src!=='string' || !Number.isFinite(background.width) || !Number.isFinite(background.height) || background.width<=0 || background.height<=0)throw new TypeError(`Invalid background for ${config.id}`);
    if(!Array.isArray(config.cells) || config.cells.length<2)throw new TypeError(`No cells in ${config.id}`);
    const cells=new Map();
    for(const cell of config.cells){
      if(!cell || typeof cell.id!=='string' || !cell.id || cells.has(cell.id))throw new TypeError(`Invalid or duplicate cell in ${config.id}`);
      if(!Number.isFinite(cell.x) || !Number.isFinite(cell.y) || cell.x<0 || cell.x>100 || cell.y<0 || cell.y>100 || !Array.isArray(cell.neighbors))throw new TypeError(`Invalid geometry for ${cell.id}`);
      if((cell.labelOffsetX!=null && !Number.isFinite(cell.labelOffsetX)) || (cell.labelOffsetY!=null && !Number.isFinite(cell.labelOffsetY)))throw new TypeError(`Invalid label offset for ${cell.id}`);
      cells.set(cell.id,cell);
    }
    if(!cells.has(config.startCell) || !cells.has(config.finishCell) || config.startCell===config.finishCell)throw new TypeError(`Invalid start or finish in ${config.id}`);
    if(config.hitArea && (!Number.isFinite(config.hitArea.x) || !Number.isFinite(config.hitArea.y) || config.hitArea.x<=0 || config.hitArea.y<=0))throw new TypeError(`Invalid hit area in ${config.id}`);
    for(const cell of config.cells){
      if(new Set(cell.neighbors).size!==cell.neighbors.length || cell.neighbors.some(id=>!cells.has(id) || id===cell.id))throw new TypeError(`Invalid neighbors for ${cell.id}`);
      for(const neighbor of cell.neighbors)if(!cells.get(neighbor).neighbors.includes(cell.id))throw new TypeError(`Neighbor link ${cell.id}/${neighbor} must be reciprocal`);
    }
    if(!Array.isArray(config.rounds) || !config.rounds.length)throw new TypeError(`No rounds in ${config.id}`);
    const roundIDs=new Set();
    for(const round of config.rounds){
      if(!round || typeof round.id!=='string' || !round.id || roundIDs.has(round.id) || typeof round.targetLetter!=='string' || !round.targetLetter || typeof round.instruction!=='string' || !round.instruction)throw new TypeError(`Invalid round in ${config.id}`);
      roundIDs.add(round.id);
      if(!round.letters || typeof round.letters!=='object' || !Array.isArray(round.path) || round.path.length<2 || round.path[0]!==config.startCell || round.path.at(-1)!==config.finishCell)throw new TypeError(`Invalid route in ${round.id}`);
      for(const cell of config.cells){
        if(cell.id===config.startCell)continue;
        if(typeof round.letters[cell.id]!=='string')throw new TypeError(`Missing letter value for ${cell.id} in ${round.id}`);
      }
      for(let index=1;index<round.path.length;index++){
        const previous=round.path[index-1],current=round.path[index];
        const letter=round.letters[current];
        if(!cells.has(current) || !cells.get(previous)?.neighbors.includes(current) || (letter && letter!==round.targetLetter))throw new TypeError(`Broken target route in ${round.id}`);
      }
    }
    return true;
  },
  initialState(config) {
    this.validate(config);
    return {gameId:config.id,currentRound:0,currentCell:config.startCell,visited:[config.startCell],wrongAttempts:0,gameCompleted:false};
  },
  restore(config,saved) {
    const state=this.initialState(config);
    if(!saved || typeof saved!=='object' || (saved.gameId!=null && saved.gameId!==config.id))return state;
    if(Number.isInteger(saved.currentRound) && saved.currentRound>=0 && saved.currentRound<config.rounds.length)state.currentRound=saved.currentRound;
    const route=new Set(this.currentRound(config,state).path);
    if(typeof saved.currentCell==='string' && route.has(saved.currentCell))state.currentCell=saved.currentCell;
    state.visited=Array.isArray(saved.visited)?[...new Set(saved.visited.filter(id=>route.has(id)))]:[];
    if(!state.visited.includes(config.startCell))state.visited.unshift(config.startCell);
    if(!state.visited.includes(state.currentCell))state.visited.push(state.currentCell);
    state.wrongAttempts=Number.isInteger(saved.wrongAttempts)?Math.max(0,Math.min(999,saved.wrongAttempts)):0;
    state.gameCompleted=state.currentRound===config.rounds.length-1 && state.currentCell===config.finishCell && saved.gameCompleted!==false;
    return state;
  },
  currentRound(config,state) {
    return config.rounds[state.currentRound];
  },
  getCell(config,id) {
    return config.cells.find(cell=>cell.id===id)||null;
  },
  cellAtPoint(config,x,y,filter=null) {
    if(!Number.isFinite(x) || !Number.isFinite(y))return null;
    const radiusX=config.hitArea?.x||6,radiusY=config.hitArea?.y||3;
    let nearest=null,best=Infinity;
    for(const cell of config.cells){
      if(cell.id===config.startCell || (filter && !filter(cell)))continue;
      const score=((x-cell.x)/radiusX)**2+((y-cell.y)/radiusY)**2;
      if(score<=1 && score<best){nearest=cell;best=score;}
    }
    return nearest;
  },
  letterAtPoint(config,state,x,y) {
    return this.cellAtPoint(config,x,y,cell=>Boolean(this.letterAt(config,state,cell.id)));
  },
  letterAt(config,state,id) {
    return this.currentRound(config,state).letters[id]||'';
  },
  roundComplete(config,state) {
    return state.currentCell===config.finishCell;
  },
  nextPathCell(config,state) {
    const path=this.currentRound(config,state).path,index=path.indexOf(state.currentCell);
    return index>=0?path[index+1]||null:null;
  },
  nextLetterCell(config,state) {
    const round=this.currentRound(config,state),index=round.path.indexOf(state.currentCell);
    if(index<0)return null;
    return round.path.slice(index+1).find(id=>Boolean(round.letters[id]))||null;
  },
  pathSegmentTo(config,state,id) {
    const round=this.currentRound(config,state),currentIndex=round.path.indexOf(state.currentCell),targetIndex=round.path.indexOf(id);
    if(currentIndex<0 || targetIndex<=currentIndex || round.letters[id]!==round.targetLetter)return null;
    const segment=round.path.slice(currentIndex+1,targetIndex+1);
    return segment.slice(0,-1).some(cellId=>Boolean(round.letters[cellId]))?null:segment;
  },
  move(config,state,id) {
    if(state.gameId!==config.id || state.gameCompleted || this.roundComplete(config,state))return 'ignored';
    const target=this.getCell(config,id),letter=this.letterAt(config,state,id),targetLetter=this.currentRound(config,state).targetLetter;
    if(target && letter && letter!==targetLetter){
      state.wrongAttempts=Math.min(999,state.wrongAttempts+1);
      return 'wrong-letter';
    }
    const segment=target?this.pathSegmentTo(config,state,id):null;
    if(!segment){
      state.wrongAttempts=Math.min(999,state.wrongAttempts+1);
      return 'not-adjacent';
    }
    for(const cellId of segment){state.currentCell=cellId;if(!state.visited.includes(cellId))state.visited.push(cellId);}
    if(!this.roundComplete(config,state))return 'correct-letter';
    if(state.currentRound===config.rounds.length-1){state.gameCompleted=true;return 'game-complete';}
    return 'round-complete';
  },
  next(config,state) {
    if(state.gameId!==config.id || state.gameCompleted || !this.roundComplete(config,state) || state.currentRound>=config.rounds.length-1)return false;
    state.currentRound++;
    state.currentCell=config.startCell;
    state.visited=[config.startCell];
    state.wrongAttempts=0;
    return true;
  },
  render(config,state,options={}) {
    this.validate(config);
    const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const percent=value=>Number(Number(value).toFixed(3));
    const round=this.currentRound(config,state),copy=config.copy||{},actions=options.actions||{};
    const action={move:actions.move||'letter-maze-move',next:actions.next||'letter-maze-next',continue:actions.continue||'letter-maze-continue'};
    const game=escape(config.id),ratio=config.background.width/config.background.height,maxWidth=Math.min(config.maxWidth||470,config.background.width);
    const current=this.getCell(config,state.currentCell),roundDone=this.roundComplete(config,state);
    const cellButtons=config.cells.filter(cell=>cell.id!==config.startCell && round.letters[cell.id]).map(cell=>{
      const letter=round.letters[cell.id],visited=state.visited.includes(cell.id),finish=cell.id===config.finishCell;
      return `<button type="button" class="letter-maze-cell has-letter${visited?' is-visited':''}${finish?' is-finish':''}" data-action="${escape(action.move)}" data-game="${game}" data-cell="${escape(cell.id)}" aria-label="${escape(letter)}${finish?', finish':''}" style="left:${cell.x}%;top:${cell.y}%"></button>`;
    }).join('');
    const labels=config.cells.filter(cell=>cell.id!==config.startCell && round.letters[cell.id]).map(cell=>{
      const labelX=percent(cell.x+(cell.labelOffsetX||0)),labelY=percent(cell.y+(cell.labelOffsetY||0)),letter=round.letters[cell.id],visited=state.visited.includes(cell.id);
      return `<span class="letter-maze-label${visited?' is-visited':''}" data-cell="${escape(cell.id)}" aria-hidden="true" style="left:${labelX}%;top:${labelY}%">${escape(letter)}</span>`;
    }).join('');
    const character=(options.characterHTML||'').replace('class="character-stage ',`style="left:${current.x}%;top:${current.y}%" class="character-stage `);
    return `<section class="letter-maze-game${state.gameCompleted?' is-complete':''}" data-letter-maze-game="${game}" aria-labelledby="letter-maze-title">
      <div class="letter-maze-scene" role="group" aria-label="${escape(config.sceneAriaLabel||config.title)}" style="--maze-ratio:${ratio};--maze-max:${maxWidth}px">
        <img id="letter-maze-image" class="letter-maze-background" src="${escape(config.background.src)}" width="${config.background.width}" height="${config.background.height}" alt="${escape(config.backgroundAlt||config.title)}" draggable="false" decoding="async">
        <div class="letter-maze-copy">
          <p>${escape(config.title)} · ${state.currentRound+1} / ${config.rounds.length}</p>
          <h1 id="letter-maze-title">${escape(state.gameCompleted?(copy.completeTitle||'Camp reached!'):round.instruction)}</h1>
          <div class="letter-maze-rounds" aria-label="Round ${state.currentRound+1} of ${config.rounds.length}">${config.rounds.map((item,index)=>`<span class="${index<state.currentRound?'done':index===state.currentRound?'current':''}">${escape(item.targetLetter)}</span>`).join('')}</div>
        </div>
        ${cellButtons}
        ${labels}
        <div id="letter-maze-marius" class="letter-maze-character">${character}</div>
        <div class="letter-maze-status-panel">
          <p id="letter-maze-feedback" role="status" aria-live="polite">${escape(state.gameCompleted?(copy.completeMessage||'You made it!'):roundDone?(copy.roundComplete||'Round complete!'):(copy.ready||`Follow only ${round.targetLetter}.`))}</p>
          <button class="primary" id="letter-maze-next" data-action="${escape(state.gameCompleted?action.continue:action.next)}" data-game="${game}" ${roundDone?'':'hidden'}>${escape(state.gameCompleted?(copy.continueLabel||'Continue'):(copy.nextRound||'Next round'))} ${options.icons?.arrow||''}</button>
        </div>
      </div>
    </section>`;
  }
};
