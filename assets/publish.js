/* 发布小红书模块 — 替换原社交媒体分享。
 * 在小红书 mini-tool 环境内：调用 window.xhs.miniTool.postNote 直接发布。
 * 在公网网页内：打开小红书 + 复制文案 + 保存图片，引导用户手动发布。零依赖经典脚本。 */
(function () {
  'use strict';
  var XHS_WEB = 'https://www.xiaohongshu.com';

  function T(k) { return (window.OWW && window.OWW.i18n) ? window.OWW.i18n.t(k) : k; }

  function caption() {
    var title = document.title || '情绪许愿柳 · One Wish Willow';
    var m = document.querySelector('meta[name="description"]');
    var desc = m ? m.content : '';
    return (title + '\n' + desc + '\n#情绪许愿柳 #许愿柳 #OBSESSION #onewishwillow').slice(0, 1000);
  }

  function copy(text) {
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
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  function saveImg() {
    var img = document.getElementById('cardImg');
    var url = (img && img.src) ? img.src : 'assets/og-cover.png';
    var a = document.createElement('a');
    a.href = url; a.download = 'one-wish-willow.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast(T('toast.saved'));
  }

  function track(e) { try { if (window.__owwTrack) window.__owwTrack('xhs:' + e); } catch (_) {} }

  function post() {
    track('post');
    var mt = window.xhs && window.xhs.miniTool;
    var img = document.getElementById('cardImg');
    var payload = {
      title: '情绪许愿柳 · 柳枝已断',
      content: caption(),
      pageType: 'photo_publish',
      tags: '情绪许愿柳,许愿柳,OBSESSION'
    };
    if (img && img.src) payload.mediaInfo = { image_resources: [{ url: img.src }] };

    if (mt && mt.postNote) {
      try {
        Promise.resolve(mt.postNote(payload)).then(function () {
          toast(T('toast.published'));
        }).catch(function () {
          window.open(XHS_WEB, '_blank', 'noopener');
          copy(caption()); toast(T('toast.published'));
        });
        return;
      } catch (e) { /* fall through to web flow */ }
    }
    window.open(XHS_WEB, '_blank', 'noopener');
    copy(caption());
    toast(T('toast.published'));
  }

  function wire() {
    var btns = document.querySelectorAll('[data-xhs]');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        if (btn._wired) return; btn._wired = true;
        btn.addEventListener('click', function () {
          var a = btn.getAttribute('data-xhs');
          if (a === 'post') post();
          else if (a === 'save') saveImg();
          else if (a === 'copyText') { copy(caption()); toast(T('toast.copied')); track('copyText'); }
          else if (a === 'copyLink') { copy(location.href); toast(T('toast.link')); track('copyLink'); }
        });
      })(btns[i]);
    }
  }

  window.OWW = window.OWW || {};
  window.OWW.publish = { post: post, saveImg: saveImg, caption: caption };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
