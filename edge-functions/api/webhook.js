// edge-functions/api/webhook.js
// Stripe 事件回调。校验签名（Web Crypto HMAC-SHA256），密钥仅来自 env。
// 校验通过后，可按 event.data.object.metadata.tier 发放权益（如「不限量」）。
export default async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') {
    return new Response('method_not_allowed', { status: 405 });
  }

  const key = env.STRIPE_SECRET_KEY;
  const whsec = env.STRIPE_WEBHOOK_SECRET;
  if (!key || !whsec) {
    return new Response(JSON.stringify({ error: 'webhook_not_configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  const sig = request.headers.get('stripe-signature') || '';
  const raw = await request.text();

  const ok = await verifySig(raw, sig, whsec);
  if (!ok) return new Response('invalid signature', { status: 400 });

  let event;
  try { event = JSON.parse(raw); } catch (e) { return new Response('bad json', { status: 400 }); }

  if (event && event.type === 'checkout.session.completed') {
    const sess = event.data && event.data.object;
    const tier = sess && sess.metadata && sess.metadata.tier;
    console.log('[webhook] paid tier=', tier, 'session=', sess && sess.id);
    // TODO: 在此接入你的账户系统，按 tier 发放「不限量」等权益。
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

async function verifySig(raw, sig, secret) {
  const parts = sig.split(',');
  let t = null, v1 = null;
  for (const part of parts) {
    const kv = part.split('=');
    if (kv.length === 2) {
      if (kv[0] === 't') t = kv[1];
      if (kv[0] === 'v1') v1 = kv[1];
    }
  }
  if (!t || !v1) return false;

  const signedPayload = t + '.' + raw;
  let keyBytes;
  try { keyBytes = base64ToBytes(secret); } catch (e) { return false; }

  let cryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  } catch (e) { return false; }

  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(signedPayload));
  const hex = bufToHex(sigBuf);
  return timingSafeEqual(hex, v1);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bufToHex(buf) {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
  return s;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
