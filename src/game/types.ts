import * as THREE from 'three';

export type PortalKind = 'amber' | 'cyan';
export type Vec = [number, number, number];
export interface NetPortal { kind: PortalKind; position: Vec; normal: Vec; owner: string }
export interface Snapshot { type: 'snapshot'; pos: Vec; yaw: number; pitch: number; portals: NetPortal[]; cube: Vec; plateA: boolean; plateB: boolean; level: number; ready?: boolean }
export interface RoomMessage { type: 'hello' | 'snapshot' | 'reset' | 'next' | 'ready' | 'full'; payload?: Snapshot }
export const v3 = (v: Vec) => new THREE.Vector3(v[0], v[1], v[2]);
export const arr = (v: THREE.Vector3): Vec => [v.x, v.y, v.z];
