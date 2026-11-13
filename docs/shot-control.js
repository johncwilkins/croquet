export const DESKTOP_PULL_PIXELS=320;
export function pullPower(drag,event){const dx=drag.x-event.clientX,dy=event.clientY-drag.y;const delta=drag.desktop?dx:dy;const travel=drag.desktop?DESKTOP_PULL_PIXELS:90;const sensitivity=event.shiftKey && drag.desktop ? .2 : 1;return Math.max(0,Math.min(1,drag.power+(delta-drag.previous)*sensitivity/travel))}
export function coarseHeading(ball){return ball.aimAngle??Math.round(Math.atan2(-ball.x,-ball.z)/(Math.PI/4))*(Math.PI/4)}
export function distanceToBoundary(ball,angle){const dx=Math.sin(angle),dz=Math.cos(angle);const tx=Math.abs(dx)<1e-9?Infinity:((dx>0?14:-14)-ball.x)/dx;const tz=Math.abs(dz)<1e-9?Infinity:((dz>0?17.5:-17.5)-ball.z)/dz;return Math.max(0,Math.min(30,tx,tz))}
