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
  g.fillStyle = '#123b2c'; g.fillRect(0, 0, W, T); G.txt(G.buddyEmoji(), 34, T / 2, 32, '#000');
  if (mid) G.fitTxt(mid, W / 2, T / 2 + 1, W - 280, 26, '#ffe14d');
  if (right) G.txt(right, W - 70, T / 2, 20, '#fff', 'right', 700);
  G.txt('🔊', W - 36, T / 2, 30, '#fff');
};
G.hint = s => { G.rr(W / 2 - 260, T + 10, 520, 40, 14, '#00000066'); G.fitTxt(s, W / 2, T + 31, 500, 21, '#fff', 700); };
G.buddyEmoji = () => { const b = C.buddies.find(b => b[0] === (G.prog && G.prog.buddy)); return b ? b[2] : '🐊'; };

/* ---------- sound effects ---------- */
let ac = null;
G.audioInit = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ac && ac.state === 'suspended') ac.resume(); };
const SFX = { hop: ['square', 520, 780, .08, .05], ding: ['triangle', 880, 1320, .25, .12], chomp: ['sawtooth', 200, 50, .3, .14],
  splash: ['triangle', 500, 80, .4, .12], bonk: ['square', 300, 120, .25, .1], bump: ['square', 130, 70, .12, .1], star: ['sine', 1200, 1800, .12, .08],
  cast: ['sine', 300, 900, .35, .08], reel: ['square', 900, 700, .04, .03], honk: ['square', 440, 400, .18, .06], whoosh: ['sawtooth', 200, 800, .3, .05],
  drum: ['sine', 170, 55, .28, .4], snap: ['square', 2400, 900, .06, .07], kick: ['triangle', 260, 120, .1, .2], motor: ['sawtooth', 90, 80, .15, .025] };
G.sfx = (type, delay = 0) => {
  if (!ac) return;
  const s = SFX[type], t = ac.currentTime + delay, o = ac.createOscillator(), gn = ac.createGain();
  o.type = s[0]; o.frequency.setValueAtTime(s[1], t); o.frequency.exponentialRampToValueAtTime(s[2], t + s[3]);
  gn.gain.setValueAtTime(s[4], t); gn.gain.exponentialRampToValueAtTime(0.001, t + s[3]);
  o.connect(gn); gn.connect(ac.destination); o.start(t); o.stop(t + s[3] + .02);
};
G.jingle = () => [0, .12, .24, .4].forEach((d, i) => { if (!ac) return; const t = ac.currentTime + d, o = ac.createOscillator(), gn = ac.createGain();
  o.type = 'triangle'; o.frequency.value = [523, 659, 784, 1047][i]; gn.gain.setValueAtTime(.12, t); gn.gain.exponentialRampToValueAtTime(.001, t + .3);
  o.connect(gn); gn.connect(ac.destination); o.start(t); o.stop(t + .32); });

/* ---------- voices: ElevenLabs clips if present, else the device voice ---------- */
/* Clips are decoded into Web Audio buffers and played back-to-back with a short natural pause,
   so multi-part prompts sound like one sentence instead of stop-start. Next prompts are preloaded. */
const have = new Set();
const haveReady = fetch('voice/index.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : []).then(a => a.forEach(k => have.add(k))).catch(() => {});
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
function pickVoice() {
  if (ttsVoice || !window.speechSynthesis) return ttsVoice;
  const vs = speechSynthesis.getVoices();
  ttsVoice = vs.find(v => /en-AU/i.test(v.lang)) || vs.find(v => /en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
  return ttsVoice;
}
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { ttsVoice = null; pickVoice(); };
G.say = (...keys) => { const ks = keys.flat().filter(Boolean); G.preload(ks); vq.push(...ks); if (!vbusy) nextVoice(); };
G.sayNow = (...keys) => { G.stopVoice(); G.say(...keys); };
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
  const indo = k.startsWith('idw_');
  u.lang = indo ? 'id-ID' : 'en-AU';
  const v = indo ? speechSynthesis.getVoices().find(v => /^id/i.test(v.lang)) : pickVoice(); if (v) u.voice = v;
  let done = false; const fin = () => { if (!done && tok === vToken) { done = true; nextVoice(); } };
  u.onend = fin; u.onerror = fin; setTimeout(fin, 1500 + text.length * 110);
  speechSynthesis.speak(u);
}

/* ---------- progress + settings ---------- */
G.player = 'Felix';
const blank = () => ({ unlocked: 0, stickers: {}, stars: {}, buddy: null, shells: 0, photos: {}, decor: [], skill: {}, lastDay: '', streak: 0 });
G.blank = blank;
G.loadProg = n => { try { return Object.assign(blank(), JSON.parse(localStorage.getItem('croc2-' + n)) || {}); } catch (e) { return blank(); } };
G.saveProg = () => { try { localStorage.setItem('croc2-' + G.player, JSON.stringify(G.prog)); } catch (e) {} };
G.settings = (() => { try { return Object.assign({ limit: 20, culture: false, season: 'auto' }, JSON.parse(localStorage.getItem('croc2-settings')) || {}); } catch (e) { return { limit: 20, culture: false }; } })();
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
  $('cardTitle').textContent = title; $('cardBig').textContent = big; $('cardText').textContent = text || '';
  $('cardBtn').textContent = btn; cardCb = cb;
  $('cardBtn2').classList.toggle('hidden', !btn2); $('cardBtn2').textContent = btn2 || ''; card2Cb = cb2;
  $('card').classList.remove('hidden');
};
$('cardBtn').addEventListener('click', () => { G.audioInit(); $('card').classList.add('hidden'); const cb = cardCb; cardCb = null; cb && cb(); });
$('cardBtn2').addEventListener('click', () => { G.audioInit(); $('card').classList.add('hidden'); const cb = card2Cb; card2Cb = null; cb && cb(); });
$('cardBig').addEventListener('click', () => G.cardReplay && G.cardReplay());

/* ---------- mode switching + main loop ---------- */
G.mode = null;
G.setMode = (m, ...args) => { G.mode = m; m.start && m.start(...args); };
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
  if (G.mode) { if (!G.overlayOpen() || G.mode.animateUnderCards) G.mode.update && G.mode.update(dt, G.overlayOpen()); G.mode.draw && G.mode.draw(); G.drawShellPop(dt); }
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
  G.showCard(se.emoji + ' ' + se.name + ' surprise!', sp[0], sp[1] + ': ' + sp[2] + '  ·  🔥 ' + P.streak + ' day' + (P.streak > 1 ? 's' : '') + ' in a row  ·  +' + bonus + ' 🐚',
    'Yay! ▶', () => { G.cardReplay = null; G.earn(bonus); then(); });
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
$('gamesClose').onclick = () => $('games').classList.add('hidden');
/* games arcade: replay any bonus game from places you've reached */
G.gamesOpen = () => {
  const reached = C.stops.slice(0, Math.min(G.prog.unlocked, C.stops.length - 1) + 1);
  const list = [...new Set(['fishing', 'clap', ...reached.map(s => s.bonus)])];
  if (G.isRemi()) return list.filter(k => ['fishing', 'safari', 'clap', 'hacky', 'boat'].includes(k));
  return list;
};
function openGames() {
  G.stopVoice(); G.say('games');
  const box = $('gamesList'); box.innerHTML = '';
  const all = Object.keys(C.games), open = G.gamesOpen();
  for (const k of all) {
    if (G.isRemi() && !['fishing', 'safari', 'clap', 'hacky', 'boat'].includes(k)) continue;
    const [e, name] = C.games[k], ok = open.includes(k), b = document.createElement('button');
    b.className = 'sticker game' + (ok ? '' : ' locked'); b.innerHTML = '<span>' + (ok ? e : '🔒') + '</span><b>' + name + '</b>';
    b.onclick = () => { if (!ok) return; $('games').classList.add('hidden'); G.playGame(k); };
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
  for (const s of C.stops) {
    const h = document.createElement('h3'); h.textContent = s.flag + ' ' + s.name; box.appendChild(h);
    const row = document.createElement('div'); row.className = 'stickers';
    for (const a of s.animals) {
      const got = G.prog.stickers[a.id], b = document.createElement('button');
      b.className = 'sticker' + (got ? '' : ' locked');
      const iw = C.indo.animals[a.id];
      const ph = G.prog.photos && G.prog.photos[a.id];
      b.innerHTML = (ph ? '<em>' + (ph > 1 ? '🌟📷' : '📷') + '</em>' : '') + '<span>' + (got ? a.emoji : '❔') + '</span><b>' + (got ? a.name : '???') + '</b>' + (got && iw ? '<i>🇮🇩 ' + iw + '</i>' : '');
      b.onclick = () => { if (!got) return; $('guideFact').textContent = a.name + ': ' + a.fact + (iw ? '  🇮🇩 ' + iw : ''); G.sayNow('fact_' + a.id, iw ? ['idc_' + a.id, 'idw_' + G.slug(iw)] : []); };
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
  $('playedFor').textContent = Math.round(G.clock.sec / 60) + ' min played this session';
  progressReport();
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
$('setSeason').onchange = () => { G.settings.season = $('setSeason').value; G.saveSettings(); };
$('setLimit').onchange = () => { G.settings.limit = parseInt($('setLimit').value, 10); G.saveSettings(); };
$('setCulture').onchange = () => { G.settings.culture = $('setCulture').checked; G.saveSettings(); };
$('setReset').onclick = () => { G.clock.sec = 0; $('playedFor').textContent = 'Timer reset'; };
$('setUnlock').onclick = () => { if (G.coop) { for (const n in G.coop) { G.coop[n].unlocked = C.stops.length - 1; G.player = n; G.prog = G.coop[n]; G.saveProg(); } G.usePlayer('Felix'); $('playedFor').textContent = 'All places unlocked for both'; return; } if (G.prog) { G.prog.unlocked = C.stops.length - 1; G.saveProg(); $('playedFor').textContent = 'All places unlocked for ' + G.player; } };
$('setWipe').onclick = () => { if (G.prog && confirm('Clear all of ' + G.player + "'s progress and stickers?")) { G.prog = blank(); G.saveProg(); $('playedFor').textContent = G.player + ' reset'; } };
$('setClose').onclick = () => { $('settings').classList.add('hidden'); if (G.mode === G.modes.map) G.modes.map.start(); };

/* ---------- journey: a stop is a list of steps ---------- */
G.run = null;
const REMI_BONUS = ['fishing', 'safari', 'clap', 'hacky', 'boat'];
G.startStop = idx => {
  const stop = C.stops[idx], steps = [{ kind: 'meet' }, { kind: 'wotd' }];
  if (G.coop) { // team play: Remi and Felix take turns, then a team bonus game
    G.usePlayer('Remi'); const rq = G.Q.remiSet(stop, idx); G.usePlayer('Felix'); const fq = G.Q.felixSet(stop, idx).slice(0, 5);
    for (let i = 0; i < Math.max(rq.length, fq.length); i++) { if (rq[i]) steps.push({ kind: 'hop', q: rq[i], who: 'Remi' }); if (fq[i]) steps.push({ kind: 'hop', q: fq[i], who: 'Felix' }); }
    steps.push({ kind: 'bonus', type: idx % 2 ? 'clap' : 'safari', who: 'Remi' });
    G.run = { idx, stop, steps, i: -1, oops: 0 };
    return G.nextStep();
  }
  const remi = G.isRemi();
  const qs = remi ? G.Q.remiSet(stop, idx) : G.Q.felixSet(stop, idx);
  qs.forEach(q => steps.push({ kind: 'hop', q }));
  if (remi) steps.push({ kind: 'bonus', type: idx % 2 === 0 ? 'fishing' : REMI_BONUS[1 + ((idx - 1) / 2) % 4] });
  else { steps.push({ kind: 'bonus', type: stop.bonus }); if (idx % 3 === 1) steps.push({ kind: 'bonus', type: 'clap' }); }
  if (!remi) { steps.push({ kind: 'quizIntro' }); G.Q.quizSet(stop, idx).forEach(q => steps.push({ kind: 'hop', q, quiz: true })); }
  G.run = { idx, stop, steps, i: -1, oops: 0 };
  G.nextStep();
};
G.bonusModes = () => ({ fishing: G.modes.fish, surfing: G.modes.surf, car: G.modes.car, safari: G.modes.safari, boat: G.modes.boat, hacky: G.modes.hacky,
  judo: G.modes.judo, skate: G.modes.skate, bmx: G.modes.skate, clap: G.modes.clap });
G.nextStep = () => {
  const R = G.run; R.i++;
  if (R.i > 0 && R.i < R.steps.length && G.timeUp()) return breakTime();
  if (R.i >= R.steps.length) return stopDone();
  const st = R.steps[R.i];
  if (G.coop && st.who && st.who !== G.player) { G.usePlayer(st.who); G.say('turn_' + st.who.toLowerCase()); }
  if (st.kind === 'meet') return meet(0);
  if (st.kind === 'wotd') {
    const gr = C.indo.greet[R.idx % C.indo.greet.length], s = G.slug(gr[0]), keys = ['wotd', 'idw_' + s, 'wm_' + s, 'id_say'];
    G.sayNow(keys); G.cardReplay = () => G.sayNow('idw_' + s, 'wm_' + s);
    return G.showCard('🇮🇩 Indonesian word of the day', gr[2] + ' ' + gr[0], '"' + gr[0] + '" means "' + gr[1] + '". Say it out loud! (Tap the word to hear it again.)', 'Selamat! ▶', () => { G.cardReplay = null; G.nextStep(); });
  }
  if (st.kind === 'quizIntro') { G.say('quiz'); return G.showCard('Quiz time! 🧠', '❓', 'What do you remember about ' + R.stop.name + '?', 'Go!', () => G.nextStep()); }
  if (st.kind === 'hop') return G.setMode(G.modes.hop, st.q, R);
  if (st.kind === 'bonus') return G.setMode(G.bonusModes()[st.type], R, st.type);
};
G.stepDone = (oops = 0) => {
  const R = G.run; if (R) R.oops += oops;
  if (R && R.steps[R.i] && R.steps[R.i].kind === 'bonus') G.earn(3);
  if (R && R.arcade) { G.run = null; G.setMode(G.modes.map); return openGames(); }
  G.nextStep();
};
function meet(i) {
  const R = G.run, a = R.stop.animals[i];
  G.setMode(G.modes.hop, null, R); // scenery behind the cards
  const iw = C.indo.animals[a.id], idKeys = iw ? ['idc_' + a.id, 'idw_' + G.slug(iw)] : [];
  const keys = ['nm_' + a.id, 'fact_' + a.id, ...idKeys];
  if (i === 0) G.sayNow('st_' + R.stop.id, 'meet', keys); else G.sayNow(keys);
  G.cardReplay = () => G.sayNow(keys);
  G.preload(R.stop.animals.flatMap(x => ['nm_' + x.id, 'fact_' + x.id]));
  const last = i === R.stop.animals.length - 1;
  G.showCard((i === 0 ? R.stop.flag + ' ' + R.stop.name + ' — ' : '') + a.name, a.emoji, a.fact + (iw ? '  🇮🇩 Indonesian: ' + iw : '') + (G.settings.culture && a.local ? ' (' + a.local + ')' : ''),
    last ? "Let's play!" : 'Next ▶', () => { G.cardReplay = null; G.stopVoice(); last ? G.nextStep() : meet(i + 1); });
}
function breakTime() {
  G.run.i--; // resume this step later
  G.sayNow('break');
  G.showCard('Time for a break! 🌴', '🧃🤸', 'Great playing, ' + G.player + '! Have a stretch and a drink of water.', 'Back to the map', () => G.setMode(G.modes.map));
}
function stopDone() {
  const R = G.run, oops = R.oops, stars = oops <= 2 ? 3 : oops <= 6 ? 2 : 1;
  let newPlace = false;
  for (const who of G.coop ? ['Remi', 'Felix'] : [G.player]) {
    G.usePlayer(who);
    R.stop.animals.forEach(a => G.prog.stickers[a.id] = true);
    G.prog.stars[R.stop.id] = Math.max(G.prog.stars[R.stop.id] || 0, stars);
    if (R.idx === G.prog.unlocked && R.idx < C.stops.length - 1) { G.prog.unlocked++; newPlace = true; }
    G.saveProg(); G.earn(stars * 2);
  }
  G.jingle();
  G.sayNow('stop_done', 'sticker', newPlace ? 'map_next' : null);
  G.showCard(R.stop.name + ' done! 🎉', '⭐'.repeat(stars) + '\n' + R.stop.animals.map(a => a.emoji).join(' '),
    'New stickers in your Field Guide!' + (newPlace ? ' Next stop: ' + C.stops[R.idx + 1].name + '.' : ''), 'Map 🗺️', () => { G.run = null; G.setMode(G.modes.map); });
}

G.modes = {};
G.boot = () => {
  G.prog = G.loadProg('Felix');
  refreshMenu(); fit();
  G.setMode(G.modes.map, true);
  requestAnimationFrame(loop);
};
})();
