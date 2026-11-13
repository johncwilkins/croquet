import {beginHoopStroke,trackHoopSegment,hoopWinner} from './scoring.js';
// Choose between a reliable hoop attempt, a clearance, a block, and an approach.
const R=.14,F=2.2,MAX=15;
export function shotUncertainty(power){return {angleSD:(.10+1.45*power*power)*Math.PI/180,speedSpread:.004+.014*power*power}}
function dot(a,b){return a.x*b.x+a.z*b.z}
function distance(a,b){return Math.hypot(a.x-b.x,a.z-b.z)}
function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)}
function threat(b,h,dir,all){if(!b.entered)return 0;const forward=(h.z-b.z)*dir,dx=Math.abs(b.x-h.x),d=distance(b,h);if(forward<=R||dx>forward*.8)return 0;const obstructed=all.some(o=>o!==b&&o.entered&&distance(o,b)>.32&&distance(o,h)>.2&&segmentDistance(o,b,h)<R*1.75);return Math.exp(-d/9)*(1-Math.min(.85,dx/(forward+.1)))*(obstructed?.15:1)}
function simulate(balls,striker,angle,power,posts,h,dir){const hoop={...h,key:h.key??0,direction:dir};const s=balls.map(b=>({...b,hoopRun:b.hoopRun?{...b.hoopRun}:undefined,vx:0,vz:0}));s.forEach(b=>beginHoopStroke(b,hoop));s[striker].vx=Math.sin(angle)*MAX*power;s[striker].vz=Math.cos(angle)*MAX*power;let hitOpponent=false,scored=-1,firstHit=null;const dt=1/100;for(let step=0;step<760;step++){let moving=false;const previous=s.map(b=>({x:b.x,z:b.z}));for(const b of s){if(!b.entered)continue;const px=b.x,pz=b.z;b.x+=b.vx*dt;b.z+=b.vz*dt;const v=Math.hypot(b.vx,b.vz),n=Math.max(0,v-F*dt);if(v>.02)moving=true;if(v){b.vx*=n/v;b.vz*=n/v}for(const p of posts){const dx=b.x-p.x,dz=b.z-p.z,d=Math.hypot(dx,dz),min=R+p.r;if(d<min&&d>1e-5){const nx=dx/d,nz=dz/d;b.x=p.x+nx*min;b.z=p.z+nz*min;const q=b.vx*nx+b.vz*nz;if(q<0){b.vx-=1.6*q*nx;b.vz-=1.6*q*nz}}}if(Math.abs(b.x)>14||Math.abs(b.z)>17.5){b.x=Math.max(-14,Math.min(14,b.x));b.z=Math.max(-17.5,Math.min(17.5,b.z));b.vx=b.vz=0}}
for(let i=0;i<s.length;i++)for(let j=i+1;j<s.length;j++){const a=s[i],b=s[j];if(!a.entered||!b.entered)continue;const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d>1e-5&&d<R*2){const nx=dx/d,nz=dz/d,over=(R*2-d)/2;a.x-=nx*over;a.z-=nz*over;b.x+=nx*over;b.z+=nz*over;const q=(a.vx-b.vx)*nx+(a.vz-b.vz)*nz;if(q>0){if(firstHit===null&&(i===striker||j===striker))firstHit=i===striker?j:i;if(a.side!==b.side)hitOpponent=true;a.vx-=q*.94*nx;a.vz-=q*.94*nz;b.vx+=q*.94*nx;b.vz+=q*.94*nz}}}s.forEach((b,i)=>{if(b.entered)trackHoopSegment(b,previous[i],hoop)});if(!moving)break}scored=hoopWinner(s)?.side??-1;return {balls:s,hitOpponent,scored,firstHit}}
export function chooseShot({balls,striker,hoop,direction,posts}){const b=balls[striker],side=b.side,candidates=[],opponents=balls.filter(o=>o.entered&&o.side!==side),baseline=opponents.reduce((v,o)=>v+threat(o,hoop,direction,balls),0);const add=(x,z,roll,type)=>{const d=Math.hypot(x-b.x,z-b.z);if(d<.02)return;candidates.push({angle:Math.atan2(x-b.x,z-b.z),power:Math.min(.98,Math.sqrt(2*F*(roll??d))/MAX),type})};
const forward=(hoop.z-b.z)*direction;
if(forward>R){const d=distance(b,hoop);for(const extra of [.4,.9,1.6])add(hoop.x,hoop.z,d+extra,'hoop')}
for(const o of opponents){const d=distance(b,o);for(const offset of [-.12,0,.12])add(o.x+offset,o.z,d+5+threat(o,hoop,direction,balls)*13,'clearance')}
for(const o of opponents){if(threat(o,hoop,direction,balls)>.25){const dx=o.x-hoop.x,dz=o.z-hoop.z,l=Math.hypot(dx,dz);for(const gap of [.65,1.1,1.8]){const x=hoop.x+dx/l*gap,z=hoop.z+dz/l*gap;add(x,z,null,'block')}}}
for(const back of [1.1,2,3])for(const offset of [-.7,0,.7])add(hoop.x+offset,hoop.z-direction*back,null,'approach');
let best=null;for(const c of candidates){const error=shotUncertainty(c.power).angleSD;let total=0,success=0,hits=0;for(const variation of [-1.3,-.65,0,.65,1.3]){const result=simulate(balls,striker,c.angle+variation*error,c.power,posts,hoop,direction);if(result.scored===side)success++;if(result.hitOpponent)hits++;const threats=result.balls.filter(o=>o.entered&&o.side!==side).reduce((v,o)=>v+threat(o,hoop,direction,result.balls),0);const own=result.balls.filter(o=>o.entered&&o.side===side).reduce((v,o)=>Math.max(v,threat(o,hoop,direction,result.balls)),0);const pos=result.balls[striker],approachDistance=distance(pos,{x:hoop.x,z:hoop.z-direction*1.4});total+=(result.scored===side?1200:result.scored>=0?-1600:0)+(baseline-threats)*200-threats*120+own*110-Math.min(30,approachDistance)*2.5;if(result.hitOpponent)total+=baseline*25;}
// Compare expected scoring value with genuine opponent threats; do not reject a useful shot for missing one sample.
const reliability=success/5;let value=total/5;if(c.type==='hoop'&&success===0)value-=70;if(c.type==='clearance'&&hits===0)value-=70;if(c.type==='block'&&baseline<.1)value-=15;if(!best||value>best.value)best={...c,value,reliability}}
return best||{angle:Math.atan2(hoop.x-b.x,hoop.z-direction*2-b.z),power:.3,type:'approach',reliability:0}}

// Association values a continuing break, not just disruption of opponents.
export function chooseBreakShot({balls,striker,hoop,direction,posts,dead=[]}){
 const used=new Set(dead),b=balls[striker],live=balls.map((o,i)=>({o,i})).filter(({o,i})=>i!==striker&&o.entered&&!o.finished&&!used.has(i));
 const base=chooseShot({balls,striker,hoop,direction,posts}),candidates=[base];
 const add=(x,z,roll,type)=>candidates.push({angle:Math.atan2(x-b.x,z-b.z),power:Math.min(.95,Math.sqrt(2*F*roll)/MAX),type});
 if((hoop.z-b.z)*direction>R)for(const extra of [.4,1,1.7])add(hoop.x,hoop.z,distance(b,hoop)+extra,'hoop');
 for(const {o,i}of live)for(const extra of [.45,1.4,3]){const d=distance(b,o);add(o.x,o.z,d+extra,'roquet');candidates[candidates.length-1].target=i}
 for(const back of [1.3,2.5])add(hoop.x,hoop.z-direction*back,distance(b,{x:hoop.x,z:hoop.z-direction*back}),'approach');
 let best=null;for(const c of candidates){let value=0;for(const drift of [-1,0,1]){const result=simulate(balls,striker,c.angle+drift*shotUncertainty(c.power).angleSD,c.power,posts,hoop,direction),pos=result.balls[striker];const liveHit=result.firstHit!==null&&live.some(t=>t.i===result.firstHit);const scores=pos.candidate&&result.firstHit===null;
 value+=(scores?1200:0)+(liveHit?420+threat(result.balls[result.firstHit],hoop,direction,result.balls)*90:0)+threat(pos,hoop,direction,result.balls)*110-distance(pos,{x:hoop.x,z:hoop.z-direction*1.4})*3;
 if(result.firstHit!==null&&!liveHit&&!scores)value-=180;
 }value/=3;if(!best||value>best.value)best={...c,value}}
 return best;
}
export function chooseCroquetShot({balls,striker,contactTarget,hoop,direction,posts,dead=[]}){
 const other=balls[contactTarget],used=new Set(dead);let best=null;
 for(let k=0;k<16;k++){const contactAngle=k*Math.PI/8,x=other.x+Math.sin(contactAngle)*.28001,z=other.z+Math.cos(contactAngle)*.28001;
 if(Math.abs(x)>=14||Math.abs(z)>=17.5||posts.some(p=>Math.hypot(x-p.x,z-p.z)<R+p.r)||balls.some((o,i)=>i!==striker&&i!==contactTarget&&o.entered&&!o.finished&&Math.hypot(x-o.x,z-o.z)<R*2))continue;
 const setup=balls.map((o,i)=>i===striker?{...o,x,z}:o),toward=Math.atan2(other.x-x,other.z-z);
 for(const offset of [-.65,-.3,0,.3,.65])for(const power of [.16,.26,.4,.55]){const angle=toward+offset,result=simulate(setup,striker,angle,power,posts,hoop,direction),pos=result.balls[striker],sent=result.balls[contactTarget];
 if(distance(sent,other)<.02||Math.abs(sent.x)>13.9||Math.abs(sent.z)>17.4||Math.abs(pos.x)>13.9||Math.abs(pos.z)>17.4)continue;
 const approach=distance(pos,{x:hoop.x,z:hoop.z-direction*1.4}),nextRoquet=result.balls.reduce((v,o,i)=>i!==striker&&i!==contactTarget&&o.entered&&!o.finished&&!used.has(i)?Math.max(v,Math.exp(-distance(pos,o)/5)):v,0);
 const value=(pos.candidate?1200:0)+threat(pos,hoop,direction,result.balls)*220-approach*9+nextRoquet*80;
 if(!best||value>best.value)best={angle,power,contactAngle,type:'croquet',value};
 }}return best;
}
