import Peer, { DataConnection, type PeerJSOption } from 'peerjs';
import type { RoomMessage } from '../game/types';

export type NetworkState = 'offline' | 'hosting' | 'joining' | 'connected' | 'disconnected';
export class Network {
  peer?: Peer; conn?: DataConnection; state: NetworkState = 'offline'; roomId = ''; isHost = false;
  onMessage: (m: RoomMessage) => void = () => {}; onState: (s: NetworkState, detail?: string) => void = () => {};
  private setup(peer: Peer) {
    this.peer = peer;
    peer.on('error', e => this.onState('disconnected', e.message));
    peer.on('disconnected', () => this.onState('disconnected', 'Signaling disconnected'));
  }
  create(roomId: string, config?: PeerJSOption) {
    this.isHost = true; this.roomId = roomId; this.state = 'hosting';
    const peer = new Peer(`pair-${roomId}`, config); this.setup(peer);
    peer.on('open', () => { this.onState('hosting', `Room ${roomId} ready`); });
    peer.on('connection', c => {
      if (this.conn?.open) { c.send({ type: 'full' }); c.close(); return; }
      this.attach(c);
    });
  }
  join(roomId: string, config?: PeerJSOption) {
    this.isHost = false; this.roomId = roomId; this.state = 'joining';
    const peer = new Peer(`pair-client-${crypto.randomUUID().slice(0, 12)}`, config); this.setup(peer);
    peer.on('open', () => this.attach(peer.connect(`pair-${roomId}`, { reliable: true })));
  }
  private attach(c: DataConnection) {
    this.conn = c;
    c.on('open', () => { this.state = 'connected'; this.onState('connected', 'P2P link established — ICE checking'); this.send({ type: 'hello' }); void this.detectRoute(c); });
    c.on('data', (m: unknown) => this.onMessage(m as RoomMessage));
    c.on('close', () => { this.state = 'disconnected'; this.onState('disconnected', 'Partner disconnected'); });
    c.on('error', e => this.onState('disconnected', e.message));
  }
  private async detectRoute(c: DataConnection) {
    // Candidate-pair stats are the browser-authoritative answer to direct vs relay.
    await new Promise(resolve => setTimeout(resolve, 1200));
    try {
      const stats = await c.peerConnection.getStats(); let localId = '';
      stats.forEach(report => { if (report.type === 'candidate-pair' && (report.selected || report.nominated) && report.state === 'succeeded') localId = String(report.localCandidateId ?? ''); });
      let candidate: { candidateType?: string } | undefined; stats.forEach(report => { if (report.id === localId) candidate = report as { candidateType?: string }; });
      this.onState('connected', candidate?.candidateType === 'relay' ? 'P2P link established — RELAYED via TURN' : 'P2P link established — DIRECT');
    } catch { this.onState('connected', 'P2P link established — route unavailable'); }
  }
  send(m: RoomMessage) { if (this.conn?.open) this.conn.send(m); }
  destroy() { this.conn?.close(); this.peer?.destroy(); this.state = 'offline'; }
}
