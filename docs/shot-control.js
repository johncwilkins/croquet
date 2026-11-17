export const DESKTOP_PULL_PIXELS=320;
export function pullPower(drag,event){const dx=drag.x-event.clientX,dy=event.clientY-drag.y;const delta=drag.desktop?dx:dy;const travel=drag.desktop?(drag.pullPixels??DESKTOP_PULL_PIXELS):Math.max(90,Math.min(180,(drag.viewportHeight??Infinity)-drag.y-16));const sensitivity=event.shiftKey && drag.desktop ? .2 : 1;return Math.max(0,Math.min(1,drag.power+(delta-drag.previous)*sensitivity/travel))}
export function coarseHeading(ball){return ball.aimAngle??Math.round(Math.atan2(-ball.x,-ball.z)/(Math.PI/4))*(Math.PI/4)}
export function distanceToBoundary(ball,angle){const dx=Math.sin(angle),dz=Math.cos(angle);const tx=Math.abs(dx)<1e-9?Infinity:((dx>0?14:-14)-ball.x)/dx;const tz=Math.abs(dz)<1e-9?Infinity:((dz>0?17.5:-17.5)-ball.z)/dz;return Math.max(0,Math.min(30,tx,tz))}

export function wicketHeading(ball,target){return Math.atan2(target.x-ball.x,target.z-ball.z)}

// Measure sideways deviation along the whole pull, including a crooked path
// that returns to the centre before release. Allow a few pixels of hand jitter.
export function trackSwing(drag,event){const cross=drag.desktop?event.clientY-drag.y:event.clientX-drag.x;if(Math.abs(cross)>Math.abs(drag.cross||0))drag.cross=cross;drag.travel=Math.max(drag.travel||0,drag.desktop?drag.x-event.clientX:event.clientY-drag.y);return swingError(drag)}
export function swingError(drag){const cross=drag.cross||0,touch=drag.desktop===false,tolerance=touch?12:4,cap=touch?Math.PI/60:Math.PI/22.5,drift=Math.sign(cross)*Math.max(0,Math.abs(cross)-tolerance);return Math.max(-cap,Math.min(cap,Math.atan2(drift,Math.max(touch?120:80,drag.travel||0))*(touch?.22:.65)))}

export function shotAimTarget(balls,courseTarget,croquetTarget=null){return croquetTarget!==null&&croquetTarget!==undefined?balls[croquetTarget]:courseTarget}

