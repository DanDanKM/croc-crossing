'use strict';
/* Clap-along: hear a word, watch its beats (syllables) on the drum, then tap the drum the same number of times.
   Finishes with an Indonesian counting chant: tap the drum for each number. */
(() => {
const { W, H, T, g, rr, txt, fitTxt, circle, rnd, pick, shuffle, C } = G;
const DX = W / 2, DY = 470, BEAT = .6;
let S = null;
function start() {
  const remi = G.isRemi(), words = Object.keys(C.beats);
  const pool = remi ? words.filter(w => C.beats[w].length <= 2) : words;
  const list = []; while (list.length < (remi ? 3 : 4)) { const w = G.wpick(pool.filter(x => !list.includes(x)), x => 'C:' + x); list.push(w); }
  S = { remi, t: 0, list, wi: 0, phase: 'intro', beat: -1, bt: 0, taps: 0, lastTap: 0, tries: 0, hit: 0, count: 0, countTo: remi ? 5 : 10, cwait: 0, good: 0, end: false, wait: 0 };
  G.setPad('none');
  G.sayNow('ry_intro');
}
const word = () => S.list[S.wi];
const parts = () => C.beats[word()] || [word()];
function listen() { S.phase = 'listen'; S.beat = -1; S.bt = -0.4; S.taps = 0; G.say('w_' + word()); S.wait = 1; }
function hitDrum() { S.hit = .18; G.sfx('drum'); }
function tap(p) {
  if (S.end || Math.hypot(p.x - DX, p.y - DY) > 190) return;
  if (S.phase === 'tap') { hitDrum(); S.taps++; S.lastTap = 0; }
  else if (S.phase === 'count' && S.cwait > 0) { hitDrum(); S.cwait = 0; nextCount(); }
}
function nextCount() {
  S.count++;
  if (S.count > S.countTo) { S.phase = 'done'; G.say('ry_done'); S.wait = 2.2; return; }
  G.sayNow('idw_' + G.slug(C.count10.id[S.count - 1])); S.cwait = 3; S.cshow = S.count;
}
function update(dt) {
  if (S.end) return;
  S.t += dt; G.tick(dt); S.hit = Math.max(0, S.hit - dt);
  if (S.wait > 0) { if (!G.speaking()) S.wait -= dt; if (S.wait > 0) return; }
  if (S.phase === 'intro') return listen();
  if (S.phase === 'listen') {
    S.bt += dt;
    if (S.bt >= BEAT) { S.bt = 0; S.beat++; if (S.beat < parts().length) hitDrum(); else { S.phase = 'tap'; S.lastTap = -2; G.say('ry_you'); } }
    return;
  }
  if (S.phase === 'tap') {
    S.lastTap += dt;
    if (S.taps > 0 && S.lastTap > 1.3) {
      const ok = S.taps === parts().length;
      if (S.tries === 0) G.skillMark('C:' + word(), ok);
      if (ok || S.tries >= 1) {
        if (ok) { S.good++; G.sfx('ding'); G.sayNow('ry_good'); } else G.sayNow('claps_good');
        S.phase = 'show'; S.wait = 1.2; S.tries = 0;
      } else { S.tries++; G.sfx('bump'); G.sayNow('ry_again'); S.phase = 'replay'; S.wait = .8; }
    }
    return;
  }
  if (S.phase === 'replay') return listen();
  if (S.phase === 'show') { S.wi++; if (S.wi < S.list.length) return listen(); S.phase = 'count'; S.count = 0; G.sayNow('ry_count'); S.wait = .6; S.cwait = 0; return; }
  if (S.phase === 'count') { if (S.count === 0) return nextCount(); if (S.cwait > 0) { S.cwait -= dt; if (S.cwait <= 0) nextCount(); } return; }
  if (S.phase === 'done') return finish();
}
function finish() {
  if (S.end) return; S.end = true;
  G.showCard('You\'ve got rhythm! 🥁', '👏 ' + S.good + '/' + S.list.length, 'Words: ' + S.list.join(', ') + '. And you counted to ' + C.count10.id[S.countTo - 1] + ' in Indonesian!', 'Next ▶', () => G.stepDone(0));
}
function draw() {
  const sky = g.createLinearGradient(0, T, 0, H); sky.addColorStop(0, '#3b2a5a'); sky.addColorStop(1, '#a8553a');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) circle((i * 97) % W, T + (i * 53) % 260, 1.5, '#fff');
  // word + beat chips
  if (S.phase !== 'count' && S.phase !== 'done' && word()) {
    const ps = parts(), show = S.phase === 'listen' || S.phase === 'show' || S.phase === 'replay';
    fitTxt((C.syllables.find(s => s[0] === word()) || [0, 0, '🥁'])[2] + ' ' + word(), W / 2, 140, W - 80, 48, '#fff');
    const cw = 120, x0 = W / 2 - (ps.length - 1) * cw / 2;
    if (S.phase !== 'tap') ps.forEach((p, i) => { const lit = S.phase === 'listen' ? i <= S.beat : S.phase === 'show'; rr(x0 + i * cw - 54, 190, 108, 60, 16, show ? (lit ? '#ffe14d' : '#ffffff33') : '#ffffff22'); if (show) txt(p, x0 + i * cw, 221, 30, lit ? '#1d2a24' : '#fff'); });
    if (S.phase === 'tap') txt('🥁'.repeat(Math.min(S.taps, 6)) || 'Your turn!', W / 2, 221, S.taps ? 40 : 30, '#fff');
  }
  if (S.phase === 'count' && S.cshow) { txt(String(S.cshow), W / 2, 160, 80, '#fff'); txt(C.count10.id[S.cshow - 1], W / 2, 235, 46, '#ffe14d'); }
  // drum
  const s = 1 + S.hit * .5;
  g.save(); g.translate(DX, DY); g.scale(s, s);
  g.fillStyle = '#8a4b22'; g.beginPath(); g.moveTo(-150, 0); g.lineTo(-120, 200); g.lineTo(120, 200); g.lineTo(150, 0); g.fill();
  g.strokeStyle = '#f2d9a0'; g.lineWidth = 4; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 40, 10); g.lineTo(i * 34 + (i % 2 ? 30 : -30), 190); g.stroke(); }
  g.beginPath(); g.ellipse(0, 0, 150, 46, 0, 0, Math.PI * 2); g.fillStyle = S.hit ? '#fff3c4' : '#f5e3b5'; g.fill(); g.strokeStyle = '#5e3b19'; g.lineWidth = 6; g.stroke();
  g.restore();
  G.drawKid(W / 2 - 230, 640, 1.2);
  txt(G.buddyEmoji(), W / 2 + 230, 640 + Math.sin(S.t * 6) * 6, 64, '#000');
  G.hudBar('🥁 Clap-along', S.phase === 'count' ? '🇮🇩' : (S.wi + 1 > S.list.length ? S.list.length : S.wi + 1) + '/' + S.list.length);
  const h = { listen: 'Listen to the beats…', tap: 'Tap the drum for each beat!', count: 'Tap the drum for each number!' }[S.phase]; if (h) G.hint(h);
}
G.modes.clap = { start, update, draw, tap, debug: () => S, press(k) { if (k === 'act') tap({ x: DX, y: DY }); }, repeat() { if (S.phase === 'tap' || S.phase === 'listen') G.sayNow('w_' + word()); } };
})();
