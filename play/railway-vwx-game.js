'use strict';

/* V/W/X railway rules, markup and route animation.
   The artist SVG paths, train geometry and lever interaction stay isolated from
   course persistence/audio, which are supplied by index.html callbacks. */
const RailwayVWXGame=(()=>{
  const WIDTH=941,HEIGHT=1672,BASE='./images/railway-vwx/';
  const LEVER_GEOMETRY=Object.freeze({basePivotX:627/1254,basePivotY:536/1254,handlePivotX:627/1254,handlePivotY:1070/1254});
  const ASSETS=Object.freeze({
    background:`${BASE}railway-bg.png`,tracks:`${BASE}railway-tracks.png`,locomotive:`${BASE}railway-locomotive.png`,
    wagons:Object.freeze([`${BASE}railway-wagon-01.png`,`${BASE}railway-wagon-02.png`,`${BASE}railway-wagon-03.png`]),
    cargos:Object.freeze(Array.from({length:6},(_,index)=>`${BASE}railway-cargo-${String(index+1).padStart(2,'0')}.png`)),
    finishDecorations:Object.freeze({garland:`${BASE}railway-finish-garland.png`,ribbon:`${BASE}railway-finish-ribbon.png`,bow:`${BASE}railway-finish-bow.png`,flowers:`${BASE}railway-finish-flowers.png`,confetti:`${BASE}railway-finish-confetti.png`}),
    leverBase:`${BASE}railway-lever-base.png`,leverHandle:`${BASE}railway-lever-handle.png`
  });
  const ROUTES=Object.freeze({
    LEFT:Object.freeze({id:'LEFT',letter:'V',label:'левая станция',angle:-29,color:'#ffcf4c',station:`${BASE}railway-station-v.png`,stationX:155,stationY:157,stationWidth:310,markerX:155,markerY:260,path:'M 470.5 1582 C 469 1310 472 1035 470.5 822 C 470 751 432 704 365 655 C 282 596 217 543 188 476 C 178 452 172 431 170 416',curve:[.59,.94]}),
    CENTER:Object.freeze({id:'CENTER',letter:'W',label:'центральная станция',angle:0,color:'#6fe18b',station:`${BASE}railway-station-w.png`,stationX:470.5,stationY:105,stationWidth:330,markerX:470.5,markerY:216,path:'M 470.5 1582 C 469 1310 472 1040 470.5 822 C 470 676 471 535 471 408',curve:[.98,.99]}),
    RIGHT:Object.freeze({id:'RIGHT',letter:'X',label:'правая станция',angle:29,color:'#72c9ff',station:`${BASE}railway-station-x.png`,stationX:786,stationY:157,stationWidth:310,markerX:786,markerY:260,path:'M 470.5 1582 C 469 1310 472 1035 470.5 822 C 471 751 509 704 576 655 C 659 596 724 543 753 476 C 763 452 769 431 771 416',curve:[.59,.94]})
  });
  const ITEMS=Object.freeze([
    Object.freeze({letter:'V',routeId:'LEFT',word:'Van',visual:'🚐',nameAudio:'v_name',soundAudio:'v_sound',wordAudio:'van'}),
    Object.freeze({letter:'W',routeId:'CENTER',word:'Whale',visual:'🐋',nameAudio:'w_name',soundAudio:'w_sound',wordAudio:'whale'}),
    Object.freeze({letter:'X',routeId:'RIGHT',word:'Fox',visual:'🦊',nameAudio:'x_name',soundAudio:'x_sound',wordAudio:'fox'})
  ]);
  const ROUNDS=Object.freeze([
    Object.freeze({id:'names',title:'Названия букв',instruction:'Найди букву!',audioField:'nameAudio',visual:'letter',taskCount:3}),
    Object.freeze({id:'sounds',title:'Звуки букв',instruction:'Слушай звук!',audioField:'soundAudio',visual:'letter',taskCount:3}),
    Object.freeze({id:'words',title:'Доставка слов',instruction:'Доставь посылку!',audioField:'wordAudio',visual:'word',taskCount:6})
  ]);
  const CONFIG=Object.freeze({
    id:'railway-vwx',rewardSourceId:'minigame:railway-vwx',width:WIDTH,height:HEIGHT,totalDeliveries:12,
    startDistance:126,couplingGap:126,departureDelayMs:500,stationPauseMs:780,wrongPauseMs:720,
    successHoldMs:850,fadeMs:260,finaleSceneMs:2300,audioWaitMaxMs:8500,maxSpeed:310,acceleration:360,deceleration:510,
    routes:ROUTES,items:ITEMS,rounds:ROUNDS,assets:ASSETS
  });
  const routeList=(config=CONFIG)=>Object.values(config.routes);
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function shuffled(values,random=Math.random){const result=[...values];for(let index=result.length-1;index>0;index--){const swap=clamp(Math.floor(random()*(index+1)),0,index);[result[index],result[swap]]=[result[swap],result[index]];}return result;}
  function wordOrder(letters,random=Math.random){const first=shuffled(letters,random),second=shuffled(letters,random);if(first.at(-1)===second[0]&&second.length>1)[second[0],second[1]]=[second[1],second[0]];return [...first,...second];}
  function createTaskOrder(config=CONFIG,random=Math.random){const letters=config.items.map(item=>item.letter);return [...shuffled(letters,random),...shuffled(letters,random),...wordOrder(letters,random)];}
  function validate(config=CONFIG){
    if(config.width!==941||config.height!==1672)throw new TypeError('Railway artboard must remain 941 x 1672');
    const routes=Object.values(config.routes||{});if(routes.length!==3||routes.some(route=>!route.path||!route.station||!route.letter))throw new TypeError('Railway needs three complete routes');
    if(new Set(routes.map(route=>route.letter)).size!==3||config.items?.length!==3||config.rounds?.length!==3||config.totalDeliveries!==12)throw new TypeError('Railway VWX needs three letters and 12 tasks');
    for(const item of config.items)if(!item.routeId||!item.word||!item.visual||!item.nameAudio||!item.soundAudio||!item.wordAudio)throw new TypeError(`Invalid VWX item ${item.letter||''}`);
    return true;
  }
  function validTaskOrder(config,order){const letters=config.items.map(item=>item.letter);return Array.isArray(order)&&order.length===config.totalDeliveries&&order.every(letter=>letters.includes(letter))&&config.rounds.every((round,index)=>{const start=index===0?0:index===1?3:6,slice=order.slice(start,start+round.taskCount);return letters.every(letter=>slice.filter(value=>value===letter).length===(index===2?2:1));});}
  function initialState(config=CONFIG,random=Math.random){validate(config);return {gameId:config.id,taskOrder:createTaskOrder(config,random),completedDeliveries:0,completedTasks:[],errors:0,gameCompleted:false};}
  function restore(config=CONFIG,saved,random=Math.random){
    const fresh=initialState(config,random);if(!saved||typeof saved!=='object'||(saved.gameId&&saved.gameId!==config.id))return fresh;
    if(validTaskOrder(config,saved.taskOrder))fresh.taskOrder=[...saved.taskOrder];
    const done=Number.isInteger(saved.completedDeliveries)?clamp(saved.completedDeliveries,0,config.totalDeliveries):0;fresh.completedDeliveries=done;
    fresh.completedTasks=Array.isArray(saved.completedTasks)?saved.completedTasks.filter((id,index,array)=>typeof id==='string'&&array.indexOf(id)===index).slice(0,done):[];
    if(fresh.completedTasks.length!==done)fresh.completedTasks=Array.from({length:done},(_,index)=>`${roundForIndex(config,index).id}:${fresh.taskOrder[index]}:${index+1}`);
    fresh.errors=Number.isFinite(saved.errors)?Math.max(0,Math.floor(saved.errors)):0;fresh.gameCompleted=Boolean(saved.gameCompleted&&done===config.totalDeliveries)||done===config.totalDeliveries;
    return fresh;
  }
  function roundForIndex(config=CONFIG,index=0){return index<3?config.rounds[0]:index<6?config.rounds[1]:config.rounds[2];}
  function currentTask(config=CONFIG,state){
    if(!state||state.gameCompleted||state.completedDeliveries>=config.totalDeliveries)return null;
    const index=state.completedDeliveries,item=config.items.find(candidate=>candidate.letter===state.taskOrder[index]),round=roundForIndex(config,index);
    return item&&round?Object.freeze({...item,index,stage:index+1,id:`${round.id}:${item.letter}:${index+1}`,roundId:round.id,roundTitle:round.title,instruction:round.instruction,visualMode:round.visual,audioKey:item[round.audioField]}):null;
  }
  function answer(config=CONFIG,state,routeId){
    const task=currentTask(config,state);if(!task||!config.routes[routeId])return 'ignored';
    if(routeId!==task.routeId){state.errors++;return 'retry';}
    if(state.completedTasks.includes(task.id))return 'ignored';
    state.completedTasks.push(task.id);state.completedDeliveries++;state.errors=0;
    if(state.completedDeliveries>=config.totalDeliveries){state.completedDeliveries=config.totalDeliveries;state.gameCompleted=true;return 'game-complete';}
    if(state.completedDeliveries===3||state.completedDeliveries===6)return 'round-complete';
    return 'correct';
  }
  function progress(config=CONFIG,state){return clamp(Number(state?.completedDeliveries)||0,0,config.totalDeliveries);}
  function routeForAngle(angle){return angle< -11?'LEFT':angle>11?'RIGHT':'CENTER';}
  function routeProgress(distance,start,total){return clamp((distance-start)/Math.max(1,total-start),0,1);}
  function speedTarget(config,route,distance,total,direction=1){
    const start=config.startDistance,end=total,travelled=direction>0?distance-start:end-distance,remaining=direction>0?end-distance:distance-start;
    const acceleration=clamp(travelled/155,.1,1),braking=clamp(remaining/215,.075,1),pathProgress=routeProgress(distance,start,total),insideCurve=route.id!=='CENTER'&&pathProgress>=route.curve[0]&&pathProgress<=route.curve[1];
    return config.maxSpeed*Math.min(acceleration,braking)*(insideCurve?.73:1);
  }
  function ornamentMarkup(config,scope){return Object.entries(config.assets.finishDecorations).map(([name,source])=>`<img class="${scope}-ornament ${scope}-ornament-${name}" src="${escape(source)}" alt="" draggable="false">`).join('');}
  function finishMarkup(config,options){const arrow=options.icons?.arrow||'→',character=options.characterHTML||'<span class="railway-marius-fallback">🦒</span>';return `<section class="railway-game railway-finish-screen is-complete" data-railway-game="${escape(config.id)}"><div class="railway-finish-card"><div class="railway-reward-stars" aria-label="Три звезды"><span>★</span><span>★</span><span>★</span></div><div class="railway-finish-showcase"><div class="railway-finish-wagon is-left" aria-hidden="true"><img class="railway-finish-wagon-body" src="${escape(config.assets.wagons[1])}" alt=""><img class="railway-finish-wagon-cargo" src="${escape(config.assets.cargos[0])}" alt=""></div><div class="railway-finish-marius">${character}</div><div class="railway-finish-wagon is-right" aria-hidden="true"><img class="railway-finish-wagon-body" src="${escape(config.assets.wagons[2])}" alt=""><img class="railway-finish-wagon-cargo" src="${escape(config.assets.cargos[5])}" alt=""></div></div></div><h1>Все посылки доставлены!</h1><p>Ты выполнил 12 заданий с V, W и X.</p><div class="railway-finish-actions"><button class="secondary" data-action="railway-replay">Играть ещё</button><button class="primary" data-action="railway-continue">Дальше ${arrow}</button></div></section>`;}
  function render(config=CONFIG,state=null,options={}){
    if(state&&typeof state==='object'&&!Array.isArray(state.taskOrder)){options=state;state=null;}
    validate(config);if(state?.gameCompleted&&!options.revealCompletedScene)return finishMarkup(config,options);
    const debug=Boolean(options.debug),educational=Boolean(state),done=educational?progress(config,state):0,task=educational?currentTask(config,state):null,round=task?roundForIndex(config,task.index):config.rounds[0],wordMode=task?.visualMode==='word',wagonIndex=task?.roundId==='sounds'?1:task?.roundId==='words'?2:0;
    const routePaths=routeList(config).map(route=>`<path id="railway-route-${route.id.toLowerCase()}" class="railway-route railway-route-${route.id.toLowerCase()}" data-railway-route="${route.id}" d="${route.path}" pathLength="1"></path>`).join('');
    const debugPoints=routeList(config).map(route=>{const end=route.id==='LEFT'?[170,416]:route.id==='RIGHT'?[771,416]:[471,408];return `<circle cx="${end[0]}" cy="${end[1]}" r="13" class="railway-debug-point" style="--debug-color:${route.color}"></circle><text x="${end[0]}" y="${end[1]-24}" class="railway-debug-label">${route.letter} END</text>`;}).join('');
    const stations=routeList(config).map(route=>{const item=config.items.find(candidate=>candidate.routeId===route.id),display=wordMode?item.visual:route.letter,label=wordMode?`Станция с картинкой: ${item.word}`:`Станция ${route.letter}`,markerMode=wordMode?'word':'letter';return `<div class="railway-station railway-station-${route.id.toLowerCase()}" data-railway-station="${route.id}" style="--station-x:${route.stationX};--station-y:${route.stationY};--station-width:${route.stationWidth};--station-color:${route.color}" aria-label="${escape(label)}"><img src="${escape(route.station)}" alt="" draggable="false"></div><span class="railway-station-marker is-${markerMode}" data-railway-marker="${route.id}" style="--marker-x:${route.markerX};--marker-y:${route.markerY};--marker-color:${route.color}" aria-hidden="true">${escape(display)}</span>`;}).join('');
    const notches=routeList(config).map(route=>`<button class="railway-notch railway-notch-${route.id.toLowerCase()}" type="button" data-railway-choice="${route.id}" aria-label="Маршрут к ${route.label}"><span>${route.letter}</span></button>`).join('');
    const cargo=task?.roundId==='words'?`<img class="railway-cargo" data-railway-cargo src="${escape(config.assets.cargos[task.index-6])}" alt="Посылка" draggable="false">`:'';
    const instruction=task?.instruction||'Выбери маршрут!',subline=educational?'Сначала послушай, затем переведи рычаг.':'Потяни рычаг или нажми V, W или X';
    return `<section class="railway-game" data-railway-game="${escape(config.id)}" data-phase="idle" data-round="${escape(round.id)}" data-debug="${debug}" data-educational="${educational}">
      <header class="railway-header"><div><p>Железная дорога Мариуса · раунд ${task?Math.min(3,task.index<3?1:task.index<6?2:3):'демо'} / 3</p><h1>${escape(round.title)}</h1></div><button class="railway-exit" type="button" data-action="railway-exit" aria-label="Выйти из игры">×</button></header>
      ${educational?`<div class="railway-progress" role="progressbar" aria-label="Выполнено заданий" aria-valuemin="0" aria-valuemax="${config.totalDeliveries}" aria-valuenow="${done}"><i style="width:${Math.round(done/config.totalDeliveries*100)}%"></i><span>${done} / ${config.totalDeliveries}</span></div><div class="railway-task"><div><strong>${escape(instruction)}</strong><small>${escape(subline)}</small></div><button class="railway-repeat" type="button" data-action="railway-repeat" aria-label="Повторить задание">${options.icons?.speaker||'🔊'}<span>Ещё раз</span></button></div>`:''}
      <div class="railway-scene" data-railway-scene aria-label="Три железнодорожных маршрута к станциям V, W и X">
        <img class="railway-background" src="${escape(config.assets.background)}" alt="" draggable="false"><img class="railway-tracks" src="${escape(config.assets.tracks)}" alt="" draggable="false">
        <svg class="railway-routes" viewBox="0 0 ${config.width} ${config.height}" preserveAspectRatio="none" aria-hidden="true">${routePaths}<circle cx="470.5" cy="1456" r="13" class="railway-debug-point railway-debug-start"></circle><circle cx="470.5" cy="822" r="13" class="railway-debug-point railway-debug-switch"></circle><text x="492" y="1448" class="railway-debug-label">START</text><text x="492" y="812" class="railway-debug-label">SWITCH</text>${debugPoints}</svg>
        ${stations}<div class="railway-finale-ornaments" aria-hidden="true">${ornamentMarkup(config,'railway-finale')}</div>
        <div class="railway-train-unit railway-wagon railway-finale-wagon railway-finale-wagon-back" data-railway-wagon="3" aria-hidden="true"><img src="${escape(config.assets.wagons[0])}" alt="" draggable="false"></div>
        <div class="railway-train-unit railway-wagon railway-finale-wagon railway-finale-wagon-middle" data-railway-wagon="2" aria-hidden="true"><img src="${escape(config.assets.wagons[1])}" alt="" draggable="false"></div>
        <div class="railway-train-unit railway-wagon railway-wagon-primary" data-railway-wagon="1" aria-hidden="true"><img src="${escape(config.assets.wagons[wagonIndex])}" alt="" draggable="false">${cargo}</div>
        <div class="railway-train-unit railway-locomotive" data-railway-locomotive aria-hidden="true"><i></i><img src="${escape(config.assets.locomotive)}" alt="" draggable="false"></div>
        <div class="railway-finale-message" aria-hidden="true"><b>V · W · X</b><span>★ Доставлено! ★</span></div><div class="railway-confetti" data-railway-confetti aria-hidden="true"></div>
      </div>
      <div class="railway-control-panel" data-railway-control><p class="railway-status" data-railway-status role="status" aria-live="polite">${escape(instruction)}</p><div class="railway-lever" data-railway-lever><img class="railway-lever-base" src="${escape(config.assets.leverBase)}" alt="" draggable="false">${notches}<button class="railway-handle" type="button" data-railway-handle aria-label="Рычаг стрелки. Потяни влево, прямо или вправо."><span class="railway-handle-rotor" aria-hidden="true"><img src="${escape(config.assets.leverHandle)}" alt="" draggable="false"></span></button></div></div>
    </section>`;
  }
  function mount(root,options={}){
    const config=options.config||CONFIG;validate(config);const learningState=options.state||null;
    const game=root?.querySelector?.('[data-railway-game]');if(!game||game.classList.contains('is-complete'))return null;
    const scene=game.querySelector('[data-railway-scene]'),handle=game.querySelector('[data-railway-handle]'),status=game.querySelector('[data-railway-status]'),locomotive=game.querySelector('[data-railway-locomotive]'),wagons=[...game.querySelectorAll('[data-railway-wagon]')].sort((a,b)=>Number(a.dataset.railwayWagon)-Number(b.dataset.railwayWagon));
    const paths=Object.fromEntries(routeList(config).map(route=>[route.id,game.querySelector(`[data-railway-route="${route.id}"]`)])),stations=Object.fromEntries(routeList(config).map(route=>[route.id,game.querySelector(`[data-railway-station="${route.id}"]`)]));
    const buttons=[...game.querySelectorAll('[data-railway-choice]')],listeners=[],timers=new Set(),runtime={phase:'idle',route:null,pointerId:null,handleAngle:0,distance:config.startDistance,velocity:0,raf:0,lastTime:0,runToken:0,arrivalHandled:false,destroyed:false};
    const schedule=(callback,delay)=>{const timer=setTimeout(()=>{timers.delete(timer);if(!runtime.destroyed)callback();},delay);timers.add(timer);return timer;};
    const pause=delay=>new Promise(resolve=>schedule(()=>resolve(true),delay));
    const nextFrame=()=>new Promise(resolve=>{runtime.raf=requestAnimationFrame(()=>{runtime.raf=0;resolve(!runtime.destroyed);});});
    const clearTimers=()=>{timers.forEach(timer=>clearTimeout(timer));timers.clear();};
    const listen=(element,type,listener,settings)=>{element?.addEventListener(type,listener,settings);listeners.push(()=>element?.removeEventListener(type,listener,settings));};
    const routeData=id=>config.routes[id]||config.routes.CENTER,pathFor=id=>paths[id]||paths.CENTER;
    const setStatus=message=>{if(status)status.textContent=message;};
    function setHandle(angle,animate=true){runtime.handleAngle=clamp(angle,-34,34);handle?.classList.toggle('is-dragging',!animate);handle?.style.setProperty('--lever-angle',`${runtime.handleAngle}deg`);}
    function setLocked(locked){game.classList.toggle('is-locked',locked);buttons.forEach(button=>button.disabled=locked);if(handle)handle.disabled=locked;game.querySelector('[data-action="railway-repeat"]')?.toggleAttribute('disabled',locked);}
    function pointAt(path,distance){const total=path.getTotalLength(),safe=clamp(distance,0,total),point=path.getPointAtLength(safe),before=path.getPointAtLength(clamp(safe-3,0,total)),after=path.getPointAtLength(clamp(safe+3,0,total));return {x:point.x,y:point.y,angle:Math.atan2(after.y-before.y,after.x-before.x)*180/Math.PI+90,total};}
    function place(unit,path,distance){if(!unit)return null;const point=pointAt(path,distance);unit.style.left=`${point.x/config.width*100}%`;unit.style.top=`${point.y/config.height*100}%`;unit.style.setProperty('--train-angle',`${point.angle}deg`);return point;}
    function placeTrain(routeId=runtime.route||'CENTER'){const path=pathFor(routeId),locomotivePoint=place(locomotive,path,runtime.distance);wagons.forEach((wagon,index)=>place(wagon,path,clamp(runtime.distance-config.couplingGap*(index+1),0,locomotivePoint.total)));}
    function updateSelection(routeId){game.dataset.route=routeId||'';routeList(config).forEach(route=>{paths[route.id]?.classList.toggle('is-selected',route.id===routeId);stations[route.id]?.classList.toggle('is-selected',route.id===routeId);buttons.find(button=>button.dataset.railwayChoice===route.id)?.classList.toggle('is-selected',route.id===routeId);});}
    function clearArrivalClasses(){routeList(config).forEach(route=>stations[route.id]?.classList.remove('is-arrived','is-correct','is-wrong'));}
    function playClick(){options.onClick?.();try{window.navigator?.vibrate?.(12);}catch(_){} }
    async function bounded(value,max=config.audioWaitMaxMs){let timer;try{return await Promise.race([Promise.resolve(value).catch(()=>false),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),max);})]);}finally{clearTimeout(timer);}}
    function addSteam(){if(!scene||!locomotive)return;const puff=document.createElement('span'),sceneRect=scene.getBoundingClientRect(),trainRect=locomotive.getBoundingClientRect();puff.className='railway-reset-steam';puff.style.left=`${(trainRect.left+trainRect.width*.5-sceneRect.left)/sceneRect.width*100}%`;puff.style.top=`${(trainRect.top+trainRect.height*.25-sceneRect.top)/sceneRect.height*100}%`;scene.appendChild(puff);schedule(()=>puff.remove(),700);}
    function addUnloadSparks(routeId){const station=stations[routeId];if(!scene||!station)return;const sceneRect=scene.getBoundingClientRect(),target=station.getBoundingClientRect(),burst=document.createElement('span');burst.className='railway-unload-sparks';burst.style.left=`${(target.left+target.width*.5-sceneRect.left)/sceneRect.width*100}%`;burst.style.top=`${(target.bottom-target.height*.2-sceneRect.top)/sceneRect.height*100}%`;burst.innerHTML='<i></i><i></i><i></i><i></i><i></i><i></i>';scene.appendChild(burst);schedule(()=>burst.remove(),900);}
    async function unloadCargo(routeId){const cargo=game.querySelector('[data-railway-cargo]'),station=stations[routeId];if(!cargo||!station||!scene)return true;const sceneRect=scene.getBoundingClientRect(),from=cargo.getBoundingClientRect(),to=station.getBoundingClientRect(),ghost=cargo.cloneNode(true);ghost.removeAttribute('data-railway-cargo');ghost.className='railway-unload-cargo';Object.assign(ghost.style,{left:`${from.left-sceneRect.left}px`,top:`${from.top-sceneRect.top}px`,width:`${from.width}px`,height:`${from.height}px`});scene.appendChild(ghost);cargo.classList.add('is-delivered');const dx=to.left+to.width*.5-(from.left+from.width*.5),dy=to.bottom-to.height*.22-(from.top+from.height*.5);addUnloadSparks(routeId);if(typeof ghost.animate==='function'){const animation=ghost.animate([{transform:'translate(0,0) scale(1)'},{transform:`translate(${dx*.45}px,${dy-28}px) scale(1.12)`,offset:.48},{transform:`translate(${dx}px,${dy}px) scale(.82)`,opacity:.9}],{duration:560,easing:'cubic-bezier(.2,.8,.25,1)',fill:'forwards'});await bounded(animation.finished,700);}else await pause(560);ghost.remove();return true;}
    async function quickReset(outcome){
      if(runtime.destroyed)return;runtime.phase='vanish';game.dataset.phase='vanish';setLocked(true);addSteam();game.classList.add('is-vanishing');setStatus('Поезд готовится к следующему рейсу…');await pause(config.fadeMs);if(runtime.destroyed)return;
      cancelAnimationFrame(runtime.raf);runtime.raf=0;runtime.runToken++;runtime.distance=config.startDistance;runtime.velocity=0;runtime.route=null;runtime.arrivalHandled=false;placeTrain('CENTER');setHandle(0);updateSelection(null);clearArrivalClasses();
      game.classList.add('is-appearing');void game.offsetWidth;game.classList.remove('is-vanishing');await nextFrame();game.classList.remove('is-appearing');await pause(config.fadeMs);if(runtime.destroyed)return;
      runtime.phase='idle';game.dataset.phase='idle';setLocked(false);const task=currentTask(config,learningState);setStatus(task?.instruction||'Потяни рычаг или нажми V, W или X');options.onCycleComplete?.({outcome,task});
    }
    async function startFinale(payload){if(runtime.destroyed)return;runtime.phase='finale';game.dataset.phase='finale';game.classList.add('is-finale');setStatus('Все 12 заданий выполнены!');const confetti=game.querySelector('[data-railway-confetti]');if(confetti)confetti.innerHTML=Array.from({length:18},(_,index)=>`<i style="--x:${12+(index*29)%78}%;--delay:${(index%6)*.08}s">${index%3?'✦':'★'}</i>`).join('');await pause(config.finaleSceneMs);if(!runtime.destroyed)options.onFinal?.(payload);}
    async function arrive(){
      if(runtime.destroyed||runtime.phase!=='outbound'||runtime.arrivalHandled)return;runtime.arrivalHandled=true;const route=routeData(runtime.route),task=currentTask(config,learningState);runtime.phase='station';game.dataset.phase='station';setLocked(true);
      if(!learningState||!task){stations[route.id]?.classList.add('is-arrived');setStatus(`Станция ${route.letter}! Поезд прибыл.`);options.onArrival?.({route,task:null,outcome:'demo'});await pause(config.stationPauseMs);return quickReset('demo');}
      const outcome=answer(config,learningState,route.id),correct=['correct','round-complete','game-complete'].includes(outcome),payload={route,task,outcome,state:learningState};options.onArrival?.(payload);
      if(!correct){stations[route.id]?.classList.add('is-wrong');setStatus('Почти! Попробуй другой маршрут.');await bounded(options.onWrong?.(payload),1200);await pause(config.wrongPauseMs);return quickReset(outcome);}
      stations[route.id]?.classList.add('is-arrived','is-correct');setStatus(outcome==='game-complete'?'Последняя доставка выполнена!':'Правильно! Послушай ещё раз.');const feedback=bounded(options.onCorrect?.(payload)),unloading=task.roundId==='words'?unloadCargo(route.id):Promise.resolve(true);await Promise.all([feedback,unloading]);await pause(config.successHoldMs);if(runtime.destroyed)return;if(outcome==='game-complete')return startFinale(payload);return quickReset(outcome);
    }
    function animateOutbound(){
      const token=++runtime.runToken,route=routeData(runtime.route),path=pathFor(route.id),total=path.getTotalLength();runtime.velocity=18;runtime.lastTime=performance.now();
      const frame=now=>{if(runtime.destroyed||token!==runtime.runToken)return;const dt=clamp((now-runtime.lastTime)/1000,0,.05);runtime.lastTime=now;const target=speedTarget(config,route,runtime.distance,total,1),limit=target>runtime.velocity?config.acceleration:config.deceleration,delta=clamp(target-runtime.velocity,-limit*dt,limit*dt);runtime.velocity=Math.max(22,runtime.velocity+delta);runtime.distance+=runtime.velocity*dt;const done=runtime.distance>=total;if(done)runtime.distance=total;placeTrain(route.id);if(done){runtime.raf=0;arrive();return;}runtime.raf=requestAnimationFrame(frame);};runtime.raf=requestAnimationFrame(frame);
    }
    function depart(){if(runtime.destroyed||runtime.phase!=='pending'||!runtime.route)return;clearTimers();runtime.phase='outbound';game.dataset.phase='outbound';setLocked(true);setStatus(`Мариус едет к ${routeData(runtime.route).label}`);options.onDeparture?.({route:routeData(runtime.route),task:currentTask(config,learningState)});animateOutbound();}
    function select(routeId){if(!config.routes[routeId]||!['idle','pending'].includes(runtime.phase))return false;cancelAnimationFrame(runtime.raf);runtime.raf=0;clearTimers();runtime.runToken++;runtime.arrivalHandled=false;runtime.phase='pending';runtime.route=routeId;game.dataset.phase='pending';updateSelection(routeId);setHandle(routeData(routeId).angle);setLocked(false);playClick();setStatus('Маршрут выбран. Поезд отправляется…');schedule(depart,config.departureDelayMs);return true;}
    function dragAngle(event){const rect=game.querySelector('[data-railway-lever]').getBoundingClientRect(),pivotX=rect.left+rect.width*LEVER_GEOMETRY.basePivotX,pivotY=rect.top+rect.height*LEVER_GEOMETRY.basePivotY,dx=event.clientX-pivotX,dy=Math.max(1,pivotY-event.clientY);return clamp(Math.atan2(dx,dy)*180/Math.PI,-31,31);}
    function pointerDown(event){if(!['idle','pending'].includes(runtime.phase)||(event.button!=null&&event.button!==0))return;event.preventDefault();clearTimers();runtime.runToken++;runtime.phase='pending';runtime.pointerId=event.pointerId;try{handle.setPointerCapture?.(event.pointerId);}catch(_){}setHandle(dragAngle(event),false);}
    function pointerMove(event){if(event.pointerId!==runtime.pointerId)return;event.preventDefault();setHandle(dragAngle(event),false);}
    function releaseCapture(pointerId){try{if(handle.hasPointerCapture?.(pointerId))handle.releasePointerCapture(pointerId);}catch(_){} }
    function pointerUp(event){if(event.pointerId!==runtime.pointerId)return;event.preventDefault();setHandle(dragAngle(event),false);const pointerId=runtime.pointerId,route=routeForAngle(runtime.handleAngle);runtime.pointerId=null;releaseCapture(pointerId);handle.classList.remove('is-dragging');select(route);}
    function pointerCancel(event){if(event.pointerId!==runtime.pointerId)return;const pointerId=runtime.pointerId;runtime.pointerId=null;releaseCapture(pointerId);handle.classList.remove('is-dragging');if(runtime.route)setHandle(routeData(runtime.route).angle);else{runtime.phase='idle';setHandle(0);setStatus(currentTask(config,learningState)?.instruction||'Потяни рычаг или нажми V, W или X');}}
    buttons.forEach(button=>listen(button,'click',()=>select(button.dataset.railwayChoice)));listen(handle,'pointerdown',pointerDown);listen(handle,'pointermove',pointerMove,{passive:false});listen(handle,'pointerup',pointerUp,{passive:false});listen(handle,'pointercancel',pointerCancel,{passive:false});listen(handle,'lostpointercapture',event=>{if(event.pointerId===runtime.pointerId)pointerCancel(event);});listen(scene,'dragstart',event=>event.preventDefault());
    for(const image of game.querySelectorAll('img')){const loaded=()=>image.classList.add('is-loaded'),failed=()=>{image.classList.add('is-missing');game.dataset.assetError='true';console.warn?.('[Railway VWX] PNG failed to load:',image.getAttribute('src'));};if(image.complete&&image.naturalWidth)loaded();else{listen(image,'load',loaded,{once:true});listen(image,'error',failed,{once:true});}}
    placeTrain('CENTER');setHandle(0,false);requestAnimationFrame(()=>handle?.classList.remove('is-dragging'));
    return Object.freeze({select,snapshot:()=>({...runtime}),destroy(){if(runtime.destroyed)return;runtime.destroyed=true;cancelAnimationFrame(runtime.raf);runtime.raf=0;clearTimers();runtime.runToken++;listeners.splice(0).forEach(remove=>remove());}});
  }
  return Object.freeze({CONFIG,ASSETS,ROUTES,ITEMS,ROUNDS,LEVER_GEOMETRY,validate,initialState,restore,roundForIndex,currentTask,answer,progress,routeForAngle,routeProgress,speedTarget,render,mount});
})();
