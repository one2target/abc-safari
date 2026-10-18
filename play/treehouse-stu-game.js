'use strict';

/* Pure rules and markup for the S/T/U magnetic-crane treehouse game.
   Pointer capture, sound, persistence and course navigation live in index.html. */
const TreehouseSTUGame=(()=>{
  const BASE='./images/treehouse-stu/';
  const ITEMS=Object.freeze([
    Object.freeze({letter:'S',word:'Sun',visual:'☀️',nameAudio:'s_name',soundAudio:'s_sound',wordAudio:'sun'}),
    Object.freeze({letter:'T',word:'Tiger',visual:'🐯',nameAudio:'t_name',soundAudio:'t_sound',wordAudio:'tiger'}),
    Object.freeze({letter:'U',word:'Umbrella',visual:'☂️',nameAudio:'u_name',soundAudio:'u_sound',wordAudio:'umbrella'})
  ]);
  const ROUNDS=Object.freeze([
    Object.freeze({id:'names',title:'Названия букв',instruction:'Послушай и перенеси правильный груз!',audioField:'nameAudio',visual:'letter',taskCount:3}),
    Object.freeze({id:'sounds',title:'Звуки букв',instruction:'Послушай звук и перенеси правильный груз!',audioField:'soundAudio',visual:'letter',taskCount:3}),
    Object.freeze({id:'words',title:'Слова',instruction:'Послушай слово и перенеси картинку!',audioField:'wordAudio',visual:'word',taskCount:6})
  ]);
  // `stage` controls when a part is built; `z` independently controls the final composition.
  const LAYERS=Object.freeze([
    Object.freeze({id:'support',stage:1,z:10,file:'01-ОПОРА.png'}),
    Object.freeze({id:'rear-wall',stage:4,z:20,file:'02-СТЕНА задняя.png'}),
    Object.freeze({id:'rear-gable',stage:7,z:22,file:'03-МАНСАРДА задняя.png'}),
    Object.freeze({id:'roof-left',stage:8,z:70,file:'04-КРОВЛЯ левая.png'}),
    Object.freeze({id:'wall-frame',stage:3,z:40,file:'05-КАРКАС (стойки).png'}),
    Object.freeze({id:'right-wall',stage:4,z:30,file:'06-СТЕНА правая.png'}),
    Object.freeze({id:'platform',stage:2,z:35,file:'07-ПЛОЩАДКА.png'}),
    Object.freeze({id:'roof-frame',stage:6,z:50,file:'08-КАРКАС (крыша).png'}),
    Object.freeze({id:'left-wall',stage:5,z:32,file:'09-СТЕНА левая.png'}),
    Object.freeze({id:'roof-right',stage:8,z:72,file:'10-КРОВЛЯ правая.png'}),
    Object.freeze({id:'facade-wall',stage:5,z:73,file:'11-ФАСАД (стена).png'}),
    Object.freeze({id:'window',stage:9,z:81,file:'12-ОКНО.png'}),
    Object.freeze({id:'door',stage:9,z:82,file:'13-ДВЕРЬ.png'}),
    Object.freeze({id:'front-gable',stage:7,z:74,file:'14-ФАСАД (мансарда).png'}),
    Object.freeze({id:'railing',stage:10,z:88,file:'15-ОГРАЖДЕНИЕ.png'}),
    Object.freeze({id:'stairs',stage:11,z:90,file:'16-ЛЕСТНИЦА (с тенью).png'}),
    Object.freeze({id:'flowers',stage:12,z:94,file:'17-1-ЦВЕТЫ (с тенью).png',revealDelay:0}),
    Object.freeze({id:'lanterns',stage:12,z:95,file:'17-2-ФОНАРИ (с тенью).png',revealDelay:420}),
    Object.freeze({id:'flags',stage:12,z:96,file:'17-3-ФЛАЖКИ (с тенью).png',revealDelay:840})
  ]);
  const CONFIG=Object.freeze({
    id:'treehouse-crane-stu',rewardSourceId:'minigame:treehouse-crane-stu',items:ITEMS,rounds:ROUNDS,layers:LAYERS,
    background:`${BASE}00-ФОН (без дома).png`,totalDeliveries:12,pickupRadiusPx:52,installRadiusPx:112
  });

  const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function shuffled(values,random=Math.random){
    const result=[...values];
    for(let index=result.length-1;index>0;index--){const swap=Math.max(0,Math.min(index,Math.floor(random()*(index+1))));[result[index],result[swap]]=[result[swap],result[index]];}
    return result;
  }
  function wordOrder(letters,random=Math.random){
    const first=shuffled(letters,random),second=shuffled(letters,random);
    if(first.at(-1)===second[0]&&second.length>1)[second[0],second[1]]=[second[1],second[0]];
    return [...first,...second];
  }
  function createTaskOrder(config=CONFIG,random=Math.random){const letters=config.items.map(item=>item.letter);return [...shuffled(letters,random),...shuffled(letters,random),...wordOrder(letters,random)];}
  function createOptionOrders(config=CONFIG,random=Math.random){const letters=config.items.map(item=>item.letter);return Array.from({length:config.totalDeliveries},()=>shuffled(letters,random));}
  function validate(config=CONFIG){
    if(!config||config.items?.length!==3||new Set(config.items.map(item=>item.letter)).size!==3)throw new TypeError('Treehouse STU needs exactly three letters');
    if(config.rounds?.length!==3||config.layers?.length!==19||config.totalDeliveries!==12)throw new TypeError('Treehouse STU needs 12 deliveries and 19 layers');
    if(new Set(config.layers.map(layer=>layer.id)).size!==19||config.layers.some(layer=>!layer.file||layer.stage<1||layer.stage>12||!Number.isFinite(layer.z)))throw new TypeError('Invalid treehouse layer manifest');
    for(const item of config.items)if(!item.letter||!item.word||!item.visual||!item.nameAudio||!item.soundAudio||!item.wordAudio)throw new TypeError(`Invalid STU item ${item.letter||''}`);
    return true;
  }
  function initialState(config=CONFIG,random=Math.random){
    validate(config);
    return {gameId:config.id,taskOrder:createTaskOrder(config,random),optionOrders:createOptionOrders(config,random),completedDeliveries:0,completedTasks:[],errors:0,gameCompleted:false};
  }
  function validTaskOrder(config,order){
    const letters=config.items.map(item=>item.letter);
    return Array.isArray(order)&&order.length===config.totalDeliveries&&order.every(letter=>letters.includes(letter))&&
      config.rounds.every((round,index)=>{const start=index===0?0:index===1?3:6,slice=order.slice(start,start+round.taskCount);return letters.every(letter=>slice.filter(value=>value===letter).length===(index===2?2:1));});
  }
  function restore(config=CONFIG,saved,random=Math.random){
    const fresh=initialState(config,random);if(!saved||typeof saved!=='object'||(saved.gameId&&saved.gameId!==config.id))return fresh;
    if(validTaskOrder(config,saved.taskOrder))fresh.taskOrder=[...saved.taskOrder];
    const letters=config.items.map(item=>item.letter);
    if(Array.isArray(saved.optionOrders)&&saved.optionOrders.length===config.totalDeliveries&&saved.optionOrders.every(order=>Array.isArray(order)&&order.length===3&&new Set(order).size===3&&order.every(letter=>letters.includes(letter))))fresh.optionOrders=saved.optionOrders.map(order=>[...order]);
    const done=Number.isInteger(saved.completedDeliveries)?Math.max(0,Math.min(config.totalDeliveries,saved.completedDeliveries)):0;fresh.completedDeliveries=done;
    fresh.completedTasks=Array.isArray(saved.completedTasks)?saved.completedTasks.filter((id,index,array)=>typeof id==='string'&&array.indexOf(id)===index).slice(0,done):[];
    if(fresh.completedTasks.length!==done)fresh.completedTasks=Array.from({length:done},(_,index)=>`${roundForIndex(config,index).id}:${fresh.taskOrder[index]}:${index+1}`);
    fresh.errors=Number.isFinite(saved.errors)?Math.max(0,Math.floor(saved.errors)):0;fresh.gameCompleted=Boolean(saved.gameCompleted&&done===config.totalDeliveries);
    if(done===config.totalDeliveries)fresh.gameCompleted=true;
    return fresh;
  }
  function roundForIndex(config=CONFIG,index=0){return index<3?config.rounds[0]:index<6?config.rounds[1]:config.rounds[2];}
  function currentTask(config=CONFIG,state){
    if(state.gameCompleted||state.completedDeliveries>=config.totalDeliveries)return null;
    const index=state.completedDeliveries,letter=state.taskOrder[index],item=config.items.find(candidate=>candidate.letter===letter),round=roundForIndex(config,index);
    return item&&round?Object.freeze({...item,index,stage:index+1,roundId:round.id,roundTitle:round.title,instruction:round.instruction,visualMode:round.visual,audioKey:item[round.audioField]}):null;
  }
  function candidates(config=CONFIG,state){
    const task=currentTask(config,state),order=state.optionOrders[state.completedDeliveries]||config.items.map(item=>item.letter);
    return order.map(letter=>{const item=config.items.find(candidate=>candidate.letter===letter);return Object.freeze({...item,display:task?.visualMode==='word'?item.visual:item.letter,correct:item.letter===task?.letter});});
  }
  function pickMaterial(config=CONFIG,state,letter){
    const task=currentTask(config,state);if(!task)return 'ignored';if(letter!==task.letter){state.errors++;return state.errors>=2?'retry-hint':'retry';}return 'attached';
  }
  function deliver(config=CONFIG,state,letter){
    const task=currentTask(config,state);if(!task||letter!==task.letter)return 'ignored';
    state.completedTasks.push(`${task.roundId}:${task.letter}:${task.stage}`);state.completedDeliveries++;state.errors=0;
    if(state.completedDeliveries>=config.totalDeliveries){state.completedDeliveries=config.totalDeliveries;state.gameCompleted=true;return 'game-complete';}
    if(state.completedDeliveries===3||state.completedDeliveries===6)return 'round-complete';
    return 'correct';
  }
  function progress(config=CONFIG,state){return Math.max(0,Math.min(config.totalDeliveries,Number(state.completedDeliveries)||0));}
  function visibleLayers(config=CONFIG,state){const done=progress(config,state);return config.layers.filter(layer=>layer.stage<=done);}
  function layerSource(config,layer){return `${BASE}${layer.file}`;}
  function optionalImage(src,className,label='',attributes=''){return `<img class="${className}" data-treehouse-asset src="${escape(src)}" alt="${escape(label)}" draggable="false" ${attributes}>`;}
  function render(config=CONFIG,state,options={}){
    const done=progress(config,state),total=config.totalDeliveries,character=options.characterHTML||'<span class="treehouse-marius-fallback">🦒</span>',speaker=options.icons?.speaker||'🔊',arrow=options.icons?.arrow||'→';
    if(state.gameCompleted&&!options.revealCompletedScene){
      return `<section class="treehouse-game is-complete" data-treehouse-game="${escape(config.id)}"><div class="treehouse-finish-picture"><div class="treehouse-finish-scene">${optionalImage(config.background,'treehouse-background','')} ${config.layers.map(layer=>optionalImage(layerSource(config,layer),'treehouse-house-layer is-visible','',`data-layer-id="${escape(layer.id)}" style="z-index:${layer.z}"`)).join('')}</div><div class="treehouse-finish-marius">${character}</div><div class="treehouse-reward-stars" aria-label="Три звезды"><span>★</span><span>★</span><span>★</span><i></i><i></i><i></i><i></i><i></i><i></i></div></div><h1>Домик готов!</h1><p>Ты построил домик и выполнил все 12 заданий с S, T и U.</p><div class="treehouse-finish-actions"><button class="secondary" data-action="treehouse-replay">Строить ещё</button><button class="primary" data-action="treehouse-continue">Дальше ${arrow}</button></div></section>`;
    }
    const task=currentTask(config,state)||Object.freeze({...config.items[2],roundId:'words',roundTitle:'Домик готов',instruction:'Полюбуйся готовым домиком!',visualMode:'word',stage:12}),round=roundForIndex(config,Math.min(done,total-1)),choices=state.gameCompleted?[]:candidates(config,state),celebration=options.celebrationStage===3||options.celebrationStage===6;
    const layers=config.layers.map(layer=>{const visible=layer.stage<=done,newLayer=layer.stage===options.justCompletedStage,delay=layer.revealDelay||0;return optionalImage(layerSource(config,layer),`treehouse-house-layer${visible?' is-visible':''}${newLayer?' is-installing':''}${layer.id==='lanterns'?' is-lantern-layer':''}`,'',`data-treehouse-layer data-layer-id="${escape(layer.id)}" data-stage="${layer.stage}" style="z-index:${layer.z};--layer-delay:${delay}ms"`);}).join('');
    const cargo=choices.map((item,index)=>`<div class="treehouse-cargo" data-treehouse-cargo data-letter="${escape(item.letter)}" data-correct="${item.correct}" style="--cargo-left:${16+index*34}%"><span class="treehouse-crate"><i></i><strong>${escape(item.display)}</strong></span></div>`).join('');
    const carried=state.gameCompleted?'':`<div class="treehouse-carried" data-treehouse-carried aria-hidden="true"><span class="treehouse-crate"><i></i><strong>${escape(task.visualMode==='word'?task.visual:task.letter)}</strong></span></div>`;
    return `<section class="treehouse-game${state.gameCompleted?' is-finale':''}" data-treehouse-game="${escape(config.id)}" data-round="${escape(round.id)}" data-stage="${done+1}" data-completed="${state.gameCompleted}"><header class="treehouse-header"><div><p>Стройка Мариуса · раунд ${Math.min(3,done<3?1:done<6?2:3)} / 3</p><h1>${escape(round.title)}</h1></div><button class="treehouse-exit" data-action="treehouse-exit" aria-label="Выйти из игры">×</button></header><div class="treehouse-progress" role="progressbar" aria-label="Построено этапов" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><i style="width:${Math.round(done/total*100)}%"></i><span>${done} / ${total}</span></div><div class="treehouse-task"><div><strong>${escape(task.instruction)}</strong><small>${state.gameCompleted?'Цветы, фонарики и флажки заняли свои места.':state.errors>=2?'Правильный груз мягко светится.':'Подведи магнит к грузу, затем перенеси его в сияющую зону.'}</small></div><button class="treehouse-repeat" data-action="treehouse-repeat" aria-label="Повторить задание">${speaker}<span>Ещё раз</span></button></div><div class="treehouse-scene" data-treehouse-scene style="--crane-x:50%;--magnet-y:28%"><div class="treehouse-artboard" data-treehouse-artboard>${optionalImage(config.background,'treehouse-background','Сказочная поляна с большим деревом')}${layers}</div><div class="treehouse-build-zone" data-treehouse-build-zone aria-label="Зона строительства"><span></span></div><div class="treehouse-rail" aria-hidden="true"><i></i></div><div class="treehouse-crane" data-treehouse-crane aria-hidden="true"><span class="treehouse-trolley"><i></i><b></b></span><span class="treehouse-cable"></span><span class="treehouse-magnet" data-treehouse-magnet><i></i>${carried}</span></div><div class="treehouse-cargo-yard" data-treehouse-cargo-yard>${cargo}</div><div class="treehouse-marius">${character}</div><div class="treehouse-effects" data-treehouse-effects aria-hidden="true"></div><div class="treehouse-control" data-treehouse-control tabindex="0" role="application" aria-label="Магнитный кран. Веди пальцем или мышью к грузу и месту строительства."></div><p class="treehouse-feedback" data-treehouse-feedback role="status" aria-live="polite">Слушай внимательно…</p>${celebration?'<div class="treehouse-milestone" aria-live="polite"><span>★</span><strong>Этап строительства готов!</strong><i></i></div>':''}${state.gameCompleted?'<div class="treehouse-finale-title" aria-live="polite">Домик готов!</div>':''}</div><p class="treehouse-controls">Веди магнит пальцем или мышью · точность не нужна</p></section>`;
  }
  return Object.freeze({CONFIG,ITEMS,ROUNDS,LAYERS,validate,initialState,restore,roundForIndex,currentTask,candidates,pickMaterial,deliver,progress,visibleLayers,layerSource,render});
})();
