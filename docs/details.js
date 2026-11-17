import * as THREE from './vendor/three.module.js';
let seed=481;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
const colors=['#2375cd','#d9483e','#20262c','#e5b732'];
function texture(kind,color='#d7d7cb'){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle=color;c.fillRect(0,0,256,256);
 if(kind==='wood'||kind==='end'){c.fillStyle='#9d764a';c.fillRect(0,0,256,256);for(let i=0;i<130;i++){c.strokeStyle=i%3?'#39220f45':'#f8d09c70';c.lineWidth=.3+rnd()*1.5;c.beginPath();if(kind==='end'){c.ellipse(124,132,3+i*1.2,3+i*.95,.14,0,7)}else{let x=rnd()*256;c.moveTo(x,0);for(let y=0;y<=256;y+=8)c.lineTo(x+Math.sin(y*.03+i)*2,y)}c.stroke()}c.fillStyle=color+'d0';c.fillRect(0,0,256,256);for(let i=0;i<70;i++){const x=rnd()*256,y=rnd()*256;c.strokeStyle=i%4?'#d0a96eb0':'#382a1f70';c.lineWidth=.4+rnd()*2;c.beginPath();c.moveTo(x,y);c.lineTo(x+(rnd()-.5)*4,y+2+rnd()*12);c.stroke()}for(let i=0;i<12;i++){c.fillStyle='#c6a171';c.beginPath();c.ellipse(rnd()*256,rnd()>.5?rnd()*12:245+rnd()*11,2+rnd()*4,1+rnd()*3,rnd()*6,0,7);c.fill()}}
 if(kind==='iron'){for(let i=0;i<500;i++){c.fillStyle=rnd()>.5?'#ffffff12':'#5b624e15';c.fillRect(rnd()*256,rnd()*256,1+rnd()*4,1+rnd()*3)}for(let i=0;i<28;i++){const x=rnd()*256,y=rnd()*256,r=.5+rnd()*2.6;c.fillStyle='#9c683f66';c.beginPath();c.ellipse(x,y,r*1.6,r*2.2,0,0,7);c.fill();c.fillStyle='#70452f';c.fillRect(x,y,r,r*.7)}}
 if(kind==='cloth'){for(let i=0;i<256;i+=3){c.fillStyle='#ffffff18';c.fillRect(i,0,1,256);c.fillStyle='#182b2710';c.fillRect(0,i,256,1)}c.strokeStyle='#e6e0c780';c.lineWidth=2;c.strokeRect(5,5,246,246);for(let i=0;i<256;i+=7){c.fillStyle='#eff1dd90';c.fillRect(i,7,2,1);c.fillRect(i,247,2,1)}}
 if(kind==='leaf'){c.fillStyle='#315f36';c.fillRect(0,0,256,256);for(let i=0;i<1600;i++){const x=rnd()*256,y=rnd()*256;c.fillStyle=['#506e32','#2b4c2b','#6b8545','#3d6334','#819958'][i%5];c.beginPath();c.ellipse(x,y,1.2+rnd()*3.2,.7+rnd()*1.8,rnd()*6,0,7);c.fill();if(i%4===0){c.strokeStyle='#c0c59435';c.lineWidth=.5;c.beginPath();c.moveTo(x-1,y);c.lineTo(x+2,y);c.stroke()}}}
 if(kind==='bark'){c.fillStyle='#635a43';c.fillRect(0,0,256,256);for(let i=0;i<180;i++){const x=rnd()*256;c.strokeStyle=i%2?'#342e2370':'#b2a08460';c.lineWidth=.7+rnd()*3;c.beginPath();c.moveTo(x,0);for(let y=0;y<=256;y+=16)c.lineTo(x+(rnd()-.5)*5,y);c.stroke()}}
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.userData.kind=kind;t.userData.baseColor=kind==='leaf'?'#315f36':kind==='bark'?'#635a43':color;return t}
function material(map,roughness=.8,extra={}){return new THREE.MeshStandardMaterial({map,bumpMap:map,bumpScale:map.userData.kind==='leaf'?.018:map.userData.kind==='wood'?.004:.0015,roughness,...extra})}
function mesh(g,geometry,m,x=0,y=0,z=0){const o=new THREE.Mesh(geometry,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o}
function cylinder(g,r,h,m,x,y,z,segments=20){return mesh(g,new THREE.CylinderGeometry(r,r,h,segments),m,x,y,z)}
export function createMallet(){const group=new THREE.Group(),woodFinish=material(texture('wood','#a98352'),.58),endFinish=material(texture('end','#bb9663'),.8),stripeFinishes=colors.map(c=>material(texture('wood',c),.67)),stripes=[];
 const head=cylinder(group,.14,.72,woodFinish,0,.14,0,28);head.rotation.x=Math.PI/2;
 for(const z of [-.364,.364]){const end=cylinder(group,.141,.012,endFinish,0,.14,z,28);end.rotation.x=Math.PI/2;const collar=cylinder(group,.142,.018,new THREE.MeshStandardMaterial({color:'#9f8b60',metalness:.5,roughness:.58}),0,.14,z*.88,28);collar.rotation.x=Math.PI/2}
 for(const z of [-.23,.23]){const band=cylinder(group,.142,.055,stripeFinishes[0],0,.14,z,28);band.rotation.x=Math.PI/2;stripes.push(band)}
 cylinder(group,.033,1.48,woodFinish,0,.88,0);for(const y of [.4,.47])stripes.push(cylinder(group,.034,.035,stripeFinishes[0],0,y,0));
 const gripMat=new THREE.MeshStandardMaterial({color:'#33382f',roughness:.95});cylinder(group,.039,.36,gripMat,0,1.43,0);
 for(let i=0;i<12;i++)cylinder(group,.0405,.004,new THREE.MeshStandardMaterial({color:i%3?'#4e5145':'#777969',roughness:1}),0,1.27+i*.029,0,16);
 cylinder(group,.045,.07,new THREE.MeshStandardMaterial({color:'#b5a077',metalness:.4,roughness:.65}),0,.285,0);group.userData.dynamic=true;
 return {group,setColor(i){for(const stripe of stripes)stripe.material=stripeFinishes[i]}}}
class ArchCurve extends THREE.Curve{getPoint(t,out=new THREE.Vector3()){const leg=.57,total=leg*2+Math.PI*.33,d=t*total;if(d<leg)return out.set(-.33,d,0);if(d<leg+Math.PI*.33){const a=Math.PI-(d-leg)/.33;return out.set(.33*Math.cos(a),leg+.33*Math.sin(a),0)}return out.set(.33,leg-(d-leg-Math.PI*.33),0)}}
// Four reusable, irregular wear textures: bare soil near the post, flattened
// straw mixed with surviving green grass, and a ragged transparent edge.
const wornGrassTextures=[];
function wornGrassTexture(variant){if(wornGrassTextures[variant])return wornGrassTextures[variant];
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d'),image=c.createImageData(512,512),data=image.data,phase=variant*1.37;
 const boundary=a=>.77+.085*Math.sin(a*3+phase)+.055*Math.sin(a*5-phase)+.035*Math.sin(a*9+phase);
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){const u=(x-256)/256,v=(y-256)/256,r=Math.hypot(u,v),a=Math.atan2(v,u),edge=boundary(a),n=Math.sin(x*.73+y*.91)*Math.sin(x*.13-y*.19),broad=Math.sin(u*17+phase)*Math.sin(v*13-phase),fade=Math.max(0,Math.min(1,(edge-r+(.024*broad))/.23)),soil=Math.exp(-r*r/ .025),alive=.5+.5*Math.sin(x*.07+y*.055+phase),i=(y*512+x)*4;
 data[i]=155+18*n-80*soil-37*alive;data[i+1]=143+17*n-80*soil-17*alive;data[i+2]=82+10*n-44*soil-21*alive;data[i+3]=fade*(105+55*soil+15*broad);}
 c.putImageData(image,0,0);
 for(let i=0;i<5200;i++){const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*.9;if(r>boundary(a)-.045)continue;const x=256+Math.cos(a)*r*256,y=256+Math.sin(a)*r*256,lean=.5*Math.sin(x*.025+y*.017+phase)+(rnd()-.5)*2.2,length=2+rnd()*10,dx=Math.cos(lean)*length,dy=Math.sin(lean)*length;
 c.strokeStyle=['#c3b28470','#a5956265','#756f4270','#63714465','#d3c39c55'][i%5];c.lineWidth=.35+rnd()*.65;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+dx*.5,y+dy*.5-1,x+dx,y+dy);c.stroke();}
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.magFilter=THREE.LinearFilter;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.userData.kind='worn-grass';wornGrassTextures[variant]=tex;return tex;}
export function createWornGrass(parent,x,z,radius=.25,kind='wicket'){
 const g=new THREE.Group();g.name='Worn grass · '+kind;g.userData.wornGrass=kind;g.position.set(x,0,z);g.rotation.y=rnd()*Math.PI*2;parent.add(g);
 const patch=mesh(g,new THREE.PlaneGeometry(radius*2,radius*1.7),new THREE.MeshStandardMaterial({map:wornGrassTexture(Math.floor(rnd()*4)),transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),0,-.006,0);patch.rotation.x=-Math.PI/2;patch.castShadow=false;
 const positions=[],tints=[];for(let i=0;i<30;i++){const a=rnd()*Math.PI*2,r=radius*(.2+rnd()*.5),px=Math.cos(a)*r,pz=Math.sin(a)*r,h=.007+rnd()*.018,w=.0015+rnd()*.0015,leanX=(rnd()-.5)*.025,leanZ=(rnd()-.5)*.025;
 positions.push(px-w,-.005,pz,px+w,-.005,pz,px+leanX,h,pz+leanZ);const straw=i%3!==0;for(let k=0;k<3;k++)tints.push(straw?.50+rnd()*.14:.29+rnd()*.1,straw?.45+rnd()*.12:.35+rnd()*.1,straw?.24+rnd()*.09:.16+rnd()*.07);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(tints,3));geo.computeVertexNormals();const blades=mesh(g,geo,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:1}));blades.castShadow=false;return g;}
export function createWicket(x,z,index){const g=new THREE.Group();g.position.set(x,0,z);const paint=material(texture('iron','#e8e7da'),.8,{metalness:.18});mesh(g,new THREE.TubeGeometry(new ArchCurve(),48,.045,10,false),paint);if(index===0||index===5){const arc=new THREE.EllipseCurve(0,.57,.33,.33,Math.PI*.25,Math.PI*.75,false);const pts=arc.getPoints(16).map(p=>new THREE.Vector3(p.x,p.y,0));mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),16,.046,10,false),material(texture('iron',index===0?'#3575af':'#b74c40'),.75,{metalness:.15}))}
 const rustCanvas=document.createElement('canvas');rustCanvas.width=rustCanvas.height=256;const rc=rustCanvas.getContext('2d');rc.fillStyle='#d6d2be';rc.fillRect(0,0,256,256);
 for(let i=0;i<1700;i++){const yy=rnd()*256,depth=yy/256;if(rnd()>.08+depth*.85)continue;rc.fillStyle=['#61432e','#9d6339','#ba7945','#857449','#c4b18a'][i%5];rc.beginPath();rc.ellipse(rnd()*256,yy,.5+rnd()*5,1+rnd()*9,0,0,Math.PI*2);rc.fill()}
 const rust=new THREE.CanvasTexture(rustCanvas);rust.colorSpace=THREE.SRGBColorSpace;const footPaint=new THREE.MeshStandardMaterial({map:rust,bumpMap:rust,bumpScale:.001,roughness:.96,metalness:.12});
 for(const side of [-.33,.33]){const foot=new THREE.Group();foot.userData.wicketFoot=true;g.add(foot);
 createWornGrass(foot,side,0,.27,'wicket');
 mesh(foot,new THREE.CylinderGeometry(.0455,.049,.15,16),footPaint,side,.063,0);}
 return g}
export function createFlags(scene){const flags=[];for(const [x,z,color] of [[-14,17.5,'#3376bb'],[-14,-17.5,'#c7473e'],[14,-17.5,'#e5e2cc'],[14,17.5,'#d4b348']]){createWornGrass(scene,x,z,.32,'flag');const poleMat=material(texture('iron','#d2d4cc'),.62,{metalness:.3});cylinder(scene,.024,1.65,poleMat,x,.825,z);mesh(scene,new THREE.IcosahedronGeometry(.043,1),new THREE.MeshStandardMaterial({color:'#bcaa79',metalness:.5,roughness:.5}),x,1.68,z);const geometry=new THREE.PlaneGeometry(.7,.43,12,7),cloth=new THREE.Mesh(geometry,material(texture('cloth',color),.95,{side:THREE.DoubleSide}));cloth.position.set(x,1.43,z);cloth.castShadow=true;cloth.userData.animated=true;scene.add(cloth);flags.push({cloth,phase:rnd()*6})}
 return time=>{for(const {cloth,phase}of flags){const a=cloth.geometry.attributes.position;for(let i=0;i<a.count;i++){const uv=cloth.geometry.attributes.uv,u=uv.getX(i),v=uv.getY(i),gust=.75+.25*Math.sin(time*.65+phase);a.setXYZ(i,u*.7, (v-.5)*.43-.12*u*u+Math.sin(time*2.1-u*7+phase)*.027*u,Math.sin(time*3-u*8+phase)*.065*u*gust+Math.sin(time*5-u*14)*.018*u)}a.needsUpdate=true;cloth.geometry.computeVertexNormals()}}
}
export function createPlanting(scene){const leaves=texture('leaf'),bark=material(texture('bark'),.95),green=material(leaves,1);green.color.set('#a4b18b');
 function crown(x,y,z,sx,sy,sz,shade=1){const geo=new THREE.SphereGeometry(1,12,8);geo.type='FoliageGeometry';const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const noise=1+.065*Math.sin(x*8+y*11+z*7)+.045*Math.sin(z*14-y*7);p.setXYZ(i,x*noise,y*noise,z*noise)}geo.computeVertexNormals();const m=green.clone();m.color.multiplyScalar(shade);const o=mesh(scene,geo,m,x,y,z);o.scale.set(sx,sy,sz);return o}
 // Overlapping, irregular rounded hedge sections break up the ruler-straight silhouette.
 for(const x of [-21,21])for(let z=-25;z<26;z+=1.65){crown(x,.75+rnd()*.08,z,.85+rnd()*.12,.83+rnd()*.07,1.65,.88+rnd()*.16)}
 for(const z of [-27,27])for(let x=-20;x<=20;x+=1.65)crown(x,.84,z,1.65,.96,.85,.9+rnd()*.16);
 function branch(ax,ay,az,bx,by,bz,r){const start=new THREE.Vector3(ax,ay,az),end=new THREE.Vector3(bx,by,bz),delta=end.clone().sub(start),o=mesh(scene,new THREE.CylinderGeometry(r*.6,r,delta.length(),8),bark);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize())}
 for(let i=0;i<28;i++){const x=(i%2?1:-1)*(28+rnd()*23),z=-48+rnd()*95,h=4.3+rnd()*3;const trunk=mesh(scene,new THREE.CylinderGeometry(.13,.32,h,10),bark,x,h/2,z);for(let j=0;j<5;j++){const a=j*2.4+rnd(),reach=1+rnd()*1.8,bx=x+Math.cos(a)*reach,bz=z+Math.sin(a)*reach,y=h*.7+rnd()*2;branch(x,h*.55,z,bx,y,bz,.09);crown(bx,y+1,bz,1.5+rnd(),1.6+rnd()*1.3,1.5+rnd(),.8+rnd()*.35)}crown(x,h+1.8,z,1.8,2.2,1.9)}
}

export function createSpectators(scene,animate=true){
 const cloth=texture('cloth','#e6e3d9'),whites=material(cloth,.94),trousers=material(texture('cloth','#d6d5cc'),.98),shoes=new THREE.MeshStandardMaterial({color:'#a49880',roughness:.8}),sole=new THREE.MeshStandardMaterial({color:'#5c5b50',roughness:1}),skins=['#bd8763','#e3b696','#8e6248','#cca384'];
 const eyeWhite=new THREE.MeshStandardMaterial({color:'#c9c6b4',roughness:.6}),iris=new THREE.MeshStandardMaterial({color:'#414238',roughness:.6}),animations=[];
 function sphere(g,r,m,x,y,z,sx=1,sy=1,sz=1){const geo=new THREE.SphereGeometry(r,20,12);geo.type='SpectatorGeometry';const o=mesh(g,geo,m,x,y,z);o.scale.set(sx,sy,sz);if(r<.05)o.castShadow=false;return o}
 function limb(g,a,b,r,m,endScale=.8){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),o=mesh(g,new THREE.CylinderGeometry(r*endScale,r,delta.length(),12),m);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o}
 function hand(g,x,y,z,skin){sphere(g,.043,skin,x,y,z,.72,1.2,.62);sphere(g,.017,skin,x-.026,y+.012,z+.012,.7,1.2,.7);for(let k=0;k<3;k++)sphere(g,.009,skin,x-.014+k*.012,y-.033,z+.009,.6,1.2,.65)}
 const positions=[[-17.8,-8,.7],[-18.5,-6.7,1.7],[-17.9,9,1.2],[-18.5,10.4,2.5],[18,-7,-1.4],[18.7,-5.6,-2.2],[17.8,7,-1.5],[18.4,8.5,-2.1],[-7,23,3],[-5.5,23.6,3.7],[6.5,23.1,2.9],[8,23.5,3.5]];
 positions.forEach(([x,z,heading],i)=>{const g=new THREE.Group();g.name='Spectator '+(i+1);g.userData.spectator=true;g.position.set(x,0,z);g.rotation.y=heading;g.scale.setScalar(.92+(i%4)*.045);scene.add(g);
 const skin=new THREE.MeshStandardMaterial({color:skins[i%skins.length],roughness:.78}),hair=new THREE.MeshStandardMaterial({color:['#4e4032','#a5a49a','#39352e','#b4a17c','#d3d0c4'][i%5],roughness:.97}),lip=new THREE.MeshStandardMaterial({color:i%2?'#966b5b':'#8a5c48',roughness:.9});
 const skirt=i%4===1,lean=(i%3-1)*.035;
 // Offset knees and weight-bearing hip create a relaxed, asymmetric stance.
 for(const side of [-1,1]){const hip=[side*.085,.92,0],knee=[side*.10+(side===1?lean:0),.52,side===1?.035:-.035],ankle=[side*.115,.13,side===1?.07:-.04];
 limb(g,hip,knee,.072,skirt?skin:trousers,.8);limb(g,knee,ankle,skirt?.045:.057,skirt?skin:trousers,.7);
 sphere(g,.083,sole,ankle[0],.035,ankle[2]+.04,1,.28,1.6);sphere(g,.078,shoes,ankle[0],.07,ankle[2]+.04,1,.6,1.6);}
 if(skirt){const skirtGeo=new THREE.LatheGeometry([new THREE.Vector2(.23,.53),new THREE.Vector2(.215,.6),new THREE.Vector2(.17,.88),new THREE.Vector2(.145,.99)],24);mesh(g,skirtGeo,whites);}
 const torso=new THREE.Group();torso.position.y=.94;torso.rotation.z=lean;g.add(torso);
 const profile=[new THREE.Vector2(.15,0),new THREE.Vector2(.155,.06),new THREE.Vector2(.14,.16),new THREE.Vector2(.19,.35),new THREE.Vector2(.20,.42),new THREE.Vector2(.08,.48)];const body=mesh(torso,new THREE.LatheGeometry(profile,24),whites);body.scale.z=.66;
 // Collar, button placket, belt and fabric creases give the clothes structure.
 for(const side of [-1,1]){const collar=mesh(torso,new THREE.BoxGeometry(.07,.11,.012),whites,side*.044,.445,.064);collar.rotation.z=side*.4;}
 const placket=mesh(torso,new THREE.BoxGeometry(.018,.24,.009),whites,0,.30,.127);for(const y of [.24,.31,.38])sphere(torso,.006,eyeWhite,0,y,.135);
 if(!skirt)mesh(torso,new THREE.BoxGeometry(.29,.025,.18),new THREE.MeshStandardMaterial({color:'#aaa38c',roughness:.8}),0,.005,0);
 for(const side of [-1,1]){const shoulder=[side*.18,.41,0],elbow=side===1?[.29,.17,.06]:[-.27,.13,i%3===0?.12:0],wrist=side===1?[.25,.34,.25]:i%3===0?[-.34,.32,.19]:[-.22,.03,.10];
 limb(torso,shoulder,elbow,.067,whites,.82);sphere(torso,.055,whites,...elbow);limb(torso,elbow,wrist,.038,skin,.75);hand(torso,...wrist,skin);}
 cylinder(torso,.047,.13,skin,0,.50,0,16);
 const head=new THREE.Group();head.position.set(0,.67,0);head.rotation.z=(i%3-1)*.07;head.rotation.y=(i%4-1.5)*.1;torso.add(head);
 sphere(head,.133,skin,0,0,0,.78,1.16,.88);sphere(head,.077,skin,0,-.074,.03,.9,.65,.85);
 for(const side of [-1,1]){sphere(head,.026,skin,side*.105,-.005,-.005,.48,1,.67);sphere(head,.013,eyeWhite,side*.039,.025,.108,1.05,.46,.24);sphere(head,.007,iris,side*.039,.025,.112,.65,.8,.35);const brow=mesh(head,new THREE.BoxGeometry(.031,.006,.006),hair,side*.039,.043,.108);brow.rotation.z=side*.10;}
 sphere(head,.027,skin,0,-.006,.116,.43,.9,.9);sphere(head,.023,lip,0,-.052,.10,1,.17,.25);
 const scalpGeo=new THREE.SphereGeometry(.135,20,12,0,Math.PI*2,0,1.55);scalpGeo.type='SpectatorGeometry';const scalp=mesh(head,scalpGeo,hair,0,.006,-.012);scalp.scale.set(.8,1.13,.89);
 if(skirt)sphere(head,.065,hair,0,.015,-.12,1,.9,.8);
 if(i%4===0){cylinder(head,.18,.014,whites,0,.151,0,24);cylinder(head,.115,.095,whites,0,.20,0,24);cylinder(head,.116,.015,new THREE.MeshStandardMaterial({color:'#7b7565',roughness:.9}),0,.168,0,24);}
 const glass=new THREE.MeshStandardMaterial({color:'#e0ece8',transparent:true,opacity:.44,roughness:.08,metalness:.05});cylinder(torso,.006,.10,glass,.25,.42,.25,10);cylinder(torso,.04,.008,glass,.25,.375,.25,16);mesh(torso,new THREE.LatheGeometry([new THREE.Vector2(.008,0),new THREE.Vector2(.043,.026),new THREE.Vector2(.047,.075),new THREE.Vector2(.038,.12)],16),glass,.25,.46,.25);cylinder(torso,.037,.023,new THREE.MeshStandardMaterial({color:i%3?'#c6ac66':'#863f49',transparent:true,opacity:.8,roughness:.25}),.25,.50,.25,16);
 animations.push({head,torso,lean,phase:i*1.7,baseHead:head.rotation.y});
 });
 return time=>{if(!animate)return;for(const {head,torso,lean,phase,baseHead}of animations){head.rotation.y=baseHead+Math.sin(time*.34+phase)*.045;head.rotation.x=Math.sin(time*.47+phase)*.016;torso.rotation.z=lean+Math.sin(time*.38+phase)*.006;}};
}
