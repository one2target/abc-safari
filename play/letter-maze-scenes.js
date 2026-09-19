'use strict';
/* Authored against the supplied 941×1672 portrait scene. Coordinates are
   percentages of the untouched image, so one config works at every size. */
const LETTER_MAZE_SCENES=(()=>{
  const cells=[
    ['start',11.8,28.5,['p01']],
    // Label offsets are percentage points in the source PNG. They affect
    // only the visual label layer; hit testing and Marius use x/y unchanged.
    ['p01',23.4,28.8,['start','p02','dead01'],0.3,0.05],
    ['p02',33.1,28.8,['p01','p03']],
    ['p03',42.8,28.8,['p02','p04']],
    ['p04',52.4,28.8,['p03','p05']],
    ['p05',62.1,28.8,['p04','p06']],
    ['p06',71.9,28.8,['p05','p07'],-0.6,0],
    ['p07',71.9,33.0,['p06','p08']],
    ['p08',71.9,37.2,['p07','p09'],0.35,-0.2],
    ['p09',82.0,37.2,['p08','p10']],
    ['p10',82.0,41.5,['p09','p11']],
    ['p11',82.0,45.7,['p10','p12'],2.15,0.8],
    ['p12',72.3,45.7,['p11','p13']],
    ['p13',62.0,45.7,['p12','p14'],0.65,1.3],
    ['p14',62.0,50.2,['p13','p15']],
    ['p15',62.0,55.6,['p14','p16'],0.5,-0.15],
    ['p16',52.2,55.6,['p15','p17']],
    ['p17',42.5,55.6,['p16','p18']],
    ['p18',32.4,55.6,['p17','p19']],
    ['p19',20.0,55.6,['p18','p20'],-0.7,-0.2],
    ['p20',19.1,60.2,['p19','p21']],
    ['p21',19.1,64.8,['p20','p22'],-0.7,1.0],
    ['p22',29.5,64.8,['p21','p23']],
    ['p23',40.0,64.8,['p22','p24']],
    ['p24',50.5,64.8,['p23','p25'],2.35,1.25],
    ['p25',50.5,70.8,['p24','p26'],2.55,0],
    ['p26',61.0,70.8,['p25','finish']],
    ['finish',72.0,70.8,['p26'],3.1,-0.05],
    ['dead01',23.4,33.0,['p01','dead02'],0.05,-0.25],
    ['dead02',23.4,37.2,['dead01']],
    ['island01',42.8,37.2,['island02','island03']],
    ['island02',52.4,37.2,['island01']],
    ['island03',42.8,41.5,['island01','island04']],
    ['island04',42.8,45.7,['island03','island05']],
    ['island05',32.4,45.7,['island04','island06']],
    ['island06',22.0,45.7,['island05']]
  ].map(([id,x,y,neighbors,labelOffsetX=0,labelOffsetY=0])=>{
    const cell={id,x,y,neighbors:Object.freeze(neighbors)};
    if(labelOffsetX||labelOffsetY){cell.labelOffsetX=labelOffsetX;cell.labelOffsetY=labelOffsetY;}
    return Object.freeze(cell);
  });
  const mainPath=Object.freeze(['start',...Array.from({length:26},(_,index)=>`p${String(index+1).padStart(2,'0')}`),'finish']);
  const playable=cells.filter(cell=>cell.id!=='start').map(cell=>cell.id);
  const round=(id,targetLetter,instruction,checkpoints,wrongLetter)=>{
    const letters=Object.fromEntries(playable.map(cellId=>[cellId,'']));
    checkpoints.forEach(cellId=>{letters[cellId]=targetLetter;});
    // p01 is the authored fork: the route continues through p02 while dead01
    // is the visible wrong choice. Other stones stay quiet and uncluttered.
    letters.dead01=wrongLetter;
    return Object.freeze({id,targetLetter,instruction,letters:Object.freeze(letters),path:mainPath});
  };
  const background=MEDIA_ASSETS.images.marius_letter_maze_def;
  return Object.freeze({
    campDEF:Object.freeze({
      id:'marius-camp-def',
      title:'Marius Quest',
      background:Object.freeze({...background}),
      backgroundAlt:'A portrait forest path from a cottage to a campsite, made from pale stone tiles.',
      sceneAriaLabel:'Letter maze from the green arrow to the campsite',
      maxWidth:470,
      hitArea:Object.freeze({x:7,y:3.5}),
      cells:Object.freeze(cells),
      startCell:'start',
      finishCell:'finish',
      rounds:Object.freeze([
        // Keep the authored fork and each major bend visible; long straights
        // between those decision points remain intentionally empty.
        round('follow-d','D','Help Marius get to the camp! Follow only D.',['p01','p06','p08','p11','p13','p15','p19','p21','p24','p25','finish'],'E'),
        round('follow-e','E','Follow only E.',['p01','p06','p08','p11','p13','p15','p19','p21','p24','p25','finish'],'F'),
        round('follow-f','F','Follow only F.',['p01','p06','p08','p11','p13','p15','p19','p21','p24','p25','finish'],'D')
      ]),
      copy:Object.freeze({
        ready:'Tap the next stone.',
        wrongLetter:'Try another letter.',
        notAdjacent:'Choose the next stone beside Marius.',
        roundComplete:'Great! The next path is ready.',
        nextRound:'Next round',
        completeTitle:'Marius reached the camp!',
        completeMessage:'D, E and F led the way.',
        continueLabel:'Get your reward'
      })
    })
  });
})();
