'use strict';
/* Each D/E/F round is authored against its own untouched 941×1672 image.
   All coordinates are percentages, so backgrounds, checkpoints and Marius
   keep the same geometry on phones and desktop screens. */
const LETTER_MAZE_SCENES=(()=>{
  const freezeAsset=asset=>Object.freeze({...asset});
  const point=(id,x,y)=>Object.freeze([id,x,y]);
  const makeCells=(points,path,extraLinks=[])=>{
    const neighbors=new Map(points.map(([id])=>[id,new Set()]));
    const connect=(from,to)=>{
      if(!neighbors.has(from)||!neighbors.has(to))throw new TypeError(`Unknown maze link ${from}/${to}`);
      neighbors.get(from).add(to);neighbors.get(to).add(from);
    };
    for(let index=1;index<path.length;index++)connect(path[index-1],path[index]);
    extraLinks.forEach(([from,to])=>connect(from,to));
    return Object.freeze(points.map(([id,x,y])=>Object.freeze({id,x,y,neighbors:Object.freeze([...neighbors.get(id)])})));
  };
  const letter=(value,audioKey,spoken)=>Object.freeze({type:'letter',value,audioKey,spoken});
  const word=(value,icon,audioKey)=>Object.freeze({type:'word',value,icon,audioKey,spoken:value});
  const checkpoints=entries=>Object.freeze(Object.fromEntries(entries));
  const makeRound=({id,targetLetter,targetWord,instruction,background,backgroundAlt,sceneAriaLabel,points,path,links,checkpointEntries})=>{
    const cells=makeCells(points,path,links);
    return Object.freeze({
      id,targetLetter,targetWord,instruction,
      background:freezeAsset(background),backgroundAlt,sceneAriaLabel,
      hitArea:Object.freeze({x:7,y:3.5}),cells,startCell:'start',finishCell:'finish',
      path:Object.freeze(path),checkpoints:checkpoints(checkpointEntries)
    });
  };

  const dPath=Object.freeze(['start',...Array.from({length:26},(_,index)=>`d${String(index+1).padStart(2,'0')}`),'finish']);
  const dPoints=[
    point('start',11.8,28.1),point('d01',23.8,28.7),point('d02',33.0,28.7),point('d03',42.5,28.7),
    point('d04',52.2,28.7),point('d05',61.7,28.7),point('d06',71.2,28.7),point('d07',71.6,32.7),
    point('d08',72.2,36.9),point('d09',82.4,37.1),point('d10',83.3,41.6),point('d11',84.0,46.5),
    point('d12',73.1,46.9),point('d13',62.6,47.0),point('d14',62.5,51.0),point('d15',62.4,55.4),
    point('d16',51.6,55.6),point('d17',40.7,55.6),point('d18',30.0,55.5),point('d19',19.3,55.3),
    point('d20',18.8,60.5),point('d21',18.3,65.7),point('d22',29.8,65.9),point('d23',41.4,66.0),
    point('d24',52.7,66.0),point('d25',53.0,70.7),point('d26',64.0,70.8),point('finish',75.0,70.7),
    point('d-wrong',23.5,32.7)
  ];
  const roundD=makeRound({
    id:'follow-d',targetLetter:'D',targetWord:'Dog',
    instruction:'Иди по D и картинкам Dog.',background:MEDIA_ASSETS.images.maze_d,
    backgroundAlt:'Лесной лабиринт D из светлых камней от зелёной стрелки к палатке.',
    sceneAriaLabel:'Лабиринт D от зелёной стрелки к палатке',points:dPoints,path:dPath,links:[['d01','d-wrong']],
    checkpointEntries:[
      ['d01',letter('D','d_name','dee')],['d06',word('Dog',MEDIA_ASSETS.images.maze_dog.src,'dog')],
      ['d08',letter('D','d_name','dee')],['d11',word('Dog',MEDIA_ASSETS.images.maze_dog.src,'dog')],
      ['d13',letter('D','d_name','dee')],['d15',word('Dog',MEDIA_ASSETS.images.maze_dog.src,'dog')],
      ['d19',letter('D','d_name','dee')],['d21',word('Dog',MEDIA_ASSETS.images.maze_dog.src,'dog')],
      ['d24',letter('D','d_name','dee')],['d25',word('Dog',MEDIA_ASSETS.images.maze_dog.src,'dog')],
      ['finish',letter('D','d_name','dee')],['d-wrong',letter('E','e_name','ee')]
    ]
  });

  const ePath=Object.freeze(['start',...Array.from({length:26},(_,index)=>`e${String(index+1).padStart(2,'0')}`),'finish']);
  const ePoints=[
    point('start',11.9,28.1),point('e01',23.8,28.8),point('e02',33.2,28.7),point('e03',42.6,28.7),
    point('e04',52.3,28.7),point('e05',61.7,28.7),point('e06',61.9,32.7),point('e07',62.0,36.9),
    point('e08',72.2,37.0),point('e09',82.4,37.1),point('e10',82.8,41.2),point('e11',83.3,45.4),
    point('e12',83.4,49.8),point('e13',83.6,54.1),point('e14',73.1,54.3),point('e15',62.6,54.1),
    point('e16',62.6,49.7),point('e17',62.6,45.2),point('e18',52.5,45.2),point('e19',42.3,45.3),
    point('e20',31.4,45.5),point('e21',20.6,45.6),point('e22',19.9,50.0),point('e23',19.8,54.7),
    point('e24',19.7,59.4),point('e25',19.5,64.1),point('e26',19.3,68.9),point('finish',30.4,69.1),
    point('e-wrong',42.6,41.1)
  ];
  const roundE=makeRound({
    id:'follow-e',targetLetter:'E',targetWord:'Egg',
    instruction:'Иди по E и картинкам Egg.',background:MEDIA_ASSETS.images.maze_e,
    backgroundAlt:'Лесной лабиринт E из светлых камней от зелёной стрелки до конца дорожки.',
    sceneAriaLabel:'Лабиринт E по непрерывной дорожке из камней',points:ePoints,path:ePath,links:[['e19','e-wrong']],
    checkpointEntries:[
      ['e01',letter('E','e_name','ee')],['e05',word('Egg',MEDIA_ASSETS.images.maze_egg.src,'egg')],
      ['e07',letter('E','e_name','ee')],['e09',word('Egg',MEDIA_ASSETS.images.maze_egg.src,'egg')],
      ['e11',letter('E','e_name','ee')],['e13',word('Egg',MEDIA_ASSETS.images.maze_egg.src,'egg')],
      ['e15',letter('E','e_name','ee')],['e17',word('Egg',MEDIA_ASSETS.images.maze_egg.src,'egg')],
      ['e19',letter('E','e_name','ee')],['e21',word('Egg',MEDIA_ASSETS.images.maze_egg.src,'egg')],
      ['e24',letter('E','e_name','ee')],['finish',word('Egg',MEDIA_ASSETS.images.maze_egg.src,'egg')],
      ['e-wrong',letter('F','f_name','ef')]
    ]
  });

  const fPath=Object.freeze(['start',...Array.from({length:19},(_,index)=>`f${String(index+1).padStart(2,'0')}`),'finish']);
  const fPoints=[
    point('start',11.9,28.0),point('f01',23.8,28.7),point('f02',33.1,28.7),point('f03',42.5,28.7),
    point('f04',52.2,28.7),point('f05',61.8,28.7),point('f06',71.2,28.7),point('f07',71.6,32.7),
    point('f08',72.2,36.9),point('f09',82.4,37.0),point('f10',83.2,41.4),point('f11',83.7,45.8),
    point('f12',84.3,50.1),point('f13',84.8,54.6),point('f14',74.2,54.6),point('f15',63.5,54.6),
    point('f16',63.7,58.9),point('f17',64.0,63.3),point('f18',74.5,63.2),point('f19',75.0,67.9),
    point('finish',75.3,72.7),point('f-wrong',52.8,54.7)
  ];
  const roundF=makeRound({
    id:'follow-f',targetLetter:'F',targetWord:'Fish',
    instruction:'Иди по F и картинкам Fish.',background:MEDIA_ASSETS.images.maze_f,
    backgroundAlt:'Лесной лабиринт F из светлых камней от зелёной стрелки к палатке.',
    sceneAriaLabel:'Лабиринт F от зелёной стрелки к палатке',points:fPoints,path:fPath,links:[['f15','f-wrong']],
    checkpointEntries:[
      ['f01',letter('F','f_name','ef')],['f06',word('Fish',MEDIA_ASSETS.images.maze_fish.src,'fish')],
      ['f08',letter('F','f_name','ef')],['f10',word('Fish',MEDIA_ASSETS.images.maze_fish.src,'fish')],
      ['f12',letter('F','f_name','ef')],['f14',word('Fish',MEDIA_ASSETS.images.maze_fish.src,'fish')],
      ['f15',letter('F','f_name','ef')],['f17',word('Fish',MEDIA_ASSETS.images.maze_fish.src,'fish')],
      ['f19',letter('F','f_name','ef')],['finish',word('Fish',MEDIA_ASSETS.images.maze_fish.src,'fish')],
      ['f-wrong',letter('D','d_name','dee')]
    ]
  });

  return Object.freeze({
    campDEF:Object.freeze({
      id:'marius-camp-def',title:'Лабиринт букв',maxWidth:470,
      // First-round aliases keep older consumers and saved-game adapters valid.
      background:roundD.background,backgroundAlt:roundD.backgroundAlt,sceneAriaLabel:roundD.sceneAriaLabel,
      hitArea:roundD.hitArea,cells:roundD.cells,startCell:roundD.startCell,finishCell:roundD.finishCell,
      rounds:Object.freeze([roundD,roundE,roundF]),
      copy:Object.freeze({
        ready:'Нажимай буквы и картинки по порядку.',
        wrongCheckpoint:'Попробуй другую точку.',
        notAdjacent:'Выбери следующую точку на дорожке.',
        roundComplete:'Отлично! Следующий лабиринт готов.',
        nextRound:'Следующий уровень',
        completeTitle:'Мариус добрался до лагеря!',
        completeMessage:'D, E и F показали дорогу.',
        continueLabel:'Получить награду'
      })
    })
  });
})();
