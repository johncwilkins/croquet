// Timing is independent of mouse/touch travel and frame rate.
export const POWER_MS=2600, ACCURACY_MS=1600;
export function heldPower(elapsed){return Math.max(.025,Math.min(1,elapsed/POWER_MS))}
export function accuracyPosition(elapsed){return Math.max(-1,Math.min(1,1-2*elapsed/ACCURACY_MS))}
export function timingError(position){const miss=Math.max(0,Math.abs(position)-.14)/.86;return miss===0?0:Math.sign(position)*miss*miss*Math.PI/30}
export function contactAngle(target,point){return Math.atan2(point.x-target.x,point.z-target.z)}
