import {OffsideRule, halfwayLine, penaltyPosition} from './offside.js';
import {createGamepadDriver} from './gamepad.js';
import {createMenuNavigator} from './gamepad-ui.js';
import {openingChoice,drawHumanColour} from './opening.js';
import {nextBallTargets} from './ball-targets.js';
import {heldPower,accuracyPosition,timingError,contactAngle,ACCURACY_MS,canStartPull} from './timed-swing.js';
import {initFullscreen} from './fullscreen.js';
import * as THREE from './vendor/three.module.js';
import {VARIANTS,VariantMatch} from './variants.js';
import {pullPower,wicketHeading,distanceToBoundary,shotAimTarget} from './shot-control.js';
import {launchVelocity,airborne,advanceFlight,collideUpright,collideArch,collideBalls} from './flight.js';
import {CanvasRenderer} from './fallback.js';
import {beginHoopStroke,trackHoopSegment,hoopWinner,resetHoopProgress} from './scoring.js';
import {chooseShot,chooseBreakShot,chooseCroquetShot,shotUncertainty,COMPUTER_LEVELS} from './tactics.js';
import {createGrounds} from './grounds.js';
import {createMallet,createWicket,createFlags,createPlanting,createSpectators,createWornGrass} from './details.js';
const $=id=>document.getElementById(id), scene=new THREE.Scene();
// Suppress selection/callout gestures while aiming or swinging on touchscreens.
for(const event of ['contextmenu','selectstart'])document.addEventListener(event,e=>{if(!e.target.closest('#helpdialog'))e.preventDefault()});
scene.background=new THREE.Color('#a9c4bc');scene.fog=new THREE.Fog('#a9c4bc',65,160);
let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false})}catch(e){renderer=new CanvasRenderer();console.info("Using canvas 3D fallback: WebGL unavailable")}renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;$('world').appendChild(renderer.domElement);
let renderWidth=innerWidth,renderHeight=innerHeight;
const camera=new THREE.PerspectiveCamera(43,1,.1,240);const sun=new THREE.DirectionalLight('#ffebc7',3);sun.position.set(-24,38,16);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:100});sun.shadow.bias=-.0002;scene.add(sun,new THREE.HemisphereLight('#e5f2ff','#628650',2.1));
const mat=(c,roughness=.8)=>new THREE.MeshStandardMaterial({color:c,roughness});const grass=mat('#4f8050'),white=mat('#eeece0'),wood=mat('#997448'),darkwood=mat('#56442d');
function box(w,h,d,m,x,y,z,parent=scene){const a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a}
function cyl(r,h,m,x,y,z,parent=scene){const a=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,14),m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a}
box(190,.5,190,mat('#7b9972'),0,-.42,0);const grounds=createGrounds(scene,renderer);grounds.set('english');
for(const x of [-14,14])box(.045,.025,35,white,x,.02,0);for(const z of [-17.5,17.5])box(28,.025,.045,white,0,.02,z);
// Grounds: trimmed hedges, timber railings, trees and courtside seats.
for(const x of [-21,21]){for(let z=-25;z<=25;z+=5){cyl(.1,1.4,wood,x+Math.sign(x)*2,.6,z)}for(const y of [.5,1.1])box(.11,.12,52,wood,x+Math.sign(x)*2,y,0)}
createPlanting(scene);const animateSpectators=createSpectators(scene,!(renderer instanceof CanvasRenderer));
for(const z of [-10,9]){box(1.2,.18,4,wood,-18,.85,z);box(.15,1.2,4,wood,-18.55,1.2,z);for(const dz of [-1.5,1.5]){box(.18,.8,.2,darkwood,-18,.4,z+dz)}}
const animateFlags=createFlags(scene);
let variant='golf',match=null;const hoopPos=[],posts=[],hoopMeshes=[],stakeMeshes=[],seq=[];
function setCourse(kind){for(const g of hoopMeshes){scene.remove(g);g.userData.label.remove()}for(const g of stakeMeshes)scene.remove(g);hoopPos.length=posts.length=hoopMeshes.length=stakeMeshes.length=seq.length=0;const c=VARIANTS[kind];hoopPos.push(...c.hoops);seq.push(...c.route);hoopPos.forEach(([x,z],i)=>{const colorIndex=kind==='association'?(i===4?5:i===5?4:i):i;const g=createWicket(x,z,colorIndex);for(const side of [-1,1])posts.push({x:x+side*.33,z,r:.045});scene.add(g);hoopMeshes.push(g);const label=document.createElement('span');label.className='hoop-label';$('labels').appendChild(label);g.userData.label=label});for(const p of c.stakes){const g=new THREE.Group();createWornGrass(g,0,0,.38,'peg');cyl(.075,.8,white,0,.4,0,g);['#2874ce','#c74e43','#22272b','#e6ba35'].forEach((c,i)=>cyl(.077,.12,mat(c),0,.74-i*.12,0,g));g.position.set(p.x,0,p.z);scene.add(g);stakeMeshes.push(g);posts.push({...p,r:.075,height:.8})}renderer.lastKey=''}
const ring=new THREE.Mesh(new THREE.RingGeometry(.65,.73,48),new THREE.MeshBasicMaterial({color:'#f1cc79',side:THREE.DoubleSide,transparent:true,opacity:.85}));ring.rotation.x=-Math.PI/2;ring.position.y=.035;scene.add(ring);
const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(0,.05,0),1.75,'#ffe1a0',.45,.3);scene.add(arrow);
const names=['Blue','Red','Black','Yellow'],colors=['#2375cd','#d9483e','#20262c','#e5b732'];const R=.14,F=2.2,MAX=15;
const balls=names.map((name,i)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(R,28,20),mat(colors[i],.22));mesh.castShadow=true;scene.add(mesh);return {mesh,name,x:0,z:0,vx:0,vz:0,entered:false,entry:false,candidate:false,side:i%2}});
const activeRing=new THREE.Mesh(new THREE.RingGeometry(.23,.29,40),new THREE.MeshBasicMaterial({color:'#fff6d8',side:THREE.DoubleSide}));activeRing.rotation.x=-Math.PI/2;activeRing.position.y=.027;scene.add(activeRing);
const lineGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);const line=new THREE.Line(lineGeometry,new THREE.LineDashedMaterial({color:'#fff0bc',dashSize:.22,gapSize:.16,transparent:true,opacity:.85}));scene.add(line);
const rulerGroup=new THREE.Group();scene.add(rulerGroup);const rulerTicks=[],rulerLabels=[];for(let yards=1;yards<=30;yards++){const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);const tick=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#fff2c5',transparent:true,opacity:.75}));rulerGroup.add(tick);rulerTicks.push({yards,tick});if(yards%5===0){const label=document.createElement('span');label.className='yard-label';label.textContent=yards+' yd';$('labels').appendChild(label);rulerLabels.push({yards,label})}}
function updateYardRuler(b,dx,dz,length){rulerGroup.visible=phase==='aim'&&human()&&!placing;for(const {yards,tick}of rulerTicks){tick.visible=yards<=length;const width=yards%5===0?.22:.1,a=tick.geometry.attributes.position;a.setXYZ(0,b.x+dx*yards-dz*width,.05,b.z+dz*yards+dx*width);a.setXYZ(1,b.x+dx*yards+dz*width,.05,b.z+dz*yards-dx*width);a.needsUpdate=true;tick.geometry.computeBoundingSphere()}for(const {yards,label}of rulerLabels){const v=new THREE.Vector3(b.x+dx*yards+dz*.4,.08,b.z+dz*yards-dx*.4).project(camera);label.style.display=rulerGroup.visible&&yards<=length&&v.z>0&&v.z<1?'block':'none';label.style.left=(v.x*.5+.5)*renderWidth+'px';label.style.top=(-v.y*.5+.5)*renderHeight+'px'}}
const malletDetail=createMallet(),mallet=malletDetail.group;scene.add(mallet);
let humanSide=0,humanBall=0,tossWon=false;
let difficulty='pro';try{const saved=localStorage.getItem('croquet-computer-level');if(COMPUTER_LEVELS[saved])difficulty=saved}catch{}
let playerAccuracy='pro';
try {
  const saved=localStorage.getItem('croquet-player-accuracy');
  if(saved==='amateur'||saved==='pro')playerAccuracy=saved;
} catch {}
// Eye heights in court yards, measured below the top of the player's head.
const shotEyeHeights={'five-six':1.5,'six':1.67};
let shotHeight='classic';
try {
  const saved=localStorage.getItem('croquet-shot-height');
  if(Object.hasOwn(shotEyeHeights,saved))shotHeight=saved;
} catch {}
let placementView='close',placementYaw=0,placementZoom=4.5,accuracyClickUntil=0;
let placing=false,swingStage='idle',meterStart=0,placementPointer=null;
let turn=0,point=0,scores=[0,0],mode='ai',phase='aim',angle=0,baseAngle=0,power=0,drag=null,spaceStart=0,view='wide',showRoute=false,shotAge=0,lastTime=performance.now(),aiTimer=null,audio=null,sound=false,camInit=false,scoredThisStroke=false,shotCameraAngle=0,swingStarted=0,shotDistance=9;
const coords=t=>t.x!==undefined?[t.x,t.z]:hoopPos[t.h];
const scoringHoop=()=>{const t=target(),[x,z]=coords(t);return {key:point,x,z,direction:t.d}};
const target=()=>match?match.target():seq[Math.min(point,12)],current=()=>balls[turn],human=()=>match?.individual?turn===humanBall:mode==='local'||turn%2===humanSide;
function notice(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(notice.timer);notice.timer=setTimeout(()=>$('toast').classList.remove('show'),2700)}
function beep(freq=350,length=.06){if(!sound)return;audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);g.gain.setValueAtTime(.14,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+length)}
function guideAim(courseOnly=false){shotDistance=9;const b=current();const [x,z]=coords(target()),aimTarget=courseOnly?{x,z}:shotAimTarget(balls,{x,z},match?.croquetTarget);baseAngle=angle=wicketHeading(b,aimTarget);b.aimAngle=angle;$('jump').setAttribute('aria-pressed','false');$('jump').textContent='Roll shot';$('swingfeedback').textContent='Pull back, release, then tap at center';$('aim').value=0;$('aimvalue').value='0°';shotCameraAngle=angle;$('distance').textContent=courseOnly?'Next wicket · adjust for your croquet stroke':match?.croquetTarget!==null&&match?.croquetTarget!==undefined?'Croquet · aim at '+names[match.croquetTarget]:'Yard marks show distance · choose your aim';setPower(0)}
for(const [key,rules] of Object.entries(VARIANTS)){const section=document.createElement('details'),title=document.createElement('summary');title.textContent=rules.name;section.append(title);for(const text of [rules.summary,rules.details]){const paragraph=document.createElement('p');paragraph.textContent=text;section.append(paragraph)}const limits=document.createElement('p');limits.className='note';limits.textContent='In this app: '+rules.limit;section.append(limits);const link=document.createElement('a');link.href=rules.url;link.target='_blank';link.rel='noreferrer';link.textContent='Official '+rules.name+' rules ↗';section.append(link);$('allrules').append(section)}
$('jump').onclick=()=>{if(phase!=='aim'||!human())return;const enabled=$('jump').getAttribute('aria-pressed')!=='true';$('jump').setAttribute('aria-pressed',String(enabled));$('jump').textContent=enabled?'Jump shot ↗':'Roll shot';setPower(power)};
const desktopShot=matchMedia('(pointer:fine)').matches;document.body.classList.toggle('desktop-shot',desktopShot);
$('pad').setAttribute('aria-label','Hold and pull back to set power, release, then tap when the accuracy marker reaches the center');
function setPower(p){power=Math.max(0,Math.min(1,p));$('powerfill').style.width=power*100+'%';$('powertext').textContent=power>.01?Math.round(power*100)+'% power'+($('jump').getAttribute('aria-pressed')==='true'?' · jump':' · '+(MAX*MAX*power*power/(2*F)).toFixed(1)+' yd est.'):desktopShot?'Pull left · Shift for fine power':'Pull down to set power';}
function resetMeter(){swingStage='idle';spaceStart=0;drag=null;$('pad').classList.remove('pulling','centering');$('pulltitle').textContent=desktopShot?'PULL LEFT FOR POWER':'PULL DOWN FOR POWER';$('swingfeedback').textContent='Release, then tap at center';$('pad').style.setProperty('--drift','0%');}
function cancelMeter(){resetMeter();setPower(0)}
function startMeter(now,gesture=null){if($('controllerdialog').open)return;if(phase!=='aim'||!human()||placing||$('helpdialog').open)return;if(swingStage==='accuracy'){finishMeter(now);return}if(swingStage!=='idle')return;swingStage='power';meterStart=now;drag=gesture;$('pulltitle').textContent='RELEASE TO LOCK POWER';$('swingfeedback').textContent=gesture?'Pull farther for power · ease back to reduce':'Power builds while Space is held';$('pad').classList.add('pulling');setPower(gesture?0:.025);}
function releaseMeter(now){if(swingStage!=='power')return;if(!drag)setPower(heldPower(now-meterStart));if(power<.025){cancelMeter();return}drag=null;swingStage='accuracy';$('pad').classList.add('centering');meterStart=now;$('pulltitle').textContent='TAP AT CENTER';$('swingfeedback').textContent='Center band = most accurate shot';$('pad').style.setProperty('--drift','50%');}
function finishMeter(now){if(swingStage!=='accuracy')return;const position=accuracyPosition(now-meterStart),error=timingError(position);resetMeter();strike(angle+error,power,$('jump').getAttribute('aria-pressed')==='true');}
function updateBallTargets(){const panel=$('placementtargets');panel.hidden=!placing;panel.replaceChildren();if(!placing||!match)return;const targets=nextBallTargets(match,balls);for(const entry of targets){const item=document.createElement('div'),dot=document.createElement('i'),name=document.createElement('b'),label=document.createElement('span');dot.className='target-ball-dot';dot.style.background=colors[entry.index];name.textContent=entry.name;label.textContent=entry.label;item.append(dot,name,label);item.className='ball-target-row';panel.append(item);}for(const [i,g]of hoopMeshes.entries()){const entries=targets.filter(e=>!e.finished&&e.target.h===i);if(!entries.length)continue;const group=document.createElement('span');group.className='wicket-ball-targets';for(const entry of entries){const tag=document.createElement('span');tag.className='wicket-ball-tag';tag.style.background=colors[entry.index];tag.style.color=entry.index===3?'#172b26':'#fff';tag.textContent=entry.name+(entry.target.d<0?' ↑':' ↓');group.append(tag)}g.userData.label.append(group);}}
function updatePlacementUI(){updateBallTargets();const contact=match?.croquetTarget!==null&&match?.croquetTarget!==undefined&&human();document.body.classList.toggle('placing',placing);grounds.setShotView(placing?placementView==='close':view==='shotview');$('contactcontrols').hidden=!contact||phase!=='aim';$('contactangle').hidden=!placing;$('placeconfirm').hidden=!placing;$('placeedit').hidden=!contact||placing;$('placeconfirm').disabled=placing&&!croquetPositionValid();$('pad').setAttribute('aria-disabled',String(placing||phase!=='aim'||!human()));$('placementviews').hidden=!placing;$('placementorbit').hidden=!placing||placementView!=='close';for(const id of ['close','wide','overhead'])$('place'+id).setAttribute('aria-pressed',String(placementView===id));if(placing){$('shotheading').textContent='Place your ball';$('hint').textContent='Tap or drag around '+names[match.croquetTarget]+', or use the slider. Use Court or Overhead for context, then Close to position and confirm.';$('contactvalid').textContent=croquetPositionValid()?'Place '+current().name+' around '+names[match.croquetTarget]:'Blocked — choose another side';$('status').textContent='Place '+current().name+' · no stroke yet';}}
function positionContact(a){if(!placing)return;match.placeCroquet(a);$('contactangle').value=a*180/Math.PI;guideAim();updateUI();}
$('placeconfirm').onclick=()=>{if(!placing||!croquetPositionValid())return;placing=false;view='shotview';guideAim(true);for(const id of ['wide','shotview','overhead'])$(id).classList.toggle('active',id===view);updateUI();};
$('placeedit').onclick=()=>{if(phase!=='aim'||!human()||swingStage!=='idle')return;placing=true;placementView='close';cancelMeter();updateUI();};
function updateUI(){$('difficulty').hidden=mode==='local'&&!match;const b=current(),t=target();malletDetail.setColor(turn);renderer.lastKey='';$('you').textContent=scores[humanSide];$('them').textContent=scores[1-humanSide];$('hoopcount').textContent='HOOP '+String(Math.min(point+1,13)).padStart(2,'0')+' / 13';$('targetname').textContent=String(point+1).padStart(2,'0')+' · Hoop '+(t.h+1);$('ballbadge').style.background=`radial-gradient(circle at 28% 22%,white -90%,${colors[turn]} 55%,#172b26 180%)`;$('turntitle').textContent=point===0?'MAKE YOUR OPENING SHOT':'CONTESTING HOOP '+(point+1);$('status').textContent=phase==='over'?(scores[0]>=7?'Blue & Black win':'Red & Yellow win'):phase==='offside'?'Resolve the offside ball':phase==='moving'?b.name+' is rolling…':(human()?(mode==='local'?(b.side?'Red & Yellow':'Blue & Black'):'Your turn'):phase==='toss'?'Opening coin toss':'Computer thinking')+' · '+b.name+' ball';$('shotheading').textContent=phase==='over'?'A game well played.':human()?(point===0?'A good game starts here.':'Make this one count.'):'The opposition is lining up.';$('hint').textContent=phase==='over'?'Start a new game for another round.':human()?(view==='shotview'?'Tap ahead to aim. Camera stays fixed; tap Shot view to recenter.':'Aim on the lawn. Pull back for power, release, then tap at center.'):'Watch the play. Your next ball follows in colour order.';$('pad').style.opacity=phase==='aim'&&human()?1:.5;hoopMeshes.forEach((g,i)=>{g.userData.label.className='hoop-label'+(i===t.h?' target':'');g.userData.label.textContent=i===t.h?'HOOP '+(point+1):i+1;g.userData.label.style.display=i===t.h||showRoute||placing?'block':'none'});if(match)updateVariantUI();const [x,z]=coords(t);ring.position.set(x,.035,z);arrow.position.set(x,.06,z-t.d*.95);arrow.setDirection(new THREE.Vector3(0,0,t.d||1));arrow.visible=!t.stake;updatePlacementUI();}
function croquetPositionValid(){const b=current();return Math.abs(b.x)<14&&Math.abs(b.z)<17.5&&!posts.some(p=>Math.hypot(b.x-p.x,b.z-p.z)<R+p.r-.00001)&&!balls.some((o,i)=>i!==turn&&i!==match.croquetTarget&&o.entered&&!o.finished&&Math.hypot(o.x-b.x,o.z-b.z)<R*2-.00001)}
function updateVariantUI(){const b=current(),t=target(),c=VARIANTS[variant];scores=match.scores();$('you').textContent=scores[match.individual?humanBall:humanSide];$('them').textContent=match.individual?scores.map((score,i)=>i===humanBall?null:names[i]+' '+score).filter(Boolean).join(' · '):scores[1-humanSide];$('hoopcount').textContent=match.individual?'YOUR COURSE '+scores[humanBall]+' / '+c.route.length:scores[0]+' – '+scores[1]+' / '+c.goal;const label=t.stake?(variant==='association'?'CENTRE PEG':t.stake==='turning'?'TURNING STAKE':'FINISH STAKE'):'HOOP '+(t.h+1)+' · '+(b.progress+1)+' / '+c.route.length;$('targetname').textContent=b.name+' · '+label;$('turntitle').textContent=c.short+' · '+label;$('status').textContent=phase==='over'?(match.individual?names[match.winner]+' wins!':'Match complete'):phase==='moving'?b.name+' is rolling…':(human()?'Your turn':'Computer turn')+' · '+b.name+' · '+(match.croquetTarget!==null?'Croquet stroke':match.strokes+' shot'+(match.strokes>1?'s':''));$('shotheading').textContent=phase==='over'?'A game well played.':match.croquetTarget!==null?'Send '+names[match.croquetTarget]+' away.':match.strokes>1?'Keep the break going.':'Make this one count.';$('ballchoices').hidden=!(match.chooseBall&&human());$('contactcontrols').hidden=!(match.croquetTarget!==null&&human());if(match.croquetTarget!==null)$('contactvalid').textContent='Position around '+names[match.croquetTarget];$('choosefirst').textContent=b.side?'Red':'Blue';$('choosesecond').textContent=b.side?'Yellow':'Black';$('choosefirst').disabled=balls[b.side].finished;$('choosesecond').disabled=(balls[b.side+2]?.finished??true);$('ballprogress').hidden=false;$('ballprogress').textContent=balls.filter((o,i)=>!match.individual||i<match.playerCount).map(o=>o.name+': '+o.progress+'/'+c.route.length+(o.finished?' ✓':'')).join(' · ');$('hint').textContent=match.croquetTarget!==null?'Rotate around '+names[match.croquetTarget]+'. Aim starts at that ball; strike to move both balls.':match.chooseBall&&human()?'Choose either ball of your side, then aim and strike.':(view==='shotview'?'Tap ahead to aim. Tap Shot view again to recenter.':'Aim on the lawn. Read the yard marks; set your own power.');hoopMeshes.forEach((g,i)=>{g.userData.label.className='hoop-label'+(i===t.h?' target':'');g.userData.label.textContent=i===t.h?b.name.toUpperCase()+' · HOOP '+(i+1):i+1;g.userData.label.style.display=i===t.h||showRoute||placing?'block':'none'});}
$('contactangle').oninput=()=>positionContact(Number($('contactangle').value)*Math.PI/180);
for(const [id,offset]of [['choosefirst',0],['choosesecond',2]])$(id).onclick=()=>{if(match?.selectBall(current().side+offset)){turn=match.turn;guideAim();updateUI()}};
function beginTurn(){if(phase==='over')return;placementView='close';placementYaw=0;placementZoom=4.5;$('placeorbit').value=0;$('placezoom').value=4.5;cancelMeter();placing=false;phase='aim';if(match)turn=match.turn;let b=current();if(b.offsidePenalty){
  const position=penaltyPosition(b.offsidePenalty,balls.filter(o=>o!==b&&onCourt(o)),R);
  Object.assign(b,position);
  delete b.offsidePenalty;
  resetHoopProgress(b);
  notice(b.name+' plays from the penalty area.');
}if(match?.chooseBall&&!human()){const choices=balls.map((b,i)=>({b,i})).filter(o=>o.b.side!==humanSide&&!o.b.finished);choices.sort((a,b)=>Math.hypot(a.b.x-match.target(a.i).x,a.b.z-match.target(a.i).z)-Math.hypot(b.b.x-match.target(b.i).x,b.b.z-match.target(b.i).z));if(choices[0]){match.selectBall(choices[0].i);turn=match.turn;b=current()}}if(!b.entered){const pos=match?match.startPosition():{x:13.35,z:16.85};b.x=pos.x;b.z=pos.z;b.entered=true}if(match?.croquetTarget!==null&&match?.croquetTarget!==undefined){const o=balls[match.croquetTarget],t=match.target();const a=Math.atan2(o.x-t.x,o.z-t.z);$('contactangle').value=a*180/Math.PI;match.placeCroquet(a);if(!croquetPositionValid()){for(let k=0;k<72;k++){const alternative=a+k*Math.PI/36;match.placeCroquet(alternative);if(croquetPositionValid()){$('contactangle').value=((alternative*180/Math.PI+540)%360)-180;break}}}}placing=human()&&match?.croquetTarget!==null&&match?.croquetTarget!==undefined;guideAim();updateUI();if(!human())aiTimer=setTimeout(aiShot,1200)}
function reset(){endMouseOrbit();clearTimeout(aiTimer);offsideRule=new OffsideRule();offsideQueue=[];$('offsidedialog').close();humanSide=0;humanBall=0;grounds.randomizeLawn();setCourse(variant);if(variant!=='golf')mode='ai';$('mode').value=mode;$('mode').hidden=variant!=='golf';$('players').hidden=variant==='golf';balls.forEach((b,i)=>b.side=i%2);turn=0;point=0;scores=[0,0];balls.forEach(b=>{b.x=13.35;b.z=16.85;b.vx=b.vz=b.vy=0;b.y=R;b.entered=false;b.finished=false;b.progress=0;delete b.aimAngle;delete b.offsidePenalty;resetHoopProgress(b)});match=variant==='golf'?null:new VariantMatch(variant,balls,Number($('players').value));document.body.classList.toggle('multiplayer',!!match?.individual);$('opponentlabel').textContent=match?.individual?'COMPUTERS':mode==='local'?'PLAYER 2':'COMPUTER';$('goaltext').textContent=variant==='golf'?'FIRST TO 7':match?.individual?'FIRST TO '+match.config.route.length:'BOTH BALLS HOME';$('footerlabel').textContent=VARIANTS[variant].short+' · 3D CLUB EDITION';$('ruleSummary').textContent=VARIANTS[variant].summary;$('ruleDetails').textContent=VARIANTS[variant].details;$('ruleLimit').textContent='Larger balls and wider hoops for touch play. '+VARIANTS[variant].limit;$('ruleLink').href=VARIANTS[variant].url;$('ruleLink').textContent=VARIANTS[variant].name+' · Official rules ↗';$('ballprogress').hidden=variant==='golf';$('contactcontrols').hidden=true;$('ballchoices').hidden=true;phase='aim';drag=null;spaceStart=0;$('history').textContent='Choosing colours and opening order…';prepareOpening()}
function updateOwnership(){
 const owned=match?.individual?[humanBall]:[humanSide,humanSide+2];
 const first=document.querySelector('.scoreboard>div:first-child small');first.replaceChildren(document.createTextNode(mode==='local'?'PLAYER 1 ':'YOU '));
 for(const i of owned){const dot=document.createElement('i');dot.className='dot';dot.style.background=colors[i];first.append(dot)}
 $('opponentlabel').textContent=match?.individual?'COMPUTERS':mode==='local'?'PLAYER 2':'COMPUTER';
 for(const i of balls.map((_,i)=>i).filter(i=>!owned.includes(i)&&(!match?.individual||i<match.playerCount))){const dot=document.createElement('i');dot.className='dot';dot.style.background=colors[i];$('opponentlabel').append(dot)}
}
function startOpening(result,message){humanSide=result.humanSide;humanBall=result.humanBall??humanSide;turn=result.firstSide??0;if(match)match.turn=turn;phase='aim';$('tossdialog').close();updateOwnership();$('history').textContent=message+' '+names[turn]+' plays first.';beginTurn();}
function prepareOpening(){phase='toss';placing=false;cancelMeter();updateUI();
 if(match?.individual){const colour=drawHumanColour(match.playerCount);$('tosstitle').textContent='Colours drawn by lot';$('tosstext').textContent='You drew '+names[colour]+'. The other colours belong to the computers; Blue plays first.';$('tosschoices').hidden=true;$('tosscontinue').hidden=false;$('tosscontinue').onclick=()=>startOpening({humanSide:colour,humanBall:colour,firstSide:0},'Colours drawn: you play '+names[colour]+'.');}
 else{tossWon=Math.random()<.5;const opponent=mode==='local'?'Player 2':'Computer';const association=variant==='association';$('tosstitle').textContent=tossWon?(mode==='local'?'Player 1 won the coin toss':'You won the coin toss'):opponent+' won the coin toss';
 $('tosstext').textContent=association?(tossWon?'Choose the lead or your colours. The other side gets the remaining choice.':opponent+' chooses to play first. You choose your colours.'):(tossWon?'Choose your colours. Blue & Black play first; Red & Yellow follow.':opponent+' chooses Blue & Black. You play Red & Yellow. Blue starts.');
 $('tosschoices').hidden=!tossWon&&!association;$('tosscontinue').hidden=tossWon||association;
 $('tossfirst').hidden=$('tosssecond').hidden=!association||!tossWon;
 $('tosscontinue').onclick=()=>startOpening(openingChoice(variant,false,'red'),'Coin toss: computer chooses Blue & Black.');
 }
 $('tossdialog').showModal();}
for(const [id,choice]of [['tossfirst','first'],['tosssecond','second'],['tossblue','blue'],['tossred','red']])$(id).onclick=()=>{const result=openingChoice(variant,tossWon,choice),team=result.humanSide?'Red & Yellow':'Blue & Black';startOpening(result,'Coin toss: you play '+team+'.');};
$('tossdialog').addEventListener('cancel',e=>e.preventDefault());
function strike(a,p,jump=false){if(phase!=='aim'||placing||p<.025)return;if(match?.croquetTarget!==null&&match?.croquetTarget!==undefined&&!croquetPositionValid()){notice('Rotate the contact position clear of obstacles.');return}endMouseOrbit();if(match)match.beginStroke();else offsideRule.begin(current());angle=a;setPower(p);phase='swing';swingStarted=performance.now();const b=current();shotAge=0;scoredThisStroke=false;balls.forEach(b=>{if(!match)beginHoopStroke(b,scoringHoop());b.grain=Math.random()*Math.PI*2;b.rollBias=(Math.random()-.5)*.026;const [tx,tz]=coords(target());b.startDist=Math.hypot(b.x-tx,b.z-tz)});updateUI();setTimeout(()=>{if(phase!=='swing')return;const uncertainty=shotUncertainty(p,!human(),difficulty,playerAccuracy),normal=Math.sqrt(-2*Math.log(Math.max(.0001,Math.random())))*Math.cos(2*Math.PI*Math.random()),actualAngle=a+normal*uncertainty.angleSD,speed=MAX*p*(1+(Math.random()*2-1)*uncertainty.speedSpread);const launch=launchVelocity(speed,jump);b.vx=Math.sin(actualAngle)*launch.horizontal;b.vz=Math.cos(actualAngle)*launch.horizontal;b.y=R;b.vy=launch.vertical;phase='moving';beep(150,.1);updateUI()},200)}
function aiShot(){if($('controllerdialog').open||$('helpdialog').open){aiTimer=setTimeout(aiShot,250);return}if(phase!=='aim'||human())return;const t=target(),[x,z]=coords(t),state={balls:balls.map(b=>({x:b.x,z:b.z,entered:onCourt(b),finished:b.finished,side:b.side,hoopRun:b.hoopRun?{...b.hoopRun}:undefined})),striker:turn,hoop:{key:point,x,z},direction:t.d,posts,dead:match?[...match.dead]:[]};
 if(match?.croquetTarget!==null&&match?.croquetTarget!==undefined){const choice=chooseCroquetShot({...state,contactTarget:match.croquetTarget});if(choice){match.placeCroquet(choice.contactAngle);$('contactangle').value=choice.contactAngle*180/Math.PI;guideAim();$('history').textContent='Computer takes croquet and sets up its next shot.';strike(choice.angle,choice.power);return}const o=balls[match.croquetTarget];strike(Math.atan2(o.x-current().x,o.z-current().z),.15);return}
 if(t.stake){const d=Math.hypot(x-current().x,z-current().z);strike(Math.atan2(x-current().x,z-current().z),Math.min(.95,Math.sqrt(2*F*(d+.7))/MAX));return}
 const choice=variant==='association'?chooseBreakShot(state):chooseShot(state);const descriptions={hoop:'Computer attempts the hoop',roquet:'Computer roquets a live ball to build a break',clearance:'Computer lines up a clearance',block:'Computer plays a blocking shot',approach:'Computer sets up for the hoop'};$('history').textContent=descriptions[choice.type]+'.';strike(choice.angle,choice.power)}
function grassInfluence(b,v){const wave=Math.sin(b.x*.67+b.z*.41+(b.grain||0));return {drag:1+(b.rollBias||0)+.012*wave,curve:.0024*Math.sin(b.x*.43-b.z*.59+(b.grain||0))*Math.min(1,v/2)}}
function collidePost(b,p){if(collideUpright(b,p)){if(match&&p.id)match.recordStake(balls.indexOf(b),p.id);beep(460,.025)}}
function physics(dt){const h=match?null:scoringHoop(),previous=balls.map(b=>({x:b.x,y:b.y??R,z:b.z}));for(const b of balls){if(!onCourt(b))continue;const px=b.x,pz=b.z;b.x+=b.vx*dt;b.z+=b.vz*dt;const flying=airborne(b);advanceFlight(b,dt);const v=Math.hypot(b.vx,b.vz),grain=grassInfluence(b,v),nv=Math.max(0,v-(flying?0:F*grain.drag*dt));if(v){const a=flying?0:grain.curve*dt,co=Math.cos(a),si=Math.sin(a),vx=b.vx;b.vx=(vx*co-b.vz*si)*nv/v;b.vz=(vx*si+b.vz*co)*nv/v}for(const p of posts)collidePost(b,p);for(const [x,z]of hoopPos)collideArch(b,{x,z});
if(Math.abs(b.x)>14||Math.abs(b.z)>17.5){if(match)match.recordOut(balls.indexOf(b));const u=Math.min(Math.abs(b.x)>14?(14-Math.abs(px))/(Math.abs(b.x)-Math.abs(px)):1,Math.abs(b.z)>17.5?(17.5-Math.abs(pz))/(Math.abs(b.z)-Math.abs(pz)):1);b.x=THREE.MathUtils.clamp(px+(b.x-px)*u,-14,14);b.z=THREE.MathUtils.clamp(pz+(b.z-pz)*u,-17.5,17.5);b.vx=b.vz=0}}
for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=balls[i],b=balls[j];if(!onCourt(a)||!onCourt(b))continue;
if(!match&&Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<=2*R)offsideRule.contact(a,b);
const impact=collideBalls(a,b);if(impact>0){if(match)match.recordContact(i,j);if(impact>.2)beep(600,.035)}}
// Include the final positions from both post and ball collisions in scoring.
if(match)match.track(previous);else balls.forEach((b,i)=>{
  if(!onCourt(b))return;
  const start=previous[i];
  if(b.x!==start.x||b.y!==start.y||b.z!==start.z)offsideRule.moved.add(b);
  trackHoopSegment(b,start,h);
});}

function finishShot(){if(match){const result=match.finishStroke();scores=result.scores;point=balls[match.turn].progress;turn=match.turn;$('history').textContent=match.message;setPower(0);if(result.over){phase='over';updateUI();notice(match.individual?names[match.winner]+' wins with '+scores[match.winner]+' points!':(match.winner?'Red & Yellow':'Blue & Black')+' win '+scores[match.winner]+' – '+scores[1-match.winner]);return}beginTurn();return}const winner=hoopWinner(balls);const offside=offsideRule.finish(balls,winner?halfwayLine(point,hoopPos,seq):null,R);if(winner){const b=winner;scores[b.side]++;point++;const txt=b.name+' scores hoop '+point+'!';$('history').textContent=txt+' '+scores[0]+' – '+scores[1]+'.';notice(txt);beep(760,.25);if(scores[b.side]>=7){phase='over';updateUI();notice((b.side?'Red & Yellow':'Blue & Black')+' win '+scores[b.side]+' – '+scores[1-b.side]);return}}else{const inJaws=balls.some(b=>b.entered&&b.hoopRun?.key===point&&b.hoopRun.crossed&&!b.candidate);$('history').textContent=inJaws?'Ball still in the hoop: not fully clear yet.':current().name+' played. '+names[(turn+1)%4]+' is next.'}turn=(turn+1)%4;setPower(0);
if(offside.length){
  offsideQueue=offside;
  phase='offside';
  updateUI();
  resolveOffside();
}else beginTurn();
}

let offsideRule=new OffsideRule();
let offsideQueue=[];
const onCourt=ball=>ball.entered&&!ball.finished&&!ball.offsidePenalty;

function resolveOffside(){
  while(offsideQueue.length){
    const ball=offsideQueue[0];
    if(mode==='local'||ball.side!==humanSide){
      $('offsidetext').textContent=ball.name+' was beyond the halfway line. '+(ball.side?'Blue & Black':'Red & Yellow')+' choose where it plays its next stroke.';
      $('offsidedialog').showModal();
      return;
    }
    const [x]=coords(target());
    applyOffsideDirection(x>=0?-1:1);
  }
  beginTurn();
}

function applyOffsideDirection(side){
  const ball=offsideQueue.shift();
  if(!ball||!side)return;
  ball.offsidePenalty=side;
  resetHoopProgress(ball);
  const message=ball.name+' offside · '+(side<0?'west':'east')+' penalty area.';
  $('history').textContent+=' '+message;
  notice(message);
}

for(const [button,side] of [['offsidewest',-1],['offsideeast',1],['offsideleave',0]]){
  $(button).onclick=()=>{
    $('offsidedialog').close();
    controllerMenus.clear();
    applyOffsideDirection(side);
    resolveOffside();
  };
}
$('offsidedialog').addEventListener('cancel',event=>event.preventDefault());

const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
function aimAt(e){if($('controllerdialog').open)return;if(phase!=='aim'||!human()||swingStage!=='idle')return;const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(mouse,camera);if(ray.ray.intersectPlane(plane,hit)){if(placing){positionContact(contactAngle(balls[match.croquetTarget],hit));return}const b=current();angle=baseAngle=Math.atan2(hit.x-b.x,hit.z-b.z);$('aim').value=0;b.aimAngle=angle;$('aimvalue').value='0°';$('distance').textContent=Math.hypot(hit.x-b.x,hit.z-b.z).toFixed(1)+' yd to aim point'}}
let mouseOrbit=null;
const lawnCanvas=renderer.domElement;

function endMouseOrbit(){
  if(!mouseOrbit)return;
  const {pointerId}=mouseOrbit;
  mouseOrbit=null;
  if(lawnCanvas.hasPointerCapture(pointerId))lawnCanvas.releasePointerCapture(pointerId);
  camInit=false;
}

lawnCanvas.addEventListener('pointerdown',event=>{
  if(event.button===1){
    event.preventDefault();
    if(phase!=='aim'||!human()||swingStage!=='idle')return;
    mouseOrbit={pointerId:event.pointerId,x:event.clientX,y:event.clientY,yaw:0,pitch:0};
    lawnCanvas.setPointerCapture(event.pointerId);
    return;
  }
  if(event.button!==0||mouseOrbit)return;
  if(placing){
    placementPointer=event.pointerId;
    lawnCanvas.setPointerCapture(event.pointerId);
  }
  aimAt(event);
});

lawnCanvas.addEventListener('pointermove',event=>{
  if(mouseOrbit){
    if(mouseOrbit.pointerId!==event.pointerId)return;
    if(!(event.buttons&4)){
      endMouseOrbit();
      return;
    }
    mouseOrbit.yaw+=(event.clientX-mouseOrbit.x)*.009;
    mouseOrbit.pitch=THREE.MathUtils.clamp(mouseOrbit.pitch+(mouseOrbit.y-event.clientY)*.006,-.45,.55);
    mouseOrbit.x=event.clientX;
    mouseOrbit.y=event.clientY;
    return;
  }
  if(event.buttons===1||placementPointer===event.pointerId)aimAt(event);
});

for(const type of ['pointerup','pointercancel','lostpointercapture']){
  lawnCanvas.addEventListener(type,event=>{
    if(mouseOrbit?.pointerId===event.pointerId)endMouseOrbit();
    if(placementPointer===event.pointerId)placementPointer=null;
  });
}
lawnCanvas.addEventListener('mousedown',event=>{
  if(event.button===1)event.preventDefault();
});
lawnCanvas.addEventListener('auxclick',event=>{
  if(event.button===1)event.preventDefault();
});
window.addEventListener('mouseup',event=>{
  if(event.button===1)endMouseOrbit();
});
window.addEventListener('blur',endMouseOrbit);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)endMouseOrbit();
});
$('aim').oninput=()=>{if(placing||swingStage!=='idle')return;angle=baseAngle+Number($('aim').value)*Math.PI/180;current().aimAngle=angle;$('aimvalue').value=Number($('aim').value).toFixed(1)+'°'};
// Capture the centering click before fine-aim inputs or other controls receive it.
function centerFromAnywhere(e){if(swingStage!=='accuracy'||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();accuracyClickUntil=performance.now()+700;finishMeter(performance.now());}
document.addEventListener('pointerdown',centerFromAnywhere,true);
document.addEventListener('click',e=>{if(performance.now()<accuracyClickUntil){e.preventDefault();e.stopImmediatePropagation();accuracyClickUntil=0}},true);
$('pad').addEventListener('pointerdown',e=>{if(e.button!==0||phase!=='aim'||!human()||placing||swingStage!=='idle')return;e.preventDefault();const rect=$('pad').getBoundingClientRect(),desktop=e.pointerType!=='touch';if(!canStartPull(e.clientX,rect,desktop)){$('swingfeedback').textContent='Start in the highlighted zone on the right';return}$('pad').setPointerCapture(e.pointerId);startMeter(performance.now(),{x:e.clientX,y:e.clientY,desktop,viewportHeight:innerHeight,power:0,previous:0,pointerId:e.pointerId,pullPixels:Math.max(90,Math.min(320,e.clientX-rect.left-12))});});
function updatePull(e){if(swingStage!=='power'||!drag||e.pointerId!==drag.pointerId)return;setPower(pullPower(drag,e));drag.power=power;drag.previous=drag.desktop?drag.x-e.clientX:e.clientY-drag.y;}
$('pad').addEventListener('pointermove',updatePull);
$('pad').addEventListener('pointerup',e=>{if(drag&&e.pointerId!==drag.pointerId)return;updatePull(e);releaseMeter(performance.now())});
$('pad').addEventListener('pointercancel',cancelMeter);
window.addEventListener('keydown',e=>{if($('helpdialog').open||$('tossdialog').open||$('controllerdialog').open||/INPUT|SELECT|BUTTON/.test(document.activeElement.tagName))return;if(e.code==='Escape'){cancelMeter();return}if(e.code==='Space'){e.preventDefault();if(!e.repeat)startMeter(performance.now())}if(['ArrowLeft','ArrowRight'].includes(e.code)&&phase==='aim'&&human()&&!placing&&swingStage==='idle'){e.preventDefault();angle+=(e.code==='ArrowLeft'?1:-1)*.005;baseAngle=angle;current().aimAngle=angle;$('aim').value=0}});
window.addEventListener('keyup',e=>{if(e.code==='Space'){e.preventDefault();releaseMeter(performance.now())}});
$('pad').addEventListener('keydown',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();e.stopPropagation();if(!e.repeat)startMeter(performance.now())}});
$('pad').addEventListener('keyup',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();e.stopPropagation();releaseMeter(performance.now())}});
window.addEventListener('blur',cancelMeter);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelMeter()});
function setPlacementView(id){placementView=id;placementPointer=null;updateUI();}
for(const id of ['close','wide','overhead'])$('place'+id).onclick=()=>setPlacementView(id);
$('placeorbit').oninput=()=>{placementYaw=Number($('placeorbit').value)*Math.PI/180};
$('difficulty').value=difficulty;$('difficulty').onchange=()=>{difficulty=$('difficulty').value;try{localStorage.setItem('croquet-computer-level',difficulty)}catch{}notice(COMPUTER_LEVELS[difficulty].name+' computer · next shot');};
$('placezoom').oninput=()=>{placementZoom=Number($('placezoom').value)};
function zoomPlacement(e){if(!placing)return;e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?renderHeight:1);if(placementView!=='close'){placementZoom=18;setPlacementView('close')}placementZoom=Math.max(3,Math.min(32,placementZoom*Math.exp(Math.max(-120,Math.min(120,delta))*.0025)));$('placezoom').value=placementZoom;}
renderer.domElement.addEventListener('wheel',zoomPlacement,{passive:false});
for(const id of ['wide','shotview','overhead'])$(id).onclick=()=>{if(placing){setPlacementView(id==='shotview'?'close':id);return}view=id;grounds.setShotView(id==='shotview');shotCameraAngle=angle;updateUI();for(const v of ['wide','shotview','overhead'])$(v).classList.toggle('active',v===id)};$('route').onclick=()=>{showRoute=!showRoute;$('route').classList.toggle('active',showRoute);updateUI()};$('setting').onchange=()=>{grounds.set($('setting').value);$('courtname').textContent=grounds.settings[$('setting').value].title;notice(grounds.settings[$('setting').value].title)};$('variant').onchange=()=>{variant=$('variant').value;reset();notice('New game · '+VARIANTS[variant].name)};$('help').onclick=()=>{cancelMeter();$('helpdialog').showModal()};$('closehelp').onclick=$('start').onclick=()=>$('helpdialog').close();$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'Sound on':'Sound off';beep()};$('restart').onclick=()=>{if(confirm('Start a new game? Current scores will be cleared.'))reset()};$('players').onchange=()=>{mode='ai';reset();notice($('players').value+' players · drawing colours')};$('mode').onchange=()=>{mode=$('mode').value;$('opponentlabel').innerHTML=(mode==='ai'?'COMPUTER':'PLAYER 2')+' <i class="dot red"></i><i class="dot yellow"></i>';reset()};
let controllerConnected=false;
const controllerMenus=createMenuNavigator();
const controllerFields=[['gpvariant','variant'],['gpplayers','players'],['gpmode','mode'],['gpdifficulty','difficulty'],['gpsetting','setting']];
function controllerFieldState(){$('gpplayers').disabled=$('gpvariant').value==='golf';$('gpmode').disabled=$('gpvariant').value!=='golf'}
function openControllerMenu(){if($('offsidedialog').open)return;if($('tossdialog').open){notice('Choose your opening colours first.');return}cancelMeter();if($('controllerdialog').open){$('controllerdialog').close();controllerMenus.clear();return}if($('helpdialog').open)$('helpdialog').close();for(const [dest,source]of controllerFields){$(dest).replaceChildren(...Array.from($(source).options).map(o=>o.cloneNode(true)));$(dest).value=$(source).value}controllerFieldState();$('gpaccuracy').value=playerAccuracy;$('gpshotheight').value=shotHeight;$('controllerdialog').showModal();controllerMenus.clear();}
function closeControllerMenu(){$('controllerdialog').close();controllerMenus.clear();}
$('controlleropen').onclick=openControllerMenu;$('controllerclose').onclick=$('gpreturn').onclick=closeControllerMenu;$('gpvariant').onchange=controllerFieldState;
function applyControllerSettings(forceNew=false){const nextVariant=$('gpvariant').value,nextPlayers=$('gpplayers').value,nextMode=nextVariant==='golf'?$('gpmode').value:'ai',restart=forceNew||variant!==nextVariant||mode!==nextMode||(nextVariant!=='golf'&&$('players').value!==nextPlayers);closeControllerMenu();playerAccuracy=$('gpaccuracy').value;
shotHeight=$('gpshotheight').value;
try {
  localStorage.setItem('croquet-player-accuracy',playerAccuracy);
  localStorage.setItem('croquet-shot-height',shotHeight);
} catch {}
$('difficulty').value=$('gpdifficulty').value;$('difficulty').onchange();$('setting').value=$('gpsetting').value;$('setting').onchange();if(restart){variant=nextVariant;mode=nextMode;$('variant').value=variant;$('players').value=nextPlayers;$('mode').value=mode;reset()}else updateUI();}
$('gpapply').onclick=()=>applyControllerSettings(false);$('gpnew').onclick=()=>applyControllerSettings(true);
$('gphelp').onclick=()=>{closeControllerMenu();$('help').click()};$('gpfull').onclick=()=>$('fullscreen').click();
function controllerHint(){if(!controllerConnected)return;const text=$('offsidedialog').open?'D-pad: choose penalty area · A: select':$('tossdialog').open||$('controllerdialog').open||$('helpdialog').open?'D-pad: move / change · A: select · B: back · right stick: scroll':placing?'LS: position ball · RS: look / zoom · A: confirm · LB/RB: views · Menu: settings':phase!=='aim'||!human()?'LB/RB: views · Menu: settings · View: Help':swingStage==='accuracy'?'Press A or RT at the centre mark · B cancels':swingStage==='power'?'Release A / RT to lock power · hold LT for finer power':match?.chooseBall?'LB / RB: choose your ball · LS: aim · A / RT: hold power':'LS: aim · LT: fine · A/RT: power → release → press at centre · X: jump · Menu: settings';if($('controllerhint').textContent!==text)$('controllerhint').textContent=text;}
function controllerView(step){const list=placing?['close','wide','overhead']:['wide','shotview','overhead'],active=placing?placementView:view,id=list[(Math.max(0,list.indexOf(active))+step+list.length)%list.length];if(placing)setPlacementView(id);else $(id).click();}
const controller=createGamepadDriver({
 getState:()=>({phase,human:human(),placing,swingStage,chooseBall:!!match?.chooseBall,modal:$('offsidedialog').open||$('tossdialog').open||$('controllerdialog').open||$('helpdialog').open}),
 readPads:()=>navigator.getGamepads?.()??[],isSuspended:()=>document.hidden||!document.hasFocus(),
 actions:{
 connected(active){controllerConnected=active;document.body.classList.toggle('gamepad-active',active);$('controllerhint').hidden=!active;$('controllerstatus').textContent=active?'Controller connected. Release buttons and centre the sticks to begin.':'Controller disconnected. Press and release a controller button to reconnect.';if(active)notice('Xbox controller connected');},
 cancel:()=>cancelMeter(),settings:openControllerMenu,
 help(){if($('offsidedialog').open||$('tossdialog').open)return;cancelMeter();closeControllerMenu();if($('helpdialog').open)$('helpdialog').close();else $('help').click();controllerMenus.clear();},
 back(){if($('offsidedialog').open)return;if($('tossdialog').open){notice('Choose your opening colours to begin.');return}if($('helpdialog').open)$('helpdialog').close();else closeControllerMenu();controllerMenus.clear();},
 menuMove:n=>controllerMenus.move(n),menuAdjust:n=>controllerMenus.adjust(n),menuAccept:()=>controllerMenus.accept(),menuScroll:n=>controllerMenus.scroll(n),
 begin(now){startMeter(now,{gamepad:true});$('swingfeedback').textContent='Release A / RT, then press again at centre';},
 power(dt){setPower(power+dt/2.6)},release:now=>releaseMeter(now),center:now=>finishMeter(now),
 aim(amount){angle+=amount*1.15;baseAngle=angle;current().aimAngle=angle;$('aim').value=0;$('aimvalue').value='0°';},
 place(amount){const degrees=((Number($('contactangle').value)+amount*90+540)%360)-180;positionContact(degrees*Math.PI/180)},
 camera(rx,ry,dt){if(placing){if(placementView!=='close'){placementZoom=18;setPlacementView('close')}placementYaw+=rx*dt*1.5;placementYaw=((placementYaw+Math.PI*3)%(Math.PI*2))-Math.PI;placementZoom=Math.max(3,Math.min(32,placementZoom*Math.exp(ry*dt)));$('placeorbit').value=placementYaw*180/Math.PI;$('placezoom').value=placementZoom;}else{if(view!=='shotview')$('shotview').click();shotCameraAngle+=rx*dt*1.3;shotDistance=Math.max(5,Math.min(18,shotDistance*Math.exp(ry*dt)));}},
 view:controllerView,chooseBall:i=>$(i?'choosesecond':'choosefirst').click(),jump:()=>$('jump').click(),
 recenter(){if(placing){placementYaw=0;placementZoom=4.5;$('placeorbit').value=0;$('placezoom').value=4.5;setPlacementView('close')}else{guideAim(true);$('shotview').click()}},
 confirmPlacement:()=>$('placeconfirm').click()
 }});
window.addEventListener('blur',()=>controller.reset());
if(!navigator.getGamepads)$('controllerstatus').textContent='This browser does not expose controller input. Use an up-to-date Edge browser and open the game directly.';
const ctx=$('map').getContext('2d');function drawMap(){const w=224,h=270;ctx.clearRect(0,0,w,h);ctx.fillStyle='#dce4d2';ctx.fillRect(16,10,192,240);ctx.strokeStyle='#728872';ctx.lineWidth=1;ctx.strokeRect(16,10,192,240);const mx=x=>112+x/28*192,mz=z=>130+z/35*240;const t=target();
if(!match&&phase!=='over'){
  const line=halfwayLine(point,hoopPos,seq);
  if(line){
    const vertical=line.axis==='x';
    ctx.beginPath();
    ctx.setLineDash([4,4]);
    ctx.strokeStyle='#80542a';
    ctx.moveTo(vertical?mx(line.value):16,vertical?10:mz(line.value));
    ctx.lineTo(vertical?mx(line.value):208,vertical?250:mz(line.value));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for(const x of [16,208]){
    ctx.beginPath();
    ctx.arc(x,130,3,0,Math.PI*2);
    ctx.fillStyle='#80542a';
    ctx.fill();
  }
}
if(showRoute){ctx.beginPath();seq.forEach((s,i)=>{const [x,z]=s.stake?(()=>{const p=VARIANTS[variant].stakes.find(p=>p.id===s.stake);return [p.x,p.z]})():hoopPos[s.h];i?ctx.lineTo(mx(x),mz(z)):ctx.moveTo(mx(x),mz(z))});ctx.strokeStyle='#899b70';ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([])}hoopPos.forEach(([x,z],i)=>{ctx.strokeStyle=i===t.h?'#bf822e':'#6a806b';ctx.lineWidth=i===t.h?3:2;ctx.beginPath();ctx.moveTo(mx(x)-6,mz(z));ctx.lineTo(mx(x)+6,mz(z));ctx.stroke();ctx.fillStyle='#4e6757';ctx.font='10px Arial';ctx.fillText(i+1,mx(x)+8,mz(z)+3)});const [hx,hz]=coords(t);ctx.strokeStyle='#bd812e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(mx(hx),mz(hz)-t.d*15);ctx.lineTo(mx(hx),mz(hz)+t.d*15);ctx.lineTo(mx(hx)-4,mz(hz)+t.d*10);ctx.moveTo(mx(hx),mz(hz)+t.d*15);ctx.lineTo(mx(hx)+4,mz(hz)+t.d*10);ctx.stroke();balls.forEach((b,i)=>{if(!onCourt(b))return;ctx.beginPath();ctx.arc(mx(b.x),mz(b.z),i===turn?4.5:3.5,0,Math.PI*2);ctx.fillStyle=colors[i];ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=1.5;ctx.stroke()});ctx.fillStyle='#61765d';ctx.beginPath();ctx.arc(112,130,2,0,7);ctx.fill()}
function resize(){const mobile=innerWidth<=680,dock=$('shotpanel')||document.querySelector('.shotpanel');const bottom=mobile||placing?innerHeight-dock.getBoundingClientRect().top+10:0;$('world').style.bottom=bottom+'px';document.querySelector('.live').style.bottom=mobile||placing?(bottom+5)+'px':'';const bounds=$('world').getBoundingClientRect();renderWidth=bounds.width;renderHeight=bounds.height;renderer.setSize(renderWidth,renderHeight);camera.aspect=renderWidth/renderHeight;camera.setViewOffset(renderWidth,renderHeight,0,innerWidth<=680||placing?0:renderHeight*.13,renderWidth,renderHeight);camera.updateProjectionMatrix()}window.addEventListener('resize',resize);new ResizeObserver(resize).observe(document.querySelector('.shotpanel'));resize();
const camGoal=new THREE.Vector3(),lookGoal=new THREE.Vector3(),look=new THREE.Vector3(0,0,2);let accumulator=0;
function frame(now){requestAnimationFrame(frame);animateFlags(now/1000);animateSpectators(now/1000);const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;controller.update(now);controllerHint();const b=current(),t=target();if(swingStage==='power'&&!drag)setPower(heldPower(now-meterStart));if(swingStage==='accuracy'){$('pad').style.setProperty('--drift',accuracyPosition(now-meterStart)*50+'%');if(now-meterStart>=ACCURACY_MS)finishMeter(now)}if(phase==='moving'){shotAge+=dt;accumulator+=dt;let n=0;while(accumulator>=1/240&&n++<16){physics(1/240);accumulator-=1/240}if(shotAge>.25&&balls.every(b=>Math.hypot(b.vx,b.vz)<.015&&!airborne(b))){balls.forEach(b=>{b.vx=b.vz=0});finishShot()}}
balls.forEach(b=>{b.mesh.visible=onCourt(b);b.mesh.position.set(b.x,b.y??R,b.z);if(b.vx||b.vz){b.mesh.rotation.x+=b.vz*dt/R;b.mesh.rotation.z-=b.vx*dt/R}});activeRing.position.set(b.x,.03,b.z);activeRing.visible=phase==='aim';const dx=Math.sin(angle),dz=Math.cos(angle),rulerLength=distanceToBoundary(b,angle);line.visible=mallet.visible=!placing&&(phase==='aim'||phase==='swing');if(line.visible){const a=line.geometry.attributes.position;a.setXYZ(0,b.x,.07,b.z);a.setXYZ(1,b.x+dx*rulerLength,.07,b.z+dz*rulerLength);a.needsUpdate=true;line.geometry.computeBoundingSphere();line.computeLineDistances();const swing=phase==='swing'?Math.min(1,(now-swingStarted)/200):0;const forward=swingStage==='accuracy'?Math.min(1,1-accuracyPosition(now-meterStart)):0;const back=phase==='swing'&&human()?.55*(1-swing)+.51*swing:(.55+power*1.7)*(1-Math.max(swing,forward))+.51*Math.max(swing,forward);mallet.position.set(b.x-dx*back,0,b.z-dz*back);mallet.rotation.y=angle;}
if(mouseOrbit||(!placing&&view==='shotview')){
  const eyeHeight=shotEyeHeights[shotHeight];
  let distance=eyeHeight?Math.max(2.5,shotDistance/3):shotDistance;
  let height=eyeHeight??shotDistance*6.5/9;
  const cameraAngle=shotCameraAngle+(mouseOrbit?.yaw??0);
  if(mouseOrbit?.pitch){
    const radius=Math.hypot(distance,height);
    const pitch=Math.max(.12,Math.atan2(height,distance)+mouseOrbit.pitch);
    distance=radius*Math.cos(pitch);
    height=radius*Math.sin(pitch);
  }
  const sx=Math.sin(cameraAngle),sz=Math.cos(cameraAngle);
  camGoal.set(b.x-sx*distance,height,b.z-sz*distance);
  lookGoal.set(b.x+sx*4,0,b.z+sz*4);
}else if(placing&&placementView==='close'){const o=balls[match.croquetTarget];camGoal.set(o.x+Math.sin(placementYaw)*placementZoom*.55,placementZoom,o.z+Math.cos(placementYaw)*placementZoom*.55);lookGoal.set(o.x,0,o.z)}else if((placing?placementView:view)==='overhead'){camGoal.set(0,innerWidth<680?65:54,5);lookGoal.set(0,0,3)}else{const mobile=innerWidth<680;camGoal.set(mobile?31:36,mobile?58:49,mobile?63:52);lookGoal.set(mobile?0:-1,0,mobile?4:3)}if(mouseOrbit||!camInit){camera.position.copy(camGoal);look.copy(lookGoal);camInit=true}else{camera.position.lerp(camGoal,1-Math.exp(-dt*3));look.lerp(lookGoal,1-Math.exp(-dt*3))}if(camera.position.distanceTo(camGoal)<.001)camera.position.copy(camGoal);if(look.distanceTo(lookGoal)<.001)look.copy(lookGoal);camera.lookAt(look);updateYardRuler(b,dx,dz,rulerLength);hoopMeshes.forEach(g=>{const v=new THREE.Vector3(g.position.x,1.3,g.position.z).project(camera);const el=g.userData.label;el.style.left=(v.x*.5+.5)*renderWidth+'px';el.style.top=(-v.y*.5+.5)*renderHeight+'px';el.style.visibility=v.z>1?'hidden':'visible'});ring.material.opacity=.65+Math.sin(now*.002)*.2;drawMap();renderer.render(scene,camera)}
initFullscreen($('fullscreen'),notice,resize);reset();requestAnimationFrame(frame);
// Small read-only state surface for verifying the simulation in a browser.
window.croquet={getState:()=>({variant,strokes:match?.strokes,croquetTarget:match?.croquetTarget,turn:names[turn],point,scores:[...scores],phase,balls:balls.map(b=>({name:b.name,x:b.x,z:b.z,entered:b.entered,progress:b.progress,finished:b.finished})),target:target()})};


