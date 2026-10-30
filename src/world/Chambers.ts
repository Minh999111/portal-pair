import * as THREE from 'three';
export interface Chamber { name: string; objective: string; }
export const chambers: Chamber[] = [
  { name: '01 / DUAL KEY', objective: 'Both explorers stand on their pressure plate to release the exit.' },
  { name: '02 / LIFT EXCHANGE', objective: 'Use a cube and both portal pairs to hold the high relay.' },
  { name: '03 / LIGHT VECTOR', objective: 'Coordinate both routes, catch momentum, and energize the final receiver.' }
];
export function makeChamber(scene: THREE.Scene, level: number) {
  const world = new THREE.Group(); scene.add(world); const solid = new THREE.MeshStandardMaterial({ color: 0x273141, roughness: .72, metalness: .35 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x79a5c3, emissive: 0x0a1b29, metalness: .7 });
  const add = (size: [number,number,number], pos: [number,number,number], mat: THREE.Material = solid) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); m.position.set(...pos); m.receiveShadow = m.castShadow = true; world.add(m); return m; };
  add([22,.5,22], [0,-.25,0]); add([22,.5,22], [0,8,0]); add([.5,8,22], [-11,4,0]); add([.5,8,22], [11,4,0]); add([22,8,.5], [0,4,-11]); add([22,8,.5], [0,4,11]);
  for (let i=-8;i<=8;i+=4) { add([.12,7.6,.14], [i,4,-10.7], trim); add([.12,7.6,.14], [i,4,10.7], trim); }
  const plateA = add([2,.16,2], [-4,.1,-2], new THREE.MeshStandardMaterial({ color:0x553a12, emissive:0x241400 }));
  const plateB = add([2,.16,2], [4,.1,-2], new THREE.MeshStandardMaterial({ color:0x123a55, emissive:0x001d2b }));
  const door = add([3.5,4,.35], [0,2,-10.65], new THREE.MeshStandardMaterial({ color:0x111923, metalness:.9 }));
  const cube = add([1.2,1.2,1.2], [level === 1 ? 0 : -2,.8,3], new THREE.MeshStandardMaterial({color:0xe9eef2, metalness:.65, roughness:.28}));
  if (level > 0) { add([5,.35,3], [5,3,4], solid); add([.35,6,3], [7.4,3,4], trim); }
  if (level > 1) { add([.25,.25,10], [0,5,0], new THREE.MeshBasicMaterial({ color:0xff4f8a })); add([2,2,.3],[0,5,-10.6],new THREE.MeshStandardMaterial({color:0x8126ff,emissive:0x4200a0})); }
  return { world, plateA, plateB, door, cube };
}
