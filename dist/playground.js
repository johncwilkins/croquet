import * as THREE from './vendor/three.module.js';
import {sprayTag, scrawlTag} from './spray-graffiti.js';
import {buildBasketballLot} from './playground-basketball.js';
import {block,beam,finish} from './playground-meshes.js';

function canvasMap(width,height,paint,repeat=true){if(typeof document==='undefined')return null;const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;paint(canvas.getContext('2d'),width,height);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;if(repeat)map.wrapS=map.wrapT=THREE.RepeatWrapping;return map;}
function random(seed=701){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function scatterPaint(c,w,h,rnd,apartment=false){const colors=['#826e59','#739082','#90565a','#919789','#a49572','#4b6662'];for(let i=0;i<(apartment?42:34);i++){const x=rnd()*w,y=apartment?(i%4?h*(.87+rnd()*.1):rnd()*h*.85):rnd()*h*.83,size=apartment?16+rnd()*55:25+rnd()*105;c.save();c.globalAlpha=.18+rnd()*.65;scrawlTag(c,x,y,size*(1.6+rnd()*3),size,colors[i%colors.length],rnd);c.restore();}
 const words=apartment?['GRAY EXPECTATION','LAFAYETTE CREW','86','STAY','LOCAL']:['GRAY EXPECTATION','LAFAYETTE CREW','RALLY','86','LOCAL','NICE WHITES'];for(const [i,word]of words.entries()){const x=(.03+rnd()*.7)*w,y=apartment?h*(.91+rnd()*.035):h*(.12+rnd()*.55),size=apartment?18+rnd()*18:24+rnd()*35;c.save();c.translate(x,y);c.rotate((rnd()-.5)*.34);c.globalAlpha=.45+rnd()*.4;sprayTag(c,word,0,0,size,colors[(i+2)%colors.length],rnd);c.restore();}
 // Old crossed-out marks and erratic fresh spray sit on top of faded tags.
 for(let i=0;i<12;i++){const x=rnd()*w,y=apartment?h*(.89+rnd()*.09):rnd()*h;c.strokeStyle=colors[i%colors.length]+'88';c.lineWidth=.6+rnd()*2;c.beginPath();c.moveTo(x,y);c.lineTo(x+40+rnd()*100,y-15+rnd()*35);c.stroke();}}
const APARTMENT_TILE={width:1536,height:1536};
function apartmentMap(){return canvasMap(APARTMENT_TILE.width,APARTMENT_TILE.height,(c,w,h)=>{const rnd=random(820);c.fillStyle='#62564a';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=17)for(let x=(y/17%2)*-32;x<w;x+=64){c.fillStyle=['#955b43','#84543f','#a46649','#7e4c3d'][Math.floor(rnd()*4)];c.fillRect(x+2,y+2,61,14);c.fillStyle='#c8ae8b18';c.fillRect(x+4,y+2,52,2);}
 for(let row=0;row<6;row++)for(let col=0;col<6;col++){const x=65+col*256,y=36+row*256;c.fillStyle='#302f2b';c.fillRect(x-8,y-10,142,194);c.fillStyle='#9a8d75';c.fillRect(x-4,y-6,134,184);const g=c.createLinearGradient(x,y,x+126,y+172);g.addColorStop(0,'#263b42');g.addColorStop(.5,'#476068');g.addColorStop(1,'#182c31');c.fillStyle=g;c.fillRect(x,y,126,172);c.fillStyle=rnd()<.2?'#d0a86966':'#baa78633';c.fillRect(x+5,y+84,116,80);c.fillStyle='#d5d1bb55';const curtain=7+rnd()*32;c.fillRect(x+9,y,curtain,169);c.fillRect(x+113-curtain,y,curtain+9,169);c.fillStyle='#26332f';c.fillRect(x+60,y,6,172);c.fillRect(x,y+80,126,7);c.fillStyle='#c9d3cc30';c.beginPath();c.moveTo(x+28,y+6);c.lineTo(x+56,y+6);c.lineTo(x+15,y+74);c.lineTo(x+5,y+74);c.fill();c.fillStyle='#b2a18a';c.fillRect(x-12,y+173,150,9);c.fillStyle='#312f2b66';c.fillRect(x-8,y+182,142,9);
 }

 // Light soot and rain streaks keep the original brick palette and silhouette.
 for(let i=0;i<95;i++){c.fillStyle=i%3?'#292a2515':'#c0ac8b13';c.fillRect(rnd()*w,rnd()*h,2+rnd()*18,25+rnd()*160);}for(let i=0;i<55;i++){const x=rnd()*w,y=Math.floor(rnd()*h/17)*17;c.strokeStyle='#b8a89340';c.lineWidth=.7;c.beginPath();c.moveTo(x,y);c.lineTo(x+30+rnd()*30,y);c.stroke();}
 });}

export function createPlayground(){
  const group=new THREE.Group();
  const asphalt=finish('#4c4b44');
  const concrete=finish('#9c9482');
  const iron=finish('#454b47');
  const brick=finish('#754c39');
  const roof=finish('#464640');
  // Keep the croquet lawn open. Paving starts outside its boundary lines.
  for(const x of [-37,37])block(group,46,.08,92,x,-.105,0,asphalt);
  for(const z of [-32,32])block(group,28,.08,29,0,-.105,z,asphalt);
  block(group,92,.07,3,0,-.02,-24.5,concrete);
  const basketball=buildBasketballLot();
  basketball.position.set(10,.27,-2);
  group.add(basketball);

  const brickMap=apartmentMap();
  function apartments(x,z,sections,angle,seed){
    const row=new THREE.Group();
    row.position.set(x,0,z);
    row.rotation.y=angle;
    group.add(row);
    const width=sections*16.2;
    const height=15;
    block(row,width,height,4,0,height/2,-2,brick);
    block(row,width+.28,.25,4.3,0,height+.125,-2,roof);

    // A separate wall texture per frontage keeps the spray patterns distinct.
    const map=canvasMap(sections*768,768,(ctx,w,h)=>{
      for(let i=0;i<sections;i++)ctx.drawImage(brickMap.image,i*768,0,768,h);
      const paint=canvasMap(w,h,(ink)=>{
        scatterPaint(ink,w,h,random(seed),true);
        // Mask each whole window in the same tile coordinates as the brick painting.
        for(let col=0;col<sections*6;col++){
          for(let row=0;row<6;row++){
            ink.clearRect((52+col*256)/2,(24+row*256)/2,154/2,200/2);
          }
        }
      },false);
      ctx.drawImage(paint.image,0,0);
    },false);
    const facade=new THREE.Mesh(new THREE.PlaneGeometry(width,height),finish('#d2caba',{map}));
    facade.position.set(0,height/2,.015);
    facade.receiveShadow=true;
    row.add(facade);
    for(let x=-width/2+5.4;x<width/2;x+=10.8){
      for(let y=4.2;y<height-1;y+=2.5){
        block(row,2.7,.12,1.15,x,y,.57,iron);
        beam(row,[x-1.3,y+.68,1.12],[x+1.3,y+.68,1.12],.024,iron);
        for(let rail=-1.24;rail<=1.25;rail+=.31)
          beam(row,[x+rail,y,1.12],[x+rail,y+.68,1.12],.015,iron);
      }
      for(const side of [-.22,.22])
        beam(row,[x+side,1.4,1.1],[x+side,13.9,1.1],.021,iron);
    }
  }
  apartments(-35,-31,2,0,412);
  apartments(-10,-31,1,0,792);
  apartments(14,-33,2,0,951);
  apartments(43,-35,1,0,1269);
  apartments(-34,-13,2,Math.PI/2,671);
  apartments(-35,20,2,Math.PI/2,1409);
  apartments(52,-14,2,-Math.PI/2,1567);
  apartments(51,19,2,-Math.PI/2,1673);
  apartments(-19,40,2,Math.PI,1801);
  apartments(14,42,2,Math.PI,1921);
  apartments(40,43,1,Math.PI,2027);

  // Low tagged retaining walls and open fence frame the grass without hiding it.
  const wallMap=canvasMap(1536,128,(ctx,w,h)=>{
    ctx.fillStyle='#8c8b80';
    ctx.fillRect(0,0,w,h);
    scatterPaint(ctx,w,h,random(628));
  },false);
  for(const x of [-12,12]){
    const wall=block(group,10,.85,.36,x,.42,-21,concrete);
    wall.receiveShadow=true;
    const mural=new THREE.Mesh(new THREE.PlaneGeometry(10,.85),finish('#fff',{map:wallMap}));
    mural.position.set(x,.42,-20.81);
    group.add(mural);
  }
  const wires=[];
  for(let z=-19;z<=18;z+=3.7)beam(group,[16,0,z],[16,2.15,z],.04,iron);
  for(const y of [.18,2.05])beam(group,[16,y,-19],[16,y,18],.025,iron);
  for(let z=-19;z<18;z+=.32){
    for(const slope of [-1,1]){
      const end=Math.max(-19,Math.min(18,z+slope*1.9));
      wires.push(16,.18,z,16,.18+Math.abs(end-z),end);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(wires,3));
  group.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#747d75',transparent:true,opacity:.37})));
  return group;
}
