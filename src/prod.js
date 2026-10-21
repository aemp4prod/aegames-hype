/* =========================================================
   0.30.1: the big productions (« grosses productions »). From 100 000 subscribers, a release made like a pro one, over
   two or three days: the preparation, the shoot and the post-production, a mini-game each, and life goes on between
   them (the clock moves on by the time each one takes). A quote at another scale, a team that counts more (and is paid
   for every day of it), a cast of characters asked in their messages (their AI says yes or no), several sponsors in the
   same video (their clauses may clash), teasers and a premiere live. Out, its views keep climbing for days; the network
   may write about it, nominate it; a flop costs dearly. One at a time.
   A hitch is never the game's own doing: the characters' AI may launch one (someone of the cast ill, the venue lost, a
   leak, the budget that explodes), and the player picks how to deal with it.
   r.big: { size (days), stage (0 preparation, 1 shoot, 2 post-production, 3 ready), slots (when each stage starts),
   k (its views), scores, last (the stage just played, shown once), cast [{ c, ok }], deals, hitch (to decide),
   hitches (decided), pen (points lost), hype, more (hours added by stage), tail (its views, out), nom }.
   r.due: when the stage to come starts (ready: its time out, r.outAt, the time announced).
   ========================================================= */
const BIG_MIN = 100000; // the subscribers it takes
const BIG_FMTS = ['vidéo', 'short', 'clip', 'podcast']; // (never a live: it lasts what it lasts, nothing to edit after)
// The stages: day d of the production, at h o'clock, w hours of work for a video (a short half of it, a podcast three
// quarters). One played late comes later, and those after it too; the release keeps its time (late, it is late).
const BIG_PLAN = {
  2: [{ d: 0, h: 9, w: 4 }, { d: 0, h: 14, w: 6 }, { d: 1, h: 9, w: 5 }],
  3: [{ d: 0, h: 9, w: 6 }, { d: 1, h: 9, w: 9 }, { d: 2, h: 9, w: 7 }],
};
const BIG_K = { 2: 3, 3: 4.5 }; // its views (and so its ad money, and what a brand pays to be in it)
const BIG_STAGES = [
  { k: 'prep', emoji: '🧠', label: 'Préparation', go: 'Lancer la préparation', of: 'la préparation', de: 'de préparation', icon: 'calendar', tiers: ['au top', 'correcte', 'ratée'] },
  { k: 'shoot', emoji: '🎬', label: 'Tournage', go: 'Lancer le tournage', of: 'le tournage', de: 'de tournage', icon: 'clapper', tiers: ['au top', 'correct', 'raté'] },
  { k: 'post', emoji: '✂️', label: 'Post-production', go: 'Lancer la post-production', of: 'la post-production', de: 'de post-production', icon: 'scissors', tiers: ['au top', 'correcte', 'ratée'] },
];
const BIG_PREP = 0.2; // the preparation moves the shoot's score by up to ±10 points
const BIG_EDIT = 0.4; // the post-production moves it by up to ±20 (an ordinary edit: ±15)
const BIG_CAST = 3, BIG_DEALS = 3, BIG_HITCHES = 2;
const BIG_GRACE = 12 * 3600000; // its time gone by that much and still not out: given up
const BIG_TAIL = 5; // the days its views keep climbing
const BIG_DIFFS = DIFFS.filter((d) => !d.real); // (« Cauchemar » is a quiz of real knowledge: not three stages of it)

const bigOn = (g) => ((g && g.releases) || []).find((r) => r.big && r.state === 'scheduled') || null;
const bigWhats = (g) => PF(g).fmts.filter((f) => BIG_FMTS.includes(f));
function bigWhat0(g) {
  const all = bigWhats(g), can = all.filter((f) => canMake(g, f).ok), L = can.length ? can : all;
  return L.includes('vidéo') ? 'vidéo' : L[0] || null;
}
// Why one cannot start now ('' when it can).
function bigWhy(g) {
  if (!g) return 'Pas de partie.';
  if (g.stats.followers < BIG_MIN) return `Les grosses productions s’ouvrent à ${fmtPlain(BIG_MIN)} abonnés (tu en as ${fmtPlain(g.stats.followers)}).`;
  if (bigOn(g)) return 'Une production est déjà en cours : une seule à la fois.';
  if (!bigWhats(g).length) return `Pas de grosse production possible sur ${pfName(g, platformOf(g))}.`;
  if (!planRoom(g)) return `${MAX_PLANNED} sorties prévues, c’est le maximum : publie-en une d’abord.`;
  if (suspended(g)) return 'Ta chaîne est suspendue : rien ne peut sortir d’ici là.';
  return '';
}
// A moment of the schedule, as a day and an hour (« aujourd'hui 9 h », « demain 14 h », « samedi 9 h »).
function atWord(t, now = Date.now()) {
  const k = dayDiff(t, now), h = hourOf(t);
  if (gameDate(now).getHours() >= 6 && (k === 0 || k === 1)) return `${k ? 'demain' : 'aujourd’hui'} ${h}`;
  return `${gameDate(t).toLocaleDateString('fr-FR', { weekday: 'long' })} ${h}`;
}
const bigTodo = (r) => !!(r && (r.big ? r.big.stage < 3 : !r.played)); // still something to make before it can come out
// The hours of a stage: by format; the post-production with the team (an editor, a designer); what a hitch added.
const bigHours = (h, k, team) => Math.max(1, k === 2 && team ? h * (team.k || 1) - (team.min || 0) / 60 : h);
function bigWork(r, k) {
  const B = r.big, P = BIG_PLAN[B.size][clamp(k, 0, 2)];
  return bigHours(P.w * (PROD_H[r.what] || 4) / 4, k, r.team) + ((B.more && B.more[k]) || 0);
}
const bigTotal = (r) => [0, 1, 2].reduce((n, k) => n + bigWork(r, k), 0);
// When each stage starts for a production starting on day `day` (0: today), when it is all done, and when it comes out
// (the hour chosen, on the day of the last stage). ok: the first stage is still to come and it fits.
function bigPlan(g, o, t = Date.now()) {
  const size = o.size === 3 ? 3 : 2, P = BIG_PLAN[size], f = (PROD_H[o.what] || 4) / 4, team = teamOf(g, o.what);
  const works = P.map((s, k) => bigHours(s.w * f, k, team));
  const slots = P.map((s) => dayDue(o.day + s.d, s.h, t));
  for (let k = 1; k < 3; k++) slots[k] = Math.max(slots[k], slots[k - 1] + works[k - 1] * 3600000); // (right after the one before)
  const end = slots[2] + works[2] * 3600000, out = dayDue(o.day + P[2].d, o.hour, t);
  return { size, slots, works, end, out, ok: slots[0] > t + 60000 && out >= end + 30 * 60000, fits: out >= end + 30 * 60000 };
}

/* ---------- planned ---------- */
function scheduleBig(g, o) {
  const why = bigWhy(g);
  if (why) { toast(why, 'bad'); return null; }
  const what = bigWhats(g).includes(o.what) ? o.what : bigWhat0(g);
  const can = canMake(g, what);
  if (!can.ok) { toast(can.why, 'bad'); return null; }
  const topic = str(o.topic, 100);
  if (!topic) return null;
  const t = Date.now(), plan = bigPlan(g, { what, size: o.size, day: int(o.day, 0, 7, 1), hour: int(o.hour, 0, 23, 20) }, t);
  if (!plan.ok) { toast('Ce planning ne tient pas : choisis un autre jour ou une autre heure de sortie.', 'bad'); return null; }
  const diff = diffOf(o.diff).real ? 'mythique' : diffOf(o.diff).id;
  const r = {
    id: uid('rl'), what, noun: what === 'short' ? PF(g).shortName : '', topic, plot: str(o.plot, PLOT_MAX), post: null, at: t, due: plan.slots[0], outAt: plan.out,
    state: 'scheduled', delays: 0, tries: 0, c: null, game: null, played: null, said: '', diff, planned: true,
    big: { size: plan.size, stage: 0, slots: plan.slots, k: BIG_K[plan.size], scores: [], cast: [], deals: [], hitches: [], at: t },
  };
  const tm = teamOf(g, what); if (tm) r.team = tm;
  if (o.devis) r.devis = o.devis;
  for (const id of (o.cast || []).slice(0, BIG_CAST)) { const c = g.chars[id]; if (featOK(g, c)) r.big.cast.push({ c: c.id, ok: null, at: t }); }
  r.big.deals = [...new Set(o.deals || [])].filter((id) => { const d = dealOf(g, id); return d && d.state === 'signed' && d.what === what; }).slice(0, BIG_DEALS);
  g.releases.push(r);
  trimReleases(g);
  const S0 = plan.slots;
  addNotif(g, { k: 'release', text: `🎥 Grosse production lancée : « ${str(topic, 60)} ». Préparation ${atWord(S0[0], t)}, tournage ${atWord(S0[1], t)}, post-production ${atWord(S0[2], t)} ; sortie ${atWord(plan.out, t)}.` });
  addChronicle(g, `${g.player.name} lance une grosse production : « ${str(topic, 80)} » (${plan.size} jours de travail).`);
  addTrigger(g, `Le joueur lance une GROSSE PRODUCTION : « ${str(topic, 80)} », ${plan.size} jours de travail (préparation, tournage, post-production), sortie ${fmtWhen(plan.out, t)}${r.devis && r.devis.total ? `, avec un budget de ${fmtMoney(g, r.devis.total)}` : ''}. Le réseau en parle : certains ont hâte, d’autres attendent de voir.`);
  return r;
}
// Where it stands, for the prompts (the release line of the context).
function bigCtxLine(g, r, now = Date.now()) {
  const B = r.big, k = Math.min(B.stage, 2), st = BIG_STAGES[k];
  const where = B.stage >= 3 ? 'tout est fini, elle est prête à sortir' : B.stage === 0 ? `préparation ${r.due > now ? fmtWhen(r.due, now) : 'en cours'}` : B.stage === 1 ? `préparation faite, tournage ${r.due > now ? fmtWhen(r.due, now) : 'en cours'}` : `tournée, ${st.of} ${r.due > now ? fmtWhen(r.due, now) : 'en cours'}`;
  const cast = (B.cast || []).map((x) => { const c = g.chars[x.c]; return c ? `@${c.handle} (${x.ok === true ? 'partant·e' : x.ok === false ? 'ne sera pas dedans' : 'n’a pas encore répondu'})` : null; }).filter(Boolean);
  const deals = (B.deals || []).map((id) => dealOf(g, id)).filter((d) => d && d.state === 'signed').map((d) => d.brand);
  return `Le joueur prépare une GROSSE PRODUCTION (${unW(r)} pro, ${B.size} jours de travail) : « ${r.topic} » ; ${where} ; sortie ${relAnn(r) > now ? 'prévue dans ' + fmtDur(relAnn(r) - now) : 'attendue maintenant'}${cast.length ? ` ; casting : ${cast.join(', ')}` : ''}${deals.length ? ` ; partenaires : ${deals.join(', ')}` : ''}${r.devis && r.devis.total ? ` ; budget ${fmtMoney(g, r.devis.total)}` : ''}${r.delays ? ` ; déjà repoussée ${r.delays} fois` : ''}. Le public l’attend.`;
}
// « c'est l'heure de la préparation de ta production (4 h de travail) »
const bigDueWord = (r) => (r.big.stage >= 3 ? 'doit sortir maintenant' : `c’est l’heure de ${BIG_STAGES[r.big.stage].of} (${hWord(bigWork(r, r.big.stage))} de travail)`);
const bigHeld = (r) => `Ta production « ${wordCut(r.topic, 40)} » : ${r.big.stage >= 3 ? 'elle doit sortir d’abord : publie-la' : `${BIG_STAGES[r.big.stage].of} est à faire d’abord : lance-la`}, ou décale la production d’un jour.`;
const bigLimit = (r) => Math.max(relAnn(r), r.waited || 0) + BIG_GRACE;
// The notice when its stage comes (wherever the player is).
function bigDueNotif(g, r, t = Date.now()) {
  const B = r.big;
  const text = B.stage >= 3 ? `🎥 C’est l’heure : ta production « ${str(r.topic, 60)} » doit sortir !` : `🎥 C’est l’heure de ${BIG_STAGES[B.stage].of} de ta production « ${str(r.topic, 60)} » : ${hWord(bigWork(r, B.stage))} de travail.`;
  addNotif(g, { k: 'releasedue', text });
  if (!inMiniGame()) toast(B.hitch ? `${HITCH_KINDS[B.hitch.kind].emoji} Un imprévu attend ta décision avant ${BIG_STAGES[Math.min(B.stage, 2)].of}.` : text, 'flash', { label: B.stage >= 3 ? 'Publier' : 'Y aller', run: () => startShoot(r) });
}

/* ---------- the stages ---------- */
// Opens a stage's mini-game: the preparation (written by the AI on the topic, or a game of the format), the shoot (a
// shoot, as any release's).
const genBigStage = (r) => {
  const g = S.game;
  if (!g || !r || !r.big || r.state !== 'scheduled' || r.game || S.busy.mg || r.big.hitch || r.big.stage > 1) return null;
  const B = r.big;
  B.at0 = Date.now(); // (its time counts from here)
  if (B.stage === 1) { if (!B.shotSaid) { B.shotSaid = 1; castTold(g, r); } return genShoot(r); }
  autoSave(g, `Avant la préparation de ta production`);
  payCrew(g, r); // the team is paid for the whole production (every day of it)
  const kind = S.mgForce || pick(MG_KINDS_AI.filter((x) => x !== g.mgLast).concat(['memoire']));
  if (ROUND_MAKERS[kind]) { r.game = Object.assign(ROUND_MAKERS[kind](r, diffOf(r.diff)), { diff: r.diff }); g.mgLast = kind; update(); return null; }
  const force = MG_KINDS_AI.includes(kind) ? kind : null;
  return genGame(r, () => promptMiniGame(g, r, force), () => bigPrepGame(r), 'La préparation', force);
};
const BIG_PREP_STEPS = ['Trouver le concept', 'Écrire le script', 'Faire les repérages', 'Caler le casting', 'Réserver le lieu et le matériel', 'Établir le plan de tournage'];
const bigPrepGame = (r) => ({ kind: 'ordre', title: 'La préparation', intro: `Remets la préparation de « ${str(r.topic, 60)} » dans le bon ordre.`, items: BIG_PREP_STEPS.map((text) => ({ text })) });
// The cast told the shoot starts (those who said yes are in it; the others are not).
function castTold(g, r) {
  for (const x of r.big.cast) {
    const c = g.chars[x.c];
    if (!c) continue;
    if (x.ok == null) { x.ok = false; x.late = 1; addNotif(g, { k: 'reldown', c: c.id, text: `${firstName(c)} n’a jamais répondu pour ta production : tu tournes sans ${gx(c.g, 'lui', 'elle', 'iel')}.` }); }
  }
}
// A stage's mini-game is over (finishShoot): its score, the time it takes, the next stage.
function bigFinish(g, r, score) {
  const B = r && r.big;
  if (!g || !B || B.stage > 1 || r.state !== 'scheduled') return;
  score = clamp(num(score, 0), 0, 1);
  r.tries = (r.tries || 0) + 1;
  const k = B.stage;
  B.scores[k] = score;
  B.lastGame = r.game ? { kind: r.game.kind, items: r.game.items, edit: r.game.edit } : null;
  if (k === 0) {
    B.prep = score;
    B.last = { k, score, bonus: Math.round((score - 0.5) * BIG_PREP * 100) / 100, at: Date.now() };
    r.game = null;
  } else {
    const bonus = B.prep != null ? (B.prep - 0.5) * BIG_PREP : 0, s = clamp(score + bonus - (B.pen || 0), 0, 1);
    r.played = { score: s, tier: tierOf(s), at: Date.now(), kind: r.game ? r.game.kind : '', diff: r.game && r.game.diff ? r.game.diff : r.diff, raw: score };
    r.edit = null; r.editGame = null; r.render = null; r.thumb = null;
    B.last = { k, score, bonus: Math.round(bonus * 100) / 100, pen: B.pen || 0, total: s, at: Date.now() };
    r.game = null;
  }
  bigNext(g, r, k);
}
// A stage done: the next one is called out at its time; the clock moves on by the time it takes (from when it started).
function bigNext(g, r, k) {
  const B = r.big, t = Date.now();
  const ms = Math.round(bigWork(r, k) * 3600000 - Math.max(0, t - (B.at0 || t)));
  B.stage = k + 1;
  delete B.at0;
  r.due = k < 2 ? B.slots[k + 1] : r.outAt; // (passed already: it is due now)
  r.dueSaid = false;
  if (ms >= 60000) { B.wait = ms; B.waitK = k; bigJump(g, r); }
}
function bigJump(g, r) {
  const B = r && r.big;
  if (!g || !B || !B.wait) return 0;
  if (typeof skipBusy === 'function' && skipBusy()) return 0; // (the characters are still writing: once they are done)
  const ms = B.wait, k = B.waitK || 0;
  delete B.wait; delete B.waitK;
  jumpClock(g, ms);
  g.lastPlayedAt = Date.now();
  toast(`⏱️ ${hWord(ms / 3600000)} ${BIG_STAGES[k].de} plus tard… Il est ${hourOf(Date.now())}.`, 'flash');
  return ms;
}
// The post-production starts: the team does its part (the editor edits, the designer makes the thumbnail).
function bigPostStart(g, r) {
  const B = r && r.big;
  if (!g || !B || B.stage !== 2 || B.postOn || r.state !== 'scheduled' || !r.played) return false;
  autoSave(g, `Avant la post-production de ta production`);
  B.postOn = Date.now();
  B.at0 = Date.now();
  const crew = r.crew || [];
  if (needsThumb(r) && crew.includes('miniature') && !r.thumb) r.thumb = staffThumb(g, r);
  if (!needsEdit(r)) { bigPostDone(g, r); return true; }
  if (crew.includes('monteur')) applyEdit(g, r, clamp(0.5 + 0.1 * staffPower(g, 'monteur') + rand(-0.05, 0.05), 0, 1), 'staff'); // (then bigPostDone)
  return true;
}
// The edit is done (by the player or the editor): the time of the post-production goes by; ready to come out.
function bigPostDone(g, r) {
  const B = r && r.big;
  if (!g || !B || B.stage !== 2 || !B.postOn) return;
  B.scores[2] = r.edit ? r.edit.m : 0.5;
  bigNext(g, r, 2);
}

/* ---------- moved, dropped ---------- */
// One more day for what is left (and the release): well ahead, nobody minds (twice); late, it is a real postponement.
const bigShiftFree = (r, t = Date.now()) => (!!r.away && t <= bigLimit(r)) || (r.due - t > RELEASE_NOTICE && relAnn(r) - t > RELEASE_NOTICE && (r.moved || 0) < 2); // (its time came while the player was away: once, free)
function bigShiftWord(g, r) { return bigShiftFree(r) ? 'Bien à l’avance : personne ne t’en voudra.' : postponeCost(g, r); }
function bigShift(g, r, why = '') {
  const B = r && r.big;
  if (!B || r.state !== 'scheduled' || (!bigShiftFree(r) && !why && r.delays >= MAX_DELAYS)) return false;
  const t = Date.now(), free = !!why || bigShiftFree(r, t), away = !!r.away;
  for (let k = B.stage; k < 3; k++) B.slots[k] += DAY_MS;
  r.outAt += DAY_MS;
  for (const id of B.deals) { const d = dealOf(g, id); if (d && d.state === 'signed' && d.big === r.id) d.due = Math.max(d.due, r.outAt + 2 * DAY_MS); } // (a brand signed for the production follows it)
  if (B.stage < 3) r.due = B.slots[B.stage]; else r.due = r.outAt;
  r.dueSaid = false;
  delete r.waited; delete r.away;
  if (free) {
    if (!why && !away) r.moved = (r.moved || 0) + 1;
    addNotif(g, { k: 'release', at: t, text: `🗓️ Ta production « ${str(r.topic, 60)} » est décalée d’un jour${why ? ` (${why})` : ''} : sortie ${fmtWhen(relAnn(r), t)}.` });
    addTrigger(g, `Le joueur décale sa grosse production « ${str(r.topic, 60)} » d’un jour${why ? ` (${why})` : ''} : elle sortira ${fmtWhen(relAnn(r), t)}. Ceux qui l’attendaient patienteront.`);
  } else {
    r.delays++;
    const s = g.stats, loss = r.delays >= 2 ? Math.round(s.followers * (r.delays === 2 ? 0.03 : 0.05)) : 0;
    const dr = repMove(g, postponePlan(r.delays), 'tu as repoussé ta grosse production', { noCheck: true });
    if (loss) s.followers = Math.max(0, s.followers - loss);
    addNotif(g, { k: 'delay', at: t, text: `Tu repousses ta production d’un jour (${r.delays}/${MAX_DELAYS}) : ${repWord(dr)}${loss ? `, −${nAbonnes(loss)}` : ''}. Sortie ${fmtWhen(relAnn(r), t)}.` });
    addTrigger(g, `Le joueur repousse au dernier moment sa grosse production « ${str(r.topic, 60)} » (${r.delays === 1 ? 'premier' : r.delays === 2 ? 'deuxième' : 'troisième'} report) : le public s’impatiente, certains se moquent.`);
    checkCancel(g);
  }
  for (const x of B.cast) { const c = x.ok === true && g.chars[x.c]; if (c) addMem(g, c, `le tournage de la production du joueur (« ${str(r.topic, 40)} ») est décalé d’un jour`); }
  return true;
}
// Given up (dropRelease): it was a big promise; the cast is told.
function bigDropped(g, r) {
  const B = r.big, s = g.stats;
  const loss = Math.round(s.followers * 0.02);
  s.followers = Math.max(0, s.followers - loss);
  repMove(g, { pro: -15 }, `ta grosse production « ${str(r.topic, 40)} », abandonnée`, { noCheck: true });
  for (const x of B.cast) {
    const c = x.ok === true && g.chars[x.c];
    if (!c) continue;
    applyRel(g, c, -6, 'le joueur a abandonné la production où je jouais', later() + 2000, 10);
    addMem(g, c, `le joueur a abandonné sa production (« ${str(r.topic, 40)} ») alors que j’étais au casting`);
  }
}

/* ---------- the cast (their AI decides) ---------- */
const castAsked = (g, c) => { const r = bigOn(g); return r && c && r.big.stage < 2 && r.big.cast.some((x) => x.c === c.id && x.ok == null) ? r : null; };
const castOn = (g, c) => { const r = bigOn(g); return r && c && r.big.stage < 2 && r.big.cast.some((x) => x.c === c.id && x.ok === true) ? r : null; };
const castIn = (g, r) => ((r && r.big && r.big.cast) || []).filter((x) => x.ok === true && g.chars[x.c]).map((x) => g.chars[x.c]);
function castAdd(g, r, c) {
  const B = r && r.big;
  if (!B || B.stage > 1 || B.shotSaid || !featOK(g, c) || B.cast.length >= BIG_CAST || B.cast.some((x) => x.c === c.id)) return false; // (until the shoot starts)
  B.cast.push({ c: c.id, ok: null, at: Date.now() });
  return true;
}
// What the player sends them (left in their conversation, to edit and send).
function castText(g, r, c) {
  return `J’ai un gros projet : une production de ${r.big.size} jours, « ${str(r.topic, 80)} ». Tournage ${fmtWhen(r.big.slots[1])}, sortie ${fmtWhen(relAnn(r))}. J’aimerais trop que tu sois dedans. Tu serais partant${gx(c.g, '', 'e', '·e')} ?`;
}
function castDMCtx(g, c) {
  const r = castAsked(g, c) || castOn(g, c);
  if (!r) return [];
  const first = firstName(c), others = castIn(g, r).filter((x) => x !== c).map((x) => '@' + x.handle);
  const what = `sa GROSSE PRODUCTION « ${str(r.topic, 90)} » (sur ${pfName(g, platformOf(g))}, ${r.big.size} jours de travail : tournage ${fmtWhen(r.big.slots[1])}, sortie ${fmtWhen(relAnn(r))}${r.devis && r.devis.total ? `, budget ${fmtMoney(g, r.devis.total)}` : ''}${others.length ? `, avec ${others.join(', ')}` : ''})`;
  if (castOn(g, c)) return [`${first} a accepté de jouer dans ${what}.`];
  return [`Le joueur propose à ${first} de JOUER DANS ${what}. Le joueur a ${fmtPlain(g.stats.followers)} abonnés, ${first} ${fmtPlain(c.followers)}. ${first} décide selon votre relation, son caractère, ce que ça lui apporte (son public, son image), le sujet et son emploi du temps.`];
}
const CAST_LINE = (c) => `- Quand ${firstName(c)} a décidé pour la production : {"t":"casting","ok":true,"why":"≤ 60 caractères"} (ok:false s’il ou elle refuse). Pas de ligne casting s’il ou elle hésite encore ou pose une condition.`;
const CAST_HITCH_LINE = (c) => `- Facultatif, rarement, seulement si c’est vraiment le cas : si ${firstName(c)} ne peut finalement plus tourner (malade, un empêchement, un désistement…), écris-le dans ses messages, puis {"t":"imprevu","kind":"malade","text":"≤ 120 caractères : ce qui arrive"}.`;
function applyCastLine(g, c, o) {
  const r = castAsked(g, c);
  if (!r) return false;
  const x = r.big.cast.find((y) => y.c === c.id), ok = o.ok === true || o.ok === 'true', first = firstName(c), why = str(o.why, 60);
  x.ok = ok;
  x.at = Date.now();
  if (ok) {
    addNotif(g, { k: 'relup', c: c.id, at: later() + 1500, text: `🎬 ${first} est partant${gx(c.g, '', 'e', '·e')} pour ta production « ${str(r.topic, 50)} » : au casting !` });
    addMem(g, c, `je joue dans la grosse production du joueur (« ${str(r.topic, 50)} »)`);
    touch(c);
  } else {
    addNotif(g, { k: 'reldown', c: c.id, at: later() + 1500, text: `${first} ne sera pas dans ta production${why ? ` : « ${why} »` : ''}.` });
    addMem(g, c, `le joueur m’a proposé de jouer dans sa production (« ${str(r.topic, 40)} ») et j’ai dit non`);
  }
  return true;
}

/* ---------- the hitches (launched by the characters' AI; the player decides) ---------- */
const HITCH_KINDS = {
  malade: { emoji: '🤒', label: 'Un désistement' },
  lieu: { emoji: '🏚️', label: 'Le lieu tombe à l’eau' },
  fuite: { emoji: '🫢', label: 'Une fuite' },
  budget: { emoji: '💸', label: 'Le budget explose' },
  autre: { emoji: '⚠️', label: 'Un imprévu' },
};
const normHitch = (k) => { k = foldAcc(k); return /malad|grippe|sick|desist|empech|absent|bless/.test(k) ? 'malade' : /lieu|salle|decor|venue|plateau|studio|annul/.test(k) ? 'lieu' : /fuit|fuite|leak|spoil|revel/.test(k) ? 'fuite' : /budget|cout|prix|surcout|facture|argent|explos/.test(k) ? 'budget' : 'autre'; };
const hitchOK = (g, r) => !!(r && r.big && r.big.stage < 3 && !r.big.postOn && !r.big.hitch && (r.big.hitches || []).length < BIG_HITCHES); // (never in the middle of the edit)
function applyHitch(g, o) {
  const r = bigOn(g);
  if (!hitchOK(g, r)) return null;
  const B = r.big, kind = normHitch(o.kind), text = str(o.text, 140);
  if (!text) return null;
  const by = o.by ? charByHandle(g, normHandle(o.by)) : null;
  const who = kind === 'malade' && by && B.stage < 2 && B.cast.some((x) => x.c === by.id && x.ok !== false) ? by.id : null; // (one of the cast; or someone of the crew)
  B.hitch = { id: uid('hi'), kind, text, by: by ? by.id : null, who, at: Date.now(), stage: B.stage };
  const at = later() + 2500;
  addNotif(g, { k: 'release', c: by ? by.id : null, at, text: `${HITCH_KINDS[kind].emoji} Imprévu sur ta production « ${str(r.topic, 50)} » : ${text} À toi de décider.` });
  return B.hitch;
}
// What a hitch costs: some of the quote (a production with no quote: from its size).
const hitchCost = (g, r, k = 0.15) => niceRound(Math.max(300, ((r.devis && r.devis.total) || r.big.size * 800) * k));
// The ways to deal with it: { id, label, sub, off (why not), run }.
function hitchOpts(g, r) {
  const B = r.big, h = B.hitch;
  if (!h) return [];
  const w = h.who && g.chars[h.who], cash = g.career.cash, nxt = Math.min(Math.max(B.stage, 1), 2);
  const shift = { id: 'decale', label: 'Décaler d’un jour', sub: `La production et sa sortie, d’un jour : ${bigShiftFree(r) ? 'bien à l’avance, personne ne t’en voudra' : 'ton public comprendra… à peu près'}.` };
  const money = (k) => { const c = hitchCost(g, r, k); return { c, off: c > cash ? `Il te faut ${fmtMoney(g, c)}.` : '' }; };
  if (h.kind === 'malade') {
    const m = money(0.08);
    return [
      { id: 'remplace', label: w ? `Remplacer ${firstName(w)} au pied levé` : 'Trouver un remplaçant', sub: `${fmtMoney(g, m.c)} · −4 points`, off: m.off },
      { id: 'sans', label: w ? `Tourner sans ${firstName(w)}` : 'Faire sans', sub: w ? '−6 points, et son public ne viendra pas' : '−6 points' },
      shift,
    ];
  }
  if (h.kind === 'lieu') { const m = money(0.18); return [{ id: 'loue', label: 'Louer un autre lieu', sub: fmtMoney(g, m.c), off: m.off }, { id: 'bord', label: 'Tourner ailleurs, avec les moyens du bord', sub: '−8 points' }, shift]; }
  if (h.kind === 'fuite') return [
    { id: 'assume', label: 'En jouer : l’annoncer officiellement', sub: '+10 % de vues, mais moins de surprise (−4 points)' },
    { id: 'dement', label: 'Démentir', sub: 'Un pari : ça passe, ou ça empire' },
    { id: 'fin', label: 'Changer la fin', sub: `+2 h de travail sur ${BIG_STAGES[nxt].of}` },
  ];
  if (h.kind === 'budget') { const m = money(0.2); return [{ id: 'paye', label: 'Payer le surcoût', sub: fmtMoney(g, m.c), off: m.off }, { id: 'coupe', label: 'Couper dans le budget', sub: '−10 points' }, { id: 'marque', label: 'Chercher une marque en urgence', sub: 'Une offre peut arriver… ou pas (−5 points sinon)' }]; }
  return [{ id: 'gere', label: 'Gérer', sub: `+2 h de travail sur ${BIG_STAGES[nxt].of}` }, { id: 'fait', label: 'Faire sans', sub: '−5 points' }];
}
// The player's choice: what it does, and what the network hears of it.
function pickHitch(g, r, id) {
  const B = r && r.big, h = B && B.hitch;
  if (!h || r.state !== 'scheduled') return false;
  const o = hitchOpts(g, r).find((x) => x.id === id);
  if (!o || o.off) return false;
  const nxt = Math.min(Math.max(B.stage, 1), 2), w = h.who && g.chars[h.who], by = h.by && g.chars[h.by];
  const lose = (p) => { // points lost: on the shoot to come, or on the shoot done
    if (B.stage >= 2 && r.played) { r.played.score = clamp(r.played.score - p, 0, 1); r.played.tier = tierOf(r.played.score); }
    else B.pen = Math.round(((B.pen || 0) + p) * 100) / 100;
  };
  const more = (n) => { B.more = Object.assign({}, B.more, { [nxt]: ((B.more && B.more[nxt]) || 0) + n }); };
  let said = o.label;
  if (id === 'remplace' || id === 'loue' || id === 'paye') { const c = hitchCost(g, r, id === 'remplace' ? 0.08 : id === 'loue' ? 0.18 : 0.2); if (!pay(g, c, `Production « ${wordCut(r.topic, 30)} » : ${id === 'remplace' ? 'un remplaçant' : id === 'loue' ? 'un autre lieu' : 'le surcoût'}`, 'devis')) return false; if (id === 'remplace') lose(0.04); }
  if (id === 'remplace' || id === 'sans') { const x = w && B.cast.find((y) => y.c === w.id); if (x) { x.ok = false; x.out = 'malade'; } if (id === 'sans') lose(0.06); }
  if (id === 'decale') bigShift(g, r, 'un imprévu');
  if (id === 'bord') lose(0.08);
  if (id === 'assume') { B.hype = Math.round(((B.hype || 0) + 0.1) * 100) / 100; lose(0.04); }
  if (id === 'dement') {
    if (Math.random() < 0.5) { said = 'Démentir (ça passe)'; toast('Ton démenti passe : la fuite retombe.', 'good'); }
    else { said = 'Démentir (ça empire)'; lose(0.03); const dr = repMove(g, { cred: -10 }, 'ton démenti sur la fuite de ta production'); addNotif(g, { k: 'reldown', text: `🫢 Ton démenti ne prend pas : la fuite circule de plus belle${repBit(dr, ', ')}.` }); }
  }
  if (id === 'fin' || id === 'gere') more(2);
  if (id === 'coupe') lose(0.1);
  if (id === 'fait') lose(0.05);
  if (id === 'marque') {
    const d = Math.random() < 0.5 ? makeOffer(g, { what: r.what, big: r.id, pitched: true }) : null;
    if (d) { said = 'Chercher une marque en urgence (une marque répond)'; toast(`Une marque te répond en message privé : ${d.brand}.`, 'good'); }
    else { said = 'Chercher une marque en urgence (personne ne répond)'; lose(0.05); toast('Aucune marque ne répond à temps : tu coupes dans le budget.', 'bad'); }
  }
  B.hitches = (B.hitches || []).concat({ kind: h.kind, text: h.text, pick: id, said, at: Date.now() });
  B.hitch = null;
  if (w && (id === 'remplace' || id === 'sans')) addMem(g, w, `je n’ai pas pu tourner dans la production du joueur (« ${str(r.topic, 40)} »)`);
  addTrigger(g, `Imprévu sur la grosse production du joueur (« ${h.text} ») : il a choisi « ${said} ».`, (by || w) ? (by || w).id : null);
  return true;
}

/* ---------- the sponsors: several in one video, their clauses may clash ---------- */
// The pairs that clash: a brand that wants to be the only one, an exclusive brand next to another of its sector.
function bigClash(g, ids) {
  const ds = (ids || []).map((id) => dealOf(g, id)).filter(Boolean), out = [];
  for (const d of ds) {
    const x = ds.find((y) => y !== d && (d.solo || (d.exclusive && y.sector === d.sector)));
    if (x) out.push({ d, x, why: d.solo ? `${d.brand} veut être la seule marque de ta production` : `${d.brand} a l’exclusivité de son secteur (${sectorWord(d.sector)}), et ${x.brand} en est aussi`,
      said: d.solo ? 'voulait être la seule marque de ta production' : `avait l’exclusivité de son secteur, et ${x.brand} en est aussi` }); // (said: after its name, in the notice)
  }
  return out;
}

/* ---------- out: its views climb for days ---------- */
// The views of its first week, shown as they come: a share at once, the rest over BIG_TAIL days (and their money, and
// the subscribers they bring, as they come).
const bigFrac = (T, t) => { const a = Math.max(0, (t - T.at) / DAY_MS); return a >= BIG_TAIL ? 1 : T.f0 + (1 - T.f0) * (1 - Math.exp(-a / 1.2)) / (1 - Math.exp(-BIG_TAIL / 1.2)); };
function tickBig(g, t = Date.now()) {
  let ch = false;
  for (const r of g.releases || []) {
    const T = r.big && r.big.tail;
    if (!T || T.done || r.state !== 'released') continue;
    const p = g.posts.find((x) => x.id === r.out);
    if (!p || !p.video) { T.done = 1; continue; }
    const want = Math.round(T.total * bigFrac(T, t)), extra = want - (p.video.views || 0), end = t - T.at >= BIG_TAIL * DAY_MS;
    if (extra < Math.max(20, T.total * 0.01) && !end) continue;
    if (end) T.done = 1;
    ch = true;
    if (extra <= 0) continue;
    p.video.views += extra;
    const c = g.career, Fm = FORMATS[r.what] || FORMATS.vidéo, e = c.log.slice().reverse().find((x) => x.p === p.id);
    if (e) { e.views += extra; e.hours += r.what === 'short' ? 0 : Math.round(extra * Fm.mins / 60); }
    const money = p.video.claim || p.video.removed ? 0 : Math.round(extra * rpmOf(g, r.what, p.video.ads) * adSeason(gameDate(t)) / 10) / 100;
    if (money > 0) { c.est += money; p.video.money = Math.round(((p.video.money || 0) + money) * 100) / 100; T.money = Math.round(((T.money || 0) + money) * 100) / 100; }
    const fol = Math.round(extra * (T.fol || 0));
    if (fol > 0) { g.stats.followers += fol; if (audSplit(g)) { const A = vidAud(g); A.fans = clamp(A.fans + fol * 0.85, 0, g.stats.followers); } T.gained = (T.gained || 0) + fol; }
    if (t - (T.said || T.at) >= DAY_MS * 0.9 || T.done) { // once a day, what it did
      const since = p.video.views - (T.saidViews || T.shown || 0);
      T.said = t; T.saidViews = p.video.views;
      if (since > 0) addNotif(g, { k: 'release', p: p.id, at: t, text: `📈 Ta production « ${str(r.topic, 50)} » continue de grimper : +${fmtN(since)} vues (≈ ${fmtN(p.video.views)} au total)${T.done ? ', et sa première semaine est bouclée' : ''}.` });
    }
  }
  return ch;
}
// What it does once out (releaseCareer): the views shown at first, the rest to come; the cast; a flop's price.
function bigOut(ctx, post, vs, ads) {
  const g = ctx.g, r = ctx.video.r, B = r.big, tier = ctx.video.tier;
  const shown = Math.max(1, Math.round(vs * 0.4));
  B.tail = { total: vs, f0: shown / Math.max(1, vs), at: Date.now(), said: Date.now(), shown, fol: { top: 0.012, mid: 0.005, flop: 0.001 }[tier] || 0 };
  post.video.big = { size: B.size, cast: castIn(g, r).map((c) => c.id) };
  for (const c of castIn(g, r)) collabDone(g, c, tier, vs);
  B.outAt = Date.now();
  if (tier === 'flop') {
    const s = g.stats, loss = Math.round(s.followers * 0.03);
    s.followers = Math.max(0, s.followers - loss);
    const dr = repMove(g, { cred: -12, pro: -10, image: -6 }, `ta grosse production « ${str(r.topic, 40)} », un flop`, { noCheck: true });
    addNotif(g, { k: 'delay', p: post.id, at: later() + 4000, text: `💥 Ta production « ${str(r.topic, 50)} » fait un flop : ${r.devis && r.devis.total ? `${fmtMoney(g, r.devis.total)} de budget pour ça, ` : ''}${repWord(dr)}, −${nAbonnes(loss)}.` });
    addChronicle(g, `La grosse production ${deN(g.player.name)}, « ${str(r.topic, 60)} », est un flop retentissant.`);
    addTrigger(g, `La grosse production du joueur « ${str(r.topic, 60)} » est un FLOP : moqueries (« tout ça pour ça »), mèmes, des créateurs se gaussent ; ses partenaires font la tête.`);
    for (const id of B.deals || []) { const d = dealOf(g, id), c = d && g.chars[d.contact]; if (c) applyRel(g, c, -8, 'la production où était notre marque a fait un flop', later() + 3500, 10); }
  } else {
    addTrigger(g, `La grosse production du joueur « ${str(r.topic, 60)} » est en ligne et ${tier === 'top' ? 'CARTONNE' : 'marche correctement'} : ${tier === 'top' ? 'les vues s’envolent, des médias et d’autres créateurs en parlent' : 'on en parle'}${hasStaff(g, 'rp') ? ' (son attaché·e de presse a démarché les médias)' : ''}.`);
  }
}
// The production of the last days, for the lines of a refresh (an article, a nomination): the last one out.
function bigRecent(g, t = Date.now(), days = 10) {
  return (g.releases || []).filter((r) => r.big && r.state === 'released' && r.releasedAt && t - r.releasedAt < days * DAY_MS).sort((a, b) => b.releasedAt - a.releasedAt)[0] || null;
}
function applyNomination(g, o) {
  const r = bigRecent(g);
  if (!r || r.big.nom || r.tier === 'flop') return false;
  const prix = str(o.prix || o.prize || o.text, 70);
  if (!prix) return false;
  r.big.nom = { prix, at: Date.now() };
  const s = g.stats, fol = grow(s.followers, Math.round(s.followers * 0.02));
  s.followers += fol;
  const dr = repMove(g, { cred: 8, image: 10, pro: 8 }, `ta production « ${str(r.topic, 40)} » nommée (${str(prix, 40)})`);
  g.career.offerAt = Math.min(g.career.offerAt || Infinity, Date.now() + 3600000); // (the brands noticed)
  addNotif(g, { k: 'milestone', p: r.out, at: later() + 3000, text: `🏆 Ta production « ${str(r.topic, 50)} » est nommée : ${prix} ! ${nAbonnes(fol, true)}${repBit(dr, ', ')}.` });
  addChronicle(g, `La production ${deN(g.player.name)} « ${str(r.topic, 60)} » est nommée : ${prix}.`);
  addTrigger(g, `La grosse production du joueur « ${str(r.topic, 60)} » est NOMMÉE (${prix}) : félicitations, jalousies, pronostics pour la cérémonie.`);
  return true;
}
// What a refresh may write about it: a hitch (now and then), a brand that wants in, an article, a nomination.
function bigRefreshLines(g, t = Date.now()) {
  const out = [], r = bigOn(g);
  if (r && hitchOK(g, r) && (r.big.stage > 0 || r.due - t < DAY_MS) && Math.random() < 0.4) {
    const cast = castIn(g, r).filter(() => r.big.stage < 2);
    out.push(`- Facultatif, rarement, seulement si l’histoire s’y prête : un IMPRÉVU sur la grosse production du joueur « ${str(r.topic, 60)} » (${r.big.stage >= 2 ? 'déjà tournée, en post-production' : r.big.stage === 1 ? 'préparée, le tournage approche' : 'en préparation'}) : ${cast.length ? `quelqu’un du casting (${cast.map((c) => '@' + c.handle).join(', ')}) tombe malade ou se désiste, ` : ''}le lieu de tournage est annulé, le sujet fuite avant la sortie, le budget explose (un prestataire augmente ses prix)… Écris le post ou le message privé qui l’annonce, puis {"t":"imprevu","kind":"malade, lieu, fuite ou budget","by":"handle de la personne concernée ou qui l’annonce","text":"≤ 120 caractères : ce qui arrive"}. Au plus un.`);
  }
  if (r && r.big.stage < 3 && r.big.deals.length < BIG_DEALS && openDeals(g).filter((d) => d.state === 'offer').length < 2 && standLv(g) > -2 && t - (r.big.offerAt || r.big.at || 0) > DAY_MS / 2 && Math.random() < 0.5) {
    out.push(`- Facultatif : une marque fictive de ce monde veut être DANS la grosse production du joueur « ${str(r.topic, 60)} » (un placement de produit, sortie ${fmtWhen(relAnn(r), t)}), logique avec le sujet : {"t":"sponsor","prod":true,"brand":"nom inventé","emoji":"🥤","sector":"boisson, tech, mode, beaute, jeu, food, appli ou voyage","product":"le produit à mettre en avant, ≤ 70 caractères","contact":"Prénom Nom de la personne chargée des partenariats","g":"f","text":"son premier message privé au joueur, ≤ 220 caractères"}.`);
  }
  const x = bigRecent(g, t);
  if (x && x.tier !== 'flop' && t - x.releasedAt < 4 * DAY_MS) out.push(`- Facultatif : un média de ce monde consacre un article à la grosse production du joueur « ${str(x.topic, 60)} » (${x.tier === 'top' ? 'un carton' : 'un succès correct'}) : un post d’un compte média (un habitué, ou un nouveau figurant avec "name" et "bio") qui en parle, chiffres et coulisses à l’appui.`);
  if (x && !x.big.nom && x.tier === 'top') {
    const p = g.posts.find((y) => y.id === x.out), v = p && p.video ? p.video.views : 0;
    out.push(`- Facultatif, si ça s’y prête : la grosse production du joueur « ${str(x.topic, 60)} » (sortie il y a ${fmtDur(t - x.releasedAt)}, ≈ ${fmtN(v)} vues, un carton) peut être nommée à une remise de prix de ce monde (les trophées du web, un festival…) : un post d’un média ou des organisateurs l’annonce, puis {"t":"nomination","prix":"≤ 60 caractères : le prix et sa catégorie"}.`);
  }
  return out;
}

/* ---------- the screens ---------- */
// The stages, as a line of steps (done, under way, to come), with their times.
function BigDots({ r, small }) {
  const B = r.big, now = Date.now();
  const items = BIG_STAGES.map((s, k) => ({ k: s.k, label: s.label, emoji: s.emoji, ok: B.stage > k, on: B.stage === k, at: k === B.stage ? r.due : k > B.stage ? B.slots[k] : 0 }))
    .concat({ k: 'out', label: 'Sortie', emoji: '🍿', ok: r.state === 'released', on: B.stage >= 3, at: relAnn(r) });
  return html`<ol class=${'big-dots' + (small ? ' small' : '')} aria-label="Les étapes de la production">${items.map((x) => html`<li key=${x.k} class=${x.ok ? 'ok' : x.on ? 'on' : ''} aria-current=${x.on ? 'step' : null}>
    <span aria-hidden="true">${x.ok ? '✓' : x.emoji}</span><b>${x.label}</b>${!x.ok && x.at ? html`<small>${x.at <= now ? 'maintenant' : fmtWhen(x.at, now)}</small>` : null}</li>`)}</ol>`;
}
// The cast, as they answered (and a word to those who did not yet).
function BigCast({ g, r }) {
  const B = r.big;
  if (!B.cast.length) return null;
  return html`<div class="big-cast">${B.cast.map((x) => { const c = g.chars[x.c]; if (!c) return null; return html`<span key=${x.c} class=${'bc-who ' + (x.ok === true ? 'yes' : x.ok === false ? 'no' : 'wait')}>
    <${Avatar} who=${author(g, 'c:' + c.id)} size=${26} /><span>${firstName(c)} <small>${x.ok === true ? '✓ partant' + gx(c.g, '', 'e', '·e') : x.ok === false ? (x.out === 'malade' ? 'empêché' + gx(c.g, '', 'e', '·e') : x.late ? 'pas de réponse' : 'refus') : 'en attente'}</small></span>
    ${x.ok == null && B.stage < 2 ? html`<button type="button" class="linkbtn" onClick=${() => { if (!S.drafts.dm[c.id]) S.drafts.dm[c.id] = castText(g, r, c); openDM(c.id); }}>Lui écrire</button>` : null}</span>`; })}</div>`;
}
// Postpone a day, give up.
function BigActions({ g, r, now }) {
  const B = r.big, canShift = r.state === 'scheduled' && (bigShiftFree(r, now) || r.delays < MAX_DELAYS) && !B.postOn;
  return html`<div class="row big-acts">
    ${canShift ? html`<button class="btn btn-ghost btn-sm" onClick=${() => askConfirm({ title: 'Décaler la production d’un jour ?', text: `Ce qu’il reste à faire, et la sortie, un jour plus tard. ${bigShiftWord(g, r)}`, ok: 'Décaler d’un jour', run: () => { if (bigShift(g, r)) { toast(`Ta production sort ${fmtWhen(relAnn(r))}.`, 'good'); update(); } } })}>Décaler d’un jour</button>` : null}
    <button class="btn btn-ghost btn-sm" onClick=${() => askConfirm({ title: 'Abandonner ta production ?', text: `Tout le monde l’attendait : ${repWord(repTry(g, DROP_PLAN))}, ta réputation pro aussi, et des abonnés qui partent.${r.devis && r.devis.total ? ` Le budget (${fmtMoney(g, r.devis.total)}) ne revient pas.` : ''}`, ok: 'Abandonner', danger: true, run: () => { dropRelease(g, r); dropLayers((l) => l.t === 'minigame' && l.id === r.id); update(); } })}>Abandonner</button>
  </div>`;
}
// The choice a hitch asks for.
function HitchCard({ g, r }) {
  const h = r.big.hitch, K = HITCH_KINDS[h.kind] || HITCH_KINDS.autre, by = h.by && g.chars[h.by];
  return html`<div class="hitch-card">
    <span class="eyebrow">${K.emoji} ${K.label}</span>
    <p class="hc-text">${by ? html`<b>${firstName(by)}</b> : ` : null}${h.text}</p>
    <div class="hc-opts">${hitchOpts(g, r).map((o) => html`<button key=${o.id} type="button" class="hc-opt" disabled=${!!o.off} onClick=${() => { if (pickHitch(g, r, o.id)) { scheduleSave(); update(); } }}>
      <b>${o.label}</b><small>${o.off || o.sub}</small></button>`)}</div>
  </div>`;
}
// The result of the stage just played (shown once).
function BigLast({ g, r }) {
  const B = r.big, L = B.last, st = BIG_STAGES[L.k], tier = tierOf(L.score), pts = (x) => `${x >= 0 ? '+' : '−'}${Math.round(Math.abs(x) * 100)} point${Math.round(Math.abs(x) * 100) > 1 ? 's' : ''}`;
  const next = B.stage < 3 ? `${BIG_STAGES[B.stage].label} ${r.due <= Date.now() ? 'maintenant' : fmtWhen(r.due)}` : `sortie ${fmtWhen(relAnn(r))}`;
  return html`<div class=${'mg-result ' + tier}>
    <span class="eyebrow">${st.label} ${st.tiers[tierIx(tier)]}</span>
    <div class="mg-score">${pctOf(L.score)} %</div>
    <p>${L.k === 0 ? `Ta préparation compte au tournage : ${pts(L.bonus)}.` : `Ton tournage : ${pctOf(L.score)} %${L.bonus ? `, ${pts(L.bonus)} de préparation` : ''}${L.pen ? `, ${pts(-L.pen)} d’imprévus` : ''} : ${pctOf(L.total)} % avant la post-production (${tierOf(L.total) === 'top' ? 'elle va cartonner' : tierOf(L.total) === 'mid' ? 'elle marchera moyennement' : 'en l’état, c’est un flop'}).`}</p>
    ${tier !== 'top' && B.lastGame ? html`<${MgAnswers} game=${B.lastGame} />` : null}
    <p class="prod-note">Ensuite : ${next}.</p>
    <button class="btn btn-hot" onClick=${() => { L.seen = 1; update(); }}>Continuer</button>
  </div>`;
}
const BIG_INTRO = [
  (g, r) => `Le concept, le script, les repérages, le planning : un mini-jeu sur ton sujet. Réussi, il facilite le tournage (jusqu’à +10 points) ; raté, il le complique (jusqu’à −10).`,
  (g, r) => `Le gros du travail${castIn(g, r).length ? `, avec ${castIn(g, r).map((c) => firstName(c)).join(' et ')}` : ''} : le mini-jeu principal de ta production.${r.big.prep != null ? ` Ta préparation : ${r.big.prep >= 0.5 ? '+' : '−'}${Math.round(Math.abs(r.big.prep - 0.5) * BIG_PREP * 100)} points.` : ''}${r.big.pen ? ` Les imprévus : −${Math.round(r.big.pen * 100)} points.` : ''}`,
  (g, r) => `Le montage, l’étalonnage, le mixage${needsThumb(r) ? ', la miniature' : ''}. ${(r.crew || []).includes('monteur') && hasStaff(g, 'monteur') ? `${firstName(g.chars[hasStaff(g, 'monteur').c])} s’en charge (tu pourras toujours monter toi-même).` : 'À toi de monter : jusqu’à ±20 points sur ton tournage.'}`,
];
// A stage, before it starts: what it is, the time it takes, then go (or wait for its time).
function BigSetup({ g, r, now }) {
  const B = r.big, k = Math.min(B.stage, 2), st = BIG_STAGES[k], left = r.due - now, H = bigWork(r, k), D = diffOf(r.diff);
  const can = k ? canMakeR(g, r, now) : { ok: true };
  const held = activeRelease(g) !== r && heldRel(g, now);
  const launch = () => {
    if (r.due > Date.now() || !can.ok || r.big.hitch) return;
    const go = () => { if (k === 2) { bigPostStart(g, r); scheduleSave(); update(); } else genBigStage(r); };
    const cl = prodClash(g, r, Date.now(), H * 3600000);
    if (!cl) { go(); return; }
    const d1 = cl.dates[0];
    askConfirm({ title: d1 ? `⚠️ Tu as rendez-vous avec ${firstName(d1.c)} à ${hourOf(d1.ev.due)}` : '⚠️ Ça chevauche ton programme',
      text: `${cap1(st.of)} te prend ${hWord(H)} (jusqu’à ${hourOf(cl.end)}) : tu peux y aller quand même, mais ${cl.out.map((x) => x.text).join(' ; ')}.`,
      ok: 'Y aller quand même', cancel: 'Pas maintenant', danger: true, run: go });
  };
  return html`<div class="big-setup">
    <div class="mg-setup-head"><span class="mg-emo" aria-hidden="true">${st.emoji}</span><h3>${st.label} · « ${wordCut(r.topic, 42)} »</h3></div>
    ${k ? html`<${GearBlocker} g=${g} r=${r} now=${now} />` : null}
    <p class="lede-sm">${BIG_INTRO[k](g, r)}</p>
    <div class="diff-opt on fixed"><span class="d-emo" aria-hidden="true">${D.emoji}</span><span class="d-mid"><b>Difficulté ${D.label}</b><small>Celle de ta production, à chaque étape.</small></span><span class="d-mult">${fmtMult(D.mult)}</span></div>
    ${k < 2 ? html`<${BigCast} g=${g} r=${r} />` : null}
    <p class="prod-note">⏱️ ${hWord(H)} de travail${k === 2 && r.team ? ` (${teamWord(r.team)})` : ''} : ${left > 0 ? `${fmtWhen(r.due, now)}, jusqu’à ${hourOf(r.due + H * 3600000)}` : `jusqu’à ${hourOf(now + H * 3600000)}`}. Sortie ${relAnn(r) > now ? fmtWhen(relAnn(r), now) : 'en retard'}.</p>
    ${(B.hitches || []).length ? html`<ul class="big-hist">${B.hitches.map((x, j) => html`<li key=${j}>${(HITCH_KINDS[x.kind] || HITCH_KINDS.autre).emoji} ${x.text} <small>→ ${x.said}</small></li>`)}</ul>` : null}
    ${left > 0 ? html`<button class="btn btn-hot" disabled=${!!held} onClick=${() => skipTime(left + 1000, relDue(r))}><${Icon} n="ffwd" s=${16} /> Avancer jusqu’à ${st.of}</button>${held ? html`<small class="muted why-off">${heldWhy(held)}</small>` : null}`
      : html`<button class="btn btn-hot" onClick=${launch} disabled=${!can.ok}><${Icon} n=${st.icon} s=${16} /> ${st.go}</button>`}
    <${BigActions} g=${g} r=${r} now=${now} />
  </div>`;
}
const bigOutcomes = (r) => (r.big.stage === 0 ? tierRule('une préparation au top', 'une préparation correcte', 'une préparation ratée') : tierRule('un tournage au top', 'un tournage correct', 'un tournage raté'));
// The window of a production (a stage to play, its result, the post-production and the upload).
function BigStage({ g, r, now }) {
  const B = r.big;
  const dots = html`<${BigDots} r=${r} />`;
  if (B.stage <= 1 && r.game) return html`<${ShootPlay} key=${r.id + ':b' + B.stage + ':' + (r.tries || 0)} r=${r} now=${now} icon=${BIG_STAGES[B.stage].icon} outcomes=${bigOutcomes(r)} />`; // (a game under way first: its clock runs)
  if (B.last && !B.last.seen) return html`<div class="mg-setup big-stage">${dots}<${BigLast} g=${g} r=${r} /></div>`;
  if (B.hitch) return html`<div class="mg-setup big-stage">${dots}<${HitchCard} g=${g} r=${r} /></div>`;
  if (S.busy.mg === r.id) return html`<div class="mg-load"><span class="mg-emo" aria-hidden="true">${BIG_STAGES[Math.min(B.stage, 2)].emoji}</span><b>${B.stage ? 'Le plateau s’installe…' : 'La préparation commence…'}</b><span>« ${r.topic} »</span><${Typing} /></div>`;
  if (B.stage <= 1 || (B.stage === 2 && !B.postOn)) return html`<div class="mg-setup big-stage">${dots}<${BigSetup} g=${g} r=${r} now=${now} /></div>`;
  return html`<div class="big-stage">${dots}
    ${B.stage >= 3 && relAnn(r) > now ? html`<p class="prod-note big-ready">🍿 Prête : sa sortie est prévue ${fmtWhen(relAnn(r), now)}. Publie-la maintenant, ou avance jusqu’à l’heure prévue (ton public l’attend à ${hourOf(relAnn(r))}). <button type="button" class="linkbtn" disabled=${!!(activeRelease(g) !== r && heldRel(g, now))} onClick=${() => skipTime(relAnn(r) - now + 1000, relDue(r))}>Avancer jusqu’à la sortie</button></p>` : null}
    <${StudioSteps} g=${g} r=${r} now=${now} />
    ${B.stage >= 3 ? null : html`<${BigActions} g=${g} r=${r} now=${now} />`}
  </div>`;
}
// In the feed, above the posts (the release card of a production).
function BigCard({ g, r, now, more }) {
  const B = r.big, st = BIG_STAGES[Math.min(B.stage, 2)], left = r.due - now, ready = B.stage >= 3;
  const title = B.hitch ? '⚠️ Un imprévu sur ta production : à toi de décider' : ready ? (left > 0 ? `Ta production sort dans ${fmtLeft(left)}` : 'Ta production est prête : publie-la !') : left > 0 ? `${st.label} de ta production dans ${fmtLeft(left)}` : `C’est l’heure de ${st.of} de ta production !`;
  const held = activeRelease(g) !== r && heldRel(g, now);
  return html`<div class=${'release-card big-card' + (left <= 0 || B.hitch ? ' due' : '')}>
    <span class="rl-emo" aria-hidden="true">🎥</span>
    <div class="rl-mid">
      <b>${title}</b>
      <span class="rl-out">« ${r.topic} » · ${B.size} jours · sortie ${relAnn(r) > now ? fmtWhen(relAnn(r), now) : 'en retard'}</span>
      <${BigDots} r=${r} small=${true} />
      <div class="row">
        ${B.hitch ? html`<button class="btn btn-hot btn-sm" onClick=${() => startShoot(r)}>Décider</button>`
          : left > 0 ? html`<button class="btn btn-hot btn-sm" disabled=${!!held} onClick=${() => skipTime(left + 1000, relDue(r))}>${S.skipWait ? html`<${Typing} /> J’avance dès que c’est fini` : html`<${Icon} n="ffwd" s=${15} /> ${ready ? 'Avancer jusqu’à la sortie' : `Avancer jusqu’à ${st.of}`}`}</button>${ready ? html`<button class="btn btn-ghost btn-sm" onClick=${() => startShoot(r)}>Publier maintenant</button>` : null}`
            : html`<button class="btn btn-hot btn-sm" onClick=${() => startShoot(r)}><${Icon} n=${ready ? 'send' : st.icon} s=${15} /> ${ready ? 'Publier' : B.stage === 2 && B.postOn ? 'Continuer la post-production' : st.go}</button>`}
        ${!ready && !B.postOn ? html`<button class="btn btn-ghost btn-sm" onClick=${() => goTab('studio')}>Voir dans le Studio</button>` : null}
      </div>
      ${more && more.length ? html`<button type="button" class="linkbtn rl-more" onClick=${() => goTab('studio')}>Ensuite : ${more.slice(0, 2).map((x) => `${(WHATS[x.what] || WHATS.vidéo).emoji} « ${wordCut(x.topic, 28)} » ${fmtWhen(relAnn(x), now)}`).join(' · ')}${more.length > 2 ? ` · +${more.length - 2}` : ''}</button>` : null}
    </div>
  </div>`;
}
// In the Studio's programme.
function BigRow({ g, r, now }) {
  const B = r.big, st = BIG_STAGES[Math.min(B.stage, 2)], left = r.due - now, ready = B.stage >= 3;
  const ds = B.deals.map((id) => dealOf(g, id)).filter((d) => d && d.state === 'signed');
  const tz = r.what === 'vidéo' && audSplit(g) ? (g.releases || []).filter((x) => x.promo === r.id && x.state !== 'dropped') : null;
  const canTz = tz && !tz.some((x) => x.state === 'scheduled') && relAnn(r) > now && planRoom(g) && canMake(g, 'short').ok;
  return html`<div class=${'plan-row big-row' + (left <= 0 || B.hitch ? ' due' : '')}>
    <span class="pl-emo" aria-hidden="true">🎥</span>
    <div class="mid"><b>Production « ${r.topic} »</b>
      <span>${B.size} jours · ${B.hitch ? '⚠️ un imprévu à régler' : ready ? `prête, sortie ${relAnn(r) > now ? fmtWhen(relAnn(r), now) : 'en retard'}` : `${st.label.toLowerCase()} ${left > 0 ? fmtWhen(r.due, now) : 'maintenant'}`}${r.devis && r.devis.total ? ` · budget ${fmtMoney(g, r.devis.total)}` : ''}${r.delays ? ` · repoussée ${r.delays} fois` : ''}${tz && tz.some((x) => x.state === 'released') ? ` · ${tz.filter((x) => x.state === 'released').length} ${PF(g).shortName}${tz.filter((x) => x.state === 'released').length > 1 ? 's' : ''} d’annonce` : ''}</span>
      <${BigDots} r=${r} small=${true} />
      <${BigCast} g=${g} r=${r} />
      ${ds.length ? html`<small class="muted big-deals">Partenaires : ${ds.map((d) => `${d.emoji} ${d.brand}`).join(', ')}</small>` : null}
    </div>
    <div class="acts">
      ${B.hitch || left <= 0 ? html`<button class="btn btn-hot btn-sm" onClick=${() => startShoot(r)}>${B.hitch ? 'Décider' : ready ? 'Publier' : st.go}</button>` : html`<button class="btn btn-ghost btn-sm" onClick=${() => startShoot(r)}>Ouvrir</button>`}
      ${canTz ? html`<button class="btn btn-ghost btn-sm" onClick=${() => openLayer({ t: 'series', id: 'single', what: 'short', promo: r.id })}>📣 Teaser</button>` : null}
      ${B.stage < 2 && !B.shotSaid && B.cast.length < BIG_CAST && featPartners(g).some((c) => !B.cast.some((x) => x.c === c.id)) ? html`<button class="btn btn-ghost btn-sm" onClick=${() => openLayer({ t: 'bigcast', id: r.id })}>🎬 Casting</button>` : null}
    </div>
  </div>`;
}
// Someone more for the cast (asked in their messages, the proposal ready to send).
function BigCastLayer({ l, g, i }) {
  const r = (g.releases || []).find((x) => x.id === l.id);
  if (!r || !r.big || r.state !== 'scheduled' || r.big.stage > 1 || r.big.shotSaid) return html`<${LayerShell} i=${i} title="Casting"><div class="empty"><b>Le casting est bouclé</b></div><//>`;
  const list = featPartners(g).filter((c) => !r.big.cast.some((x) => x.c === c.id));
  const pickC = (c) => { if (!castAdd(g, r, c)) return; S.drafts.dm[c.id] = castText(g, r, c); closeLayer(l); openDM(c.id); update(); };
  return html`<${LayerShell} i=${i} title="Casting">
    <div class="mg-setup">
      <p class="lede-sm">Ta production « ${r.topic} » : qui d’autre y mettre (${BIG_CAST} au plus) ? Tu lui proposes en message (le texte est prêt), et son IA accepte ou refuse. Ceux qui disent oui amènent leur public.</p>
      ${r.big.cast.length >= BIG_CAST ? html`<p class="muted">Le casting est complet.</p>` : list.length ? html`<div class="feat-list">${list.map((c) => html`<button type="button" key=${c.id} class="feat-pick" onClick=${() => pickC(c)}>
        <${Avatar} who=${author(g, 'c:' + c.id)} size=${40} /><span class="mid"><b>${c.name}</b><small>${relShown(c)} · ${fmtN(c.followers)} abonnés</small></span></button>`)}</div>` : html`<p class="muted">Personne à qui le proposer pour l’instant.</p>`}
    </div>
  <//>`;
}
// The planner: the format, two or three days, the day it starts and the hour it comes out, the topic, the difficulty, the
// cast, the sponsors, the quote; then it is paid and planned.
const BIG_DAYS = [0, 1, 2, 3, 7];
function BigPlanLayer({ l, g, i }) {
  const whats = bigWhats(g), P = PF(g);
  const [what, setWhat] = useState(() => bigWhat0(g) || 'vidéo');
  const [size, setSize] = useState(2);
  const firstDay = (w, n) => BIG_DAYS.find((d) => bigPlan(g, { what: w, size: n, day: d, hour: 20 }).slots[0] > Date.now() + 60000);
  const [day, setDay] = useState(() => firstDay(bigWhat0(g) || 'vidéo', 2));
  const [hour, setHour] = useState(20);
  const [theme, setTheme] = useState('');
  const [plot, setPlot] = useState('');
  const [diff, setDiff] = useState('moyen');
  const [cast, setCast] = useState([]);
  const [deals, setDeals] = useState([]);
  const lock = useRef(false);
  const plan = bigPlan(g, { what, size, day, hour });
  useEffect(() => { // (two or three days, another format: an hour too soon for the last day moves to the first that fits)
    if (plan.fits) return;
    const h = PLAN_HOURS.find((x) => bigPlan(g, { what, size, day, hour: x }).fits);
    if (h != null) setHour(h);
  }, [what, size, day]);
  const why = bigWhy(g);
  const partners = featPartners(g).slice(0, 8);
  const taken = (d) => plannedReleases(g).some((x) => x.deal === d.id);
  const mine = signedDeals(g).filter((d) => d.what === what && !taken(d));
  const signable = mine.filter((d) => d.due > plan.out), early = mine.filter((d) => d.due <= plan.out); // (to deliver before it comes out: not in it)
  const clash = bigClash(g, deals);
  const togg = (arr, set, id, max) => set(arr.includes(id) ? arr.filter((x) => x !== id) : arr.length >= max ? arr : arr.concat(id));
  const o = { what, topic: theme.trim(), plot: str(plot, 300), big: size };
  const needDevis = !easyGear(), dv = needDevis ? devisFor(o) : null, dvBusy = S.busy.devis === devisKey(o);
  const total = dv ? devisTotal(dv) : 0, askQ = needDevis && (!dv || dv.cut), broke = !canAfford(g, 'devis');
  const ok = theme.trim().length >= 3 && plan.ok && !why && canMake(g, what).ok;
  const noun = (w) => (w === 'short' ? P.shortName : w);
  const go = () => {
    if (lock.current || !ok) return;
    if (dv && (dv.paid || dv.cut || devisFor(o) !== dv)) return;
    if (total > 0 && total > g.career.cash) { toast(`Il te faut ${fmtMoney(g, total)}.`, 'bad'); return; }
    const st = dv && devisStale(g, dv);
    if (st) { staleSay(st, dv); update(false); return; }
    lock.current = true;
    const paid = dv ? { total, items: dv.items, have: dv.have || [], topic: dv.topic, at: Date.now() } : null;
    const r = scheduleBig(g, { what, topic: theme.trim(), plot, size, day, hour, diff, cast, deals: deals.filter((id) => signable.some((d) => d.id === id)), devis: paid });
    if (!r) { lock.current = false; return; }
    if (dv) { payDevis(g, dv, `production « ${theme.trim()} »`); dropDevis(dv); }
    toast(`🎥 Production lancée : préparation ${fmtWhen(r.due)}, sortie ${fmtWhen(relAnn(r))}.`, 'good');
    closeLayer();
    const c0 = r.big.cast.map((x) => g.chars[x.c]).find(Boolean);
    if (c0) { for (const x of r.big.cast) { const c = g.chars[x.c]; if (c && !S.drafts.dm[c.id]) S.drafts.dm[c.id] = castText(g, r, c); } openDM(c0.id); } // (the proposals, ready to send)
    update();
  };
  const launch = () => {
    if (lock.current || !ok) return;
    if (askQ) { if (broke) budgetBlocked(); else genDevis(o); return; }
    if (dv && (dv.paid || devisFor(o) !== dv)) return;
    if (total > 0 && total > g.career.cash) return;
    if (dv && !devisStale(g, dv)) askPayDevis(g, dv, 'Payer et lancer la production', go); else go();
  };
  return html`<${LayerShell} i=${i} title="Grosse production">
    <div class="mg-setup big-plan">
      <p class="lede-sm">${cap1(unW({ what, noun: what === 'short' ? P.shortName : '' }))} ${what === 'vidéo' ? 'faite' : 'fait'} comme une pro, sur ${size} jours : la préparation, le tournage, la post-production (un mini-jeu à chaque étape), et la vie continue entre. Plus de travail, un devis à une autre échelle et ton équipe qui compte plus, mais des vues et des gains multipliés (×${String(BIG_K[size]).replace('.', ',')}). Plusieurs marques peuvent y être, et des persos au casting. Une seule à la fois ; un flop coûte cher.</p>
      ${why ? html`<p class="date-late"><${Icon} n="flame" s=${15} /> ${why}</p>` : null}
      ${whats.length > 1 ? html`<div class="field"><span class="lbl">Format</span><${Seg} items=${whats.map((f) => [f, cap1(noun(f)), !canMake(g, f).ok])} value=${what} onPick=${setWhat} label="Format" />
        ${whats.filter((f) => !canMake(g, f).ok).map((f) => html`<small class="muted gear-why" key=${f}>${canMake(g, f).why}</small>`)}</div>` : null}
      <div class="field"><span class="lbl">L’ampleur</span><div class="big-sizes" role="radiogroup" aria-label="L’ampleur">${[2, 3].map((n) => { const p = bigPlan(g, { what, size: n, day: 1, hour: 20 }); return html`<button type="button" key=${n} role="radio" aria-checked=${size === n ? 'true' : 'false'} class=${'diff-opt' + (size === n ? ' on' : '')} onClick=${() => { setSize(n); if (day == null || bigPlan(g, { what, size: n, day, hour: 20 }).slots[0] <= Date.now() + 60000) setDay(firstDay(what, n)); }}>
        <span class="d-emo" aria-hidden="true">${n === 2 ? '🎬' : '🎥'}</span><span class="d-mid"><b>${n} jours</b><small>${p.works.map((w) => hWord(w)).join(' + ')} de travail</small></span><span class="d-mult">vues ×${String(BIG_K[n]).replace('.', ',')}</span></button>`; })}</div></div>
      <div class="field"><span class="lbl">Premier jour</span><div class="tr-chips" role="group" aria-label="Premier jour">${BIG_DAYS.map((d) => { const off = !(bigPlan(g, { what, size, day: d, hour: 20 }).slots[0] > Date.now() + 60000); return html`<button key=${d} type="button" class=${'chip-btn' + (day === d ? ' on' : '')} aria-pressed=${day === d ? 'true' : 'false'} disabled=${off} onClick=${() => setDay(d)}>${dayWord(d)}</button>`; })}</div></div>
      <div class="field"><span class="lbl">Heure de sortie (le ${size === 2 ? 'deuxième' : 'troisième'} jour)</span>
        <div class="hour-pick">${PLAN_HOURS.map((h) => { const hd = gameDate(Date.now()); hd.setHours(h, 0, 0, 0); const a = audienceAt(hd); return html`<button key=${h} type="button" class=${'chip-btn' + (hour === h ? ' on' : '')} disabled=${!bigPlan(g, { what, size, day, hour: h }).fits} onClick=${() => setHour(h)}>${h} h${a >= 1.2 ? ' 🔥' : ''}</button>`; })}</div>
        <small>🔥 = heure de pointe : plus de monde en ligne, plus de vues.</small></div>
      ${day != null ? html`<ol class="big-plan-list">${BIG_STAGES.map((s, k) => html`<li key=${s.k}><span aria-hidden="true">${s.emoji}</span><b>${s.label}</b><span>${atWord(plan.slots[k])} · ${hWord(plan.works[k])}</span></li>`)}<li><span aria-hidden="true">🍿</span><b>Sortie</b><span>${atWord(plan.out)}</span></li></ol>` : html`<p class="muted">Aucun jour possible pour l’instant.</p>`}
      <div class="field"><label class="lbl" for="bg-theme">Le sujet</label>
        <input id="bg-theme" class="input" maxlength="80" value=${theme} onInput=${(ev) => setTheme(ev.target.value)} placeholder="ex : 24 h dans une fête foraine abandonnée" /></div>
      <div class="field"><label class="lbl" for="bg-plot">Ce qui s’y passe <span class="muted">(facultatif)</span></label>
        <textarea id="bg-plot" class="input" rows="3" maxlength=${PLOT_MAX} value=${plot} onInput=${(ev) => setPlot(ev.target.value)} placeholder=${PLOT_HINT[what] || PLOT_HINT.vidéo}></textarea></div>
      <div class="field"><span class="lbl" id="bg-diff">Difficulté (les trois étapes)</span>
        <div class="diff-list compact" role="radiogroup" aria-labelledby="bg-diff">${BIG_DIFFS.map((d) => html`<button type="button" key=${d.id} role="radio" aria-checked=${diff === d.id ? 'true' : 'false'} class=${'diff-opt' + (diff === d.id ? ' on' : '')} onClick=${() => setDiff(d.id)}><span class="d-emo" aria-hidden="true">${d.emoji}</span><span class="d-mid"><b>${d.label}</b></span><span class="d-mult">${fmtMult(d.mult)}</span></button>`)}</div></div>
      ${partners.length ? html`<div class="field"><span class="lbl">Le casting (facultatif, ${BIG_CAST} au plus)</span>
        <div class="tr-chips" role="group" aria-label="Le casting">${partners.map((c) => html`<button type="button" key=${c.id} class=${'chip-btn' + (cast.includes(c.id) ? ' on' : '')} aria-pressed=${cast.includes(c.id) ? 'true' : 'false'} onClick=${() => togg(cast, setCast, c.id, BIG_CAST)}>${firstName(c)}</button>`)}</div>
        <small class="muted">Une fois lancée, tu leur proposes en message (le texte est prêt) : chacun accepte ou refuse. Ceux qui disent oui amènent leur public.</small></div>` : null}
      ${signable.length ? html`<div class="field"><span class="lbl">Tes sponsors dedans (facultatif, ${BIG_DEALS} au plus)</span>
        <div class="tr-chips" role="group" aria-label="Sponsors">${signable.map((d) => html`<button type="button" key=${d.id} class=${'chip-btn' + (deals.includes(d.id) ? ' on' : '')} aria-pressed=${deals.includes(d.id) ? 'true' : 'false'} onClick=${() => togg(deals, setDeals, d.id, BIG_DEALS)}>${d.emoji} ${d.brand}${dealLeft(g, d)}</button>`)}</div>
        ${clash.map((x) => html`<small class="care-warn" key=${x.d.id}>⚖️ ${x.why} : elle ne paiera que la moitié.</small>`)}
        <small class="muted">D’autres marques peuvent te contacter pour y être, jusqu’à la sortie.</small></div>` : null}
      ${early.length ? html`<small class="muted">${early.map((d) => `${d.emoji} ${d.brand}`).join(', ')} : à livrer avant sa sortie : pas dans cette production.</small>` : null}
      ${dv ? html`<${DevisCard} g=${g} dv=${dv} />` : null}
      <button class="btn btn-hot" onClick=${launch} disabled=${!ok || dvBusy || (askQ ? broke : total > 0 && total > g.career.cash)}>${askQ
        ? (dvBusy ? html`<${Typing} /> Le devis arrive…` : html`<${Icon} n="receipt" s=${16} /> ${(dv && dv.cut) || S.devisErr === devisKey(o) ? 'Redemander le devis' : 'Demander le devis'} · ≈ ${costLabel(g, 'devis')} ☕`)
        : html`<${Icon} n="calendar" s=${16} /> ${total ? `Payer ${fmtMoney(g, total)} et lancer la production` : 'Lancer la production'}`}</button>
      ${!ok && !why ? html`<small class="muted why-off">${theme.trim().length < 3 ? 'Écris d’abord le sujet.' : !canMake(g, what).ok ? canMake(g, what).why : 'Choisis un jour et une heure de sortie qui tiennent.'}</small>` : askQ && broke && !dvBusy ? html`<small class="muted why-off">Ton budget IA du jour est épuisé. <button class="linkbtn" onClick=${budgetBlocked}>Options</button></small>` : null}
      ${needDevis && !dv ? html`<small class="muted">Le devis dit ce que coûte une production de cette ampleur (lieu, décors, figurants, prestataires…), jamais ce que tu as déjà. Il se paie pour la lancer.</small>` : null}
    </div>
  <//>`;
}
