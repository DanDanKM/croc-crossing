'use strict';
/* Robo-Croc code: arrow programs on a grid (Bee-Bot style), then loops 🔁, fix-the-bug 🐞, and "teach the robot" (AI literacy).
   Felix: 3 path levels + a loop or bug level + teach. Remi: 2 tiny path levels + teach. Difficulty from G.prog.code (a level number). */
(() => {
const { W, H, T, g, rr, txt, fitTxt, circle, rnd, pick, shuffle, clamp } = G;
const DIRS = { up: [0, -1, -Math.PI / 2], down: [0, 1, Math.PI / 2], left: [-1, 0, Math.PI], right: [1, 0, 0] };
const DCOL = { up: '#2fae4a', down: '#2f7fd8', left: '#b45bd6', right: '#ff7a1a', loop: '#f5b301' };
const CYCLE = ['up', 'right', 'down', 'left'];
const ITEMS = [['fish', 'yum', ['🐟', '🐠', '🐡']], ['squid', 'yum', ['🦑']], ['crab', 'yum', ['🦀']], ['prawn', 'yum', ['🦐']],
  ['bottle', 'no', ['🧴']], ['can', 'no', ['🥫']], ['bag', 'no', ['🛍️']], ['thong', 'no', ['🩴']]];
const GY = 124, GH = 432, SY = 566, BY = 680, BH = 136; // grid top/height, program strip, button tray
const RX = 190, RY = 470, BIN = [630, 590];               // teach: robot centre, bin
let S = null;

const later = (t, fn) => S.q.push({ t, fn });
const key = (c, r) => c + ',' + r;
const ease = f => f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
const inR = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

function start() {
  const remi = G.isRemi(), d = G.prog.code || 0;
  const special = d >= 4 && Math.floor(d / 4) % 2 === 1 ? 'loop' : 'bug';
  const levels = remi ? ['path', 'path', 'teach'] : ['path', 'path', 'path', special, 'teach'];
  S = { remi, t: 0, levels, li: -1, q: [], fish: 0, parts: [], shake: 0, chompT: 0, nod: 0, end: false, saidGo: false, prompt: ['cd_intro'], lastRocks: 0, mode: 'path' };
  G.setPad('none');
  nextLevel();
}
function nextLevel() {
  S.li++; S.q = []; S.exec = null; S.busy = false;
  if (S.li >= S.levels.length) return finish();
  const kind = S.levels[S.li];
  if (kind === 'teach') return startTeach();
  setupLevel(kind);
}

/* ---------- level generation ---------- */
function gen(cols, rows, o) {
  for (let k = 0; k < 400; k++) {
    let h, v;
    if (o.h !== undefined) { [h, v] = Math.random() < .5 ? [o.h, o.v] : [o.v, o.h]; } // loop levels: straight leg first
    else if (o.segs === 1) { h = Math.random() < .5 ? o.n : 0; v = o.n - h; } else { h = G.ri(1, o.n - 1); v = o.n - h; }
    if (h >= cols || v >= rows) continue;
    const sx = pick([1, -1]), sy = pick([1, -1]);
    const c0 = sx > 0 ? G.ri(0, cols - 1 - h) : G.ri(h, cols - 1), r0 = sy > 0 ? G.ri(0, rows - 1 - v) : G.ri(v, rows - 1);
    const mh = Array(h).fill(sx > 0 ? 'right' : 'left'), mv = Array(v).fill(sy > 0 ? 'down' : 'up');
    let sol = o.h !== undefined ? (o.h === h ? mh.concat(mv) : mv.concat(mh)) : Math.random() < .5 ? mh.concat(mv) : mv.concat(mh);
    if (o.segs >= 3) sol = shuffle(sol);
    const path = [[c0, r0]]; let c = c0, r = r0;
    for (const m of sol) { c += DIRS[m][0]; r += DIRS[m][1]; path.push([c, r]); }
    const onPath = new Set(path.map(p => key(...p))), box = [], other = [];
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) if (!onPath.has(key(x, y)))
      (x >= Math.min(c0, c) && x <= Math.max(c0, c) && y >= Math.min(r0, r) && y <= Math.max(r0, r) ? box : other).push(key(x, y));
    const nb = Math.min(o.rocks || 0, Math.ceil(box.length / 2));
    const rocks = new Set(shuffle(box).slice(0, nb).concat(shuffle(other).slice(0, (o.rocks || 0) - nb)));
    return { cols, rows, start: { c: c0, r: r0 }, goal: { c, r }, path, rocks, sol, ang: DIRS[sol[0]][2] };
  }
}
function setupLevel(kind) {
  const d = G.prog.code || 0, remi = S.remi;
  let L, cols = 6, rows = 6;
  if (remi) { cols = rows = 4; const n = S.li === 0 ? 1 : 2; L = gen(4, 4, { n, segs: n > 1 && d >= 4 ? 2 : 1 }); L.cap = 4; }
  else if (kind === 'loop') {
    const a = d < 12 ? 4 : G.ri(3, 5), b = d < 12 ? 0 : G.ri(2, 3);
    L = gen(6, 6, { h: a, v: b }); L.cap = (a > 1 ? 2 : 1) + (b > 1 ? 2 : b); L.loopOk = true;
  } else if (kind === 'bug') {
    const n = clamp(3 + Math.floor(d / 4), 3, 6);
    L = gen(6, 6, { n, segs: d < 2 ? 2 : 3, rocks: d < 3 ? 0 : 2 }); L.cap = n;
  } else {
    const n = clamp(2 + Math.floor(d / 2), 2, 7), rocks = d < 3 ? 0 : clamp(1 + Math.floor((d - 3) / 2), 1, 6);
    L = gen(6, 6, { n, segs: d < 2 ? 1 : d < 5 ? 2 : 3, rocks }); L.cap = Math.min(9, n + 3);
  }
  L.kind = kind; L.ts = Math.min(remi ? 100 : 72, Math.floor(GH / rows), Math.floor(600 / cols));
  L.ox = (W - cols * L.ts) / 2; L.oy = GY + (GH - rows * L.ts) / 2;
  S.L = L; S.mode = 'path'; S.pos = { ...L.start }; S.ang = L.ang; S.fails = 0; S.help = false; S.ate = false;
  S.prog = []; S.bugAt = -1;
  if (kind === 'bug') {
    S.prog = L.sol.map(k => ({ k })); S.bugAt = G.ri(0, S.prog.length - 1);
    S.prog[S.bugAt].k = pick(CYCLE.filter(k => k !== L.sol[S.bugAt]));
  }
  S.prompt = kind === 'bug' ? ['cd_bug'] : kind === 'loop' ? ['cd_loop', 'cd_loophow'] : L.rocks.size && !S.lastRocks ? ['cd_rocks'] : S.li === 0 ? ['cd_intro'] : ['cd_level'];
  S.lastRocks = L.rocks.size;
  G.sayNow(S.prompt);
  S.btns = buttons();
}
function buttons() {
  const y = BY, h = BH, b = (id, x, w) => ({ id, x, y, w, h });
  if (S.L.kind === 'bug') return [b('play', 232, 240)];
  if (S.remi) return [b('left', 12, 104), b('up', 124, 104), b('down', 236, 104), b('right', 348, 104), b('clear', 464, 96), b('play', 572, 120)];
  const out = [b('left', 12, 92), b('up', 110, 92), b('down', 208, 92), b('right', 306, 92)];
  if (S.L.loopOk) out.push(b('loop', 410, 92));
  return out.concat([b('clear', 512, 80), b('play', 600, 96)]);
}
function slots() {
  const cap = S.L.cap, sw = Math.min(84, Math.floor(660 / cap) - 8), x0 = W / 2 - (cap * (sw + 8) - 8) / 2;
  return Array.from({ length: cap }, (_, i) => ({ x: x0 + i * (sw + 8), y: SY + 8, w: sw, h: 84 }));
}

/* ---------- programming + running ---------- */
function add(k) {
  if (S.busy || S.exec || S.L.kind === 'bug') return;
  const last = S.prog[S.prog.length - 1];
  const lastLoop = [...S.prog].reverse().find(s => s.k === 'loop');
  // tapping 🔁 again adds a repeat: to a loop that's still waiting for its arrow, or (when the program is full) to the last loop
  if (k === 'loop' && lastLoop && (last === lastLoop || S.prog.length >= S.L.cap)) return bumpLoop(lastLoop);
  if (S.prog.length >= S.L.cap) { G.sfx('bump'); G.sayNow(S.L.loopOk ? 'cd_full' : 'cd_room'); return; }
  S.prog.push(k === 'loop' ? { k, n: 2 } : { k }); G.sfx('hop');
  if (!S.saidGo && S.prog.length >= S.L.sol.length) { S.saidGo = true; G.say('cd_go'); }
}
function bumpLoop(s) { s.n = s.n >= 6 ? 2 : s.n + 1; G.sfx('hop'); G.sayNow('n_' + s.n); }
function expand(prog) {
  const out = [];
  for (let i = 0; i < prog.length; i++) {
    const s = prog[i];
    if (s.k !== 'loop') { out.push({ d: s.k, si: i }); continue; }
    const nx = prog[i + 1]; if (!nx || nx.k === 'loop') continue;
    for (let r = 0; r < s.n; r++) out.push({ d: nx.k, si: i + 1, li: i, r });
    i++;
  }
  return out;
}
function run() {
  if (S.busy || S.exec) return;
  if (!S.prog.length || !expand(S.prog).length) { G.sfx('bump'); G.sayNow('cd_empty'); return; }
  S.exec = { moves: expand(S.prog), mi: -1 }; nextMove();
}
function nextMove() {
  const E = S.exec, L = S.L; E.mi++;
  if (E.mi >= E.moves.length) return fail('cd_short');
  const m = E.moves[E.mi], [dx, dy, a] = DIRS[m.d], c = S.pos.c + dx, r = S.pos.r + dy;
  S.ang = a; E.from = { ...S.pos }; E.to = { c, r }; E.t = 0; E.bonked = false;
  E.bonk = c < 0 || r < 0 || c >= L.cols || r >= L.rows || L.rocks.has(key(c, r));
  G.sfx('hop');
}
function fail(k) {
  S.exec = null; S.busy = true; S.fails++; if (S.fails >= (S.remi ? 1 : 2)) S.help = true;
  G.sayNow(k, k === 'cd_short' && S.prog.some(s => s.k === 'loop') ? 'cd_more' : []);
  later(1.5, () => { S.pos = { ...S.L.start }; S.ang = S.L.ang; S.busy = false; G.sfx('whoosh'); });
}
function win() {
  S.exec = null; S.busy = true; S.ate = true; S.chompT = .9; S.fish++;
  G.sfx('chomp'); G.jingle();
  G.skillMark('G:coding', S.fails === 0);
  G.prog.code = (G.prog.code || 0) + 1; G.saveProg();
  const [x, y] = tileXY(S.L.goal.c, S.L.goal.r);
  for (let i = 0; i < 14; i++) S.parts.push({ x, y, vx: rnd(-160, 160), vy: rnd(-260, -60), life: rnd(.8, 1.4), e: pick(['⭐', '✨', '🐟']) });
  G.sayNow(S.L.kind === 'bug' ? 'cd_squash' : 'cd_yum', S.fails === 0 ? pick(['great_', 'super_']) + G.player.toLowerCase() : null);
  later(2.6, nextLevel);
}

/* ---------- teach the robot ---------- */
function startTeach() {
  const remi = S.remi, n = remi ? 2 : 3, it = c => ({ cat: c[0], truth: c[1], e: c[2][0], vars: c[2] });
  const food = shuffle(ITEMS.filter(i => i[1] === 'yum')).map(it), rub = shuffle(ITEMS.filter(i => i[1] === 'no')).map(it);
  const taught = shuffle(food.slice(0, n).concat(rub.slice(0, n))), fresh = pick([food[n], rub[n]]);
  const test = shuffle(shuffle(taught).slice(0, remi ? 2 : 3).concat([fresh])).map(x => ({ ...x, e: pick(x.vars) }));
  S.mode = 'teach'; S.q = [];
  S.tc = { phase: 'teach', list: taught, testList: test, i: 0, mem: {}, memList: [], results: [], item: null, think: null, retaught: false, teachOk: true };
  S.prompt = ['cd_teach', 'cd_yumno'];
  G.sayNow('cd_teach'); later(.5, showItem);
}
function showItem() {
  const tc = S.tc, x = tc.list[tc.i];
  tc.item = { ...x, s: 0, fly: null };
  G.say('cd_i_' + x.cat, tc.i === 0 ? 'cd_yumno' : null);
}
const memXY = i => [72 + (i % 4) * 92, 176 + Math.floor(i / 4) * 64];
function label(lab) {
  const tc = S.tc, it = tc.item; if (tc.phase !== 'teach' || !it || it.fly || it.s < .8) return;
  tc.mem[it.cat] = lab; if (lab !== it.truth && !tc.retaught) tc.teachOk = false;
  tc.memList.push({ e: it.e, cat: it.cat, lab });
  const [x1, y1] = memXY(tc.memList.length - 1);
  it.fly = { t: 0, x1, y1, s1: .35 }; G.sfx('star'); S.nod = .5;
  later(.65, () => { tc.item = null; tc.i++; tc.i < tc.list.length ? showItem() : startTest(); });
}
function startTest() {
  const tc = S.tc; if (!tc.retaught) G.skillMark('G:teach robot', tc.teachOk);
  tc.phase = 'test'; tc.i = 0; tc.results = []; S.prompt = ['cd_test'];
  G.say('cd_test'); later(1.6, testItem);
}
function testItem() {
  const tc = S.tc, x = tc.testList[tc.i], known = tc.mem[x.cat];
  tc.item = { ...x, s: 0, fly: null }; tc.think = known ? tc.memList.findIndex(m => m.cat === x.cat) : -1;
  G.say('cd_i_' + x.cat, known ? null : 'cd_think');
  later(known ? 1.7 : 2.5, () => {
    const guess = known || pick(['yum', 'no']), it = tc.item;
    it.fly = guess === 'yum' ? { t: 0, x1: RX + 120, y1: RY, s1: .2 } : { t: 0, x1: BIN[0], y1: BIN[1] - 10, s1: .3 };
    if (guess === 'yum') { S.chompT = .9; G.sfx('chomp', .35); } else G.sfx('whoosh');
    G.say(guess === 'yum' ? 'cd_ryum' : 'cd_rno');
    later(1.2, () => {
      const ok = guess === it.truth; tc.results.push({ e: it.e, ok, x: it });
      G.sfx(ok ? 'ding' : 'bump'); if (!ok) G.say('cd_oops');
      tc.item = null; tc.think = null; tc.i++;
      later(1.5, tc.i < tc.testList.length ? testItem : endTest);
    });
  });
}
function endTest() {
  const tc = S.tc, wrong = tc.results.filter(r => !r.ok);
  if (!wrong.length) { G.say('cd_smart', 'cd_learn'); return later(3.4, finish); }
  if (tc.retaught) { G.say('cd_learn'); return later(3, finish); }
  tc.retaught = true; G.say('cd_learn', 'cd_again');
  const cats = [...new Set(wrong.map(r => r.x.cat))];
  tc.list = cats.map(c => wrong.find(r => r.x.cat === c).x);
  tc.testList = shuffle(tc.list.map(x => ({ ...x })));
  cats.forEach(c => delete tc.mem[c]); tc.memList = tc.memList.filter(m => !cats.includes(m.cat));
  tc.phase = 'teach'; tc.i = 0; S.prompt = ['cd_again', 'cd_yumno'];
  later(3.2, () => { tc.results = []; showItem(); });
}
function finish() {
  if (S.end) return; S.end = true;
  const tc = S.tc, ok = tc && tc.results.length && tc.results.every(r => r.ok);
  G.say('cd_done');
  G.showCard('Robo-Croc! 🤖', '🐟'.repeat(Math.max(1, S.fish)) + '\n🤖🧠' + (ok ? '✅' : '👍'), 'Top coding and robot teaching!', '▶', () => G.stepDone(0));
}

/* ---------- loop ---------- */
function update(dt) {
  if (S.end) return;
  S.t += dt; G.tick(dt);
  S.shake = Math.max(0, S.shake - dt); S.chompT = Math.max(0, S.chompT - dt); S.nod = Math.max(0, S.nod - dt);
  for (const p of S.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.life -= dt; } S.parts = S.parts.filter(p => p.life > 0);
  const due = S.q.filter(e => (e.t -= dt) <= 0); S.q = S.q.filter(e => e.t > 0); due.forEach(e => e.fn());
  if (S.end) return;
  if (S.mode === 'teach') { const it = S.tc.item; if (it) { it.s = Math.min(1, it.s + dt * 3.5); if (it.fly) it.fly.t = Math.min(1, it.fly.t + dt * 2); } return; }
  const E = S.exec; if (!E) return;
  E.t += dt / (S.remi ? .6 : .45);
  if (E.bonk && !E.bonked && E.t >= .5) { E.bonked = true; G.sfx('bonk'); S.shake = .35; }
  if (E.t < 1) return;
  if (E.bonk) return fail('cd_bonk');
  S.pos = E.to;
  if (S.pos.c === S.L.goal.c && S.pos.r === S.L.goal.r) return win();
  nextMove();
}
function tap(p) {
  if (S.end) return;
  if (S.mode === 'teach') {
    if (S.tc.phase !== 'teach') return;
    if (inR(p, { x: 40, y: 660, w: 300, h: 150 })) label('yum'); else if (inR(p, { x: 364, y: 660, w: 300, h: 150 })) label('no');
    return;
  }
  for (const b of S.btns) if (inR(p, b)) { if (b.id === 'play') run(); else if (b.id === 'clear') { if (!S.busy && !S.exec && S.prog.length) { S.prog = []; G.sfx('whoosh'); } } else add(b.id); return; }
  if (S.busy || S.exec) return;
  slots().forEach((r, i) => {
    if (!inR(p, r) || !S.prog[i]) return;
    if (S.L.kind === 'bug') { const s = S.prog[i]; s.k = CYCLE[(CYCLE.indexOf(s.k) + 1) % 4]; G.sfx('hop'); }
    else if (S.prog[i].k === 'loop') bumpLoop(S.prog[i]); // tap a loop block: one more repeat
    else { S.prog.splice(i, 1); G.sfx('bump'); }
  });
}
function press(k) {
  if (S.end) return;
  if (S.mode === 'teach') { if (k === 'left') label('yum'); if (k === 'right') label('no'); return; }
  if (k === 'act') run(); else if (DIRS[k]) add(k);
}

/* ---------- drawing ---------- */
const tileXY = (c, r) => [S.L.ox + c * S.L.ts + S.L.ts / 2, S.L.oy + r * S.L.ts + S.L.ts / 2];
function arrow(x, y, s, d, col = '#fff') {
  g.save(); g.translate(x, y); g.rotate(DIRS[d][2]); g.beginPath();
  g.moveTo(s * .5, 0); g.lineTo(0, -s * .45); g.lineTo(0, -s * .18); g.lineTo(-s * .5, -s * .18); g.lineTo(-s * .5, s * .18); g.lineTo(0, s * .18); g.lineTo(0, s * .45);
  g.closePath(); g.fillStyle = col; g.fill(); g.restore();
}
function robo(cx, cy, ang, size) {
  const open = S.chompT > 0 ? Math.abs(Math.sin(S.chompT * 11)) * .95 : .12, k = size / (2.5 * T);
  g.save(); g.translate(cx, cy); g.rotate(ang + Math.sin(S.nod * 25) * S.nod * .3); g.scale(k, k); G.drawCroc(-1.25 * T, -T / 2, 2.5, true, open, 1.25); g.restore();
  const ah = size * .34; g.strokeStyle = '#4a5560'; g.lineWidth = Math.max(2, size * .025);
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - ah); g.stroke();
  rr(cx - size * .07, cy - size * .07, size * .14, size * .14, 4, '#aab6c0', '#4a5560', 2);
  circle(cx, cy - ah, size * .055, Math.sin(S.t * 6) > 0 ? '#ff3b3b' : '#ffd0d0');
}
function bg() {
  const sky = g.createLinearGradient(0, T, 0, H); sky.addColorStop(0, '#2a8fa8'); sky.addColorStop(1, '#16546a');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 14; i++) txt('〰️', (i * 113 + S.t * 12) % (W + 60) - 30, 130 + (i * 89) % 420, 18, '#fff');
}
function draw() {
  if (!S) return;
  bg();
  if (S.mode === 'teach') drawTeach(); else drawPath();
  for (const p of S.parts) { g.globalAlpha = Math.min(1, p.life); txt(p.e, p.x, p.y, 30, '#000'); g.globalAlpha = 1; }
  G.hudBar('🤖 Robo-Croc', (Math.min(S.li, S.levels.length - 1) + 1) + '/' + S.levels.length);
  if (S.mode === 'teach') G.hint(S.tc.phase === 'teach' ? '👍 😋      👎 🗑️' : '👀 🤖');
  else G.hint(S.L.kind === 'bug' ? '🐞 👆 ▶' : S.L.loopOk ? '🔁 ➡️ ▶' : '👆 ⬆️ ➡️ ▶');
}
function drawPath() {
  const L = S.L, ts = L.ts, sx = S.shake ? rnd(-6, 6) : 0;
  g.save(); g.translate(sx, 0);
  rr(L.ox - 8, L.oy - 8, L.cols * ts + 16, L.rows * ts + 16, 14, '#6b4a2a');
  for (let c = 0; c < L.cols; c++) for (let r = 0; r < L.rows; r++) rr(L.ox + c * ts + 2, L.oy + r * ts + 2, ts - 4, ts - 4, 8, (c + r) % 2 ? '#e9d8a6' : '#dcc68f');
  if (S.help) L.path.slice(1, -1).forEach(([c, r]) => { const [x, y] = tileXY(c, r); circle(x, y, ts * .12, '#ffe14dcc'); });
  const [sx0, sy0] = tileXY(L.start.c, L.start.r); circle(sx0, sy0, ts * .38, '#ffffff55');
  for (const k of L.rocks) { const [c, r] = k.split(',').map(Number), [x, y] = tileXY(c, r); txt('🪨', x, y + 2, ts * .72, '#000'); }
  const [gx, gy] = tileXY(L.goal.c, L.goal.r); if (!S.ate) txt('🐟', gx, gy + Math.sin(S.t * 4) * 4, ts * .7, '#000');
  let [cx, cy] = tileXY(S.pos.c, S.pos.r); const E = S.exec;
  if (E && E.t > 0) { const f = E.bonk ? (E.t < .5 ? E.t : 1 - E.t) * .8 : ease(Math.min(1, E.t)), [tx, ty] = tileXY(E.to.c, E.to.r), [fx, fy] = tileXY(E.from.c, E.from.r); cx = fx + (tx - fx) * f; cy = fy + (ty - fy) * f; }
  robo(cx, cy, S.ang, ts * 1.2);
  g.restore();
  // program strip
  rr(10, SY, W - 20, 100, 18, '#0b2e22cc');
  const cur = E && E.moves[E.mi];
  slots().forEach((b, i) => {
    const s = S.prog[i], lit = cur && (cur.si === i || cur.li === i), y = b.y - (lit ? 6 : 0);
    if (!s) { rr(b.x, b.y, b.w, b.h, 12, null, '#ffffff55', 3); return; }
    rr(b.x, y, b.w, b.h, 12, DCOL[s.k], lit ? '#ffe14d' : '#00000033', lit ? 6 : 3);
    if (s.k === 'loop') { txt('🔁', b.x + b.w / 2, y + 28, Math.min(30, b.w * .45), '#000'); txt('×' + (lit && cur.li === i ? (cur.r + 1) + '/' : '') + s.n, b.x + b.w / 2, y + 62, Math.min(26, b.w * .38), '#fff'); }
    else arrow(b.x + b.w / 2, y + b.h / 2, Math.min(b.w, b.h) * .62, s.k);
    if (S.help && i === S.bugAt && s.k !== L.sol[i]) txt('🐞', b.x + b.w - 6, y + 6, 26, '#000');
  });
  // button tray
  for (const b of S.btns) {
    const col = b.id === 'play' ? '#22b14c' : b.id === 'clear' ? '#7a8a96' : DCOL[b.id];
    rr(b.x + 3, b.y + 6, b.w, b.h, 22, '#00000044'); rr(b.x, b.y, b.w, b.h, 22, col, '#ffffffaa', 4);
    const mx = b.x + b.w / 2, my = b.y + b.h / 2;
    if (DIRS[b.id]) arrow(mx, my, Math.min(b.w, b.h) * .66, b.id);
    else if (b.id === 'play') { const s = Math.min(b.w, b.h) * .32; g.beginPath(); g.moveTo(mx - s * .7, my - s); g.lineTo(mx + s, my); g.lineTo(mx - s * .7, my + s); g.closePath(); g.fillStyle = '#fff'; g.fill(); }
    else txt(b.id === 'loop' ? '🔁' : '🗑️', mx, my, 44, '#000');
  }
}
function drawTeach() {
  const tc = S.tc;
  // the robot's memory: every example it was taught
  rr(20, 128, 400, 150, 30, '#ffffff', '#cfd8dc', 3); circle(205, 300, 14, '#fff'); circle(222, 330, 9, '#fff');
  if (!tc.memList.length) { g.globalAlpha = .35; txt('🧠', 220, 203, 80, '#000'); g.globalAlpha = 1; }
  tc.memList.forEach((m, i) => {
    const [x, y] = memXY(i), hl = tc.think === i;
    if (hl) circle(x, y, 34, '#ffe14d');
    txt(m.e, x, y, 40, '#000'); txt(m.lab === 'yum' ? '👍' : '👎', x + 26, y + 20, 22, '#000');
  });
  if (tc.phase === 'test' && tc.item && tc.think === -1 && !tc.item.fly) txt('🤔', 330, 205, 70, '#000');
  robo(RX, RY, 0, 280);
  rr(440, 470, 170, 30, 14, '#8a5a32'); g.fillStyle = '#6b4a2a'; g.fillRect(510, 500, 30, 60);
  txt('🗑️', BIN[0], BIN[1], 70, '#000');
  const it = tc.item;
  if (it) {
    let x = 525, y = 410, s = ease(it.s);
    if (it.fly) { const f = ease(it.fly.t); x += (it.fly.x1 - x) * f; y += (it.fly.y1 - y) * f; s *= 1 + (it.fly.s1 - 1) * f; }
    txt(it.e, x, y, 130 * s, '#000');
  }
  if (tc.phase === 'teach') {
    const on = it && !it.fly && it.s > .8;
    [['yum', 40, '#22b14c', '👍', '😋'], ['no', 364, '#e2453c', '👎', '🗑️']].forEach(([id, x, col, a, b]) => {
      g.globalAlpha = on ? 1 : .5; rr(x + 4, 666, 300, 150, 28, '#00000044'); rr(x, 660, 300, 150, 28, col, '#ffffffaa', 5);
      txt(a, x + 105, 735, 84, '#000'); txt(b, x + 215, 735, 60, '#000'); g.globalAlpha = 1;
    });
  } else {
    rr(10, 660, W - 20, 150, 22, '#0b2e22cc');
    const n = tc.testList.length, x0 = W / 2 - (n - 1) * 80;
    tc.testList.forEach((x, i) => { const r = tc.results[i], cx = x0 + i * 160;
      rr(cx - 66, 676, 132, 118, 18, r ? (r.ok ? '#2fae4a' : '#e2453c') : '#ffffff22');
      if (r) { txt(r.e, cx - 22, 735, 52, '#000'); txt(r.ok ? '✅' : '❌', cx + 36, 735, 40, '#000'); } else txt('❔', cx, 735, 44, '#fff'); });
  }
}
G.modes.code = { start, update, draw, tap, press, debug: () => S, repeat() { if (S && !S.end) G.sayNow(S.prompt); } };
})();
