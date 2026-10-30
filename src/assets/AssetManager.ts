import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
type Placement = { file: string; position: [number, number, number]; rotation?: number; scale?: number };

/** Local-only CC0 dressing; failures leave the original procedural chamber playable. */
export async function dressSciFiChamber(target: THREE.Group, level: number) {
  const placements: Placement[] = [
    { file: 'template-floor.glb', position: [0, .03, 0], scale: 5.45 },
    { file: 'template-wall.glb', position: [-10.73, 3.7, 0], rotation: Math.PI / 2, scale: 5.4 },
    { file: 'template-wall.glb', position: [10.73, 3.7, 0], rotation: -Math.PI / 2, scale: 5.4 },
    { file: 'cables.glb', position: [-8.8, 5.7, -9.9], rotation: Math.PI, scale: 2.2 },
    { file: 'gate.glb', position: [0, .05, -10.45], rotation: Math.PI, scale: 2.25 },
  ];
  if (level > 0) placements.push({ file: 'corridor.glb', position: [4.8, .04, 4], rotation: -Math.PI / 2, scale: 2.8 });
  await Promise.all(placements.map(async spec => {
    try {
      const gltf = await loader.loadAsync(`/assets/kenney-modular-space/models/${spec.file}`);
      const model = gltf.scene; model.position.set(...spec.position); model.rotation.y = spec.rotation ?? 0; model.scale.setScalar(spec.scale ?? 1);
      model.traverse(node => { if (node instanceof THREE.Mesh) { node.castShadow = true; node.receiveShadow = true; } }); target.add(model);
    } catch { /* local asset fallback intentionally keeps the chamber functional */ }
  }));
}
