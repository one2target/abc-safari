const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createContext,saved}=require('./support/trainer-harness.cjs');
const root=path.resolve(__dirname,'..');
const engineSource=fs.readFileSync(path.join(root,'play/treehouse-stu-game.js'),'utf8');
const appSource=fs.readFileSync(path.join(root,'play/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'play/treehouse-stu-game.css'),'utf8');
const context=vm.createContext({Math,console});
vm.runInContext(`${engineSource}\nthis.engine=TreehouseSTUGame;`,context);
const engine=context.engine,config=engine.CONFIG;

assert.equal(engine.validate(config),true);
assert.equal(config.id,'treehouse-crane-stu');
assert.equal(config.rewardSourceId,'minigame:treehouse-crane-stu');
assert.equal(config.totalDeliveries,12);
assert.deepEqual(Array.from(config.items,item=>item.word),['Sun','Tiger','Umbrella']);
assert.deepEqual(Array.from(config.items,item=>[item.nameAudio,item.soundAudio,item.wordAudio]),[['s_name','s_sound','sun'],['t_name','t_sound','tiger'],['u_name','u_sound','umbrella']]);
assert.equal(config.layers.length,19);
assert.equal(new Set(config.layers.map(layer=>layer.z)).size,19);
assert.equal(config.layers.filter(layer=>layer.stage===12).length,3);
assert.deepEqual(Array.from(config.layers.filter(layer=>layer.stage===12),layer=>layer.id),['flowers','lanterns','flags']);
const frontGable=config.layers.find(layer=>layer.id==='front-gable');
const roofLayers=config.layers.filter(layer=>layer.id==='roof-left'||layer.id==='roof-right');
assert.equal(frontGable.file,'14-ФАСАД (мансарда).png');
assert.equal(frontGable.stage,7);
assert.ok(roofLayers.every(layer=>frontGable.z>layer.z),'front gable must stay visible above both roof panels');
const frontComposition=['roof-frame','roof-left','roof-right','facade-wall','front-gable','window','door'];
const frontCompositionLayers=frontComposition.map(id=>config.layers.find(layer=>layer.id===id));
assert.deepEqual(Array.from(frontCompositionLayers,layer=>layer.stage),[6,8,8,5,7,9,9]);
assert.ok(frontCompositionLayers.every((layer,index)=>index===0||layer.z>frontCompositionLayers[index-1].z),'front composition z-order must stay independent from construction stages');

const randomValues=[.12,.71,.39,.91,.24,.55,.84,.03,.63,.44,.76,.18,.97,.31,.68,.08,.52,.88,.27,.59];let randomIndex=0;
const state=engine.initialState(config,()=>randomValues[randomIndex++%randomValues.length]);
assert.equal(state.taskOrder.length,12);
assert.deepEqual([...state.taskOrder.slice(0,3)].sort(),['S','T','U']);
assert.deepEqual([...state.taskOrder.slice(3,6)].sort(),['S','T','U']);
assert.deepEqual(state.taskOrder.slice(6).reduce((counts,letter)=>(counts[letter]=(counts[letter]||0)+1,counts),{}),{S:2,T:2,U:2});
assert.ok(state.optionOrders.every(order=>order.length===3&&new Set(order).size===3));

const first=engine.currentTask(config,state),wrong=config.items.find(item=>item.letter!==first.letter).letter;
assert.equal(engine.pickMaterial(config,state,wrong),'retry');
assert.equal(state.completedDeliveries,0);
assert.equal(engine.pickMaterial(config,state,wrong),'retry-hint');
assert.equal(engine.pickMaterial(config,state,first.letter),'attached');
assert.equal(engine.deliver(config,state,first.letter),'correct');
assert.equal(state.completedDeliveries,1);
assert.equal(engine.visibleLayers(config,state).length,1);
const restored=engine.restore(config,JSON.parse(JSON.stringify(state)),()=>.5);
assert.equal(restored.completedDeliveries,1);
assert.equal(engine.currentTask(config,restored).letter,state.taskOrder[1]);
for(let stage=2;stage<=12;stage++){
 const task=engine.currentTask(config,state),result=engine.deliver(config,state,task.letter);
 if(stage===3||stage===6)assert.equal(result,'round-complete');
 else if(stage===12)assert.equal(result,'game-complete');
 else assert.equal(result,'correct');
 assert.ok(engine.visibleLayers(config,state).every(layer=>layer.stage<=stage));
}
assert.equal(state.gameCompleted,true);
assert.equal(engine.visibleLayers(config,state).length,19);
const finish=engine.render(config,state,{characterHTML:'<span>Marius</span>'});
assert.match(finish,/Домик готов!/);assert.equal((finish.match(/treehouse-reward-stars/g)||[]).length,1);assert.equal((finish.match(/<span>★<\/span>/g)||[]).length,3);

const assetDir=path.join(root,'play/images/treehouse-stu');
const expectedFiles=['00-ФОН (без дома).png','01-ОПОРА.png','02-СТЕНА задняя.png','03-МАНСАРДА задняя.png','04-КРОВЛЯ левая.png','05-КАРКАС (стойки).png','06-СТЕНА правая.png','07-ПЛОЩАДКА.png','08-КАРКАС (крыша).png','09-СТЕНА левая.png','10-КРОВЛЯ правая.png','11-ФАСАД (стена).png','12-ОКНО.png','13-ДВЕРЬ.png','14-ФАСАД (мансарда).png','15-ОГРАЖДЕНИЕ.png','16-ЛЕСТНИЦА (с тенью).png','17-1-ЦВЕТЫ (с тенью).png','17-2-ФОНАРИ (с тенью).png','17-3-ФЛАЖКИ (с тенью).png'];
const dimensions=[];
for(const file of expectedFiles){const png=fs.readFileSync(path.join(assetDir,file));assert.equal(png.subarray(1,4).toString(),'PNG');dimensions.push(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`);}
assert.equal(new Set(dimensions).size,1);assert.equal(dimensions[0],'1654x2205');

assert.match(css,/aspect-ratio:1654\/2205/);assert.match(css,/\.treehouse-background,.treehouse-house-layer\{[^}]*object-fit:fill[^}]*object-position:0 0/);assert.doesNotMatch(css,/object-fit:cover/);assert.match(css,/\.treehouse-artboard\{[^}]*overflow:visible/);assert.match(css,/\.treehouse-finish-scene\{[^}]*overflow:visible/);assert.match(css,/touch-action:none/);assert.match(css,/@media\(max-width:520px\)/);assert.match(css,/prefers-reduced-motion/);
assert.match(appSource,/setPointerCapture\?\.\(event\.pointerId\)/);assert.match(appSource,/releasePointerCapture/);assert.match(appSource,/data-treehouse-build-zone/);assert.match(appSource,/Груз держится на магните/);assert.match(appSource,/renderCharacter\('gameplay'.*treehouse-marius-stage/);assert.match(appSource,/STU_TREEHOUSE_GAME\.rewardSourceId/);

const course=createContext();
course.run("AppState.cursor={phase:'letterReward',index:STU_END_INDEX,step:0};advanceAfterLetter()");
assert.equal(course.run('AppState.cursor.phase'),'treehouse_stu');
course.run("let task=TreehouseSTUGame.currentTask(STU_TREEHOUSE_GAME,treehouseState());TreehouseSTUGame.deliver(STU_TREEHOUSE_GAME,treehouseState(),task.letter);saveProgress()");
const resumed=createContext({saved:saved(course)});
assert.equal(resumed.run('AppState.cursor.phase'),'treehouse_stu');assert.equal(resumed.run('treehouseState().completedDeliveries'),1);assert.equal(resumed.run('TreehouseSTUGame.visibleLayers(STU_TREEHOUSE_GAME,treehouseState()).length'),1);
resumed.run("while(!treehouseState().gameCompleted){const task=TreehouseSTUGame.currentTask(STU_TREEHOUSE_GAME,treehouseState());TreehouseSTUGame.deliver(STU_TREEHOUSE_GAME,treehouseState(),task.letter)};awardStars(StudentDomain.STAR_REWARDS.blockCompleted,'minigame_completed',STU_TREEHOUSE_GAME.rewardSourceId);saveProgress()");
assert.equal(resumed.run("awardStars(3,'minigame_completed',STU_TREEHOUSE_GAME.rewardSourceId)"),false);
assert.equal(resumed.run("AppState.student.starTransactions.filter(item=>item.sourceId===STU_TREEHOUSE_GAME.rewardSourceId).length"),1);
resumed.run('continueTreehouse()');assert.deepEqual(JSON.parse(resumed.run('JSON.stringify(AppState.cursor)')),{phase:'cumulativeIntro',index:20,step:0});

const legacy=JSON.parse(course.run('JSON.stringify(AppState)'));legacy.version=6;delete legacy.treehouse;delete legacy.treehouseReturn;legacy.cursor={phase:'lesson',index:22,step:2};legacy.started=true;
const legacyLoaded=createContext({saved:{'alfie-abc-v1':JSON.stringify(legacy)}});
assert.deepEqual(JSON.parse(legacyLoaded.run('JSON.stringify(AppState.cursor)')),{phase:'lesson',index:22,step:2});assert.equal(legacyLoaded.run('treehouseUnlocked()'),true);assert.ok(legacyLoaded.run('renderHome()').includes('treehouse-open'));

console.log(JSON.stringify({passed:true,rounds:3,deliveries:12,layers:19,artistPngs:20,canvas:dimensions[0],pointerCapture:true,persistentPartialBuild:true,duplicateRewardGuard:true,courseOrder:'S/T/U -> treehouse_stu -> cumulative_review_AU'},null,2));
