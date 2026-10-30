# Portal Pair

An original, silent two-player 3D puzzle prototype. It uses local CC0 Kenney Modular Space Kit GLB dressing, procedural Three.js geometry, peer-to-peer WebRTC data channels, and Rapier initialization for the physics layer. It does not include assets, audio, or references from any commercial game.

## Local development

```bash
npm install
npm run dev
```

Open the URL Vite prints in two desktop browsers. In one browser choose **Create room**, then send the generated URL to the partner. The room accepts exactly one joiner. Select **Training mode** to inspect the controls alone.

## Controls

WASD moves, mouse looks, space jumps, left/right mouse buttons place amber/cyan portals, E picks up or releases the cube, R resets, Escape pauses. The experience is deliberately silent; visual portal, plate, door and HUD states provide feedback.

## Build and deployment

```bash
npm run build
cd dist && zip -r ../portal-pair-cloudflare-pages.zip .
```

Upload the `dist/` output to **Cloudflare Pages** using Direct Upload, or connect a Git repository with build command `npm run build` and output directory `dist`. Every generated file is far below 25 MB. `public/_redirects` also makes this bundle suitable for Netlify Drop: upload the separately generated deployment ZIP there as an alternative.

## PeerJS, ICE, and TURN

The default signaling configuration is PeerJS Cloud (`0.peerjs.com`). The lobby exposes host and port fields for a self-hosted PeerServer. Browser-to-browser WebRTC normally uses STUN to establish a direct route; restrictive NATs/firewalls can require a TURN relay.

Deploy `turn-worker/` separately to Cloudflare Workers and set `TURN_SHARED_SECRET` and `TURN_URL` as Worker secrets. Point the lobby's TURN endpoint field to that Worker (for example, `/api/turn` if routed through Pages). The client receives only temporary username/credential pairs—never the Cloudflare API token. Metered Open Relay can be used as a development fallback but is not an appropriate production reliability guarantee. The lobby status identifies an established P2P session and should be extended with `RTCPeerConnection.getStats()` candidate-pair reporting for authoritative direct-versus-relayed diagnostics in a production PeerJS adapter.

## Prototype scope

The static host cannot run a central simulation server, so the room creator acts as the authority for puzzle state. This build demonstrates two-player lobby capacity, movement interpolation, four owner-tagged gateways, plane-crossing teleport transforms, shared cube/plate/door state, and three progressively dressed chambers. Production networking should add server-side anti-cheat, reconnection state recovery, tested TURN credentials, and full collision geometry before a public launch.
