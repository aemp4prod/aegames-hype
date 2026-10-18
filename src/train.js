/* =========================================================
   Le train de la hyyype (0.17): two viral releases in a row, and the whole network climbs aboard.
   The Minotaur, in his conductor's cap, announces it. The train runs while the player keeps it fed (their posts and
   what they bring), from level 1 to 5: the more Y in « hyyype », the higher it is. On the way the player's posts carry
   further; at the end comes the bill (XP, the followers gained on the way, and from level 3 the brands notice), then a
   few days before the next one. A bought « Moment viral » never starts it. No AI call of its own: what the Minotaur says
   is written in advance, and the characters hear of it through the next AI call (they decide what they do with it).
   ========================================================= */
// The mascot: an original drawing, in the game's emoji style (« Autocollant », chosen by the owner).
const MINO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128"><defs><path d="M45.1 56.3C29.6 58.8 15.8 49.4 17.6 21c6 14.6 17.2 20.6 30.9 23.2z" id="minotaure-1"/><path d="M82.9 56.3c15.5 2.5 29.3-6.9 27.5-35.3-6 14.6-17.2 20.6-30.9 23.2z" id="minotaure-2"/><path d="M41.6 58.8c-6.8-7.7-19.7-6-27.5 3.5 7.8 9.4 20.7 7.7 29.3 4.3z" id="minotaure-3"/><path d="M86.4 58.8c6.8-7.7 19.7-6 27.5 3.5-7.8 9.4-20.7 7.7-29.3 4.3z" id="minotaure-4"/><path d="M64 34.8c18.9 0 30.1 10.3 29.2 25.8-.8 12-5.1 18.9-6.8 25.8H41.6c-1.7-6.9-6-13.8-6.8-25.8C33.9 45.1 45.1 34.8 64 34.8z" id="minotaure-5"/><clipPath id="minotaure-6"><ellipse cx="51.1" cy="65.7" rx="6.7" ry="7.2"/></clipPath><path d="M43.7 44.1c-3.4-6.5-8.7-14.5-9.3-19.2-.6-5.1 12.7-9.3 26.4-11 13.7-1.7 27.6-.8 28.3 4.3.5 4.7-2.7 13.8-4.4 20.9z" id="minotaure-7"/><path d="M42 37.4c11.4 1.2 31.9-1.3 42.7-5.2l.5 7.7C74.9 43.8 54.4 46.3 43.4 45z" id="minotaure-8"/><path d="M40.4 45.4c14.1 2.2 34.6-.3 47.8-5.9-1.6 8-11.4 13.1-22.5 14.5-11.1 1.4-21.8-1.2-25.3-8.6z" id="minotaure-9"/><g id="minotaure-s" stroke-linejoin="round"><use href="#minotaure-1"/><use href="#minotaure-2"/><use href="#minotaure-3"/><use href="#minotaure-4"/><use href="#minotaure-5"/><ellipse cx="64" cy="93.2" rx="27.5" ry="17.2"/><use href="#minotaure-7"/><use href="#minotaure-8"/><use href="#minotaure-9"/><ellipse cx="62.4" cy="26.7" rx="6.5" ry="5.8" transform="rotate(-7 62.4 26.7)"/></g><filter id="minotaure-f" x="-.2" y="-.2" width="1.4" height="1.5"><feGaussianBlur stdDeviation="1.6"/></filter></defs><use href="#minotaure-s" fill="#1D1419" stroke="#1D1419" stroke-width="14" opacity=".3" filter="url(#minotaure-f)" y="2"/><use href="#minotaure-s" fill="#1D1419" stroke="#1D1419" stroke-width="16.4" opacity=".2"/><use href="#minotaure-s" fill="#fff" stroke="#fff" stroke-width="14"/><use href="#minotaure-1" fill="#F2DAA8"/><use href="#minotaure-2" fill="#F2DAA8"/><path d="M30.5 49.4q2.5-4.3 3.4-8.6" fill="none" stroke="#C79C5E" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/><path d="M97.5 49.4q-2.5-4.3-3.4-8.6" fill="none" stroke="#C79C5E" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/><path d="M25.7 44.2q2.2-3.4 2.6-6.9" fill="none" stroke="#C79C5E" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/><path d="M102.3 44.2q-2.2-3.4-2.6-6.9" fill="none" stroke="#C79C5E" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/><use href="#minotaure-3" fill="#B5683C"/><path d="M39.9 60.6c-5.1-4.3-13.7-2.6-19.8 1.7 6.1 4.7 14.7 4.3 20.7 2.1z" fill="#FF8DA5"/><use href="#minotaure-4" fill="#B5683C"/><path d="M88.1 60.6c5.1-4.3 13.7-2.6 19.8 1.7-6.1 4.7-14.7 4.3-20.7 2.1z" fill="#FF8DA5"/><use href="#minotaure-5" fill="#B5683C"/><path d="M52 48.5c-.5 5.2 2.5 9.1 6.4 7.9.9 3 4.7 4.2 7.5 1.6 2.9 2 7.2.5 8.1-3.3 2.4-.7 3.4-3.6 2.6-6.2z" fill="#9A552E"/><path d="M58.7 52q.1 2.5-.3 4.4" fill="none" stroke="#6E3A1C" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/><path d="M66.2 52.8q.2 3-.3 5.2" fill="none" stroke="#6E3A1C" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/><ellipse cx="64" cy="93.2" rx="27.5" ry="17.2" fill="#F9C7A6"/><ellipse cx="54.5" cy="91.5" rx="4.1" ry="2.9" transform="rotate(25 54.5 91.5)" fill="#3B2316"/><ellipse cx="73.5" cy="91.5" rx="4.1" ry="2.9" transform="rotate(-25 73.5 91.5)" fill="#3B2316"/><path d="M48.5 100.1c7.8 6 20.7 6 29.3 0q2.5-1.7 3.4-4.3" fill="none" stroke="#3B2316" stroke-width="3.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M68.2 93.4c2.3 1.8 3.3 4.9 2.3 7.7-1 2.7-3.6 4.6-6.5 4.6-2.9 0-5.5-1.9-6.5-4.6-1-2.8 0-5.9 2.3-7.7" fill="none" stroke="#FFCB2E" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="51.1" cy="65.7" rx="6.7" ry="7.2" fill="#FFFFFF"/><g clip-path="url(#minotaure-6)"><ellipse cx="52.8" cy="67.4" rx="4" ry="4.6" fill="#3B2316"/><circle cx="54.5" cy="65.5" r="1.4" fill="#fff"/><path d="M41.6 55.4H62.3v7.3c-5.2-1.7-13.8-1.7-20.7.9z" fill="#B5683C"/></g><path d="M44.6 62.8c3.9-1.7 9.9-1.7 13.6-.3" fill="none" stroke="#3B2316" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M70.9 68.5c1.2-7.4 10.8-7.4 12 0" fill="none" stroke="#3B2316" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M43.4 55.8q6.8-4.3 14.6-1.3" fill="none" stroke="#3B2316" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M70 58.8q6.9-1.2 14.6 1.3" fill="none" stroke="#3B2316" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round"/><use href="#minotaure-7" fill="#2C2548"/><use href="#minotaure-8" fill="#F0368C"/><use href="#minotaure-9" fill="#1B1630"/><ellipse cx="62.4" cy="26.7" rx="6.5" ry="5.8" transform="rotate(-7 62.4 26.7)" fill="#FFCB2E"/><circle cx="62.4" cy="26.7" r="2.3" fill="#F0368C"/></svg>`;
const MINO_SRC = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(MINO_SVG);
const TRAIN_WIN = 6 * HR; // without fuel for this long (game time), it stops
const TRAIN_MAX = 48 * HR; // and it never runs longer than this
const TRAIN_REST = 72 * HR; // between two trains
const TRAIN_PTS = [0, 0, 4, 9, 15, 22]; // points to reach each level (level 1 at the start)
const TRAIN_TOP = 5;
const hyWord = (lvl) => 'h' + 'y'.repeat(clamp(Math.round(lvl) || 1, 1, TRAIN_TOP) + 1) + 'pe'; // hyype … hyyyyyype
const trainOn = (g, t = Date.now()) => !!(g && g.train && g.train.state === 'on' && t < g.train.until);
const trainMult = (g, t = Date.now()) => (trainOn(g, t) ? 1 + 0.08 * g.train.lvl : 1); // the player's posts carry further on the way
const trainXP = (lvl) => 30 * lvl * lvl;
const MINO_START = ['Tchou tchouuu ! Tout le monde à bord !', 'En voiture ! Ça démarre, accroche-toi.', 'Deux viraux d’affilée ? Je sors la casquette. En route !'];
const MINO_END = ['Petit tour de manège, mais on a roulé !', 'Joli voyage. La prochaine fois, on va plus loin.', 'Ça a roulé fort : les marques ont vu passer le train.', 'Quel trajet ! Les rails fument encore.', 'Niveau 5. Historique. Je range la casquette : c’est toi le patron.'];

// After every post or reply, once the AI judged it: the releases in a row, and the fuel of a train under way.
function trainAfterAct(ctx) {
  const g = ctx.g, out = ctx.outcome, t = Date.now();
  if (!g || !out) return;
  if (ctx.kind === 'post' && ctx.video) {
    if (!(ctx.boosts && ctx.boosts.viral)) g.vidStreak = out.viral ? (g.vidStreak || 0) + 1 : 0; // a bought viral moment counts for nothing
    if (g.vidStreak >= 2 && !trainOn(g, t) && t >= (g.trainRest || 0)) { g.vidStreak = 0; startTrain(g, t); return; }
  }
  if (trainOn(g, t)) fuelTrain(g, ctx, t);
}
function startTrain(g, t = Date.now()) {
  g.train = { state: 'on', at: t, until: t + TRAIN_WIN, lvl: 1, pts: 0, fol: 0, likes: 0, posts: 0, line: pick(MINO_START) };
  g.stats.trains = (g.stats.trains || 0) + 1;
  addNotif(g, { k: 'trainstart', at: t, text: `🚂 Deux vidéos virales d’affilée : le train de la ${hyWord(1)} est lancé !` });
  addChronicle(g, `${g.player.name} enchaîne deux vidéos virales : le « train de la ${hyWord(1)} » est lancé.`);
  addTrigger(g, `Le joueur enchaîne deux vidéos virales : le « train de la ${hyWord(1)} » est lancé, et le réseau s’emballe. Des personnages montent dans le train (partages, soutien, « tchou tchou »), d’autres se moquent ou jalousent : chacun selon son caractère.`);
  queueModalFor(g, { t: 'train', at: t });
}
// What feeds it: posts that do well (more than usual, a viral one even more), a little for replies that land.
function fuelTrain(g, ctx, t = Date.now()) {
  const tr = g.train, out = ctx.outcome;
  if (!trainOn(g, t) || !out) return 0;
  const post = ctx.kind === 'post';
  const pts = post ? (out.fol >= 0 ? clamp(out.likes / Math.max(1, estLikes(g)), 0, 6) : 0) + (out.viral ? 4 : 0) : out.fol >= 0 && out.likes > 0 ? 0.3 : 0;
  if (post) tr.posts += 1;
  tr.fol += Math.max(0, out.fol);
  tr.likes += Math.max(0, out.likes);
  if (!(pts > 0)) return 0;
  tr.pts = Math.round((tr.pts + pts) * 10) / 10;
  tr.until = Math.min(tr.at + TRAIN_MAX, Math.max(tr.until, t + TRAIN_WIN));
  while (tr.lvl < TRAIN_TOP && tr.pts >= TRAIN_PTS[tr.lvl + 1]) {
    tr.lvl += 1;
    addNotif(g, { k: 'train', at: later() + 900, text: `🚂 Niveau ${tr.lvl} : le train de la ${hyWord(tr.lvl)} accélère !` });
    if (tr.lvl >= 3) addTrigger(g, `Le « train de la ${hyWord(tr.lvl)} » du joueur passe au niveau ${tr.lvl} sur ${TRAIN_TOP} : tout le réseau en parle${tr.lvl === TRAIN_TOP ? ', c’est historique' : ''}.`);
  }
  return pts;
}
// The clock: no fuel for too long (or the longest ride), and it stops.
function tickTrain(g, t = Date.now()) {
  const tr = g && g.train;
  if (!tr || tr.state !== 'on' || t < tr.until) return false;
  endTrain(g, t);
  return true;
}
function endTrain(g, t = Date.now()) {
  const tr = g.train;
  tr.state = 'done';
  tr.end = t;
  g.trainRest = t + TRAIN_REST;
  tr.xp = trainXP(tr.lvl);
  tr.line = MINO_END[tr.lvl - 1] || MINO_END[0];
  g.stats.bestTrain = Math.max(g.stats.bestTrain || 0, tr.lvl);
  if (tr.lvl >= 3 && g.career) { // the brands saw it go by: an offer soon, and a better one
    g.career.offerAt = Math.min(g.career.offerAt || t, t + 2 * HR);
    g.career.hypeBonus = 1 + 0.05 * tr.lvl;
    tr.brands = true;
  }
  addNotif(g, { k: 'trainstart', at: t, text: `🚂 Terminus : ton train de la ${hyWord(tr.lvl)} s’arrête au niveau ${tr.lvl} (+${tr.xp} XP).` });
  addChronicle(g, `Le « train de la ${hyWord(tr.lvl)} » de ${g.player.name} s’est arrêté au niveau ${tr.lvl}.`);
  gainXP(g, tr.xp);
  queueModalFor(g, { t: 'trainend', at: t });
}

/* ---------- on screen ---------- */
function MinoFace({ size = 48 }) {
  return html`<img class="mino" src=${MINO_SRC} width=${size} height=${size} alt="Le Minotaure, contrôleur du train" draggable="false" />`;
}
function TrainLevels({ lvl }) {
  return html`<div class="train-lvls" aria-label=${`Niveau ${lvl} sur ${TRAIN_TOP}`}>${Array.from({ length: TRAIN_TOP }, (_, k) => html`<i key=${k} class=${k < lvl ? 'on' : ''}></i>`)}</div>`;
}
// Under the top bar while it runs: the level, how far to the next one, how long without fuel before it stops.
function TrainBar({ g, now }) {
  if (!trainOn(g, now)) return null;
  const tr = g.train, top = tr.lvl >= TRAIN_TOP;
  const lo = TRAIN_PTS[tr.lvl], hi = TRAIN_PTS[Math.min(TRAIN_TOP, tr.lvl + 1)];
  const frac = top ? 1 : clamp((tr.pts - lo) / Math.max(1, hi - lo), 0, 1);
  return html`<button class="train-bar" onClick=${() => queueModal({ t: 'train', at: Date.now(), info: true })} aria-label=${`Train de la ${hyWord(tr.lvl)}, niveau ${tr.lvl} sur ${TRAIN_TOP}, encore ${fmtLeft(tr.until - now)} sans nouveau post`}>
    <${MinoFace} size=${34} />
    <span class="train-txt"><b>Train de la ${hyWord(tr.lvl)}</b><small>Niv. ${tr.lvl}/${TRAIN_TOP}${top ? ' · à fond' : ''} · encore ${fmtLeft(tr.until - now)}</small></span>
    <span class="train-track" aria-hidden="true"><i style=${'--p:' + Math.round(frac * 100) + '%'}></i></span>
  </button>`;
}
// The Minotaur's announcement (also opened from the bar), and the bill at the end.
function TrainCard({ g, m, close }) {
  const tr = g.train;
  if (!tr) return null;
  if (m.t === 'trainend') return html`<div class="modal-card train-card">
    <span class="eyebrow">Terminus</span>
    <${MinoFace} size=${132} />
    <p class="mino-says">« ${tr.line} »</p>
    <div class="train-name">Le train de la ${hyWord(tr.lvl)}</div>
    <${TrainLevels} lvl=${tr.lvl} />
    <p>Il s’arrête au niveau ${tr.lvl} sur ${TRAIN_TOP}, après ${tr.posts} ${plural(tr.posts, 'post', 'posts')} à bord.</p>
    <div class="rewards"><span class="chip hot">+${tr.xp} XP</span>${tr.fol > 0 ? html`<span class="chip good">${nAbonnes(tr.fol, true)} pendant le voyage</span>` : null}${tr.brands ? html`<span class="chip flash">Les marques t’ont remarqué</span>` : null}</div>
    <button class="btn btn-ink" onClick=${close}>Descendre du train</button>
  </div>`;
  const on = trainOn(g);
  return html`<div class="modal-card train-card">
    <span class="eyebrow">${m.info ? 'En route' : 'Événement'}</span>
    <${MinoFace} size=${132} />
    <p class="mino-says">« ${m.info && on ? (tr.lvl >= TRAIN_TOP ? 'On est à fond ! Profite, ça ne dure pas.' : 'Continue de publier : chaque post qui marche remet du charbon.') : tr.line} »</p>
    <div class="train-name">Le train de la ${hyWord(tr.lvl)}</div>
    <${TrainLevels} lvl=${tr.lvl} />
    <p>${m.info ? '' : 'Deux vidéos virales d’affilée : tout le réseau monte à bord. '}Chaque post bien reçu fait avancer le train, et tes posts portent ${Math.round((trainMult(g) - 1) * 100) || 8} % plus loin tant qu’il roule. ${on ? `Sans nouveau post qui marche, il s’arrête dans ${fmtLeft(tr.until - Date.now())}.` : ''}</p>
    <button class="btn btn-hot" onClick=${close}>${m.info ? 'Compris' : 'Tout le monde à bord !'}</button>
  </div>`;
}
