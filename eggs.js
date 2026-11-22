'use strict';
/* Chook eggs at home with Mum: the five red chooks lay eggs, tap them into the basket and count out loud.
   Mr Spangles (the black rooster) crows when tapped, Pickles the dog wanders about. Ends with "how many eggs?" */
(() => {
const { W, H, T, g, rr, txt, fitTxt, circle, rnd, pick, shuffle, clamp } = G;
const BOX_Y = 330, BASKET = [W / 2, 700];
let S = null;
function start() {
  const remi = G.isRemi();
  S = { remi, t: 0, goal: remi ? 5 : 8, got: 0, eggs: [], hens: [0, 1, 2, 3, 4].map(i => ({ x: 90 + i * 131, lay: rnd(1, 3), bob: rnd(0, 6) })),
        spangles: { x: 120, dir: 1, crow: 0 }, pickles: { x: 560, dir: -1 }, phase: 'collect', answers: null, fly: [], end: false };
  G.setPad('none');
  G.sayNow('eg_intro');
}
function update(dt) {
  if (S.end) return;
  S.t += dt; G.tick(dt);
  if (S.phase === 'collect') for (const h of S.hens) {
    h.lay -= dt * (S.remi ? .8 : 1.1);
    if (h.lay <= 0 && S.eggs.length < 3 && S.got + S.eggs.length < S.goal) { h.lay = rnd(2, 4.5); S.eggs.push({ x: h.x + rnd(-14, 14), y: BOX_Y + 40, t: 0, gold: Math.random() < .08 }); G.sfx('honk'); }
  }
  for (const e of S.eggs) e.t += dt;
  for (const f of S.fly) f.k = Math.min(1, f.k + dt * 2.5); S.fly = S.fly.filter(f => f.k < 1);
  const sp = S.spangles; sp.x += sp.dir * 40 * dt; if (sp.x < 60 || sp.x > W - 60) sp.dir *= -1; sp.crow = Math.max(0, sp.crow - dt);
  const pk = S.pickles; pk.x += pk.dir * 55 * dt; if (pk.x < 60 || pk.x > W - 60) pk.dir *= -1;
  if (S.phase === 'collect' && S.got >= S.goal && !S.fly.length) ask();
}
function ask() {
  S.phase = 'count';
  const n = S.got, opts = shuffle([n, ...shuffle([n - 2, n - 1, n + 1, n + 2].filter(m => m > 0)).slice(0, S.remi ? 2 : 3)]);
  S.answers = opts.map((m, i) => ({ m, x: W / 2 + (i - (opts.length - 1) / 2) * 150, y: 560 }));
  G.sayNow('eg_count'); S.tries = 0;
}
function tap(p) {
  if (S.end) return;
  if (Math.abs(p.x - S.spangles.x) < 45 && Math.abs(p.y - 520) < 50) { S.spangles.crow = 1.2; G.sayNow('eg_spangles'); return; }
  if (Math.abs(p.x - S.pickles.x) < 45 && Math.abs(p.y - 600) < 40) { G.sfx('bonk'); G.sayNow('bd_pickles'); return; }
  if (S.phase === 'collect') {
    const e = S.eggs.find(e => Math.hypot(p.x - e.x, p.y - e.y) < 50);
    if (!e) return;
    S.eggs.splice(S.eggs.indexOf(e), 1); S.got++; S.fly.push({ x: e.x, y: e.y, k: 0, gold: e.gold });
    G.sfx(e.gold ? 'star' : 'ding'); G.sayNow('n_' + S.got); if (e.gold) G.earn(1);
    return;
  }
  if (S.phase === 'count') {
    const a = S.answers.find(a => Math.hypot(p.x - a.x, p.y - a.y) < 60); if (!a) return;
    if (a.m === S.got) { G.skillMark('N:count ' + S.got, S.tries === 0); G.jingle(); G.sayNow('n_' + S.got, 'eg_done'); S.end = true;
      setTimeout(() => G.showCard('🥚🐔', '🧺 ' + '🥚'.repeat(S.got), '', '▶', () => G.stepDone(0)), 1600); }
    else { S.tries++; G.sfx('bonk'); G.sayNow('wrong2', 'eg_count'); }
  }
}
function drawHen(x, y, black, crow) {
  g.save(); g.translate(x, y);
  g.fillStyle = black ? '#1d1d24' : '#a5432a'; g.beginPath(); g.ellipse(0, 0, 34, 26, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(-26, -14, 10, 18, -.6, 0, Math.PI * 2); g.fill();
  circle(24, -20, 15, black ? '#2a2a35' : '#b8502f'); circle(28, -24, 3, '#000');
  g.fillStyle = '#e53935'; g.beginPath(); g.arc(22, -34, 7, Math.PI, 0); g.fill(); g.beginPath(); g.arc(30, -32, 5, Math.PI, 0); g.fill();
  g.fillStyle = '#f9a825'; g.beginPath(); g.moveTo(38, -22); g.lineTo(48 + (crow ? 6 : 0), -20); g.lineTo(38, -16); g.fill();
  if (black) { g.strokeStyle = '#3a5f3a'; g.lineWidth = 6; g.beginPath(); g.arc(-30, -14, 18, Math.PI * .6, Math.PI * 1.5); g.stroke(); }
  g.restore();
}
function draw() {
  const se = G.season();
  g.fillStyle = se.sky; g.fillRect(0, 0, W, 260);
  g.fillStyle = '#7fbf5f'; g.fillRect(0, 260, W, H - 260);
  // coop with nesting boxes
  rr(30, 200, W - 60, 220, 14, '#c9894a'); g.fillStyle = '#8a5a2a'; g.beginPath(); g.moveTo(10, 210); g.lineTo(W / 2, 120); g.lineTo(W - 10, 210); g.fill();
  for (const h of S.hens) { rr(h.x - 56, BOX_Y - 50, 112, 100, 10, '#f1d38a', '#8a5a2a', 3); drawHen(h.x, BOX_Y - 6 + Math.sin(S.t * 3 + h.bob) * 2, false); }
  for (const e of S.eggs) { const s = Math.min(1, e.t * 4); g.save(); g.translate(e.x, e.y); g.scale(s, s); g.fillStyle = e.gold ? '#ffd23f' : '#f6e7d0'; g.beginPath(); g.ellipse(0, 0, 18, 24, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#c9a77a'; g.lineWidth = 2; g.stroke(); g.restore(); if (e.t > .3 && Math.floor(e.t * 3) % 2) txt('✨', e.x + 20, e.y - 24, 16, '#000'); }
  drawHen(S.spangles.x, 520, true, S.spangles.crow > 0); if (S.spangles.crow > 0) txt('🎶', S.spangles.x + 40, 470, 30, '#000');
  g.save(); g.translate(S.pickles.x, 600); if (S.pickles.dir < 0) g.scale(-1, 1); txt('🐕', 0, 0, 56, '#000'); g.restore();
  // basket
  rr(BASKET[0] - 90, BASKET[1] - 30, 180, 70, 22, '#b07a3a', '#6b4720', 4);
  for (let i = 0; i < Math.min(S.got, 12); i++) { g.fillStyle = '#f6e7d0'; g.beginPath(); g.ellipse(BASKET[0] - 70 + (i % 6) * 28, BASKET[1] - 28 - Math.floor(i / 6) * 16, 12, 15, 0, 0, Math.PI * 2); g.fill(); }
  for (const f of S.fly) { const x = f.x + (BASKET[0] - f.x) * f.k, y = f.y + (BASKET[1] - 40 - f.y) * f.k - Math.sin(f.k * Math.PI) * 120; g.fillStyle = f.gold ? '#ffd23f' : '#f6e7d0'; g.beginPath(); g.ellipse(x, y, 16, 21, 0, 0, Math.PI * 2); g.fill(); }
  txt('👩', 640, 690, 60, '#000');
  if (S.phase === 'count' && S.answers) for (const a of S.answers) { circle(a.x, a.y, 56, '#fff8ec'); txt(String(a.m), a.x, a.y + 3, 54, '#1d2a24'); }
  G.hudBar('🥚 ' + S.got + ' / ' + S.goal, '');
}
G.modes.eggs = { start, update, draw, tap, debug: () => S, music: 'map', repeat() { G.sayNow(S.phase === 'count' ? 'eg_count' : 'eg_intro'); } };
})();
