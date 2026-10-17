/* =========================================================
   Standing (0.9.4): what the player's name is worth right now, and what each main character does about it.
   A scandal (cancelled, an exposed fake, a hidden ad…), a rough patch (a low reputation, a rumor that sticks, a name for
   manipulating people), a good run (a viral post, a reputation that shines), the top (famous and admired).
   Each main character reacts by their temperament, written by the AI when it creates them (« opportuniste : a toujours
   suivi le vent »), not by chance: the loyal stay, the principled step back, the opportunists follow the wind, the envious
   gloat or seethe, and some come closer in the storm, with something in mind… or nothing at all.
   The career feels it too: brands pay less and walk away in a scandal, come knocking at the top; recruits ask for more,
   the team asks for a bonus or leaves. And some moments come back later (butterfly effects): good ones, and bad ones.
   ========================================================= */
const TEMPERS = {
  fidele: { emoji: '🫶', label: ['Fidèle', 'Fidèle', 'Fidèle'], ai: 'fidèle : reste aux côtés du joueur dans la tempête si leur lien est réel, se réjouit sincèrement de ses succès',
    desc: () => 'Reste à tes côtés quand ça tourne mal, se réjouit quand tout va bien.' },
  integre: { emoji: '⚖️', label: ['Intègre', 'Intègre', 'Intègre'], ai: 'intègre : un scandale le ou la refroidit vraiment (prend ses distances, peut annuler un rendez-vous) ; respecte un succès mérité',
    desc: (c) => `Un scandale ${gx(c.g, 'le', 'la', 'le ou la')} refroidit vraiment ; un succès mérité, ${gx(c.g, 'il', 'elle', 'iel')} le respecte.` },
  opportuniste: { emoji: '🧭', label: ['Opportuniste', 'Opportuniste', 'Opportuniste'], ai: 'opportuniste : suit le vent : lâche le joueur dès que ça sent mauvais, se rapproche dès qu’il brille',
    desc: () => 'Suit le vent : te lâche quand ça sent mauvais, revient quand tu brilles.' },
  detache: { emoji: '🌿', label: ['Détaché', 'Détachée', 'Détaché·e'], ai: 'détaché·e : se fiche du buzz, juge le joueur sur ce qu’il vit avec lui ou elle, pas sur sa réputation',
    desc: () => 'Se fiche du buzz : te juge sur ce que vous vivez, pas sur ta réputation.' },
  envieux: { emoji: '🐍', label: ['Envieux', 'Envieuse', 'Envieux·se'], ai: 'envieux·se : jalouse les succès du joueur (piques, sous-entendus, coups bas), savoure ses chutes',
    desc: () => 'Jalouse tes succès, savoure tes chutes.' },
  trouble: { emoji: '🎭', label: ['Difficile à cerner', 'Difficile à cerner', 'Difficile à cerner'], ai: 'trouble : se rapproche du joueur quand il est au plus bas, étrangement compréhensif·ve',
    desc: () => 'Se rapproche quand tu es au plus bas… Sincère, ou pas ? Impossible à dire.' },
};
const TEMPER_IDS = Object.keys(TEMPERS);
const temperOf = (c) => (c && TEMPERS[c.temper] ? c.temper : 'detache');
const temperLabel = (c) => { const L = TEMPERS[temperOf(c)].label; return gx(c.g, L[0], L[1], L[2]); };
const normTemper = (k) => {
  k = String(k || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return /fid|loyal/.test(k) ? 'fidele' : /integr|moral|princip|droit/.test(k) ? 'integre' : /opportun|vent|girouette|interess/.test(k) ? 'opportuniste'
    : /detach|indiff|zen|s'en fiche/.test(k) ? 'detache' : /envi|jalou/.test(k) ? 'envieux' : /troubl|ambig|myster|cache|cerner/.test(k) ? 'trouble' : null;
};
// Before the AI says it (games from before 0.9.4): a guess from their trust nature and the bond, never shown as certain.
function guessTemper(c) {
  if (c.vibe === 'nemesis' || c.vibe === 'rival' || c.rel <= -30) return 'envieux';
  if (gardeOf(c) === 3) return 'integre';
  if (gardeOf(c) === 1) return 'fidele';
  return ['detache', 'opportuniste', 'trouble', 'fidele', 'integre', 'detache'][hashStr(c.handle + '#temper') % 6];
}
// From the AI line that creates them: { temper, temperWhy }. The troubled ones may hide something, or nothing (rolled once).
function initTemper(c, o = {}) {
  const k = normTemper(o.temper);
  c.temper = k || guessTemper(c);
  if (!k) c.temperAuto = true;
  const why = str(o.temperWhy, 110);
  if (why) c.temperWhy = why;
  if (c.temper === 'trouble' && typeof c.hidden !== 'boolean') c.hidden = standRoll() < 0.55;
}
// The AI's answer for a character created before temperaments existed (a line of a refresh).
function setTemper(g, by, kind, why) {
  const c = typeof by === 'object' ? by : charByHandle(g, normHandle(by));
  const k = normTemper(kind);
  if (!c || !isMain(c) || !k) return false;
  c.temper = k;
  delete c.temperAuto;
  const w = str(why, 110);
  if (w) c.temperWhy = w;
  if (k === 'trouble' && typeof c.hidden !== 'boolean') c.hidden = standRoll() < 0.55;
  return true;
}
function migrateTemper(g) {
  for (const id of g.order || []) {
    const c = g.chars[id];
    if (c && isMain(c) && !TEMPERS[c.temper]) initTemper(c);
  }
  if (!Array.isArray(g.echoes)) g.echoes = [];
  if (!Array.isArray(g.invites)) g.invites = [];
}

/* ---------- the level: -2 scandal, -1 rough patch, 0, +1 good run, +2 at the top ---------- */
const VIRAL_GLOW = 18 * 3600000; // a viral post keeps the player in the light this long (game time)
const RIPPLE_GAP = 12 * 3600000; // the same kind of wave is felt once in that time (a scandal after a rough patch: only the rest)
const STANDING = {
  '-2': { emoji: '💥', label: 'Scandale', k: 1, cls: 'bad' },
  '-1': { emoji: '📉', label: 'Mauvaise passe', k: 0.5, cls: 'bad' },
  0: { emoji: '', label: '', k: 0, cls: '' },
  1: { emoji: '📈', label: 'Le vent en poupe', k: 0.5, cls: 'good' },
  2: { emoji: '👑', label: 'Au sommet', k: 1, cls: 'good' },
};
function standingOf(g, t = Date.now()) {
  if (!g || !g.stats) return 0;
  const s = g.stats;
  if (s.cancelled || playerBadBuzz(g, t)) return -2;
  const r = liveRumor(g);
  if (s.reputation < 30 || isShady(g, t) || (r && r.sev >= 2 && !(r.defended || []).length)) return -1;
  if (s.reputation >= 75 && s.followers >= 100000) return 2;
  if ((s.reputation >= 60 && s.followers >= 20000) || (g.lastViralAt && t - g.lastViralAt < VIRAL_GLOW && s.reputation >= 40)) return 1;
  return 0;
}
const standLv = (g) => (g && g.standing ? g.standing.lv : 0);
// What it changes for the career: brands' fees, offers, recruits' prices.
const STAND_MULT = {
  fee: { '-2': 0.6, '-1': 0.8, 0: 1, 1: 1.1, 2: 1.25 },
  cand: { '-2': 1.4, '-1': 1.2, 0: 1, 1: 0.92, 2: 0.85 },
  offerGap: { '-2': 1, '-1': 1.6, 0: 1, 1: 0.75, 2: 0.55 },
};
const standMult = (g, what) => (STAND_MULT[what] || {})[String(standLv(g))] || 1;

/* ---------- the waves: how each one reacts when the player's name moves ---------- */
const CLOSE_VIBES = ['crush', 'flirt'];
const isClose = (c) => c.rel >= 60 || TRUST_BONDS.includes(c.vibe) || CLOSE_VIBES.includes(c.vibe);
// rel, trust: the move at full strength (a scandal, the top); date: the chance they call off a date in the next 2 days;
// say: [one, several] for the grouped notification.
const WAVE = {
  down: {
    fidele: { rel: 3, trust: 2, say: ['reste à tes côtés', 'restent à tes côtés'] },
    integre: { rel: -8, trust: -6, date: 0.6, say: ['prend ses distances', 'prennent leurs distances'] },
    opportuniste: { rel: -7, trust: -3, date: 0.5, say: ['te lâche', 'te lâchent'] },
    detache: { rel: 0, trust: 0, say: ['s’en fiche', 's’en fichent'] },
    envieux: { rel: -3, trust: -2, date: 0.25, say: ['savoure ta chute', 'savourent ta chute'] },
    trouble: { rel: 3, trust: 0, say: ['se rapproche de toi, étrangement', 'se rapprochent de toi, étrangement'] },
  },
  up: { // success moves feelings, not trust (believing the player is another matter)
    fidele: { rel: 3, trust: 0, say: ['se réjouit pour toi', 'se réjouissent pour toi'] },
    integre: { rel: 2, trust: 0, say: ['salue ton succès', 'saluent ton succès'] },
    opportuniste: { rel: 7, trust: 0, say: ['se rapproche de toi', 'se rapprochent de toi'] },
    detache: { rel: 0, trust: 0, say: null },
    envieux: { rel: -6, trust: 0, say: ['te jalouse', 'te jalousent'] },
    trouble: { rel: 1, trust: 0, say: null },
  },
};
// Tests drive the dice; the game rolls them.
const standRoll = () => (window.__HYPE_TEST__ && Array.isArray(window.__standRolls) && window.__standRolls.length ? window.__standRolls.shift() : Math.random());
// A quiet relation move (one grouped notification says it all).
function nudgeRel(c, d) {
  const before = c.rel;
  c.rel = clamp(Math.round(c.rel + d), -100, 100);
  if (!c.followsYou && c.rel >= 25 && d > 0) c.followsYou = true;
  else if (c.followsYou && c.rel < 0) c.followsYou = false;
  return c.rel - before;
}
// Called by the clock (and after a time skip). The first call only notes where the player stands. A wave already felt
// recently is not felt twice (a reputation hovering around 30 does not shake everyone each time): only what is new.
function tickStanding(g, t = Date.now()) {
  if (!g || !g.ready || !g.stats) return false;
  const lv = standingOf(g, t);
  if (!g.standing) { g.standing = { lv, at: t, downAt: 0, downLv: 0, upAt: 0, upLv: 0 }; return false; }
  const st = g.standing, prev = st.lv;
  if (lv === prev) return false;
  st.lv = lv;
  st.at = t;
  const K = (x) => (STANDING[String(x)] || STANDING[0]).k;
  if (lv < 0 && lv < prev) {
    const recent = t - (st.downAt || 0) < RIPPLE_GAP;
    const k = K(lv) - (recent ? K(Math.min(0, st.downLv || 0)) : 0);
    if (k > 0.01) { st.downAt = t; st.downLv = recent ? Math.min(st.downLv || 0, lv) : lv; ripple(g, 'down', lv, k, t); }
  } else if (lv > 0 && lv > prev) {
    const recent = t - (st.upAt || 0) < RIPPLE_GAP;
    const k = K(lv) - (recent ? K(Math.max(0, st.upLv || 0)) : 0);
    if (k > 0.01) { st.upAt = t; st.upLv = recent ? Math.max(st.upLv || 0, lv) : lv; ripple(g, 'up', lv, k, t); }
  }
  return true;
}
// One wave: each main character moves by their temperament (closeness softens the blows), one grouped notification,
// one beat for the next AI call, and the career's share.
function ripple(g, dir, lv, k, t = Date.now()) {
  const W = WAVE[dir], said = {}, cancelled = [], beat = [];
  const skip = dir === 'down' && g.pbb && g.pbb.c ? g.pbb.c : null; // the one they framed: already settled with them
  for (const c of mains(g)) {
    if (c.id === skip) continue;
    const kind = temperOf(c), w = W[kind];
    if (standRoll() < 0.12) continue; // nothing is all black or all white: now and then, someone does not react as expected
    const soft = dir === 'down' && isClose(c) ? 0.5 : 1;
    const jit = 0.7 + standRoll() * 0.6;
    const idle = (kind === 'fidele' && dir === 'down' && !isClose(c) && c.rel < 20) // loyal to the people they are close to
      || (kind === 'integre' && dir === 'up' && g.stats.reputation < 60); // an easy success does not impress them
    const rel = idle ? 0 : w.rel * k * jit * (w.rel < 0 ? soft : 1);
    const dr = rel ? nudgeRel(c, rel) : 0;
    const tr = w.trust && !idle ? Math.round(w.trust * k * jit * (w.trust < 0 ? soft : 1)) : 0;
    if (tr) applyTrust(g, c, tr, dir === 'down' ? 'ta réputation' : 'ton succès', t, { quiet: true, free: true });
    if (dir === 'down' && w.date && lv === -2) {
      const ev = activeEvents(g).find((e) => e.player && e.c === c.id && e.due - t < 2 * DAY_MS);
      if (ev && standRoll() < w.date * k * soft) {
        charCancelsDate(g, c, kind === 'envieux' ? 'pas envie d’être vu·e avec toi en ce moment' : 'vu ce qui se passe en ce moment', later() + 1200);
        cancelled.push(c);
      }
    }
    if (dr || kind === 'detache' || kind === 'trouble') c.temperSeen = true;
    if (!w.say || (!dr && !(kind === 'detache' && lv === -2))) continue;
    (said[kind] = said[kind] || []).push(c);
    if (kind === 'envieux') addMem(g, c, dir === 'down' ? 'j’ai savouré la chute du joueur' : 'le succès du joueur m’agace');
    if (kind === 'opportuniste') addMem(g, c, dir === 'down' ? 'le joueur est devenu infréquentable' : 'le joueur a le vent en poupe : bon à fréquenter');
    if (kind === 'integre' && dir === 'down') addMem(g, c, 'le scandale du joueur m’a refroidi·e');
    if (kind === 'fidele' && dir === 'down') addMem(g, c, 'je reste aux côtés du joueur malgré la tempête');
    if (kind === 'trouble' && dir === 'down') addMem(g, c, 'je me suis rapproché·e du joueur pendant sa tempête');
  }
  const first = (c) => c.name.split(' ')[0];
  const names = (list) => (list.length === 1 ? first(list[0]) : list.slice(0, -1).map(first).join(', ') + ' et ' + first(list[list.length - 1]));
  const parts = TEMPER_IDS.filter((x) => said[x]).map((x) => `${names(said[x])} ${W[x].say[said[x].length > 1 ? 1 : 0]}`);
  for (const x of TEMPER_IDS) if (said[x]) beat.push(`${said[x].map((c) => '@' + c.handle).join(' et ')} ${{ fidele: dir === 'down' ? 'le soutient' : 's’en réjouit', integre: dir === 'down' ? 'prend ses distances' : 'salue un succès mérité', opportuniste: dir === 'down' ? 'le lâche' : 'se rapproche de lui par intérêt', detache: 's’en fiche', envieux: dir === 'down' ? 'savoure sa chute' : 'le jalouse (piques, sous-entendus)', trouble: 'se rapproche de lui, étrangement' }[x]}`);
  const head = dir === 'down' ? (lv === -2 ? '📉 Ton scandale fait le tri' : '📉 Ta mauvaise passe se sent') : (lv === 2 ? '👑 Te voilà au sommet' : '📈 Tu as le vent en poupe');
  addNotif(g, { k: dir === 'down' ? 'standdown' : 'standup', at: later() + 800, text: parts.length ? `${head} : ${parts.join(', ')}.` : `${head} : autour de toi, personne ne bouge vraiment… pour l’instant.` });
  if (cancelled.length) addChronicle(g, `${names(cancelled)} ${cancelled.length > 1 ? 'ont' : 'a'} annulé ${cancelled.length > 1 ? 'leur' : 'son'} rendez-vous avec ${g.player.name} à cause de sa réputation.`);
  if (beat.length) addTrigger(g, `${dir === 'down' ? (lv === -2 ? 'Le joueur est en plein scandale' : 'Le joueur traverse une mauvaise passe') : (lv === 2 ? 'Le joueur est au sommet' : 'Le joueur a le vent en poupe')} : chacun réagit selon son caractère : ${beat.join(' ; ')}. Montre-le (posts, réponses, messages privés), sans en faire le seul sujet.`);
  standCareer(g, dir, lv, t);
  if (dir === 'up' && lv === 2) echoAtTop(g, t);
}
// The career's share of a wave: the team, the brands.
function standCareer(g, dir, lv, t) {
  if (dir === 'down' && lv === -2) {
    for (const m of (g.staff || []).slice()) {
      const c = g.chars[m.c], r = standRoll();
      if (!c) continue;
      if (r < 0.1) { quitStaff(g, m, 'scandal'); continue; }
      if (r < 0.4 && STAFF_ROLES[m.role].pay !== 'cut') {
        m.rate = niceRound(m.rate * 1.25);
        addIncomingDM(g, c, 'Vu ce qui se passe en ce moment… je reste, mais avec une prime de risque : +25 %. J’espère que tu comprends.', later() + 2500, { max: 300 });
        addNotif(g, { k: 'money', c: c.id, at: later() + 2600, text: `${c.name} reste, mais demande +25 % à cause du scandale (${payWord(g, m)}). Tu peux t’en séparer dans ton studio.` });
      }
    }
    g.career.offerAt = Math.max(g.career.offerAt || 0, t + 6 * 3600000); // no brand comes near a scandal
  } else if (dir === 'up' && lv === 2) {
    for (const m of g.staff || []) { const c = g.chars[m.c]; if (c) c.rel = clamp(c.rel + 5, -100, 100); }
    for (const d of signedDeals(g)) {
      if (!d.fee || d.bonus || standRoll() >= 0.4) continue;
      d.bonus = true;
      const extra = niceRound(d.fee * 0.15);
      d.fee += extra;
      const c = g.chars[d.contact];
      if (c) addIncomingDM(g, c, `Vu ton succès en ce moment, on ajoute un bonus à notre contrat : +${fmtMoney(g, extra)} 🎉`, later() + 2000, { max: 300 });
      addNotif(g, { k: 'money', c: d.contact, at: later() + 2100, text: `${d.emoji} ${d.brand} ajoute un bonus de ${fmtMoney(g, extra)} à votre contrat : ton succès paie.` });
    }
    g.career.offerAt = Math.min(g.career.offerAt || 0, t + 3600000); // the brands come knocking
  }
}

/* ---------- butterfly effects: what the player did comes back, days later ---------- */
const ECHO_MIN = 36 * 3600000, ECHO_MAX = 14 * DAY_MS, ECHO_GAP = 2 * DAY_MS;
const ECHO_BAD = ['fake', 'caught', 'betray', 'lapin'];
function addEcho(g, kind, o = {}) {
  if (!g) return;
  if (!Array.isArray(g.echoes)) g.echoes = [];
  g.echoes.push({ id: uid('ec'), kind, at: Date.now(), c: o.c || null, text: str(o.text, 120), what: str(o.what, 30), used: false });
  if (g.echoes.length > 16) g.echoes.splice(0, g.echoes.length - 16);
}
// Someone else, to carry the echo further (a friend of theirs, or anyone who is not them).
const otherMain = (g, c, pred = () => true) => mains(g).filter((o) => o !== c && pred(o)).sort(() => standRoll() - 0.5)[0] || null;
const ECHO = {
  fake: (g, e, c) => {
    const dr = repMove(g, { cred: -12, image: -2 }, 'on ressort ta vieille fausse preuve', { noCheck: true });
    addTrigger(g, `Quelqu’un ressort la vieille histoire de la fausse preuve du joueur${c ? ` contre @${c.handle}` : ''} (« ${e.text} ») : ça en reparle, les rancuniers en remettent une couche.`, c ? c.id : null);
    return `🦋 On ressort ta vieille fausse preuve${c ? ` contre ${c.name}` : ''} : ${repWord(dr)}.`;
  },
  caught: (g, e, c) => {
    const o = otherMain(g, c, (x) => x.rel < 60);
    if (o) applyTrust(g, o, -5, 'ce qu’on raconte sur toi', later(), { quiet: true });
    repMove(g, { kind: -8 }, 'on raconte encore comment tu as piégé quelqu’un', { noCheck: true });
    if (c) addTrigger(g, `@${c.handle} raconte encore comment le joueur l’a piégé·e avec un conseil pourri${o ? ` : @${o.handle} l’écoute et se méfie` : ''}.`, c.id);
    return `🦋 ${c ? c.name : 'On'} raconte encore comment tu l’as piégé·e${o ? ` : ${o.name} se méfie de toi (confiance −5)` : ''}.`;
  },
  betray: (g, e, c) => {
    const o = otherMain(g, c);
    if (o) applyTrust(g, o, -6, 'ce qu’on raconte sur toi', later(), { quiet: true });
    if (c) addTrigger(g, `@${c.handle} n’a pas oublié que le joueur a révélé son secret, et le rappelle${o ? ` à @${o.handle}, qui se demande s’il peut lui faire confiance` : ''}.`, c.id);
    return `🦋 ${c ? c.name : 'Quelqu’un'} rappelle que tu as trahi son secret${o ? ` : ${o.name} hésite à te confier quoi que ce soit (confiance −6)` : ''}.`;
  },
  lapin: (g, e, c) => {
    const o = otherMain(g, c, (x) => x.rel < 80);
    if (o) nudgeRel(o, -3);
    if (c) addTrigger(g, `@${c.handle} n’a pas oublié le lapin que le joueur lui a posé (« ${e.text} ») et le raconte${o ? ` à @${o.handle}` : ''}.`, c.id);
    return `🦋 ${c ? c.name : 'Quelqu’un'} raconte encore ton lapin${o ? ` : ${o.name} t’en veut un peu (−3)` : ''}.`;
  },
  viral: (g, e) => {
    const n = grow(g.stats.followers, Math.max(20, Math.round(g.stats.followers * 0.02)));
    g.stats.followers += n;
    addTrigger(g, `Le vieux post viral du joueur (« ${e.text} ») refait surface : on le repartage, des nouveaux arrivent.`);
    checkMilestones(g);
    return `🦋 Ton post viral « ${str(e.text, 50)} » refait surface : ${nAbonnes(n, true)}.`;
  },
  advice: (g, e, c) => {
    const dr = repMove(g, { image: 6, kind: 3 }, 'on dit partout que tes conseils marchent', { noCheck: true });
    const o = otherMain(g, c, (x) => x.rel >= 0);
    if (o) applyTrust(g, o, 4, 'on dit que tes conseils marchent', later(), { quiet: true, free: true });
    if (c) addTrigger(g, `@${c.handle} raconte partout que le conseil du joueur (« ${e.text} ») l’a sauvé·e${o ? ` : @${o.handle} se dit qu’il pourrait lui demander conseil aussi` : ''}.`, c.id);
    return `🦋 ${c ? c.name : 'Quelqu’un'} raconte partout que ton conseil l’a sauvé·e : ${repWord(dr)}${o ? `, ${o.name} t’écoute davantage (confiance +4)` : ''}.`;
  },
  release: (g, e) => {
    const n = grow(g.stats.followers, Math.max(30, Math.round(g.stats.followers * 0.03)));
    g.stats.followers += n;
    addTrigger(g, `L’ancien contenu du joueur « ${e.text} » est recommandé à nouveau : une nouvelle vague le découvre.`);
    checkMilestones(g);
    return `🦋 ${cap1(e.what || 'ton contenu')} « ${str(e.text, 50)} » est recommandé${/^ta /.test(e.what || '') ? 'e' : ''} à nouveau : ${nAbonnes(n, true)}.`;
  },
  date: (g, e, c) => {
    if (c) nudgeRel(c, 3);
    const o = otherMain(g, c, (x) => temperOf(x) === 'envieux' || CLOSE_VIBES.includes(x.vibe) || PARTNER.includes(x.vibe));
    if (o) nudgeRel(o, -3);
    if (c) addTrigger(g, `@${c.handle} parle encore de sa super soirée avec le joueur (« ${e.text} »)${o ? ` : @${o.handle} en est jaloux·se` : ''}.`, c.id);
    return `🦋 ${c ? c.name : 'Quelqu’un'} parle encore de votre soirée${o ? ` : ${o.name} ${gx(o.g, 'est jaloux', 'est jalouse', 'est jaloux·se')} (−3)` : ''}.`;
  },
};
function runEcho(g, e, t = Date.now()) {
  const c = e.c ? g.chars[e.c] : null;
  if (e.c && (!c || !c.unlocked)) { e.used = true; return null; }
  e.used = true;
  g.echoAt = t;
  const text = ECHO[e.kind] ? ECHO[e.kind](g, e, c) : null;
  if (text) addNotif(g, { k: 'echo', c: c ? c.id : null, at: later() + 600, text });
  if (ECHO_BAD.includes(e.kind)) checkCancel(g);
  return text;
}
// Before a refresh: now and then, something from a few days ago comes back (never two in two days).
function surfaceEcho(g, t = Date.now()) {
  if (!g || !(g.echoes || []).length || t - (g.echoAt || 0) < ECHO_GAP || standRoll() >= 0.22) return null;
  const ok = g.echoes.filter((e) => !e.used && t - e.at >= ECHO_MIN && t - e.at <= ECHO_MAX);
  if (!ok.length) return null;
  return runEcho(g, ok[Math.floor(standRoll() * ok.length) % ok.length], t);
}
// At the top, people dig: an old story of the player's may come back right away.
function echoAtTop(g, t) {
  const old = (g.echoes || []).filter((e) => !e.used && ECHO_BAD.includes(e.kind) && t - e.at >= 12 * 3600000 && t - e.at <= ECHO_MAX);
  if (old.length && standRoll() < 0.6) runEcho(g, old[old.length - 1], t);
}

/* ---------- what the AI is told ---------- */
const STAND_CTX = {
  '-2': 'SA COTE EN CE MOMENT : en plein scandale. Chaque personnage réagit selon son tempérament face à la réputation du joueur (voir LIENS) : certains prennent leurs distances, d’autres restent, d’autres se rapprochent pour leurs propres raisons ; rien n’est tout noir ou tout blanc.',
  '-1': 'SA COTE EN CE MOMENT : mauvaise passe (réputation fragile, on jase). Les personnages réagissent selon leur tempérament (voir LIENS), sans en faire le seul sujet.',
  1: 'SA COTE EN CE MOMENT : il a le vent en poupe. Selon leur tempérament (voir LIENS), certains s’en réjouissent, d’autres se rapprochent par intérêt ou le jalousent.',
  2: 'SA COTE EN CE MOMENT : au sommet, tout le monde veut être vu avec lui. Selon leur tempérament (voir LIENS) : fierté, intérêt, jalousie ; et on ressort parfois ses vieux dossiers.',
};
const standCtx = (g) => STAND_CTX[String(standLv(g))] || null;
const STAND_SAY = { '-2': 'le joueur est en plein scandale', '-1': 'le joueur traverse une mauvaise passe', 1: 'le joueur a le vent en poupe', 2: 'le joueur est au sommet' };
// In the character's line: their temperament (in full when the player's name is moving, in a word otherwise).
const temperHid = (c) => (temperOf(c) === 'trouble' ? (c.hidden ? ' [secret du jeu : une arrière-pensée, liée à ses intérêts ou à son secret ; ne la dévoile pas]' : ' [secret du jeu : aucune arrière-pensée, c’est sa nature ; le joueur peut s’en méfier à tort]') : '');
function temperText(g, c, full) {
  const T = TEMPERS[temperOf(c)];
  if (!full) return `tempérament : ${temperOf(c)}`;
  return `face à la réputation du joueur : ${T.ai}${c.temperWhy ? ` (« ${c.temperWhy} »)` : ''}${temperHid(c)}`;
}
// 0.19: the same in a few words, when the prompt gives what each temperament means once for all (see ctxText).
const temperBrief = (g, c) => `tempérament : ${TEMPERS[temperOf(c)].ai.split(' : ')[0]}${c.temperWhy ? ` (« ${c.temperWhy} »)` : ''}${temperHid(c)}`;
// For the AI: characters whose temperament it has not written yet (games from before 0.9.4), a few per refresh.
const temperAsk = (g, focus) => mains(g).filter((c) => c.temperAuto && (!focus || focus.has(c.id))).slice(0, 3);
const TEMPER_WORLD = '   - "temper" = comment il ou elle réagit quand la réputation du joueur bouge (scandale, mauvaise passe, succès, célébrité), d’après son caractère : fidele (reste dans la tempête, heureux de ses succès), integre (un scandale le refroidit, respecte un succès mérité), opportuniste (suit le vent), detache (se fiche du buzz), envieux (jalouse ses succès, savoure ses chutes) ou trouble (se rapproche quand il est au plus bas, avec ou sans arrière-pensée) ; varie-les. "temperWhy" = comment ça se traduit chez lui ou elle et pourquoi, ≤ 90 caractères (ex : « a déjà tout perdu pour un ami : ne lâche jamais les siens »).';

/* ---------- screens ---------- */
function StandChip({ g }) {
  const lv = standLv(g), L = STANDING[String(lv)];
  if (!lv) return null;
  return html`<button class=${'stand-chip ' + L.cls} onClick=${() => queueModal({ t: 'standing' })} aria-label=${'Ta cote : ' + L.label + '. Ce que ça change'}><span aria-hidden="true">${L.emoji}</span> ${L.label}</button>`;
}
const STAND_EFFECTS = {
  '-2': ['Chacun réagit selon son caractère : certains prennent leurs distances (et peuvent annuler un rendez-vous), d’autres restent, d’autres se rapprochent… pour leurs raisons.', 'Les marques ne t’approchent plus, paient 40 % de moins et peuvent rompre un contrat (clause de moralité).', 'Les recrues demandent jusqu’à +40 %, ton équipe peut réclamer une prime… ou partir.'],
  '-1': ['On jase : les plus opportunistes s’éloignent, les plus fidèles restent.', 'Les marques paient 20 % de moins et se font rares.', 'Les recrues demandent +20 %.'],
  1: ['Les opportunistes se rapprochent, les envieux grincent des dents.', 'Les marques paient 10 % de plus et reviennent plus vite.', 'Les recrues sont un peu moins chères (−8 %).'],
  2: ['Tout le monde veut être vu avec toi : fierté, intérêt, jalousie.', 'Les marques paient 25 % de plus, se bousculent, et ajoutent parfois un bonus.', 'Les meilleures recrues veulent bosser avec toi (−15 %). Attention : au sommet, on ressort parfois les vieux dossiers.'],
};
function StandingCard({ g, close }) {
  const lv = standLv(g), L = STANDING[String(lv)];
  const known = mains(g).filter((c) => c.temperSeen);
  return html`<div class="modal-card stand-card">
    <span class="eyebrow">Ta cote en ce moment</span>
    <div class="modal-big" style="font-size:34px">${L.emoji} ${L.label || 'Normale'}</div>
    <ul class="stand-fx">${(STAND_EFFECTS[String(lv)] || ['Rien de spécial : ni scandale, ni gloire.']).map((x, k) => html`<li key=${k}>${x}</li>`)}</ul>
    ${known.length ? html`<p class="muted" style="font-size:13.5px">Ce que tu sais d’eux : ${known.map((c) => `${c.name.split(' ')[0]} ${TEMPERS[temperOf(c)].emoji} ${temperLabel(c).toLowerCase()}`).join(' · ')}</p>` : null}
    <button class="btn btn-hot" onClick=${close}>Compris</button>
  </div>`;
}
// On a main character's profile: how they react when the player's name moves (known once they have shown it).
function TemperSection({ c }) {
  const T = TEMPERS[temperOf(c)], first = c.name.split(' ')[0];
  const seen = !!c.temperSeen;
  return html`<section class="section temper-sec">
    <div class="section-h"><h3>Face à ta réputation</h3><span>${seen ? `${T.emoji} ${temperLabel(c)}` : 'à découvrir'}</span></div>
    <p class="muted">${!seen ? `Tu ne sais pas encore comment ${first} réagit quand ta réputation bouge : un scandale ou un succès te le montrera.`
      : temperOf(c) === 'trouble' || !c.temperWhy ? T.desc(c) : `${T.desc(c)} ${cap1(c.temperWhy).replace(/[.!…]+$/, '')}.`}</p>
  </section>`;
}
// The player's reputation, on 1000 (0.10): its four pillars, and what moved it lately.
function RepSection({ g, now }) {
  const s = g.stats, P = ensureRep(s), log = (s.repLog || []).slice(-8).reverse();
  const tone = (r) => (r < 35 ? 'bad' : r >= 60 ? 'good' : '');
  return html`<section class="section rep-sec">
    <div class="section-h"><h3>Réputation</h3><span><b>${rep1000(s.reputation)}</b> / 1000 · ${repLabel(s.reputation)}</span></div>
    <${Meter} frac=${s.reputation / 100} tone=${tone(s.reputation)} />
    <div class="rep-pillars">${REP_IDS.map((k) => html`<div class="rep-pillar" key=${k}>
      <span class="rp-h"><span aria-hidden="true">${REP_PILLARS[k].emoji}</span> ${REP_PILLARS[k].label}<b class="mono">${rep1000(P[k])}</b></span>
      <${Meter} frac=${P[k] / 100} tone=${tone(P[k])} />
      <small>${cap1(REP_PILLARS[k].desc)}</small>
    </div>`)}</div>
    <p class="muted rep-how">Elle se gagne lentement (de plus en plus lentement vers le sommet) et se perd vite. Les marques, les recrues et les persos la regardent.</p>
    ${log.length ? html`<div class="rep-log"><span class="rl-h">Pourquoi elle bouge</span>${log.map((x, k) => html`<div class="rl-row" key=${k}>
      <span class=${'rl-d ' + (x.d > 0 ? 'good' : 'bad')}>${repPts(x.d) > 0 ? '+' : '−'}${Math.abs(repPts(x.d))}</span><span class="rl-why">${cap1(x.why)}</span><time>${fmtAgo(x.at, now)}</time>
    </div>`)}</div>` : null}
  </section>`;
}
