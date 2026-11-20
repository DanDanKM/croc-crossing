'use strict';
/* Journey map of the Top End and neighbours. Tap a pin, then Play. */
(() => {
const { W, H, T, g, rr, txt, fitTxt, circle, C } = G;
const LON0 = 116.5, LAT0 = -3.5, K = 21, MY = T + 6;
const px = (lon, lat) => [(lon - LON0) * K, MY + (LAT0 - lat) * K];
const AUS = [[114,-22],[114,-21.8],[116.7,-20.6],[121,-19.5],[122.2,-17.9],[123.5,-16.5],[125,-14.5],[126.9,-13.8],[128.2,-14.9],[129.5,-14.9],[130.2,-13.2],[130.8,-12.4],[131.5,-12.1],[132.5,-11.4],[133.6,-11.8],[135,-12.1],[136,-11.9],[136.8,-12.3],[136,-13.7],[135.5,-14.8],[137.7,-16.2],[139.4,-17.4],[140.8,-17.4],[141.6,-15],[141.6,-12.7],[142.5,-10.7],[143.5,-12.5],[144.5,-14.3],[145.4,-15],[146.2,-18],[146.5,-20],[152,-20],[152,-24],[114,-24]];
const PNG = [[131,-1.5],[134,-3.8],[137.5,-4.8],[138.5,-7.8],[140.9,-9.1],[142.5,-9.3],[144,-7.8],[145.8,-7.9],[147.1,-9.1],[148.5,-10.2],[150.5,-10.6],[149.5,-9.5],[148,-8],[146.5,-6.5],[147.8,-6.1],[146,-5],[144.5,-3.8],[142,-3],[140,-2.4],[138,-1.6],[135,-3],[132,-.8]];
const TIMOR = [[123.5,-10.3],[124.5,-9.6],[125.5,-9.0],[127.0,-8.4],[127.3,-8.5],[126,-9.2],[124.5,-10],[123.6,-10.4]];
const ISLES = [[118.0,-8.6,1.4,.35],[121.0,-8.6,1.8,.35],[116.3,-8.6,.4,.3],[119.9,-9.7,.9,.3],[130.6,-11.6,.9,.35],[136.6,-14,.35,.3],[126.4,-3.3,.9,.4],[129.5,-3.2,1.6,.4],[134.5,-6.2,.6,.6],[131.3,-7.6,.4,.6]];
const LABELS = [['AUSTRALIA',133,-17.5,22],['PAPUA NEW GUINEA',143.5,-5.6,15],['TIMOR-LESTE',126.5,-7.7,13],['INDONESIA',121,-6.8,15],['Arafura Sea',134,-9.6,13],['Timor Sea',125,-11.8,13],['Coral Sea',148,-13.5,13]];
let sel = 0, t = 0, behindMenu = false;
const stopXY = s => px(s.lon, s.lat);
const unlocked = () => (G.prog ? G.prog.unlocked : 0);

function poly(pts, fill) { g.beginPath(); pts.forEach(([lo, la], i) => { const [x, y] = px(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = '#c9a75c'; g.lineWidth = 2; g.stroke(); }
function draw() {
  t += 0;
  g.fillStyle = '#1f7fb6'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { const x = (i * 83 + t * 8) % W, y = MY + (i * 47) % 330; g.strokeStyle = '#ffffff22'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 8, .3, Math.PI - .3); g.stroke(); }
  poly(AUS, '#e9c46a'); poly(PNG, '#7fbf5f'); poly(TIMOR, '#a6c66a');
  for (const [lo, la, rx, ry] of ISLES) { const [x, y] = px(lo, la); g.beginPath(); g.ellipse(x, y, rx * K, ry * K, 0, 0, Math.PI * 2); g.fillStyle = '#a6c66a'; g.fill(); }
  // Top End green
  g.save(); g.beginPath(); AUS.forEach(([lo, la], i) => { const [x, y] = px(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.clip();
  g.fillStyle = '#9cc96b'; g.fillRect(0, MY, W, (-11 - LAT0) * -K + 60); g.restore();
  for (const [s, lo, la, sz] of LABELS) { const [x, y] = px(lo, la); txt(s, x, y, sz, s === s.toUpperCase() ? '#5b4a1e' : '#ffffffaa', 'center', 800); }
  // path
  g.setLineDash([6, 8]); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath();
  C.stops.forEach((s, i) => { const [x, y] = stopXY(s); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.setLineDash([]);
  // pins
  C.stops.forEach((s, i) => {
    const [x, y] = stopXY(s), open = i <= unlocked(), isSel = i === sel;
    if (isSel) { g.strokeStyle = '#ffe14d'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 24 + Math.sin(t * 5) * 3, 0, Math.PI * 2); g.stroke(); }
    circle(x, y, 19, open ? '#fff' : '#ffffff66');
    txt(open ? s.animals[0].emoji : '🔒', x, y + 1, 20, '#000');
    const stars = G.prog && G.prog.stars[s.id]; if (stars) txt('⭐'.repeat(stars), x, y + 26, 10, '#fff');
  });
  // kid at the furthest unlocked stop
  const cur = C.stops[Math.min(unlocked(), C.stops.length - 1)], [kx, ky] = stopXY(cur);
  G.drawKid(kx + 22, ky - 26 + Math.sin(t * 4) * 2, .7);
  // HUD
  g.fillStyle = '#123b2c'; g.fillRect(0, 0, W, T);
  txt('🗺️ Top End Adventure', W / 2, T / 2, 28, '#ffe14d');
  txt('🔊', W - 36, T / 2, 30, '#fff');
  // stop panel
  const s = C.stops[sel], open = sel <= unlocked(), py = 440;
  rr(16, py, W - 32, H - py - 16, 22, '#fff8ec');
  txt(s.flag + ' ' + s.name, W / 2, py + 40, 34, '#1d2a24');
  txt(s.country, W / 2, py + 76, 18, '#56645d', 'center', 600);
  const n = s.animals.length, gap = Math.min(96, (W - 80) / n);
  s.animals.forEach((a, i) => {
    const x = W / 2 - (n - 1) * gap / 2 + i * gap, got = G.prog && G.prog.stickers[a.id];
    circle(x, py + 140, 36, got ? '#e8f6e0' : '#eee');
    txt(got || open ? a.emoji : '❔', x, py + 142, 40, '#000');
    if (!got) { g.globalAlpha = .55; circle(x, py + 140, 36, '#fff'); g.globalAlpha = 1; }
    fitTxt(got ? a.word : '???', x, py + 192, gap - 6, 15, '#56645d', 700);
  });
  if (open) { rr(W / 2 - 130, py + 230, 260, 76, 22, '#ff7a1a'); txt(G.prog && G.prog.stars[s.id] ? 'Play again ▶' : 'Play! ▶', W / 2, py + 268, 36, '#fff'); }
  else txt('🔒 Finish the place before to unlock', W / 2, py + 268, 22, '#56645d', 'center', 700);
  txt(bonusLabel(s), W / 2, py + 336, 17, '#56645d', 'center', 600);
}
const bonusLabel = s => G.isRemi() ? '' : 'Bonus game: ' + ({ fishing: '🎣 barra fishing', surfing: '🏄 surfing', car: '🚗 car mission' }[s.bonus]);

G.modes.map = {
  start(menu) { behindMenu = !!menu; sel = Math.min(unlocked(), C.stops.length - 1); G.setPad('none'); if (!menu && G.prog) G.say('map'); },
  update(dt) { t += dt; },
  draw, animateUnderCards: true,
  tap(p) {
    for (let i = 0; i < C.stops.length; i++) { const [x, y] = stopXY(C.stops[i]); if (Math.hypot(p.x - x, p.y - y) < 30) { sel = i; G.sfx('hop'); if (i <= unlocked()) G.sayNow('st_' + C.stops[i].id); return; } }
    if (sel <= unlocked() && p.y > 440 + 230 && p.y < 440 + 306 && Math.abs(p.x - W / 2) < 140) { G.stopVoice(); G.startStop(sel); }
  },
  repeat() { G.sayNow('map'); }
};
})();
