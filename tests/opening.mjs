import assert from 'node:assert/strict';
import {openingChoice,drawHumanColour} from '../dist/opening.js';
import {VariantMatch} from '../dist/variants.js';
for(const kind of ['golf','nine']){
 assert.deepEqual(openingChoice(kind,true,'blue'),{humanSide:0,firstSide:0});
 assert.deepEqual(openingChoice(kind,true,'red'),{humanSide:1,firstSide:0});
 assert.deepEqual(openingChoice(kind,false,'red'),{humanSide:1,firstSide:0});
}
assert.deepEqual(openingChoice('association',true,'first'),{humanSide:1,firstSide:1});
assert.deepEqual(openingChoice('association',true,'second'),{humanSide:1,firstSide:0});
for(const humanWon of [true,false])for(const choice of ['blue','red']){
 const result=openingChoice('association',humanWon,choice);
 assert.equal(result.humanSide,choice==='blue'?0:1);assert.equal(result.firstSide,1-result.humanSide);
}
for(const first of [0,1]){
 const balls=Array.from({length:4},()=>({x:0,z:0,entered:false}));
 const match=new VariantMatch('association',balls,2);match.turn=first;
 const order=[];for(let k=0;k<4;k++){order.push(match.turn);match.nextTurn()}
 assert.equal(new Set(order).size,4,'all four opening balls play exactly once');
 for(let k=1;k<4;k++)assert.notEqual(balls[order[k]].side,balls[order[k-1]].side,'sides alternate');
 assert(match.chooseBall);assert.equal(balls[match.turn].side,first,'first side plays next');
}
for(const count of [3,4]){
 const draws=Array.from({length:count},(_,i)=>drawHumanColour(count,()=> (i+.5)/count));
 assert.deepEqual(draws,Array.from({length:count},(_,i)=>i));
}
console.log('PASS: coin toss colour/lead choices, both Association opening sides, alternating four-ball openings, and multiplayer colour draw');
