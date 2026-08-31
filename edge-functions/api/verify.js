// edge-functions/api/verify.js
// 支付回跳校验：GET /api/verify?session_id=cs_live_xxx
// 用 context.env.STRIPE_SECRET_KEY 拉取 Checkout Session，payment_status==='paid' 时返回 { tier }，
// 否则返回 { error }。前端 entitle.js 据此授予权益（single / unlimited）。
export default async function onRequest(context) {
  const { request, env } = context;

  const url = new URL(request.url);
  const sid = url.searchParams.get('session_id');
  if (!sid) {
    return json({ error: 'missing_session_id' }, 400);
  }

  const key = env.STRIPE_SECRET_KEY;
  if (!key) {
    return json({ error: 'stripe_not_configured' }, 500);
  }

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sid), {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + key }
    });
    const d = await r.json();
    if (!r.ok) {
      return json({ error: (d && d.error && d.error.message) || 'stripe_error' }, 500);
    }
    if (d.payment_status === 'paid') {
      const tier = (d.metadata && d.metadata.tier === 'unlimited') ? 'unlimited' : 'single';
      return json({ tier: tier });
    }
    return json({ error: 'unpaid', status: (d && d.payment_status) || 'unknown' });
  } catch (e) {
    return json({ error: 'fetch_failed' }, 500);
  }
}

function json(o, status) {
  return new Response(JSON.stringify(o), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
