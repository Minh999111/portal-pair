/**
 * Deploy separately with Wrangler. Put TURN_SHARED_SECRET and TURN_URL in Worker
 * secrets. This endpoint never sends a provider API token to a browser.
 */
export interface Env { TURN_SHARED_SECRET: string; TURN_URL: string }
const encoder = new TextEncoder();
async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const origin = request.headers.get('Origin') ?? '';
    // Replace with your Pages domain(s) for production.
    if (!origin.startsWith('https://')) return new Response('Forbidden', { status: 403 });
    const username = `${Math.floor(Date.now() / 1000) + 600}:portal-pair`;
    const credential = await hmac(env.TURN_SHARED_SECRET, username);
    return Response.json({ iceServers: [{ urls: [env.TURN_URL], username, credential }] }, {
      headers: { 'Access-Control-Allow-Origin': origin, 'Cache-Control': 'no-store' }
    });
  }
};
