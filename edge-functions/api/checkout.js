// edge-functions/api/checkout.js
// 创建 Stripe Checkout Session。密钥仅来自 context.env（EdgeOne 项目环境变量），
// 绝不写死在前端或本文件。前端 pay.js POST { tier:"single"|"unlimited" } -> { url }。
//
// 回跳地址解析顺序（先取最明确的，便于环境多套域名时切换）：
//   1) env.SUCCESS_URL / env.CANCEL_URL       完全自定义（可含 path 与查询参数）
//   2) env.FRONTEND_URL                       站点根域，自动补上 ?paid=1 / ?canceled=1
//   3) request.headers.get('origin')          浏览器自动带的 Origin（POST 必带）
//   4) DEFAULT_ORIGIN（硬编码兜底）             正式版生产域名
const DEFAULT_ORIGIN = 'https://onewishwillow.bvip.one';

function stripTrailingSlash(s) { return s.replace(/\/+$/, ''); }
function joinUrl(base, qs) {
  const sep = base.indexOf('?') >= 0 ? '&' : '?';
  return stripTrailingSlash(base) + sep + qs;
}

export default async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  const key = env.STRIPE_SECRET_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'stripe_not_configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  let body = {};
  try { body = await request.json(); } catch (e) { body = {}; }

  const tier = (body && body.tier === 'unlimited') ? 'unlimited' : 'single';
  const PRICES = {
    single:    { amount: 100, name: '单根许愿柳 · Single Wish Willow' },
    unlimited: { amount: 699, name: '不限量许愿柳 · Unlimited Wish Willows' }
  };
  const p = PRICES[tier];

  // 解析前端基础域
  const origin =
    stripTrailingSlash(env.SUCCESS_URL || env.CANCEL_URL || env.FRONTEND_URL || '') ||
    (request.headers.get('origin') || '').replace(/\/+$/, '') ||
    DEFAULT_ORIGIN;

  // success_url：{CHECKOUT_SESSION_ID} 由 Stripe 回跳时替换为真实 session id
  //            供前端 /api/verify 校验支付结果（entitle.js 据此发放权益）。
  // cancel_url：带 canceled=1，前端可据此给一个温和提示（购买未完成）。
  const success_url = (env.SUCCESS_URL && env.SUCCESS_URL.trim())
    ? joinUrl(env.SUCCESS_URL.trim(), 'paid=1&session_id={CHECKOUT_SESSION_ID}')
    : joinUrl(origin, 'paid=1&session_id={CHECKOUT_SESSION_ID}');

  const cancel_url = (env.CANCEL_URL && env.CANCEL_URL.trim())
    ? env.CANCEL_URL.trim()
    : joinUrl(origin, 'canceled=1');

  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', success_url);
  params.set('cancel_url', cancel_url);
  params.set('metadata[tier]', tier);
  params.set('line_items[0][price_data][currency]', 'usd');
  params.set('line_items[0][price_data][product_data][name]', p.name);
  params.set('line_items[0][price_data][unit_amount]', String(p.amount));
  params.set('line_items[0][quantity]', '1');

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    const data = await r.json();
    if (!r.ok) {
      return new Response(JSON.stringify({ error: (data && data.error && data.error.message) || 'stripe_error' }), {
        status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    return new Response(JSON.stringify({ url: data.url, tier: tier }), {
      status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'fetch_failed' }), {
      status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
