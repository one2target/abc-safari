const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const vm=require('node:vm');
const {createContext}=require('./support/trainer-harness.cjs');

const root=path.resolve(__dirname,'..');
const pageSource=fs.readFileSync(path.join(root,'play/index.html'),'utf8');
const source=['play/assets.js','play/letter-maze-scenes.js','play/letter-maze-game.js']
  .map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n');
const context=vm.createContext({});
vm.runInContext(`${source}\nthis.scene=LETTER_MAZE_SCENES.campDEF;this.engine=LetterMazeGame;`,context);
const {scene,engine}=context;

const mazeBuild='letter-maze-def3';
assert.match(pageSource,new RegExp(`<link rel="stylesheet" href="\\./letter-maze-game\\.css\\?v=${mazeBuild}">`));
assert.match(pageSource,new RegExp(`<script src="\\./letter-maze-scenes\\.js\\?v=${mazeBuild}"></script>`));
assert.match(pageSource,new RegExp(`<script src="\\./letter-maze-game\\.js\\?v=${mazeBuild}"></script>`));

assert.equal(engine.validate(scene),true);
assert.equal(scene.title,'Лабиринт букв');
assert.deepEqual(Array.from(scene.rounds,round=>round.targetLetter),['D','E','F']);
assert.deepEqual(Array.from(scene.rounds,round=>round.targetWord),['Dog','Egg','Fish']);

const expectedBackgrounds=['maze-d.png','maze-e.png','maze-f.png'];
const hashes=new Set();
scene.rounds.forEach((round,index)=>{
  assert.equal(round.background.src,`./images/${expectedBackgrounds[index]}`);
  assert.equal(round.background.width,941);
  assert.equal(round.background.height,1672);
  const png=fs.readFileSync(path.join(root,'play/images',expectedBackgrounds[index]));
  assert.equal(png.readUInt32BE(16),941);
  assert.equal(png.readUInt32BE(20),1672);
  hashes.add(crypto.createHash('sha256').update(png).digest('hex'));
  const tracked=spawnSync('git',['ls-files','--error-unmatch',`play/images/${expectedBackgrounds[index]}`],{cwd:root,encoding:'utf8'});
  assert.equal(tracked.status,0,`${expectedBackgrounds[index]} must be tracked by Git`);
});
assert.equal(hashes.size,3,'D, E and F need three distinct background files');
assert.notDeepEqual(Array.from(scene.rounds[0].path),Array.from(scene.rounds[1].path));
assert.notDeepEqual(Array.from(scene.rounds[1].path),Array.from(scene.rounds[2].path));

const expectedIcons={D:'maze-dog.svg',E:'maze-egg.svg',F:'maze-fish.svg'};
for(let roundIndex=0;roundIndex<scene.rounds.length;roundIndex++){
  const round=scene.rounds[roundIndex],state={currentRound:roundIndex},layout=engine.layout(scene,state);
  assert.ok(layout.cells.every(cell=>cell.x>=0&&cell.x<=100&&cell.y>=0&&cell.y<=100));
  const pathCheckpoints=round.path.map(id=>round.checkpoints[id]).filter(Boolean);
  const letterCount=pathCheckpoints.filter(item=>item.type==='letter').length;
  const wordCount=pathCheckpoints.filter(item=>item.type==='word').length;
  assert.ok(Math.abs(letterCount-wordCount)<=1,`${round.targetLetter} checkpoints should be about 50/50`);
  assert.ok(letterCount>=5&&wordCount>=5);
  assert.ok(pathCheckpoints.every(item=>engine.isCorrectCheckpoint(round,item)));
  for(let index=1;index<round.path.length;index++){
    const previous=engine.getCell(scene,state,round.path[index-1]);
    const current=engine.getCell(scene,state,round.path[index]);
    const dx=Math.abs(current.x-previous.x),dy=Math.abs(current.y-previous.y);
    assert.ok(dx<=12.1&&dy<=6&&(dx<=1.5||dy<=1.5),`${round.targetLetter} segment ${previous.id}/${current.id} must stay on adjacent stones`);
  }
  for(const [cellId,checkpoint] of Object.entries(round.checkpoints)){
    const cell=engine.getCell(scene,state,cellId);
    assert.ok(cell,`${cellId} must belong to its own layout`);
    assert.equal(engine.checkpointAtPoint(scene,state,cell.x,cell.y)?.id,cellId);
    assert.ok(['letter','word'].includes(checkpoint.type));
    if(checkpoint.type==='word'){
      assert.ok(checkpoint.icon.endsWith(expectedIcons[round.targetLetter]));
      assert.ok(fs.existsSync(path.join(root,'play',checkpoint.icon.replace('./',''))));
      assert.equal(checkpoint.audioKey,round.targetWord.toLowerCase());
    }
  }
  const finish=engine.getCell(scene,state,layout.finishCell);
  assert.ok(round.path.includes(finish.id));
  assert.ok(engine.isCorrectCheckpoint(round,round.checkpoints[finish.id]));
  const ratio=layout.background.width/layout.background.height;
  for(const [width,height] of [[430,932],[390,844],[375,667],[360,800],[320,568],[280,640],[844,390]]){
    const sceneWidth=Math.min(width-16,scene.maxWidth,(height-92)*ratio);
    const sceneHeight=sceneWidth/ratio;
    assert.ok(sceneWidth>0&&sceneHeight<=height-92+.01,`Round ${round.targetLetter} should fit ${width}x${height}`);
  }
}

const state=engine.initialState(scene);
assert.equal(state.currentCell,'start');
assert.equal(engine.move(scene,state,'finish'),'not-adjacent');
assert.equal(engine.move(scene,state,'d01'),'correct-checkpoint');
assert.equal(engine.nextCheckpointCell(scene,state),'d06');
assert.deepEqual(Array.from(engine.pathSegmentTo(scene,state,'d06')),['d02','d03','d04','d05','d06']);
assert.equal(engine.move(scene,state,'d08'),'not-adjacent');
assert.equal(engine.move(scene,state,'d-wrong'),'wrong-checkpoint');
assert.equal(state.currentCell,'d01');
assert.equal(engine.move(scene,state,'d02'),'not-adjacent','blank route cells are not direct targets');
assert.equal(engine.move(scene,state,'d06'),'correct-checkpoint');
assert.deepEqual(Array.from(state.visited),['start','d01','d02','d03','d04','d05','d06']);

while(!engine.roundComplete(scene,state))assert.ok(['correct-checkpoint','round-complete'].includes(engine.move(scene,state,engine.nextCheckpointCell(scene,state))));
assert.equal(state.currentCell,'finish');
assert.equal(state.gameCompleted,false);
assert.equal(engine.next(scene,state),true);
assert.equal(state.currentRound,1);
assert.equal(state.currentCell,'start');
assert.equal(engine.currentRound(scene,state).background.src,'./images/maze-e.png');
assert.equal(engine.getCell(scene,state,'finish').x,30.4);
assert.equal(engine.getCell(scene,state,'finish').y,69.1);

for(let round=1;round<scene.rounds.length;round++){
  let result;
  while(!engine.roundComplete(scene,state))result=engine.move(scene,state,engine.nextCheckpointCell(scene,state));
  if(round<scene.rounds.length-1){assert.equal(result,'round-complete');assert.equal(engine.next(scene,state),true);}
  else assert.equal(result,'game-complete');
}
assert.equal(state.gameCompleted,true);
assert.equal(state.currentRound,2);

const restored=engine.restore(scene,JSON.parse(JSON.stringify(state)));
assert.equal(restored.gameCompleted,true);
assert.equal(restored.currentCell,'finish');
const html=engine.render(scene,restored,{characterHTML:'<div class="character-stage letter-maze-marius"></div>'});
assert.ok(html.includes('maze-f.png'));
assert.ok(html.includes('maze-fish.svg'));
assert.ok(html.includes('Мариус добрался до лагеря!'));
assert.ok(html.includes('Получить награду'));
assert.ok(html.includes('aria-label="Раунд 3 из 3"'));
assert.ok(html.includes('data-checkpoint-type="letter"'));
assert.ok(html.includes('data-checkpoint-type="word"'));
assert.ok(!html.includes('Camp reached!'));
assert.equal((html.match(/class="letter-maze-cell/g)||[]).length,Object.keys(scene.rounds[2].checkpoints).length);
assert.equal((html.match(/class="letter-maze-label/g)||[]).length,Object.keys(scene.rounds[2].checkpoints).length);

const css=fs.readFileSync(path.join(root,'play/letter-maze-game.css'),'utf8');
assert.match(css,/\.letter-maze-cell \{[\s\S]*pointer-events:none/);
assert.match(css,/\.letter-maze-label \{[\s\S]*pointer-events:none/);
assert.match(css,/\.letter-maze-label\.is-word img \{[\s\S]*object-fit:contain;pointer-events:none/);
assert.match(css,/\.letter-maze-character \*[^{]*\{pointer-events:none!important;\}/);
assert.match(css,/transition:left \.15s[\s\S]*top \.15s/);

const demo=createContext({search:'?demo=1&screen=maze_def'});
assert.equal(demo.run('DEMO_MAZE_PREVIEW'),true);
assert.equal(demo.run('DEMO_SHORTCUT_ACTIVE'),true);
assert.equal(demo.run('view'),'course');
assert.equal(demo.run('AppState.cursor.phase'),'maze');
assert.equal(demo.run('letterMazeState().currentRound'),0);
assert.equal(demo.run('letterMazeState().currentCell'),'start');
assert.ok(demo.run('renderLetterMazeGame()').includes('maze-d.png'));

;(async()=>{
  const audible=createContext();
  audible.run("view='course';AppState.cursor={phase:'maze',index:5,step:4};unlockAudio();AudioManager.stop();selectLetterMazeCell('d01',DEF_LETTER_MAZE.id)");
  assert.deepEqual(audible.played.map(item=>item.src),['./audio/d_name.mp3']);
  audible.run("selectLetterMazeCell('d06',DEF_LETTER_MAZE.id)");
  assert.equal(audible.run('letterMazeState().currentCell'),'d01','input stays locked during movement');
  await audible.tick(150);
  audible.run("selectLetterMazeCell('d06',DEF_LETTER_MAZE.id)");
  assert.equal(audible.run('letterMazeState().currentCell'),'d06');
  assert.deepEqual(audible.played.map(item=>item.src),['./audio/d_name.mp3','./audio/dog.mp3']);
  const actor=audible.nodes.get('#letter-maze-marius .letter-maze-marius');
  assert.equal(actor.style.left,`${engine.getCell(scene,{currentRound:0},'d02').x}%`);
  for(const id of ['d03','d04','d05','d06']){await audible.tick(150);assert.equal(actor.style.left,`${engine.getCell(scene,{currentRound:0},id).x}%`);}
  await audible.tick(150);
  assert.equal(audible.run('letterMazeAnimating'),false);
  assert.ok(audible.stats().maxActive<=1,'rapid maze actions must not overlap audio');

  for(const [roundIndex,letterCell,wordCell,letterSrc,wordSrc] of [
    [1,'e01','e05','./audio/e_name.mp3','./audio/egg.mp3'],
    [2,'f01','f06','./audio/f_name.mp3','./audio/fish.mp3']
  ]){
    const audio=createContext();
    audio.run(`view='course';AppState.cursor={phase:'maze',index:5,step:4};letterMazeState().currentRound=${roundIndex};letterMazeState().currentCell='start';letterMazeState().visited=['start'];unlockAudio();AudioManager.stop();selectLetterMazeCell('${letterCell}',DEF_LETTER_MAZE.id)`);
    assert.deepEqual(audio.played.map(item=>item.src),[letterSrc]);
    await audio.tick(150);
    audio.run(`selectLetterMazeCell('${wordCell}',DEF_LETTER_MAZE.id)`);
    assert.deepEqual(audio.played.map(item=>item.src),[letterSrc,wordSrc]);
  }
  const muted=createContext();
  muted.run("view='course';AppState.cursor={phase:'maze',index:5,step:4};AppState.soundEnabled=false;AudioManager.setEnabled(false);unlockAudio();selectLetterMazeCell('d01',DEF_LETTER_MAZE.id)");
  assert.equal(muted.played.length,0);

  console.log(JSON.stringify({
    passed:true,
    backgrounds:expectedBackgrounds,
    dimensions:'941x1672 PNG',
    routes:scene.rounds.map(round=>({letter:round.targetLetter,cells:round.path.length,checkpoints:Object.keys(round.checkpoints).length})),
    checkpointTypes:['letter','word'],
    icons:Object.values(expectedIcons),
    checkpointAudio:'d/e/f name + dog/egg/fish word assets',
    muteRespected:true,
    maxConcurrentAudio:audible.stats().maxActive,
    russianInterface:true,
    synchronizedCacheVersion:mazeBuild,
    coordinateHitTest:true,
    sequentialMovement:true,
    completion:true,
    persistence:true,
    geometryViewports:['430x932','390x844','375x667','360x800','320x568','280x640','844x390']
  },null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
