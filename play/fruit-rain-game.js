'use strict';

/* Pure rules and markup for Fruit Rain M/N/O. Animation, audio and course
   navigation stay in the app adapter so saved games never contain DOM state. */
const FruitRainGame=(()=>{
  const TIMING=Object.freeze({
    fullFallMs:4600,
    slowedFallMs:6200,
    cueDelayMs:320,
    waveGapMs:650,
    successPauseMs:850
  });
  const BLITZ=Object.freeze({
    spawnIntervalMs:620,
    targetMaxWaitMs:2200,
    fullFallMs:3700,
    slowedFallMs:4900,
    nextCueGapMs:190,
    catchesPerTask:3,
    taskCompletePauseMs:560,
    missedTargetGapMs:520,
    maxObjects:6,
    targetProbability:.38,
    xPositions:Object.freeze([14,32,50,68,86]),
    minXGap:17
  });
  const LANES=Object.freeze([18,50,82]);
  const LAYOUT=Object.freeze({objectMinPx:68,objectMaxPx:90,mobileObjectPx:66});
  const LETTERS=Object.freeze([
    Object.freeze({letter:'M',word:'Monkey',emoji:'🐒',nameAudio:'m_name',soundAudio:'m_sound',wordAudio:'monkey'}),
    Object.freeze({letter:'N',word:'Nest',emoji:'🪺',nameAudio:'n_name',soundAudio:'n_sound',wordAudio:'nest'}),
    Object.freeze({letter:'O',word:'Octopus',emoji:'🐙',nameAudio:'o_name',soundAudio:'o_sound',wordAudio:'octopus'})
  ]);
  const FRUITS=Object.freeze([
    Object.freeze({key:'apple',emoji:'🍎'}),Object.freeze({key:'banana',emoji:'🍌'}),
    Object.freeze({key:'orange',emoji:'🍊'}),Object.freeze({key:'pear',emoji:'🍐'}),
    Object.freeze({key:'grapes',emoji:'🍇'}),Object.freeze({key:'mango',emoji:'🥭'}),
    Object.freeze({key:'strawberry',emoji:'🍓'}),Object.freeze({key:'pineapple',emoji:'🍍'}),
    Object.freeze({key:'peach',emoji:'🍑'}),Object.freeze({key:'watermelon',emoji:'🍉'})
  ]);
  const BLITZ_FRUITS=Object.freeze([
    Object.freeze({key:'apple',emoji:'🍎'}),Object.freeze({key:'orange',emoji:'🍊'}),
    Object.freeze({key:'mango',emoji:'🥭'}),Object.freeze({key:'pear',emoji:'🍐'}),
    Object.freeze({key:'strawberry',emoji:'🍓'}),Object.freeze({key:'grapes',emoji:'🍇'})
  ]);
  /* The checked-in PNGs live together so every path is deploy-safe. The app
     adapter still keeps the CSS/emoji fallback for partial deployments. */
  const ASSETS=Object.freeze({
    background:'./images/fruit-rain/fruit-rain-bg.png',
    basket:'./images/fruit-rain/fruit-rain-basket.png',
    basketFull:'./images/fruit-rain/fruit-rain-basket-full.png',
    hit:'./images/fruit-rain/fruit-rain-hit-effect.png',
    miss:'./images/fruit-rain/fruit-rain-miss-effect.png',
    hintGlow:'./images/fruit-rain/fruit-rain-hint-glow.png',
    leaves:Object.freeze(['./images/fruit-rain/fruit-rain-leaves-01.png','./images/fruit-rain/fruit-rain-leaves-02.png']),
    branch:'./images/fruit-rain/fruit-rain-branch-01.png',
    fruits:Object.freeze(Object.fromEntries(FRUITS.map(fruit=>[fruit.key,`./images/fruit-rain/fruit-${fruit.key}.png`]))),
    blitzFruits:Object.freeze(Object.fromEntries(BLITZ_FRUITS.map(fruit=>[fruit.key,`./images/fruit-rain/fruit-blitz-${fruit.key}.png`])))
  });
  const CONFIG=Object.freeze({
    id:'fruit-rain-mno',
    rewardSourceId:'minigame:fruit-rain-mno',
    timing:TIMING,
    blitz:BLITZ,
    lanes:LANES,
    layout:LAYOUT,
    letters:LETTERS,
    fruits:FRUITS,
    blitzFruits:BLITZ_FRUITS,
    assets:ASSETS,
    rounds:Object.freeze([
      Object.freeze({id:'names',title:'Названия букв',instruction:'Поймай нужную букву!',audioField:'nameAudio',visual:'letter',mode:'wave'}),
      Object.freeze({id:'sounds',title:'Звуки букв',instruction:'Слушай звук и лови букву!',audioField:'soundAudio',visual:'letter',mode:'wave'}),
      Object.freeze({id:'words',title:'Слова',instruction:'Поймай картинку!',audioField:'wordAudio',visual:'word',mode:'blitz'})
    ])
  });

  const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const indexFrom=(length,random=Math.random)=>Math.max(0,Math.min(length-1,Math.floor(random()*length)));
  const shuffled=(values,random=Math.random)=>{
    const result=[...values];
    for(let index=result.length-1;index>0;index--){
      const swap=Math.max(0,Math.min(index,Math.floor(random()*(index+1))));
      [result[index],result[swap]]=[result[swap],result[index]];
    }
    return result;
  };
  const letterSet=config=>config.letters.map(item=>item.letter);
  const totalTasks=config=>config.rounds.length*config.letters.length;

  function validate(config=CONFIG){
    if(!config||typeof config.id!=='string'||!config.id||!Array.isArray(config.letters)||config.letters.length!==3||new Set(letterSet(config)).size!==3)throw new TypeError('Fruit Rain needs exactly three distinct letters');
    if(!Array.isArray(config.rounds)||config.rounds.length!==3)throw new TypeError('Fruit Rain needs three rounds');
    if(!Array.isArray(config.fruits)||config.fruits.length<3||new Set(config.fruits.map(item=>item.key)).size!==config.fruits.length)throw new TypeError('Fruit Rain needs distinct fruit variants');
    if(!Array.isArray(config.blitzFruits)||config.blitzFruits.length<3||new Set(config.blitzFruits.map(item=>item.key)).size!==config.blitzFruits.length)throw new TypeError('Fruit Rain blitz needs distinct fruit variants');
    for(const item of config.letters)if(!item.letter||!item.word||!item.emoji||!item.nameAudio||!item.soundAudio||!item.wordAudio)throw new TypeError(`Invalid Fruit Rain item ${item.letter||''}`);
    for(const round of config.rounds)if(!round.id||!round.instruction||!['letter','word'].includes(round.visual)||!['nameAudio','soundAudio','wordAudio'].includes(round.audioField)||!['wave','blitz'].includes(round.mode))throw new TypeError(`Invalid Fruit Rain round ${round.id||''}`);
    return true;
  }

  function initialState(config=CONFIG,random=Math.random){
    validate(config);
    const letters=letterSet(config);
    return {
      gameId:config.id,
      currentRound:0,
      nextTaskIndex:0,
      taskOrders:config.rounds.map(()=>shuffled(letters,random)),
      completedTasks:[],
      blitzCatches:0,
      errors:0,
      gameCompleted:false,
      lastCorrectLane:null
    };
  }

  function restore(config=CONFIG,saved,random=Math.random){
    const fresh=initialState(config,random),letters=letterSet(config);
    if(!saved||typeof saved!=='object'||(saved.gameId!=null&&saved.gameId!==config.id))return fresh;
    const orders=Array.isArray(saved.taskOrders)?saved.taskOrders:null;
    if(orders?.length===config.rounds.length&&orders.every(order=>Array.isArray(order)&&order.length===letters.length&&new Set(order).size===letters.length&&order.every(letter=>letters.includes(letter))))fresh.taskOrders=orders.map(order=>[...order]);
    const round=Number.isInteger(saved.currentRound)?saved.currentRound:0,index=Number.isInteger(saved.nextTaskIndex)?saved.nextTaskIndex:0;
    if(round>=0&&round<config.rounds.length&&index>=0&&index<=letters.length){fresh.currentRound=round;fresh.nextTaskIndex=index;}
    const expectedCompleted=Math.min(totalTasks(config),fresh.currentRound*letters.length+fresh.nextTaskIndex);
    fresh.completedTasks=Array.isArray(saved.completedTasks)?saved.completedTasks.filter((id,pos,array)=>typeof id==='string'&&array.indexOf(id)===pos).slice(0,expectedCompleted):[];
    if(fresh.completedTasks.length!==expectedCompleted)fresh.completedTasks=[];
    const savedBlitzCatches=Number.isInteger(saved.blitzCatches)?saved.blitzCatches:0;
    if(config.rounds[fresh.currentRound]?.mode==='blitz'&&fresh.nextTaskIndex<letters.length&&savedBlitzCatches>=0&&savedBlitzCatches<config.blitz.catchesPerTask)fresh.blitzCatches=savedBlitzCatches;
    fresh.errors=Number.isFinite(saved.errors)?Math.max(0,Math.floor(saved.errors)):0;
    fresh.lastCorrectLane=Number.isInteger(saved.lastCorrectLane)&&saved.lastCorrectLane>=0&&saved.lastCorrectLane<LANES.length?saved.lastCorrectLane:null;
    fresh.gameCompleted=Boolean(saved.gameCompleted&&expectedCompleted===totalTasks(config));
    if(fresh.gameCompleted){fresh.currentRound=config.rounds.length-1;fresh.nextTaskIndex=letters.length;fresh.blitzCatches=0;fresh.errors=0;}
    return fresh;
  }

  function currentRound(config=CONFIG,state){return config.rounds[state.currentRound]||config.rounds.at(-1);}
  function roundMode(config=CONFIG,state){return currentRound(config,state)?.mode||'wave';}
  function currentTask(config=CONFIG,state){
    if(state.gameCompleted)return null;
    const letter=state.taskOrders[state.currentRound]?.[state.nextTaskIndex],item=config.letters.find(entry=>entry.letter===letter),round=currentRound(config,state);
    return item&&round?Object.freeze({...item,roundId:round.id,roundTitle:round.title,instruction:round.instruction,visual:round.visual,mode:round.mode,audioKey:item[round.audioField]}):null;
  }
  function progress(config=CONFIG,state){return Math.min(totalTasks(config),state.completedTasks.length);}
  function blitzProgress(config=CONFIG,state){return roundMode(config,state)==='blitz'&&!state.gameCompleted?Math.max(0,Math.min(config.blitz.catchesPerTask-1,Number(state.blitzCatches)||0)):0;}
  function hint(config=CONFIG,state){return state.errors>=2?currentTask(config,state)?.letter||null:null;}
  function fallDuration(state,mode='wave'){return mode==='blitz'?(state.errors>=3?BLITZ.slowedFallMs:BLITZ.fullFallMs):(state.errors>=3?TIMING.slowedFallMs:TIMING.fullFallMs);}
  function fruitFor(fruits,random=Math.random,sequence=null){
    const index=Number.isInteger(sequence)?Math.abs(sequence)%fruits.length:indexFrom(fruits.length,random);
    return fruits[index];
  }
  function objectData(config,state,{letter,x,lane=null,delayMs=0,id,mode='wave',fruit,fruitAssets=config.assets.fruits}){
    const task=currentTask(config,state),item=config.letters.find(entry=>entry.letter===letter),selectedFruit=fruit||config.fruits[0];
    return Object.freeze({id,mode,letter,lane,x,delayMs,correct:letter===task.letter,visual:task.visual==='word'?item.emoji:item.letter,label:task.visual==='word'?item.word:`Буква ${item.letter}`,fruitKey:selectedFruit.key,fruitEmoji:selectedFruit.emoji,fruitAsset:fruitAssets[selectedFruit.key]||''});
  }

  function createWave(config=CONFIG,state,random=Math.random){
    const task=currentTask(config,state);if(!task)return [];
    const available=LANES.map((_,index)=>index).filter(index=>LANES.length<2||index!==state.lastCorrectLane);
    const correctLane=available[indexFrom(available.length,random)];
    state.lastCorrectLane=correctLane;
    const laneLetters=Array(LANES.length),distractors=shuffled(letterSet(config).filter(letter=>letter!==task.letter),random),fruits=shuffled(config.fruits,random).slice(0,LANES.length);
    laneLetters[correctLane]=task.letter;
    let distractorIndex=0;
    for(let index=0;index<laneLetters.length;index++)if(!laneLetters[index])laneLetters[index]=distractors[distractorIndex++];
    const delays=shuffled([0,90,180],random);
    return laneLetters.map((letter,lane)=>objectData(config,state,{id:`${state.currentRound}-${state.nextTaskIndex}-${lane}-${letter}`,mode:'wave',letter,lane,x:LANES[lane],delayMs:delays[lane],fruit:fruits[lane]}));
  }

  function createBlitzObject(config=CONFIG,state,random=Math.random,options={}){
    const task=currentTask(config,state);if(!task||roundMode(config,state)!=='blitz')return null;
    const forceTarget=Boolean(options.forceTarget),allowTarget=options.allowTarget!==false;
    const isTarget=forceTarget||(allowTarget&&random()<config.blitz.targetProbability);
    const distractors=letterSet(config).filter(letter=>letter!==task.letter),letter=isTarget?task.letter:distractors[indexFrom(distractors.length,random)];
    const avoidXs=Array.isArray(options.avoidXs)?options.avoidXs:[],spaced=config.blitz.xPositions.filter(x=>avoidXs.every(other=>Math.abs(x-other)>=config.blitz.minXGap)),positions=spaced.length?spaced:config.blitz.xPositions;
    const x=positions[indexFrom(positions.length,random)],sequence=Number.isInteger(options.sequence)?options.sequence:Math.floor(random()*1000000),fruit=fruitFor(config.blitzFruits,random,sequence);
    return objectData(config,state,{id:`blitz-${state.nextTaskIndex}-${sequence}-${letter}`,mode:'blitz',letter,x,fruit,fruitAssets:config.assets.blitzFruits});
  }

  function noteError(config=CONFIG,state){
    if(state.gameCompleted)return 'ignored';
    state.errors++;
    return state.errors>=3?'retry-slow':state.errors>=2?'retry-hint':'retry';
  }
  function catchItem(config=CONFIG,state,letter){
    const task=currentTask(config,state);if(!task||!letterSet(config).includes(letter))return 'ignored';
    if(letter!==task.letter)return noteError(config,state);
    if(task.mode==='blitz'){
      state.blitzCatches=blitzProgress(config,state)+1;
      state.errors=0;
      if(state.blitzCatches<config.blitz.catchesPerTask)return 'blitz-catch';
      state.blitzCatches=0;
    }
    state.completedTasks.push(`${task.roundId}:${task.letter}`);
    state.errors=0;
    state.nextTaskIndex++;
    if(state.nextTaskIndex>=config.letters.length){
      if(state.currentRound>=config.rounds.length-1){state.gameCompleted=true;return 'game-complete';}
      state.currentRound++;state.nextTaskIndex=0;return 'round-complete';
    }
    return 'correct';
  }
  function missCorrect(config=CONFIG,state){return noteError(config,state);}
  const optionalImage=(src,className,label='')=>src?`<img class="${className}" data-fruit-rain-asset src="${escape(src)}" alt="${escape(label)}">`:'';

  function render(config=CONFIG,state,options={}){
    const done=progress(config,state),total=totalTasks(config),character=options.characterHTML||'<span class="fruit-rain-character-fallback">🦒</span>',speaker=options.icons?.speaker||'🔊',arrow=options.icons?.arrow||'→',assets=options.assets||config.assets||ASSETS;
    if(state.gameCompleted){
      const sparkX=[-58,-38,0,40,60,42,0,-44],sparkY=[-24,-50,-58,-48,-18,34,48,32],sparkDelay=[.82,.9,.96,.86,1,1.08,1.14,1.04];
      const rewardAnimation=`<div class="fruit-rain-reward-animation" aria-hidden="true"><span class="fruit-rain-reward-star fruit-rain-reward-star-1">★</span><span class="fruit-rain-reward-star fruit-rain-reward-star-2">★</span><span class="fruit-rain-reward-star fruit-rain-reward-star-3">★</span>${sparkX.map((x,index)=>`<i class="fruit-rain-reward-spark" style="--spark-dx:${x}px;--spark-dy:${sparkY[index]}px;--spark-delay:${sparkDelay[index]}s"></i>`).join('')}</div>`;
      return `<section class="fruit-rain-game is-complete" data-fruit-rain-game="${escape(config.id)}"><div class="fruit-rain-finish-character">${character}<div class="fruit-rain-full-basket" aria-label="Полная корзина"><span aria-hidden="true">🍎🍊🍐<br>🧺</span>${optionalImage(assets.basketFull,'fruit-rain-full-basket-image')}</div>${rewardAnimation}</div><h1>Отлично! Сад собран!</h1><p>Ты поймал все 9 правильных предметов.</p><div class="fruit-rain-finish-actions"><button class="secondary" data-action="fruit-rain-replay">Играть ещё</button><button class="primary" data-action="fruit-rain-continue">Дальше ${arrow}</button></div></section>`;
    }
    const round=currentRound(config,state),task=currentTask(config,state),hinted=hint(config,state),slow=state.errors>=3,isBlitz=round.mode==='blitz';
    const caught=blitzProgress(config,state),progressFruit=isBlitz?config.blitzFruits[state.nextTaskIndex%config.blitzFruits.length]:null,progressFruitAsset=progressFruit?assets.blitzFruits?.[progressFruit.key]||assets.fruits?.[progressFruit.key]:'';
    const catchIndicator=isBlitz?`<div class="fruit-rain-catch-progress" data-fruit-rain-catch-progress role="img" aria-label="Поймано ${caught} из ${config.blitz.catchesPerTask}">${Array.from({length:config.blitz.catchesPerTask},(_,index)=>`<span class="fruit-rain-catch-slot${index<caught?' is-filled':''}" data-fruit-rain-catch-slot style="--slot-index:${index}">${optionalImage(progressFruitAsset,'fruit-rain-progress-fruit')}</span>`).join('')}</div>`:'';
    return `<section class="fruit-rain-game" data-fruit-rain-game="${escape(config.id)}" data-round="${escape(round.id)}" data-mode="${escape(round.mode)}" style="--fruit-object-min:${config.layout.objectMinPx}px;--fruit-object-max:${config.layout.objectMaxPx}px;--fruit-object-mobile:${config.layout.mobileObjectPx}px"><header class="fruit-rain-header"><div><p>Фруктовый дождь · раунд ${state.currentRound+1} / ${config.rounds.length}</p><h1>${escape(round.title)}</h1></div><button class="fruit-rain-exit" data-action="fruit-rain-exit" aria-label="Выйти из игры">×</button></header><div class="fruit-rain-progress" role="progressbar" aria-label="Прогресс игры" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><i style="width:${Math.round(done/total*100)}%"></i><span>${done} / ${total}</span></div><div class="fruit-rain-task"><div class="fruit-rain-task-copy"><strong>${escape(task.instruction)}</strong><small>${slow?'Медленнее — ты справишься!':isBlitz?'Блиц: фрукты падают без остановки!':'Сначала послушай, потом лови.'}</small>${catchIndicator}</div><button class="fruit-rain-repeat" data-action="fruit-rain-repeat" aria-label="Повторить задание">${speaker}<span>Ещё раз</span></button></div><div class="fruit-rain-scene" data-fruit-rain-scene tabindex="0" aria-label="Игровое поле. Двигай Мариуса влево и вправо.">${optionalImage(assets.background,'fruit-rain-background-image')}<div class="fruit-rain-sun" aria-hidden="true"></div><div class="fruit-rain-branches" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i>${optionalImage(assets.leaves?.[0],'fruit-rain-leaves fruit-rain-leaves-left')}${optionalImage(assets.leaves?.[1],'fruit-rain-leaves fruit-rain-leaves-right')}${optionalImage(assets.branch,'fruit-rain-branch-art')}</div><div class="fruit-rain-field" data-fruit-rain-field></div><div class="fruit-rain-effects" data-fruit-rain-effects aria-hidden="true"></div><div class="fruit-rain-player" data-fruit-rain-player style="--fruit-player-x:50%">${character}<span class="fruit-rain-basket" data-fruit-rain-basket aria-hidden="true"><span>🧺</span>${optionalImage(assets.basket,'fruit-rain-basket-image')}</span></div><div class="fruit-rain-ground" aria-hidden="true"></div><p class="fruit-rain-feedback" data-fruit-rain-feedback role="status" aria-live="polite">${hinted?`Ищи ${escape(hinted)} — она светится!`:'Приготовь корзину…'}</p></div><p class="fruit-rain-controls">Веди пальцем или мышью · на клавиатуре — ← →</p></section>`;
  }

  return Object.freeze({CONFIG,TIMING,BLITZ,LANES,LAYOUT,FRUITS,BLITZ_FRUITS,ASSETS,validate,initialState,restore,currentRound,roundMode,currentTask,progress,blitzProgress,hint,fallDuration,createWave,createBlitzObject,catchItem,missCorrect,render,totalTasks});
})();
