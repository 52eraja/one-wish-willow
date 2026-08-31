/* 权益门控 — 首次许愿免费；第二次起需支付 ($1 / $6.99 不限量)。
 *
 * 状态存 localStorage（按浏览器/账号粒度；用于测试与单端限制）：
 *   { freeUsed: bool, singleCredits: number, unlimited: bool }
 *
 * 入口：
 *   window.OWW.entitle.canWish()         -> bool
 *   window.OWW.entitle.consume()         -> 标记一次许愿被使用
 *   window.OWW.entitle.grant(tier)       -> 支付成功后授予权益
 *   window.OWW.entitle.state()           -> 当前状态对象
 *
 * 拦截：
 *   document 级 capture 监听 submit，仅作用于 #wishCard。
 *   无权时：preventDefault + stopPropagation，开 #payOverlay，弹 toast。
 *   允许时：consume()，放行到 game.js 的原逻辑。
 *
 * 支付回跳：
 *   ?paid=1&session_id=... -> 调 /api/verify 校验 Stripe 会后按结果授予。
 *   （verify 失败/未配置时不授予，提示「支付服务未连接」）
 */
(function () {
  'use strict';
  var LS = 'oww_entitle_v1';
  var INFINITE = 9999;

  function load() {
    try { var s = JSON.parse(localStorage.getItem(LS) || '{}'); return { freeUsed: !!s.freeUsed, singleCredits: s.singleCredits || 0, unlimited: !!s.unlimited }; }
    catch (e) { return { freeUsed: false, singleCredits: 0, unlimited: false }; }
  }
  function save(s) { try { localStorage.setItem(LS, JSON.stringify(s)); } catch (e) {} }

  function state() { return load(); }

  function canWish() {
    var s = load();
    return s.unlimited || s.singleCredits > 0 || !s.freeUsed;
  }

  function consume() {
    var s = load();
    if (s.unlimited) return;
    if (s.singleCredits > 0) { s.singleCredits--; }
    else { s.freeUsed = true; }
    save(s);
  }

  function grant(tier) {
    var s = load();
    if (tier === 'unlimited') { s.unlimited = true; s.singleCredits = INFINITE; }
    else { s.singleCredits = (s.singleCredits || 0) + 1; }
    save(s);
  }

  function T(k) { return (window.OWW && window.OWW.i18n) ? window.OWW.i18n.t(k) : k; }

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  function openPay() { var p = document.getElementById('payOverlay'); if (p) p.classList.add('show'); }

  function refreshFine() {
    var el = document.querySelector('#cardOverlay .fine');
    if (!el) return;
    var s = load();
    if (s.unlimited) el.textContent = T('card.fineUnlimited');
    else if (s.singleCredits > 0) el.textContent = T('card.fineCredit');
    else if (!s.freeUsed) el.textContent = T('card.fineFree');
    else el.textContent = T('card.fineLocked');
  }

  function checkReturn() {
    var url;
    try { url = new URL(location.href); } catch (e) { return; }
    if (url.searchParams.get('paid') !== '1') return;
    var sid = url.searchParams.get('session_id');
    if (sid) {
      fetch(location.origin + '/api/verify?session_id=' + encodeURIComponent(sid), { method: 'GET' })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.tier) {
            grant(j.tier);
            toast(T('toast.paid'));
            refreshFine();
          } else if (j && j.error) {
            toast(T('toast.nopay'));
          }
        })
        .catch(function () { /* verify 端未配置时不打扰用户 */ });
    }
    url.searchParams.delete('paid');
    url.searchParams.delete('session_id');
    try { history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash); } catch (e) {}
  }

  function gate() {
    document.addEventListener('submit', function (e) {
      var t = e.target;
      if (!t || t.id !== 'wishCard') return;
      if (!canWish()) {
        e.preventDefault();
        e.stopPropagation();
        openPay();
        toast(T('toast.locked'));
        return;
      }
      consume();
    }, true); // capture
  }

  function onLang() { refreshFine(); }

  window.OWW = window.OWW || {};
  window.OWW.entitle = {
    canWish: canWish,
    consume: consume,
    grant: grant,
    state: state,
    refreshFine: refreshFine
  };

  function init() { gate(); refreshFine(); checkReturn(); document.addEventListener('oww:lang', onLang); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();