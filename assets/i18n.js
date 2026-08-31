/* i18n — 中文(默认) / 英文 语言切换。零依赖经典脚本。 */
(function () {
  'use strict';
  var D = {
    zh: {
      'hud.about': '关 于', 'hud.mute': '♪ 声音', 'hud.buy': '购 买',
      'intro.hint': '点 击 或 拖 动 柳 条 许 愿 · 建 议 佩 戴 耳 机',
      'intro.shareLabel': '发 布 / PUBLISH',
      'begin': '装 配 道 具 中 …',
      'wish.kicker': 'STEP 1 · 许下愿望',
      'wish.h2': '握住柳枝之前，先把愿望写下来',
      'wish.p': '它在听。写清楚些——它只按字面实现。',
      'wish.placeholder': '写下你最深的愿望，比如：让她回到我身边',
      'wish.submit': '记 下 愿 望', 'wish.cancel': '还 不 是 时 候',
      'frag.kick': '心愿 · I', 'frag.next': '继 续',
      'final.kick': '最后一段柳条', 'final.h2': '它用你的声音说：“最后一次。”',
      'final.p': '桌上的柳条用完了。盒子的甜味变得像雨后的根，所有的孔洞都在发红。你听见极轻的一声——不是脆响，是它掰断了自己的声音。',
      'final.more': '再 许 一 次', 'final.leave': '转 身 离 开',
      'end.restart': '重 新 开 始', 'end.kick': '结局',
      'card.kicker': 'THE RITUAL · COMPLETE', 'card.h2': '柳 枝 已 断',
      'card.post': '发 布 小 红 书 笔 记', 'card.share': '分 享 给 好 友',
      'card.skip': '收 下', 'card.skipUnlock': '暂 不 分 享',
      'card.fine': '发布或分享后，解锁下一次许愿 · 本互动内容仅供娱乐',
      'about.title': '情绪许愿柳 · One Wish Willow',
      'about.intro': '复刻自电影《痴迷》的神秘道具：写下愿望、掰断柳枝、看它如何实现。一个浏览器内的沉浸式 3D 体验，仅供娱乐。',
      'about.whatTitle': '它是什么？',
      'about.whatBody': '许愿柳是一个互动仪式：在桌前写下愿望，按住柳枝直到它断裂，剧情随你的选择走向不同结局。它用 WebGL 实时渲染，打开网页即可游玩，无需下载安装。',
      'about.faqTitle': '常见问题',
      'about.q.real': '许愿柳是真的吗？', 'about.a.real': '不是。它是虚构电影道具的互动演绎，仅供娱乐，没有任何现实效力。',
      'about.q.free': '需要下载或付费吗？', 'about.a.free': '打开网页即可游玩，无需下载。解锁更多许愿条数需购买：单根 $1.00，不限量 $6.99（由 Stripe 安全支付）。',
      'about.q.device': '支持哪些设备？', 'about.a.device': '支持桌面与移动端浏览器，建议佩戴耳机以获得最佳沉浸氛围。',
      'about.q.share': '可以分享给朋友吗？', 'about.a.share': '可以。完成一次许愿后，通过卡片上的分享条把许愿柳分享到 X、Facebook、LinkedIn、微信、微博，或复制链接发送给好友。',
      'about.keyTitle': '关键要点',
      'about.k1': '复刻自电影《痴迷》的神秘道具，沉浸式 3D 互动。',
      'about.k2': '写下愿望 → 掰断柳枝 → 走向不同结局，流程可重复。',
      'about.k3': '浏览器内直接运行，无需下载、无需安装。',
      'about.k4': '一处分享，覆盖 X / Facebook / LinkedIn / 微信 / 微博 / 复制链接。',
      'about.k5': '单根许愿柳 $1.00，不限量 $6.99（Stripe 支付）。',
      'about.k6': '标注为虚构互动，仅供娱乐。',
      'publish.label': '发 布 / PUBLISH', 'publish.post': '发布小红书', 'publish.save': '保存图片',
      'publish.copyText': '复制文案', 'publish.copyLink': '复制链接',
      'pay.kicker': 'UNLOCK · 许愿柳', 'pay.title': '解锁更多许愿', 'pay.sub': '一根许愿柳 $1.00，不限量 $6.99',
      'pay.t1.name': '单根许愿柳', 'pay.t1.desc': '一次完整的许愿仪式，生成专属笔记卡片。',
      'pay.t2.name': '不限量许愿柳', 'pay.t2.desc': '无限次许愿与发布，永久解锁全部结局。',
      'pay.directs.hint': '分享 / 推广直链：', 'pay.directs.single': '单根 $1.00', 'pay.directs.unlimited': '不限量 $6.99', 'pay.copied': '✓ 已复制',
      'pay.buy': '前 往 支 付', 'pay.secure': '支付由 Stripe 安全加密处理', 'pay.close': '关 闭',
      'toast.published': '已复制文案，请在小红书粘贴发布', 'toast.saved': '图片已保存',
      'toast.copied': '文案已复制', 'toast.link': '链接已复制', 'toast.nopay': '支付服务未连接，请稍后重试', 'toast.canceled': '已取消支付，随时欢迎回来',
      'share.label': '分 享 / SHARE', 'share.x': 'X', 'share.facebook': 'Facebook',
      'share.linkedin': 'LinkedIn', 'share.wechat': '微信', 'share.weibo': '微博', 'share.copy': '复 制',
      'share.wechatHint': '打开微信扫一扫，分享许愿柳',
      'card.fineFree': '首次许愿免费 · 本互动内容仅供娱乐',
      'card.fineCredit': '已解锁 1 次额外许愿 · 可继续购买',
      'card.fineUnlimited': '已解锁无限次许愿 · 尽情许愿',
      'card.fineLocked': '本机已用完免费许愿，请支付后继续使用',
      'toast.locked': '本机已用完免费许愿，请支付后继续使用',
      'toast.paid': '支付成功，已解锁许愿'
    },
    en: {
      'hud.about': 'ABOUT', 'hud.mute': '♪ SOUND', 'hud.buy': 'BUY',
      'intro.hint': 'Tap or drag the willow to make a wish · headphones recommended',
      'intro.shareLabel': 'PUBLISH / XHS',
      'begin': 'ASSEMBLING PROP…',
      'wish.kicker': 'STEP 1 · MAKE A WISH',
      'wish.h2': 'Before you hold the branch, write your wish',
      'wish.p': 'It is listening. Be precise — it takes you literally.',
      'wish.placeholder': 'Write your deepest wish, e.g.: bring her back to me',
      'wish.submit': 'SAVE WISH', 'wish.cancel': 'NOT YET',
      'frag.kick': 'WISH · I', 'frag.next': 'CONTINUE',
      'final.kick': 'THE LAST BRANCH', 'final.h2': 'In your voice it says: “One last time.”',
      'final.p': 'The branches on the table are gone. The box’s sweetness turns root-like after the rain, every hole glowing red. You hear a whisper — not a snap, but the sound of it breaking itself.',
      'final.more': 'WISH AGAIN', 'final.leave': 'TURN AWAY',
      'end.restart': 'START OVER', 'end.kick': 'ENDING',
      'card.kicker': 'THE RITUAL · COMPLETE', 'card.h2': 'THE BRANCH IS BROKEN',
      'card.post': 'POST TO XIAOHONGSHU', 'card.share': 'SHARE WITH FRIEND',
      'card.skip': 'KEEP', 'card.skipUnlock': 'SKIP',
      'card.fine': 'Publish or share to unlock the next wish · for entertainment only',
      'about.title': 'One Wish Willow · 情绪许愿柳',
      'about.intro': 'A mysterious prop recreated from the film OBSESSION: write a wish, snap the willow, and watch how it unfolds. An immersive in-browser 3D experience, for entertainment only.',
      'about.whatTitle': 'What is it?',
      'about.whatBody': 'One Wish Willow is an interactive ritual: write your wish at the table, hold the branch until it snaps, and the story branches by your choices. Rendered in real time with WebGL — no download, no install.',
      'about.faqTitle': 'FAQ',
      'about.q.real': 'Is the wish willow real?', 'about.a.real': 'No. It is a fictional prop reimagined as an interactive experience, for entertainment only, with no real-world effect.',
      'about.q.free': 'Do I need to download or pay?', 'about.a.free': 'Play instantly in the browser — no download. Unlocking more wishes requires a purchase: $1.00 per willow, or $6.99 unlimited (secure Stripe checkout).',
      'about.q.device': 'Which devices are supported?', 'about.a.device': 'Desktop and mobile browsers. Headphones recommended for the best immersive atmosphere.',
      'about.q.share': 'Can I share it with friends?', 'about.a.share': 'Yes. After a wish, use the share bar on the card to share One Wish Willow to X, Facebook, LinkedIn, WeChat, Weibo, or copy the link.',
      'about.keyTitle': 'Key Points',
      'about.k1': 'A mysterious prop from OBSESSION, recreated as an immersive 3D interaction.',
      'about.k2': 'Write a wish → snap the branch → branch into endings. Repeatable.',
      'about.k3': 'Runs directly in the browser — no download, no install.',
      'about.k4': 'One share bar covers X / Facebook / LinkedIn / WeChat / Weibo / copy link.',
      'about.k5': '$1.00 per willow, $6.99 unlimited (Stripe).',
      'about.k6': 'Labeled as fictional interaction, for entertainment only.',
      'publish.label': 'PUBLISH / XHS', 'publish.post': 'Post to XHS', 'publish.save': 'Save Image',
      'publish.copyText': 'Copy Caption', 'publish.copyLink': 'Copy Link',
      'pay.kicker': 'UNLOCK · WISH WILLOW', 'pay.title': 'Unlock More Wishes', 'pay.sub': '$1.00 per willow · $6.99 unlimited',
      'pay.t1.name': 'Single Wish Willow', 'pay.t1.desc': 'One complete wish ritual, with a personal note card.',
      'pay.t2.name': 'Unlimited Wish Willows', 'pay.t2.desc': 'Unlimited wishes and posts — unlock every ending forever.',
      'pay.directs.hint': 'Direct buy links:', 'pay.directs.single': 'Single $1.00', 'pay.directs.unlimited': 'Unlimited $6.99', 'pay.copied': '✓ Copied',
      'pay.buy': 'PROCEED TO PAY', 'pay.secure': 'Secured by Stripe', 'pay.close': 'CLOSE',
      'toast.published': 'Caption copied — paste it into Xiaohongshu to publish', 'toast.saved': 'Image saved',
      'toast.copied': 'Caption copied', 'toast.link': 'Link copied', 'toast.nopay': 'Payment service unavailable — please retry later', 'toast.canceled': 'Payment canceled — come back anytime',
      'share.label': 'SHARE / 分 享', 'share.x': 'X', 'share.facebook': 'Facebook',
      'share.linkedin': 'LinkedIn', 'share.wechat': 'WeChat', 'share.weibo': 'Weibo', 'share.copy': 'COPY',
      'share.wechatHint': 'Scan with WeChat to share',
      'card.fineFree': 'First wish is free · for entertainment only',
      'card.fineCredit': '1 extra wish unlocked · buy more anytime',
      'card.fineUnlimited': 'Unlimited wishes unlocked · wish freely',
      'card.fineLocked': 'Free wish used on this device — please pay to continue',
      'toast.locked': 'Free wish used on this device — please pay to continue',
      'toast.paid': 'Payment successful — wishes unlocked'
    }
  };

  var LS = 'oww-lang';
  function cur() {
    try { return localStorage.getItem(LS) || 'zh'; } catch (e) { return 'zh'; }
  }
  function t(k) {
    var l = cur();
    if (D[l] && D[l][k] != null) return D[l][k];
    if (D.zh[k] != null) return D.zh[k];
    return k;
  }
  function apply() {
    var l = cur();
    try { document.documentElement.lang = (l === 'en') ? 'en' : 'zh-CN'; } catch (e) {}
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    }
    var tog = document.getElementById('langToggle');
    if (tog) tog.textContent = (l === 'en') ? '中文' : 'EN';
    try { document.dispatchEvent(new CustomEvent('oww:lang', { detail: { lang: l } })); } catch (e) {}
  }
  function setLang(l) {
    try { localStorage.setItem(LS, (l === 'en') ? 'en' : 'zh'); } catch (e) {}
    apply();
  }
  function toggle() { setLang(cur() === 'en' ? 'zh' : 'en'); }

  window.OWW = window.OWW || {};
  window.OWW.i18n = { t: t, apply: apply, setLang: setLang, toggle: toggle, cur: cur };

  function wireLang() {
    var t = document.getElementById('langToggle');
    if (t && !t._wired) { t._wired = true; t.addEventListener('click', toggle); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireLang);
  else wireLang();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
