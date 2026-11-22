'use strict';
/* Hacky sack at Mindil Beach sunset. Tap when the sack drops to your foot. Count the kicks out loud:
   first round in English, second round in Indonesian (satu, dua, tiga...). */
(() => {
const { W, H, T, g, rr, txt, fitTxt, circle, rnd, clamp, C } = G;
const FOOT = 650;
let S = null;
function start() {
  const remi = G.isRemi();
  S = { remi, t: 0, kx: W / 2, tx: W / 2, bx: W / 2, by: 300, vx: 0, vy: 0, count: 0, round: 0, goal: remi ? 5 : 10, drops: 0, kick: 0, best: 0, end: false, pause: 1.5, time: 150 };
  G.setPad(remi ? 'act' : 'both', '🦶');
  G.sayNow('h_intro');
}
const grav = () => (S.remi ? 330 : 620) * (S.drops >= 3 ? .8 : 1);
const zone = () => (S.remi ? 130 : 75) + Math.min(S.drops, 4) * 10;
function kick() {
  if (S.end || S.pause > 0) return;
  S.kick = .25;
  if (S.by > FOOT - 150 && S.by < FOOT + 10 && Math.abs(S.bx - S.kx) < zone()) {
    S.vy = -(S.remi ? 430 : 600); S.vx = clamp((W / 2 - S.bx) * .4 + rnd(-90, 90), -160, 160);
    S.count++; S.best = Math.max(S.best, S.count); G.sfx('kick');
    const n = S.count, key = S.round === 0 ? 'n_' + n : 'idw_' + G.slug(C.count10.id[n - 1]);
    G.sayNow(key);
    if (S.count >= S.goal) {
      S.round++; S.count = 0; S.pause = 2.2; G.jingle(); G.earn(1);
      if (S.round === 1) G.say(S.goal === 10 ? 'h_ten' : 'great_remi', 'h_indo'); else return finish();
    }
  }
}
function update(dt) {
  if (S.end) return;
  S.t += dt; G.tick(dt); S.kick = Math.max(0, S.kick - dt); S.time -= dt;
  if (S.time <= 0) return finish();
  if (G.keys.left) S.tx -= 340 * dt; if (G.keys.right) S.tx += 340 * dt;
  if (S.remi) S.tx = S.bx;
  S.tx = clamp(S.tx, 60, W - 60); S.kx += (S.tx - S.kx) * Math.min(1, dt * (S.remi ? 4 : 9));
  if (S.pause > 0) { S.pause -= dt; S.bx = S.kx; S.by = 300; S.vx = 0; S.vy = 0; return; }
  S.vy += grav() * dt; S.bx += S.vx * dt; S.by += S.vy * dt;
  if (S.bx < 40 || S.bx > W - 40) { S.vx *= -1; S.bx = clamp(S.bx, 40, W - 40); }
  if (S.by > FOOT + 60) { S.drops++; S.count = 0; G.sfx('bump'); G.sayNow('h_drop'); S.pause = 1.4; }
}
function finish() {
  if (S.end) return; S.end = true;
  G.say('h_done');
  G.showCard('Hacky sack champion! 🦶', S.round >= 2 ? '🔟 + sepuluh!' : '🦶 ' + S.best, S.round >= 2 ? 'You counted to ' + S.goal + ' in English and in Indonesian!' : 'Best run: ' + S.best + ' kicks.', 'Next ▶', () => G.stepDone(0));
}
function draw() {
  const sky = g.createLinearGradient(0, T, 0, 460); sky.addColorStop(0, '#ff9a5a'); sky.addColorStop(.7, '#ffcf7a'); sky.addColorStop(1, '#ffe7b0');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  circle(W / 2, 450, 70, '#ffdf6b');
  g.fillStyle = '#2a8fb0'; g.fillRect(0, 450, W, 90);
  g.fillStyle = '#ffe7b0'; g.fillRect(W / 2 - 70, 470, 140, 4);
  g.fillStyle = '#f1dca0'; g.fillRect(0, 540, W, H - 540);
  for (const x of [60, 640]) { txt('🌴', x, 470, 120, '#000'); }
  txt('⛱️', 600, 600, 50, '#000');
  // kid with kicking leg
  const k = S.kick > 0 ? Math.sin((S.kick / .25) * Math.PI) : 0;
  g.strokeStyle = '#ffd9b3'; g.lineWidth = 9; g.lineCap = 'round';
  g.beginPath(); g.moveTo(S.kx - 8, FOOT - 10); g.lineTo(S.kx - 12, FOOT + 40); g.stroke();
  g.beginPath(); g.moveTo(S.kx + 8, FOOT - 10); g.lineTo(S.kx + 8 + k * 34, FOOT + 40 - k * 46); g.stroke();
  G.drawKid(S.kx, FOOT - 40, 1.3);
  g.globalAlpha = .2; circle(S.kx, FOOT + 46, 30, '#000'); g.globalAlpha = 1;
  if (S.by > FOOT - 150 && S.pause <= 0) { g.globalAlpha = .25; circle(S.kx, FOOT + 10, zone() * .6, '#ffe14d'); g.globalAlpha = 1; }
  // the sack
  circle(S.bx, S.by, 18, '#3fa34d'); g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.arc(S.bx, S.by, 12, 0, Math.PI); g.stroke();
  // count
  if (S.count) { txt(String(S.count), W / 2, 220, 90, '#fff'); fitTxt(S.round === 0 ? C.count10.en[S.count - 1] : C.count10.id[S.count - 1], W / 2, 290, 400, 40, S.round === 0 ? '#1d2a24' : '#c0392b'); }
  G.hudBar(S.round === 0 ? '🦶 Count in English' : '🇮🇩 Count in Indonesian', (S.round + 1) + '/2');
  if (S.t < 6) G.hint(S.remi ? 'Tap 🦶 when the sack comes down!' : 'Move ⬅️ ➡️ · tap 🦶 when the sack drops to your foot');
}
G.modes.hacky = { start, update, draw, debug: () => S, press(k) { if (k === 'act') kick(); }, tap() { kick(); }, pdown(p) { if (!S.remi && p.y > FOOT - 200) S.tx = p.x; }, repeat() { G.sayNow('h_intro'); } };
})();
