/* 社交媒体一键分享 — X / Facebook / LinkedIn / 微信(二维码) / 微博 / 复制链接。
 * 零依赖经典脚本：自动取 <title> / og:* / meta 拼分享内容；
 * 微信走 qrserver 生成二维码；复制走 Clipboard API + execCommand 回退；
 * 预留埋点 window.__owwTrackShare(network)。 */
(function () {
  'use strict';

  function T(k) { return (window.OWW && window.OWW.i18n) ? window.OWW.i18n.t(k) : k; }

  function meta() {
    var title = document.title || '情绪许愿柳 · One Wish Willow';
    var desc = '';
    var md = document.querySelector('meta[name="description"]');
    if (md) desc = md.content;
    var img = '';
    var oi = document.querySelector('meta[property="og:image"]');
    if (oi) img = oi.content;
    return { title: title, desc: desc, url: location.href, img: img };
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
    }
    fallbackCopy(text);
    return Promise.resolve();
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('on'); }, 2400);
  }

  function openWx() {
    var m = meta();
    var box = document.getElementById('owwWxQr');
    if (!box) return;
    var img = document.getElementById('owwWxQrImg');
    if (img) img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(m.url);
    box.classList.add('show');
  }
  function closeWx() {
    var box = document.getElementById('owwWxQr');
    if (box) box.classList.remove('show');
  }

  function share(net) {
    var m = meta();
    var url = encodeURIComponent(m.url);
    var text = encodeURIComponent(m.title + (m.desc ? ' · ' + m.desc : ''));
    try { if (window.__owwTrackShare) window.__owwTrackShare(net); } catch (e) {}
    if (net === 'x') {
      window.open('https://twitter.com/intent/tweet?text=' + text + '&url=' + url, '_blank', 'noopener,noreferrer');
    } else if (net === 'facebook') {
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + url, '_blank', 'noopener,noreferrer');
    } else if (net === 'linkedin') {
      window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + url, '_blank', 'noopener,noreferrer');
    } else if (net === 'weibo') {
      window.open('https://service.weibo.com/share/share.php?url=' + url + '&title=' + text, '_blank', 'noopener,noreferrer');
    } else if (net === 'wechat') {
      openWx();
    } else if (net === 'copy') {
      copyText(m.url).then(function () { toast(T('toast.link')); });
    }
  }

  function wire() {
    var btns = document.querySelectorAll('[data-share]');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        if (btn._wired) return; btn._wired = true;
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          share(btn.getAttribute('data-share'));
        });
      })(btns[i]);
    }
    var box = document.getElementById('owwWxQr');
    if (box) {
      box.addEventListener('click', function (e) {
        if (e.target.classList.contains('shade') || e.target.hasAttribute('data-close')) closeWx();
      });
    }
  }

  window.OWW = window.OWW || {};
  window.OWW.share = { share: share, openWx: openWx, closeWx: closeWx };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();