'use strict';
/* Croc Crossing v2 — core: helpers, audio, voices, input, progress, settings, screens, journey flow. */
const G = window.G = {};
(() => {
const C = G.C = window.CONTENT, LINES = window.LINES;
const W = G.W = 704, H = G.H = 832, T = G.T = 64;
const cv = G.cv = document.getElementById('game'), g = G.g = cv.getContext('2d');
const FONT = G.FONT = "'Baloo 2', system-ui, sans-serif";
G.rnd = (a, b) => a + Math.random() * (b - a);
G.ri = (a, b) => Math.floor(G.rnd(a, b + 1));
G.pick = a => a[Math.floor(Math.random() * a.length)];
G.shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
G.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
G.LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
G.COLORS = { Felix: '#ff7a1a', Remi: '#2f7fd8' };
G.allAnimals = () => C.stops.flatMap(s => s.animals.map(a => ({ ...a, stop: s.id })));
if (!CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };

/* ---------- drawing helpers ---------- */
G.rr = (x, y, w, h, r, fill, stroke, lw = 3) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
G.txt = (s, x, y, size, col, align = 'center', weight = 800) => { g.font = weight + ' ' + size + 'px ' + FONT; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); };
G.fitTxt = (s, x, y, maxW, size, col, weight = 800) => { g.font = weight + ' ' + size + 'px ' + FONT; const w = g.measureText(s).width; if (w > maxW) size = Math.max(10, Math.floor(size * maxW / w)); G.txt(s, x, y, size, col, 'center', weight); };
G.circle = (x, y, r, col) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill(); };
G.drawKid = (x, y, s, who) => {
  who = who || G.player; const col = G.COLORS[who] || '#ff7a1a';
  g.save(); g.translate(x, y); g.scale(s, s);
  g.globalAlpha = .25; G.circle(0, 22, 18, '#000'); g.globalAlpha = 1;
  G.rr(-16, -2, 32, 26, 10, col); G.txt(who[0], 0, 11, 18, '#fff');
  G.circle(0, -14, 16, '#ffd9b3');
  g.beginPath(); g.arc(0, -18, 16, Math.PI, 0); g.fillStyle = who === 'Remi' ? '#6b3d1f' : '#e8b04a'; g.fill();
  G.circle(-6, -12, 3, '#222'); G.circle(6, -12, 3, '#222');
  g.beginPath(); g.arc(0, -7, 6, .2, Math.PI - .2); g.strokeStyle = '#a33'; g.lineWidth = 2; g.stroke();
  g.restore();
};
G.hudBar = (mid, right) => {
  g.fillStyle = '#123b2c'; g.fillRect(0, 0, W, T); G.txt(G.buddyEmoji() + (G.hostEmoji ? G.hostEmoji() : ''), 14, T / 2, 30, '#000', 'left');
  if (mid) G.fitTxt(mid, W / 2, T / 2 + 1, W - 280, 26, '#ffe14d');
  if (right) G.txt(right, W - 70, T / 2, 20, '#fff', 'right', 700);
  G.txt('🔊', W - 36, T / 2, 30, '#fff');
};
G.hint = s => { G.rr(W / 2 - 260, T + 10, 520, 40, 14, '#00000066'); G.fitTxt(s, W / 2, T + 31, 500, 21, '#fff', 700); };
G.buddyEmoji = () => { const b = C.buddies.find(b => b[0] === (G.prog && G.prog.buddy)); return b ? b[2] : '🐊'; };

/* ---------- sound effects ---------- */
let ac = null;
G.audioInit = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ac && ac.state === 'suspended') ac.resume().then(() => G.resumeMusic && G.resumeMusic()); else if (ac && G.resumeMusic) G.resumeMusic(); };
const SFX = { hop: ['square', 520, 780, .08, .05], ding: ['triangle', 880, 1320, .25, .12], chomp: ['sawtooth', 200, 50, .3, .14],
  splash: ['triangle', 500, 80, .4, .12], bonk: ['square', 300, 120, .25, .1], bump: ['square', 130, 70, .12, .1], star: ['sine', 1200, 1800, .12, .08],
  cast: ['sine', 300, 900, .35, .08], reel: ['square', 900, 700, .04, .03], honk: ['square', 440, 400, .18, .06], whoosh: ['sawtooth', 200, 800, .3, .05],
  drum: ['sine', 170, 55, .28, .4], snap: ['square', 2400, 900, .06, .07], kick: ['triangle', 260, 120, .1, .2], motor: ['sawtooth', 90, 80, .15, .025] };
G.sfx = (type, delay = 0) => {
  if (G.settings && G.settings.quiet) return;
  if (!ac) return;
  const s = SFX[type], t = ac.currentTime + delay, o = ac.createOscillator(), gn = ac.createGain();
  o.type = s[0]; o.frequency.setValueAtTime(s[1], t); o.frequency.exponentialRampToValueAtTime(s[2], t + s[3]);
  gn.gain.setValueAtTime(s[4], t); gn.gain.exponentialRampToValueAtTime(0.001, t + s[3]);
  o.connect(gn); gn.connect(ac.destination); o.start(t); o.stop(t + s[3] + .02);
};
G.jingle = () => [0, .12, .24, .4].forEach((d, i) => { if (!ac || G.settings.quiet) return; const t = ac.currentTime + d, o = ac.createOscillator(), gn = ac.createGain();
  o.type = 'triangle'; o.frequency.value = [523, 659, 784, 1047][i]; gn.gain.setValueAtTime(.12, t); gn.gain.exponentialRampToValueAtTime(.001, t + .3);
  o.connect(gn); gn.connect(ac.destination); o.start(t); o.stop(t + .32); });

/* ---------- voices: ElevenLabs clips if present, else the device voice ---------- */
/* Clips are decoded into Web Audio buffers and played back-to-back with a short natural pause,
   so multi-part prompts sound like one sentence instead of stop-start. Next prompts are preloaded. */
const have = new Set();
const haveReady = fetch('voice/index.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : []).then(a => { a.forEach(k => have.add(k)); if (window.LARRAKIA) for (const id in LARRAKIA) have.add('lk_' + id); }).catch(() => {});
let vq = [], vbusy = false, curAudio = null, curSrc = null, ttsVoice = null, vToken = 0;
const bufs = new Map();
function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return ac; }
function loadClip(k) {
  if (!have.has(k) || !ctx()) return Promise.resolve(null);
  if (!bufs.has(k)) bufs.set(k, fetch('voice/' + encodeURIComponent(k) + '.mp3').then(r => r.ok ? r.arrayBuffer() : null)
    .then(ab => ab ? new Promise(res => ac.decodeAudioData(ab, res, () => res(null))) : null).catch(() => null));
  return bufs.get(k);
}
G.preload = (...keys) => haveReady.then(() => keys.flat().filter(Boolean).forEach(loadClip));
const gapAfter = k => (LINES[k] || '').endsWith('...') ? .08 : k.startsWith('idw_') || k.startsWith('l_') || k.startsWith('n_') ? .3 : .2;
G.speaking = () => vbusy;
/* captions for quiet mode: a big speech bubble along the bottom, up to two lines */
G.caption = null;
function drawCaption(dt) {
  const c = G.caption; if (!c) return; c.t -= dt; if (c.t <= 0 || !G.settings.quiet) { G.caption = null; return; }
  g.font = '800 30px ' + FONT; const words = c.text.split(' '), lines = [''];
  for (const w of words) { const t = (lines[lines.length - 1] + ' ' + w).trim(); if (g.measureText(t).width > W - 120 && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = t; }
  const show = lines.slice(0, 3), h = 26 + show.length * 38, y = H - h - 14;
  g.globalAlpha = Math.min(1, c.t * 3); G.rr(24, y, W - 48, h, 22, '#fff8ecee', '#1d2a24', 3);
  G.txt('💬', 52, y + h / 2, 28, '#000');
  show.forEach((l, i) => G.txt(l, W / 2 + 18, y + 32 + i * 38, 30, c.k && (c.k.startsWith('idw_') || c.k.startsWith('tlw_')) ? '#c0392b' : '#1d2a24'));
  g.globalAlpha = 1;
}
function pickVoice() {
  if (ttsVoice || !window.speechSynthesis) return ttsVoice;
  const vs = speechSynthesis.getVoices();
  ttsVoice = vs.find(v => /en-AU/i.test(v.lang)) || vs.find(v => /en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
  return ttsVoice;
}
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { ttsVoice = null; pickVoice(); };
G.say = (...keys) => { const ks = keys.flat().filter(Boolean); G.preload(ks); vq.push(...ks); if (!vbusy) nextVoice(); };
G.pendingSay = null; // e.g. a family host or 'your turn' line, said before the next mode's own intro
G.sayNow = (...keys) => { G.stopVoice(); if (G.pendingSay) { keys = [G.pendingSay, ...keys]; G.pendingSay = null; } G.say(...keys); };
G.stopVoice = () => {
  vq = []; vToken++;
  if (curSrc) { curSrc.onended = null; try { curSrc.stop(); } catch (e) {} curSrc = null; }
  if (curAudio) { curAudio.onended = curAudio.onerror = null; curAudio.pause(); curAudio = null; }
  if (window.speechSynthesis) speechSynthesis.cancel(); vbusy = false;
};
G.lineText = k => LINES[k] || (k.startsWith('w_') ? k.slice(2) : '');
async function nextVoice() {
  const k = vq.shift(); if (k === undefined) { vbusy = false; return; }
  vbusy = true; const tok = vToken;
  const text = G.lineText(k);
  if (!text) { nextVoice(); return; }
  if (G.settings.quiet) { // quiet mode (plane, no headphones): show the line as a caption instead of speaking it
    G.caption = { text, t: Math.min(4.5, 1.1 + text.length * .055), k };
    setTimeout(() => { if (tok === vToken) nextVoice(); }, G.caption.t * 1000); return;
  }
  await haveReady;
  const buf = await loadClip(k);
  if (tok !== vToken) return;
  const fin = () => { if (tok !== vToken) return; curSrc = null; setTimeout(() => { if (tok === vToken) nextVoice(); }, gapAfter(k) * 1000); };
  if (buf && ac && ac.state === 'running') {
    const src = ac.createBufferSource(); src.buffer = buf; src.connect(ac.destination); src.onended = fin; curSrc = src; src.start();
  } else if (have.has(k)) { // audio context not unlocked yet: fall back to an <audio> element
    const a = new Audio('voice/' + encodeURIComponent(k) + '.mp3'); curAudio = a;
    let done = false; const f2 = () => { if (!done) { done = true; curAudio = null; fin(); } };
    a.onended = f2; a.onerror = () => { if (!done) { done = true; tts(text, tok, k); } };
    a.play().catch(() => { if (!done) { done = true; tts(text, tok, k); } });
  } else tts(text, tok, k);
}
function tts(text, tok, k = '') {
  if (!window.speechSynthesis) { setTimeout(() => { if (tok === vToken) nextVoice(); }, 600); return; }
  const u = new SpeechSynthesisUtterance(text); u.rate = .88; u.pitch = 1.05;
  const indo = k.startsWith('idw_'), tl = k.startsWith('tlw_');
  u.lang = tl ? 'fil-PH' : indo ? 'id-ID' : 'en-AU';
  const v = indo ? speechSynthesis.getVoices().find(v => /^id/i.test(v.lang)) : pickVoice(); if (v) u.voice = v;
  let done = false; const fin = () => { if (!done && tok === vToken) { done = true; nextVoice(); } };
  u.onend = fin; u.onerror = fin; setTimeout(fin, 1500 + text.length * 110);
  speechSynthesis.speak(u);
}

/* ---------- backing music: one looping track, quietly ducked under the voice ---------- */
const mus = { name: null, src: null, gain: null, bufs: new Map(), want: null };
function musBuf(n) {
  if (!mus.bufs.has(n)) mus.bufs.set(n, fetch('music/' + n + '.mp3').then(r => r.ok ? r.arrayBuffer() : null)
    .then(ab => ab ? new Promise(res => ac.decodeAudioData(ab, res, () => res(null))) : null).catch(() => null));
  return mus.bufs.get(n);
}
G.playMusic = n => {
  mus.want = n;
  if (!G.settings.music || G.settings.quiet || !ctx() || ac.state !== 'running') return;
  if (mus.name === n && mus.src) return;
  const old = mus.src, oldG = mus.gain; mus.name = n; mus.src = null;
  if (old) { oldG.gain.setTargetAtTime(0, ac.currentTime, .4); setTimeout(() => { try { old.stop(); } catch (e) {} }, 1500); }
  musBuf(n).then(buf => {
    if (!buf || mus.name !== n || mus.src) return;
    const s = ac.createBufferSource(), gn = ac.createGain(); s.buffer = buf; s.loop = true;
    gn.gain.value = 0; s.connect(gn); gn.connect(ac.destination); s.start(); mus.src = s; mus.gain = gn;
  });
};
G.stopMusic = () => { if (mus.src) { try { mus.src.stop(); } catch (e) {} } mus.src = null; mus.name = null; };
G.musicTick = () => { if (G.settings.quiet && mus.src) G.stopMusic(); if (mus.gain && ac) mus.gain.gain.setTargetAtTime(vbusy ? .05 : .16 * (G.settings.musicVol ?? 1), ac.currentTime, .25); };
G.resumeMusic = () => { if (mus.want && G.settings.music) G.playMusic(mus.want); };

/* ---------- progress + settings ---------- */
G.player = 'Felix';
const blank = () => ({ unlocked: 0, stickers: {}, stars: {}, buddy: null, shells: 0, photos: {}, decor: [], skill: {}, lastDay: '', streak: 0, moons: 0, nightTrips: 0, code: 0 });
G.blank = blank;
G.loadProg = n => { try { return Object.assign(blank(), JSON.parse(localStorage.getItem('croc2-' + n)) || {}); } catch (e) { return blank(); } };
G.saveProg = () => { try { localStorage.setItem('croc2-' + G.player, JSON.stringify(G.prog)); } catch (e) {} };
G.settings = (() => { const d = { limit: 20, culture: true, season: 'auto', music: true, musicVol: 1, quiet: false }; try { return Object.assign(d, JSON.parse(localStorage.getItem('croc2-settings')) || {}); } catch (e) { return d; } })();
G.saveSettings = () => { try { localStorage.setItem('croc2-settings', JSON.stringify(G.settings)); } catch (e) {} };
// play-time tracking: resets after a 30-minute gap
G.clock = (() => { try { const c = JSON.parse(localStorage.getItem('croc2-clock')) || {}; if (!c.last || Date.now() - c.last > 30 * 60e3) return { sec: 0, last: Date.now() }; return c; } catch (e) { return { sec: 0, last: Date.now() }; } })();
G.tick = dt => { G.clock.sec += dt; G.clock.last = Date.now(); if (Math.random() < dt) { try { localStorage.setItem('croc2-clock', JSON.stringify(G.clock)); } catch (e) {} } };
G.timeUp = () => G.settings.limit > 0 && G.clock.sec >= G.settings.limit * 60;
G.isRemi = () => G.player === 'Remi';
/* shells: the sanctuary currency */
G.earn = n => { if (!G.prog || n <= 0) return; G.prog.shells = (G.prog.shells || 0) + n; G.saveProg(); G.shellPop = { n, t: 1.6 }; };
/* smart practice: remember what each child gets right and wrong, and bring the tricky ones back more often */
G.skillMark = (key, ok) => {
  if (!key || !G.prog) return; const s = G.prog.skill[key] || [0, 0, 0];
  if (ok) s[0]++; else s[1]++; s[2] = Date.now(); G.prog.skill[key] = s; G.saveProg();
};
G.skillWeight = key => { const s = G.prog && G.prog.skill[key]; if (!s) return 1.3; return Math.max(.35, 1 + s[1] * 2 - Math.min(s[0], 5) * .6); };
G.wpick = (list, keyFn) => {
  if (!G.prog) return G.pick(list);
  const ws = list.map(x => G.skillWeight(keyFn(x))), tot = ws.reduce((a, b) => a + b, 0); let r = Math.random() * tot;
  for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; } return list[list.length - 1];
};
G.skillLabel = k => { const i = k.indexOf(':'), p = k.slice(0, i), v = k.slice(i + 1);
  return ({ L: 'letter ' + v, S: 'word "' + v + '"', R: 'rhymes with ' + v, C: 'claps in ' + v, P: 'plural of ' + v, D: 'describing "' + v + '"', I: 'Indonesian "' + v + '"',
    A: 'animal: ' + v, col: 'colour ' + v, N: 'number ' + v, G: v, V: 'doing word "' + v + '"', H: 'home: ' + v, F: 'flag: ' + v, K: 'snap the ' + v })[p] || k; };
/* Top End seasons: from today's date unless a grown-up picks one */
G.season = () => { const want = G.settings.season; if (want && want !== 'auto') return C.seasons.find(s => s.id === want) || C.seasons[0];
  const m = new Date().getMonth() + 1; return C.seasons.find(s => s.months.includes(m)) || C.seasons[0]; };
G.today = (off = 0) => { const d = new Date(Date.now() - off * 864e5); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
G.drawWeather = t => {
  const s = G.season().id;
  if (s === 'wet' || s === 'runoff') { g.strokeStyle = '#ffffff55'; g.lineWidth = 2; for (let i = 0; i < 60; i++) { const x = (i * 67 + t * 90) % W, y = (i * 131 + t * 520) % H; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + 16); g.stroke(); } }
  if ((s === 'build' || s === 'knock') && (t % 9) < .12) { g.fillStyle = '#ffffff66'; g.fillRect(0, 0, W, H); }
  if (s === 'knock') for (let i = 0; i < 8; i++) G.txt('🍃', (i * 97 + t * 160) % (W + 40) - 20, 160 + (i * 61) % 420 + Math.sin(t * 6 + i) * 10, 16, '#000');
  if (s === 'build') for (let i = 0; i < 3; i++) { const x = (i * 260 + t * 6) % (W + 160) - 80; g.fillStyle = '#5a6a7a88'; g.beginPath(); g.ellipse(x, 100 + i * 20, 70, 20, 0, 0, Math.PI * 2); g.fill(); }
};
G.drawShellPop = dt => { const p = G.shellPop; if (!p) return; p.t -= dt; if (p.t <= 0) { G.shellPop = null; return; }
  const y = T + 92 - (1.6 - p.t) * 20; g.globalAlpha = Math.min(1, p.t); G.rr(W / 2 - 80, y - 22, 160, 44, 16, '#fff8ec'); G.txt('+' + p.n + ' 🐚', W / 2, y, 26, '#ff7a1a'); g.globalAlpha = 1; };

/* ---------- input ---------- */
G.keys = {};
const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', ' ': 'act', Enter: 'act' };
addEventListener('keydown', e => { const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase?.()]; if (!k || G.overlayOpen()) return; e.preventDefault(); if (!G.keys[k]) { G.keys[k] = true; G.mode?.press?.(k); } });
addEventListener('keyup', e => { const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase?.()]; if (k) { G.keys[k] = false; G.mode?.release?.(k); } });
document.querySelectorAll('#pad button').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); G.audioInit(); G.keys[k] = true; G.mode?.press?.(k); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { if (G.keys[k]) { G.keys[k] = false; G.mode?.release?.(k); } }));
});
G.canvasXY = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
let ptr = null;
cv.addEventListener('pointerdown', e => { G.audioInit(); ptr = { ...G.canvasXY(e), t: performance.now() }; cv.setPointerCapture?.(e.pointerId); G.mode?.pdown?.(ptr); });
cv.addEventListener('pointermove', e => { if (ptr) G.mode?.pmove?.(G.canvasXY(e), ptr); });
cv.addEventListener('pointerup', e => {
  if (!ptr) return; const p = G.canvasXY(e), s0 = ptr; ptr = null;
  const dx = p.x - s0.x, dy = p.y - s0.y, tap = Math.hypot(dx, dy) < 25;
  if (tap && s0.y < T && s0.x > W - 80) { G.mode?.repeat?.(); return; } // 🔊 replay
  G.mode?.pup?.(p, s0);
  if (tap) G.mode?.tap?.(p); else G.mode?.swipe?.(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
});
G.setPad = (kind, actLabel) => { // 'arrows' | 'act' | 'both' | 'none'
  const pad = document.getElementById('pad');
  pad.dataset.kind = kind;
  pad.querySelector('.act').textContent = actLabel || '🎣';
  fit();
};

/* ---------- overlays (HTML) ---------- */
const $ = G.$ = id => document.getElementById(id);
let cardCb = null, card2Cb = null;
G.overlayOpen = () => !$('card').classList.contains('hidden') || !$('menu').classList.contains('hidden') || !$('guide').classList.contains('hidden') || !$('settings').classList.contains('hidden') || !$('games').classList.contains('hidden') || !$('buddyPick').classList.contains('hidden');
G.showCard = (title, big, text, btn, cb, btn2, cb2) => {
  // kid-first: long sentences are dropped (the narrator says them), buttons are big icons
  if (btn === 'Next ▶' || btn === 'Go!') btn = '▶';
  $('cardTitle').textContent = title; $('cardBig').textContent = big; $('cardText').textContent = text && text.length <= 34 ? text : '';
  $('cardBtn').textContent = btn; cardCb = cb;
  $('cardBtn2').classList.toggle('hidden', !btn2); $('cardBtn2').textContent = btn2 || ''; card2Cb = cb2;
  $('card').classList.remove('hidden');
};
$('cardBtn').addEventListener('click', () => { G.audioInit(); $('card').classList.add('hidden'); const cb = cardCb; cardCb = null; cb && cb(); });
$('cardBtn2').addEventListener('click', () => { G.audioInit(); $('card').classList.add('hidden'); const cb = card2Cb; card2Cb = null; cb && cb(); });
$('cardBig').addEventListener('click', () => G.cardReplay && G.cardReplay());

/* ---------- mode switching + main loop ---------- */
G.mode = null;
G.setMode = (m, ...args) => { G.mode = m; m.start && m.start(...args); G.playMusic(typeof m.music === 'function' ? m.music() : m.music || 'game'); };
function fit() {
  const pad = $('pad'), padH = pad.dataset.kind === 'none' ? 8 : pad.offsetHeight + 20;
  const s = Math.min((innerWidth - 16) / W, (innerHeight - padH - $('topbtns').offsetHeight - 24) / H);
  cv.style.width = (W * s) + 'px'; cv.style.height = (H * s) + 'px';
}
G.fit = fit;
addEventListener('resize', fit);
let last = 0;
function loop(ts) {
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  if (G.mode) { if (!G.overlayOpen() || G.mode.animateUnderCards) G.mode.update && G.mode.update(dt, G.overlayOpen()); G.mode.draw && G.mode.draw(); G.drawShellPop(dt); drawCaption(dt); } G.musicTick();
  requestAnimationFrame(loop);
}
G.step = sec => { for (let i = 0; i < sec * 60; i++) G.mode.update && G.mode.update(1 / 60, false); G.mode.draw && G.mode.draw(); };

/* ---------- menu, buddy, settings, guide ---------- */
function refreshMenu() { for (const n of ['Felix', 'Remi']) { const p = G.loadProg(n); const st = C.stops[Math.min(p.unlocked, C.stops.length - 1)]; $('lv' + n).textContent = st.name + ' · ' + Object.keys(p.stickers).length + ' 🏷️'; } }
G.toMenu = () => { G.stopVoice(); $('card').classList.add('hidden'); $('guide').classList.add('hidden'); $('topbtns').classList.add('hidden'); refreshMenu(); $('menu').classList.remove('hidden'); G.setMode(G.modes.map, true); };
G.coop = null; // team play: { Felix: prog, Remi: prog }
G.usePlayer = who => { if (G.coop) { G.player = who; G.prog = G.coop[who]; } };
document.querySelectorAll('.pbtn').forEach(b => b.addEventListener('click', () => {
  G.audioInit();
  if (b.dataset.player === 'Team') {
    G.coop = { Felix: G.loadProg('Felix'), Remi: G.loadProg('Remi') };
    for (const n of ['Felix', 'Remi']) if (!G.coop[n].buddy) G.coop[n].buddy = n === 'Remi' ? 'shelly' : 'snappy';
    G.player = 'Felix'; G.prog = G.coop.Felix;
    $('menu').classList.add('hidden'); $('topbtns').classList.remove('hidden');
    G.sayNow('team'); return G.setMode(G.modes.map);
  }
  G.coop = null; G.player = b.dataset.player; G.prog = G.loadProg(G.player);
  $('menu').classList.add('hidden'); $('topbtns').classList.remove('hidden');
  if (G.isRemi() && !G.prog.buddy) { G.prog.buddy = 'shelly'; G.saveProg(); }
  if (!G.prog.buddy) return pickBuddy();
  G.sayNow('hi_' + G.player.toLowerCase());
  dailySurprise(() => G.setMode(G.modes.map));
}));
/* once a day: the season, a surprise, and a streak bonus */
function dailySurprise(then) {
  const P = G.prog, today = G.today();
  if (P.lastDay === today) return then();
  P.streak = P.lastDay === G.today(1) ? (P.streak || 0) + 1 : 1; P.lastDay = today;
  const se = G.season(), seed = today.split('-').reduce((a, b) => a * 31 + +b, 7), i = seed % se.surprise.length, sp = se.surprise[i];
  const bonus = 2 + Math.min(P.streak, 5);
  G.saveProg(); G.setMode(G.modes.map, true);
  G.say('daily', 'ss_' + se.id, 'sp_' + se.id + '_' + i, P.streak > 1 ? 'streak' : 'shells');
  G.cardReplay = () => G.sayNow('ss_' + se.id, 'sp_' + se.id + '_' + i);
  G.showCard(se.emoji + ' ' + se.name, sp[0], sp[1] + '  🔥' + P.streak + '  +' + bonus + '🐚',
    '▶', () => { G.cardReplay = null; G.earn(bonus); then(); });
}
G.dailySurprise = dailySurprise;
function pickBuddy() {
  G.sayNow('hi_' + G.player.toLowerCase(), 'bd_pick');
  $('buddies').innerHTML = '';
  for (const [id, name, emo, what] of C.buddies) {
    const b = document.createElement('button'); b.className = 'buddy'; b.innerHTML = '<span>' + emo + '</span><b>' + name + '</b><i>' + what + '</i>';
    b.onclick = () => { G.prog.buddy = id; G.saveProg(); $('buddyPick').classList.add('hidden'); G.sayNow('bd_' + id); dailySurprise(() => G.setMode(G.modes.map)); };
    $('buddies').appendChild(b);
  }
  $('buddyPick').classList.remove('hidden');
}
$('menuBtn').onclick = () => G.toMenu();
$('mapBtn').onclick = () => { G.stopVoice(); $('card').classList.add('hidden'); G.setMode(G.modes.map); };
$('guideBtn').onclick = () => openGuide();
$('sanctBtn').onclick = () => { G.stopVoice(); $('card').classList.add('hidden'); G.setMode(G.modes.sanct); };
$('gamesBtn').onclick = () => openGames();
$('quietBtn').onclick = () => { G.audioInit(); G.settings.quiet = !G.settings.quiet; G.saveSettings(); quietUi(); if (G.settings.quiet) { G.stopVoice(); G.stopMusic(); } else G.resumeMusic(); };
function quietUi() { $('quietBtn').textContent = G.settings.quiet ? '🔇' : '🔊'; $('musicBtn').style.opacity = G.settings.music && !G.settings.quiet ? 1 : .45; }
setTimeout(quietUi, 0);
$('musicBtn').onclick = () => { G.audioInit(); G.settings.music = !G.settings.music; G.saveSettings(); $('musicBtn').style.opacity = G.settings.music ? 1 : .45; G.settings.music ? G.resumeMusic() : G.stopMusic(); };
$('gamesClose').onclick = () => $('games').classList.add('hidden');
/* games arcade: replay any bonus game from places you've reached */
G.gamesOpen = () => {
  const reached = C.stops.slice(0, Math.min(G.prog.unlocked, C.stops.length - 1) + 1);
  const list = [...new Set(['fishing', 'clap', 'code', 'eggs', 'check', ...reached.map(s => s.bonus)])];
  if ((G.prog.moons || 0) >= G.MOONS) list.push('night');
  if (G.isRemi()) return list.filter(k => REMI_GAMES.includes(k) || k === 'night');
  return list;
};
function openGames() {
  G.stopVoice(); G.say('games');
  const box = $('gamesList'); box.innerHTML = '';
  const all = Object.keys(C.games), open = G.gamesOpen();
  for (const k of all) {
    if (G.isRemi() && !REMI_GAMES.includes(k) && k !== 'night') continue;
    const [e, name] = C.games[k], ok = open.includes(k), b = document.createElement('button');
    b.className = 'sticker game' + (ok ? '' : ' locked'); b.innerHTML = '<span>' + (ok ? e : '🔒') + '</span><b>' + name + '</b>';
    b.onclick = () => { if (!ok) return G.sayNow(k === 'night' ? 'nf_need' : 'map'); $('games').classList.add('hidden'); k === 'night' ? G.tryNight() : G.playGame(k); };
    box.appendChild(b);
  }
  $('games').classList.remove('hidden');
}
G.playGame = k => {
  const idx = Math.min(G.prog.unlocked, C.stops.length - 1);
  G.run = { idx, stop: C.stops[idx], steps: [{ kind: 'bonus', type: k }], i: -1, oops: 0, arcade: true };
  G.nextStep();
};
$('guideClose').onclick = () => $('guide').classList.add('hidden');
function openGuide() {
  const box = $('guideList'); box.innerHTML = '';
  if ((C.books || []).length) { // local books on the shelf at home: tap to hear who wrote it
    const h = document.createElement('h3'); h.textContent = '📚 Our books'; box.appendChild(h);
    const row = document.createElement('div'); row.className = 'stickers';
    for (const bk of C.books) {
      const b = document.createElement('button'); b.className = 'sticker';
      b.innerHTML = '<span>' + bk.emoji + '</span><b>📖 ' + bk.title + '</b><i>' + bk.by + '</i>';
      b.onclick = () => { $('guideFact').textContent = bk.title + ': ' + bk.sub + '. By ' + bk.by + ' (' + bk.pub + ').'; G.sayNow('bk_' + bk.id); };
      row.appendChild(b);
    }
    box.appendChild(row);
  }
  for (const s of C.stops) {
    const h = document.createElement('h3'); h.textContent = s.flag + ' ' + s.name; box.appendChild(h);
    const row = document.createElement('div'); row.className = 'stickers';
    for (const a of s.animals) {
      const got = G.prog.stickers[a.id], b = document.createElement('button');
      b.className = 'sticker' + (got ? '' : ' locked');
      const iw = C.indo.animals[a.id], lk = G.lk(a.id);
      const ph = G.prog.photos && G.prog.photos[a.id];
      b.innerHTML = (ph ? '<em>' + (ph > 1 ? '🌟📷' : '📷') + '</em>' : '') + '<span>' + (got ? a.emoji : '❔') + '</span><b>' + (got ? a.name : '???') + '</b>' + (got && lk ? '<i>🪃 ' + lk.w + '</i>' : '') + (got && iw ? '<i>🇮🇩 ' + iw + '</i>' : '');
      b.onclick = () => { if (!got) return; $('guideFact').textContent = a.name + ': ' + a.fact + (iw ? '  🇮🇩 ' + iw : ''); G.sayNow('fact_' + a.id, lk ? ['lk_intro', 'lk_' + a.id] : [], iw ? ['idc_' + a.id, 'idw_' + G.slug(iw)] : []); };
      row.appendChild(b);
    }
    box.appendChild(row);
  }
  const nPh = Object.keys(G.prog.photos || {}).length;
  $('guideFact').textContent = 'Tap a sticker to hear about it.' + (nPh ? '  📷 ' + nPh + ' safari photos.' : '');
  $('guide').classList.remove('hidden');
}
// grown-up settings behind a sum
let lockAns = 0;
$('setBtn').onclick = () => {
  const a = G.ri(12, 29), b = G.ri(13, 28); lockAns = a + b;
  $('lockQ').textContent = 'Grown-ups: what is ' + a + ' + ' + b + '?'; $('lockA').value = '';
  $('lockBox').classList.remove('hidden'); $('setBox').classList.add('hidden'); $('settings').classList.remove('hidden');
};
$('lockGo').onclick = () => {
  if (parseInt($('lockA').value, 10) !== lockAns) { $('lockQ').textContent = 'Not quite — ask a grown-up!'; return; }
  $('lockBox').classList.add('hidden'); $('setBox').classList.remove('hidden');
  $('setLimit').value = String(G.settings.limit); $('setCulture').checked = !!G.settings.culture;
  $('setSeason').value = G.settings.season || 'auto';
  $('setMusic').checked = !!G.settings.music;
  $('playedFor').textContent = Math.round(G.clock.sec / 60) + ' min played this session';
  progressReport(); showOffline();
};
/* grown-up progress page: what each child has done, and what the smart practice is bringing back */
function progressReport() {
  const box = $('report'); box.innerHTML = '';
  for (const n of ['Felix', 'Remi']) {
    const p = G.coop ? G.coop[n] : n === G.player && G.prog ? G.prog : G.loadProg(n);
    const sk = Object.entries(p.skill || {}), tricky = sk.filter(([, s]) => s[1] > 0).sort((a, b) => (b[1][1] * 2 - b[1][0]) - (a[1][1] * 2 - a[1][0])).slice(0, 6);
    const solid = sk.filter(([, s]) => s[0] >= 3 && s[1] <= s[0] / 4).length, tries = sk.reduce((a, [, s]) => a + s[0] + s[1], 0), right = sk.reduce((a, [, s]) => a + s[0], 0);
    const d = document.createElement('div'); d.className = 'rep';
    d.innerHTML = '<b>' + n + '</b> · ' + Math.min(p.unlocked + 1, C.stops.length) + '/' + C.stops.length + ' places · ' + Object.keys(p.stickers).length + ' stickers · ' +
      Object.keys(p.photos || {}).length + ' photos · ' + (p.shells || 0) + ' 🐚 · 🔥 ' + (p.streak || 0) + ' day streak<br>' +
      (tries ? tries + ' answers, ' + Math.round(right * 100 / tries) + '% first try · ' + solid + ' skills solid' : 'No answers yet') +
      (tricky.length ? '<br><span class="small">Practising more: ' + tricky.map(([k, s]) => G.skillLabel(k) + ' (' + s[0] + '✓ ' + s[1] + '✗)').join(', ') + '</span>' : '');
    box.appendChild(d);
  }
}
$('setMusic').onchange = () => { G.settings.music = $('setMusic').checked; G.saveSettings(); G.settings.music ? G.resumeMusic() : G.stopMusic(); };
/* plane mode: check and fill the offline cache (every voice clip + music) so it all works with no internet */
const MUSIC = ['map', 'game', 'slide', 'island', 'gamelan', 'night'];
G.offlineStatus = async () => {
  if (!window.caches) return null;
  const keys = await fetch('voice/index.json').then(r => r.json()).catch(() => []), c = await caches.open('croc-media-v1');
  const have = new Set((await c.keys()).map(r => decodeURIComponent(new URL(r.url).pathname.split('/').pop())));
  const need = [...keys.map(k => k + '.mp3'), ...MUSIC.map(m => m + '.mp3')];
  return { got: need.filter(f => have.has(f)).length, all: need.length, keys };
};
G.downloadAll = async onProg => {
  const st = await G.offlineStatus(); if (!st) return;
  const urls = [...st.keys.map(k => 'voice/' + encodeURIComponent(k) + '.mp3'), ...MUSIC.map(m => 'music/' + m + '.mp3')];
  for (let i = 0; i < urls.length; i += 6) { await Promise.all(urls.slice(i, i + 6).map(u => fetch(u).catch(() => {}))); onProg && onProg(Math.min(urls.length, i + 6), urls.length); }
};
async function showOffline() {
  const st = await G.offlineStatus(); if (!st) { $('offlineState').textContent = 'needs the home-screen app'; return; }
  $('offlineState').textContent = st.got >= st.all ? '✅ all ' + st.all + ' sounds saved' : st.got + ' / ' + st.all + ' saved';
}
$('setOffline').onclick = () => { $('offlineState').textContent = 'downloading…'; G.downloadAll((n, all) => { $('offlineState').textContent = n + ' / ' + all; }).then(showOffline); };
$('setSeason').onchange = () => { G.settings.season = $('setSeason').value; G.saveSettings(); };
$('setLimit').onchange = () => { G.settings.limit = parseInt($('setLimit').value, 10); G.saveSettings(); };
$('setCulture').onchange = () => { G.settings.culture = $('setCulture').checked; G.saveSettings(); };
$('setReset').onclick = () => { G.clock.sec = 0; $('playedFor').textContent = 'Timer reset'; };
$('setUnlock').onclick = () => { if (G.coop) { for (const n in G.coop) { G.coop[n].unlocked = C.stops.length - 1; G.player = n; G.prog = G.coop[n]; G.saveProg(); } G.usePlayer('Felix'); $('playedFor').textContent = 'All places unlocked for both'; return; } if (G.prog) { G.prog.unlocked = C.stops.length - 1; G.saveProg(); $('playedFor').textContent = 'All places unlocked for ' + G.player; } };
$('setWipe').onclick = () => { if (G.prog && confirm('Clear all of ' + G.player + "'s progress and stickers?")) { G.prog = blank(); G.saveProg(); $('playedFor').textContent = G.player + ' reset'; } };
$('setClose').onclick = () => { $('settings').classList.add('hidden'); if (G.mode === G.modes.map) G.modes.map.start(); };

/* ---------- journey: a stop is a list of steps (about 70% play, 30% learning) ---------- */
G.run = null;
const REMI_GAMES = ['fishing', 'safari', 'clap', 'hacky', 'boat', 'eggs', 'code', 'check', 'design'];
const EXTRA = ['code', 'eggs', 'safari', 'boat', 'check', 'design', 'hacky', 'clap', 'surfing', 'code', 'fishing'];
G.startStop = idx => {
  const stop = C.stops[idx], steps = [{ kind: 'meet' }];
  if (idx % 3 !== 2) steps.push({ kind: 'wotd' });
  if (G.coop) { // team play: Remi and Felix take turns, then a team bonus game
    G.usePlayer('Remi'); const rq = G.Q.remiSet(stop, idx); G.usePlayer('Felix'); const fq = G.Q.felixSet(stop, idx);
    for (let i = 0; i < Math.max(rq.length, fq.length); i++) { if (rq[i]) steps.push({ kind: 'hop', q: rq[i], who: 'Remi' }); if (fq[i]) steps.push({ kind: 'hop', q: fq[i], who: 'Felix' }); }
    steps.push({ kind: 'bonus', type: ['safari', 'clap', 'eggs', 'code'][idx % 4], who: 'Remi' });
    G.run = { idx, stop, steps, i: -1, oops: 0 };
    return G.nextStep();
  }
  const remi = G.isRemi(), qs = remi ? G.Q.remiSet(stop, idx) : G.Q.felixSet(stop, idx);
  steps.push({ kind: 'hop', q: qs[0] }, { kind: 'bonus', type: remi ? REMI_GAMES[idx % REMI_GAMES.length] : stop.bonus });
  qs.slice(1).forEach(q => steps.push({ kind: 'hop', q }));
  steps.push({ kind: 'bonus', type: remi ? REMI_GAMES[(idx + 4) % REMI_GAMES.length] : EXTRA[idx % EXTRA.length] });
  if (!remi) G.Q.quizSet(stop, idx).forEach(q => steps.push({ kind: 'hop', q, quiz: true }));
  G.run = { idx, stop, steps, i: -1, oops: 0 };
  G.nextStep();
};
G.bonusModes = () => ({ fishing: G.modes.fish, night: G.modes.fish, surfing: G.modes.surf, car: G.modes.car, safari: G.modes.safari, boat: G.modes.boat, hacky: G.modes.hacky,
  judo: G.modes.judo, skate: G.modes.skate, bmx: G.modes.skate, clap: G.modes.clap, code: G.modes.code, check: G.modes.check, design: G.modes.design, eggs: G.modes.eggs });
/* family hosts: their faces sit in the top bar and the narrator introduces them before the game's own intro */
G.host = null;
G.hostEmoji = () => G.host ? (C.hosts[G.host] || []).map(h => C.family[h][1]).join('') : '';
G.nextStep = () => {
  const R = G.run; R.i++; G.host = null;
  if (R.i > 0 && R.i < R.steps.length && G.timeUp()) return breakTime();
  if (R.i >= R.steps.length) return stopDone();
  const st = R.steps[R.i];
  if (G.coop && st.who && st.who !== G.player) { G.usePlayer(st.who); G.pendingSay = 'turn_' + st.who.toLowerCase(); }
  if (st.kind === 'meet') return meet(0);
  if (st.kind === 'wotd') return wordOfDay(R);
  if (st.kind === 'hop') return G.setMode(G.modes.hop, st.q, R);
  if (st.kind === 'bonus') {
    const m = G.bonusModes()[st.type]; if (!m) return G.nextStep();
    if (C.hosts[st.type]) { G.host = st.type; G.pendingSay = 'host_' + st.type; }
    return G.setMode(m, R, st.type);
  }
};
function wordOfDay(R) {
  const lola = R.idx % 2 === 1, list = lola ? C.tagalog.greet : C.indo.greet, gr = list[Math.floor(R.idx / 2) % list.length], s = G.slug(gr[0]);
  const w = lola ? 'tlw_' + s : 'idw_' + s, m = lola ? 'tm_' + s : 'wm_' + s;
  G.sayNow(lola ? 'lola_word' : 'wotd', w, m, lola ? 'tl_say' : 'id_say'); G.cardReplay = () => G.sayNow(w, m);
  G.showCard(lola ? '👵 Lola Lou 🇵🇭' : '🇮🇩', gr[2] + '\n' + gr[0], gr[1], '▶', () => { G.cardReplay = null; G.nextStep(); });
}
G.stepDone = (oops = 0) => {
  const R = G.run; if (R) R.oops += oops; G.host = null;
  const st = R && R.steps[R.i];
  if (st && st.kind === 'bonus') { G.earn(3); if (st.type !== 'night') addMoon(.5); }
  if (st && st.type === 'night') { G.prog.moons = 0; G.prog.nightTrips = (G.prog.nightTrips || 0) + 1; G.saveProg(); }
  if (R && R.arcade) { G.run = null; G.setMode(G.modes.map); return st && st.type === 'night' ? null : openGames(); }
  G.nextStep();
};
/* moons: fill the meter (5) by playing to unlock night fishing on the banana boat */
G.MOONS = 5;
function addMoon(n) { if (!G.prog) return; const was = G.prog.moons || 0; G.prog.moons = Math.min(G.MOONS, was + n); G.saveProg(); if (Math.floor(G.prog.moons) > Math.floor(was)) G.pendingSay = G.prog.moons >= G.MOONS ? 'nf_open' : 'moon'; }
G.addMoon = addMoon;
G.tryNight = () => { if ((G.prog.moons || 0) >= G.MOONS) { G.host = 'night'; G.pendingSay = 'host_night'; G.playGame('night'); } else G.sayNow('nf_need'); };
G.lk = id => G.settings.culture && window.LARRAKIA && window.LARRAKIA[id];
function meet(i) {
  const R = G.run, a = R.stop.animals[i], n = Math.min(R.stop.meet || 3, R.stop.animals.length), bk = (C.books || []).find(b => b.animal === a.id);
  G.setMode(G.modes.hop, null, R); // scenery behind the cards
  const iw = C.indo.animals[a.id], lk = G.lk(a.id);
  const keys = ['nm_' + a.id, 'fact_' + a.id, ...(lk ? ['lk_intro', 'lk_' + a.id] : []), ...(iw ? ['idc_' + a.id, 'idw_' + G.slug(iw)] : []), ...(bk ? ['bko_' + bk.id] : [])];
  if (i === 0) G.sayNow('st_' + R.stop.id, keys); else G.sayNow(keys);
  G.cardReplay = () => G.sayNow(keys);
  G.preload(R.stop.animals.slice(0, n).flatMap(x => ['nm_' + x.id, 'fact_' + x.id]));
  const last = i >= n - 1;
  G.showCard((i === 0 ? R.stop.flag + ' ' : '') + a.name, a.emoji, (lk ? '🪃 ' + lk.w + '   ' : '') + (iw ? '🇮🇩 ' + iw : '') + (bk ? '  📚' : ''), last ? '▶ Play!' : '▶',
    () => { G.cardReplay = null; G.stopVoice(); last ? G.nextStep() : meet(i + 1); });
}
function breakTime() {
  G.run.i--; // resume this step later
  G.sayNow('break', (C.books || []).length ? 'story_time' : []);
  G.showCard('🌴', '🧃🤸📚', '', '🗺️', () => G.setMode(G.modes.map));
}
function stopDone() {
  const R = G.run, oops = R.oops, stars = oops <= 2 ? 3 : oops <= 6 ? 2 : 1;
  let newPlace = false;
  for (const who of G.coop ? ['Remi', 'Felix'] : [G.player]) {
    G.usePlayer(who);
    R.stop.animals.forEach(a => G.prog.stickers[a.id] = true);
    G.prog.stars[R.stop.id] = Math.max(G.prog.stars[R.stop.id] || 0, stars);
    if (R.idx === G.prog.unlocked && R.idx < C.stops.length - 1) { G.prog.unlocked++; newPlace = true; }
    G.saveProg(); G.earn(stars * 2); addMoon(1);
  }
  G.jingle();
  G.sayNow('stop_done', 'sticker', newPlace ? 'map_next' : null, G.pendingSay); G.pendingSay = null;
  G.showCard('🎉', '⭐'.repeat(stars) + '\n' + R.stop.animals.map(a => a.emoji).join(' '), newPlace ? '➡️ ' + C.stops[R.idx + 1].flag + ' ' + C.stops[R.idx + 1].name : '', '🗺️', () => { G.run = null; G.setMode(G.modes.map); });
}

G.modes = {};
G.boot = () => {
  G.prog = G.loadProg('Felix');
  refreshMenu(); fit();
  G.setMode(G.modes.map, true);
  requestAnimationFrame(loop);
};
})();
