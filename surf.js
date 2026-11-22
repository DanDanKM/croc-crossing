'use strict';
/* Surfing bonus: drag (or ⬆️⬇️) to move on the wave face, tap / 🎣 to jump at the lip.
   Grab the letters in order to spell a beach word. Dodge box jellies; don't let the whitewater catch you. */
(() => {
const { W, H, T, g, rr, txt, fitTxt, circle, rnd, pick, clamp, shuffle, LET, C } = G;
const LIP = 330, TROUGH = 660, PX = 270;
let S = null;

function start(run) {
  S = { run, t: 0, time: 75, y: 480, ty: 480, vy: 0, air: false, spin: 0, curl: 40, slow: 0, items: [], spawn: 0, words: shuffle(C.surfWords).slice(0, 2), wi: 0, li: 0, stars: 0, tricks: 0, wipes: 0, said: {}, end: false, flash: 0 };
  G.setPad('both', '⤴️');
  G.sayNow('bonus_surf', 's_intro', 'spell_' + word());
}
const word = () => S.words[S.wi] || '';
const need = () => word()[S.li] || '';
function jump() { if (!S.air && S.y < LIP + 70) { S.air = true; S.vy = -430; S.spin = 0; G.sfx('whoosh'); } }
function wipe() {
  S.wipes++; S.time -= 4; S.curl = 30; S.y = S.ty = 520; S.air = false; S.flash = .8; G.sfx('splash');
  if ((S.said.wipe = (S.said.wipe || 0) + 1) <= 2) G.sayNow('s_wipe');
}
function update(dt) {
  if (S.end) return;
  S.t += dt; S.time -= dt; G.tick(dt); S.flash = Math.max(0, S.flash - dt);
  if (S.time <= 0) return finish();
  if (G.keys.up) S.ty -= 320 * dt; if (G.keys.down) S.ty += 320 * dt;
  S.ty = clamp(S.ty, LIP + 10, TROUGH - 20);
  if (S.air) {
    S.vy += 900 * dt; S.y += S.vy * dt; S.spin += dt * 9;
    if (S.vy > 0 && S.y >= LIP + 12) { S.air = false; S.y = LIP + 12; S.ty = Math.max(S.ty, S.y); S.tricks++; S.stars += 2; G.sfx('star'); if (S.tricks <= 3) G.say('s_trick'); }
  } else S.y += (S.ty - S.y) * Math.min(1, dt * 8);
  const frac = (S.y - LIP) / (TROUGH - LIP), slowK = S.slow > 0 ? .55 : 1;
  S.slow = Math.max(0, S.slow - dt);
  const spd = (230 + 110 * frac) * slowK;
  S.curl += (frac < .3 ? 46 : -38) * dt + (S.slow > 0 ? 30 * dt : 0);
  S.curl = clamp(S.curl, 20, PX);
  if (S.curl > PX - 26 && !S.air) wipe();
  // items
  S.spawn -= dt;
  if (S.spawn <= 0) {
    S.spawn = rnd(.55, 1.0);
    const r = Math.random(), y = rnd(LIP + 20, TROUGH - 30);
    if (r < .45) S.items.push({ k: 'L', L: Math.random() < .55 ? need() : pick(LET), x: W + 40, y });
    else if (r < .75) S.items.push({ k: 'star', x: W + 40, y });
    else S.items.push({ k: 'jelly', x: W + 40, y: rnd(LIP + 60, TROUGH - 30) });
  }
  for (const it of S.items) {
    it.x -= spd * dt;
    if (it.gone || Math.hypot(it.x - PX, it.y - S.y) > 38) continue;
    it.gone = true;
    if (it.k === 'star') { S.stars++; G.sfx('star'); }
    else if (it.k === 'jelly') { if (!S.air) { S.slow = 1.6; S.time -= 2; G.sfx('bonk'); if (!S.said.jelly) { S.said.jelly = 1; G.sayNow('s_jelly'); } } else it.gone = false; }
    else if (it.L === need()) {
      G.sfx('ding'); S.li++;
      if (S.li >= word().length) { S.stars += 5; G.jingle(); G.sayNow('done_' + word()); S.wi++; S.li = 0; if (S.wi >= S.words.length) return finish(true); G.say('spell_' + word()); }
      else G.sayNow('l_' + it.L);
    } else G.sfx('bump');
  }
  S.items = S.items.filter(i => !i.gone && i.x > -60);
}
function finish(win) {
  if (S.end) return; S.end = true;
  G.say('s_done');
  G.showCard(win ? 'Surf champion! 🏄' : 'What a ride! 🏄', '⭐ ' + S.stars, (S.wi ? 'You spelled ' + S.words.slice(0, S.wi).join(' and ') + '! ' : '') + S.tricks + ' air tricks.', 'Next ▶', () => G.stepDone(0));
}
function draw() {
  const sky = g.createLinearGradient(0, T, 0, LIP); sky.addColorStop(0, '#5fb8f0'); sky.addColorStop(1, '#bfe7fb');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  circle(560, 140, 40, '#ffe066');
  for (let i = 0; i < 3; i++) { const x = (i * 260 - S.t * 12) % (W + 200); g.fillStyle = '#ffffffcc'; g.beginPath(); g.ellipse(x + 100, 120 + i * 30, 50, 16, 0, 0, Math.PI * 2); g.fill(); }
  // far island
  g.fillStyle = '#7fbf5f'; g.beginPath(); g.ellipse(560, LIP - 30, 120, 26, 0, Math.PI, 0); g.fill(); txt('🌴', 540, LIP - 62, 28, '#000');
  // wave body
  const wv = g.createLinearGradient(0, LIP - 30, 0, H); wv.addColorStop(0, '#2fb4d8'); wv.addColorStop(.5, '#1a7fb0'); wv.addColorStop(1, '#0f4f78');
  g.fillStyle = wv; g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) g.lineTo(x, LIP - 20 + Math.sin(x * .02 + S.t * 3) * 6 - Math.max(0, 140 - x) * .5);
  g.lineTo(W, H); g.closePath(); g.fill();
  g.strokeStyle = '#ffffffaa'; g.lineWidth = 5; g.beginPath(); for (let x = 0; x <= W; x += 16) { const y = LIP - 20 + Math.sin(x * .02 + S.t * 3) * 6 - Math.max(0, 140 - x) * .5; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  for (let i = 0; i < 12; i++) { g.strokeStyle = '#ffffff30'; g.lineWidth = 2; const x = (i * 97 - S.t * 200) % W + W, y = LIP + 40 + (i * 61) % 280; g.beginPath(); g.moveTo(x % W, y); g.lineTo(x % W + 30, y); g.stroke(); }
  // whitewater
  for (let i = 0; i < 26; i++) { const yy = LIP - 30 + i * 14, xx = S.curl - 30 + Math.sin(S.t * 6 + i) * 12; g.fillStyle = '#ffffffee'; g.beginPath(); g.arc(xx, yy, 26, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#ffffffdd'; g.fillRect(0, LIP - 50, Math.max(0, S.curl - 40), H);
  // items
  for (const it of S.items) {
    if (it.k === 'L') { const n = it.L === need(); circle(it.x, it.y, 26, '#fffdf5'); g.strokeStyle = n ? '#ffb000' : '#5e3b19'; g.lineWidth = 3; g.beginPath(); g.arc(it.x, it.y, 26, 0, Math.PI * 2); g.stroke(); txt(it.L, it.x, it.y + 2, 32, '#1d2a24'); }
    else if (it.k === 'star') txt('⭐', it.x, it.y, 30, '#fff');
    else txt('🪼', it.x, it.y + Math.sin(S.t * 5 + it.x) * 4, 38, '#fff');
  }
  // surfer
  g.save(); g.translate(PX, S.y); if (S.air) g.rotate(S.spin);
  g.fillStyle = '#ff7a1a'; g.beginPath(); g.ellipse(0, 18, 46, 9, -.12, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
  G.drawKid(0, -14, .95);
  g.restore();
  if (S.flash > 0) { g.fillStyle = 'rgba(255,255,255,' + S.flash * .6 + ')'; g.fillRect(0, 0, W, H); txt('WIPEOUT!', W / 2, 300, 50, '#1a7fb0'); }
  // HUD
  g.fillStyle = '#123b2c'; g.fillRect(0, 0, W, T);
  txt(G.buddyEmoji(), 34, T / 2, 32, '#000');
  const w = word() || '', bw = 40, x0 = W / 2 - w.length * bw / 2 - 20;
  txt('🏄', x0 - 30, T / 2, 30, '#fff');
  for (let i = 0; i < w.length; i++) { const bx = x0 + i * bw; rr(bx, 10, bw - 6, T - 20, 8, i < S.li ? '#3fa34d' : i === S.li ? '#ffe14d' : '#ffffff22'); txt(w[i], bx + (bw - 6) / 2, T / 2 + 2, 26, i === S.li ? '#1d2a24' : '#fff'); }
  txt('⭐' + S.stars + '  ⏱' + Math.max(0, Math.ceil(S.time)), W - 70, T / 2, 20, '#fff', 'right', 700);
  txt('🔊', W - 36, T / 2, 30, '#fff');
  if (S.t < 6) G.hint('⬆️ ⬇️   👆 ⤴️');
}
G.modes.surf = {
  start, update, draw,
  press(k) { if (k === 'act') jump(); },
  pdown(p) { S.drag = p.y; }, pmove(p) { S.ty = clamp(p.y, LIP + 10, TROUGH - 20); },
  tap() { jump(); }, debug: () => S,
  repeat() { G.sayNow('spell_' + word(), 'l_' + need()); }
};
})();
