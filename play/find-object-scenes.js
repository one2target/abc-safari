'use strict';
/* Scene data only. Hotspots are percentages of the complete source image,
   measured from its top-left corner. Array order is the stable render order. */
const FIND_OBJECT_SCENES = Object.freeze({
  mariusRoomABC: Object.freeze({
    id:'marius-room-abc',
    title:'Комната Мариуса',
    image:MEDIA_ASSETS.images.marius_room_abc,
    imageAlt:'Комната Мариуса со шкафом, кроватью и письменным столом',
    sceneAriaLabel:'Предметы в комнате Мариуса',
    maxWidth:560,
    objects:[
      {id:'letterA',label:'Letter A',audio:'a_name',hotspot:{x:56,y:11,width:12,height:10}},
      {id:'letterB',label:'Letter B',audio:'b_name',hotspot:{x:68,y:24,width:11.5,height:10}},
      {id:'letterC',label:'Letter C',audio:'c_name',hotspot:{x:61.5,y:37,width:12.5,height:11}},
      {id:'apple',label:'Apple',audio:'apple',hotspot:{x:81.5,y:44,width:10,height:8}},
      {id:'ball',label:'Soccer ball',audio:'ball',hotspot:{x:65,y:73.5,width:18,height:15}},
      {id:'cat',label:'Cat',audio:'cat',hotspot:{x:.5,y:39,width:17.5,height:17}}
    ],
    rounds:[
      {id:'a',letter:'A',targets:['letterA','apple'],instruction:'Найди A и apple!'},
      {id:'b',letter:'B',targets:['letterB','ball'],instruction:'Найди B и ball!'},
      {id:'c',letter:'C',targets:['letterC','cat'],instruction:'Найди C и cat!'}
    ],
    copy:{
      foundLabel:'Найдено',
      ready:'Нажимай на предметы в комнате.',
      retry:'Посмотри внимательно. Попробуй ещё!',
      correct:'Здорово! Найди ещё один предмет.',
      roundComplete:'Отлично! Оба найдены.',
      loadError:'Комната не загрузилась.',
      reload:'Попробовать ещё',
      next:'Дальше',
      repeat:'Послушать'
    },
    completion:{
      eyebrow:'Комната Мариуса · 3 / 3',
      title:'Отличная работа!',
      badge:'A • B • C',
      message:'Найдено: 2 / 2. Ты нашёл всех!',
      continueLabel:'Продолжить',
      replayLabel:'Сыграть ещё раз'
    }
  })
});
