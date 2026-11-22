'use strict';
/* Design a boat (Dad's job): pick a hull, then load cargo on the LEFT or RIGHT of the deck.
   Each thing shows its weight as dots. The boat tilts to the heavier side and sinks as the load goes up.
   3 tasks: equal sides, a target total, then fill up to the hull's red line. Remi: count things on, then make it level. */
(() => {
const { W, H, T, g, rr, txt, fitTxt, circle, clamp, pick } = G;
const LN = {
  dz_intro: "Let's design a boat! Pick one.",
  dz_dinghy: 'A dinghy! Small and zippy.',
  dz_cat: 'A catamaran! Two hulls, nice and steady.',
  dz_banana: 'A banana boat! Hold on tight!',
  dz_tap: 'Tap a thing, then tap a side of the boat.',
  dz_side2: 'Put two on each side. Keep it level!',
  dz_side3: 'Put three on each side. Keep it level!',
  dz_tot4: 'Load four and keep it level!',
  dz_tot6: 'Load six and keep it level!',
  dz_tot8: 'Load eight and keep it level!',
  dz_limit: 'Fill her up close to the red line. Keep it level!',
  dz_r2: 'Put two things on the boat!',
  dz_r3: 'Put three things on the boat!',
  dz_rlevel: 'Make the boat level! Same on both sides.',
  dz_go: 'Nice and level! Off she goes!',
  dz_heavy: 'Glug glug! Too heavy! Take something off.',
  dz_tip: 'Whoa, wobbly! Make both sides the same.',
  dz_more: 'Room for more! Load a bit extra.',
  dz_less: 'A bit too much! Take one off.',
  dz_count: "Let's count them!",
  dz_done: 'What a top boat designer! Dad would be proud.'
};
for (const k in LN) if (!G.lineText(k)) window.LINES[k] = LN[k];
const DY = 470, CX = W / 2;
const HULLS = [{ id: 'dinghy', e: '🛶', lim: 6, col: '#ff7a1a' }, { id: 'cat', e: '⛵', lim: 8, col: '#2aa198' }, { id: 'banana', e: '🍌', lim: 7, col: '#f4c20d' }];
const CARGO = [{ id: 'crate', e: '📦', w: 2 }, { id: 'dad', e: '👨', w: 3 }, { id: 'dog', e: '🐕', w: 1 }, { id: 'chook', e: '🐔', w: 1 }, { id: 'esky', e: '🧊', w: 2 }, { id: 'rods', e: '🎣', w: 1 }];
const ZONES = { L: [24, 196, 322, 250], R: [358, 196, 322, 250] };
const LAUNCH = [CX - 110, 530, 220, 78];
const inR = (p, r) => p.x >= r[0] && p.x <= r[0] + r[2] && p.y >= r[1] && p.y <= r[1] + r[3];
const tray = i => [14 + i * 114, 646, 104, 150];
let S = null;

function start(run) {
  const remi = G.isRemi();
  S = { run, remi, phase: 'pick', hull: null, tasks: [], ti: 0, items: CARGO.map(c => ({ ...c, side: null })), sel: null, drag: null,
    tilt: 0, tiltV: 0, sink: 0, xs: 0, bx: 0, shake: 0, anim: null, first: true, t: 0, idle: 0, fx: [], end: false };
  G.setPad('none');
  G.sayNow('dz_intro');
}
function makeTasks(lim) {
  if (S.remi) return [{ k: 'count', n: 2, say: 'dz_r2' }, { k: 'count', n: 3, say: 'dz_r3' }, { k: 'level', say: 'dz_rlevel' }];
  const side = pick([2, 3]), tot = pick([4, 6, 8].filter(n => n <= lim && n !== side * 2));
  return [{ k: 'side', n: side, say: 'dz_side' + side }, { k: 'total', n: tot, say: 'dz_tot' + tot }, { k: 'limit', say: 'dz_limit' }];
}
const task = () => S.tasks[S.ti];
const sum = s => S.items.filter(i => i.side === s).reduce((a, i) => a + i.w, 0);
const onBoard = () => S.items.filter(i => i.side);
function pickHull(h) {
  S.hull = h; S.tasks = makeTasks(h.lim); S.phase = 'load'; S.bx = -760; S.idle = 0;
  G.sfx('ding'); G.sayNow('dz_' + h.id, task().say, 'dz_tap');
}
function drop(it, side) {
  it.side = side; S.sel = null; S.idle = 0;
  G.sfx(it.w >= 3 ? 'bump' : 'hop');
  G.sayNow('n_' + (S.remi && task().k === 'count' ? onBoard().length : sum(side)));
}
function update(dt) {
  if (S.end) return;
  S.t += dt; G.tick(dt); S.idle += dt;
  const L = sum('L'), R = sum('R'), tot = L + R;
  if (S.phase === 'pick') return;
  // tilt spring (wobbles), waterline sinks with the load
  const target = clamp((R - L) * .1, -.45, .45);
  S.tiltV += ((target - S.tilt) * 30 - S.tiltV * 3.5) * dt; S.tilt += S.tiltV * dt;
  S.sink += (tot * 6 - S.sink) * Math.min(1, dt * 5);
  S.bx += (0 - S.bx) * Math.min(1, dt * (S.anim && S.anim.k === 'go' ? 0 : 3));
  S.shake = Math.max(0, S.shake - dt);
  for (const f of S.fx) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.bub ? -60 : 600) * dt; f.life -= dt; } S.fx = S.fx.filter(f => f.life > 0);
  const A = S.anim; if (!A) return;
  A.t += dt;
  if (A.k === 'go') { S.bx += (120 + A.t * 600) * dt; if (Math.random() < dt * 30) splash(CX + S.bx - 200, DY, 1); if (A.t > 2.4) nextTask(); }
  else if (A.k === 'heavy') { S.xs = Math.sin(Math.PI * Math.min(1, A.t / 1.8)) * 85; if (Math.random() < dt * 20) S.fx.push({ x: CX + G.rnd(-150, 150), y: DY + 10, vx: 0, vy: -40, life: 1, bub: true }); if (A.t > 1.8) { S.xs = 0; S.anim = null; } }
  else if (A.t > 1.4) S.anim = null;
}
function splash(x, y, n) { for (let i = 0; i < 8 * n; i++) S.fx.push({ x: x + G.rnd(-20, 20), y, vx: G.rnd(-160, 160), vy: G.rnd(-380, -160), life: .9 }); }
function launch() {
  const L = sum('L'), R = sum('R'), tot = L + R, cnt = onBoard().length, k = task();
  if (!cnt) { G.sayNow('dz_tap'); return; }
  S.idle = 0;
  const fail = (kind, ...say) => { S.first = false; S.anim = { k: kind, t: 0 }; G.sayNow(...say); };
  if (tot > S.hull.lim) { fail('heavy', 'dz_heavy'); G.sfx('splash'); G.sfx('drum', .3); G.sfx('drum', .6); return; }
  if (k.k === 'count') {
    if (cnt !== k.n) { fail('shake', 'dz_count', ...onBoard().map((_, i) => 'n_' + (i + 1)), k.say); S.shake = .6; return; }
  } else {
    if (L !== R) { fail('tip', 'dz_tip'); S.tiltV += Math.sign(R - L) * 4; G.sfx('bonk'); return; }
    const want = k.k === 'side' ? k.n * 2 : k.k === 'total' ? k.n : null;
    if (want !== null && tot !== want) { fail('shake', tot < want ? 'dz_more' : 'dz_less'); S.shake = .6; return; }
    if (k.k === 'limit' && tot < S.hull.lim - 2) { fail('shake', 'dz_more'); S.shake = .6; return; }
    if (k.k === 'level' && cnt < 2) { fail('shake', 'dz_more'); S.shake = .6; return; }
  }
  // success
  if (k.k === 'count') G.skillMark('N:' + k.n, S.first);
  else { G.skillMark('G:balance maths', S.first); if (!S.remi && k.k !== 'side') G.skillMark('N:add', S.first); }
  S.anim = { k: 'go', t: 0 }; S.sel = null; G.jingle(); G.sfx('whoosh'); G.sfx('splash', .2); splash(CX + 230, DY, 2);
  G.sayNow('dz_go');
}
function nextTask() {
  S.anim = null; S.ti++; S.first = true; S.items.forEach(i => i.side = null); S.tilt = S.tiltV = 0;
  if (S.ti >= S.tasks.length) return finish();
  S.bx = -760; G.say(task().say);
}
function finish() {
  if (S.end) return; S.end = true; S.phase = 'done';
  G.say('dz_done');
  G.showCard('Boat designer! ⛵', S.hull.e + ' ⚖️ ✅✅✅', 'Balanced boats, off to sea!', '▶', () => G.stepDone(0));
}

/* ---------- input: tap a thing then a side, or drag it ---------- */
const trayHit = p => S.items.findIndex((it, i) => !it.side && inR(p, tray(i)));
function deckHit(p) { let best = null, bd = 50; for (const it of onBoard()) { const d = Math.hypot(p.x - it.sx, p.y - it.sy); if (d < bd) { bd = d; best = it; } } return best; }
const busy = () => S.end || !!S.anim || S.bx < -40;
function tap(p) {
  if (S.phase === 'pick') { const i = [0, 1, 2].find(i => inR(p, [16 + i * 228, 220, 216, 330])); if (i !== undefined) pickHull(HULLS[i]); return; }
  if (S.phase !== 'load' || busy()) return;
  if (inR(p, LAUNCH)) return launch();
  const ti = trayHit(p);
  if (ti >= 0) { const it = S.items[ti]; S.sel = S.sel === it ? null : it; G.sfx('star'); S.idle = 0; return; }
  const d = deckHit(p);
  if (d && !S.sel) { d.side = null; G.sfx('hop'); S.idle = 0; return; }
  if (S.sel) for (const s of ['L', 'R']) if (inR(p, ZONES[s])) return drop(S.sel, s);
}
function pdown(p) { if (S.phase !== 'load' || busy()) return; const ti = trayHit(p); if (ti >= 0) S.drag = { it: S.items[ti], x: p.x, y: p.y, moved: false, x0: p.x, y0: p.y }; }
function pmove(p) { const d = S.drag; if (!d) return; d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.x0, p.y - d.y0) > 25) d.moved = true; }
function pup(p) { const d = S.drag; S.drag = null; if (!d || !d.moved) return; for (const s of ['L', 'R']) if (inR(p, ZONES[s])) return drop(d.it, s); }
function repeat() { if (S.phase === 'pick') G.sayNow('dz_intro'); else if (task()) G.sayNow(task().say); }

/* ---------- drawing ---------- */
function dots(x, y, n, r = 7) { for (let i = 0; i < n; i++) circle(x + (i - (n - 1) / 2) * (r * 2 + 5), y, r, '#1b3b52'); }
function deckY(id, x) { if (id !== 'banana') return -60; const t = (x + 220) / 450; return (1 - t) * (1 - t) * -50 + 2 * t * (1 - t) * 20 + t * t * -70 - 36; }
function drawHull(h, lim) {
  const id = h.id;
  if (id === 'banana') {
    g.lineCap = 'round'; g.strokeStyle = '#c99a00'; g.lineWidth = 78; g.beginPath(); g.moveTo(-220, -50); g.quadraticCurveTo(0, 20, 230, -70); g.stroke();
    g.strokeStyle = '#ffd23f'; g.lineWidth = 70; g.stroke(); g.strokeStyle = '#fff3a0'; g.lineWidth = 12; g.beginPath(); g.moveTo(-180, -62); g.quadraticCurveTo(0, 0, 190, -86); g.stroke();
    circle(-252, -48, 12, '#6b4a1a'); circle(262, -74, 12, '#6b4a1a');
  } else {
    const pts = id === 'cat' ? [[-230, -60], [-226, 15], [-216, 36, -180, 36], [170, 36], [228, 34, 240, -66]] : [[-220, -60], [-215, 20], [-200, 40, -150, 40], [150, 40], [220, 35, 240, -75]];
    const path = () => { g.beginPath(); g.moveTo(...pts[0]); for (const q of pts.slice(1)) q.length === 4 ? g.quadraticCurveTo(...q) : g.lineTo(...q); g.quadraticCurveTo(0, -58, pts[0][0], pts[0][1]); g.closePath(); };
    if (id === 'cat') { g.save(); g.translate(-26, -14); path(); g.fillStyle = '#d7e3e8'; g.fill(); g.restore(); line(0, -60, 0, -250, '#666', 6); rr(-8, -240, 16, 170, 8, '#f2f2f2', '#9aa3a8', 2); }
    path(); g.fillStyle = '#ffffff'; g.fill(); g.save(); path(); g.clip(); g.fillStyle = h.col; g.fillRect(-300, -44, 600, 12); g.fillStyle = '#1b3b52'; g.fillRect(-300, 0, 600, 60); g.restore();
    path(); g.strokeStyle = '#1b3b52'; g.lineWidth = 4; g.stroke();
    if (id === 'dinghy') { rr(-264, -96, 42, 56, 10, '#15181b'); rr(-250, -44, 14, 56, 4, '#15181b'); }
  }
  // red load line: if the water goes over it, the boat is too heavy
  g.setLineDash([16, 10]); const ly = -lim * 6 - 3; line(-190, ly, 190, ly, '#e53935', 5); g.setLineDash([]); circle(0, ly, 12, '#e53935'); circle(0, ly, 6, '#fff');
}
function line(x1, y1, x2, y2, col, lw) { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function cargo(it, x, y, s = 1) { txt(it.e, x, y, 50 * s, '#000'); dots(x, y + 38 * s, it.w, 6 * s); }
function sky() {
  const sk = g.createLinearGradient(0, T, 0, DY); sk.addColorStop(0, '#7cc6ec'); sk.addColorStop(1, '#e6f6fb'); g.fillStyle = sk; g.fillRect(0, 0, W, H);
  circle(620, 120, 30, '#fff3b0');
}
function sea() {
  const s = g.createLinearGradient(0, DY, 0, 640); s.addColorStop(0, '#3a9cc2dd'); s.addColorStop(1, '#1d5f86');
  g.fillStyle = s; g.beginPath(); g.moveTo(0, 640); for (let x = 0; x <= W; x += 16) g.lineTo(x, DY + Math.sin(x * .03 + S.t * 2) * 4); g.lineTo(W, 640); g.fill();
}
function drawPick() {
  sky(); sea();
  HULLS.forEach((h, i) => {
    const x = 16 + i * 228, pulse = Math.sin(S.t * 3 + i) * 4;
    rr(x, 220 + pulse, 216, 330, 24, '#fffdf5', h.col, 6);
    g.save(); g.translate(x + 108, 400 + pulse); g.scale(.4, .4); drawHull(h, h.lim); g.restore();
    txt(h.e, x + 108, 290 + pulse, 64, '#000');
    for (let k = 0; k < h.lim; k++) circle(x + 108 + (k - (h.lim - 1) / 2) * 22, 490 + pulse, 8, '#1b3b52');
  });
  g.fillStyle = '#8a5a32'; g.fillRect(0, 630, W, H - 630); rr(0, 624, W, 12, 4, '#a8754a');
  G.hudBar('⛵ 👆', '');
}
function draw() {
  if (S.phase === 'pick') return drawPick();
  const L = sum('L'), R = sum('R'), k = task() || {}, active = S.sel || (S.drag && S.drag.moved);
  sky();
  // drop zones
  for (const s of ['L', 'R']) { const z = ZONES[s], a = active ? .35 + Math.sin(S.t * 6) * .12 : .14; g.globalAlpha = a; rr(...z, 22, s === 'L' ? '#2f7fd8' : '#ff7a1a'); g.globalAlpha = 1; txt(s === 'L' ? '⬅️' : '➡️', z[0] + z[2] / 2, z[1] + 34, 34, '#000'); }
  // totals
  const lvl = L === R && L > 0;
  rr(CX - 250, 120, 500, 70, 22, '#ffffffdd', lvl ? '#2e9d43' : '#1b3b52', 4);
  txt(String(L), CX - 150, 157, 52, lvl ? '#2e9d43' : L > R ? '#e8701a' : '#1b3b52'); txt(String(R), CX + 150, 157, 52, lvl ? '#2e9d43' : R > L ? '#e8701a' : '#1b3b52');
  txt('⚖️', CX, 155, 48, '#000');
  // the boat
  const sx = CX + S.bx + (S.shake > 0 ? Math.sin(S.t * 60) * 6 : 0), sy = DY + S.sink + S.xs + Math.sin(S.t * 1.6) * 3;
  g.save(); g.translate(sx, sy); g.rotate(S.tilt); drawHull(S.hull, S.hull.lim);
  for (const s of ['L', 'R']) S.items.filter(i => i.side === s).forEach((it, j) => {
    const x = (s === 'L' ? -1 : 1) * (52 + (j % 3) * 64), y = deckY(S.hull.id, x) - 46 - Math.floor(j / 3) * 78;
    cargo(it, x, y, .9); const c = Math.cos(S.tilt), n = Math.sin(S.tilt); it.sx = sx + x * c - y * n; it.sy = sy + x * n + y * c;
  });
  g.restore();
  sea();
  for (const f of S.fx) { g.globalAlpha = clamp(f.life, 0, 1); if (f.bub) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(f.x, f.y, 6, 0, Math.PI * 2); g.stroke(); } else circle(f.x, f.y, 7, '#fff'); g.globalAlpha = 1; }
  if (S.anim && S.anim.k === 'heavy') txt('💦', CX, 300, 50, '#000');
  // launch button
  const lb = LAUNCH, ready = onBoard().length > 0 && !S.anim;
  rr(lb[0], lb[1] + 6, lb[2], lb[3], 22, '#a84a00'); rr(lb[0], lb[1], lb[2], lb[3], 22, ready ? '#ff7a1a' : '#f2b27a', '#fff', 4);
  txt('⛵ 🚀', lb[0] + lb[2] / 2, lb[1] + lb[3] / 2 + 2, 42, '#000');
  // tray
  g.fillStyle = '#8a5a32'; g.fillRect(0, 630, W, H - 630); rr(0, 624, W, 12, 4, '#a8754a');
  S.items.forEach((it, i) => {
    const r = tray(i);
    if (it.side) { g.setLineDash([8, 6]); rr(...r, 18, null, '#ffffff66', 3); g.setLineDash([]); return; }
    if (S.drag && S.drag.it === it && S.drag.moved) return;
    const up = S.sel === it ? -14 : 0;
    rr(r[0], r[1] + up, r[2], r[3], 18, S.sel === it ? '#ffe14d' : '#fffdf5', S.sel === it ? '#e8701a' : '#5e3b19', S.sel === it ? 6 : 3);
    cargo(it, r[0] + r[2] / 2, r[1] + 58 + up, 1.1);
  });
  if (S.drag && S.drag.moved) cargo(S.drag.it, S.drag.x, S.drag.y, 1.2);
  // task, as icons
  G.hudBar(taskIcons(k), S.hull.e + ' ' + (S.ti + 1) + '/3');
  if (S.idle > 12 && !S.anim) {
    const b = Math.sin(S.t * 6) * 8;
    if (!onBoard().length || S.remi && k.k === 'count') { const i = S.items.findIndex(it => !it.side); if (i >= 0) txt('👇', tray(i)[0] + 52, 616 + b, 44, '#000'); }
    else if (L !== R) { const z = ZONES[L < R ? 'L' : 'R']; txt('👇', z[0] + z[2] / 2, z[1] + 90 + b, 50, '#000'); }
    else txt('👉', LAUNCH[0] - 40 + b, LAUNCH[1] + 40, 44, '#000');
  }
}
function taskIcons(k) {
  if (k.k === 'count') { const c = Math.min(onBoard().length, k.n); return '👆 ' + '🟠'.repeat(c) + '⚪'.repeat(k.n - c) + ' ⛵'; }
  if (k.k === 'level') return '⬅️ ⚖️ ➡️';
  if (k.k === 'side') return k.n + ' ⚖️ ' + k.n;
  if (k.k === 'total') return '🎯 ' + k.n + '  ⚖️';
  if (k.k === 'limit') return '🔴 ' + S.hull.lim + '  ⚖️';
  return '⛵';
}
G.modes.design = { start, update, draw, tap, pdown, pmove, pup, repeat, debug: () => S };
})();
