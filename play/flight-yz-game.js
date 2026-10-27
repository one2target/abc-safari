'use strict';

/* Y/Z flight: accepted flight physics plus names, phonics and air-mail words. */
const FlightYZGame=(()=>{
  const WIDTH=941;
  const HEIGHT=1672;
  const BASE='./images/flight-yz/';
  const ASSETS=Object.freeze({
    background:BASE+'sky-kingdom.png',
    leftIsland:BASE+'island-home.png',
    rightIsland:BASE+'island-lighthouse.png',
    plane:BASE+'plane.png',
    propeller:BASE+'propeller.png',
    parcel:'./images/railway-vwx/railway-cargo-01.png',
    marius:'./images/giraffe_base.png'
  });
  const PHYSICS=Object.freeze({
    maxSpeed:500,
    maxAcceleration:1080,
    spring:5.2,
    damping:3.8,
    maxBank:11,
    bankResponse:7.5,
    pointerOffsetMin:82,
    pointerOffsetMax:112,
    pointerOffsetHeightRatio:.11,
    assistDuration:.56,
    arrivalHold:.4,
    rearmScale:1.48
  });
  const ISLANDS=Object.freeze([
    Object.freeze({id:'left',asset:ASSETS.leftIsland,label:'Остров с домиком',x:-100,y:330,width:620,height:774,labelAnchor:Object.freeze({x:74,y:29}),wordAnchor:Object.freeze({x:74,y:29}),deliveryAnchor:Object.freeze({x:76,y:52})}),
    Object.freeze({id:'right',asset:ASSETS.rightIsland,label:'Остров с маяком',x:535,y:500,width:530,height:662,labelAnchor:Object.freeze({x:30,y:30}),wordAnchor:Object.freeze({x:30,y:30}),deliveryAnchor:Object.freeze({x:28,y:50})})
  ]);
  const LANDING_ZONES=Object.freeze([
    Object.freeze({id:'left',x:370,y:735,rx:145,ry:122}),
    Object.freeze({id:'right',x:685,y:830,rx:145,ry:126})
  ]);
  const FINAL_PLATFORM=Object.freeze({id:'center',x:470,y:415,width:210,height:126,wordAnchor:Object.freeze({x:50,y:40})});
  const FINAL_LANDING_ZONE=Object.freeze({id:'center',x:470,y:535,rx:112,ry:92});
  const MARIUS=Object.freeze({
    asset:ASSETS.marius,
    frame:Object.freeze({left:28,top:12,width:44,height:47}),
    anchor:Object.freeze({x:50,y:50}),
    scale:1.05,
    offsetX:2,
    offsetY:0,
    rotation:-3.5
  });
  const EDUCATION=Object.freeze({
    letters:Object.freeze(['Y','Z']),
    stages:Object.freeze([
      Object.freeze({id:'letterNames',audioType:'name',copies:1}),
      Object.freeze({id:'letterSounds',audioType:'sound',copies:1}),
      Object.freeze({id:'words',audioType:'word',copies:2}),
      Object.freeze({id:'finalExpedition',audioType:'mixed',copies:1})
    ]),
    totalTasks:12,
    transitionDelay:120,
    respawnFadeOut:190,
    respawnFadeIn:210,
    stageTransitionDelay:900,
    deliveryDuration:560,
    finalFlightDuration:2600,
    finalCelebrationDelay:1900,
    hintAfterErrors:2,
    strongHintAfterErrors:3
  });
  const CONFIG=Object.freeze({
    id:'flight-yz-prototype',rewardSourceId:'minigame:flight-yz',width:WIDTH,height:HEIGHT,planeSize:230,
    start:Object.freeze({x:470,y:1285}),assets:ASSETS,physics:PHYSICS,
    islands:ISLANDS,landingZones:LANDING_ZONES,finalPlatform:FINAL_PLATFORM,finalLandingZone:FINAL_LANDING_ZONE,marius:MARIUS,education:EDUCATION
  });
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const shuffled=(items,random=Math.random)=>{const copy=[...items];for(let index=copy.length-1;index>0;index--){const swap=Math.floor(clamp(random(),0,.999999)*(index+1));[copy[index],copy[swap]]=[copy[swap],copy[index]];}return copy;};
  const finalExpeditionTasks=(config=EDUCATION,random=Math.random)=>{
    const yz=shuffled(config.letters,random);
    return [
      Object.freeze({id:'final-name',taskType:'letterName',audioType:'name',answerMode:'letter',target:yz[0],choices:Object.freeze([...config.letters])}),
      Object.freeze({id:'final-sound',taskType:'letterSound',audioType:'sound',answerMode:'letter',target:yz[1],choices:Object.freeze([...config.letters])}),
      Object.freeze({id:'final-word',taskType:'word',audioType:'word',answerMode:'word',target:yz[Math.floor(clamp(random(),0,.999999)*yz.length)],choices:Object.freeze([...config.letters])}),
      Object.freeze({id:'final-recap',taskType:'word',audioType:'word',answerMode:'word',target:'X',choices:Object.freeze(['W','X','Y'])})
    ];
  };
  const stageTasks=(stage,config,random)=>stage.id==='finalExpedition'?finalExpeditionTasks(config,random):shuffled(Array.from({length:stage.copies||1},()=>config.letters).flat(),random);
  const taskDefinition=(stage,raw,config)=>typeof raw==='object'?raw:{id:`${stage.id}-${raw}`,taskType:stage.audioType==='name'?'letterName':stage.audioType==='sound'?'letterSound':'word',audioType:stage.audioType,answerMode:stage.audioType==='word'?'word':'letter',target:raw,choices:config.letters};
  const taskAssignment=(task,random)=>Object.fromEntries(shuffled(task.choices,random).map((letter,index)=>[['left','right','center'][index],letter]));
  const applyTask=(state,stage,raw,config,random)=>{
    const task=taskDefinition(stage,raw,config);
    state.taskId=task.id;state.taskType=task.taskType;state.audioType=task.audioType;state.answerMode=task.answerMode;state.target=task.target;state.assignment=taskAssignment(task,random);
    return task;
  };
  const restoredTasks=(saved,stage,config,random)=>{
    const expected=stage.id==='finalExpedition'?4:(stage.copies||1)*config.letters.length;
    if(!Array.isArray(saved)||saved.length!==expected)return stageTasks(stage,config,random);
    if(stage.id!=='finalExpedition')return saved.every(letter=>typeof letter==='string'&&config.letters.includes(letter))?[...saved]:stageTasks(stage,config,random);
    const definitions={
      'final-name':{taskType:'letterName',audioType:'name',answerMode:'letter',choices:[...config.letters]},
      'final-sound':{taskType:'letterSound',audioType:'sound',answerMode:'letter',choices:[...config.letters]},
      'final-word':{taskType:'word',audioType:'word',answerMode:'word',choices:[...config.letters]},
      'final-recap':{taskType:'word',audioType:'word',answerMode:'word',choices:['W','X','Y']}
    };
    const restored=[];
    for(const raw of saved){
      const definition=raw&&typeof raw==='object'?definitions[raw.id]:null;
      const target=typeof raw?.target==='string'?raw.target:'';
      if(!definition||!definition.choices.includes(target)||(raw.id==='final-recap'&&target!=='X'))return stageTasks(stage,config,random);
      restored.push(Object.freeze({id:raw.id,...definition,target,choices:Object.freeze([...definition.choices])}));
    }
    return restored;
  };
  const restoredAssignment=(saved,task,random)=>{
    const ids=['left','right','center'].slice(0,task.choices.length),values=ids.map(id=>saved?.[id]);
    if(saved&&Object.keys(saved).length===ids.length&&values.every(letter=>task.choices.includes(letter))&&new Set(values).size===ids.length&&values.includes(task.target))return Object.fromEntries(ids.map((id,index)=>[id,values[index]]));
    return taskAssignment(task,random);
  };
  const LearningEngine=Object.freeze({
    initialState(config=EDUCATION,random=Math.random){
      const stage=config.stages[0];
      const tasks=stageTasks(stage,config,random);
      const state={stageIndex:0,stage:stage.id,audioType:stage.audioType,tasks,taskIndex:0,taskId:null,taskType:null,answerMode:'letter',stageProgress:0,totalProgress:0,journeyProgress:0,errors:0,target:null,assignment:{},status:'ready',parcelState:'none',lastOutcome:null,lastIslandId:null};
      applyTask(state,stage,tasks[0],config,random);
      return state;
    },
    restore(saved,config=EDUCATION,random=Math.random){
      const restart=()=>{const state=this.initialState(config,random);this.start(state);return state;};
      if(!saved||typeof saved!=='object')return restart();
      const stageIndex=config.stages.findIndex(stage=>stage.id===saved.stage);
      if(stageIndex<0)return restart();
      const stage=config.stages[stageIndex],tasks=restoredTasks(saved.tasks,stage,config,random);
      const taskIndex=Number.isInteger(saved.taskIndex)?clamp(saved.taskIndex,0,tasks.length-1):0;
      const state={stageIndex,stage:stage.id,audioType:stage.audioType,tasks,taskIndex,taskId:null,taskType:null,answerMode:'letter',stageProgress:clamp(Number(saved.stageProgress)||0,0,tasks.length),totalProgress:clamp(Number(saved.totalProgress)||0,0,config.totalTasks),journeyProgress:clamp(Number(saved.journeyProgress)||0,0,4),errors:clamp(Number(saved.errors)||0,0,99),target:null,assignment:{},status:['ready','playing','resolving','delivering','respawning','transitioning','finalFlight','finalCelebration','complete'].includes(saved.status)?saved.status:'playing',parcelState:['none','attached','delivering','delivered'].includes(saved.parcelState)?saved.parcelState:'none',lastOutcome:['correct','wrong'].includes(saved.lastOutcome)?saved.lastOutcome:null,lastIslandId:['left','right','center'].includes(saved.lastIslandId)?saved.lastIslandId:null};
      const task=applyTask(state,stage,tasks[taskIndex],config,random);
      state.assignment=restoredAssignment(saved.assignment,task,random);
      if(state.totalProgress>=config.totalTasks||['finalFlight','finalCelebration','complete'].includes(state.status)){
        state.totalProgress=config.totalTasks;state.journeyProgress=4;state.status='complete';state.parcelState='none';state.lastOutcome=null;state.lastIslandId=null;return state;
      }
      if(state.status==='ready')this.start(state);
      else if(state.status==='resolving'){
        if(state.lastOutcome==='correct'&&state.stage!=='words'){
          state.status='respawning';
          if(state.stageIndex===config.stages.length-1&&state.stageProgress>=state.tasks.length)return restart();
          this.finishRespawn(state,config,random);
        }else{state.status='playing';state.parcelState=state.stage==='words'?'attached':'none';state.lastOutcome=null;state.lastIslandId=null;}
      }else if(state.status==='delivering'){
        state.status='playing';state.parcelState='attached';state.lastOutcome=null;state.lastIslandId=null;
      }else if(state.status==='respawning'){
        if(state.stageIndex===config.stages.length-1&&state.stageProgress>=state.tasks.length)return restart();
        this.finishRespawn(state,config,random);
      }else if(state.status==='transitioning')this.finishTransition(state);
      if(state.status==='transitioning')this.finishTransition(state);
      if(state.status==='playing')state.parcelState=state.stage==='words'?'attached':'none';
      return state;
    },
    start(state){
      if(!state||state.status!=='ready')return {outcome:'ignored'};
      state.status='playing';
      return {outcome:'started',stage:state.stage,target:state.target,audioType:state.audioType};
    },
    land(state,islandId){
      if(!state||state.status!=='playing'||!Object.hasOwn(state.assignment,islandId))return {outcome:'ignored'};
      const chosen=state.assignment[islandId],correct=chosen===state.target;
      state.status='resolving';state.lastOutcome=correct?'correct':'wrong';state.lastIslandId=islandId;
      if(correct&&state.stage!=='words'){state.stageProgress+=1;state.totalProgress+=1;if(state.stage==='finalExpedition')state.journeyProgress=state.stageProgress;}else if(!correct)state.errors+=1;
      return {outcome:state.lastOutcome,chosen,target:state.target,stage:state.stage,taskType:state.taskType,audioType:state.audioType,stageProgress:state.stageProgress,totalProgress:state.totalProgress,journeyProgress:state.journeyProgress,errors:state.errors,islandId};
    },
    resolveLanding(state,config=EDUCATION){
      if(!state||state.status!=='resolving')return {outcome:'ignored'};
      if(state.lastOutcome==='wrong'){
        state.status='playing';state.lastOutcome=null;state.lastIslandId=null;
        return {outcome:'retry',respawn:false,target:state.target,totalProgress:state.totalProgress,errors:state.errors};
      }
      if(state.stage==='words'){
        state.status='delivering';state.parcelState='delivering';
        return {outcome:'delivery',delivery:true,target:state.target,totalProgress:state.totalProgress,islandId:state.lastIslandId};
      }
      if(state.stage==='finalExpedition'&&state.totalProgress>=config.totalTasks){
        state.status='finalFlight';state.parcelState='none';
        return {outcome:'final-flight',finalFlight:true,target:state.target,totalProgress:state.totalProgress,islandId:state.lastIslandId};
      }
      state.status='respawning';
      return {outcome:'respawn',respawn:true,target:state.target,totalProgress:state.totalProgress,errors:state.errors};
    },
    finishDelivery(state){
      if(!state||state.status!=='delivering')return {outcome:'ignored'};
      state.stageProgress+=1;state.totalProgress+=1;state.status='respawning';state.parcelState='delivered';
      return {outcome:'delivered',respawn:true,target:state.target,totalProgress:state.totalProgress,islandId:state.lastIslandId};
    },
    finishRespawn(state,config=EDUCATION,random=Math.random){
      if(!state||state.status!=='respawning')return {outcome:'ignored'};
      state.lastOutcome=null;state.lastIslandId=null;
      if(state.stageProgress>=state.tasks.length){
        state.stageIndex+=1;
        const stage=config.stages[state.stageIndex];
        state.stage=stage.id;state.tasks=stageTasks(stage,config,random);state.taskIndex=0;state.stageProgress=0;state.errors=0;state.status='transitioning';state.parcelState='none';
        applyTask(state,stage,state.tasks[0],config,random);
        return {outcome:'stage-transition',stage:state.stage,audioType:state.audioType,target:state.target,totalProgress:state.totalProgress,assignment:{...state.assignment}};
      }
      state.taskIndex+=1;state.errors=0;state.status='playing';state.parcelState=state.stage==='words'?'attached':'none';
      applyTask(state,config.stages[state.stageIndex],state.tasks[state.taskIndex],config,random);
      return {outcome:'next',stage:state.stage,audioType:state.audioType,target:state.target,totalProgress:state.totalProgress,assignment:{...state.assignment}};
    },
    finishTransition(state){
      if(!state||state.status!=='transitioning')return {outcome:'ignored'};
      state.status='playing';state.parcelState=state.stage==='words'?'attached':'none';
      return {outcome:'next-stage',stage:state.stage,audioType:state.audioType,target:state.target,totalProgress:state.totalProgress};
    },
    finishFinalFlight(state){
      if(!state||state.status!=='finalFlight')return {outcome:'ignored'};
      state.status='finalCelebration';
      return {outcome:'final-celebration',totalProgress:state.totalProgress};
    },
    finishFinalCelebration(state){
      if(!state||state.status!=='finalCelebration')return {outcome:'ignored'};
      state.status='complete';
      return {outcome:'complete',totalProgress:state.totalProgress};
    },
    skipToFinalTask(state,config=EDUCATION,random=Math.random){
      if(!state||['finalFlight','finalCelebration','complete'].includes(state.status))return {outcome:'ignored'};
      const stageIndex=config.stages.findIndex(stage=>stage.id==='finalExpedition');
      const stage=config.stages[stageIndex];
      state.stageIndex=stageIndex;state.stage=stage.id;state.tasks=stageTasks(stage,config,random);state.taskIndex=state.tasks.length-1;state.stageProgress=state.tasks.length-1;state.totalProgress=config.totalTasks-1;state.journeyProgress=3;state.errors=0;state.status='playing';state.parcelState='none';state.lastOutcome=null;state.lastIslandId=null;
      applyTask(state,stage,state.tasks[state.taskIndex],config,random);
      return {outcome:'skipped-to-final',target:state.target,totalProgress:state.totalProgress};
    },
    currentTarget(state){return state&&state.target&&Object.values(state.assignment).includes(state.target)?state.target:null;}
  });
  const RuntimeEngine=Object.freeze({
    clearPointer(runtime){
      const pointerId=runtime.pointerId;
      runtime.pointerId=null;runtime.pointerActive=false;runtime.pointerWorld=null;
      return pointerId;
    },
    resetAtStart(runtime,config=CONFIG,zones=[]){
      runtime.x=clamp(config.start.x,runtime.bounds.left,runtime.bounds.right);
      runtime.y=clamp(config.start.y,runtime.bounds.top,runtime.bounds.bottom);
      runtime.targetX=runtime.x;runtime.targetY=runtime.y;runtime.vx=0;runtime.vy=0;runtime.bank=0;runtime.assist=null;
      zones.forEach(zone=>{zone.armed=true;});
      return {x:runtime.x,y:runtime.y,targetX:runtime.targetX,targetY:runtime.targetY,vx:runtime.vx,vy:runtime.vy,bank:runtime.bank,pointerActive:runtime.pointerActive};
    }
  });
  const answerSparks=()=>`<span class="yz-flight-letter-sparks"><i>✦</i><i>★</i><i>✦</i><i>★</i><i>✦</i><i>★</i></span>`;
  const islandMarkup=(island,initialLetter)=>`<div class="yz-flight-island yz-flight-island-${escape(island.id)}" data-yz-island="${escape(island.id)}" style="left:${island.x}px;top:${island.y}px;width:${island.width}px;height:${island.height}px"><img src="${escape(island.asset)}" alt="${escape(island.label)}" draggable="false"><span class="yz-flight-letter-sign" data-yz-island-letter="${escape(island.id)}" data-letter="${escape(initialLetter)}" style="left:${island.labelAnchor.x}%;top:${island.labelAnchor.y}%" aria-hidden="true"><b data-yz-letter-text>${escape(initialLetter)}</b>${answerSparks()}</span><span class="yz-flight-word-sign" data-yz-island-word="${escape(island.id)}" style="left:${island.wordAnchor.x}%;top:${island.wordAnchor.y}%" hidden><img data-yz-word-image src="" alt="" draggable="false" hidden><b data-yz-word-visual aria-hidden="true"></b>${answerSparks()}</span><span class="yz-flight-delivery-anchor" data-yz-delivery-anchor="${escape(island.id)}" style="left:${island.deliveryAnchor.x}%;top:${island.deliveryAnchor.y}%" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>`;
  const zoneMarkup=zone=>`<div class="yz-landing-zone" data-yz-landing-zone="${escape(zone.id)}" style="left:${zone.x-zone.rx}px;top:${zone.y-zone.ry}px;width:${zone.rx*2}px;height:${zone.ry*2}px"><span></span><i></i><i></i><i></i><i></i></div>`;
  const finalPlatformMarkup=platform=>`<div class="yz-flight-final-platform" data-yz-island="${escape(platform.id)}" data-yz-final-platform hidden style="left:${platform.x-platform.width/2}px;top:${platform.y-platform.height/2}px;width:${platform.width}px;height:${platform.height}px"><span class="yz-flight-final-platform-cloud" aria-hidden="true"></span><span class="yz-flight-letter-sign" data-yz-island-letter="${escape(platform.id)}" hidden><b data-yz-letter-text></b>${answerSparks()}</span><span class="yz-flight-word-sign" data-yz-island-word="${escape(platform.id)}" style="left:${platform.wordAnchor.x}%;top:${platform.wordAnchor.y}%" hidden><img data-yz-word-image src="" alt="" draggable="false" hidden><b data-yz-word-visual aria-hidden="true"></b>${answerSparks()}</span></div>`;
  const journeySparks=()=>Array.from({length:14},(_,index)=>`<i style="--journey-index:${index};--journey-x:${8+(index*29)%86}%;--journey-y:${10+(index*37)%72}%;--journey-delay:${(index%7)*.14}s"></i>`).join('');

  function render(config=CONFIG,options={}){
    const debug=Boolean(options.debug);
    const marius=config.marius||MARIUS;
    const education=config.education||EDUCATION;
    const mariusStyle=`--marius-left:${marius.frame.left}%;--marius-top:${marius.frame.top}%;--marius-width:${marius.frame.width}%;--marius-height:${marius.frame.height}%;--marius-scale:${marius.scale};--marius-offset-x:${marius.offsetX}px;--marius-offset-y:${marius.offsetY}px;--marius-rotation:${marius.rotation}deg`;
    return `<section class="yz-flight-game" data-yz-flight-game="${escape(config.id)}" data-debug="${debug}" data-mode="free">
      <div class="yz-flight-scene" data-yz-flight-scene aria-label="Воздушная сцена. Веди самолёт пальцем или мышью к площадкам на островах.">
        <div class="yz-flight-world" data-yz-flight-world>
          <img class="yz-flight-background" src="${escape(config.assets.background)}" alt="" draggable="false">
          <span class="yz-flight-city-glow" data-yz-city-glow aria-hidden="true"></span>
          <span class="yz-flight-journey-sparks" aria-hidden="true">${journeySparks()}</span>
          ${config.islands.map((island,index)=>islandMarkup(island,education.letters[index%education.letters.length])).join('')}
          ${finalPlatformMarkup(config.finalPlatform||FINAL_PLATFORM)}
          ${config.landingZones.map(zoneMarkup).join('')}
          ${zoneMarkup(config.finalLandingZone||FINAL_LANDING_ZONE)}
          <div class="yz-flight-plane" data-yz-flight-plane style="width:${config.planeSize}px;height:${config.planeSize}px;${mariusStyle}">
            <img class="yz-flight-plane-art" src="${escape(config.assets.plane)}" alt="Самолёт" draggable="false">
            <span class="yz-flight-cockpit" data-yz-marius-mask aria-hidden="true">
              <span class="yz-flight-marius-pose"><img class="yz-flight-marius" data-yz-flight-marius src="${escape(marius.asset)}" alt="" draggable="false"></span>
            </span>
            <img class="yz-flight-cockpit-rim" src="${escape(config.assets.plane)}" alt="" draggable="false" aria-hidden="true">
            <img class="yz-flight-parcel" data-yz-flight-parcel src="${escape(config.assets.parcel)}" alt="" draggable="false" hidden aria-hidden="true">
            <span class="yz-flight-propeller-mount" aria-hidden="true"><img class="yz-flight-propeller" src="${escape(config.assets.propeller)}" alt="" draggable="false"></span>
            <span class="yz-flight-marius-anchor" data-yz-marius-anchor style="left:${marius.anchor.x}%;top:${marius.anchor.y}%" aria-hidden="true"></span>
            <span class="yz-flight-plane-center" aria-hidden="true"></span>
          </div>
          <span class="yz-flight-target" data-yz-flight-target aria-hidden="true"></span>
          <span class="yz-flight-safe-area" data-yz-flight-safe-area aria-hidden="true"></span>
          <span class="yz-flight-final-trail" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
          <span class="yz-flight-cloud-curtain yz-flight-cloud-curtain-left" aria-hidden="true"></span>
          <span class="yz-flight-cloud-curtain yz-flight-cloud-curtain-right" aria-hidden="true"></span>
        </div>
        <div class="yz-flight-hud" data-yz-flight-hud>
          <button class="yz-flight-audio" type="button" data-yz-repeat-audio aria-label="Повторить название буквы">${options.speakerIcon||'🔊'}</button>
          <span class="yz-flight-progress" data-yz-flight-progress aria-label="Общий прогресс">0 / ${education.totalTasks}</span>
        </div>
        <div class="yz-flight-stage-transition" data-yz-stage-transition hidden aria-live="polite"><span data-yz-stage-transition-text>Теперь слушаем звуки!</span></div>
        <pre class="yz-flight-debug-state" data-yz-flight-debug-state aria-hidden="true"></pre>
        ${debug?'<button class="yz-flight-debug-skip" type="button" data-yz-skip-final>Skip to final task</button><button class="yz-flight-debug-skip yz-flight-debug-reset" type="button" data-yz-reset-session>Reset YZ session</button>':''}
        <section class="yz-flight-complete" data-yz-flight-complete hidden aria-live="polite">
          <div class="yz-flight-final-stars" aria-label="Три звезды"><span aria-hidden="true">★</span><span aria-hidden="true">★</span><span aria-hidden="true">★</span></div>
          <h1>Алфавит покорён!</h1>
          <p>Ты прошёл весь путь от A до Z вместе с Мариусом!</p>
          <div class="yz-flight-final-alphabet" aria-label="Английский алфавит от A до Z"><span>A B C D E F</span><span>G H I J K L</span><span>M N O P Q R</span><span>S T U V W X Y Z</span></div>
          <div class="yz-flight-final-showcase">
            <div class="yz-flight-final-plane" aria-hidden="true"><img src="${escape(config.assets.plane)}" alt=""></div>
            <div class="yz-flight-final-marius"><img src="${escape(marius.asset)}" alt="Мариус"></div>
            <figure class="yz-flight-final-medal">
              <div class="yz-flight-medal" role="img" aria-label="Медаль Покоритель алфавита"><i></i><strong>A–Z</strong></div>
              <figcaption>Покоритель<br>алфавита</figcaption>
            </figure>
          </div>
          <button type="button" data-yz-flight-replay>Ещё раз</button>
        </section>
        <button class="yz-flight-exit" type="button" data-action="flight-yz-exit" aria-label="Закрыть игру">×</button>
      </div>
    </section>`;
  }

  function mount(root,options={}){
    const config=options.config||CONFIG;
    const education=config.education||EDUCATION;
    const random=typeof options.random==='function'?options.random:Math.random;
    const game=root?.querySelector?.('[data-yz-flight-game]');
    if(!game)return null;
    const scene=game.querySelector('[data-yz-flight-scene]');
    const world=game.querySelector('[data-yz-flight-world]');
    const plane=game.querySelector('[data-yz-flight-plane]');
    const targetMarker=game.querySelector('[data-yz-flight-target]');
    const safeArea=game.querySelector('[data-yz-flight-safe-area]');
    const audioButton=game.querySelector('[data-yz-repeat-audio]');
    const replayButton=game.querySelector('[data-yz-flight-replay]');
    const skipFinalButton=game.querySelector('[data-yz-skip-final]');
    const resetSessionButton=game.querySelector('[data-yz-reset-session]');
    const progressElement=game.querySelector('[data-yz-flight-progress]');
    const stageTransitionElement=game.querySelector('[data-yz-stage-transition]');
    const stageTransitionText=game.querySelector('[data-yz-stage-transition-text]');
    const completeElement=game.querySelector('[data-yz-flight-complete]');
    const debugElement=game.querySelector('[data-yz-flight-debug-state]');
    const parcelElement=game.querySelector('[data-yz-flight-parcel]');
    const finalPlatformElement=game.querySelector('[data-yz-final-platform]');
    const finalTrailElement=game.querySelector('.yz-flight-final-trail');
    if(!scene||!world||!plane)return null;

    const listeners=[];
    const timers=new Set();
    const deliveryGhosts=new Set();
    const zones=[...config.landingZones,config.finalLandingZone||FINAL_LANDING_ZONE].map(zone=>({...zone,armed:zone.id!=='center',active:zone.id!=='center'}));
    const wordItems=new Map((options.catalogItems||options.wordItems||[]).filter(item=>item?.letter).map(item=>[item.letter,{...item}]));
    let learning=options.initialState?LearningEngine.restore(options.initialState,education,random):LearningEngine.initialState(education,random);
    if(learning.status==='ready')LearningEngine.start(learning);
    const runtime={
      destroyed:false,raf:0,lastTime:0,scale:1,offsetX:0,offsetY:0,
      x:config.start.x,y:config.start.y,targetX:config.start.x,targetY:config.start.y,
      vx:0,vy:0,bank:0,bounds:{left:0,right:config.width,top:0,bottom:config.height},
      pointerId:null,pointerActive:false,pointerWorld:null,mode:learning.status==='complete'?'complete':'free',assist:null,
      replayOnFirstGesture:false,flightScale:1,finalFlight:null,finalSequenceStarted:false
    };
    const listen=(element,type,handler,settings)=>{element?.addEventListener(type,handler,settings);listeners.push(()=>element?.removeEventListener(type,handler,settings));};
    const timer=(callback,delay)=>{const id=setTimeout(()=>{timers.delete(id);if(!runtime.destroyed)callback();},delay);timers.add(id);return id;};
    const clearTimers=()=>{timers.forEach(id=>clearTimeout(id));timers.clear();};
    const releaseCapture=pointerId=>{try{if(scene.hasPointerCapture?.(pointerId))scene.releasePointerCapture(pointerId);}catch(_){} };
    const clearActivePointer=()=>{const pointerId=RuntimeEngine.clearPointer(runtime);if(pointerId!==null)releaseCapture(pointerId);return pointerId;};
    const setMode=mode=>{runtime.mode=mode;game.dataset.mode=mode;};
    const zoneElement=id=>game.querySelector(`[data-yz-landing-zone="${id}"]`);
    const islandElement=id=>game.querySelector(`[data-yz-island="${id}"]`);
    const letterElement=id=>game.querySelector(`[data-yz-island-letter="${id}"]`);
    const wordElement=id=>game.querySelector(`[data-yz-island-word="${id}"]`);
    const deliveryAnchorElement=id=>game.querySelector(`[data-yz-delivery-anchor="${id}"]`);
    const answerElement=id=>learning.answerMode==='word'?wordElement(id):letterElement(id);
    const setArrivalEffect=(id,active)=>{zoneElement(id)?.classList.toggle('is-arrived',active);islandElement(id)?.classList.toggle('is-arrived',active);};
    const clearAnswerReactions=()=>game.querySelectorAll('[data-yz-island-letter],[data-yz-island-word]').forEach(element=>element.classList.remove('is-correct','is-wrong'));
    const clearDeliveryVisuals=()=>{deliveryGhosts.forEach(element=>element.remove());deliveryGhosts.clear();game.querySelectorAll('[data-yz-delivery-anchor]').forEach(element=>element.classList.remove('is-receiving','is-delivered'));};
    const currentTargetIsland=()=>Object.keys(learning.assignment).find(id=>learning.assignment[id]===learning.target)||null;
    const wordForLetter=letter=>wordItems.get(letter)||null;
    const currentWord=()=>wordForLetter(learning.target);

    function updateDebug(){
      if(!debugElement||game.dataset.debug!=='true')return;
      debugElement.textContent=[
        `stage: ${learning.stage}`,
        `task: ${Math.min(education.totalTasks,learning.totalProgress+(learning.status==='playing'||learning.status==='resolving'?1:0))} / ${education.totalTasks}`,
        `task type: ${learning.taskType}`,
        `audio: ${learning.audioType}`,
        `target: ${learning.target||'—'}`,
        `word: ${currentWord()?.word||'—'}`,
        `audio file: ${currentWord()?.audioSrc||'—'}`,
        `islands: ${Object.keys(learning.assignment).map(id=>`${id}=${learning.assignment[id]}${learning.answerMode==='word'?`/${wordForLetter(learning.assignment[id])?.word||'—'}`:''}`).join(' · ')}`,
        `progress: ${learning.totalProgress} / ${education.totalTasks} (stage ${learning.stageProgress} / ${learning.tasks.length})`,
        `journey progress: ${learning.journeyProgress} / 4`,
        `errors: ${learning.errors}`,
        `state: ${learning.status}`,
        `finalFlight active: ${learning.status==='finalFlight'}`,
        `finalCelebration active: ${learning.status==='finalCelebration'}`,
        `pointer: ${runtime.pointerActive?`active #${runtime.pointerId}`:'inactive'}`,
        `respawn: ${learning.status==='respawning'||runtime.mode==='respawning'?'active':'idle'}`,
        `parcel attached: ${learning.parcelState==='attached'}`,
        `delivery: ${learning.status==='delivering'?'active':learning.parcelState}`,
        `plane: ${Math.round(runtime.x)},${Math.round(runtime.y)} · v=${Math.round(runtime.vx)},${Math.round(runtime.vy)} · bank=${runtime.bank.toFixed(1)}`,
        `zones: ${zones.map(zone=>`${zone.id}=${zone.active?(zone.armed?'armed':'locked'):'inactive'}`).join(' · ')}`
      ].join('\n');
    }
    function updateLearningUI(){
      const answerIds=['left','right','center'];
      const wordTask=learning.answerMode==='word';
      for(const id of answerIds){
        const letter=learning.assignment[id],letterSign=letterElement(id),wordSign=wordElement(id),word=wordForLetter(letter),active=Boolean(letter);
        if(letterSign){letterSign.hidden=!active||wordTask;letterSign.dataset.letter=letter||'';const text=letterSign.querySelector('[data-yz-letter-text]');if(text)text.textContent=letter||'';letterSign.classList.remove('is-hint-soft','is-hint-strong');}
        if(wordSign){
          wordSign.hidden=!active||!wordTask;wordSign.dataset.letter=letter||'';wordSign.dataset.word=word?.word||'';wordSign.setAttribute('aria-label',word?.word||letter||'');wordSign.classList.remove('is-hint-soft','is-hint-strong');
          const image=wordSign.querySelector('[data-yz-word-image]'),visual=wordSign.querySelector('[data-yz-word-visual]');
          if(image){image.hidden=!word?.image;if(word?.image)image.src=word.image;else image.removeAttribute('src');}
          if(visual){visual.hidden=Boolean(word?.image);visual.textContent=word?.visual||'';}
        }
      }
      const inputLocked=['finalFlight','finalCelebration','complete'].includes(learning.status);
      const centerActive=!inputLocked&&Object.hasOwn(learning.assignment,'center');
      if(finalPlatformElement)finalPlatformElement.hidden=!centerActive;
      for(const zone of zones){const active=!inputLocked&&Object.hasOwn(learning.assignment,zone.id),wasActive=zone.active;zone.active=active;if(!active)zone.armed=false;else if(!wasActive)zone.armed=true;const element=zoneElement(zone.id);if(element)element.hidden=!active;}
      const targetElement=answerElement(currentTargetIsland());
      if(targetElement&&learning.errors>=education.strongHintAfterErrors)targetElement.classList.add('is-hint-strong');
      else if(targetElement&&learning.errors>=education.hintAfterErrors)targetElement.classList.add('is-hint-soft');
      if(progressElement){progressElement.textContent=`${learning.totalProgress} / ${education.totalTasks}`;progressElement.setAttribute('aria-label',`Общий прогресс: ${learning.totalProgress} из ${education.totalTasks}`);}
      if(completeElement)completeElement.hidden=!['finalCelebration','complete'].includes(learning.status);
      if(stageTransitionElement)stageTransitionElement.hidden=learning.status!=='transitioning';
      if(stageTransitionText)stageTransitionText.textContent=learning.stage==='finalExpedition'?'Последняя экспедиция!':learning.stage==='words'?'Воздушная почта!':'Теперь слушаем звуки!';
      if(parcelElement)parcelElement.hidden=learning.parcelState!=='attached';
      if(audioButton){audioButton.disabled=!['playing','resolving'].includes(learning.status);audioButton.setAttribute('aria-label',learning.audioType==='word'?'Повторить слово':learning.audioType==='sound'?'Повторить звук буквы':'Повторить название буквы');}
      game.dataset.learningState=learning.status;
      game.dataset.stage=learning.stage;
      game.dataset.audioType=learning.audioType;
      game.dataset.target=learning.target||'';
      game.dataset.targetWord=currentWord()?.word||'';
      game.dataset.parcelAttached=String(learning.parcelState==='attached');
      game.dataset.deliveryState=learning.status==='delivering'?'delivering':learning.parcelState;
      game.dataset.taskNumber=String(Math.min(education.totalTasks,learning.totalProgress+(learning.status==='playing'||learning.status==='resolving'?1:0)));
      game.dataset.taskType=learning.taskType||'';
      game.dataset.journeyProgress=String(learning.journeyProgress);
      game.dataset.finalFlight=String(learning.status==='finalFlight');
      game.dataset.finalCelebration=String(learning.status==='finalCelebration');
      game.dataset.errors=String(learning.errors);
      game.dataset.progress=String(learning.totalProgress);
      updateDebug();
    }
    function playCurrentTarget(reason='task'){
      const target=LearningEngine.currentTarget(learning,education);
      if(runtime.destroyed||['ready','delivering','respawning','transitioning','finalFlight','finalCelebration','complete'].includes(learning.status)||!target)return Promise.resolve(false);
      return Promise.resolve(options.playTarget?.(target,{reason,stage:learning.stage,audioType:learning.audioType})??false);
    }
    function unlockAndReplayIfNeeded(){
      options.onUnlockAudio?.();
      if(!runtime.replayOnFirstGesture)return;
      runtime.replayOnFirstGesture=false;
      playCurrentTarget('first-gesture');
    }
    function restartRound(){
      clearTimers();clearAnswerReactions();clearDeliveryVisuals();
      plane.classList.remove('is-respawning','is-respawn-hidden');
      game.classList.remove('is-final-flight','is-final-celebration');
      if(stageTransitionElement)stageTransitionElement.hidden=true;
      clearActivePointer();
      learning=LearningEngine.initialState(education,random);
      LearningEngine.start(learning);
      RuntimeEngine.resetAtStart(runtime,config,zones);
      runtime.flightScale=1;runtime.finalFlight=null;runtime.finalSequenceStarted=false;
      setMode('free');
      updateLearningUI();
      emitState('restart');
      options.onRoundRestart?.(learningSnapshot());
      playCurrentTarget('restart');
      return true;
    }
    function skipToFinalTask(){
      if(game.dataset.debug!=='true')return false;
      clearTimers();clearAnswerReactions();clearDeliveryVisuals();clearActivePointer();
      plane.classList.remove('is-respawning','is-respawn-hidden');game.classList.remove('is-final-flight','is-final-celebration');
      const result=LearningEngine.skipToFinalTask(learning,education,random);
      if(result.outcome==='ignored')return false;
      RuntimeEngine.resetAtStart(runtime,config,zones);runtime.flightScale=1;runtime.finalFlight=null;runtime.finalSequenceStarted=false;
      setMode('free');updateLearningUI();emitState('debug-skip');playCurrentTarget('debug-skip');
      return true;
    }
    function learningSnapshot(){return {stageIndex:learning.stageIndex,stage:learning.stage,taskId:learning.taskId,taskType:learning.taskType,answerMode:learning.answerMode,audioType:learning.audioType,tasks:[...learning.tasks],taskIndex:learning.taskIndex,stageProgress:learning.stageProgress,totalProgress:learning.totalProgress,journeyProgress:learning.journeyProgress,errors:learning.errors,target:learning.target,word:currentWord()?.word||null,assignment:{...learning.assignment},status:learning.status,parcelState:learning.parcelState,lastOutcome:learning.lastOutcome,lastIslandId:learning.lastIslandId};}
    function emitState(event){options.onState?.({event,state:learningSnapshot()});}
    function beginLearningLanding(zone){
      clearAnswerReactions();
      const result=LearningEngine.land(learning,zone.id);
      if(result.outcome==='ignored')return result;
      answerElement(zone.id)?.classList.add(result.outcome==='correct'?'is-correct':'is-wrong');
      updateLearningUI();
      if(result.outcome==='correct'){clearActivePointer();playCurrentTarget('correct');}
      emitState('answer');
      options.onAnswer?.({...result,state:learningSnapshot()});
      return result;
    }
    function finishStageTransition(){
      const result=LearningEngine.finishTransition(learning);
      if(result.outcome==='ignored')return;
      setMode('free');
      updateLearningUI();
      emitState('stage-start');
      playCurrentTarget('stage-start');
      options.onTask?.({outcome:result.outcome,state:learningSnapshot()});
    }
    function deliverParcel(){
      if(learning.status!=='delivering'||!parcelElement)return false;
      const island=config.islands.find(item=>item.id===learning.lastIslandId);
      if(!island)return false;
      clearActivePointer();
      setMode('delivering');
      const from={x:runtime.x-10,y:runtime.y+42};
      const to={x:island.x+island.width*island.deliveryAnchor.x/100,y:island.y+island.height*island.deliveryAnchor.y/100};
      const ghost=parcelElement.cloneNode(true);
      ghost.hidden=false;ghost.removeAttribute('data-yz-flight-parcel');ghost.className='yz-flight-parcel-delivery';
      const dx=to.x-from.x,dy=to.y-from.y;
      ghost.style.left=`${from.x}px`;ghost.style.top=`${from.y}px`;ghost.style.setProperty('--delivery-x',`${dx}px`);ghost.style.setProperty('--delivery-y',`${dy}px`);ghost.style.setProperty('--delivery-mid-x',`${dx*.48}px`);ghost.style.setProperty('--delivery-mid-y',`${dy*.48-34}px`);ghost.style.setProperty('--delivery-ms',`${education.deliveryDuration}ms`);
      world.appendChild(ghost);deliveryGhosts.add(ghost);
      deliveryAnchorElement(island.id)?.classList.add('is-receiving');
      updateLearningUI();
      timer(()=>{
        ghost.remove();deliveryGhosts.delete(ghost);
        const anchor=deliveryAnchorElement(island.id);anchor?.classList.remove('is-receiving');anchor?.classList.add('is-delivered');
        clearAnswerReactions();
        const result=LearningEngine.finishDelivery(learning);
        options.playSuccess?.({stage:learning.stage,target:learning.target,word:currentWord()?.word||null});
        updateLearningUI();
        emitState('delivered');
        options.onTask?.({outcome:result.outcome,state:learningSnapshot()});
        timer(()=>anchor?.classList.remove('is-delivered'),420);
        respawnPlaneAtStart();
      },education.deliveryDuration);
      return true;
    }
    function finishFinalCelebration(){
      const result=LearningEngine.finishFinalCelebration(learning);
      if(result.outcome==='ignored')return false;
      setMode('complete');
      updateLearningUI();
      emitState('complete');
      options.onComplete?.(learningSnapshot());
      return true;
    }
    function finishFinalFlight(){
      if(learning.status!=='finalFlight'||runtime.mode!=='finalFlight')return false;
      runtime.finalFlight=null;runtime.vx=0;runtime.vy=0;runtime.bank=0;
      const result=LearningEngine.finishFinalFlight(learning);
      if(result.outcome==='ignored')return false;
      setMode('finalCelebration');
      game.classList.remove('is-final-flight');game.classList.add('is-final-celebration');
      updateLearningUI();
      emitState('final-celebration');
      options.playFinal?.();
      options.onFinalCelebration?.({outcome:result.outcome,state:learningSnapshot()});
      timer(finishFinalCelebration,education.finalCelebrationDelay);
      return true;
    }
    function beginFinalFlight(){
      if(learning.status!=='finalFlight'||runtime.finalSequenceStarted)return false;
      runtime.finalSequenceStarted=true;
      clearActivePointer();runtime.assist=null;runtime.vx=0;runtime.vy=0;runtime.bank=0;
      zones.forEach(zone=>{zone.active=false;zone.armed=false;setArrivalEffect(zone.id,false);});
      runtime.finalFlight={elapsed:0,duration:education.finalFlightDuration,startX:runtime.x,startY:runtime.y};
      runtime.flightScale=1;
      setMode('finalFlight');game.classList.add('is-final-flight');
      updateLearningUI();
      emitState('final-flight');
      options.onFinalFlight?.({state:learningSnapshot()});
      return true;
    }
    function respawnPlaneAtStart(){
      if(learning.status!=='respawning')return false;
      clearActivePointer();
      runtime.assist=null;runtime.vx=0;runtime.vy=0;runtime.bank=0;
      zones.forEach(zone=>{zone.armed=false;});
      setMode('respawning');
      plane.classList.add('is-respawning','is-respawn-hidden');
      updateLearningUI();
      timer(()=>{
        RuntimeEngine.resetAtStart(runtime,config,zones);
        runtime.lastTime=performance.now();
        draw(runtime.lastTime);
        plane.classList.remove('is-respawn-hidden');
        timer(()=>{
          plane.classList.remove('is-respawning');
          const result=LearningEngine.finishRespawn(learning,education,random);
          if(result.outcome==='stage-transition'){
            setMode('transitioning');updateLearningUI();
            emitState('stage-transition');
            timer(finishStageTransition,education.stageTransitionDelay);
          }else if(result.outcome==='next'){
            setMode('free');updateLearningUI();emitState('next');playCurrentTarget('next');options.onTask?.({outcome:result.outcome,state:learningSnapshot()});
          }else if(result.outcome==='complete'){
            setMode('complete');updateLearningUI();options.onComplete?.(learningSnapshot());
          }
        },education.respawnFadeIn);
      },education.respawnFadeOut);
      return true;
    }
    function finishLearningLanding(){
      if(learning.status!=='resolving')return;
      timer(()=>{
        const result=LearningEngine.resolveLanding(learning,education);
        if(result.outcome!=='delivery')clearAnswerReactions();
        updateLearningUI();
        emitState(result.outcome);
        if(result.outcome==='delivery'){deliverParcel();return;}
        if(result.outcome==='respawn'){respawnPlaneAtStart();return;}
        if(result.outcome==='final-flight'){clearAnswerReactions();beginFinalFlight();return;}
        if(result.outcome==='retry'){
          if(learning.answerMode==='word'&&typeof options.playRetry==='function')options.playRetry(learning.target,{reason:'retry',stage:learning.stage,audioType:learning.audioType});
          else playCurrentTarget('retry');
        }
        options.onTask?.({outcome:result.outcome,state:learningSnapshot()});
      },education.transitionDelay);
    }

    function resize(){
      if(runtime.destroyed)return;
      const rect=scene.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      runtime.scale=Math.max(rect.width/config.width,rect.height/config.height);
      runtime.offsetX=(rect.width-config.width*runtime.scale)/2;
      runtime.offsetY=(rect.height-config.height*runtime.scale)/2;
      world.style.transform=`translate3d(${runtime.offsetX}px,${runtime.offsetY}px,0) scale(${runtime.scale})`;
      const visibleLeft=-runtime.offsetX/runtime.scale;
      const visibleTop=-runtime.offsetY/runtime.scale;
      const visibleRight=visibleLeft+rect.width/runtime.scale;
      const visibleBottom=visibleTop+rect.height/runtime.scale;
      const half=config.planeSize*.47;
      const sidePad=18/runtime.scale;
      const verticalPad=24/runtime.scale;
      runtime.bounds={
        left:visibleLeft+half+sidePad,
        right:visibleRight-half-sidePad,
        top:Math.max(360,visibleTop+half+verticalPad),
        bottom:Math.min(1515,visibleBottom-half-verticalPad)
      };
      runtime.x=clamp(runtime.x,runtime.bounds.left,runtime.bounds.right);
      runtime.y=clamp(runtime.y,runtime.bounds.top,runtime.bounds.bottom);
      runtime.targetX=clamp(runtime.targetX,runtime.bounds.left,runtime.bounds.right);
      runtime.targetY=clamp(runtime.targetY,runtime.bounds.top,runtime.bounds.bottom);
      if(safeArea){
        safeArea.style.left=`${runtime.bounds.left}px`;
        safeArea.style.top=`${runtime.bounds.top}px`;
        safeArea.style.width=`${Math.max(0,runtime.bounds.right-runtime.bounds.left)}px`;
        safeArea.style.height=`${Math.max(0,runtime.bounds.bottom-runtime.bounds.top)}px`;
      }
      draw(performance.now());
    }

    function eventPoint(event){
      const rect=scene.getBoundingClientRect();
      return {x:(event.clientX-rect.left-runtime.offsetX)/runtime.scale,y:(event.clientY-rect.top-runtime.offsetY)/runtime.scale};
    }
    function setPointerTarget(point){
      runtime.pointerWorld=point;
      if(runtime.mode!=='free'||learning.status!=='playing')return;
      const rect=scene.getBoundingClientRect();
      const offsetCss=clamp(rect.height*config.physics.pointerOffsetHeightRatio,config.physics.pointerOffsetMin,config.physics.pointerOffsetMax);
      runtime.targetX=clamp(point.x,runtime.bounds.left,runtime.bounds.right);
      runtime.targetY=clamp(point.y-offsetCss/runtime.scale,runtime.bounds.top,runtime.bounds.bottom);
    }
    function pointerDown(event){
      if(runtime.pointerId!==null||learning.status!=='playing'||event.target.closest('button')||(event.button!=null&&event.button!==0))return;
      event.preventDefault();
      unlockAndReplayIfNeeded();
      runtime.pointerId=event.pointerId;
      runtime.pointerActive=true;
      try{scene.setPointerCapture?.(event.pointerId);}catch(_){}
      setPointerTarget(eventPoint(event));
    }
    function pointerMove(event){
      if(event.pointerId!==runtime.pointerId)return;
      event.preventDefault();
      setPointerTarget(eventPoint(event));
    }
    function finishPointer(event){
      if(event.pointerId!==runtime.pointerId)return;
      event.preventDefault();
      if(learning.status==='playing')setPointerTarget(eventPoint(event));
      const pointerId=runtime.pointerId;
      runtime.pointerId=null;
      runtime.pointerActive=false;
      releaseCapture(pointerId);
    }
    function cancelPointer(event){
      if(event.pointerId!==runtime.pointerId)return;
      const pointerId=runtime.pointerId;
      runtime.pointerId=null;
      runtime.pointerActive=false;
      releaseCapture(pointerId);
    }

    function beginAssist(zone){
      if(runtime.mode!=='free'||learning.status!=='playing'||!zone.armed)return;
      zone.armed=false;
      setMode('assist');
      runtime.assist={zone,startX:runtime.x,startY:runtime.y,elapsed:0};
      runtime.vx=0;
      runtime.vy=0;
      setArrivalEffect(zone.id,true);
      options.onAssist?.({zone:{...zone}});
      beginLearningLanding(zone);
      try{window.navigator?.vibrate?.(18);}catch(_){}
    }
    function updateZoneLocks(){
      for(const zone of zones){
        if(!zone.active||zone.armed||runtime.assist?.zone.id===zone.id)continue;
        const finalChoiceScale=Object.hasOwn(learning.assignment,'center')&&zone.id!=='center' ? .62 : 1;
        const dx=(runtime.x-zone.x)/(zone.rx*finalChoiceScale*config.physics.rearmScale);
        const dy=(runtime.y-zone.y)/(zone.ry*finalChoiceScale*config.physics.rearmScale);
        if(dx*dx+dy*dy>1)zone.armed=true;
      }
    }
    function detectLanding(){
      if(runtime.mode!=='free'||learning.status!=='playing')return;
      for(const zone of zones){
        if(!zone.active||!zone.armed)continue;
        const finalChoiceScale=Object.hasOwn(learning.assignment,'center')&&zone.id!=='center' ? .62 : 1;
        const dx=(runtime.x-zone.x)/(zone.rx*finalChoiceScale);
        const dy=(runtime.y-zone.y)/(zone.ry*finalChoiceScale);
        if(dx*dx+dy*dy<=1){beginAssist(zone);break;}
      }
    }
    function resumeFreeFlight(){
      const arrived=runtime.assist?.zone;
      if(arrived)setArrivalEffect(arrived.id,false);
      runtime.assist=null;
      runtime.vx=0;
      runtime.vy=0;
      setMode('free');
      if(learning.status==='playing'&&runtime.pointerActive&&runtime.pointerWorld)setPointerTarget(runtime.pointerWorld);
      else{runtime.targetX=runtime.x;runtime.targetY=runtime.y;}
      options.onArrivalComplete?.({zone:arrived?{...arrived}:null});
      finishLearningLanding();
    }
    function updateAssist(dt){
      const assist=runtime.assist;
      if(!assist){resumeFreeFlight();return;}
      assist.elapsed+=dt;
      if(runtime.mode==='assist'){
        const raw=clamp(assist.elapsed/config.physics.assistDuration,0,1);
        const eased=raw<.5?4*raw*raw*raw:1-Math.pow(-2*raw+2,3)/2;
        runtime.x=assist.startX+(assist.zone.x-assist.startX)*eased;
        runtime.y=assist.startY+(assist.zone.y-assist.startY)*eased;
        runtime.bank+=(0-runtime.bank)*(1-Math.exp(-10*dt));
        if(raw>=1){runtime.x=assist.zone.x;runtime.y=assist.zone.y;assist.elapsed=0;setMode('hold');}
      }else if(runtime.mode==='hold'){
        runtime.x=assist.zone.x;
        runtime.y=assist.zone.y;
        runtime.bank+=(0-runtime.bank)*(1-Math.exp(-10*dt));
        if(assist.elapsed>=config.physics.arrivalHold)resumeFreeFlight();
      }
    }
    function updateFree(dt){
      const dx=runtime.targetX-runtime.x;
      const dy=runtime.targetY-runtime.y;
      let ax=dx*config.physics.spring-runtime.vx*config.physics.damping;
      let ay=dy*config.physics.spring-runtime.vy*config.physics.damping;
      const acceleration=Math.hypot(ax,ay);
      if(acceleration>config.physics.maxAcceleration){const factor=config.physics.maxAcceleration/acceleration;ax*=factor;ay*=factor;}
      runtime.vx+=ax*dt;
      runtime.vy+=ay*dt;
      const speed=Math.hypot(runtime.vx,runtime.vy);
      if(speed>config.physics.maxSpeed){const factor=config.physics.maxSpeed/speed;runtime.vx*=factor;runtime.vy*=factor;}
      runtime.x+=runtime.vx*dt;
      runtime.y+=runtime.vy*dt;
      const clampedX=clamp(runtime.x,runtime.bounds.left,runtime.bounds.right);
      const clampedY=clamp(runtime.y,runtime.bounds.top,runtime.bounds.bottom);
      if(clampedX!==runtime.x)runtime.vx*=.18;
      if(clampedY!==runtime.y)runtime.vy*=.18;
      runtime.x=clampedX;
      runtime.y=clampedY;
      const bankTarget=clamp(runtime.vx/config.physics.maxSpeed*config.physics.maxBank,-config.physics.maxBank,config.physics.maxBank);
      runtime.bank+=(bankTarget-runtime.bank)*(1-Math.exp(-config.physics.bankResponse*dt));
      updateZoneLocks();
      detectLanding();
    }
    function updateFinalFlight(dt){
      const flight=runtime.finalFlight;
      if(!flight)return;
      flight.elapsed+=dt*1000;
      const raw=clamp(flight.elapsed/flight.duration,0,1);
      const eased=raw<.5?4*raw*raw*raw:1-Math.pow(-2*raw+2,3)/2;
      runtime.x=flight.startX+(config.width/2-flight.startX)*eased;
      runtime.y=flight.startY+(235-flight.startY)*eased;
      runtime.bank+=(0-runtime.bank)*(1-Math.exp(-9*dt));
      runtime.flightScale=1-eased*.42;
      if(raw>=1)finishFinalFlight();
    }
    function draw(now){
      const speed=Math.hypot(runtime.vx,runtime.vy);
      const bob=runtime.mode==='hold'?Math.sin(now*.014)*1.6:runtime.mode==='free'&&speed<28?Math.sin(now*.0032)*1.35:0;
      plane.style.transform=`translate3d(${runtime.x-config.planeSize/2}px,${runtime.y-config.planeSize/2+bob}px,0) rotate(${runtime.bank}deg) scale(${runtime.flightScale})`;
      if(finalTrailElement){finalTrailElement.style.left=`${runtime.x}px`;finalTrailElement.style.top=`${runtime.y+config.planeSize*.22}px`;}
      if(targetMarker){targetMarker.style.left=`${runtime.targetX}px`;targetMarker.style.top=`${runtime.targetY}px`;}
      updateDebug();
    }
    function frame(now){
      if(runtime.destroyed)return;
      const dt=runtime.lastTime?clamp((now-runtime.lastTime)/1000,0,.04):0;
      runtime.lastTime=now;
      if(runtime.mode==='free')updateFree(dt);
      else if(runtime.mode==='assist'||runtime.mode==='hold')updateAssist(dt);
      else if(runtime.mode==='finalFlight')updateFinalFlight(dt);
      draw(now);
      runtime.raf=requestAnimationFrame(frame);
    }

    listen(scene,'pointerdown',pointerDown,{passive:false});
    listen(scene,'pointermove',pointerMove,{passive:false});
    listen(scene,'pointerup',finishPointer,{passive:false});
    listen(scene,'pointercancel',cancelPointer,{passive:false});
    listen(scene,'lostpointercapture',event=>{if(event.pointerId===runtime.pointerId){runtime.pointerId=null;runtime.pointerActive=false;}});
    listen(scene,'dragstart',event=>event.preventDefault());
    listen(scene,'contextmenu',event=>event.preventDefault());
    listen(window,'resize',resize,{passive:true});
    listen(audioButton,'click',event=>{event.preventDefault();event.stopPropagation();options.onUnlockAudio?.();playCurrentTarget('replay');});
    listen(replayButton,'click',event=>{event.preventDefault();event.stopPropagation();options.onUnlockAudio?.();restartRound();});
    listen(skipFinalButton,'click',event=>{event.preventDefault();event.stopPropagation();options.onUnlockAudio?.();skipToFinalTask();});
    listen(resetSessionButton,'click',event=>{event.preventDefault();event.stopPropagation();options.onUnlockAudio?.();restartRound();});
    let resizeObserver=null;
    if(typeof ResizeObserver==='function'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(scene);}
    updateLearningUI();
    emitState('ready');
    options.onReady?.(learningSnapshot());
    resize();
    runtime.raf=requestAnimationFrame(frame);
    Promise.resolve(playCurrentTarget('start')).then(played=>{if(!played&&!runtime.destroyed)runtime.replayOnFirstGesture=true;});

    return Object.freeze({
      snapshot:()=>({x:runtime.x,y:runtime.y,targetX:runtime.targetX,targetY:runtime.targetY,vx:runtime.vx,vy:runtime.vy,bank:runtime.bank,mode:runtime.mode,scale:runtime.scale,bounds:{...runtime.bounds},zones:zones.map(zone=>({id:zone.id,armed:zone.armed})),learning:learningSnapshot()}),
      setTarget(x,y){runtime.targetX=clamp(Number(x)||0,runtime.bounds.left,runtime.bounds.right);runtime.targetY=clamp(Number(y)||0,runtime.bounds.top,runtime.bounds.bottom);return true;},
      replayAudio(){return playCurrentTarget('api-replay');},
      restart:restartRound,
      skipToFinal:skipToFinalTask,
      destroy(){
        if(runtime.destroyed)return;
        runtime.destroyed=true;
        clearTimers();
        cancelAnimationFrame(runtime.raf);
        runtime.raf=0;
        if(runtime.pointerId!==null)releaseCapture(runtime.pointerId);
        resizeObserver?.disconnect?.();
        listeners.splice(0).forEach(remove=>remove());
        zones.forEach(zone=>setArrivalEffect(zone.id,false));
        clearAnswerReactions();clearDeliveryVisuals();
        game.querySelectorAll('[data-yz-island-letter],[data-yz-island-word],[data-yz-delivery-anchor]').forEach(element=>element.remove());
        parcelElement?.remove();
        game.querySelector('[data-yz-flight-hud]')?.remove();
        stageTransitionElement?.remove();completeElement?.remove();debugElement?.remove();skipFinalButton?.remove();resetSessionButton?.remove();
        game.classList.remove('is-final-flight','is-final-celebration');
        delete game.dataset.learningState;delete game.dataset.stage;delete game.dataset.audioType;delete game.dataset.target;delete game.dataset.targetWord;delete game.dataset.parcelAttached;delete game.dataset.deliveryState;delete game.dataset.taskNumber;delete game.dataset.taskType;delete game.dataset.journeyProgress;delete game.dataset.finalFlight;delete game.dataset.finalCelebration;delete game.dataset.errors;delete game.dataset.progress;
        options.onDestroy?.();
      }
    });
  }

  return Object.freeze({WIDTH,HEIGHT,ASSETS,PHYSICS,MARIUS,EDUCATION,FINAL_PLATFORM,FINAL_LANDING_ZONE,LearningEngine,RuntimeEngine,CONFIG,render,mount});
})();

if(typeof module!=='undefined'&&module.exports)module.exports=FlightYZGame;
