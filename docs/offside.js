// WCF Rule 8. The line is assigned to the next hoop in the route.
export function halfwayLine(point, hoops, route) {
  if (!route[point + 1]) return null;
  const next = point + 1;
  const centralX = hoops[4][0];
  let axis = 'z', value = 0;
  if ([2, 4, 6, 8, 10].includes(next)) {
    axis = 'x';
    value = next === 6 ? (hoops[0][0] + centralX) / 2
      : next === 4 || next === 10 ? (hoops[2][0] + centralX) / 2 : centralX;
  }
  const coordinate = hoops[route[next].h][axis === 'x' ? 0 : 1];
  return {axis, value, direction: Math.sign(coordinate - value)};
}

export class OffsideRule {
  constructor() {
    this.lastStroke = new Map();
  }

  begin(striker) {
    this.striker = striker;
    this.moved = new Set([striker]);
    this.opponentContacts = new Set();
  }

  contact(a, b) {
    if (a.side === b.side) return;
    this.opponentContacts.add(a);
    this.opponentContacts.add(b);
  }

  finish(balls, scoredLine, radius) {
    for (const ball of this.moved) {
      this.lastStroke.set(ball, {
        exempt: ball.side !== this.striker.side || this.opponentContacts.has(ball)
      });
    }
    if (!scoredLine) return [];
    const {axis, value, direction} = scoredLine;
    return balls.filter(ball => ball.entered && !ball.offsidePenalty &&
      (ball[axis] - value) * direction > radius &&
      !this.moved.has(ball) && !this.lastStroke.get(ball)?.exempt);
  }
}

// The penalty areas are half-yard semicircles centred on the long boundaries.
export function penaltyPosition(side, balls, radius) {
  const x = side * 14;
  for (const [inset, z] of [[0, 0], [0, .4], [0, -.4], [.4, 0], [.27, .34], [.27, -.34]]) {
    const candidate = {x: x - side * inset, z};
    if (balls.every(ball => Math.hypot(candidate.x - ball.x, z - ball.z) >= 2 * radius)) return candidate;
  }
  return {x, z: 0};
}
