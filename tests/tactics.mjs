import assert from 'node:assert/strict';import {chooseShot,chooseJumpShot,shotUncertainty} from '../dist/tactics.js';
const base=[{x:0,z:2,entered:true,side:0},{x:2,z:-.7,entered:true,side:1},{x:7,z:7,entered:true,side:0},{x:8,z:9,entered:true,side:1}],posts=[{x:-.33,z:0,r:.045},{x:.33,z:0,r:.045}];const choose=balls=>chooseShot({balls,striker:1,hoop:{x:0,z:0},direction:-1,posts});
assert.equal(choose(base).type,'clearance','clear the opponent when no good hoop shot exists');const near=base.map(b=>({...b}));near[1].x=0;near[1].z=1.2;assert.equal(choose(near).type,'hoop','take the clean short hoop shot');const wrongSide=base.map(b=>({...b}));wrongSide[1].x=-4;wrongSide[1].z=-2;assert.notEqual(choose(wrongSide).type,'hoop');assert(shotUncertainty(.9).angleSD>shotUncertainty(.2).angleSD*6);assert(shotUncertainty(.9).speedSpread>shotUncertainty(.2).speedSpread*2);console.log('PASS: defensive clearance, clean hoop attempt, direction-aware tactics, distance-dependent uncertainty');
const {chooseBreakShot,chooseCroquetShot}=await import('../dist/tactics.js');
const roster=[{x:-4,z:-2,entered:true,side:0},{x:12,z:12,entered:true,side:1},{x:-2,z:-2,entered:true,side:0},{x:0,z:12,entered:false,side:1}];
const breakState={balls:roster,striker:0,hoop:{x:0,z:0,key:0},direction:-1,posts:[]};let plan=chooseBreakShot(breakState);assert.equal(plan.type,'roquet');assert.equal(plan.target,2,'a live partner ball is useful for building a break');plan=chooseBreakShot({...breakState,dead:[2]});assert.notEqual(plan.target,2,'already-used partner is excluded from roquet plans');
const clear=[{x:0,z:2,entered:true,side:0},{x:12,z:12,entered:true,side:1},{x:10,z:10,entered:true,side:0},{x:0,z:12,entered:false,side:1}];plan=chooseBreakShot({...breakState,balls:clear});assert.equal(plan.type,'hoop','clean hoop chance takes priority over roquet');
const croquet=chooseCroquetShot({...breakState,balls:[{x:-3,z:5.28,entered:true,side:0},{x:-3,z:5,entered:true,side:1},{x:10,z:10,entered:true,side:0},{x:0,z:12,entered:false,side:1}],contactTarget:1,dead:[1]});assert(croquet);const toward=croquet.contactAngle+Math.PI;assert(Math.cos(croquet.angle-toward)>.7,'croquet aims into contact rather than away from the struck ball');assert(croquet.power<=.55,'croquet uses controlled power to prepare a continuation');console.log('PASS: Association live partner roquet, dead-ball avoidance, clear hoop priority and controlled croquet planning');


const jumpState={
  balls:[{x:0,z:0,side:0,entered:true},{x:0,z:1,side:1,entered:true}],
  striker:0,hoop:{x:0,z:3},direction:1,
  posts:[{x:-.33,z:3,r:.045},{x:.33,z:3,r:.045}],arches:[{x:0,z:3}]
};
const jump=chooseJumpShot(jumpState,chooseShot(jumpState));
assert(jump?.jump && jump.reliability>=.6,'computer finds a clean jump over a blocking ball');
const open={...jumpState,balls:[jumpState.balls[0],{...jumpState.balls[1],x:1}]};
assert.equal(chooseJumpShot(open,chooseShot(open)),null,'computer rolls when the path is clear');
const tooClose={...jumpState,balls:[jumpState.balls[0],{...jumpState.balls[1],z:.29}]};
assert.equal(chooseJumpShot(tooClose,chooseShot(tooClose)),null,'computer avoids jumping into a ball too close to clear');
const rollModel=shotUncertainty(.5),jumpModel=shotUncertainty(.5,false,'pro','amateur',true);
assert(jumpModel.angleSD>rollModel.angleSD && jumpModel.speedSpread>rollModel.speedSpread && jumpModel.loftSpread>0);

const awkwardHoop={
  ...breakState, direction:-1, level:'master', posts,
  balls:[
    {x:0,z:-2,entered:true,side:0},
    {x:0,z:11,entered:true,side:1},
    {x:2,z:-2,entered:true,side:0},
    {x:10,z:10,entered:true,side:1}
  ]
};
const distantBalls={...awkwardHoop,balls:awkwardHoop.balls.map((ball,i)=>i===2?{...ball,entered:false}:ball)};
assert.equal(chooseBreakShot(distantBalls).type,'approach','set up from the wrong side of the wicket instead of chasing a distant ball');
assert.equal(chooseBreakShot({...awkwardHoop,dead:[3]}).type,'approach','after a roquet, set up rather than chasing another nearby ball');
assert.equal(chooseBreakShot({...awkwardHoop,balls:awkwardHoop.balls.map((ball,i)=>i===0?{...ball,z:2}:ball)}).type,'hoop');
console.log('PASS: Association prioritizes a makeable hoop and avoids chains of setup roquets');

// A playable croquet stroke can leave the striker at the current wicket
// and stage the contacted ball for the next one.
const twoHoopPlan={
  balls:[{x:2.08,z:2,entered:true,side:0},{x:1.8,z:2,entered:true,side:1}],
  striker:0,contactTarget:1,hoop:{x:0,z:0},direction:-1,
  posts:[{x:-.33,z:0,r:.045},{x:.33,z:0,r:.045}],
  nextHoop:{x:4,z:0,d:-1}
};
const plannedCroquet=chooseCroquetShot(twoHoopPlan);
assert(plannedCroquet.useful&&plannedCroquet.hoopChance>=2/3&&plannedCroquet.pioneerChance>=2/3);
const remoteContact=chooseCroquetShot({...twoHoopPlan,lookAhead:true,balls:[
  {x:12.28,z:12,entered:true,side:0},{x:12,z:12,entered:true,side:1}
]});
assert(remoteContact&&!remoteContact.useful,'contact alone is not a useful follow-up');
console.log('PASS: croquet planner considers both ball positions and rejects a roquet without an approach');

// An opponent lined up at its own wicket is worth clearing, even when the
// striker has already used that ball and cannot earn another croquet stroke.
const defenseState={
  balls:[{x:0,z:-2,side:0,entered:true},{x:4,z:3,side:1,entered:true}],
  striker:0,hoop:{x:0,z:0},direction:-1,posts,level:'master',
  targets:[{x:0,z:0,d:-1},{x:4,z:1.5,d:-1}],dead:[1]
};
const clearance=chooseBreakShot(defenseState);
assert.equal(clearance.type,'defensive-clearance');
assert.equal(clearance.target,1);
const safeOpponent={...defenseState,targets:[defenseState.targets[0],{x:4,z:4.5,d:-1}],dead:[]};
assert.equal(chooseBreakShot(safeOpponent).type,'approach','skip the same ball when clearing it has no benefit');
const openOwnHoop={...defenseState,balls:[{...defenseState.balls[0],z:2},defenseState.balls[1]]};
assert.equal(chooseBreakShot(openOwnHoop).type,'hoop','take an easy point before a defensive chase');
console.log('PASS: purposeful clearances, dead-ball defense, and easy wicket priority');
