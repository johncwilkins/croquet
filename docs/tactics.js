import {launchVelocity,airborne,advanceFlight,collideUpright,collideArch} from './flight.js';
import {beginHoopStroke,trackHoopSegment,hoopWinner} from './scoring.js';
// Choose between a reliable hoop attempt, a clearance, a block, and an approach.
const R=.14,F=2.2,MAX=15;
export const COMPUTER_LEVELS={amateur:{name:'Amateur',angle:3.4,speed:3.0},club:{name:'Country Club Champ',angle:1.85,speed:1.8},pro:{name:'Pro',angle:1,speed:1},master:{name:'Master',angle:.78,speed:.82}};
export function shotUncertainty(power, computer=false, level='pro', playerAccuracy='amateur', jump=false) {
  const skill = COMPUTER_LEVELS[level] || COMPUTER_LEVELS.pro;
  const baseAngle = .10 + 1.45 * power * power;
  const angleDegrees = computer ? baseAngle : playerAccuracy === 'pro'
    ? baseAngle + .035 + .45 * power * power : baseAngle;
  return {
    angleSD: angleDegrees * Math.PI / 180 * (computer ? 1.25 * skill.angle : 1) * (jump ? 1.3 : 1),
    speedSpread: (.004 + .014 * power * power) * (computer ? 1.2 * skill.speed : 1) * (jump ? 1.75 : 1),
    loftSpread: jump ? Math.PI / 180 * 2.5 * (computer ? Math.sqrt(skill.angle) : 1) : 0
  };
}
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

// Longer Association strokes are harder to place, even on the highest level.
export function associationRollUncertainty(power,level){
 const model=shotUncertainty(power,true,level);
 return {...model,angleSD:model.angleSD*(1+.6*power),speedSpread:model.speedSpread*1.25};
}

function cleanHoopPosition(ball,hoop,direction,balls,posts){
 const depth=(hoop.z-ball.z)*direction;
 if(depth<.3||depth>3.3||Math.abs(ball.x-hoop.x)>depth*.42)return false;
 return !balls.some(other=>other!==ball&&other.entered&&segmentDistance(other,ball,hoop)<2*R)
   && !posts.some(post=>segmentDistance(post,ball,hoop)<R+post.r);
}

function leaveRisk(striker,balls,posts,targets){
 const own=balls[striker];
 let risk=0;
 for(const [i,other] of balls.entries()){
   if(!other.entered||other.side===own.side)continue;
   const gap=distance(other,own);
   if(!posts.some(post=>segmentDistance(post,other,own)<R+post.r)){
     risk=Math.max(risk,Math.exp(-gap/4));
   }
   const target=targets[i];
   if(target&&!target.stake&&cleanHoopPosition(other,target,target.d,balls,posts))risk=Math.max(risk,.7);
 }
 return risk;
}

export function chooseBreakShot(state){
 const {balls,striker,hoop,direction,posts,dead=[],level='pro',targets=[]}=state;
 const used=new Set(dead),b=balls[striker];
 const live=balls.map((o,i)=>({o,i})).filter(({o,i})=>i!==striker&&o.entered&&!o.finished&&!used.has(i));
 const liveIndices=new Set(live.map(({i})=>i));
 const wicketDistance=distance(b,hoop);
 const base=chooseShot({balls,striker,hoop,direction,posts});
 const candidates=[base];
 const add=(x,z,roll,type,target)=>candidates.push({
   angle:Math.atan2(x-b.x,z-b.z),power:Math.min(.95,Math.sqrt(2*F*roll)/MAX),type,target
 });
 if((hoop.z-b.z)*direction>R){
   for(const extra of [.4,1,1.7])add(hoop.x,hoop.z,wicketDistance+extra,'hoop');
 }
 for(const {o,i} of live){
   const range=distance(b,o);
   for(const extra of [.45,1.4,3])add(o.x,o.z,range+extra,'roquet',i);
 }
 const setup={x:hoop.x,z:hoop.z-direction*1.4};
 for(const back of [1.3,2.5])for(const side of [0,-.45,.45]){
   const point={x:hoop.x+side,z:hoop.z-direction*back};
   add(point.x,point.z,distance(b,point),'approach');
 }
 const samples=[[0,0],[-.7,-.7],[.7,.7],[-1.5,.5],[1.5,-.5]];
 let best=null,bestCloseHoop=null,bestSetup=null;
 for(const candidate of candidates){
   const {angle,power}=candidate;
   const {angleSD,speedSpread}=associationRollUncertainty(power,level);
   let total=0,hoops=0,goodSetups=0,followUp=null,followUpHits=0;
   for(const [directionError,paceError] of samples){
     const result=simulate(balls,striker,angle+directionError*angleSD,
       power*(1+paceError*speedSpread),posts,hoop,direction);
     const pos=result.balls[striker];
     const hit=result.firstHit;
     const scores=pos.candidate&&hit===null;
     if(scores)hoops++;
     const setupDistance=distance(pos,setup);
     const linedUp=hit===null&&cleanHoopPosition(pos,hoop,direction,result.balls,posts);
     if(linedUp)goodSetups++;
     total+=(scores?1200:0)+(linedUp?155:0)+
       threat(pos,hoop,direction,result.balls)*110-setupDistance*6;
     if(!scores)total-=105*leaveRisk(striker,result.balls,posts,targets);
     if(liveIndices.has(hit)){
       const range=distance(b,balls[hit]);
       if(directionError===0&&range<=8){
         followUp=chooseCroquetShot({...state,balls:result.balls,contactTarget:hit,lookAhead:true});
         if(!followUp?.useful)followUp=null;
         else followUp={...followUp,target:hit};
       }
       if(followUp?.target===hit){
         followUpHits++;
         const payoff=followUp.hoopChance*400+followUp.pioneerChance*105;
         total+=payoff*Math.exp(-Math.max(0,range-3)/3.5)*(used.size?.42:1);
       }else total-=145;
     }else if(hit!==null&&!scores)total-=180;
   }
   const value=total/samples.length;
   if(followUp&&followUpHits<3)continue;
   const plan=followUp
     ? {...candidate,type:'roquet',target:followUp.target,value,reliability:hoops/samples.length}
     : {...candidate,value,reliability:hoops/samples.length};
   if(candidate.type==='roquet'&&!followUp)continue;
   if(!best||value>best.value)best=plan;
   if(goodSetups>=3&&candidate.type==='approach'&&(!bestSetup||value>bestSetup.value))bestSetup=plan;
   if(wicketDistance<=4&&candidate.type==='hoop'&&hoops>=3&&(!bestCloseHoop||value>bestCloseHoop.value)){
     bestCloseHoop=plan;
   }
 }
 if(bestCloseHoop)return bestCloseHoop;
 if(bestSetup&&best.reliability<.6){
   const shortRoquet=best.type==='roquet'&&distance(b,balls[best.target])<=4;
   if(used.size>0||!shortRoquet)return bestSetup;
 }
 return best;
}

export function chooseCroquetShot({
 balls,striker,contactTarget,hoop,direction,posts,nextHoop,targets=[],level='pro',lookAhead=false
}){
 const other=balls[contactTarget];
 const candidates=[];
 function outcome(setup,angle,power){
   const result=simulate(setup,striker,angle,power,posts,hoop,direction);
   const pos=result.balls[striker],sent=result.balls[contactTarget];
   if(distance(sent,other)<.02||Math.abs(sent.x)>13.9||Math.abs(sent.z)>17.4||
      Math.abs(pos.x)>13.9||Math.abs(pos.z)>17.4)return null;
   const ready=!!pos.candidate||cleanHoopPosition(pos,hoop,direction,result.balls,posts);
   const pioneer=!!nextHoop&&!nextHoop.stake&&distance(sent,nextHoop)<4&&
     (nextHoop.z-sent.z)*nextHoop.d>.2;
   const approach=distance(pos,{x:hoop.x,z:hoop.z-direction*1.4});
   const value=(pos.candidate?1200:0)+(ready?350:0)+(ready&&pioneer?95:0)
     +threat(pos,hoop,direction,result.balls)*110-approach*16
     -80*leaveRisk(striker,result.balls,posts,targets);
   return {ready,pioneer,value};
 }
 const steps=lookAhead?12:16;
 for(let k=0;k<steps;k++){
   const contactAngle=k*2*Math.PI/steps;
   const x=other.x+Math.sin(contactAngle)*.28001,z=other.z+Math.cos(contactAngle)*.28001;
   if(Math.abs(x)>=14||Math.abs(z)>=17.5||posts.some(p=>Math.hypot(x-p.x,z-p.z)<R+p.r)||
     balls.some((o,i)=>i!==striker&&i!==contactTarget&&o.entered&&!o.finished&&Math.hypot(x-o.x,z-o.z)<2*R))continue;
   const setup=balls.map((o,i)=>i===striker?{...o,x,z}:o);
   const toward=contactAngle+Math.PI;
   const offsets=lookAhead?[-.45,0,.45]:[-.65,-.3,0,.3,.65];
   for(const offset of offsets)for(const power of [.12,.16,.26,.4,.55]){
     const angle=toward+offset;
     const predicted=outcome(setup,angle,power);
     if(predicted)candidates.push({angle,power,contactAngle,type:'croquet',setup,predicted});
   }
 }
 candidates.sort((a,b)=>b.predicted.value-a.predicted.value);
 let best=null;
 for(const {setup,predicted,...candidate} of candidates.slice(0,lookAhead?3:10)){
   const {angle,power}=candidate;
   const model=shotUncertainty(power,true,level);
   let valid=1,hoops=Number(predicted.ready),pioneers=Number(predicted.ready&&predicted.pioneer);
   let total=predicted.value;
   for(const side of [-1,1]){
     const result=outcome(setup,angle+side*model.angleSD,
       power*(1+side*.8*model.speedSpread));
     if(!result){total-=600;continue}
     valid++;
     if(result.ready)hoops++;
     if(result.ready&&result.pioneer)pioneers++;
     total+=result.value;
   }
   const plan={...candidate,value:total/3,useful:valid===3&&hoops>=2,
     hoopChance:hoops/3,pioneerChance:pioneers/3};
   if(!best||plan.value>best.value)best=plan;
 }
 return best;
}

// Try loft only when something is directly in the way and a ground shot is unreliable.
export function chooseJumpShot({balls,striker,hoop,direction,posts,arches=[],level='pro'}, ground) {
  const ball=balls[striker];
  const range=distance(ball,hoop);
  if((hoop.z-ball.z)*direction<=R||range>18||ground.reliability>=.8||ground.type==='roquet')return null;
  const blockers=[...balls.filter((other,i)=>i!==striker&&other.entered)
    .map(other=>({...other,r:R})),...posts];
  const dx=hoop.x-ball.x,dz=hoop.z-ball.z;
  const blocked=blockers.some(obstacle=>{
    const along=((obstacle.x-ball.x)*dx+(obstacle.z-ball.z)*dz)/range;
    return along>.27&&along<range&&segmentDistance(obstacle,ball,hoop)<R+obstacle.r;
  });
  if(!blocked)return null;

  const angle=Math.atan2(dx,dz);
  const samples=[[0,0,0],[-1,-.7,-1],[1,.7,-1],[-.6,.85,1],[.6,-.85,1]];
  const groundWins=samples.filter(([error])=>{
    const noisyAngle=ground.angle+error*shotUncertainty(ground.power,true,level).angleSD;
    return simulate(balls,striker,noisyAngle,ground.power,posts,hoop,direction).scored===ball.side;
  }).length;
  if(groundWins>=4)return null;

  let best=null;
  const base=Math.sqrt(2*F*(range+.7))/MAX;
  for(const factor of [.8,.9,1,1.1,1.2,1.32,1.46,1.6]){
    const power=base*factor;
    if(power>.98)continue;
    const uncertainty=shotUncertainty(power,true,level,'amateur',true);
    const wins=samples.filter(([aim,pace,loft])=>jumpRunsHoop(
      {balls,striker,hoop,direction,posts,arches},
      angle+aim*uncertainty.angleSD,power*(1+pace*uncertainty.speedSpread),loft*uncertainty.loftSpread
    )).length;
    if(wins>=3&&wins>=groundWins+2&&(!best||wins/5>best.reliability)){
      best={angle,power,jump:true,type:'jump',reliability:wins/5};
    }
  }
  return best;
}

function jumpRunsHoop({balls,striker,hoop,direction,posts,arches},angle,power,loft) {
  const ball={...balls[striker],hoopRun:balls[striker].hoopRun?{...balls[striker].hoopRun}:undefined,y:R};
  const obstacles=balls.filter((other,i)=>i!==striker&&other.entered);
  const {horizontal,vertical}=launchVelocity(MAX*power,true,loft);
  ball.vx=Math.sin(angle)*horizontal;
  ball.vz=Math.cos(angle)*horizontal;
  ball.vy=vertical;
  const target={...hoop,key:hoop.key??0,direction};
  beginHoopStroke(ball,target);
  const dt=1/120;
  for(let step=0;step<960;step++){
    const previous={x:ball.x,y:ball.y,z:ball.z};
    ball.x+=ball.vx*dt;
    ball.z+=ball.vz*dt;
    const flying=airborne(ball);
    advanceFlight(ball,dt);
    const speed=Math.hypot(ball.vx,ball.vz);
    if(!flying&&speed){
      const scale=Math.max(0,1-F*dt/speed);
      ball.vx*=scale;
      ball.vz*=scale;
    }
    for(const post of posts)collideUpright(ball,post);
    for(const arch of arches)collideArch(ball,arch);
    // A clean jump must leave the other balls untouched.
    if(obstacles.some(other=>Math.hypot(ball.x-other.x,ball.y-R,ball.z-other.z)<2*R))return false;
    if(Math.abs(ball.x)>14||Math.abs(ball.z)>17.5)return false;
    trackHoopSegment(ball,previous,target);
    if(speed<.015&&!airborne(ball))return !!ball.candidate;
  }
  return false;
}
