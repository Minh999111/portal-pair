import * as THREE from 'three';
import type { NetPortal, PortalKind, Vec } from '../game/types';

export class PortalSystem {
  portals: NetPortal[] = []; group = new THREE.Group(); private meshes = new Map<string, THREE.Mesh>(); private cooldown = 0;
  constructor(private scene: THREE.Scene) { scene.add(this.group); }
  place(kind: PortalKind, owner: string, point: THREE.Vector3, normal: THREE.Vector3) {
    // Portal-safe zones: static world geometry has no portal material flag otherwise.
    const old = this.portals.findIndex(p => p.owner === owner && p.kind === kind);
    const data: NetPortal = { kind, owner, position: [point.x, point.y, point.z], normal: [normal.x, normal.y, normal.z] };
    if (old >= 0) this.portals.splice(old, 1, data); else this.portals.push(data); this.render();
  }
  set(portals: NetPortal[]) { this.portals = portals; this.render(); }
  private render() {
    this.group.clear(); this.meshes.clear();
    for (const p of this.portals) {
      const color = p.kind === 'amber' ? 0xffa719 : 0x17d9ff;
      const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: .92 });
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(.72, 32), material);
      mesh.position.fromArray(p.position); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3().fromArray(p.normal));
      mesh.position.addScaledVector(new THREE.Vector3().fromArray(p.normal), .012); this.group.add(mesh); this.meshes.set(`${p.owner}-${p.kind}`, mesh);
    }
  }
  /** Plane crossing + frame transform preserves local velocity; cooldown prevents exit re-entry. */
  teleport(position: THREE.Vector3, velocity: THREE.Vector3, dt: number) {
    this.cooldown = Math.max(0, this.cooldown - dt); if (this.cooldown > 0) return false;
    for (const entry of this.portals) {
      const exit = this.portals.find(p => p.owner === entry.owner && p.kind !== entry.kind);
      if (!exit) continue;
      const a = new THREE.Vector3().fromArray(entry.position), n = new THREE.Vector3().fromArray(entry.normal);
      const delta = position.clone().sub(a), distance = delta.dot(n);
      if (Math.abs(distance) > .18 || delta.sub(n.clone().multiplyScalar(distance)).length() > .67 || velocity.dot(n) >= 0) continue;
      const outN = new THREE.Vector3().fromArray(exit.normal);
      position.copy(new THREE.Vector3().fromArray(exit.position)).addScaledVector(outN, .32);
      const rotate = new THREE.Quaternion().setFromUnitVectors(n, outN.clone().negate()); velocity.applyQuaternion(rotate); this.cooldown = .35; return true;
    } return false;
  }
}
