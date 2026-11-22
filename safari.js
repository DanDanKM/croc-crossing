'use strict';
/* Photo safari: a billabong boat cruise. Animals pop up from the grass, the water and the sky.
   Felix: snap the animal that's asked for (reading the word). Remi: snap any animal. Tap at the very top of a pop for a golden shot. */
(() => {
const { W, H, T, g, rr, txt, fitTxt, circle, rnd, pick, clamp, C } = G;
const SPOTS = [[110, 230, 'sky'], [350, 190, 'sky'], [590, 240, 'sky'],
  [90, 430, 'bank'], [265, 415, 'bank'], [450, 425, 'bank'], [625, 435, 'bank'],
  [150, 585, 'water'], [370, 610, 'water'], [580, 580, 'water']];
const ZONE = { sky: 'sky', land: 'bank', tree: 'bank', river: 'water', sea: 'water' };
let S = null;

function pool(idx) {
  let a = C.stops.slice(0, idx + 1).flatMap(s => s.animals).filter(a => ZONE[a.home]);
  if (a.length < 7) a = a.concat(G.allAnimals().filter(a => ZONE[a.home]));
  return a.filter((x, i, arr) => arr.findIndex(y => y.emoji === x.emoji) === i).slice(0, 14);
}
function start(run) {
  const remi = G.isRemi();
  S = { run, remi, t: 0, time: remi ? 999 : 75, pool: pool(run ? run.idx : 0), pops: [], spawn: .6, target: null, shots: 0, goal: remi ? 4 : 5, gold: 0, flash: 0, end: false, album: [], view: null, wait: 0 };
  G.setPad('none');
  G.sayNow(remi ? 'ph_remi' : 'ph_intro');
  G.preload(S.pool.map(a => 'sn_' + a.id), S.pool.map(a => 'nm_' + a.id));
  if (!remi) newTarget();
}
function newTarget() {
  const left = S.pool.filter(a => a !== S.target);
  S.target = G.wpick(left, a => 'K:' + a.word); S.missed = false; S.since = 0;
  G.say('sn_' + S.target.id);
}
function spawn() {
  const up = S.pops.map(p => p.spot);
  let a = !S.remi && !S.pops.some(p => p.a === S.target) && Math.random() < .45 ? S.target : pick(S.pool);
  const free = SPOTS.filter(s => s[2] === ZONE[a.home] && !up.includes(s));
  if (!free.length) return;
  const life = S.remi ? 4.2 : rnd(2.6, 3.4);
  S.pops.push({ a, spot: pick(free), age: 0, life, dir: Math.random() < .5 ? 1 : -1 });
}
const popH = p => Math.sin(Math.PI * clamp(p.age / p.life, 0, 1));
function popXY(p) {
  const [x, y, z] = p.spot, h = popH(p);
  if (z === 'sky') return [x + (p.age / p.life - .5) * 160 * p.dir, y - (1 - h) * 170];
  return [x, y + (1 - h) * 70];
}
function update(dt) {
  if (S.end) return;
  S.t += dt; G.tick(dt); S.flash = Math.max(0, S.flash - dt);
  if (!S.remi) { S.time -= dt; S.since += dt; if (S.time <= 0) return finish(); if (S.since > 9) { S.since = 0; G.say('sn_' + S.target.id); } }
  if (S.view) { S.view.t -= dt; if (S.view.t <= 0) S.view = null; }
  if (S.wait > 0) { S.wait -= dt; if (S.wait <= 0) { if (S.shots >= S.goal) return finish(); if (!S.remi) newTarget(); } }
  S.spawn -= dt; if (S.spawn <= 0) { S.spawn = S.remi ? rnd(.9, 1.4) : rnd(.6, 1.1); spawn(); }
  for (const p of S.pops) p.age += dt;
  S.pops = S.pops.filter(p => p.age < p.life && !p.gone);
}
function tap(pt) {
  if (S.end || S.wait > 0) return;
  let best = null, bd = 70;
  for (const p of S.pops) { const [x, y] = popXY(p), d = Math.hypot(pt.x - x, pt.y - y); if (d < bd && popH(p) > .25) { bd = d; best = p; } }
  S.view = { x: pt.x, y: pt.y, t: .35 }; G.sfx('snap');
  if (!best) return;
  if (!S.remi && best.a !== S.target) {
    if (!S.missed) { S.missed = true; G.skillMark('K:' + S.target.word, false); }
    G.sayNow('ph_wrong', 'nm_' + best.a.id, 'sn_' + S.target.id); return;
  }
  const gold = popH(best) > .86;
  best.gone = true; S.flash = .5; S.shots++; if (gold) S.gold++;
  S.album.push({ a: best.a, gold });
  const ph = G.prog.photos || (G.prog.photos = {}); ph[best.a.id] = Math.max(ph[best.a.id] || 0, gold ? 2 : 1); G.saveProg();
  if (!S.remi && !S.missed) G.skillMark('K:' + S.target.word, true);
  G.sayNow(gold ? 'ph_gold' : 'ph_snap', 'nm_' + best.a.id); if (gold) G.jingle(); else G.sfx('ding');
  S.wait = 1.6;
}
function finish() {
  if (S.end) return; S.end = true;
  G.say('ph_done');
  G.showCard('Photo album! 📷', S.album.length ? S.album.map(p => p.a.emoji).join(' ') : '📷', S.album.length + ' photos' + (S.gold ? ', ' + S.gold + ' golden 🌟' : '') + '. They are in your Field Guide!', 'Next ▶', () => G.stepDone(0));
}
function draw() {
  const se = G.season(), sky = g.createLinearGradient(0, T, 0, 380); sky.addColorStop(0, se.sky); sky.addColorStop(1, '#e8f6fb');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  circle(560, 130, 34, '#fff3b0');
  // far paperbarks + escarpment
  g.fillStyle = '#c47a4a'; g.beginPath(); g.moveTo(0, 330); g.lineTo(120, 290); g.lineTo(260, 300); g.lineTo(300, 270); g.lineTo(480, 285); g.lineTo(704, 300); g.lineTo(704, 360); g.lineTo(0, 360); g.fill();
  for (let i = 0; i < 12; i++) { const x = i * 62 + 10; g.fillStyle = '#e9e1cf'; g.fillRect(x, 330, 6, 40); g.fillStyle = '#4f8f3a'; g.beginPath(); g.arc(x + 3, 326, 22, 0, Math.PI * 2); g.fill(); }
  // sky pops behind nothing
  for (const p of S.pops) if (p.spot[2] === 'sky') drawPop(p);
  // bank
  g.fillStyle = '#7fae4a'; g.fillRect(0, 360, W, 120);
  for (const p of S.pops) if (p.spot[2] === 'bank') drawPop(p);
  g.fillStyle = '#5f9a3a'; g.fillRect(0, 440, W, 40);
  for (let i = 0; i < 40; i++) { const x = i * 18; g.strokeStyle = '#4a7f2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 450); g.lineTo(x + 4, 420 + (i % 3) * 8); g.stroke(); }
  // water
  const wat = g.createLinearGradient(0, 480, 0, H); wat.addColorStop(0, '#4a8fa0'); wat.addColorStop(1, '#22566a');
  g.fillStyle = wat; g.fillRect(0, 480, W, H - 480);
  for (let i = 0; i < 6; i++) txt('🪷', (i * 131 + 50) % W, 500 + (i * 47) % 60, 22, '#fff');
  for (const p of S.pops) if (p.spot[2] === 'water') drawPop(p);
  g.fillStyle = '#3a7f94cc'; for (const s of SPOTS) if (s[2] === 'water') { g.beginPath(); g.ellipse(s[0], s[1] + 28, 54, 12, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#22566a'; g.fillRect(0, 640, W, H - 640);
  // boat bow + kid with camera
  g.fillStyle = '#f2f2f2'; g.beginPath(); g.moveTo(W / 2 - 200, H); g.quadraticCurveTo(W / 2 - 160, 690, W / 2, 668); g.quadraticCurveTo(W / 2 + 160, 690, W / 2 + 200, H); g.fill();
  g.strokeStyle = '#1b3b52'; g.lineWidth = 4; g.stroke(); g.fillStyle = '#ff7a1a'; g.fillRect(W / 2 - 150, 760, 300, 8);
  G.drawKid(W / 2, 740, 1.2); txt('📷', W / 2 + 34, 722, 30, '#000');
  // album strip
  S.album.forEach((p, i) => { const x = 40 + i * 64; rr(x - 26, 780, 52, 44, 8, p.gold ? '#ffe14d' : '#fff'); txt(p.a.emoji, x, 802, 28, '#000'); });
  G.drawWeather(S.t);
  if (S.view) { const { x, y } = S.view; g.strokeStyle = '#fff'; g.lineWidth = 4; for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(x + sx * 50, y + sy * 30); g.lineTo(x + sx * 50, y + sy * 50); g.lineTo(x + sx * 30, y + sy * 50); g.stroke(); } }
  if (S.flash > 0) { g.fillStyle = 'rgba(255,255,255,' + S.flash * 1.6 + ')'; g.fillRect(0, 0, W, H); }
  G.hudBar(S.remi ? '📷 Tap the animals!' : 'Snap the: ' + S.target.word.toUpperCase(), '📷 ' + S.shots + '/' + S.goal + (S.remi ? '' : '  ⏱' + Math.max(0, Math.ceil(S.time))));
}
function drawPop(p) {
  const [x, y] = popXY(p), h = popH(p);
  if (h > .86 && !S.remi) { g.save(); g.globalAlpha = .5; circle(x, y, 44, '#ffe14d'); g.restore(); }
  g.save(); g.translate(x, y); if (p.dir < 0) g.scale(-1, 1); txt(p.a.emoji, 0, 0, 62, '#000'); g.restore();
}
G.modes.safari = { start, update, draw, tap, debug: () => S, repeat() { G.sayNow(S.remi ? 'ph_remi' : 'sn_' + S.target.id); } };
})();
