/* ============================================================================
 * One Wish Willow — Stripe 支付后端（仅服务端）
 * ----------------------------------------------------------------------------
 * ⚠️ 安全：STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET 只能来自环境变量（.env），
 *    绝不写入任何前端文件或提交到仓库。若密钥已在聊天/前端泄露，请立即到
 *    Stripe 后台轮换。
 *
 * 路由：
 *   POST /api/checkout   { tier: "single"|"unlimited" } -> { url } (Stripe Checkout)
 *   POST /api/webhook    Stripe 事件回调（校验签名）
 *
 * 本地运行：
 *   cd server && npm install && cp .env.example .env  # 填入真实 key
 *   node server.js
 * ========================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

// 载入 .env（仅本地；生产由宿主环境变量注入）
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const txt = fs.readFileSync(envPath, 'utf8');
    txt.split('\n').forEach(line => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  }
} catch (e) { /* 忽略 */ }

const PORT = process.env.PORT || 8788;
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/+$/, '') || ('http://localhost:' + PORT);
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

let stripe = null;
if (STRIPE_SECRET_KEY) {
  try { stripe = require('stripe')(STRIPE_SECRET_KEY); }
  catch (e) { console.warn('[stripe] 未安装 stripe 依赖或密钥无效：', e.message); }
}

const PRICES = {
  single: { amount: 100, name: '单根许愿柳 · Single Wish Willow' },
  unlimited: { amount: 699, name: '不限量许愿柳 · Unlimited Wish Willows' }
};

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function handleCheckout(req, res) {
  if (!stripe) return sendJSON(res, 500, { error: 'stripe_not_configured' });
  let tier = 'single';
  try { const b = JSON.parse(await readBody(req) || '{}'); if (b.tier && PRICES[b.tier]) tier = b.tier; }
  catch (e) { /* 用默认 */ }
  const p = PRICES[tier];
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: p.name },
          unit_amount: p.amount
        },
        quantity: 1
      }],
      success_url: FRONTEND_URL + '?paid=1',
      cancel_url: FRONTEND_URL,
      metadata: { tier: tier }
    });
    return sendJSON(res, 200, { url: session.url });
  } catch (e) {
    console.error('[checkout] 创建会话失败：', e.message);
    return sendJSON(res, 500, { error: e.message });
  }
}

async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const raw = await readBody(req);
  if (!stripe || !STRIPE_WEBHOOK_SECRET) return sendJSON(res, 500, { error: 'webhook_not_configured' });
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('[webhook] 签名校验失败：', e.message);
    return sendJSON(res, 400, { error: 'invalid_signature' });
  }
  if (event.type === 'checkout.session.completed') {
    const sess = event.data.object;
    console.log('[webhook] 支付完成 tier=', sess.metadata && sess.metadata.tier, 'session=', sess.id);
    // 此处可接入你的账户系统，按 session.metadata.tier 发放「不限量」等权益。
  }
  return sendJSON(res, 200, { received: true });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/checkout') return await handleCheckout(req, res);
    if (req.method === 'POST' && req.url === '/api/webhook') return await handleWebhook(req, res);
    if (req.method === 'GET' && req.url === '/api/healthz') {
      return sendJSON(res, 200, { ok: true, stripe: !!stripe, webhook: !!STRIPE_WEBHOOK_SECRET });
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end('{"error":"not_found"}');
  } catch (e) {
    sendJSON(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log('[oww-pay] listening on', PORT, '| stripe:', !!stripe, '| webhook:', !!STRIPE_WEBHOOK_SECRET);
});
