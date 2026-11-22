'use strict';
/* Dad's boat check: help Dad and Kyle survey a boat. Spot the broken things (Felix 5, Remi 3 big ones),
   Dad ticks his clipboard, then everything gets fixed and the boat is stamped SAFE. Boats rotate: PEGASUS V, a sailing cat, MACKEREL. */
(() => {
const { W, H, T, g, rr, txt, circle, clamp, shuffle } = G;
const LN = {
  bc_intro: "Dad and Kyle need help! Find what's broken on the boat.",
  bc_remi: 'Help Dad check the boat! Tap the broken things.',
  bc_pegasus: 'This is Pegasus Five, a big workboat.',
  bc_cat: 'This is a sailing catamaran. It has two hulls!',
  bc_mackerel: 'This is Mackerel, a little aluminium boat.',
  bc_jacket: "The life jacket's missing! Everyone needs one on a boat.",
  bc_crack: 'A crack! Fix it before it leaks.',
  bc_rust: 'Rusty rail! Give it a scrub and a paint.',
  bc_ext: "The fire extinguisher's needle is in the red. It needs a refill!",
  bc_light: 'A broken light! Boats need lights at night.',
  bc_flag: "A torn flag! Let's get a new one.",
  bc_anchor: "The anchor's gone! Every boat needs an anchor.",
  bc_dinghy: "Uh oh, a hole in the dinghy! Let's patch it.",
  bc_rope: 'A frayed rope! It could snap. Swap it out.',
  bc_ok: "That one's OK! Keep looking.",
  bc_fix: "Righto, let's fix it all up!",
  bc_safe: 'Great survey! This boat is safe to go to sea.'
};
for (const k in LN) if (!G.lineText(k)) window.LINES[k] = LN[k];
const WY = 560, ICON = { jacket: '🦺', crack: '💥', rust: '🟤', ext: '🧯', light: '💡', flag: '🚩', anchor: '⚓', dinghy: '🛶', rope: '🪢' };
const OBVIOUS = ['jacket', 'flag', 'dinghy', 'anchor', 'ext', 'crack'];
const BOATS = [
  { id: 'pegasus', cx: 352, sc: 1.12, emoji: '🚢', slots: { jacket: [-45, -122], crack: [95, -30], rust: [150, -133], ext: [-140, -115], light: [70, -306], flag: [-256, -196], anchor: [252, -72], dinghy: [-20, -240], rope: [-218, -97] } },
  { id: 'cat', cx: 360, sc: 1, emoji: '⛵', slots: { jacket: [30, -100], crack: [-40, -25], rust: [235, -106], ext: [-120, -95], light: [0, -462], flag: [-248, -152], anchor: [255, -40], dinghy: [130, -90], rope: [-238, -80] } },
  { id: 'mackerel', cx: 368, sc: 1.08, emoji: '🚤', slots: { jacket: [25, -108], crack: [60, -28], rust: [185, -112], ext: [-75, -95], light: [-230, -218], flag: [278, -186], anchor: [225, -46], dinghy: [-160, -92], rope: [110, -86] } }
];
let S = null;

function start(run) {
  const remi = G.isRemi(), P = G.prog || {};
  const bi = (P.bcBoat || 0) % BOATS.length; if (G.prog) { G.prog.bcBoat = bi + 1; G.saveProg(); }
  const boat = BOATS[bi], n = remi ? 3 : 5;
  const probs = shuffle(remi ? OBVIOUS : Object.keys(ICON)).slice(0, n);
  const parts = Object.keys(ICON).map(k => ({ k, x: boat.slots[k][0], y: boat.slots[k][1], bad: probs.includes(k), found: false, fixed: false, pop: 0 }));
  S = { run, remi, boat, parts, n, found: [], t: 0, idle: 0, spark: null, bub: null, phase: 'hunt', fixT: 0, stamp: -1, sail: 0, end: false, okSaid: 0 };
  G.setPad('none');
  G.sayNow('bc_' + boat.id, remi ? 'bc_remi' : 'bc_intro');
}
const scl = p => p.bad && S.remi ? 1.35 : 1;
const bob = () => Math.sin(S.t * 1.6) * 4;
function update(dt) {
  if (S.end) return;
  S.t += dt; G.tick(dt);
  for (const p of S.parts) p.pop = Math.max(0, p.pop - dt * 2);
  if (S.bub) { S.bub.t -= dt; if (S.bub.t <= 0) S.bub = null; }
  if (S.phase === 'hunt') {
    S.idle += dt;
    if (S.idle > 12 && !S.spark) { S.spark = S.parts.find(p => p.bad && !p.found); G.say('bd_hint1'); }
  } else if (S.phase === 'fix') {
    const before = Math.floor(S.fixT / .8); S.fixT += dt; const now = Math.floor(S.fixT / .8);
    const q = S.fixQ;
    if (now > before && before >= 0 && before < q.length) { q[before].fixed = true; G.sfx('kick'); G.sfx('star', .1); }
    if (now >= q.length && S.stamp < 0) { S.stamp = 0; G.sfx('drum'); G.jingle(); G.say('bc_safe'); G.skillMark('G:boat safety', true); }
    if (S.stamp >= 0) { S.stamp += dt; if (S.stamp > 2.2) S.sail += dt; if (S.stamp > 5) finish(); }
  }
}
function hit(pt) {
  const ox = S.boat.cx, oy = WY + bob(); let best = null, bd = 1e9;
  for (const p of S.parts) { const d = Math.hypot((pt.x - ox) / S.boat.sc - p.x, (pt.y - oy) / S.boat.sc - p.y), r = 62 * scl(p); if (d < r && d < bd) { bd = d; best = p; } }
  return best;
}
function tap(pt) {
  if (S.end || S.phase !== 'hunt') return;
  if (pt.y > 690 && pt.x < 300) return repeat();
  const p = hit(pt); if (!p) return;
  S.idle = 0;
  if (p.bad && !p.found) {
    p.found = true; p.pop = 1; S.found.push(p.k); if (S.spark === p) S.spark = null;
    S.bub = { e: ICON[p.k], t: 2.2 }; G.sfx('ding');
    G.sayNow('bc_' + p.k);
    if (S.found.length >= S.n) { S.phase = 'fix'; S.fixT = -1.6; S.fixQ = S.found.map(k => S.parts.find(q => q.k === k)); G.say('bc_fix'); }
  } else if (!p.bad) { p.pop = .6; S.bub = { e: '👍', t: 1.4 }; G.sfx('hop'); G.sayNow('bc_ok'); }
}
function finish() {
  if (S.end) return; S.end = true;
  G.showCard('Boat checked! ✅', S.boat.emoji + ' ' + S.found.map(k => ICON[k]).join(' ') + ' 🔧', 'Safe to go to sea!', '▶', () => G.stepDone(0));
}
function repeat() { G.sayNow(S.phase === 'hunt' ? (S.remi ? 'bc_remi' : 'bc_intro') : 'bc_safe'); }

/* ---------- boats (side view, bow to the right, origin at the waterline) ---------- */
function hullPath(pts) { g.beginPath(); g.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) pts[i].length === 4 ? g.quadraticCurveTo(...pts[i]) : g.lineTo(...pts[i]); g.closePath(); }
function hull(pts, fill, bands) {
  hullPath(pts); g.fillStyle = fill; g.fill();
  g.save(); hullPath(pts); g.clip(); for (const [y, h, c] of bands) { g.fillStyle = c; g.fillRect(-400, y, 800, h); } g.restore();
  hullPath(pts); g.strokeStyle = '#1b3b52'; g.lineWidth = 4; g.stroke();
}
function line(x1, y1, x2, y2, col, lw) { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function rail(x1, x2, yf, col = '#9aa3a8') { for (let x = x1; x <= x2; x += 36) line(x, yf(x), x, yf(x) - 34, col, 4); g.beginPath(); for (let x = x1; x <= x2; x += 6) g.lineTo(x, yf(x) - 34); g.strokeStyle = col; g.lineWidth = 6; g.stroke(); }
function staff(x, y1, y2) { line(x, y1, x, y2, '#6b4a2a', 5); circle(x, y2, 5, '#ffe14d'); }
function drawPegasus() {
  const sh = x => -90 - Math.max(0, x) ** 2 / 93025 * 38;
  rail(-280, 245, sh);
  hull([[-290, -90], [-290, 10], [-285, 35, -230, 38], [160, 38], [260, 30, 305, -128], [80, -92, -290, -90]], '#fbfbf7', [[-16, 14, '#2f7fd8'], [-2, 60, '#c0392b']]);
  txt('PEGASUS V', -150, -50, 30, '#1b3b52');
  rr(-90, -215, 190, 127, 10, '#fbfbf7', '#1b3b52', 4); for (const x of [-72, -15, 42]) rr(x, -198, 46, 40, 6, '#9fd3f0', '#1b3b52', 2);
  rr(-102, -224, 214, 14, 6, '#1b3b52'); line(70, -224, 70, -296, '#555', 6); line(48, -270, 92, -270, '#555', 4);
  staff(-285, -90, -220); line(-290, -60, -290, -40, '#1b3b52', 3);
}
function drawCat() {
  const pts = [[-280, -70], [-275, 15], [-265, 30, -230, 30], [200, 30], [270, 28, 285, -75], [-280, -70]];
  g.save(); g.translate(-34, -16); hull(pts, '#dfe7ec', [[-10, 8, '#7fb3c8']]); g.restore();
  hull(pts, '#ffffff', [[-12, 10, '#2aa198'], [-2, 40, '#1b3b52']]);
  rr(-170, -172, 250, 102, 30, '#ffffff', '#1b3b52', 4); rr(-145, -152, 200, 26, 12, '#2c4a5e');
  rail(160, 280, () => -72);
  line(0, -172, 0, -452, '#555', 7);
  g.beginPath(); g.moveTo(8, -440); g.lineTo(8, -182); g.lineTo(-190, -182); g.closePath(); g.fillStyle = '#fffdf5'; g.fill(); g.strokeStyle = '#9aa3a8'; g.lineWidth = 3; g.stroke();
  line(-195, -180, 4, -180, '#555', 5);
  g.beginPath(); g.moveTo(12, -420); g.lineTo(262, -82); g.lineTo(60, -190); g.closePath(); g.fillStyle = '#ffe9d6'; g.fill(); g.stroke();
  staff(-276, -70, -175); txt('🐊', -150, -40, 26, '#000');
}
function drawMackerel() {
  const sh = x => -70 - Math.max(0, x) ** 2 / 78400 * 40;
  rail(100, 255, sh, '#b8c0c6');
  hull([[-270, -70], [-268, 10], [-262, 28, -220, 30], [150, 30], [250, 20, 280, -110], [100, -72, -270, -70]], '#cfd6dc', [[-46, 3, '#9aa3a8'], [-8, 3, '#9aa3a8'], [-2, 40, '#8a949c']]);
  for (let x = -250; x < 200; x += 22) { circle(x, -40, 2, '#7d868d'); circle(x, -2, 2, '#7d868d'); }
  txt('MACKEREL', -140, -24, 26, '#1b3b52');
  rr(-12, -152, 74, 82, 8, '#e8ecef', '#1b3b52', 3); g.beginPath(); g.moveTo(-8, -152); g.lineTo(8, -186); g.lineTo(58, -186); g.lineTo(58, -152); g.fillStyle = '#9fd3f088'; g.fill(); g.stroke();
  rr(-322, -116, 56, 70, 12, '#15181b'); rr(-302, -50, 16, 66, 4, '#15181b'); txt('90', -294, -94, 14, '#d33');
  line(-230, -70, -230, -208, '#9aa3a8', 5); staff(250, sh(250), -205);
}
const DRAW = { pegasus: drawPegasus, cat: drawCat, mackerel: drawMackerel };

/* ---------- the parts: each drawn fine or broken ---------- */
function vest(a) { g.beginPath(); g.moveTo(-20, -26); g.lineTo(-8, -26); g.lineTo(0, -12); g.lineTo(8, -26); g.lineTo(20, -26); g.lineTo(22, 24); g.lineTo(-22, 24); g.closePath(); if (a) { g.fillStyle = '#ff7a1a'; g.fill(); g.strokeStyle = '#a84a00'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#eee'; g.fillRect(-21, 0, 42, 5); g.fillRect(-21, 12, 42, 5); } else { g.setLineDash([5, 5]); g.strokeStyle = '#00000055'; g.lineWidth = 2; g.stroke(); g.setLineDash([]); } }
function part(p) {
  const bad = p.bad && !p.fixed, t = S.t;
  switch (p.k) {
    case 'jacket': vest(!bad); line(0, -40, 0, -30, '#555', 4); g.beginPath(); g.arc(-5, -30, 5, 0, Math.PI); g.stroke(); circle(0, -40, 4, '#555'); break;
    case 'crack':
      if (!bad) { circle(0, 0, 17, '#1b3b52'); circle(0, 0, 12, '#9fd3f0'); circle(-4, -4, 3, '#fff'); break; }
      g.beginPath(); [[-38, -14], [-22, -3], [-12, -17], [2, 0], [12, -9], [26, 8], [38, 1]].forEach(q => g.lineTo(...q)); g.strokeStyle = '#222'; g.lineWidth = 5; g.stroke();
      line(2, 0, 6, 14, '#222', 3); circle(6, 18 + (t * 20) % 22, 4, '#2f9be0'); break;
    case 'rust':
      if (bad) { for (const [x, y, r] of [[-40, 2, 9], [-14, -2, 7], [10, 3, 10], [36, -1, 8], [24, 10, 5]]) { g.beginPath(); g.ellipse(x, y, r * 1.3, r * .8, x, 0, Math.PI * 2); g.fillStyle = '#7a3a12'; g.fill(); circle(x + 2, y - 1, r * .5, '#c0602a'); } line(10, 10, 10, 26, '#9a4a1aaa', 3); }
      else for (const x of [-34, 0, 30]) line(x - 6, -2, x + 6, -2, '#ffffffdd', 3);
      break;
    case 'ext':
      g.beginPath(); g.moveTo(8, -26); g.quadraticCurveTo(24, -24, 20, 4); g.strokeStyle = '#222'; g.lineWidth = 3; g.stroke();
      rr(-14, -24, 28, 50, 9, '#d62d20', '#7a1410', 2); rr(-6, -33, 12, 10, 2, '#333');
      circle(0, -6, 12, '#fff'); g.lineWidth = 5;
      g.strokeStyle = '#e53935'; g.beginPath(); g.arc(0, -6, 8, Math.PI, Math.PI * 1.45); g.stroke();
      g.strokeStyle = '#43a047'; g.beginPath(); g.arc(0, -6, 8, Math.PI * 1.55, Math.PI * 2); g.stroke();
      { const a = bad ? Math.PI * 1.12 : Math.PI * 1.8; line(0, -6, Math.cos(a) * 10, -6 + Math.sin(a) * 10, '#111', 2.5); } circle(0, -6, 2.5, '#111'); break;
    case 'light':
      if (bad) g.rotate(.45);
      rr(-14, -16, 28, 26, 6, '#444');
      if (!bad) { g.globalAlpha = .3 + Math.sin(t * 4) * .1; circle(0, -3, 22, '#4dff6a'); g.globalAlpha = 1; circle(0, -3, 9, '#3ddc57'); circle(-3, -6, 3, '#d8ffe0'); }
      else { circle(0, -3, 9, '#6b6b6b'); line(-6, -9, 2, -1, '#ddd', 2); line(2, -1, -2, 5, '#ddd', 2); if ((t % 1.3) < .18) txt('⚡', 16, -18, 18, '#000'); }
      break;
    case 'flag': {
      g.beginPath();
      if (!bad) { for (let x = -28; x <= 28; x += 4) g.lineTo(x, -19 + Math.sin(t * 4 + x * .12) * 3); for (let x = 28; x >= -28; x -= 4) g.lineTo(x, 19 + Math.sin(t * 4 + x * .12) * 3); }
      else [[-28, -19], [8, -19], [18, -9], [4, -4], [22, 4], [2, 9], [10, 19], [-28, 19]].forEach(q => g.lineTo(...q));
      g.closePath(); g.fillStyle = '#2f7fd8'; g.fill(); g.strokeStyle = '#1b3b52'; g.lineWidth = 2; g.stroke();
      txt('★', -12, 0, 20, '#ffe14d');
      if (bad) { line(18, -9, 24, -2, '#2f7fd8', 2); line(10, 19, 14, 27, '#2f7fd8', 2); }
      break;
    }
    case 'anchor':
      rr(-22, -30, 44, 8, 3, '#777'); rr(-22, -30, 7, 22, 3, '#777'); rr(15, -30, 7, 22, 3, '#777');
      if (bad) { g.setLineDash([4, 5]); g.strokeStyle = '#00000044'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -18); g.lineTo(0, 18); g.arc(0, 4, 16, Math.PI * .5, Math.PI * .9); g.stroke(); g.setLineDash([]); break; }
      g.strokeStyle = '#3a3f44'; g.lineWidth = 3; g.beginPath(); g.arc(0, -22, 5, 0, Math.PI * 2); g.stroke();
      line(0, -17, 0, 20, '#3a3f44', 6); line(-12, -10, 12, -10, '#3a3f44', 5);
      g.beginPath(); g.arc(0, 4, 18, .25, Math.PI - .25); g.lineWidth = 6; g.stroke(); break;
    case 'dinghy':
      rr(-50, 6, 100, 12, 6, '#555');
      if (!bad) { rr(-56, -14, 112, 28, 14, '#ff7a1a', '#a84a00', 2); line(-40, -8, 30, -8, '#ffffff88', 3); }
      else {
        g.beginPath(); g.moveTo(-42, -14); g.lineTo(20, -14); g.quadraticCurveTo(46, -10, 56, 14); g.lineTo(-42, 14); g.arc(-42, 0, 14, Math.PI / 2, Math.PI * 1.5); g.fillStyle = '#e8701a'; g.fill(); g.strokeStyle = '#a84a00'; g.lineWidth = 2; g.stroke();
        g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = i % 2 ? 5 : 10; g.lineTo(6 + Math.cos(a) * r, -1 + Math.sin(a) * r); } g.fillStyle = '#111'; g.fill();
        for (let i = 0; i < 3; i++) { const k = (t * 1.5 + i / 3) % 1; g.globalAlpha = 1 - k; g.strokeStyle = '#888'; g.lineWidth = 2; g.beginPath(); g.arc(14 + k * 26, -10 - k * 26, 5, 0, Math.PI); g.stroke(); } g.globalAlpha = 1;
      }
      break;
    case 'rope':
      for (const [rx, ry] of [[28, 10], [21, 7], [14, 4]]) { g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.strokeStyle = '#c9a66b'; g.lineWidth = 5; g.stroke(); }
      if (!bad) { line(24, 4, 46, -4, '#c9a66b', 5); line(42, -3, 47, -5, '#5e3b19', 6); }
      else { line(24, 4, 38, -1, '#c9a66b', 5); line(38, -1, 44, -3, '#c9a66b', 2); for (const a of [-.9, -.45, 0, .45, .9]) line(44, -3, 44 + Math.cos(a - .3) * 14, -3 + Math.sin(a - .3) * 14, '#b58f55', 2); }
      break;
  }
}

/* ---------- scene ---------- */
function draw() {
  const sky = g.createLinearGradient(0, T, 0, WY); sky.addColorStop(0, '#7cc6ec'); sky.addColorStop(1, '#e6f6fb');
  g.fillStyle = sky; g.fillRect(0, 0, W, H); circle(600, 130, 34, '#fff3b0');
  for (const [x, y] of [[120, 140], [430, 110]]) { circle(x, y, 22, '#fff'); circle(x + 26, y - 8, 26, '#fff'); circle(x + 54, y, 20, '#fff'); }
  const b = S.boat, sx = b.cx + S.sail * S.sail * 160, sy = WY + bob();
  g.save(); g.translate(sx, sy); g.rotate(Math.sin(S.t * 1.2) * .012); g.scale(b.sc, b.sc);
  DRAW[b.id]();
  for (const p of S.parts) {
    const sc = scl(p) * (1 + p.pop * .25);
    if (S.spark === p) { g.save(); g.globalAlpha = .35 + Math.sin(S.t * 6) * .2; circle(p.x, p.y, 54 * scl(p), '#ffe14d'); g.restore(); for (let i = 0; i < 4; i++) { const a = S.t * 2 + i * Math.PI / 2; txt('✨', p.x + Math.cos(a) * 58, p.y + Math.sin(a) * 58, 24, '#000'); } }
    g.save(); g.translate(p.x, p.y); g.scale(sc, sc); part(p); g.restore();
    if (p.found && !p.fixed) { g.strokeStyle = '#e53935'; g.lineWidth = 6; g.beginPath(); g.arc(p.x, p.y, (46 + p.pop * 14) * scl(p), 0, Math.PI * 2); g.stroke(); }
  }
  if (S.phase === 'fix' && S.fixT >= 0) {
    const q = S.fixQ, cur = q[Math.floor(S.fixT / .8)];
    if (cur) { g.save(); g.translate(cur.x + 24, cur.y - 24); circle(0, 0, 34, '#ffe14d'); g.rotate(Math.sin(S.t * 18) * .6); txt('🔧', 0, 0, 56, '#000'); g.restore(); }
    for (const p of q) if (p.fixed && S.stamp < 1.5) txt('✨', p.x - 30, p.y - 30, 22, '#000');
  }
  g.restore();
  // sea in front of the hull
  const sea = g.createLinearGradient(0, WY, 0, 690); sea.addColorStop(0, '#3a9cc2dd'); sea.addColorStop(1, '#1d5f86');
  g.fillStyle = sea; g.beginPath(); g.moveTo(0, 690); for (let x = 0; x <= W; x += 16) g.lineTo(x, WY + 6 + Math.sin(x * .03 + S.t * 2) * 4); g.lineTo(W, 690); g.fill();
  if (S.sail > 0) for (let i = 0; i < 6; i++) circle(sx - 300 - i * 30, WY + 8 + Math.sin(i + S.t * 8) * 3, 10 - i, '#ffffffcc');
  // wharf with Dad, Kyle and the kid
  g.fillStyle = '#8a5a32'; g.fillRect(0, 690, W, H - 690); g.strokeStyle = '#6b4424'; g.lineWidth = 3;
  for (let y = 712; y < H; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  rr(0, 684, W, 12, 4, '#a8754a');
  const talk = G.speaking() ? Math.sin(S.t * 12) * 3 : 0;
  txt('👨', 62, 748 + talk, 66, '#000'); txt('👩‍💼', 150, 752, 58, '#000'); G.drawKid(232, 760, 1.3);
  if (S.bub) { rr(40, 628, 80, 56, 18, '#fff', '#1b3b52', 3); txt(S.bub.e, 80, 656, 34, '#000'); }
  drawClipboard();
  if (S.stamp >= 0) {
    const k = clamp(S.stamp * 4, 0, 1), sc = 2.2 - k * 1.2;
    g.save(); g.translate(W / 2, 330); g.rotate(-.18); g.scale(sc, sc); g.globalAlpha = k;
    rr(-150, -52, 300, 104, 18, '#ffffffcc', '#2e9d43', 8); txt('SAFE ✅', 0, 4, 60, '#2e9d43'); g.restore();
  }
  G.hudBar('👨 🔍 ' + b.emoji, '✅ ' + S.found.length + '/' + S.n);
  if (S.t < 5 && S.phase === 'hunt') G.hint('🔍 👆 ' + (S.remi ? '🦺 🚩 🛶' : '💥 🧯 🚩 ⚓ 🪢') + ' → ✅');
}
function drawClipboard() {
  const x = 330, y = 700, w = 360, n = S.n, bw = 58, gap = (w - 40 - n * bw) / (n - 1 || 1);
  rr(x, y, w, 124, 12, '#b07a45', '#5e3b19', 3); rr(x + 10, y + 12, w - 20, 104, 6, '#fffdf5'); rr(x + w / 2 - 30, y - 6, 60, 18, 5, '#9aa3a8', '#555', 2);
  for (let i = 0; i < n; i++) {
    const bx = x + 20 + i * (bw + gap), by = y + 34, k = S.found[i];
    rr(bx, by, bw, bw, 8, k ? '#e8f8ea' : '#fff', '#1b3b52', 3);
    if (k) { txt(ICON[k], bx + bw / 2, by + bw / 2 + 2, 32, '#000'); txt('✔', bx + bw - 6, by + 8, 30, '#2e9d43'); }
  }
}
G.modes.check = { start, update, draw, tap, repeat, debug: () => S };
})();
