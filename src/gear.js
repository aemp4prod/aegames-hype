/* =========================================================
   0.20: the gear (« le matos »), the connection, the subscriptions, and the random start of each game.
   - Each new game starts its own way: an old or a recent phone, a connection good or not, some savings, sometimes
     a perk or a handicap. Everyone has a phone: the vertical formats always work. A computer opens the long videos;
     a live needs a connection that holds (a 4G or 5G box, the fibre).
   - Four tiers for each piece of gear, bought at any tier: each adds a little (views, an easier edit, fewer crashes);
     the cheapest ones cost something instead (a phone that films badly, a laptop that lags and crashes).
   - Gear wears out and breaks, gets dropped or stolen; the connection cuts out. Subscriptions (the fibre, the box, the
     software, the insurance) are billed at each game month: unpaid, they are suspended.
   - Every six game months (1 March, 1 September), something new comes out, with a bonus never seen before.
   Nothing here calls the AI. The characters only hear of it through the triggers (a theft, a big purchase).
   ========================================================= */

// The suites written before 0.20 run without its friction (a full kit, no breakdown, no outage, no crash, no quote).
// The 0.20 suites and the balance lab turn it back on. The game never sets it.
const easyGear = () => typeof window !== 'undefined' && window.__hypeEasyGear === true;

const TIER_LABELS = ['Bas de gamme', 'Entrée de gamme', 'Milieu de gamme', 'Haut de gamme'];
const GEAR = {
  phone: { emoji: '📱', label: 'Téléphone', names: ['Vieux téléphone', 'Téléphone d’entrée de gamme', 'Téléphone récent', 'Téléphone haut de gamme'],
    prices: [0, 250, 700, 1500], views: [-0.08, 0, 0.02, 0.04], wear: [0.02, 0.012, 0.007, 0.004] },
  pc: { emoji: '💻', label: 'Ordinateur', names: ['PC portable d’occasion', 'PC portable correct', 'PC de montage', 'Station de travail'],
    prices: [400, 1500, 5000, 30000], views: [-0.03, 0, 0.02, 0.04], wear: [0.02, 0.01, 0.006, 0.003] },
  cam: { emoji: '📷', label: 'Caméra', names: ['Webcam HD', 'Hybride d’entrée de gamme', 'Hybride plein format', 'Caméra cinéma'],
    prices: [250, 1200, 6000, 100000], views: [0.02, 0.04, 0.07, 0.1], wear: [0.015, 0.008, 0.005, 0.0025] },
  mic: { emoji: '🎙️', label: 'Micro', names: ['Micro-cravate', 'Micro USB', 'Micro de studio', 'Micro broadcast'],
    prices: [50, 250, 1500, 12000], views: [0.02, 0.03, 0.05, 0.08], wear: [0.015, 0.008, 0.005, 0.0025] },
  light: { emoji: '💡', label: 'Lumière', names: ['Petite lampe LED', 'Anneau lumineux', 'Deux panneaux LED', 'Kit studio complet'],
    prices: [40, 200, 1800, 18000], views: [0.01, 0.02, 0.04, 0.06], wear: [0.015, 0.008, 0.005, 0.0025] },
};
const GEAR_KINDS = Object.keys(GEAR);
// The edit, by machine: w (the width of the zones to hit, ×), time (the time to sort the rushes, ×), crash (the
// chance the software crashes at the render), ms (how long the render takes, in real time: a short wait, felt).
const PC_EDIT = [{ w: 0.78, time: 0.85, crash: 0.16, ms: 5200 }, { w: 1, time: 1, crash: 0.07, ms: 3200 }, { w: 1.15, time: 1.12, crash: 0.025, ms: 1700 }, { w: 1.3, time: 1.25, crash: 0.008, ms: 900 }];
const PHONE_EDIT = [{ w: 0.85, time: 0.9, crash: 0.06, ms: 2600 }, { w: 0.95, time: 1, crash: 0.04, ms: 1800 }, { w: 1, time: 1, crash: 0.025, ms: 1200 }, { w: 1.05, time: 1.05, crash: 0.015, ms: 800 }];
// In worlds where a phone or a computer makes no sense: the same gear, under the world's own names.
const WORLD_GEAR = {
  aldoree: {
    phone: ['Miroir de poche', ['fêlé', 'de bois', 'd’argent', 'd’or']], pc: ['Grimoire de montage', ['usé', 'd’apprenti', 'de maître', 'd’archimage']],
    cam: ['Œil de cristal', ['trouble', 'taillé', 'pur', 'royal']], mic: ['Conque enchantée', ['ébréchée', 'de rivière', 'des mers', 'des sirènes']],
    light: ['Lanterne', ['à chandelle', 'féerique', 'de lune', 'solaire']],
    net: { data: 'Ton miroir de poche seul', adsl: 'Liaison brumeuse', box4g: 'Liaison runique', box5g: 'Liaison runique renforcée', fibre: 'Fil d’argent', fibrepro: 'Fil d’or' },
    subs: { montage: 'Atelier des enlumineurs', sons: 'Guilde des ménestrels', assur: 'Protection de la guilde' },
  },
  orion: {
    phone: ['Holo-com', ['antique', 'standard', 'récent', 'dernier cri']], pc: ['Unité de montage', ['de récup', 'standard', 'avancée', 'de pointe']],
    cam: ['Capteur holo', ['basique', 'standard', 'avancé', 'de pointe']], mic: ['Capteur vocal', ['basique', 'standard', 'avancé', 'de pointe']],
    light: ['Éclairage plasma', ['basique', 'standard', 'avancé', 'de pointe']],
    net: { data: 'Ton holo-com seul', adsl: 'Relais de secours', box4g: 'Relais orbital', box5g: 'Relais orbital renforcé', fibre: 'Liaison quantique', fibrepro: 'Liaison quantique prioritaire' },
    subs: { montage: 'Suite de montage pro', sons: 'Banque sonore de la station', assur: 'Assurance matériel de la station' },
  },
};
const gearWorld = (g) => (g && g.world && WORLD_GEAR[g.world.preset]) || null;
function gearName(g, k, t) {
  const W = gearWorld(g);
  if (W && W[k]) return `${W[k][0]} ${W[k][1][clamp(t, 0, 3)]}`;
  return GEAR[k].names[clamp(t, 0, 3)];
}
const kindLabel = (g, k) => { const W = gearWorld(g); return W && W[k] ? W[k][0] : GEAR[k].label; };

// The connection: what holds a live (and how often it drops), how often it cuts out (per game day).
const NETS = {
  data: { label: 'La 4G de ton téléphone', emoji: '📱', live: false, drop: 0, out: 0, outH: [0, 0] },
  adsl: { label: 'ADSL', emoji: '🐌', live: false, drop: 0, out: 0.14, outH: [2, 10] },
  box4g: { label: 'Box 4G', emoji: '📶', live: true, drop: 0.12, out: 0.08, outH: [1, 6] },
  box5g: { label: 'Box 5G', emoji: '📶', live: true, drop: 0.06, out: 0.05, outH: [1, 5] },
  fibre: { label: 'Fibre', emoji: '🌐', live: true, drop: 0.02, out: 0.025, outH: [1, 4] },
  fibrepro: { label: 'Fibre pro', emoji: '🛰️', live: true, drop: 0, out: 0.008, outH: [0.5, 2] },
};
const netName = (g, id) => { const W = gearWorld(g); return (W && W.net[id]) || NETS[id].label; };
// What the player can subscribe to: billed at each game month (the first month pro rata).
const SUBS = {
  box5g: { emoji: '📶', label: 'Box 5G', price: 40, net: true, desc: 'Des lives possibles, quelques coupures. Branchée tout de suite.' },
  fibre: { emoji: '🌐', label: 'Fibre', price: 35, net: true, install: 150, days: [3, 8], fibre: true, desc: 'Des lives fluides, très peu de coupures. Installée en quelques jours.' },
  fibrepro: { emoji: '🛰️', label: 'Fibre pro', price: 89, net: true, install: 150, days: [3, 8], fibre: true, desc: 'La fibre des pros : presque jamais coupée, rétablie en quelques heures.' },
  montage: { emoji: '🎞️', label: 'Logiciel de montage pro', price: 25, desc: 'Un montage plus facile, une sauvegarde auto si ça plante, +2 % de vues sur ce que tu montes à l’ordinateur.' },
  sons: { emoji: '🎵', label: 'Banque de sons et de musiques', price: 15, desc: 'Des musiques libres de droits : plus jamais une réclamation qui te prend l’argent d’une vidéo.' },
  assur: { emoji: '🛡️', label: 'Assurance matos', price: 19, desc: 'Casse et vol couverts : réparé ou remplacé contre une franchise (5 % de son prix, 50 € au moins). Son prix suit la valeur de ton matos.' },
};
const NET_SUBS = ['fibrepro', 'fibre', 'box5g'];
const subName = (g, id) => { const W = gearWorld(g); return (W && W.subs[id]) || (W && W.net[id]) || SUBS[id].label; };
const FRANCHISE = 50; // at least (0.20 balance: 5 % of the price of what broke or was stolen)
const franchiseOf = (price) => Math.max(FRANCHISE, niceRound((price || 0) * 0.05));
const NOISE_FIX = 350; // soundproofing the room: the noisy neighbours are no longer heard

// Every six game months, something new: a bonus never seen before, at a price that is hard to reach.
// kind: the gear it replaces (it counts as top of the range, plus its bonus: always dearer than the top of its range),
// or 'extra' (owned on top of the rest).
const NEW_GEAR = [
  { id: 'sourire', kind: 'cam', emoji: '😄', name: 'Caméra Sourire', w: { aldoree: 'Œil rieur', orion: 'Capteur Sourire' }, price: 120000, bonus: 'sympathie',
    fx: 'Une image chaleureuse : on te trouve plus drôle. +10 % de j’aime et d’abonnés sur tes sorties.' },
  { id: 'vitrine', kind: 'cam', emoji: '🛍️', name: 'Caméra Vitrine', w: { aldoree: 'Œil du marchand', orion: 'Capteur Vitrine' }, price: 130000, bonus: 'produits',
    fx: 'Les produits brillent à l’image : les marques paient 15 % de plus, et reviennent plus volontiers.' },
  { id: 'velours', kind: 'mic', emoji: '🎙️', name: 'Micro Velours', w: { aldoree: 'Conque de velours', orion: 'Capteur Velours' }, price: 20000, bonus: 'voix',
    fx: 'Une voix qui captive : +12 % de vues sur tes lives et tes podcasts.' },
  { id: 'drone', kind: 'extra', emoji: '🚁', name: 'Drone de tournage', w: { aldoree: 'Faucon de tournage', orion: 'Drone d’orbite' }, price: 30000, bonus: 'aerien',
    fx: 'Des plans vus du ciel : +7 % de vues sur tes vidéos et tes clips.' },
  { id: 'station', kind: 'pc', emoji: '🖥️', name: 'Station de rendu', w: { aldoree: 'Grimoire des sages', orion: 'Cœur de calcul' }, price: 50000, bonus: 'rendu',
    fx: 'Rendu instantané, plus jamais de plantage, et un montage encore plus facile.' },
  { id: 'prompteur', kind: 'extra', emoji: '📜', name: 'Prompteur intelligent', w: { aldoree: 'Parchemin souffleur', orion: 'Prompteur holo' }, price: 30000, bonus: 'prompteur',
    fx: '+15 % de temps pendant tes tournages.' },
  { id: 'cam360', kind: 'extra', emoji: '🌐', name: 'Caméra 360°', w: { aldoree: 'Œil aux mille faces', orion: 'Capteur 360°' }, price: 50000, bonus: 'viral',
    fx: 'Des images que personne n’a : +4 points de chances de faire le buzz à chaque sortie.' },
  { id: 'aura', kind: 'light', emoji: '✨', name: 'Lumière Aura', w: { aldoree: 'Lanterne d’aurore', orion: 'Éclairage Aura' }, price: 30000, bonus: 'miniatures',
    fx: 'Une image qui claque : +9 % de vues sur tes vidéos longues (miniatures comprises).' },
  { id: 'stabi', kind: 'extra', emoji: '🤳', name: 'Stabilisateur nouvelle génération', w: { aldoree: 'Bâton de l’équilibre', orion: 'Stabilisateur gravitationnel' }, price: 35000, bonus: 'nervosite',
    fx: 'Des formats courts plus nerveux : +6 % de vues dessus, et un montage plus facile.' },
  { id: 'doubleur', kind: 'extra', emoji: '🗣️', name: 'Doubleur vocal', w: { aldoree: 'Pierre des langues', orion: 'Traducteur universel' }, price: 150000, bonus: 'monde',
    fx: 'Tes contenus doublés dans dix langues : +10 % de vues sur tout.' },
];
const NEW_BY_ID = Object.fromEntries(NEW_GEAR.map((x) => [x.id, x]));
const newName = (g, X) => (X.w && g && g.world && X.w[g.world.preset]) || X.name;

// The start of each game: what the player has (the perks and the handicaps, sometimes).
const mkItem = (t, at = Date.now()) => ({ t, at, sp: '', broken: 0, fixAt: 0, crack: 0, hot: 0, virus: 0 });
const PERKS = [
  { id: 'cam', w: 3, text: () => 'Un pote vidéaste t’a donné sa vieille webcam.', ok: (G) => !G.items.cam, apply: (G) => { G.items.cam = mkItem(0); } },
  { id: 'mic', w: 3, text: () => 'Tu as gardé le micro-cravate d’un ancien job.', ok: (G) => !G.items.mic, apply: (G) => { G.items.mic = mkItem(0); } },
  { id: 'light', w: 3, text: () => 'Ta coloc photographe t’a laissé sa petite lampe LED.', ok: (G) => !G.items.light, apply: (G) => { G.items.light = mkItem(0); } },
  { id: 'pc', w: 1, text: () => 'Ton oncle t’a refilé son vieux PC portable.', ok: (G) => !G.items.pc, apply: (G) => { G.items.pc = mkItem(0); } },
  { id: 'cash', w: 2, text: (g) => `Une petite prime de ton dernier job : +${fmtMoney(g, 300)}.`, ok: () => true, apply: (G) => { G.start.savings += 300; } },
  { id: 'fibre', w: 2, text: () => 'Un bon plan : l’installation de la fibre t’est offerte.', ok: (G) => G.net.base !== 'fibre' && G.net.fibreOk, apply: (G) => { G.freeInstall = 1; } },
];
const FLAWS = [
  { id: 'crack', w: 3, text: () => 'L’objectif de ton téléphone est rayé : −6 % de vues sur ce que tu filmes avec, tant qu’il n’est pas réparé.', ok: () => true, apply: (G) => { G.items.phone.crack = 1; } },
  { id: 'loan', w: 2, text: (g) => `Tu rembourses un petit prêt : ${fmtMoney(g, 40)} par mois pendant 6 mois.`, ok: () => true, apply: (G) => { G.debt = { left: 6, amount: 40 }; } },
  { id: 'box', w: 2, text: () => 'Ta box plante souvent : deux fois plus de coupures, tant que tu la gardes.', ok: (G) => G.net.base !== 'fibre', apply: (G) => { G.flaky = 1; } },
  { id: 'noisy', w: 2, text: () => 'Des voisins très bruyants : tes lives et tes enregistrements en pâtissent parfois.', ok: () => true, apply: (G, t) => { G.noisy = t + randi(30, 70) * DAY_MS; } },
];
const pickW = (list) => { let r = Math.random() * list.reduce((n, x) => n + x.w, 0); for (const x of list) { r -= x.w; if (r <= 0) return x; } return list[list.length - 1]; };
// The next 1 March or 1 September at 10 h (game clock), as a real timestamp.
function nextLaunchAt(t = Date.now()) {
  const d = gameDate(t), y = d.getFullYear(), m = d.getMonth();
  const at = m < 2 ? new Date(y, 2, 1, 10) : m < 8 ? new Date(y, 8, 1, 10) : new Date(y + 1, 2, 1, 10);
  return t + (at - d);
}
function blankGear(t) {
  return { v: 1, items: { phone: mkItem(1, t), pc: null, cam: null, mic: null, light: null }, extras: [], subs: {},
    net: { base: 'box4g', fibreOk: true, fibreAt: 0, out: 0, outWhy: '', hack: 0, storm: 0 },
    bill: monthKey(gameDate(t)), rollAt: t, launch: { n: 1, next: nextLaunchAt(t) }, owned: [], start: { savings: 0, perk: '', flaw: '' } };
}
// A new game: the draw. start: anon (from nothing), rising (already a small creator), star (already equipped).
function newGear(persona, platform, t = Date.now()) {
  const G = blankGear(t), start = persona && persona.start;
  if (easyGear()) { // the suites before 0.20: everything works, as it did
    Object.assign(G.items, { phone: mkItem(2, t), pc: mkItem(1, t), cam: mkItem(1, t), mic: mkItem(1, t), light: mkItem(1, t) });
    G.net.base = 'fibre';
    G.start.easy = true;
    return G;
  }
  const r = Math.random();
  if (start === 'star') {
    Object.assign(G.items, { phone: mkItem(3, t), pc: mkItem(2, t), cam: mkItem(2, t), mic: mkItem(2, t), light: mkItem(2, t) });
    G.net.base = 'fibre';
  } else if (start === 'rising') {
    Object.assign(G.items, { phone: mkItem(r < 0.5 ? 1 : 2, t), pc: mkItem(1, t), cam: mkItem(Math.random() < 0.5 ? 0 : 1, t), mic: mkItem(1, t), light: Math.random() < 0.5 ? mkItem(0, t) : null });
    G.net.base = Math.random() < 0.6 ? 'fibre' : 'box4g';
  } else {
    G.items.phone = mkItem(r < 0.5 ? 0 : r < 0.85 ? 1 : 2, t);
    const n = Math.random();
    G.net.base = n < 0.3 ? 'adsl' : n < 0.65 ? 'box4g' : 'fibre';
    G.start.savings = Math.round(1000 * Math.pow(Math.random(), 1.6) / 10) * 10; // 0 to 1 000, a third or so under 200
  }
  if (platform === 'twitch' && G.net.base === 'adsl') G.net.base = 'box4g'; // a streamer always has something to stream with
  if (G.net.base !== 'fibre' && Math.random() < 0.25) { G.net.fibreOk = false; G.net.fibreAt = t + randi(20, 90) * DAY_MS; } // not in their street yet
  const roll = Math.random();
  const list = roll < 0.35 ? PERKS : roll < 0.6 ? FLAWS : null;
  if (list) {
    const x = pickW(list.filter((p) => p.ok(G)));
    if (x) { x.apply(G, t); G.start[list === PERKS ? 'perk' : 'flaw'] = x.id; }
  }
  G.start.phone = G.items.phone.t;
  G.start.net = G.net.base;
  return G;
}
// A game from before 0.20: nothing given (a phone and a 4G box), its money kept. What it had scheduled still comes out.
function legacyGear(g, t = Date.now()) {
  const G = blankGear(t);
  G.start.legacy = true;
  if (easyGear()) { Object.assign(G.items, { phone: mkItem(2, t), pc: mkItem(1, t), cam: mkItem(1, t), mic: mkItem(1, t), light: mkItem(1, t) }); G.net.base = 'fibre'; G.start.easy = true; }
  for (const r of g.releases || []) if (r.state === 'scheduled') r.legacy = true;
  if (g.series && g.series.state === 'on') g.series.legacy = true;
  return G;
}
function migrateGear(g) {
  if (!g.gear || typeof g.gear !== 'object') g.gear = legacyGear(g);
  const G = g.gear, d = blankGear(Date.now());
  for (const k of Object.keys(d)) if (G[k] === undefined) G[k] = d[k];
  for (const k of GEAR_KINDS) if (G.items[k] === undefined) G.items[k] = null;
  if (!G.items.phone) G.items.phone = mkItem(0);
  if (!Array.isArray(G.extras)) G.extras = [];
  if (!Array.isArray(G.owned)) G.owned = [];
  for (const k of Object.keys(d.net)) if (G.net[k] === undefined) G.net[k] = d.net[k];
}

/* ---------- what the player has, and what it allows ---------- */
const usable = (it) => !!it && !it.broken && !it.virus;
const tierOfItem = (it) => (it && it.sp ? 3 : it ? it.t : -1);
const subOn = (g, id, t = Date.now()) => { const s = g.gear && g.gear.subs[id]; return !!(s && s.on && !s.cut && !(s.installAt > t)); };
function hasBonus(g, b) {
  const G = g.gear;
  if (!G) return false;
  for (const k of GEAR_KINDS) { const it = G.items[k]; if (usable(it) && it.sp && NEW_BY_ID[it.sp] && NEW_BY_ID[it.sp].bonus === b) return true; }
  return G.extras.some((x) => !x.broken && NEW_BY_ID[x.id] && NEW_BY_ID[x.id].bonus === b);
}
// The connection right now: an outage falls back to the phone's own 4G (no live on it).
function netNow(g, t = Date.now()) {
  const G = g.gear;
  if (!G) return 'fibre';
  if (G.net.out > t) return 'data';
  for (const id of NET_SUBS) if (subOn(g, id, t)) return id;
  return G.net.base;
}
// Whether a format can be made right now, and why not (for the screens).
function canMake(g, what, t = Date.now()) {
  const G = g.gear;
  if (!G || easyGear()) return { ok: true };
  if (what === 'vidéo') {
    const pc = G.items.pc;
    if (!pc) return { ok: false, fix: 'shop', why: `Il te faut ${g.world && WORLD_GEAR[g.world.preset] ? 'un ' + kindLabel(g, 'pc').toLowerCase() : 'un ordinateur'} pour monter une vidéo longue.` };
    if (pc.virus) return { ok: false, fix: 'virus', why: 'Ton ordinateur a un virus : il est inutilisable tant que tu ne l’as pas nettoyé.' };
    if (pc.broken) return { ok: false, fix: 'repair', why: pc.fixAt ? `Ton ordinateur est chez le réparateur (retour ${fmtWhen(pc.fixAt, t)}).` : 'Ton ordinateur est en panne.' };
  }
  if (what === 'live') {
    const n = netNow(g, t);
    if (!NETS[n].live) return { ok: false, fix: 'net', why: G.net.out > t ? `${G.net.outWhy || 'Coupure internet'} : pas de live avant le retour de la connexion (${fmtWhen(G.net.out, t)}).` : `${netName(g, n)} : ta connexion ne tient pas un live. Il te faut une box 4G ou 5G, ou la fibre.` };
  }
  return { ok: true };
}
const canMakeR = (g, r, t) => (r && r.legacy ? { ok: true } : canMake(g, r.what, t));
// What an announcement turns into when its format cannot be made: the vertical format, or whatever can be.
function makeableWhat(g, what) {
  if (canMake(g, what).ok) return what;
  const fmts = PF(g).fmts;
  if (fmts.includes('short') && canMake(g, 'short').ok) return 'short';
  return fmts.find((f) => canMake(g, f).ok) || what;
}
const fmtPct = (x) => (x >= 0 ? '+' : '−') + Math.round(Math.abs(x) * 100) + ' %';
const viewsWord = (x, what) => (Math.round(x * 100) ? `${fmtPct(x)} de vues${what ? ' ' + what : ''}` : `ni bonus ni malus${what ? ' ' + what : ''}`);
// One line for the prompts: what the player films and edits with.
function gearBrief(g) {
  const G = g.gear;
  if (!G) return '';
  const it = (k) => G.items[k];
  const parts = [gearName(g, 'phone', it('phone').t).toLowerCase()];
  parts.push(it('pc') ? `${it('pc').sp ? newName(g, NEW_BY_ID[it('pc').sp]) : gearName(g, 'pc', it('pc').t)}${usable(it('pc')) ? '' : ' (en panne)'}` : `pas ${g.world && WORLD_GEAR[g.world.preset] ? 'de ' + kindLabel(g, 'pc').toLowerCase() : 'd’ordinateur'} (donc pas de vidéo longue)`);
  for (const k of ['cam', 'mic', 'light']) if (it(k)) parts.push(`${it(k).sp ? newName(g, NEW_BY_ID[it(k).sp]) : gearName(g, k, it(k).t)}${usable(it(k)) ? '' : ' (en panne)'}`);
  for (const x of G.extras) if (NEW_BY_ID[x.id]) parts.push(newName(g, NEW_BY_ID[x.id]));
  const n = netNow(g);
  return `${parts.join(', ')} ; connexion : ${netName(g, n).toLowerCase()}${NETS[n].live ? '' : ' (pas de live possible)'}`;
}

/* ---------- what the gear does ---------- */
// The views a release gets from the gear (the image, the sound, the light, the edit, what came out every six months).
function gearViewsMult(g, what) {
  const G = g.gear;
  if (!G || easyGear()) return 1;
  const filmed = what !== 'podcast', onPc = (what === 'vidéo' || what === 'clip' || what === 'podcast') && usable(G.items.pc);
  let m = 1;
  if (filmed) {
    const ph = G.items.phone, cam = G.items.cam;
    let img = (ph ? GEAR.phone.views[ph.t] : -0.08) - (ph && ph.crack ? 0.06 : 0);
    if (usable(cam)) img = Math.max(img, GEAR.cam.views[tierOfItem(cam)]);
    m *= 1 + img;
    if (usable(G.items.light)) m *= 1 + GEAR.light.views[tierOfItem(G.items.light)];
  }
  if (usable(G.items.mic)) m *= 1 + GEAR.mic.views[tierOfItem(G.items.mic)];
  if (onPc) { m *= 1 + GEAR.pc.views[tierOfItem(G.items.pc)]; if (subOn(g, 'montage')) m *= 1.02; }
  if ((what === 'live' || what === 'podcast') && hasBonus(g, 'voix')) m *= 1.12;
  if ((what === 'vidéo' || what === 'clip') && hasBonus(g, 'aerien')) m *= 1.07;
  if (what === 'vidéo' && hasBonus(g, 'miniatures')) m *= 1.09;
  if (what === 'short' && hasBonus(g, 'nervosite')) m *= 1.06;
  if (hasBonus(g, 'monde')) m *= 1.1;
  return m;
}
// What a release's own post gets (« on te trouve plus drôle »), and its extra chance of going viral.
const gearPostMult = (g) => (!easyGear() && hasBonus(g, 'sympathie') ? 1.1 : 1);
const gearViralPlus = (g) => (!easyGear() && hasBonus(g, 'viral') ? 0.04 : 0);
const gearTime = (g) => (!easyGear() && hasBonus(g, 'prompteur') ? 1.15 : 1);
const gearFeeMult = (g) => (!easyGear() && hasBonus(g, 'produits') ? 1.15 : 1);
// The edit: on the computer (or on the phone, for a short or without a computer).
function gearEdit(g, r) {
  const G = g && g.gear;
  if (!G || easyGear()) return { w: 1, time: 1, crash: 0, ms: 0, save: false, on: 'none' };
  const onPhone = r.what === 'short' || !usable(G.items.pc);
  const E = Object.assign({}, onPhone ? PHONE_EDIT[G.items.phone ? G.items.phone.t : 0] : PC_EDIT[tierOfItem(G.items.pc)]);
  if (!onPhone) {
    if (G.items.pc.hot) E.crash = Math.min(0.5, E.crash * 2);
    if (subOn(g, 'montage')) { E.w *= 1.1; E.time *= 1.1; E.save = true; }
    if (hasBonus(g, 'rendu')) { E.crash = 0; E.ms = 300; E.w *= 1.1; }
  } else if (r.what === 'short' && hasBonus(g, 'nervosite')) E.w *= 1.15;
  E.on = onPhone ? 'phone' : 'pc';
  return E;
}

/* ---------- once a release is out: the connection, the neighbours, the rights, the wear ---------- */
// views: what the release got; returns the views it really gets, and what happened (for the notifications).
function gearOnRelease(g, r, views, t = Date.now()) {
  const G = g.gear, out = { views, claim: false, notes: [] };
  if (!G || easyGear()) return out;
  const n = netNow(g, t);
  if (r.what === 'live') {
    const drop = NETS[n].drop + (G.net.hack > t ? 0.15 : 0);
    if (drop && Math.random() < drop) { out.views *= 0.75; out.notes.push('Ton live a coupé deux fois : des spectateurs sont partis.'); }
  }
  if (r.what === 'vidéo' && n === 'data') { out.views *= 0.9; out.notes.push('Mise en ligne en 4G pendant la coupure : ta vidéo est sortie en retard.'); }
  if (G.noisy > t && r.what !== 'short' && Math.random() < 0.15) { out.views *= 0.9; out.notes.push('Tes voisins ont fait un boucan pas possible pendant l’enregistrement : ça s’entend.'); }
  // background music without the sound bank: the rights holders may claim the money of the video (YouTube, Twitch)
  const pf = platformOf(g);
  if (!subOn(g, 'sons', t) && ((pf === 'youtube' && r.what === 'vidéo') || (pf === 'twitch' && r.what === 'live')) && Math.random() < 0.1) out.claim = true;
  out.views = Math.max(3, Math.round(out.views));
  return out;
}
// The gear used for a release wears out: a breakdown now and then (more on the cheap ones, more with age).
function usedKinds(g, what) {
  const G = g.gear, k = [];
  const filmed = what !== 'podcast';
  if (filmed) { if (usable(G.items.cam)) k.push('cam'); else k.push('phone'); if (usable(G.items.light)) k.push('light'); }
  if (usable(G.items.mic)) k.push('mic');
  if ((what === 'vidéo' || what === 'clip' || what === 'podcast') && usable(G.items.pc)) k.push('pc');
  return k;
}
function gearWear(g, r, t = Date.now()) {
  const G = g.gear;
  if (!G || easyGear() || r.legacy) return;
  for (const k of usedKinds(g, r.what)) {
    const it = G.items[k], age = Math.max(0, t - (it.at || t)) / (30 * DAY_MS);
    const p = (it.sp ? 0.002 : GEAR[k].wear[it.t]) * Math.min(2, 1 + 0.1 * age);
    if (Math.random() < p) { breakItem(g, k, 'use', t); return; } // one at a time
  }
  for (const x of G.extras) if (!x.broken && Math.random() < 0.003) { x.broken = 1; addNotif(g, { k: 'gear', text: `🔧 Ton ${newName(g, NEW_BY_ID[x.id]).toLowerCase()} est en panne.` }); return; }
}
const CRACK_WHY = ['L’objectif de ton téléphone s’est rayé', 'Tu as fait tomber ton téléphone : l’objectif est fissuré'];
function breakItem(g, k, why, t = Date.now()) {
  const G = g.gear, it = G.items[k];
  if (!it) return false;
  const name = it.sp ? newName(g, NEW_BY_ID[it.sp]) : gearName(g, k, it.t);
  if (k === 'phone') { // a phone never stops: it films worse until it is repaired
    if (it.crack) return false;
    it.crack = 1;
    addNotif(g, { k: 'gear', text: `📱 ${pick(CRACK_WHY)} : −6 % de vues sur ce que tu filmes avec, tant qu’il n’est pas réparé.` });
    return true;
  }
  if (it.broken) return false;
  it.broken = 1;
  it.fixAt = 0;
  const lines = {
    use: `🔧 Panne : ${name} (${kindLabel(g, k).toLowerCase()}) ne marche plus.`,
    drop: `💥 Tu as fait tomber ta caméra : ${name} est cassée.`,
  };
  addNotif(g, { k: 'gear', text: `${lines[why] || lines.use} ${k === 'pc' ? 'Plus de vidéos longues tant qu’il n’est pas réparé.' : 'Répare-la ou remplace-la dans ton Studio.'}` });
  return true;
}

/* ---------- money: buying, selling, repairing, subscribing ---------- */
const priceOf = (k, it) => (it && it.sp ? NEW_BY_ID[it.sp].price : GEAR[k].prices[it ? it.t : 0]);
// What the gear is worth new (the insurance covers that): about 0.25 % of it per month, 19 € at least.
const gearValue = (g) => { const G = g && g.gear; if (!G) return 0; let v = 0; for (const k of GEAR_KINDS) if (G.items[k]) v += priceOf(k, G.items[k]) || 0; for (const x of G.extras || []) v += NEW_BY_ID[x.id] ? NEW_BY_ID[x.id].price : 0; return v; };
const subPrice = (g, id) => (id === 'assur' ? Math.max(SUBS.assur.price, niceRound(gearValue(g) * 0.0025)) : SUBS[id].price);
// What the old one sells for, second hand (much less when it is broken).
const resaleOf = (k, it) => (it ? Math.round(priceOf(k, it) * (it.broken || it.virus ? 0.08 : it.sp ? 0.4 : 0.3) / 10) * 10 : 0);
function itemName(g, k, it) { return it.sp ? newName(g, NEW_BY_ID[it.sp]) : gearName(g, k, it.t); }
// 0.26: « acheté » as the name wants it (feminine, plural)
const boughtWord = (name) => 'acheté' + (/^(?:petite|caméra|webcam|station|lanterne|conque|unité|lumière)/i.test(name) ? 'e' : '') + (/^deux\b/i.test(name) ? 's' : '');
function swapItem(g, k, it, label) {
  const old = g.gear.items[k];
  g.gear.items[k] = it;
  const kept = old ? gearToInv(g, k, old, { how: 'ancien' }) : null; // 0.26: the old one waits in the inventory (to sell, or use again)
  addNotif(g, { k: 'gear', text: `🛒 ${label}${kept ? ' (ton ancien matos est dans ton inventaire)' : ''}.` });
  return kept;
}
function buyGear(g, k, t) {
  const G = g.gear, price = GEAR[k] && GEAR[k].prices[t];
  if (!G || !(price > 0)) return false;
  const cur = G.items[k];
  if (usable(cur) && !(cur.crack) && tierOfItem(cur) >= t) { toast(cur.sp || cur.t > t ? 'Tu as déjà mieux.' : 'Tu l’as déjà.'); return false; }
  if (!pay(g, price, `Achat : ${gearName(g, k, t).toLowerCase()}`, 'gear')) { toast(`Il te faut ${fmtMoney(g, price)} (tu as ${fmtMoney(g, g.career.cash)}).`, 'bad'); return false; }
  swapItem(g, k, mkItem(t), `${gearName(g, k, t)} ${boughtWord(gearName(g, k, t))} : ${fmtMoney(g, price)}`);
  addChronicle(g, `${g.player.name} s’est offert du matos : ${gearName(g, k, t).toLowerCase()}.`);
  if (t >= 3) addTrigger(g, `Le joueur vient de s’offrir du matériel haut de gamme (${gearName(g, k, t).toLowerCase()}, ${fmtMoney(g, price)}) : certains sont impressionnés, d’autres trouvent qu’il frime.`);
  return true;
}
function buyNew(g, id) {
  const G = g.gear, X = NEW_BY_ID[id];
  if (!G || !X || NEW_GEAR.indexOf(X) >= G.launch.n) return false;
  if (X.kind === 'extra' ? G.extras.some((x) => x.id === id) : G.items[X.kind] && G.items[X.kind].sp === id) { toast('Tu l’as déjà.'); return false; }
  if (!pay(g, X.price, `Achat : ${newName(g, X)}`, 'gear')) { toast(`Il te faut ${fmtMoney(g, X.price)} (tu as ${fmtMoney(g, g.career.cash)}).`, 'bad'); return false; }
  if (X.kind === 'extra') { G.extras.push({ id, at: Date.now(), broken: 0 }); addNotif(g, { k: 'gear', text: `🛒 ${newName(g, X)} acheté : ${fmtMoney(g, X.price)}.` }); }
  else swapItem(g, X.kind, Object.assign(mkItem(3), { sp: id }), `${newName(g, X)} : ${fmtMoney(g, X.price)}`);
  addChronicle(g, `${g.player.name} a craqué pour la nouveauté du moment : ${newName(g, X)}.`);
  addTrigger(g, `Le joueur s’est offert la grosse nouveauté du moment, ${newName(g, X)} (${fmtMoney(g, X.price)}) : ça fait parler, entre admiration, jalousie et « il a trop d’argent ».`);
  return true;
}
// A repair: the regular one takes a day or three; express, now, twice the price. Insured: the franchise.
function repairCost(g, k, express) {
  const it = g.gear.items[k];
  if (!it) return 0;
  if (k === 'phone') { const c = [40, 90, 160, 280][it.t]; return subOn(g, 'assur') ? Math.min(c, FRANCHISE) : c; }
  const base = niceRound(priceOf(k, it) * 0.3);
  const c = subOn(g, 'assur') ? Math.min(base, franchiseOf(priceOf(k, it))) : base;
  return express ? c * 2 : c;
}
function repairGear(g, k, express) {
  const it = g.gear && g.gear.items[k];
  if (!it || !(it.broken || it.crack)) return false;
  if (it.fixAt && !express) return false;
  const cost = repairCost(g, k, express);
  if (!pay(g, cost, `Réparation : ${itemName(g, k, it).toLowerCase()}${express ? ' (express)' : ''}`, 'repair')) { toast(`Il te faut ${fmtMoney(g, cost)}.`, 'bad'); return false; }
  if (k === 'phone') { it.crack = 0; toast('Téléphone réparé.', 'good'); return true; }
  if (express) { it.broken = 0; it.fixAt = 0; toast(`${itemName(g, k, it)} réparé${k === 'cam' || k === 'light' ? 'e' : ''}.`, 'good'); }
  else { it.fixAt = Date.now() + randi(1, 3) * DAY_MS; toast(`Chez le réparateur : retour ${fmtWhen(it.fixAt)}.`); }
  return true;
}
const repairExtra = (g, x) => { const X = NEW_BY_ID[x.id], cost = subOn(g, 'assur') ? franchiseOf(X.price) : niceRound(X.price * 0.25); if (!pay(g, cost, `Réparation : ${newName(g, X).toLowerCase()}`, 'repair')) { toast(`Il te faut ${fmtMoney(g, cost)}.`, 'bad'); return false; } x.broken = 0; return true; };
// The other fixes: cleaning an overheating computer, a virus, the wifi pirated, the neighbours, the box after a storm.
const FIXES = {
  hot: { cost: 40, label: 'Nettoyer l’ordinateur', run: (G) => { G.items.pc.hot = 0; } },
  virus: { cost: 60, label: 'Le faire désinfecter', run: (G) => { G.items.pc.virus = 0; } },
  virusSelf: { cost: 0, label: 'Tout réinstaller toi-même (un jour)', run: (G) => { G.items.pc.virusEnd = Date.now() + DAY_MS; } },
  hack: { cost: 0, label: 'Changer le mot de passe du wifi', run: (G) => { G.net.hack = 0; } },
  noisy: { cost: NOISE_FIX, label: 'Isoler ta pièce', run: (G) => { G.noisy = 0; } },
  storm: { cost: 90, label: 'Dépannage express', run: (G) => { G.net.out = 0; G.net.outWhy = ''; G.net.storm = 0; } },
};
function fixGear(g, id) {
  const F = FIXES[id], G = g.gear;
  if (!F || !G) return false;
  if (F.cost && !pay(g, F.cost, F.label, 'repair')) { toast(`Il te faut ${fmtMoney(g, F.cost)}.`, 'bad'); return false; }
  F.run(G);
  update();
  return true;
}
// Subscriptions: the first month pro rata (and the fibre's installation once), then at each game month.
const daysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
function firstBill(price, t = Date.now()) { const d = gameDate(t), n = daysInMonth(d); return Math.max(1, Math.round(price * (n - d.getDate() + 1) / n)); }
function subOffer(g, id) { // what subscribing costs now: { first, install, ok, why }
  const G = g.gear, X = SUBS[id];
  if (!G || !X) return { ok: false };
  if (X.fibre && !G.net.fibreOk) return { ok: false, why: 'La fibre n’est pas encore arrivée dans ta rue.' };
  if (id === 'fibre' && G.net.base === 'fibre') return { ok: false, why: 'Tu as déjà la fibre.' };
  const hasFibre = G.net.base === 'fibre' || subOn(g, 'fibre') || subOn(g, 'fibrepro');
  const install = X.install && !hasFibre && !G.freeInstall ? X.install : 0;
  return { ok: true, first: firstBill(subPrice(g, id)), install };
}
function subscribe(g, id) {
  const G = g.gear, X = SUBS[id], o = subOffer(g, id);
  if (!o.ok) { if (o.why) toast(o.why, 'bad'); return false; }
  if (G.subs[id] && G.subs[id].on && !G.subs[id].cut) return false;
  const total = o.first + o.install;
  if (!pay(g, total, `${subName(g, id)} : premier mois${o.install ? ' et installation' : ''}`, 'sub')) { toast(`Il te faut ${fmtMoney(g, total)}.`, 'bad'); return false; }
  const t = Date.now();
  const wasFibre = G.net.base === 'fibre' || subOn(g, 'fibre') || subOn(g, 'fibrepro');
  if (X.net) for (const k of NET_SUBS) if (k !== id && G.subs[k] && G.subs[k].on) G.subs[k].on = false; // one box at a time
  const days = X.days && !wasFibre ? randi(X.days[0], X.days[1]) : 0;
  G.subs[id] = { on: true, since: t, cut: 0, installAt: days ? t + days * DAY_MS : 0 };
  if (o.install) G.freeInstall = 0;
  if (X.net && G.flaky && id !== 'box5g') G.flaky = 0; // the old box goes back
  addNotif(g, { k: 'gear', text: `${X.emoji} ${subName(g, id)} : ${days ? `installation ${fmtWhen(G.subs[id].installAt)}` : 'c’est branché'} (${fmtMoney(g, subPrice(g, id))} par mois${o.install ? `, ${fmtMoney(g, o.install)} d’installation` : ''}).` });
  return true;
}
function unsubscribe(g, id) {
  const s = g.gear && g.gear.subs[id];
  if (!s || !s.on) return false;
  s.on = false;
  s.cut = 0;
  addNotif(g, { k: 'gear', text: `${SUBS[id].emoji} ${subName(g, id)} : abonnement résilié.` });
  return true;
}
// A suspended subscription comes back once the bill is paid.
function payCut(g, id) {
  const s = g.gear && g.gear.subs[id], X = SUBS[id];
  if (!s || !s.on || !s.cut) return false;
  const price = subPrice(g, id);
  if (!pay(g, price, `${subName(g, id)} : facture en retard`, 'sub')) { toast(`Il te faut ${fmtMoney(g, price)}.`, 'bad'); return false; }
  s.cut = 0;
  toast(`${subName(g, id)} : c’est rétabli.`, 'good');
  return true;
}
const monthlyCost = (g) => Object.keys((g.gear && g.gear.subs) || {}).reduce((n, id) => n + (g.gear.subs[id].on ? subPrice(g, id) : 0), 0) + (g.gear && g.gear.debt && g.gear.debt.left > 0 ? g.gear.debt.amount : 0);

/* ---------- the clock: bills, installations, repairs, launches, the random events ---------- */
// At each game month (after the platform's payout): the subscriptions, and the loan of a bad start.
function billGear(g, t) {
  const G = g.gear;
  if (!G) return false;
  const key = monthKey(gameDate(t));
  if (G.bill === key) return false;
  const month = monthOfKey(key); // the month that starts (the first one was paid at signup, pro rata)
  G.bill = key;
  if (easyGear()) return false;
  let total = 0;
  const cut = [];
  for (const id of Object.keys(G.subs)) {
    const s = G.subs[id];
    if (!s.on) continue;
    if (s.cut) { if (t - s.cut > 20 * DAY_MS) { s.on = false; s.cut = 0; addNotif(g, { k: 'gear', text: `${SUBS[id].emoji} ${subName(g, id)} : résilié pour impayé.` }); } continue; }
    if (s.installAt > t) continue; // not installed yet: not billed
    const price = subPrice(g, id);
    if (pay(g, price, `${subName(g, id)} (${month})`, 'sub')) total += price;
    else { s.cut = t; cut.push(subName(g, id)); }
  }
  if (G.debt && G.debt.left > 0) { charge(g, G.debt.amount, `Remboursement du prêt (${month})`, 'sub'); total += G.debt.amount; G.debt.left--; }
  if (total) addNotif(g, { k: 'gear', text: `🧾 Prélèvements ${deMonth(month)} : ${fmtMoney(g, total)}.` });
  if (cut.length) addNotif(g, { k: 'gear', text: `⚠️ Pas assez d’argent pour payer : ${cut.join(', ')}. ${cut.length > 1 ? 'Suspendus' : 'Suspendu'} jusqu’à ce que tu règles la facture.` });
  return true;
}
function launchGear(g, t) {
  const G = g.gear, X = NEW_GEAR[G.launch.n];
  G.launch.next = nextLaunchAt(t + DAY_MS);
  if (!X) return false;
  G.launch.n++;
  addNotif(g, { k: 'gear', text: `✨ Nouveauté : ${newName(g, X)} (${fmtMoney(g, X.price)}). ${X.fx}` });
  const at = t + randi(3000, 9000);
  addAmbientPost(g, { by: 'labo.matos', name: 'Le Labo Matos', bio: 'teste le matos des créateurs, sans filtre', text: `${X.emoji} ${newName(g, X)} est sorti${X.kind === 'cam' || X.kind === 'light' ? 'e' : ''}. Notre avis : ${X.fx.replace(/\.$/, '')}. Le prix, par contre : ${fmtMoney(g, X.price)}. Qui va craquer ?` }, at, at);
  addTrigger(g, `Grosse nouveauté pour les créateurs : ${newName(g, X)} vient de sortir (${fmtMoney(g, X.price)}). Certains en rêvent, d’autres crient au scandale du prix.`);
  queueModalFor(g, { t: 'gear', what: 'launch', id: X.id });
  return true;
}
// The random events, rolled for each game hour that went by (a time skip catches up, at most three days).
const EVENTS = { // per game day
  storm: 0.004, hot: 0.012, virus: 0.006, drop: 0.006, crack: 0.008, theft: 0.0015, hack: 0.006,
};
function gearBusy(g, t) { const r = activeRelease(g); return !!(r && (r.played || r.due - t < 30 * 60000)); } // never in the middle of a release
function rollGearHour(g, th, t, quiet) {
  const G = g.gear, p = (x) => Math.random() < x / 24;
  const net = G.net.out > th ? '' : netNow(g, th);
  // an outage: only told when it is still on
  if (net && net !== 'data') {
    const N = NETS[net];
    if (p(N.out * (G.flaky && net === G.net.base ? 2 : 1))) {
      const end = th + rand(N.outH[0], N.outH[1]) * 3600000;
      if (end > t) { G.net.out = end; G.net.outWhy = pick(['Coupure internet', 'Panne chez ton opérateur', 'Coupure pour travaux dans ta rue', 'Panne de courant dans le quartier']); addNotif(g, { k: 'gear', text: `📵 ${G.net.outWhy} : retour estimé ${fmtWhen(end, t)}. Pas de live d’ici là.` }); return true; }
      return false;
    }
    if (net !== 'fibrepro' && p(EVENTS.storm)) {
      const end = th + randi(1, 3) * DAY_MS;
      if (end > t) { G.net.out = end; G.net.outWhy = 'Ta box a grillé pendant l’orage'; G.net.storm = 1; addNotif(g, { k: 'gear', text: `⛈️ Ta box a grillé pendant l’orage : l’opérateur en envoie une autre, retour ${fmtWhen(end, t)}. Un dépannage express coûte ${fmtMoney(g, FIXES.storm.cost)}.` }); return true; }
      return false;
    }
    if (G.net.hack < th && p(EVENTS.hack)) { G.net.hack = th + 5 * DAY_MS; if (G.net.hack > t) { addNotif(g, { k: 'gear', text: '📶 Quelqu’un pirate ton wifi : ta connexion rame, tes lives risquent de couper. Change ton mot de passe.' }); return true; } }
  }
  if (quiet) return false; // in a time skip, at most one breakage
  const pc = G.items.pc, cam = G.items.cam;
  if (usable(pc) && !pc.hot && p(EVENTS.hot * (pc.t === 0 && !pc.sp ? 2 : 1))) { pc.hot = 1; addNotif(g, { k: 'gear', text: '🔥 Ton ordinateur surchauffe : il plante deux fois plus souvent au montage. Un nettoyage s’impose.' }); return 'break'; }
  if (usable(pc) && p(EVENTS.virus)) { pc.virus = 1; addNotif(g, { k: 'gear', text: '🦠 Un virus sur ton ordinateur : il est inutilisable. Fais-le désinfecter, ou réinstalle tout toi-même (un jour).' }); return 'break'; }
  if (usable(cam) && p(EVENTS.drop)) { breakItem(g, 'cam', 'drop', t); return 'break'; }
  if (G.items.phone && !G.items.phone.crack && p(EVENTS.crack)) { breakItem(g, 'phone', 'drop', t); return 'break'; }
  if ((usable(pc) || usable(cam)) && p(EVENTS.theft)) { theft(g, t); return 'break'; }
  return false;
}
// A burglary: the most expensive of the computer and the camera is gone (insured: replaced for the franchise).
function theft(g, t) {
  const G = g.gear;
  const k = ['pc', 'cam'].filter((x) => G.items[x]).sort((a, b) => priceOf(b, G.items[b]) - priceOf(a, G.items[a]))[0];
  if (!k) return;
  const it = G.items[k], name = itemName(g, k, it);
  if (subOn(g, 'assur', t)) {
    const fr = franchiseOf(priceOf(k, it));
    charge(g, fr, `Franchise de l’assurance (vol : ${name.toLowerCase()})`, 'repair');
    Object.assign(it, { broken: 0, fixAt: 0, hot: 0, virus: 0, at: t });
    addNotif(g, { k: 'gear', text: `🚨 Cambriolage : on t’a volé ${name.toLowerCase()}. L’assurance le remplace (franchise ${fmtMoney(g, fr)}).` });
  } else {
    G.items[k] = null;
    addNotif(g, { k: 'gear', text: `🚨 Cambriolage : on t’a volé ${name.toLowerCase()}. Sans assurance, il faudra le racheter.` });
    queueModalFor(g, { t: 'gear', what: 'theft', kind: k, name });
  }
  addChronicle(g, `${g.player.name} s’est fait cambrioler : ${name.toLowerCase()} volé${k === 'cam' ? 'e' : ''}.`);
  addTrigger(g, `Le joueur s’est fait cambrioler chez lui : on lui a volé son matériel (${name.toLowerCase()}). Certains le soutiennent, d’autres se demandent comment il va faire ses vidéos.`);
}
function tickGear(g, t = Date.now()) {
  const G = g.gear;
  if (!G) return false;
  let ch = false;
  for (const id of Object.keys(G.subs)) { const s = G.subs[id]; if (s.on && s.installAt && t >= s.installAt) { s.installAt = 0; addNotif(g, { k: 'gear', text: `${SUBS[id].emoji} ${subName(g, id)} : c’est installé, et ça marche.` }); ch = true; } }
  for (const k of GEAR_KINDS) {
    const it = G.items[k];
    if (it && it.fake && t >= it.fake) { // 0.21: a fake offered by a brand: it dies after a few days, beyond repair
      G.items[k] = k === 'phone' ? mkItem(0) : null;
      addNotif(g, { k: 'gear', text: `🪤 ${itemName(g, k, it)} : une contrefaçon. ${k === 'phone' ? 'Il a lâché au bout de quelques jours : tu ressors ton vieux téléphone.' : 'Il a lâché au bout de quelques jours, irréparable.'}` });
      ch = true;
      continue;
    }
    if (it && it.fixAt && t >= it.fixAt) { it.fixAt = 0; it.broken = 0; addNotif(g, { k: 'gear', text: `🔧 ${itemName(g, k, it)} est de retour de réparation.` }); ch = true; }
    if (it && it.virusEnd && t >= it.virusEnd) { it.virusEnd = 0; it.virus = 0; addNotif(g, { k: 'gear', text: '💻 Tout est réinstallé : ton ordinateur repart.' }); ch = true; }
  }
  if (G.net.out && t >= G.net.out) { G.net.out = 0; G.net.outWhy = ''; G.net.storm = 0; addNotif(g, { k: 'gear', text: '📶 La connexion est revenue.' }); ch = true; }
  if (G.net.hack && t >= G.net.hack) { G.net.hack = 0; ch = true; }
  if (!G.net.fibreOk && G.net.fibreAt && t >= G.net.fibreAt) { G.net.fibreOk = true; G.net.fibreAt = 0; addNotif(g, { k: 'gear', text: '🌐 La fibre arrive enfin dans ta rue : tu peux t’abonner.' }); ch = true; }
  if (G.noisy && t >= G.noisy) { G.noisy = 0; addNotif(g, { k: 'gear', text: '🔇 Tes voisins bruyants ont déménagé. Enfin le calme.' }); ch = true; }
  if (t >= G.launch.next) { launchGear(g, t); ch = true; }
  if (easyGear() || (typeof window !== 'undefined' && window.__hypeNoGearEvents)) { G.rollAt = t; return ch; } // (a suite that skips days and wants no surprise)
  const hours = Math.floor((t - (G.rollAt || t)) / 3600000);
  if (hours >= 1) {
    const from = G.rollAt, n = Math.min(hours, 72), busy = gearBusy(g, t);
    G.rollAt = from + hours * 3600000;
    let broke = false;
    for (let h = hours - n; h < hours; h++) {
      const r = rollGearHour(g, from + (h + 1) * 3600000, t, broke || busy);
      if (r) ch = true;
      if (r === 'break') broke = true;
    }
  }
  return ch;
}

/* ---------- the screens: the Studio's « Ton matos », the shop, the start ---------- */
// What is wrong right now, and how to fix it: [{ id, text, acts: [{ label, run }] }].
function gearIssues(g, now) {
  const G = g.gear, out = [];
  if (!G) return out;
  for (const k of GEAR_KINDS) {
    const it = G.items[k];
    if (!it) continue;
    const name = itemName(g, k, it);
    if (k === 'phone' && it.crack) out.push({ id: 'crack', text: `${GEAR.phone.emoji} Objectif rayé : −6 % de vues sur ce que tu filmes au téléphone.`, acts: [{ label: `Réparer · ${fmtMoney(g, repairCost(g, k))}`, run: () => repairGear(g, k) }] });
    if (k !== 'phone' && it.broken) out.push({ id: 'broken-' + k, text: it.fixAt ? `${GEAR[k].emoji} ${name} : chez le réparateur, retour ${fmtWhen(it.fixAt, now)}.` : `${GEAR[k].emoji} ${name} : en panne.`,
      acts: (it.fixAt ? [] : [{ label: `Réparer · ${fmtMoney(g, repairCost(g, k))}`, run: () => repairGear(g, k) }]).concat([{ label: `Express · ${fmtMoney(g, repairCost(g, k, true))}`, run: () => repairGear(g, k, true) }]) });
    if (k === 'pc' && it.hot) out.push({ id: 'hot', text: '🔥 Ton ordinateur surchauffe : il plante deux fois plus souvent.', acts: [{ label: `${FIXES.hot.label} · ${fmtMoney(g, FIXES.hot.cost)}`, run: () => fixGear(g, 'hot') }] });
    if (k === 'pc' && it.virus) out.push({ id: 'virus', text: it.virusEnd ? `🦠 Tu réinstalles tout : ton ordinateur repart ${fmtWhen(it.virusEnd, now)}.` : '🦠 Un virus bloque ton ordinateur.', acts: it.virusEnd ? [] : [{ label: `${FIXES.virus.label} · ${fmtMoney(g, FIXES.virus.cost)}`, run: () => fixGear(g, 'virus') }, { label: FIXES.virusSelf.label, run: () => fixGear(g, 'virusSelf') }] });
  }
  for (const x of G.extras) if (x.broken) { const X = NEW_BY_ID[x.id]; out.push({ id: 'x-' + x.id, text: `${X.emoji} ${newName(g, X)} : en panne.`, acts: [{ label: `Réparer · ${fmtMoney(g, subOn(g, 'assur') ? franchiseOf(X.price) : niceRound(X.price * 0.25))}`, run: () => repairExtra(g, x) }] }); }
  if (G.net.out > now) out.push({ id: 'out', text: `📵 ${G.net.outWhy || 'Coupure internet'} : retour ${fmtWhen(G.net.out, now)}. Pas de live d’ici là.`, acts: G.net.storm ? [{ label: `${FIXES.storm.label} · ${fmtMoney(g, FIXES.storm.cost)}`, run: () => fixGear(g, 'storm') }] : [] });
  if (G.net.hack > now) out.push({ id: 'hack', text: '📶 Quelqu’un pirate ton wifi : tes lives risquent de couper.', acts: [{ label: FIXES.hack.label, run: () => fixGear(g, 'hack') }] });
  if (G.noisy > now) out.push({ id: 'noisy', text: '🔊 Des voisins très bruyants : tes enregistrements en pâtissent parfois.', acts: [{ label: `${FIXES.noisy.label} · ${fmtMoney(g, FIXES.noisy.cost)}`, run: () => fixGear(g, 'noisy') }] });
  for (const id of Object.keys(G.subs)) { const s = G.subs[id]; if (s.on && s.cut) out.push({ id: 'cut-' + id, text: `⚠️ ${subName(g, id)} : suspendu (facture impayée).`, acts: [{ label: `Régler · ${fmtMoney(g, subPrice(g, id))}`, run: () => payCut(g, id) }, { label: 'Résilier', run: () => unsubscribe(g, id) }] }); }
  return out;
}
function gearLine(g, k, it) {
  if (!it) return { name: { pc: `Pas ${WORLD_GEAR[g.world.preset] ? 'de ' + kindLabel(g, 'pc').toLowerCase() : 'd’ordinateur'}`, cam: `Pas de ${kindLabel(g, 'cam').toLowerCase()}`, mic: `Pas de ${kindLabel(g, 'mic').toLowerCase()}`, light: `Pas de ${kindLabel(g, 'light').toLowerCase()}` }[k],
    fx: { pc: 'pas de vidéos longues', cam: 'tu filmes au téléphone', mic: 'le son du téléphone', light: 'la lumière du jour' }[k] };
  const t = tierOfItem(it), X = it.sp ? NEW_BY_ID[it.sp] : null;
  const fx = k === 'pc' ? `montage ${['laborieux', 'correct', 'facile', 'très facile'][t]}, ${Math.round(PC_EDIT[t].crash * 100) || '< 1'} % de plantages${GEAR.pc.views[t] ? `, ${fmtPct(GEAR.pc.views[t])} de vues` : ''}`
    : k === 'phone' ? viewsWord(GEAR.phone.views[t], 'sur ce que tu filmes avec')
      : viewsWord(GEAR[k].views[t]);
  return { name: X ? newName(g, X) : gearName(g, k, t), tier: X ? 'Nouveauté' : TIER_LABELS[t], fx: X ? `${fx} · ${X.fx}` : fx, bad: !usable(it) || (k === 'phone' && it.crack) };
}
function GearSection({ g, now }) {
  const G = g.gear;
  if (!G) return null;
  const n = netNow(g, now), month = monthlyCost(g), issues = gearIssues(g, now);
  const pending = NET_SUBS.find((id) => G.subs[id] && G.subs[id].on && G.subs[id].installAt > now);
  const fmts = PF(g).fmts.filter((f) => !canMake(g, f, now).ok);
  const act = (a) => () => { if (a.run() !== false) update(); };
  return html`<section class="section gear-sec">
    <div class="section-h"><h3>Ton matos</h3><span>${month ? `${fmtMoney(g, month)} par mois` : 'pas d’abonnement'}</span></div>
    <div class="gear-list">
      ${GEAR_KINDS.map((k) => { const it = G.items[k], L = gearLine(g, k, it); return html`<div key=${k} class=${'gear-row' + (it ? '' : ' none') + (L.bad ? ' bad' : '')}>
        <span class="gr-emo" aria-hidden="true">${GEAR[k].emoji}</span><div><b>${L.name}</b><small>${L.tier ? L.tier + ' · ' : ''}${L.fx}</small></div></div>`; })}
      ${G.extras.map((x) => { const X = NEW_BY_ID[x.id]; return html`<div key=${x.id} class=${'gear-row' + (x.broken ? ' bad' : '')}><span class="gr-emo" aria-hidden="true">${X.emoji}</span><div><b>${newName(g, X)}</b><small>Nouveauté · ${X.fx}</small></div></div>`; })}
      <div class=${'gear-row net' + (n === 'data' ? ' bad' : '')}><span class="gr-emo" aria-hidden="true">${NETS[n].emoji}</span><div><b>${netName(g, n)}</b><small>${NETS[n].live ? (NETS[n].drop ? `lives possibles (${Math.round(NETS[n].drop * 100)} % de risque qu’un live coupe)` : 'lives fluides') : 'pas de live'}${pending ? ` · ${subName(g, pending)} : installation ${fmtWhen(G.subs[pending].installAt, now)}` : ''}${!G.net.fibreOk ? ' · la fibre n’est pas encore arrivée chez toi' : ''}</small></div></div>
    </div>
    ${issues.map((x) => html`<div class="gear-issue" key=${x.id}><span>${x.text}</span>${x.acts.length ? html`<div class="row">${x.acts.map((a, j) => html`<button key=${j} class=${'btn btn-sm ' + (j ? 'btn-ghost' : 'btn-hot')} onClick=${act(a)}>${a.label}</button>`)}</div>` : null}</div>`)}
    ${fmts.length ? html`<ul class="gear-cant">${fmts.map((f) => html`<li key=${f}><b>${f === 'vidéo' ? 'Vidéos longues' : f === 'live' ? 'Lives' : cap1(f)}</b> : ${canMake(g, f, now).why}</li>`)}</ul>` : null}
    ${G.debt && G.debt.left > 0 ? html`<p class="muted gear-note">Prêt : ${fmtMoney(g, G.debt.amount)} par mois, encore ${G.debt.left} ${plural(G.debt.left, 'mois', 'mois')}.</p>` : null}
    <div class="row"><button class="btn btn-hot btn-sm" onClick=${() => openLayer({ t: 'gear' })}><${Icon} n="cart" s=${15} /> Boutique</button>
      ${month ? html`<small class="muted">Prochain prélèvement ${fmtWhen(nextMonthAt(now), now)}.</small>` : null}</div>
  </section>`;
}
function nextMonthAt(t = Date.now()) { const d = gameDate(t), at = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0); return t + (at - d); }
// The shop: the gear at every tier, what came out every six months, the subscriptions.
function GearShopLayer({ g, now, i }) {
  const [tab, setTab] = useState('matos');
  const G = g.gear, cash = g.career.cash;
  const buy = (fn) => () => { if (fn()) update(); };
  const card = (key, o) => html`<div key=${key} class=${'shop-card' + (o.own ? ' own' : '') + (o.dim ? ' dim' : '')}>
    <div class="sc-head"><span aria-hidden="true">${o.emoji}</span><div><b>${o.name}</b><small>${o.tier}</small></div><b class="sc-price">${o.price}</b></div>
    <p>${o.fx}</p>
    ${o.own ? html`<span class="chip good">${o.own}</span>` : html`<button class="btn btn-hot btn-sm" disabled=${!!o.off} onClick=${buy(o.run)}>${o.label || 'Acheter'}</button>${o.off ? html`<small class="muted">${o.off}</small>` : null}`}
  </div>`;
  let body;
  if (tab === 'matos') {
    body = GEAR_KINDS.map((k) => { const cur = G.items[k], ct = usable(cur) && !(cur.crack) ? tierOfItem(cur) : -1; return html`<section class="section" key=${k}>
      <div class="section-h"><h3>${GEAR[k].emoji} ${kindLabel(g, k)}</h3><span>${cur ? itemName(g, k, cur) : 'rien pour l’instant'}</span></div>
      <div class="shop-grid">${[0, 1, 2, 3].filter((t) => GEAR[k].prices[t] > 0).map((t) => { const p = GEAR[k].prices[t], L = gearLine(g, k, mkItem(t));
        return card(k + t, { emoji: GEAR[k].emoji, name: L.name, tier: TIER_LABELS[t], price: fmtMoney(g, p), fx: L.fx, own: ct === t && !cur.sp ? 'Tu l’as' : ct > t ? 'Tu as mieux' : '', off: cash < p ? `Il te manque ${fmtMoney(g, p - cash)}` : '', run: () => buyGear(g, k, t) }); })}</div>
    </section>`; });
  } else if (tab === 'news') {
    const out = NEW_GEAR.slice(0, G.launch.n).reverse();
    const nd = gameDate(G.launch.next);
    body = html`<section class="section"><p class="muted">Tous les six mois, une nouveauté sort avec un bonus jamais vu. Elle remplace ton matos du même type (et compte comme du haut de gamme), ou s’ajoute au reste.</p>
      <div class="shop-grid">${out.map((X) => { const own = X.kind === 'extra' ? G.extras.some((x) => x.id === X.id) : G.items[X.kind] && G.items[X.kind].sp === X.id;
        return card(X.id, { emoji: X.emoji, name: newName(g, X), tier: X.kind === 'extra' ? 'En plus du reste' : `Remplace : ${kindLabel(g, X.kind).toLowerCase()}`, price: fmtMoney(g, X.price), fx: X.fx, own: own ? 'Tu l’as' : '', off: cash < X.price ? `Il te manque ${fmtMoney(g, X.price - cash)}` : '', run: () => buyNew(g, X.id) }); })}
        ${NEW_GEAR[G.launch.n] ? html`<div class="shop-card dim next"><div class="sc-head"><span aria-hidden="true">❔</span><div><b>Prochaine nouveauté</b><small>le 1er ${MONTHS[nd.getMonth()]} ${nd.getFullYear()}</small></div></div><p>Personne ne sait encore ce qu’elle fera.</p></div>` : null}</div></section>`;
  } else {
    const subCard = (id) => { const X = SUBS[id], s = G.subs[id], on = !!(s && s.on), o = subOffer(g, id);
      return card(id, { emoji: X.emoji, name: subName(g, id), tier: `${fmtMoney(g, subPrice(g, id))} par mois${o.install ? ` · installation ${fmtMoney(g, o.install)}` : ''}`, price: '', fx: X.desc,
        own: on ? (s.cut ? 'Suspendu (impayé)' : s.installAt > now ? `Installation ${fmtWhen(s.installAt, now)}` : 'Abonné·e') : '', off: !o.ok ? o.why || 'Indisponible' : cash < o.first + o.install ? `Il te faut ${fmtMoney(g, o.first + o.install)}` : '',
        label: o.ok ? `S’abonner · ${fmtMoney(g, o.first + (o.install || 0))} maintenant` : 'Pas disponible', run: () => subscribe(g, id) }); };
    const mine = Object.keys(G.subs).filter((id) => G.subs[id].on);
    body = html`<section class="section"><div class="section-h"><h3>Connexion</h3><span>${netName(g, netNow(g, now))}</span></div>
        <p class="muted">Chez toi : ${netName(g, G.net.base)}${G.start.net === G.net.base || G.start.legacy ? ' (ta box perso, déjà payée)' : ''}. ${G.net.fibreOk ? '' : 'La fibre n’est pas encore arrivée dans ta rue.'}</p>
        <div class="shop-grid">${NET_SUBS.slice().reverse().filter((id) => !(id === 'fibre' && G.net.base === 'fibre')).map(subCard)}</div></section>
      <section class="section"><div class="section-h"><h3>Logiciels et assurance</h3><span>résiliables à tout moment</span></div><div class="shop-grid">${['montage', 'sons', 'assur'].map(subCard)}</div></section>
      ${mine.length ? html`<section class="section"><div class="section-h"><h3>Tes abonnements</h3><span>${fmtMoney(g, monthlyCost(g))} par mois</span></div>
        ${mine.map((id) => html`<div class="kv" key=${id}><span>${SUBS[id].emoji} ${subName(g, id)} · ${fmtMoney(g, subPrice(g, id))} / mois</span><button class="linkbtn quiet" onClick=${() => askConfirm({ title: `Résilier ${subName(g, id)} ?`, text: SUBS[id].net ? 'Tu retombes sur ta connexion d’avant.' : 'Tu perds ce qu’il t’apporte dès maintenant.', ok: 'Résilier', danger: true, run: () => { unsubscribe(g, id); update(); } })}>Résilier</button></div>`)}</section>` : null}`;
  }
  return html`<${LayerShell} i=${i} title="Boutique matos">
    <div class="shop-head">
      <div class="shop-top"><span>En banque</span><b class=${cash < 0 ? 'neg' : ''}>${fmtMoney(g, cash)}</b></div>
      <${Seg} items=${[['matos', 'Matos'], ['news', 'Nouveautés'], ['subs', 'Abonnements']]} value=${tab} onPick=${setTab} label="Rayon" />
    </div>
    ${body}
  <//>`;
}
// The cards: the start of the game, a launch, a theft.
function GearModal({ m, g, close }) {
  const G = g.gear;
  if (!G) return null;
  if (m.what === 'start') {
    const st = G.start, ph = G.items.phone, perk = PERKS.find((x) => x.id === st.perk), flaw = FLAWS.find((x) => x.id === st.flaw);
    const vid = canMake(g, 'vidéo').ok, live = canMake(g, 'live').ok;
    return html`<div class="modal-card start-card">
      <span class="eyebrow">Ton point de départ</span>
      <div class="modal-big" aria-hidden="true">🎲</div>
      <p class="muted">Chaque partie démarre autrement.</p>
      <ul class="start-list">
        <li><span aria-hidden="true">${GEAR.phone.emoji}</span><span><b>${gearName(g, 'phone', st.phone == null ? ph.t : st.phone)}</b> : ${['tes formats verticaux passent, en moins beau', 'de quoi filmer tes formats verticaux', 'de belles images pour tes formats verticaux', 'des images superbes'][ph.t]}${GEAR.phone.views[ph.t] ? ` (${fmtPct(GEAR.phone.views[ph.t])} de vues)` : ''}.</span></li>
        <li><span aria-hidden="true">${NETS[G.net.base].emoji}</span><span><b>${netName(g, G.net.base)}</b> : ${NETS[G.net.base].live ? (G.net.base === 'fibre' ? 'des lives fluides' : 'des lives possibles, avec des coupures') : 'pas de live tant que tu n’as pas mieux'}${G.net.base !== 'fibre' ? (G.net.fibreOk ? '. La fibre est disponible chez toi.' : '. La fibre n’est pas encore arrivée dans ta rue.') : '.'}</span></li>
        ${g.player.start === 'anon' ? html`<li><span aria-hidden="true">💶</span><span><b>${fmtMoney(g, st.savings)} d’économies</b> : ${st.savings >= 400 ? 'de quoi t’offrir ton premier matos' : st.savings ? 'pas grand-chose, mais c’est un début' : 'rien de côté : tout reste à gagner'}.</span></li>` : null}
        ${GEAR_KINDS.filter((k) => k !== 'phone' && G.items[k]).length ? html`<li><span aria-hidden="true">🧰</span><span><b>Déjà chez toi</b> : ${GEAR_KINDS.filter((k) => k !== 'phone' && G.items[k]).map((k) => gearName(g, k, G.items[k].t).toLowerCase()).join(', ')}.</span></li>` : null}
        ${perk ? html`<li class="good"><span aria-hidden="true">✨</span><span><b>Atout</b> : ${perk.text(g)}</span></li>` : null}
        ${flaw ? html`<li class="bad"><span aria-hidden="true">⚠️</span><span><b>Handicap</b> : ${flaw.text(g)}</span></li>` : null}
      </ul>
      <p>${vid ? (live ? 'Tu peux tout faire dès maintenant.' : 'Tout est possible, sauf les lives.') : `Pour l’instant : ${PF(g).fmts.includes('short') ? 'des formats verticaux' : 'ce que ton téléphone permet'}${live && PF(g).fmts.includes('live') ? ' et des lives' : ''}. Il te faudra un ordinateur pour les vidéos longues.`}</p>
      <button class="btn btn-hot" onClick=${close}>C’est parti</button>
      <button class="linkbtn" onClick=${() => { close(); goTab('studio'); }}>Voir mon matos</button>
    </div>`;
  }
  if (m.what === 'launch') {
    const X = NEW_BY_ID[m.id];
    if (!X) return null;
    return html`<div class="modal-card">
      <span class="eyebrow">Nouveauté</span>
      <div class="modal-big" aria-hidden="true">${X.emoji}</div>
      <div class="modal-title">${newName(g, X)}</div>
      <p>${X.fx}</p>
      <p class="muted">${fmtMoney(g, X.price)} · ${X.kind === 'extra' ? 'en plus de ton matos' : `remplace ${kindLabel(g, X.kind).toLowerCase() === 'caméra' ? 'ta caméra' : 'ton matos du même type'}`}.</p>
      <button class="btn btn-hot" onClick=${() => { close(); openLayer({ t: 'gear' }); }}>Voir la boutique</button>
      <button class="btn btn-ghost" onClick=${close}>Plus tard</button>
    </div>`;
  }
  if (m.what === 'theft') {
    return html`<div class="modal-card">
      <span class="eyebrow" style="color:var(--bad)">Cambriolage</span>
      <div class="modal-big" aria-hidden="true">🚨</div>
      <p>On t’a volé ${m.name.toLowerCase()}. Sans assurance, personne ne te le rend.${m.kind === 'pc' ? ' Plus de vidéos longues tant que tu n’en as pas un autre.' : ''}</p>
      <button class="btn btn-hot" onClick=${() => { close(); openLayer({ t: 'gear' }); }}>Voir la boutique</button>
      <button class="btn btn-ghost" onClick=${close}>Fermer</button>
    </div>`;
  }
  return null;
}
// Before a shoot: what blocks it (a computer down, no connection for the live), and the ways out.
function GearBlocker({ g, r, now }) {
  const c = canMakeR(g, r, now);
  if (c.ok) return null;
  const G = g.gear, pc = G.items.pc;
  const acts = [];
  if (c.fix === 'repair' && pc) acts.push({ label: `Réparation express · ${fmtMoney(g, repairCost(g, 'pc', true))}`, run: () => repairGear(g, 'pc', true) });
  if (c.fix === 'virus') acts.push({ label: `${FIXES.virus.label} · ${fmtMoney(g, FIXES.virus.cost)}`, run: () => fixGear(g, 'virus') });
  if (c.fix === 'net' && G.net.storm) acts.push({ label: `${FIXES.storm.label} · ${fmtMoney(g, FIXES.storm.cost)}`, run: () => fixGear(g, 'storm') });
  const outage = c.fix === 'net' && G.net.out > now;
  return html`<div class="gear-block">
    <p><${Icon} n=${c.fix === 'net' ? 'wifioff' : 'wrench'} s=${16} /> <span>${c.why}</span></p>
    <div class="row">
      ${acts.map((a, j) => html`<button key=${j} class="btn btn-hot btn-sm" onClick=${() => { if (a.run() !== false) update(); }}>${a.label}</button>`)}
      ${c.fix === 'shop' || c.fix === 'repair' || c.fix === 'net' ? html`<button class="btn btn-ghost btn-sm" onClick=${() => openLayer({ t: 'gear' })}><${Icon} n="cart" s=${14} /> Boutique</button>` : null}
      ${outage && !r.series ? html`<button class="btn btn-ghost btn-sm" onClick=${() => { if (outagePostpone(g, r)) update(); }}>Prévenir et décaler après la coupure</button>` : null}
    </div>
  </div>`;
}
// A live caught by an outage: the player tells their audience, it moves after the outage, without the usual cost.
function outagePostpone(g, r) {
  const G = g.gear, t = Date.now();
  if (!r || r.state !== 'scheduled' || r.outageMoved || !(G.net.out > t)) return false;
  r.outageMoved = true;
  r.due = G.net.out + 15 * 60000;
  r.game = null; r.played = null; r.edit = null; r.editGame = null; r.thumb = null; r.render = null; r.dueSaid = false;
  S.stack = S.stack.filter((l) => !(l.t === 'minigame' && l.id === r.id));
  addNotif(g, { k: 'release', text: `📵 Coupure : ${ta(r)} « ${str(r.topic, 50)} » est décalé${whatF(r) ? 'e' : ''} ${fmtWhen(r.due, t)}. Ton public comprend… pour cette fois.` });
  addTrigger(g, `Le joueur a dû décaler ${sa(r)} « ${str(r.topic, 60)} » à cause d’une coupure internet : la plupart comprennent, quelques-uns en rigolent.`);
  return true;
}
