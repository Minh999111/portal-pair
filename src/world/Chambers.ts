import * as THREE from 'three';

export interface Chamber { name: string; objective: string; }
export const chambers: Chamber[] = [
  { name: '01 / DUAL KEY', objective: 'Both explorers stand on their pressure plate to release the exit.' },
  { name: '02 / LIFT EXCHANGE', objective: 'Use a cube and both portal pairs to hold the high relay.' },
  { name: '03 / LIGHT VECTOR', objective: 'Coordinate both routes, catch momentum, and energize the final receiver.' }
];

export function makeChamber(scene: THREE.Scene, level: number) {
  const world = new THREE.Group();
  world.name = `chamber-${level + 1}`;
  scene.add(world);

  const hull = new THREE.MeshStandardMaterial({ color: 0x101a26, roughness: .42, metalness: .76 });
  const wall = new THREE.MeshStandardMaterial({ color: 0x344a5d, roughness: .62, metalness: .38 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x4ec8eb, emissive: 0x0a526a, emissiveIntensity: 1.6, metalness: .5 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffbe4d, emissive: 0x693500, emissiveIntensity: 1.5, metalness: .55 });
  const add = (size: [number, number, number], pos: [number, number, number], mat: THREE.Material = hull) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
    mesh.position.set(...pos); mesh.receiveShadow = true; mesh.castShadow = true; world.add(mesh); return mesh;
  };

  // Dark steel containment shell: the CC0 spaceship scene sits inside this
  // frame instead of being hidden behind the old featureless box room.
  add([22, .5, 22], [0, -.25, 0]);
  add([.55, 7, 22], [-11, 3.25, 0], wall); add([.55, 7, 22], [11, 3.25, 0], wall);
  add([22, 7, .55], [0, 3.25, -11], wall); add([22, 7, .55], [0, 3.25, 11], wall);
  add([4.4, 4.8, .48], [0, 2.4, -10.58], new THREE.MeshStandardMaterial({ color: 0x09131d, roughness: .3, metalness: .9 }));
  add([3.65, 4.1, .12], [0, 2.45, -10.28], new THREE.MeshStandardMaterial({ color: 0x3d1d63, emissive: level > 1 ? 0x8a24ff : 0x291349, emissiveIntensity: 2, metalness: .7 }));

  // Framed portal-safe wall sections and station edge lighting.
  for (const z of [-8, -4, 0, 4, 8]) {
    add([.09, 6.2, .14], [-10.68, 3.1, z], trim); add([.09, 6.2, .14], [10.68, 3.1, z], trim);
  }
  for (const x of [-9.1, -6.7, 6.7, 9.1]) add([.08, 5.8, .14], [x, 3.15, -10.66], trim);
  add([18.4, .12, .14], [0, 6.35, -10.66], trim); add([18.4, .12, .14], [0, .48, -10.66], gold);
  for (let x = -8; x <= 8; x += 4) {
    add([.14, .14, .1], [x, .06, -10.62], trim); add([.14, .14, .1], [x, .06, 10.62], trim);
  }
  for (const x of [-10.3, 10.3]) for (const z of [-10.3, 10.3]) {
    add([.38, 6.7, .38], [x, 3.25, z], hull);
    add([.46, .09, .46], [x, 6.68, z], trim);
  }

  const plateA = add([2.15, .16, 2.15], [-4, .08, -1], gold);
  const plateB = add([2.15, .16, 2.15], [4, .08, -1], new THREE.MeshStandardMaterial({ color: 0x17c9f2, emissive: 0x005474, emissiveIntensity: 1.4, metalness: .5 }));
  const addPlateHalo = (x: number, material: THREE.Material) => {
    const halo = new THREE.Mesh(new THREE.RingGeometry(1.22, 1.34, 48), material);
    halo.rotation.x = -Math.PI / 2; halo.position.set(x, .015, -1); world.add(halo);
  };
  addPlateHalo(-4, gold); addPlateHalo(4, trim);

  const door = add([3.5, 4.2, .38], [0, 2.1, -10.18], new THREE.MeshStandardMaterial({ color: 0x111923, emissive: 0x30114d, emissiveIntensity: .7, metalness: .92, roughness: .24 }));
  const cube = add([1.2, 1.2, 1.2], [level === 1 ? 0 : -2, .8, 3], new THREE.MeshStandardMaterial({ color: 0xd9f4ff, emissive: 0x155a78, emissiveIntensity: .6, metalness: .65, roughness: .2 }));
  if (level > 0) { add([5, .35, 3], [5, 3, 4], hull); add([.35, 6, 3], [7.4, 3, 4], trim); }
  if (level > 1) { add([.25, .25, 10], [0, 5, 0], new THREE.MeshBasicMaterial({ color: 0xff4f8a })); add([2, 2, .3], [0, 5, -10.6], new THREE.MeshStandardMaterial({ color: 0x8126ff, emissive: 0x7800ff, emissiveIntensity: 2.4 })); }
  return { world, plateA, plateB, door, cube };
}
