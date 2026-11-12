const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createContext,saved}=require('./support/trainer-harness.cjs');

const root=path.resolve(__dirname,'..');
const engineSource=fs.readFileSync(path.join(root,'play/railway-vwx-game.js'),'utf8');
const appSource=fs.readFileSync(path.join(root,'play/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'play/railway-vwx-game.css'),'utf8');
const context=vm.createContext({Math,console,setTimeout,clearTimeout});
vm.runInContext(`${engineSource}\nthis.engine=RailwayVWXGame;`,context);
const engine=context.engine,config=engine.CONFIG,routes=engine.ROUTES;

assert.equal(engine.validate(config),true);
assert.deepEqual([config.width,config.height],[941,1672]);
assert.equal(config.id,'railway-vwx');assert.equal(config.rewardSourceId,'minigame:railway-vwx');assert.equal(config.totalDeliveries,12);
assert.equal(config.startDistance,126);assert.equal(config.couplingGap,126);assert.equal(config.fadeMs,260);assert.equal(config.successHoldMs,850);
assert.deepEqual(Object.keys(routes),['LEFT','CENTER','RIGHT']);
assert.deepEqual(Array.from(config.items,item=>[item.letter,item.routeId,item.word,item.nameAudio,item.soundAudio,item.wordAudio]),[
 ['V','LEFT','Van','v_name','v_sound','van'],['W','CENTER','Whale','w_name','w_sound','whale'],['X','RIGHT','Fox','x_name','x_sound','fox']
]);
assert.equal(new Set(Object.values(routes).map(route=>route.path.split(' C ')[0])).size,1,'all routes share one depot start');
assert.equal(engine.routeForAngle(-31),'LEFT');assert.equal(engine.routeForAngle(0),'CENTER');assert.equal(engine.routeForAngle(31),'RIGHT');
assert.ok(Math.abs(engine.LEVER_GEOMETRY.basePivotX-627/1254)<1e-9);assert.ok(Math.abs(engine.LEVER_GEOMETRY.basePivotY-536/1254)<1e-9);assert.ok(Math.abs(engine.LEVER_GEOMETRY.handlePivotY-1070/1254)<1e-9);
assert.equal(engine.routeProgress(config.startDistance,config.startDistance,1400),0);assert.equal(engine.routeProgress(1400,config.startDistance,1400),1);
const curveDistance=config.startDistance+(1400-config.startDistance)*.7;
assert.ok(engine.speedTarget(config,routes.LEFT,curveDistance,1400,1)<engine.speedTarget(config,routes.CENTER,curveDistance,1400,1),'turning routes slow down through the curve');
assert.ok(engine.speedTarget(config,routes.CENTER,config.startDistance+20,1400,1)<config.maxSpeed,'departure accelerates');
assert.ok(engine.speedTarget(config,routes.CENTER,1380,1400,1)<config.maxSpeed,'arrival brakes');

const randomValues=[.12,.71,.39,.91,.24,.55,.84,.03,.63,.44,.76,.18,.97,.31,.68,.08,.52,.88,.27,.59];let randomIndex=0;
const state=engine.initialState(config,()=>randomValues[randomIndex++%randomValues.length]);
assert.equal(state.taskOrder.length,12);assert.deepEqual([...state.taskOrder.slice(0,3)].sort(),['V','W','X']);assert.deepEqual([...state.taskOrder.slice(3,6)].sort(),['V','W','X']);
assert.deepEqual(state.taskOrder.slice(6).reduce((counts,letter)=>(counts[letter]=(counts[letter]||0)+1,counts),{}),{V:2,W:2,X:2});
assert.notEqual(state.taskOrder[5],state.taskOrder[6],'word order avoids a repeated boundary when possible');

// Wrong arrivals at every physical station never change progress or consume cargo.
for(const routeId of ['LEFT','CENTER','RIGHT']){
 const sample=engine.initialState(config,()=>.5);
 sample.taskOrder[0]=routeId==='LEFT'?'W':'V';
 assert.notEqual(engine.currentTask(config,sample).routeId,routeId);
 assert.equal(engine.answer(config,sample,routeId),'retry');assert.equal(sample.completedDeliveries,0);assert.equal(sample.errors,1);
}
const retries=engine.initialState(config,()=>.5),target=engine.currentTask(config,retries),wrong=target.routeId==='LEFT'?'RIGHT':'LEFT';
assert.equal(engine.answer(config,retries,wrong),'retry');assert.equal(engine.answer(config,retries,wrong),'retry');assert.equal(engine.answer(config,retries,wrong),'retry');assert.equal(retries.completedDeliveries,0);assert.equal(engine.currentTask(config,retries).id,target.id);
const duplicate=engine.initialState(config,()=>.5),duplicateTask=engine.currentTask(config,duplicate);duplicate.completedTasks.push(duplicateTask.id);assert.equal(engine.answer(config,duplicate,duplicateTask.routeId),'ignored');assert.equal(duplicate.completedDeliveries,0);

const outcomes=[];const correctRoutes=new Set();
while(!state.gameCompleted){const task=engine.currentTask(config,state);correctRoutes.add(task.routeId);outcomes.push(engine.answer(config,state,task.routeId));}
assert.deepEqual([...correctRoutes].sort(),['CENTER','LEFT','RIGHT']);assert.equal(state.completedDeliveries,12);assert.equal(state.completedTasks.length,12);assert.equal(state.gameCompleted,true);
assert.equal(outcomes[2],'round-complete');assert.equal(outcomes[5],'round-complete');assert.equal(outcomes.at(-1),'game-complete');
assert.equal(engine.answer(config,state,'LEFT'),'ignored');assert.equal(state.completedDeliveries,12);
const restored=engine.restore(config,JSON.parse(JSON.stringify(state)),()=>.1);assert.equal(restored.gameCompleted,true);assert.equal(restored.completedDeliveries,12);assert.deepEqual(Array.from(restored.taskOrder),Array.from(state.taskOrder));

const names=engine.initialState(config,()=>.5),nameHTML=engine.render(config,names,{debug:true,icons:{speaker:'S'}});
assert.match(nameHTML,/data-debug="true"/);assert.match(nameHTML,/viewBox="0 0 941 1672"/);assert.match(nameHTML,/Названия букв/);assert.match(nameHTML,/Найди букву!/);assert.equal((nameHTML.match(/data-railway-route=/g)||[]).length,3);assert.equal((nameHTML.match(/data-railway-station=/g)||[]).length,3);assert.equal((nameHTML.match(/data-railway-marker=/g)||[]).length,3);assert.equal((nameHTML.match(/railway-station-marker is-letter/g)||[]).length,3);assert.equal((nameHTML.match(/data-railway-choice=/g)||[]).length,3);
names.completedDeliveries=6;names.completedTasks=Array.from({length:6},(_,index)=>`done-${index}`);const wordHTML=engine.render(config,names);assert.match(wordHTML,/Доставка слов/);assert.match(wordHTML,/data-railway-cargo/);assert.equal((wordHTML.match(/railway-station-marker is-word/g)||[]).length,3);for(const visual of ['🚐','🐋','🦊'])assert.match(wordHTML,new RegExp(visual));assert.doesNotMatch(wordHTML,/>Van<|>Whale<|>Fox</);
const retryHTML=engine.render(config,retries);assert.doesNotMatch(retryHTML,/is-hint|is-strong-hint/);
const finishHTML=engine.render(config,state,{characterHTML:'<span>Marius</span>'});assert.match(finishHTML,/Все посылки доставлены!/);assert.match(finishHTML,/Ты выполнил 12 заданий с V, W и X\./);assert.doesNotMatch(finishHTML,/railway-finish-(?:decor|garland|ribbon|bow|flowers|confetti)\.png/);assert.equal((finishHTML.match(/<span>★<\/span>/g)||[]).length,3);assert.doesNotMatch(finishHTML,/<i><\/i>|railway-locomotive\.png/);assert.equal((finishHTML.match(/railway-finish-wagon is-(?:left|right)/g)||[]).length,2);assert.match(finishHTML,/railway-wagon-02\.png/);assert.match(finishHTML,/railway-wagon-03\.png/);assert.match(finishHTML,/railway-cargo-01\.png/);assert.match(finishHTML,/railway-cargo-06\.png/);

const assetDir=path.join(root,'play/images/railway-vwx');
const expected=['railway-bg.png','railway-tracks.png','railway-station-v.png','railway-station-w.png','railway-station-x.png','railway-locomotive.png','railway-wagon-01.png','railway-wagon-02.png','railway-wagon-03.png','railway-lever-base.png','railway-lever-handle.png','railway-finish-decor.png',...['garland','ribbon','bow','flowers','confetti'].map(name=>`railway-finish-${name}.png`),...Array.from({length:6},(_,index)=>`railway-cargo-0${index+1}.png`)];
for(const file of expected){const png=fs.readFileSync(path.join(assetDir,file));assert.equal(png.subarray(1,4).toString(),'PNG',file);assert.ok(png.readUInt32BE(16)>0&&png.readUInt32BE(20)>0,file);}
for(const file of ['railway-bg.png','railway-tracks.png']){const png=fs.readFileSync(path.join(assetDir,file));assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[941,1672],file);}
for(const file of ['v_name.mp3','v_sound.mp3','van.mp3','w_name.mp3','w_sound.mp3','whale.mp3','x_name.mp3','x_sound.mp3','fox.mp3'])assert.ok(fs.statSync(path.join(root,'play/audio',file)).size>100,file);

assert.match(css,/aspect-ratio:941\/1672/);assert.match(css,/\.railway-background,.railway-tracks\{[^}]*object-fit:fill[^}]*object-position:0 0/);assert.doesNotMatch(css,/object-fit:cover/);assert.match(css,/\.railway-game\.is-vanishing \.railway-train-unit\{opacity:0!important\}/);assert.match(css,/railway-reset-steam/);assert.match(css,/railway-unload-cargo/);assert.match(css,/railway-station\.is-wrong/);assert.match(css,/railway-station-marker\{/);assert.match(css,/width:clamp\(46px,12\.4%,67px\)/);assert.match(css,/--lever-base-pivot-y:42\.74%/);assert.match(css,/--lever-handle-pivot-y:85\.33%/);assert.match(css,/\.railway-handle-rotor\{/);assert.match(css,/\.railway-finish-showcase\{[^}]*grid-template-columns/);assert.match(css,/\.railway-finish-wagon\.is-left\{justify-self:end\}/);assert.match(css,/\.railway-finish-wagon\.is-right\{justify-self:start\}/);assert.match(css,/@media\(max-width:520px\)/);assert.match(css,/orientation:landscape/);assert.match(css,/prefers-reduced-motion/);
assert.match(engineSource,/getTotalLength\(\)/);assert.match(engineSource,/getPointAtLength/);assert.match(engineSource,/requestAnimationFrame/);assert.match(engineSource,/setPointerCapture/);assert.match(engineSource,/releasePointerCapture/);assert.match(engineSource,/config\.couplingGap\*\(index\+1\)/);assert.match(engineSource,/arrivalHandled/);assert.match(engineSource,/audioWaitMaxMs:8500/);assert.match(engineSource,/runtime\.phase='vanish'/);assert.match(engineSource,/runtime\.distance=config\.startDistance/);assert.doesNotMatch(engineSource,/startReturn|finishReturn|animate\(-1\)|data-phase="return"|onStrongHint|retry-hint|retry-strong/);
assert.match(appSource,/VWX_RAILWAY_GAME\.rewardSourceId/);assert.match(appSource,/RailwayVWXGame\.restore/);assert.match(appSource,/AudioManager\.play\(railwayAudioItem\(payload\.task\)\)/);assert.match(appSource,/DEMO_SCREEN==='railway_vwx'/);assert.match(appSource,/railwayProgress/);assert.doesNotMatch(appSource,/onStrongHint/);

const course=createContext();
course.run("view='course';AppState.cursor={phase:'letterReward',index:VWX_END_INDEX,step:0};advanceAfterLetter()");assert.equal(course.run('AppState.cursor.phase'),'railway_vwx');assert.match(course.nodes.get('#main').innerHTML,/data-railway-game="railway-vwx"/);
course.run("let task=RailwayVWXGame.currentTask(VWX_RAILWAY_GAME,railwayState());RailwayVWXGame.answer(VWX_RAILWAY_GAME,railwayState(),task.routeId);saveProgress()");
const resumed=createContext({saved:saved(course)});assert.equal(resumed.run('AppState.cursor.phase'),'railway_vwx');assert.equal(resumed.run('railwayState().completedDeliveries'),1);assert.deepEqual(JSON.parse(resumed.run('JSON.stringify(railwayState().taskOrder)')),JSON.parse(course.run('JSON.stringify(railwayState().taskOrder)')));
resumed.run("while(!railwayState().gameCompleted){const task=RailwayVWXGame.currentTask(VWX_RAILWAY_GAME,railwayState());RailwayVWXGame.answer(VWX_RAILWAY_GAME,railwayState(),task.routeId)};awardStars(StudentDomain.STAR_REWARDS.blockCompleted,'minigame_completed',VWX_RAILWAY_GAME.rewardSourceId);saveProgress()");
assert.equal(resumed.run("awardStars(3,'minigame_completed',VWX_RAILWAY_GAME.rewardSourceId)"),false);assert.equal(resumed.run("AppState.student.starTransactions.filter(item=>item.sourceId===VWX_RAILWAY_GAME.rewardSourceId).length"),1);resumed.run('continueRailway()');assert.deepEqual(JSON.parse(resumed.run('JSON.stringify(AppState.cursor)')),{phase:'cumulativeIntro',index:23,step:0});
assert.match(appSource,/AudioManager\.setEnabled\(AppState\.soundEnabled\)/,'global mute remains connected to railway pronunciation');
const demo=createContext({search:'?demo=1&screen=railway_vwx&railwayDebug=1'});assert.equal(demo.run('AppState.cursor.phase'),'railway_vwx');assert.equal(demo.run('RAILWAY_DEBUG'),true);assert.equal(demo.run('railwayState().completedDeliveries'),0);assert.match(demo.nodes.get('#main').innerHTML,/data-debug="true"/);

console.log(JSON.stringify({passed:true,canvas:'941x1672',rounds:3,tasks:12,routes:['LEFT/V','CENTER/W','RIGHT/X'],words:['Van','Whale','Fox'],audioFiles:9,wrongAllStations:true,wrongDoesNotRevealAnswer:true,persistentOrder:true,cargoAssets:6,fadeResetMs:config.fadeMs,reverseTripRemoved:true,audioFailureGuardMs:config.audioWaitMaxMs,finalTrainStaysAtStation:true,duplicateProgressGuard:true,duplicateRewardGuard:true,courseOrder:'V/W/X -> railway_vwx -> cumulative_review_AX -> Y',artistPngs:expected.length,debugRouteMode:true},null,2));
