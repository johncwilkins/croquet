import * as THREE from './vendor/three.module.js';
export function createGrounds(scene,renderer){
 let seed=81;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
 function texture(kind,a,b){const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');c.fillStyle=a;c.fillRect(0,0,512,512);
 if(kind==='turf'){for(let i=0;i<80000;i++){const x=rand()*512,y=rand()*512;c.strokeStyle=rand()>.5?'#bdcd921b':'#26462a18';c.lineWidth=.5+rand();c.beginPath();c.moveTo(x,y);c.lineTo(x+(rand()-.5)*2,y-1-rand()*3);c.stroke()}for(let i=0;i<40;i++){c.fillStyle='#c9c48106';c.beginPath();c.ellipse(rand()*512,rand()*512,10+rand()*40,10+rand()*40,0,0,7);c.fill()}}
 else{const rows=kind==='shingle'?32:16;for(let row=0;row<rows;row++){const h=512/rows;for(let col=-1;col<12;col++){const w=kind==='shingle'?46:70,x=col*w+(row%2)*w/2,y=row*h;c.fillStyle=rand()>.45?a:b;c.fillRect(x+1,y+1,w-2,h-2);c.fillStyle='#00000012';c.fillRect(x+2,y+h-3,w-3,2)}}}
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=renderer.capabilities?.getMaxAnisotropy?.()||1;return t}
 const turf=texture('turf','#688254','#547247');turf.repeat.set(12,15);const grass=new THREE.MeshStandardMaterial({color:'#91a476',map:turf,bumpMap:turf,bumpScale:.025,roughness:1});
 const ground=new THREE.Mesh(new THREE.BoxGeometry(28,.15,35),grass);ground.position.y=-.09;ground.receiveShadow=true;scene.add(ground);
 // Whole-court mowing directions over the existing fine grass texture.
 const cutCanvas=document.createElement('canvas');cutCanvas.width=cutCanvas.height=512;
 const cutTexture=new THREE.CanvasTexture(cutCanvas);cutTexture.colorSpace=THREE.SRGBColorSpace;
 const cut=new THREE.Mesh(new THREE.PlaneGeometry(28,35),new THREE.MeshStandardMaterial({map:cutTexture,color:'#608048',transparent:true,opacity:.24,depthWrite:false,roughness:1}));cut.rotation.x=-Math.PI/2;cut.position.y=-.011;cut.receiveShadow=true;scene.add(cut);
 const patterns=['Tournament stripes','Crosscut checks','Diamond cut','Concentric rings','Chevron cut'];let lastPattern=-1;
 function randomizeLawn(){const count=patterns.length;lastPattern=lastPattern<0?Math.floor(Math.random()*count):(lastPattern+1+Math.floor(Math.random()*(count-1)))%count;
 const c=cutCanvas.getContext('2d'),image=c.createImageData(512,512),data=image.data;
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){const u=x/512*28,v=y/512*35;let band;
 if(lastPattern===0)band=Math.floor(u/3.5);
 else if(lastPattern===1)band=Math.floor(u/3.5)+Math.floor(v/3.5);
 else if(lastPattern===2)band=Math.floor((u+v)/4)+Math.floor((u-v)/4);
 else if(lastPattern===3)band=Math.floor(Math.hypot(u-14,(v-17.5)*.8)/2);
 else band=Math.floor((v+Math.abs(u-14)*.8)/3);
 const light=((band%2)+2)%2===0,i=(y*512+x)*4;data[i]=light?193:29;data[i+1]=light?210:65;data[i+2]=light?132:33;data[i+3]=255;}
 c.putImageData(image,0,0);cutTexture.needsUpdate=true;renderer.lastKey='';return patterns[lastPattern]}
 const settings={english:{title:'English Cottage',sky:'#bfd1d4',fog:'#bfd1d4'},nantucket:{title:'Nantucket Village',sky:'#c5deeb',fog:'#c5deeb'},resort:{title:'Country Club Resort',sky:'#c6dce5',fog:'#c6dce5'}};
 const groups={};
 function material(color,map=null){return new THREE.MeshStandardMaterial({color,map,roughness:.9})}
 function box(g,w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o}
 function cylinder(g,r,h,m,x,y,z){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,10),m);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o}
 const trim=material('#f0ebdc'),glass=material('#446878'),timber=material('#635242'),stone=material('#ffffff',texture('stone','#b7aa8d','#a4967a')),shingle=material('#ffffff',texture('shingle','#9f9e94','#8b8e86')),roof=material('#ffffff',texture('shingle','#66645b','#595d57'));
 function roofGable(g,w,d,eave,peak,m){const verts=[-w/2,eave,-d/2,w/2,eave,-d/2,0,peak,-d/2,-w/2,eave,d/2,w/2,eave,d/2,0,peak,d/2];const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.5,1,0,0,1,0,.5,1],2));geo.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4]);geo.computeVertexNormals();const flat=geo.toNonIndexed(),uv=[];const p=flat.attributes.position,n=flat.attributes.normal;for(let i=0;i<p.count;i++){if(Math.abs(n.getZ(i))>.7)uv.push(p.getX(i)/w+.5,(p.getY(i)-eave)/(peak-eave));else uv.push(p.getZ(i)/d+.5,p.getX(i)/w+.5)}flat.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));const o=new THREE.Mesh(flat,m);o.castShadow=true;g.add(o)}
 function window(g,x,y,z,w=.7,h=1.05,shutters=false){box(g,w+.16,h+.16,.12,trim,x,y,z);box(g,w,h,.14,glass,x,y,z+.08);box(g,.055,h,.06,trim,x,y,z+.17);box(g,w,.055,.06,trim,x,y,z+.17);if(shutters)for(const side of [-1,1])box(g,.27,h,.11,material('#41564b'),x+side*(w/2+.26),y,z)}
 function flowers(g,x,z,color){box(g,3,.35,1,material('#5b6950'),x,.2,z);for(let i=0;i<16;i++){const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.14,0),material(color));mesh.position.set(x+(rand()-.5)*2.8,.42+rand()*.2,z+(rand()-.5)*.6);g.add(mesh)}}
 function cottage(parent,x,z,rotation,style,scale=1){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;g.scale.setScalar(scale);parent.add(g);const english=style==='english';box(g,7,3.8,5,english?stone:shingle,0,1.9,0);roofGable(g,7.6,5.8,3.85,6.5,english?material('#91836a'):roof);box(g,.75,2,.8,english?stone:trim,2,5.7,.5);box(g,.95,.16,1,roof,2,6.7,.5);box(g,1.1,2.2,.16,material(english?'#5f6f55':'#567889'),0,1.1,2.57);box(g,1.35,.13,.65,stone,0,.08,2.8);for(const px of [-2.2,2.2]){window(g,px,1.9,2.56,.85,1.25,!english);flowers(g,px,3.1,english?'#a79abf':'#a3b3d4')}window(g,0,4.35,2.52,.7,.85);if(!english){box(g,7.2,.15,1.4,trim,0,2.7,3.1);for(const px of [-3.2,3.2])cylinder(g,.065,2.7,trim,px,1.35,3.5)}return g}
 // A single unmistakable landmark marks the north end in every setting.
 const pavilion=new THREE.Group();pavilion.name='North pavilion';pavilion.position.set(0,0,-24);scene.add(pavilion);
 const brick=material('#b17b59'),slate=material('#39566a');
 box(pavilion,9,3.4,4.2,brick,0,1.7,0);roofGable(pavilion,10,5,3.5,5.8,slate);
 box(pavilion,10,.18,1.7,trim,0,3.05,2.7);box(pavilion,10,.22,2.3,stone,0,.11,2.8);
 for(const x of [-4.3,-1.5,1.5,4.3])cylinder(pavilion,.09,3,trim,x,1.5,3.25);
 box(pavilion,1.3,2.45,.14,material('#254c60'),0,1.23,2.18);
 for(const x of [-3,3])window(pavilion,x,1.9,2.16,1.2,1.3,true);
 box(pavilion,1.1,1.15,1.1,trim,0,6.05,0);roofGable(pavilion,1.5,1.5,6.63,7.25,slate);
 const clockCanvas=document.createElement('canvas');clockCanvas.width=clockCanvas.height=128;const clock=clockCanvas.getContext('2d');clock.fillStyle='#f2ead4';clock.fillRect(0,0,128,128);clock.strokeStyle='#254c60';clock.lineWidth=6;clock.beginPath();clock.arc(64,64,49,0,Math.PI*2);clock.stroke();clock.beginPath();clock.moveTo(64,31);clock.lineTo(64,64);clock.lineTo(89,77);clock.stroke();const clockTexture=new THREE.CanvasTexture(clockCanvas);clockTexture.colorSpace=THREE.SRGBColorSpace;box(pavilion,.9,.9,.03,material('#ffffff',clockTexture),0,6.08,.57);
 const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=96;const sign=signCanvas.getContext('2d');sign.fillStyle='#254c60';sign.fillRect(0,0,512,96);sign.fillStyle='#f2ead4';sign.textAlign='center';sign.font='bold 34px Georgia';sign.fillText('NORTH PAVILION',256,61);const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;box(pavilion,5.1,.75,.08,material('#ffffff',signTexture),0,3.75,2.35);
 for(const name of Object.keys(settings)){const g=new THREE.Group();g.name=name;groups[name]=g;scene.add(g);g.visible=false;
 if(name==='english'){cottage(g,-11,-31,.08,'english',1.2);cottage(g,1,-33,-.12,'english',1.05);cottage(g,13,-31,-.16,'english',1.15);cottage(g,-29,-7,Math.PI/2,'english',1.1);box(g,39,.1,2.5,material('#b7ad94'),0,-.02,-23.5);for(const x of [-15,-4,8,17])flowers(g,x,-25,'#ad8ca6')}
 if(name==='nantucket'){for(let i=0;i<4;i++)cottage(g,-17+i*11,-33,(i-1.5)*-.04,'nantucket',1.05);cottage(g,-29,-8,Math.PI/2,'nantucket',1.2);box(g,43,.1,3,material('#c5bea8'),0,-.02,-24);for(let x=-20;x<23;x+=1){box(g,.11,.9,.11,trim,x,.45,-25.9)}for(const y of [.25,.7])box(g,43,.07,.08,trim,0,y,-25.9);for(const x of [-14,-6,7,17])flowers(g,x,-24.4,'#a5b3d0')}
 if(name==='resort'){const club=new THREE.Group();club.position.set(0,0,-34);g.add(club);box(club,26,5,8,material('#eee2c8'),0,2.5,0);roofGable(club,27,9,5.05,8,roof);box(club,29,.22,3,trim,0,3.9,5);for(let x=-13;x<=13;x+=3.25)cylinder(club,.13,3.9,trim,x,1.95,6);for(let x=-11;x<=11;x+=3.6)window(club,x,2.1,4.04,1.4,2);box(club,2,3,.15,timber,0,1.5,4.15);box(g,38,.1,4,material('#c8bba4'),0,0,-24);for(const x of [-17,17]){cylinder(g,.07,3.2,trim,x,1.6,-23);const shade=new THREE.Mesh(new THREE.ConeGeometry(2.2,.65,20),material('#efe8d3'));shade.position.set(x,3.2,-23);shade.castShadow=true;g.add(shade);box(g,1.6,.12,1.6,timber,x,1.1,-23)}for(const x of [-11,11])flowers(g,x,-25,'#e9e0c9')}
 }
 return {settings,randomizeLawn,set(name){if(!settings[name])return;Object.entries(groups).forEach(([key,g])=>g.visible=key===name);scene.background=new THREE.Color(settings[name].sky);scene.fog.color.set(settings[name].fog);renderer.lastKey='';},grass};
}
