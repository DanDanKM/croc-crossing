'use strict';
/* Banana boat UB-19: drive Dad's pale-mint skiff (black Mercury on the back) up the river.
   Steer to the letter buoys in order to spell the words; dodge logs, crocs and the mangrove banks. */
(() => {
const { W, H, T, g, rr, txt, fitTxt, circle, rnd, pick, clamp, shuffle, LET } = G;
const BY = 640;
let S = null;
const river = d => ({ cx: W / 2 + Math.sin(d * .0035) * 90 + Math.sin(d * .011) * 25, half: 210 + Math.sin(d * .002) * 30 });

function start(run) {
  const remi = G.isRemi(), stop = run ? run.stop : G.C.stops[0];
  const words = remi ? ['REMI'] : shuffle(stop.spell).slice(0, 2);
  S = { remi, t: 0, dist: 0, v: remi ? 150 : 210, x: W / 2, tx: W / 2, items: [], spawn: 1, words, wi: 0, li: 0, bump: 0, time: remi ? 999 : 90, shells: 0, end: false, said: {}, wake: [] };
  G.setPad('arrows');
  G.sayNow('b_intro', remi ? null : 'spell_' + word());
}
const word = () => S.words[S.wi] || '';
const need = () => word()[S.li] || '';
function update(dt) {
  if (S.end) return;
  S.t += dt; G.tick(dt); S.bump = Math.max(0, S.bump - dt);
  if (!S.remi) { S.time -= dt; if (S.time <= 0) return finish(false); }
  if (G.keys.left) S.tx -= 300 * dt; if (G.keys.right) S.tx += 300 * dt;
  const sp = S.v * (S.bump > 0 ? .45 : 1);
  S.dist += sp * dt;
  const r = river(S.dist + (H - BY));
  S.tx = clamp(S.tx, r.cx - r.half + 30, r.cx + r.half - 30);
  S.x += (S.tx - S.x) * Math.min(1, dt * 6);
  if (Math.random() < dt * 6) G.sfx('motor');
  S.wake.push({ x: S.x, y: BY + 60, a: 1 }); for (const w of S.wake) { w.y += sp * dt; w.a -= dt * .9; } S.wake = S.wake.filter(w => w.a > 0);
  // spawn ahead
  S.spawn -= dt;
  if (S.spawn <= 0) {
    S.spawn = rnd(.7, 1.2) * (S.remi ? 1.3 : 1);
    const rr2 = river(S.dist + H + 40), x = rnd(rr2.cx - rr2.half + 50, rr2.cx + rr2.half - 50), k = Math.random();
    if (k < .45) S.items.push({ k: 'L', L: S.remi || Math.random() < .55 ? need() : pick(LET), x, y: -40 });
    else if (k < .65) S.items.push({ k: 'shell', x, y: -40 });
    else if (k < .85) S.items.push({ k: 'log', x, y: -40 });
    else S.items.push({ k: 'croc', x, y: -40, open: 0 });
  }
  for (const it of S.items) {
    it.y += sp * dt; if (it.k === 'croc') it.open = (Math.sin(S.t * 3 + it.x) + 1) / 2;
    if (it.gone || Math.abs(it.y - BY) > 40 || Math.abs(it.x - S.x) > (it.k === 'log' ? 70 : 42)) continue;
    it.gone = true;
    if (it.k === 'shell') { S.shells++; G.sfx('star'); }
    else if (it.k === 'log' || it.k === 'croc') {
      if (S.remi) { G.sfx('bump'); continue; }
      S.bump = 1; G.sfx('bump');
      const key = it.k === 'croc' ? 'b_croc' : 'b_bump'; if (!S.said[key]) { S.said[key] = 1; G.sayNow(key); }
    } else if (it.L === need()) {
      G.sfx('ding'); S.li++;
      if (S.li >= word().length) { G.jingle(); G.sayNow('done_' + word()); S.wi++; S.li = 0; if (S.wi >= S.words.length) return finish(true); G.say('spell_' + word()); }
      else G.sayNow('l_' + it.L);
    } else { G.sfx('bump'); G.sayNow('th_' + it.L); }
  }
  S.items = S.items.filter(i => !i.gone && i.y < H + 60);
  // banks
  if (S.x < r.cx - r.half + 34 || S.x > r.cx + r.half - 34) { if (S.bump <= 0) { S.bump = .6; G.sfx('bump'); } }
}
function finish(win) {
  if (S.end) return; S.end = true;
  G.say('b_done');
  G.showCard(win ? 'Skipper of the year! 🍌🚤' : 'Back to the ramp! 🚤', '🍌 UB-19\n🐚 ' + S.shells, (S.wi ? 'You spelled ' + S.words.slice(0, S.wi).join(' and ') + '!' : 'Good driving!'), 'Next ▶', () => G.stepDone(0));
}
/* top-down drawing of UB-19: pale mint hull, grey canopy, console, black Mercury outboard */
G.drawUB19 = function (x, y, s = 1, tilt = 0) {
  g.save(); g.translate(x, y); g.rotate(tilt); g.scale(s, s);
  g.globalAlpha = .25; g.beginPath(); g.ellipse(4, 8, 40, 70, 0, 0, Math.PI * 2); g.fillStyle = '#000'; g.fill(); g.globalAlpha = 1;
  g.beginPath(); g.moveTo(0, -78); g.quadraticCurveTo(40, -40, 38, 20); g.lineTo(34, 62); g.lineTo(-34, 62); g.lineTo(-38, 20); g.quadraticCurveTo(-40, -40, 0, -78); g.closePath();
  g.fillStyle = '#d6efe8'; g.fill(); g.strokeStyle = '#86b3aa'; g.lineWidth = 4; g.stroke();
  g.beginPath(); g.moveTo(0, -66); g.quadraticCurveTo(30, -34, 28, 18); g.lineTo(26, 54); g.lineTo(-26, 54); g.lineTo(-28, 18); g.quadraticCurveTo(-30, -34, 0, -66); g.fillStyle = '#eaf8f4'; g.fill();
  rr(-26, -30, 52, 34, 6, '#9aa3a8'); g.strokeStyle = '#c9ced2'; g.lineWidth = 2; g.beginPath(); g.moveTo(-26, -13); g.lineTo(26, -13); g.stroke(); // canopy
  rr(-12, 10, 24, 16, 4, '#f5f5f5', '#9aa3a8', 2); // console
  G.drawKid(0, 34, .55);
  rr(-14, 62, 28, 22, 6, '#15181b'); txt('90', 0, 73, 10, '#d33', 'center', 800); // Mercury
  g.save(); g.font = '800 13px ' + G.FONT; g.fillStyle = '#1b3b52'; g.textAlign = 'center'; g.fillText('UB-19', 0, -40); g.restore();
  g.restore();
};
function draw() {
  g.fillStyle = '#2f7f8f'; g.fillRect(0, 0, W, H);
  // banks, mangroves
  for (let y = 0; y < H; y += 8) {
    const r = river(S.dist + (H - y));
    g.fillStyle = '#7a5a34'; g.fillRect(0, y, r.cx - r.half, 9); g.fillRect(r.cx + r.half, y, W, 9);
    g.fillStyle = '#3d7a37'; g.fillRect(0, y, r.cx - r.half - 18, 9); g.fillRect(r.cx + r.half + 18, y, W, 9);
  }
  for (let i = 0; i < 14; i++) {
    const wy = (i * 70 + S.dist) % (H + 70) - 35, r = river(S.dist + (H - wy));
    circle(r.cx - r.half - 20, wy, 22, '#2f6b33'); circle(r.cx + r.half + 20, wy + 30, 22, '#2f6b33');
    g.strokeStyle = '#ffffff22'; g.lineWidth = 2; g.beginPath(); g.arc(r.cx + ((i * 53) % (r.half * 2)) - r.half, wy, 9, .2, Math.PI - .2); g.stroke();
  }
  for (const w of S.wake) { g.globalAlpha = w.a * .6; circle(w.x - (1 - w.a) * 40, w.y, 6 + (1 - w.a) * 8, '#fff'); circle(w.x + (1 - w.a) * 40, w.y, 6 + (1 - w.a) * 8, '#fff'); } g.globalAlpha = 1;
  for (const it of S.items) {
    if (it.k === 'L') { circle(it.x, it.y, 28, it.L === need() ? '#ffb000' : '#ff7a1a'); circle(it.x, it.y, 21, '#fff'); txt(it.L, it.x, it.y + 2, 28, '#1d2a24'); }
    else if (it.k === 'shell') txt('🐚', it.x, it.y, 30, '#000');
    else if (it.k === 'log') { rr(it.x - 64, it.y - 13, 128, 26, 12, '#7b5230'); circle(it.x + 56, it.y, 12, '#a0703f'); }
    else { g.save(); g.translate(it.x, it.y); g.rotate(Math.PI / 2); G.drawCroc(-1.25 * T, -T / 2, 2.5, true, it.open, .9); g.restore(); }
  }
  G.drawUB19(S.x, BY, 1, (S.tx - S.x) * .004);
  if (S.bump > .5) txt('BUMP!', S.x, BY - 100, 30, '#fff');
  G.drawWeather(S.t);
  // HUD: word slots
  g.fillStyle = '#123b2c'; g.fillRect(0, 0, W, T); txt(G.buddyEmoji(), 34, T / 2, 32, '#000'); txt('🔊', W - 36, T / 2, 30, '#fff');
  const w = word(), bw = 44, x0 = W / 2 - w.length * bw / 2;
  txt('🍌', x0 - 30, T / 2, 30, '#fff');
  for (let i = 0; i < w.length; i++) { const bx = x0 + i * bw; rr(bx, 10, bw - 6, T - 20, 8, i < S.li ? '#3fa34d' : i === S.li ? '#ffe14d' : '#ffffff22'); txt(w[i], bx + (bw - 6) / 2, T / 2 + 2, 26, i === S.li ? '#1d2a24' : '#fff'); }
  txt('🐚' + S.shells + (S.remi ? '' : '  ⏱' + Math.max(0, Math.ceil(S.time))), W - 70, T / 2, 18, '#fff', 'right', 700);
  if (S.t < 6) G.hint('⬅️ ➡️  🅰️ 🅱️ 🆎');
}
G.modes.boat = {
  start, update, draw, debug: () => S,
  pdown(p) { S.tx = p.x; }, pmove(p) { S.tx = p.x; },
  repeat() { G.sayNow(S.remi ? 'b_intro' : 'spell_' + word(), 'l_' + need()); }
};
})();
