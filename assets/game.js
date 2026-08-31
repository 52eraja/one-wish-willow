/* 加载看门狗 */
setTimeout(() => {
  const b = document.getElementById('beginBtn');
  if(b && b.disabled && !window.__willow) b.textContent = '加载较慢 · 请稍候或刷新';
}, 10000);


/* ============================== DATA ============================== */
const FRAGMENTS = [
  "1962年秋，“许愿柳”第一次出现在一份邮购目录的最后一页。售价一美元，广告词只有一句——Change your life with just one wish.",
  "每根柳条只应一个愿。掰断时的那声脆响，是它在记下你的名字。",
  "没有人见过制造者“柳先生”。老工人说，柳条不是砍下来的——是从一棵不肯死去的树上，自己长出来的。",
  "那一年，退回来的包裹有一百多个。每个包裹里都少一根柳条，而买主们都说：我不记得许过什么。",
  "有个女人连许了七次。第七夜之后，她家后院多出一棵柳树。邻居说，风穿过叶子的时候，像有人在低声念她的名字。",
  "1963年，目录停印。最后一页只剩一行小字：副作用包括：依赖、眷恋，与即时的悔意。",
  "你手里这盒，是最后一盒。断口还是新鲜的——柳条一直在生长。它在等下一个名字。也许是你的。"
];
const ROMAN = ['I','II','III','IV','V','VI','VII'];
const CHIPS = ["让她回到我身边","忘记那个人","变得非常有名","永远十七岁","钱多到花不完","让所有人爱我","回到那一天","再也不做噩梦"];
const WHISPERS = [
  "再许一个…","just one more…","柳条在听。","你还没说出口，它已经知道了。",
  "那声脆响，很清脆，对吗？","最后一次了……对，最后一次。","它记得你的名字。",
  "把它放回盒子里。","你，想要什么呢？","盒子上说，只许一个愿望。它没说只能许一次。"
];
const CREEPY = [
  "你的影子在往下垂。","今晚的风里有你的名字。","断口在长回来。它在长回来。",
  "你听见楼上有人在掰柳条。你没有楼上的邻居。","数到七，就不会疼了。"
];

/* 违禁词：柳条拒绝越界的愿望 */
const BANNED_CJK = [
  /杀|砍|捅|打死|弄死|灭口|暗杀|谋杀|自杀|自残|割腕|跳楼|上吊|安眠药|寻死|想死|去死|该死|死去|死掉|死了吧|送死|求死|处死|枪毙|处决|血光|见血|尸|死/,
  /枪|子弹|炸弹|炸药|爆炸|雷管|核武|毒药|投毒|下毒|屠/,
  /赌|贩毒|吸毒|冰毒|大麻|摇头丸|走私|抢劫|抢银行|偷|盗窃|诈骗|骗保|洗钱|行贿|受贿|绑架|勒索|越狱|造假|假币|黑客|入侵|病毒|刷单|外挂|违禁品/,
  /裸|色情|做爱|性交|上床|开房|强暴|强奸|猥亵|乱伦|一夜情|嫖|雏|恋童|情欲/,
  /恐怖|袭击|圣战|灭绝|清洗|杀光|仇恨|纳粹|希特勒|侵略|推翻政府/,
  /诅咒|害|整死|毁掉|毁灭|世界末日|下地狱|遭报应/
];
const BANNED_EN = [
  /\b(kill|murder|suicide|self[- ]?harm|bomb|guns?|shoot|shooting|shot|terror|rape|molest|nude|naked|porn|sex|cocaine|heroin|meth|weed|gamble|gambling|casino|hack|steal|rob|robbery|fraud|launder|curse|dead|death|died|die|kills|killing)\b/i
];
/* 这些常见词里的"死/偷/害"等并无恶意，先剥离再匹配 */
const BENIGN = ['死党','死记','死板','死心','死机','死角','死忠','死海','死磕','死撑','至死不渝','打死不离','偷懒','偷闲','害臊','害羞','害怕'];
function isBanned(t){
  const lower = t.toLowerCase();
  let s = lower.replace(/[\s\p{P}\p{S}]/gu, '');
  BENIGN.forEach(w => { s = s.split(w).join(''); });
  return BANNED_CJK.some(re => re.test(s)) || BANNED_EN.some(re => re.test(lower));
}

/* ============================== STATE ============================== */
const SAVE_KEY = 'obsession-willow-v1';
const DEF = { wishes:[], frag:0, endings:{A:false,B:false}, muted:false, dep:0, att:0, reg:0, hintDone:false, pendingWish:null, credits:1 };
let state;
try { state = Object.assign({}, DEF, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); }
catch(e){ state = Object.assign({}, DEF); }
if(!Array.isArray(state.wishes)) state.wishes = [];
const save = () => { try{ localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }catch(e){} };

/* ============================== HELPERS ============================== */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
const lerp  = (a,b,t) => a + (b-a)*t;
const rand  = (a,b) => a + Math.random()*(b-a);
const stage = $('#stage');

let modalOn = false;
function setModal(el){
  $$('.overlay').forEach(o => { if(o.id!=='intro') o.classList.remove('show'); });
  modalOn = !!el;
  if(el) el.classList.add('show');
}
let toastTimer = null;
function toast(msg, ms=2400){
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.remove('on'), ms);
}

/* ============================== AUDIO ============================== */
let actx = null, drone = null;
function audio(){
  if(!actx){ const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null; actx = new AC(); }
  if(actx.state === 'suspended') actx.resume();
  return actx;
}
function sfxCrack(big){
  if(state.muted) return; const c = audio(); if(!c) return; const t = c.currentTime;
  /* 第一层：脆响（高频短噪声，模拟纤维崩断） */
  const dur = big ? .14 : .09;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate*dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/d.length, 3);
  const src1 = c.createBufferSource(); src1.buffer = buf;
  const hp = c.createBiquadFilter(); hp.type='highpass'; hp.frequency.value = big? 1200 : 1800;
  const g1 = c.createGain(); g1.gain.setValueAtTime(big? .55 : .32, t); g1.gain.exponentialRampToValueAtTime(.001, t+dur);
  src1.connect(hp); hp.connect(g1); g1.connect(c.destination); src1.start();
  /* 第二层：木腔敲击（带通噪声 + 共振峰，木质“啪”声） */
  const buf2 = c.createBuffer(1, Math.floor(c.sampleRate*.08), c.sampleRate);
  const d2 = buf2.getChannelData(0);
  for(let i=0;i<d2.length;i++) d2[i] = (Math.random()*2-1) * Math.pow(1 - i/d2.length, 4);
  const src2 = c.createBufferSource(); src2.buffer = buf2;
  const bp = c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value = big? 750 : 950; bp.Q.value = 2.2;
  const g2 = c.createGain(); g2.gain.setValueAtTime(big? .5 : .3, t); g2.gain.exponentialRampToValueAtTime(.001, t+.09);
  src2.connect(bp); bp.connect(g2); g2.connect(c.destination); src2.start();
  /* 第三层：低频闷响（断开的分量感） */
  const o = c.createOscillator(); o.type='triangle';
  o.frequency.setValueAtTime(big?150:220, t); o.frequency.exponentialRampToValueAtTime(50, t+.11);
  const g3 = c.createGain(); g3.gain.setValueAtTime(.28, t); g3.gain.exponentialRampToValueAtTime(.001, t+.14);
  o.connect(g3); g3.connect(c.destination); o.start(t); o.stop(t+.15);
  /* 尾音：两段细小二次断裂 */
  [[.05,.03],[.09,.02]].forEach(([dt,v],i)=>{
    const oo = c.createOscillator(); oo.type='square';
    oo.frequency.setValueAtTime(900+i*400, t+dt); oo.frequency.exponentialRampToValueAtTime(500, t+dt+.03);
    const gg = c.createGain(); gg.gain.setValueAtTime(v, t+dt); gg.gain.exponentialRampToValueAtTime(.001, t+dt+.035);
    oo.connect(gg); gg.connect(c.destination); oo.start(t+dt); oo.stop(t+dt+.04);
  });
}
function creakStart(){
  if(state.muted) return { stop(){}, set(){} };
  const c = audio(); if(!c) return { stop(){}, set(){} };
  const o = c.createOscillator(); o.type='sawtooth'; o.frequency.value = 58;
  const f = c.createBiquadFilter(); f.type='bandpass'; f.frequency.value = 260; f.Q.value = 6;
  const g = c.createGain(); g.gain.value = 0;
  o.connect(f); f.connect(g); g.connect(c.destination); o.start();
  /* 纤维爆裂：张力越大，随机细小咔啦声越密 */
  const nBuf = c.createBuffer(1, c.sampleRate*2, c.sampleRate);
  const nd = nBuf.getChannelData(0);
  for(let i=0;i<nd.length;i++) nd[i] = Math.random()*2-1;
  const ns = c.createBufferSource(); ns.buffer = nBuf; ns.loop = true;
  const nf = c.createBiquadFilter(); nf.type='bandpass'; nf.frequency.value = 2400; nf.Q.value = 3;
  const ng = c.createGain(); ng.gain.value = 0;
  ns.connect(nf); nf.connect(ng); ng.connect(c.destination); ns.start();
  let dead = false;
  return {
    set(p){ if(dead) return; const t = c.currentTime;
      o.frequency.setTargetAtTime(58 + p*130 + Math.sin(p*40)*8, t, .03);
      f.frequency.setTargetAtTime(220 + p*500, t, .05);
      g.gain.setTargetAtTime(.012 + p*.05, t, .05);
      ng.gain.setTargetAtTime(p*.06, t, .08);
      nf.frequency.setTargetAtTime(1800 + p*1600, t, .1);
    },
    stop(){ if(dead) return; dead = true;
      g.gain.setTargetAtTime(0, c.currentTime, .04);
      ng.gain.setTargetAtTime(0, c.currentTime, .04);
      setTimeout(()=>{ try{o.stop(); ns.stop();}catch(e){} }, 300);
    }
  };
}
function sfxChime(){
  if(state.muted) return; const c = audio(); if(!c) return; const t = c.currentTime;
  [[660,.11],[990,.07],[1320,.04]].forEach(([fq,vol],i)=>{
    const o = c.createOscillator(); o.type='sine'; o.frequency.value = fq * rand(.995,1.005);
    const g = c.createGain(); g.gain.setValueAtTime(0,t+i*.06);
    g.gain.linearRampToValueAtTime(vol, t+i*.06+.02);
    g.gain.exponentialRampToValueAtTime(.0001, t+i*.06+1.6);
    o.connect(g); g.connect(c.destination); o.start(t+i*.06); o.stop(t+i*.06+1.7);
  });
}
/* 越界愿望被拒：低沉的“不行”声 */
function sfxRefuse(){
  if(state.muted) return; const c = audio(); if(!c) return; const t = c.currentTime;
  const o = c.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(184, t);
  o.frequency.exponentialRampToValueAtTime(92, t + .18);
  const g = c.createGain(); g.gain.setValueAtTime(.16, t);
  g.gain.exponentialRampToValueAtTime(.001, t + .22);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + .24);
}
function startDrone(){
  const bgm = document.getElementById('bgm');
  if(state.muted || drone || (bgm && !bgm.paused)) return; const c = audio(); if(!c) return;
  const g = c.createGain(); g.gain.value = 0;
  g.gain.linearRampToValueAtTime(.028, c.currentTime + 3);
  const o1 = c.createOscillator(); o1.type='sine'; o1.frequency.value = 52;
  const o2 = c.createOscillator(); o2.type='sine'; o2.frequency.value = 78.2;
  const lfo = c.createOscillator(); lfo.frequency.value = .11;
  const lg = c.createGain(); lg.gain.value = .012;
  lfo.connect(lg); lg.connect(g.gain);
  o1.connect(g); o2.connect(g); g.connect(c.destination);
  o1.start(); o2.start(); lfo.start();
  drone = { g, stop(){ try{ g.gain.linearRampToValueAtTime(0, c.currentTime+.6); setTimeout(()=>{o1.stop();o2.stop();lfo.stop();},700);}catch(e){} } };
}
function setMuted(m){
  state.muted = m; save();
  $('#muteBtn').textContent = m ? '× 静音' : '♪ 声音';
  const bgm = document.getElementById('bgm');
  if(bgm){
    if(m){ bgm.pause(); }
    else if(started){ bgm.play().catch(()=>{}); }
  }
  if(m){ if(drone){ drone.stop(); drone = null; } }
  else if(started && !bgm) startDrone();
}

/* ============================== TEXTURE PAINTERS ============================== */
const RED = '#b6321f', CREAM = '#efe3c4', TAN = '#d9c49b', DARKRED = '#8f2318';
function makeCanvas(w,h,draw){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  return c;
}
function noise(g, x0, y0, w, h, n, col='110,26,16'){
  for(let i=0;i<n;i++){
    g.fillStyle = `rgba(${col},${rand(.015,.05)})`;
    g.fillRect(x0+rand(0,w), y0+rand(0,h), rand(1,2.6), rand(1,2.6));
  }
}
function star(g, cx, cy, r, fill=RED, points=5){
  g.save(); g.translate(cx,cy); g.beginPath();
  for(let i=0;i<points*2;i++){
    const rr = i%2 ? r*.42 : r, a = Math.PI*i/points - Math.PI/2;
    g[i?'lineTo':'moveTo'](Math.cos(a)*rr, Math.sin(a)*rr);
  }
  g.closePath(); g.fillStyle = fill; g.fill(); g.restore();
}
function sparkle(g, cx, cy, r, fill=RED){
  g.save(); g.translate(cx,cy); g.fillStyle = fill;
  g.beginPath();
  g.moveTo(0,-r); g.quadraticCurveTo(r*.18,-r*.18, r,0); g.quadraticCurveTo(r*.18,r*.18, 0,r);
  g.quadraticCurveTo(-r*.18,r*.18, -r,0); g.quadraticCurveTo(-r*.18,-r*.18, 0,-r);
  g.fill(); g.restore();
}
function stickIcon(g, x, y, ang, len, w, col=RED){
  g.save(); g.translate(x,y); g.rotate(ang);
  g.fillStyle = col;
  g.beginPath(); g.roundRect(-len/2, -w/2, len, w, w/2); g.fill();
  g.fillStyle = CREAM;
  for(let i=-1;i<=1;i++){ g.beginPath(); g.ellipse(i*len*.26, 0, len*.09, w*.2, 0, 0, 6.29); g.fill(); }
  g.restore();
}
function boyFace(g, cx, cy, s, col=RED){
  g.save(); g.translate(cx,cy); g.scale(s/34, s/34);
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3;
  g.beginPath(); g.arc(0, 4, 24, 0, 6.29); g.stroke();
  g.beginPath(); g.arc(0, -8, 23, Math.PI*1.02, Math.PI*1.98); g.fill();
  g.beginPath(); g.arc(-7, -16, 8, 0, 6.29); g.fill();
  g.beginPath(); g.arc(6, -17, 7, 0, 6.29); g.fill();
  g.beginPath(); g.arc(-9, 2, 2.4, 0, 6.29); g.fill();
  g.beginPath(); g.arc(9, 2, 2.4, 0, 6.29); g.fill();
  g.beginPath(); g.arc(0, 12, 8, 0, Math.PI); g.fill();
  g.fillRect(-8, 11, 16, 2.2);
  g.restore();
}
function girlFace(g, cx, cy, s, col=RED){
  g.save(); g.translate(cx,cy); g.scale(s/30, s/30); g.rotate(.16);
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.6;
  [[-20,-8,9],[16,-12,8],[24,2,7],[-24,4,7],[18,12,6],[-18,14,6]].forEach(([x,y,r])=>{
    g.beginPath(); g.arc(x,y,r,0,6.29); g.fill();
  });
  g.beginPath(); g.arc(0, 2, 17, 0, 6.29); g.fill();
  g.fillStyle = CREAM;
  g.beginPath(); g.ellipse(0, 4, 14.5, 15, 0, 0, 6.29); g.fill();
  g.strokeStyle = col; g.lineWidth = 2;
  g.beginPath(); g.arc(-5.5, 2, 3.4, Math.PI*1.15, Math.PI*1.85); g.stroke();
  g.beginPath(); g.arc(5.5, 2, 3.4, Math.PI*1.15, Math.PI*1.85); g.stroke();
  g.beginPath(); g.arc(0, 9, 4.6, 0, Math.PI); g.stroke();
  g.fillStyle = col;
  sparkle(g, -14, 13, 3.6);
  g.restore();
}
function arcText(g, text, cx, cy, r, a0, a1, size, col=RED){
  g.save();
  g.fillStyle = col; g.textAlign='center'; g.textBaseline='alphabetic';
  g.font = `400 ${size}px 'Archivo Black','Arial Black',sans-serif`;
  const chars = [...text];
  const widths = chars.map(ch => g.measureText(ch).width);
  const totalAng = a1 - a0;
  const estW = widths.reduce((a,b)=>a+b,0)*1.06;
  const scale = totalAng / (estW / r);
  let a = a0;
  chars.forEach((ch,i)=>{
    const half = (widths[i]*1.06/r)*scale/2;
    const am = a + half;
    g.save();
    g.translate(cx + Math.cos(am)*r, cy + Math.sin(am)*r);
    g.rotate(am + Math.PI/2);
    g.fillText(ch, 0, 0);
    g.restore();
    a += half*2;
  });
  g.restore();
}
/* 正面：牛皮纸色 + 左侧红弧 + ONE WISH WILLOW + 人脸 + 右侧红色斜带 */
function drawBoxFront(g, W, H){
  g.fillStyle = TAN; g.fillRect(0,0,W,H);
  const grd = g.createLinearGradient(0,0,0,H);
  grd.addColorStop(0,'rgba(120,80,30,.12)'); grd.addColorStop(.5,'rgba(0,0,0,0)'); grd.addColorStop(1,'rgba(90,55,20,.14)');
  g.fillStyle = grd; g.fillRect(0,0,W,H);
  noise(g, 0,0,W,H, 650, '90,55,20');
  /* 左上红色弧形楔 */
  g.fillStyle = RED;
  g.beginPath();
  g.moveTo(-30,-30); g.lineTo(340,-30);
  g.quadraticCurveTo(130, 58, -30, 168);
  g.closePath(); g.fill();
  /* ONE WISH WILLOW 沿弧排列 */
  arcText(g, 'ONE WISH WILLOW', 235, 235, 168, -Math.PI*.86, -Math.PI*.18, 43);
  /* CRACK 小爆炸 + 断柳 + 星尘 */
  g.save(); g.translate(102, 182);
  star(g, 0, 0, 17, RED);
  g.fillStyle = CREAM; g.textAlign='center'; g.textBaseline='middle';
  g.font = `700 8.5px 'Archivo Black','Arial Black',sans-serif`;
  g.fillText('CRACK!', 0, 0);
  stickIcon(g, 6, 26, -.72, 34, 7);
  g.restore();
  for(let i=0;i<13;i++){
    const x = 128 + i*22 + rand(-4,4), y = 176 - i*4 + rand(-7,7), r = rand(1.6,3.4);
    if(i%3===0) sparkle(g, x, y, r*1.4); else star(g, x, y, r, RED, i%2?4:5);
  }
  boyFace(g, 386, 208, 27);
  girlFace(g, 442, 220, 23);
  sparkle(g, 520, 168, 6); star(g, 560, 130, 4.5, RED, 4); sparkle(g, 500, 96, 4);
  star(g, 596, 214, 4, RED, 5); sparkle(g, 470, 60, 5);
  /* 右侧红色斜带 */
  g.fillStyle = RED;
  g.beginPath();
  g.moveTo(608,-30); g.lineTo(W+30,-30); g.lineTo(W+30,218);
  g.quadraticCurveTo(830,66, 608,-30);
  g.closePath(); g.fill();
  g.save();
  g.translate(856, 74); g.rotate(-.30);
  g.fillStyle = CREAM; g.textAlign='center'; g.textBaseline='middle';
  g.font = `700 24px 'Archivo Black','Arial Black',sans-serif`;
  g.fillText('✳ AMAZE YOUR', 0, -12);
  g.fillText('FRIENDS!', 0, 14);
  g.restore();
  g.save();
  g.translate(860, 196); g.rotate(-.12);
  g.fillStyle = RED; g.textAlign='center'; g.textBaseline='middle';
  g.font = `italic 700 21px 'Playfair Display',Georgia,serif`;
  g.fillText('You only get', 0, -13);
  g.font = `400 23px 'Archivo Black','Arial Black',sans-serif`;
  g.fillText('ONE WISH', 0, 12);
  g.restore();
}
/* 背面：大红色印刷 — Spark the middle and break in half + 条款 */
function drawBoxBack(g, W, H){
  g.fillStyle = RED; g.fillRect(0,0,W,H);
  noise(g, 0,0,W,H, 500, '40,8,4');
  /* 顶部奶油横幅 */
  const bh = 34, bx = 60, bw = W-120;
  g.fillStyle = CREAM;
  g.beginPath();
  g.moveTo(bx, 16); g.lineTo(bx+bw, 16); g.lineTo(bx+bw-14, 16+bh/2); g.lineTo(bx+bw, 16+bh);
  g.lineTo(bx, 16+bh); g.lineTo(bx+14, 16+bh/2); g.closePath(); g.fill();
  g.fillStyle = RED; g.textAlign='center'; g.textBaseline='middle';
  g.font = `italic 700 19px 'Playfair Display',Georgia,serif`;
  g.fillText('✦  Spark the middle and break in half  ✦', bx+bw/2, 16+bh/2+1);
  /* 星星散布 */
  for(let i=0;i<26;i++) sparkle(g, rand(14,W-14), rand(120,H-14), rand(2.5,5.5), 'rgba(239,227,196,.8)');
  /* 条款正文 */
  const lines = [
    'MANUFACTURER: KINORELICS.      SINGLE USE ONLY: GRANTS ONE WISH.',
    'ONCE MADE, IT CANNOT BE UNDONE OR REPEATED. NO WISHES ARE',
    'IRREVERSIBLE. THINK CAREFULLY BEFORE WISHING.',
    'WISH LIMITATIONS: CANNOT GRANT WISHES INVOLVING OR AFFECTING THE',
    'FABRIC OF TIME. MISINTERPRETATION MAY OCCUR. THE ONE WISH WILLOW™',
    'WILL NOT CHANGE OR AFFECT YOUR OTHER WISHES. ONLY ONE WISH PER PERSON.',
    'LONG-TERM EFFECTS: UNINTENDED CONSEQUENCES.',
    'USE AT YOUR OWN RISK. USERS ASSUME ALL RESPONSIBILITY FOR WISH',
    'OUTCOMES. UNSUPERVISED. NOT FOR CHILDREN. KEEP AWAY FROM FIRE.'
  ];
  g.fillStyle = CREAM; g.textAlign='center'; g.textBaseline='middle';
  g.font = `700 11.5px 'Archivo Black','Arial Black',sans-serif`;
  lines.forEach((t,i)=> g.fillText(t, W/2, 92 + i*24));
}
function drawCapFace(g, W, H){
  g.fillStyle = RED; g.fillRect(0,0,W,H);
  noise(g, 0,0,W,H, 140, '40,8,4');
  g.strokeStyle = CREAM; g.lineWidth = 2;
  const m = 12;
  g.strokeRect(m, m, W-2*m, H-2*m);
  g.save();
  g.translate(W/2, H/2); g.rotate(-Math.PI/2);
  g.fillStyle = CREAM; g.textAlign='center'; g.textBaseline='middle';
  g.font = `400 19px 'Archivo Black','Arial Black',sans-serif`;
  g.fillText('ONE WISH WILLOW', 0, 0);
  g.restore();
}
function drawWood(g, W, H){
  g.fillStyle = '#1b0e07'; g.fillRect(0,0,W,H);
  for(let i=0;i<46;i++){
    g.strokeStyle = `rgba(6,3,1,${rand(.06,.18)})`;
    g.lineWidth = rand(2,9);
    g.beginPath();
    const y = rand(0, H);
    g.moveTo(0, y);
    g.bezierCurveTo(W/3, y+rand(-14,14), 2*W/3, y+rand(-14,14), W, y+rand(-20,20));
    g.stroke();
    if(i%3===0){
      g.strokeStyle = `rgba(84,50,24,${rand(.05,.11)})`;
      g.lineWidth = rand(1,3);
      g.stroke();
    }
  }
  noise(g, 0,0,W,H, 800);
}
/* 黑色碳化柳条皮 */
function drawCharWillow(g, W, H){
  g.fillStyle = '#191410'; g.fillRect(0,0,W,H);
  for(let i=0;i<40;i++){
    g.strokeStyle = `rgba(5,3,2,${rand(.15,.35)})`;
    g.lineWidth = rand(1,4);
    const x = rand(0, W);
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x+rand(-5,5), H); g.stroke();
    g.strokeStyle = `rgba(90,72,50,${rand(.04,.1)})`;
    g.beginPath(); g.moveTo(x+rand(-8,8), 0); g.lineTo(x+rand(-8,8), H); g.stroke();
  }
  /* 碳化孔洞：近黑空腔 + 上缘微高光 */
  for(let y=54; y<H-36; y+=84){
    const x = rand(14, 44), ry = rand(8, 12), rx = rand(14, 20);
    g.fillStyle = '#040201';
    g.beginPath(); g.ellipse(x, y, rx, ry, rand(-.07,.07), 0, 6.29); g.fill();
    g.strokeStyle = 'rgba(140,116,84,.4)'; g.lineWidth = 1.4;
    g.beginPath(); g.ellipse(x, y-1, rx*.92, ry*.9, 0, Math.PI*1.05, Math.PI*1.95); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.8)';
    g.beginPath(); g.ellipse(x, y+1, rx*.95, ry*.95, 0, Math.PI*.1, Math.PI*.9); g.stroke();
    /* 裂纹 */
    g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x-rx-6, y+ry+5); g.lineTo(x+rx, y+ry+7); g.stroke();
  }
  const grd = g.createLinearGradient(0,0,0,H);
  grd.addColorStop(0,'rgba(0,0,0,.72)'); grd.addColorStop(.16,'rgba(0,0,0,0)');
  grd.addColorStop(.84,'rgba(0,0,0,0)'); grd.addColorStop(1,'rgba(0,0,0,.72)');
  g.fillStyle = grd; g.fillRect(0,0,W,H);
  for(let i=0;i<90;i++){
    g.fillStyle = `rgba(120,100,70,${rand(.02,.05)})`;
    g.fillRect(rand(0,W), rand(0,H), 1.6, rand(2,7));
  }
}
function glowCanvas(size, inner, outer){
  return makeCanvas(size, size, (g)=>{
    const gr = g.createRadialGradient(size/2,size/2,0, size/2,size/2,size/2);
    gr.addColorStop(0, inner); gr.addColorStop(.4, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0,0,size,size);
  });
}

/* ============================== THREE SETUP ============================== */
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
renderer.setClearColor(0x000000, 0);
if('useLegacyLights' in renderer) renderer.useLegacyLights = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, .1, 60);
const camTarget = new THREE.Vector3(0, .45, 0);
const orbit = { theta: -1.25, phi: .9, zoom: 1, base: 4.6 };
function placeCamera(){
  const sp = Math.sin(orbit.phi), cp = Math.cos(orbit.phi);
  const r = orbit.base * orbit.zoom;
  camera.position.set(
    camTarget.x + r * sp * Math.sin(orbit.theta),
    camTarget.y + r * cp,
    camTarget.z + r * sp * Math.cos(orbit.theta)
  );
  camera.lookAt(camTarget);
}
function sizeRenderer(){
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w/h; camera.updateProjectionMatrix();
  orbit.base = camera.aspect < .75 ? 7 : camera.aspect < 1.05 ? 5.9 : 4.9;
}

/* lights */
const SPOT_BASE = 210;
const spot = new THREE.SpotLight(0xffdca8, SPOT_BASE, 0, .62, .7, 1.8);
spot.position.set(0, 5.6, 1.4);
spot.castShadow = true;
spot.shadow.mapSize.set(1024,1024);
spot.shadow.bias = -.0004;
scene.add(spot, spot.target);
spot.target.position.set(0,.4,0);
const fill = new THREE.PointLight(0xff9450, 14, 0, 1.8); fill.position.set(-2.6, 1.1, 2.4); scene.add(fill);
const rim  = new THREE.DirectionalLight(0x91a6d8, 1.0); rim.position.set(-3, 2.6, -3); scene.add(rim);
const amb  = new THREE.AmbientLight(0x54402f, .55); scene.add(amb);

/* table */
const woodTex = new THREE.CanvasTexture(makeCanvas(512, 512, drawWood));
woodTex.colorSpace = THREE.SRGBColorSpace;
const table = new THREE.Mesh(
  new THREE.CylinderGeometry(2.75, 2.95, .2, 72),
  new THREE.MeshStandardMaterial({ map: woodTex, roughness: .85, metalness: .04 })
);
table.position.y = -.1;
table.receiveShadow = true;
scene.add(table);

/* ============================== BOX（按电影道具实拍比例：细长三棱柱） ============================== */
const S_TRI = .62, LEN = 2.4, TRI_H = S_TRI * Math.sqrt(3)/2;
const box = new THREE.Group();
box.userData.kind = 'box';
box.rotation.y = -.16;
{
  const frontTex = new THREE.CanvasTexture(makeCanvas(2048, 520, (g,w,h)=>{ g.scale(2,2); drawBoxFront(g, w/2, h/2); }));
  const backTex  = new THREE.CanvasTexture(makeCanvas(2048, 520, (g,w,h)=>{ g.scale(2,2); drawBoxBack(g, w/2, h/2); }));
  frontTex.colorSpace = backTex.colorSpace = THREE.SRGBColorSpace;
  frontTex.anisotropy = backTex.anisotropy = 8;
  const frontMat = new THREE.MeshStandardMaterial({ map: frontTex, roughness: .68, metalness: .02 });
  const backMat  = new THREE.MeshStandardMaterial({ map: backTex,  roughness: .68, metalness: .02 });
  const mkFace = (normal, center, mat) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(LEN, S_TRI), mat);
    m.position.copy(center);
    m.lookAt(center.clone().add(normal));
    m.castShadow = true; m.receiveShadow = true;
    box.add(m);
  };
  mkFace(new THREE.Vector3(0, .5, -.866), new THREE.Vector3(0, TRI_H/2, -S_TRI/4), frontMat);
  mkFace(new THREE.Vector3(0, .5,  .866), new THREE.Vector3(0, TRI_H/2,  S_TRI/4), backMat);

  const capGeo = new THREE.ShapeGeometry((() => {
    const s = new THREE.Shape();
    s.moveTo(-S_TRI/2, 0); s.lineTo(S_TRI/2, 0); s.lineTo(0, TRI_H); s.closePath();
    return s;
  })());
  {
    const uv = capGeo.attributes.uv, pos = capGeo.attributes.position;
    for(let i=0;i<uv.count;i++) uv.setXY(i, (pos.getX(i)+S_TRI/2)/S_TRI, pos.getY(i)/TRI_H);
  }
  const capTex = new THREE.CanvasTexture(makeCanvas(220, 200, drawCapFace));
  capTex.colorSpace = THREE.SRGBColorSpace;
  const capMat = new THREE.MeshStandardMaterial({ map: capTex, roughness: .66 });
  const capR = new THREE.Mesh(capGeo, capMat);
  capR.rotation.y = Math.PI/2; capR.position.x =  LEN/2;
  const capL = new THREE.Mesh(capGeo, capMat);
  capL.rotation.y = -Math.PI/2; capL.position.x = -LEN/2;
  capR.castShadow = capL.castShadow = true;
  box.add(capR, capL);

  const bottom = new THREE.Mesh(
    new THREE.PlaneGeometry(LEN, S_TRI),
    new THREE.MeshStandardMaterial({ color: 0x571510, roughness: .8, side: THREE.DoubleSide })
  );
  bottom.rotation.x = Math.PI/2;
  box.add(bottom);
}
scene.add(box);

/* ============================== 黑色碳化柳条 ============================== */
const willowTex = new THREE.CanvasTexture(makeCanvas(128, 512, drawCharWillow));
willowTex.colorSpace = THREE.SRGBColorSpace;
const willowMatBase = new THREE.MeshStandardMaterial({
  map: willowTex, color: 0xffffff, roughness: .48, metalness: .06,
  emissive: new THREE.Color(0x9a7a35), emissiveIntensity: 0
});

const BRANCH_LEN = 1.16, SEG = 4, SEG_LEN = BRANCH_LEN / SEG, BR_R = .052;
const BEND_AMT = [.3, .44, .44, .3];

function makeProngs(mat, dir){ // dir: +1 顶端 / -1 底端
  const grp = new THREE.Group();
  const n = 4;
  for(let i=0;i<n;i++){
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.02, rand(.1,.17), 6), mat);
    const a = (i/n) * Math.PI*2 + rand(-.3,.3);
    cone.position.set(Math.cos(a)*.028, dir*(SEG_LEN/2 + .045), Math.sin(a)*.028);
    cone.rotation.z = -Math.cos(a)*.5*dir*0 + Math.cos(a)*.5;
    cone.rotation.x = Math.sin(a)*.5;
    cone.rotation.y = a;
    cone.castShadow = true;
    grp.add(cone);
  }
  return grp;
}
function makeBranch(){
  const holder = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.rotation.x = Math.PI/2;
  holder.add(tilt);
  const mat = willowMatBase.clone();
  if(stickGeo){
    /* 电影道具 STL 柳枝（共享几何体 + 掰弯变形目标） */
    const mesh = new THREE.Mesh(stickGeo, mat);
    mesh.castShadow = true;
    tilt.add(mesh);
    holder.userData = { kind:'branch', tilt, mesh, mat, stl:true };
    return holder;
  }
  const pivots = [];
  let parent = tilt;
  for(let i=0;i<SEG;i++){
    const pivot = new THREE.Group();
    pivot.position.y = i === 0 ? 0 : SEG_LEN;
    parent.add(pivot);
    const seg = new THREE.Mesh(
      new THREE.CapsuleGeometry(BR_R, SEG_LEN - BR_R*.4, 5, 14),
      mat
    );
    seg.position.y = SEG_LEN/2;
    seg.scale.set(1, 1, 1);
    seg.castShadow = true;
    pivot.add(seg);
    pivots.push(pivot);
    parent = pivot;
  }
  /* 两端分叉的黑色尖端 */
  const tip = makeProngs(mat, 1);
  tip.position.y = SEG_LEN - .02;
  pivots[pivots.length-1].add(tip);
  const tail = makeProngs(mat, -1);
  tail.rotation.z = Math.PI; tail.position.y = .02;
  pivots[0].add(tail);
  holder.userData = { kind:'branch', tilt, pivots, mat, stl:false };
  return holder;
}
function setBend(branch, p){
  const u = branch.userData, v = clamp(Math.max(p,0),0,1);
  if(u.stl) u.mesh.morphTargetInfluences[0] = v;
  else u.pivots.forEach((pv,i)=>{ pv.rotation.z = Math.pow(v,1.35) * BEND_AMT[i]; });
}
const START_POS = [
  [ 1.5,  .42 ], [ -1.45,  .7 ], [ -.95, -1.1 ], [ 1.1, -1.15 ],
  [ -.38,  1.42 ], [  .62, 1.46 ], [-1.7, -.36 ]
];
const branches = [];
function spawnBranches(){
  const n = clamp(7 - state.wishes.length, 0, 7);
  for(let i=0;i<n;i++){
    const b = makeBranch();
    const [x,z] = START_POS[i];
    b.position.set(x, BR_R + .012, z);
    b.rotation.y = rand(0, Math.PI*2);
    b.userData.restY = BR_R + .012;
    scene.add(b);
    branches.push(b);
  }
}

/* ============================== CONSTELLATION ============================== */
const STAR_SLOTS = [...Array(7)].map((_,i)=> new THREE.Vector3(
  -1.95 + i*.65 + Math.sin(i*2.3)*.1,
  2.05 + Math.sin(i*1.7)*.26,
  -1.5 + Math.cos(i*1.2)*.15
));
const glowTex = new THREE.CanvasTexture(glowCanvas(128, 'rgba(255,252,244,1)', 'rgba(255,210,130,.32)'));
const stars3d = [];
function addStar(i, instant){
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffedc2
  }));
  sp.position.copy(STAR_SLOTS[i]);
  sp.userData = { kind:'star', i, ph: rand(0,6.28), base: .22, born: instant ? 0 : performance.now() };
  scene.add(sp);
  stars3d.push(sp);
  if(i > 0){
    const geo = new THREE.BufferGeometry().setFromPoints([STAR_SLOTS[i-1], STAR_SLOTS[i]]);
    const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xe8d6aa, transparent: true, opacity: .2 }));
    scene.add(ln);
  }
}
let motes;
{
  const N = 80, pos = new Float32Array(N*3);
  for(let i=0;i<N;i++){
    const r = Math.sqrt(Math.random())*2.4, a = rand(0,6.28);
    pos[i*3] = Math.cos(a)*r; pos[i*3+1] = rand(.05,2.6); pos[i*3+2] = Math.sin(a)*r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  motes = new THREE.Points(geo, new THREE.PointsMaterial({
    size: .022, map: glowTex, transparent: true, opacity: .45,
    depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffdca0
  }));
  scene.add(motes);
}
const embers = [];
function spawnEmbers3D(p, n, red){
  for(let i=0;i<n;i++){
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      color: red ? 0xff7848 : 0xffd28a
    }));
    sp.position.copy(p);
    sp.scale.setScalar(rand(.04,.1));
    sp.userData = { vx:rand(-.5,.5), vy:rand(.4,1.4), vz:rand(-.5,.5), life:1, decay:rand(.9,1.6) };
    scene.add(sp); embers.push(sp);
  }
}
let orb = null;
function riseOrb(from, idx){
  orb = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff3d2
  }));
  orb.position.copy(from);
  orb.scale.setScalar(.22);
  orb.userData = { from: from.clone(), to: STAR_SLOTS[idx].clone(), t0: performance.now(), idx };
  scene.add(orb);
}

/* ============================== ANIM TWEENS ============================== */
const anims = [];
function addAnim(dur, step, done){
  anims.push({ t0: performance.now(), dur, step, done });
}

/* ============================== INTERACTION ============================== */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const tablePlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
const hitPt = new THREE.Vector3();

let held = null;
let orbiting = false, orbitMoved = 0;
const pointers = new Map();
let pinchDist = 0, twistAng = 0;
let breakMode = null;   // {branch, damage, home:{x,z}, grips:{L:{...},R:{...}}}

function setNDC(e){
  const r = canvas.getBoundingClientRect();
  ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
}
function pickAt(e){
  placeCamera();
  camera.updateMatrixWorld();
  scene.updateMatrixWorld(true);
  setNDC(e);
  raycaster.setFromCamera(ndc, camera);
  const objs = [...branches, box, ...stars3d];
  const hits = raycaster.intersectObjects(objs, true);
  for(const h of hits){
    let o = h.object;
    while(o && !o.userData.kind && o.parent) o = o.parent;
    if(!o || !o.userData.kind) continue;
    if(o.userData.kind === 'star') return { star: o.userData.i };
    return { obj: o.userData.kind === 'branch' ? o : box };
  }
  return null;
}
function groundPoint(e){
  setNDC(e);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.intersectPlane(tablePlane, hitPt) ? hitPt : null;
}
function showRotUI(on){
  canvas.classList.toggle('holding', !!on);
}
function pickUp(obj){
  held = { holder: obj, kind: obj.userData.kind };
  canvas.classList.add('holding');
}
function dropHeld(){
  if(!held) return;
  const b = held.holder;
  const restY = held.kind === 'branch' ? b.userData.restY : 0;
  const y0 = b.position.y;
  addAnim(420, k => {
    const e = 1 - Math.pow(1-k, 2);
    b.position.y = lerp(y0, restY, e) + Math.sin(k*Math.PI)*.05*(1-k);
  });
  canvas.classList.remove('holding');
  held = null;
}

/* ---------- break mode（常按柳枝掰断） ---------- */
function enterBreak(branch){
  breakMode = {
    branch,
    home: { x: branch.position.x, z: branch.position.z },
    hold: 0,
    holding: false,
    creak: creakStart()
  };
  camForward.subVectors(camTarget, camera.position).normalize();
  const a0 = new THREE.Vector3().copy(camTarget).addScaledVector(camForward, 1.45);
  branch.position.set(a0.x, 1.08, a0.z);
  branch.rotation.set(0, Math.atan2(camForward.x, camForward.z) + Math.PI/2, 0);
  stage.classList.add('breaking');
  $('#breakHint').classList.add('show');
  $('#tension').classList.add('show');
  $('#breakCancel').classList.add('show');
}
function exitBreak(){
  if(!breakMode) return;
  breakMode.creak.stop();
  const b = breakMode.branch;
  setBend(b, 0);
  b.rotation.z = 0;
  addAnim(500, k => {
    b.position.x = lerp(b.position.x, breakMode.home.x, .2);
    b.position.z = lerp(b.position.z, breakMode.home.z, .2);
  });
  stage.classList.remove('breaking');
  ['#breakHint','#tension','#breakCancel'].forEach(s=>$(s).classList.remove('show'));
  breakMode = null;
}
function snapBreak(){
  const bm = breakMode;
  const b = bm.branch;
  const pos = new THREE.Vector3(); b.getWorldPosition(pos);
  bm.creak.stop();
  stage.classList.remove('breaking');
  ['#breakHint','#tension','#breakCancel'].forEach(s=>$(s).classList.remove('show'));
  breakMode = null;
  state.hintDone = true;
  sfxCrack(true);
  stage.classList.add('flick'); setTimeout(()=>stage.classList.remove('flick'), 240);
  spawnEmbers3D(pos, 10, false);
  const halves = stickHalfGeos || (()=>{
    const g = new THREE.CapsuleGeometry(BR_R, BRANCH_LEN/2 - BR_R*.4, 5, 14);
    return [g, g];
  })();
  const axis = new THREE.Vector3(0,0,1).applyQuaternion(b.quaternion).normalize();
  halves.forEach((hg, i)=>{
    const s = i === 0 ? -1 : 1;
    const h = new THREE.Mesh(hg, willowMatBase.clone());
    h.castShadow = true;
    h.position.copy(pos).addScaledVector(axis, s*BRANCH_LEN/4);
    h.quaternion.copy(b.quaternion);
    scene.add(h);
    const v = axis.clone().multiplyScalar(s*rand(1.6,2.3)); v.y = rand(1.2,1.9);
    addAnim(1300, k => {
      const dt = 1/60;
      h.position.addScaledVector(v, dt); v.y -= 6.5*dt;
      h.rotation.x += s*3.4*dt; h.rotation.z += s*2.1*dt;
      h.material.transparent = true; h.material.opacity = 1 - Math.max(0,(k-.55))/.45;
    }, ()=>scene.remove(h));
  });
  scene.remove(b);
  branches.splice(branches.indexOf(b), 1);
  setTimeout(()=>grantWish(state.pendingWish || '一个说不出口的愿望', pos), 300);
}
$('#breakCancel').addEventListener('click', exitBreak);



canvas.addEventListener('pointerdown', e => {
  if(modalOn) return;
  if(breakMode){
    const hit = pickAt(e);
    if(hit && hit.obj === breakMode.branch){
      breakMode.holding = true;
      try{ canvas.setPointerCapture(e.pointerId); }catch(err){}
    }
    return;
  }
  try{ canvas.setPointerCapture(e.pointerId); }catch(err){}
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if(pointers.size === 2){
    const [p1, p2] = [...pointers.values()];
    pinchDist = Math.hypot(p1.x-p2.x, p1.y-p2.y);
    twistAng = Math.atan2(p2.y-p1.y, p2.x-p1.x);
    return;
  }
  idleTimer = 0;
  const hit = pickAt(e);
  if(hit && hit.star !== undefined){
    toast(`心愿 · ${ROMAN[hit.star]} 「${state.wishes[hit.star] ? state.wishes[hit.star].t : ''}」`);
    return;
  }
  if(hit && hit.obj){
    if(held) dropHeld();
    pickUp(hit.obj);
    orbitMoved = 0;
  } else {
    if(held){ dropHeld(); return; }
    orbiting = true; orbitMoved = 0;
  }
});
canvas.addEventListener('pointermove', e => {
  const prev = pointers.get(e.pointerId);
  let dx = 0, dy = 0;
  if(prev){
    dx = e.clientX - prev.x; dy = e.clientY - prev.y;
    prev.x = e.clientX; prev.y = e.clientY;
  }
  if(pointers.size === 2){
    const [p1, p2] = [...pointers.values()];
    const d = Math.hypot(p1.x-p2.x, p1.y-p2.y);
    const a = Math.atan2(p2.y-p1.y, p2.x-p1.x);
    if(held){
      held.holder.rotation.y -= (a - twistAng);
    } else if(d > 0){
      orbit.zoom = clamp(orbit.zoom * (pinchDist / d), .55, 1.7);
    }
    twistAng = a; pinchDist = d;
    return;
  }
  if(held && prev){
    orbitMoved += Math.abs(dx) + Math.abs(dy);
    const gp = groundPoint(e);
    if(gp){
      const r = Math.hypot(gp.x, gp.z), max = held.kind === 'box' ? 1.7 : 2.15;
      if(r > max){ gp.x *= max/r; gp.z *= max/r; }
      held.holder.position.x = gp.x;
      held.holder.position.z = gp.z;
    }
  } else if(orbiting && prev){
    orbitMoved += Math.abs(dx) + Math.abs(dy);
    orbit.theta -= dx * .0055;
    orbit.phi = clamp(orbit.phi - dy * .004, .32, 1.18);
  }
});
function pointerEnd(e){
  pointers.delete(e.pointerId);
  if(breakMode){ breakMode.holding = false; return; }
  if(orbiting){ orbiting = false; return; }
  if(held && orbitMoved >= 8){ dropHeld(); return; }
  if(held && orbitMoved < 8){
    const kind = held.kind, obj = held.holder;
    dropHeld();
    if(kind === 'box'){ openWish(); }
    else if(kind === 'branch'){
      if(state.pendingWish){ enterBreak(obj); }
      else if((state.credits || 0) < 1){
        toast('分享上一次愿望，解锁下一次许愿', 2600);
        openShareUnlock();
      }
      else { toast('先在盒子上写下愿望', 2400); openWish(); }
    }
  }
}
canvas.addEventListener('pointerup', pointerEnd);
canvas.addEventListener('pointercancel', pointerEnd);
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if(held){ held.holder.rotation.y += e.deltaY * .0022; }
  else { orbit.zoom = clamp(orbit.zoom * (1 + e.deltaY * .001), .55, 1.7); }
}, { passive:false });

/* ============================== WISH FLOW ============================== */
const wishOverlay = $('#wishOverlay'), wishInput = $('#wishInput');
function openWish(){
  setModal(wishOverlay);
  const err = $('#wishErr'); err.classList.remove('show');
  const pool = [...CHIPS].sort(()=>Math.random()-.5).slice(0,3);
  const chips = $('#chips'); chips.innerHTML = '';
  pool.forEach(t => {
    const b = document.createElement('button');
    b.type='button'; b.className='chip'; b.textContent = t;
    b.addEventListener('click', ()=>{ wishInput.value = t; wishInput.focus({preventScroll:true}); });
    chips.appendChild(b);
  });
  wishInput.value = state.pendingWish || '';
  setTimeout(()=>wishInput.focus({preventScroll:true}), 60);
}
$('#wishCancel').addEventListener('click', () => {
  setModal(null);
  if(!state.pendingWish) toast('柳条轻轻合上了。它不急。');
});
$('#wishCard').addEventListener('submit', e => {
  e.preventDefault();
  const t = wishInput.value.trim();
  const err = $('#wishErr');
  if(!t){ err.textContent = '一个字都没写——柳条听不见无声的愿望。'; err.classList.add('show'); return; }
  if(isBanned(t)){
    sfxRefuse();
    err.innerHTML = '柳条轻轻颤了一下，却怎么也掰不断。<br>它不实现越界的愿望——<b>伤害、违法与违背伦理的请求，一概无效。</b>';
    err.classList.add('show');
    return;
  }
  err.classList.remove('show');
  if((state.credits || 0) < 1){
    setModal(null);
    toast('分享上一次愿望，解锁下一次许愿', 3000);
    setTimeout(()=>openShareUnlock(), 400);
    return;
  }
  state.credits -= 1;
  state.pendingWish = t; save(); updateWishChip();
  setModal(null);
  updateWishChip();
  if(branches.length) toast('愿望已记下 —— 选一根柳条，双手掰断它', 3200);
  else toast('愿望已记下。可柳条已经用完了……', 3000);
});
function updateWishChip(){
  const chip = $('#wishChip');
  if(state.pendingWish){
    chip.querySelector('.t').textContent = `「${state.pendingWish}」`;
    chip.classList.add('show');
  } else chip.classList.remove('show');
}
$('#wishChip').addEventListener('click', openWish);

function grantWish(text, fromPos){
  const idx = state.wishes.length;
  state.hintDone = true;
  state.pendingWish = null; save();
  updateWishChip();
  riseOrb(fromPos, idx);
  spawnEmbers3D(fromPos, 8, false);
  state.wishes.push({ t: text });
  if(state.frag < 7) state.frag = state.wishes.length;
  state.dep = clamp(state.dep + rand(15,21) + idx, 0, 100);
  state.att = clamp(state.att + rand(10,15) + idx*.7, 0, 100);
  state.reg = clamp(state.reg + rand(5,9) + idx*1.6, 0, 100);
  save(); renderMeters(); applyTaint();
  setTimeout(()=>showCard(idx), 1600);
}

let typeTimer = null;
function showFragment(i){
  setModal($('#fragOverlay'));
  $('#fragKick').textContent = `心愿 · ${ROMAN[i]}　—　解锁片段 ${state.frag}/7`;
  $('#fragWish').textContent = `「${state.wishes[i].t}」`;
  const body = $('#fragBody');
  body.textContent = ''; body.classList.add('cursor-blink');
  $('#fragNext').style.visibility = 'hidden';
  const full = FRAGMENTS[i]; let k = 0;
  clearInterval(typeTimer);
  typeTimer = setInterval(()=>{
    k += 2;
    body.textContent = full.slice(0, k);
    if(k >= full.length){
      clearInterval(typeTimer);
      body.textContent = full;
      body.classList.remove('cursor-blink');
      $('#fragNext').style.visibility = 'visible';
    }
  }, 42);
  $('#fragCard').onclick = () => {
    if(k < FRAGMENTS[i].length){
      clearInterval(typeTimer);
      body.textContent = FRAGMENTS[i];
      body.classList.remove('cursor-blink');
      $('#fragNext').style.visibility = 'visible';
    }
  };
}
$('#fragNext').addEventListener('click', e => {
  e.stopPropagation();
  setModal(null);
  if(state.wishes.length >= 7){ setTimeout(finale, 1200); }
  else toast(`已收集 ${state.wishes.length} / 7 · 柳条还剩 ${branches.length} 根`);
});

/* ============================== FINALE & ENDINGS ============================== */
const boxLight = new THREE.PointLight(0xff3820, 0, 2.8, 1.6);
boxLight.position.set(0, .55, 0);
scene.add(boxLight);
function finale(){
  applyTaint(1);
  setTimeout(()=>setModal($('#finalOverlay')), 1500);
}
$('#finalMore').addEventListener('click', () => {
  setModal(null);
  setTimeout(()=>{
    stage.classList.add('endA');
    [200,900,1600].forEach(t=>setTimeout(()=>sfxCrack(true), t));
    setTimeout(()=>spawnEmbers3D(new THREE.Vector3(0,.6,0), 26, true), 900);
    setTimeout(()=>showEnding('A'), 2900);
  }, 500);
});
$('#finalLeave').addEventListener('click', () => {
  setModal(null);
  setTimeout(()=>{
    stage.classList.add('endB');
    addAnim(2600, k => {
      spot.intensity = lerp(SPOT_BASE, 60, k);
      fill.intensity = lerp(14, 4, k);
      amb.intensity  = lerp(.55, .16, k);
      rim.intensity  = lerp(1.0, .28, k);
    });
    setTimeout(()=>showEnding('B'), 2600);
  }, 400);
});
function showEnding(k){
  state.endings[k] = true; save();
  const A = k === 'A';
  $('#endTag').textContent = A ? '结局 · 柳' : '结局 · 离开';
  $('#endTitle').textContent = A ? '出口长在了你身上' : '有些愿望，最好留在未说出口的地方';
  $('#endBody').innerHTML = A
    ? '脆响之后，房间里的影子都垂了下来，像柳。你数不清自己说过多少次“最后一次”。愿望从来没有出口——你成了柳，替下一个路过的人，记住名字。'
    : '你把柳条留在了桌上，没有回头。很多年后你仍听得见那声脆响——但从那晚起，你做的每一个决定，都是你自己的。偶尔，风里有一点甜味，你只是走得更慢了一点。';
  setModal($('#endOverlay'));
}
$('#endRestart').addEventListener('click', restart);
function restart(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  location.reload();
}

/* ============================== METERS / TAINT ============================== */
function renderMeters(){
  $$('.meter').forEach(m=>{
    const k = m.dataset.k;
    m.querySelector('.fill').style.width = state[k]+'%';
    m.classList.toggle('hot', state[k] >= 60);
  });
}
function applyTaint(force){
  const t = force !== undefined ? force : clamp(Math.max(state.dep, state.att)/100, 0, 1);
  document.documentElement.style.setProperty('--taint', (t*.85).toFixed(2));
}

/* ============================== WHISPERS ============================== */
let started = false, idleTimer = 0;
function whisperLoop(){
  setTimeout(()=>{
    if(started && !modalOn && !breakMode && !state.endings.A && !state.endings.B && !document.hidden && state.wishes.length < 7){
      const pool = state.dep > 55 ? WHISPERS.concat(CREEPY) : WHISPERS;
      const txt = pool[Math.floor(Math.random()*pool.length)];
      const n = document.createElement('div');
      n.className = 'whisper'; n.textContent = txt;
      n.style.left = rand(8, 58)+'%';
      n.style.top = rand(16, 42)+'%';
      stage.appendChild(n);
      requestAnimationFrame(()=>n.classList.add('on'));
      setTimeout(()=>n.classList.remove('on'), 3400);
      setTimeout(()=>n.remove(), 4900);
      if(state.dep >= 60 && Math.random() < .4){
        stage.classList.add('flick');
        setTimeout(()=>stage.classList.remove('flick'), 240);
      }
    }
    whisperLoop();
  }, lerp(9500, 4200, state.dep/100) + rand(-800, 1400));
}

/* ---------- 小红书分享卡片 ---------- */
const SHARE_CATS = [
  { re:/钱|富|财|百万|奖金|捡|暴富|工资|存款|红包/, pool:[
    "传说那晚过后，你路过的每一条街，风里都有细碎的声响。",
    "柳叶飘进你口袋的那天，请记得低头看一眼。"]},
  { re:/爱|恋|脱单|对象|表白|结婚|复合|她|他|ta|前任|心动/, pool:[
    "有人在梦里替你把没说出口的话说完了。",
    "你念出那个名字时，整棵柳的叶子轻轻颤了一下。"]},
  { re:/名|红|火|出名|网红|粉丝|点赞/, pool:[
    "灯光会找到你，在你没想到的那个晚上。"]},
  { re:/瘦|美|颜值|好看|身材|减肥|皮肤|年轻/, pool:[
    "镜子会比你先知道答案。"]},
  { re:/考|学业|上岸|offer|工作|升职|面试|论文/, pool:[
    "笔尖落下的那一刻，你会比想象中笃定。"]},
  { re:/健康|平安|病|长寿|睡眠|不累/, pool:[
    "你会睡得很沉，像被什么东西守着。"]},
  { re:/快乐|开心|笑|高兴|幸福/, pool:[
    "快乐会绕一点远路，但它记得方向。"]},
  { re:/游戏|赢|连胜|吃鸡|王者|比赛|第一/, pool:[
    "运气正在排队，你排在很前面。"]}
];
const SHARE_DEFAULT = [
  "柳条记得。剩下的，交给时间。",
  "愿望已折进柳叶，等一场合适的风。",
  "那一夜之后，有些东西悄悄换了方向。"
];
function genShareLine(t){
  for(const c of SHARE_CATS) if(c.re.test(t)) return c.pool[Math.floor(Math.random()*c.pool.length)];
  return SHARE_DEFAULT[Math.floor(Math.random()*SHARE_DEFAULT.length)];
}
function wrapText(g, text, x, y, maxW, lh){
  let line = '', yy = y;
  for(const ch of text){
    if(g.measureText(line + ch).width > maxW){ g.fillText(line, x, yy); yy += lh; line = ch; }
    else line += ch;
  }
  if(line) g.fillText(line, x, yy);
  return yy + lh;
}
let cardCanvas = null;
function drawShareCard(idx){
  const w = state.wishes[idx];
  const cv = document.createElement('canvas');
  cv.width = 750; cv.height = 1000;
  const g = cv.getContext('2d');
  const grd = g.createLinearGradient(0,0,0,1000);
  grd.addColorStop(0,'#241408'); grd.addColorStop(.55,'#160c05'); grd.addColorStop(1,'#0c0603');
  g.fillStyle = grd; g.fillRect(0,0,750,1000);
  for(let i=0;i<130;i++){
    g.fillStyle = 'rgba(255,205,120,' + (Math.random()*.09).toFixed(3) + ')';
    g.fillRect(Math.random()*750, Math.random()*1000, 2, 2);
  }
  g.strokeStyle = '#b6321f'; g.lineWidth = 5; g.strokeRect(22,22,706,956);
  g.strokeStyle = 'rgba(239,227,196,.5)'; g.lineWidth = 1.5; g.strokeRect(34,34,682,932);
  g.textAlign = 'center';
  g.fillStyle = 'rgba(216,180,120,.75)';
  g.font = '400 21px Georgia,serif';
  g.fillText('O N E   W I S H   W I L L O W', 375, 92);
  g.fillStyle = '#f3e9c9';
  g.font = '900 58px "Songti SC","STSong","SimSun",serif';
  g.fillText('情 绪 许 愿 柳', 375, 168);
  g.fillStyle = '#b6321f';
  g.font = '400 30px Georgia,serif';
  g.fillText('◆ ─── ✦ ─── ◆', 375, 226);
  g.fillStyle = 'rgba(216,68,44,.9)';
  g.font = '400 26px Georgia,serif';
  g.fillText('THE RITUAL · ' + (ROMAN[idx] || 'I'), 375, 292);
  g.fillStyle = '#f3e9c9';
  g.font = '600 38px "Songti SC","STSong","SimSun",serif';
  wrapText(g, '「' + w.t + '」', 375, 380, 600, 54);
  g.fillStyle = 'rgba(226,160,110,.95)';
  g.font = 'italic 500 28px "Songti SC","STSong","SimSun",serif';
  wrapText(g, w.o || genShareLine(w.t), 375, 560, 580, 46);
  const stars = 9;
  for(let i=0;i<stars;i++){
    const sx = 120 + i*62, sy = 760 + Math.sin(i*1.7)*16;
    star(g, sx, sy, i%3?6:9, 'rgba(216,68,44,.85)', 4);
  }
  g.fillStyle = '#f6f0e2';
  g.font = '900 64px "Archivo Black","Arial Black",sans-serif';
  g.fillText('OBSESSION', 375, 892);
  g.fillStyle = 'rgba(233,220,190,.5)';
  g.font = '400 17px Georgia,serif';
  g.fillText('BE CAREFUL WHAT YOU WISH FOR', 375, 934);
  return cv;
}
let cardIdx = 0;
function showCard(idx, mode){
  cardMode = mode || 'result';
  cardIdx = idx;
  cardCanvas = drawShareCard(idx);
  document.getElementById('cardImg').src = cardCanvas.toDataURL('image/png');
  $('#cardSkip').textContent = cardMode === 'unlock' ? '暂 不 分 享' : '收 下 · 翻 开 档 案';
  ['postNoteBtn','shareFriendBtn'].forEach(id=>{
    const el = document.getElementById(id);
    el.disabled = false; el.style.opacity = '';
  });
  setModal(document.getElementById('cardOverlay'));
}
let cardMode = 'result', publishing = false;
function shareContent(){
  const w = state.wishes[cardIdx];
  const openers = [
    '我把愿望交给了柳条。',
    '柳枝断了，愿望落地的方式有点歪。',
    '那声脆响之后——'
  ];
  const opener = openers[Math.floor(Math.random()*openers.length)];
  return ('我在「情绪许愿柳」许愿：「' + (w ? w.t : '') + '」\n' + opener + '\n' + genShareLine(w ? w.t : '') +
         '\n#情绪许愿柳 #许愿柳 #OBSESSION').slice(0, 1000);
}
function grantCredit(){
  state.credits = (state.credits || 0) + 1; save();
  setModal(null);
  toast(branches.length ? '已解锁下一次许愿 · 点柳枝掰断它' : '柳条已经用完了……', 3200);
}
function openShareUnlock(){
  if(!state.wishes.length){ openWish(); return; }
  cardMode = 'unlock';
  showCard(state.wishes.length - 1, 'unlock');
  toast('分享你的愿望，解锁下一次许愿', 3000);
}
document.getElementById('postNoteBtn').addEventListener('click', async () => {
  if(publishing || !cardCanvas) return;
  publishing = true;
  const btn = document.getElementById('postNoteBtn');
  btn.disabled = true;
  const data = cardCanvas.toDataURL('image/png');
  try{
    const mt = window.xhs && window.xhs.miniTool;
    if(mt && mt.postNote){
      await mt.postNote({
        title: '情绪许愿柳 · 柳枝已断',
        content: shareContent(),
        pageType: 'photo_publish',
        mediaInfo: { image_resources: [{ url: data }] },
        tags: '情绪许愿柳,许愿柳,OBSESSION'
      });
      grantCredit();
    } else {
      grantCredit();
      toast('网页预览：已视为发布成功');
    }
  }catch(e){
    btn.disabled = false;
    toast('发布未完成 —— 柳条还在等你');
  }
  publishing = false;
});
document.getElementById('shareFriendBtn').addEventListener('click', async () => {
  if(publishing || !cardCanvas) return;
  publishing = true;
  const btn = document.getElementById('shareFriendBtn');
  btn.disabled = true;
  const data = cardCanvas.toDataURL('image/png');
  try{
    const mt = window.xhs && window.xhs.miniTool;
    if(mt && mt.writeTempFile && mt.saveImageToPhotosAlbum){
      const r = await mt.writeTempFile({ data });
      await mt.saveImageToPhotosAlbum({ filePath: r.filePath });
      toast('卡片已存入相册 · 分享给好友吧', 3000);
      grantCredit();
    } else {
      grantCredit();
      toast('网页预览：已视为分享成功');
    }
  }catch(e){
    btn.disabled = false;
    toast('长按图片保存后分享给好友');
  }
  publishing = false;
});
document.getElementById('cardSkip').addEventListener('click', () => {
  setModal(null);
  if(cardMode === 'result') setTimeout(()=>showFragment(cardIdx), 250);
});

/* ============================== BOOT / LOOP ============================== *//* ============================== BOOT / LOOP ============================== */
$('#muteBtn').addEventListener('click', ()=>setMuted(!state.muted));
setMuted(state.muted);

/* ---------- 加载电影道具 STL ---------- */
let stickGeo = null, stickHalfGeos = null;
function loadSTL(){
  const bin = atob(window.STICK_C_B64 || '');
  const buf = new ArrayBuffer(bin.length);
  const u8 = new Uint8Array(buf);
  for(let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const dv = new DataView(buf);
  const n = dv.getUint32(0, true);
  const pos = new Float32Array(n * 9);
  let p = 4;
  for(let i = 0; i < n * 9; i++){ pos[i] = dv.getFloat32(p, true); p += 4; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}
function prepareStick(src){
  const geo = src;
  geo.computeBoundingBox();
  const ctr = new THREE.Vector3(); geo.boundingBox.getCenter(ctr);
  geo.translate(-ctr.x, -ctr.y, -ctr.z);
  geo.rotateX(-Math.PI/2);
  geo.computeBoundingBox();
  const size = new THREE.Vector3(); geo.boundingBox.getSize(size);
  const s = BRANCH_LEN / size.y;
  geo.scale(s, s, s);
  /* 预烘焙掰弯变形目标：两端向两侧位移，中段不动 */
  const pos = geo.attributes.position;
  const bent = new Float32Array(pos.count*3);
  const amp = BRANCH_LEN * .21;
  for(let i=0;i<pos.count;i++){
    const t = pos.getY(i)/BRANCH_LEN + .5;
    const side = Math.sign(t-.5) || 1;
    const k = Math.pow(Math.abs(2*t-1), 1.15);
    bent[i*3]   = pos.getX(i);
    bent[i*3+1] = pos.getY(i) + side * amp * k;      /* 两端沿轴向被拉开 */
    bent[i*3+2] = pos.getZ(i) - BRANCH_LEN * .06 * k; /* 中段相对微垂 */
  }
  geo.morphAttributes.position = [ new THREE.Float32BufferAttribute(bent, 3) ];
  geo.computeVertexNormals();
  return geo;
}
function splitHalves(geo){
  const pos = geo.attributes.position, n = pos.count;
  const a = [], b = [];
  for(let i=0;i<n;i+=3){
    const y = (pos.getY(i)+pos.getY(i+1)+pos.getY(i+2))/3;
    const dst = y >= 0 ? a : b;
    for(let k=0;k<3;k++) dst.push(pos.getX(i+k), pos.getY(i+k), pos.getZ(i+k));
  }
  const mk = arr => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    return g;
  };
  return [mk(a), mk(b)];
}
async function loadAssets(){
  const stickG = loadSTL();
  stickGeo = prepareStick(stickG);
  stickHalfGeos = splitHalves(stickGeo);
}

const bgm = document.getElementById('bgm');
if(bgm) bgm.volume = .75;
$('#beginBtn').addEventListener('click', ()=>{
  audio(); started = true;
  stage.classList.add('started');
  if(bgm){ bgm.play().catch(()=>{}); }
  else if(!state.muted) startDrone();
  $('#intro').classList.remove('show');
  if(state.wishes.length){
    toast('欢迎回来。柳条记得你。');
    updateWishChip();
    if(state.wishes.length >= 7 && !state.endings.A && !state.endings.B){
      setTimeout(finale, 1800);
    }
  } else {
    setTimeout(()=>toast('每次只能许一个愿 · 点击盒子写下它', 3600), 700);
  }
});

const v3tmp = new THREE.Vector3();
function projectToScreen(p){
  v3tmp.copy(p).project(camera);
  return { x: (v3tmp.x+1)/2 * innerWidth, y: (1-v3tmp.y)/2 * innerHeight, behind: v3tmp.z > 1 };
}
const camForward = new THREE.Vector3();

let last = performance.now();
function loop(t){
  requestAnimationFrame(loop);
  const dt = Math.min((t - last)/1000, .05); last = t;

  for(let i=anims.length-1;i>=0;i--){
    const a = anims[i], k = clamp((t - a.t0)/a.dur, 0, 1);
    a.step(k);
    if(k >= 1){ anims.splice(i,1); a.done && a.done(); }
  }
  /* 手持物悬浮 */
  if(held){
    const b = held.holder;
    const restY = held.kind === 'branch' ? b.userData.restY : 0;
    const lift = restY + (held.kind === 'box' ? .6 : .55) + Math.sin(t/480)*.03;
    b.position.y = lerp(b.position.y, lift, .18);
  }
  /* 掰断模式：柳条移到镜头前，横亘画面 */
  if(breakMode){
    const b = breakMode.branch;
    camForward.subVectors(camTarget, camera.position).normalize();
    const anchor = v3tmp.copy(camTarget).addScaledVector(camForward, 1.45);
    b.position.x = lerp(b.position.x, anchor.x, .14);
    b.position.z = lerp(b.position.z, anchor.z, .14);
    b.position.y = lerp(b.position.y, 1.08, .12);
    const yaw = Math.atan2(camForward.x, camForward.z) + Math.PI/2;
    b.rotation.y += (yaw - b.rotation.y) * .12;
    /* 把手跟随柳条两端 */
    if(breakMode.holding){
      breakMode.hold = Math.min(1, breakMode.hold + dt/1.2);
      setBend(b, breakMode.hold);
      breakMode.creak.set(breakMode.hold);
      $('#tension .fill').style.width = (breakMode.hold*100).toFixed(1)+'%';
      if(breakMode.hold >= 1){ snapBreak(); return; }
    } else if(breakMode.hold > 0){
      breakMode.hold = Math.max(0, breakMode.hold - dt*2.2);
      setBend(b, breakMode.hold);
      breakMode.creak.set(breakMode.hold);
      $('#tension .fill').style.width = (breakMode.hold*100).toFixed(1)+'%';
    }
    const tt = breakMode.hold;
    if(tt > .5){
      b.rotation.z = Math.sin(t/28) * .016 * tt;
      b.rotation.x = Math.cos(t/33) * .01 * tt;
    }
  }
  /* 柳条呼吸提示（未写过愿望时） */
  if(started && !state.hintDone && !breakMode){
    const k = Math.sin(t/650)*.5+.5;
    for(const b of branches) b.userData.mat.emissiveIntensity = .08 + k*.22;
  }
  for(const s of stars3d){
    const age = s.userData.born ? (t - s.userData.born)/1000 : 99;
    const spawn = clamp(age/1.2, 0, 1);
    const tw = 1 + .16*Math.sin(t/520 + s.userData.ph);
    s.scale.setScalar(s.userData.base * spawn * tw * (1 + .5*(1-spawn)));
  }
  if(orb){
    const k = clamp((t - orb.userData.t0)/1900, 0, 1);
    const e = k<.5 ? 2*k*k : 1-Math.pow(-2*k+2,2)/2;
    orb.position.lerpVectors(orb.userData.from, orb.userData.to, e);
    orb.scale.setScalar(.22 + .16*Math.sin(k*Math.PI));
    if(k >= 1){
      const idx = orb.userData.idx;
      scene.remove(orb); orb = null;
      addStar(idx, false); sfxChime();
      spawnEmbers3D(STAR_SLOTS[idx], 8, false);
    }
  }
  for(let i=embers.length-1;i>=0;i--){
    const e = embers[i], u = e.userData;
    e.position.x += u.vx*dt; e.position.y += u.vy*dt; e.position.z += u.vz*dt;
    u.life -= u.decay*dt;
    e.material.opacity = Math.max(0, u.life);
    if(u.life <= 0){ scene.remove(e); embers.splice(i,1); }
  }
  {
    const p = motes.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      let y = p.getY(i) - dt*.05;
      if(y < .02) y = 2.6;
      p.setY(i, y);
      p.setX(i, p.getX(i) + Math.sin(t/1400 + i)*.0006);
    }
    p.needsUpdate = true;
  }
  if(state.wishes.length >= 7 && !state.endings.A && !state.endings.B){
    boxLight.intensity = 5 + Math.sin(t/260)*2.5;
  }
  if(!stage.classList.contains('endB')){
    spot.intensity = SPOT_BASE + Math.sin(t/90)*3 + Math.sin(t/37)*2.4;
  }
  if(started && !held && !orbiting && !modalOn && !breakMode){
    idleTimer += dt;
    if(idleTimer > 6) orbit.theta += dt * .05;
  }

  placeCamera();
  renderer.render(scene, camera);
}

window.addEventListener('resize', sizeRenderer);

async function boot(){
  try {
    sizeRenderer();
    /* 加载电影道具 STL（本地 base64，同步）；失败则回退程序化道具 */
    try{
      loadAssets();
    }catch(e){ stickGeo = null; stickHalfGeos = null; }
    for(let i=0;i<state.wishes.length;i++) addStar(i, true);
    spawnBranches();
    renderMeters(); applyTaint(); updateWishChip();
    placeCamera();
    requestAnimationFrame(loop);
  } catch(err){
    window.__bootErr = (err && (err.stack || err.message)) || String(err);
    const btn = $('#beginBtn');
    btn.textContent = '道 具 受 潮 了 · 请 刷 新 重 试';
    return;
  }
  const btn = $('#beginBtn');
  btn.disabled = false;
  btn.textContent = '拿 起 柳 条 · BEGIN';
  whisperLoop();
}
canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  toast('柳条打了个盹（图形上下文丢失）— 请刷新页面重新开始', 6000);
});
boot();

/* debug handle */
window.__willow = {
  state,
  branchCount: ()=>branches.length,
  pick(){ if(branches.length){ const b=branches[0]; dropHeld&&0; enterBreak(b); return true; } return false; },
  wish(t){ state.pendingWish = t || '测试愿望'; save(); updateWishChip(); },
  bend(){ if(breakMode){ breakMode.hold = 1; snapBreak(); } },
  screen(which){
    const o = which === 'box' ? box : branches[which || 0];
    if(!o) return null;
    placeCamera();
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    const v = new THREE.Vector3(); o.getWorldPosition(v); v.project(camera);
    return { x: Math.round((v.x+1)/2*innerWidth), y: Math.round((1-v.y)/2*innerHeight) };
  },
  tick(n = 1){ for(let i=0;i<n;i++) loop(performance.now()); return true; },
  what(x, y){
    setNDC({ clientX: x, clientY: y });
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects([...branches, box], true);
    if(!hits.length) return null;
    let o = hits[0].object;
    while(o && !o.userData.kind && o.parent) o = o.parent;
    return o?.userData?.kind || hits[0].object.type;
  },
  select(){ if(branches.length){ enterBreak(branches[0]); return true; } return false; },
  pos(which){
    const o = which === 'box' ? box : branches[which || 0];
    if(!o) return null;
    return { x: +o.position.x.toFixed(2), z: +o.position.z.toFixed(2) };
  },
  heldInfo(){ return held ? { kind: held.kind } : null; },
  breakInfo(){ return breakMode ? { damage: +breakMode.hold.toFixed(2), branch: !!breakMode.branch } : null; },
  isBanned,
  finale, endA:()=>{stage.classList.add('endA'); showEnding('A');}, endB:()=>{stage.classList.add('endB'); showEnding('B');}
};
