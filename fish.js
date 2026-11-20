'use strict';
/* Barra fishing bonus: hold to wind up, release to cast, tap on the bite, hold to reel (watch the line tension and the croc). */
(() => {
const { W, H, T, g, rr, txt, fitTxt, circle, rnd, pick, clamp, C } = G;
const SURF = 250, TIP = [196, 160];
let F = null;

function spawnFish() {
  const r = Math.random(), type = r < .08 ? C.fish[4] : pick(C.fish.slice(0, 4));
  const dir = Math.random() < .5 ? 1 : -1;
  return { type, x: rnd(40, W - 40), y: rnd(320, 740), dir, v: rnd(28, 55), scared: 0, wob: rnd(0, 6) };
}
function start(run) {
  const remi = G.isRemi();
  F = { remi, run, state: 'aim', power: 0, holding: false, lx: TIP[0], ly: TIP[1], fish: [], hooked: null, tension: 0, L: 0, dir: [0, 1], pull: 0, pullT: 0,
        caught: [], goal: remi ? 2 : 3, time: remi ? 999 : 120, t: 0, show: null, croc: null, castT: 0, from: null, to: null, biteT: 0, msg: '' };
  for (let i = 0; i < 7; i++) F.fish.push(spawnFish());
  G.setPad('act');
  G.sayNow('bonus_fish', 'f_aim');
}
function press(k) {
  if (k === 'act') {
    F.holding = true;
    if (F.state === 'bite') hook();
    else if (F.state === 'aim' && F.remi) { F.power = rnd(.4, .9); cast(); }
  }
  if (k === 'up') F.keyUp = true; if (k === 'down') F.keyDown = true;
}
function release(k) {
  if (k === 'act') { F.holding = false; if (F.state === 'aim' && F.power > 0.05 && !F.remi) cast(); }
  if (k === 'up') F.keyUp = false; if (k === 'down') F.keyDown = false;
}
function cast() {
  F.state = 'cast'; F.castT = 0; F.from = TIP.slice(); F.to = [240 + F.power * 420, SURF]; G.sfx('cast');
}
function hook() {
  const fish = F.hooked; if (!fish) return;
  F.state = 'fight'; F.tension = .2; F.pull = .3; F.pullT = 0;
  const dx = F.lx - TIP[0], dy = F.ly - TIP[1], d = Math.hypot(dx, dy); F.L = d; F.L0 = d; F.dir = [dx / d, dy / d];
  G.sayNow(F.remi ? null : 'f_reel'); G.sfx('ding');
  if (!F.remi && !fish.type.boot && Math.random() < .35) { F.croc = { x: fish.x > W / 2 ? -120 : W + 120, y: fish.y, v: 55, said: false }; }
}
function lost(key) {
  if (F.hooked) { F.hooked.scared = 2; F.hooked.hook = false; }
  F.hooked = null; F.croc = null; F.state = 'aim'; F.power = 0; F.lx = TIP[0]; F.ly = TIP[1];
  G.sayNow(key);
}
function caught() {
  const f = F.hooked, ty = f.type, len = Math.round(rnd(ty.min, ty.max));
  F.caught.push({ ty, len }); F.show = { ty, len, t: 3 };
  F.fish.splice(F.fish.indexOf(f), 1); F.fish.push(spawnFish());
  F.hooked = null; F.croc = null; F.state = 'show';
  G.jingle(); G.sayNow('f_got_' + ty.id);
}
function update(dt) {
  F.t += dt; G.tick(dt);
  if (F.state !== 'end' && F.state !== 'show' && !F.remi) { F.time -= dt; if (F.time <= 0) return finish(); }
  // fish swim
  for (const f of F.fish) {
    if (f === F.hooked) continue;
    f.wob += dt * 4; f.scared = Math.max(0, f.scared - dt);
    if (F.state === 'sink' && !f.scared && !F.hooked && Math.hypot(f.x - F.lx, f.y - F.ly) < 150) {
      const a = Math.atan2(F.ly - f.y, F.lx - f.x); f.dir = Math.cos(a) >= 0 ? 1 : -1;
      f.x += Math.cos(a) * f.v * dt; f.y += Math.sin(a) * f.v * dt;
      if (Math.hypot(f.x - F.lx, f.y - F.ly) < 26 && Math.random() < dt * 1.6) {
        F.hooked = f; F.state = 'bite'; F.biteT = F.remi ? 3 : 1.1; G.sayNow('f_bite'); G.sfx('bonk');
      }
    } else {
      f.x += f.dir * f.v * (f.scared ? 2.2 : 1) * dt; f.y += Math.sin(f.wob) * 8 * dt;
      if (f.x < -60) f.dir = 1; if (f.x > W + 60) f.dir = -1; f.y = clamp(f.y, 300, 760);
    }
  }
  if (F.state === 'aim' && F.holding && !F.remi) F.power = Math.min(1, F.power + dt * .7);
  if (F.state === 'cast') {
    F.castT += dt / .7; const k = Math.min(1, F.castT);
    F.lx = F.from[0] + (F.to[0] - F.from[0]) * k; F.ly = F.from[1] + (F.to[1] - F.from[1]) * k - Math.sin(k * Math.PI) * 120;
    if (k >= 1) { F.state = 'sink'; G.sfx('splash'); }
  }
  if (F.state === 'sink') {
    const v = F.keyDown ? 110 : F.keyUp ? -80 : 45;
    F.ly = clamp(F.ly + v * dt, SURF + 10, 750);
    if (F.keyUp && F.ly <= SURF + 12) { F.state = 'aim'; F.power = 0; F.lx = TIP[0]; F.ly = TIP[1]; }
  }
  if (F.state === 'bite') {
    F.biteT -= dt; F.hooked.x = F.lx + Math.sin(F.t * 30) * 3; F.hooked.y = F.ly + 6;
    if (F.biteT <= 0) lost('f_miss');
  }
  if (F.state === 'fight') {
    const f = F.hooked, strong = f.type.boot ? .1 : f.type.w;
    F.pullT -= dt; if (F.pullT <= 0) { F.pullT = rnd(.5, 1.3); F.pull = Math.random() * strong; }
    const reeling = F.remi || F.holding;
    if (reeling) { F.L -= (F.remi ? 70 : 95) * (1 - F.pull * .6) * dt; F.tension += (F.remi ? 0 : (.12 + F.pull * .75)) * dt; if (Math.random() < dt * 8) G.sfx('reel'); }
    else { F.tension -= .55 * dt; F.L = Math.min(F.L0 + 80, F.L + F.pull * 40 * dt); }
    F.tension = clamp(F.tension, 0, 1.01);
    if (F.tension >= 1) return lost('f_snap');
    F.lx = TIP[0] + F.dir[0] * F.L; F.ly = Math.max(SURF + 4, TIP[1] + F.dir[1] * F.L);
    f.x = F.lx + Math.sin(F.t * 9) * 6 * F.pull; f.y = F.ly + 8; f.dir = F.dir[0] > 0 ? -1 : 1;
    if (F.croc) {
      const c = F.croc; if (!c.said) { c.said = true; G.say('f_croc'); }
      const a = Math.atan2(f.y - c.y, f.x - c.x); c.x += Math.cos(a) * c.v * dt; c.y += Math.sin(a) * c.v * dt; c.dir = Math.cos(a) >= 0 ? 1 : -1;
      if (Math.hypot(f.x - c.x, f.y - c.y) < 50) { G.sfx('chomp'); F.fish.splice(F.fish.indexOf(f), 1); F.fish.push(spawnFish()); F.hooked = null; return lost('f_crocgot'); }
    }
    if (F.L < 70 || F.ly <= SURF + 6) caught();
  }
  if (F.state === 'show') { F.show.t -= dt; if (F.show.t <= 0) { F.show = null; if (F.caught.filter(c => !c.ty.boot).length >= F.goal) return finish(); F.state = 'aim'; F.power = 0; F.lx = TIP[0]; F.ly = TIP[1]; } }
}
function finish() {
  if (F.state === 'end') return; F.state = 'end';
  const real = F.caught.filter(c => !c.ty.boot);
  G.say('f_done');
  G.showCard('Fishing trip done! 🎣', real.length ? real.map(() => '🐟').join(' ') : '🥾', real.length ? 'You caught ' + real.length + ' fish! Biggest: ' + Math.max(...real.map(c => c.len)) + ' cm' : 'No fish this time — good try!', 'Next ▶', () => G.stepDone(0));
}

/* ---------- drawing ---------- */
G.drawFish = function (x, y, ty, dir, s = 1) {
  if (ty.boot) { g.save(); g.translate(x, y); g.scale(dir, 1); txt('👢', 0, 0, 34 * s, '#000'); g.restore(); return; }
  const L = 40 * ty.w * s, Hh = 15 * ty.w * s;
  g.save(); g.translate(x, y); g.scale(dir, 1);
  g.beginPath(); g.moveTo(-L * .8, 0); g.lineTo(-L * 1.25, -Hh * .9); g.lineTo(-L * 1.2, Hh * .9); g.closePath(); g.fillStyle = ty.fin; g.fill();
  const gr = g.createLinearGradient(0, -Hh, 0, Hh); gr.addColorStop(0, ty.back); gr.addColorStop(.55, ty.body); gr.addColorStop(1, '#fff');
  g.beginPath(); g.ellipse(0, 0, L, Hh, 0, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
  g.beginPath(); g.moveTo(-L * .2, -Hh * .9); g.lineTo(L * .2, -Hh * 1.5); g.lineTo(L * .4, -Hh * .8); g.fillStyle = ty.fin; g.fill();
  circle(L * .62, -Hh * .2, 4 * s, '#fff'); circle(L * .65, -Hh * .2, 2.2 * s, '#111');
  g.restore();
};
function draw() {
  const sky = g.createLinearGradient(0, T, 0, SURF); sky.addColorStop(0, '#7cc6f2'); sky.addColorStop(1, '#cfeefe');
  g.fillStyle = sky; g.fillRect(0, T, W, SURF - T);
  circle(600, 130, 34, '#ffe066');
  // mangroves on the far bank
  for (let i = 0; i < 9; i++) { const x = 300 + i * 50; g.fillStyle = '#2f6b33'; g.beginPath(); g.arc(x, SURF - 18, 26, Math.PI, 0); g.fill(); g.strokeStyle = '#5e3b19'; g.lineWidth = 2; for (let j = -1; j <= 1; j++) { g.beginPath(); g.moveTo(x + j * 8, SURF - 12); g.lineTo(x + j * 14, SURF); g.stroke(); } }
  const wat = g.createLinearGradient(0, SURF, 0, H); wat.addColorStop(0, '#3b8fb3'); wat.addColorStop(1, '#173f5a');
  g.fillStyle = wat; g.fillRect(0, SURF, W, H - SURF);
  g.fillStyle = '#6b5a3a'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 40) g.lineTo(x, H - 40 - Math.sin(x * .05) * 12); g.lineTo(W, H); g.fill();
  for (let i = 0; i < 6; i++) { g.strokeStyle = '#ffffff55'; g.lineWidth = 2; g.beginPath(); const x = (i * 130 + F.t * 25) % (W + 80) - 40; g.moveTo(x, SURF + 2); g.quadraticCurveTo(x + 20, SURF - 4, x + 40, SURF + 2); g.stroke(); }
  for (const f of F.fish) G.drawFish(f.x, f.y, f.type, f.dir);
  if (F.croc) { g.save(); G.drawCroc(F.croc.x - 1.5 * T, F.croc.y - T / 2, 3, F.croc.dir > 0, .3 + Math.sin(F.t * 8) * .3); g.restore(); }
  // boat + Felix
  g.fillStyle = '#d9d9d9'; g.beginPath(); g.moveTo(40, SURF - 20); g.lineTo(220, SURF - 20); g.lineTo(200, SURF + 10); g.lineTo(60, SURF + 10); g.closePath(); g.fill();
  g.fillStyle = '#ff7a1a'; g.fillRect(48, SURF - 12, 165, 7); txt('KEIL', 130, SURF + 2, 13, '#1b3b52');
  G.drawKid(140, SURF - 48, 1);
  g.strokeStyle = '#3a2a1a'; g.lineWidth = 4; g.beginPath(); g.moveTo(150, SURF - 40); g.lineTo(TIP[0], TIP[1]); g.stroke();
  if (F.state !== 'aim') { g.strokeStyle = '#ffffffcc'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(TIP[0], TIP[1]); g.quadraticCurveTo((TIP[0] + F.lx) / 2, Math.max(TIP[1], F.ly) - (F.state === 'fight' ? 0 : 30), F.lx, F.ly); g.stroke(); circle(F.lx, F.ly, 5, '#ff3b3b'); }
  if (F.state === 'bite') { txt('❗', F.lx, F.ly - 46 + Math.sin(F.t * 20) * 4, 46, '#fff'); txt('TAP!', F.lx, F.ly - 86, 30, '#ffe14d'); }
  // HUD
  g.fillStyle = '#123b2c'; g.fillRect(0, 0, W, T);
  txt(G.buddyEmoji(), 34, T / 2, 32, '#000');
  txt('🎣 ' + F.caught.filter(c => !c.ty.boot).length + ' / ' + F.goal, 120, T / 2, 26, '#ffe14d', 'left');
  if (!F.remi) txt('⏱ ' + Math.max(0, Math.ceil(F.time)) + 's', W - 80, T / 2, 22, '#fff', 'right', 700);
  txt('🔊', W - 36, T / 2, 30, '#fff');
  const hint = { aim: F.remi ? 'Tap 🎣 to cast!' : 'Hold 🎣 … let go to cast!', cast: '', sink: F.remi ? 'Wait for a bite…' : '⬇️ deeper  ⬆️ up · wait for a bite', bite: 'TAP 🎣 NOW!', fight: F.remi ? 'Reeling in…' : 'Hold 🎣 to reel · let go if red!', show: '', end: '' }[F.state];
  if (hint) { rr(W / 2 - 230, T + 10, 460, 40, 14, '#00000066'); txt(hint, W / 2, T + 31, 22, '#fff', 'center', 700); }
  if (F.state === 'aim' && !F.remi) { rr(40, T + 60, 200, 22, 10, '#00000055'); rr(40, T + 60, 200 * F.power, 22, 10, '#ffe14d'); txt('POWER', 140, T + 71, 14, '#1d2a24'); }
  if (F.state === 'fight' && !F.remi) { const tc = F.tension > .75 ? '#e94b3c' : F.tension > .45 ? '#ffd23f' : '#3fa34d'; rr(W - 60, 300, 30, 300, 12, '#00000055'); rr(W - 60, 300 + 300 * (1 - F.tension), 30, 300 * F.tension, 12, tc); txt('LINE', W - 45, 290, 14, '#fff'); }
  if (F.show) {
    rr(W / 2 - 250, 300, 500, 300, 26, '#fff8ec');
    G.drawFish(W / 2, 420, F.show.ty, 1, 3);
    fitTxt(F.show.ty.name, W / 2, 520, 440, 38, '#1d2a24');
    if (!F.show.ty.boot) { txt(F.show.len + ' cm', W / 2, 565, 30, '#ff7a1a'); for (let i = 0; i <= 10; i++) { g.fillStyle = '#56645d'; g.fillRect(W / 2 - 200 + i * 40, 590, 2, i % 5 ? 6 : 12); } }
  }
}
G.modes.fish = { start, update, draw, press, release, debug: () => F, pdown() { press('act'); }, pup() { release('act'); }, repeat() { G.sayNow(F.state === 'fight' ? 'f_reel' : 'f_aim'); } };
})();
