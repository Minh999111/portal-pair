import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

/** Thin Rapier world wrapper. Player collision is swept manually for predictable portal crossings. */
export class Physics {
  world!: RAPIER.World;
  async init() { await RAPIER.init(); this.world = new RAPIER.World({ x: 0, y: -18, z: 0 }); }
  addStaticBox(pos: THREE.Vector3, size: THREE.Vector3) {
    const rb = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2), rb);
  }
  step() { this.world.step(); }
}
