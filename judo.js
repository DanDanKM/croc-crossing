'use strict';
/* Playful judo with your buddy. Bow first (respect), find the doing word you hear (verbs),
   then tap when the arrow is in the green for a throw. Your buddy rolls and lands safely. Three throws wins. */
(() => {
const { W, H, T, g, rr, txt, fitTxt, circle, rnd, pick, shuffle, clamp, C } = G;
const VE = { push: '👐', pull: '🪢', spin: '🌀', jump: '🦘', roll: '🔄', lift: '🏋️', run: '🏃', kick: '🦵' };
const MAT = 560;
let S = null;
function start() {
  S = { t: 0, phase: 'bow', bow: 0, pts: 0, goal: 3, verb: null, cards: [], arrow: 0, dir: 1, throwT: 0, end: false, missed: false, msg: 0 };
  G.setPad('none');
  G.sayNow('j_intro');
}
function newVerb() {
  const v = G.wpick(C.verbs.filter(x => x !== S.verb), x => 'V:' + x);
  S.verb = v; S.missed = false; S.phase = 'verb';
  S.cards = shuffle([v, ...shuffle(C.verbs.filter(x => x !== v)).slice(0, 2)]);
  G.say('jv_' + v);
}
const cardX = i => W / 2 + (i - 1) * 210;
function tap(p) {
  if (S.end) return;
  if (S.phase === 'bow' || S.phase === 'bowEnd') { if (S.bow <= 0) { S.bow = 1.2; G.sfx('ding'); } return; }
  if (S.phase === 'verb') {
    const i = [0, 1, 2].find(i => Math.abs(p.x - cardX(i)) < 95 && Math.abs(p.y - 300) < 70);
    if (i === undefined) return;
    if (S.cards[i] === S.verb) { G.sfx('ding'); G.skillMark('V:' + S.verb, !S.missed); S.phase = 'time'; S.arrow = 0; G.sayNow('w_' + S.verb, S.pts === 0 ? 'j_time' : null); }
    else { S.missed = true; G.sfx('bonk'); G.sayNow('wrong2', 'jv_' + S.verb); }
    return;
  }
  if (S.phase === 'time') {
    if (S.arrow > .62 && S.arrow < .86) { S.phase = 'throw'; S.throwT = 0; G.sfx('whoosh'); }
    else { G.sfx('bump'); S.msg = 1; G.sayNow('j_miss'); }
  }
}
function update(dt) {
  if (S.end) return;
  S.t += dt; G.tick(dt); S.msg = Math.max(0, S.msg - dt);
  if (S.bow > 0) {
    S.bow -= dt;
    if (S.bow <= 0) {
      if (S.phase === 'bow') newVerb();
      else if (S.phase === 'bowEnd') return finish();
    }
  }
  if (S.phase === 'time') { S.arrow += S.dir * dt * (.7 + S.pts * .15); if (S.arrow > 1) { S.arrow = 1; S.dir = -1; } if (S.arrow < 0) { S.arrow = 0; S.dir = 1; } }
  if (S.phase === 'throw') {
    S.throwT += dt;
    if (S.throwT > 1.4) {
      S.pts++; G.jingle(); G.sayNow(S.pts === 1 ? 'j_ippon' : S.pts === 2 ? 'j_roll' : 'j_ippon');
      if (S.pts >= S.goal) { S.phase = 'bowEnd'; G.say('j_done'); } else setTimeout(() => { if (G.mode === G.modes.judo && !S.end) newVerb(); }, 1400), S.phase = 'wait';
    }
  }
}
function finish() {
  S.end = true;
  G.showCard('Judo star! 🥋', '🙇 ' + '🏅'.repeat(S.pts), 'Three great throws, and you bowed to say thank you. Respect!', 'Next ▶', () => G.stepDone(0));
}
function drawGi(x, y, flip, bow) {
  g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
  rr(-17, 4, 14, 36, 6, '#fafafa', '#c9c9c9', 2); rr(3, 4, 14, 36, 6, '#fafafa', '#c9c9c9', 2);
  g.rotate(bow * .5); rr(-25, -36, 50, 44, 12, '#fafafa', '#c9c9c9', 2);
  g.strokeStyle = '#c9c9c9'; g.lineWidth = 2; g.beginPath(); g.moveTo(-10, -36); g.lineTo(6, -10); g.stroke();
  g.fillStyle = '#222'; g.fillRect(-25, -12, 50, 7);
  g.restore();
}
function draw() {
  g.fillStyle = '#e9e1cf'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#c9b48a'; for (let i = 0; i < 8; i++) g.fillRect(i * 90 + 20, T + 30, 60, 100);
  // tatami
  g.fillStyle = '#7cb342'; g.fillRect(0, MAT - 60, W, 260); g.fillStyle = '#e8c547'; g.fillRect(40, MAT - 40, W - 80, 220); g.fillStyle = '#7cb342'; g.fillRect(80, MAT - 20, W - 160, 180);
  const bow = S.bow > 0 ? Math.sin((1 - S.bow / 1.2) * Math.PI) : 0;
  // Felix
  G.drawKid(250, MAT - 30 + bow * 16, 1.4); drawGi(250, MAT, false, bow);
  // buddy, maybe flying
  let bx = 460, by = MAT, rot = 0;
  if (S.phase === 'throw') { const k = Math.min(1, S.throwT / 1); bx = 460 - Math.sin(k * Math.PI) * 40 + k * 60; by = MAT - Math.sin(k * Math.PI) * 180; rot = k * Math.PI * 2; }
  g.save(); g.translate(bx, by); g.rotate(rot - bow * .5); drawGi(0, 0, true, 0); txt(G.buddyEmoji(), 0, -66, 66, '#000'); g.restore();
  if (S.phase === 'throw' && S.throwT > 1) { txt('IPPON!', W / 2, 200, 64, '#c0392b'); }
  // UI
  if (S.phase === 'bow' || S.phase === 'bowEnd') { rr(W / 2 - 130, 250, 260, 100, 26, '#ff7a1a'); txt('🙇 Bow', W / 2, 300, 46, '#fff'); }
  if (S.phase === 'verb') S.cards.forEach((v, i) => { rr(cardX(i) - 90, 240, 180, 120, 20, '#fff8ec', '#5e3b19', 3); txt(VE[v] || '⭐', cardX(i), 280, 40, '#000'); txt(v, cardX(i), 330, 36, '#1d2a24'); });
  if (S.phase === 'time') {
    rr(80, 280, W - 160, 44, 20, '#ffffffcc'); rr(80 + (W - 160) * .62, 280, (W - 160) * .24, 44, 10, '#3fa34d');
    const ax = 80 + (W - 160) * S.arrow; txt('⬇️', ax, 250, 40, '#000');
    txt(S.verb.toUpperCase() + '!', W / 2, 370, 40, '#1d2a24');
  }
  if (S.msg > 0) txt('Nearly!', W / 2, 200, 40, '#c0392b');
  G.hudBar('🥋 Judo with ' + (C.buddies.find(b => b[0] === G.prog.buddy) || ['', 'Snappy'])[1], '🏅 ' + S.pts + '/' + S.goal);
}
G.modes.judo = { start, update, draw, tap, debug: () => S, press(k) { if (k === 'act') tap({ x: 0, y: 0 }); }, repeat() { G.sayNow(S.verb ? 'jv_' + S.verb : 'j_intro'); } };
})();
