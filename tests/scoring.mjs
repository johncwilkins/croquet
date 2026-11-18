import {OffsideRule} from '../dist/offside.js';
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import * as scoring from '../dist/scoring.js';import * as flight from '../dist/flight.js';
const hoop={key:0,x:0,z:0,direction:1};const ball=(x,z,side=0)=>({x,z,vx:0,vz:0,entered:true,side});const begin=b=>scoring.beginHoopStroke(b,hoop);const move=(b,x,z)=>{const p={x:b.x,z:b.z};b.x=x;b.z=z;scoring.trackHoopSegment(b,p,hoop)};
let b=ball(0,-1);begin(b);move(b,0,1);assert(b.candidate,'straight run');
b=ball(.25,-.2);begin(b);move(b,-.25,.2);assert(b.candidate,'legal angled run previously rejected');
b=ball(0,-.3);begin(b);move(b,0,.11);assert(b.candidate,'whole ball clear of playing-side face');
b=ball(0,-.3);begin(b);move(b,0,.05);assert(!b.candidate,'still in jaws');begin(b);move(b,0,.11);assert(b.candidate,'complete partial run on later turn');
b=ball(0,-.3);begin(b);move(b,0,.3);move(b,0,.04);assert(!b.candidate,'rollback into jaws cancels completion');begin(b);move(b,0,.2);assert(b.candidate,'rolled-back partial run may be completed later');
b=ball(0,.3);begin(b);move(b,0,-.3);move(b,0,.3);assert(!b.candidate,'backwards first entry cannot score in same stroke');move(b,0,-.3);begin(b);move(b,0,.3);assert(b.candidate,'backwards entry reset for subsequent eligible stroke');
b=ball(.8,-.3);begin(b);move(b,.8,.3);assert(!b.candidate,'going around upright is not a score');
const a=ball(0,-.7,0),c=ball(0,-.3,1);[a,c].forEach(begin);move(a,0,.5);move(c,0,.3);assert.equal(scoring.hoopWinner([a,c]),c,'nearer ball wins when both run');
const src=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');const functions=src.slice(src.indexOf('function grassInfluence'),src.indexOf('function finishShot'));const context={Math,THREE:{MathUtils:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v))}},R:.14,F:2.2,match:null,scoringHoop:()=>hoop,trackHoopSegment:scoring.trackHoopSegment,onCourt:b=>b.entered&&!b.finished&&!b.offsidePenalty,beep:()=>{},...flight,hoopPos:[[0,0]],posts:[{x:-.33,z:0,r:.045},{x:.33,z:0,r:.045}],balls:[]};vm.createContext(context);vm.runInContext(functions,context);
function roll(balls){context.balls=balls;context.offsideRule=new OffsideRule();context.offsideRule.begin(balls[0]);while(balls.length<4)balls.push({entered:false});balls.filter(b=>b.entered).forEach(begin);for(let i=0;i<1500;i++)context.physics(1/240);return scoring.hoopWinner(balls)}
const striker=ball(0,-.75,1),peeled=ball(0,-.2,0);striker.vz=2.3;assert.equal(roll([striker,peeled]),peeled,'opponent knocks ball through; point belongs to peeled ball owner');
const computer=ball(0,-1,1);computer.vz=2.5;assert.equal(roll([computer]),computer,'computer scores straight run');
const bounce=ball(.33,-1);bounce.vz=2.5;assert.equal(roll([bounce]),null,'post hit does not score');
const angle=ball(-.5,-.5);angle.vx=angle.vz=1.6;assert.equal(roll([angle]),angle,'actual physics angled clean pass scores');
console.log('PASS: 14 scoring regressions, including angled runs, slow clearance, partial runs, rollback, backward entry, multiple balls and collision-driven owner scoring');

