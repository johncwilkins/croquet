import assert from 'node:assert/strict';import {pullPower,coarseHeading,wicketHeading,distanceToBoundary,trackSwing,swingError} from '../dist/shot-control.js';
let drag={x:800,y:600,desktop:true,power:0,previous:0};assert.equal(pullPower(drag,{clientX:480,clientY:600,shiftKey:false}),1);assert.equal(pullPower(drag,{clientX:640,clientY:600,shiftKey:false}),.5);assert.equal(pullPower(drag,{clientX:640,clientY:600,shiftKey:true}),.1);
drag={...drag,power:.5,previous:160};assert.equal(pullPower(drag,{clientX:640,clientY:600,shiftKey:true}),.5,'holding Shift does not jump power');assert.equal(pullPower(drag,{clientX:656,clientY:600,shiftKey:true}),.49,'fine mode reduces power continuously');assert.equal(pullPower(drag,{clientX:656,clientY:600,shiftKey:false}),.45);
assert.equal(pullPower({x:0,y:500,desktop:false,power:0,previous:0},{clientX:0,clientY:545,shiftKey:false}),.5,'touch pull retained');assert.equal(coarseHeading({x:5,z:9,aimAngle:1.23}),1.23,'manual aim preserved');const coarse=coarseHeading({x:13,z:16});assert(Math.abs(coarse/(Math.PI/4)-Math.round(coarse/(Math.PI/4)))<1e-10);assert.equal(distanceToBoundary({x:0,z:0},Math.PI),17.5);assert.equal(distanceToBoundary({x:13,z:0},Math.PI/2),1);
console.log('PASS: long desktop pull, fine adjustment without jumps, reducing power, touch behavior, manual aim persistence and ruler boundary clipping');

assert.equal(wicketHeading({x:0,z:5},{x:0,z:0}),Math.PI);assert.equal(wicketHeading({x:4,z:5},{x:7,z:9}),Math.atan2(3,4));console.log('PASS: default shot heading tracks the next wicket');

const straight={x:400,y:200,desktop:true};trackSwing(straight,{clientX:240,clientY:203});assert.equal(swingError(straight),0,'small jitter is forgiven');
const crooked={x:400,y:200,desktop:true};trackSwing(crooked,{clientX:300,clientY:230});trackSwing(crooked,{clientX:200,clientY:200});assert(swingError(crooked)>.07,'returning to centre does not erase drift');
const touch={x:100,y:200,desktop:false};trackSwing(touch,{clientX:80,clientY:280});assert(swingError(touch)<-.1,'touch uses sideways drift from a downward pull');
assert(Math.abs(swingError({cross:1000,travel:1}))<=Math.PI/22.5,'error is bounded at eight degrees');console.log('PASS: straight swing, jitter tolerance, full pull path, touch deviation and bounded mishits');
