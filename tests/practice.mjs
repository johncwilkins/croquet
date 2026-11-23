import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {OffsideRule} from '../dist/offside.js';
import * as flight from '../dist/flight.js';
import {beginHoopStroke, hoopWinner, trackHoopSegment, resetHoopProgress} from '../dist/scoring.js';
import {heldPower, accuracyPosition, timingError} from '../dist/timed-swing.js';
import {SIX, GOLF_ROUTE} from '../dist/variants.js';

const source=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
const elements=new Map();
function $(id){
  if(!elements.has(id))elements.set(id,{
    open:false,
    close(){this.open=false},
    showModal(){this.open=true},
    focus(){},
    addEventListener(){},
    setAttribute(){},
    querySelector(){return {}},
    click(){},
    classList:{add(){},remove(){}},
    style:{setProperty(){}},
    getAttribute(){return "false"}
  });
  return elements.get(id);
}
const balls=Array.from({length:4},()=>({}));
const hoop=GOLF_ROUTE[0], [x,z]=SIX[hoop.h];
const scope=vm.createContext({
  $, balls, ...flight, F:2.2, phase:'setup', scores:[0,0], practiceSetup:null,
  match:null, lastTiming:null, practiceAim:null, practicePower:0,
  swingStage:'idle', human:()=>true, placing:false,
  performance:{now:()=>7000}, heldPower, accuracyPosition, shotHeight:'classic', desktopShot:true, controllerConnected:false,
  controllerFields:[['gpvariant','variant'],['gpplayers','players']],
  controllerMenus:{clear(){}},
  document:{body:{dataset:{},classList:{add(){},remove(){}}}},
  closeControllerMenu(){ $('controllerdialog').close() },
  openControllerMenu(){ $('gpvariant').value='golf';$('controllerdialog').showModal() },
  controllerFieldState(){},
  target:()=>hoop, coords:({h})=>SIX[h], current:()=>balls[0],
  scoringHoop:()=>({x,z,key:0,direction:hoop.d}),
  hoopPos:SIX, posts:SIX.flatMap(([x,z])=>[-.33,.33].map(offset=>({x:x+offset,z,r:.045}))),
  onCourt:ball=>ball.entered, trackHoopSegment, hoopWinner, timingError, beep(){},
  THREE:{MathUtils:{clamp:(n,min,max)=>Math.max(min,Math.min(max,n))}},
  guideAim(){scope.angle=Math.PI},
  setPower(value){scope.power=value},
  strike(...args){scope.struck=args},
  reset(startMatch){
    assert.equal(startMatch,false,'practice cannot start the opening procedure');
    scope.phase='setup';
    scope.swingStage='idle';
    scope.lastTiming=null;
    scope.offsideRule=new OffsideRule();
    for(const ball of balls){
      Object.assign(ball,{x:13.35,z:16.85,y:flight.R,vx:0,vz:0,vy:0,entered:false});
      resetHoopProgress(ball);
    }
  }
});
vm.runInContext(source.slice(source.indexOf('function resetMeter'),source.indexOf('function updateBallTargets')),scope);
vm.runInContext(source.slice(source.indexOf('function grassInfluence'),source.indexOf('let offsideRule')),scope);
vm.runInContext(source.slice(source.indexOf('function updatePracticeCue'),source.indexOf('const controllerFields=')),scope);

$('gpvariant').value='association';
$('gpplayers').value='4';
$('gpaccuracy').value='amateur';
$('gpshotheight').value='low';
$('gppractice').onclick();
assert.equal(scope.phase,'aim');
assert.equal(balls.filter(ball=>ball.entered).length,1);
assert.equal(balls[0].z,z+3);
assert.equal(scope.angle,Math.PI+.15);
assert.equal($('practicecue').hidden,false);
scope.updatePracticeCue();
assert.equal(scope.document.body.dataset.practiceStep,'aim');
scope.startMeter(10);
assert.equal(scope.swingStage,'idle','line up the shot before charging');
scope.angle=Math.PI;
scope.updatePracticeCue();
assert.equal(scope.document.body.dataset.practiceStep,'power');
assert.match($('practicecue').textContent,/highlighted Swing Box/);
scope.startMeter(100);
scope.releaseMeter(880);
assert.equal(scope.swingStage,'practice-ready','release pauses before the timing window');
assert.equal($('practiceready').open,true);
assert.match($('practicereadyhint').textContent,/the instant the mallet touches the ball/);
scope.finishMeter(4000);
assert.equal(scope.struck,undefined,'no strike while reading the instructions');
$('practicebegin').onclick();
assert.equal(scope.swingStage,'accuracy');
assert.equal($('practiceready').open,false);
scope.pausePracticeSwing(true);
assert.match($('practicereadyhint').textContent,/passed the ball/);
assert.equal(scope.struck,undefined,'missing the window allows a retry without taking a shot');
$('practicebegin').onclick();
scope.finishMeter(7600);
assert.equal(scope.struck[1],.3,'preserve power across the read and retry pauses');
assert.equal(scope.struck[3],0,'time the strike from the explicit swing start');

function roll(power,timing){
  scope.lastTiming=timing;
  scope.offsideRule.begin(balls[0]);
  beginHoopStroke(balls[0],scope.scoringHoop());
  balls[0].vz=-15*power;
  for(let tick=0;tick<960;tick++)scope.physics(1/240);
  // The actual end-of-shot entry point must bypass normal match scoring.
  scope.finishShot();
  assert.deepEqual(scope.scores,[0,0]);
}
roll(.14,.6);
assert.match($('practiceresult').textContent,/stopped short/);
assert.match($('practicetiming').textContent,/early/);
assert.equal($('practicedialog').open,true);
$('practiceretry').onclick();
assert.equal($('practicedialog').open,false);
assert.equal(balls[0].z,z+3);
roll(.30,0);
assert.match($('practiceresult').textContent,/ran the hoop/);
assert.match($('practicetiming').textContent,/centered/);
$('practiceback').onclick();
assert.equal(scope.phase,'setup');
assert.equal(balls.some(ball=>ball.entered),false);
assert.equal($('controllerdialog').open,true);
assert.equal($('gpvariant').value,'association');
assert.equal($('gpplayers').value,'4');
assert.equal($('gpaccuracy').value,'amateur');
assert.equal($('gpshotheight').value,'low');
console.log('PASS: isolated practice, real roll and hoop scoring, timing feedback, replay, and setup restoration');
