'use strict';
/* Question builders. A question = { hud, steps:[{answers, say, okSay}], doneSay }.
   An answer = { t: text, e: emoji, col: colour, ok: bool }. Felix gets 5 answers, Remi 3. */
(() => {
const { C, pick, shuffle, LET } = G;
const vis = idx => C.stops.slice(0, idx + 1).flatMap(s => s.animals);
const otherAnimals = (a, n, pool) => shuffle((pool || G.allAnimals()).filter(x => x.emoji !== a.emoji && x.word !== a.word)).filter((x, i, arr) => arr.findIndex(y => y.emoji === x.emoji) === i).slice(0, n);
const mix = (ok, wrong) => shuffle([{ ...ok, ok: true }, ...wrong.map(w => ({ ...w, ok: false }))]);
const letters = (L, n) => shuffle(LET.filter(x => x !== L)).slice(0, n).map(x => ({ t: x }));

const F = {
  first(stop) {
    const a = G.wpick(stop.animals, x => 'L:' + x.word[0].toUpperCase()), L = a.word[0].toUpperCase();
    return { hud: { emoji: a.emoji, text: 'starts with…?' }, steps: [{ answers: mix({ t: L }, letters(L, 4)), say: ['fl_' + a.id], okSay: ['l_' + L, 'w_' + a.word.toLowerCase()], skill: 'L:' + L }] };
  },
  spell(stop) {
    const W = G.wpick(stop.spell, w => 'L:' + w.split('').sort((x, y) => G.skillWeight('L:' + y) - G.skillWeight('L:' + x))[0]);
    return { hud: { emoji: '✏️', slots: W.split('') },
      steps: W.split('').map((L, i) => ({ answers: mix({ t: L }, letters(L, 4)), say: i === 0 ? ['spell_' + W, 'l_' + L] : ['l_' + L], okSay: [], skill: 'L:' + L })),
      doneSay: ['done_' + W] };
  },
  sight() {
    const w = G.wpick(C.sight, x => 'S:' + x.toLowerCase()), others = shuffle(C.sight.filter(x => x.toLowerCase() !== w.toLowerCase())).slice(0, 4);
    return { hud: { emoji: '👀', text: 'Find the word…' }, steps: [{ answers: mix({ t: w }, others.map(t => ({ t }))), say: ['sw_' + w.toLowerCase()], okSay: ['w_' + w.toLowerCase()], skill: 'S:' + w.toLowerCase() }] };
  },
  rhyme() {
    const set = G.wpick(C.rhymes, x => 'R:' + x.w), ok = pick(set.r);
    const pool = C.rhymes.filter(s => s !== set).flatMap(s => [[s.w, s.e], ...s.r]);
    const wrong = shuffle(pool).filter((x, i, a) => a.findIndex(y => y[0] === x[0]) === i).slice(0, 4);
    return { hud: { emoji: set.e, text: set.w + ' rhymes with…' },
      steps: [{ answers: mix({ t: ok[0], e: ok[1] }, wrong.map(w => ({ t: w[0], e: w[1] }))), say: ['rh_' + set.w], okSay: ['w_' + set.w, 'w_' + ok[0]], skill: 'R:' + set.w }] };
  },
  claps() {
    const s = G.wpick(C.syllables, x => 'C:' + x[0]);
    return { hud: { emoji: s[2], text: s[0] + ' 👏?' },
      steps: [{ answers: [1, 2, 3, 4, 5].map(n => ({ t: String(n), e: '👏', ok: n === s[1] })), say: ['cl_' + s[0]], okSay: ['claps_good'], skill: 'C:' + s[0] }] };
  },
  sentence(stop) {
    const si = Math.floor(Math.random() * stop.sentences.length), sen = stop.sentences[si];
    const pool = [...new Set([...C.sight, ...sen].map(w => w === 'I' ? 'I' : w.toLowerCase()))];
    const steps = sen.map((w, i) => {
      let wrong = shuffle(pool.filter(x => x.toLowerCase() !== w.toLowerCase())).slice(0, 4).map(t => ({ t: i === 0 ? t : t.toLowerCase() === 'i' ? 'I' : t.toLowerCase() }));
      if (i === 0 && w !== 'I') wrong[0] = { t: w.toLowerCase() }; // capital-letter lesson
      return { answers: mix({ t: w }, wrong), say: i === 0 ? ['sen_' + stop.id + '_' + si, 'q_sentence'] : [], okSay: ['w_' + w.toLowerCase()], skill: i === 0 ? 'G:capital letters' : C.sight.includes(w) || w === 'I' ? 'S:' + w.toLowerCase() : null };
    });
    steps.push({ answers: mix({ t: '.' }, ['?', '!', ',', '-'].map(t => ({ t }))), say: ['q_end'], okSay: ['q_fullstop', 'sen_' + stop.id + '_' + si], skill: 'G:full stops' });
    return { hud: { emoji: '📝', slots: [...sen, '.'], words: true }, steps };
  },
  plural() {
    const p = G.wpick(C.plurals, x => 'P:' + x[0]);
    const wrong = shuffle(C.plurals.filter(x => x !== p)).slice(0, p[0] === p[1] ? 4 : 3).map(x => ({ t: x[1] }));
    if (p[0] !== p[1]) wrong.push({ t: p[0] });
    return { hud: { emoji: p[2] + '➜' + p[2] + p[2], text: 'one ' + p[0] + ', two…' },
      steps: [{ answers: mix({ t: p[1] }, wrong), say: ['pl_' + p[0]], okSay: p[0] === p[1] ? ['fish_fish'] : ['w_' + p[1]], skill: 'P:' + p[0] }] };
  },
  describe(stop) {
    const a = pick(stop.animals), wrong = shuffle(C.notAdj.filter(x => x !== a.adj)).slice(0, 4).map(t => ({ t }));
    return { hud: { emoji: a.emoji, text: 'The ' + a.word + ' is…' }, steps: [{ answers: mix({ t: a.adj }, wrong), say: ['dsc_' + a.id], okSay: ['w_' + a.adj], skill: 'D:' + a.adj }] };
  }
};
/* ---------- basic Indonesian ---------- */
const slug = s => s.replace(/[\s-]/g, '_').toLowerCase();
G.slug = slug;
const ID = C.indo;
Object.assign(F, {
  indoAnimal(stop) {
    const cands = stop.animals.filter(a => ID.animals[a.id]), a = pick(cands.length ? cands : G.allAnimals().filter(x => ID.animals[x.id]));
    const iw = ID.animals[a.id], wrong = otherAnimals(a, 8).filter(x => ID.animals[x.id] !== iw).slice(0, 4);
    return { hud: { emoji: '🇮🇩', text: iw }, steps: [{ answers: mix({ e: a.emoji, t: a.word }, wrong.map(x => ({ e: x.emoji, t: x.word }))),
      say: ['id_listen', 'idw_' + slug(iw), 'id_which'], okSay: ['idc_' + a.id, 'idw_' + slug(iw), ID.facts[a.id] ? 'idf_' + a.id : 'id_say'], skill: 'I:' + iw }] };
  },
  indoNumber() {
    const n = G.wpick([1, 2, 3, 4, 5], m => 'I:' + ID.numbers[m - 1]), iw = ID.numbers[n - 1];
    return { hud: { emoji: '🔢', text: iw }, steps: [{ answers: G.shuffle([1, 2, 3, 4, 5]).map(m => ({ t: String(m), ok: m === n })),
      say: ['id_count', ...ID.numbers.map(x => 'idw_' + slug(x)), 'id_find', 'idw_' + slug(iw)], okSay: ['idw_' + slug(iw), 'n_' + n, 'id_great'], skill: 'I:' + iw }] };
  },
  indoColour() {
    const c = G.wpick(C.colours, x => 'I:' + ID.colours[x[0]]), iw = ID.colours[c[0]], cw = shuffle(C.colours.filter(x => x !== c)).slice(0, 4);
    return { hud: { emoji: '🎨', text: iw }, steps: [{ answers: mix({ col: c[1] }, cw.map(x => ({ col: x[1] }))), say: ['id_colour', 'idw_' + slug(iw)], okSay: ['idw_' + slug(iw), 'w_' + c[0], 'id_great'], skill: 'I:' + iw }] };
  }
});
/* ---------- numbers and maths ---------- */
const N = n => ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n];
const numAns = (n, max, k = 5) => shuffle([n, ...shuffle([...Array(max + 1).keys()].filter(m => m !== n && m > 0)).slice(0, k - 1)]).map(m => ({ t: String(m), ok: m === n }));
const emo = stop => pick(stop.animals.filter(a => a.home !== 'plant')).emoji;
Object.assign(F, {
  count(stop, idx) {
    const n = G.ri(3, Math.min(10, 5 + idx)), e = emo(stop);
    return { hud: { emoji: e.repeat(n).length > 20 ? e + '×?' : e.repeat(n), text: '' }, steps: [{ answers: numAns(n, 10), say: ['m_how'], okSay: ['n_' + n, 'm_good'], skill: 'N:count ' + n }] };
  },
  add(stop, idx) {
    const max = idx < 3 ? 5 : 10, a = G.ri(1, max - 1), b = G.ri(1, Math.min(4, max - a)), e = emo(stop);
    return { hud: { emoji: '', text: e.repeat(a) + ' + ' + e.repeat(b) + ' = ?' }, steps: [{ answers: numAns(a + b, max), say: ['n_' + a, 'm_plus', 'n_' + b, 'm_makes'], okSay: ['n_' + (a + b), 'm_good'], skill: 'N:' + a + '+' + b }] };
  },
  take(stop) {
    const a = G.ri(3, 6), b = G.ri(1, a - 1), e = emo(stop);
    return { hud: { emoji: '', text: e.repeat(a) + ' − ' + '❌'.repeat(b) + ' = ?' }, steps: [{ answers: numAns(a - b, 6), say: ['n_' + a, 'm_take', 'n_' + b, 'm_left'], okSay: ['n_' + (a - b), 'm_good'], skill: 'N:' + a + '-' + b }] };
  },
  more(stop) {
    const e = emo(stop), ns = shuffle([1, 2, 3, 4, 5, 6]).slice(0, 5), big = Math.max(...ns);
    return { hud: { emoji: '⚖️', text: 'more?' }, steps: [{ answers: ns.map(n => ({ e: e.repeat(n), t: '', ok: n === big })), say: ['m_more'], okSay: ['n_' + big, 'm_good'], skill: 'N:more' }] };
  },
  pattern(stop) {
    const as = shuffle(stop.animals).slice(0, 2).map(a => a.emoji), seq = [0, 1, 0, 1, 0], ans = as[1];
    const wrong = shuffle(G.allAnimals().map(a => a.emoji).filter(x => !as.includes(x))).filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
    return { hud: { emoji: '', text: seq.map(i => as[i]).join(' ') + ' ?' }, steps: [{ answers: mix({ e: ans }, [{ e: as[0] }, ...wrong.map(e => ({ e }))]), say: ['m_next'], okSay: ['m_good'], skill: 'N:pattern' }] };
  }
});
const LIT = [['first', 'first'], ['first', 'spell'], ['spell', 'rhyme'], ['spell', 'sight'], ['sentence', 'claps'], ['spell', 'plural'], ['sentence', 'describe']];
const MATHS = [['count'], ['count', 'more'], ['add', 'pattern'], ['add', 'more'], ['add', 'take'], ['add', 'pattern'], ['take', 'add']];
G.Q = {
  felixSet(stop, idx) { // 3 quick hops: one literacy, one maths, one rotating (literacy / Indonesian)
    const lit = LIT[Math.min(idx, LIT.length - 1)], ma = MATHS[Math.min(idx, MATHS.length - 1)];
    const third = idx % 2 ? ['indoAnimal', 'indoNumber', 'indoColour'][Math.floor(idx / 2) % 3] : lit[1];
    const plan = shuffle([lit[0], pick(ma), third]);
    return plan.map(k => ({ ...F[k](stop, idx), kind: k }));
  },
  quizSet(stop, idx) {
    const pool = vis(idx), out = [];
    const homes = [...new Set(stop.animals.map(a => a.home))], h = pick(homes);
    const ans = pick(stop.animals.filter(a => a.home === h));
    const wrongH = shuffle(pool.filter(a => a.home !== h)).filter((x, i, arr) => arr.findIndex(y => y.emoji === x.emoji) === i && x.emoji !== ans.emoji).slice(0, 4);
    if (wrongH.length === 4) out.push({ kind: 'home', hud: { emoji: '🏠', text: C.homes[h].replace('Which one ', '').replace('?', '') },
      steps: [{ answers: mix({ t: ans.word, e: ans.emoji }, wrongH.map(a => ({ t: a.word, e: a.emoji }))), say: ['home_' + h], okSay: ['nm_' + ans.id], skill: 'H:' + h }] });
    for (const a of shuffle(stop.animals).slice(0, out.length ? 1 : 2)) {
      out.push({ kind: 'clue', hud: { emoji: '🔎', text: 'Which animal?' },
        steps: [{ answers: mix({ t: a.word, e: a.emoji }, otherAnimals(a, 4, pool.length > 8 ? pool : null).map(x => ({ t: x.word, e: x.emoji }))), say: ['clue_' + a.id], okSay: ['nm_' + a.id], skill: 'A:' + a.word }] });
    }
    if (stop.country !== 'Australia' || stop.id === 'darwin') {
      const f = C.flags.find(f => f[0] === stop.country), wrong = C.flags.filter(x => x !== f);
      out.push({ kind: 'geo', hud: { emoji: '🗺️', text: 'Find the flag of ' + stop.country }, steps: [{ answers: mix({ e: f[1], t: '' }, wrong.map(x => ({ e: x[1], t: '' }))), say: [stop.country === 'Australia' ? 'geo_au' : 'geo_' + stop.id], okSay: ['w_' + f[0].toLowerCase()], skill: 'F:' + f[0] }] });
    }
    return shuffle(out).slice(0, 1);
  },
  remiSet(stop, idx) {
    const out = [], anims = shuffle(stop.animals);
    const a = anims[0];
    out.push({ kind: 'find', hud: { emoji: '🔎', text: '' }, steps: [{ answers: mix({ e: a.emoji }, otherAnimals(a, 2).map(x => ({ e: x.emoji }))), say: ['rf_' + a.id], okSay: ['nm_' + a.id], skill: 'A:' + a.word }] });
    const c = G.wpick(C.colours, x => 'col:' + x[0]), cw = shuffle(C.colours.filter(x => x !== c)).slice(0, 2);
    out.push({ kind: 'colour', hud: { emoji: '🎨', text: '' }, steps: [{ answers: mix({ col: c[1] }, cw.map(x => ({ col: x[1] }))), say: ['rc_' + c[0]], okSay: ['w_' + c[0]], skill: 'col:' + c[0] }] });
    const max = idx < 2 ? 3 : 5, n = G.ri(1, max), ns = shuffle([1, 2, 3, 4, 5].filter(x => x !== n && x <= Math.max(max, 3))).slice(0, 2), em = anims[1 % anims.length].emoji;
    out.push({ kind: 'count', hud: { emoji: '🔢', text: '' }, steps: [{ answers: mix({ e: em.repeat(n), t: String(n) }, ns.map(m => ({ e: em.repeat(m), t: String(m) }))), say: ['rn_' + n], okSay: ['n_' + n], skill: 'N:' + n }] });
    out.push({ kind: 'letter', hud: { emoji: '🔤', text: '' }, steps: [{ answers: mix({ t: 'R' }, letters('R', 2)), say: ['rl_R'], okSay: ['l_R', 'great_remi'], skill: 'L:R' }] });
    const s = anims.find(x => x.sound) || anims[2 % anims.length];
    out.push({ kind: s.sound ? 'sound' : 'find', hud: { emoji: s.sound ? '👂' : '🔎', text: '' },
      steps: [{ answers: mix({ e: s.emoji }, otherAnimals(s, 2).map(x => ({ e: x.emoji }))), say: [s.sound ? 'snd_' + s.id : 'rf_' + s.id], okSay: ['nm_' + s.id], skill: 'A:' + s.word }] });
    return shuffle(out).slice(0, 3);
  }
};
})();
