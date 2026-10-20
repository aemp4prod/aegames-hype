/* =========================================================
   0.24: the skills, practised. Four skills rise with what the player does in the exchanges (posts, messages, dates,
   videos, services), slowly: 50 levels, a tier every five. They help the exchanges only (relations, gifts, posts,
   content), never the mini-games: those stay exactly as hard as they are.
   And what the player buys in the exchanges (roses at a date, the bill, a round…): the AI says what it is and what it
   really costs, the game charges it, and charisma (gifts, outings) or boldness (haggling) make it cheaper.
   ========================================================= */
const SKILL_MAX = 50;
// The XP from level L-1 to level L: 8 for the first, 107 for the last; 52 to reach 5, 140 to reach 10, 3 342 for 50.
const skillNeed = (L) => Math.round(7 + L + 0.04 * L * L);
const SKILL_CUM = (() => { const a = [0]; for (let L = 1; L <= SKILL_MAX; L++) a[L] = a[L - 1] + skillNeed(L); return a; })();
const skillLevelOf = (xp) => { let L = 0; while (L < SKILL_MAX && xp >= SKILL_CUM[L + 1]) L++; return L; };
const SKILL_IDS = ['charisme', 'humour', 'audace', 'creativite'];
/* Each skill: what it is about, what trains it, what every level brings (base), and a tier every five levels.
   A tier's effects (fx) add to the base; a later tier replaces an earlier one's value for the same effect (an upgrade).
   The effects (read by the game with skillFx):
   relGain, relLoss: relations up faster, down slower · trustGain: trust won · giftOff, giftFree: gifts and outings paid in
   the exchanges, cheaper or offered · coolShort: a cold or an anger shorter · likeFun: likes of a funny post (× its humour)
   · likeAll: likes of every post and comment · amuseRel: a line that makes them laugh in private, relation on top ·
   folLoss: followers lost by a badly received post · warmFun: a very funny post warms the community · defuse: a laugh
   counts twice to clear a cold · viral, viralFun, viralBold: the chances of going viral · polemic: the reputation a
   controversy costs · haggle: what the player buys for themselves or for their work · dareRel, dareLoss: a dare (jumping
   the steps) won, lost · gestureRel: a daring gesture that worked at a date · boldFol: followers of a bold post that
   lands · xp · forge: a fake proof's credibility · views: the videos' views · jobPay, jobFol: the services · merch. */
const SKILL_TREE = {
  charisme: {
    emoji: '💬', label: 'Charisme', about: 'tes relations, tes cadeaux et tes sorties',
    grows: 'tes messages qui touchent, tes rendez-vous qui se passent bien, tes posts qui rassemblent',
    base: (L) => ({ relGain: L / 100 }), each: 'Relations +1 %',
    baseText: (L) => `Tes relations montent ${L} % plus vite`,
    tiers: [
      [5, 'Bonne impression', { trustGain: 0.1 }, 'Confiance gagnée +10 %'],
      [10, 'Petites attentions', { giftOff: 0.1 }, 'Cadeaux et sorties −10 %'],
      [15, 'Le geste offert', { giftFree: 0.05 }, '5 % de chances qu’un cadeau ou une sortie te soit offert'],
      [20, 'Ça se rattrape', { coolShort: 0.2 }, 'Un froid ou une colère dure 20 % de moins'],
      [25, 'Les bonnes adresses', { giftOff: 0.15 }, 'Cadeaux et sorties −15 %'],
      [30, 'On te croit', { trustGain: 0.2 }, 'Confiance gagnée +20 %'],
      [35, 'C’est pour la maison', { giftFree: 0.1 }, '10 % de chances qu’un cadeau ou une sortie te soit offert'],
      [40, 'On te pardonne', { relLoss: 0.1 }, 'Tes relations baissent 10 % de moins'],
      [45, 'Le carnet d’adresses', { giftOff: 0.2 }, 'Cadeaux et sorties −20 %'],
      [50, 'Magnétique', { giftFree: 0.15, relLoss: 0.15 }, '15 % de chances que ce soit offert, et tes relations baissent 15 % de moins'],
    ],
  },
  humour: {
    emoji: '😂', label: 'Humour', about: 'tes posts drôles et l’ambiance',
    grows: 'tes posts et tes répliques qui font rire, en public comme en privé',
    base: (L) => ({ likeFun: L / 100 }), each: 'Likes d’un post drôle +1 %',
    baseText: (L) => `Un post drôle : jusqu’à +${L} % de likes`,
    tiers: [
      [5, 'Ça détend', { amuseRel: 1 }, 'Une réplique qui fait rire en privé : +1 de relation en plus'],
      [10, 'Bon public', { likeAll: 0.05 }, 'Likes +5 % sur tous tes posts et commentaires'],
      [15, 'L’autodérision', { folLoss: 0.1 }, 'Un post mal reçu te coûte 10 % d’abonnés en moins'],
      [20, 'La commu rit avec toi', { warmFun: 1 }, 'Un post très drôle réchauffe ta commu (une fois par jour)'],
      [25, 'Les habitués', { likeAll: 0.1 }, 'Likes +10 % sur tous tes posts et commentaires'],
      [30, 'Désamorcer', { defuse: 1 }, 'En privé, un rire compte double pour dissiper une méfiance'],
      [35, 'Le mème', { viralFun: 0.05 }, 'Un post très drôle : +5 points de chances de devenir viral'],
      [40, 'Fou rire', { amuseRel: 2 }, 'Une réplique qui fait rire en privé : +2 de relation en plus'],
      [45, 'Rien ne t’atteint', { folLoss: 0.2 }, 'Un post mal reçu te coûte 20 % d’abonnés en moins'],
      [50, 'Culte', { likeAll: 0.15, viralFun: 0.08 }, 'Likes +15 %, et un post très drôle +8 points de viral'],
    ],
  },
  audace: {
    emoji: '🔥', label: 'Audace', about: 'oser, provoquer, négocier',
    grows: 'tes posts osés, tes gestes au bon moment, tes défis, tes répliques culottées',
    base: (L) => ({ viral: L * 0.003 }), each: 'Viral +0,3 point',
    baseText: (L) => `Chances de devenir viral +${fmtSkillN(L * 0.3)} points`,
    tiers: [
      [5, 'Assumer', { polemic: 0.1 }, 'Une polémique te coûte 10 % de réputation en moins'],
      [10, 'Oser demander', { haggle: 0.1 }, 'Tu négocies : ce que tu achètes pour toi ou ton travail −10 %'],
      [15, 'Brûler les étapes', { dareRel: 3 }, 'Un défi gagné (aller vite avec quelqu’un) : +3 de relation en plus'],
      [20, 'Le bon moment', { gestureRel: 2 }, 'Un geste osé qui plaît en rendez-vous : +2 de relation en plus'],
      [25, 'Cuir épais', { polemic: 0.2 }, 'Une polémique te coûte 20 % de réputation en moins'],
      [30, 'Marchandage', { haggle: 0.15 }, 'Tu négocies : −15 %'],
      [35, 'Sans filtre', { boldFol: 0.1 }, 'Un post osé qui plaît : +10 % d’abonnés'],
      [40, 'Retomber sur ses pattes', { dareLoss: 0.5 }, 'Un défi perdu te coûte moitié moins de relation'],
      [45, 'Intouchable', { polemic: 0.3 }, 'Une polémique te coûte 30 % de réputation en moins'],
      [50, 'Intrépide', { haggle: 0.2, viralBold: 0.03 }, 'Tu négocies −20 %, et un post osé +3 points de viral'],
    ],
  },
  creativite: {
    emoji: '🎨', label: 'Créativité', about: 'tes contenus',
    grows: 'tes vidéos, tes montages et miniatures pour les autres, tes posts originaux',
    base: (L) => ({ xp: L / 100, forge: L / 5 }), each: 'XP +1 %',
    baseText: (L) => `XP +${L} % à chaque action${L >= 5 ? ', et tes fausses preuves trompent mieux' : ''}`,
    tiers: [
      [5, 'L’idée qui accroche', { views: 0.03 }, 'Tes vidéos : +3 % de vues'],
      [10, 'On te recommande', { jobPay: 0.1 }, 'Tes services : un client accepte de payer jusqu’à 10 % de plus'],
      [15, 'Ta patte', { views: 0.06 }, 'Tes vidéos : +6 % de vues'],
      [20, 'Le merch qui plaît', { merch: 0.1 }, 'Ton merch se vend 10 % mieux'],
      [25, 'Le style maison', { views: 0.09 }, 'Tes vidéos : +9 % de vues'],
      [30, 'Le nom au générique', { jobFol: 0.2 }, 'Tes services : +20 % d’abonnés quand le client te mentionne'],
      [35, 'L’œil', { views: 0.12 }, 'Tes vidéos : +12 % de vues'],
      [40, 'La collection', { merch: 0.2 }, 'Ton merch se vend 20 % mieux'],
      [45, 'La signature', { views: 0.15 }, 'Tes vidéos : +15 % de vues'],
      [50, 'Visionnaire', { views: 0.2, jobFol: 0.3 }, 'Tes vidéos +20 % de vues, tes services +30 % d’abonnés'],
    ],
  },
};
const fmtSkillN = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
const normSkill = (s) => { const k = String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, ''); return SKILL_IDS.includes(k) ? k : null; };
const skillLevel = (g, id) => clamp(Math.floor(num(g && g.stats && g.stats.skills && g.stats.skills[id])), 0, SKILL_MAX);
// What a skill brings at its level: { effect: value }, its base and its tiers.
function skillFxAt(id, L) {
  const T = SKILL_TREE[id], fx = Object.assign({}, T.base(L));
  const tiers = {};
  for (const [at, , f] of T.tiers) if (L >= at) Object.assign(tiers, f);
  for (const k in tiers) fx[k] = (fx[k] || 0) + tiers[k];
  return fx;
}
// The value of one effect, all skills together (0 when none brings it).
function skillFx(g, key) {
  let v = 0;
  for (const id of SKILL_IDS) { const x = skillFxAt(id, skillLevel(g, id))[key]; if (x) v += x; }
  return v;
}
// A rounding that keeps small bonuses fair: 2 × 1,07 gives 2, and once in seven times 3.
const sround = (x) => { const f = Math.floor(x); return f + (Math.random() < x - f ? 1 : 0); };

/* ---------- training: the skills rise with practice ---------- */
function ensureSkills(g) {
  const s = g.stats;
  if (!s.skills || typeof s.skills !== 'object') s.skills = {};
  if (!s.skillXp || typeof s.skillXp !== 'object') {
    // games from before 0.24: the old scale (0-100, 5 at the start, fast) becomes levels (about 2,5 points a level)
    s.skillXp = {};
    for (const id of SKILL_IDS) {
      const L = clamp(Math.round((num(s.skills[id], 5) - 5) / 2.5), 0, SKILL_MAX);
      s.skillXp[id] = SKILL_CUM[L];
      s.skills[id] = L;
    }
  }
  for (const id of SKILL_IDS) {
    if (!(s.skillXp[id] >= 0)) s.skillXp[id] = 0;
    s.skills[id] = skillLevelOf(s.skillXp[id]);
  }
  if (!(s.skillPoints >= 0)) s.skillPoints = 0;
}
// xp for one skill; a new level says so, a tier says what it brings (and opens its tree on « Voir »).
function trainSkill(g, id, xp, at) {
  id = normSkill(id);
  if (!g || !id || !(xp > 0)) return 0;
  ensureSkills(g);
  const s = g.stats, L0 = s.skills[id];
  s.skillXp[id] = Math.min(SKILL_CUM[SKILL_MAX], s.skillXp[id] + Math.round(xp));
  const L1 = skillLevelOf(s.skillXp[id]);
  if (L1 <= L0) return 0;
  s.skills[id] = L1;
  const T = SKILL_TREE[id], tier = T.tiers.filter(([lv]) => lv > L0 && lv <= L1).pop();
  addNotif(g, { k: 'skill', sk: id, at: at || later(), text: `${T.emoji} ${T.label} niveau ${L1}${tier ? ` · ${tier[1]} : ${tier[3]}` : ''}` });
  return L1 - L0;
}
// A post, a comment, a video: the skills the AI saw in it (posts 3 to 5, comments 1 or 2, a video 6 to 10), and a
// video's craft for creativity.
function practiseAct(g, e, ctx) {
  const vid = ctx && ctx.video, post = ctx && ctx.kind === 'post';
  for (const id of e.skills || []) {
    const sc = id === 'humour' ? e.humor : id === 'audace' ? e.bold : e.quality;
    trainSkill(g, id, vid ? 6 + (sc >= 7 ? 2 : 0) + (sc >= 9 ? 2 : 0) : post ? 3 + (sc >= 7 ? 1 : 0) + (sc >= 9 ? 1 : 0) : 1 + (sc >= 7 ? 1 : 0));
  }
  if (vid) trainSkill(g, 'creativite', 3 + Math.round(4 * clamp(num(vid.score, 0.5), 0, 1)));
}
// A private message that landed: the skill it showed (the AI's word), charisma by default.
function practiseDM(g, d, sk, judge, at) {
  if (d >= 1) trainSkill(g, normSkill(sk) || 'charisme', 2 + (d >= 6 ? 1 : 0), at);
  if (judge === 'amuse' && normSkill(sk) !== 'humour') trainSkill(g, 'humour', 1, at);
}
// One exchange of a date: what they felt (a charm, a laugh), a gesture that worked.
function practiseTalk(g, react, geste, at) {
  if (react === 'charme') trainSkill(g, 'charisme', 2, at);
  else if (react === 'amuse') trainSkill(g, 'humour', 2, at);
  if (geste && (react === 'charme' || react === 'amuse')) trainSkill(g, 'audace', 3, at);
}
// The skills' line for the AI (the public context).
const skillsCtx = (g) => `Compétences du joueur (niveaux sur ${SKILL_MAX}) : ${SKILL_IDS.map((id) => `${SKILL_TREE[id].label.toLowerCase()} ${skillLevel(g, id)}`).join(', ')}`;

/* ---------- 0.24: what the player buys in the exchanges ---------- */
const BUY_KINDS = {
  cadeau: { emoji: '🎁', label: 'Cadeau', off: 'giftOff', free: 'giftFree', skill: 'charisme' },
  sortie: { emoji: '🧾', label: 'Sortie', off: 'giftOff', free: 'giftFree', skill: 'charisme' },
  perso: { emoji: '🛍️', label: 'Achat', off: 'haggle', skill: 'audace' },
  pro: { emoji: '💼', label: 'Pour ton travail', off: 'haggle', skill: 'audace' },
};
const normBuyKind = (k) => { const s = String(k || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); return BUY_KINDS[s] ? s : /sort|addition|resto|verre|tourn/.test(s) ? 'sortie' : /pro|travail|boulot/.test(s) ? 'pro' : /perso|moi/.test(s) ? 'perso' : 'cadeau'; };
// A message that may buy something: then the AI is asked whether it does, and what it costs (otherwise not a word of it).
const BUY_RE = /\b(?:offr\w*|ach[eè]t\w*|pa(?:ie|ies|ye|yes|yer|yé|yée|yés|ierai|ierais|yerai|yons|yez|yais|yait)|r[eè]gl(?:e|es|er|é|ée)|r[ée]gal\w*|invit(?:e|es)|addition|la note|cadeaux?|bouquets?|fleur\w*|roses?|chocolats?|bijoux?|bague|collier|bracelet|boucles d['’]oreilles|parfum|peluche|verres?|tourn[ée]es?|caf[ée]s?|resto\w*|restaurant\w*|d[îi]ner|d[ée]jeuner|places?|billets?|tickets?|taxi|uber|vtc|champagne|bouteilles?|cocktails?|commander|je prends)\b/i;
const buyTalk = (text) => BUY_RE.test(String(text || ''));
const moneyWord = (g) => (WORLD_MONEY[g.world.preset] ? WORLD_MONEY[g.world.preset].sym : 'euros');
// The line that asks the AI (a private message, a date). geste: the player pays the bill (a gesture of the date).
function BUY_LINE(g, c, geste) {
  const first = firstName(c), W = WORLD_MONEY[g.world.preset], sym = moneyWord(g), cash = Math.max(0, Math.floor(g.career.cash));
  return `- ${geste ? 'Le joueur paie : ajoute' : 'Seulement si, dans ce message, le joueur achète, offre ou paie pour de vrai quelque chose qui coûte de l’argent (des fleurs, un cadeau, l’addition, un verre, une tournée, des places, un taxi…), maintenant :'} une ligne {"t":"buy","what":"≤ 60 caractères : ce qu’il paie","kind":"cadeau","price":40}. kind : cadeau (offert à ${first}), sortie (ce qu’ils consomment ou font ensemble et qu’il paie : l’addition, une tournée, des places), perso (pour lui), pro (pour son travail). Pour perso et pro, ajoute "obj":true si c’est un objet qu’il garde (vêtement, accessoire, gadget, matériel…). price : le vrai prix${W ? `, en ${sym} (les prix de ce monde)` : ', en euros, en France (≈ un café 3, une tournée 25, un bouquet 40, un dîner pour deux 90, un bijou 150 à 800)'}, selon le lieu et ce qu’il choisit. Le joueur a ${fmtPlain(cash)} ${sym} : si c’est plus cher, sa carte est refusée (joue-le), et la ligne porte "refused":true. Une promesse (« je t’offrirai… ») n’est pas un achat.`;
}
const buyPrice = (v) => { const x = moneyIn(v); return Number.isFinite(x) ? Math.round(x * 100) / 100 : 0; }; // (0.28.1: « 1e+22 », « 2 millions »…)
/* The purchase: the price the AI gave, the skill's discount, a chance it is offered (gifts and outings), the card
   refused when the account cannot pay. Returns the receipt (kept in g.buys), or null when there is nothing to pay. */
function applyBuy(g, c, o, where, at = later()) {
  const kind = normBuyKind(o.kind), K = BUY_KINDS[kind], what = str(o.what, 80) || 'un achat';
  const p0 = buyPrice(o.price), price = Number.isFinite(p0) && p0 > 0 ? p0 : 0; // (0.28.1: no ceiling: the card says no when the money is not there)
  if (!(price > 0)) return null;
  const off = clamp(skillFx(g, K.off), 0, 0.5), freeP = K.free ? clamp(skillFx(g, K.free), 0, 0.5) : 0;
  // 0.28.1: the game decides whether the card goes through (the model's « refused » was often wrong, either way)
  const free = freeP > 0 && roll() < freeP;
  const due = free ? 0 : Math.round(price * (1 - off) * 100) / 100;
  const refused = due > 0 && due > g.career.cash + 1e-9;
  const R = { id: uid('b'), at, c: c.id, what, kind, price, paid: refused ? 0 : due, off: refused || free ? 0 : off, free, refused, where };
  if (refused) R.left = Math.max(0, g.career.cash); // (the receipt says what was left then, not now)
  if (!refused && due > 0) pay(g, due, `${K.emoji} ${cap1(what)} (${firstName(c)})`, 'buy');
  if (!refused && kind === 'cadeau') { giftMem(g, c, what); giftCounted(g, c, R.paid, at); } // (0.28.1: « Coin coin » counts the gifts paid in a message too)
  if (!refused && kind === 'sortie') addMem(g, c, `le joueur a payé ${what}`, `Tu as payé ${what}`);
  if (!refused && (kind === 'perso' || kind === 'pro') && (o.obj === true || o.obj === 'true')) invAdd(g, { kind: 'buy', name: what, emoji: K.emoji, value: R.paid, cond: 'neuf', at, from: { how: 'achat', c: c.id } }); // 0.26: kept, in the inventory (0.28.1: worth what it cost)
  if (!Array.isArray(g.buys)) g.buys = [];
  g.buys.push(R);
  if (g.buys.length > 60) g.buys.splice(0, g.buys.length - 60);
  return R;
}
// What the AI reads of it (the conversation, the evening).
function buyText(g, b) {
  if (b.refused) return `la carte du joueur est refusée pour ${b.what} (${fmtMoney(g, b.price)})`;
  return `le joueur paie ${b.what}${b.free ? ' (finalement offert par la maison)' : ` (${fmtMoney(g, b.paid)})`}`;
}
// The receipt, as the player sees it.
function buyLabel(g, b) {
  const K = BUY_KINDS[b.kind] || BUY_KINDS.cadeau;
  if (b.refused) return `💳 Carte refusée : ${b.what} (${fmtMoney(g, b.price)}, il te restait ${fmtMoney(g, b.left != null ? b.left : Math.max(0, g.career.cash))})`;
  if (b.free) return `${K.emoji} ${cap1(b.what)} : offert ! (${SKILL_TREE[K.skill].label.toLowerCase()})`;
  return `${K.emoji} ${cap1(b.what)} : ${fmtMoney(g, b.paid)}${b.off ? ` au lieu de ${fmtMoney(g, b.price)} (${SKILL_TREE[K.skill].label.toLowerCase()} −${Math.round(b.off * 100)} %)` : ''}`;
}
function BuyCard({ g, m }) {
  const b = m.buy || {};
  return html`<div class=${'buy-card' + (b.refused ? ' refused' : b.free ? ' free' : '')}>${buyLabel(g, b)}</div>`;
}
// What the gifts and outings cost so far, and what charisma saved.
function buyTotals(g) {
  let spent = 0, saved = 0, n = 0;
  for (const b of g.buys || []) { if (b.refused) continue; n++; spent += b.paid; saved += b.price - b.paid; }
  return { n, spent: Math.round(spent * 100) / 100, saved: Math.round(saved * 100) / 100 };
}

/* ---------- the screens: the skills in the profile, and each one's tree ---------- */
const nextTier = (id, L) => SKILL_TREE[id].tiers.find(([lv]) => lv > L) || null;
// What a skill brings right now, in words with numbers.
function skillNow(id, L) {
  const T = SKILL_TREE[id], out = L > 0 ? [T.baseText(L)] : [];
  const seen = new Set();
  for (const tier of T.tiers.slice().reverse()) { // the latest tier of each effect
    if (L < tier[0]) continue;
    const keys = Object.keys(tier[2]).filter((k) => !seen.has(k));
    if (!keys.length) continue;
    keys.forEach((k) => seen.add(k));
    out.push(tier[3]);
  }
  return out;
}
function SkillsSection({ g }) {
  ensureSkills(g);
  const s = g.stats;
  return html`<section class="section skills-sec">
    <div class="section-h"><h3>Compétences</h3>${s.skillPoints ? html`<span style="color:var(--hot-t);font-weight:700">${s.skillPoints} ${plural(s.skillPoints, 'point', 'points')} à placer</span>` : html`<span>Elles montent quand tu joues</span>`}</div>
    ${SKILL_IDS.map((id) => {
      const T = SKILL_TREE[id], L = s.skills[id], xp = s.skillXp[id], top = L >= SKILL_MAX, need = top ? 1 : skillNeed(L + 1), got = top ? 1 : xp - SKILL_CUM[L];
      const now = skillNow(id, L), nx = nextTier(id, L);
      return html`<button class="skill-row" key=${id} onClick=${() => openLayer({ t: 'skill', id })} aria-label=${`${T.label}, niveau ${L} : voir l’arbre`}>
        <span class="sk-emo" aria-hidden="true">${T.emoji}</span>
        <span class="sk-mid">
          <span class="sk-top"><b>${T.label}</b><span class="mono">Niv. ${L}${top ? ' · max' : ''}</span></span>
          <${Meter} frac=${got / need} />
          <small>${now.length ? now.slice(0, 2).join(' · ') : 'Rien encore'}${nx ? ` · niveau ${nx[0]} : ${nx[1].toLowerCase()}` : ''}</small>
        </span>
        ${s.skillPoints ? html`<span class="plus" role="button" tabindex="0" onClick=${(e) => { e.stopPropagation(); allocSkill(id); }} aria-label=${'Placer un point en ' + T.label}><${Icon} n="plus" s=${16} /></span>` : html`<span class="sk-go" aria-hidden="true">›</span>`}
      </button>`;
    })}
  </section>`;
}
function SkillLayer({ l, g, i }) {
  ensureSkills(g);
  const id = normSkill(l.id) || 'charisme', T = SKILL_TREE[id], s = g.stats, L = s.skills[id], xp = s.skillXp[id], top = L >= SKILL_MAX;
  const need = top ? 0 : SKILL_CUM[L + 1] - xp, now = skillNow(id, L), nx = nextTier(id, L);
  const tot = id === 'charisme' ? buyTotals(g) : null;
  return html`<${LayerShell} i=${i} title=${T.label}><div class="lpad skill-tree">
    <div class="st-head"><span class="st-emo" aria-hidden="true">${T.emoji}</span><div><b>${T.label} · niveau ${L}${top ? ' (max)' : ''}</b><small>${top ? 'Tout est débloqué.' : `Encore ${fmtPlain(need)} XP pour le niveau ${L + 1}${nx ? ` · palier ${nx[0]} : encore ${fmtPlain(SKILL_CUM[nx[0]] - xp)} XP` : ''}`}</small></div></div>
    ${top ? null : html`<${Meter} frac=${(xp - SKILL_CUM[L]) / skillNeed(L + 1)} />`}
    <p class="muted st-grows">Pour ${T.about}. Elle monte avec ${T.grows}. Elle ne touche jamais aux mini-jeux.</p>
    <div class="st-now"><span class="eyebrow">Ce que ça te donne maintenant</span>${now.length ? html`<ul>${now.map((x) => html`<li key=${x}>${x}</li>`)}</ul>` : html`<p class="muted">Rien encore : le premier palier arrive au niveau 5.</p>`}
      ${tot && tot.n ? html`<p class="muted st-buys">Tes cadeaux et sorties : ${fmtMoney(g, tot.spent)} dépensés${tot.saved > 0 ? `, ${fmtMoney(g, tot.saved)} économisés` : ''}.</p>` : null}</div>
    <ol class="st-path" aria-label="Les paliers">
      ${T.tiers.map(([lv, name, , text]) => { const on = L >= lv, next = !on && nx && nx[0] === lv; return html`<li key=${lv} class=${on ? 'on' : next ? 'next' : ''}>
        <span class="st-lv">${on ? '✓' : lv}</span>
        <span class="st-txt"><b>Niveau ${lv} · ${name}</b><small>${text}</small>${next ? html`<em>Encore ${fmtPlain(SKILL_CUM[lv] - xp)} XP</em>` : null}</span>
      </li>`; })}
    </ol>
    <p class="muted st-each">Et à chaque niveau : ${T.each.toLowerCase()}.</p>
  </div><//>`;
}
