/* 支付入口 — Stripe Checkout（仅前端）。密钥绝不明文出现在前端：
 * 后端 /api/checkout 读取 process.env.STRIPE_SECRET_KEY 创建 Checkout Session，
 * 前端只拿到回跳的支付 URL。apiBase 通过 <meta name="oww-api"> 配置（默认同源）。 */
(function () {
  'use strict';
  var selected = 'single';

  function T(k) { return (window.OWW && window.OWW.i18n) ? window.OWW.i18n.t(k) : k; }

  function apiBase() {
    var m = document.querySelector('meta[name="oww-api"]');
    var v = m ? (m.content || '').trim() : '';
    if (!v) return location.origin;
    return v.replace(/\/+$/, '');
  }

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('on'); }, 2800);
  }

  function openPay() { var p = document.getElementById('payOverlay'); if (p) p.classList.add('show'); }

  async function checkout(tier) {
    try {
      var r = await fetch(apiBase() + '/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tier })
      });
      if (!r.ok) throw new Error('bad');
      var j = await r.json();
      if (j && j.url) { location.href = j.url; }
      else { throw new Error('no-url'); }
    } catch (e) {
      toast(T('toast.nopay'));
    }
  }

  function wire() {
    var buy = document.getElementById('buyBtn');
    if (buy) buy.addEventListener('click', openPay);

    var ov = document.getElementById('payOverlay');
    if (ov) ov.addEventListener('click', function (e) {
      if (e.target.classList.contains('shade') || e.target.hasAttribute('data-close')) ov.classList.remove('show');
    });

    var tiers = document.querySelectorAll('.tier');
    for (var i = 0; i < tiers.length; i++) {
      tiers[i].addEventListener('click', function () {
        for (var j = 0; j < tiers.length; j++) tiers[j].classList.remove('sel');
        this.classList.add('sel');
        selected = this.getAttribute('data-tier');
      });
    }

    var payBtn = document.getElementById('payBtn');
    if (payBtn) payBtn.addEventListener('click', function () { checkout(selected); });

    // 独立金额直购按钮：每个按钮直接跳到对应金额的 Stripe 结算页，
    // 无需先选 tier 再点「前往支付」。深链 ?pay=single / ?pay=unlimited 同样生效。
    var directs = document.querySelectorAll('[data-tier-pay]');
    for (var k = 0; k < directs.length; k++) {
      directs[k].addEventListener('click', (function (t) {
        return function () { checkout(t); };
      })(directs[k].getAttribute('data-tier-pay')));
    }

    // 分享 / 推广直链：点击复制完整 URL 到剪贴板（带当前 origin，便于跨环境分享）
    var copyLinks = document.querySelectorAll('[data-copy-link]');
    var copyTip = document.getElementById('payCopyTip');
    for (var m = 0; m < copyLinks.length; m++) {
      copyLinks[m].addEventListener('click', (function (q) {
        return function (e) {
          e.preventDefault();
          var fullUrl = location.origin + location.pathname + q;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fullUrl).then(function () {
              if (copyTip) { copyTip.textContent = T('pay.copied'); setTimeout(function(){ copyTip.textContent=''; }, 1800); }
            });
          } else {
            // 兜底：弹窗让用户手动复制
            window.prompt(T('pay.directs.hint').replace(/[::]/g, ''), fullUrl);
          }
        };
      })(copyLinks[m].getAttribute('data-copy-link')));
    }

    // 支付取消回跳：?canceled=1 来自 Stripe cancel_url（已配置后端）
    try {
      if (new URLSearchParams(location.search).get('canceled') === '1') {
        setTimeout(function () { toast(T('toast.canceled')); }, 80);
        // 清理 URL 上的 canceled 参数，避免重复触发 / 影响分享
        try {
          var u = new URL(location.href);
          u.searchParams.delete('canceled');
          history.replaceState(null, '', u.pathname + (u.search ? u.search : '') + u.hash);
        } catch (e2) {}
      }
    } catch (e) { /* ignore */ }

    // 深链 ?pay=single | ?pay=unlimited 进入即跳对应金额（适合分享 / 邮件 / 广告直链）
    try {
      var pp = new URLSearchParams(location.search).get('pay');
      if (pp === 'single' || pp === 'unlimited') {
        // 略延后以避免抢 BGM 等初始化
        setTimeout(function () { checkout(pp); }, 50);
      }
    } catch (e) { /* 非浏览器环境 / URLSearchParams 不存在则忽略 */ }
  }

  window.OWW = window.OWW || {};
  window.OWW.pay = { checkout: checkout, openPay: openPay };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
