const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createContext}=require('./support/trainer-harness.cjs');

const root=path.resolve(__dirname,'..');
const source=[
  'play/assets.js',
  'play/letter-maze-scenes.js',
  'play/letter-maze-game.js'
].map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n');
const context=vm.createContext({});
vm.runInContext(`${source}\nthis.scene=LETTER_MAZE_SCENES.campDEF;this.engine=LetterMazeGame;`,context);
const {scene,engine}=context;

assert.equal(engine.validate(scene),true);
assert.equal(scene.background.src,'./images/marius-letter-maze-def.png');
assert.equal(scene.background.width,941);
assert.equal(scene.background.height,1672);
const png=fs.readFileSync(path.join(root,'play/images/marius-letter-maze-def.png'));
const css=fs.readFileSync(path.join(root,'play/letter-maze-game.css'),'utf8');
assert.equal(png.readUInt32BE(16),941);
assert.equal(png.readUInt32BE(20),1672);
assert.equal(scene.rounds.length,3);
assert.deepEqual(Array.from(scene.rounds,round=>round.targetLetter),['D','E','F']);
assert.ok(scene.cells.every(cell=>cell.x>=0&&cell.x<=100&&cell.y>=0&&cell.y<=100));
const visibleCounts=scene.rounds.map(round=>Object.values(round.letters).filter(Boolean).length);
assert.ok(visibleCounts.every(count=>count>=10&&count<=12));
assert.ok(scene.rounds.every(round=>Object.values(round.letters).filter(letter=>!letter).length>=23));
assert.ok(scene.cells.every(cell=>Number.isFinite(cell.labelOffsetX??0)&&Number.isFinite(cell.labelOffsetY??0)));
for(const cell of scene.cells.filter(cell=>cell.id!==scene.startCell))assert.equal(engine.cellAtPoint(scene,cell.x,cell.y)?.id,cell.id);
assert.equal(engine.cellAtPoint(scene,scene.cells.find(cell=>cell.id==='p04').x+4.5,scene.cells.find(cell=>cell.id==='p04').y)?.id,'p04');
assert.equal(engine.cellAtPoint(scene,scene.cells.find(cell=>cell.id==='p07').x,scene.cells.find(cell=>cell.id==='p07').y+1.9)?.id,'p07');
const hitState=engine.initialState(scene),firstRound=scene.rounds[0];
for(const cell of scene.cells.filter(cell=>firstRound.letters[cell.id]))assert.equal(engine.letterAtPoint(scene,hitState,cell.x,cell.y)?.id,cell.id);
for(const id of ['p02','p03','p04','p05','p07']){
  const cell=engine.getCell(scene,id);assert.equal(engine.letterAtPoint(scene,hitState,cell.x,cell.y),null,`${id} must not be interactive`);
}
assert.equal(engine.letterAtPoint(scene,hitState,50.5,68.2)?.id,'p25','nearest overlapping letter target wins');
const ratio=scene.background.width/scene.background.height;
for(const [width,height] of [[430,932],[390,844],[375,667],[360,800],[320,568],[280,640],[844,390]]){
  const sceneWidth=Math.min(width-16,scene.maxWidth,(height-92)*ratio);
  const sceneHeight=sceneWidth/ratio;
  assert.ok(sceneWidth>0&&sceneHeight<=height-92+.01,`Portrait scene should fit ${width}x${height}`);
}

const state=engine.initialState(scene);
assert.equal(state.currentCell,scene.startCell);
assert.equal(engine.move(scene,state,'finish'),'not-adjacent');
assert.equal(state.currentCell,scene.startCell);
assert.equal(engine.move(scene,state,'p01'),'correct-letter');
assert.equal(engine.nextLetterCell(scene,state),'p06');
assert.deepEqual(Array.from(engine.pathSegmentTo(scene,state,'p06')),['p02','p03','p04','p05','p06']);
assert.equal(engine.move(scene,state,'p08'),'not-adjacent');
assert.equal(state.currentCell,'p01');
assert.equal(engine.move(scene,state,'dead01'),'wrong-letter');
assert.equal(state.currentCell,'p01');
assert.equal(engine.move(scene,state,'p02'),'not-adjacent');
assert.equal(state.currentCell,'p01');
assert.equal(engine.move(scene,state,'p06'),'correct-letter');
assert.equal(state.currentCell,'p06');
assert.deepEqual(Array.from(state.visited),['start','p01','p02','p03','p04','p05','p06']);

while(!engine.roundComplete(scene,state))assert.ok(['correct-letter','round-complete'].includes(engine.move(scene,state,engine.nextLetterCell(scene,state))));
assert.equal(state.currentCell,scene.finishCell);
assert.equal(state.gameCompleted,false);
assert.equal(engine.next(scene,state),true);
assert.equal(state.currentRound,1);
assert.equal(state.currentCell,scene.startCell);

for(let round=1;round<scene.rounds.length;round++){
  let result;
  while(!engine.roundComplete(scene,state))result=engine.move(scene,state,engine.nextLetterCell(scene,state));
  if(round<scene.rounds.length-1){assert.equal(result,'round-complete');assert.equal(engine.next(scene,state),true);}
  else assert.equal(result,'game-complete');
}
assert.equal(state.gameCompleted,true);
assert.equal(state.currentRound,2);

const restored=engine.restore(scene,JSON.parse(JSON.stringify(state)));
assert.equal(restored.gameCompleted,true);
assert.equal(restored.currentCell,scene.finishCell);
const html=engine.render(scene,restored,{characterHTML:'<div class="character-stage letter-maze-marius"></div>'});
assert.ok(html.includes('marius-letter-maze-def.png'));
assert.ok(html.includes('Marius reached the camp!'));
assert.ok(html.includes('letter-maze-continue'));
assert.ok(!html.includes('is-empty'));
assert.equal((html.match(/has-letter/g)||[]).length,visibleCounts[2]);
assert.equal((html.match(/class="letter-maze-cell/g)||[]).length,visibleCounts[2]);
assert.equal((html.match(/class="letter-maze-label/g)||[]).length,visibleCounts[2]);
assert.match(html,/class="letter-maze-cell has-letter[^>]*data-cell="p11"[^>]*style="left:82%;top:45\.7%"/);
assert.match(html,/class="letter-maze-label[^>]*data-cell="p11"[^>]*style="left:84\.15%;top:46\.5%"/);
assert.match(css,/\.letter-maze-cell \{[\s\S]*transform:translate\(-50%,-50%\);width:9\.5%;height:4%;[\s\S]*display:grid;place-items:center;pointer-events:none/);
assert.match(css,/\.letter-maze-label \{[\s\S]*transform:translate\(-50%,-50%\);width:9\.5%;height:4%;[\s\S]*font-size:clamp\(14px,4vw,20px\)[\s\S]*pointer-events:none/);
assert.match(css,/\.letter-maze-character \*[^{]*\{pointer-events:none!important;\}/);
assert.match(css,/\.letter-maze-character \.letter-maze-marius \{[\s\S]*background:transparent!important;[\s\S]*border-radius:0!important;[\s\S]*box-shadow:none!important/);
assert.match(css,/transition:left \.15s[\s\S]*top \.15s/);

// Course adapter: only a visible target checkpoint speaks the existing letter-name audio.
;(async()=>{
 const audible=createContext();
 audible.run("view='course';AppState.cursor={phase:'maze',index:5,step:4};unlockAudio();AudioManager.stop();selectLetterMazeCell('p01',DEF_LETTER_MAZE.id)");
 assert.deepEqual(audible.played.map(item=>item.src),['./audio/d_name.mp3']);
 audible.run("selectLetterMazeCell('p06',DEF_LETTER_MAZE.id)");
 assert.equal(audible.run('letterMazeState().currentCell'),'p01','input stays locked during movement');
 await audible.tick(150);
 audible.run("selectLetterMazeCell('p06',DEF_LETTER_MAZE.id)");
 assert.equal(audible.run('letterMazeState().currentCell'),'p06');
 const actor=audible.nodes.get('#letter-maze-marius .letter-maze-marius');
 assert.equal(actor.style.left,`${engine.getCell(scene,'p02').x}%`);
 for(const id of ['p03','p04','p05','p06']){await audible.tick(150);assert.equal(actor.style.left,`${engine.getCell(scene,id).x}%`);assert.equal(actor.style.top,`${engine.getCell(scene,id).y}%`);}
 await audible.tick(150);
 assert.equal(audible.run('letterMazeAnimating'),false);
 assert.deepEqual(audible.played.map(item=>item.src),['./audio/d_name.mp3','./audio/d_name.mp3']);
 for(const [round,src] of [[1,'./audio/e_name.mp3'],[2,'./audio/f_name.mp3']]){
  const letterAudio=createContext();
  letterAudio.run(`view='course';AppState.cursor={phase:'maze',index:5,step:4};letterMazeState().currentRound=${round};unlockAudio();AudioManager.stop();selectLetterMazeCell('p01',DEF_LETTER_MAZE.id)`);
  assert.deepEqual(letterAudio.played.map(item=>item.src),[src]);
 }
 const muted=createContext();
 muted.run("view='course';AppState.cursor={phase:'maze',index:5,step:4};AppState.soundEnabled=false;AudioManager.setEnabled(false);unlockAudio();selectLetterMazeCell('p01',DEF_LETTER_MAZE.id)");
 assert.equal(muted.played.length,0);

 console.log(JSON.stringify({
  passed:true,
  background:'941x1672 supplied portrait asset',
  cells:scene.cells.length,
  visibleLetters:visibleCounts,
  centeredLetterCSS:true,
  transparentCharacterStage:true,
  emptyPathCellsAutoTraversed:true,
  letterOnlyTargets:true,
  sequentialMovement:true,
  rounds:scene.rounds.map(round=>round.targetLetter),
  adjacency:true,
  deterministicHitTest:true,
  wrongMoveDoesNotAdvance:true,
  checkpointAudio:'existing d/e/f name assets',
  muteRespected:true,
  completion:true,
  persistence:true,
  geometryViewports:['430x932','390x844','375x667','360x800','320x568','280x640','844x390']
 },null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
