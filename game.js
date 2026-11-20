'use strict';
/* Croc Crossing — a letters and spelling hopping game for Felix and Remi.
   Hop mode: cross the road (a croc eats the cars!) and the river, land on the right letter.
   Bonus mode: top-down car missions — drive to the lettered houses in order to spell a word. */
(() => {
const D = window.CROC;
const W = 704, H = 832, T = 64;
const HOP = 0.14;
const cv = document.getElementById('game'), g = cv.getContext('2d');
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const LET = Object.keys(D.pics);
const COLORS = { Felix: '#ff7a1a', Remi: '#2f7fd8' };
const FONT = "'Baloo 2', system-ui, sans-serif";

/* ---------- sound effects (synth) ---------- */
let ac = null;
function audioInit() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (ac && ac.state === 'suspended') ac.resume();
}
const SFX = { hop: ['square', 520, 780, .08, .05], ding: ['triangle', 880, 1320, .25, .12], chomp: ['sawtooth', 200, 50, .3, .14],
  splash: ['triangle', 500, 80, .4, .12], bonk: ['square', 300, 120, .25, .1], bump: ['square', 130, 70, .12, .1], star: ['sine', 1200, 1800, .12, .08] };
function sfx(type, delay = 0) {
  if (!ac) return;
  const s = SFX[type], t = ac.currentTime + delay, o = ac.createOscillator(), gn = ac.createGain();
  o.type = s[0]; o.frequency.setValueAtTime(s[1], t); o.frequency.exponentialRampToValueAtTime(s[2], t + s[3]);
  gn.gain.setValueAtTime(s[4], t); gn.gain.exponentialRampToValueAtTime(0.001, t + s[3]);
  o.connect(gn); gn.connect(ac.destination); o.start(t); o.stop(t + s[3] + .02);
}
function jingle() { [0, .12, .24, .4].forEach((d, i) => { if (!ac) return; const t = ac.currentTime + d, o = ac.createOscillator(), gn = ac.createGain();
  o.type = 'triangle'; o.frequency.value = [523, 659, 784, 1047][i]; gn.gain.setValueAtTime(.12, t); gn.gain.exponentialRampToValueAtTime(.001, t + .3);
  o.connect(gn); gn.connect(ac.destination); o.start(t); o.stop(t + .32); }); }

/* ---------- voices: ElevenLabs mp3 if generated, otherwise the device voice ---------- */
const have = new Set();
fetch('voice/index.json').then(r => r.ok ? r.json() : []).then(a => a.forEach(k => have.add(k))).catch(() => {});
let vq = [], vbusy = false, curAudio = null, ttsVoice = null;
function pickVoice() {
  if (ttsVoice || !window.speechSynthesis) return ttsVoice;
  const vs = speechSynthesis.getVoices();
  ttsVoice = vs.find(v => /en-AU/i.test(v.lang)) || vs.find(v => /en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
  return ttsVoice;
}
function say(...keys) { vq.push(...keys.filter(Boolean)); if (!vbusy) nextVoice(); }
function sayNow(...keys) { stopVoice(); say(...keys); }
function stopVoice() { vq = []; if (curAudio) { curAudio.onended = curAudio.onerror = null; curAudio.pause(); curAudio = null; } if (window.speechSynthesis) speechSynthesis.cancel(); vbusy = false; }
function nextVoice() {
  const k = vq.shift(); if (!k) { vbusy = false; return; }
  vbusy = true;
  const text = D.lines[k] || k;
  let done = false; const fin = () => { if (done) return; done = true; curAudio = null; nextVoice(); };
  if (have.has(k)) {
    const a = new Audio('voice/' + k + '.mp3'); curAudio = a;
    a.onended = fin; a.onerror = () => { if (!done) { done = true; tts(text); } };
    a.play().catch(() => { if (!done) { done = true; tts(text); } });
  } else tts(text);
}
function tts(text) {
  if (!window.speechSynthesis) { setTimeout(nextVoice, 700); return; }
  const u = new SpeechSynthesisUtterance(text); u.rate = .9; u.pitch = 1.15; u.lang = 'en-AU';
  const v = pickVoice(); if (v) u.voice = v;
  let done = false; const fin = () => { if (!done) { done = true; nextVoice(); } };
  u.onend = fin; u.onerror = fin; setTimeout(fin, 1500 + text.length * 120);
  speechSynthesis.speak(u);
}

/* ---------- progress ---------- */
let player = 'Felix';
function loadProg(n) { try { return JSON.parse(localStorage.getItem('croc-' + n)) || { level: 1, stars: 0 }; } catch (e) { return { level: 1, stars: 0 }; } }
function saveProg(n, p) { try { localStorage.setItem('croc-' + n, JSON.stringify(p)); } catch (e) {} }

/* ---------- curriculum ---------- */
const EASY = ['ABCDEFGHM', 'ILNOPRSTW', 'JKQUVXYZ'];
function spec(n) {
  const sp = Math.min(.5 + .065 * n, 1.55);
  if (n <= 3) return { mode: 'letter', title: 'Letter hunt', sp, tasks: shuffle(EASY[n - 1].split('')).slice(0, 3).map(L => ({ type: 'letter', L })) };
  if (n <= 6) return { mode: 'sound', title: 'Sound hunt', sp, tasks: shuffle(LET).slice(0, 3).map(L => ({ type: 'sound', L })) };
  const len = n <= 9 ? '3' : n <= 12 ? '4' : '5';
  const count = n <= 12 ? 2 : 1;
  return { mode: 'spell', title: len === '5' ? 'Big words' : 'Spelling', sp, len, tasks: shuffle(D.words[len]).slice(0, count).map(w => ({ type: 'spell', word: w[0], pic: w[1] })) };
}
const isBonusAfter = n => n % 3 === 0;

/* ---------- hop-mode scene ---------- */
const ROAD = [8, 9, 10, 11], RIVER = [2, 3, 4, 5, 6];
const BOATS = ['PEGASUS V', 'DORY', 'KEIL', 'FREO', 'TOP END', 'MACKEREL'];
const CAR_COLS = ['#e94b3c', '#ffd23f', '#5cc8ff', '#a66bff', '#ffffff', '#7bd389', '#ff8fc7'];
let S = null, P = null, mode = 'menu';

function makeLanes(n, sp) {
  const lanes = {};
  const road = [{ r: 8, dir: -1, v: 70, kinds: ['car', 'ute', 'car'] }, { r: 9, dir: 1, v: 50, kinds: ['truck', 'car'] },
                { r: 10, dir: -1, v: 85, kinds: ['car', 'car'] }, { r: 11, dir: 1, v: 58, kinds: ['bus', 'car'] }];
  for (const l of road) {
    const num = n <= 2 ? 2 : 3, span = W + 4 * T, items = [];
    for (let i = 0; i < num; i++) { const kind = pick(l.kinds); items.push({ kind, len: kind === 'truck' || kind === 'bus' ? 2 : 1, x: i * span / num + rnd(0, T) - 2 * T, col: pick(CAR_COLS) }); }
    lanes[l.r] = { r: l.r, dir: l.dir, v: l.v * sp, items, road: true };
  }
  const easy = n <= 2;
  const river = [{ r: 6, dir: 1, v: 38, kind: 'log', len: 3, gap: 2 }, { r: 5, dir: -1, v: 46, kind: 'boat', len: 3, gap: 2 },
                 { r: 4, dir: 1, v: 34, kind: n >= 2 ? 'croc' : 'log', len: 3, gap: 2 }, { r: 3, dir: -1, v: 52, kind: 'log', len: 2, gap: 2 },
                 { r: 2, dir: 1, v: 42, kind: 'boat', len: 2, gap: 2 }];
  for (const l of river) {
    const len = l.len + (easy ? 1 : 0), gap = Math.max(1, l.gap - (easy ? 1 : 0) + (n >= 10 ? 1 : 0));
    const span = W + 4 * T, unit = (len + gap) * T, num = Math.max(2, Math.floor(span / unit)), items = [];
    for (let i = 0; i < num; i++) items.push({ kind: l.kind, len, x: i * span / num - 2 * T, open: 0, cyc: rnd(0, 3), label: pick(BOATS) });
    lanes[l.r] = { r: l.r, dir: l.dir, v: l.v * sp, items, river: true };
  }
  return lanes;
}
function placeRoadCroc() {
  const row = S.croc ? (S.croc.row === 9 ? 10 : 9) : pick([9, 10]);
  const lane = S.lanes[row];
  S.croc = { row, len: 2, x: ri(2, 7) * T, dir: lane.dir, open: 0, yawn: rnd(2, 4), eaten: S.croc ? S.croc.eaten : 0, rise: 0 };
}
function newScene(n) {
  const sp = spec(n);
  S = { n, spec: sp, lanes: makeLanes(n, sp.sp), taskIdx: 0, letterIdx: 0, oops: 0, docks: [], parts: [], cool: 0, said: {}, t: 0, ate: 0 };
  placeRoadCroc();
  resetPlayer();
}
function resetPlayer() { P = { r: 12, x: 5 * T + T / 2, y: 12 * T + T / 2, hopT: 0, face: 'up', fx: 0, fy: 0, tx: 0, ty: 0 }; if (S) S.cool = .45; }

function task() { return S.spec.tasks[S.taskIdx]; }
function target() { const t = task(); return t.type === 'spell' ? t.word[S.letterIdx] : t.L; }
function setDocks() {
  const tg = target(), others = shuffle(LET.filter(L => L !== tg)).slice(0, 4);
  S.docks = shuffle([tg, ...others]);
}
function prompt(now) {
  const t = task(), f = now ? sayNow : say;
  if (t.type === 'letter') f('find_' + t.L);
  else if (t.type === 'sound') f('sound_' + t.L);
  else if (S.letterIdx === 0) f('spell_' + t.word, 'find_' + target());
  else f('find_' + target());
}
function startTask() { setDocks(); placeRoadCroc(); resetPlayer(); prompt(false); }

/* ---------- input ---------- */
const keys = {};
const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right', ' ': 'up' };
addEventListener('keydown', e => { const k = KEYMAP[e.key]; if (!k) return; e.preventDefault(); if (!keys[k]) press(k); keys[k] = true; });
addEventListener('keyup', e => { const k = KEYMAP[e.key]; if (k) keys[k] = false; });
document.querySelectorAll('#pad button').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); keys[k] = true; press(k); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { keys[k] = false; }));
});
function press(k) { if (mode === 'play') hop(k); }
let swipe = null;
function canvasXY(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
cv.addEventListener('pointerdown', e => { audioInit(); swipe = canvasXY(e); });
cv.addEventListener('pointerup', e => {
  if (!swipe) return; const p = canvasXY(e), dx = p.x - swipe.x, dy = p.y - swipe.y; const s0 = swipe; swipe = null;
  if (s0.y < T && s0.x > W - 90 && Math.hypot(dx, dy) < 25) { if (mode === 'play') prompt(true); else if (mode === 'bonus') bonusPrompt(true); return; }
  if (mode !== 'play') return;
  if (Math.hypot(dx, dy) < 25) hop('up');
  else if (Math.abs(dx) > Math.abs(dy)) hop(dx > 0 ? 'right' : 'left'); else hop(dy > 0 ? 'down' : 'up');
});

/* ---------- hop logic ---------- */
function hop(dir) {
  if (mode !== 'play' || P.hopT > 0 || S.cool > 0) return;
  let r = P.r, x = P.x;
  if (dir === 'up') r--; else if (dir === 'down') r++; else if (dir === 'left') x -= T; else x += T;
  if (r > 12 || r < 1) return;
  x = clamp(x, T / 2, W - T / 2);
  if (r === 1) { const di = clamp(Math.round((x - 1.5 * T) / (2 * T)), 0, 4); x = (1 + 2 * di) * T + T / 2; }
  else if (!RIVER.includes(r)) x = Math.round((x - T / 2) / T) * T + T / 2;
  Object.assign(P, { fx: P.x, fy: P.y, tx: x, ty: r * T + T / 2, r, hopT: HOP, face: dir });
  sfx('hop');
}
function crocHeadX(o, dir) { return dir > 0 ? o.x + (o.len - 1) * T : o.x; }
function updHop(dt) {
  S.t += dt; moveLanes(dt); updRoadCroc(dt); updParts(dt);
  if (S.cool > 0) S.cool -= dt;
  if (P.hopT > 0) {
    P.hopT -= dt; const k = 1 - Math.max(0, P.hopT) / HOP;
    P.x = P.fx + (P.tx - P.fx) * k; P.y = P.fy + (P.ty - P.fy) * k;
    if (P.hopT <= 0) { P.x = P.tx; P.y = P.ty; if (P.r === 1) atDock(); }
    return;
  }
  if (S.cool > 0) return;
  const r = P.r;
  if (RIVER.includes(r)) {
    const lane = S.lanes[r];
    const o = lane.items.find(o => P.x >= o.x - 8 && P.x <= o.x + o.len * T + 8);
    if (!o) return hazard('splash');
    P.x += lane.dir * lane.v * dt;
    if (o.kind === 'croc' && o.open > .5) { const hx = crocHeadX(o, lane.dir); if (P.x >= hx && P.x <= hx + T) return hazard('chomp'); }
    if (P.x < 6 || P.x > W - 6) return hazard('splash');
  } else if (ROAD.includes(r)) {
    const c = S.croc;
    if (c.row === r && P.x >= c.x - 4 && P.x <= c.x + c.len * T + 4) {
      const hx = crocHeadX(c, -c.dir); // head faces the oncoming cars
      if (c.open > .5 && P.x >= hx && P.x <= hx + T) return hazard('chomp');
      return; // safe on the croc's back
    }
    for (const o of S.lanes[r].items) if (P.x + 20 > o.x + 4 && P.x - 20 < o.x + o.len * T - 4) return hazard('bonk');
  }
}
function moveLanes(dt) {
  for (const k in S.lanes) {
    const l = S.lanes[k];
    for (const o of l.items) {
      o.x += l.dir * l.v * dt;
      if (l.dir > 0 && o.x > W + T) o.x = -o.len * T - rnd(T, 2 * T);
      if (l.dir < 0 && o.x + o.len * T < -T) o.x = W + rnd(T, 2 * T);
      if (o.kind === 'croc') { o.cyc += dt; const c = o.cyc % 4; o.open += ((c > 2.8 ? 1 : 0) - o.open) * Math.min(1, dt * 10); }
    }
  }
}
function updRoadCroc(dt) {
  const c = S.croc, lane = S.lanes[c.row];
  c.rise = Math.min(1, c.rise + dt * 2);
  let tgt = 0;
  c.yawn -= dt; if (c.yawn < 0) { tgt = 1; if (c.yawn < -1) c.yawn = rnd(2.5, 5); }
  const end = c.x + c.len * T;
  for (const o of lane.items) {
    const front = lane.dir > 0 ? o.x + o.len * T : o.x;
    const dist = lane.dir > 0 ? c.x - front : front - end;
    if (dist < 90 && dist > -20) tgt = 1;
    const overlap = o.x < end && o.x + o.len * T > c.x;
    if (overlap && dist < -12) {
      c.eaten++; S.ate++;
      burst(lane.dir > 0 ? c.x : end, c.row * T + T / 2, o.col || '#fff', 14);
      floatText('CHOMP!', lane.dir > 0 ? c.x : end, c.row * T, '#ffe14d');
      sfx('chomp');
      if (S.ate === 1 && mode === 'play' && !S.said.croceat) { S.said.croceat = 1; say('croceat'); }
      o.x = lane.dir > 0 ? -o.len * T - rnd(2 * T, 4 * T) : W + rnd(2 * T, 4 * T);
      o.col = pick(CAR_COLS);
    }
  }
  c.open += (tgt - c.open) * Math.min(1, dt * 12);
}
function hazard(kind) {
  if (S.cool > 0) return;
  S.oops++;
  sfx(kind === 'bonk' ? 'bonk' : kind);
  burst(P.x, P.y, kind === 'splash' ? '#9fe3ff' : kind === 'chomp' ? '#7bd389' : '#ffd23f', 18);
  floatText({ splash: 'SPLASH!', chomp: 'CHOMP!', bonk: 'BEEP BEEP!' }[kind], P.x, P.y - 30, '#fff');
  S.said[kind] = (S.said[kind] || 0) + 1;
  if (S.said[kind] <= 2) say(kind);
  if (kind === 'chomp' && S.said[kind] === 1) say('ontop');
  resetPlayer(); S.cool = .9;
}
function atDock() {
  const i = Math.round((P.x - T * 1.5) / (2 * T)), L = S.docks[i], tg = target(), t = task();
  if (L === tg) {
    sfx('ding'); burst(P.x, P.y, '#ffe14d', 24); floatText('★', P.x, P.y - 20, '#ffe14d');
    if (t.type === 'spell') {
      S.letterIdx++;
      if (S.letterIdx >= t.word.length) { sayNow('done_' + t.word); return nextTask(); }
      sayNow('letter_' + L); setDocks(); resetPlayer(); say('find_' + target());
      return;
    }
    sayNow(t.type === 'sound' ? 'is_' + L : 'letter_' + L, pick(['great_', 'super_']) + player.toLowerCase());
    return nextTask();
  }
  S.oops++; sfx('bonk');
  floatText(L + '?', P.x, P.y - 20, '#fff');
  sayNow('thats', 'letter_' + L, pick(['wrong1', 'wrong2']));
  resetPlayer(); S.cool = .8; prompt(false);
}
function nextTask() {
  S.taskIdx++; S.letterIdx = 0;
  if (S.taskIdx >= S.spec.tasks.length) return levelDone();
  resetPlayer(); S.cool = 1.2;
  setTimeout(() => { if (mode === 'play') startTask(); }, 900);
  S.docks = [];
}
function levelDone() {
  mode = 'done'; jingle();
  const n = S.n, stars = S.oops <= 1 ? 3 : S.oops <= 4 ? 2 : 1;
  const prog = loadProg(player); prog.level = Math.max(prog.level, n + 1); prog.stars += stars; saveProg(player, prog);
  say('level', pick(['great_', 'super_']) + player.toLowerCase());
  const bonus = isBonusAfter(n);
  showCard('Level ' + n + ' done!', '⭐'.repeat(stars), bonus ? 'Bonus mission next — jump in the car! 🚗' : 'Ready for level ' + (n + 1) + '?',
    bonus ? 'Drive!' : 'Next', () => bonus ? startBonus(n) : startLevel(n + 1));
}

/* ---------- particles ---------- */
function burst(x, y, col, n) { for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: rnd(-160, 160), vy: rnd(-220, 40), life: rnd(.5, .9), col }); }
function floatText(txt, x, y, col) { S.parts.push({ x, y, vx: 0, vy: -50, life: 1.1, col, txt }); }
function updParts(dt) { for (const p of S.parts) { p.x += p.vx * dt; p.y += p.vy * dt; if (!p.txt) p.vy += 400 * dt; p.life -= dt; } S.parts = S.parts.filter(p => p.life > 0); }

/* ---------- drawing helpers ---------- */
function rr(x, y, w, h, r, fill, stroke) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 3; g.stroke(); } }
function txt(s, x, y, size, col, align = 'center', weight = 800) { g.font = weight + ' ' + size + 'px ' + FONT; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }
function circle(x, y, r, col) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill(); }

function drawCroc(x, y, len, headRight, open, scale = 1) {
  // x,y = top-left of the croc's cells; len in cells
  const w = len * T, h = T * .7 * scale, cy = y + T / 2;
  g.save();
  if (!headRight) { g.translate(x + w, 0); g.scale(-1, 1); x = 0; }
  // tail
  g.beginPath(); g.moveTo(x + 4, cy); g.lineTo(x + T * .9, cy - h * .35); g.lineTo(x + T * .9, cy + h * .35); g.closePath(); g.fillStyle = '#2f8a3a'; g.fill();
  // body
  rr(x + T * .6, cy - h / 2, w - T * 1.4, h, h / 2, '#3fa34d');
  for (let i = 0; i < len * 2; i++) { const bx = x + T * .9 + i * (w - T * 1.9) / (len * 2); g.beginPath(); g.moveTo(bx, cy - h / 2 + 2); g.lineTo(bx + 7, cy - h / 2 - 7); g.lineTo(bx + 14, cy - h / 2 + 2); g.fillStyle = '#2f8a3a'; g.fill(); }
  rr(x + T * .8, cy - h * .15, w - T * 1.8, h * .45, 8, '#b9e08a');
  // legs
  for (const lx of [x + T * .9, x + w - T * 1.3]) { rr(lx, cy + h / 2 - 6, 14, 12, 5, '#2f8a3a'); rr(lx, cy - h / 2 - 6, 14, 12, 5, '#2f8a3a'); }
  // head with jaws
  const hx = x + w - T * .85, ang = open * .55;
  g.save(); g.translate(hx, cy);
  g.save(); g.rotate(-ang); rr(0, -h * .42, T * .85, h * .42, 10, '#3fa34d');
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(10 + i * 11, 0); g.lineTo(15 + i * 11, 7 * open); g.lineTo(20 + i * 11, 0); g.fillStyle = '#fff'; g.fill(); }
  circle(14, -h * .42, 9, '#3fa34d'); circle(14, -h * .45, 6, '#fff'); circle(16, -h * .45, 3, '#111');
  g.restore();
  g.save(); g.rotate(ang * .6); rr(0, 0, T * .8, h * .38, 10, '#36953f');
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(12 + i * 11, 0); g.lineTo(17 + i * 11, -7 * open); g.lineTo(22 + i * 11, 0); g.fillStyle = '#fff'; g.fill(); }
  g.restore();
  if (open > .3) { g.fillStyle = '#c2414b'; g.beginPath(); g.moveTo(4, 0); g.lineTo(T * .8, -Math.sin(ang) * T * .8); g.lineTo(T * .8, Math.sin(ang * .6) * T * .8); g.closePath(); g.globalAlpha = .9; g.fill(); g.globalAlpha = 1; }
  g.restore();
  g.restore();
}
function drawCar(o, y, dir) {
  const x = o.x, w = o.len * T - 6, top = y + 10, hgt = T - 20;
  g.save(); g.translate(x + 3, 0);
  if (dir < 0) { g.translate(w, 0); g.scale(-1, 1); }
  if (o.kind === 'bus') { rr(0, top - 2, w, hgt + 4, 10, '#ffd23f', '#0003'); for (let i = 0; i < 4; i++) rr(10 + i * 26, top + 6, 18, 14, 3, '#bfe9ff'); }
  else if (o.kind === 'truck') { rr(0, top, w * .65, hgt, 6, '#dfe6ee', '#0003'); rr(w * .67, top + 4, w * .33, hgt - 4, 8, o.col, '#0003'); rr(w * .8, top + 8, w * .15, 14, 3, '#bfe9ff'); }
  else if (o.kind === 'ute') { rr(0, top + 6, w, hgt - 6, 8, o.col, '#0003'); rr(w * .45, top, w * .45, hgt * .55, 6, o.col); rr(w * .55, top + 4, w * .3, 12, 3, '#bfe9ff'); }
  else { rr(0, top + 4, w, hgt - 4, 12, o.col, '#0003'); rr(w * .25, top - 2, w * .5, hgt * .55, 8, o.col); rr(w * .52, top + 2, w * .2, 12, 3, '#bfe9ff'); rr(w * .28, top + 2, w * .2, 12, 3, '#bfe9ff'); }
  for (const wx of [10, w - 22]) rr(wx, top + hgt - 6, 14, 10, 4, '#222');
  circle(w - 3, top + hgt * .6, 4, '#fff6a0');
  g.restore();
}
function drawLog(o, y) { rr(o.x + 2, y + 12, o.len * T - 4, T - 24, 18, '#8a5a2b', '#5e3b19'); for (let i = 1; i < o.len * 2; i++) { g.strokeStyle = '#6d4520'; g.lineWidth = 2; g.beginPath(); g.moveTo(o.x + i * T / 2, y + 16); g.lineTo(o.x + i * T / 2 + 6, y + T - 16); g.stroke(); } circle(o.x + o.len * T - 14, y + T / 2, 10, '#c48a4f'); }
function drawBoat(o, y, dir) {
  const w = o.len * T - 6; g.save(); g.translate(o.x + 3, 0); if (dir < 0) { g.translate(w, 0); g.scale(-1, 1); }
  g.beginPath(); g.moveTo(0, y + 14); g.lineTo(w - 22, y + 14); g.quadraticCurveTo(w + 4, y + T / 2, w - 22, y + T - 14); g.lineTo(0, y + T - 14); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#1b3b52'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#ff7a1a'; g.fillRect(2, y + T / 2 + 6, w - 26, 6);
  rr(w * .3, y + 20, w * .3, T - 40, 5, '#cfe3f2');
  g.restore();
  g.save(); g.font = '800 11px ' + FONT; g.fillStyle = '#1b3b52'; g.textAlign = 'center'; g.fillText(o.label, o.x + w / 2, y + 14 + 6); g.restore();
}
function drawKid(x, y, s, face) {
  const col = COLORS[player] || '#ff7a1a';
  g.save(); g.translate(x, y); g.scale(s, s);
  g.globalAlpha = .25; circle(0, 22, 18, '#000'); g.globalAlpha = 1;
  rr(-16, -2, 32, 26, 10, col); txt(player[0], 0, 11, 18, '#fff');
  circle(0, -14, 16, '#ffd9b3');
  g.beginPath(); g.arc(0, -18, 16, Math.PI, 0); g.fillStyle = player === 'Remi' ? '#6b3d1f' : '#e8b04a'; g.fill();
  circle(-6, -12, 3, '#222'); circle(6, -12, 3, '#222');
  g.beginPath(); g.arc(0, -7, 6, .2, Math.PI - .2); g.strokeStyle = '#a33'; g.lineWidth = 2; g.stroke();
  g.restore();
}

/* ---------- hop-mode render ---------- */
function drawHop() {
  // ground rows
  g.fillStyle = '#3c8d3f'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#2b78b8'; g.fillRect(0, 2 * T, W, 5 * T);
  for (let i = 0; i < 18; i++) { const wx = (i * 97 + S.t * 20) % (W + 60) - 30, wy = 2 * T + (i * 53) % (5 * T); g.strokeStyle = '#ffffff30'; g.lineWidth = 2; g.beginPath(); g.arc(wx, wy, 10, 0.2, Math.PI - .2); g.stroke(); }
  g.fillStyle = '#e8cf8a'; g.fillRect(0, 7 * T, W, T);
  for (let i = 0; i < 11; i++) circle(i * T + 20, 7 * T + 20 + (i % 3) * 8, 3, '#cdb06a');
  g.fillStyle = '#4a4f57'; g.fillRect(0, 8 * T, W, 4 * T);
  g.strokeStyle = '#f2f2f2'; g.lineWidth = 4; g.setLineDash([26, 22]);
  for (let r = 9; r <= 11; r++) { g.beginPath(); g.moveTo(0, r * T); g.lineTo(W, r * T); g.stroke(); }
  g.setLineDash([]);
  g.fillStyle = '#58a85a'; g.fillRect(0, 12 * T, W, T);
  for (let i = 0; i < 11; i++) { circle(i * T + 12, 12 * T + 50, 4, '#ffe066'); circle(i * T + 44, 12 * T + 14, 3, '#fff'); }
  // dock bank
  g.fillStyle = '#2f6b33'; g.fillRect(0, T, W, T);
  for (let i = 0; i < 5; i++) {
    const dx = (1 + 2 * i) * T, L = S.docks[i];
    rr(dx + 2, T + 2, T - 4, T - 4, 8, '#9b6a3a', '#5e3b19');
    if (L) { rr(dx + 8, T + 8, T - 16, T - 16, 10, '#fffdf5'); txt(S.spec.mode === 'sound' ? L.toLowerCase() : L, dx + T / 2, T + T / 2 + 2, 38, '#1d2a24'); }
  }
  // lanes
  for (const r of RIVER) { const l = S.lanes[r]; for (const o of l.items) { const y = r * T; if (o.kind === 'log') drawLog(o, y); else if (o.kind === 'boat') drawBoat(o, y, l.dir); else drawCroc(o.x, y, o.len, l.dir > 0, o.open); } }
  for (const r of ROAD) { const l = S.lanes[r]; for (const o of l.items) drawCar(o, r * T, l.dir); }
  const c = S.croc;
  g.save(); g.globalAlpha = c.rise; drawCroc(c.x, c.row * T, c.len, c.dir < 0, c.open, 1.05); g.restore();
  if (c.eaten) { rr(c.x + T * .55, c.row * T - 4, 46, 18, 8, '#000a'); txt('🚗' + c.eaten, c.x + T * .55 + 23, c.row * T + 5, 12, '#fff', 'center', 600); }
  // player
  if (mode === 'play' || mode === 'done') { const k = P.hopT > 0 ? 1 + Math.sin((1 - P.hopT / HOP) * Math.PI) * .25 : 1; if (!(S.cool > 0 && S.cool < .9 && Math.floor(S.cool * 12) % 2)) drawKid(P.x, P.y, k, P.face); }
  for (const p of S.parts) { g.globalAlpha = clamp(p.life, 0, 1); if (p.txt) txt(p.txt, p.x, p.y, 30, p.col); else circle(p.x, p.y, 5, p.col); g.globalAlpha = 1; }
  drawHopHud();
}
function drawHopHud() {
  g.fillStyle = '#123b2c'; g.fillRect(0, 0, W, T);
  txt(player + ' · L' + S.n, W - 70, T / 2, 18, '#fff', 'right', 700);
  txt('🔊', W - 36, T / 2, 30, '#fff');
  if (mode === 'menu' || !task()) { txt('Croc Crossing', W / 2, T / 2, 30, '#ffe14d'); return; }
  const t = task();
  if (t.type === 'letter') { txt('Find', W / 2 - 70, T / 2, 26, '#cde8d6', 'center', 700); txt(t.L + ' ' + t.L.toLowerCase(), W / 2 + 30, T / 2 + 2, 46, '#ffe14d'); }
  else if (t.type === 'sound') { txt(D.pics[t.L][1], W / 2 - 60, T / 2, 40, '#fff'); txt(D.pics[t.L][0] + ' starts with ?', W / 2 + 60, T / 2, 22, '#ffe14d', 'center', 700); if (t.L === 'X') txt('(ends)', W / 2 + 60, T - 8, 12, '#cde8d6'); }
  else {
    const word = t.word, bw = 40, x0 = W / 2 - (word.length * bw) / 2 + 30;
    txt(t.pic, x0 - 38, T / 2, 38, '#fff');
    for (let i = 0; i < word.length; i++) {
      const bx = x0 + i * bw, cur = i === S.letterIdx;
      rr(bx, 10, bw - 6, T - 20, 8, i < S.letterIdx ? '#3fa34d' : cur ? '#ffe14d' : '#ffffff22');
      const show = i < S.letterIdx ? word[i] : (S.spec.len === '5' ? (cur ? '?' : '') : word[i]);
      txt(show, bx + (bw - 6) / 2, T / 2 + 2, 28, i < S.letterIdx ? '#fff' : cur ? '#1d2a24' : '#ffffff70');
    }
  }
}

/* ---------- bonus: top-down car missions ---------- */
const CT = 128, CN = 25;
let B = null;
function isRoad(x, y) { return x % 4 === 0 || y % 4 === 0; }
function bonusWord(n) {
  if (n <= 3) return { word: shuffle(LET).slice(0, 3).join(''), pic: '✉️', letters: true };
  const w = pick(D.words[n <= 6 ? '3' : n <= 9 ? '3' : n <= 12 ? '4' : '5']);
  return { word: w[0], pic: w[1] };
}
function startBonus(n) {
  const wd = bonusWord(n);
  const grid = [];
  for (let y = 0; y < CN; y++) { grid.push([]); for (let x = 0; x < CN; x++) grid[y].push(x === 0 ? 2 : isRoad(x, y) ? 1 : 0); }
  const houses = [], blocks = [];
  for (let by = 0; by < 6; by++) for (let bx = 0; bx < 6; bx++) blocks.push([bx, by]);
  const need = [...new Set(wd.word.split(''))], rest = shuffle(LET.filter(L => !need.includes(L)));
  const bl = shuffle(blocks);
  const centre = bl.findIndex(b => b[0] === 2 && b[1] === 2); // keep the start block's neighbour fair
  const letters = shuffle([...need, ...rest.slice(0, 26 - need.length)]);
  bl.forEach((b, i) => {
    const tx = b[0] * 4 + 2, ty = b[1] * 4 + 2;
    if (i < letters.length) { grid[ty][tx] = 3; houses.push({ tx, ty, L: letters[i], roof: pick(['#e94b3c', '#2f7fd8', '#a66bff', '#ff7a1a', '#3fa34d', '#d4a017']) }); }
    else grid[ty][tx] = 4; // park pond
  });
  const stars = [];
  for (let i = 0; i < 26; i++) { let x, y; do { x = ri(1, CN - 1); y = ri(0, CN - 1); } while (!isRoad(x, y) || x === 0); stars.push({ x: x * CT + CT / 2, y: y * CT + CT / 2, got: false }); }
  const crocs = [];
  for (let i = 0; i < 3 + Math.min(4, Math.floor(n / 3)); i++) { const tx = ri(1, 6) * 4, ty = ri(0, 6) * 4; crocs.push({ tx, ty, x: tx * CT + CT / 2, y: ty * CT + CT / 2, nx: tx, ny: ty, dir: ri(0, 3), v: 55 + n * 3, cool: 0, open: 0 }); }
  B = { n, ...wd, idx: 0, grid, houses, stars, crocs, car: { x: 12 * CT + CT / 2, y: 12 * CT + CT / 2, a: -Math.PI / 2, v: 0 },
        time: 70 + wd.word.length * 25, seek: 0, got: 0, parts: [], said: {}, t: 0, active: true };
  void centre;
  mode = 'bonusIntro';
  say('bonus');
  showCard('Bonus mission! 🚗', wd.pic + ' ' + wd.word.split('').join(' '),
    wd.letters ? 'Deliver the letters! Drive to each house with the right letter on its roof.' : 'Spell ' + wd.word + ' — drive to each letter house in order. Watch out for crocs on the road!',
    'Go!', () => { mode = 'bonus'; S.parts = []; bonusPrompt(false); });
  if (!wd.letters) say('bonusword');
}
function bonusTarget() { return B.word[B.idx]; }
function bonusPrompt(now) { (now ? sayNow : say)('house_' + bonusTarget()); }
function solidAt(x, y) {
  const tx = Math.floor(x / CT), ty = Math.floor(y / CT);
  if (tx < 0 || ty < 0 || tx >= CN || ty >= CN) return true;
  const v = B.grid[ty][tx]; if (v === 2 || v === 4) return true;
  if (v === 3) { const cx = tx * CT + CT / 2, cy = ty * CT + CT / 2; return Math.abs(x - cx) < CT * .42 && Math.abs(y - cy) < CT * .42; }
  return false;
}
function updCar(dt) {
  B.t += dt; B.time -= dt; B.seek += dt;
  const c = B.car, onRoad = B.grid[Math.floor(c.y / CT)]?.[Math.floor(c.x / CT)] === 1;
  const max = onRoad ? 380 : 190;
  if (keys.up) c.v += 420 * dt; else if (keys.down) c.v -= (c.v > 0 ? 600 : 260) * dt; else c.v *= (1 - 1.6 * dt);
  c.v = clamp(c.v, -160, max); if (!onRoad && c.v > max) c.v -= 600 * dt;
  const steer = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
  c.a += steer * 2.8 * dt * clamp(c.v / 140, -1, 1);
  const nx = c.x + Math.cos(c.a) * c.v * dt, ny = c.y + Math.sin(c.a) * c.v * dt, r = 18;
  if ([[r, r], [-r, r], [r, -r], [-r, -r], [0, 0]].some(([ox, oy]) => solidAt(nx + ox, ny + oy))) {
    if (Math.abs(c.v) > 60) sfx('bump'); c.v *= -.35;
  } else { c.x = nx; c.y = ny; }
  // stars
  for (const s of B.stars) if (!s.got && Math.hypot(s.x - c.x, s.y - c.y) < 40) { s.got = true; B.got++; sfx('star'); }
  // crocs roam the roads
  for (const k of B.crocs) {
    const tx = k.nx * CT + CT / 2, ty = k.ny * CT + CT / 2, dx = tx - k.x, dy = ty - k.y, d = Math.hypot(dx, dy);
    if (d < 2) {
      k.x = tx; k.y = ty; k.tx = k.nx; k.ty = k.ny;
      const opts = [[1, 0], [0, 1], [-1, 0], [0, -1]].map((v, i) => ({ v, i })).filter(o => {
        const ax = k.tx + o.v[0], ay = k.ty + o.v[1]; return ax >= 1 && ay >= 0 && ax < CN && ay < CN && B.grid[ay][ax] === 1 && o.i !== (k.dir + 2) % 4; });
      const o = opts.length ? pick(opts) : { v: [[1, 0], [0, 1], [-1, 0], [0, -1]][(k.dir + 2) % 4], i: (k.dir + 2) % 4 };
      k.dir = o.i; k.nx = k.tx + o.v[0]; k.ny = k.ty + o.v[1];
    } else { const st = Math.min(d, k.v * dt); k.x += dx / d * st; k.y += dy / d * st; }
    k.cool -= dt; k.open += ((Math.hypot(k.x - c.x, k.y - c.y) < 160 ? 1 : 0) - k.open) * Math.min(1, dt * 8);
    if (k.cool <= 0 && Math.hypot(k.x - c.x, k.y - c.y) < 56) {
      k.cool = 1.5; c.v = -Math.sign(c.v || 1) * 140; B.time -= 3; sfx('chomp');
      B.parts.push({ x: c.x, y: c.y - 30, txt: 'CHOMP! -3s', life: 1.2 });
      if (!B.said.croc) { B.said.croc = 1; say('crocroad'); }
    }
  }
  // delivery
  const tg = bonusTarget();
  const h = B.houses.find(h => h.L === tg);
  if (h && Math.hypot(h.tx * CT + CT / 2 - c.x, h.ty * CT + CT / 2 - c.y) < CT * 1.15) {
    sfx('ding'); jingle(); B.parts.push({ x: c.x, y: c.y - 40, txt: tg + ' ✓', life: 1.4 });
    sayNow('letter_' + tg); B.idx++; B.seek = 0;
    if (B.idx >= B.word.length) return bonusDone(true);
    say('delivered'); bonusPrompt(false);
  }
  for (const p of B.parts) { p.y -= 40 * dt; p.life -= dt; } B.parts = B.parts.filter(p => p.life > 0);
  if (B.time <= 0) bonusDone(false);
}
function bonusDone(win) {
  mode = 'done';
  const next = B.n + 1;
  const prog = loadProg(player); prog.level = Math.max(prog.level, next); prog.stars += win ? 3 : 1; saveProg(player, prog);
  if (win) say(B.letters ? 'bonusdone' : 'done_' + B.word, 'bonusdone'); else say('timeup');
  showCard(win ? 'Mission complete! 🏆' : "Time's up!", (win ? '⭐⭐⭐' : '⭐') + '  +' + B.got + '✨',
    win ? 'Top driving, ' + player + '!' : 'Good try! On to level ' + next + '.', 'Next', () => startLevel(next));
}
function drawBonus() {
  const c = B.car;
  const camX = clamp(c.x - W / 2, 0, CN * CT - W), camY = clamp(c.y - H / 2, 0, CN * CT - H);
  g.save(); g.translate(-camX, -camY);
  const x0 = Math.floor(camX / CT), y0 = Math.floor(camY / CT);
  for (let ty = y0; ty <= y0 + Math.ceil(H / CT); ty++) for (let tx = x0; tx <= x0 + Math.ceil(W / CT); tx++) {
    if (ty >= CN || tx >= CN) continue;
    const v = B.grid[ty][tx], X = tx * CT, Y = ty * CT;
    if (v === 2) { g.fillStyle = '#2b78b8'; g.fillRect(X, Y, CT, CT); if (ty % 4 === 2) { g.fillStyle = '#9b6a3a'; g.fillRect(X + 60, Y + 50, CT - 60, 26); g.save(); g.translate(X + 30, Y + 64); g.rotate(Math.PI / 2); g.translate(-40, -32); drawBoat({ x: 0, len: 1.3, label: ty % 8 === 2 ? 'PEGASUS V' : 'DORY' }, 0, 1); g.restore(); } continue; }
    if (v === 1) {
      g.fillStyle = '#4a4f57'; g.fillRect(X, Y, CT, CT);
      g.strokeStyle = '#f2f2f2aa'; g.lineWidth = 4; g.setLineDash([20, 18]);
      const hr = ty % 4 === 0, vr = tx % 4 === 0;
      if (hr && !vr) { g.beginPath(); g.moveTo(X, Y + CT / 2); g.lineTo(X + CT, Y + CT / 2); g.stroke(); }
      if (vr && !hr) { g.beginPath(); g.moveTo(X + CT / 2, Y); g.lineTo(X + CT / 2, Y + CT); g.stroke(); }
      g.setLineDash([]); continue;
    }
    g.fillStyle = '#5bb05e'; g.fillRect(X, Y, CT, CT);
    if (v === 0 && (tx * 7 + ty * 13) % 3 === 0) { circle(X + 40, Y + 44, 22, '#2f7a35'); circle(X + 52, Y + 34, 16, '#3f9a45'); }
    if (v === 0 && (tx * 5 + ty * 3) % 4 === 1) { rr(X + 70, Y + 70, 40, 30, 6, '#f4e3c3', '#0002'); }
    if (v === 4) { g.beginPath(); g.ellipse(X + CT / 2, Y + CT / 2, 50, 36, 0, 0, Math.PI * 2); g.fillStyle = '#2b78b8'; g.fill(); txt('🦆', X + CT / 2, Y + CT / 2, 28, '#fff'); }
  }
  for (const h of B.houses) {
    const X = h.tx * CT, Y = h.ty * CT, tg = h.L === bonusTarget();
    rr(X + 10, Y + 10, CT - 20, CT - 20, 10, h.roof, '#0004');
    g.strokeStyle = '#0002'; g.lineWidth = 3; g.beginPath(); g.moveTo(X + 10, Y + 10); g.lineTo(X + CT - 10, Y + CT - 10); g.moveTo(X + CT - 10, Y + 10); g.lineTo(X + 10, Y + CT - 10); g.stroke();
    circle(X + CT / 2, Y + CT / 2, 34, '#fffdf5'); txt(h.L, X + CT / 2, Y + CT / 2 + 3, 46, '#1d2a24');
    if (tg && B.seek > 8) { g.strokeStyle = '#ffe14d'; g.lineWidth = 6; g.beginPath(); g.arc(X + CT / 2, Y + CT / 2, 44 + Math.sin(B.t * 6) * 4, 0, Math.PI * 2); g.stroke(); }
  }
  for (const s of B.stars) if (!s.got) txt('⭐', s.x, s.y + Math.sin(B.t * 4 + s.x) * 3, 26, '#fff');
  for (const k of B.crocs) { g.save(); g.translate(k.x, k.y); g.rotate([0, Math.PI / 2, Math.PI, -Math.PI / 2][k.dir]); drawCroc(-T * 1.25, -T / 2, 2.5, true, k.open * .9, 1); g.restore(); }
  // car
  g.save(); g.translate(c.x, c.y); g.rotate(c.a);
  g.globalAlpha = .25; rr(-26, -13, 56, 32, 10, '#000'); g.globalAlpha = 1;
  for (const [wx, wy] of [[-20, -17], [12, -17], [-20, 11], [12, 11]]) rr(wx, wy, 14, 7, 3, '#222');
  rr(-28, -15, 56, 30, 10, COLORS[player], '#0005'); rr(2, -11, 14, 22, 4, '#bfe9ff'); rr(-20, -11, 10, 22, 3, '#bfe9ff');
  txt(player[0], -4, 1, 14, '#fff');
  g.restore();
  for (const p of B.parts) { g.globalAlpha = clamp(p.life, 0, 1); txt(p.txt, p.x, p.y, 30, '#fff'); g.globalAlpha = 1; }
  // helper arrow toward the target house after a while
  const h = B.houses.find(h => h.L === bonusTarget());
  if (h && B.seek > 8) {
    const hx = h.tx * CT + CT / 2, hy = h.ty * CT + CT / 2, a = Math.atan2(hy - c.y, hx - c.x);
    if (Math.hypot(hx - c.x, hy - c.y) > 200) { g.save(); g.translate(c.x + Math.cos(a) * 70, c.y + Math.sin(a) * 70); g.rotate(a); g.beginPath(); g.moveTo(22, 0); g.lineTo(-10, -14); g.lineTo(-4, 0); g.lineTo(-10, 14); g.closePath(); g.fillStyle = '#ffe14d'; g.fill(); g.strokeStyle = '#0006'; g.lineWidth = 2; g.stroke(); g.restore(); }
  }
  g.restore();
  // HUD
  g.fillStyle = '#123b2ccc'; g.fillRect(0, 0, W, T);
  txt(Math.ceil(Math.max(0, B.time)) + 's', W - 70, T / 2, 20, '#fff', 'right', 700);
  const bw = 40, wx0 = W / 2 - (B.word.length * bw) / 2 + 20;
  txt(B.pic, wx0 - 36, T / 2, 32, '#fff');
  for (let i = 0; i < B.word.length; i++) { const bx = wx0 + i * bw; rr(bx, 10, bw - 6, T - 20, 8, i < B.idx ? '#3fa34d' : i === B.idx ? '#ffe14d' : '#ffffff22'); txt(B.word[i], bx + (bw - 6) / 2, T / 2 + 2, 26, i === B.idx ? '#1d2a24' : '#fff'); }
  txt('🔊', W - 36, T / 2, 30, '#fff');
  const frac = clamp(B.time / (70 + B.word.length * 25), 0, 1);
  rr(10, H - 22, W - 20, 12, 6, '#0006'); rr(10, H - 22, (W - 20) * frac, 12, 6, frac < .25 ? '#e94b3c' : '#ffe14d');
  txt(Math.ceil(Math.max(0, B.time)) + 's  ✨' + B.got, W - 16, H - 40, 18, '#fff', 'right', 700);
}

/* ---------- screens ---------- */
const $ = id => document.getElementById(id);
let cardCb = null;
function showCard(title, big, text, btn, cb) {
  $('cardTitle').textContent = title; $('cardBig').textContent = big; $('cardText').textContent = text; $('cardBtn').textContent = btn;
  cardCb = cb; $('card').classList.remove('hidden');
}
$('cardBtn').addEventListener('click', () => { audioInit(); $('card').classList.add('hidden'); const cb = cardCb; cardCb = null; if (cb) cb(); });
function startLevel(n) {
  if (B) B.active = false;
  newScene(n); mode = 'intro';
  const sp = S.spec;
  const how = sp.mode === 'letter' ? 'Hop over the road and the river. Land on the right letter!'
    : sp.mode === 'sound' ? 'Look at the picture. Which letter does it start with?'
    : 'Spell the word one letter at a time!';
  showCard('Level ' + n + ' · ' + sp.title, sp.mode === 'spell' ? sp.tasks.map(t => t.pic).join(' ') : sp.mode === 'sound' ? '🍎 → a' : '🔤',
    how + ' Hop on the croc\'s back when his mouth is shut 🐊', 'Go!', () => { mode = 'play'; say('ready'); startTask(); });
}
function refreshMenu() {
  for (const n of ['Felix', 'Remi']) { const p = loadProg(n); $('lv' + n).textContent = 'Level ' + p.level + ' · ' + p.stars + '⭐'; }
}
for (let i = 1; i <= 18; i++) { const o = document.createElement('option'); o.value = i; o.textContent = i; $('lvlPick').appendChild(o); }
document.querySelectorAll('.pbtn').forEach(b => b.addEventListener('click', () => {
  audioInit(); player = b.dataset.player;
  const pickLv = parseInt($('lvlPick').value, 10), lv = pickLv || loadProg(player).level;
  $('menu').classList.add('hidden'); $('topbtns').classList.remove('hidden');
  sayNow('hi_' + player.toLowerCase());
  startLevel(lv);
}));
$('menuBtn').addEventListener('click', () => { stopVoice(); mode = 'menu'; if (B) B.active = false; $('card').classList.add('hidden'); $('topbtns').classList.add('hidden'); refreshMenu(); $('menu').classList.remove('hidden'); newScene(1); });

/* ---------- layout + loop ---------- */
function fit() {
  const padH = $('pad').offsetHeight + 24, s = Math.min((innerWidth - 16) / W, (innerHeight - padH) / H);
  cv.style.width = (W * s) + 'px'; cv.style.height = (H * s) + 'px';
}
addEventListener('resize', fit); fit();
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { ttsVoice = null; pickVoice(); };
if (!CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { this.rect(x, y, w, h); };

newScene(1); refreshMenu();
let last = 0;
function loop(ts) {
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  if (mode === 'play') updHop(dt);
  else if (mode === 'bonus') updCar(dt);
  else if (mode !== 'bonusIntro' && S) { S.t += dt; moveLanes(dt); updRoadCroc(dt); updParts(dt); }
  if (B && B.active) drawBonus();
  else drawHop();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__croc = { get S() { return S; }, get B() { return B; }, get P() { return P; }, get mode() { return mode; }, set mode(m) { mode = m; }, startLevel, startBonus, hop, keys,
  step(sec) { for (let i = 0; i < sec * 60; i++) { if (mode === 'play') updHop(1 / 60); else if (mode === 'bonus') updCar(1 / 60); } if (B && B.active) drawBonus(); else drawHop(); } };
})();
