import assert from 'node:assert/strict';
import {OffsideRule, halfwayLine, penaltyPosition} from '../dist/offside.js';
import {SIX, GOLF_ROUTE} from '../dist/variants.js';

assert.deepEqual(GOLF_ROUTE.slice(1).map((_, point) => {
  const {axis, value, direction} = halfwayLine(point, SIX, GOLF_ROUTE);
  return [axis, value, direction];
}), [['z',0,-1],['x',0,1],['z',0,1],['x',3.5,-1],
     ['z',0,-1],['x',-3.5,-1],['z',0,1],['x',0,1],
     ['z',0,-1],['x',3.5,-1],['z',0,1],['z',0,-1]]);
assert.equal(halfwayLine(12, SIX, GOLF_ROUTE), null);

const line = halfwayLine(0, SIX, GOLF_ROUTE);
const ball = (side, z) => ({entered: true, side, z, x: 0});
const ahead = ball(0, -2), touching = ball(0, -.14);
const scorer = ball(1, 10), movedOnScore = ball(1, -3);
const opponentMoved = ball(0, -5), opponentContact = ball(0, -8);
const directed = {...ball(0, -9), offsidePenalty: 1};
const balls = [ahead, touching, scorer, movedOnScore, opponentMoved, opponentContact, directed];
const rule = new OffsideRule();
rule.begin(ahead);
assert.deepEqual(rule.finish(balls, null, .14), [], 'playing ahead is legal until the point is scored');
rule.begin(scorer);
rule.moved.add(opponentMoved);
rule.finish(balls, null, .14);
rule.begin(opponentContact);
rule.contact(opponentContact, scorer);
rule.finish(balls, null, .14);
rule.begin(scorer);
rule.moved.add(movedOnScore);
assert.deepEqual(rule.finish(balls, line, .14), [ahead]);
rule.begin(opponentMoved);
rule.finish(balls, null, .14);
rule.begin(scorer);
rule.moved.add(movedOnScore);
assert.deepEqual(rule.finish(balls, line, .14), [ahead, opponentMoved], 'a later own stroke replaces the exemption');
assert.deepEqual(penaltyPosition(-1, [], .14), {x:-14,z:0});
assert.deepEqual(penaltyPosition(1, [{x:14,z:0}], .14), {x:14,z:.4});
console.log('PASS: Golf halfway lines, whole-ball threshold, exemptions and penalty placement');
