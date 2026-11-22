'use strict';
/* Hop mode: cross the road (a croc eats the cars) and the river, land on the right answer.
   Felix: real hazards (no game over). Remi: cars stop for him, stepping-stone creek, tap an answer to auto-hop. */
(() => {
const { W, H, T, g, rr, txt, fitTxt, circle, rnd, ri, pick, clamp } = G;
const HOP = 0.14, ROAD = [8, 9, 10, 11], RIVER = [2, 3, 4, 5, 6];
const BOATS = ['UB-19', 'PEGASUS V', 'DORY', 'KEIL', 'FREO', 'TOP END', 'MACKEREL'];
const CAR_COLS = ['#e94b3c', '#ffd23f', '#5cc8ff', '#a66bff', '#ffffff', '#7bd389', '#ff8fc7'];
const THEMES = {
  harbour: { grass: '#3c8d3f', start: '#58a85a', water: '#2b78b8', sand: '#e8cf8a', bank: '#2f6b33' },
  wetland: { grass: '#4f9a3a', start: '#67b04f', water: '#3a8f9e', sand: '#cdbb7a', bank: '#356b2a', lilies: true },
  beach: { grass: '#e9d59a', start: '#f1e2b0', water: '#22a3c9', sand: '#f6e6b8', bank: '#d9c17f' },
  bush: { grass: '#9a7a3c', start: '#b08d4a', water: '#2f86a8', sand: '#c9773e', bank: '#7b5a2a' },
  gorge: { grass: '#b5562e', start: '#c66a3a', water: '#2a7fa0', sand: '#d98b55', bank: '#8a3f22' },
  reef: { grass: '#f1e2b0', start: '#f6ebc6', water: '#19b5c9', sand: '#fff1c9', bank: '#e0cb8e' },
  mountain: { grass: '#3f8f45', start: '#58a85a', water: '#2b78b8', sand: '#a8c96a', bank: '#2c6a33' },
  island: { grass: '#5fa043', start: '#74b558', water: '#1f9bb8', sand: '#efdca0', bank: '#3f7a2f' },
  rainforest: { grass: '#2f7a3a', start: '#3f8f45', water: '#2b6f8f', sand: '#7aa04a', bank: '#1f5a28' }
};
let S = null, P = null;

function makeLanes(idx, remi) {
  const sp = remi ? .3 : Math.min(.42 + .05 * idx, .9), lanes = {};
  const road = [{ r: 8, dir: -1, v: 70, kinds: ['car', 'ute', 'car'] }, { r: 9, dir: 1, v: 50, kinds: ['truck', 'car'] },
                { r: 10, dir: -1, v: 85, kinds: ['car', 'car'] }, { r: 11, dir: 1, v: 58, kinds: ['bus', 'car'] }];
  for (const l of road) {
    const num = remi || idx < 2 ? 2 : 3, span = W + 4 * T, items = [];
    for (let i = 0; i < num; i++) { const kind = pick(l.kinds); items.push({ kind, len: kind === 'truck' || kind === 'bus' ? 2 : 1, x: i * span / num + rnd(0, T) - 2 * T, col: pick(CAR_COLS) }); }
    lanes[l.r] = { r: l.r, dir: l.dir, v: l.v * sp, items };
  }
  const easy = idx < 2;
  const river = [{ r: 6, dir: 1, v: 38, kind: 'log', len: 3, gap: 2 }, { r: 5, dir: -1, v: 46, kind: 'boat', len: 3, gap: 2 },
                 { r: 4, dir: 1, v: 34, kind: idx >= 1 ? 'croc' : 'log', len: 3, gap: 2 }, { r: 3, dir: -1, v: 52, kind: 'log', len: 2, gap: 2 },
                 { r: 2, dir: 1, v: 42, kind: 'boat', len: 2, gap: 2 }];
  for (const l of river) {
    const len = l.len + (easy ? 1 : 0), gap = Math.max(1, l.gap - (easy ? 1 : 0));
    const span = W + 4 * T, unit = (len + gap) * T, num = Math.max(2, Math.floor(span / unit)), items = [];
    for (let i = 0; i < num; i++) items.push({ kind: l.kind, len, x: i * span / num - 2 * T, open: 0, cyc: rnd(0, 3), label: pick(BOATS) });
    lanes[l.r] = { r: l.r, dir: l.dir, v: (remi ? 0 : l.v * sp), items, river: true };
  }
  return lanes;
}
function placeRoadCroc() {
  const row = S.croc ? (S.croc.row === 9 ? 10 : 9) : pick([9, 10]);
  S.croc = { row, len: 2, x: ri(2, 7) * T, dir: S.lanes[row].dir, open: 0, yawn: rnd(2, 4), eaten: S.croc ? S.croc.eaten : 0, rise: 0 };
}
function resetPlayer() { P = { r: 12, x: 5 * T + T / 2, y: 12 * T + T / 2, hopT: 0, fx: 0, fy: 0, tx: 0, ty: 0 }; S.cool = .45; S.auto = null; }
const dockCols = () => S.remi ? [1, 5, 9] : [1, 3, 5, 7, 9];
const dockW = () => S.remi ? 2.6 * T : 1.75 * T;
const step = () => S.q && S.q.steps[S.si];

function setStep() {
  S.answers = step().answers; S.idle = 0; S.hint = false; S.hinted = false; S.wrongs = 0;
  resetPlayer();
  G.say(step().say);
}
function hop(dir) {
  if (!S.q || S.done || P.hopT > 0 || S.cool > 0) return;
  let r = P.r, x = P.x;
  if (dir === 'up') r--; else if (dir === 'down') r++; else if (dir === 'left') x -= T; else x += T;
  if (r > 12 || r < 1) return;
  x = clamp(x, T / 2, W - T / 2);
  if (r === 1) { const cols = dockCols(); let best = cols[0]; for (const c of cols) if (Math.abs((c + .5) * T - x) < Math.abs((best + .5) * T - x)) best = c; x = (best + .5) * T; }
  else if (!RIVER.includes(r) || S.remi) x = Math.round((x - T / 2) / T) * T + T / 2;
  Object.assign(P, { fx: P.x, fy: P.y, tx: x, ty: r * T + T / 2, r, hopT: HOP });
  S.idle = 0; G.sfx('hop');
}
function crocHeadX(o, dir) { return dir > 0 ? o.x + (o.len - 1) * T : o.x; }

function update(dt) {
  S.t += dt; moveLanes(dt); updRoadCroc(dt); updParts(dt);
  if (!S.q || S.done) return;
  G.tick(dt);
  if (S.cool > 0) S.cool -= dt;
  S.idle += dt;
  if (!S.hint && S.idle > (S.remi ? 7 : 16)) giveHint();
  if (P.hopT > 0) {
    P.hopT -= dt; const k = 1 - Math.max(0, P.hopT) / HOP;
    P.x = P.fx + (P.tx - P.fx) * k; P.y = P.fy + (P.ty - P.fy) * k;
    if (P.hopT <= 0) { P.x = P.tx; P.y = P.ty; if (P.r === 1) atDock(); }
    return;
  }
  if (S.auto) { S.auto.t -= dt; if (S.auto.t <= 0) { S.auto.t = .2; const tc = S.auto.col, cc = Math.round((P.x - T / 2) / T); if (P.r === 12 && cc !== tc) hop(cc < tc ? 'right' : 'left'); else hop('up'); } return; }
  if (S.cool > 0 || S.remi) return;
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
      const hx = crocHeadX(c, -c.dir);
      if (c.open > .5 && P.x >= hx && P.x <= hx + T) return hazard('chomp');
      return;
    }
    for (const o of S.lanes[r].items) if (P.x + 20 > o.x + 4 && P.x - 20 < o.x + o.len * T - 4) return hazard('bonk');
  }
}
function moveLanes(dt) {
  for (const k in S.lanes) {
    const l = S.lanes[k];
    const order = l.items.slice().sort((a, b) => l.dir > 0 ? b.x - a.x : a.x - b.x); // front-most first
    for (const o of order) {
      let v = l.v;
      if (S.remi && !l.river && P) { // cars wait for Remi
        const kidRow = P.r === l.r || (P.hopT > 0 && P.r === l.r);
        const front = l.dir > 0 ? o.x + o.len * T : o.x, gap = l.dir > 0 ? (P.x - 26) - front : front - (P.x + 26);
        if ((kidRow || (S.auto && P.r === l.r + 1)) && gap > -10 && gap < 70) { v = 0; if (!o.waiting) { o.waiting = true; G.sfx('honk'); } } else o.waiting = false;
        for (const f of l.items) if (f !== o && f.stopped) { const ff = l.dir > 0 ? f.x : f.x + f.len * T; const fg = l.dir > 0 ? ff - front : front - ff; if (fg > -5 && fg < 14) v = 0; }
      }
      o.stopped = v === 0;
      o.x += l.dir * v * dt;
      if (l.dir > 0 && o.x > W + T) o.x = -o.len * T - rnd(T, 2 * T);
      if (l.dir < 0 && o.x + o.len * T < -T) o.x = W + rnd(T, 2 * T);
      if (o.kind === 'croc') { o.cyc += dt; o.open += (((o.cyc % 4) > 2.8 ? 1 : 0) - o.open) * Math.min(1, dt * 10); }
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
    if (o.x < end && o.x + o.len * T > c.x && dist < -12) {
      c.eaten++; S.ate++;
      burst(lane.dir > 0 ? c.x : end, c.row * T + T / 2, o.col || '#fff', 14);
      floatText('CHOMP!', lane.dir > 0 ? c.x : end, c.row * T, '#ffe14d'); G.sfx('chomp');
      if (S.ate === 1 && S.q && !G.saidCrocEat) { G.saidCrocEat = 1; G.say('croceat'); }
      o.x = lane.dir > 0 ? -o.len * T - rnd(2 * T, 4 * T) : W + rnd(2 * T, 4 * T); o.col = pick(CAR_COLS);
    }
  }
  if (S.remi && P && Math.abs(P.y - (c.row * T + T / 2)) < T * 1.5) tgt = 0; // never snaps near Remi
  c.open += (tgt - c.open) * Math.min(1, dt * 12);
}
function hazard(kind) {
  if (S.cool > 0) return;
  S.oops++; G.sfx(kind === 'bonk' ? 'bonk' : kind);
  burst(P.x, P.y, kind === 'splash' ? '#9fe3ff' : kind === 'chomp' ? '#7bd389' : '#ffd23f', 18);
  floatText({ splash: 'SPLASH!', chomp: 'CHOMP!', bonk: 'BEEP BEEP!' }[kind], P.x, P.y - 30, '#fff');
  G.said = G.said || {}; G.said[kind] = (G.said[kind] || 0) + 1;
  if (G.said[kind] <= 2) G.say(kind);
  if (kind === 'chomp' && G.said[kind] === 1) G.say('ontop');
  resetPlayer(); S.cool = .9;
}
function giveHint() { S.hint = true; if (!S.hinted) { S.hinted = true; G.say(pick(['bd_hint1', 'bd_hint2'])); } }
function atDock() {
  const cols = dockCols(), i = cols.indexOf(Math.round((P.x - T / 2) / T)), a = S.answers[i];
  S.auto = null;
  if (!a) { resetPlayer(); return; }
  if (a.ok) {
    G.sfx('ding'); burst(P.x, P.y, '#ffe14d', 24); floatText('★', P.x, P.y - 20, '#ffe14d');
    if (!S.wrongs) G.skillMark(step().skill, true);
    const st = step();
    G.sayNow(st.okSay);
    S.si++;
    if (S.si >= S.q.steps.length) {
      S.done = true; G.jingle(); G.earn(1);
      G.say(S.q.doneSay || [], pick(['great_', 'super_']) + G.player.toLowerCase());
      setTimeout(() => { if (G.mode === mode && S.done) G.stepDone(S.oops); }, 1500);
      return;
    }
    S.cool = .5; setTimeout(() => { if (G.mode === mode && !S.done) setStep(); }, 450);
    return;
  }
  S.oops++; G.sfx('bonk');
  floatText((a.t || a.e || '') + '?', P.x, P.y - 20, '#fff');
  if (!S.wrongs) G.skillMark(step().skill, false);
  if (S.remi) G.sayNow('remi_wrong', step().say);
  else G.sayNow(a.t && a.t.length === 1 && /[A-Z]/.test(a.t) ? ['th_' + a.t] : [], pick(['wrong1', 'wrong2']), step().say);
  resetPlayer(); S.cool = .8;
  S.wrongs = (S.wrongs || 0) + 1; if (S.remi || S.wrongs >= 2) giveHint();
}

/* ---------- particles ---------- */
function burst(x, y, col, n) { for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: rnd(-160, 160), vy: rnd(-220, 40), life: rnd(.5, .9), col }); }
function floatText(t, x, y, col) { S.parts.push({ x, y, vx: 0, vy: -50, life: 1.1, col, txt: t }); }
function updParts(dt) { for (const p of S.parts) { p.x += p.vx * dt; p.y += p.vy * dt; if (!p.txt) p.vy += 400 * dt; p.life -= dt; } S.parts = S.parts.filter(p => p.life > 0); }

/* ---------- drawing ---------- */
G.drawCroc = function drawCroc(x, y, len, headRight, open, scale = 1) {
  const w = len * T, h = T * .7 * scale, cy = y + T / 2;
  g.save();
  if (!headRight) { g.translate(x + w, 0); g.scale(-1, 1); x = 0; }
  g.beginPath(); g.moveTo(x + 4, cy); g.lineTo(x + T * .9, cy - h * .35); g.lineTo(x + T * .9, cy + h * .35); g.closePath(); g.fillStyle = '#2f8a3a'; g.fill();
  rr(x + T * .6, cy - h / 2, w - T * 1.4, h, h / 2, '#3fa34d');
  for (let i = 0; i < len * 2; i++) { const bx = x + T * .9 + i * (w - T * 1.9) / (len * 2); g.beginPath(); g.moveTo(bx, cy - h / 2 + 2); g.lineTo(bx + 7, cy - h / 2 - 7); g.lineTo(bx + 14, cy - h / 2 + 2); g.fillStyle = '#2f8a3a'; g.fill(); }
  rr(x + T * .8, cy - h * .15, w - T * 1.8, h * .45, 8, '#b9e08a');
  for (const lx of [x + T * .9, x + w - T * 1.3]) { rr(lx, cy + h / 2 - 6, 14, 12, 5, '#2f8a3a'); rr(lx, cy - h / 2 - 6, 14, 12, 5, '#2f8a3a'); }
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
  g.restore(); g.restore();
};
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
G.drawBoat = function (o, y, dir) {
  const w = o.len * T - 6; g.save(); g.translate(o.x + 3, 0); if (dir < 0) { g.translate(w, 0); g.scale(-1, 1); }
  g.beginPath(); g.moveTo(0, y + 14); g.lineTo(w - 22, y + 14); g.quadraticCurveTo(w + 4, y + T / 2, w - 22, y + T - 14); g.lineTo(0, y + T - 14); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#1b3b52'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#ff7a1a'; g.fillRect(2, y + T / 2 + 6, w - 26, 6);
  rr(w * .3, y + 20, w * .3, T - 40, 5, '#cfe3f2');
  g.restore();
  g.save(); g.font = '800 11px ' + G.FONT; g.fillStyle = '#1b3b52'; g.textAlign = 'center'; g.fillText(o.label || '', o.x + w / 2, y + 20); g.restore();
};
function drawAnswer(a, cx, cy, w, h, glow) {
  if (glow) { g.save(); g.shadowColor = '#ffe14d'; g.shadowBlur = 18 + Math.sin(S.t * 8) * 8; rr(cx - w / 2 - 3, cy - h / 2 - 3, w + 6, h + 6, 12, '#ffe14d'); g.restore(); }
  rr(cx - w / 2, cy - h / 2, w, h, 10, a.col || '#fffdf5', '#5e3b19', 2);
  if (a.col) return;
  const hasE = !!a.e, hasT = a.t !== undefined && a.t !== '';
  if (hasE && hasT) {
    if (a.e.length > 4) { fitTxt(a.e, cx, cy - 7, w - 8, 30, '#000'); fitTxt(a.t, cx, cy + 18, w - 10, 16, '#1d2a24'); }
    else { fitTxt(a.e, cx - w / 2 + 22, cy + 2, 34, 30, '#000'); fitTxt(a.t, cx + 16, cy + 2, w - 50, 22, '#1d2a24'); }
  } else if (hasE) fitTxt(a.e, cx, cy + 2, w - 10, 36, '#000');
  else fitTxt(a.t, cx, cy + 3, w - 12, a.t.length === 1 ? 38 : 28, '#1d2a24');
}
function draw() {
  const th = S.theme;
  g.fillStyle = th.grass; g.fillRect(0, 0, W, H);
  g.fillStyle = th.water; g.fillRect(0, 2 * T, W, 5 * T);
  for (let i = 0; i < 18; i++) { const wx = (i * 97 + S.t * 20) % (W + 60) - 30, wy = 2 * T + (i * 53) % (5 * T); g.strokeStyle = '#ffffff30'; g.lineWidth = 2; g.beginPath(); g.arc(wx, wy, 10, .2, Math.PI - .2); g.stroke(); }
  if (S.remi) for (const r of RIVER) for (let c = 0; c < 11; c++) { g.beginPath(); g.ellipse(c * T + T / 2, r * T + T / 2, 26, 20, 0, 0, Math.PI * 2); g.fillStyle = (c + r) % 2 ? '#4caf50' : '#5cbf60'; g.fill(); g.strokeStyle = '#2e7d32'; g.lineWidth = 2; g.stroke(); }
  else if (th.lilies) for (let i = 0; i < 9; i++) txt('🪷', (i * 131 + 40) % W, 2 * T + 30 + (i * 71) % (5 * T - 40), 16, '#fff');
  g.fillStyle = th.sand; g.fillRect(0, 7 * T, W, T);
  g.fillStyle = '#4a4f57'; g.fillRect(0, 8 * T, W, 4 * T);
  g.strokeStyle = '#f2f2f2'; g.lineWidth = 4; g.setLineDash([26, 22]);
  for (let r = 9; r <= 11; r++) { g.beginPath(); g.moveTo(0, r * T); g.lineTo(W, r * T); g.stroke(); }
  g.setLineDash([]);
  g.fillStyle = th.start; g.fillRect(0, 12 * T, W, T);
  for (let i = 0; i < 11; i++) { circle(i * T + 12, 12 * T + 50, 4, '#ffe066'); circle(i * T + 44, 12 * T + 14, 3, '#fff'); }
  g.fillStyle = th.bank; g.fillRect(0, T, W, T);
  // docks / answers
  const cols = dockCols(), dw = dockW();
  cols.forEach((c, i) => {
    const cx = (c + .5) * T, cy = 1.5 * T;
    rr(cx - dw / 2 - 2, T + 1, dw + 4, T - 2, 8, '#9b6a3a');
    const a = S.answers && S.answers[i];
    if (a && !S.done) drawAnswer(a, cx, cy, dw - 6, T - 10, S.hint && a.ok);
  });
  if (!S.remi) for (const r of RIVER) { const l = S.lanes[r]; for (const o of l.items) { const y = r * T; if (o.kind === 'log') drawLog(o, y); else if (o.kind === 'boat') G.drawBoat(o, y, l.dir); else G.drawCroc(o.x, y, o.len, l.dir > 0, o.open); } }
  for (const r of ROAD) { const l = S.lanes[r]; for (const o of l.items) drawCar(o, r * T, l.dir); }
  const c = S.croc;
  g.save(); g.globalAlpha = c.rise; G.drawCroc(c.x, c.row * T, c.len, c.dir < 0, c.open, 1.05); g.restore();
  if (c.eaten) { rr(c.x + T * .55, c.row * T - 4, 46, 18, 8, '#000a'); txt('🚗' + c.eaten, c.x + T * .55 + 23, c.row * T + 5, 12, '#fff', 'center', 600); }
  // buddy on the start bank
  txt(G.buddyEmoji(), 26, 12 * T + 30 + Math.sin(S.t * (G.speaking() ? 12 : 2)) * 3, 34, '#000');
  if (P && !(S.cool > 0 && S.cool < .9 && Math.floor(S.cool * 12) % 2 && !S.remi)) { const k = P.hopT > 0 ? 1 + Math.sin((1 - P.hopT / HOP) * Math.PI) * .25 : 1; G.drawKid(P.x, P.y, k); }
  for (const p of S.parts) { g.globalAlpha = clamp(p.life, 0, 1); if (p.txt) txt(p.txt, p.x, p.y, 30, p.col); else circle(p.x, p.y, 5, p.col); g.globalAlpha = 1; }
  drawHud();
}
function drawHud() {
  g.fillStyle = '#123b2c'; g.fillRect(0, 0, W, T);
  txt('🔊', W - 36, T / 2, 30, '#fff');
  txt(G.buddyEmoji(), 34, T / 2 + Math.sin(S.t * (G.speaking() ? 14 : 2)) * 3, 32, '#000');
  if (!S.q) { txt(S.stop ? S.stop.flag + ' ' + S.stop.name : 'Croc Crossing', W / 2, T / 2, 28, '#ffe14d'); return; }
  const hud = S.q.hud;
  if (hud.slots) {
    g.font = '800 26px ' + G.FONT;
    const ws = hud.slots.map(s => Math.max(38, g.measureText(s).width + 16)), total = ws.reduce((a, b) => a + b + 6, 0);
    const maxW = W - 200, sc = Math.min(1, maxW / total);
    let x = W / 2 - total * sc / 2 + 20;
    txt(hud.emoji, x - 34, T / 2, 30, '#fff');
    hud.slots.forEach((s, i) => {
      const w = ws[i] * sc, cur = i === S.si && !S.done, did = i < S.si || S.done;
      rr(x, 10, w, T - 20, 8, did ? '#3fa34d' : cur ? '#ffe14d' : '#ffffff22');
      fitTxt(s, x + w / 2, T / 2 + 2, w - 6, 26, did ? '#fff' : cur ? '#1d2a2480' : '#ffffff60');
      x += w + 6 * sc;
    });
  } else {
    if (hud.emoji) txt(hud.emoji, W / 2 - (hud.text ? 150 : 0), T / 2, 36, '#fff');
    if (hud.text) fitTxt(hud.text, hud.emoji ? W / 2 + 40 : W / 2, T / 2 + 2, hud.emoji ? 380 : W - 200, 26, '#ffe14d');
  }
}

const mode = G.modes.hop = {
  start(q, run) {
    const idx = run ? run.idx : 0, stop = run ? run.stop : G.C.stops[0];
    S = { q, si: 0, stop, idx, remi: G.isRemi(), theme: THEMES[stop.theme] || THEMES.harbour, lanes: makeLanes(idx, G.isRemi()), parts: [], cool: 0, t: 0, ate: 0, oops: 0, answers: null, done: false };
    placeRoadCroc(); resetPlayer();
    G.setPad(q ? 'arrows' : 'none');
    if (q) { G.preload(q.steps.flatMap(s => [...s.say, ...s.okSay]), q.doneSay || []); setStep(); } else P = null;
  },
  update, draw, animateUnderCards: true, music: () => (S && S.stop && S.stop.music) || 'game',
  press(k) { if (k !== 'act') { S.auto = null; hop(k); } },
  swipe(d) { if (!S.remi) hop(d); },
  tap(p) {
    if (!S.q) return;
    if (S.remi && p.y > T && p.y < 2 * T) { // tap an answer: Remi hops there
      const cols = dockCols(), dw = dockW();
      const i = cols.findIndex(c => Math.abs(p.x - (c + .5) * T) < dw / 2);
      if (i >= 0 && !S.done) { S.auto = { col: cols[i], t: 0 }; S.idle = 0; }
      return;
    }
    if (!S.remi) hop('up');
  },
  repeat() { if (S.q && step()) G.sayNow(step().say); },
  debug: () => ({ S, P })
};
})();
