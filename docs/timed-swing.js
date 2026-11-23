// Timing is independent of mouse/touch travel and frame rate.
export const POWER_MS=2600, ACCURACY_MS=1200;
export function heldPower(elapsed){return Math.max(.025,Math.min(1,elapsed/POWER_MS))}
export function accuracyPosition(elapsed){return Math.max(-1,Math.min(1,1-2*elapsed/ACCURACY_MS))}
export function timingError(position){const miss=Math.max(0,Math.abs(position)-.055)/.945;return miss===0?0:Math.sign(position)*miss*miss*Math.PI/24}
export function contactAngle(target,point){return Math.atan2(point.x-target.x,point.z-target.z)}

export function canStartPull(x,rect,desktop){return !desktop||x>=rect.right-Math.max(60,rect.width*.24)}
