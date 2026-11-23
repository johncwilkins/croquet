import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {heldPower,accuracyPosition,timingError,contactAngle,ACCURACY_MS,canStartPull} from '../dist/timed-swing.js';
import {pullPower} from '../dist/shot-control.js';
import {VariantMatch} from '../dist/variants.js';
assert.equal(heldPower(1300),.5);assert.equal(heldPower(6000),1);
assert.equal(accuracyPosition(600),0);assert.equal(timingError(.055),0);
assert.equal(timingError(-.055),0);assert(timingError(-.9)<0);assert(timingError(.9)>0);
assert(Math.abs(timingError(1))<.105);
const elements=new Map();const $=id=>{if(!elements.has(id))elements.set(id,{textContent:'',open:false,classList:{add(){},remove(){}},style:{setProperty(key,value){this[key]=value}},getAttribute:()=> 'false'});return elements.get(id)};
const source=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
const scope=vm.createContext({$,desktopShot:true,practiceSetup:null,practiceAim:null,pullPower,heldPower,accuracyPosition,timingError,phase:'aim',human:()=>true,placing:false,swingStage:'idle',meterStart:0,spaceStart:0,lastTiming:null,drag:null,power:0,angle:0,shots:[],setPower(p){scope.power=p},strike(a,p,j){scope.shots.push({a,p,j})}});
vm.runInContext(source.slice(source.indexOf('function resetMeter'),source.indexOf('function updatePlacementUI')),scope);
vm.runInContext('startMeter(100);releaseMeter(1400)',scope);assert.equal(scope.power,.5);assert.equal(scope.swingStage,'accuracy');assert.equal(scope.shots.length,0,'release must not strike');
vm.runInContext('startMeter(2000);releaseMeter(2050)',scope);assert.equal(scope.shots.length,1);assert.equal(scope.shots[0].a,0,'center timing is straight');assert.equal(scope.shots[0].p,.5);assert.equal(scope.swingStage,'idle');
scope.placing=true;vm.runInContext('startMeter(3000)',scope);assert.equal(scope.swingStage,'idle','cannot swing during placement');scope.placing=false;
vm.runInContext('startMeter(3000);cancelMeter();releaseMeter(3400)',scope);assert.equal(scope.shots.length,1,'cancelled gesture must not strike');
vm.runInContext('startMeter(4000);releaseMeter(5300);finishMeter(6900)',scope);assert.equal(scope.shots.length,2,'missed timing window gives a bounded mishit');
// Pull power is positional: holding still never increases it, and backing off reduces it.
vm.runInContext("startMeter(7000,{x:500,y:200,desktop:true,power:0,previous:0,pointerId:1})",scope);
assert.equal(scope.power,0);
const pull=source.slice(source.indexOf('function updatePull('),source.indexOf("$('pad').addEventListener('pointermove',updatePull)"));vm.runInContext(pull,scope);
scope.event={pointerId:1,clientX:340,clientY:200};vm.runInContext('updatePull(event)',scope);assert.equal(scope.power,.5);
scope.event.clientX=372;vm.runInContext('updatePull(event)',scope);assert.equal(scope.power,.4);
vm.runInContext('releaseMeter(12000)',scope);assert.equal(scope.power,.4,'release preserves drag power regardless of held time');assert.equal(scope.swingStage,'accuracy');vm.runInContext('finishMeter(12600)',scope);assert.equal(scope.shots.at(-1).p,.4);
vm.runInContext("startMeter(13000,{x:500,y:200,desktop:true,power:0,previous:0,pointerId:1});releaseMeter(17000)",scope);assert.equal(scope.swingStage,'idle','no-pull release cancels');
const balls=Array.from({length:4},(_,i)=>({x:i*2,z:0,entered:true,side:i%2,progress:0,finished:false}));const match=new VariantMatch('association',balls,2);match.croquetTarget=1;
for(const point of [{x:3,z:0},{x:1,z:0},{x:2,z:1},{x:2,z:-1}]){match.placeCroquet(contactAngle(balls[1],point));assert(Math.abs(Math.hypot(balls[0].x-balls[1].x,balls[0].z-balls[1].z)-.28001)<1e-9);assert((balls[0].x-balls[1].x)*(point.x-balls[1].x)+(balls[0].z-balls[1].z)*(point.z-balls[1].z)>0)}
assert(source.includes("line.visible=mallet.visible=!placing"));
console.log('PASS: timed power, center band, early/late error, release then tap, no double strike, cancellation, placement swing guard, and four-sided contact placement');

assert(!canStartPull(160,{left:0,right:320,width:320},true),'middle cannot start a pull');assert(canStartPull(280,{left:0,right:320,width:320},true));assert(canStartPull(30,{left:0,right:320,width:320},false),'touch keeps downward pulls');
assert.equal(pullPower({x:280,y:200,desktop:true,pullPixels:268,power:0,previous:0},{clientX:12,clientY:200}),1,'full power fits inside the pad');
assert(timingError(.14)>0,'old center margin now produces a mishit');assert.equal(ACCURACY_MS,1200);
const capture=source.slice(source.indexOf('function centerFromAnywhere('),source.indexOf("document.addEventListener('pointerdown',centerFromAnywhere"));
scope.performance={now:()=>20600};scope.accuracyClickUntil=0;vm.runInContext(capture,scope);
vm.runInContext('startMeter(18700);releaseMeter(20000)',scope);
let prevented=false,stopped=false;scope.event={button:0,target:{id:'aim'},preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true}};
const count=scope.shots.length;vm.runInContext('centerFromAnywhere(event)',scope);assert(prevented&&stopped);assert.equal(scope.shots.length,count+1,'click on Fine Aim still strikes');assert.equal(scope.shots.at(-1).a,0);assert.equal(scope.accuracyClickUntil,21300);
vm.runInContext('centerFromAnywhere(event)',scope);assert.equal(scope.shots.length,count+1,'second event cannot double-strike');
// Camera choices read placement state without changing ball coordinates.
const cameraCode=source.slice(source.indexOf("if(mouseOrbit||(!placing&&view==='shotview')){"),source.indexOf('if(mouseOrbit||!camInit)'));
const targetBall={x:4,z:7};const camScope=vm.createContext({mouseOrbit:null,placing:true,placementView:'close',placementYaw:0,placementZoom:4.5,match:{croquetTarget:0},balls:[targetBall],camGoal:{set(...v){this.xyz=v}},lookGoal:{set(...v){this.xyz=v}},innerWidth:1200,view:'wide'});
vm.runInContext(cameraCode,camScope);assert.deepEqual(Array.from(camScope.lookGoal.xyz),[4,0,7]);const close=Array.from(camScope.camGoal.xyz);
camScope.placementYaw=Math.PI/2;vm.runInContext(cameraCode,camScope);assert(camScope.camGoal.xyz[0]>close[0],'orbit rotates viewpoint');camScope.placementZoom=12;vm.runInContext(cameraCode,camScope);assert.equal(camScope.camGoal.xyz[1],12);
camScope.placementView='overhead';vm.runInContext(cameraCode,camScope);assert.equal(camScope.camGoal.xyz[1],54);camScope.placementView='wide';vm.runInContext(cameraCode,camScope);assert.equal(camScope.camGoal.xyz[0],36);assert.deepEqual(targetBall,{x:4,z:7});
console.log('PASS: smaller/faster center window, start zone, in-pad full power, capture over Fine Aim, single strike, and placement close/orbit/zoom/court/overhead without moving balls');


const listeners={};
let captured=null;
const canvas={
  addEventListener:(name, callback)=>{listeners[name]=callback},
  setPointerCapture:id=>{captured=id},
  hasPointerCapture:id=>captured===id,
  releasePointerCapture:()=>{captured=null}
};
let aimChanges=0;
const orbitScope=vm.createContext({
  renderer:{domElement:canvas}, window:{addEventListener(){}}, document:{addEventListener(){}},
  phase:'aim', human:()=>true, swingStage:'idle', placing:false, view:'shotview',
  shotCameraAngle:.2, shotDistance:9, shotHeight:'classic', shotPullback:0, camInit:true, placementPointer:null, b:{x:1,z:2},
  aimAt:()=>{aimChanges++}, THREE:{MathUtils:{clamp:(x,min,max)=>Math.min(max,Math.max(min,x))}},
  camGoal:{set(...value){this.xyz=value}},lookGoal:{set(...value){this.xyz=value}}
});
vm.runInContext(source.slice(source.indexOf('let mouseOrbit=null'),source.indexOf("$('aim').oninput")),orbitScope);
const goals=()=>{
  vm.runInContext(cameraCode,orbitScope);
  return [orbitScope.camGoal.xyz,orbitScope.lookGoal.xyz];
};
const original=goals();
listeners.pointerdown({button:1,pointerId:1,clientX:0,clientY:0,preventDefault(){}});
assert.equal(captured,1);
listeners.pointermove({buttons:4,pointerId:1,clientX:100,clientY:-50});
assert.notDeepEqual(goals(),original);
assert.equal(aimChanges,0);
listeners.pointerup({pointerId:1});
assert.equal(captured,null);
assert.equal(orbitScope.camInit,false);
assert.deepEqual(goals(),original);
assert.equal(orbitScope.shotCameraAngle,.2);
console.log('PASS: middle mouse drag orbits and release restores the shot camera without changing aim');

assert.equal(original[0][1],6.5);
orbitScope.shotHeight='low';
const lowView=goals();
assert.equal(lowView[0][1],2.55);
orbitScope.phase='moving';
orbitScope.shotPullback=.5;
assert.equal(goals()[0][1],(2.55+6.5)/2);
orbitScope.shotPullback=1;
assert.deepEqual(goals(),original);
orbitScope.phase='aim';
assert.deepEqual(goals(),lowView);
listeners.pointerdown({button:1,pointerId:1,clientX:0,clientY:0,preventDefault(){}});
listeners.pointermove({buttons:4,pointerId:1,clientX:100,clientY:-50});
assert.notDeepEqual(goals(),lowView);
listeners.pointerup({pointerId:1});
assert.deepEqual(goals(),lowView);

for(const [tap,label,position] of [[450,'Early','12.5%'],[750,'Late','-12.5%']]){
  vm.runInContext(`startMeter(0);releaseMeter(1300);finishMeter(${1300+tap});cancelMeter()`,scope);
  assert.equal($('swingfeedback').textContent,label);
  assert.equal($('pad').style['--drift'],position);
}
vm.runInContext('startMeter(0)',scope);
assert.equal($('pad').style['--drift'],'0%');
