// Hoop progress survives turns. The centre must cross between the uprights;
// the trailing edge then clears the playing-side face of the hoop (WCF 7.2–7.5).
export const HOOP_HALF_WIDTH=.33,UPRIGHT_RADIUS=.045,BALL_RADIUS=.14;
const EPS=.00005;
const progress=(p,h)=> (p.z-h.z)*h.direction;
export function resetHoopProgress(ball){delete ball.hoopRun;ball.entry=false;ball.candidate=false}
function stateFor(ball,from,h,r){if(!ball.hoopRun||ball.hoopRun.key!==h.key){ball.hoopRun={key:h.key,eligible:progress(from,h)<=UPRIGHT_RADIUS-r+EPS,crossed:false,candidate:false,wrongEntry:false};}return ball.hoopRun}
export function beginHoopStroke(ball,hoop,r=BALL_RADIUS){const s=stateFor(ball,ball,hoop,r);s.wrongEntry=false;const q=progress(ball,hoop);if(q<=UPRIGHT_RADIUS-r+EPS)s.eligible=true;ball.startDist=Math.hypot(ball.x-hoop.x,ball.z-hoop.z);ball.entry=s.crossed;ball.candidate=s.candidate}
export function trackHoopSegment(ball,from,hoop,r=BALL_RADIUS){const s=stateFor(ball,from,hoop,r),before=progress(from,hoop),after=progress(ball,hoop),delta=after-before,opening=HOOP_HALF_WIDTH-UPRIGHT_RADIUS-r;
 // Returning to a position before the ball starts running re-establishes eligibility,
 // except after first entering backwards during this same stroke (rule 7.5.4).
 if(Math.abs(delta)>1e-12&&((before<=0&&after>0)||(before>=0&&after<0))){const t=-before/delta,crossX=from.x+(ball.x-from.x)*t;if(Math.abs(crossX-hoop.x)<=opening+EPS){if(delta>0){if(s.eligible&&!s.wrongEntry)s.crossed=true}else{if(!s.eligible){s.wrongEntry=true}s.crossed=false;s.candidate=false}}}
 if(after<=UPRIGHT_RADIUS-r+EPS&&!s.wrongEntry)s.eligible=true;
 if(s.crossed&&after>=r-UPRIGHT_RADIUS-EPS)s.candidate=true;
 // A rollback into the jaws cancels completion, but preserves a legitimate partial run.
 if(after<r-UPRIGHT_RADIUS-EPS&&Math.abs(ball.x-hoop.x)<HOOP_HALF_WIDTH-UPRIGHT_RADIUS+EPS)s.candidate=false;
 ball.entry=s.crossed;ball.candidate=s.candidate;
}
export function hoopWinner(balls){return balls.filter(b=>b.entered&&b.hoopRun?.candidate).sort((a,b)=>a.startDist-b.startDist)[0]||null}
