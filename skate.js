'use strict';
/* Skateboard (Darwin Waterfront) and BMX (dirt track). Tap to jump, tap again in the air for a trick.
   Word balloons come in pairs, one high and one low: listen and grab the word you hear (sight-word reading). */
(() => {
const { W, H, T, g, rr, txt, fitTxt, circle, rnd, pick, clamp, shuffle, C } = G;
const GY = 640, KX = 170;
let S = null;
function start(run, type) {
  const bmx = type === 'bmx';
  S = { bmx, t: 0, v: 250, y: GY, vy: 0, air: false, spin: 0, tricks: 0, items: [], next: 2.5, obst: 1.5, got: 0, goal: 5, time: 80, wob: 0, end: false, target: null, said: {}, scroll: 0, missed: false };
  G.setPad('act', '⤴️');
  G.sayNow(bmx ? 'x_intro' : 'k_intro');
}
function jump() {
  if (!S.air) { S.air = true; S.vy = -640; G.sfx('whoosh'); }
  else if (!S.spinning) { S.spinning = true; S.spin = 0; }
}
function newPair() {
  const w = G.wpick(C.sight, x => 'S:' + x.toLowerCase()), other = pick(C.sight.filter(x => x.toLowerCase() !== w.toLowerCase())), hi = Math.random() < .5;
  S.target = w; S.missed = false;
  S.items.push({ k: 'word', t: w, ok: true, x: W + 60, y: hi ? 400 : GY - 40 }, { k: 'word', t: other, ok: false, x: W + 60, y: hi ? GY - 40 : 400 });
  G.say('sw_' + w.toLowerCase());
}
function update(dt) {
  if (S.end) return;
  S.t += dt; G.tick(dt); S.time -= dt; if (S.time <= 0) return finish();
  S.wob = Math.max(0, S.wob - dt);
  const v = S.v * (S.wob > 0 ? .5 : 1); S.scroll += v * dt;
  if (S.air) {
    S.vy += 1500 * dt; S.y += S.vy * dt;
    if (S.spinning) { S.spin += dt * 10; if (S.spin >= Math.PI * 2) { S.spinning = false; S.spin = 0; S.tricks++; G.sfx('star'); if (S.tricks <= 2) G.say('k_trick'); } }
    if (S.y >= GY) { S.y = GY; S.air = false; S.vy = 0; if (S.spinning) { S.spinning = false; S.spin = 0; S.wob = .6; G.sfx('bump'); } }
  }
  S.next -= dt; if (S.next <= 0 && !S.items.some(i => i.k === 'word')) { S.next = rnd(2.5, 4); newPair(); }
  S.obst -= dt; if (S.obst <= 0) { S.obst = rnd(2.2, 3.6); S.items.push({ k: Math.random() < .4 ? 'ramp' : 'cone', x: W + 40, y: GY }); }
  for (const it of S.items) {
    it.x -= v * dt;
    if (it.gone) continue;
    if (it.k === 'ramp' && !S.air && Math.abs(it.x - KX) < 30) { S.air = true; S.vy = -880; it.gone = true; G.sfx('whoosh'); }
    else if (it.k === 'cone' && Math.abs(it.x - KX) < 28 && S.y > GY - 40) { it.gone = true; S.wob = 1; G.sfx('bump'); if (!S.said.bump) { S.said.bump = 1; G.sayNow('k_bump'); } }
    else if (it.k === 'word' && Math.abs(it.x - KX) < 46 && Math.abs(it.y - (S.y - 40)) < 60) {
      for (const o of S.items) if (o.k === 'word') o.gone = true;
      if (it.ok) { S.got++; G.sfx('ding'); G.sayNow('w_' + it.t.toLowerCase()); if (!S.missed) G.skillMark('S:' + it.t.toLowerCase(), true); if (S.got >= S.goal) return finish(true); }
      else { G.sfx('bonk'); G.skillMark('S:' + S.target.toLowerCase(), false); G.sayNow('wrong2', 'sw_' + S.target.toLowerCase()); S.next = 1.2; }
    }
  }
  if (S.items.some(i => i.k === 'word' && i.ok && i.x < KX - 60 && !i.gone)) { for (const o of S.items) if (o.k === 'word') o.gone = true; S.next = 1; S.missed = true; }
  S.items = S.items.filter(i => !i.gone && i.x > -80);
}
function finish(win) {
  if (S.end) return; S.end = true;
  G.say('k_done');
  G.showCard(win ? 'Rad riding! ' + (S.bmx ? '🚲' : '🛹') : 'What a session! ' + (S.bmx ? '🚲' : '🛹'), '📖 ' + S.got + '  ⭐ ' + S.tricks, 'You grabbed ' + S.got + ' words and did ' + S.tricks + ' tricks!', 'Next ▶', () => G.stepDone(0));
}
function draw() {
  const se = G.season(), sky = g.createLinearGradient(0, T, 0, GY); sky.addColorStop(0, se.sky); sky.addColorStop(1, '#fdf1d8');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  if (S.bmx) {
    g.fillStyle = '#9a6a3a'; for (let i = 0; i < 4; i++) { const x = ((i * 300 - S.scroll * .3) % (W + 300) + W + 300) % (W + 300) - 150; g.beginPath(); g.ellipse(x, 520, 200, 70, 0, Math.PI, 0); g.fill(); }
    g.fillStyle = '#2f6b33'; for (let i = 0; i < 8; i++) { const x = ((i * 120 - S.scroll * .5) % (W + 120) + W + 120) % (W + 120) - 60; circle(x, 470, 34, '#3d7a37'); g.fillStyle = '#5e3b19'; g.fillRect(x - 4, 480, 8, 60); }
  } else {
    g.fillStyle = '#2fa3c9'; g.fillRect(0, 430, W, 110);
    for (let i = 0; i < 6; i++) { const x = ((i * 160 - S.scroll * .4) % (W + 160) + W + 160) % (W + 160) - 80; txt('🌴', x, 500, 70, '#000'); }
    g.fillStyle = '#d9d2c4'; g.fillRect(0, 540, W, 60);
  }
  g.fillStyle = S.bmx ? '#b5793e' : '#bfc4c9'; g.fillRect(0, GY + 34, W, H - GY);
  g.fillStyle = S.bmx ? '#8a5a2a' : '#9aa0a6'; for (let i = 0; i < 12; i++) { const x = ((i * 80 - S.scroll) % W + W) % W; g.fillRect(x, GY + 40, 40, 4); }
  for (const it of S.items) {
    if (it.k === 'ramp') { g.fillStyle = S.bmx ? '#7a4f26' : '#e8a35a'; g.beginPath(); g.moveTo(it.x - 40, GY + 34); g.lineTo(it.x + 30, GY - 6); g.lineTo(it.x + 30, GY + 34); g.fill(); }
    else if (it.k === 'cone') txt(S.bmx ? '🪨' : '🚧', it.x, GY + 8, 44, '#000');
    else { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(it.x, it.y + 30); g.lineTo(it.x, it.y + 70); g.stroke(); circle(it.x, it.y, 40, it.y < 500 ? '#ff8fc7' : '#5cc8ff'); fitTxt(it.t, it.x, it.y + 2, 66, 30, '#1d2a24'); }
  }
  // rider
  g.save(); g.translate(KX, S.y); g.rotate(S.spin + (S.wob ? Math.sin(S.t * 30) * .15 : 0));
  if (S.bmx) { g.strokeStyle = '#222'; g.lineWidth = 4; circle(-24, 22, 14, '#222'); circle(24, 22, 14, '#222'); circle(-24, 22, 9, '#ddd'); circle(24, 22, 9, '#ddd'); g.strokeStyle = '#e94b3c'; g.lineWidth = 5; g.beginPath(); g.moveTo(-24, 22); g.lineTo(0, 4); g.lineTo(24, 22); g.moveTo(0, 4); g.lineTo(18, -6); g.stroke(); }
  else { rr(-34, 18, 68, 8, 4, '#ff7a1a'); circle(-22, 30, 5, '#333'); circle(22, 30, 5, '#333'); }
  G.drawKid(0, -16, .95);
  g.restore();
  G.drawWeather(S.t);
  G.hudBar((S.bmx ? '🚲' : '🛹') + ' 👂 🎈', '📖 ' + S.got + '/' + S.goal + '  ⏱' + Math.max(0, Math.ceil(S.time)));
  if (S.t < 6) G.hint('👆 ⤴️   👆👆 🔄');
}
G.modes.skate = { start, update, draw, debug: () => S, press(k) { if (k === 'act') jump(); }, tap() { jump(); }, repeat() { if (S.target) G.sayNow('sw_' + S.target.toLowerCase()); } };
})();
