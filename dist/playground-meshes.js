import * as THREE from './vendor/three.module.js';
const unit=new THREE.BoxGeometry(1,1,1),rod=new THREE.CylinderGeometry(1,1,1,8),up=new THREE.Vector3(0,1,0);
export const finish=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.84,...extra});
export function block(group,w,h,d,x,y,z,material){const mesh=new THREE.Mesh(unit,material);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;}
export function beam(group,a,b,r,material){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),delta=B.clone().sub(A),mesh=new THREE.Mesh(rod,material);mesh.position.copy(A).add(B).multiplyScalar(.5);mesh.scale.set(r,delta.length(),r);mesh.quaternion.setFromUnitVectors(up,delta.normalize());group.add(mesh);return mesh;}
