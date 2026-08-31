// edge-functions/api/healthz.js
// 健康检查：返回 Stripe / Webhook 是否已配置（密钥来自 env，不在此暴露）。
export default function onRequest(context) {
  const env = context.env || {};
  return new Response(JSON.stringify({
    ok: true,
    stripe: !!env.STRIPE_SECRET_KEY,
    webhook: !!env.STRIPE_WEBHOOK_SECRET
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
