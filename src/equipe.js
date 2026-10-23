/* =========================================================
   0.33: a team that lives. Those the player hires get better with the work done together (Débutant → Confirmé →
   Expert → Star du métier: a release worked on is one step for those paid by release, a day in the team for the
   others; once a Star, kept on, their bonuses still grow, up to +10 points: loyalty). And they are people: a mood
   with its reasons (the pay, the gear the player gives them, the workload, a raise refused, the player's scandal), a
   raise asked for at each new level, gear to provide (what they expect grows with their level), other creators who try
   to poach the best of them. Their AI talks about it, asks, negotiates, decides to stay or to go: the game keeps the
   books (and an unhappy one works less well).
   Anyone of the cast can also be given work (a thumbnail, an edit, a script, the community…), once or for good, paid:
   they stay who they are, a job on top (« main » on their entry; they keep their kind and their role).
   ========================================================= */
const t33On = () => !window.__HYPE_TEST__ || !!window.__t33; // (the suites written before keep the team of before)
const STAFF_STEPS = [6, 12, 20]; // the work it takes to pass each level
const LOY_STEP = 0.5, LOY_MAX = 10; // a Star kept on: +0,5 point per unit of work, up to +10 points on each of their bonuses
// What one point of power gives, role by role (their main bonus): the loyalty's points, turned into power.
const STAFF_COEF = { monteur: 0.08, miniature: 0.07, scenariste: 0.04, cm: 0.12, agent: 0.05, rp: 0.15, agence: 0.04, avocat: 0.2 };
const VIDEO_DAY_MAX = 2; // per game day, two releases at most count (a release machine does not learn faster)
const MOOD0 = 70;
// The gear each job needs, three levels (0: what they bring themselves, or nothing).
const STAFF_GEAR = {
  monteur: { emoji: '💻', names: ['PC portable et logiciel gratuit', 'PC de montage et logiciel pro', 'Station de montage et écran calibré'], prices: [600, 2000, 6000] },
  miniature: { emoji: '🖊️', names: ['Tablette graphique', 'Tablette pro et logiciels', 'Écran-tablette pro et licences'], prices: [300, 1200, 3500] },
  scenariste: { emoji: '📓', names: ['Portable et traitement de texte', 'Logiciel d’écriture et documentation', 'Poste d’écriture et archives payantes'], prices: [400, 1100, 2800] },
  cm: { emoji: '📱', names: ['Téléphone pro', 'Outil de planification', 'Suite de modération et de veille'], prices: [300, 900, 2400] },
  agent: { emoji: '💼', names: ['Téléphone pro', 'Ordinateur et notes de frais', 'Bureau, déplacements et invitations'], prices: [300, 1200, 3500] },
  rp: { emoji: '🗂️', names: ['Abonnements presse', 'Base de contacts médias', 'Veille médias pro et déplacements'], prices: [400, 1300, 3800] },
  agence: { emoji: '🏢', names: ['Poste de travail', 'Bureau équipé', 'Bureau premium et outils pro'], prices: [800, 2500, 7000] },
  avocat: { emoji: '📚', names: ['Codes et bases juridiques', 'Base juridique pro', 'Bases premium et assistant'], prices: [500, 2000, 6000] },
};
const WORLD_STAFF_GEAR = { aldoree: ['Outils d’apprenti', 'Outils de maître', 'Outils d’archimage'], orion: ['Équipement standard', 'Équipement avancé', 'Équipement de pointe'] };
const GEAR_LV = ['Rien de fourni', 'Basique', 'Bon', 'Pro'];
const NEED_WORD = ['', 'du matériel basique', 'du bon matériel', 'du matériel pro'];
const GEAR_NEED = [1, 2, 2, 3]; // what each level expects: a beginner, the basics; confirmed and expert, good gear; a Star, the best

const memberOf = (g, c) => (g && c && (g.staff || []).find((m) => m.c === c.id)) || null;
const moneySym = (g) => (g && g.world && WORLD_MONEY[g.world.preset] ? WORLD_MONEY[g.world.preset].sym : 'euros');
const rateWord = (g, role, rate) => payWord(g, { role, rate });
const gearNeed = (m) => GEAR_NEED[clamp(m.tier || 0, 0, 3)];
const gearGap = (m) => (t33On() && m ? Math.max(0, gearNeed(m) - (m.gear || 0)) : 0);
function staffGearName(g, m, lv = m.gear || 0) {
  if (!lv) return GEAR_LV[0];
  const W = g && g.world && WORLD_STAFF_GEAR[g.world.preset];
  return W ? W[lv - 1] : (STAFF_GEAR[m.role] || STAFF_GEAR.monteur).names[lv - 1];
}
// The price of a level, the old gear sold on (30 % of its price; their own gear, nothing).
function gearPrice(m, lv) {
  const P = (STAFF_GEAR[m.role] || STAFF_GEAR.monteur).prices;
  return Math.max(0, P[lv - 1] - (m.gear && !m.ownGear ? Math.round(P[m.gear - 1] * 0.3) : 0));
}

/* ---------- what they bring: their level, as it works today ---------- */
const staffMood = (m) => (m && m.mood != null ? m.mood : MOOD0);
const moodK = (m) => (!t33On() ? 1 : staffMood(m) < 20 ? 0.7 : staffMood(m) < 40 ? 0.85 : 1);
const gearK = (m) => Math.max(0.55, 1 - 0.15 * gearGap(m));
const loyPow = (m) => (t33On() && m && m.tier >= 3 && m.loy > 0 ? m.loy / (100 * (STAFF_COEF[m.role] || 0.05)) : 0);
function memberPower(g, m) {
  if (!m || !STAFF_ROLES[m.role] || (STAFF_ROLES[m.role].pay === 'week' && m.unpaid)) return 0;
  if (!t33On()) return m.tier + 1;
  return Math.round(((m.tier + 1) * gearK(m) * moodK(m) + loyPow(m)) * 100) / 100;
}
// What counts in whole numbers (hints, talents): their level as it works now, the loyalty aside, 1 at least.
const memberLevel = (g, m) => { const p = memberPower(g, m); return p ? clamp(Math.round(p - loyPow(m)), 1, 4) : 0; };
const staffLevel = (g, role) => memberLevel(g, hasStaff(g, role));

/* ---------- getting better ---------- */
const workLoad = (m, t = Date.now()) => (m.work || []).filter((x) => t - x < 7 * DAY_MS).length;
// A release they worked on (paid for it).
function staffWorked(g, m, t = Date.now()) {
  if (!t33On() || !m) return false;
  m.work = (m.work || []).filter((x) => t - x < 14 * DAY_MS).concat([t]);
  const d = gameDay(t);
  if (m.wd !== d) { m.wd = d; m.wn = 0; }
  if (m.wn >= VIDEO_DAY_MAX) return false;
  m.wn++;
  return staffGrow(g, m, 1, t);
}
function staffGrow(g, m, n = 1, t = Date.now()) {
  if (m.tier >= 3) {
    const was = m.loy || 0;
    m.loy = Math.min(LOY_MAX, Math.round((was + LOY_STEP * n) * 10) / 10);
    if (m.loy >= LOY_MAX && was < LOY_MAX) loyalNote(g, m);
    return m.loy !== was;
  }
  m.xp = (m.xp || 0) + n;
  while (m.tier < 3 && m.xp >= STAFF_STEPS[m.tier]) { m.xp -= STAFF_STEPS[m.tier]; m.tier++; staffLevelUp(g, m, t); }
  if (m.tier >= 3) m.xp = 0;
  return true;
}
function staffLevelUp(g, m, t) {
  const c = g.chars[m.c];
  if (!c) return;
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), tn = tierName(m.tier, c.g).toLowerCase(), rn = roleName(m.role, c.g).toLowerCase();
  const want = m.once ? 0 : raiseWant(m);
  if (want && !(m.raise && m.raise.state === 'ask')) m.raise = { at: t, from: m.rate, want, state: 'ask', tell: t + randi(15, 45) * 60000 };
  addNotif(g, { k: 'skill', c: c.id, text: `📈 ${first} passe ${tn} (${rn}) : ${STAFF_ROLES[m.role].fx(memberPower(g, m))}.${want ? ` ${cap1(il)} va sûrement te demander une augmentation.` : ''}${gearGap(m) ? ` À ce niveau, il ${gx(c.g, 'lui', 'lui', 'lui')} faut ${NEED_WORD[gearNeed(m)]}.` : ''}` });
  addMem(g, c, `je suis ${gx(c.g, 'passé', 'passée', 'passé·e')} ${tn} en bossant avec le joueur`);
  addChronicle(g, `${c.name} est ${gx(c.g, 'passé', 'passée', 'passé·e')} ${tn} (${rn}) dans l’équipe de ${g.player.name}.`);
}
function loyalNote(g, m) {
  const c = g.chars[m.c];
  if (!c) return;
  addNotif(g, { k: 'skill', c: c.id, text: `⭐ ${firstName(c)} est à fond avec toi : sa fidélité lui donne +${LOY_MAX} points sur ses bonus.` });
  addMem(g, c, 'ça fait longtemps que je bosse avec le joueur, et je donne tout');
}

/* ---------- the pay: a raise at each level (or when they ask) ---------- */
function raiseWant(m) {
  const R = STAFF_ROLES[m.role];
  if (!R) return 0;
  const mk = R.rates[clamp(m.tier, 0, 3)];
  if (R.pay === 'cut') return m.rate < mk ? mk : 0;
  const w = niceRound(Math.max(m.rate * 1.15, mk * rand(0.95, 1.1)));
  return w > m.rate ? w : 0;
}
const raiseCap = (m) => (STAFF_ROLES[m.role].pay === 'cut' ? 30 : Math.round(Math.max(m.raise ? m.raise.want : 0, m.rate) * 1.6));
function acceptRaise(g, m, rate, t = Date.now()) {
  const c = g.chars[m.c];
  if (!c || !m.raise || m.raise.state !== 'ask') return false;
  const R = STAFF_ROLES[m.role], want = m.raise.want;
  let r = num(rate, want);
  r = R.pay === 'cut' ? clamp(Math.round(r), m.rate, 30) : niceRound(clamp(r, m.rate, raiseCap(m)));
  const full = r >= want;
  m.rate = r;
  Object.assign(m.raise, { state: full ? 'ok' : 'part', at: t });
  m.mood = clamp(staffMood(m) + (full ? 10 : 4), 0, 100);
  if (m.poach && m.poach.state === 'open' && r >= m.poach.rate) matchPoach(g, m, t, true);
  applyRel(g, c, full ? 4 : 1, full ? 'augmentation accordée' : 'une augmentation, plus petite que demandée', later(), 10);
  addMem(g, c, `le joueur m’a ${gx(c.g, 'augmenté', 'augmentée', 'augmenté·e')} : ${payWord(g, m)}`);
  addNotif(g, { k: 'money', c: c.id, text: `💸 ${firstName(c)} passe à ${payWord(g, m)}.` });
  return true;
}
function refuseRaise(g, m, t = Date.now()) {
  const c = g.chars[m.c];
  if (!c || !m.raise || m.raise.state !== 'ask') return false;
  Object.assign(m.raise, { state: 'refused', at: t });
  m.mood = clamp(staffMood(m) - 8, 0, 100);
  applyRel(g, c, -5, 'augmentation refusée', later(), 10);
  addMem(g, c, 'le joueur a refusé mon augmentation');
  addTrigger(g, `Le joueur a refusé l’augmentation de @${c.handle} (${roleName(m.role, c.g).toLowerCase()} de son équipe) : ${gx(c.g, 'il', 'elle', 'iel')} le prend à sa façon, et peut le lui dire.`, c.id);
  addNotif(g, { k: 'reldown', c: c.id, text: `${firstName(c)} n’aura pas son augmentation.` });
  return true;
}
// In their messages: what they ask, what was agreed, or the player's no.
function salaryLine(g, c, m) {
  const R = STAFF_ROLES[m.role], first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  const unit = R.pay === 'cut' ? 'en % des contrats' : `en ${moneySym(g)}${R.pay === 'week' ? ' par semaine' : R.pay === 'case' ? ' par dossier' : ' par sortie'}`;
  if (m.raise && m.raise.state === 'ask') return `- OBLIGATOIRE dès que ${first} et le joueur tombent d’accord dans ce message sur son nouveau tarif : {"t":"salaire","rate":${m.raise.want}} (le tarif convenu, ${unit}, entre ${m.rate} et ${raiseCap(m)}) ; si le joueur refuse l’augmentation : {"t":"salaire","refus":true}. Rien tant que ça se discute.`;
  const ask = R.pay === 'cut' ? Math.min(30, m.rate + 2) : niceRound(m.rate * 1.2 + 1);
  return `- Facultatif : si ${first} demande une augmentation dans ce message (son niveau, son moral, une offre ailleurs) : {"t":"salaire","ask":${ask}} (ce qu’${il} demande, ${unit}). Si le joueur lui propose lui-même un autre tarif et qu’${il} l’accepte : {"t":"salaire","rate":${ask}} (le tarif convenu).`;
}
function applySalaryLine(g, c, o, t = Date.now()) {
  const m = memberOf(g, c);
  if (!m || !t33On()) return false;
  if (o.refus === true || o.refus === 'true') return refuseRaise(g, m, t);
  const R = STAFF_ROLES[m.role];
  if (o.ask != null && !(m.raise && m.raise.state === 'ask')) {
    let w = num(o.ask, 0);
    w = R.pay === 'cut' ? clamp(Math.round(w), m.rate + 1, 30) : niceRound(clamp(w, m.rate * 1.05 + 1, m.rate * 2 + 50));
    if (!(w > m.rate)) return false;
    m.raise = { at: t, from: m.rate, want: w, state: 'ask', tell: t, told: t };
    addNotif(g, { k: 'money', c: c.id, at: later() + 1500, text: `💸 ${firstName(c)} te demande une augmentation : ${rateWord(g, m.role, w)} au lieu de ${payWord(g, m)}.` });
    return true;
  }
  if (o.rate == null) return false;
  if (m.raise && m.raise.state === 'ask') return acceptRaise(g, m, o.rate, t);
  const r = R.pay === 'cut' ? clamp(Math.round(num(o.rate, m.rate)), 1, 30) : niceRound(clamp(num(o.rate, m.rate), Math.max(1, m.rate * 0.5), m.rate * 2 + 50));
  if (r === m.rate) return false;
  const up = r > m.rate;
  m.rate = r;
  m.mood = clamp(staffMood(m) + (up ? 8 : -10), 0, 100);
  applyRel(g, c, up ? 3 : -3, up ? 'mieux payé·e' : 'payé·e moins qu’avant', later(), 8);
  if (up && m.poach && m.poach.state === 'open' && r >= m.poach.rate) matchPoach(g, m, t, true);
  addNotif(g, { k: 'money', c: c.id, at: later() + 1500, text: `${firstName(c)} passe à ${payWord(g, m)}.` });
  return true;
}

/* ---------- gear, a bonus ---------- */
function buyStaffGear(g, m, lv) {
  const c = g.chars[m.c];
  if (!c || !(lv >= 1 && lv <= 3) || lv <= (m.gear || 0)) return false;
  const cost = gearPrice(m, lv);
  if (!pay(g, cost, `${staffGearName(g, m, lv)} pour ${firstName(c)}`, 'staff')) { toast(`Il te faut ${fmtMoney(g, cost)}.`, 'bad'); return false; }
  const fill = gearGap(m) > 0;
  m.gear = lv;
  m.ownGear = false;
  m.mood = clamp(staffMood(m) + (fill ? 8 : 4), 0, 100);
  applyRel(g, c, fill ? 3 : 2, 'du matériel fourni', later(), 8);
  addMem(g, c, `le joueur m’a ${gx(c.g, 'équipé', 'équipée', 'équipé·e')} : ${staffGearName(g, m, lv).toLowerCase()}`);
  addNotif(g, { k: 'money', c: c.id, text: `🧰 ${firstName(c)} a son nouveau matériel : ${staffGearName(g, m, lv)}.` });
  return true;
}
const bonusOf = (g, m) => { const R = STAFF_ROLES[m.role]; return R.pay === 'cut' ? 300 : niceRound(Math.max(50, m.rate * (R.pay === 'week' ? 1 : 2))); };
function giveBonus(g, m, t = Date.now()) {
  const c = g.chars[m.c];
  if (!c) return false;
  const amt = bonusOf(g, m);
  if (!pay(g, amt, `Prime de ${firstName(c)}`, 'staff')) { toast(`Il te faut ${fmtMoney(g, amt)}.`, 'bad'); return false; }
  const again = m.bonusAt && t - m.bonusAt < 7 * DAY_MS; // (a second one in the week counts less)
  m.bonusAt = t;
  m.mood = clamp(staffMood(m) + (again ? 4 : 14), 0, 100);
  applyRel(g, c, again ? 1 : 4, 'une prime', later(), 8);
  addMem(g, c, `le joueur m’a donné une prime (${fmtMoney(g, amt)})`);
  return true;
}

/* ---------- the mood, and why ---------- */
function moodParts(g, m, t = Date.now()) {
  const c = g.chars[m.c], gd = c ? c.g : 'x', R = STAFF_ROLES[m.role], out = [];
  if (!R) return out;
  const add = (d, why) => out.push({ d, why });
  const gap = gearGap(m);
  if (gap) add(-16 * gap, m.gear ? 'son matériel ne suit plus son niveau' : 'pas de matériel fourni');
  else if ((m.gear || 0) > gearNeed(m)) add(4, `bien ${gx(gd, 'équipé', 'équipée', 'équipé·e')}`);
  if (m.unpaid) add(-30, 'salaire en retard');
  const mk = R.rates[clamp(m.tier, 0, 3)];
  if (R.pay === 'cut') { if (m.rate < mk) add(-8, 'veut une plus grosse commission'); }
  else if (!m.once) { if (m.rate < mk * 0.7) add(-12, `se sent sous-${gx(gd, 'payé', 'payée', 'payé·e')}`); else if (m.rate >= mk * 1.2) add(6, `bien ${gx(gd, 'payé', 'payée', 'payé·e')}`); }
  const rs = m.raise;
  if (rs && rs.state === 'ask' && t - rs.at > 2 * DAY_MS) add(-8, 'attend ta réponse pour son augmentation');
  if (rs && rs.state === 'refused' && t - rs.at < 10 * DAY_MS) add(-12, 'augmentation refusée');
  if (rs && rs.state === 'part' && t - rs.at < 7 * DAY_MS) add(-4, 'augmentation plus petite que demandée');
  if (rs && rs.state === 'ok' && t - rs.at < 7 * DAY_MS) add(6, 'augmentation accordée');
  if (R.pay === 'video') { const w = workLoad(m, t); if (w > 14) add(-22, 'beaucoup trop de boulot cette semaine'); else if (w > 9) add(-10, 'trop de boulot cette semaine'); }
  if (g.stats.cancelled) add(-14, 'ton cancel'); else if (playerBadBuzz(g)) add(-6, 'ton bad buzz');
  if (c && c.rel >= 50) add(6, 'vous vous entendez bien'); else if (c && c.rel < 0) add(-10, 'votre relation');
  if (m.bonusAt && t - m.bonusAt < 14 * DAY_MS) add(8, 'une prime récente');
  if (m.poach && m.poach.state === 'open') add(-4, 'une offre ailleurs');
  return out;
}
const moodTarget = (g, m, t = Date.now()) => clamp(MOOD0 + moodParts(g, m, t).reduce((s, x) => s + x.d, 0), 5, 95);
const moodWhy = (g, m, t = Date.now(), n = 2) => moodParts(g, m, t).filter((x) => x.d < 0).sort((a, b) => a.d - b.d).slice(0, n).map((x) => x.why);
const moodGood = (g, m, t = Date.now(), n = 2) => moodParts(g, m, t).filter((x) => x.d > 0).sort((a, b) => b.d - a.d).slice(0, n).map((x) => x.why);
function moodLabel(m, gd) {
  const v = staffMood(m);
  return v >= 65 ? ['😊', gx(gd, 'Content', 'Contente', 'Content·e'), 'good'] : v >= 40 ? ['😐', 'Bof', ''] : v >= 20 ? ['😠', gx(gd, 'Mécontent', 'Mécontente', 'Mécontent·e'), 'bad'] : ['🔥', 'À bout', 'bad'];
}
// A day in the team: those not paid by release learn by the day; the mood goes toward what they live (down faster).
function teamDay(g, m, t) {
  const R = STAFF_ROLES[m.role];
  if (R.pay !== 'video' && !m.unpaid) staffGrow(g, m, 1, t);
  const cur = staffMood(m), T = moodTarget(g, m, t);
  m.mood = Math.round(clamp(cur + clamp(T - cur, -7, 5), 0, 100));
}
// Unhappy, they say so (their AI, in private, at the next refresh); at the end of their rope, they may talk of leaving.
function moodTalk(g, m, lv, t) {
  const c = g.chars[m.c], il = gx(c.g, 'il', 'elle', 'iel'), rn = roleName(m.role, c.g).toLowerCase(), why = moodWhy(g, m, t, 3).join(', ') || 'rien ne va';
  addTrigger(g, lv >= 2 ? `@${c.handle} (${rn} du joueur) est à bout (${why}) : ${il} le lui dit en privé, et peut annoncer qu’${il} pense à partir.` : `@${c.handle} (${rn} du joueur) n’est pas ${gx(c.g, 'content', 'contente', 'content·e')} (${why}) : ${il} lui en parle en privé, à sa façon.`, c.id);
  addNotif(g, { k: 'reldown', c: c.id, text: `${lv >= 2 ? '🔥' : '😠'} ${firstName(c)} ${lv >= 2 ? 'est à bout' : `n’est pas ${gx(c.g, 'content', 'contente', 'content·e')}`} : ${why}.` });
  g.teamTell = Math.min(g.teamTell || Infinity, t + randi(5, 30) * 60000);
}

/* ---------- poached: a bigger creator wants them (their AI's doing, in a refresh) ---------- */
function applyPoachLine(g, o, t = Date.now()) {
  const c = charByHandle(g, normHandle(o.by)), m = memberOf(g, c);
  if (!t33On() || !m || m.tier < 2 || m.once || (m.poach && (m.poach.state === 'open' || t - m.poach.at < 10 * DAY_MS))) return false;
  const R = STAFF_ROLES[m.role], fc = charByHandle(g, normHandle(o.from));
  const rate = R.pay === 'cut' ? clamp(Math.round(num(o.rate, m.rate + 3)), m.rate + 1, 30) : niceRound(clamp(num(o.rate, m.rate * 1.5), m.rate * 1.15, m.rate * 2.5 + 50));
  const from = fc && fc !== c ? '@' + fc.handle : str(String(o.from || '').replace(/^@+/, ''), 40) || 'une grosse chaîne';
  m.poach = { from, fc: fc && fc !== c ? fc.id : null, rate, at: t, until: t + 3 * DAY_MS, state: 'open' };
  addNotif(g, { k: 'reldown', c: c.id, at: later() + 1500, text: `🎣 ${from} veut débaucher ${firstName(c)} : ${rateWord(g, m.role, rate)}. Réponse ${fmtWhen(m.poach.until)}.` });
  addMem(g, c, `${from} m’a proposé ${rateWord(g, m.role, rate)} pour bosser ailleurs`);
  return true;
}
function matchPoach(g, m, t = Date.now(), quiet = false) {
  const c = g.chars[m.c], P = m.poach;
  if (!c || !P || P.state !== 'open') return false;
  if (!quiet) m.rate = Math.max(m.rate, P.rate); // (from their messages, the rate agreed is already theirs)
  P.state = 'matched';
  P.at = t;
  m.mood = clamp(staffMood(m) + 8, 0, 100);
  applyRel(g, c, 3, 'tu t’es aligné pour le garder', later(), 8);
  addMem(g, c, `le joueur s’est aligné sur l’offre de ${P.from} pour me garder`);
  addNotif(g, { k: 'relup', c: c.id, text: `🤝 ${firstName(c)} reste avec toi : tu t’alignes sur l’offre de ${P.from} (${payWord(g, m)}).` });
  addTrigger(g, `@${c.handle} reste dans l’équipe du joueur, qui s’est aligné sur l’offre de ${P.from} : ${gx(c.g, 'il', 'elle', 'iel')} peut le lui dire.`, c.id);
  return true;
}
function applyPoachEnd(g, c, o) {
  const m = memberOf(g, c);
  if (!m || !m.poach || m.poach.state !== 'open') return false;
  if (o.part === true || o.part === 'true') { quitStaff(g, m, 'poached'); return true; }
  m.poach.state = 'stayed';
  m.mood = clamp(staffMood(m) + 6, 0, 100);
  addNotif(g, { k: 'relup', c: c.id, at: later() + 1500, text: `🤝 ${firstName(c)} refuse l’offre de ${m.poach.from} et reste avec toi${o.why ? ` : « ${str(o.why, 60)} »` : ''}.` });
  addMem(g, c, `j’ai refusé l’offre de ${m.poach.from} pour rester avec le joueur`);
  return true;
}
// The AI never said (no refresh): their mood decides, with a part of chance.
function poachFallback(g, m) {
  const P = m.poach, v = staffMood(m), c = g.chars[m.c];
  const go = Math.random() < clamp((v < 40 ? 0.65 : v < 60 ? 0.35 : 0.12) * (P.rate > m.rate * 1.5 ? 1.3 : 1), 0, 0.9);
  if (go) { quitStaff(g, m, 'poached'); return; }
  P.state = 'stayed';
  if (c) addNotif(g, { k: 'relup', c: c.id, text: `🤝 ${firstName(c)} reste avec toi : ${gx(c.g, 'il', 'elle', 'iel')} a refusé l’offre de ${P.from}.` });
}

/* ---------- the clock of the team ---------- */
const teamIdle = () => !(clockBusy() || S.busy.newchar || S.busy.refresh || S.busy.act || inMiniGame() || S.publishing || S.catchup);
function tickTeam(g, t = Date.now()) {
  if (!t33On() || !g || !(g.staff || []).length) return false;
  let ch = false;
  const d = gameDay(t);
  for (const m of g.staff.slice()) {
    const c = g.chars[m.c];
    if (!c || !STAFF_ROLES[m.role]) continue;
    if (m.day == null) { m.day = d; ch = true; }
    else if (d > m.day) { const n = Math.min(7, d - m.day); m.day = d; for (let k = 0; k < n; k++) teamDay(g, m, t); ch = true; }
    if (!g.staff.includes(m)) continue;
    const rs = m.raise, il = gx(c.g, 'il', 'elle', 'iel');
    if (rs && rs.state === 'ask') {
      if (!rs.told && t >= (rs.tell || 0)) {
        rs.told = t;
        addTrigger(g, `@${c.handle} (${roleName(m.role, c.g).toLowerCase()} du joueur) est maintenant ${tierName(m.tier, c.g).toLowerCase()} : ${il} lui demande une augmentation en privé, à sa façon (${rateWord(g, m.role, rs.want)} au lieu de ${rateWord(g, m.role, rs.from)}).`, c.id);
        g.teamTell = Math.min(g.teamTell || Infinity, t);
        ch = true;
      } else if (t - rs.at > 5 * DAY_MS) { // never answered: a no, taken as such
        Object.assign(rs, { state: 'refused', at: t, silent: 1 });
        applyRel(g, c, -4, 'pas de réponse pour son augmentation', later(), 10);
        addMem(g, c, 'le joueur n’a jamais répondu à ma demande d’augmentation');
        ch = true;
      }
    }
    const v = staffMood(m);
    if (v < 20 && (m.said || 0) < 2) { m.said = 2; moodTalk(g, m, 2, t); ch = true; }
    else if (v < 40 && !m.said) { m.said = 1; moodTalk(g, m, 1, t); ch = true; }
    else if (v >= 55 && m.said) { m.said = 0; ch = true; }
    const P = m.poach;
    if (P && P.state === 'open' && t >= P.until) {
      if (!P.due) { P.due = t; g.teamTell = Math.min(g.teamTell || Infinity, t); ch = true; }
      else if (t - P.due > DAY_MS) { poachFallback(g, m); ch = true; continue; }
    }
    if (m.once && !m.doneR && t - m.since > 10 * DAY_MS) { quitStaff(g, m, 'expired'); ch = true; }
  }
  if (g.teamTell && t >= g.teamTell && teamIdle()) { delete g.teamTell; if (canAfford(g, 'refresh')) refreshFeed(0, { auto: true }); ch = true; }
  return ch;
}
// What a refresh may write about the team (the poaching, the end of a rope, an answer that is due).
function teamRefreshLines(g, t = Date.now()) {
  if (!t33On()) return [];
  const out = [];
  for (const m of g.staff || []) {
    const c = g.chars[m.c];
    if (!c || !STAFF_ROLES[m.role]) continue;
    const il = gx(c.g, 'il', 'elle', 'iel'), rn = roleName(m.role, c.g).toLowerCase(), tn = tierName(m.tier, c.g).toLowerCase(), P = m.poach, R = STAFF_ROLES[m.role];
    if (P && P.state === 'open' && t >= P.until) {
      const why = moodWhy(g, m, t, 2);
      out.push(`- OBLIGATOIRE : @${c.handle} (${rn} du joueur, ${tn}) donne sa réponse à l’offre de ${P.from} (${rateWord(g, m.role, P.rate)} ; chez le joueur : ${payWord(g, m)} ; son moral : ${moodLabel(m, c.g)[1].toLowerCase()}${why.length ? ` (${why.join(', ')})` : ''} ; relation ${fmtRel(c.rel)}) : son message privé au joueur ("dm"), puis {"t":"debauche_fin","by":"${c.handle}","part":false,"why":"≤ 60 caractères"} (part:true s’${il} accepte l’offre et quitte le joueur).`);
    } else if (!(P && P.state === 'open') && (!P || t - P.at > 12 * DAY_MS) && m.tier >= 2 && !m.once && t - m.since > 4 * DAY_MS && Math.random() < 0.3) {
      out.push(`- Facultatif, rarement, seulement si ça a du sens : un créateur plus gros que le joueur (un personnage du monde, ou une grosse chaîne) essaie de débaucher @${c.handle}, ${rn} du joueur (${tn}, ${payWord(g, m)}). Écris le message privé ("dm") où @${c.handle} en parle au joueur, puis {"t":"debauche","by":"${c.handle}","from":"@handle ou le nom de la chaîne","rate":${R.pay === 'cut' ? Math.min(30, m.rate + 3) : niceRound(m.rate * 1.5)}} (rate : ce qu’on ${gx(c.g, 'lui', 'lui', 'lui')} propose, plus que son tarif actuel).`);
    }
    if (staffMood(m) < 20 && !(P && P.state === 'open')) out.push(`- Facultatif : @${c.handle} (${rn} du joueur) est à bout (${moodWhy(g, m, t, 3).join(', ') || 'rien ne va'}). S’${il} décide de ${m.main ? 'ne plus travailler pour lui' : 'démissionner'} : son message privé au joueur ("dm"), puis {"t":"demission","by":"${c.handle}","why":"≤ 60 caractères"}.`);
  }
  return out;
}
function applyTeamLine(g, o, effects) {
  if (o.t === 'debauche') { effects.push(() => applyPoachLine(g, o)); return true; }
  if (o.t === 'debauche_fin') { effects.push(() => { const c = charByHandle(g, normHandle(o.by)); if (c) applyPoachEnd(g, c, o); }); return true; }
  if (o.t === 'demission') { effects.push(() => { const c = charByHandle(g, normHandle(o.by)), m = memberOf(g, c); if (m && (staffMood(m) < 25 || c.rel <= 0)) quitStaff(g, m, 'quit'); }); return true; }
  return false;
}

/* ---------- what their AI knows, what it may write (their messages) ---------- */
function teamDMCtx(g, c, m, t = Date.now()) {
  const il = gx(c.g, 'il', 'elle', 'iel'), Il = cap1(il), rn = roleName(m.role, c.g).toLowerCase(), tn = tierName(m.tier, c.g).toLowerCase();
  const out = [`${m.main ? `En plus de sa vie, ${c.name} travaille pour le joueur` : `${c.name} travaille pour le joueur`} : ${rn} (${tn}), ${payWord(g, m)}${m.once ? ', pour sa prochaine sortie seulement' : ''}, depuis ${fmtDur(t - m.since)}${m.unpaid ? `, et attend d’être ${gx(c.g, 'payé', 'payée', 'payé·e')}` : ''}. Franc·he, ${il} donne son avis de pro sur les contenus du joueur, a son caractère, peut demander une augmentation ou du matériel, et peut ${m.main ? 'arrêter' : 'démissionner'} si on ${gx(c.g, 'le', 'la', 'le ou la')} traite mal ou si rien ne s’arrange.`];
  if (!t33On()) return out;
  const L = moodLabel(m, c.g), bad = moodWhy(g, m, t, 3), good = moodGood(g, m, t, 2);
  out.push(`Son moral : ${L[1].toLowerCase()}${bad.length ? ` (${bad.join(', ')})` : good.length ? ` (${good.join(', ')})` : ''}. Son matériel : ${m.ownGear ? `le sien (${GEAR_LV[m.gear || 0].toLowerCase()})` : staffGearName(g, m).toLowerCase()}${gearGap(m) ? ` : pas à la hauteur de son niveau, il ${gx(c.g, 'lui', 'lui', 'lui')} faudrait ${NEED_WORD[gearNeed(m)]}` : ''}.${m.tier < 3 ? ` ${Il} progresse en travaillant avec le joueur.` : m.loy ? ` ${Il} est au sommet de son métier, et sa fidélité au joueur compte.` : ''}`);
  const rs = m.raise;
  if (rs && rs.state === 'ask') out.push(`${Il} a demandé une augmentation : ${rateWord(g, m.role, rs.want)} au lieu de ${payWord(g, m)} ; ${il} attend la réponse du joueur.`);
  else if (rs && rs.state === 'refused' && t - rs.at < 10 * DAY_MS) out.push(`Le joueur a refusé son augmentation ${agoLabel(rs.at, t)}${rs.silent ? ' (sans même répondre)' : ''}.`);
  else if (rs && (rs.state === 'ok' || rs.state === 'part') && t - rs.at < 7 * DAY_MS) out.push(`Le joueur ${gx(c.g, 'l’a augmenté', 'l’a augmentée', 'l’a augmenté·e')} ${agoLabel(rs.at, t)}${rs.state === 'part' ? ', un peu moins que demandé' : ''}.`);
  const P = m.poach;
  if (P && P.state === 'open') out.push(`${P.from} essaie de ${gx(c.g, 'le', 'la', 'le ou la')} débaucher : ${rateWord(g, m.role, P.rate)}. ${Il} n’a pas encore décidé (réponse ${fmtWhen(P.until, t)}) ; le joueur peut s’aligner ou ${gx(c.g, 'le', 'la', 'le ou la')} laisser partir.`);
  else if (P && (P.state === 'matched' || P.state === 'stayed') && t - P.at < 7 * DAY_MS) out.push(`${Il} a refusé l’offre de ${P.from} pour rester avec le joueur${P.state === 'matched' ? ', qui s’est aligné' : ''}.`);
  return out;
}
function teamDMLines(g, c, m) {
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), out = [];
  if (t33On()) out.push(salaryLine(g, c, m));
  if (t33On() && m.poach && m.poach.state === 'open') out.push(`- Si ${first} décide dans ce message pour l’offre de ${m.poach.from} : {"t":"debauche_fin","part":false,"why":"≤ 60 caractères"} (part:true s’${il} l’accepte et quitte le joueur).`);
  out.push(`- Seulement si ${first} ${m.main ? 'arrête de travailler pour le joueur' : 'démissionne'} pour de bon (le joueur l’a vraiment mal traité·e, ou son moral est au plus bas et rien ne change) : {"t":"quit"}.`);
  return out;
}
const quitOK = (c, m) => !!m && (c.rel <= 0 || staffMood(m) < 30 || !!(m.poach && m.poach.state === 'open'));

/* ---------- someone of the cast, given work ---------- */
const HIRE_RE = /miniature|vignette|montage|\bmonter\b|monteu|graphis|sc[ée]nar|[ée]crire (ma|mes|mon)|community|\bcm\b|mod[ée]rer|attach[ée]e? de presse|relations? presse|\bavocat|\bagent\b|bosser (pour|avec) moi|travailler (pour|avec) moi|embauch|recrut|\bjob\b|boulot|\btaf\b|je te paie|je te paye|r[ée]mun[ée]r/i;
function normRole(s) {
  const t = String(s || '').toLowerCase();
  if (STAFF_ROLES[t]) return t;
  return /mini|vignet|graph|visuel/.test(t) ? 'miniature' : /mont|edit/.test(t) ? 'monteur' : /sc[ée]na|[ée]cri|script/.test(t) ? 'scenariste' : /commu|\bcm\b|mod[ée]r|r[ée]seaux/.test(t) ? 'cm' : /presse|\brp\b|m[ée]dia/.test(t) ? 'rp' : /avoca|jurid/.test(t) ? 'avocat' : /agence/.test(t) ? 'agence' : /agent|manag/.test(t) ? 'agent' : '';
}
const hireRoles = (g) => Object.keys(STAFF_ROLES).filter((k) => !hasStaff(g, k) && (k !== 'agence' || agencyFounded(g)));
const hireOK = (g, c) => !!c && isMain(c) && c.unlocked && !c.cut && !memberOf(g, c) && !(c.cool && c.cool.k === 'bloque' && Date.now() < c.cool.until);
// What the player sends them (left in their conversation, to edit and send).
function hireText(g, c, role, once, rate) {
  const w = rate > 0 ? rateWord(g, role, rate) : '';
  if (once) {
    const pay = rate > 0 ? ` Je te paie ${fmtMoney(g, rate)}.` : '';
    if (role === 'miniature') return `Ça te dirait de faire la miniature de ma prochaine vidéo ?${pay}`;
    if (role === 'monteur') return `Tu serais ${gx(c.g, 'chaud', 'chaude', 'chaud·e')} pour monter ma prochaine vidéo ?${pay}`;
    return `Tu m’aiderais à écrire ma prochaine vidéo ?${pay}`;
  }
  return `Ça te dirait de bosser avec moi comme ${roleName(role, c.g).toLowerCase()} ?${w ? ` Je te propose ${w}.` : ''}`;
}
function hireCtx(g, c) {
  const A = c.hireAsk;
  if (!A || !STAFF_ROLES[A.role]) return [];
  const first = firstName(c);
  return [`Le joueur propose à ${first} un boulot : ${roleName(A.role, c.g).toLowerCase()} ${A.once ? 'pour sa prochaine sortie' : 'en continu'}, ${A.rate > 0 ? rateWord(g, A.role, A.rate) : 'sans parler d’argent'}. ${first} décide selon sa situation : son emploi du temps, l’argent, votre relation, si c’est son truc${inBadBuzz(c) ? ', et son bad buzz : un boulot peut tomber à pic' : ''}.`];
}
function hireLine(g, c) {
  const roles = hireRoles(g);
  if (!roles.length) return null;
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), A = c.hireAsk && STAFF_ROLES[c.hireAsk.role] ? c.hireAsk : null;
  const r0 = A ? A.role : roles.includes('miniature') ? 'miniature' : roles[0];
  return `- Si le joueur propose à ${first} de travailler pour lui, c’est le joueur qui paie (${roles.map((k) => `"${k}" : ${roleName(k, c.g).toLowerCase()}`).join(', ')}), une fois ou en continu, et que ${first} décide dans ce message : {"t":"boulot","ok":true,"role":"${r0}","rate":${A ? A.rate : STAFF_ROLES[r0].rates[1]},"once":${A ? !!A.once : STAFF_ROLES[r0].pay === 'video'},"niveau":1,"why":"≤ 60 caractères"} (role : la clé du métier ; rate : le tarif convenu, en ${moneySym(g)} par sortie pour le montage, la miniature et le scénario, par semaine pour le community management, la presse et l’agence, par dossier pour un avocat, en % des contrats pour un agent, 0 si c’est un service rendu ; once:true pour une seule fois, sa prochaine sortie, false pour travailler avec lui en continu ; niveau : ce que vaut ${first} dans ce métier, de 0 débutant·e à 2 expert·e, d’après son parcours). ok:false s’${il} refuse. Pas de ligne tant qu’${il} hésite ou négocie.`;
}
function applyHireLine(g, c, o, t = Date.now()) {
  if (!isMain(c) || memberOf(g, c)) return false;
  const A = c.hireAsk || null, first = firstName(c);
  if (!(o.ok === true || o.ok === 'true')) {
    c.hireAsk = null;
    addNotif(g, { k: 'reldown', c: c.id, at: later() + 1500, text: `${first} ne prendra pas le boulot${o.why ? ` : « ${str(o.why, 60)} »` : ''}.` });
    return true;
  }
  const role = normRole(o.role) || (A && A.role), R = STAFF_ROLES[role];
  if (!R || (role === 'agence' && !agencyFounded(g))) return false;
  const cur = hasStaff(g, role);
  if (cur) { addNotif(g, { k: 'money', c: c.id, at: later() + 1500, text: `${first} veut bien être ${roleName(role, c.g).toLowerCase()}, mais ${firstName(g.chars[cur.c])} occupe déjà ce poste.` }); return true; }
  const r0 = num(o.rate, A ? A.rate : R.rates[1]);
  const rate = R.pay === 'cut' ? clamp(Math.round(r0), 1, 30) : r0 > 0 ? niceRound(clamp(r0, 1, R.rates[3] * 2)) : 0;
  const once = R.pay === 'video' && (o.once === true || o.once === 'true' || (o.once == null && !!(A && A.once)));
  const tier = int(o.niveau, 0, 2, 0);
  const m = { id: uid('st'), c: c.id, role, tier, rate, since: t, next: t + 7 * DAY_MS, unpaid: 0, main: true, once, xp: 0, loy: 0, mood: clamp(Math.round(58 + c.rel / 4), 30, 85), gear: GEAR_NEED[tier], ownGear: true, day: gameDay(t) }; // (their own gear, what their level asks: better, when they grow, is the player's)
  if (R.pay === 'week' && rate > 0 && !pay(g, rate, `Première semaine de ${first}`, 'staff')) m.unpaid = 1;
  g.staff.push(m);
  c.hireAsk = null;
  const bb = inBadBuzz(c), rn = roleName(role, c.g).toLowerCase();
  applyRel(g, c, bb ? 6 : 2, bb ? 'du boulot en plein bad buzz' : 'un boulot proposé', later() + 1200, 10);
  addMem(g, c, bb ? `le joueur m’a donné du boulot (${rn}) en plein bad buzz` : `je bosse pour le joueur : ${rn}${once ? ', une fois' : ''}`);
  addNotif(g, { k: 'money', c: c.id, at: later() + 1500, text: `💼 ${first} travaille pour toi : ${rn}${once ? ' pour ta prochaine sortie' : ''}${rate > 0 ? `, ${payWord(g, m)}` : ', pour te rendre service'}.${m.unpaid ? ` Pas assez d’argent pour sa première semaine : ${gx(c.g, 'il', 'elle', 'iel')} l’attend.` : ''}` });
  addChronicle(g, `${c.name} travaille pour ${g.player.name} (${rn}${once ? ', une fois' : ''}).`);
  touch(c);
  return true;
}
// The end of a job for someone of the cast: they stay in the player's life.
function mainJobEnd(g, c, m, why) {
  const first = firstName(c), rn = roleName(m.role, c.g).toLowerCase();
  if (why === 'done') { addNotif(g, { k: 'money', c: c.id, text: `✅ ${first} a fini son boulot (${rn}) sur ta sortie.` }); addMem(g, c, `j’ai bossé une fois pour le joueur (${rn})`); return; }
  if (why === 'expired') { addNotif(g, { k: 'money', c: c.id, text: `Le boulot de ${first} (${rn}) tombe à l’eau : pas de sortie en 10 jours.` }); return; }
  if (why === 'unpaid') {
    applyRel(g, c, -25, `pas ${gx(c.g, 'payé', 'payée', 'payé·e')}`, later(), 30);
    addMem(g, c, `le joueur ne m’a pas ${gx(c.g, 'payé', 'payée', 'payé·e')} pour mon boulot : j’ai arrêté`);
    addIncomingDM(g, c, `Deux semaines sans être ${gx(c.g, 'payé', 'payée', 'payé·e')}… J’arrête de bosser pour toi. Ça me fait mal de te dire ça.`, later() + 1000, { max: 300 });
    repMove(g, { pro: -10 }, `${c.name} pas ${gx(c.g, 'payé', 'payée', 'payé·e')}`);
    addNotif(g, { k: 'money', c: c.id, text: `${first} arrête de travailler pour toi (pas ${gx(c.g, 'payé', 'payée', 'payé·e')}).` });
  } else if (why === 'fired') {
    applyRel(g, c, -8, 'tu lui as retiré le boulot', later(), 10);
    addMem(g, c, `le joueur m’a retiré mon boulot (${rn})`);
    addNotif(g, { k: 'money', c: c.id, text: `Tu arrêtes de travailler avec ${first}.` });
  } else if (why === 'poached') {
    addMem(g, c, `j’ai arrêté de bosser pour le joueur : ${m.poach ? m.poach.from : 'quelqu’un d’autre'} m’a fait une meilleure offre`);
    addNotif(g, { k: 'reldown', c: c.id, text: `🎣 ${first} arrête de travailler pour toi : ${gx(c.g, 'il', 'elle', 'iel')} part chez ${m.poach ? m.poach.from : 'quelqu’un d’autre'}.` });
  } else if (why === 'scandal') {
    applyRel(g, c, -6, 'ton scandale', later(), 10);
    addNotif(g, { k: 'money', c: c.id, text: `${first} arrête de travailler pour toi : ${gx(c.g, 'il', 'elle', 'iel')} ne veut pas être ${gx(c.g, 'associé', 'associée', 'associé·e')} à ton scandale.` });
  } else { addMem(g, c, `j’ai arrêté de bosser pour le joueur (${rn})`); addNotif(g, { k: 'reldown', c: c.id, text: `${first} arrête de travailler pour toi.` }); }
  addChronicle(g, `${c.name} ne travaille plus pour ${g.player.name} (${rn}).`);
}
// 0.33: the team of before, kept as it was (its gear: what its level asks; its mood: fine).
function migrateTeam(g) {
  for (const m of g.staff || []) {
    if (m.gear == null) m.gear = GEAR_NEED[clamp(m.tier || 0, 0, 3)];
    if (m.xp == null) m.xp = 0;
    if (m.loy == null) m.loy = 0;
    if (m.mood == null) m.mood = MOOD0;
  }
}

/* ---------- on screen ---------- */
function TeamRow({ g, m, now, inProfile }) {
  const p = g.chars[m.c];
  if (!p) return null;
  const R = STAFF_ROLES[m.role], first = firstName(p), on = t33On();
  const L = moodLabel(m, p.g), bad = on ? moodWhy(g, m, now, 2) : [], rs = m.raise, P = m.poach;
  const step = m.tier < 3 ? STAFF_STEPS[m.tier] : 0;
  return html`<div class=${'staff-row' + (inProfile ? ' in-prof' : '')} key=${m.id}>
    ${inProfile ? null : html`<${Avatar} who=${author(g, 'c:' + p.id)} size=${44} onClick=${() => openDM(p.id)} />`}
    <div class="mid">
      ${inProfile ? null : html`<b>${p.name}${m.main ? html` <span class="st-tag">du réseau</span>` : null}</b>`}
      <span>${R.emoji} ${roleName(m.role, p.g)} · ${tierName(m.tier, p.g).toLowerCase()} · ${m.rate > 0 || R.pay === 'cut' ? payWord(g, m) : 'pour te rendre service'}${m.once ? ' · une fois' : ''}${m.unpaid ? ` · pas ${gx(p.g, 'payé', 'payée', 'payé·e')} !` : ''}</span>
      <small>${R.fx(memberPower(g, m))}</small>
      ${on ? html`<div class="st-prog">${step ? html`<${Meter} frac=${(m.xp || 0) / step} tone="good" /><em>Vers ${tierName(m.tier + 1, p.g).toLowerCase()} : ${m.xp || 0}/${step} ${R.pay === 'video' ? plural(step, 'sortie', 'sorties') : plural(step, 'jour', 'jours')}</em>`
        : html`<${Meter} frac=${(m.loy || 0) / LOY_MAX} tone="good" /><em>⭐ Fidélité : +${fmtDec(m.loy || 0)} ${plural(m.loy || 0, 'point', 'points')}${(m.loy || 0) >= LOY_MAX ? ' (au maximum)' : ` sur ${LOY_MAX}`}</em>`}</div>
        <span class=${'st-mood ' + L[2]}>${L[0]} ${L[1]}${bad.length ? ` · ${bad.join(', ')}` : ''}</span>
        <span class="st-gear">${(STAFF_GEAR[m.role] || STAFF_GEAR.monteur).emoji} ${m.ownGear ? `Son propre matériel (${GEAR_LV[m.gear || 0].toLowerCase()})` : m.gear ? `${staffGearName(g, m)} (${GEAR_LV[m.gear].toLowerCase()})` : 'Pas de matériel fourni'}${gearGap(m) ? html` · <b class="bad">il ${gx(p.g, 'lui', 'lui', 'lui')} faut ${NEED_WORD[gearNeed(m)]}</b>` : null} ${(m.gear || 0) < 3 ? html`<button class="linkbtn" onClick=${() => openLayer({ t: 'stgear', id: m.id })}>${m.gear && !m.ownGear ? 'Améliorer' : 'Équiper'}</button>` : null}</span>
        ${rs && rs.state === 'ask' ? html`<div class="st-ask"><span>💸 Demande ${rateWord(g, m.role, rs.want)} au lieu de ${payWord(g, m)}</span><div class="row">
          <button class="btn btn-hot btn-sm" onClick=${() => { if (acceptRaise(g, m, rs.want)) update(); }}>Accepter</button>
          <button class="btn btn-ghost btn-sm" onClick=${() => { if (refuseRaise(g, m)) update(); }}>Refuser</button>
          <button class="linkbtn" onClick=${() => openDM(p.id)}>En parler</button></div></div>` : null}
        ${P && P.state === 'open' ? html`<div class="st-ask poach"><span>🎣 ${P.from} ${gx(p.g, 'lui', 'lui', 'lui')} propose ${rateWord(g, m.role, P.rate)} · réponse ${fmtWhen(P.until, now)}</span><div class="row">
          <button class="btn btn-hot btn-sm" onClick=${() => { if (matchPoach(g, m)) update(); }}>S’aligner (${rateWord(g, m.role, P.rate)})</button>
          <button class="linkbtn" onClick=${() => openDM(p.id)}>En parler</button>
          <button class="linkbtn quiet" onClick=${() => askConfirm({ title: `Laisser partir ${first} ?`, text: `${cap1(gx(p.g, 'il', 'elle', 'iel'))} rejoint ${P.from}.`, ok: 'Laisser partir', danger: true, run: () => { quitStaff(g, m, 'poached'); update(); } })}>Laisser partir</button></div></div>` : null}` : null}
    </div>
    <div class="acts">
      ${inProfile ? null : html`<button class="btn btn-ghost btn-sm" onClick=${() => openDM(p.id)} aria-label=${'Écrire à ' + first} title=${'Écrire à ' + first}><${Icon} n="msg" s=${14} /></button>`}
      ${on ? html`<button class="linkbtn" onClick=${() => askConfirm({ title: `Une prime pour ${first} ?`, text: `${fmtMoney(g, bonusOf(g, m))} : de quoi ${gx(p.g, 'le', 'la', 'le ou la')} remercier.`, ok: 'Verser la prime', run: () => { if (giveBonus(g, m)) { toast(`🎁 Prime versée à ${first}.`, 'good'); update(); } } })}>🎁 Prime</button>` : null}
      <button class="linkbtn quiet" onClick=${() => askConfirm({ title: m.main ? `Arrêter de travailler avec ${first} ?` : `Te séparer de ${first} ?`, text: 'Ça risque de mal passer.', ok: m.main ? 'Arrêter' : 'Se séparer', danger: true, run: () => { quitStaff(g, m, 'fired'); update(); } })}>${m.main ? 'Arrêter' : 'Se séparer'}</button>
    </div>
  </div>`;
}
// Their gear: three levels, the old one sold on.
function StaffGearLayer({ l, g, i }) {
  const m = (g.staff || []).find((x) => x.id === l.id), p = m && g.chars[m.c];
  if (!m || !p) return html`<${LayerShell} i=${i} title="Matériel"><div class="empty"><b>Cette personne ne fait plus partie de ton équipe.</b></div><//>`;
  const first = firstName(p), need = gearNeed(m), cash = g.career.cash;
  return html`<${LayerShell} i=${i} title=${'Matériel de ' + first}>
    <section class="section">
      <p class="muted">${roleName(m.role, p.g)} · ${tierName(m.tier, p.g).toLowerCase()} : à son niveau, il ${gx(p.g, 'lui', 'lui', 'lui')} faut ${NEED_WORD[need]}. Avec moins, ${gx(p.g, 'il', 'elle', 'iel')} travaille moins bien et ${gx(p.g, 'il', 'elle', 'iel')} le vit mal. Plus ${gx(p.g, 'il', 'elle', 'iel')} progresse, plus ${gx(p.g, 'il', 'elle', 'iel')} en demande.</p>
      <p class="muted">Aujourd’hui : ${m.ownGear ? `son propre matériel (${GEAR_LV[m.gear || 0].toLowerCase()})` : m.gear ? `${staffGearName(g, m)} (${GEAR_LV[m.gear].toLowerCase()})` : 'rien de fourni'}.</p>
      <div class="sg-list">${[1, 2, 3].map((lv) => { const cost = gearPrice(m, lv), have = lv <= (m.gear || 0); return html`<div key=${lv} class=${'sg-opt' + (lv === need ? ' is-need' : '') + (have ? ' have' : '')}>
        <div class="mid"><b>${GEAR_LV[lv]} · ${staffGearName(g, m, lv)}</b><small>${have ? 'Déjà là' : lv === need ? 'Ce qu’il faut à son niveau' : lv > need ? 'Plus que nécessaire : un petit plus pour son moral' : 'En dessous de son niveau'}</small></div>
        ${have ? null : html`<button class="btn btn-hot btn-sm" disabled=${cash < cost} onClick=${() => { if (buyStaffGear(g, m, lv)) { toast(`🧰 ${first} a son nouveau matériel.`, 'good'); update(); closeLayer(); } }}>${fmtMoney(g, cost)}</button>`}
      </div>`; })}</div>
      ${m.gear && !m.ownGear ? html`<small class="muted">L’ancien matériel est revendu : 30 % de son prix sont déduits.</small>` : null}
    </section>
  <//>`;
}
// A job for someone of the cast: what, once or for good, how much; the proposal goes into their messages.
function HireLayer({ l, g, i }) {
  const c = g.chars[l.id];
  const roles = Object.keys(STAFF_ROLES).filter((k) => k !== 'agence' || agencyFounded(g));
  const free = hireRoles(g);
  const [role, setRole] = useState(() => (free.includes('miniature') ? 'miniature' : free[0] || 'miniature'));
  const R = STAFF_ROLES[role];
  const [once, setOnce] = useState(true);
  const [rate, setRate] = useState(() => R.rates[1]);
  if (!c || !hireOK(g, c)) return html`<${LayerShell} i=${i} title="Proposer un boulot"><div class="empty"><b>${c && memberOf(g, c) ? `${firstName(c)} travaille déjà pour toi.` : 'Ce n’est pas possible pour l’instant.'}</b></div><//>`;
  const first = firstName(c), taken = hasStaff(g, role), canOnce = R.pay === 'video', o = canOnce && once;
  const pick = (k) => { setRole(k); setRate(STAFF_ROLES[k].rates[1]); };
  const unit = R.pay === 'cut' ? '% des contrats' : R.pay === 'week' ? 'par semaine' : R.pay === 'case' ? 'par dossier' : 'par sortie';
  const send = () => {
    const r = Math.max(0, Math.round(num(rate, 0)));
    c.hireAsk = { role, once: o, rate: r, at: Date.now() };
    S.drafts.dm[c.id] = hireText(g, c, role, o, r);
    closeLayer();
    openDM(c.id);
  };
  return html`<${LayerShell} i=${i} title=${'Un boulot pour ' + first}>
    <div class="role-grid">${roles.map((k) => html`<button key=${k} type="button" class=${'role-opt' + (role === k ? ' on' : '')} onClick=${() => pick(k)} aria-pressed=${role === k ? 'true' : 'false'}><span aria-hidden="true">${STAFF_ROLES[k].emoji}</span>${STAFF_ROLES[k].x}</button>`)}</div>
    <section class="section">
      <p class="muted">${R.desc}</p>
      ${taken ? html`<p class="notice"><${Icon} n="users" /><span>${g.chars[taken.c].name} occupe déjà ce poste. Sépare-toi ${gx(g.chars[taken.c].g, 'de lui', 'd’elle', 'de lui ou d’elle')} dans le Studio pour le proposer à ${first}.</span></p>`
        : html`${canOnce ? html`<div class="field"><span class="lbl">Combien de temps</span><${Seg} label="Durée" items=${[[true, 'Une fois (ta prochaine sortie)'], [false, 'En continu']]} value=${once} onPick=${setOnce} /></div>` : html`<p class="muted">En continu : ${gx(c.g, 'il', 'elle', 'iel')} rejoint ton équipe, en gardant sa vie.</p>`}
        <div class="field"><span class="lbl">Ce que tu proposes</span><div class="row hire-pay"><input type="number" min="0" step=${R.pay === 'cut' ? 1 : 10} value=${rate} onInput=${(e) => setRate(e.target.value)} aria-label="Montant" /><span>${R.pay === 'cut' ? unit : `${moneySym(g)} ${unit}`}</span></div>
          <small class="muted">Le prix du marché : ${STAFF_TIERS.map((T, k) => `${T.x.toLowerCase()} ${R.pay === 'cut' ? R.rates[k] + ' %' : fmtMoney(g, R.rates[k])}`).join(' · ')}. 0 : un service entre vous.</small></div>
        <button class="btn btn-hot" onClick=${send}><${Icon} n="msg" s=${15} /> Écrire à ${first}</button>
        <small class="muted">${first} décide : selon sa situation, votre relation et ce que tu proposes. ${o ? `Une fois la sortie publiée, c’est fini.` : `${cap1(gx(c.g, 'il', 'elle', 'iel'))} progresse en travaillant avec toi, et reste ${gx(c.g, 'lui-même', 'elle-même', 'iel-même')}.`}</small>`}
    </section>
  <//>`;
}
