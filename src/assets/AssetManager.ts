import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
let deckPromise: Promise<THREE.Group> | undefined;

/** Main authored environment: locally bundled, lightweight CC0 GLB. */
export async function dressSciFiChamber(target: THREE.Group, level: number) {
  deckPromise ??= loader.loadAsync('/assets/spaceship-deck-showroom.glb').then(({ scene }) => scene);
  try {
    const deck = (await deckPromise).clone(true);
    deck.name = `spaceship-deck-${level + 1}`;
    deck.scale.setScalar(.84);
    deck.position.y = .02;
    deck.traverse(node => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        // The source materials are intentionally retained: the cyan emissive
        // trim and cool hull palette are part of the pack's visual identity.
      }
    });
    target.add(deck);
  } catch (error) {
    console.warn('Spaceship environment could not be loaded; using the chamber fallback.', error);
  }
}
