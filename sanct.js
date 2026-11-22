'use strict';
/* Animal sanctuary: every animal you've met lives here. Tap them to hear about them.
   Spend shells on waterlilies, trees, nests and more, then tap a spot to place them. */
(() => {
const { W, H, T, g, rr, txt, fitTxt, circle, rnd, pick, clamp, C } = G;
const SHOP_Y = H - 132, POND = [215, 430, 160, 80], SEA_X = 500;
let S = null;
const zoneOf = a => ({ river: 'pond', sea: 'sea', sky: 'sky', plant: 'plant' })[a.home] || 'land';
function randIn(z, cy) {
  if (z === 'pond') { const t = rnd(0, 6.28), r = Math.sqrt(Math.random()) * .75; return [POND[0] + Math.cos(t) * POND[2] * r, POND[1] + Math.sin(t) * POND[3] * r]; }
  if (z === 'sea') return [rnd(SEA_X + 40, W - 30), rnd(330, SHOP_Y - 30)];
  if (z === 'sky') return [rnd(30, W - 30), rnd(T + 40, 190)];
  return (cy ? cy < 440 : Math.random() < .5) ? [rnd(30, SEA_X - 40), rnd(250, 330)] : [rnd(30, SEA_X - 40), rnd(545, SHOP_Y - 30)];
}
function start() {
  const P = G.prog, have = G.allAnimals().filter(a => P.stickers[a.id]);
  const seen = new Set();
  S = { t: 0, placing: null, critters: [], wig: {} };
  for (const a of have) { if (seen.has(a.id)) continue; seen.add(a.id); const z = zoneOf(a), [x, y] = randIn(z); S.critters.push({ a, z, x, y, tx: x, ty: y, wait: rnd(0, 3), jump: 0, dir: 1 }); }
  G.setPad('none');
  G.sayNow('sa_intro');
}
function update(dt) {
  S.t += dt;
  for (const c of S.critters) {
    c.jump = Math.max(0, c.jump - dt);
    if (c.z === 'plant') continue;
    const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
    if (d < 4) { c.wait -= dt; if (c.wait <= 0) { [c.tx, c.ty] = randIn(c.z, c.y); c.wait = rnd(1.5, 5); } }
    else { const v = (c.z === 'sky' ? 70 : 32) * dt; c.x += dx / d * v; c.y += dy / d * v; c.dir = dx > 0 ? 1 : -1; }
  }
}
function tap(p) {
  if (p.y >= SHOP_Y) { // shop
    const i = Math.floor((p.x - 8) / 98) + (p.y > SHOP_Y + 66 ? 7 : 0), it = C.shop[i];
    if (!it || p.x < 8) return;
    if ((G.prog.shells || 0) < it[3]) { S.placing = null; G.sayNow('sa_need'); G.sfx('bump'); return; }
    S.placing = it; G.sayNow('shop_' + it[0], 'sa_buy'); G.sfx('hop'); return;
  }
  if (p.y < T) return;
  if (S.placing) {
    const it = S.placing; G.prog.shells -= it[3]; G.prog.decor.push({ id: it[0], x: Math.round(p.x), y: Math.round(p.y) }); G.saveProg();
    S.placing = null; G.sfx('star'); G.sayNow('sa_placed'); return;
  }
  let best = null, bd = 50;
  for (const c of S.critters) { const d = Math.hypot(p.x - c.x, p.y - c.y); if (d < bd) { bd = d; best = c; } }
  if (best) { best.jump = .5; G.sfx('hop'); const iw = C.indo.animals[best.a.id]; G.sayNow('nm_' + best.a.id, 'fact_' + best.a.id, iw ? ['idc_' + best.a.id, 'idw_' + G.slug(iw)] : []); return; }
  const dec = G.prog.decor.find(d => Math.hypot(p.x - d.x, p.y - d.y) < 30);
  if (dec) { S.wig[G.prog.decor.indexOf(dec)] = .5; G.sayNow('shop_' + dec.id); }
}
function draw() {
  const se = G.season();
  const sky = g.createLinearGradient(0, T, 0, 240); sky.addColorStop(0, se.sky); sky.addColorStop(1, '#eaf7ff');
  g.fillStyle = sky; g.fillRect(0, 0, W, 240);
  circle(620, 120, 30, '#fff3b0');
  g.fillStyle = se.id === 'hot' || se.id === 'knock' ? '#b9b25a' : '#7fbf5f'; g.fillRect(0, 220, W, SHOP_Y - 220);
  // sea and beach on the right
  g.fillStyle = '#f1e2b0'; g.beginPath(); g.moveTo(SEA_X - 30, 220); g.quadraticCurveTo(SEA_X - 60, 480, SEA_X - 20, SHOP_Y); g.lineTo(W, SHOP_Y); g.lineTo(W, 220); g.fill();
  g.fillStyle = '#2fa3c9'; g.beginPath(); g.moveTo(SEA_X + 20, 220); g.quadraticCurveTo(SEA_X - 10, 480, SEA_X + 30, SHOP_Y); g.lineTo(W, SHOP_Y); g.lineTo(W, 220); g.fill();
  for (let i = 0; i < 8; i++) { g.strokeStyle = '#ffffff55'; g.lineWidth = 2; const x = SEA_X + 60 + (i * 53) % 150, y = 260 + (i * 71 + S.t * 10) % 420; g.beginPath(); g.arc(x, y, 9, .2, Math.PI - .2); g.stroke(); }
  // billabong
  g.fillStyle = '#3a8fa0'; g.beginPath(); g.ellipse(POND[0], POND[1], POND[2], POND[3], 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#2f6b33'; g.lineWidth = 6; g.stroke();
  // everything with a y position, drawn back to front
  const items = [...G.prog.decor.map((d, i) => ({ y: d.y, d, i })), ...S.critters.map(c => ({ y: c.y, c }))].sort((a, b) => a.y - b.y);
  for (const it of items) {
    if (it.d) { const e = (C.shop.find(s => s[0] === it.d.id) || [])[1] || '❔', w = S.wig[it.i] || 0; if (w) S.wig[it.i] = Math.max(0, w - 1 / 60); txt(e, it.d.x, it.d.y + Math.sin(w * 30) * 4, 44, '#000'); continue; }
    const c = it.c, by = c.jump ? -Math.sin(c.jump / .5 * Math.PI) * 30 : Math.sin(S.t * 3 + c.x) * 2;
    if (c.z !== 'sky') { g.globalAlpha = .2; circle(c.x, c.y + 20, 16, '#000'); g.globalAlpha = 1; }
    g.save(); g.translate(c.x, c.y + by); if (c.dir < 0) g.scale(-1, 1); txt(c.a.emoji, 0, 0, 44, '#000'); g.restore();
    const ph = G.prog.photos && G.prog.photos[c.a.id]; if (ph > 1) txt('🌟', c.x + 20, c.y - 20 + by, 14, '#000');
  }
  if (!S.critters.length) { rr(60, 300, W - 120, 120, 20, '#fff8ecdd'); txt('Meet animals on the map —', W / 2, 340, 26, '#1d2a24'); txt("they'll come and live here!", W / 2, 380, 26, '#1d2a24'); }
  G.drawWeather(S.t);
  // shop
  rr(0, SHOP_Y, W, H - SHOP_Y, 0, '#fff8ec');
  C.shop.forEach((it, i) => {
    const x = 8 + (i % 7) * 98, y = SHOP_Y + 6 + Math.floor(i / 7) * 62, can = (G.prog.shells || 0) >= it[3], sel = S.placing === it;
    rr(x, y, 92, 56, 12, sel ? '#ffe14d' : can ? '#e8f6e0' : '#eee'); txt(it[1], x + 28, y + 28, 30, '#000'); txt(it[3] + '🐚', x + 68, y + 30, 15, can ? '#1d2a24' : '#999', 'center', 700);
  });
  G.hudBar('🏞️ ' + G.player + "'s Sanctuary", '🐚 ' + (G.prog.shells || 0));
  if (S.placing) G.hint('👆 ' + S.placing[1] + ' ⬇️');
  else if (S.t < 5) G.hint('👆 🦘   🐚 ➡️ 🌴');
}
G.modes.sanct = { start, update, draw, tap, animateUnderCards: true, music: 'map', debug: () => S, repeat() { G.sayNow('sa_intro'); } };
})();
