/* =========================================================
   0.30: the toxic reputation (« réputation toxique »), a second gauge, for everyone.
   - It rises only with what is toxic: insulting, harassing, humiliating someone, a fake proof, an illegal sponsor. The AI
     judges it in the evaluation it already writes (tox 0-3, riposte, cible), never a list of words. A clash is no crime
     when it is a good comeback (someone attacked first, or a feud: the nemesis, someone who keeps tackling the player):
     the reputation does not suffer, only the toxic gauge rises a little (it draws the people who like clashes).
   - It comes down slowly when the player calms down, faster with sincere apologies (and the toxic fans turn on them).
   - It brings its public (toxic subscribers, who love drama and stay for it; the others leave in waves), its brands
     (shady ones, who pay better), its trouble (the platform's warnings: content taken down, a reach cut, a suspension of
     a few days, never a deletion; the people it targets answer, block, file a complaint), and its people (career, roles).
   - The trolls the AI writes are toxic in their manners (mockery, provocation, a pack), never hateful.
   ========================================================= */
const TOX_TIERS = [[60, 'Infréquentable', '🖤'], [35, 'Toxique', '☣️'], [15, 'Piquante', '🌶️'], [1, 'Légère', '🌱'], [0, 'Nulle', '🌱']];
const toxOf = (g) => clamp(num(g && g.stats && g.stats.tox, 0), 0, 100);
const toxLvOf = (x) => (x >= 60 ? 3 : x >= 35 ? 2 : x >= 15 ? 1 : 0);
const toxLv = (g) => toxLvOf(toxOf(g));
const toxTier = (x) => TOX_TIERS.find(([m]) => x >= m) || TOX_TIERS[TOX_TIERS.length - 1];
const toxShare = (g) => clamp(num(g && g.stats && g.stats.toxShare, 0), 0, 0.9);
// What each level does, as the player reads it.
const TOX_FX = {
  0: ['Rien : personne ne te voit comme quelqu’un de toxique.'],
  1: ['Quelques trolls traînent dans tes commentaires, et une partie de ton public se lasse de tes piques.'],
  2: ['Ton public toxique adore le drama : tes clashs font plus de vues, mais les autres partent par vagues.', 'Les marques sérieuses hésitent ; les marques louches, elles, paient mieux.'],
  3: ['Tu es infréquentable : seules les marques louches te contactent, mais elles paient jusqu’à trois fois plus.', 'Ta réputation attire des gens qui lui ressemblent (trolls, fans toxiques…), et les dramas sur toi se multiplient.'],
};
// A change of the gauge (on 100, shown on 1000); harder to climb near the top. Returns the change.
function toxMove(g, d, why, t = Date.now()) {
  const s = g && g.stats;
  if (!s || !d) return 0;
  const x0 = toxOf(g), x1 = clamp(Math.round((x0 + (d > 0 ? d * (1 - x0 / 150) : d)) * 10) / 10, 0, 100);
  if (x1 === x0) return 0;
  s.tox = x1;
  if (d > 0) s.toxAt = t;
  const log = s.toxLog || (s.toxLog = []), w = str(why, 90), last = log[log.length - 1];
  if (w) {
    if (last && last.why === w && t - last.at < 30 * 60000) { last.d = Math.round((last.d + x1 - x0) * 10) / 10; last.at = t; }
    else log.push({ at: t, d: Math.round((x1 - x0) * 10) / 10, why: w });
    if (log.length > 20) log.splice(0, log.length - 20);
  }
  const l0 = toxLvOf(x0), l1 = toxLvOf(x1);
  if (l1 > l0) { const T = toxTier(x1); addNotif(g, { k: 'tox', at: t, text: `${T[2]} Ta réputation toxique passe à « ${T[1]} » : ${TOX_FX[l1][0]}` }); }
  else if (l1 < l0) { const T = toxTier(x1); addNotif(g, { k: 'standup', at: t, text: `${T[2]} Ta réputation toxique redescend : « ${T[1]} ».` }); }
  return x1 - x0;
}
// What a toxic act is worth on the gauge (lvl: the AI's tox, 0-3; good: a comeback that landed; rel: a release).
const toxPts = (lvl, good, rel) => (good ? [0, 0.5, 1.5, 7][lvl] : [0, 1, 3, 7][lvl] * (rel ? 1.5 : 1));

/* ---------- the moderation: the network (posts, replies) and the platform (releases) ----------
   A content of harassment is taken down with a warning; a second one within 30 days cuts the reach for a few days; a third,
   and the platform suspends the channel for 3 days (the network restricts the account): never a deletion. */
const MOD_DAYS = 30, CUT_MS = 3 * DAY_MS, SUSP_MS = 3 * DAY_MS;
const modOf = (g) => g.mod || (g.mod = { net: [], pf: [] });
const modCut = (g, pf, t = Date.now()) => { const M = g.mod; return M && (pf ? M.pfCut : M.netCut) > t ? 0.5 : 1; };
const suspended = (g, t = Date.now()) => !!(g.mod && g.mod.susp && g.mod.susp.until > t);
function modStrike(g, pf, what, t = Date.now()) {
  const M = modOf(g), k = pf ? 'pf' : 'net';
  M[k] = (M[k] || []).filter((x) => t - x.at < MOD_DAYS * DAY_MS).concat({ at: t, what: str(what, 60) });
  const n = M[k].length, where = pf ? pfName(g, platformOf(g)) : 'Le réseau';
  if (n === 1) addNotif(g, { k: 'screen', at: t, text: `🚫 ${where} retire ${what} pour harcèlement, avec un avertissement (1/3).` });
  else if (n === 2) {
    M[pf ? 'pfCut' : 'netCut'] = t + CUT_MS;
    addNotif(g, { k: 'screen', at: t, text: `🚫 ${where} retire ${what} pour harcèlement (2/3) : ${pf ? 'tes vidéos' : 'tes posts'} sont moins montré${pf ? 'e' : ''}s pendant 3 jours.` });
  } else if (pf) {
    M.susp = { from: t, until: t + SUSP_MS };
    addNotif(g, { k: 'screen', at: t, text: `⛔ ${where} suspend ta chaîne 3 jours pour harcèlement : aucune sortie possible jusqu’à ${hourOf(M.susp.until)} (${longDay(M.susp.until)}). Tes sorties prévues t’attendront.` });
    addTrigger(g, `${where} suspend la chaîne du joueur pour harcèlement, pour quelques jours : ça fait le tour du réseau, ses fans toxiques crient à la censure, les autres trouvent ça mérité.`);
  } else {
    M.netCut = t + CUT_MS;
    addNotif(g, { k: 'screen', at: t, text: `🚫 ${where} retire ${what} et restreint ton compte 3 jours pour harcèlement répété : presque personne ne voit tes posts.` });
  }
  return n;
}
// The suspension is over: the releases whose time came meanwhile wait, with their grace from now (and a free postponement).
function modTick(g, t = Date.now()) {
  const M = g.mod;
  if (!M || !M.susp || M.susp.until > t || M.susp.done) return false;
  M.susp.done = 1;
  absenceGrace(g, M.susp.from, t);
  addNotif(g, { k: 'standup', at: t, text: `✅ Ta chaîne est de retour sur ${pfName(g, platformOf(g))}.` });
  return true;
}

/* ---------- after an evaluation ---------- */
function toxAfterEval(ctx) {
  const g = ctx.g, e = ctx.eval, out = ctx.outcome || {}, t = Date.now();
  if (!g || !e || (ctx.fake && ctx.fake.busted)) return;
  if (ctx.apology && toxOf(g) > 0) { toxRedeem(g, e.sincerity == null ? 5 : e.sincerity, t); return; }
  const lvl = e.tox || 0;
  if (!lvl) return;
  const rel = !!ctx.video, good = !!e.riposte && e.reception >= 2 && lvl < 3;
  const item = ctx.kind === 'post' ? ctx.post : ctx.mine;
  const what = rel ? `ta vidéo « ${str(ctx.video.r && ctx.video.r.topic, 40)} »` : ctx.kind === 'post' ? 'ton post' : 'ta réponse';
  toxMove(g, toxPts(lvl, good, rel), good ? `${what} : un clash qui a plu aux amateurs` : lvl === 3 ? `${what} : du harcèlement` : `${what} : méchant`, t);
  // its public: the newcomers came for that; some of the others leave
  const F1 = g.stats.followers, gained = Math.max(0, out.fol || 0);
  if (lvl >= 2 && gained) g.stats.toxShare = clamp((toxShare(g) * Math.max(0, F1 - gained) + gained * (good ? 0.5 : 0.9)) / Math.max(1, F1), 0, 0.9);
  if (lvl >= 2 && !good) {
    const lose = Math.round(F1 * (1 - toxShare(g)) * (lvl === 3 ? 0.03 : 0.01));
    if (lose > 0) { g.stats.followers = Math.max(0, F1 - lose); if (item && item.res) item.res.toxLoss = lose; }
  }
  // the one it targets
  const c = e.cible ? charByHandle(g, normHandle(e.cible)) : null;
  if (c && isMain(c) && lvl >= 2 && !good) {
    applyRel(g, c, lvl === 3 ? -15 : -6, lvl === 3 ? 'tu le·la harcèles en public' : 'tu t’en es pris·e à lui·elle en public', later() + 2600, 20);
    addMem(g, c, lvl === 3 ? 'le joueur me harcèle en public' : 'le joueur s’en est pris à moi en public');
    if (lvl === 3) harassComplaint(g, c, t);
    else addTrigger(g, `@${c.handle} a été visé·e par le joueur en public (« ${str(item && item.text, 60)} ») : ${gx(c.g, 'il', 'elle', 'iel')} répond à sa façon (un recadrage, une contre-attaque, ou ${gx(c.g, 'il', 'elle', 'iel')} bloque).`, c.id);
  }
  if (lvl === 3) { modStrike(g, rel, what, t); if (item) item.removed = t; if (rel) ctx.removed = true; } // taken down, with a warning
}
// A main character harassed in public files a complaint (once a week at most): the lawyer, the reputation, the talk.
function harassComplaint(g, c, t = Date.now()) {
  if (c.complaintAt && t - c.complaintAt < 7 * DAY_MS) return false;
  c.complaintAt = t;
  const fee = niceRound(clamp(400 + g.stats.followers / 60, 400, 4000));
  charge(g, fee, `Avocat : plainte de ${c.name} pour harcèlement`);
  const dr = repMove(g, { kind: -10, cred: -4 }, `${c.name} porte plainte pour harcèlement`, { noCheck: true });
  addNotif(g, { k: 'screen', c: c.id, at: t + 3000, text: `⚖️ ${c.name} porte plainte pour harcèlement : ${fmtMoney(g, fee)} d’avocat${repBit(dr, ', ')}.` });
  addTrigger(g, `@${c.handle} porte plainte contre le joueur pour harcèlement et le dit publiquement : soutien massif pour ${gx(c.g, 'lui', 'elle', 'iel')}, les fans toxiques du joueur crient au complot.`, c.id);
  return true;
}
// Sincere apologies: the gauge comes down a lot; the toxic fans feel betrayed (some leave, loudly).
function toxRedeem(g, sincerity, t = Date.now()) {
  if (sincerity < 4) return;
  const d = toxMove(g, sincerity >= 7 ? -12 : -4, sincerity >= 7 ? 'des excuses sincères' : 'des excuses timides', t);
  const sh = toxShare(g);
  if (sincerity >= 7 && sh > 0.05) {
    const lose = Math.round(g.stats.followers * sh * 0.35);
    g.stats.followers = Math.max(0, g.stats.followers - lose);
    g.stats.toxShare = Math.round(sh * 0.6 * 100) / 100;
    addNotif(g, { k: 'unfollow', at: t + 4000, text: `🖤 Tes fans toxiques n’ont pas aimé tes excuses : −${nAbonnes(lose)} (« vendu », « il s’est ramolli »). Les autres respirent.` });
    addTrigger(g, 'Le joueur s’est excusé sincèrement : ses fans toxiques se sentent trahis (« vendu », « tu t’es ramolli »), une partie part en claquant la porte, les autres commencent à lui pardonner.');
  }
  return d;
}
// The clock: the gauge comes down slowly once the player calms down (half a point a game day, from a day after the last toxic act).
function tickToxic(g, t = Date.now()) {
  let ch = modTick(g, t);
  const s = g.stats, x = toxOf(g), calm = (s.toxAt || 0) + DAY_MS;
  if (x > 0 && t > calm) {
    const from = Math.max(calm, s.toxDecayAt || 0);
    if (t - from >= 4 * 3600000) { toxMove(g, -Math.min(x, (t - from) / DAY_MS * 0.6), '', t); s.toxDecayAt = t; ch = true; } // (by tenths)
  }
  return ch;
}

/* ---------- what the AI reads ---------- */
// For every call: the player's toxic name, and the public it brings (never hateful).
function toxCtx(g, kind) {
  const lv = toxLv(g);
  if (!lv) return null;
  const T = toxTier(toxOf(g)), sh = Math.round(toxShare(g) * 100);
  const pub = kind === 'public' || kind === 'thread';
  return `Réputation toxique du joueur : ${T[1].toLowerCase()} (il s’en prend souvent aux gens)${pub ? `. Une partie de son public${sh ? ` (≈ ${sh} %)` : ''} adore le drama : des fans toxiques qui l’encouragent, en redemandent et s’en prennent à ses critiques ; les autres se lassent ou le recadrent. Ces fans et les trolls restent toxiques sans être haineux : jamais d’insulte discriminatoire` : ' : chacun réagit selon son caractère (certains s’éloignent, d’autres sont attirés par ça)'}.`;
}
// In the evaluation: how toxic the player's action is, whether it answers an attack, whom it targets.
const TOX_EVAL = ' tox 0-3 (ce que l’action du joueur a de toxique : 0 rien ; 1 piquant, insolent ; 2 méchant : humiliation, clash violent, moquerie cruelle ; 3 harcèlement : insultes sexistes, racistes ou homophobes, haine, acharnement sur quelqu’un, menace), riposte (true si le joueur répond à quelqu’un qui l’a attaqué, taclé ou moqué en premier, dans ce fil ou avant : un ennemi juré, quelqu’un qui le tacle souvent ; false s’il attaque sans provocation ou ne vise personne), cible (le handle de la personne qu’il vise, sinon vide). Un clash bien envoyé en riposte peut être très bien reçu.';
// Who the player is at war with: attacking them first is still a comeback.
function feudLine(g, targets) {
  const war = targets.filter((c) => c && isMain(c) && (c.vibe === 'nemesis' || c.vibe === 'rival' || c.rel <= -30));
  return war.length ? `${war.map((c) => '@' + c.handle).join(', ')} ${war.length > 1 ? 'sont' : 'est'} en guerre ouverte avec le joueur (${war.map((c) => c.vibe === 'nemesis' ? 'ennemi juré' : 'ils se taclent souvent').join(', ')}) : s’en prendre à ${war.length > 1 ? 'eux' : gx(war[0].g, 'lui', 'elle', 'iel')}, même le premier, compte comme une riposte.` : null;
}

/* ---------- the brands of a toxic name ---------- */
// The chance an offer comes from an illegal sector, and what such a brand pays a toxic creator (×1,5 → ×3).
const toxBannedP = (g) => [0.08, 0.25, 0.6, 0.9][toxLv(g)];
const toxFeeK = (g) => (toxLv(g) ? 1.5 + 1.5 * clamp((toxOf(g) - 15) / 85, 0, 1) : 1);
const TOX_SPONSOR = 'Le joueur a une réputation toxique : les marques sérieuses ne le contactent plus. Celle-ci est louche, d’un secteur que la loi encadre (crypto douteuse, paris en ligne, casino, vapoteuses, chirurgie esthétique à prix cassé…), et paie bien.';

/* ---------- on screen ---------- */
function ToxBlock({ g, now, side }) {
  const s = g.stats, x = toxOf(g), lv = toxLvOf(x), T = toxTier(x);
  if (!x && !(s.toxLog || []).length) return null;
  if (side) return html`<div class="kv tox-kv"><span>Réputation toxique</span><b>${T[1]} · ${Math.round(x * 10)}</b></div><${Meter} frac=${x / 100} tone="bad" />`;
  const log = (s.toxLog || []).slice(-6).reverse(), M = g.mod;
  return html`<div class="tox-sec">
    <div class="section-h"><h3>${T[2]} Réputation toxique</h3><span><b>${Math.round(x * 10)}</b> / 1000 · ${T[1]}</span></div>
    <${Meter} frac=${x / 100} tone="bad" />
    <ul class="tox-fx">${TOX_FX[lv].map((f, k) => html`<li key=${k}>${f}</li>`)}</ul>
    ${toxShare(g) >= 0.05 ? html`<p class="muted">Public toxique : ≈ ${Math.round(toxShare(g) * 100)} % de tes abonnés.</p>` : null}
    ${M && M.susp && M.susp.until > now ? html`<p class="tox-mod">⛔ Chaîne suspendue jusqu’à ${hourOf(M.susp.until)} (${longDay(M.susp.until)}).</p>` : M && (M.pfCut > now || M.netCut > now) ? html`<p class="tox-mod">🚫 Visibilité réduite jusqu’à ${hourOf(Math.max(M.pfCut || 0, M.netCut || 0))}.</p>` : null}
    <p class="muted rep-how">Elle monte quand tu t’en prends aux gens (une riposte bien envoyée compte peu), redescend quand tu te calmes, plus vite avec des excuses sincères.</p>
    ${lv ? html`<div class="row"><button class="btn btn-ghost btn-sm" onClick=${() => openCompose({ apology: true })} disabled=${now - (g.apologyAt || 0) < APOLOGY_COOLDOWN}>Poster des excuses</button></div>` : null}
    ${log.length ? html`<div class="rep-log"><span class="rl-h">Pourquoi elle bouge</span>${log.map((r, k) => html`<div class="rl-row" key=${k}><span class=${'rl-d ' + (r.d > 0 ? 'bad' : 'good')}>${r.d > 0 ? '+' : '−'}${Math.abs(Math.round(r.d * 10))}</span><span class="rl-why">${cap1(r.why)}</span><time>${fmtAgo(r.at, now)}</time></div>`)}</div>` : null}
  </div>`;
}
