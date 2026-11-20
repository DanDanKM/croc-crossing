'use strict';
/* Car mission bonus: top-down city drive. Visit the houses with the right letters, in order, to spell a word. */
(() => {
const { W, H, T, g, rr, txt, circle, rnd, ri, pick, clamp, shuffle, LET } = G;
const CT = 128, CN = 25;
let B = null;
const isRoad = (x, y) => x % 4 === 0 || y % 4 === 0;

function start(run) {
  const word = pick(run.stop.spell);
  const grid = [];
  for (let y = 0; y < CN; y++) { grid.push([]); for (let x = 0; x < CN; x++) grid[y].push(x === 0 ? 2 : isRoad(x, y) ? 1 : 0); }
  const blocks = []; for (let by = 0; by < 6; by++) for (let bx = 0; bx < 6; bx++) blocks.push([bx, by]);
  const need = [...new Set(word.split(''))], letters = shuffle([...need, ...shuffle(LET.filter(L => !need.includes(L))).slice(0, 26 - need.length)]);
  const houses = [];
  shuffle(blocks).forEach((b, i) => {
    const tx = b[0] * 4 + 2, ty = b[1] * 4 + 2;
    if (i < letters.length) { grid[ty][tx] = 3; houses.push({ tx, ty, L: letters[i], roof: pick(['#e94b3c', '#2f7fd8', '#a66bff', '#ff7a1a', '#3fa34d', '#d4a017']) }); }
    else grid[ty][tx] = 4;
  });
  const stars = [];
  for (let i = 0; i < 26; i++) { let x, y; do { x = ri(1, CN - 1); y = ri(0, CN - 1); } while (!isRoad(x, y)); stars.push({ x: x * CT + CT / 2, y: y * CT + CT / 2, got: false }); }
  const crocs = [];
  for (let i = 0; i < 3 + Math.min(3, Math.floor(run.idx / 2)); i++) { const tx = ri(1, 6) * 4, ty = ri(0, 6) * 4; crocs.push({ x: tx * CT + CT / 2, y: ty * CT + CT / 2, nx: tx, ny: ty, tx, ty, dir: ri(0, 3), v: 55 + run.idx * 4, cool: 0, open: 0 }); }
  B = { run, word, idx: 0, grid, houses, stars, crocs, car: { x: 12 * CT + CT / 2, y: 12 * CT + CT / 2, a: -Math.PI / 2, v: 0 }, time: 80 + word.length * 25, total: 80 + word.length * 25, seek: 0, got: 0, parts: [], said: {}, t: 0, end: false };
  G.setPad('arrows');
  G.sayNow('bonus_car', 'c_intro', 'spell_' + word, 'l_' + word[0]);
}
const target = () => B.word[B.idx];
function solidAt(x, y) {
  const tx = Math.floor(x / CT), ty = Math.floor(y / CT);
  if (tx < 0 || ty < 0 || tx >= CN || ty >= CN) return true;
  const v = B.grid[ty][tx]; if (v === 2 || v === 4) return true;
  if (v === 3) { const cx = tx * CT + CT / 2, cy = ty * CT + CT / 2; return Math.abs(x - cx) < CT * .42 && Math.abs(y - cy) < CT * .42; }
  return false;
}
function update(dt) {
  if (B.end) return;
  B.t += dt; B.time -= dt; B.seek += dt; G.tick(dt);
  const c = B.car, onRoad = B.grid[Math.floor(c.y / CT)]?.[Math.floor(c.x / CT)] === 1, max = onRoad ? 360 : 180, k = G.keys;
  if (k.up) c.v += 420 * dt; else if (k.down) c.v -= (c.v > 0 ? 600 : 260) * dt; else c.v *= (1 - 1.6 * dt);
  c.v = clamp(c.v, -160, 360); if (c.v > max) c.v -= 600 * dt;
  c.a += ((k.left ? -1 : 0) + (k.right ? 1 : 0)) * 2.8 * dt * clamp(c.v / 140, -1, 1);
  const nx = c.x + Math.cos(c.a) * c.v * dt, ny = c.y + Math.sin(c.a) * c.v * dt, r = 18;
  if ([[r, r], [-r, r], [r, -r], [-r, -r], [0, 0]].some(([ox, oy]) => solidAt(nx + ox, ny + oy))) { if (Math.abs(c.v) > 60) G.sfx('bump'); c.v *= -.35; }
  else { c.x = nx; c.y = ny; }
  for (const s of B.stars) if (!s.got && Math.hypot(s.x - c.x, s.y - c.y) < 40) { s.got = true; B.got++; G.sfx('star'); }
  for (const kk of B.crocs) {
    const tx = kk.nx * CT + CT / 2, ty = kk.ny * CT + CT / 2, dx = tx - kk.x, dy = ty - kk.y, d = Math.hypot(dx, dy);
    if (d < 2) {
      kk.x = tx; kk.y = ty; kk.tx = kk.nx; kk.ty = kk.ny;
      const opts = [[1, 0], [0, 1], [-1, 0], [0, -1]].map((v, i) => ({ v, i })).filter(o => { const ax = kk.tx + o.v[0], ay = kk.ty + o.v[1]; return ax >= 1 && ay >= 0 && ax < CN && ay < CN && B.grid[ay][ax] === 1 && o.i !== (kk.dir + 2) % 4; });
      const o = opts.length ? pick(opts) : { v: [[1, 0], [0, 1], [-1, 0], [0, -1]][(kk.dir + 2) % 4], i: (kk.dir + 2) % 4 };
      kk.dir = o.i; kk.nx = kk.tx + o.v[0]; kk.ny = kk.ty + o.v[1];
    } else { const st = Math.min(d, kk.v * dt); kk.x += dx / d * st; kk.y += dy / d * st; }
    kk.cool -= dt; kk.open += ((Math.hypot(kk.x - c.x, kk.y - c.y) < 160 ? 1 : 0) - kk.open) * Math.min(1, dt * 8);
    if (kk.cool <= 0 && Math.hypot(kk.x - c.x, kk.y - c.y) < 56) {
      kk.cool = 1.5; c.v = -Math.sign(c.v || 1) * 140; B.time -= 3; G.sfx('chomp');
      B.parts.push({ x: c.x, y: c.y - 30, txt: 'CHOMP! -3s', life: 1.2 });
      if (!B.said.croc) { B.said.croc = 1; G.say('c_crocroad'); }
    }
  }
  const h = B.houses.find(h => h.L === target());
  if (h && Math.hypot(h.tx * CT + CT / 2 - c.x, h.ty * CT + CT / 2 - c.y) < CT * 1.15) {
    G.sfx('ding'); B.parts.push({ x: c.x, y: c.y - 40, txt: target() + ' ✓', life: 1.4 });
    G.sayNow('l_' + target()); B.idx++; B.seek = 0;
    if (B.idx >= B.word.length) return finish(true);
    G.say('c_delivered', 'l_' + target());
  }
  for (const p of B.parts) { p.y -= 40 * dt; p.life -= dt; } B.parts = B.parts.filter(p => p.life > 0);
  if (B.time <= 0) finish(false);
}
function finish(win) {
  B.end = true;
  if (win) { G.jingle(); G.say('done_' + B.word, 'c_done'); } else G.say('c_timeup');
  G.showCard(win ? 'Mission complete! 🏆' : "Time's up!", (win ? '⭐⭐⭐' : '⭐') + '  ✨' + B.got, win ? 'You spelled ' + B.word + '!' : 'Good try!', 'Next ▶', () => G.stepDone(0));
}
function draw() {
  const c = B.car, camX = clamp(c.x - W / 2, 0, CN * CT - W), camY = clamp(c.y - H / 2, 0, CN * CT - H);
  g.save(); g.translate(-camX, -camY);
  const x0 = Math.floor(camX / CT), y0 = Math.floor(camY / CT);
  for (let ty = y0; ty <= y0 + Math.ceil(H / CT); ty++) for (let tx = x0; tx <= x0 + Math.ceil(W / CT); tx++) {
    if (ty >= CN || tx >= CN) continue;
    const v = B.grid[ty][tx], X = tx * CT, Y = ty * CT;
    if (v === 2) { g.fillStyle = '#2b78b8'; g.fillRect(X, Y, CT, CT); if (ty % 4 === 2) { g.fillStyle = '#9b6a3a'; g.fillRect(X + 60, Y + 50, CT - 60, 26); g.save(); g.translate(X + 30, Y + 64); g.rotate(Math.PI / 2); g.translate(-40, -32); G.drawBoat({ x: 0, len: 1.3, label: ty % 8 === 2 ? 'PEGASUS V' : 'DORY' }, 0, 1); g.restore(); } continue; }
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
    if (v === 0 && (tx * 5 + ty * 3) % 4 === 1) rr(X + 70, Y + 70, 40, 30, 6, '#f4e3c3', '#0002');
    if (v === 4) { g.beginPath(); g.ellipse(X + CT / 2, Y + CT / 2, 50, 36, 0, 0, Math.PI * 2); g.fillStyle = '#2b78b8'; g.fill(); txt('🦆', X + CT / 2, Y + CT / 2, 28, '#fff'); }
  }
  for (const h of B.houses) {
    const X = h.tx * CT, Y = h.ty * CT, tg = h.L === target();
    rr(X + 10, Y + 10, CT - 20, CT - 20, 10, h.roof, '#0004');
    circle(X + CT / 2, Y + CT / 2, 34, '#fffdf5'); txt(h.L, X + CT / 2, Y + CT / 2 + 3, 46, '#1d2a24');
    if (tg && B.seek > 8) { g.strokeStyle = '#ffe14d'; g.lineWidth = 6; g.beginPath(); g.arc(X + CT / 2, Y + CT / 2, 44 + Math.sin(B.t * 6) * 4, 0, Math.PI * 2); g.stroke(); }
  }
  for (const s of B.stars) if (!s.got) txt('⭐', s.x, s.y + Math.sin(B.t * 4 + s.x) * 3, 26, '#fff');
  for (const k of B.crocs) { g.save(); g.translate(k.x, k.y); g.rotate([0, Math.PI / 2, Math.PI, -Math.PI / 2][k.dir]); G.drawCroc(-T * 1.25, -T / 2, 2.5, true, k.open * .9, 1); g.restore(); }
  g.save(); g.translate(c.x, c.y); g.rotate(c.a);
  for (const [wx, wy] of [[-20, -17], [12, -17], [-20, 11], [12, 11]]) rr(wx, wy, 14, 7, 3, '#222');
  rr(-28, -15, 56, 30, 10, G.COLORS[G.player], '#0005'); rr(2, -11, 14, 22, 4, '#bfe9ff'); rr(-20, -11, 10, 22, 3, '#bfe9ff');
  txt(G.player[0], -4, 1, 14, '#fff');
  g.restore();
  for (const p of B.parts) { g.globalAlpha = clamp(p.life, 0, 1); txt(p.txt, p.x, p.y, 30, '#fff'); g.globalAlpha = 1; }
  const h = B.houses.find(h => h.L === target());
  if (h && B.seek > 8) {
    const hx = h.tx * CT + CT / 2, hy = h.ty * CT + CT / 2, a = Math.atan2(hy - c.y, hx - c.x);
    if (Math.hypot(hx - c.x, hy - c.y) > 200) { g.save(); g.translate(c.x + Math.cos(a) * 70, c.y + Math.sin(a) * 70); g.rotate(a); g.beginPath(); g.moveTo(22, 0); g.lineTo(-10, -14); g.lineTo(-4, 0); g.lineTo(-10, 14); g.closePath(); g.fillStyle = '#ffe14d'; g.fill(); g.strokeStyle = '#0006'; g.lineWidth = 2; g.stroke(); g.restore(); }
  }
  g.restore();
  g.fillStyle = '#123b2ccc'; g.fillRect(0, 0, W, T);
  txt(G.buddyEmoji(), 34, T / 2, 32, '#000');
  const bw = 40, wx0 = W / 2 - (B.word.length * bw) / 2 + 20;
  txt('🚗', wx0 - 36, T / 2, 30, '#fff');
  for (let i = 0; i < B.word.length; i++) { const bx = wx0 + i * bw; rr(bx, 10, bw - 6, T - 20, 8, i < B.idx ? '#3fa34d' : i === B.idx ? '#ffe14d' : '#ffffff22'); txt(B.word[i], bx + (bw - 6) / 2, T / 2 + 2, 26, i === B.idx ? '#1d2a24' : '#fff'); }
  txt(Math.ceil(Math.max(0, B.time)) + 's ✨' + B.got, W - 70, T / 2, 20, '#fff', 'right', 700);
  txt('🔊', W - 36, T / 2, 30, '#fff');
  const frac = clamp(B.time / B.total, 0, 1);
  rr(10, H - 22, W - 20, 12, 6, '#0006'); rr(10, H - 22, (W - 20) * frac, 12, 6, frac < .25 ? '#e94b3c' : '#ffe14d');
}
G.modes.car = { start, update, draw, repeat() { G.sayNow('spell_' + B.word, 'l_' + target()); }, debug: () => B };
})();
