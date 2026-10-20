/* =========================================================
   Dilemmas (0.18): choices that tempt, launched by the characters themselves in private when the situation lends itself;
   never a game event. The game only says when it could happen (and keeps them rare: one every three game days at most),
   the AI writes who asks for what, the player answers in their own words, and whoever is left aside may take it badly, by
   temperament and by how often it happens to them. Each choice leaves a trace (a screenshot, a witness) that may come
   back later.
   - A spot on a contract: a brand deal signed while at least two close friends are around: 30 % that two of them want it.
   - A dossier on someone: a friend offers the player compromising material on someone they cannot stand.
   - The hidden ad: a brand's contact offers far more if the mention « Collaboration commerciale » goes (it is illegal);
     delivered that way, it becomes one of the player's secrets (secrets.js).
   - A collab with someone a partner or a close friend cannot stand: the invitation says so (what follows is 0.15's).
   ========================================================= */
const DIL_GAP = 3 * DAY_MS;
const DIL_P = 0.3;
const DIL_ASK_MS = 12 * HR; // they ask within this time, or it fizzles
const DIL_OPEN_MS = 48 * HR; // no answer by then: nobody got the spot
const DOSSIER_MS = 72 * HR;
const T18 = () => (window.__HYPE_TEST__ ? window : {});
const liveDilemma = (g) => (g.dilemmas || []).find((x) => x.state === 'asking' || x.state === 'open') || null;
const dilemmaFree = (g, t = Date.now()) => !liveDilemma(g) && t - (g.dilemmaAt || 0) >= DIL_GAP;
function keepDilemma(g, x, t = Date.now()) {
  g.dilemmas = (g.dilemmas || []).filter((y) => y.state === 'asking' || y.state === 'open' || t - y.at < 10 * DAY_MS).concat(x).slice(-12);
  g.dilemmaAt = t;
  return x;
}

/* ---------- a spot on a contract ---------- */
const placeOK = (g, c, d) => isMain(c) && c.unlocked && !c.cut && c.rel >= 35 && !CONFLICT.includes(c.vibe) && !inBadBuzz(c) && c.id !== d.contact && !(g.staff || []).some((m) => m.c === c.id);
function dilemmaOnDeal(g, d, t = Date.now()) {
  if (!g || !d || !dilemmaFree(g, t)) return null;
  const close = mains(g).filter((c) => placeOK(g, c, d)).sort((a, b) => b.rel - a.rel);
  if (close.length < 2 || (!T18().__dilForce && roll18() >= DIL_P)) return null;
  const two = close.slice(0, 4).map((c) => [c, Math.random()]).sort((a, b) => a[1] - b[1]).slice(0, 2).map((x) => x[0]);
  return keepDilemma(g, { id: uid('di'), k: 'place', deal: d.id, brand: d.brand, a: two[0].id, b: two[1].id, at: t, state: 'asking', asked: [], chosen: null }, t);
}
// What makes them ask (an act, a refresh), until they did.
function dilemmaAskLines(g) {
  const x = liveDilemma(g);
  if (!x || x.k !== 'place' || x.state !== 'asking') return [];
  const who = [x.a, x.b].filter((id) => !x.asked.includes(id)).map((id) => g.chars[id]).filter((c) => c && !c.cut);
  if (!who.length) return [];
  const two = who.length > 1;
  return [`- OBLIGATOIRE cette fois : ${who.map((c) => '@' + c.handle).join(' et ')} ${two ? 'ont' : 'a'} appris que le joueur vient de signer un partenariat avec ${x.brand}, et ${two ? 'chacun·e veut' : 'veut'} être placé·e dessus (une seule place${two ? ' : ils le savent ou s’en doutent' : ', et quelqu’un d’autre la veut aussi'}). ${two ? 'Chacun·e lui écrit' : 'Il ou elle lui écrit'} en privé pour la demander, à sa façon (franche, insistante, drôle, chantage affectif…) : une ligne {"t":"dm","by":"handle","text":"≤ 200 caractères"} pour ${two ? 'chacun·e' : 'lui ou elle'}.`];
}
// One of them, writing to ask (an act or a refresh lets that message through, beyond its usual number).
function dilemmaAsker(g, by) {
  const x = liveDilemma(g);
  if (!x || x.k !== 'place' || x.state !== 'asking') return false;
  const c = charByHandle(g, normHandle(by));
  return !!c && (c.id === x.a || c.id === x.b) && !x.asked.includes(c.id);
}
// Their message arrived: once both asked, it is open (and the player hears it).
function noteDilemmaAsks(g, t = Date.now()) {
  let ch = false;
  for (const x of g.dilemmas || []) {
    if (x.k !== 'place' || x.state !== 'asking') continue;
    let last = 0; // when their messages show (the notification comes after them)
    for (const id of [x.a, x.b]) {
      const m = ((g.dms[id] || {}).msgs || []).find((y) => !y.me && !y.sys && y.text && y.ts >= x.at - 1000);
      if (!m) continue;
      last = Math.max(last, m.at || 0);
      if (!x.asked.includes(id)) { x.asked.push(id); ch = true; }
    }
    const A = g.chars[x.a], B = g.chars[x.b];
    if (x.asked.length >= 2 && A && B) {
      x.state = 'open';
      x.openAt = t;
      addNotif(g, { k: 'drama', at: Math.max(later(), last) + 2500, text: `🤔 ${firstName(A)} et ${firstName(B)} veulent tous les deux la place sur ton contrat ${x.brand}.` });
      ch = true;
    } else if (t - x.at > DIL_ASK_MS) { x.state = x.asked.length ? 'open' : 'off'; x.openAt = t; ch = true; }
  }
  return ch;
}
// In a private conversation with one of them: what they want, and the line that settles it.
function dilemmaDM(g, c) {
  const out = { ctx: [], lines: [] };
  for (const x of g.dilemmas || []) {
    if (x.k !== 'place' || (x.state !== 'asking' && x.state !== 'open') || (x.a !== c.id && x.b !== c.id)) continue;
    const o = g.chars[x.a === c.id ? x.b : x.a];
    out.ctx.push(`${c.name} veut être ${gx(c.g, 'placé', 'placée', 'placé·e')} sur le partenariat du joueur avec ${x.brand} (une seule place${o ? ` ; @${o.handle} la veut aussi` : ''}).`);
    out.lines.push(`- Seulement si le joueur dit clairement dans son message à qui il donne la place sur le contrat ${x.brand} (à ${c.name}${o ? ` ou à @${o.handle}` : ''}), ou qu’il ne la donne à personne : {"t":"choice","to":"handle choisi, ou vide si personne"}. Pas pour un « je vais voir ».`);
  }
  const d = c.kind === 'brand' ? g.deals.find((y) => y.contact === c.id && y.state === 'offer') : null;
  if (d && !d.shady && !d.banned && d.fee) {
    if (d.shadyAsk == null) d.shadyAsk = dilemmaFree(g) && (!!T18().__shadyOffer || Math.random() < 0.25); // decided once for this offer
    if (d.shadyAsk && dilemmaFree(g)) out.lines.push(`- Facultatif, rare : ${c.name} peut proposer au joueur de payer bien plus (jusqu’à ${fmtMoney(g, niceRound(d.fee * 1.6))}) s’il accepte de NE PAS mettre la mention « Collaboration commerciale » (c’est illégal : ${gx(c.g, 'il', 'elle', 'iel')} le sait, n’en parle jamais d’${gx(c.g, 'lui', 'elle', 'iel')}-même et minimise si le joueur pose la question) : dis-le dans ses messages, puis {"t":"shady"}.`);
  }
  return out;
}
function dilemmaChoice(g, c, to, text) {
  const x = (g.dilemmas || []).find((y) => y.k === 'place' && (y.state === 'asking' || y.state === 'open') && (y.a === c.id || y.b === c.id));
  if (!x) return null;
  const h = normHandle(String(to || ''));
  const p = h ? charByHandle(g, h) : null;
  const chosen = p && (p.id === x.a || p.id === x.b) ? p : null;
  if (h && !chosen) return null; // someone else's name: nothing is settled
  return settlePlace(g, x, chosen, c, text);
}
// Left aside: how likely they take it badly (temperament, maturity, and how often it happened to them).
function passedOverChance(c) {
  let p = 0.4 + 0.15 * Math.min(3, (c.passedOver || 1) - 1);
  p += { envieux: 0.2, opportuniste: 0.1, trouble: 0.1, fidele: -0.15, detache: -0.2 }[temperOf(c)] || 0;
  p += { tres_immature: 0.08, immature: 0.04, tres_mature: -0.06 }[c.matu] || 0;
  return clamp(p, 0.1, 0.9);
}
// quiet: nobody was told (the time ran out): it stings less.
function settlePlace(g, x, chosen, via, text, quiet) {
  x.state = 'done';
  x.chosen = chosen ? chosen.id : '';
  x.doneAt = Date.now();
  const d = dealOf(g, x.deal);
  if (d && chosen) d.guest = chosen.id;
  const at = later();
  for (const id of [x.a, x.b]) {
    const c = g.chars[id];
    if (!c) continue;
    const il = gx(c.g, 'il', 'elle', 'iel'), choisi = gx(c.g, 'choisi', 'choisie', 'choisi·e');
    if (chosen && c === chosen) {
      applyRel(g, c, 6, `tu l’as ${choisi} pour ton contrat ${x.brand}`, at + 800, 10);
      applyTrust(g, c, 3, 'tu lui as fait confiance', at + 1000);
      addMem(g, c, `le joueur m’a ${choisi} pour son partenariat avec ${x.brand}`);
      continue;
    }
    c.passedOver = (c.passedOver || 0) + 1;
    const bad = roll18() < passedOverChance(c) * (quiet ? 0.6 : 1);
    const what = chosen ? `le joueur a préféré ${firstName(chosen)} pour son partenariat avec ${x.brand}` : `le joueur n’a pris personne pour son partenariat avec ${x.brand}`;
    if (bad) {
      applyRel(g, c, -(6 + 3 * Math.min(2, c.passedOver - 1)), chosen ? `tu as choisi ${firstName(chosen)} plutôt que ${gx(c.g, 'lui', 'elle', 'iel')}` : `tu ne l’as pas ${gx(c.g, 'pris', 'prise', 'pris·e')}`, at + 900, 15);
      addMem(g, c, what);
      addTrigger(g, `@${c.handle} a appris que ${chosen ? `le joueur a choisi @${chosen.handle}` : 'le joueur n’a pris personne'} pour son partenariat avec ${x.brand} : ${il} le prend mal${c.passedOver > 1 ? ' (ce n’est pas la première fois qu’on l’écarte)' : ''}, à sa façon (bouderie, pique, message froid).`, c.id);
      if (chosen) bumpTie(g, c.id, chosen.id, -8);
      x.hurt = c.id;
    } else {
      applyRel(g, c, -1, 'un peu déçu·e pour le contrat', at + 900, 3);
      addMem(g, c, what + ' : je comprends');
    }
  }
  // the trace: what the player wrote about it, in someone's screenshots
  if (via && text && isMain(via)) addIntel(g, via, text, { text: `ce que le joueur a répondu pour la place sur son contrat ${x.brand}`, weight: 1 });
  const A = chosen ? firstName(chosen) : '';
  addNotif(g, { k: 'drama', at: at + 600, text: `🤝 Contrat ${x.brand} : ${A ? `tu as choisi ${A}` : 'tu n’as pris personne'}.` });
  addChronicle(g, A ? `${g.player.name} a choisi ${chosen.name} pour son partenariat avec ${x.brand}.` : `${g.player.name} n’a pris personne sur son partenariat avec ${x.brand}.`);
  return x;
}
// The contract is delivered: the one who got the spot is in it (their audience, a little closer).
function dealDelivered(g, d) {
  const x = (g.dilemmas || []).find((y) => y.k === 'place' && y.deal === d.id && (y.state === 'asking' || y.state === 'open'));
  if (x) settlePlace(g, x, null, null, '', true);
  const c = d.guest && g.chars[d.guest];
  if (!c) return;
  c.followers += Math.max(50, Math.round(c.followers * 0.02));
  applyRel(g, c, 2, `votre partenariat ${d.brand}`, later() + 2600, 5);
  addMem(g, c, `on a fait le partenariat ${d.brand} ensemble`);
  addTrigger(g, `Le partenariat ${d.brand} du joueur est en ligne, avec @${c.handle} dedans : ${gx(c.g, 'il', 'elle', 'iel')} le partage, ${gx(c.g, 'fier', 'fière', 'fier·e')} (ou pas).`, c.id);
}

/* ---------- a dossier on someone ---------- */
function dossierLine(g, t = Date.now()) {
  if (!dilemmaFree(g, t)) return null;
  const pairs = [];
  for (const i of mains(g)) {
    if (!i.unlocked || i.cut || i.rel < 30 || CONFLICT.includes(i.vibe)) continue;
    for (const o of mains(g)) if (o !== i && o.unlocked && !inBadBuzz(o) && !o.secretOut && tieOf(g, i.id, o.id) <= -35) pairs.push([i, o]);
  }
  if (!pairs.length || (!T18().__dossierOffer && Math.random() >= 0.2)) return null;
  return `- Facultatif, rare : ${pairs.slice(0, 3).map(([i, o]) => `@${i.handle} (proche du joueur) ne supporte pas @${o.handle}`).join(' ; ')}. L’un d’eux peut proposer au joueur, en privé, un dossier compromettant sur cette personne (vrai, ou gonflé) pour qu’il s’en serve : écris d’abord son message ({"t":"dm","by":"handle","text":"…"}), puis {"t":"dossier","by":"handle","about":"handle","text":"ce que contient le dossier, ≤ 120 caractères"}.`;
}
function addDossier(g, o) {
  const by = charByHandle(g, normHandle(o.by)), about = charByHandle(g, normHandle(o.about)), t = Date.now();
  if (!by || !about || by === about || !isMain(by) || !isMain(about) || !about.unlocked || !dilemmaFree(g, t)) return null;
  const text = str(o.text, 120);
  if (text.length < 6) return null;
  const k = addClue(g, about, `Dossier de ${firstName(by)} : ${text}`, later() + 2500);
  if (!k) return null;
  k.dossier = by.id;
  addMem(g, by, `j’ai passé au joueur un dossier sur ${firstName(about)}`);
  return keepDilemma(g, { id: uid('di'), k: 'dossier', by: by.id, about: about.id, clue: k.id, text, at: t, state: 'open' }, t);
}
// The player used it in a call-out (cited it): the friend is pleased; the target may guess who it came from.
function dossierUsed(ctx) {
  const g = ctx.g, c = ctx.accuse, ids = ctx.citedIds || [];
  if (!c || !ctx.post) return;
  for (const x of g.dilemmas || []) {
    if (x.k !== 'dossier' || x.state !== 'open' || x.about !== c.id || !ids.includes(x.clue)) continue;
    x.state = 'used';
    x.doneAt = Date.now();
    const by = g.chars[x.by], cred = ctx.post.res ? ctx.post.res.cred : null;
    if (!by) continue;
    applyRel(g, by, cred >= 7 ? 6 : 2, 'tu t’es servi de son dossier', later() + 1500, 8);
    addMem(g, by, `le joueur s’est servi de mon dossier sur ${firstName(c)}`);
    if (roll18() < 0.5) { bumpTie(g, c.id, by.id, -10); addTrigger(g, `@${c.handle} se demande qui a fourni ce dossier au joueur, et soupçonne @${by.handle}.`, c.id); }
  }
}
// The hidden ad, offered by the brand's contact: far more money, no mention (and if it is delivered that way: a secret).
function applyShady(g, c) {
  const d = g.deals.find((y) => y.contact === c.id && y.state === 'offer');
  if (!d || d.shady || d.banned || !dilemmaFree(g)) return null;
  d.shady = true;
  d.fee = niceRound(d.fee * 1.6);
  d.max = Math.max(d.fee, Math.round(d.max * 1.6));
  d.upfront = upfrontOf(d);
  dmCard(g, c, { sys: 'deal', deal: d.id, upd: true }, later() + 2500);
  addNotif(g, { k: 'money', c: c.id, text: `${d.brand} te propose ${fmtMoney(g, d.fee)}… sans la mention « Collaboration commerciale ».` });
  keepDilemma(g, { id: uid('di'), k: 'pub', deal: d.id, by: c.id, at: Date.now(), state: 'done' });
  return d;
}

/* ---------- a collab with someone a partner or a close friend cannot stand ---------- */
const collabFoe = (g, c) => (c ? mains(g).find((o) => o !== c && o.unlocked && !o.cut && (PARTNER.includes(o.vibe) || o.rel >= 55) && tieOf(g, o.id, c.id) <= FOE_TIE) || null : null);

/* ---------- the clock ---------- */
function tickDilemmas(g, t = Date.now()) {
  let ch = noteDilemmaAsks(g, t);
  for (const x of g.dilemmas || []) {
    if (x.k === 'place' && x.state === 'open') {
      const d = dealOf(g, x.deal);
      if (t - (x.openAt || x.at) > DIL_OPEN_MS || !d || d.state !== 'signed') { settlePlace(g, x, null, null, '', true); ch = true; }
    } else if (x.k === 'dossier' && x.state === 'open' && t - x.at > DOSSIER_MS) {
      x.state = 'kept';
      x.doneAt = t;
      const by = g.chars[x.by], about = g.chars[x.about];
      if (by && about) {
        const tp = temperOf(by), af = firstName(about);
        if (['opportuniste', 'envieux', 'trouble'].includes(tp)) { applyRel(g, by, -3, 'tu n’as rien fait de son dossier', later() + 800, 5); addMem(g, by, `le joueur n’a pas osé se servir de mon dossier sur ${af}`); }
        else if (['fidele', 'integre'].includes(tp)) { applyRel(g, by, 2, 'tu n’as pas voulu salir quelqu’un', later() + 800, 5); addMem(g, by, `le joueur n’a pas voulu salir ${af} avec mon dossier : respect`); }
      }
      ch = true;
    }
  }
  return ch;
}
// For the prompts: what an act or a refresh may write about the dilemmas.
function dilemmaLines(g, t = Date.now(), refresh = false) {
  const out = dilemmaAskLines(g);
  if (refresh) { const l = dossierLine(g, t); if (l) out.push(l); }
  return out;
}
function applyDilemmaLine(g, o, effects) {
  if (o.t === 'dossier') { effects.push(() => addDossier(g, o)); return true; }
  return false;
}
