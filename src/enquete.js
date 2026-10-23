/* =========================================================
   0.33.1: sending someone. The player may ask someone of the cast to go and see another one for them (talk, find out,
   go to their place…): from the profile of the one to see (« 🕵️ Envoyer quelqu’un lui parler »), or in their own words
   in a message. The AI of the one asked decides: yes, no, or not that far (what they will do, how far it goes, when).
   They go (a few hours later, off screen) and come back with what they saw, told in their messages: someone ordinary,
   as they are (and if one went too far, they may have noticed, and not liked it); the psychopath, details that frighten,
   noted in their name (a witness: they know, now). The more one asks (going to their place, searching, breaking in), the
   more people one sends (they understand), the further along they are, the more it may go wrong: the one sent may never
   come back. Gone for good (out of the world), and the end of nothing else: hours later, they no longer answer.
   ========================================================= */
const MISSION_RE = /(?:aller|va|vas|allez|irais|irait|passer|passe|passes)\s+(?:lui\s+|la\s+|le\s+)?(?:parler|voir|discuter|demander|espionner|fouiller|enqu[êe]ter|sonder|surveiller|questionner|interroger)|espionner|enqu[êe]ter sur|fouiller (?:chez|son|sa|ses)|en savoir plus sur|savoir ce qu['’](?:il|elle|iel) (?:cache|pense|veut|fait)|d[ée]couvrir ce qu|tirer les vers du nez/i;
const MISSION_TTL = 2 * DAY_MS; // asked from the profile: the request waits that long in their messages
const RISK_WORDS = ['', 'lui parler, prendre un verre, poser des questions', 'aller chez lui ou elle, le ou la suivre, fouiner un peu', 's’introduire chez lui ou elle, fouiller, prendre quelque chose, le ou la confronter seul·e la nuit'];
const missionRoll = () => (window.__HYPE_TEST__ && Array.isArray(window.__missionRolls) && window.__missionRolls.length ? window.__missionRolls.shift() : Math.random());
const missionsOf = (g) => g.missions || (g.missions = []);
const missionOn = (g, f) => (g.missions || []).find((m) => m.f === f.id && m.state === 'planned') || null;
const missionOK = (g, f, x) => !!f && !!x && f.id !== x.id && isMain(f) && f.unlocked && !f.cut && !f.jailed && isMain(x) && x.unlocked && !x.jailed && !(f.cool && f.cool.k === 'bloque' && Date.now() < f.cool.until);
const missionTarget = (g, x) => t33On() && !!x && isMain(x) && x.unlocked && !x.jailed;
// Asked from the profile: the request waits in their messages (the player says what they want to know).
function askMission(g, x, f, t = Date.now()) {
  if (!missionOK(g, f, x) || missionOn(g, f)) return false;
  f.missionAsk = { x: x.id, at: t };
  S.drafts.dm[f.id] = `Tu pourrais aller parler à @${x.handle} pour moi ? J’aimerais savoir `;
  return true;
}
// Who the player wants them to go and see (asked from the profile, or named in a message that asks it).
function missionWho(g, f, text, t = Date.now()) {
  const A = f.missionAsk && t - f.missionAsk.at < MISSION_TTL ? g.chars[f.missionAsk.x] : null;
  if (A && missionOK(g, f, A)) return A;
  if (!MISSION_RE.test(text || '')) return null;
  return namedIn(g, text, f).find((x) => missionOK(g, f, x)) || null;
}
function missionDMCtx(g, f, text, t = Date.now()) {
  if (!t33On() || !f || !isMain(f)) return [];
  const first = firstName(f), il = gx(f.g, 'il', 'elle', 'iel');
  const on = missionOn(g, f), y = on && g.chars[on.x];
  if (y) return [`${first} a promis au joueur d’aller voir @${y.handle} pour lui (« ${on.plan} », ${fmtWhen(on.due, t)}) : ${il} n’y est pas encore ${gx(f.g, 'allé', 'allée', 'allé·e')}.`];
  const x = missionWho(g, f, text, t);
  if (!x) return [];
  const tie = tieOf(g, f.id, x.id);
  return [`Le joueur demande à ${first} d’aller voir @${x.handle} (${x.name}) pour lui. ${first} décide comme ${il} est : selon votre relation (${fmtRel(f.rel)}), ce qu’${il} pense de ${firstName(x)}${tie ? ` (entre eux : ${fmtRel(tie)})` : ''}, son caractère, et ce que le joueur demande vraiment. ${cap1(il)} peut accepter, refuser, ou accepter en allant moins loin (lui parler, oui ; fouiller chez ${gx(x.g, 'lui', 'elle', 'iel')}, non).`];
}
function missionLine(g, f, text, t = Date.now()) {
  if (!t33On() || !f || !isMain(f) || missionOn(g, f)) return null;
  const x = missionWho(g, f, text, t);
  if (!x) return null;
  const il = gx(f.g, 'il', 'elle', 'iel');
  return `- Si ${firstName(f)} décide dans ce message (aller voir @${x.handle} pour le joueur) : {"t":"mission","who":"${x.handle}","ok":true,"plan":"≤ 80 caractères : ce qu’${il} va faire, concrètement","risk":1,"when":"ce soir"} (ok:false s’${il} refuse ; risk, jusqu’où ça va : 1 = ${RISK_WORDS[1]} ; 2 = ${RISK_WORDS[2]} ; 3 = ${RISK_WORDS[3]} ; when : ce soir, demain ou dans la semaine). Pas de ligne s’${il} hésite encore.`;
}
// When they go (game time): tonight (or in two hours), tomorrow evening, within the week.
function missionDue(when, t = Date.now()) {
  const w = String(when || '').toLowerCase(), d = gameDate(t);
  if (/semaine|jours/.test(w)) return t + randi(2, 4) * DAY_MS;
  const x = new Date(d.getTime());
  if (/demain/.test(w)) { x.setDate(x.getDate() + 1); x.setHours(19, 0, 0, 0); return t + (x - d); }
  x.setHours(Math.max(d.getHours() + 2, 20), 30, 0, 0);
  return t + Math.max(2 * HR, x - d);
}
function applyMissionLine(g, f, o, t = Date.now()) {
  const x = charByHandle(g, normHandle(o.who)) || (f.missionAsk ? g.chars[f.missionAsk.x] : null);
  if (!x || !missionOK(g, f, x) || missionOn(g, f)) return false;
  delete f.missionAsk;
  const first = firstName(f);
  if (!(o.ok === true || o.ok === 'true')) { addNotif(g, { k: 'reldown', c: f.id, at: later() + 1500, text: `${first} n’ira pas voir ${firstName(x)} pour toi.` }); return true; }
  const m = { id: uid('mi'), f: f.id, x: x.id, plan: str(o.plan, 80) || `aller parler à ${firstName(x)}`, risk: int(o.risk, 1, 3, 1), at: t, due: missionDue(o.when, t), state: 'planned' };
  g.missions = missionsOf(g).concat(m).slice(-20);
  addNotif(g, { k: 'event', c: f.id, at: later() + 1500, text: `🕵️ ${first} va voir ${firstName(x)} pour toi, ${fmtWhen(m.due)} : « ${m.plan} ».` });
  addMem(g, f, `le joueur m’a demandé d’aller voir @${x.handle} pour lui : « ${m.plan} »`);
  touch(f);
  return true;
}

/* ---------- they go ---------- */
// How it may go wrong: only with the psychopath; by how far it goes, how far along they are, the night, and the ones
// sent before (they understand).
function missionDanger(g, m, x) {
  if (!isPsy(g, x) || !psyNow(g)) return 0;
  const st = Math.max(0, psyStage(g));
  const before = (g.missions || []).filter((o) => o.x === x.id && o.id !== m.id && o.state !== 'planned' && o.state !== 'off' && m.due - o.due < 10 * DAY_MS).length;
  const p = [0, 0.05, 0.2, 0.45][clamp(m.risk || 1, 1, 3)] * [0.15, 0.4, 1, 1.6][st] * (nightAt(m.due) ? 1.3 : 1) + before * (st >= 2 ? 0.15 : 0.07);
  return Math.round(clamp(p, 0, 0.85) * 100) / 100;
}
// What they saw there (chosen by the game: the report tells it, the clue keeps it).
const PEEK_PSY = [
  [(P) => `${P.il} n’a parlé que de toi, tout le temps`, (P) => `${P.il} savait déjà que je venais de ta part`, (P) => `${P.il} connaissait ta journée d’hier par cœur`],
  [(P) => `${P.il} m’a demandé trois fois avec qui tu sortais`, (P) => `ton prénom en fond d’écran sur son téléphone`, (P) => `${P.il} a dit : « on est faits pour être ensemble, il faut juste lui laisser le temps »`],
  [() => 'un carnet avec tes horaires de la semaine, heure par heure', () => 'une photo de toi prise de nuit, devant chez toi', () => 'ton vieux sweat, plié sur son oreiller'],
  [(P) => `${P.il} a dit en souriant : « bientôt, plus personne ne se mettra entre nous »`, (P) => `${P.il} m’a demandé si tu dormais bien… comme si ${P.il} le savait déjà`, (P) => `${P.il} a dit : « ceux qui essaient de nous séparer finissent toujours par partir »`],
  [() => 'des dizaines de photos de toi au mur de sa chambre', () => 'un double de tes clés, accroché dans son entrée', () => 'une corde et du ruban adhésif dans le placard de l’entrée', () => 'une coupure de presse sur un ex porté disparu, dans un tiroir'],
];
const PEEK_STALK = [(P) => `${P.il} connaît tous tes lives par cœur, même ceux que tu as supprimés`, () => 'des captures de tes stories, imprimées et classées', () => 'ton visage en fond d’écran'];
function missionPeek(g, m, x) {
  const P = { il: gx(x.g, 'il', 'elle', 'iel') };
  if (isPsy(g, x) && psyNow(g)) { const st = Math.max(0, psyStage(g)), deep = m.risk >= 2; return pick(st <= 1 ? PEEK_PSY[0] : st === 2 ? PEEK_PSY[deep ? 2 : 1] : PEEK_PSY[deep ? 4 : 3])(P); }
  if (isStalker(g, x)) return pick(PEEK_STALK)(P);
  return null;
}
function goMission(g, m, t = Date.now()) {
  const f = g.chars[m.f], x = g.chars[m.x];
  if (!f || !x || f.jailed || f.cut || x.jailed) { m.state = 'off'; return; }
  const F = firstName(f), X = firstName(x), psy = isPsy(g, x) && psyNow(g);
  m.p = missionDanger(g, m, x);
  if (m.p > 0 && missionRoll() < m.p) { vanish(g, f, x, m, t); return; }
  m.state = 'back';
  m.backAt = t;
  m.detail = missionPeek(g, m, x);
  if (psy) { addMem(g, x, `@${f.handle} est ${gx(f.g, 'venu', 'venue', 'venu·e')} fouiner chez moi pour le joueur : je l’ai compris`); bumpTie(g, x.id, f.id, -15); }
  else if (!m.detail && m.risk >= 2 && missionRoll() < (m.risk === 3 ? 0.5 : 0.25)) { // gone too far: they noticed
    m.seen = true;
    applyRel(g, x, -8, `${F} est ${gx(f.g, 'venu', 'venue', 'venu·e')} fouiner chez ${gx(x.g, 'lui', 'elle', 'iel')} de ta part`, later() + 3000, 10);
    bumpTie(g, f.id, x.id, -25);
    addMem(g, x, `@${f.handle} est ${gx(f.g, 'venu', 'venue', 'venu·e')} fouiner chez moi pour le joueur`);
    if (m.risk === 3) addTrigger(g, `@${x.handle} a surpris @${f.handle} en train de fouiller chez ${gx(x.g, 'lui', 'elle', 'iel')}, ${gx(f.g, 'envoyé', 'envoyée', 'envoyé·e')} par le joueur : ${X} est furieux·se.`, x.id);
  } else addMem(g, x, `@${f.handle} est ${gx(f.g, 'passé', 'passée', 'passé·e')} me voir et m’a posé pas mal de questions sur le joueur`);
  addMem(g, f, m.detail ? `chez @${x.handle}, j’ai vu ${str(m.detail, 70)} : ça m’a ${gx(f.g, 'glacé', 'glacée', 'glacé·e')}` : `je suis ${gx(f.g, 'allé', 'allée', 'allé·e')} voir @${x.handle} pour le joueur (« ${str(m.plan, 50)} »)`);
  applyRel(g, f, 2, 'tu lui as fait confiance', later() + 2000, 4);
}
// They never came back: out of the world (as one arrested is: no posts, no answers, no dates), told hours later.
function vanish(g, f, x, m, t) {
  m.state = 'gone';
  m.tellAt = t + randi(3, 6) * HR;
  f.gone = { at: t, by: x.id, m: m.id };
  f.jailed = t;
  for (const e of g.events || []) {
    if (e.c === f.id && e.state === 'scheduled') e.state = 'cancelled';
    if (e.plus && e.plus.c === f.id) e.plus = null; // (the one who was to come along)
  }
  g.staff = (g.staff || []).filter((s) => s.c !== f.id);
  addMem(g, x, `@${f.handle} est ${gx(f.g, 'venu', 'venue', 'venu·e')} fouiner chez moi pour le joueur. Personne ne ${gx(f.g, 'le', 'la', 'le ou la')} reverra : je n’en parle jamais`);
}
function tellGone(g, m, t = Date.now()) {
  m.told = t;
  const f = g.chars[m.f], x = g.chars[m.x];
  if (!f) return;
  const F = firstName(f), X = x ? firstName(x) : '';
  addNotif(g, { k: 'reldown', c: f.id, at: t, text: `🕯️ ${F} ne répond plus depuis sa visite chez ${X}. Personne ne l’a ${gx(f.g, 'revu', 'revue', 'revu·e')}.` });
  if (x) psySign(g, x, `${F} devait aller voir ${X} pour toi : depuis, plus personne n’a de nouvelles`, t, true);
  addTrigger(g, `@${f.handle} a disparu depuis sa visite chez @${x ? x.handle : '?'} : ses proches s’inquiètent, un avis de recherche circule ; @${x ? x.handle : '?'} fait comme si de rien n’était.`);
  addChronicle(g, `${f.name} a disparu.`, [f.id]);
}
// Back: they tell the player what happened, in their own words (the AI), the clue noted in their name.
function promptMission(g, m, f, x) {
  const F = firstName(f), X = firstName(x), il = gx(f.g, 'il', 'elle', 'iel'), psy = isPsy(g, x) && psyNow(g), st = psy ? Math.max(0, psyStage(g)) : -1;
  const truth = psy ? [`SECRET DU JEU (${F} ne le sait pas et ne le dit jamais) : @${x.handle} est le psychopathe de cette partie, obsédé·e par le joueur ; où ${gx(x.g, 'il', 'elle', 'iel')} en est : ${PSY_STAGES[st]}.`, `Ce que ${F} a remarqué, à raconter avec ses mots, sans conclure (jamais le mot « psychopathe ») : ${m.detail}. ${F} revient ${st >= 2 ? `mal à l’aise, ${gx(f.g, 'inquiet', 'inquiète', 'inquiet·e')} pour le joueur` : 'un peu perplexe'}.`]
    : m.detail ? [`SECRET DU JEU (${F} ne le sait pas) : @${x.handle} suit le joueur de très près, obsédé·e. Ce que ${F} a remarqué, à raconter avec ses mots : ${m.detail}.`]
      : [`@${x.handle} n’a rien de dangereux : ${F} raconte la personne telle qu’elle est (sa fiche, ce qu’elle vit en ce moment, ce qu’elle pense du joueur : ${fmtRel(x.rel)}).${m.seen ? ` ${X} a compris que ${F} venait fouiner pour le joueur, et l’a mal pris : ${F} le raconte, ${gx(f.g, 'gêné', 'gênée', 'gêné·e')}.` : ''}`];
  return [RULES, '', ctxText(g, { kind: 'thread', feed: 4, chron: 6, focus: new Set([f.id, x.id]), crowd: 2 }), '',
    '## TÂCHE : CE QUE LE JOUEUR AVAIT DEMANDÉ',
    `Le joueur avait demandé à @${f.handle} (${f.name}) d’aller voir @${x.handle} (${x.name}) pour lui. Ce que ${F} a fait : « ${m.plan} » (jusqu’où ça allait : ${RISK_WORDS[clamp(m.risk || 1, 1, 3)]}).`,
    ...truth,
    `${F} écrit maintenant au joueur en privé pour lui raconter, avec sa voix${f.voice ? ` (${str(f.voice, 90)})` : ''} : ce qui s’est passé, ce qu’${il} a vu ou entendu, ce qu’${il} en pense. Naturel, concret, rien de gore.`,
    '', FORMAT, 'Lignes à produire :',
    `- 1 à 3 lignes : {"t":"dm","text":"≤ 200 caractères"} : les messages de ${F} au joueur, dans l’ordre.`,
  ].join('\n');
}
async function missionReport(g, m) {
  const f = g.chars[m.f], x = g.chars[m.x];
  if (!f || !x || f.jailed) { m.told = Date.now(); return; }
  if (!canAfford(g, 'dm')) { m.retryAt = Date.now() + HR; return; }
  S.busy.mission = m.id;
  const fl = startFlow(g);
  const lines = [];
  try {
    await aiStream(promptMission(g, m, f, x), (o) => { if (o.t === 'dm' && lines.length < 3) { const s = str(o.text, 220); if (s) lines.push(s); } }, { signal: fl.ctl.signal, src: fl.id, kind: 'dm', tier: lightTier() });
  } catch (e) { if (!e || e.code !== 'cancelled') console.warn('mission', e && e.message); }
  S.busy.mission = null;
  endFlow(fl);
  if (g !== S.game) return;
  if (!lines.length) {
    m.tries = (m.tries || 0) + 1;
    if (m.tries < 3) { m.retryAt = Date.now() + 30 * 60000; update(); return; }
    lines.push(`Je suis ${gx(f.g, 'passé', 'passée', 'passé·e')} voir ${firstName(x)}. Je te raconte quand on se voit.`);
  }
  m.told = Date.now();
  let at = Date.now() + rand(3000, 7000);
  for (const s of lines) { addIncomingDM(g, f.handle, s, at, { unsolicited: true, burst: true }); at += rand(2500, 6000); }
  if (m.detail) psySign(g, x, `${firstName(f)} a remarqué chez ${firstName(x)} : ${m.detail}`, at, true); // (a witness: they saw it)
  update();
}
function tickMissions(g, t = Date.now()) {
  if (!g || !g.missions || !g.missions.length || g.over) return false;
  let ch = false;
  for (const m of g.missions) {
    if (m.state === 'planned' && t >= m.due) { goMission(g, m, t); ch = true; }
    else if (m.state === 'gone' && !m.told && t >= m.tellAt) { tellGone(g, m, t); ch = true; }
    else if (m.state === 'back' && !m.told && !S.busy.mission && t >= (m.retryAt || 0) && t - m.backAt >= 20 * 60000) { missionReport(g, m); ch = true; }
  }
  return ch;
}

/* ---------- on screen ---------- */
function MissionLayer({ l, g, i }) {
  const x = g.chars[l.id];
  if (!x || !missionTarget(g, x)) return html`<${LayerShell} i=${i} title="Envoyer quelqu’un"><div class="empty"><b>Ce n’est plus possible.</b></div><//>`;
  const list = mains(g).filter((c) => missionOK(g, c, x) && !missionOn(g, c)).sort((a, b) => b.rel - a.rel);
  const pick = (c) => { if (askMission(g, x, c)) { closeLayer(); openDM(c.id); update(); } };
  return html`<${LayerShell} i=${i} title=${'Envoyer quelqu’un · ' + firstName(x)}>
    <section class="section">
      <p class="muted">Demande à quelqu’un d’aller voir ${firstName(x)} pour toi. Ta demande est prête dans vos messages : dis ce que tu veux savoir ou faire. Son IA décide si elle y va, et jusqu’où.</p>
      ${list.length ? html`<div class="feat-list">${list.map((c) => html`<button type="button" key=${c.id} class="feat-pick" onClick=${() => pick(c)}>
        <${Avatar} who=${author(g, 'c:' + c.id)} size=${40} />
        <span class="mid"><b>${c.name}</b><small>${relShown(c)} · confiance ${trustOf(c)}</small></span>
      </button>`)}</div>` : html`<p class="muted">Personne de disponible pour l’instant.</p>`}
    </section>
  <//>`;
}
