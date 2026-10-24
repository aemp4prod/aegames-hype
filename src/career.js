/* =========================================================
   Career (0.7): the game clock and its seasons, the platform and its formats, trends, views and money,
   sponsors, the team, the daily upload, and the darker side of fame (rumors, leaked DMs, enemies who turn
   people against the player, allies who help).
   Real-world orders of magnitude (2026), simplified for the game:
   - YouTube Partner Program: 1 000 subscribers + 4 000 public watch hours over 12 months (or 10 M Shorts views
     over 90 days); 55 % of the ad revenue on videos, 45 % on Shorts; AdSense pays monthly from 70 €.
     Long videos earn a few euros per 1 000 views (more in finance or tech, less in gaming), Shorts a few cents.
     Advertisers pay the most at the end of the year (Q4 50 % or more above Q1), January collapses.
   - TikTok Creator Rewards: 10 000 followers + 100 000 views over 30 days, videos over a minute, ~0,40-1 € per 1 000 views.
   - Twitch Affiliate: 50 followers, 500 minutes of live over 7 different days, 3 viewers on average.
   - Instagram: no ad revenue share: brands pay (very roughly 10 € per 1 000 followers for a sponsored post).
   - French influencer law (9 June 2023): « Publicité » or « Collaboration commerciale », visible for the whole
     content; some products may not be promoted (cosmetic surgery, nicotine and vapes, betting tips…);
     up to 2 years and 300 000 € in the worst cases.
   ========================================================= */

/* ---------- the game clock: the date and the hour matter ---------- */
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const deMonth = (m) => (/^[aeiouyéèâ]/i.test(m || '') ? 'd’' : 'de ') + m; // « d’octobre », « de mars »
const monthKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const monthOfKey = (k) => { const m = /^(\d{4})-(\d{2})$/.exec(String(k || '')); return m ? MONTHS[+m[2] - 1] : ''; };
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const DAY_MS = 24 * 3600000;
function fmtGameClock(t = Date.now()) {
  const d = gameDate(t);
  return { day: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }), time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), d };
}
// « mer. 14 oct. à 18:00 », on the game clock.
const fmtGameAt = (ts) => { const c = fmtGameClock(ts); return c.day + ' à ' + c.time; };
// What advertisers pay, month by month (1 = the year's average): Black Friday and Christmas are the high season,
// January collapses (budgets are spent), the summer is calmer.
const AD_SEASON = [0.8, 0.85, 0.92, 0.95, 0.97, 0.97, 0.9, 0.93, 1, 1.1, 1.3, 1.5];
const adSeason = (d) => AD_SEASON[d.getMonth()];
const sponsorSeason = (d) => 0.55 + 0.45 * adSeason(d);
const SEASON_WORD = (d) => { const m = d.getMonth(); return m === 11 ? 'les fêtes : les pubs paient le plus de l’année' : m === 10 ? 'Black Friday approche : les pubs paient très bien' : m === 9 ? 'la fin d’année commence : les pubs remontent' : m === 0 ? 'janvier : les marques ont vidé leur budget, les pubs paient peu' : m === 6 || m === 7 ? 'l’été : plus de monde en ligne l’après-midi, mais des pubs moins chères' : 'une période normale pour les pubs'; };
// School holidays in France, roughly: the afternoons fill up.
function holidays(d) { const m = d.getMonth(), day = d.getDate(); return (m === 6 && day >= 4) || m === 7 || (m === 11 && day >= 19) || (m === 0 && day <= 4) || (m === 9 && day >= 18) || (m === 10 && day <= 2); }
// Who is online, hour by hour (1 = average): evenings are prime time, nights are empty, weekends a bit busier.
const HOUR_AUD = [0.45, 0.35, 0.3, 0.28, 0.28, 0.35, 0.5, 0.65, 0.75, 0.8, 0.85, 0.9, 1.05, 1.05, 0.95, 0.95, 1, 1.1, 1.25, 1.3, 1.3, 1.2, 1, 0.7];
function audienceAt(d) {
  const h = d.getHours(), wd = d.getDay();
  let a = HOUR_AUD[h];
  if (wd === 0 || wd === 6) a *= 1.08;
  if (holidays(d) && h >= 10 && h < 18) a *= 1.12;
  return a;
}
const audienceWord = (a) => (a >= 1.2 ? 'heure de pointe' : a >= 1 ? 'bonne heure' : a >= 0.7 ? 'heure creuse' : 'en pleine nuit');
const blackFriday = (y) => { const d = new Date(y, 10, 1); return new Date(y, 10, 1 + ((4 - d.getDay() + 7) % 7) + 22); }; // the day after the 4th Thursday of November
const CAL = [
  { id: 'nouvelan', emoji: '🎆', label: 'le Nouvel An', at: (y) => new Date(y, 0, 1), before: 1, after: 1, re: /nouvel an|r[ée]solution|bilan|r[ée]veillon/i, mood: 'les bilans de l’année, les résolutions' },
  { id: 'valentin', emoji: '💘', label: 'la Saint-Valentin', at: (y) => new Date(y, 1, 14), before: 6, after: 0, re: /amour|couple|valentin|c[ée]libat|crush|rencard|\bdate\b/i, mood: 'les couples, les célibataires, les déclarations', sp: 1.15 },
  { id: 'musique', emoji: '🎶', label: 'la Fête de la musique', at: (y) => new Date(y, 5, 21), before: 4, after: 0, re: /musique|concert|chanson|clip|\bson\b|playlist/i, mood: 'les concerts, les sons, les playlists' },
  { id: 'rentree', emoji: '🎒', label: 'la rentrée', at: (y) => new Date(y, 8, 1), before: 8, after: 6, re: /rentr[ée]e|[ée]cole|cours|routine|organisation|fournitures/i, mood: 'la fin des vacances, les nouvelles routines', sp: 1.1 },
  { id: 'halloween', emoji: '🎃', label: 'Halloween', at: (y) => new Date(y, 9, 31), before: 12, after: 1, re: /halloween|peur|horreur|d[ée]guis|citrouille|frisson|fant[ôo]me|zombie|sorci/i, mood: 'les déguisements, les frissons, les histoires qui font peur' },
  { id: 'blackfriday', emoji: '🛍️', label: 'le Black Friday', at: blackFriday, before: 6, after: 3, re: /promo|achat|haul|bon plan|black friday|shopping|soldes|\btest/i, mood: 'les promos, les achats, les bons plans', sp: 1.4 },
  { id: 'noel', emoji: '🎄', label: 'Noël', at: (y) => new Date(y, 11, 25), before: 22, after: 1, re: /no[ëe]l|cadeau|sapin|f[êe]tes|avent|hiver|neige/i, mood: 'les cadeaux, le calendrier de l’avent, les repas de famille', sp: 1.3 },
  { id: 'reveillon', emoji: '🥂', label: 'le réveillon', at: (y) => new Date(y, 11, 31), before: 3, after: 0, re: /r[ée]veillon|nouvel an|bilan|f[êe]te/i, mood: 'les soirées, les bilans de l’année' },
];
// The calendar moment around a date (Halloween in 6 days, Christmas today…), or null.
function calMoment(d) {
  const day = startOfDay(d), y = d.getFullYear();
  let best = null;
  for (const E of CAL) {
    for (const yy of [y - 1, y, y + 1]) {
      const days = Math.round((startOfDay(E.at(yy)) - day) / DAY_MS);
      if (days <= E.before && days >= -E.after && (!best || Math.abs(days) < Math.abs(best.days))) best = { E, days };
    }
  }
  return best;
}
const calWord = (m) => (!m ? '' : m.days > 1 ? `${m.E.label} dans ${m.days} jours` : m.days === 1 ? `${m.E.label} demain` : m.days === 0 ? `c’est ${m.E.label}` : `${m.E.label} vient de passer`);
// A topic in tune with the moment (a Halloween video in late October) reaches more people.
const calFits = (topic, d) => { const m = calMoment(d); return !!(m && m.days >= -1 && m.E.re.test(String(topic || ''))); };
// For the prompts: when it is, what the season means, what the calendar brings.
function calLine(t = Date.now()) {
  const d = gameDate(t), m = calMoment(d);
  return [`Date : ${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`, m ? ` Période : ${calWord(m)} (${m.E.mood}) : ça se sent sur le réseau, sans en faire le seul sujet.` : '', holidays(d) ? ' Ce sont les vacances scolaires.' : ''].join('');
}

/* ---------- platforms and formats ---------- */
const PLATFORMS = {
  youtube: { name: 'YouTube', emoji: '▶️', fmts: ['vidéo', 'short', 'live'], main: 'vidéo', shortName: 'short', fans: 'abonnés',
    tips: ['La miniature et le titre font cliquer : une bonne miniature peut doubler tes vues.', 'Le temps de visionnage compte : une vidéo qu’on regarde jusqu’au bout est poussée.', 'Les Shorts font découvrir ta chaîne, les vidéos longues font gagner l’argent.', 'La régularité est récompensée : un rendez-vous fixe fidélise.'] },
  tiktok: { name: 'TikTok', emoji: '🎵', fmts: ['short', 'live'], main: 'short', shortName: 'tiktok', fans: 'abonnés',
    tips: ['Tout se joue dans les deux premières secondes : soigne ton accroche.', 'Un son tendance peut multiplier tes vues… tant qu’il n’est pas usé.', 'La page Pour toi peut faire exploser une vidéo même sans abonnés : c’est très irrégulier.', 'En live, les spectateurs envoient des cadeaux.'] },
  instagram: { name: 'Instagram', emoji: '📸', fmts: ['short', 'live'], main: 'short', shortName: 'reel', fans: 'abonnés',
    tips: ['Les reels avec un audio tendance touchent plus de monde.', 'Une collab (publication à deux) mélange vos deux audiences.', 'Pas de partage des pubs sur Instagram : ton argent vient des marques, et elles adorent Insta.', 'L’esthétique et la régularité font revenir les gens.'] },
  twitch: { name: 'Twitch', emoji: '🎮', fmts: ['live', 'vidéo'], main: 'live', shortName: 'clip', fans: 'followers',
    tips: ['Ce sont les lives qui comptent : la régularité fait tout.', 'Les abonnements et les bits paient bien, dès que tu es Affilié·e.', 'Le soir, c’est l’heure de pointe des lives.'] },
  spotify: { name: 'Spotify', emoji: '🎧', fmts: ['podcast', 'clip'], main: 'podcast', shortName: 'extrait', fans: 'abonnés',
    tips: ['Tes sons rapportent à chaque écoute (environ 2 € les 1 000), via ton distributeur.', 'Les podcasts vivent surtout des sponsors lus à l’antenne.', 'Les sorties du vendredi et les playlists font tout.'] },
};
// In worlds where these brands make no sense, the same mechanics under the world's own names.
const WORLD_PF = {
  orion: { youtube: 'OrbiTube', tiktok: 'Pulse', instagram: 'Lumina', twitch: 'StarStream', spotify: 'Onde' },
  neolyon: { youtube: 'NeoTube', tiktok: 'Glitch', instagram: 'Chrome', twitch: 'NeonLive', spotify: 'Sono' },
  aldoree: { youtube: 'le Grand Miroir', tiktok: 'les Brèves', instagram: 'la Galerie', twitch: 'la Taverne', spotify: 'les Ménestrels' },
};
const WORLD_MONEY = { aldoree: { sym: 'écus', one: 'écu' }, orion: { sym: 'crédits', one: 'crédit' } };
const pfName = (g, id) => { const w = WORLD_PF[g.world.preset]; return (w && w[id]) || (PLATFORMS[id] || PLATFORMS.youtube).name; };
function guessPlatform(identity) {
  const t = String(identity || '').toLowerCase();
  if (/tik ?tok/.test(t)) return 'tiktok';
  if (/twitch|streame|stream\b/.test(t)) return 'twitch';
  if (/podcast|chanteu|rappeu|musici|artiste|\bdj\b|beatmak|compositeu|\bsons?\b/.test(t)) return 'spotify';
  if (/insta|influen|lifestyle|\bmode\b|fashion|beaut|mannequin|photo/.test(t)) return 'instagram';
  return 'youtube';
}
const platformOf = (g) => (g.career && PLATFORMS[g.career.platform] ? g.career.platform : 'youtube');
const PF = (g) => PLATFORMS[platformOf(g)];
// The niche sets what ads pay and what brands offer (real RPMs differ a lot by subject).
const NICHES = [
  { id: 'finance', label: 'Finance & business', re: /financ|bourse|crypto|invest|business|entrepreneu|immobili|argent/, rpm: 2.4, sp: 1.5 },
  { id: 'tech', label: 'Tech & sciences', re: /tech|informati|\bia\b|intelligence artificielle|\bcode|d[ée]velopp|smartphone|gadget|science/, rpm: 1.6, sp: 1.3 },
  { id: 'educ', label: 'Éducation', re: /[ée]duc|vulgaris|histoire|cours\b|\bprof|apprend|langue/, rpm: 1.3, sp: 1 },
  { id: 'beaute', label: 'Beauté & mode', re: /beaut|maquill|\bmode\b|fashion|skincare|lifestyle|style/, rpm: 1.1, sp: 1.35 },
  { id: 'cuisine', label: 'Cuisine', re: /cuisin|recette|food|p[âa]tiss|\bchef/, rpm: 1, sp: 1.1 },
  { id: 'sport', label: 'Sport', re: /sport|foot|fitness|muscu|basket|tennis|athl|\bcourse/, rpm: 0.9, sp: 1.1 },
  { id: 'gaming', label: 'Gaming', re: /gam|jeu vid|jeux vid|esport|console|minecraft/, rpm: 0.6, sp: 0.9 },
  { id: 'musique', label: 'Musique', re: /musi|chant|\brap|clip|\bdj\b|artiste/, rpm: 0.6, sp: 0.85 },
  { id: 'humour', label: 'Humour & divertissement', re: /humour|sketch|blague|divert|vlog|prank|r[ée]action|drama|potin|actu/, rpm: 0.7, sp: 1 },
];
const NICHE_ANY = { id: 'general', label: 'Généraliste', rpm: 0.9, sp: 1 };
const nicheOf = (g) => NICHES.find((n) => n.re.test(String(g.player.identity || '').toLowerCase())) || NICHE_ANY;
// What each format brings: share = part of the followers who see it in its first week; disc = what the algorithm
// brings even to an unknown; mins = average watch time per view (the watch hours of the partner program).
const FORMATS = {
  vidéo: { share: 0.2, disc: 250, mins: 4.5 },
  short: { share: 0.55, disc: 900, mins: 0.5 },
  live: { share: 0.05, disc: 25, mins: 14 },
  clip: { share: 0.3, disc: 400, mins: 2.5 },
  podcast: { share: 0.1, disc: 60, mins: 22 },
};

/* ---------- money: the player's cash, in euros (or the world's own coin) ---------- */
const nfMoney = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nfCents = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function fmtMoney(g, n, cents) {
  const W = g && WORLD_MONEY[g.world.preset];
  const v = Math.abs(n) < 100 && cents !== false && Math.round(n) !== n ? nfCents.format(n) : nfMoney.format(Math.round(n));
  return W ? `${v} ${Math.abs(n) >= 2 ? W.sym : W.one}` : `${v} €`;
}
const START_CASH = { anon: 0, rising: 3000, star: 60000 }; // 0.14: an unknown starts from nothing
function newCareer(persona, st) {
  const start = persona && START[persona.start] ? persona.start : 'anon';
  const t = Date.now();
  const c = {
    platform: persona && PLATFORMS[persona.platform] ? persona.platform : guessPlatform(persona && persona.identity),
    cash: start in START_CASH ? START_CASH[start] : 0, est: 0, estMonth: monthKey(gameDate(t)), owed: 0, earned: 0,
    ledger: [], log: [], prog: { state: 'none' }, offerAt: t, trendAt: 0, payAt: t,
  };
  // a channel that already exists has a past (and a star is already in the partner program)
  if (start === 'rising') c.log.push({ at: t - 120 * DAY_MS, what: 'vidéo', views: 41000, hours: 3075, past: true });
  if (start === 'star') { c.log.push({ at: t - 60 * DAY_MS, what: 'vidéo', views: 2400000, hours: 180000, past: true }); c.prog = { state: 'on', at: t - 300 * DAY_MS }; }
  c.aud = audStart({ career: c }, st ? st.followers : 0); // 0.29.1: who watches its long videos
  return c;
}
function migrateCareer(g) {
  if (!g.career || typeof g.career !== 'object') g.career = newCareer(g.player, START[g.player.start] || START.anon);
  const c = g.career;
  for (const k of ['ledger', 'log']) if (!Array.isArray(c[k])) c[k] = [];
  if (!c.prog || typeof c.prog !== 'object') c.prog = { state: 'none' };
  if (!PLATFORMS[c.platform]) c.platform = guessPlatform(g.player.identity);
  for (const k of ['deals', 'staff', 'trends', 'rumors', 'intel']) if (!Array.isArray(g[k])) g[k] = [];
  if (g.series === undefined) g.series = null;
  if (!g.boosts) g.boosts = { reach: false, viral: false, push: false };
  if (!c.aud || typeof c.aud !== 'object') c.aud = audStart(g); // 0.29.1: from what it has published so far
}
function ledger(g, label, amount, kind = '') {
  const c = g.career;
  c.ledger.push({ at: Date.now(), label: str(label, 120), amount: Math.round(amount * 100) / 100, kind });
  if (c.ledger.length > 60) c.ledger.splice(0, c.ledger.length - 60);
}
// Money in or out of the cash (out: false when there is not enough).
function earn(g, amount, label, kind) { if (!(amount > 0)) return; g.career.cash += amount; g.career.earned += amount; ledger(g, label, amount, kind || 'in'); }
function pay(g, amount, label, kind) {
  if (!(amount > 0)) return true;
  if (g.career.cash < amount) return false;
  g.career.cash -= amount;
  ledger(g, label, -amount, kind || 'out');
  return true;
}
// What is owed whatever the cash (a fine, a penalty, a refund): the account can go below zero.
function charge(g, amount, label, kind) { if (!(amount > 0)) return; g.career.cash -= amount; ledger(g, label, -amount, kind || 'out'); }
// 0.28.1: what a move did to the reputation, in a notice, between pre and post: nothing when it did not move (never
// « +0 de réputation »)
const repBit = (dr, pre = '', post = '') => (repPts(dr) ? `${pre}${repWord(dr)}${post}` : '');

/* ---------- the partner programs: what unlocks the platform's own money ---------- */
const sumLog = (g, days, pick) => { const from = Date.now() - days * DAY_MS; return g.career.log.reduce((n, x) => (x.at >= from ? n + (pick(x) || 0) : n), 0); };
function programOf(g) {
  const pf = platformOf(g), s = g.stats, c = g.career;
  const P = { youtube: { name: 'Programme Partenaire YouTube', review: 3 }, tiktok: { name: 'Programme de récompenses des créateurs', review: 2 }, twitch: { name: 'Programme Affilié', review: 0 }, instagram: null, spotify: null }[pf];
  if (!P) return null;
  let needs;
  if (pf === 'youtube') {
    const hours = sumLog(g, 365, (x) => x.hours), shorts = sumLog(g, 90, (x) => (x.what === 'short' ? x.views : 0));
    needs = [{ label: '1 000 abonnés', cur: s.followers, goal: 1000 },
      shorts > hours * 2500 ? { label: '10 M de vues Shorts sur 90 jours', cur: shorts, goal: 10e6 } : { label: '4 000 h de visionnage sur 12 mois', cur: hours, goal: 4000, unit: 'h' }];
  } else if (pf === 'tiktok') {
    needs = [{ label: '10 000 abonnés', cur: s.followers, goal: 10000 }, { label: '100 000 vues sur 30 jours', cur: sumLog(g, 30, (x) => x.views), goal: 100000 }];
  } else {
    const lives = c.log.filter((x) => x.what === 'live' && x.at >= Date.now() - 30 * DAY_MS);
    const days = new Set(lives.map((x) => realDay(x.at))).size;
    const avg = lives.length ? Math.round(lives.reduce((n, x) => n + (x.cc || 0), 0) / lives.length) : 0;
    needs = [{ label: '50 followers', cur: s.followers, goal: 50 }, { label: '500 min de live sur 30 jours', cur: lives.length * 120, goal: 500, unit: 'min' }, { label: '7 jours de live différents', cur: days, goal: 7 }, { label: '3 spectateurs en moyenne', cur: avg, goal: 3 }];
  }
  return Object.assign({ pf, ok: needs.every((n) => n.cur >= n.goal), needs }, P);
}
const monetized = (g) => g.career.prog.state === 'on' && !demonetized(g); // 0.21: three warnings, no ads for a while
// 0.32.1: a refusal decided by the old rule (no reason kept) is looked at again: yes now if nothing blocks any more
function reviewProgram321(g, t = Date.now()) {
  const c = g.career, P = c && c.prog && c.prog.state === 'refused' && !c.prog.why ? programOf(g) : null;
  if (!P) return false;
  const why = progRefusal(g, t);
  if (!why && P.ok) {
    c.prog = { state: 'on', at: t, again: 1 };
    addNotif(g, { k: 'money', at: t, text: `✅ Le ${P.name} a réexaminé ta candidature : ${px(g, 'accepté', 'acceptée', 'accepté·e')} ! Tes ${platformOf(g) === 'twitch' ? 'lives' : 'contenus'} rapportent de l’argent maintenant.` });
  } else {
    c.prog.why = why || 'il te manque encore une condition';
    if (!why) c.prog.retry = Math.min(c.prog.retry || t, t); // (only the conditions: retry once they are met)
  }
  return true;
}
function applyProgram(g) {
  const P = programOf(g), c = g.career;
  if (!P || !P.ok || c.prog.state === 'on' || c.prog.state === 'review') return false;
  c.prog = { state: 'review', at: Date.now(), until: Date.now() + Math.max(P.review, 0.01) * DAY_MS };
  addNotif(g, { k: 'money', text: P.review ? `Candidature envoyée au ${P.name} : réponse sous ${P.review} jours (en vrai, ça peut prendre jusqu’à un mois).` : `Tu rejoins le ${P.name}.` });
  return true;
}
// 0.32.1: why a partner program says no ('' : yes). Only what weighs when it decides: a reputation far too low, a cancel,
// a bad buzz still going, ads cut for warnings. A bad buzz that is over, even a recent one, no longer blocks (before: any
// bad buzz in the 7 days before; « à peine j'ai un drama pas ouf… j'ai pas pu l'avoir et je sais même pas pourquoi »).
const PROG_REP_MIN = 25;
function progRefusal(g, t = Date.now()) {
  const s = g.stats;
  if (s.reputation < PROG_REP_MIN) return `ta réputation est trop basse (${rep1000(s.reputation)}/1000, il faut au moins ${rep1000(PROG_REP_MIN)})`;
  if (s.cancelled) return 'tu es en plein cancel';
  if (g.pbb && !g.pbb.over && t < g.pbb.until) return 'tu étais en plein bad buzz au moment de l’examen';
  if (demonetized(g, t)) return 'tes pubs sont coupées pour avertissements';
  return '';
}
function checkProgram(g, t) {
  const c = g.career;
  if (c.prog.state !== 'review' || t < c.prog.until) return false;
  const P = programOf(g), why = progRefusal(g, t);
  if (why) {
    c.prog = { state: 'refused', at: t, retry: t + 7 * DAY_MS, why };
    addNotif(g, { k: 'money', text: `${px(g, 'Refusé', 'Refusée', 'Refusé·e')} au ${P ? P.name : 'programme'} : ${why}. Retente dans 7 jours.` });
  } else {
    c.prog = { state: 'on', at: t };
    addNotif(g, { k: 'money', text: `${px(g, 'Accepté', 'Acceptée', 'Accepté·e')} au ${P ? P.name : 'programme'} ! Tes ${platformOf(g) === 'twitch' ? 'lives' : 'contenus'} rapportent de l’argent maintenant.` });
    queueModalFor(g, { t: 'money', what: 'program' });
  }
  return true;
}

/* ---------- what a release earns: views, then money ---------- */
const TIER_VIEWS = { top: 1.6, mid: 0.85, flop: 0.35 };
// 0.21: what a release earns from ads depends on what the advertisers make of it (the AI judges it at its release):
// green, every ad; yellow, limited ads; red, demonetized. And on what its topic is worth to them (adv, 1 to 5): from
// about 0,60 € the 1 000 views (topics they avoid) to 11 € (the most sought after), ×1,5 at the end of the year.
const ADV_RPM = [0, 0.6, 1.4, 2.8, 5, 11];
const ADS_STATES = { vert: { k: 1, label: 'Toutes les pubs', tone: 'good', dot: '🟢' }, jaune: { k: 0.3, label: 'Pubs limitées', tone: 'warn', dot: '🟡' }, rouge: { k: 0, label: 'Démonétisée', tone: 'bad', dot: '🔴' } };
const DECL = [['violence', 'Violence'], ['langage', 'Langage grossier'], ['sensible', 'Sujet sensible'], ['choc', 'Contenu choquant']];
const nicheAdv = (g) => { const k = nicheOf(g).rpm; return k <= 0.7 ? 2 : k <= 1.1 ? 3 : k <= 1.7 ? 4 : 5; }; // when the judge said nothing
// € per 1 000 views for the creator, in an average month, once the program is unlocked (and what needs no program).
// ads: the advertisers' verdict on this release (none: an estimate, as if every ad ran).
function rpmOf(g, what, ads) {
  const pf = platformOf(g), on = monetized(g);
  const k = ads ? (ADS_STATES[ads.s] || ADS_STATES.vert).k : 1, adv = ads && ads.adv ? ads.adv : nicheAdv(g);
  if (pf === 'youtube') return k * (what === 'short' ? (on ? 0.03 : 0) : what === 'live' ? (on ? 2 : 0) : on ? ADV_RPM[adv] : 0); // (0.21: in lives, the donations come apart)
  if (pf === 'tiktok') return k * (what === 'live' ? 0 : on ? 0.4 * Math.sqrt(adv / 3) : 0);
  if (pf === 'instagram') return 0;
  if (pf === 'twitch') return k * (what === 'live' ? (on ? 10 : 0) : 0);
  if (pf === 'spotify') return what === 'clip' ? 2 : 0;
  return 0;
}
// Where the player declares what a release contains, before publishing (like YouTube's self-certification): the
// platforms that rate content for their advertisers, once the release earns from ads.
const declOn = (g, what) => ['youtube', 'twitch'].includes(platformOf(g)) && rpmOf(g, what) > 0;
// The verdict on a release: the AI's, and what the player declared. Declared: limited ads at best, never a warning.
// Hidden and spotted: the AI's verdict, and a warning.
function adsOf(g, r, e, form) {
  const judged = (e && e.ads) || (e && e.controversy >= 8 ? 'jaune' : 'vert');
  const decl = Array.isArray(form && form.decl) ? form.decl.filter((x) => DECL.some(([k]) => k === x)) : [];
  const self = declOn(g, r.what);
  let s = judged, caught = false;
  if (self && decl.length) s = judged === 'rouge' ? 'rouge' : 'jaune';
  else if (self && judged !== 'vert') caught = true;
  return { s, adv: (e && e.adv) || nicheAdv(g), why: str(e && e.adsWhy, 50), decl, caught, judged };
}
// Three warnings in 90 days: no more ads for 30 days.
const STRIKE_DAYS = 90, STRIKE_MAX = 3, DEMONET_DAYS = 30;
const liveStrikes = (g, t = Date.now()) => (g.career.strikes || []).filter((x) => t - x.at < STRIKE_DAYS * DAY_MS);
const demonetized = (g, t = Date.now()) => !!(g.career.demonet && t < g.career.demonet.until);
function adsStrike(g, post, t = Date.now()) {
  const c = g.career;
  c.strikes = liveStrikes(g, t).concat([{ at: t, p: post.id }]);
  if (c.strikes.length < STRIKE_MAX) return c.strikes.length;
  c.demonet = { at: t, until: t + DEMONET_DAYS * DAY_MS };
  c.strikes = [];
  addNotif(g, { k: 'money', p: post.id, text: `🚫 ${STRIKE_MAX} avertissements en ${STRIKE_DAYS} jours : plus aucune pub sur tes contenus pendant ${DEMONET_DAYS} jours (retour ${fmtWhen(c.demonet.until, t)}).` });
  addTrigger(g, `La plateforme vient de couper toutes les pubs du joueur pour ${DEMONET_DAYS} jours (contenus non déclarés aux annonceurs) : ça se sait, certains se moquent, d’autres le plaignent.`);
  return STRIKE_MAX;
}
// 0.21: a yellow or red release can be reviewed once, by someone at the platform: sometimes it goes back up.
const APPEAL_WIN = { jaune: 0.4, rouge: 0.3 };
const vidTitle = (v) => str(v.title || v.topic, 40);
function appealAds(g, post) {
  const A = post && post.video && post.video.ads;
  if (!A || A.s === 'vert' || A.appeal) return false;
  A.appeal = 'pending';
  A.appealAt = Date.now() + randi(20, 44) * 3600000;
  addNotif(g, { k: 'money', p: post.id, text: `Réexamen demandé pour « ${vidTitle(post.video)} » : réponse ${fmtWhen(A.appealAt)}.` });
  return true;
}
function checkAppeals(g, t) {
  let ch = false;
  for (const p of g.posts) {
    const A = p.a === 'p' && p.video && p.video.ads;
    if (!A || A.appeal !== 'pending' || t < A.appealAt) continue;
    ch = true;
    if (Math.random() >= (APPEAL_WIN[A.s] || 0)) {
      A.appeal = 'lost';
      addNotif(g, { k: 'money', p: p.id, text: `Réexamen refusé pour « ${vidTitle(p.video)} » : ${ADS_STATES[A.s].label.toLowerCase()}, c’est définitif.` });
      continue;
    }
    const from = A.s, wasCaught = !!A.caught;
    A.s = from === 'rouge' ? 'jaune' : 'vert';
    A.appeal = 'won';
    if (wasCaught) { A.caught = false; g.career.strikes = (g.career.strikes || []).filter((x) => x.p !== p.id); }
    const delta = p.video.claim ? 0 : Math.round(p.video.views * (A.base || 0) * (ADS_STATES[A.s].k - ADS_STATES[from].k) * (A.season || 1) / 10) / 100;
    if (delta > 0) { g.career.est += delta; p.video.money = Math.round(((p.video.money || 0) + delta) * 100) / 100; ledger(g, `Réexamen gagné : « ${vidTitle(p.video)} »`, delta, 'est'); }
    addNotif(g, { k: 'money', p: p.id, text: `Réexamen accepté pour « ${vidTitle(p.video)} » : ${ADS_STATES[A.s].label.toLowerCase()}${delta > 0 ? ` (+${fmtMoney(g, delta)} estimés)` : ''}${wasCaught ? ', et ton avertissement est retiré' : ''}.` });
  }
  return ch;
}
/* ---------- 0.29.1: two publics in the same subscribers (YouTube): the shorts', and the long videos' ----------
   A short is found in a feed people swipe: it reaches the subscribers, and far more. A long video (or a live) is watched
   by those who come for long videos (« ton public vidéo »), by a few short-form fans who click, and by those the
   algorithm brings, more and more as good videos come out. Each one makes some of the short-form fans who watched it its
   own public (more when it is good, far more when the community is warm), and a short that announces it, before or after,
   sends it some of its viewers. The count on the profile stays one: what differs is who watches what. */
const AUD = {
  share0: 0.03, // a channel of shorts only: the part of its subscribers who also watch its long videos
  trickle: { vidéo: 0.02, live: 0.012 }, // the short-form fans who click (a live notifies everyone: a few more come)
  conv: { top: 0.3, mid: 0.12, flop: 0.02 }, // of the short-form fans who watched, those who stay for the long ones
  convLive: 0.5, // (a live converts half as much)
  trustK: 0.25, trustMax: 8, trustStep: { top: 1, mid: 0.4, flop: -1 }, // the algorithm's trust in its long videos
  newFans: { vidéo: 0.85, live: 0.7, short: 0.04 }, // who the new subscribers of a release come for
  folCap: 0.06, // a long video's new subscribers: at most 6 % of its views
  tease: 0.01, link: 0.008, promoTier: { top: 1.3, mid: 1, flop: 0.5 }, promoDays: 7, linkDays: 14,
};
const audSplit = (g) => { const f = PF(g).fmts; return f.includes('short') && f.includes('vidéo'); };
const audLong = (g, what) => audSplit(g) && what in AUD.trickle;
// How much a warm community follows the player from one format to another (0,5 glaciale, 1 tiède, 1,75 at 100).
const warmK = (g) => clamp(0.5 + warmOf(g) / 80, 0.5, 1.75);
// Where a game's long-form public starts: what it has published (long videos: most of its subscribers; shorts: a few).
// A channel with nothing out yet: half, until its releases decide.
function audStart(g, F = g.stats ? g.stats.followers : 0) {
  const log = (g.career && g.career.log) || [];
  const nV = log.filter((x) => x.what === 'vidéo').length, nS = log.filter((x) => x.what === 'short').length;
  const sh = nV + nS ? clamp(AUD.share0 + 0.92 * nV / (nV + 0.6 * nS), AUD.share0, 0.95) : 0.5;
  F = Math.max(0, num(F, 0));
  return { fans: Math.round(F * sh), trust: Math.min(6, 0.6 * nV), f0: F };
}
// The long-form public now (F: the followers to count it at, by default the current ones). Followers that came or went
// some other way (a post, a bad buzz) keep the same mix; a release says who its own come for (audAfter).
function vidAud(g, F = g.stats.followers) {
  const c = g.career;
  if (!c.aud || typeof c.aud !== 'object' || !(c.aud.fans >= 0)) c.aud = audStart(g);
  const A = c.aud;
  F = Math.max(0, num(F, 0));
  if (!(A.trust >= 0)) A.trust = 0;
  if (F !== A.f0) { A.fans = A.f0 > 0 ? A.fans * F / A.f0 : F * 0.5; A.f0 = F; }
  A.fans = clamp(A.fans, 0, F);
  return A;
}
const vidFans = (g) => (audSplit(g) ? Math.round(vidAud(g).fans) : Math.max(0, g.stats.followers));
// The shorts that announce a long video, already out: some of their viewers come when it is out (the best one in full,
// the next ones less and less).
const promoShorts = (g, r) => (g.releases || []).filter((x) => x.promo === r.id && x.state === 'released' && x.out);
function promoViews(g, r, at = Date.now()) {
  if (!r || !r.id) return 0;
  const vs = promoShorts(g, r).filter((x) => x.releasedAt <= at && at - x.releasedAt < AUD.promoDays * DAY_MS)
    .map((x) => { const p = g.posts.find((y) => y.id === x.out); return p && p.video ? (p.video.views || 0) * (AUD.promoTier[x.tier] || 1) : 0; })
    .sort((a, b) => b - a);
  return vs.reduce((n, v, k) => n + v * Math.pow(0.5, k), 0) * AUD.tease * warmK(g);
}
// The views a release gets over its first week, before luck, in two parts: a, what virality may carry further (its own
// audience, the algorithm's discovery, a collab); b (0.29.1), the short-form fans who click a long video and the viewers
// a short sends to it.
function viewsParts(g, r, played, at, form) {
  const s = g.stats, F = Math.max(0, s.followers), Fm = FORMATS[r.what] || FORMATS.vidéo;
  const D = diffOf(played.diff || r.diff), d = gameDate(at), T = TIER_VIEWS[played.tier] || 0.85;
  const disc = Fm.disc * (0.4 + played.score) * Math.pow(D.mult, 0.6);
  let a, b = 0, tz = 0;
  if (audLong(g, r.what)) {
    const A = vidAud(g), L = Math.min(A.fans, F);
    a = L * Fm.share * T + disc * (1 + AUD.trustK * A.trust);
    tz = r.what === 'vidéo' ? promoViews(g, r, at) : 0;
    b = (F - L) * AUD.trickle[r.what] * T * warmK(g) + tz;
  } else a = F * Fm.share * T + disc;
  let m = 0.35 + 0.65 * audienceAt(d);
  const sm = staffMult(g, 'views', r.what, form && form.crew);
  m *= r.big ? 1 + (sm - 1) * 1.5 : sm; // (0.30.1: in a big production, the team counts more)
  m *= 1 + trendBoost(g, r, form, at);
  if (calFits(r.topic, d)) m *= 1.3;
  if (form && typeof form.thumbCtr === 'number') m *= 1 + clamp(form.thumbCtr, 0, 0.4); // 0.14: the thumbnail made in the studio
  else if (form && form.thumb) m *= (THUMBS[form.thumb] || { ctr: 0 }).ctr + 1;
  if (form && form.hook && form.hook.trim().length >= 8) m *= 1.12;
  a *= m;
  b *= m;
  if (form && form.collab) { const cc = g.chars[form.collab]; if (cc) a += Math.pow(cc.followers, 0.92) * 0.12; }
  if (r.big) for (const cc of castIn(g, r)) if (!form || cc.id !== form.collab) a += Math.pow(cc.followers, 0.92) * 0.12; // 0.30.1: the cast brings its public
  let k = 1;
  if (r.series) k *= seriesMult(g);
  k *= coupleBoost(g); // 0.14: a couple just made public draws eyes to both
  k *= gearViewsMult(g, r.what); // 0.20: what the player films, records and edits with
  if (form && 'push' in form ? form.push : g.boosts.push) k *= 2; // (0.29.1: a release reads the push it had when it went out: the game resets it as it starts)
  if (s.reputation < 30) k *= 0.75;
  if (r.care && careOK(r.what)) k *= CARE_K; // 0.30.1: « soignée »: +15 %
  if (r.big) k *= (played.tier === 'flop' ? 1 + (r.big.k - 1) * 0.3 : r.big.k) * (1 + (r.big.hype || 0)) * (form && form.premiere ? 1.1 : 1); // 0.30.1: a big production (a flop, far less), a leak played up, a premiere
  return { a: a * k, b: b * k, tease: tz * m * k };
}
// The views a release gets over its first week, without luck (the upload screen shows an estimate from it).
function viewsCore(g, r, played, at, form) { const p = viewsParts(g, r, played, at, form); return p.a + p.b; }
// The views a release really gets (computed once, shown counting up): luck, virality, the For You page. (0.29.1: a
// long video's virality carries its own audience further, not the short-form fans who clicked.) out.b: the views of
// the second part, as they came.
function releaseViews(g, r, played, viral, at, form, out) {
  const p = viewsParts(g, r, played, at, form), sk = 1 + skillFx(g, 'views'); // 0.24: creativity
  let v = p.a * sk;
  if (viral) v *= rand(3, 6);
  v += p.b * sk;
  if (platformOf(g) === 'tiktok' && r.what === 'short') v *= rand(0.6, 1.7); // the For You page: very irregular
  const luck = rand(0.85, 1.15);
  if (out) { out.b = Math.round(p.b * sk * luck); out.tease = Math.round(p.tease * sk * luck); }
  return Math.max(3, Math.round(v * luck));
}
function estimateViews(g, r, form) {
  const v = viewsCore(g, r, r.played || { tier: 'mid', score: 0.6 }, Date.now(), Object.assign({ crew: r.crew || [] }, form)) * (1 + skillFx(g, 'views'));
  const wide = platformOf(g) === 'tiktok' && r.what === 'short';
  return [Math.max(3, Math.round(v * (wide ? 0.5 : 0.8))), Math.max(5, Math.round(v * (wide ? 1.8 : 1.2)))];
}
// 0.29.1: a long video's views are known before its reactions (its own public, not every subscriber): its likes and its
// new subscribers follow them (no video seen by 10 000 people bringing 15 000 subscribers). Called with its outcome.
function releaseEarly(ctx, out) {
  const g = ctx.g, v = ctx.video, r = v && v.r;
  if (!r) return; // (0.30: every format: likes and new subscribers never above what the views allow)
  const form = Object.assign({}, v.form || {}, { crew: r.crew || [], push: !!(ctx.boosts && ctx.boosts.push) });
  const o = {};
  let views = releaseViews(g, r, { tier: v.tier, score: v.score, diff: v.diff }, !!out.viral, Date.now(), form, o);
  const k = modCut(g, true) * (ctx.eval && ctx.eval.tox >= 2 ? 1 + toxShare(g) : 1); // 0.30: the platform's reach cut, a toxic public that watches every clash
  if (k !== 1) { views = Math.round(views * k); if (o.b) o.b = Math.round(o.b * k); if (o.tease) o.tease = Math.round(o.tease * k); }
  if (audLong(g, r.what)) ctx.early = { views, b: o.b, tease: o.tease };
  ctx.vearly = views; // (the release's views, counted once: releaseCareer takes them as they are)
  const seen = views * (form.membLive && r.what === 'live' && membOn(g) ? 0.35 : 1); // (a live for the members only: far fewer)
  const lk = Math.max(1, Math.round(seen * rand(0.22, 0.38)));
  if (out.likes > lk) { out.reposts = Math.round(out.reposts * lk / Math.max(1, out.likes)); out.likes = lk; }
  const fc = Math.round(seen * AUD.folCap);
  if (out.fol > fc) out.fol = fc;
}
// After a release on a platform of both: who its new subscribers come for, the short-form fans it won over, the trust
// of the algorithm in the player's long videos. fol: what it brought (already counted). Returns the fans won over.
function audAfter(g, r, tier, fol, early) {
  if (!audSplit(g)) return 0;
  const F = Math.max(0, g.stats.followers), A = vidAud(g, F - Math.max(0, fol)); // (as it was before its own)
  const long = audLong(g, r.what);
  const add = fol > 0 ? fol * (r.what in AUD.newFans ? AUD.newFans[r.what] : A.fans / Math.max(1, A.f0)) : 0;
  const conv = long ? Math.round((early ? early.b : 0) * (AUD.conv[tier] || 0) * Math.min(1.3, warmK(g)) * (r.what === 'live' ? AUD.convLive : 1)) : 0;
  if (r.what === 'vidéo') A.trust = clamp(A.trust + (AUD.trustStep[tier] || 0), 0, AUD.trustMax);
  A.fans = clamp(A.fans + add + conv, 0, F);
  A.f0 = F;
  return conv;
}
// 0.29.1: the long videos a short can announce (programmed) or send viewers to (out in the last two weeks).
function promoTargets(g, t = Date.now()) {
  if (!audSplit(g)) return [];
  const rs = g.releases || [];
  return [...rs.filter((x) => x.state === 'scheduled' && x.what === 'vidéo').sort((a, b) => a.due - b.due),
    ...rs.filter((x) => x.state === 'released' && x.what === 'vidéo' && x.out && t - (x.releasedAt || 0) < AUD.linkDays * DAY_MS).sort((a, b) => b.releasedAt - a.releasedAt)].slice(0, 4);
}
// 0.29.1: what the reactions know of who watches: a long video seen mostly by its own public; a short that announces one.
function audLine(g, r) {
  if (!r || !audSplit(g)) return '';
  const sn = PF(g).shortName, out = [];
  if (audLong(g, r.what)) {
    const A = vidAud(g), F = Math.max(1, g.stats.followers);
    if (A.fans / F < 0.4) out.push(`Le joueur est surtout connu pour ses ${sn}s : la plupart de ses abonnés ne regardent pas ses ${r.what === 'live' ? 'lives' : 'vidéos longues'}. ${cap1(laW(r))} touche surtout ceux qui aiment ce format, quelques fans de ses ${sn}s qui découvrent (« enfin une vraie vidéo », « je viens des ${sn}s ») et ceux que l’algorithme amène.`);
    if (r.what === 'vidéo' && promoShorts(g, r).length) out.push(`Un ${sn} du joueur l’avait annoncée : certains viennent de là et le disent.`);
  }
  const vr = r.what === 'short' && r.promo ? (g.releases || []).find((x) => x.id === r.promo) : null;
  if (vr && vr.state === 'scheduled') out.push(`Ce ${sn} annonce sa vidéo « ${str(vr.topic, 80)} », qui sort ${fmtWhen(relAnn(vr))} : des gens disent qu’ils iront la voir.`);
  else if (vr && vr.state === 'released') out.push(`Ce ${sn} renvoie vers sa vidéo « ${str(vr.topic, 80)} », déjà en ligne (le lien « vidéo associée ») : certains disent qu’ils vont la regarder.`);
  return out.join(' ');
}
// 0.29.1: what a short does for the long video it is linked to. Out before it: nothing yet (its viewers come at the
// video's release, promoViews). After it (the « vidéo associée » link): some of them go and watch it now.
function promoAfter(g, r, post) {
  const vr = r && r.promo ? (g.releases || []).find((x) => x.id === r.promo) : null;
  if (!vr || !post || !post.video) return null;
  if (vr.state === 'scheduled') return { before: vr };
  const vp = vr.state === 'released' && vr.out ? g.posts.find((p) => p.id === vr.out) : null;
  if (!vp || !vp.video || Date.now() - vr.releasedAt > AUD.linkDays * DAY_MS) return null;
  const extra = Math.round((post.video.views || 0) * AUD.link * warmK(g) * (AUD.promoTier[r.tier] || 1) * rand(0.85, 1.15));
  if (extra < 1) return null;
  vp.video.views += extra;
  vp.video.promo = (vp.video.promo || 0) + extra;
  const c = g.career, Fm = FORMATS[vr.what] || FORMATS.vidéo, e = c.log.slice().reverse().find((x) => x.p === vp.id);
  if (e) { e.views += extra; e.hours += Math.round(extra * Fm.mins / 60); } // (the partner program counts them)
  const money = vp.video.claim ? 0 : Math.round(extra * rpmOf(g, vr.what, vp.video.ads) * adSeason(gameDate(Date.now())) / 10) / 100;
  if (money > 0) { c.est += money; vp.video.money = Math.round(((vp.video.money || 0) + money) * 100) / 100; ledger(g, `${cap1(ta(vr))} « ${str(vr.topic, 40)} » : ${fmtN(extra)} vues venues de ton ${PF(g).shortName}`, money, 'est'); }
  const A = vidAud(g), conv = Math.round(extra * (AUD.conv[vr.tier] || 0) * Math.min(1.3, warmK(g)));
  A.fans = clamp(A.fans + conv, 0, Math.max(0, g.stats.followers));
  return { after: vr, extra, conv };
}
// Logs the release (for the partner program) and books its money for the month.
function bookRelease(g, r, views, post, ads) {
  const c = g.career, Fm = FORMATS[r.what] || FORMATS.vidéo, d = gameDate(Date.now());
  const entry = { at: Date.now(), what: r.what, views, hours: r.what === 'short' ? 0 : Math.round(views * Fm.mins / 60) };
  if (post && post.res && post.res.viral) entry.viral = true; // 0.20: the brands price on the usual views
  if (r.what === 'live') entry.cc = Math.max(1, Math.round(views * 0.25)); // concurrent viewers, roughly
  if (post) entry.p = post.id; // (0.29.1: a short that sends viewers later adds them here)
  if (r.big) entry.big = true; // 0.30.1
  c.log.push(entry);
  if (c.log.length > 150) c.log.splice(0, c.log.length - 150);
  const rpm = rpmOf(g, r.what, ads);
  const money = Math.round(views * rpm * adSeason(d) / 10) / 100;
  if (money > 0) {
    c.est += money;
    ledger(g, `${cap1(ta(r))} « ${str(r.topic, 40)} » : ${fmtN(views)} vues`, money, 'est');
  }
  return { rpm, money };
}
// The month is over (on the game clock): the platform pays what it owes, from 70 € on YouTube (AdSense threshold).
function checkPayout(g, t) {
  const c = g.career, key = monthKey(gameDate(t));
  if (c.estMonth && key <= c.estMonth) return false; // 0.27.4: a clock set back never pays a month twice (keys are « 2026-10 »)
  const total = Math.round((c.est + c.owed) * 100) / 100, month = monthOfKey(c.estMonth), pf = PF(g);
  c.est = 0;
  c.estMonth = key;
  if (total <= 0) return true;
  if (platformOf(g) === 'youtube' && total < 70) {
    c.owed = total;
    addNotif(g, { k: 'money', text: `Revenus ${deMonth(month)} : ${fmtMoney(g, total)}. Sous le seuil de 70 €, YouTube garde ça pour le mois prochain.` });
  } else {
    c.owed = 0;
    earn(g, total, `Versement ${pfName(g, platformOf(g))} (${month})`, 'pay');
    addNotif(g, { k: 'money', text: `💶 ${pf.name === pfName(g, platformOf(g)) ? pf.name : pfName(g, platformOf(g))} te verse ${fmtMoney(g, total)} pour ${month}.` });
    queueModalFor(g, { t: 'money', what: 'payout', amount: total, month });
  }
  return true;
}

/* ---------- trends: sounds, challenges and topics that come and go ---------- */
const SOUND_A = ['Néons', 'Minuit pile', 'Vertige', 'Coup de foudre', 'Pas de panique', 'Lune rousse', 'Tout recommencer', 'Bulle', 'Sans filtre', 'Été indien', 'Plan B', 'Retour de flamme', 'Hyper', 'Mal de mer', 'Trop tard', 'Satellite', 'Chewing-gum', 'Ralenti'];
const SOUND_B = ['(remix)', '(version accélérée)', '— Kid Okapi', '— Nova Bleu', '(slowed)', '— Les Synthés Givrés', '— Lune Pastel', '(live)', '— Duo Cactus', '— Poulpe FM'];
const TAGS = ['#DéfiMiroir', '#3SecondesChrono', '#AvantAprès', '#PetitRituel', '#ChallengeSilence', '#OnTesteTout', '#UneJournéeAvec', '#SansFiltre', '#PremierEssai', '#RetourEnArrière', '#VraiOuFaux', '#LeDéfiDu5', '#POVtuEs', '#CeQueJaiAppris', '#ZéroBudget'];
const YT_TOPICS = ['les tier lists', 'les « 24 h pour… »', 'les « je teste… »', 'les storytimes', 'les coulisses', 'les réactions', 'les défis à petit budget', 'les classements', 'les « une journée avec… »', 'les enquêtes'];
const TREND_KINDS = { son: { emoji: '🎵', label: 'Son tendance' }, tag: { emoji: '#️⃣', label: 'Défi' }, sujet: { emoji: '🔥', label: 'Sujet qui monte' }, format: { emoji: '🎬', label: 'Format à la mode' } };
// How hot a trend is now (0-1): it climbs for a few hours, peaks, then wears out over a day or two.
function trendHeat(tr, t = Date.now()) {
  const age = t - tr.at;
  if (age < 0) return 0;
  if (age < tr.peak) return 0.35 + 0.65 * (age / tr.peak);
  return Math.max(0, Math.exp(-(age - tr.peak) / tr.life));
}
const heatWord = (h) => (h >= 0.85 ? 'au sommet' : h >= 0.55 ? 'en pleine montée' : h >= 0.25 ? 's’essouffle' : 'usé');
const activeTrends = (g, t = Date.now()) => (g.trends || []).filter((x) => trendHeat(x, t) >= 0.08).sort((a, b) => trendHeat(b, t) - trendHeat(a, t));
const trendKindsFor = (pf) => (pf === 'youtube' ? ['format', 'sujet', 'son'] : pf === 'tiktok' ? ['son', 'tag', 'sujet'] : pf === 'instagram' ? ['son', 'tag', 'sujet'] : pf === 'twitch' ? ['sujet', 'format'] : ['sujet', 'format']);
function makeTrend(g, kind, o = {}) {
  const t = Date.now();
  const name = str(o.name, 50) || (kind === 'son' ? `${pick(SOUND_A)} ${pick(SOUND_B)}` : kind === 'tag' ? pick(TAGS) : kind === 'format' ? cap1(pick(YT_TOPICS)) : '');
  if (!name || (g.trends || []).some((x) => x.name.toLowerCase() === name.toLowerCase())) return null;
  const tr = { id: uid('tr'), kind, name, emoji: cleanEmoji(o.emoji) || TREND_KINDS[kind].emoji, at: t - randi(0, 3) * 3600000, peak: randi(3, 8) * 3600000, life: randi(14, 40) * 3600000, re: o.re || '' };
  g.trends.push(tr);
  if (g.trends.length > 14) g.trends.splice(0, g.trends.length - 14);
  return tr;
}
// Keeps a few trends alive on the player's platform (the world's own topics join them through the arcs).
function refreshTrends(g, t = Date.now()) {
  if (t - (g.career.trendAt || 0) < 2 * 3600000 && activeTrends(g, t).length >= 3) return false;
  g.career.trendAt = t;
  const kinds = trendKindsFor(platformOf(g));
  let n = 0;
  while (activeTrends(g, t).length < 4 && n < 6) { makeTrend(g, kinds[n % kinds.length]); n++; }
  for (const a of liveArcs(g, t)) if (a.tag && !g.trends.some((x) => x.name === a.tag)) { const tr = makeTrend(g, 'sujet', { name: a.tag, emoji: (ARC_KINDS[a.kind] || {}).emoji }); if (tr) { tr.at = a.at; tr.re = a.title; } }
  return n > 0;
}
// What riding a trend adds to a release's views (+80 % at its peak, almost nothing once it is worn out).
function trendBoost(g, r, form, t) {
  let b = 0;
  const used = form && form.trend ? g.trends.find((x) => x.id === form.trend) : null;
  const used2 = form && form.trend2 ? g.trends.find((x) => x.id === form.trend2 && x !== used) : null;
  if (used) b += 0.8 * trendHeat(used, t);
  if (used2) b += 0.4 * trendHeat(used2, t);
  for (const x of activeTrends(g, t)) if (x !== used && x !== used2 && x.kind === 'sujet' && (r.topic || '').toLowerCase().includes(x.name.replace(/^#/, '').toLowerCase().slice(0, 12))) b += 0.4 * trendHeat(x, t);
  return Math.min(1.4, b);
}
// YouTube thumbnails: what makes people click, and what it costs when the video does not deliver.
const THUMBS = {
  choc: { label: 'Visage choqué + gros texte', ctr: 0.3, risk: true },
  mystere: { label: 'Énigmatique', ctr: 0.18 },
  propre: { label: 'Propre et honnête', ctr: 0.08 },
};

/* ---------- sponsors: brands that pay, contracts that bind ---------- */
const SECTORS = [
  { id: 'boisson', emoji: '🥤', label: 'boissons', brands: ['Volta', 'Bulle Givrée', 'Zest & Cie'], products: ['sa boisson énergisante', 'son eau pétillante aromatisée', 'son thé glacé'] },
  { id: 'tech', emoji: '🎧', label: 'électronique', brands: ['Pixelforge', 'Sonar', 'Nébula Tech'], products: ['son casque sans fil', 'sa nouvelle souris', 'son appli de montage'] },
  { id: 'mode', emoji: '👟', label: 'mode', brands: ['Maison Brume', 'Bitume', 'Atelier Ciel'], products: ['sa nouvelle paire de baskets', 'sa collection capsule', 'ses sweats éco-responsables'] },
  { id: 'beaute', emoji: '💄', label: 'beauté', brands: ['Lueur', 'Peau Neuve', 'Rose Givrée'], products: ['son sérum hydratant', 'sa palette de maquillage', 'sa crème solaire'] },
  { id: 'jeu', emoji: '🎮', label: 'jeux vidéo', brands: ['Studio Lanterne', 'Kraken Games', 'Pixel Ninja'], products: ['son nouveau jeu mobile', 'son jeu d’aventure', 'sa bêta fermée'] },
  { id: 'food', emoji: '🍜', label: 'alimentation', brands: ['Mangue Express', 'Bol d’Or', 'Croc’Midi'], products: ['son service de livraison', 'ses box repas', 'son nouveau snack'] },
  { id: 'appli', emoji: '📱', label: 'applis', brands: ['Parlo', 'Rythmo', 'Budgie'], products: ['son appli pour apprendre les langues', 'son appli de sport', 'son appli de budget'] },
  { id: 'voyage', emoji: '🧳', label: 'voyage', brands: ['Escale', 'Train Bleu Voyages', 'Sac à Dos'], products: ['ses week-ends à petit prix', 'son nouveau sac de voyage'] },
];
// 0.27.8: a sector as the player reads it (« 💄 beauté », not its id)
const sectorWord = (id) => { const x = SECTORS.find((s) => s.id === id); return x ? `${x.emoji} ${x.label}` : String(id || ''); };
// What French law forbids influencers to promote (or allows only for authorised providers).
const BANNED = [
  { id: 'chirurgie', emoji: '💉', brands: ['Clinique Éclat', 'Lift & Glow'], products: ['ses injections « lèvres parfaites »', 'sa rhinoplastie à prix cassé'], law: 'la chirurgie et les actes esthétiques' },
  { id: 'vape', emoji: '💨', brands: ['NuageX', 'Puff Party'], products: ['ses puffs parfumées', 'sa nouvelle cigarette électronique'], law: 'les produits du vapotage et la nicotine' },
  { id: 'paris', emoji: '🎲', brands: ['Prono King', 'Le Tuyau'], products: ['son abonnement aux pronostics « garantis »'], law: 'les abonnements à des pronostics de paris sportifs' },
  { id: 'crypto', emoji: '🪙', brands: ['MoonCoin', 'Fusée Token'], products: ['son jeton « x100 garanti »'], law: 'les cryptomonnaies d’acteurs non autorisés' },
];
const BANNED_RE = /chirurg|injection|botox|rhinoplast|lifting|vape|vapot|puff|nicotin|cigarette|prono|paris sportif|crypto|jeton|token|bitcoin|casino/i;
// 0.21: the brands that come follow what the creator makes: the niche, the topics of the last releases. A content the
// advertisers avoid (a red release lately, or two yellow) keeps most of them away: only the tolerant ones still come.
const NICHE_SECTORS = {
  finance: { appli: 4, tech: 2, voyage: 1, mode: 1 }, tech: { tech: 4, appli: 3, jeu: 2, boisson: 1 }, educ: { appli: 3, tech: 2, voyage: 2, food: 1 },
  beaute: { beaute: 5, mode: 3, boisson: 1, appli: 1 }, cuisine: { food: 5, boisson: 2, voyage: 1, appli: 1 }, sport: { boisson: 3, mode: 3, food: 2, appli: 2 },
  gaming: { jeu: 5, tech: 3, boisson: 2, food: 1 }, musique: { tech: 3, mode: 2, boisson: 2, appli: 2 }, humour: { boisson: 2, food: 2, appli: 2, jeu: 2, mode: 1 },
};
const TOPIC_SECTORS = [[/jeu|gaming|gamer|console|manette|esport|minecraft|horreur|speedrun/i, 'jeu'], [/cuisin|recette|plat\b|g[âa]teau|resto|manger|go[ûu]t|caf[ée]t/i, 'food'],
  [/voyage|week-end|vacances|valise|avion|train\b|road.?trip|visite/i, 'voyage'], [/maquill|beaut|skincare|cheveux|soin|parfum/i, 'beaute'], [/mode\b|tenue|look|baskets|fringue|d[ée]fil[ée]/i, 'mode'],
  [/tech|ordi|\bpc\b|appli|smartphone|t[ée]l[ée]phone|gadget|code|robot/i, 'tech'], [/sport|muscu|course|foot|fitness|match|tournoi/i, 'boisson']];
const TOLERANT = ['jeu', 'boisson'];
const myReleases = (g) => g.posts.filter((p) => p.a === 'p' && p.video).sort((a, b) => b.ts - a.ts);
function adsShy(g) {
  const last = myReleases(g).filter((p) => p.video.ads && p.video.ads.paid !== undefined).slice(0, 3);
  return last.some((p) => p.video.ads.s === 'rouge') || last.filter((p) => p.video.ads.s === 'jaune').length >= 2;
}
function sectorWeights(g) {
  const w = Object.fromEntries(SECTORS.map((x) => [x.id, 1]));
  const N = NICHE_SECTORS[nicheOf(g).id];
  if (N) for (const k in N) w[k] += N[k] * 1.5;
  for (const p of myReleases(g).slice(0, 5)) for (const [re, k] of TOPIC_SECTORS) if (re.test(`${p.video.topic || ''} ${p.video.title || ''}`)) w[k] += 2;
  if (adsShy(g)) for (const k in w) if (!TOLERANT.includes(k)) w[k] *= 0.12;
  return w;
}
const pickSector = (g) => { const w = sectorWeights(g); return pickW(Object.keys(w).map((k) => ({ k, w: w[k] }))).k; };
const sectorHint = (g) => { const w = sectorWeights(g); return Object.keys(w).sort((a, b) => w[b] - w[a]).slice(0, 3).join(', '); };
// 0.21: a sponsor that fits the video it is in (its topic, its public) helps it a little; one that has nothing to do
// with it costs it a little. The AI judges it at the release (fit); without its verdict, the topic decides, gently.
const FIT_VIEWS = { 1: 1.06, 0: 1, '-1': 0.94 };
const FIT_WORDS = { 1: 'logique avec le sujet', '-1': 'hors sujet' };
const FIT_NEAR = { jeu: ['tech', 'boisson', 'food'], food: ['boisson', 'appli'], beaute: ['mode'], mode: ['beaute'], tech: ['jeu', 'appli'], voyage: ['appli', 'mode'], boisson: ['food', 'jeu'] };
function fitOf(r, d, e) {
  if (e && e.fit != null) return e.fit;
  const ts = TOPIC_SECTORS.filter(([re]) => re.test(r.topic || '')).map(([, k]) => k);
  if (ts.includes(d.sector)) return 1;
  return ts.length && !TOLERANT.includes(d.sector) && !ts.some((k) => (FIT_NEAR[k] || []).includes(d.sector)) ? -1 : 0;
}
const fitPct = (f) => Math.round(Math.abs(FIT_VIEWS[f] - 1) * 100);
// 0.21: some brands offer their gear instead of money, logical with what they sell; worth about what they would pay,
// or a bit more (it costs them less). Mostly something better than what the creator has.
const GIFT_GEAR = { tech: ['pc', 'mic', 'cam', 'phone'], jeu: ['pc', 'mic'], beaute: ['light', 'cam'], mode: ['light', 'cam'], appli: ['phone'], voyage: ['cam'] };
const GIFT_ART = { phone: 'son téléphone', pc: 'son ordinateur', cam: 'sa caméra', mic: 'son micro', light: 'sa lumière' };
const GIFT_UN = { phone: 'un téléphone', pc: 'un ordinateur', cam: 'une caméra', mic: 'un micro', light: 'une lumière' };
function pickGift(g, sector, fee) {
  const kinds = GIFT_GEAR[sector];
  if (!kinds || !g.gear) return null;
  const budget = Math.max(60, fee) * rand(1, 1.6), opts = [];
  for (const k of kinds) {
    let t = -1;
    for (let x = 0; x < 4; x++) if (GEAR[k].prices[x] > 0 && GEAR[k].prices[x] <= budget) t = x;
    if (t >= 0) opts.push({ k, t, up: !usable(g.gear.items[k]) || tierOfItem(g.gear.items[k]) < t });
  }
  if (!opts.length) return null;
  const ups = opts.filter((o) => o.up), o = pick(ups.length && Math.random() < 0.85 ? ups : opts);
  return { kind: o.k, t: o.t, value: GEAR[o.k].prices[o.t] };
}
const giftName = (g, X) => gearName(g, X.kind, X.t);
const giftLine = (g, X) => `${giftName(g, X)} (${TIER_LABELS[X.t].toLowerCase()}, valeur ${fmtMoney(g, X.value)})`;
const DEAL_OPEN = ['offer', 'signed'];
// 0.19.1: what a brand pays more to have no mention (an offer made that way, or changed in the talk), and the range of
// a fee it can agree to: with the mention, from 70 % of its first price to its max; without, half as much again.
const SHADY_K0 = 1.5, SHADY_K = 1.6;
function dealBounds(d) {
  if (!d.fee0) return { lo: Math.min(30, d.max), cap: d.max }; // products offered: some cash on top, up to the brand's max
  const old = d.base == null; // a deal from before 0.19.1: its figures may include the premium
  const k0 = old && d.shady ? (d.shadyAsk ? SHADY_K : SHADY_K0) : 1;
  const base = old ? d.fee0 / (d.shady && !d.shadyAsk ? SHADY_K0 : 1) : d.base, maxBase = old ? d.max / k0 : d.maxBase;
  const B = d.shady ? { lo: niceRound(base * SHADY_K0 * 0.7), cap: Math.round(maxBase * SHADY_K) } : { lo: niceRound(base * 0.7), cap: Math.round(maxBase) };
  if (d.hard) B.cap = Math.max(d.fee, Math.min(B.cap, Math.round(d.fee0 * 1.05))); // 0.20: a big brand, no agent at its level: it gives almost nothing
  return B;
}
const openDeals = (g) => g.deals.filter((d) => DEAL_OPEN.includes(d.state));
const signedDeals = (g) => g.deals.filter((d) => d.state === 'signed');
// The views brands expect from you, from your last releases of that format (or your audience).
// 0.20: the median of the usual ones, the way brands count (a view is worth as much to a big creator as to a small one).
// 0.30: the hits count too, at twice the usual at most. The usual: the plain releases of lately (within 10 days of the
// last one); none lately (in mythique, everything goes viral), half of what today's audience alone would give: the price no
// longer comes from the old shorts at 8 000 views of a channel ten times smaller.
const medianOf = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
function expectedViews(g, what) {
  const Fm = FORMATS[what] || FORMATS.vidéo;
  const F = (what === 'vidéo' || what === 'live') && audSplit(g) ? vidFans(g) : g.stats.followers; // (0.29.1: those who watch that format)
  const base = F * Fm.share + Fm.disc * 0.8;
  const log = g.career.log.filter((x) => !x.past && !x.big && x.what === what).slice(-7); // (0.30.1: never a big production's)
  if (!log.length) return base;
  const newest = Math.max(...log.map((x) => x.at || 0));
  const plain = log.filter((x) => !x.viral && newest - (x.at || 0) <= 10 * DAY_MS).map((x) => x.views);
  const usual = plain.length ? medianOf(plain) : base * 0.5;
  return medianOf(log.map((x) => (x.viral ? Math.min(x.views, usual * 2) : x.views)));
}
// 0.20: what a brand asks for: what the player publishes (their last releases), among what they can make.
function offerWhat(g) {
  const fmts = PF(g).fmts.filter((f) => canMake(g, f).ok), all = PF(g).fmts;
  const can = fmts.length ? fmts : all;
  const recent = g.career.log.filter((x) => !x.past && can.includes(x.what)).slice(-6).map((x) => x.what);
  if (recent.length && Math.random() < 0.8) return pick(recent);
  return Math.random() < 0.7 && can.includes(all[0]) ? all[0] : pick(can);
}
const FMT_FEE = { short: 0.4, clip: 0.9, live: 1.4, vidéo: 1.8, podcast: 1.8 }; // (0.20 balance: a few seconds in a short, on very generous views)
// A fair price, the way brands count: a CPM (€ per 1 000 expected views), the same whatever the size of the audience
// (0.21: a view is worth as much to a big creator as to a small one).
const CPM = 14;
function dealFee(g, what) {
  const F = g.stats.followers, d = gameDate(Date.now());
  let fee = expectedViews(g, what) * CPM / 1000;
  if (platformOf(g) === 'instagram') fee = Math.max(fee, F / 1000 * 9);
  fee *= FMT_FEE[what] || 1; // 0.20: a real integration in a long content pays more per view than a few seconds in a short
  fee *= nicheOf(g).sp * sponsorSeason(d) * standMult(g, 'fee') * staffMult(g, 'fee'); // 0.9.4: what the player's name is worth right now
  fee *= gearFeeMult(g); // 0.20: a camera that shows products at their best
  const m = calMoment(d);
  if (m && m.E.sp && m.days >= -1) fee *= m.E.sp;
  return fee;
}
// (0.30: many more, so that the same names do not come back at every offer)
const CONTACT_FIRST = {
  f: ['Inès', 'Clara', 'Sarah', 'Léa', 'Yasmine', 'Chloé', 'Nora', 'Jade', 'Lina', 'Camille', 'Manon', 'Elsa', 'Anaïs', 'Salomé', 'Margaux', 'Amira', 'Océane', 'Justine', 'Pauline', 'Leïla', 'Mathilde', 'Aya', 'Romane', 'Victoire', 'Soraya', 'Agathe', 'Eva', 'Lou', 'Mélissa', 'Héloïse', 'Naïma', 'Charlotte'],
  m: ['Hugo', 'Karim', 'Maxime', 'Samir', 'Lucas', 'Adam', 'Nathan', 'Malik', 'Enzo', 'Julien', 'Bastien', 'Yanis', 'Antoine', 'Rayan', 'Clément', 'Mehdi', 'Florian', 'Ilyes', 'Romain', 'Kevin', 'Sofiane', 'Thibault', 'Axel', 'Baptiste', 'Nolan', 'Bilal', 'Quentin', 'Jordan', 'Wassim', 'Arthur', 'Loïc', 'Gabin'],
};
const CONTACT_LAST = ['Moreau', 'Benali', 'Laurent', 'Petit', 'Garnier', 'Haddad', 'Roussel', 'Faure', 'Lemaire', 'Da Silva', 'Ndiaye', 'Morel', 'Girard', 'Bonnet', 'Mercier', 'Chevalier', 'Lefèvre', 'Fontaine', 'Rousseau', 'Blanchard', 'Gauthier', 'Perrin', 'Brun', 'Masson', 'Mansouri', 'Traoré', 'Nguyen', 'Ferreira', 'Kaci', 'Lambert', 'Dumas', 'Colin', 'Vidal', 'Renaud', 'Carpentier', 'Barbier', 'Diallo', 'Hamidi', 'Marchand', 'Leroux', 'Aubert', 'Picard', 'Rey', 'Benoît', 'Ollivier', 'Costa', 'Meunier', 'Boyer'];
// 0.28.1: the first names already worn (the main characters, the player): never given to someone new.
const takenFirsts = (g) => [...new Set(mains(g, false).map((c) => firstName(c)).concat(String((g.player && g.player.name) || '').split(' ')[0]))].filter(Boolean);
const firstsLine = (g, who) => { const L = takenFirsts(g); return L.length ? `Prénoms déjà pris, à ne pas reprendre${who ? ` pour ${who}` : ''} : ${L.slice(0, 24).join(', ')}.` : null; };
// 0.30: someone new in the player's life, brought by the story (once a game day at most), created right after the refresh
const arrivalOK = (g, t = Date.now()) => !!g && !g.pendingCast && !g.arrival && g.stats.level >= 2 && t - (g.lastArrival || g.createdAt || 0) >= DAY_MS;
const ARRIVAL_LINE = (g) => `- Facultatif, rarement : si l’histoire amène quelqu’un de nouveau dans la vie du joueur (une rencontre, quelqu’un qui veut une collab, un fan qui devient proche, ${toxLv(g) >= 2 ? 'quelqu’un attiré par sa réputation toxique, ' : ''}une star venue d’ailleurs${agencyFounded(g) ? ', un créateur qui veut rejoindre son agence' : ''}…), ajoute {"t":"arrivee","why":"≤ 80 caractères : qui et pourquoi"} : le jeu fera arriver ce personnage.`;
// 0.30: the family names the brands' contacts and the fans already wear: someone new takes another one
const takenLasts = (g) => [...new Set(Object.values(g.chars).filter((c) => c.kind === 'brand' || c.kind === 'fan' || c.kind === 'pro').map((c) => String(c.name || '').trim().split(/\s+/).slice(1).join(' ')).filter(Boolean))];
const lastsLine = (g) => { const L = takenLasts(g); return L.length ? `Noms de famille déjà portés par des contacts, à ne pas reprendre pour une personne nouvelle : ${L.slice(-30).join(', ')}.` : null; };
// Someone the player can write to (a brand's partnerships manager, a job candidate…).
function addContact(g, o) {
  const gd = o.g === 'm' || o.g === 'f' || o.g === 'x' ? o.g : pick(['f', 'm']);
  // 0.28.1: a name the game draws never takes the first name of a main character (or the player's): « Iris prend ses
  // distances » next to « Iris Vasquez t’a écrit ». A name the AI chose stays (its message may say it): its prompt lists the first
  // names taken (takenFirsts); only the very same full name is refused, as before.
  const first = (n) => foldAcc(String(n).trim().split(/\s+/)[0]);
  const firsts = new Set(takenFirsts(g).map(first));
  const same = (n) => Object.values(g.chars).some((c) => c.name.toLowerCase() === n.toLowerCase());
  const taken = (n) => same(n) || firsts.has(first(n));
  const usedLast = new Set(takenLasts(g)), freeLast = CONTACT_LAST.filter((x) => !usedLast.has(x)); // 0.30: a family name nobody wears yet
  const draw = () => `${pick(CONTACT_FIRST[gd === 'x' ? pick(['f', 'm']) : gd])} ${pick(freeLast.length ? freeLast : CONTACT_LAST)}`;
  let name = str(o.name, 40) || draw();
  for (let k = 0; k < 12 && !o.name && taken(name); k++) name = draw(); // 0.20: more offers, more names
  if (o.name ? same(name) : taken(name)) return null;
  const h = uniqueHandle(g, normHandle(o.handle) || normHandle(name.split(' ')[0] + '.' + str(o.brand || o.tag || 'pro', 20).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 9)) || 'contact' + randi(10, 99));
  const id = 'c' + (++g.seq);
  const c = {
    id, kind: o.kind || 'brand', name, handle: h, emoji: avatarEmoji(o.emoji, h, '💼'), hue: hashStr(h) % 360, g: gd, // (0.29: one of ours)
    role: str(o.role, 60), bio: str(o.bio || o.role, 170), personality: str(o.personality, 240) || 'professionnelle, directe, défend son budget mais tient à ce partenariat',
    voice: str(o.voice, 140) || 'pro et chaleureuse, tutoie vite, phrases courtes', followers: o.followers || randi(300, 3000),
    rel: o.rel == null ? 10 : o.rel, unlocked: true, unlockedAt: Date.now(), followsYou: false, youFollow: false, dmSent: 0, vibe: null, vibeGoal: null, mem: [],
  };
  initAge(c, null, { pro: true, min: o.minAge }); // 0.17: someone met through work has an age too
  g.chars[id] = c;
  g.order.push(id);
  return c;
}
// A system card inside a conversation (a contract to sign, a job offer…).
function dmCard(g, c, card, at = later()) {
  const convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 });
  const d = card.deal ? dealOf(g, card.deal) : null;
  convo.msgs.push(Object.assign({ id: uid('m'), me: false, ts: at, at, text: d ? `[${card.upd ? 'Nouvelle proposition' : 'Proposition de partenariat'} : ${dealSummary(g, d)}]` : '' }, card));
}
// A brand's offer: by the model during a refresh (world-flavoured), or by the game itself.
function makeOffer(g, o = {}) {
  if (g.stats.followers < 800 || openDeals(g).filter((d) => d.state === 'offer').length >= (o.asked ? OWN_MAX : 2)) return null; // (0.33.6: asked in a conversation, a little more room)
  const fmts = PF(g).fmts;
  const bg = o.big ? (g.releases || []).find((x) => x.id === o.big && x.big && x.state === 'scheduled') || null : null; // 0.30.1: to be in a big production
  if (o.big && !bg) return null;
  let what = bg ? bg.what : o.what && fmts.includes(normWhat(o.what)) ? normWhat(o.what) : offerWhat(g);
  if (!canMake(g, what).ok) what = makeableWhat(g, what); // 0.20: a brand asks for what the player can make
  const textAll = `${o.sector || ''} ${o.product || ''} ${o.brand || ''}`;
  const banned = o.scam ? false : o.brand ? BANNED_RE.test(textAll) : Math.random() < toxBannedP(g); // (0.20: a scam asked for is not a forbidden product; 0.30: more of them for a toxic name)
  const shady = !banned && (o.shady === true || (o.shady == null && Math.random() < 0.12));
  const S0 = banned ? (BANNED.find((x) => new RegExp(x.id.slice(0, 5), 'i').test(textAll)) || pick(BANNED)) : SECTORS.find((x) => x.id === o.sector) || SECTORS.find((x) => x.id === pickSector(g)) || pick(SECTORS); // 0.21: what the creator makes
  const fresh = S0.brands.filter((b) => !brandBurnt(g, b)); // 0.28.1: a brand that scammed the player, or was exposed, never writes again
  const brand = str(o.brand, 30) || (fresh.length ? pick(fresh) : '');
  if (!brand || brandBurnt(g, brand)) return null;
  if (g.deals.some((d) => d.brand.toLowerCase() === brand.toLowerCase() && (o.asked ? d.state === 'offer' : DEAL_OPEN.includes(d.state)))) return null; // (0.33.6: asked, a contract of theirs under way is no reason: another campaign)
  const via = o.via || (o.pitched ? 'pitch' : 'direct'), ag = hasStaff(g, 'agent'); // 0.20: who brought it
  const tk = (banned || shady) && toxLv(g) ? toxFeeK(g) / standMult(g, 'fee') : (banned ? 2 : 1); // 0.30: what a shady brand pays a toxic name (×1,5 → ×3, whatever the scandals)
  let fee = dealFee(g, what) * rand(0.85, 1.2) * (shady && !toxLv(g) ? 1.5 : 1) * tk * (o.bonus || 1) * (via === 'agent' && ag ? [1, 1.04, 1.08, 1.12][clamp(ag.tier, 0, 3)] : 1) * (bg ? 0.8 * bg.big.k : 1); // (0.30.1: its views)
  if (num(o.feeAsk, 0) > 0) fee = clamp(num(o.feeAsk, 0), fee * 0.6, fee * 1.4); // 0.33: asked in messages: the price they agreed on, if it is fair for the player's audience
  // 0.21: some brands offer their gear instead (half of the small ones that sell gear, a quarter of the others)
  const gift = o.gift && GEAR[o.gift.kind] ? { kind: o.gift.kind, t: clamp(int(o.gift.t, 0, 3, 0), 0, 3), value: GEAR[o.gift.kind].prices[clamp(int(o.gift.t, 0, 3, 0), 0, 3)] }
    : !banned && !shady && o.gift !== false && o.scam === undefined && !easyGear() && GIFT_GEAR[S0.id] && Math.random() < (fee < 60 ? 0.5 : 0.25) ? pickGift(g, S0.id, fee) : null; // (not in the suites before 0.21, nor when a test asks for a scam)
  const goods = !gift && fee < 60;
  // 0.30.1: some brands want it « soignée » (twice the time to make): they pay half as much again; delivered otherwise, a penalty
  const care = !bg && !goods && !gift && careOK(what) && (o.care != null ? !!o.care : !o.scam && Math.random() < (window.__HYPE_TEST__ && typeof window.__careAsk === 'number' ? window.__careAsk : CARE_ASK)); // (the tests: none unless asked)
  if (care) fee *= CARE_FEE;
  fee = goods || gift ? 0 : niceRound(fee);
  const contact = o.contactId && g.chars[o.contactId] ? g.chars[o.contactId] : addContact(g, { name: o.contact, handle: o.handle, g: o.g, brand, role: `Partenariats · ${brand}`, emoji: cleanEmoji(o.emoji) || S0.emoji }); // 0.20: a brand that comes back writes from the same person
  if (!contact) return null;
  const t = Date.now();
  const deal = {
    id: uid('dl'), brand, emoji: cleanEmoji(o.emoji) || S0.emoji, sector: S0.id, product: str(o.product, 80) || (gift ? `${GIFT_ART[gift.kind]} « ${giftName(g, gift)} »` : pick(S0.products)), what,
    fee, fee0: fee, value: goods ? randi(4, 15) * 10 : gift ? gift.value : 0, upfront: fee >= 500 ? Math.round(fee * 0.3) : 0, gift,
    at: t, until: t + 2 * DAY_MS, days: randi(3, 7), due: 0, state: 'offer', exclusive: !goods && Math.random() < 0.3, shady, banned: banned ? S0.law : '',
    contact: contact.id, max: 0,
  };
  if (care) deal.care = 1;
  if (bg) { // 0.30.1: in the production, until a little after it comes out; some want to be the only brand in it
    deal.big = bg.id;
    deal.days = clamp(Math.ceil((relAnn(bg) - t) / DAY_MS) + 2, 2, 14);
    if (!goods && !gift && Math.random() < (o.solo != null ? (o.solo ? 1 : 0) : 0.25)) deal.solo = 1;
  }
  // how far the brand can go: a quarter more (an agent squeezes more); for products, some cash instead
  deal.max = gift ? Math.round(gift.value * 0.2) : goods ? Math.max(40, Math.round(deal.value * 0.8)) : Math.round(fee * (1.25 + 0.03 * staffPower(g, 'agent')));
  if (!goods && !gift) { deal.base = niceRound(fee / (shady ? SHADY_K0 : 1)); deal.maxBase = Math.round(deal.max / (shady ? SHADY_K0 : 1)); } // 0.19.1: the price with the mention
  deal.via = via;
  if (o.loyal) deal.loyal = true;
  if (o.guest && g.chars[o.guest.c]) deal.guestPlan = { c: o.guest.c, fee: o.guest.fee != null ? Math.max(0, Math.round(num(o.guest.fee, 0))) : null }; // 0.33.6: another creator in it, agreed in the conversation
  const sc = scamOffer(g, deal, o); // 0.20: like for real, many offers are not honest (nothing says it)
  dealHard(g, deal); // a big contract: above the agent's level, or without one
  g.deals.push(deal);
  trimDeals(g);
  const obvious = deal.scam === 'frais' || deal.scam === 'brief';
  const pitch = (obvious && sc.pitch) || str(o.text, 300) || (sc && sc.pitch) || (bg ? `Salut ${firstName(g.player)} ! Je gère les partenariats de ${brand}. On a entendu parler de ta production « ${str(bg.topic, 60)} » : on aimerait beaucoup y être, avec ${deal.product}. Je t’envoie notre proposition ⬇️` : `Salut ${firstName(g.player)} ! Je gère les partenariats de ${brand}. On adore ce que tu fais : on aimerait te confier ${deal.product}. Je t’envoie notre proposition ⬇️`);
  const at = later() + 1200;
  if (!o.asked) addIncomingDM(g, contact, pitch, at, { max: 400 }); // (0.33: asked in its messages, its own words said it)
  dmCard(g, contact, { sys: 'deal', deal: deal.id }, at + 400);
  addNotif(g, { k: 'money', c: contact.id, at, text: `${deal.emoji} ${brand} te propose un partenariat${deal.fee ? ` : ${fmtMoney(g, deal.fee)}` : deal.gift ? ` : ${giftName(g, deal.gift)} offert` : deal.costs ? '' : ` : payé en produits (≈ ${fmtMoney(g, deal.value)}), pas en argent`}.` });
  const agc = ag && g.chars[ag.c];
  if (via === 'agent' && agc) addIncomingDM(g, agc, pick([`J’ai trouvé un partenariat pour toi : ${brand} ! Leur proposition est dans tes messages 😉`, `Bonne nouvelle : ${brand} veut bosser avec toi, je leur ai donné ton contact. Regarde leur offre !`]), at + 2500, { max: 300 });
  agentReview(g, deal); // the agent reads what the others sent (and warns, if they see something)
  return deal;
}
const dealOf = (g, id) => g.deals.find((d) => d.id === id) || null;
// 0.33: the player asks a brand they know for a partnership of their own (in its messages, or in a group): its AI decides
// now. Yes: the offer comes as any offer does (the price from the player's audience, kept near what they agreed on when it
// is fair; then the card, « Négocier »), never a scam nor a hidden ad (the player came to them); no: said simply. Before,
// it had no way to make one, and waited for « le feu vert » forever.
// 0.33.6 (« ça fait une semaine que c'est bloqué »): a contract of theirs under way no longer stops a new one (another
// campaign; only an offer still open does: that one is changed instead), nor two offers waiting (four, asked); and when
// they cannot, they say why instead of « on attend le feu vert ».
const OWN_MAX = 4;
function ownAskWhy(g, b) { // ('' : it can)
  const brand = b && b.kind === 'brand' ? brandOfContact(g, b) : '';
  if (!brand) return 'brand';
  if (brandBurnt(g, brand)) return 'burnt';
  if (g.stats.followers < 800) return 'small';
  if (g.deals.some((d) => d.brand.toLowerCase() === brand.toLowerCase() && d.state === 'offer')) return 'open';
  if (openDeals(g).filter((d) => d.state === 'offer').length >= OWN_MAX) return 'full';
  return '';
}
const OWN_NO = {
  burnt: (b, brand) => `${brand} ne travaillera plus avec le joueur : s’il demande un partenariat, ${b.name} le lui dit franchement (sans « je reviens vers toi »).`,
  small: (b, brand) => `Le joueur a encore trop peu d’abonnés pour ${brand} : s’il demande un partenariat, ${b.name} le lui dit gentiment, et qu’il revienne quand sa chaîne aura grandi (sans promettre de « feu vert »).`,
  full: (b) => `Le joueur a déjà plusieurs propositions de marques en attente : s’il demande un nouveau partenariat, ${b.name} lui dit de signer ou de refuser celles-là d’abord (sans « je reviens vers toi »).`,
};
// The one another creator in it: a handle said in the line, someone of the cast who can be in it (not the brand).
function guestOfLine(g, o) {
  const h = o && (o.avec || o.with);
  const c = h ? charByHandle(g, normHandle(Array.isArray(h) ? h[0] : h)) : null;
  return c && featOK(g, c) ? { c: c.id, fee: o.part != null && o.part !== '' ? o.part : null } : null;
}
function ownAskLine(g, b) {
  if (ownAskWhy(g, b)) return null;
  const brand = brandOfContact(g, b), fm = PF(g).fmts;
  return `- Si le joueur demande à ${b.name} un NOUVEAU partenariat pour lui-même (un contenu sponsorisé par ${brand}, même avec un autre créateur dedans), ${b.name} décide en pro, dans ce message même (${brand} colle-t-elle à sa chaîne et à son audience ? le budget ?). Si c’est oui, fais l’offre : {"t":"offre","what":"${fm.join('|')}","product":"≤ 60 caractères : ce que ${brand} veut y montrer","fee":0,"avec":"","part":0} ("fee" : le montant pour le joueur dont vous avez convenu, 0 si vous n’en avez pas parlé ; le jeu le garde s’il est raisonnable pour son audience, et la proposition s’affiche dans vos messages, à négocier comme les autres ; "avec" : le handle d’un autre créateur qui en est, s’il y en a un, sinon "" ; "part" : ce que le joueur lui donne, si vous en avez parlé). Un contrat déjà en cours avec ${brand} n’empêche rien : c’est une autre campagne. Si c’est non, dis-le simplement : jamais « je reviens vers vous » ni « on attend le feu vert ».`;
}
function brandOffersPlayer(g, b, o) {
  if (!b || ownAskWhy(g, b)) return null;
  const brand = brandOfContact(g, b), old = g.deals.filter((d) => d.brand.toLowerCase() === brand.toLowerCase()).slice(-1)[0];
  return makeOffer(g, { brand, contactId: b.id, what: o && o.what, product: o && o.product, feeAsk: num(o && o.fee, 0), sector: old && old.sector, emoji: old && old.emoji, asked: true, pitched: true, legit: true, shady: false, gift: false, care: false, guest: guestOfLine(g, o) });
}
// 0.20: the old contracts go, but never one still open or with something still to happen (a payment, a recall, the critic…)
const dealPending = (d) => DEAL_OPEN.includes(d.state) || d.state === 'waiting' || !!(d.unpaidAt || d.recallAt || d.flopAt || d.imageAt || d.expose || d.lostAt || d.check || (d.clause && d.clause.kind === 'penal' && !d.clause.paid && Date.now() - (d.signedAt || 0) < 180 * DAY_MS));
function trimDeals(g, max = 24) {
  while (g.deals.length > max) { const k = g.deals.findIndex((d) => !dealPending(d)); if (k < 0) break; g.deals.splice(k, 1); }
}
const dealWhat = (g, d) => (d.what === 'short' ? PF(g).shortName : d.what);
// 0.27.4: the down payment is negotiated too: 30 % at the signature from 500 by default, or what the brand agreed to in
// the DM (before, a brand could say yes there: the contract stayed the same and nothing came). A brand that never pays
// never pays one either.
const NO_UPFRONT = ['impaye', 'frais'];
const upPctOf = (d) => (NO_UPFRONT.includes(d.scam) ? 0 : d.upPct != null ? d.upPct : d.fee >= 500 ? 30 : 0);
const upfrontOf = (d) => (d.fee > 0 ? Math.round((d.fee * upPctOf(d)) / 100) : 0);
const upShown = (d) => (d.fee > 0 && d.upfront > 0 ? Math.round((100 * d.upfront) / d.fee) : 0); // the deposit, as a share of the price
// The deposit in a model line: a percentage of the price (0 to 100); with a currency, or above 100, an amount.
function readUpfront(v, d) {
  if (v === undefined || v === null || v === '' || v === true || v === 'true') return null;
  if (v === false || v === 'false' || /^(?:non|aucun|sans)$/i.test(String(v).trim())) return 0;
  const s = String(v), x = parseFloat(s.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(x) || x < 0) return null;
  const money = !/%/.test(s) && (/[€$£]|\beur|[ée]cus?\b|cr[ée]dits?\b/i.test(s) || x > 100);
  if (money && !(d.fee > 0)) return null;
  const pct = money ? (100 * x) / d.fee : x > 0 && x < 1 && !/%/.test(s) ? x * 100 : x; // (0.4: a share, written as one)
  return clamp(Math.round(pct * 100) / 100, 0, 100); // (0.27.6: « 300 € » stays 300 €, not a rounded percentage)
}
const upLine = (g, d) => (!(d.fee > 0) || d.payLate ? '' : d.upfront > 0 ? `, acompte de ${fmtMoney(g, d.upfront)} (${upShown(d)} %) ${d.state === 'offer' ? 'à la signature' : 'déjà versé'}`
  : d.state === 'offer' ? ', sans acompte (tout est payé à la livraison)' : '');
// What a contract gives besides money: products (0.27.6: on top of a fee too; a contract with a fee signed before never
// sent them).
const dealGoods = (d) => !d.gift && d.value > 0 && (!d.fee || !d.signedAt || !!d.goodsSent);
const CARE_ASK = 0.3, CARE_FEE = 1.5, CARE_CUT = 0.4; // 0.30.1: how often a brand asks for it « soignée », what it pays more, what it keeps back if not
function dealSummary(g, d) {
  const bg = d.big ? (g.releases || []).find((x) => x.id === d.big) : null; // 0.30.1
  return `${d.fee ? fmtMoney(g, d.fee) + (dealGoods(d) ? ` + produits offerts (≈ ${fmtMoney(g, d.value)})` : '') : d.gift ? `matos offert : ${giftLine(g, d.gift)}` : `produits offerts (≈ ${fmtMoney(g, d.value)})`} pour ${bg ? `être dans ta grosse production « ${str(bg.topic, 50)} »` : d.what === 'live' ? 'un live' : `${d.what === 'vidéo' ? 'une' : 'un'} ${dealWhat(g, d)}`} avec ${d.product}, à publier sous ${d.days} jours${d.solo ? ', seule marque de la production' : ''}${d.care ? (whatF(d) ? ', vidéo soignée exigée' : `, ${dealWhat(g, d)} soigné exigé`) : ''}${upLine(g, d)}${d.exclusive ? ', exclusivité 30 jours sur ce secteur' : ''}${d.shady ? ', sans la mention « Collaboration commerciale »' : ''}${d.costs ? `, frais d’inscription à ta charge : ${fmtMoney(g, d.costs)}` : ''}${d.payLate ? `, payé en une fois ${d.payLate} jours après la publication` : ''}${d.clause ? `, clause : ${d.clause.text}` : ''}${d.brief ? `, contrat et brief à télécharger (${d.brief})` : ''}${guestWord(g, d)}`; // (0.19.1: no warning: the player sees the trap or not; 0.33.6: someone in it)
}
// 0.33.6: the other creator agreed in the conversation, in the contract's words.
function guestWord(g, d) {
  const G = d.guestPlan || (d.guest && d.guest.brand ? { c: d.guest.c, fee: d.guest.fee } : null), c = G && g.chars[G.c];
  return c ? `, avec ${c.name}${G.fee != null ? ` (sa part, payée par toi : ${fmtMoney(g, G.fee)})` : ''}` : '';
}
// The agent's cut on what the brands pay.
function agentCut(g, amount, brand) {
  const m = hasStaff(g, 'agent');
  if (!m || !(amount > 0)) return 0;
  const cut = Math.round(amount * m.rate) / 100;
  charge(g, cut, `Commission ${g.chars[m.c] ? deN(firstName(g.chars[m.c])) : 'de ton agent'} (${brand})`, 'staff'); // (0.28.1: « d’Iris »)
  return cut;
}
// 0.27.6: a down payment that goes back takes the agent's cut on it back too (they kept it before).
// 0.28.1: money given back is no money earned: « gagnés depuis le début » loses the deposit, and the cut that comes back
// is a cost undone, not a gain.
function refundUpfront(g, d) {
  if (!(d.upfront > 0)) return 0;
  charge(g, d.upfront, `Remboursement de l’acompte ${d.brand}`, 'deal');
  g.career.earned = Math.max(0, (g.career.earned || 0) - d.upfront);
  if (d.upCut > 0) { g.career.cash += d.upCut; ledger(g, `Commission rendue par ton agent (${d.brand})`, d.upCut, 'staff'); d.upCut = 0; }
  return d.upfront;
}
// What a brand bills when a signed contract breaks on the player's side: the gear it sent, the products it sent (0.27.6:
// the products stayed free, and could be sold).
function billSent(g, d) {
  if (d.gift && d.giftSent) { charge(g, d.gift.value, `${d.brand} te facture le matos offert (${giftName(g, d.gift)})`, 'deal'); return d.gift.value; }
  if (!d.gift && d.value > 0 && d.goodsSent) { charge(g, d.value, `${d.brand} te facture ses produits`, 'deal'); return d.value; }
  return 0;
}
// The exclusive contract another signature would break (the same brand again: of course not).
const dealClash = (g, d) => g.deals.find((x) => x.exclusive && x.sector === d.sector && x.id !== d.id && x.brand.toLowerCase() !== d.brand.toLowerCase() && (x.state === 'signed' || (x.state === 'done' && Date.now() - (x.signedAt || 0) < 30 * DAY_MS))) || null;
// 0.27.6: signing anyway (the player is never stopped): the exclusive brand learns it. Still running, it breaks the
// contract (the deposit and what it sent go back, a penalty); delivered less than 30 days ago, a penalty.
function exclusiveBreach(g, x, d) {
  const c = g.chars[x.contact], pen = Math.round((x.fee || x.value || 100) * 0.2);
  let back = 0;
  if (x.state === 'signed') { x.state = 'broken'; back = refundUpfront(g, x) + billSent(g, x); }
  if (pen) charge(g, pen, `Pénalité d’exclusivité ${x.brand}`, 'deal');
  const dr = repMove(g, { pro: -12 }, `exclusivité de ${x.brand} pas respectée`);
  if (c) { applyRel(g, c, -18, `a signé avec ${d.brand} malgré l’exclusivité`, later(), 25); addIncomingDM(g, c, `On vient de voir ton partenariat avec ${d.brand}… Notre contrat était exclusif. ${x.state === 'broken' ? 'On arrête là, et tu recevras la facture.' : 'Tu vas recevoir la facture de la pénalité.'}`, later() + 4000, { max: 300 }); }
  addNotif(g, { k: 'money', text: `⚖️ ${x.brand} : exclusivité pas respectée${x.state === 'broken' ? ', contrat rompu' : ''} (−${fmtMoney(g, pen + back)}${repBit(dr, ', ')}).` });
}
function signDeal(g, d, o = {}) {
  if (!d || d.state !== 'offer') return false;
  const clash = dealClash(g, d);
  if (clash && !o.force) { toast(`Ton contrat avec ${clash.brand} t’interdit ce secteur pendant 30 jours (exclusivité).`, 'bad'); return false; } // (the screens ask first, then sign anyway)
  if (!scamBeforeSign(g, d)) return false; // 0.20: an « ambassador » fee to pay first
  const t = Date.now();
  Object.assign(d, { state: d.scam === 'frais' ? 'waiting' : 'signed', signedAt: t, due: t + d.days * DAY_MS }); // (0.27.6: a gift that will never come looks like any signed contract)
  const c = g.chars[d.contact];
  if (d.upfront && d.scam !== 'brief') { earn(g, d.upfront, `Acompte ${d.brand} (${upShown(d)} %)`, 'deal'); d.upCut = agentCut(g, d.upfront, d.brand); } // (0.27.6: a fake contract pays nothing)
  if (d.gift) sendGift(g, d); // 0.21
  else if (d.value > 0 && d.state === 'signed') { invAdd(g, { kind: 'goods', name: d.product.replace(/^(?:ses|son|sa|leurs?)\s+/i, ''), emoji: d.emoji, value: d.value, cond: 'neuf', from: { how: 'marque', brand: d.brand, deal: d.id, c: d.contact } }); d.goodsSent = true; } // 0.26: the products, sent at the signature (0.27.6: with money on top too)
  if (clash) exclusiveBreach(g, clash, d);
  const bg = d.big ? bigOn(g) : null; // 0.30.1: a brand for the production goes in it (while there is room)
  if (bg && bg.id === d.big && d.state === 'signed' && !bg.big.deals.includes(d.id) && bg.big.deals.length < BIG_DEALS) bg.big.deals.push(d.id);
  if (c && d.scam !== 'brief') { addIncomingDM(g, c, d.scam === 'frais' ? 'Bienvenue dans la team des ambassadeurs ! 🎉 Ton kit part cette semaine 📦' : d.gift ? (!d.giftSent ? `Top, contrat signé ! ${cap1(GIFT_ART[d.gift.kind])} part cette semaine, tu nous diras 📦` : `Top, contrat signé ! ${cap1(GIFT_ART[d.gift.kind])} est en route, tu l’as dès aujourd’hui 📦`) : pick(['Top, contrat signé ! On a hâte de voir ça 🙌', 'Parfait, c’est signé. Hâte de voir ce que tu vas en faire !', d.shady ? 'Génial, bienvenue dans la team ! Et comme convenu : on reste discrets 😉' : 'Génial, bienvenue dans la team ! N’oublie pas la mention « Collaboration commerciale » 😉']), later() + 1500, { max: 300 }); touch(c); }
  addChronicle(g, `${g.player.name} a signé un partenariat avec ${d.brand}.`);
  dealSignedAch(g, t); // 0.28: a first one; how many this month
  penalClause(g, d); // a trap clause of another contract bites
  scamAfterSign(g, d); // the « brief » was a virus
  if (d.state === 'signed') dilemmaOnDeal(g, d); // 0.18: two close friends may want the same spot on it
  if (d.state === 'signed') agencyOnOwnDeal(g, d); // 0.31: a talent of the player's was dealing with that brand
  if (d.state === 'signed') guestFromPlan(g, d, t); // 0.33.6: the other creator agreed in the conversation
  return true;
}
function guestFromPlan(g, d, t = Date.now()) {
  const G = d.guestPlan, c = G && g.chars[G.c];
  if (!c || d.guest || !featOK(g, c)) return false;
  d.guest = Object.assign({ c: c.id, at: t, brand: true, why: '' }, G.fee != null ? { fee: G.fee, askedAt: t } : {});
  delete d.guestPlan;
  if (G.fee != null) S.drafts.dm[c.id] = `C’est signé avec ${d.brand} ! On le tourne ensemble ? Ta part : ${fmtMoney(g, G.fee)}, comme convenu.`;
  addNotif(g, { k: 'relup', c: c.id, at: later() + 2600, text: G.fee != null ? `🤝 ${d.brand} : ${firstName(c)} est dans le contrat (sa part : ${fmtMoney(g, G.fee)}). Il reste son oui : dis-lui que c’est signé.` : `🤝 ${d.brand} : ${firstName(c)} est dans le contrat. Fixe sa part dans le Studio.` });
  return true;
}
// 0.21: the gear a brand offers comes at the signature. Better than what the player has: it takes its place (the old one
// sold second hand); not better: sold second hand itself. A scam: it never comes, or it is a fake that soon dies.
function sendGift(g, d) {
  const X = d.gift, G0 = g.gear;
  if (!X || !G0) return;
  if (d.scam === 'impaye') { d.lostAt = Date.now() + randi(3, 6) * DAY_MS; return; } // (« it ships this week »… never)
  d.giftSent = true;
  const name = giftName(g, X), cur = G0.items[X.kind];
  const it = Object.assign(mkItem(X.t), d.scam === 'nul' ? { fake: Date.now() + randi(2, 5) * DAY_MS } : {});
  receiveGear(g, X.kind, it, { how: 'marque', brand: d.brand, deal: d.id, c: d.contact }, `${d.brand} t’a envoyé ${GIFT_UN[X.kind]} (${name})`); // 0.26: never sold in the player's place
}
function declineDeal(g, d) {
  if (!d || d.state !== 'offer') return;
  d.state = 'declined';
  { const st = ensureAch(g); st.declined = (st.declined || 0) + 1; achProgress(g, 'incorruptible', st.declined); } // 0.28: ten refused
  const c = g.chars[d.contact];
  if (c) addIncomingDM(g, c, pick(['Dommage ! Peut-être une prochaine fois.', 'Ok, je comprends. Bonne continuation !', 'Pas de souci, on garde ton contact.']), later() + 1500, { max: 300 });
}
// A model line in the brand's DM: what the two of them agreed to change in the contract (0.19.1: the price, the mention,
// the exclusivity, the deadline, the format; before signing, or as an amendment once signed), or a walk-out.
const yesNo = (v) => (v === true || v === 'true' ? true : v === false || v === 'false' ? false : null);
function applyDealLine(g, c, o) {
  const d = g.deals.find((x) => x.contact === c.id && x.state === 'offer') || g.deals.find((x) => x.contact === c.id && x.state === 'signed');
  if (!d) return;
  if (yesNo(o.walk)) {
    if (d.state === 'offer') { d.state = 'withdrawn'; addNotif(g, { k: 'money', c: c.id, text: `${d.brand} retire son offre.` }); if (d.doubt) d.doubt.walked = Date.now(); }
    else if (doubtWalk(d)) { // 0.32: they did not believe the player's explanations (an anonymous message): the contract ends, the down payment goes back
      d.state = 'broken';
      d.doubt.walked = Date.now();
      const back = refundUpfront(g, d);
      applyRel(g, c, -8, 'n’a pas su nous rassurer', later(), 10);
      addNotif(g, { k: 'reldown', c: c.id, text: `💔 ${d.brand} rompt votre contrat : tes explications ne les ont pas convaincus${back ? ` (tu rembourses l’acompte, ${fmtMoney(g, back)})` : ''}.` });
      addChronicle(g, `${d.brand} a rompu son contrat avec ${g.player.name} après un message anonyme.`);
    }
    else if (d.resold) { // 0.26: their gift on sale before the content: they break the contract (the down payment goes back)
      d.state = 'broken';
      const back = refundUpfront(g, d), billed = billSent(g, d); // 0.27.6: and what they sent is billed (it cost nothing before)
      const dr = repMove(g, { pro: -8 }, `${d.brand} rompt votre contrat (son cadeau revendu)`);
      applyRel(g, c, -15, 'a revendu notre cadeau avant de livrer', later(), 20);
      const owed = [back ? `l’acompte (${fmtMoney(g, back)})` : '', billed ? `ce qu’ils t’avaient envoyé (${fmtMoney(g, billed)})` : ''].filter(Boolean).join(' et ');
      addNotif(g, { k: 'reldown', c: c.id, text: `💔 ${d.brand} rompt votre contrat${owed ? ` : tu rembourses ${owed}` : ''}${repBit(dr, ' (', ')')}.` });
    }
    return;
  }
  const signed = d.state === 'signed', said = [], fee0 = d.fee;
  const gu = guestOfLine(g, o); // 0.33.6: another creator in it (agreed in the conversation)
  if (gu && !signed && (!d.guestPlan || d.guestPlan.c !== gu.c || (gu.fee != null && d.guestPlan.fee !== Math.round(num(gu.fee, 0))))) { d.guestPlan = { c: gu.c, fee: gu.fee != null ? Math.max(0, Math.round(num(gu.fee, 0))) : null }; said.push(`avec ${g.chars[gu.c].name}`); }
  else if (gu && signed && !d.guest) { d.guestPlan = { c: gu.c, fee: gu.fee != null ? Math.max(0, Math.round(num(gu.fee, 0))) : null }; if (guestFromPlan(g, d)) said.push(`avec ${g.chars[gu.c].name}`); }
  const m = yesNo(o.mention);
  if (m === true && d.shady) { d.shady = false; said.push('avec la mention « Collaboration commerciale »'); }
  else if (m === false && !d.shady && d.fee0) { d.shady = true; said.push('sans la mention « Collaboration commerciale »'); }
  if (yesNo(o.clause) === false && d.clause) { said.push(`sans la clause « ${str(d.clause.text, 60)} »`); d.clause = null; if (d.scam === 'clause') d.scam = ''; } // 0.20: the trap clause, taken out
  const ex = yesNo(o.exclusive);
  if (ex !== null && ex !== !!d.exclusive && d.fee0) { d.exclusive = ex; said.push(ex ? 'avec une exclusivité de 30 jours' : 'sans exclusivité'); }
  const days = int(o.days, 0, 30, 0);
  if (days && !signed && clamp(days, 2, 14) !== d.days) { d.days = clamp(days, 2, 14); said.push(`à publier sous ${d.days} jours`); }
  else if (days && signed) { const due = d.signedAt + clamp(days, 2, 21) * DAY_MS; if (due > d.due) { d.due = due; said.push(`à livrer ${fmtWhen(d.due)}`); } }
  const what = o.what ? normWhat(o.what) : '';
  if (what && what !== d.what && !signed && PF(g).fmts.includes(what)) { d.what = what; said.push(`pour ${what === 'live' ? 'un live' : `${what === 'vidéo' ? 'une' : 'un'} ${dealWhat(g, d)}`}`); }
  const B = dealBounds(d);
  let fee = Math.round(num(o.fee, 0));
  if (!(fee > 0) && m !== null && d.fee0 && !signed) fee = d.fee; // the mention changed, the price did not: kept within the new range
  if (fee > 0) {
    const nf = Math.max(signed ? Math.ceil(d.upfront || 0) : 0, Math.min(B.cap, Math.round(clamp(fee, B.lo, B.cap)))); // never above the brand's maximum (0.27.6: as written, not rounded up; once signed, never below the deposit paid)
    if (nf !== d.fee) {
      d.fee = nf;
      if (!signed) d.upfront = upfrontOf(d); // (once signed, the down payment is paid: the rest comes on delivery)
      said.unshift(fmtMoney(g, nf));
    }
  }
  // 0.27.4: the down payment they agreed to: in the contract before the signature; after it, the extra is paid now
  const up = readUpfront(o.upfront, d);
  if (up !== null && d.fee > 0 && !NO_UPFRONT.includes(d.scam) && !c.ghost) {
    if (!signed) {
      if (up !== upPctOf(d)) { d.upPct = up; d.upfront = upfrontOf(d); said.push(d.upfront ? `acompte de ${upShown(d)} % à la signature (${fmtMoney(g, d.upfront)})` : 'sans acompte, tout à la livraison'); }
    } else {
      const nu = Math.round((d.fee * up) / 100), extra = nu - (d.upfront || 0);
      if (extra > 0) {
        d.upPct = up;
        d.upfront = nu;
        earn(g, extra, `Acompte ${d.brand} (complément)`, 'deal');
        d.upCut = (d.upCut || 0) + agentCut(g, extra, d.brand);
        said.push(`acompte porté à ${upShown(d)} % (+${fmtMoney(g, extra)} versés tout de suite)`);
      }
    }
  }
  if (!said.length) return;
  unlockAch(g, 'sell-me-this-pen'); // 0.28: something negotiated, and the brand agreed
  dmCard(g, c, { sys: 'deal', deal: d.id, upd: true }, later() + 2500);
  const onlyFee = said.length === 1 && d.fee !== fee0;
  addNotif(g, { k: 'money', c: c.id, text: onlyFee ? `${d.brand} ${d.fee > fee0 ? 'monte' : 'revoit'} son offre : ${fmtMoney(g, d.fee)}.` : `${d.brand} ${signed ? 'modifie votre contrat' : 'revoit son offre'} : ${said.join(', ')}.` });
}
// Called once a release is out: the sponsor it carries is delivered, and the law is watching.
function deliverDeal(g, d, post, mention, perf) {
  if (!d || d.state !== 'signed') return;
  d.state = 'done';
  d.post = post ? post.id : null;
  d.mention = !!mention;
  const paid = scamOnDeliver(g, d); // 0.20: a brand that never pays, a product that will be recalled…
  const sloppy = !!(d.care && !(perf && perf.care)); // 0.30.1: it asked for a « soignée » one: it keeps 40 % back
  const clash = !!(perf && perf.clash); // 0.30.1: its clause broken by another brand in the same production: half of it
  const keep = paid && (sloppy || clash) ? Math.round(d.fee * (clash ? 0.5 : CARE_CUT)) : 0;
  const rest = paid ? Math.max(0, d.fee - d.upfront - keep) : 0;
  if (sloppy) d.sloppy = keep || 1;
  if (clash) d.clashed = keep || 1;
  if (rest) { earn(g, rest, `Partenariat ${d.brand}`, 'deal'); agentCut(g, rest, d.brand); }
  if (clash) repMove(g, { pro: -8 }, `contrat ${d.brand} : la marque ${perf.clash}`);
  else if (sloppy) repMove(g, { pro: -6 }, `contrat ${d.brand} : ${whatF(d) ? 'la vidéo devait être soignée' : `le ${dealWhat(g, d)} devait être soigné`}`);
  else repMove(g, { pro: mention ? 6 : 2 }, `contrat ${d.brand} livré${mention ? ' dans les règles' : ''}`); // 0.10
  if (d.banned) toxMove(g, 3, `ta pub pour ${d.brand} (${d.banned})`); // 0.30: an illegal sponsor sinks a name further
  if (d.value > 0 && !d.gift && (d.goodsSent || !d.fee)) ledger(g, `Produits offerts par ${d.brand} (≈ ${fmtMoney(g, d.value)})`, 0, 'goods');
  const c = g.chars[d.contact];
  const bare = !d.shady && !mention; // 0.28.1: an honest contract asked for the mention: delivered without it, the brand is not happy (no bonus)
  if (c) applyRel(g, c, clash ? -15 : sloppy ? -12 : d.shady && mention ? -5 : bare ? -10 : 6, clash ? 'une autre marque était dans la même production, le contrat disait le contraire' : sloppy ? 'le contrat demandait un contenu soigné, ce n’était pas le cas' : d.shady && mention ? 'tu as mis la mention, ce n’était pas le deal' : bare ? 'tu as caché que c’était une pub, le contrat disait le contraire' : 'contente du partenariat', later() + 3000, 10);
  // the law: no mention, or a forbidden product, can be spotted later (a report, a check)
  const p = d.banned ? (toxLv(g) >= 2 ? 0.35 : 0.8) : !mention ? 0.45 : 0; // (0.30: a toxic name is watched less closely: the shady deals are a real gain, and a real risk)
  if (p && Math.random() < p) d.check = Date.now() + randi(8, 60) * 3600000;
  const fw = perf && perf.fit ? ` Placement ${FIT_WORDS[perf.fit]} : ${perf.fit > 0 ? '+' : '−'}${fitPct(perf.fit)} % de vues.` : ''; // 0.21
  const inKind = !d.fee && paid ? (d.gift ? ` : payé en matos (${giftName(g, d.gift)}), pas en argent` : d.value ? ` : payé en produits (≈ ${fmtMoney(g, d.value)}), pas en argent` : '') : ''; // 0.22.3: said, not guessed
  addNotif(g, { k: 'money', text: `${d.emoji} Partenariat ${d.brand} livré${rest ? ` : +${fmtMoney(g, rest)}` : !paid ? (d.payLate ? ` : paiement prévu dans ${d.payLate} jours` : d.gift ? ' : tu attends encore le matos' : '') : inKind}.${clash ? ` ⚖️ ${d.brand} ${perf.clash} : la marque retient ${fmtMoney(g, keep)}.` : keep ? ` Le contrat demandait ${whatF(d) ? 'une vidéo soignée' : `un ${dealWhat(g, d)} soigné`} : ${d.brand} retient ${fmtMoney(g, keep)}.` : sloppy ? ` Le contrat demandait ${whatF(d) ? 'une vidéo soignée' : `un ${dealWhat(g, d)} soigné`} : ${d.brand} n’est pas contente.` : ''}${fw}` }); // (0.30: never « undefined jours »)
  if (!mention) secretFromDeal(g, d); // 0.18: a hidden ad is a secret now (the brand's contact knows)
  dealDelivered(g, d); // 0.18: the one who got the spot on it
  if (!bare && !sloppy && !clash) brandLove(g, d, perf); // 0.20: a release that did very well: a bonus, and the brand comes back
}
// Deadlines, offers that expire, a moral clause after a scandal, and checks on hidden ads.
function checkDeals(g, t) {
  let ch = false;
  const scandal = g.stats.cancelled || playerBadBuzz(g, t);
  for (const d of g.deals) {
    if (d.state === 'offer' && t > d.until) { d.state = 'expired'; ch = true; }
    else if (d.state === 'signed' && t > d.due && d.scam === 'impaye') { d.state = 'broken'; ch = true; } // (nothing to claim from a brand that never pays)
    else if (d.state === 'signed' && t > d.due) {
      d.state = 'broken';
      const pen = Math.round(d.fee * 0.2);
      const back = refundUpfront(g, d); // (0.27.6: the agent's cut on it comes back)
      if (pen) charge(g, pen, `Pénalité de retard ${d.brand}`, 'deal');
      const billed = billSent(g, d); // 0.21: no video, no gift (0.27.6: nor the products)
      const dr = repMove(g, { pro: -25, cred: -5 }, `contrat ${d.brand} pas livré à temps`);
      const c = g.chars[d.contact];
      if (c) { applyRel(g, c, -20, 'contrat pas respecté', later(), 25); addIncomingDM(g, c, 'On n’a rien vu passer… Le contrat est rompu. Tu recevras la facture de la pénalité.', later() + 1000, { max: 300 }); }
      addNotif(g, { k: 'money', text: `Contrat ${d.brand} rompu : délai dépassé (−${fmtMoney(g, back + pen + billed)}${billed ? (d.gift ? ', le matos offert facturé' : ', les produits facturés') : ''}${repBit(dr, ', ')}).` });
      ch = true;
    } else if (d.state === 'signed' && scandal && !d.moral) {
      d.moral = true; // the moral clause is checked once per scandal
      if (Math.random() < 0.5) {
        d.state = 'broken';
        refundUpfront(g, d);
        const c = g.chars[d.contact];
        if (c) addIncomingDM(g, c, 'Vu ce qui se passe en ce moment… on préfère suspendre notre collaboration (clause de moralité). Désolée.', later() + 1000, { max: 300 });
        addNotif(g, { k: 'money', text: `${d.brand} rompt votre contrat à cause du scandale (clause de moralité).` });
        ch = true;
      }
    }
    if (d.state === 'done' && d.check && t >= d.check) { d.check = 0; sanction(g, d); ch = true; }
  }
  return ch;
}
// A hidden ad or a forbidden product, spotted: a fine, and the network piles on.
function sanction(g, d) {
  const law = !!d.banned;
  unlockAch(g, 'jail-time'); // 0.28: an illegal partnership, found out
  let fine = law ? Math.max(1500, d.fee * 2) : Math.max(500, d.fee);
  fine = Math.round(fine * (1 - 0.2 * staffPower(g, 'avocat')));
  charge(g, fine, `Amende (${law ? 'promotion interdite' : 'publicité cachée'})`, 'fine');
  const dr = repMove(g, law ? { pro: -70, cred: -30, image: -15 } : { pro: -45, cred: -20, image: -10 }, `${law ? 'promotion interdite' : 'publicité cachée'} (${d.brand})`, { noCheck: true });
  const loss = Math.round(g.stats.followers * (law ? 0.06 : 0.04));
  g.stats.followers = Math.max(0, g.stats.followers - loss);
  const t = Date.now();
  g.pbb = { at: t, until: t + Math.round(PLAYER_BB_MS * staffMult(g, 'bb')), c: null, kind: 'pub' };
  const h = g.player.handle, tag = law ? '#PromoInterdite' : '#PubCachée';
  let at = t + randi(2000, 5000);
  const pce = addAmbientPost(g, { by: 'contre.enquete', name: 'Contre-Enquête', bio: 'vérifie les screens avant tout le monde', text: law ? `@${h} fait la promo de ${d.product} (${d.brand}). C’est interdit en France depuis 2023. Signalé. ${tag}` : `@${h} vend ${d.product} de ${d.brand} sans dire que c’est payé. Pas de mention « Collaboration commerciale » = pratique commerciale trompeuse. ${tag}` }, at, at);
  at += randi(4000, 8000);
  addAmbientPost(g, { by: pick(CANCEL_NPCS)[0], text: `donc on se fait vendre des trucs en douce par @${h} ${tag} 💀` }, at, at);
  addNotif(g, { k: 'money', text: `⚖️ ${law ? 'Promotion interdite' : 'Publicité cachée'} repérée (${d.brand}) : amende de ${fmtMoney(g, fine)}${repBit(dr, ', ')}, −${nAbonnes(loss)}.` });
  addChronicle(g, `${g.player.name} a été ${px(g, 'épinglé', 'épinglée', 'épinglé·e')} pour ${law ? 'une promotion interdite' : 'une publicité cachée'} (${d.brand}).`);
  addTrigger(g, `Le joueur s’est fait épingler pour ${law ? 'une promotion interdite par la loi' : 'une publicité cachée'} (${d.brand}, ${d.product}) : le réseau s’indigne, se moque, ressort ses anciens posts.`);
  queueModalFor(g, { t: 'money', what: 'fine', amount: fine, law, brand: d.brand, rep: repPts(dr) });
  dealSecretOut(g, d, pce); // 0.18: the secret is out (the fine says it all)
  checkCancel(g);
}

/* ---------- the team: people the player hires (and pays) ---------- */
// 0.33: a power as it works today (a level, the gear, the mood, the loyalty), for what is shown by level.
const pIx = (p) => clamp(Math.round(num(p, 1)) - 1, 0, 3);
const STAFF_ROLES = {
  monteur: { emoji: '🎬', m: 'Monteur vidéo', f: 'Monteuse vidéo', x: 'Monteur·se vidéo', pay: 'video', rates: [50, 150, 350, 900], fmts: ['vidéo', 'short', 'clip'],
    desc: 'Monte tes contenus : plus de temps pour tes tournages, un rendu plus pro, un format court tiré de chaque vidéo longue, et tes contenus prêts plus vite.', fx: (p) => `+${Math.round(8 * p)} % de temps au tournage · +${Math.round(8 * p)} % de vues · un format court en bonus · prêts ${Math.round(ED_SAVE[pIx(p)] * 100)} % plus vite` },
  miniature: { emoji: '🖼️', m: 'Graphiste', f: 'Graphiste', x: 'Graphiste', pay: 'video', rates: [20, 60, 150, 400], fmts: ['vidéo', 'short', 'clip', 'podcast', 'live'],
    desc: 'Tes miniatures et tes visuels donnent envie de cliquer, et te font gagner du temps.', fx: (p) => `+${Math.round(7 * p)} % de vues sur chaque sortie · ${TH_SAVE[pIx(p)]} min de gagnées sur chaque sortie` },
  scenariste: { emoji: '✍️', m: 'Scénariste', f: 'Scénariste', x: 'Scénariste', pay: 'video', rates: [60, 180, 450, 1100], fmts: ['vidéo', 'short', 'clip', 'podcast', 'live'],
    desc: 'Prépare le fond de tes contenus : des indices pendant tes tournages.', fx: (p) => `${pIx(p) + 1} ${plural(pIx(p) + 1, 'indice', 'indices')} par tournage · +${Math.round(4 * p)} % de temps` },
  cm: { emoji: '💬', m: 'Community manager', f: 'Community manager', x: 'Community manager', pay: 'week', rates: [120, 300, 650, 1400],
    desc: 'Gère tes commentaires : moins de casse quand ça tourne mal, et les rumeurs repérées plus tôt.', fx: (p) => `−${Math.round(12 * p)} % d’abonnés perdus quand ça tourne mal · rumeurs moins fortes` },
  agent: { emoji: '🤝', m: 'Agent', f: 'Agente', x: 'Agent·e', pay: 'cut', rates: [10, 15, 18, 20],
    desc: 'Te trouve des marques, négocie pour toi et lit les offres avant toi (les arnaques aussi), contre une commission sur chaque contrat. Plus son niveau est haut, plus les contrats qu’il ou elle sait gérer sont gros.', fx: (p) => `offres plus fréquentes · +${Math.round(5 * p)} % sur les contrats · contrats jusqu’à ${pIx(p) >= 3 ? 'toutes tailles' : fmtPlain(AGENT_CEIL[pIx(p)]) + ' €'}` },
  rp: { emoji: '📣', m: 'Attaché de presse', f: 'Attachée de presse', x: 'Attaché·e de presse', pay: 'week', rates: [200, 500, 1100, 2500],
    desc: 'Les médias parlent de toi : tes sorties mieux couvertes, tes bad buzz plus courts.', fx: (p) => `+${Math.round(4 * p)} % de vues · bad buzz −${Math.round(15 * p)} %` },
  agence: { emoji: '🏢', m: 'Agent de ton agence', f: 'Agente de ton agence', x: 'Agent·e de ton agence', pay: 'week', rates: [250, 600, 1300, 2800], // 0.31: only once the agency exists
    desc: 'Travaille pour ton agence d’influence : trouve plus de marques pour tes talents, négocie mieux, et te laisse prendre plus de talents.', fx: (p) => `+${Math.round(15 * p)} % d’offres pour tes talents · +${Math.round(4 * p)} % sur leurs contrats · +${pIx(p) + 1} ${plural(pIx(p) + 1, 'talent', 'talents')}` },
  avocat: { emoji: '⚖️', m: 'Avocat', f: 'Avocate', x: 'Avocat·e', pay: 'case', rates: [300, 800, 2000, 5000],
    desc: 'Mises en demeure contre les rumeurs et la diffamation, défense en cas d’amende.', fx: (p) => `${Math.min(95, Math.round(45 + 15 * p))} % de chances de faire retirer une rumeur · amendes −${Math.min(95, Math.round(20 * p))} %` },
};
const STAFF_TIERS = [
  { m: 'Débutant', f: 'Débutante', x: 'Débutant·e', years: [1, 2] },
  { m: 'Confirmé', f: 'Confirmée', x: 'Confirmé·e', years: [3, 5] },
  { m: 'Expert', f: 'Experte', x: 'Expert·e', years: [6, 10] },
  { m: 'Star du métier', f: 'Star du métier', x: 'Star du métier', years: [11, 20] },
];
const roleName = (role, gd) => { const R = STAFF_ROLES[role]; return R ? gx(gd, R.m, R.f, R.x) : role; };
const tierName = (tier, gd) => { const T = STAFF_TIERS[tier] || STAFF_TIERS[0]; return gx(gd, T.m, T.f, T.x); };
const hasStaff = (g, role) => (g.staff || []).find((m) => m.role === role && g.chars[m.c]) || null;
const staffPower = (g, role) => memberPower(g, hasStaff(g, role)); // 0.33: their level, their gear, their mood, their loyalty (equipe.js)
const payWord = (g, m) => { const R = STAFF_ROLES[m.role]; return R.pay === 'cut' ? `${m.rate} % des contrats` : R.pay === 'week' ? `${fmtMoney(g, m.rate)} / semaine` : R.pay === 'case' ? `${fmtMoney(g, m.rate)} par dossier` : `${fmtMoney(g, m.rate)} par sortie`; };
// What the team adds (crew: the per-release roles really paid for this release).
function staffMult(g, what, fmt, crew) {
  const p = (role) => (STAFF_ROLES[role].pay === 'video' ? (crew ? (crew.includes(role) ? staffPower(g, role) : 0) : 0) : staffPower(g, role));
  if (what === 'views') {
    let m = 1;
    if (STAFF_ROLES.monteur.fmts.includes(fmt)) m *= 1 + 0.08 * p('monteur');
    m *= 1 + 0.07 * p('miniature');
    return m * (1 + 0.04 * p('rp'));
  }
  if (what === 'time') return 1 + 0.08 * p('monteur') + 0.04 * p('scenariste');
  if (what === 'fee') return 1 + 0.05 * staffPower(g, 'agent'); // 0.20: was 0.12 (an agent made the money explode)
  if (what === 'loss') return 1 - 0.12 * staffPower(g, 'cm');
  if (what === 'bb') return 1 - 0.15 * staffPower(g, 'rp');
  return 1;
}
// The per-release roles get paid when the shoot starts (once per release): those who are not paid do not work on it.
function payCrew(g, r) {
  if (r.crew) return r.crew;
  const crew = [], missed = [];
  for (const m of g.staff) {
    const R = STAFF_ROLES[m.role];
    if (!R || R.pay !== 'video' || !R.fmts.includes(r.what)) continue;
    if (m.once && m.doneR && m.doneR !== r.id) continue; // 0.33: someone of the cast, for one release: that one is theirs
    const c = g.chars[m.c];
    const days = r.big ? r.big.size : 1; // 0.30.1: a big production pays its team for every day of it
    if (pay(g, m.rate * days, `${roleName(m.role, c && c.g)} · ${wordCut(r.topic, 30)}${days > 1 ? ` (${days} jours)` : ''}`, 'staff')) { crew.push(m.role); staffWorked(g, m); if (m.once) m.doneR = r.id; } // (0.33: a release worked on, a step)
    else missed.push(c ? firstName(c) : roleName(m.role));
  }
  r.crew = crew;
  const tm = teamOf(g, r.what, crew); if (tm) r.team = tm; else delete r.team; // 0.30.1: unpaid, they do not work on it: their time is not saved
  if (missed.length) toast(`Pas assez d’argent pour payer ${missed.join(' et ')} : ${missed.length > 1 ? 'ils ne travailleront' : 'cette personne ne travaillera'} pas sur ${ta(r)}.`, 'bad');
  return crew;
}
// Salaries, every 7 days of game time; unpaid twice, they leave (and may talk).
function payroll(g, t) {
  let ch = false;
  for (const m of g.staff.slice()) {
    const R = STAFF_ROLES[m.role], c = g.chars[m.c];
    if (!R || R.pay !== 'week' || !c || t < m.next) continue;
    m.next += 7 * DAY_MS;
    ch = true;
    if (pay(g, m.rate, `Salaire de ${firstName(c)} (${roleName(m.role, c.g).toLowerCase()})`, 'staff')) { m.unpaid = 0; repMove(g, { pro: 1.5 }, 'ton équipe payée à l’heure'); continue; }
    m.unpaid = (m.unpaid || 0) + 1;
    if (m.unpaid >= 2) { quitStaff(g, m, 'unpaid'); continue; }
    applyRel(g, c, -12, `pas ${gx(c.g, 'payé', 'payée', 'payé·e')} cette semaine`, later(), 15);
    addIncomingDM(g, c, `Euh… mon virement de la semaine n’est pas arrivé. Je bosse pas gratuitement, hein. Encore une fois et j’arrête.`, later() + 1500, { max: 300 });
  }
  return ch;
}
function quitStaff(g, m, why) {
  const c = g.chars[m.c];
  g.staff = g.staff.filter((x) => x !== m);
  if (!c) return;
  if (m.main) { mainJobEnd(g, c, m, why); return; } // 0.33: someone of the cast keeps their life, and who they are
  c.kind = 'ex';
  c.role = why === 'poached' && m.poach ? `${roleName(m.role, c.g)} chez ${m.poach.from}` : `Ex-${roleName(m.role, c.g).toLowerCase()}`;
  if (why === 'unpaid') {
    c.rel = clamp(c.rel - 30, -100, 100);
    addMem(g, c, `le joueur ne m’a pas ${gx(c.g, 'payé : je suis parti', 'payée : je suis partie', 'payé·e : je suis parti·e')}`);
    addIncomingDM(g, c, `Deux semaines sans être ${gx(c.g, 'payé', 'payée', 'payé·e')}. C’est fini, je démissionne. Et je vais pas me gêner pour le dire.`, later() + 1000, { max: 300 });
    addAmbientPost(g, { by: c.handle, text: `petit conseil : bossez pas pour @${g.player.handle}, ça paie pas ses factures. deux semaines que j’attends. #BalanceTonClient` }, later() + randi(60000, 240000));
    const dr = repMove(g, { pro: -25, kind: -10 }, `${c.name} pas ${gx(c.g, 'payé', 'payée', 'payé·e')}, et le dit partout`);
    addNotif(g, { k: 'money', c: c.id, text: `${c.name} démissionne (pas ${gx(c.g, 'payé', 'payée', 'payé·e')}) et le fait savoir${repBit(dr, ' : ')}.` });
  } else if (why === 'fired') {
    c.rel = clamp(c.rel - 15, -100, 100);
    addMem(g, c, `le joueur m’a ${gx(c.g, 'viré', 'virée', 'viré·e')}`);
    addNotif(g, { k: 'money', c: c.id, text: `Tu te sépares de ${c.name}.` });
  } else if (why === 'scandal') { // 0.9.4: they do not want their name next to the player's scandal
    c.rel = clamp(c.rel - 10, -100, 100);
    addIncomingDM(g, c, `${gx(c.g, 'Désolé', 'Désolée', 'Désolé·e')}, je ne veux pas être ${gx(c.g, 'associé', 'associée', 'associé·e')} à tout ça. Je préfère arrêter là.`, later() + 1000, { max: 300 });
    addNotif(g, { k: 'money', c: c.id, text: `${c.name} démissionne : ${gx(c.g, 'il', 'elle', 'iel')} ne veut pas être ${gx(c.g, 'associé', 'associée', 'associé·e')} à ton scandale.` });
  } else if (why === 'poached') { // 0.33: a better offer elsewhere
    c.rel = clamp(c.rel - 5, -100, 100);
    addMem(g, c, `j’ai quitté le joueur pour ${m.poach ? m.poach.from : 'un autre créateur'}`);
    addNotif(g, { k: 'reldown', c: c.id, text: `🎣 ${c.name} part chez ${m.poach ? m.poach.from : 'quelqu’un d’autre'}${m.poach ? ` (${rateWord(g, m.role, m.poach.rate)})` : ''}.` });
  } else addNotif(g, { k: 'money', c: c.id, text: `${c.name} démissionne.` });
  addChronicle(g, `${c.name} ne travaille plus pour ${g.player.name}${why === 'unpaid' ? ` (pas ${gx(c.g, 'payé', 'payée', 'payé·e')})` : why === 'poached' && m.poach ? ` (parti${gx(c.g, '', 'e', '·e')} chez ${m.poach.from})` : ''}.`);
}
function hireStaff(g, c) {
  const o = c && c.cand;
  if (!o || c.kind !== 'cand') return false;
  const R = STAFF_ROLES[o.role];
  if (hasStaff(g, o.role)) { toast(`Tu as déjà ${gx(c.g, 'un', 'une', 'un·e')} ${roleName(o.role, c.g).toLowerCase()} : sépare-toi d’abord de la personne actuelle.`, 'bad'); return false; }
  if (R.pay === 'week' && !pay(g, o.rate, `Première semaine de ${firstName(c)}`, 'staff')) { toast(`Il te faut ${fmtMoney(g, o.rate)} pour payer sa première semaine.`, 'bad'); return false; }
  const t = Date.now();
  g.staff.push({ id: uid('st'), c: c.id, role: o.role, tier: o.tier, rate: o.rate, since: t, next: t + 7 * DAY_MS, unpaid: 0, xp: 0, loy: 0, mood: MOOD0, gear: t33On() ? 0 : GEAR_NEED[clamp(o.tier, 0, 3)], day: gameDay(t) }); // (0.33: their gear, the player gives it)
  c.kind = 'staff';
  c.role = `${roleName(o.role, c.g)} de @${g.player.handle}`;
  c.rel = Math.max(c.rel, 20);
  for (const x of Object.values(g.chars)) if (x.kind === 'cand' && x.cand && x.cand.role === o.role && x !== c) x.kind = x.joined ? 'main' : 'gone'; // the others are told no (one who joined the cast stays in the player's life)
  g.cands = null;
  addIncomingDM(g, c, pick(['Trop bien ! Je commence quand tu veux 🔥', 'Merci pour ta confiance, tu vas pas le regretter.', 'Deal ! Envoie-moi tout ce que t’as, je m’y mets.']), later() + 1500, { max: 300 });
  addNotif(g, { k: 'money', c: c.id, text: `${c.name} rejoint ton équipe (${roleName(o.role, c.g).toLowerCase()}, ${payWord(g, g.staff[g.staff.length - 1])}).${t33On() ? ` Pense à l’équiper : il ${gx(c.g, 'lui', 'lui', 'lui')} faut ${NEED_WORD[GEAR_NEED[clamp(o.tier, 0, 3)]]}.` : ''}` });
  addChronicle(g, `${g.player.name} a engagé ${c.name} comme ${roleName(o.role, c.g).toLowerCase()}.`);
  return true;
}
// Job candidates: written by the model (world-flavoured), or by the game when it cannot.
const CAND_PITCH = {
  monteur: ['a monté des vlogs pour des petites chaînes', 'monte des courts-métrages depuis le lycée', 'a monté pour une chaîne de 300 k abonnés', 'a monté les plus gros formats du moment'],
  miniature: ['fait des miniatures pour des amis', 'a refait les visuels de plusieurs chaînes', 'a doublé le taux de clic d’une grosse chaîne', 'signe les miniatures des plus grandes chaînes'],
  scenariste: ['écrit des sketchs pour le théâtre de sa fac', 'a écrit pour une web-série', 'écrit pour des émissions connues', 'a écrit les formats les plus vus de l’année'],
  cm: ['anime le compte d’une asso', 'gère les réseaux d’une marque locale', 'a géré la commu de créateurs connus', 'a géré les plus grosses communautés du pays'],
  agent: ['vient d’ouvrir sa petite agence', 'représente une dizaine de créateurs', 'négocie pour des créateurs très connus', 'gère des stars et leurs plus gros contrats'],
  rp: ['a fait un stage en agence', 'place des sujets dans la presse locale', 'a ses entrées dans les grands médias', 'fait et défait les réputations'],
  avocat: ['vient de prêter serment', 'plaide en droit de la presse', 'spécialiste de la diffamation en ligne', 'ténor du barreau des médias'],
};
function candPrice(role, tier) {
  const R = STAFF_ROLES[role];
  const base = R.rates[clamp(tier, 0, 3)];
  return R.pay === 'cut' ? base : niceRound(base * rand(0.85, 1.2));
}
function addCandidate(g, role, o = {}) {
  const tier = int(o.tier, 0, 3, 0);
  const R = STAFF_ROLES[role];
  const years = int(o.years, STAFF_TIERS[tier].years[0], STAFF_TIERS[tier].years[1] + 4, randi(...STAFF_TIERS[tier].years));
  const c = addContact(g, { kind: 'cand', minAge: 19 + years, name: o.name, handle: o.handle, g: o.g, tag: role, emoji: cleanEmoji(o.emoji) || R.emoji, role: `${roleName(role, o.g)} · ${tierName(tier, o.g)}`,
    personality: str(o.personality, 240) || 'motivé·e, veut décrocher le poste', voice: str(o.voice, 140) || 'naturelle, directe', bio: str(o.pitch, 170) || `${years} ans d’expérience · ${pick(CAND_PITCH[role] || ['de l’expérience'])}`, rel: 15, followers: randi(150, 4000) * (tier + 1) });
  if (!c) return null;
  c.role = `${roleName(role, c.g)} · ${tierName(tier, c.g)}`; // 0.28.1: the gender drawn for them (o.g is often none)
  const rate = R.pay === 'cut' ? candPrice(role, tier) : niceRound(candPrice(role, tier) * standMult(g, 'cand')); // 0.9.4: a scandal costs more, the top less
  c.cand = { role, tier, years, rate, pitch: str(o.pitch, 170) || c.bio, at: Date.now() };
  const hello = str(o.hello, 300) || `Salut ! J’ai vu que tu cherchais ${gx(c.g, 'un', 'une', 'un·e')} ${roleName(role, c.g).toLowerCase()}. ${years} ans d’expérience, dispo tout de suite. On en parle ?`;
  addIncomingDM(g, c, hello, later() + randi(1500, 4000), { max: 400 });
  return c;
}
const candidates = (g, role) => Object.values(g.chars).filter((c) => c.kind === 'cand' && c.cand && (!role || c.cand.role === role));
function fallbackCandidates(g, role) {
  const famous = g.stats.followers >= 100000 || standLv(g) === 2;
  for (const tier of (famous ? [1, 2, 3] : [0, 1, 2]).slice(0, standLv(g) === -2 ? 2 : 3)) addCandidate(g, role, { tier });
}

/* ---------- the daily upload: a programmed series, with a streak that pays ---------- */
const SERIES_DAYS = [3, 5, 7, 14];
const seriesOn = (g) => !!(g.series && g.series.state === 'on');
// The streak multiplier: each episode that works makes the next one bigger.
function seriesMult(g) {
  const s = g.series;
  if (!s || s.state !== 'on') return 1;
  return seriesMultAt(s, s.streak);
}
const seriesMultAt = (s, streak) => Math.min(s.hard ? 4 : 3, 1 + (s.hard ? 0.35 : 0.2) * (streak || 0)); // (0.27.8: what the next episode will get)
// The next time the clock shows hh:mm (at least 20 minutes from now), as a real timestamp.
function nextAt(hour, min, t = Date.now(), minGap = 60000) { // 0.22: « 21 h » at 20:52 is in 8 minutes, not tomorrow
  const now = gameDate(t), at = new Date(now.getTime());
  at.setHours(hour, min, 0, 0);
  while (at - now < minGap) at.setDate(at.getDate() + 1);
  return t + (at - now);
}
function startSeries(g, o) {
  if (seriesOn(g) || !planRoom(g)) return false; // (0.27.4: other releases may be planned around it)
  const what = PF(g).fmts.includes(o.what) ? o.what : PF(g).main;
  const can = canMake(g, what); // 0.20: no computer, no daily long video
  if (!can.ok) { toast(can.why, 'bad'); return false; }
  const s = { id: uid('se'), what, days: SERIES_DAYS.includes(o.days) ? o.days : 7, hour: int(o.hour, 0, 23, 18), min: int(o.min, 0, 59, 0), theme: str(o.theme, 80) || 'mon défi',
    diff: diffOf(o.diff).id, hard: !!o.hard, at: Date.now(), ep: 0, streak: 0, best: 0, fails: 0, missed: 0, results: [], state: 'on' };
  if (o.devis) s.devis = o.devis; // 0.20: what the whole challenge cost, paid at launch
  g.series = s;
  const ep1 = scheduleEpisode(g, s, nextAt(s.hour, s.min));
  addNotif(g, { k: 'release', text: `📅 Défi Daily Upload lancé : ${s.days} ${s.what === 'live' ? 'lives' : 'sorties'} en ${s.days} jours${s.hard ? ', mode hardcore' : ''}. Premier épisode ${fmtWhen(ep1.due)}.` });
  addChronicle(g, `${g.player.name} se lance dans un défi : ${s.days} jours de suite, ${s.what === 'live' ? 'un live' : 'une sortie'} par jour (« ${s.theme} »)${s.hard ? ', en mode hardcore' : ''}.`);
  addTrigger(g, `Le joueur lance un défi « Daily Upload » de ${s.days} jours sur « ${s.theme} »${s.hard ? ' en mode hardcore' : ''} : certains l’encouragent, d’autres parient qu’il va craquer.`);
  return true;
}
// A release programmed in advance (no announcement post): the countdown starts now.
function scheduleRelease(g, o) {
  if (!planRoom(g)) return null; // 0.27.4: several at once
  if (suspended(g)) { toast(`Ta chaîne est suspendue jusqu’à ${hourOf(g.mod.susp.until)} (${longDay(g.mod.susp.until)}) : rien ne peut sortir d’ici là.`, 'bad'); return null; } // 0.30
  const topic = str(o.topic, 100);
  if (!topic || !(o.due > Date.now() || o.now)) return null; // (0.30: o.now: made right away, never announced)
  let what = normWhat(o.what);
  if (!PF(g).fmts.includes(what)) what = PF(g).main;
  const can = canMake(g, what); // 0.20
  if (!can.ok) { toast(can.why, 'bad'); return null; }
  const t = Date.now();
  const r = { id: uid('rl'), what, noun: what === 'short' ? PF(g).shortName : '', topic, post: null, at: t, due: o.now ? t : o.due, state: 'scheduled', delays: 0, tries: 0, c: null, game: null, played: null, said: '', diff: 'moyen', planned: true };
  if (o.now) r.now = 1; // 0.30: « Maintenant »: nobody was waiting for it
  if (o.care && careOK(what)) r.care = 1; // 0.30.1: « soignée »: twice the time, a little more of everything
  const tm = teamOf(g, what); if (tm) r.team = tm; // 0.30.1: the team saves time, counted from the planning
  setOut(r, r.due, t, !!o.start); // 0.30.1: the time announced is when it comes out: the shoot starts the time it takes before
  if (o.devis) r.devis = o.devis; // 0.20: its quote, paid
  if (o.deal) r.deal = o.deal; // the sponsor it carries, chosen with the quote
  if (o.fanQ) r.fanQ = o.fanQ; // 0.21: the question of a fan it answers
  if (what === 'short' && o.promo && promoTargets(g).some((x) => x.id === o.promo)) r.promo = o.promo; // 0.29.1: the long video it announces
  g.releases.push(r);
  trimReleases(g);
  if (r.now) return r; // (made right away: no announcement, no one waiting)
  addNotif(g, { k: 'release', text: `📅 ${cap1(ta(r))} « ${str(topic, 60)} » est programmé${whatF(r) ? 'e' : ''} ${fmtWhen(relAnn(r))}.${prodMs(r) && r.what !== 'live' ? ` Tournage ${fmtWhen(r.due)} (${prodWord(r.what, r.care, r.team)} de travail${r.care ? ', soignée' : ''}${r.team ? ', ' + teamWord(r.team) : ''}).` : prodMs(r) ? ` Il dure ${prodWord(r.what)}.` : ''}` });
  addTrigger(g, `Le joueur a programmé ${unW(r)} pour ${fmtWhen(relAnn(r))} : « ${str(topic, 80)} ». Certains l’attendent déjà.`);
  return r;
}
function scheduleEpisode(g, s, due) {
  const n = s.ep + 1, t = Date.now();
  const r = { id: uid('rl'), what: s.what, noun: s.what === 'short' ? PF(g).shortName : '', topic: `${s.theme} · épisode ${n}`, post: null, at: t, due, state: 'scheduled', delays: 0, tries: 0, c: null, game: null, played: null, said: '', diff: s.diff, series: s.id, ep: n };
  if (s.legacy) r.legacy = true; // 0.20: a daily upload started before the gear goes on as it was
  const tm = teamOf(g, r.what); if (tm) r.team = tm;
  setOut(r, due, t); // 0.30.1: the episode's hour is when it comes out (its shoot, the time it takes before)
  g.releases.push(r);
  trimReleases(g);
  return r;
}
// An episode is out (tier: how its shoot went): the streak grows or breaks, then the next one, or the end.
function seriesEpisode(g, r, tier) {
  const s = g.series;
  if (!s || s.id !== r.series || s.state !== 'on') return;
  s.ep++;
  s.results.push(tier);
  if (tier === 'flop') { s.fails++; s.streak = 0; if (s.hard) { endSeries(g, s); return; } }
  else { s.streak++; s.best = Math.max(s.best, s.streak); }
  if (s.ep >= s.days) { endSeries(g, s); return; }
  const nx = scheduleEpisode(g, s, Math.max(nextAt(s.hour, s.min), relAnn(r) + DAY_MS - 5 * 60000));
  addNotif(g, { k: 'release', text: `Épisode ${s.ep}/${s.days} ${tier === 'flop' ? 'raté : ton bonus de défi retombe à ×1' : `publié : ${s.streak} d’affilée (bonus ×${String(Math.round(seriesMult(g) * 100) / 100).replace('.', ',')} sur le prochain)`}. Prochain ${fmtWhen(nx.due)}.` });
}
function seriesMissed(g, r) {
  const s = g.series;
  if (!s || s.id !== r.series || s.state !== 'on') return;
  s.ep++;
  s.results.push('missed');
  s.missed++;
  s.streak = 0;
  if (s.hard || s.ep >= s.days) { endSeries(g, s); return; }
  scheduleEpisode(g, s, nextAt(s.hour, s.min));
  const dr = repMove(g, { cred: -10, pro: -5 }, `épisode ${s.ep} de ton défi manqué`);
  addNotif(g, { k: 'delay', text: `Épisode ${s.ep}/${s.days} manqué : ton bonus de défi retombe à ×1${repBit(dr, ', ')}. On commence à se moquer.` });
}
// The verdict: rewards, a flop (« bide »), or a bad buzz when it went really wrong.
function endSeries(g, s, quit) {
  const fails = s.fails + s.missed, done = s.ep;
  const won = !quit && done >= s.days && s.missed === 0 && (s.hard ? s.fails === 0 : s.fails <= Math.floor(s.days / 4));
  const bb = !won && (quit || s.hard || fails * 2 >= s.days);
  s.state = won ? 'won' : bb ? 'badbuzz' : 'bide';
  const st = g.stats, h = g.player.handle;
  const rl = plannedReleases(g).find((x) => x.series === s.id); // 0.27.4: not always the next one any more
  if (rl) rl.state = 'dropped';
  if (won) {
    const gems = 2 * s.days * (s.hard ? 2 : 1), fol = grow(st.followers, Math.round(st.followers * (0.03 + 0.01 * s.days) * (s.hard ? 1.5 : 1)) + 20);
    st.gems += gems;
    st.followers += fol;
    repMove(g, { cred: 12 + s.days, pro: 8, image: 6 }, `défi Daily Upload de ${s.days} jours tenu`); // 0.10: a promise kept, day after day
    gainXP(g, 40 * s.days * (s.hard ? 1.5 : 1));
    s.reward = { gems, fol };
    g.career.offerAt = 0; // a brand noticed: an offer comes right away
    s.bonusOffer = true;
    addNotif(g, { k: 'milestone', text: `🏆 Défi réussi : ${s.days} jours${s.hard ? ' en hardcore' : ''} ! +${gems} gemmes, ${nAbonnes(fol, true)}, et une marque t’a ${px(g, 'remarqué', 'remarquée', 'remarqué·e')}.` });
    addChronicle(g, `${g.player.name} a tenu son défi : ${s.days} jours de suite${s.hard ? ' en mode hardcore' : ''}. Respect.`);
    addTrigger(g, `Le joueur a réussi son défi de ${s.days} jours${s.hard ? ' en mode hardcore' : ''} : bravos, mèmes admiratifs, certains n’en reviennent pas.`);
  } else if (bb) {
    const loss = Math.round(st.followers * 0.05);
    st.followers = Math.max(0, st.followers - loss);
    const dr = repMove(g, { cred: -35, image: -20 }, 'ton défi Daily Upload, raté en beauté', { noCheck: true });
    const t = Date.now();
    g.pbb = { at: t, until: t + Math.round(PLAYER_BB_MS * staffMult(g, 'bb')), c: null, kind: 'series' };
    s.reward = { loss, rep: repPts(dr) };
    let at = t + randi(2000, 5000);
    for (const fn of [(x) => `le « défi » de @${x} : annoncé en grande pompe, raté dans les grandes largeurs #DailyUploadRaté`, (x) => `@${x} qui promet ${s.days} jours et qui tient pas la moitié 💀 #DailyUploadRaté`]) { addAmbientPost(g, { by: pick(CANCEL_NPCS)[0], text: fn(h) }, at, at); at += randi(4000, 9000); }
    addNotif(g, { k: 'cancel', text: `Défi raté en beauté : c’est le bad buzz (−${nAbonnes(loss)}${repBit(dr, ', ')}).` });
    addChronicle(g, `${g.player.name} a lamentablement raté son défi de ${s.days} jours.`);
    addTrigger(g, `Le défi « Daily Upload » du joueur a tourné au fiasco : moqueries, mèmes, « il a craqué ».`);
    checkCancel(g);
  } else {
    const loss = Math.round(st.followers * 0.02);
    st.followers = Math.max(0, st.followers - loss);
    const dr = repMove(g, { cred: -15, image: -5 }, 'ton défi Daily Upload, pas tenu');
    s.reward = { loss, rep: repPts(dr) };
    addAmbientPost(g, { by: pick(CANCEL_NPCS)[0], text: `le défi de @${h}… on dira que c’était l’intention qui comptait #DailyUploadRaté` }, Date.now() + randi(2000, 6000));
    addNotif(g, { k: 'delay', text: `Défi pas tenu : un petit bide (−${nAbonnes(loss)}${repBit(dr, ', ')}).` });
    addChronicle(g, `${g.player.name} n’a pas tenu son défi de ${s.days} jours.`);
  }
  queueModalFor(g, { t: 'series', sid: s.id });
}

/* ---------- the darker side: rumors, enemies, allies, leaked DMs ---------- */
const CONFLICT = ['nemesis', 'rival', 'froid', 'ex'];
const allies = (g) => mains(g).filter((c) => c.rel >= 60 && !CONFLICT.includes(c.vibe));
const enemies = (g) => mains(g).filter((c) => c.vibe === 'nemesis' || c.rel <= -50);
// Allies share and defend: each one adds reach (+5 %, up to +25 %).
const allyBoost = (g) => Math.min(0.25, 0.05 * allies(g).length);
const liveRumor = (g) => (g.rumors || []).find((x) => x.state === 'live') || null;
// Who could start a false rumor now (an enemy, a rumor at a time, three hours between two).
function rumorSource(g, t = Date.now()) {
  if (liveRumor(g) || t - (g.rumorAt || 0) < 3 * 3600000) return [];
  return mains(g).filter((c) => c.vibe === 'nemesis' || c.rel <= -35 || (c.vibe === 'rival' && c.rel <= -20));
}
function addRumor(g, by, text, sev, postId) {
  const c = typeof by === 'object' ? by : charByHandle(g, normHandle(by));
  text = str(text, 220);
  if (!c || !text || !rumorSource(g).includes(c)) return null;
  const t = Date.now();
  sev = int(sev, 1, 3, 2);
  if (staffPower(g, 'cm') >= 2) sev = Math.max(1, sev - 1); // spotted early
  let post = postId ? g.posts.find((x) => x.id === postId) : null;
  if (!post) post = addAmbientPost(g, { by: c.handle, text: `Je dis ça, je dis rien… mais il paraît que @${g.player.handle} ${text.replace(/^(le joueur|il|elle|iel)\s+/i, '')}` }, later() + 1500);
  const r = { id: uid('ru'), by: c.id, text, sev, at: t, until: t + 3 * 3600000, drain: t, state: 'live', defended: [], post: post ? post.id : null };
  if (post) post.rumor = r.id;
  g.rumors.push(r);
  if (g.rumors.length > 12) g.rumors.splice(0, g.rumors.length - 12);
  g.rumorAt = t;
  addNotif(g, { k: 'rumor', c: c.id, p: post ? post.id : undefined, text: `🗣️ ${c.name} fait courir une fausse rumeur sur toi : « ${str(text, 90)} »` });
  addChronicle(g, `${c.name} fait courir une rumeur sur ${g.player.name} : « ${str(text, 100)} ».`);
  addMem(g, c, 'j’ai lancé une rumeur sur le joueur');
  // an ally warns the player in private
  const al = allies(g).filter((a) => a !== c).sort((a, b) => b.rel - a.rel)[0];
  if (al) addIncomingDM(g, al, pick([`Fais gaffe, @${c.handle} raconte n’importe quoi sur toi. Je sais que c’est faux, je vais le dire.`, `T’as vu ce que @${c.handle} balance ? C’est n’importe quoi. Dis-moi si je peux t’aider.`, `Ne laisse pas passer ce que dit @${c.handle}. Je te soutiens, et je le dirai.`]), later() + randi(4000, 9000), { max: 300 });
  queueModalFor(g, { t: 'rumor', rid: r.id }); // (a modal's own id is set by queueModal)
  return r;
}
// While a rumor runs: reputation and followers drip away; after 3 hours it sticks.
function tickRumors(g, t) {
  const r = liveRumor(g);
  if (!r) return false;
  let ch = false;
  const step = 20 * 60000;
  const loss = staffMult(g, 'loss');
  while (t - r.drain >= step && r.drain < r.until) {
    r.drain += step;
    repMove(g, { image: -1.2 * r.sev * loss, cred: -1.2 * r.sev * loss }, 'une rumeur circule sur toi', { noCheck: true });
    g.stats.followers = Math.max(0, g.stats.followers - Math.round(g.stats.followers * 0.003 * r.sev * loss));
    ch = true;
  }
  if (t >= r.until) {
    r.state = 'stuck';
    trialsOnRumor(g, 'stuck');
    const dr = repMove(g, { cred: -8 * r.sev, image: -5 * r.sev }, 'une rumeur s’est installée', { noCheck: true });
    const c = g.chars[r.by];
    addNotif(g, { k: 'cancel', c: r.by, text: `La rumeur de ${c ? c.name : 'ton ennemi'} s’est installée : beaucoup y croient maintenant${repBit(dr, ' (', ')')}.` });
    addChronicle(g, `La rumeur sur ${g.player.name} (« ${str(r.text, 80)} ») a fini par s’installer.`);
    checkCancel(g);
    ch = true;
  }
  return ch;
}
// The player's answer to a rumor (a post, judged like a call-out): credible, it dies and the liar pays.
function rumorResult(g, r, cred, post) {
  const c = g.chars[r.by];
  r.cred = cred;
  if (cred >= 7) {
    r.state = 'debunked';
    trialsOnRumor(g, 'debunked'); // 0.12: someone was waiting for this before committing
    const dr = repMove(g, { cred: 10 * r.sev, image: 4 * r.sev }, 'tu as démonté une rumeur', { noCheck: true });
    if (c) { c.followers = Math.max(0, Math.round(c.followers * 0.95)); addMem(g, c, 'le joueur a démonté ma rumeur en public'); }
    addNotif(g, { k: 'relup', p: post && post.id, text: `Rumeur démontée : tout le monde a vu que ${c ? c.name : 'l’autre'} mentait${repBit(dr, ' (', ')')}.` });
    addChronicle(g, `${g.player.name} a démonté la rumeur lancée par ${c ? c.name : 'un ennemi'}.`);
    addTrigger(g, `Le joueur vient de démonter la fausse rumeur de @${c ? c.handle : 'quelqu’un'} avec des arguments solides : le menteur se fait ridiculiser, il enrage.`, c && c.id);
  } else if (cred >= 4) {
    r.sev = Math.max(1, r.sev - 1);
    r.until = Math.min(r.until, Date.now() + 90 * 60000);
    addNotif(g, { k: 'drama', p: post && post.id, text: 'Ton démenti sème le doute : la rumeur faiblit, mais elle traîne encore.' });
  } else {
    r.sev = Math.min(3, r.sev + 1);
    addNotif(g, { k: 'reldown', p: post && post.id, text: 'Ton démenti fait l’effet inverse : la rumeur prend de l’ampleur.' });
    addTrigger(g, `Le démenti du joueur sur la rumeur de @${c ? c.handle : 'quelqu’un'} tombe à plat : effet Streisand, on en parle encore plus.`, c && c.id);
  }
}
// The lawyer's formal notice: a good chance the liar takes it back.
function lawyerNotice(g, r) {
  const m = hasStaff(g, 'avocat');
  if (!m || !r || r.state !== 'live') return false;
  const law = g.chars[m.c];
  if (!pay(g, m.rate, `Mise en demeure (${law ? firstName(law) : 'avocat'})`, 'staff')) { toast(`Il te faut ${fmtMoney(g, m.rate)} pour cette mise en demeure.`, 'bad'); return false; }
  const c = g.chars[r.by];
  if (Math.random() * 100 < Math.min(95, 45 + 15 * (m.tier + 1))) {
    r.state = 'retracted';
    repMove(g, { cred: 8 * r.sev, image: 3 * r.sev }, 'la rumeur est retirée publiquement', { noCheck: true });
    if (c) addAmbientPost(g, { by: c.handle, text: `Je retire ce que j’ai dit sur @${g.player.handle}. Je n’avais aucune preuve.` }, later() + randi(20000, 60000));
    addNotif(g, { k: 'relup', text: `⚖️ Mise en demeure : ${c ? c.name : 'l’auteur'} retire sa rumeur publiquement.` });
    if (c) addMem(g, c, 'le joueur m’a envoyé son avocat');
  } else addNotif(g, { k: 'drama', text: `⚖️ ${c ? c.name : 'L’auteur'} ignore la mise en demeure. La rumeur continue.` });
  return true;
}
// A nemesis works on the others: a relation that drops, and sometimes an ally who tells.
function turnAgainst(g, by, who, d, text) {
  const n = typeof by === 'object' ? by : charByHandle(g, normHandle(by));
  const c = typeof who === 'object' ? who : charByHandle(g, normHandle(who));
  if (!n || !c || n === c || !isMain(c) || !c.unlocked || !enemies(g).includes(n)) return false;
  let delta = -Math.abs(int(d, 1, 10, 5));
  if (c.rel >= 70) delta = Math.round(delta / 2); // close friends resist
  applyRel(g, c, delta, `${firstName(n)} lui parle mal de toi`, later() + 2000, 10);
  applyTrust(g, c, -Math.ceil(Math.abs(delta) / 2), `${firstName(n)} sème le doute sur toi`, later() + 2400);
  const al = allies(g).find((a) => a !== c && a !== n);
  if (al && Math.random() < 0.6) addIncomingDM(g, al, `Je préfère te prévenir : @${n.handle} est ${gx(n.g, 'allé', 'allée', 'allé·e')} voir @${c.handle} pour te descendre. ${str(text, 120) ? `Genre « ${str(text, 120)} ».` : ''}`, later() + randi(5000, 15000), { max: 400 });
  return true;
}
// DM intel: what the player said in private, kept by a character (and passed around).
function addIntel(g, c, quote, o) {
  const text = str(o.text, 140), q = str(quote, 220);
  if (!c || !text || !q || (g.intel || []).some((x) => x.quote === q)) return null;
  const it = { id: uid('in'), by: c.id, quote: q, text, w: int(o.weight, 1, 3, 1), at: Date.now(), known: [c.id], leaked: false };
  g.intel.push(it);
  if (g.intel.length > 20) g.intel.splice(0, g.intel.length - 20);
  whisperFromIntel(g, c, it); // 0.13: what the player wrote may travel, all the way to whoever it is about
  return it;
}
function leakIntel(g, o, postId) {
  const it = (g.intel || []).find((x) => x.id === o.id && !x.leaked);
  if (!it) return false;
  const holders = it.known.map((id) => g.chars[id]).filter(Boolean);
  const by = (o.by && charByHandle(g, normHandle(o.by))) || holders[0];
  if (!by || !it.known.includes(by.id)) return false;
  const to = o.to ? charByHandle(g, normHandle(o.to)) : null;
  if (!o.public && to && isMain(to) && to !== by) { // passed on in private
    if (!it.known.includes(to.id)) it.known.push(to.id);
    addMem(g, to, `${by.name} m’a montré un message privé du joueur : « ${str(it.quote, 70)} »`);
    if (to.rel > -20) applyRel(g, to, -3 * it.w, `a lu tes DM avec ${firstName(by)}`, later() + 3000, 12);
    applyTrust(g, to, -2 * it.w, `a lu tes DM avec ${firstName(by)}`, later() + 3400);
    const al = allies(g).find((a) => a !== to && a !== by);
    if (al && Math.random() < 0.5) addIncomingDM(g, al, `Fais gaffe, @${by.handle} fait tourner une capture de vos messages privés. @${to.handle} l’a vue.`, later() + randi(5000, 15000), { max: 300 });
    return true;
  }
  // public: a real screenshot, posted for everyone
  if (!(by.vibe === 'nemesis' || by.vibe === 'froid' || by.vibe === 'rival' || by.rel <= -20)) return false;
  it.leaked = true;
  let p = postId ? g.posts.find((x) => x.id === postId && x.a === 'c:' + by.id) : null; // the post the model wrote just before
  const at = p ? p.at : later() + randi(2000, 6000);
  if (!p) p = addAmbientPost(g, { by: by.handle, text: str(o.text, 300) || `Puisque @${g.player.handle} aime donner des leçons, voilà ce qu’${px(g, 'il', 'elle', 'iel')} m’écrit en privé 👇` }, at);
  if (p) p.ev = { kind: 'dm', desc: `« ${it.quote} » — @${g.player.handle}`, real: true };
  const s = g.stats, loss = Math.round(s.followers * 0.01 * it.w * staffMult(g, 'loss'));
  const dr = repMove(g, { kind: -12 * it.w, image: -2 * it.w }, `ta capture de DM publiée par ${by.name}`, { noCheck: true });
  s.followers = Math.max(0, s.followers - loss);
  for (const c of mentionedChars(g, it.quote)) if (c !== by) { applyRel(g, c, -10 * it.w, 'a lu ce que tu dis de lui en privé', at + 2000, 25); applyTrust(g, c, -6 * it.w, 'a lu ce que tu dis de lui en privé', at + 2400); }
  if (it.w >= 3) { const t = Date.now(); g.pbb = { at: t, until: t + Math.round(45 * 60000 * staffMult(g, 'bb')), c: by.id, kind: 'leak' }; }
  addNotif(g, { k: 'screen', c: by.id, p: p && p.id, at, text: `📸 ${by.name} publie une capture de tes DM : « ${str(it.quote, 70)} »${((b) => (b ? ` (${b})` : ''))([repBit(dr), loss ? `−${nAbonnes(loss)}` : ''].filter(Boolean).join(', '))}.` });
  addChronicle(g, `${by.name} a publié une capture des messages privés de ${g.player.name}.`);
  addTrigger(g, `@${by.handle} vient de publier une vraie capture des DM du joueur (« ${str(it.quote, 90)} ») : tout le monde commente, certains sont choqués, d’autres en rient.`, by.id);
  queueModalFor(g, { t: 'leak', iid: it.id, by: by.id });
  checkCancel(g);
  return true;
}

/* ---------- the clock of the career: runs with the game's tick (and after a time skip) ---------- */
function maybeOffer(g, t) {
  const c = g.career;
  if (g.stats.followers < 800 || t < (c.offerAt || 0)) return false;
  if (standLv(g) === -2) { c.offerAt = t + 6 * 3600000; return false; } // no brand comes near a scandal
  const gap = randi(10, 24) * 3600000 / (1 + 0.2 * staffPower(g, 'agent')) * standMult(g, 'offerGap') * (adsShy(g) ? 2 : 1); // 0.20: a brand every half day to a day (an agent finds a few more); 0.21: half as many after content the advertisers avoid
  c.offerAt = t + gap;
  const bonus = (g.series && g.series.bonusOffer ? 1.3 : 1) * (c.hypeBonus || 1); // 0.17: the brands saw the train go by
  delete c.hypeBonus;
  return !!makeOffer(g, Object.assign(bonus > 1 ? { bonus } : {}, hasStaff(g, 'agent') ? { via: 'agent' } : {})); // 0.20: with an agent, the agent finds them
}
function tickCareer(g, t = Date.now()) {
  if (!g || !g.career) return false;
  let ch = false;
  for (const fn of [checkPayout, billGear, tickGear, checkProgram, payroll, tickTeam, checkDeals, tickScams, checkAppeals, tickCommu, tickMemb, tickMerch, tickJobs, tickResale, tickRumors, refreshTrends, maybeOffer, tickBig, tickAgency]) { // (0.31: the talents, their brands) // (0.30.1: a big production's views, climbing) // 0.20: the bills after the payout, the scams; 0.21: the reviews; 0.22: the members, the merch
    try { if (fn(g, t)) ch = true; } catch (e) { console.error(e); }
  }
  if (g.series && g.series.bonusOffer && g.series.state !== 'on') g.series.bonusOffer = false;
  return ch;
}

/* ---------- what the prompts know of all this ---------- */
function careerCtx(g, now = Date.now()) {
  const c = g.career, pf = platformOf(g), out = [];
  out.push(`Sa carrière : ${pfName(g, pf)} (niche ${nicheOf(g).label.toLowerCase()}), ${fmtMoney(g, c.cash)} en banque, ${monetized(g) ? 'monétisé·e' : 'pas encore monétisé·e'}.`);
  const team = g.staff.map((m) => { const x = g.chars[m.c]; return x && `@${x.handle} (${roleName(m.role, x.g).toLowerCase()}, ${tierName(m.tier, x.g).toLowerCase()}${m.once ? ', pour une sortie' : ''}${t33On() ? `, moral ${moodLabel(m, x.g)[1].toLowerCase()}` : ''})`; }).filter(Boolean); // (0.33: their level, their mood)
  if (team.length) out.push(`Son équipe : ${team.join(', ')}.`);
  const sd = signedDeals(g);
  if (sd.length) out.push(`Sponsors en cours : ${sd.map((d) => `${d.brand} (${d.product}, à livrer ${fmtWhen(d.due, now)})`).join(' ; ')}.`);
  if (g.gear) out.push(`Son matos : ${gearBrief(g)}.`); // 0.20
  out.push(commuCtx(g)); // 0.21
  const jc = jobsCtx(g); // 0.23: what the player does for others
  if (jc) out.push(jc);
  const mc = merchCtx(g); // 0.22: the merch on sale
  if (mc) out.push(mc);
  const ac = agencyCtx(g); // 0.31: the talents the player represents
  if (ac) out.push(ac);
  if (seriesOn(g)) { const s = g.series; out.push(`Défi « Daily Upload » en cours : ${s.what === 'live' ? 'un live' : 'une sortie'} par jour pendant ${s.days} jours sur « ${s.theme} », épisode ${s.ep + 1}/${s.days}, série de ${s.streak} réussite${s.streak > 1 ? 's' : ''}${s.hard ? ', en mode hardcore' : ''}.`); }
  const r = liveRumor(g);
  if (r && g.chars[r.by]) out.push(`FAUSSE RUMEUR en cours sur le joueur, lancée par @${g.chars[r.by].handle} : « ${r.text} » (elle est fausse ; le public hésite, certains y croient).`);
  return out;
}
// How a character stands toward the player, beyond the number: ally, sworn enemy.
function stanceText(g, c) {
  if (c.rel >= 60 && !CONFLICT.includes(c.vibe)) return 'ALLIÉ·E : défend le joueur quand on l’attaque, le prévient en privé, partage ses posts';
  if (c.vibe === 'nemesis' || c.rel <= -50) return 'ENNEMI·E JURÉ·E : veut détruire le joueur (monte les autres contre lui, ressort ses messages privés, invente des rumeurs)';
  if (c.rel <= -30) return 'hostile : sarcasme, coups bas, ne rate pas une occasion de l’enfoncer';
  return '';
}
// What a refresh may write, depending on what the world holds right now: { ctx: what the model must know, lines: what it may write }.
function refreshCareerLines(g, t = Date.now()) {
  const out = [], ctx = [];
  const src = rumorSource(g, t);
  if (src.length && Math.random() < 0.45) out.push(`- Facultatif, si ça colle à son caractère : un ennemi du joueur (${src.map((c) => '@' + c.handle).join(', ')}) lance une FAUSSE rumeur crédible sur lui (une tromperie, une trahison, un faux scandale… jamais rien d’illégal ni de sexuel) : écris son post dans une ligne "post", puis {"t":"rumor","by":"handle","text":"la rumeur en une phrase, ≤ 160 caractères","sev":2} (sev de 1 à 3 selon la gravité).`);
  const en = enemies(g);
  if (en.length) out.push(`- Facultatif (au plus 1) : ${en.map((c) => '@' + c.handle).join(', ')} essaie de monter un autre personnage contre le joueur (en privé ou en public) : {"t":"turn","by":"handle de l’ennemi","who":"handle du personnage visé","d":5,"text":"ce qu’il lui dit, ≤ 120 caractères"} (d de 2 à 8).`);
  const r = liveRumor(g);
  const al = allies(g).filter((a) => !r || !r.defended.includes(a.id));
  if (r && al.length) out.push(`- Les alliés du joueur (${al.map((c) => '@' + c.handle).join(', ')}) prennent sa défense contre la rumeur : un post de soutien, puis {"t":"defend","by":"handle"} pour chacun d’eux.`);
  const regs = r && warmOf(g) >= 50 ? fanRegulars(g).filter((x) => !r.defended.includes(x.id)).slice(-3) : []; // 0.21: a warm community defends its creator
  if (regs.length) out.push(`- Ses habitués (${regs.map((c) => '@' + c.handle).join(', ')}), des abonnés fidèles, le défendent en commentaires ; pour chacun qui le fait : {"t":"defend","by":"handle"}.`);
  const intel = (g.intel || []).filter((x) => !x.leaked);
  if (intel.length) {
    ctx.push('', '## CE QUE DES PERSONNAGES ONT CONTRE LE JOUEUR (ses propres messages privés, gardés en capture)');
    for (const x of intel.slice(-5)) ctx.push(`- ${x.id} : « ${x.quote} » (${x.text}) · détenu par ${x.known.map((id) => g.chars[id] && '@' + g.chars[id].handle).filter(Boolean).join(', ')}`);
    out.push('- Facultatif (au plus 1) : un détenteur fait circuler une capture : en privé à un autre personnage {"t":"leak","id":"…","by":"handle","to":"handle"}, ou, s’il est hostile au joueur, en public : écris d’abord son post, puis {"t":"leak","id":"…","by":"handle","public":true}.');
  }
  const toxB = toxLv(g) >= 2 && Math.random() < (toxLv(g) >= 3 ? 1 : 0.6); // 0.30: a toxic name: the shady brands come (even in a scandal)
  if (g.stats.followers >= 800 && (standLv(g) > -2 || toxB) && t >= (g.career.offerAt || 0) - 3600000 && openDeals(g).filter((d) => d.state === 'offer').length < 2) {
    out.push(`- ${toxB ? TOX_SPONSOR + ' ' : ''}Une marque fictive de ce monde contacte le joueur pour un partenariat, logique avec ce qu’il publie (secteurs les plus probables : ${toxB ? 'crypto, paris, casino, vape' : sectorHint(g)}) : {"t":"sponsor","brand":"nom inventé","emoji":"🥤","sector":"boisson, tech, mode, beaute, jeu, food, appli ou voyage","product":"le produit à mettre en avant, ≤ 70 caractères","what":"${PF(g).fmts.join('" ou "')}","contact":"Prénom Nom de la personne chargée des partenariats","g":"f","text":"son premier message privé au joueur, ≤ 220 caractères"} ("what" = le format qu’elle veut, sur ${pfName(g, platformOf(g))}).`);
  }
  if (arrivalOK(g, t)) out.push(ARRIVAL_LINE(g)); // 0.30: the story may bring someone new (no limit to the cast)
  if (fanLineOK(g, t)) { out.push(FAN_LINE); const F = fansLine(g); if (F) out.push(F); } // 0.21: a fan writes to the player (0.30: the ones who already wrote)
  if (out.some((x) => x === FAN_LINE || (typeof x === 'string' && x.includes('{"t":"sponsor"')))) { const L = firstsLine(g, 'une personne nouvelle (le contact d’une marque, un abonné)'); if (L) out.push('- ' + L); const L2 = lastsLine(g); if (L2) out.push('- ' + L2); } // 0.28.1 (0.30: the family names too)
  out.push(...bigRefreshLines(g, t)); // 0.30.1: a big production
  out.push(...agencyRefreshLines(g, t)); // 0.31: the talents' sponsored posts, their brands
  out.push(...teamRefreshLines(g, t)); // 0.33: the team: poached, at the end of their rope, an answer due
  out.push(...afficheRefreshLines(g, t)); // 0.33: a bigger creator's operation, the player invited
  if (activeTrends(g, t).length < 4) out.push(`- Facultatif : une nouvelle tendance sur ${pfName(g, platformOf(g))} qui colle à ce monde : {"t":"trend","kind":"${trendKindsFor(platformOf(g)).join('" ou "')}","name":"≤ 40 caractères (un son inventé, un #défi ou un sujet)","emoji":"🎵"}.`);
  return { ctx, lines: out };
}
// Handles the career lines of a refresh (or an act): returns true when the line was one of them.
// lastOf: the last post or reply of each author in this stream (a rumor or a leak sits on the post written just before).
function applyCareerLine(g, o, effects, lastOf = {}) {
  const postOf = (h) => { const c = charByHandle(g, normHandle(h)); const x = c && lastOf['c:' + c.id]; return x && !x.r ? x.p : null; };
  switch (o.t) {
    case 'rumor': { const pid = postOf(o.by); effects.push(() => addRumor(g, o.by, o.text, o.sev, pid)); return true; }
    case 'turn': effects.push(() => turnAgainst(g, o.by, o.who, o.d, o.text)); return true;
    case 'defend': effects.push(() => {
      const r = liveRumor(g), c = charByHandle(g, normHandle(o.by));
      if (r && c && (allies(g).includes(c) || (c.regular && warmOf(g) >= 50)) && !r.defended.includes(c.id)) { r.defended.push(c.id); r.sev = Math.max(1, r.sev - 1); repMove(g, { cred: 2 }, `${c.name} prend ta défense`); addNotif(g, { k: 'relup', c: c.id, text: `${c.name} prend ta défense contre la rumeur.` }); }
    }); return true;
    case 'leak': { const pid = o.public ? postOf(o.by) : null; effects.push(() => leakIntel(g, o, pid)); return true; }
    case 'sponsor': effects.push(() => { const bg = (o.prod === true || o.prod === 'true') && bigOn(g); if (bg) bg.big.offerAt = Date.now(); if (makeOffer(g, bg ? Object.assign({}, o, { big: bg.id, what: bg.what }) : o)) g.career.offerAt = Date.now() + randi(5, 12) * 3600000; }); return true; // (0.30.1: to be in the production)
    case 'imprevu': effects.push(() => applyHitch(g, o)); return true; // 0.30.1: a hitch on the production (their AI's doing)
    case 'nomination': effects.push(() => applyNomination(g, o)); return true; // 0.30.1
    case 'fan': effects.push(() => fanMessage(g, o)); return true; // 0.21
    case 'arrivee': effects.push(() => { if (arrivalOK(g)) { g.arrival = { why: str(o.why, 100), at: Date.now() }; g.lastArrival = Date.now(); } }); return true; // 0.30: created right after
    case 'trend': effects.push(() => { const k = TREND_KINDS[o.kind] ? o.kind : trendKindsFor(platformOf(g))[0]; makeTrend(g, k, o); }); return true;
    default: return applyAgencyLine(g, o, effects) || applyTeamLine(g, o, effects); // 0.31: an offer for a talent, a betrayal, a rival agency (0.33: the team)
  }
}

/* ---------- prompts and flows of the career ---------- */
// The job candidates for a role (3, of different levels): written by the model, or by the game.
function promptCandidates(g, role) {
  const R = STAFF_ROLES[role], famous = g.stats.followers >= 100000 || standLv(g) === 2, lv = standLv(g);
  return [RULES, '', ctxText(g, { kind: 'light', feed: 3, chron: 4, focus: new Set() }), '',
    '## TÂCHE : TROIS CANDIDATS POUR UN POSTE',
    `Le joueur (créateur sur ${pfName(g, platformOf(g))}, ${fmtPlain(g.stats.followers)} abonnés, niche ${nicheOf(g).label.toLowerCase()}) recrute : ${R.m.toLowerCase()} (ce que fait ce poste : ${R.desc}).`,
    `Invente 3 candidats crédibles dans ce monde, de niveaux différents : ${famous ? 'un confirmé (tier 1, 3 à 5 ans), un expert (tier 2, 6 à 10 ans) et une star du métier (tier 3, plus de 10 ans)' : 'un débutant (tier 0, 1 ou 2 ans), un confirmé (tier 1, 3 à 5 ans) et un expert (tier 2, 6 à 10 ans)'}.`,
    'Des personnes adultes, fictives, aux noms originaux et variés (genres, styles, caractères). Leurs références sont inventées dans ce monde (jamais de vraie personne ni de vraie chaîne). Chacun a sa personnalité : un ambitieux, un anxieux, un cash…',
    firstsLine(g), // 0.28.1
    lv < 0 ? `Le joueur ${lv === -2 ? 'est en plein scandale' : 'traverse une mauvaise passe'} et les candidats le savent : certains hésitent, posent des conditions ou demandent plus cher ; dis-le dans leur message.` : lv === 2 ? 'Le joueur est au sommet : les candidats rêvent de travailler avec lui, et le disent.' : null,
    '', FORMAT, 'Trois lignes :',
    '{"t":"cand","name":"Prénom Nom","handle":"pseudo","emoji":"🎬","g":"f","tier":1,"years":4,"pitch":"≤ 150 caractères : son parcours et ses références","personality":"≤ 120 caractères","voice":"≤ 80 caractères : sa façon d’écrire","hello":"≤ 220 caractères : son message de candidature au joueur, dans sa voix"}'].filter((x) => x !== null).join('\n');
}
async function genCandidates(role) {
  const g = S.game;
  if (!g || !STAFF_ROLES[role] || S.busy.cand) return;
  for (const c of candidates(g, role)) c.kind = c.joined ? 'main' : 'gone'; // a new search: the previous ones are let go (one who joined the cast stays)
  S.busy.cand = role;
  g.cands = { role, at: Date.now() };
  update(false);
  const f = startFlow(g);
  let n = 0;
  try {
    await aiStream(promptCandidates(g, role), (o) => {
      if (o.t !== 'cand' || n >= (standLv(g) === -2 ? 2 : 3)) return; // in a scandal, one of them does not even apply
      if (addCandidate(g, role, o)) { n++; update(false); }
    }, { signal: f.ctl.signal, src: f.id, kind: 'cand', tier: 'quick' });
  } catch (e) { if (e && e.code !== 'cancelled' && e.code !== 'budget') console.warn('candidates', e && (e.code || e.message)); if (e && e.code === 'budget') reportAiError(e); }
  if (!n && S.game === g) fallbackCandidates(g, role); // without the model: the game's own candidates
  if (S.game === g && standLv(g) === -2) addNotif(g, { k: 'money', text: 'Un des profils contactés a refusé de postuler : il ne veut pas être associé à ton scandale.' });
  S.busy.cand = null;
  endFlow(f);
  update();
}

// « Écrire pour moi » (gems): the model writes the player's message (a reply, a DM, a post), in their voice.
const WRITE_COST = { dm: 2, reply: 2, post: 3 };
function promptWrite(g, w) {
  const P = g.player;
  const L = [RULES, '', ctxText(g, { kind: 'light', feed: w.kind === 'post' ? 6 : 3, chron: 6, focus: new Set(w.c ? [w.c.id] : []), crowd: 2 }), '',
    `## TÂCHE : ÉCRIRE À LA PLACE DU JOUEUR (${P.name}, @${P.handle})`,
    'Le joueur t’a demandé d’écrire son message à sa place. Écris-le À LA PREMIÈRE PERSONNE, dans SA voix (son rôle, sa bio, ses messages précédents), en servant ses intérêts : malin, crédible, à son avantage.'];
  if (w.kind === 'dm') {
    const c = w.c, convo = g.dms[c.id], hist = convo ? convo.msgs.filter((m) => !m.sys).slice(-10) : [];
    L.push(`C’est un message privé à @${c.handle} (${c.name}, ${c.role}).`);
    if (w.advice) L.push(`C’est un CONSEIL que le joueur donne à ${c.name} (quoi publier, quelle vidéo faire, comment répondre à quelqu’un) : précis, convaincant, dans l’intérêt apparent de ${c.name}.`);
    const d = g.deals.find((x) => x.contact === c.id && DEAL_OPEN.includes(x.state));
    if (d) L.push(`Contexte : un partenariat avec ${d.brand} : ${dealSummary(g, d)}.`, `Chiffres du joueur (vrais, à utiliser s’il faut un budget ou un devis détaillé) : ${fmtPlain(g.stats.followers)} abonnés sur ${pfName(g, platformOf(g))}, environ ${fmtPlain(Math.round(expectedViews(g, d.what)))} vues par ${dealWhat(g, d)}, niche ${nicheOf(g).label.toLowerCase()}, réputation ${rep1000(g.stats.reputation)}/1000. Un devis détaillé liste les livrables, le tarif de chacun, les options (mention, durée de mise en ligne, exclusivité, droits d’utilisation) et le total.`);
    if (c.cand) L.push(`C’est un candidat au poste de ${roleName(c.cand.role, c.g).toLowerCase()} (${c.cand.years} ans d’expérience, demande ${payWord(g, c.cand)}).`);
    if (hist.length) { L.push('La conversation jusqu’ici :'); for (const m of hist) L.push(`${m.me ? P.name + ' (le joueur)' : c.name} : ${m.text.slice(0, 300)}${reactTag(m)}`); }
    L.push(w.draft ? `Ce que le joueur avait commencé à écrire (garde son idée) : « ${w.draft} »` : 'Réponds au dernier message de façon utile et naturelle.');
  } else if (w.kind === 'reply') {
    const au = author(g, w.p.a);
    L.push(`C’est une réponse sous le post de @${au.handle} : « ${w.p.text.slice(0, 220)} »`);
    if (w.r) L.push(`En réponse au commentaire de @${author(g, w.r.a).handle} : « ${w.r.text.slice(0, 200)} »`);
    if (w.draft) L.push(`Ce que le joueur avait commencé à écrire (garde son idée) : « ${w.draft} »`);
  } else {
    L.push(w.draft ? `Un post public. Ce que le joueur avait commencé à écrire (garde son idée) : « ${w.draft} »` : 'Un post public qui fait avancer ses histoires et ses quêtes, drôle ou percutant.');
  }
  const max = w.kind === 'dm' ? (w.long ? 900 : 400) : 270;
  L.push('', FORMAT, `Une seule ligne : {"t":"write","text":"≤ ${max} caractères"}`);
  return L.join('\n');
}
async function writeForMe(w) {
  const g = S.game;
  if (!g || S.busy.write) return null;
  const cost = WRITE_COST[w.kind] || 2;
  if (g.stats.gems < cost) { toast(`Il te faut ${cost} gemmes pour que ${AI_NAME} écrive à ta place.`, 'bad'); return null; }
  S.busy.write = w.key || w.kind;
  // (0.28.1) paid when asked, given back if nothing comes: the gems can't be spent twice while the model writes
  g.stats.gems -= cost;
  update(false);
  const f = startFlow(g);
  f.undo = (h) => { h.stats.gems += cost; };
  let text = '';
  const long = !!(w.c && g.deals.some((x) => x.contact === w.c.id && DEAL_OPEN.includes(x.state)));
  try {
    await aiStream(promptWrite(g, Object.assign({ long }, w)), (o) => { if (o.t === 'write' && !text) text = str(o.text, w.kind === 'dm' ? DM_MAX : 280); }, { signal: f.ctl.signal, kind: 'write', tier: lightTier() });
  } catch (e) { reportAiError(e, null, 'act'); }
  S.busy.write = null;
  endFlow(f);
  if (text && S.game === g) toast(`${AI_NAME} a écrit pour toi · −${cost} gemmes. Relis avant d’envoyer.`, 'good');
  else g.stats.gems += cost;
  update();
  return text || null;
}

// A contract that is over, as the brand's contact knows it.
const DEAL_OVER = {
  done: () => 'Leur partenariat est terminé : le contenu a été livré.',
  declined: () => 'Le joueur a refusé leur dernière offre.',
  expired: () => 'Leur dernière offre a expiré sans réponse du joueur.',
  withdrawn: (b) => `${b} a retiré sa dernière offre.`,
  broken: () => 'Leur contrat a été rompu.',
};
// What a DM with someone from the career needs (a brand, a candidate, the team), and the lines they may write.
function dmCareerCtx(g, c) {
  const out = [];
  if (c.kind === 'fan' && c.fan) { // 0.21: a fan of the player
    out.push(`${c.name} est ${gx(c.g, 'un abonné', 'une abonnée', 'un·e abonné·e')} du joueur, pas une célébrité : ${gx(c.g, 'il', 'elle', 'iel')} le suit depuis un moment et lui a écrit : « ${str(c.fan.text, 160)} ». Touché·e qu’il réponde, simple et sincère, admiratif·ve sans en faire trop ; jamais de drague insistante.${c.regular ? ' Le joueur a déjà répondu à sa question en vidéo : un·e habitué·e, fidèle.' : ''}`);
    return out;
  }
  if (c.kind === 'brand') {
    const d = g.deals.filter((x) => x.contact === c.id).slice(-1)[0];
    const td = tdealByContact(g, c); // 0.31: they write about a talent of the player's
    if (td && (!d || td.at >= d.at)) { out.push(...tdealBrandCtx(g, c, td)); return out; }
    const il = gx(c.g, 'il', 'elle', 'iel'), brand = d ? d.brand : brandOfContact(g, c) || 'une marque'; // (0.32: a contact known for a talent's offer)
    out.push(c.joined // 0.16: work, and more
      ? `${c.name} est chargé·e des partenariats chez ${brand} : une vraie pro, qui défend son budget. Avec le joueur, c’est devenu personnel ; ${il} sépare le travail du reste… plus ou moins.`
      : `${c.name} est chargé·e des partenariats chez ${brand} : une vraie pro, aimable, qui défend son budget. ${cap1(il)} parle surtout business, mais reste une personne : si le joueur l’amène sur le terrain perso, ${il} réagit selon son caractère.`);
    if (d && d.state === 'offer') out.push(`Son offre actuelle : ${dealSummary(g, d)}. Elle peut monter jusqu’à ${fmtMoney(g, dealBounds(d).cap)} au grand maximum si le joueur argumente bien (ses vues, sa niche, son audience, la qualité) ; s’il est exigeant sans raison, désagréable, ou s’il demande plus que ce maximum, elle refuse ou retire l’offre. Si le joueur envoie un devis ou un budget détaillé, elle répond sur les chiffres, poste par poste. Tout se négocie : le prix, la mention « Collaboration commerciale », l’exclusivité, le délai, le format, l’acompte (la part versée à la signature : elle accepte, propose moins ou refuse, selon le contrat et son budget).${d.shady ? ' Elle tient à ce qu’il n’y ait pas de mention « Collaboration commerciale », et paie plus pour ça (c’est illégal : elle le sait, n’en parle jamais d’elle-même, et minimise si le joueur pose la question ; s’il veut la mention, elle peut l’accepter en payant moins).' : ''}${d.banned ? ` Le produit fait partie de ce que la loi interdit aux influenceurs de promouvoir (${d.banned}) : elle n’en parle jamais d’elle-même et minimise si le joueur s’en inquiète.` : ''}`);
    else if (d && d.state === 'signed') { out.push(`Le contrat est signé : ${dealSummary(g, d)}, à livrer ${fmtWhen(d.due)}. Elle suit ça de près. Un avenant reste possible si les deux sont d’accord (le prix, la mention, plus de délai, un acompte plus gros).${d.shady ? ' (Sans mention : c’est illégal, elle le sait, n’en parle jamais d’elle-même et minimise si le joueur pose la question.)' : ''}`); if (d.guest) out.push(...brandGuestCtx(g, d)); } // (0.33: someone the player wants to bring in)
    // 0.25.2: only a contract that is over says so (since 0.20 this line followed every open offer too: brands thought
    // the negotiation closed)
    else if (d && d.state === 'waiting') out.push(`Le contrat est signé : ${dealSummary(g, d)} ; ${d.gift ? 'le matos' : 'le kit'} doit arriver.`);
    else if (d) out.push(DEAL_OVER[d.state] ? DEAL_OVER[d.state](brand) : 'Leur partenariat est fini.');
    if (d && d.state === 'signed' && d.gift && !d.giftSent) out.push('Le matos promis n’est pas encore arrivé chez le joueur.'); // (0.27.6: a signed contract now)
    if (d && d.resold) out.push(resoldLine(g, d)); // 0.26: its gift, put on sale
    if (d && (d.scam || c.ghost)) out.push(scamCtx(g, d, c)); // 0.20: the secret it never admits
    if (d && d.hard && d.state === 'offer') out.push(HARD_CTX(g, d, c)); // a big contract: no mercy
    out.push(`Chiffres réels du joueur : ${fmtPlain(g.stats.followers)} abonnés sur ${pfName(g, platformOf(g))}, ≈ ${fmtPlain(Math.round(expectedViews(g, d ? d.what : PF(g).main)))} vues par contenu, réputation ${rep1000(g.stats.reputation)}/1000.`);
  } else if (c.kind === 'cand' && c.cand) {
    out.push(`${c.name} postule pour devenir ${roleName(c.cand.role, c.g).toLowerCase()} du joueur : ${tierName(c.cand.tier, c.g).toLowerCase()}, ${c.cand.years} ans d’expérience (${c.cand.pitch}). Tarif demandé : ${payWord(g, c.cand)}. ${gx(c.g, 'Il', 'Elle', 'Iel')} veut le poste, répond aux questions sur son travail, et peut baisser un peu son prix si on négocie bien (pas plus de 20 %).`);
  } else if (c.kind === 'staff') {
    const m = memberOf(g, c);
    if (m) out.push(...teamDMCtx(g, c, m)); // 0.33: their level, their mood and why, their gear, a raise, an offer elsewhere
    const offers = m && m.role === 'agent' ? g.deals.filter((d) => d.state === 'offer' || d.state === 'signed') : [];
    if (offers.length) out.push(`Ce que ${c.name} pense des offres en cours (son avis de pro, à son niveau) : ${offers.map((d) => `${d.brand} (${d.flagged ? (d.scam || d.banned || d.shady ? AGENT_WARN[d.scam || (d.banned ? 'banned' : 'shady')](d) : 'le piège qui l’inquiétait a sauté du contrat : plus rien à redire') : d.via === 'agent' ? `c’est ${gx(c.g, 'lui', 'elle', 'iel')} qui l’a trouvée, ${gx(c.g, 'il', 'elle', 'iel')} y croit` : 'rien remarqué de spécial'})`).join(' ; ')}.`); // 0.20: what the agent saw
  } else if (c.kind === 'ex') out.push(`${c.name} a travaillé pour le joueur (${c.role}) et ne travaille plus pour lui.`);
  if (c.kind !== 'staff') { const tm = memberOf(g, c); if (tm) out.push(...teamDMCtx(g, c, tm)); else if (isMain(c)) out.push(...hireCtx(g, c)); } // 0.33: someone of the cast, with a job (or offered one)
  if (isMain(c)) out.push(...guestDMCtx(g, c), ...starCtx(g, c)); // 0.33: invited into a sponsored content of the player's; a tête d’affiche
  return out;
}
function dmCareerLines(g, c) {
  const out = [];
  const d = g.deals.find((x) => x.contact === c.id && x.state === 'offer') || g.deals.find((x) => x.contact === c.id && x.state === 'signed');
  const td = c.kind === 'brand' ? tdealByContact(g, c) : null; // 0.31: about a talent
  const ask = c.kind === 'brand' && !(td && tdealOpen(td)) ? talentAskLine(g, c) : null; // 0.32: the player asks them for a talent of theirs
  if (td && (!d || td.at >= d.at)) return tdealBrandLines(g, c, td).concat(ask ? [ask] : []);
  if (ask) out.push(ask);
  if (c.kind === 'brand' && (!d || d.state === 'signed')) { const own = ownAskLine(g, c), why = own ? '' : ownAskWhy(g, c); if (own) out.push(own); else if (OWN_NO[why]) out.push('- ' + OWN_NO[why](c, brandOfContact(g, c))); } // 0.33: a partnership of the player's own, asked in its messages (0.33.6: a contract under way is no reason; or why not)
  if (c.kind === 'brand' && d) { const B = dealBounds(d), sym = WORLD_MONEY[g.world.preset] ? WORLD_MONEY[g.world.preset].sym : 'euros'; out.push(`- OBLIGATOIRE dès que ${c.name} accepte ou propose un changement du ${d.state === 'signed' ? 'contrat signé (un avenant)' : 'contrat'} dans ce message : une ligne {"t":"deal",…} avec seulement ce qui change, sinon le contrat du jeu reste l’ancien. "fee":${d.fee || Math.min(100, B.cap)} (le nouveau prix, en ${sym}, entre ${B.lo} et ${B.cap}${d.fee0 ? (d.shady ? ' ; avec la mention, la fourchette baisse' : ' ; sans la mention, elle monte d’environ moitié') : ' : de l’argent en plus des produits'}), "mention":true ou false (la mention « Collaboration commerciale »), "exclusive":true ou false${d.fee > 0 && !NO_UPFRONT.includes(d.scam) ? `, "upfront":${upPctOf(d) || 30} (l’acompte, en % du prix, versé à la signature : 0 = tout à la livraison${d.state === 'signed' ? ' ; s’il augmente, la différence est versée tout de suite' : ''})` : ''}${d.clause ? ', "clause":false (si elle accepte d’enlever la clause sur laquelle le joueur tique)' : ''}${d.state === 'offer' ? `, "days":7 (le délai pour publier), "what":"${PF(g).fmts.join('" ou "')}"` : ', "days":10 (le nouveau délai, compté depuis la signature)'}${d.state === 'offer' || !d.guest ? ', "avec":"handle" et "part":0 (si un autre créateur en est, et ce que le joueur lui donne, quand c’est convenu)' : ''}. Ex. : le joueur garde la mention et accepte un prix plus bas → {"t":"deal","mention":true,"fee":${B.lo}}.${d.fee > 0 && !NO_UPFRONT.includes(d.scam) ? ' Elle accepte un acompte de 40 % → {"t":"deal","upfront":40}.' : ''}${d.state === 'offer' ? ' Si elle retire l’offre : {"t":"deal","walk":true}.' : d.resold ? ' Si elle rompt le contrat (le joueur a revendu leur cadeau) : {"t":"deal","walk":true}.' : ''}`); }
  if (c.kind === 'brand') out.push(...doubtLines(g, c)); // 0.32: an anonymous message about the player reached them
  if (c.kind === 'brand' && g.deals.some((x) => x.contact === c.id && guestWait(x))) out.push(BRAND_GUEST_LINE(c)); // 0.33: someone brought in, or not
  if (isMain(c) && guestAsking(g, c)) out.push(GUEST_LINE(g, c)); // 0.33: in the player's sponsored content, or not
  if (c.kind === 'cand' && c.cand && STAFF_ROLES[c.cand.role].pay !== 'cut') out.push(`- Si ${c.name} accepte de baisser son tarif : {"t":"rate","rate":${c.cand.rate}} (entre ${Math.round(c.cand.rate * 0.8)} et ${c.cand.rate}).`);
  { const tm = memberOf(g, c); if (tm) out.push(...teamDMLines(g, c, tm)); } // 0.33: a raise, an offer elsewhere, the end of it
  return out;
}
// The lines of a DM that touch the career (and what the player let slip, kept as intel).
function applyDMCareerLine(g, c, o, playerText, fx) {
  if (o.t === 'deal' && c.kind === 'brand') { fx.push(() => applyDealLine(g, c, o)); return true; }
  if (o.t === 'tdeal' && c.kind === 'brand') { fx.push(() => applyTdealLine(g, c, o)); return true; } // 0.31: the offer for a talent
  if (o.t === 'offre_talent' && c.kind === 'brand') { fx.push(() => brandOffersTalent(g, c, o)); return true; } // 0.32: asked by the agent, they make one
  if (o.t === 'offre' && c.kind === 'brand') { fx.push(() => brandOffersPlayer(g, c, o)); return true; } // 0.33: asked by the player, for themselves
  if (o.t === 'rate' && c.kind === 'cand' && c.cand) { fx.push(() => { const r = Math.round(num(o.rate, c.cand.rate)); if (r < c.cand.rate) { c.cand.rate = niceRound(clamp(r, c.cand.rate * 0.8, c.cand.rate)); addNotif(g, { k: 'money', c: c.id, text: `${c.name} baisse son tarif : ${payWord(g, c.cand)}.` }); } }); return true; }
  if (o.t === 'quit' && memberOf(g, c)) { fx.push(() => { const m = memberOf(g, c); if (quitOK(c, m)) quitStaff(g, m, 'quit'); }); return true; } // (0.33: or at the end of their rope)
  if (o.t === 'salaire' && memberOf(g, c)) { fx.push(() => applySalaryLine(g, c, o)); return true; } // 0.33: a raise asked, agreed or refused
  if (o.t === 'debauche_fin' && memberOf(g, c)) { fx.push(() => applyPoachEnd(g, c, o)); return true; } // 0.33: they stay, or they go
  if (o.t === 'boulot' && isMain(c)) { fx.push(() => applyHireLine(g, c, o)); return true; } // 0.33: a job, taken or not
  if (o.t === 'invite_marque' && c.kind === 'brand') { fx.push(() => applyBrandGuest(g, c, o)); return true; } // 0.33: the brand, on the player's guest
  if (o.t === 'feat_pub' && isMain(c)) { fx.push(() => applyGuestAnswer(g, c, o)); return true; } // 0.33: the guest's answer
  if (o.t === 'intel' && isMain(c)) { fx.push(() => addIntel(g, c, playerText, o)); return true; }
  if (o.t === 'shady' && c.kind === 'brand') { fx.push(() => applyShady(g, c)); return true; } // 0.18: far more money, no mention
  return false;
}
const INTEL_LINE = (c) => `- Facultatif, rarement : seulement si le joueur vient d’écrire quelque chose de compromettant qu’on pourrait retourner contre lui (une méchanceté sur quelqu’un, un aveu, un secret, un plan douteux, une promesse gênante), ${c.name} en garde une capture : {"t":"intel","text":"≤ 100 caractères : en quoi ce message pourrait lui nuire","weight":2} (weight de 1 à 3 selon la gravité). ${c.name} pourra s’en servir plus tard (le montrer à d’autres, le publier) selon ce qu’${gx(c.g, 'il', 'elle', 'iel')} ressent pour le joueur.`;

// After a release is out: its views, its money, the sponsor it carries, the editor's bonus clip, the daily upload.
function releaseCareer(ctx) {
  const g = ctx.g, v = ctx.video, r = v.r, form = v.form || {}, post = ctx.post;
  if (!post || !post.video) return;
  const crew = r.crew || [];
  const dl0 = form.deal ? dealOf(g, form.deal) : null;
  const fit = dl0 && dl0.state === 'signed' ? fitOf(r, dl0, ctx.eval) : null; // 0.21: a sponsor that fits the video, or not
  const bdl = r.big ? (form.deals || []).map((id) => dealOf(g, id)).filter((d) => d && d.state === 'signed').slice(0, BIG_DEALS) : []; // 0.30.1: several brands in a production
  const bfit = bdl.map((d, k) => fitOf(r, d, k === 0 ? ctx.eval : null)); // (the AI judged the first one)
  const mLive = !!(form.membLive && r.what === 'live' && membOn(g)); // 0.22: a live for the members only
  const early = ctx.early || null; // 0.29.1: a long video's, counted with its reactions
  const views0 = Math.round((early ? early.views : ctx.vearly != null ? ctx.vearly : releaseViews(g, r, { tier: v.tier, score: v.score, diff: v.diff }, !!(post.res && post.res.viral), Date.now(), Object.assign({}, form, { crew, push: !!(ctx.boosts && ctx.boosts.push) }))) * (mLive ? 0.35 : 1));
  const views = fit ? Math.round(views0 * FIT_VIEWS[fit]) : bdl.length ? Math.round(views0 * bfit.reduce((m, f) => m * (FIT_VIEWS[f] || 1), 1)) : views0;
  const gx = gearOnRelease(g, r, views); // 0.20: a live that drops, the neighbours, the rights holders
  const vs = gx.views;
  const ads = adsOf(g, r, ctx.eval, form); // 0.21: what the advertisers make of it
  const shown = r.big ? Math.max(1, Math.round(vs * 0.4)) : vs; // 0.30.1: a big production's views come over days (tickBig)
  const book = bookRelease(g, r, shown, post, ads);
  if (ctx.removed && book.money > 0) { // 0.30: taken down for harassment: no money
    g.career.est = Math.max(0, g.career.est - book.money);
    ledger(g, `${cap1(ta(r))} « ${wordCut(r.topic, 30)} » retirée pour harcèlement`, -book.money, 'est');
    book.money = 0;
  }
  if (gx.claim && book.money > 0) { // the music was not free: the money of this one goes to the rights holders
    g.career.est = Math.max(0, g.career.est - book.money);
    ledger(g, `Réclamation de droits d’auteur sur ${ta(r)} « ${wordCut(r.topic, 30)} »`, -book.money, 'est');
    book.money = 0;
  }
  if (ctx.removed) post.video.removed = Date.now();
  Object.assign(post.video, { views: shown, money: book.money, plat: platformOf(g), title: str(form.title, 100), thumb: form.thumb || '', thumbLook: form.thumbLook || null, thumbImg: form.thumbImg || '', sound: '', hook: str(form.hook, 80) });
  const adsBase = rpmOf(g, r.what, Object.assign({}, ads, { s: 'vert' }));
  post.video.ads = Object.assign(ads, { base: adsBase, season: adSeason(gameDate(Date.now())), paid: adsBase > 0 });
  if (adsBase > 0 && ads.caught) {
    const n = adsStrike(g, post);
    addNotif(g, { k: 'money', p: post.id, text: `⚠️ « ${vidTitle(post.video)} » : contenu non déclaré aux annonceurs${ads.why ? ` (${ads.why})` : ''}. ${ADS_STATES[ads.s].label}, et un avertissement${n < STRIKE_MAX ? ` (${n}/${STRIKE_MAX})` : ''}.` });
  } else if (adsBase > 0 && ads.s !== 'vert') addNotif(g, { k: 'money', p: post.id, text: `${ADS_STATES[ads.s].dot} « ${vidTitle(post.video)} » : ${ADS_STATES[ads.s].label.toLowerCase()}${ads.why ? ` (${ads.why})` : ''}.` });
  if (gx.claim) { post.video.claim = true; addNotif(g, { k: 'gear', p: post.id, text: `©️ Réclamation sur ${ta(r)} : la musique de fond n’était pas libre de droits. L’argent de cette ${r.what === 'live' ? 'diffusion' : 'vidéo'} part aux ayants droit.` }); }
  for (const x of gx.notes) addNotif(g, { k: 'gear', p: post.id, text: x });
  const tr = form.trend ? g.trends.find((x) => x.id === form.trend) : null;
  if (tr) post.video.trend = { name: tr.name, kind: tr.kind, emoji: tr.emoji, heat: Math.round(trendHeat(tr) * 100) / 100 };
  if (form.collab && g.chars[form.collab]) { post.video.collab = form.collab; collabDone(g, g.chars[form.collab], v.tier, vs); }
  for (const m of (g.staff || []).slice()) if (m.once && m.doneR === r.id) quitStaff(g, m, 'done'); // 0.33: a job for this release only, done
  payGuest(g, r); // 0.33: the share promised to the guest of a sponsored content
  payHost(g, r); // 0.33: invited into someone's operation: paid
  // the editor cuts a short-form clip out of every long video
  if (r.what === 'vidéo' && crew.includes('monteur') && PF(g).fmts.includes('short')) {
    const sv = Math.round(vs * (0.5 + 0.2 * staffPower(g, 'monteur')) * rand(0.7, 1.3));
    const sb = bookRelease(g, { what: 'short', topic: r.topic }, sv, null, ads);
    post.video.extra = { views: sv, money: sb.money };
  }
  if (form.deal) {
    const d = dealOf(g, form.deal);
    if (d) { post.video.sponsor = { brand: d.brand, emoji: d.emoji, mention: form.mention !== false, fit }; deliverDeal(g, d, post, form.mention !== false, { tier: v.tier, viral: !!(post.res && post.res.viral), fit, care: !!(r.care && careOK(r.what)) }); }
    if (d && (v.tier === 'flop' || fit === -1)) unlockAch(g, 'cashed-the-check'); // 0.28: a sponsored piece that went down badly
  }
  if (bdl.length) { // 0.30.1: each brand of the production; a clause broken by another brand in it costs half
    const cl = bigClash(g, bdl.map((d) => d.id)), viral = !!(post.res && post.res.viral);
    post.video.sponsors = bdl.map((d, k) => ({ brand: d.brand, emoji: d.emoji, mention: form.mention !== false, fit: bfit[k] }));
    post.video.sponsor = post.video.sponsors[0];
    bdl.forEach((d, k) => { const x = cl.find((y) => y.d === d); deliverDeal(g, d, post, form.mention !== false, { tier: v.tier, viral, fit: bfit[k], care: true, clash: x ? x.said : '' }); });
    if (v.tier === 'flop' || bfit.includes(-1)) unlockAch(g, 'cashed-the-check');
  }
  if (r.big) bigOut(ctx, post, vs, ads); // 0.30.1: the rest of its views to come, its cast, a flop's price
  if ((form.thumb === 'choc' || form.thumbChoc) && v.tier === 'flop') { const dr = repMove(g, { cred: -10 }, 'miniature putaclic sur une vidéo ratée'); addNotif(g, { k: 'reldown', p: post.id, text: `Miniature putaclic sur une vidéo ratée : « encore un piège à clics »${repBit(dr, ', ')}.` }); }
  if (r.series) seriesEpisode(g, r, v.tier);
  if (r.fanQ) fanVideoDone(g, r, post); // 0.21: a fan becomes a regular
  if (mLive && membDelivered(g, 'live')) post.video.memb = 'live'; // 0.22: a promise kept to the members
  else if (form.membAvant && r.what !== 'live' && membDelivered(g, 'avant')) post.video.memb = 'avant';
  if (r.what === 'live') { liveDonations(g, post, vs, ctx.dons); warmMove(g, 1.5, 'un live avec ta commu'); } // 0.21: the donations, a moment together
  audNotes(g, r, v.tier, post, ctx.outcome ? ctx.outcome.fol : 0, early, vs / Math.max(1, views0)); // 0.29.1: the two publics
  gearWear(g, r); // 0.20: the gear used wears out
}
// 0.29.1: after a release on a platform of both publics, what it did to them, as the player is told.
function audNotes(g, r, tier, post, fol, early, k = 1) {
  if (!audSplit(g)) return;
  const sn = PF(g).shortName + 's', e = early ? { b: Math.round(early.b * k), tease: Math.round((early.tease || 0) * k) } : null;
  if (e && e.tease > 0) post.video.teased = e.tease; // (shown on the video)
  const conv = audAfter(g, r, tier, fol, e), A = vidAud(g), F = Math.max(1, g.stats.followers);
  if (audLong(g, r.what) && !g.career.audTold && A.fans / F < 0.4) { // the first one: why so few
    g.career.audTold = Date.now();
    addNotif(g, { k: 'release', p: post.id, at: later() + 6000, text: `📺 La plupart de tes abonnés te suivent pour tes ${sn} : ≈ ${fmtN(A.fans)} sur ${fmtN(F)} regardent tes vidéos longues et tes lives. Chaque bonne vidéo en convertit d’autres (plus si ta commu est chaleureuse), et un ${PF(g).shortName} qui annonce la prochaine en amène.` });
  } else if (conv >= 10) addNotif(g, { k: 'relup', p: post.id, at: later() + 6000, text: `📺 ${nAbonnes(conv)} venus de tes ${sn} suivent maintenant aussi tes vidéos longues et tes lives : ton public vidéo passe à ≈ ${fmtN(A.fans)}.` });
  if (conv > 0) post.video.conv = conv;
  const pr = r.what === 'short' ? promoAfter(g, r, post) : null;
  if (pr && pr.before) addNotif(g, { k: 'release', p: post.id, at: later() + 5000, text: `📣 Ton ${PF(g).shortName} annonce ${ta(pr.before)} « ${str(pr.before.topic, 50)} » (${fmtWhen(relAnn(pr.before))}) : une partie de ses spectateurs ${whatF(pr.before) ? 'la' : 'le'} regardera à sa sortie.` });
  else if (pr && pr.after) addNotif(g, { k: 'release', p: pr.after.out, at: later() + 5000, text: `📣 Ton ${PF(g).shortName} a envoyé ${fmtN(pr.extra)} ${plural(pr.extra, 'personne', 'personnes')} voir ${ta(pr.after)} « ${str(pr.after.topic, 50)} »${pr.conv >= 1 ? `, et ${fmtN(pr.conv)} ${plural(pr.conv, 'reste', 'restent')} dans ton public vidéo` : ''}.` });
}

/* ---------- 0.14: couples on show, videos made together ---------- */
// A couple made public (or that leaked) draws eyes to both, for a week: the player's releases get more views.
function coupleBoost(g, t = Date.now()) {
  const h = g.coupleHype, c = h && g.chars[h.c];
  return h && t < h.until && c && PARTNER.includes(c.vibe) ? h.mult : 1;
}
// A video made with someone: their audience comes to see it, and the two of you grow closer (or not, if it flopped).
/* ---------- 0.29.1: a feat, asked by the player for a release of theirs ----------
   The player picks someone of the cast (programming the release, or later from the programme), tells them the topic in
   their messages, and their AI says yes or no ({"t":"feat"}). Yes: they are in the video, and it goes out to both
   audiences (the collab of the upload screen). No: the release stays the player's alone. */
const featOK = (g, c) => !!c && isMain(c) && c.unlocked && !c.cut && !c.jailed && !(c.cool && c.cool.k === 'bloque' && Date.now() < c.cool.until);
const featPartners = (g) => mains(g).filter((c) => featOK(g, c)).sort((a, b) => b.rel - a.rel);
// The release whose feat waits for their answer.
const featAsked = (g, c) => (g.releases || []).find((r) => r.state === 'scheduled' && r.feat && r.feat.c === c.id && r.feat.ok == null) || null;
function askFeat(g, r, c) {
  if (!r || r.state !== 'scheduled' || r.collab || !featOK(g, c) || featAsked(g, c)) return false;
  r.feat = { c: c.id, ok: null, at: Date.now() };
  return true;
}
// What the player sends them (left in their conversation, to edit and send).
function featText(g, r) {
  const l = whatF(r) ? 'la' : 'le';
  return `Ça te dirait un feat ? Je sors ${unW(r)} ${fmtWhen(relAnn(r))} : « ${str(r.topic, 80)} ». On ${l} fait ensemble, et nos deux publics ${l} verront.`;
}
function featDMCtx(g, c) {
  const r = featAsked(g, c);
  if (!r) { // 0.30.2: the feat already planned with them: said, so that a confirmation does not plan it again
    const P = (g.releases || []).filter((x) => x && x.state === 'scheduled' && !x.big && x.collab === c.id).slice(0, 2);
    return P.map((x) => `Déjà calé, dans le programme du joueur : votre feat, ${unW(x)} « ${str(x.topic, 70)} », tournage ensemble ${fmtWhen(x.due)}${relAnn(x) !== x.due ? `, sortie ${fmtWhen(relAnn(x))}` : ''}. Pas de nouvelle ligne plan pour ce tournage : il est déjà prévu.`);
  }
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  return [`Le joueur te propose un FEAT : faire avec lui ${unW(r)} « ${str(r.topic, 90)} » (sur ${pfName(g, platformOf(g))}, ${fmtWhen(relAnn(r))}) et ${whatF(r) ? 'la' : 'le'} publier à deux : vos deux publics ${whatF(r) ? 'la' : 'le'} voient (le joueur a ${fmtPlain(g.stats.followers)} abonnés, ${first} ${fmtPlain(c.followers)}). ${first} décide selon votre relation, son caractère, ce que ça lui apporte (son public, son image), le sujet (colle-t-il à son univers ?) et son emploi du temps.`];
}
const FEAT_LINE = (c) => `- Quand ${firstName(c)} a décidé pour le feat : {"t":"feat","ok":true,"why":"≤ 60 caractères"} (ok:false s’il ou elle refuse). Pas de ligne feat s’il ou elle hésite encore ou pose une condition.`;
function applyFeatLine(g, c, o) {
  const r = featAsked(g, c);
  if (!r) return false;
  const ok = o.ok === true || o.ok === 'true', first = firstName(c), why = str(o.why, 60);
  if (ok) {
    r.feat.ok = true;
    r.collab = c.id;
    addNotif(g, { k: 'relup', c: c.id, at: later() + 1500, text: `🤝 ${first} est partant${gx(c.g, '', 'e', '·e')} pour le feat : ${unW(r)} « ${str(r.topic, 50)} », ${fmtWhen(relAnn(r))}.` });
    addMem(g, c, `on va tourner « ${str(r.topic, 50)} » ensemble`);
    touch(c);
  } else {
    r.feat = null;
    addNotif(g, { k: 'reldown', c: c.id, at: later() + 1500, text: `${first} ne fera pas le feat${why ? ` : « ${why} »` : ''}. ${cap1(ta(r))} reste à toi.` });
    addMem(g, c, `le joueur m’a proposé un feat (« ${str(r.topic, 40)} ») et j’ai dit non`);
  }
  return true;
}
// The feat asked, given up (another partner, or alone): nothing is said to them.
function dropFeat(g, r) { if (r && r.feat && r.feat.ok == null) { r.feat = null; return true; } return false; }
// 0.30.2: the feat with them already in the programme for about that moment (12 h either side of its shoot or its
// release): a confirmation or a detail in their messages is that one, never a second release.
const COLLAB_SAME = 12 * 3600000;
function collabPlanned(g, c, due) {
  if (!c || !(due > 0)) return null;
  return (g.releases || []).find((r) => r && r.state === 'scheduled' && !r.big && r.collab === c.id && Math.min(Math.abs(r.due - due), Math.abs(relAnn(r) - due)) < COLLAB_SAME) || null;
}
// 0.30.2: before, each confirmation planned it again: the copies go (nothing was paid for them), the first one stays.
// Only those agreed in their messages (a feat the player asked for a release of theirs has r.feat), of the same kind.
function dedupeCollabs(g) {
  const keep = [], out = new Set();
  for (const r of g.releases || []) {
    if (!r || r.state !== 'scheduled' || r.big || !r.collab || r.feat) continue;
    if (keep.some((x) => x.collab === r.collab && x.what === r.what && Math.min(Math.abs(x.due - r.due), Math.abs(relAnn(x) - relAnn(r))) < COLLAB_SAME)) out.add(r);
    else keep.push(r);
  }
  if (out.size) g.releases = g.releases.filter((r) => !out.has(r));
  return out.size;
}
// A video to make together, agreed in their messages (« on fait un feat samedi ? » « grave ! »): it goes in the Studio.
function planCollab(g, c, o) {
  const due = planDue(o, Date.now());
  const old = collabPlanned(g, c, due);
  if (old) return old; // 0.30.2: already planned (they confirm it, add a detail): nothing new
  if (!(due >= Date.now() + 15 * 60000)) return null;
  const iv = { c: c.id, what: str(o.what, 100) || 'vidéo ensemble', due, collab: true, state: 'open' };
  const r = acceptCollab(g, iv, c, true);
  if (r) addNotif(g, { k: 'release', c: c.id, at: later() + 1200, text: `🎬 Feat avec ${firstName(c)} : ${unW(r)} « ${str(r.topic, 50)} », ${fmtWhen(relAnn(r))}. Elle t’attend dans le Studio.` });
  return r;
}
function collabDone(g, c, tier, views) {
  if (!c || !isMain(c)) return;
  const first = firstName(c);
  applyRel(g, c, { top: 6, mid: 3, flop: -3 }[tier] || 0, tier === 'flop' ? 'votre vidéo à deux a fait un flop' : 'votre vidéo à deux', later() + 2600, 8);
  const fol = Math.round(Math.min(views * 0.01, Math.max(200, c.followers * 0.05)));
  if (fol > 0) c.followers += fol;
  addMem(g, c, tier === 'flop' ? 'notre vidéo à deux a fait un flop' : 'on a fait une vidéo ensemble');
  addTrigger(g, `La vidéo à deux du joueur et de @${c.handle} est en ligne (${tier === 'top' ? 'un carton' : tier === 'flop' ? 'un flop' : 'un accueil correct'}) : ${first} la partage et réagit, ses abonnés aussi.`, c.id);
  foesNotice(g, c, 'public'); // 0.15: whoever cannot stand them saw it too
}
