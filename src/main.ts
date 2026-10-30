import './style.css';
import * as THREE from 'three';
import { Physics } from './physics/Physics';
import { Network } from './network/Network';
import { PortalSystem } from './portal/PortalSystem';
import { makeChamber, chambers } from './world/Chambers';
import { dressSciFiChamber } from './assets/AssetManager';
import type { NetPortal, RoomMessage, Snapshot } from './game/types';
import { arr } from './game/types';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `<canvas id="game"></canvas><div id="hud" class="hidden"><div class="top"><div><b id="chamber">CHAMBER 01</b><span id="objective"></span></div><div id="net">OFFLINE</div></div><div class="crosshair">+</div><div class="bottom"><span>WASD MOVE • SPACE JUMP • LMB <i class="amber"></i> / RMB <i class="cyan"></i> • E GRAB • R RESET • TAB STATUS</span><span id="partner">PARTNER: WAITING</span></div><aside id="roomStatus" class="hidden"><b>SESSION STATUS</b><span id="roomCodeStatus">TRAINING</span><span id="routeStatus">NO NETWORK</span><span>ESC: pause · F: fullscreen</span></aside></div>
<main id="menu"><section class="brand"><p class="eyebrow">SILENT CO-OPERATIVE PROTOCOL</p><h1>PORTAL<br><em>PAIR</em></h1><p>Two explorers. Four gateways. One way out.</p></section><section class="panel" id="mainPanel"><button id="create">CREATE ROOM</button><button id="join">JOIN ROOM</button><button id="solo">TRAINING MODE</button><small>Original prototype • no audio • peer-to-peer</small></section></main>
<div id="modal" class="modal hidden"><section class="panel"><button class="close">×</button><p class="eyebrow" id="modalLabel">SECURE LINK</p><h2 id="modalTitle">CREATE ROOM</h2><p id="modalText">Invite one partner to this chamber.</p><input id="roomInput" maxlength="8" placeholder="ROOM CODE"/><div id="invite" class="hidden"><code id="inviteCode"></code><button id="copy">COPY INVITE LINK</button></div><button id="connect">CONTINUE</button><p id="networkDetail"></p><details><summary>Connection options</summary><label>PeerServer host <input id="peerHost" placeholder="0.peerjs.com"/></label><label>PeerServer port <input id="peerPort" placeholder="443"/></label><label>TURN endpoint <input id="turnUrl" placeholder="/api/turn"/></label><p>Defaults to PeerJS Cloud. TURN is optional; a deployed Worker keeps credentials off the client.</p></details></section></div>
<div id="pause" class="modal hidden"><section class="panel"><p class="eyebrow">PAUSED</p><h2>CHAMBER OPTIONS</h2><label>Sensitivity <input id="sensitivity" type="range" min=".001" max=".008" value=".003" step=".001"/></label><button id="resume">RESUME</button><button id="leave">LEAVE SESSION</button></section></div>
<div id="complete" class="modal hidden"><section class="panel"><p class="eyebrow">CHAMBER CLEARED</p><h2 id="completeTitle">SYNCHRONIZED</h2><p id="completeText"></p><button id="next">READY FOR NEXT CHAMBER</button></section></div>`;

const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
const canvas = $('#game') as HTMLCanvasElement, hud = $('#hud'), menu = $('#menu'), modal = $('#modal'), pause = $('#pause'), complete = $('#complete');
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x071018); scene.fog = new THREE.Fog(0x071018, 14, 48);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .1, 100); const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true;
scene.add(new THREE.HemisphereLight(0x9ed5ff, 0x101522, 1.5)); const key = new THREE.DirectionalLight(0xa8dfff, 2.2); key.position.set(4, 7, 3); key.castShadow = true; scene.add(key);
const physics = new Physics(), net = new Network(), portals = new PortalSystem(scene); let chamber = makeChamber(scene, 0), level = 0;
void dressSciFiChamber(chamber.world, level);
let pos = new THREE.Vector3(0, 1.75, 7), velocity = new THREE.Vector3(), yaw = 0, pitch = 0, grounded = false, locked = false, running = false, last = performance.now();
let remote = { pos: new THREE.Vector3(0,1.75,6), target: new THREE.Vector3(0,1.75,6), yaw:0, targetYaw:0 }, remoteAvatar: THREE.Group | undefined;
const keys = new Set<string>(); let grabbed = false, cubeVelocity = new THREE.Vector3(); let syncedCube = new THREE.Vector3(); let plates = { a:false, b:false }, elapsed = 0;
const ray = new THREE.Raycaster();

function makeAvatar(color: number) { const g = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity:.25, metalness:.75 }); const body = new THREE.Mesh(new THREE.CapsuleGeometry(.38, .75, 6, 12), mat); body.position.y=.65; body.castShadow=true; g.add(body); const eye = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 8), new THREE.MeshBasicMaterial({color:0xffffff})); eye.position.set(0,.88,.35); g.add(eye); scene.add(g); return g; }
function roomCode() { return Math.random().toString(36).slice(2,8).toUpperCase(); }
async function peerConfig() { const h = ($('#peerHost') as HTMLInputElement).value.trim(); const p = Number(($('#peerPort') as HTMLInputElement).value); const turn = ($('#turnUrl') as HTMLInputElement).value.trim(); let iceServers: RTCIceServer[] = [{urls:'stun:stun.l.google.com:19302'}]; if(turn) try { const response=await fetch(turn,{method:'POST'}); if(response.ok) iceServers=(await response.json()).iceServers ?? iceServers; } catch { setNet('turn unavailable','Continuing with Google STUN; relay may be unavailable.'); } return { ...(h ? {host:h,port:p||443,secure:true}:{}), config:{iceServers} }; }
function roomFromUrl() { return new URLSearchParams(location.search).get('room')?.toUpperCase() ?? ''; }
function updateText() { $('#chamber').textContent = `CHAMBER ${String(level + 1).padStart(2,'0')} — ${chambers[level].name}`; $('#objective').textContent = chambers[level].objective; }
function setNet(state: string, detail = '') { $('#net').textContent = state.toUpperCase(); $('#networkDetail').textContent = detail; $('#partner').textContent = state === 'connected' ? 'PARTNER: LINKED' : 'PARTNER: WAITING'; $('#roomCodeStatus').textContent = net.roomId ? `ROOM: ${net.roomId}` : 'TRAINING'; $('#routeStatus').textContent = detail || state.toUpperCase(); }
async function start(training=false) {
  modal.classList.add('hidden'); menu.classList.add('hidden'); hud.classList.remove('hidden'); running = true; await physics.init();
  physics.addStaticBox(new THREE.Vector3(0,-.25,0), new THREE.Vector3(22,.5,22)); updateText();
  if (!training && !remoteAvatar) remoteAvatar = makeAvatar(0x16dbff); if (training) { remoteAvatar = makeAvatar(0xffa719); remoteAvatar.position.set(4,0,-2); setNet('training'); }
  canvas.requestPointerLock();
}
function rebuild(next: number) { level = next; scene.remove(chamber.world); chamber = makeChamber(scene, level); void dressSciFiChamber(chamber.world, level); portals.set([]); pos.set(0,1.75,7); velocity.set(0,0,0); cubeVelocity.set(0,0,0); syncedCube.copy(chamber.cube.position); updateText(); }
function shot(kind: 'amber'|'cyan') { if (!locked) return; ray.setFromCamera(new THREE.Vector2(), camera); const targets = chamber.world.children.filter(x => x instanceof THREE.Mesh); const hit = ray.intersectObjects(targets, false).find(h => h.object !== chamber.cube); if (!hit) return; const normal = hit.face?.normal.clone().transformDirection(hit.object.matrixWorld) ?? new THREE.Vector3(0,0,1); portals.place(kind, net.isHost ? 'host':'guest', hit.point, normal); }
function currentPortals() { return portals.portals; }
function update(dt: number) {
  if (!running) return; elapsed += dt; const speed = keys.has('ShiftLeft') ? 8 : 4.3; const forward = new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)); const right = new THREE.Vector3(-forward.z,0,forward.x); const desired = new THREE.Vector3();
  if(keys.has('KeyW')) desired.add(forward); if(keys.has('KeyS')) desired.sub(forward); if(keys.has('KeyD')) desired.add(right); if(keys.has('KeyA')) desired.sub(right); if(desired.lengthSq()) desired.normalize().multiplyScalar(speed);
  velocity.x += (desired.x-velocity.x)*Math.min(1,dt*12); velocity.z += (desired.z-velocity.z)*Math.min(1,dt*12); velocity.y -= 18*dt; if(pos.y + velocity.y*dt < 1.65) { pos.y=1.65; velocity.y=0; grounded=true; } else { pos.y += velocity.y*dt; grounded=false; } pos.x += velocity.x*dt; pos.z += velocity.z*dt; pos.x=THREE.MathUtils.clamp(pos.x,-10,10);pos.z=THREE.MathUtils.clamp(pos.z,-10,10);
  portals.teleport(pos, velocity, dt); camera.position.copy(pos); camera.rotation.set(pitch,yaw,0,'YXZ');
  if (grabbed) { const target = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(2).add(camera.position); chamber.cube.position.lerp(target,.22); cubeVelocity.copy(target).sub(chamber.cube.position).multiplyScalar(20); } else { cubeVelocity.y -= 18*dt; chamber.cube.position.addScaledVector(cubeVelocity,dt); if(chamber.cube.position.y<.6){chamber.cube.position.y=.6;cubeVelocity.y=0;} }
  plates.a = pos.distanceTo(chamber.plateA.position) < 1.2 || chamber.cube.position.distanceTo(chamber.plateA.position)<1.25; plates.b = (remoteAvatar ? remote.pos.distanceTo(chamber.plateB.position)<1.2 : true) || chamber.cube.position.distanceTo(chamber.plateB.position)<1.25;
  const both = plates.a && plates.b; (chamber.plateA.material as THREE.MeshStandardMaterial).emissive.setHex(plates.a?0xff7a00:0x241400); (chamber.plateB.material as THREE.MeshStandardMaterial).emissive.setHex(plates.b?0x00aee8:0x001d2b); chamber.door.position.y = THREE.MathUtils.lerp(chamber.door.position.y, both ? 5.7 : 2, Math.min(1,dt*3));
  if (both && pos.z < -8.8) finish();
  remote.pos.lerp(remote.target,.12); remote.yaw = THREE.MathUtils.lerp(remote.yaw,remote.targetYaw,.12); if(remoteAvatar){remoteAvatar.position.copy(remote.pos);remoteAvatar.position.y-=1.65;remoteAvatar.rotation.y=remote.yaw;}
  if (elapsed>.06) { elapsed=0; sync(); } renderer.render(scene,camera);
}
function sync() { const data: Snapshot = {type:'snapshot',pos:arr(pos),yaw,pitch,portals:currentPortals(),cube:arr(chamber.cube.position),plateA:plates.a,plateB:plates.b,level}; net.send({type:'snapshot',payload:data}); }
function finish() { if(complete.classList.contains('hidden')) { complete.classList.remove('hidden'); document.exitPointerLock(); $('#completeTitle').textContent = level === 2 ? 'SEQUENCE COMPLETE' : 'BOTH SIGNALS CONFIRMED'; $('#completeText').textContent = level === 2 ? 'The facility recognizes the pair. You made it out together.' : 'Both explorers must select READY to proceed.'; } }
function reset() { rebuild(level); net.send({type:'reset'}); }
function message(m: RoomMessage) { if(m.type==='full'){setNet('room full','This room already has two explorers.'); return;} if(m.type==='reset'){rebuild(level);return;} if(m.type==='next'){rebuild(Math.min(2,level+1));return;} if(m.type==='snapshot'&&m.payload){const s=m.payload; remote.target.fromArray(s.pos);remote.targetYaw=s.yaw; syncedCube.fromArray(s.cube); const localOwner=net.isHost?'host':'guest'; const merged=[...portals.portals.filter(p=>p.owner===localOwner),...s.portals.filter(p=>p.owner!==localOwner)]; portals.set(merged); if(!net.isHost) { chamber.cube.position.lerp(syncedCube,.3); if(s.level!==level) rebuild(s.level); } } }
net.onMessage=message; net.onState=(s,d)=>setNet(s,d);

$('#create').onclick=()=>{ modal.classList.remove('hidden'); $('#modalTitle').textContent='CREATE ROOM'; $('#modalText').textContent='Create a private two-player link.'; ($('#roomInput') as HTMLInputElement).value=roomCode(); $('#connect').textContent='CREATE LINK'; };
$('#join').onclick=()=>{ modal.classList.remove('hidden'); $('#modalTitle').textContent='JOIN ROOM'; $('#modalText').textContent='Enter the room code shared by your partner.'; ($('#roomInput') as HTMLInputElement).value=roomFromUrl(); $('#connect').textContent='JOIN LINK'; };
$('#solo').onclick=()=>start(true); $('.close').onclick=()=>modal.classList.add('hidden');
$('#connect').onclick=async()=>{ const id=($('#roomInput') as HTMLInputElement).value.trim().toUpperCase(); if(id.length<4){setNet('invalid','Use a 4–8 character code.');return;} const creating=$('#modalTitle').textContent==='CREATE ROOM'; const config=await peerConfig(); if(creating){net.create(id,config); const url=`${location.origin}${location.pathname}?room=${id}`; $('#inviteCode').textContent=url; $('#invite').classList.remove('hidden');}else net.join(id,config); start(); };
$('#copy').onclick=async()=>{await navigator.clipboard.writeText($('#inviteCode').textContent||''); $('#copy').textContent='COPIED';};
$('#next').onclick=()=>{ complete.classList.add('hidden'); if(level<2){rebuild(level+1);net.send({type:'next'});canvas.requestPointerLock();}else{menu.classList.remove('hidden');hud.classList.add('hidden');running=false;} };
$('#resume').onclick=()=>{pause.classList.add('hidden');canvas.requestPointerLock();}; $('#leave').onclick=()=>location.href=location.pathname;
canvas.addEventListener('click',()=>{if(running&&!locked)canvas.requestPointerLock();}); document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas; if(running&&!locked&&complete.classList.contains('hidden'))pause.classList.remove('hidden');});
document.addEventListener('mousemove',e=>{if(!locked)return; const sensitivity=Number(($('#sensitivity')as HTMLInputElement).value);yaw-=e.movementX*sensitivity;pitch=THREE.MathUtils.clamp(pitch-e.movementY*sensitivity,-1.48,1.48);});
document.addEventListener('keydown',e=>{ if(['Space','Tab'].includes(e.code)) e.preventDefault(); if(e.repeat && ['KeyE','KeyR','KeyF','Tab'].includes(e.code)) return; keys.add(e.code); if(e.code==='Space'&&grounded){velocity.y=7.2;grounded=false;} if(e.code==='KeyE'){grabbed=!grabbed;} if(e.code==='KeyR')reset(); if(e.code==='Tab')$('#roomStatus').classList.toggle('hidden'); if(e.code==='KeyF'&&running)document.fullscreenElement?document.exitFullscreen():canvas.requestFullscreen(); if(e.code==='Escape'&&running)pause.classList.remove('hidden');}); document.addEventListener('keyup',e=>keys.delete(e.code));
canvas.addEventListener('contextmenu',e=>e.preventDefault()); canvas.addEventListener('mousedown',e=>{if(e.button===0)shot('amber');if(e.button===2)shot('cyan');});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function loop(now:number){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);requestAnimationFrame(loop);} requestAnimationFrame(loop);
