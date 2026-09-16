const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const context=vm.createContext({});
vm.runInContext(`${fs.readFileSync(path.join(root,'play/hidden-object-game.js'),'utf8')}\nglobalThis.engine=HiddenObjectGame;`,context);
const engine=context.engine;

const first={
 id:'fixture-garden',title:'Garden',image:{src:'garden.png',width:800,height:400},imageAlt:'A garden',sceneAriaLabel:'Garden objects',
 objects:[
  {id:'apple',label:'Apple',hotspot:{x:10,y:20,width:10,height:20}},
  {id:'ball',label:'Ball',hotspot:{x:60,y:50,width:20,height:25}}
 ],
 rounds:[
  {id:'fruit',targets:['apple'],instruction:'Find the apple'},
  {id:'toy',targets:['ball'],instruction:'Find the ball'}
 ]
};
// A deliberately different image, object set and coordinate set: no engine copy.
const second={
 id:'fixture-park',title:'Park',image:{src:'park.png',width:400,height:300},imageAlt:'A park',sceneAriaLabel:'Park objects',
 objects:[
  {id:'kite',label:'Kite',hotspot:{x:10,y:5,width:30,height:25}},
  {id:'bench',label:'Bench',hotspot:{x:55,y:65,width:35,height:25}}
 ],
 rounds:[{id:'outdoors',targets:['kite'],instruction:'Find the kite'}],
 copy:{foundLabel:'Found',ready:'Look around',next:'Next'},
 completion:{title:'Park complete',message:'The kite is found',continueLabel:'Continue',replayLabel:'Again'}
};

assert.equal(engine.validate(first),true);
assert.equal(engine.validate(second),true);
const firstState=engine.initialState(first),secondState=engine.initialState(second);
assert.equal(firstState.gameId,'fixture-garden');
assert.equal(secondState.gameId,'fixture-park');
assert.equal(engine.remaining(first,firstState),1);
assert.equal(engine.choose(first,firstState,'ball'),'retry');
assert.equal(engine.choose(first,firstState,null),'retry');
assert.equal(engine.choose(first,firstState,'bench'),'retry');
assert.equal(engine.hint(first,firstState),'apple');
assert.equal(engine.choose(first,firstState,'apple'),'round-complete');
assert.equal(engine.choose(first,firstState,'apple'),'ignored');
assert.equal(engine.next(first,firstState),true);
assert.equal(engine.choose(first,firstState,'ball'),'game-complete');
assert.equal(firstState.gameCompleted,true);

// A state is bound to its config ID, so another game cannot inherit progress.
assert.equal(engine.choose(second,firstState,'kite'),'ignored');
const isolated=engine.restore(second,firstState);
assert.deepEqual(JSON.parse(JSON.stringify(isolated)),JSON.parse(JSON.stringify(secondState)));
assert.equal(engine.remaining(second,isolated),1);

const activeHTML=engine.render(second,isolated);
assert.ok(activeHTML.includes('park.png'));
assert.ok(activeHTML.includes('data-object="kite"'));
assert.ok(activeHTML.includes('left:25%'));
assert.ok(activeHTML.includes('top:17.5%'));
assert.ok(!activeHTML.includes('garden.png'));
assert.equal(engine.choose(second,isolated,'kite'),'game-complete');
const completeHTML=engine.render(second,isolated,{completionVisual:'<i>fixture</i>'});
assert.ok(completeHTML.includes('Park complete'));
assert.ok(completeHTML.includes('find-object-continue'));
assert.ok(completeHTML.includes('<i>fixture</i>'));

assert.throws(()=>engine.validate({...second,objects:[...second.objects,second.objects[0]]}),/duplicate object id/);
assert.throws(()=>engine.validate({...second,objects:[{id:'bad',label:'Bad',hotspot:{x:95,y:0,width:10,height:10}}]}),/Invalid hotspot/);

console.log(JSON.stringify({
 passed:true,
 independentConfigs:2,
 independentState:true,
 stableIds:true,
 relativeHotspots:true,
 counterAndRemaining:true,
 completionSignal:true
},null,2));
