/* =========================================================
   0.33: there is always someone above. Creators already established (têtes d’affiche: half a million, a million,
   two, five, ten for the biggest of all) come into the world as the player grows, written by the AI, so that a few
   are always above them; at the very end the player may be the biggest. Everyone's audience grows too, day by day
   (less for those who step back, a drama makes it fall; their own events still move it more).
   And the sponsored content shared: on a contract of theirs, the player may ask the brand to bring someone in (the
   brand says yes or no), sets that person's share, and they say yes or no; a bigger creator may invite the player
   into an operation of their own, and pay them. Their AI decides all of it; the game keeps the books.
   ========================================================= */
const affOn = () => !window.__HYPE_TEST__ || !!window.__t33;
const LADDER_MIN = 20000; // under it, the cast of the start is above enough
const LADDER_TOP = 1e7; // the biggest of the big
const LADDER_K = [1.6, 3.5, 8]; // the steps above the player (× their audience), then the biggest
const bigOnes = (g) => Object.values(g.chars).filter((c) => c && ((c.kind === 'main' && c.unlocked) || c.kind === 'media') && c.followers > 0); // (those the player can see)
// The step above the player nobody holds yet (null: there are enough above).
function ladderGap(g) {
  const P = g.stats.followers;
  if (P < LADDER_MIN) return null;
  const all = bigOnes(g).filter((c) => c.followers > P * 1.15);
  const want = [...LADDER_K.map((k) => Math.min(LADDER_TOP, niceRound(P * k))), LADDER_TOP].filter((x, k, a) => x > P * 1.15 && a.indexOf(x) === k);
  for (const w of want) if (!all.some((c) => c.followers >= w / 1.5 && c.followers <= w * 1.5)) return w;
  return null;
}
// One at a time, a few hours apart (longer after a miss), when the budget and the network allow it.
function tickLadder(g, t = Date.now()) {
  if (!affOn() || !g || g.pendingCast || S.busy.newchar || S.busy.create || S.busy.refresh || !canAfford(g, 'newchar')) return false;
  if (t - (g.ladAt || 0) < 6 * 3600000 || t - (g.ladTry || 0) < Math.min(120, 5 * 2 ** Math.min(g.ladFails || 0, 5)) * 60000) return false;
  const gap = ladderGap(g);
  if (!gap) return false;
  g.ladTry = t;
  genNewChar(null, '', false, { big: gap });
  return true;
}
const BIG_BRIEF = (g, target) => `Un nouveau personnage débarque dans le monde : une TÊTE D’AFFICHE du réseau, quelqu’un de déjà installé depuis des années, avec environ ${fmtPlain(target)} abonnés (le joueur en a ${fmtPlain(g.stats.followers)}), une star de sa niche, connue bien au-delà. Rôle, bio, personnalité et voix collent à ce statut (son style, sa façon de vivre la célébrité, ce qu’on dit de cette personne). Elle ne connaît pas forcément le joueur, reçoit énormément de messages et répond surtout à ceux qui ont une vraie raison de lui écrire. Dans la ligne du personnage : "followers":${target}.`;
// After the AI wrote them: their audience, as asked.
function bigArrives(g, c, target, t = Date.now()) {
  c.followers = Math.max(Math.round(target * rand(0.9, 1.1) / 100) * 100, 1000);
  c.star = 1;
  c.rel = clamp(c.rel, -10, 10);
  g.ladAt = t;
  g.ladFails = 0;
}
function bigMissed(g) { g.ladFails = (g.ladFails || 0) + 1; }
// What their messages know: hard to reach while the player is small.
function starCtx(g, c) {
  if (!c || !c.star) return [];
  const P = g.stats.followers, il = gx(c.g, 'il', 'elle', 'iel');
  return [c.followers > P * 3
    ? `${c.name} est une tête d’affiche du réseau (${fmtPlain(c.followers)} abonnés ; le joueur en a ${fmtPlain(P)}) : ${il} reçoit énormément de messages, répond peu aux petits comptes, et il faut une vraie raison (du talent, un buzz, de l’humour, une recommandation) pour retenir son attention.`
    : `${c.name} est une tête d’affiche du réseau (${fmtPlain(c.followers)} abonnés ; le joueur en a ${fmtPlain(P)}, presque autant) : ${il} le regarde comme un égal, ou comme un rival.`];
}

/* ---------- everyone's audience, day by day ---------- */
function dayGrowth(c) {
  const f = c.followers;
  let pct = f < 10000 ? 1.2 : f < 100000 ? 0.8 : f < 1e6 ? 0.5 : 0.3; // (% a day)
  if (c.asleep) pct *= 0.5;
  if (inBadBuzz(c)) pct = -0.4;
  c.followers = Math.max(12, Math.round(f * (1 + (pct * rand(0.4, 1.6)) / 100)));
}
function tickGrowth(g, t = Date.now()) {
  if (!affOn() || !g) return false;
  const d = gameDay(t);
  if (g.growDay == null) { g.growDay = d; return false; }
  if (d <= g.growDay) return false;
  const n = Math.min(7, d - g.growDay);
  g.growDay = d;
  for (const c of Object.values(g.chars)) if (c && (c.kind === 'main' || c.kind === 'media') && c.followers > 0 && !c.jailed) for (let k = 0; k < n; k++) dayGrowth(c);
  return true;
}

/* ---------- someone brought into a sponsored content of the player's ---------- */
const guestCast = (g) => featPartners(g);
function askBrandGuest(g, d, c, t = Date.now()) {
  if (!d || d.state !== 'signed' || !c || !featOK(g, c)) return false;
  d.guest = { c: c.id, at: t, brand: null };
  S.drafts.dm[d.contact] = `Petite question pour ${d.product} : est-ce que je peux inviter @${c.handle} dans ${d.what === 'vidéo' ? 'la vidéo' : `le ${dealWhat(g, d)}`} ? ${firstName(c)} a ${fmtN(c.followers)} abonnés.`;
  return true;
}
const guestWait = (d) => !!(d && d.state === 'signed' && d.guest && d.guest.brand == null);
function brandGuestCtx(g, d) {
  const G = d.guest, c = G && g.chars[G.c];
  if (!c) return [];
  if (G.brand == null) return [`Le joueur demande s’il peut inviter @${c.handle} (${c.name}, ${fmtPlain(c.followers)} abonnés${inBadBuzz(c) ? ', en plein bad buzz' : ''}${c.star ? ', une tête d’affiche' : ''}) dans le contenu sponsorisé. La marque décide maintenant : son image, l’audience de cette personne, sa réputation, un éventuel concurrent.`];
  if (G.brand) return [`La marque a accepté que le joueur invite @${c.handle} dans le contenu sponsorisé${G.ok ? ` (${firstName(c)} a dit oui)` : ''}.`];
  return [`La marque a refusé que le joueur invite @${c.handle} dans le contenu sponsorisé.`];
}
const BRAND_GUEST_LINE = (c) => `- OBLIGATOIRE dès que ${c.name} répond sur la personne invitée : {"t":"invite_marque","ok":true,"why":"≤ 60 caractères"} (ok:false si la marque refuse).`;
function applyBrandGuest(g, b, o) {
  const d = g.deals.find((x) => x.contact === b.id && guestWait(x));
  if (!d) return false;
  const c = g.chars[d.guest.c], ok = o.ok === true || o.ok === 'true', why = str(o.why, 60);
  d.guest.brand = ok;
  d.guest.why = why;
  if (c) addNotif(g, { k: ok ? 'relup' : 'reldown', c: b.id, at: later() + 1500, text: ok ? `✅ ${d.brand} est d’accord pour que tu invites ${firstName(c)}. Fixe sa part dans le Studio.` : `${d.brand} ne veut pas de ${firstName(c)} dans ${d.what === 'vidéo' ? 'la vidéo' : 'ce contenu'}${why ? ` : « ${why} »` : ''}.` });
  return true;
}
function offerGuestFee(g, d, fee) {
  const G = d && d.guest, c = G && g.chars[G.c];
  if (!c || !G.brand || G.ok != null) return false;
  G.fee = Math.max(0, Math.round(num(fee, 0)));
  G.askedAt = Date.now();
  S.drafts.dm[c.id] = `J’ai un partenariat avec ${d.brand} (${d.product}) : ça te dit de venir le tourner avec moi ? ${G.fee > 0 ? `Je te donne ${fmtMoney(g, G.fee)}.` : 'C’est pour la visibilité, pas pour l’argent.'}`;
  return true;
}
const guestAsking = (g, c) => (g.deals || []).find((d) => d.state === 'signed' && d.guest && d.guest.c === c.id && d.guest.brand && d.guest.fee != null && d.guest.ok == null) || null;
function guestDMCtx(g, c) {
  const d = guestAsking(g, c);
  if (!d) return [];
  const first = firstName(c);
  return [`Le joueur propose à ${first} de faire avec lui son contenu sponsorisé pour ${d.brand} (${d.product}, à livrer ${fmtWhen(d.due)}) : la marque est d’accord, et il ${gx(c.g, 'lui', 'lui', 'lui')} donne ${d.guest.fee > 0 ? fmtMoney(g, d.guest.fee) : 'rien (c’est pour la visibilité)'}. Le joueur a ${fmtPlain(g.stats.followers)} abonnés, ${first} ${fmtPlain(c.followers)}. ${first} décide selon votre relation, la somme, la marque, ce que ça lui apporte (son public, son image) et son emploi du temps ; ${gx(c.g, 'il', 'elle', 'iel')} peut demander plus.`];
}
const GUEST_LINE = (g, c) => { const d = guestAsking(g, c); return d ? `- Quand ${firstName(c)} a décidé pour le contenu sponsorisé de ${d.brand} : {"t":"feat_pub","ok":true,"fee":${d.guest.fee},"day":1,"at":"18:00","why":"≤ 60 caractères"} (fee : la somme convenue s’ils l’ont changée ; day et at : quand ils tournent, si c’est dit ; ok:false s’${gx(c.g, 'il', 'elle', 'iel')} refuse). Pas de ligne s’${gx(c.g, 'il', 'elle', 'iel')} hésite ou négocie encore.` : null; };
// Their yes: they are in it (a release of that kind already planned, or one planned for them).
function applyGuestAnswer(g, c, o, t = Date.now()) {
  const d = guestAsking(g, c);
  if (!d) return false;
  const first = firstName(c), why = str(o.why, 60);
  if (!(o.ok === true || o.ok === 'true')) {
    d.guest.ok = false;
    addNotif(g, { k: 'reldown', c: c.id, at: later() + 1500, text: `${first} ne viendra pas dans ton contenu pour ${d.brand}${why ? ` : « ${why} »` : ''}.` });
    return true;
  }
  if (o.fee != null) d.guest.fee = clamp(Math.round(num(o.fee, d.guest.fee)), 0, Math.max(50, Math.round(d.guest.fee * 1.5))); // (agreed in the message: half as much again at most)
  d.guest.ok = true;
  const r = planDealFeat(g, d, c, o, t);
  if (r) d.guest.r = r.id;
  applyRel(g, c, 3, `votre contenu pour ${d.brand}`, later() + 1200, 10);
  addMem(g, c, `on va tourner ensemble le contenu sponsorisé ${d.brand} du joueur${d.guest.fee > 0 ? ` (il me donne ${fmtMoney(g, d.guest.fee)})` : ''}`);
  addNotif(g, { k: 'relup', c: c.id, at: later() + 1500, text: `🤝 ${first} vient dans ton contenu pour ${d.brand}${d.guest.fee > 0 ? ` (sa part : ${fmtMoney(g, d.guest.fee)})` : ''}${r ? ` : ${unW(r)} « ${str(r.topic, 50)} », tournage ${fmtWhen(r.due)}` : ''}.` });
  touch(c);
  return true;
}
function planDealFeat(g, d, c, o = {}, t = Date.now()) {
  if (!planRoom(g)) { // (the programme is full: a release of that kind already planned takes them)
    const old = (g.releases || []).find((r) => r && r.state === 'scheduled' && !r.big && !r.collab && !r.dealGuest && !r.hostOp && r.what === d.what && !(r.feat && r.feat.ok == null));
    if (old) Object.assign(old, { collab: c.id, feat: { c: c.id, ok: true, at: t }, dealGuest: d.id });
    return old || null;
  }
  let what = d.what;
  if (!canMake(g, what).ok) what = makeableWhat(g, what);
  if (!canMake(g, what).ok) return null;
  let due = o.day != null || o.at != null ? planDue(o, t) : planDue({ day: 1, at: '18:00' }, t);
  if (!(due > t + 30 * 60000)) due = t + 2 * 3600000;
  if (d.due && due > d.due - 2 * 3600000) due = Math.max(t + 30 * 60000, d.due - (prodH(what) + 2) * 3600000);
  const r = scheduleRelease(g, { what, topic: `${cap1(d.product)} avec ${firstName(c)}`, due, start: true });
  if (!r) return null;
  Object.assign(r, { collab: c.id, feat: { c: c.id, ok: true, at: t }, dealGuest: d.id });
  return r;
}
// At the release: the player pays the share promised (it is owed: without the money, the account goes into the red).
function payGuest(g, r) {
  const d = r && r.dealGuest ? dealOf(g, r.dealGuest) : null, G = d && d.guest, c = G && g.chars[G.c];
  if (!c || !G.ok || G.paid || r.collab !== c.id) return;
  G.paid = Date.now();
  if (!(G.fee > 0)) return;
  const red = g.career.cash < G.fee;
  charge(g, G.fee, `Part de ${firstName(c)} · ${d.brand}`, 'staff');
  addNotif(g, { k: 'money', c: c.id, text: `🤝 Tu verses sa part à ${firstName(c)} : ${fmtMoney(g, G.fee)} (${d.brand}).${red ? ' Ton compte passe dans le rouge.' : ''}` });
  addMem(g, c, `le joueur m’a ${gx(c.g, 'payé', 'payée', 'payé·e')} ma part pour ${d.brand} (${fmtMoney(g, G.fee)})`);
}

/* ---------- invited into a bigger creator's operation, and paid ---------- */
const HOST_PUB = (g) => ` Si c’est pour une vidéo sponsorisée (une marque paie ce personnage) où il ou elle invite le joueur et le paie, ajoute "pub":{"brand":"le nom de la marque","fee":${hostFee(g)}} (fee : ce qu’il ou elle donne au joueur, en ${moneySym(g)}).`;
const hostFee = (g) => niceRound(Math.max(50, Math.sqrt(Math.max(1, g.stats.followers)) * 2.5));
function invitePub(g, o) {
  const p = o && o.pub && typeof o.pub === 'object' ? o.pub : null, brand = p ? str(p.brand, 40) : '';
  if (!brand) return null;
  return { brand, fee: clamp(Math.round(num(p.fee, 0)), 0, hostFee(g) * 20) };
}
// A refresh: someone far bigger may bring the player into an operation of theirs, now and then.
function afficheRefreshLines(g, t = Date.now()) {
  if (!affOn() || t - (g.hostAt || 0) < 4 * DAY_MS || Math.random() >= 0.3) return [];
  const P = g.stats.followers, hosts = mains(g).filter((c) => c.followers >= Math.max(P * 1.5, 5000) && c.rel >= 5 && !c.cut && !openInvite(g, c)).sort((a, b) => b.followers - a.followers).slice(0, 3);
  if (!hosts.length) return [];
  return [`- Facultatif, rarement, seulement si ça a du sens : ${hosts.map((c) => `@${c.handle} (${fmtPlain(c.followers)} abonnés)`).join(', ')}, bien plus suivi·e que le joueur, a une opé sponsorisée et l’invite à y participer contre une part : son message privé ("dm"), puis la ligne invite avec "collab":true et "pub":{"brand":"une marque inventée","fee":${hostFee(g)}} (fee : ce qu’il ou elle donne au joueur, en ${moneySym(g)}).`];
}
// At the release: the host pays.
function payHost(g, r) {
  const H = r && r.hostOp, c = H && g.chars[H.c];
  if (!H || H.paid) return;
  H.paid = Date.now();
  if (H.fee > 0) earn(g, H.fee, `Opé ${H.brand}${c ? ` avec ${firstName(c)}` : ''}`, 'in');
  if (c) {
    addNotif(g, { k: 'money', c: c.id, text: `💰 ${firstName(c)} te verse ${H.fee > 0 ? fmtMoney(g, H.fee) : 'sa part'} pour l’opé ${H.brand}.` });
    addMem(g, c, `j’ai invité le joueur dans mon opé ${H.brand}`);
  }
}

/* ---------- on screen ---------- */
function DealGuest({ g, d, now }) {
  const [fee, setFee] = useState(() => niceRound(Math.max(20, (d.fee || 100) * 0.2)));
  if (!affOn() || !d || d.state !== 'signed') return null;
  const G = d.guest, c = G && g.chars[G.c], first = c ? firstName(c) : '';
  if (!G || !c || G.brand === false || G.ok === false) return html`<div class="dl-guest">
    <button class="btn btn-ghost btn-sm" onClick=${() => openLayer({ t: 'dealguest', id: d.id })}>🤝 Inviter quelqu’un</button>
    ${G && c ? html`<small class="muted">${G.brand === false ? `${d.brand} n’a pas voulu de ${first}${G.why ? ` : « ${G.why} »` : ''}.` : `${first} a dit non.`}</small>` : html`<small class="muted">Demande à ${d.brand} si tu peux faire ce contenu avec quelqu’un, et fixe sa part.</small>`}
  </div>`;
  if (G.brand == null) return html`<div class="dl-guest"><span>🤝 Tu as demandé à ${d.brand} si tu peux inviter ${first} : en attente de sa réponse.</span><button class="linkbtn" onClick=${() => openDM(d.contact)}>Lui écrire</button></div>`;
  if (G.fee == null) return html`<div class="dl-guest"><span>✅ ${d.brand} est d’accord pour ${first}. Combien ${gx(c.g, 'lui', 'lui', 'lui')} donnes-tu ?</span>
    <div class="row hire-pay"><input type="number" min="0" step="10" value=${fee} onInput=${(e) => setFee(e.target.value)} aria-label=${'Part de ' + first} /><span>${moneySym(g)}${d.fee ? ` sur ${fmtMoney(g, d.fee)}` : ''}</span>
    <button class="btn btn-hot btn-sm" onClick=${() => { if (offerGuestFee(g, d, fee)) { openDM(c.id); update(); } }}>Proposer à ${first}</button></div></div>`;
  if (G.ok == null) return html`<div class="dl-guest"><span>🤝 ${first} a ta proposition (${G.fee > 0 ? fmtMoney(g, G.fee) : 'sans argent'}) : en attente de sa réponse.</span><button class="linkbtn" onClick=${() => openDM(c.id)}>Lui écrire</button></div>`;
  const r = G.r && (g.releases || []).find((x) => x.id === G.r);
  return html`<div class="dl-guest ok"><span>🤝 ${first} est dans ce contenu${r && r.state === 'scheduled' ? ` : ${unW(r)} « ${r.topic} », tournage ${fmtWhen(r.due, now)}` : ''} · sa part : ${G.fee > 0 ? `${fmtMoney(g, G.fee)}, versée à la sortie` : 'rien'}${G.paid ? ' (c’est fait)' : ''}</span></div>`;
}
function DealGuestLayer({ l, g, i }) {
  const d = dealOf(g, l.id);
  if (!d || d.state !== 'signed') return html`<${LayerShell} i=${i} title="Inviter quelqu’un"><div class="empty"><b>Ce contrat n’est plus en cours.</b></div><//>`;
  const list = guestCast(g);
  const pick = (c) => { if (askBrandGuest(g, d, c)) { closeLayer(); openDM(d.contact); update(); } };
  return html`<${LayerShell} i=${i} title=${'Inviter quelqu’un · ' + d.brand}>
    <section class="section">
      <p class="muted">${d.brand} doit d’abord être d’accord : ta demande est prête dans vos messages. Ensuite, tu fixes la part de ton invité·e, qui décide à son tour. Vos deux publics verront le contenu.</p>
      ${list.length ? html`<div class="feat-list">${list.map((c) => html`<button type="button" key=${c.id} class="feat-pick" onClick=${() => pick(c)}>
        <${Avatar} who=${author(g, 'c:' + c.id)} size=${40} />
        <span class="mid"><b>${c.name}</b><small>${fmtN(c.followers)} abonnés · ${relShown(c)}${c.star ? ' · ⭐ tête d’affiche' : ''}${inBadBuzz(c) ? ' · en bad buzz' : ''}</small></span>
      </button>`)}</div>` : html`<p class="muted">Personne de disponible pour l’instant.</p>`}
    </section>
  <//>`;
}
