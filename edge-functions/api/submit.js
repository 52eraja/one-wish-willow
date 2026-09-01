// edge-functions/api/submit.js
// 主动把站点 URL / sitemap 推送给全球主流搜索引擎，并返回「逐引擎」的提交状态（含尝试次数、耗时、错误信息）。
//
// 引擎清单：
//   indexnow  POST https://api.indexnow.org/IndexNow
//             —— 一次调用同时分发给所有 IndexNow 参与方：Bing、Yandex、Seznam、Naver
//   google    GET  https://www.google.com/ping?sitemap=...
//             —— 传统 sitemap ping。注意：Google 没有公开的「URL 推送」API，官方途径是
//                Search Console 提交 sitemap / Indexing API（后者仅限 JobPosting 等类型），
//                这里是尽力而为的 ping，不保证立即收录。
//   bing      GET  https://www.bing.com/ping?sitemap=...
//   yandex    GET  https://webmaster.yandex.com/ping?sitemap=...
//   baidu     POST http://data.zz.baidu.com/urls?site=&token=
//             —— 需 env.BAIDU_TOKEN，未配置则自动跳过（不计入失败）。
//
// 调用方式（GET 便于 cron / curl，POST 便于带 JSON body）：
//   /api/submit
//     ?engines=indexnow,google   只提交指定引擎（失败重试只重跑失败项）
//     ?urls=https://a,https://b  覆盖待提交 URL（默认解析 sitemap.xml）
//     ?attempts=3                每引擎最多尝试次数，默认 2，上限 4
//     ?token=...                 仅当 env.SUBMIT_TOKEN 已设置时要求携带（防滥用）
const DEFAULT_ORIGIN = 'https://onewishwillow.bvip.one';
const DEFAULT_INDEXNOW_KEY = '7b36a53e013b6782f2fb902d2463f7ab';

const TIMEOUT_MS = 8000;   // 单次请求超时
const DEFAULT_ATTEMPTS = 2; // 默认尝试次数（1 次正常 + 1 次重试）
const MAX_ATTEMPTS = 4;

const ENGINES = {
  indexnow: { label: 'IndexNow（Bing / Yandex / Seznam / Naver）', kind: 'indexnow' },
  google:   { label: 'Google（Sitemap Ping）', kind: 'ping', ping: 'https://www.google.com/ping?sitemap=' },
  bing:     { label: 'Bing（Sitemap Ping）',   kind: 'ping', ping: 'https://www.bing.com/ping?sitemap=' },
  yandex:   { label: 'Yandex（Sitemap Ping）', kind: 'ping', ping: 'https://webmaster.yandex.com/ping?sitemap=' },
  baidu:    { label: 'Baidu（需 BAIDU_TOKEN）', kind: 'baidu' }
};
const BASE_ENGINES = ['indexnow', 'google', 'bing', 'yandex'];

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*'
};

function json(obj, status) {
  return new Response(JSON.stringify(obj, null, 2), { status: status || 200, headers: JSON_HEADERS });
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

// 带超时的 fetch；超时或网络异常会 throw
async function fetchWithTimeout(url, init, ms) {
  const ac = new AbortController();
  const timer = setTimeout(function () { ac.abort(); }, ms);
  try {
    return await fetch(url, Object.assign({}, init, { signal: ac.signal }));
  } finally {
    clearTimeout(timer);
  }
}

function isRetryable(res) {
  // status 0 = 网络错误/超时；429 限流；5xx 服务端故障 —— 这些都值得重试
  return res.status === 0 || res.status === 429 || res.status >= 500;
}

function indexnowMessage(status) {
  if (status === 200) return '已接收（URL 已排队待抓取）';
  if (status === 202) return '已接收（异步处理中）';
  if (status === 400) return '请求格式错误';
  if (status === 403) return '密钥无效或 keyLocation 不可访问';
  if (status === 422) return 'URL 不属于该 host 或格式非法';
  if (status === 429) return '请求过于频繁（已重试）';
  return 'HTTP ' + status;
}

// 解析 sitemap.xml 中的 <loc>，过滤掉图片/静态资源
async function urlsFromSitemap(sitemapUrl) {
  try {
    const r = await fetchWithTimeout(sitemapUrl, { method: 'GET' }, TIMEOUT_MS);
    if (!r.ok) return [];
    const xml = await r.text();
    const locs = [];
    const re = /<loc>([^<]+)<\/loc>/g;
    let m;
    while ((m = re.exec(xml)) !== null) locs.push(m[1].trim());
    return locs.filter(function (u) {
      return !/\.(png|jpe?g|gif|svg|webp|mp3|mp4|ico|css|js|txt|xml)$/i.test(u);
    });
  } catch (e) {
    return [];
  }
}

// 单次尝试某个引擎
async function attemptEngine(name, cfg, ctx) {
  if (cfg.kind === 'indexnow') {
    const r = await fetchWithTimeout('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: ctx.host,
        key: ctx.key,
        keyLocation: ctx.keyLocation,
        urlList: ctx.urls
      })
    }, TIMEOUT_MS);
    return { ok: r.ok, status: r.status, message: indexnowMessage(r.status) };
  }

  if (cfg.kind === 'ping') {
    const r = await fetchWithTimeout(cfg.ping + encodeURIComponent(ctx.sitemapUrl), {
      method: 'GET', redirect: 'follow'
    }, TIMEOUT_MS);
    // 404 / 410 = 该 sitemap ping 端点已被搜索引擎下线（实测：Google 返回 404、Bing 返回 410）。
    // 这属于供应商侧变更，并非本站故障，因此单独标记为 retired：不计入失败、也不重试。
    if (r.status === 404 || r.status === 410) {
      return {
        ok: false,
        status: r.status,
        retired: true,
        message: '该 ping 端点已被引擎下线（HTTP ' + r.status + '）→ 请改用 IndexNow 或搜索引擎站长平台提交'
      };
    }
    return {
      ok: r.ok,
      status: r.status,
      message: r.ok ? 'Sitemap 已通知（等待抓取）' : 'Ping 被拒绝 HTTP ' + r.status
    };
  }

  if (cfg.kind === 'baidu') {
    if (!ctx.baiduToken) {
      return { ok: false, status: 0, message: '未配置 BAIDU_TOKEN，已跳过', skipped: true };
    }
    const url = 'http://data.zz.baidu.com/urls?site=' +
      encodeURIComponent(ctx.origin) + '&token=' + encodeURIComponent(ctx.baiduToken);
    const r = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: ctx.urls.join('\n')
    }, TIMEOUT_MS);
    let msg = 'HTTP ' + r.status;
    try {
      const j = await r.json();
      if (j && j.success !== undefined) msg = '成功推送 ' + j.success + ' 条' + (j.remain !== undefined ? '，剩余额度 ' + j.remain : '');
      if (j && j.error) msg = '错误 ' + j.error + ': ' + (j.message || '');
    } catch (e) { /* 非 JSON 响应就用状态码 */ }
    return { ok: r.ok, status: r.status, message: msg };
  }

  return { ok: false, status: 0, message: '未知引擎' };
}

// 带指数退避重试的引擎执行器（返回逐引擎状态，供前端展示）
async function runEngine(name, cfg, ctx, maxAttempts) {
  const started = Date.now();
  let attempts = 0;
  let last = { ok: false, status: 0, message: '未执行' };

  for (let i = 1; i <= maxAttempts; i++) {
    attempts = i;
    try {
      last = await attemptEngine(name, cfg, ctx);
    } catch (e) {
      const isAbort = e && e.name === 'AbortError';
      last = { ok: false, status: 0, message: isAbort ? '请求超时（' + TIMEOUT_MS + 'ms）' : '网络异常：' + (e && e.message ? e.message : 'fetch failed') };
    }
    // 成功 / 跳过 / 不可重试的错误（如 400 参数错）→ 立即结束
    if (last.ok || last.skipped || !isRetryable(last)) break;
    // 指数退避：400ms → 800ms → 1600ms
    if (i < maxAttempts) await sleep(400 * Math.pow(2, i - 1));
  }

  return {
    engine: name,
    label: cfg.label,
    ok: !!last.ok,
    status: last.status || 0,
    attempts: attempts,
    ms: Date.now() - started,
    message: last.message || '',
    skipped: !!last.skipped,
    retired: !!last.retired
  };
}

export default async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'GET' && request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const url = new URL(request.url);
  let body = {};
  if (request.method === 'POST') {
    try { body = await request.json(); } catch (e) { body = {}; }
  }
  const q = function (k) { return url.searchParams.get(k) || body[k] || ''; };

  // 可选访问令牌：只有配置了 SUBMIT_TOKEN 才启用校验（默认开放，便于一键提交）
  const required = (env.SUBMIT_TOKEN || '').trim();
  if (required && q('token') !== required) {
    return json({ error: 'invalid_token', hint: 'env.SUBMIT_TOKEN 已启用，请在请求中带上 ?token=...' }, 401);
  }

  // 站点来源：env.SITE_URL / env.FRONTEND_URL → 请求 Origin → 硬编码生产域
  const origin = (
    (env.SITE_URL || env.FRONTEND_URL || '').trim() ||
    (request.headers.get('origin') || '').trim() ||
    DEFAULT_ORIGIN
  ).replace(/\/+$/, '');

  let host = origin;
  try { host = new URL(origin).host; } catch (e) { /* 保留原值 */ }

  const sitemapUrl = (env.SITEMAP_URL || '').trim() || origin + '/sitemap.xml';
  const key = (env.INDEXNOW_KEY || '').trim() || DEFAULT_INDEXNOW_KEY;
  const keyLocation = origin + '/' + key + '.txt';
  const baiduToken = (env.BAIDU_TOKEN || '').trim();

  // 待提交 URL：优先用传入的，否则解析 sitemap；再兜底首页 + 两个付费深链
  let urls = [];
  const rawUrls = q('urls');
  if (rawUrls) {
    urls = String(rawUrls).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }
  if (!urls.length) urls = await urlsFromSitemap(sitemapUrl);
  if (!urls.length) urls = [origin + '/', origin + '/?pay=single', origin + '/?pay=unlimited'];
  // 安全：只允许提交本站 URL，避免被当成任意站点推送代理
  urls = urls.filter(function (u) {
    try { return new URL(u).host === host; } catch (e) { return false; }
  });
  urls = Array.from(new Set(urls));

  // 引擎选择
  let wanted = [];
  const rawEngines = q('engines');
  if (rawEngines) {
    wanted = String(rawEngines).split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
  } else {
    wanted = BASE_ENGINES.slice();
    if (baiduToken) wanted.push('baidu');
  }
  wanted = wanted.filter(function (n) { return !!ENGINES[n]; });

  let attempts = parseInt(q('attempts'), 10);
  if (isNaN(attempts) || attempts < 1) attempts = DEFAULT_ATTEMPTS;
  if (attempts > MAX_ATTEMPTS) attempts = MAX_ATTEMPTS;

  const ctx = { origin: origin, host: host, sitemapUrl: sitemapUrl, urls: urls, key: key, keyLocation: keyLocation, baiduToken: baiduToken };

  // 所有引擎并发执行（彼此独立，单个失败不影响其它）
  const results = await Promise.all(wanted.map(function (n) {
    return runEngine(n, ENGINES[n], ctx, attempts);
  }));

  const success = results.filter(function (r) { return r.ok; }).length;
  const skipped = results.filter(function (r) { return r.skipped; }).length;
  const retired = results.filter(function (r) { return r.retired; }).length;
  const failed = results.filter(function (r) { return !r.ok && !r.skipped && !r.retired; }).length;

  return json({
    ok: failed === 0,
    site: origin,
    host: host,
    sitemap: sitemapUrl,
    indexNow: { key: key, keyLocation: keyLocation },
    urlCount: urls.length,
    urlList: urls,
    summary: { total: results.length, success: success, failed: failed, skipped: skipped },
    failedEngines: results.filter(function (r) { return !r.ok && !r.skipped; }).map(function (r) { return r.engine; }),
    attempts: attempts,
    results: results,
    ts: new Date().toISOString()
  });
}
