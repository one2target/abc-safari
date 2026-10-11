'use strict';

/* Pure rules, aim geometry and markup for the P/Q/R Bubble Cannon.
   The app adapter owns Pointer Events, animation, audio and course navigation;
   saved progress therefore never contains DOM or in-flight projectile state. */
const BubbleCannonGame=(()=>{
  const MIN_DRAG_PX=8;
  const AIM_ASSIST_PX=24;
  const LETTERS=Object.freeze([
    Object.freeze({letter:'P',word:'Panda',emoji:'🐼',nameAudio:'p_name',soundAudio:'p_sound',wordAudio:'panda'}),
    Object.freeze({letter:'Q',word:'Queen',emoji:'👸',nameAudio:'q_name',soundAudio:'q_sound',wordAudio:'queen'}),
    Object.freeze({letter:'R',word:'Rabbit',emoji:'🐰',nameAudio:'r_name',soundAudio:'r_sound',wordAudio:'rabbit'})
  ]);
  const ASSETS=Object.freeze({
    background:'./images/bubble-cannon/bubble-cannon-bg.png',
    base:'./images/bubble-cannon/bubble-cannon-base.png',
    barrel:'./images/bubble-cannon/bubble-cannon-barrel.png',
    muzzleFlash:'./images/bubble-cannon/bubble-cannon-muzzle-flash.png',
    projectile:'./images/bubble-cannon/bubble-cannon-projectile.png',
    projectileTrail:'./images/bubble-cannon/bubble-cannon-projectile-trail.png',
    targets:Object.freeze([
      './images/bubble-cannon/bubble-target-01.png',
      './images/bubble-cannon/bubble-target-02.png',
      './images/bubble-cannon/bubble-target-03.png'
    ]),
    hit:'./images/bubble-cannon/bubble-hit-effect.png',
    wrong:'./images/bubble-cannon/bubble-wrong-hit-effect.png',
    hintGlow:'./images/bubble-cannon/bubble-hint-glow.png',
    leaves:Object.freeze([
      './images/bubble-cannon/bubble-cannon-leaves-01.png',
      './images/bubble-cannon/bubble-cannon-leaves-02.png'
    ]),
    clouds:Object.freeze([
      './images/bubble-cannon/bubble-cannon-cloud-01.png',
      './images/bubble-cannon/bubble-cannon-cloud-02.png'
    ])
  });
  const ROUNDS=Object.freeze([
    Object.freeze({id:'names',title:'Названия букв',instruction:'Услышь название и попади в букву!',audioField:'nameAudio',visual:'letter',hitsPerTask:1,motion:'calm'}),
    Object.freeze({id:'sounds',title:'Звуки букв',instruction:'Услышь звук и попади в букву!',audioField:'soundAudio',visual:'letter',hitsPerTask:1,motion:'floating'}),
    Object.freeze({id:'words',title:'Слова',instruction:'Услышь слово и попади в картинку два раза!',audioField:'wordAudio',visual:'word',hitsPerTask:2,motion:'playful'})
  ]);
  const CONFIG=Object.freeze({
    id:'bubble-cannon-pqr',
    rewardSourceId:'minigame:bubble-cannon-pqr',
    letters:LETTERS,
    rounds:ROUNDS,
    assets:ASSETS,
    minDragPx:MIN_DRAG_PX,
    aimAssistPx:AIM_ASSIST_PX
  });
  const POSITIONS=Object.freeze([
    Object.freeze([{x:22,y:28},{x:50,y:17},{x:78,y:29}]),
    Object.freeze([{x:20,y:25},{x:51,y:18},{x:80,y:27}]),
    Object.freeze([{x:21,y:24},{x:50,y:15},{x:79,y:25}])
  ]);

  const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
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
  const totalHits=config=>config.rounds.reduce((sum,round)=>sum+round.hitsPerTask*config.letters.length,0);

  function validate(config=CONFIG){
    if(!config||typeof config.id!=='string'||!config.id||!Array.isArray(config.letters)||config.letters.length!==3||new Set(letterSet(config)).size!==3)throw new TypeError('Bubble Cannon needs exactly three distinct letters');
    if(!Array.isArray(config.rounds)||config.rounds.length!==3)throw new TypeError('Bubble Cannon needs three rounds');
    for(const item of config.letters)if(!item.letter||!item.word||!item.emoji||!item.nameAudio||!item.soundAudio||!item.wordAudio)throw new TypeError(`Invalid Bubble Cannon item ${item.letter||''}`);
    for(const round of config.rounds)if(!round.id||!round.instruction||!['letter','word'].includes(round.visual)||!['nameAudio','soundAudio','wordAudio'].includes(round.audioField)||![1,2].includes(round.hitsPerTask))throw new TypeError(`Invalid Bubble Cannon round ${round.id||''}`);
    return true;
  }

  function initialState(config=CONFIG,random=Math.random){
    validate(config);
    const letters=letterSet(config);
    return {
      gameId:config.id,
      currentRound:0,
      taskIndex:0,
      taskOrders:config.rounds.map(()=>shuffled(letters,random)),
      hitsForTask:0,
      successfulHits:0,
      completedTasks:[],
      errors:0,
      gameCompleted:false
    };
  }

  function restore(config=CONFIG,saved,random=Math.random){
    const fresh=initialState(config,random),letters=letterSet(config);
    if(!saved||typeof saved!=='object'||(saved.gameId!=null&&saved.gameId!==config.id))return fresh;
    const orders=Array.isArray(saved.taskOrders)?saved.taskOrders:null;
    if(orders?.length===config.rounds.length&&orders.every(order=>Array.isArray(order)&&order.length===letters.length&&new Set(order).size===letters.length&&order.every(letter=>letters.includes(letter))))fresh.taskOrders=orders.map(order=>[...order]);
    const round=Number.isInteger(saved.currentRound)?saved.currentRound:0,index=Number.isInteger(saved.taskIndex)?saved.taskIndex:0;
    if(round>=0&&round<config.rounds.length&&index>=0&&index<=letters.length){fresh.currentRound=round;fresh.taskIndex=index;}
    const expectedTasks=Math.min(totalTasks(config),fresh.currentRound*letters.length+fresh.taskIndex);
    fresh.completedTasks=Array.isArray(saved.completedTasks)?saved.completedTasks.filter((id,pos,array)=>typeof id==='string'&&array.indexOf(id)===pos).slice(0,expectedTasks):[];
    if(fresh.completedTasks.length!==expectedTasks)fresh.completedTasks=[];
    const perTask=config.rounds[fresh.currentRound]?.hitsPerTask||1,hits=Number.isInteger(saved.hitsForTask)?saved.hitsForTask:0;
    if(fresh.taskIndex<letters.length&&hits>=0&&hits<perTask)fresh.hitsForTask=hits;
    const minimumHits=config.rounds.slice(0,fresh.currentRound).reduce((sum,item)=>sum+item.hitsPerTask*letters.length,0)+fresh.taskIndex*perTask+fresh.hitsForTask;
    fresh.successfulHits=Math.min(totalHits(config),minimumHits);
    fresh.errors=Number.isFinite(saved.errors)?Math.max(0,Math.floor(saved.errors)):0;
    fresh.gameCompleted=Boolean(saved.gameCompleted&&expectedTasks===totalTasks(config));
    if(fresh.gameCompleted){fresh.currentRound=config.rounds.length-1;fresh.taskIndex=letters.length;fresh.hitsForTask=0;fresh.successfulHits=totalHits(config);fresh.errors=0;}
    return fresh;
  }

  function currentRound(config=CONFIG,state){return config.rounds[state.currentRound]||config.rounds.at(-1);}
  function currentTask(config=CONFIG,state){
    if(state.gameCompleted)return null;
    const round=currentRound(config,state),letter=state.taskOrders[state.currentRound]?.[state.taskIndex],item=config.letters.find(entry=>entry.letter===letter);
    return round&&item?Object.freeze({...item,roundId:round.id,roundTitle:round.title,instruction:round.instruction,visual:round.visual,hitsPerTask:round.hitsPerTask,motion:round.motion,audioKey:item[round.audioField]}):null;
  }
  function progress(config=CONFIG,state){return Math.max(0,Math.min(totalHits(config),Number(state.successfulHits)||0));}
  function hint(config=CONFIG,state){return state.errors>=2?currentTask(config,state)?.letter||null:null;}
  function hintStrength(state){return state.errors>=3?'strong':state.errors>=2?'soft':'none';}
  function noteWrong(config=CONFIG,state){if(state.gameCompleted)return 'ignored';state.errors++;return state.errors>=3?'retry-strong':state.errors>=2?'retry-hint':'retry';}
  function miss(config=CONFIG,state){return state.gameCompleted?'ignored':'miss';}

  function hitTarget(config=CONFIG,state,letter){
    const task=currentTask(config,state);if(!task||!letterSet(config).includes(letter))return 'ignored';
    if(letter!==task.letter)return noteWrong(config,state);
    state.hitsForTask++;state.successfulHits++;state.errors=0;
    if(state.hitsForTask<task.hitsPerTask)return 'task-hit';
    state.hitsForTask=0;state.completedTasks.push(`${task.roundId}:${task.letter}`);state.taskIndex++;
    if(state.taskIndex>=config.letters.length){
      if(state.currentRound>=config.rounds.length-1){state.gameCompleted=true;return 'game-complete';}
      state.currentRound++;state.taskIndex=0;return 'round-complete';
    }
    return 'correct';
  }

  const point=value=>({x:Number(value?.x)||0,y:Number(value?.y)||0});
  function createPointerTracker(minDragPx=MIN_DRAG_PX){
    const threshold=Math.max(1,Number(minDragPx)||MIN_DRAG_PX);let active=null;
    const coordinates=event=>({x:Number(event?.clientX)||0,y:Number(event?.clientY)||0});
    const snapshot=()=>active?Object.freeze({...active}):null;
    const update=event=>{
      if(!active||event?.pointerId!==active.pointerId)return null;const current=coordinates(event),dx=current.x-active.startX,dy=current.y-active.startY;
      active={...active,lastX:current.x,lastY:current.y,distance:Math.hypot(dx,dy)};return snapshot();
    };
    return Object.freeze({
      begin(event){if(active||event?.pointerId==null)return null;const current=coordinates(event);active={pointerId:event.pointerId,pointerType:event.pointerType||'mouse',startX:current.x,startY:current.y,lastX:current.x,lastY:current.y,distance:0,captureLost:false};return snapshot();},
      move:update,
      finish(event){const current=update(event);if(!current)return null;const result=Object.freeze({...current,shouldShoot:current.distance>=threshold});active=null;return result;},
      cancel(event){if(!active||event?.pointerId!==active.pointerId)return false;active=null;return true;},
      loseCapture(event){if(!active||event?.pointerId!==active.pointerId)return null;active={...active,captureLost:true};return snapshot();},
      current:snapshot,
      reset(){active=null;return true;}
    });
  }
  function rayMetric(origin,aim,target){
    const start=point(origin),end=point(aim),center=point(target),dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy);
    if(length<MIN_DRAG_PX)return {valid:false,length,projection:0,distance:Infinity,direction:{x:0,y:-1}};
    const direction={x:dx/length,y:dy/length},tx=center.x-start.x,ty=center.y-start.y,projection=tx*direction.x+ty*direction.y;
    const closest={x:start.x+direction.x*Math.max(0,projection),y:start.y+direction.y*Math.max(0,projection)};
    return {valid:projection>0,length,projection,distance:Math.hypot(center.x-closest.x,center.y-closest.y),direction};
  }
  function resolveAim(origin,aim,targets,correctId,assistPx=AIM_ASSIST_PX){
    const list=(Array.isArray(targets)?targets:[]).map(target=>({...target,radius:Math.max(1,Number(target.radius)||1),metric:rayMetric(origin,aim,target)})).filter(target=>target.metric.valid);
    const length=Math.hypot((Number(aim?.x)||0)-(Number(origin?.x)||0),(Number(aim?.y)||0)-(Number(origin?.y)||0));
    if(length<MIN_DRAG_PX)return {kind:'cancel',assisted:false,target:null,direction:null};
    const direct=list.filter(target=>target.metric.distance<=target.radius).sort((a,b)=>a.metric.projection-b.metric.projection)[0];
    if(direct)return {kind:'hit',assisted:false,target:direct,direction:direct.metric.direction};
    const correct=list.find(target=>target.id===correctId);
    if(correct&&correct.metric.distance<=correct.radius+Math.max(0,assistPx)){
      const start=point(origin),dx=correct.x-start.x,dy=correct.y-start.y,distance=Math.max(1,Math.hypot(dx,dy));
      return {kind:'hit',assisted:true,target:correct,direction:{x:dx/distance,y:dy/distance}};
    }
    const raw=rayMetric(origin,aim,{x:(Number(aim?.x)||0),y:(Number(aim?.y)||0)}).direction;
    return {kind:'miss',assisted:false,target:null,direction:raw};
  }
  function nearLineTarget(origin,aim,targets,margin=14){
    return (Array.isArray(targets)?targets:[]).map(target=>({...target,metric:rayMetric(origin,aim,target),radius:Math.max(1,Number(target.radius)||1)})).filter(target=>target.metric.valid&&target.metric.distance<=target.radius+margin).sort((a,b)=>a.metric.distance-b.metric.distance||a.metric.projection-b.metric.projection)[0]||null;
  }

  function targetData(config=CONFIG,state){
    const task=currentTask(config,state),round=currentRound(config,state),positions=POSITIONS[state.currentRound]||POSITIONS[0],shift=(state.taskIndex+state.currentRound)%positions.length;
    return config.letters.map((item,index)=>{
      const position=positions[(index+shift)%positions.length];
      return Object.freeze({id:item.letter,letter:item.letter,word:item.word,visual:round.visual==='word'?item.emoji:item.letter,label:round.visual==='word'?item.word:`Буква ${item.letter}`,correct:item.letter===task?.letter,x:position.x,y:position.y,asset:config.assets.targets[index%config.assets.targets.length]});
    });
  }
  const optionalImage=(src,className,label='')=>src?`<img class="${className}" data-bubble-cannon-asset src="${escape(src)}" alt="${escape(label)}" draggable="false">`:'';

  function render(config=CONFIG,state,options={}){
    const total=totalHits(config),done=progress(config,state),character=options.characterHTML||'<span class="bubble-cannon-character-fallback">🦒</span>',speaker=options.icons?.speaker||'🔊',arrow=options.icons?.arrow||'→',assets=options.assets||config.assets||ASSETS;
    if(state.gameCompleted){
      return `<section class="bubble-cannon-game is-complete" data-bubble-cannon-game="${escape(config.id)}"><div class="bubble-cannon-finish-art">${character}<div class="bubble-cannon-reward-stars" aria-label="Три звезды"><span>★</span><span>★</span><span>★</span><i></i><i></i><i></i><i></i><i></i><i></i></div></div><h1>Все пузыри лопнули!</h1><p>Ты сделал ${total} точных попаданий и подружился с P, Q и R.</p><div class="bubble-cannon-finish-actions"><button class="secondary" data-action="bubble-cannon-replay">Играть ещё</button><button class="primary" data-action="bubble-cannon-continue">Дальше ${arrow}</button></div></section>`;
    }
    const round=currentRound(config,state),task=currentTask(config,state),targets=targetData(config,state),strength=hintStrength(state),wordProgress=round.id==='words'?`<div class="bubble-cannon-hit-progress" data-bubble-cannon-hit-progress role="img" aria-label="Попаданий ${state.hitsForTask} из ${round.hitsPerTask}">${Array.from({length:round.hitsPerTask},(_,index)=>`<span class="${index<state.hitsForTask?'is-filled':''}" data-bubble-cannon-hit-slot><i></i></span>`).join('')}</div>`:'';
    const targetMarkup=targets.map((target,index)=>`<div class="bubble-cannon-target ${target.correct&&strength!=='none'?`is-hint is-hint-${strength}`:''}" data-bubble-cannon-target data-letter="${escape(target.letter)}" data-correct="${target.correct}" role="img" aria-label="${escape(target.label)}" style="--bubble-x:${target.x}%;--bubble-y:${target.y}%;--bubble-delay:${index*-.9}s;--bubble-index:${index}"><span class="bubble-cannon-target-fallback"></span>${optionalImage(target.asset,'bubble-cannon-target-image')}<strong class="bubble-cannon-target-content">${escape(target.visual)}</strong>${optionalImage(assets.hintGlow,'bubble-cannon-hint-image')}</div>`).join('');
    return `<section class="bubble-cannon-game" data-bubble-cannon-game="${escape(config.id)}" data-round="${escape(round.id)}" data-motion="${escape(round.motion)}"><header class="bubble-cannon-header"><div><p>Пушка с пузырями · раунд ${state.currentRound+1} / ${config.rounds.length}</p><h1>${escape(round.title)}</h1></div><button class="bubble-cannon-exit" data-action="bubble-cannon-exit" aria-label="Выйти из игры">×</button></header><div class="bubble-cannon-progress" role="progressbar" aria-label="Прогресс игры" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><i style="width:${Math.round(done/total*100)}%"></i><span>${done} / ${total}</span></div><div class="bubble-cannon-task"><div><strong>${escape(round.instruction)}</strong><small>${strength==='strong'?'Цель светится ярче, а пузыри стали медленнее.':strength==='soft'?'Посмотри: правильная цель светится.':'Нажми на пушку, тяни к цели и отпусти.'}</small>${wordProgress}</div><button class="bubble-cannon-repeat" data-action="bubble-cannon-repeat" aria-label="Повторить задание">${speaker}<span>Ещё раз</span></button></div><div class="bubble-cannon-scene ${strength==='strong'?'is-slowed':''}" data-bubble-cannon-scene aria-label="Игровое поле. Потяни от пушки к пузырю и отпусти.">${optionalImage(assets.background,'bubble-cannon-background')}<div class="bubble-cannon-scenery" aria-hidden="true"><span class="bubble-cannon-sun"></span><span class="bubble-cannon-cloud bubble-cannon-cloud-one">☁</span><span class="bubble-cannon-cloud bubble-cannon-cloud-two">☁</span>${optionalImage(assets.clouds?.[0],'bubble-cannon-cloud-image bubble-cannon-cloud-image-one')}${optionalImage(assets.clouds?.[1],'bubble-cannon-cloud-image bubble-cannon-cloud-image-two')}${optionalImage(assets.leaves?.[0],'bubble-cannon-leaves bubble-cannon-leaves-left')}${optionalImage(assets.leaves?.[1],'bubble-cannon-leaves bubble-cannon-leaves-right')}</div><div class="bubble-cannon-targets" data-bubble-cannon-targets>${targetMarkup}</div><div class="bubble-cannon-aim-line" data-bubble-cannon-aim-line aria-hidden="true"></div><div class="bubble-cannon-projectile" data-bubble-cannon-projectile aria-hidden="true"><span></span>${optionalImage(assets.projectileTrail,'bubble-cannon-projectile-trail')}${optionalImage(assets.projectile,'bubble-cannon-projectile-image')}</div><div class="bubble-cannon-effects" data-bubble-cannon-effects aria-hidden="true"></div><div class="bubble-cannon-marius">${character}</div><div class="bubble-cannon-control" data-bubble-cannon-control tabindex="0" role="button" aria-label="Пушка. Потяни к цели и отпусти."><div class="bubble-cannon-barrel" data-bubble-cannon-barrel><span class="bubble-cannon-pivot-point" data-bubble-cannon-pivot></span><span class="bubble-cannon-barrel-fallback"></span>${optionalImage(assets.barrel,'bubble-cannon-barrel-image')}<span class="bubble-cannon-muzzle-point" data-bubble-cannon-muzzle></span><div class="bubble-cannon-muzzle-flash" data-bubble-cannon-muzzle-flash><i></i>${optionalImage(assets.muzzleFlash,'bubble-cannon-flash-image')}</div></div><div class="bubble-cannon-base"><span></span>${optionalImage(assets.base,'bubble-cannon-base-image')}</div></div><p class="bubble-cannon-feedback" data-bubble-cannon-feedback role="status" aria-live="polite">Слушай внимательно…</p></div><p class="bubble-cannon-controls">Тяни от пушки к цели · отпусти для выстрела</p></section>`;
  }

  return Object.freeze({CONFIG,ASSETS,LETTERS,ROUNDS,MIN_DRAG_PX,AIM_ASSIST_PX,validate,initialState,restore,currentRound,currentTask,totalTasks,totalHits,progress,hint,hintStrength,noteWrong,miss,hitTarget,rayMetric,resolveAim,nearLineTarget,createPointerTracker,targetData,render});
})();
