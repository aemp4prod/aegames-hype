/* =========================================================
   0.20: the scams (« les arnaques »), the agents, and the brands that come back.
   - Like for real, many offers are not honest. Some show it (a fee to pay to become « ambassadeur », a « brief » to
     download), others hide it well (no down payment and a payment « at 60 days », a product too good to be true, a
     trap clause among the others, terrible customer reviews). Nothing ever says it: the brand's sheet, the terms, the
     contract are just there; the player reads them, or asks around (friends, the brand itself, which never admits).
   - Fall for it, and it costs: the brand never pays, the fee is lost, the product is recalled (a bad buzz), the
     product is junk (a small one), a clause bites, the account gets hacked. A critic on the platform exposes each scam
     a few days later, naming those who promoted it.
   - An agent checks the offers (the better the agent, the more they see) and warns in private. A beginner agent may
     bring a scam without seeing it. Each agent has a level: above it, a big contract is a gamble; without an agent,
     a big brand negotiates hard.
   - A sponsored video that does very well: the brand may send a bonus nobody asked for, and comes back sooner.
   ========================================================= */
const SCAM_KINDS = {
  impaye: { w: 3, sneaky: true }, // never pays
  frais: { w: 2 }, // a fee to become « ambassadeur »
  dangereux: { w: 2, sneaky: true }, // a product that ends up recalled
  nul: { w: 3, sneaky: true }, // junk: the followers who bought it complain
  clause: { w: 2, sneaky: true }, // a trap among the clauses
  brief: { w: 1 }, // a « brief » to download: a virus
};
const CRITIC = { by: 'le.demineur', name: 'Le Démineur', bio: 'youtubeur · je démonte les arnaques des marques avant qu’elles vous coûtent cher' };
// How likely an offer is a scam: unknown creators are the scammers' favourite targets; an agent filters (or not).
function scamChance(g, via) {
  const F = g.stats.followers;
  const base = F < 10000 ? 0.3 : F < 100000 ? 0.22 : F < 1e6 ? 0.15 : 0.1;
  if (via === 'agent') { const m = hasStaff(g, 'agent'); return m ? [0.2, 0.08, 0.02, 0][clamp(m.tier, 0, 3)] : base; }
  return via === 'pitch' ? base * 0.5 : base;
}
const DANGER = {
  boisson: ['sa boisson « énergie ×10 », sans limite de caféine', 'ses shots détox « qui nettoient le foie en 24 h »'],
  beaute: ['sa crème qui « éclaircit la peau en 3 jours »', 'son sérum « botox naturel, effet immédiat »'],
  food: ['ses gélules brûle-graisses « −5 kg en une semaine »', 'son coupe-faim « 100 % naturel, zéro effet secondaire »'],
  tech: ['sa batterie externe « charge ultra-rapide » à 9 €', 'son chargeur sans fil « universel » à petit prix'],
  mode: ['ses lunettes de soleil à 4 €', 'ses lentilles de couleur sans ordonnance'],
  jeu: ['son jeu mobile « gratuit » aux achats intégrés sans limite', 'ses jouets lumineux à piles « dès 3 ans »'],
  appli: ['son appli de prêts entre particuliers « sans justificatif »', 'son appli de régime à 600 calories par jour'],
  voyage: ['ses séjours « tout compris » à prix cassé', 'ses billets d’avion « dernière minute » à 19 €'],
};
const CLAUSES = [
  { kind: 'penal', text: (g, x) => `Exclusivité totale de 6 mois : ${fmtMoney(g, x.amount)} de pénalité pour tout autre partenariat, tous secteurs confondus.` },
  { kind: 'image', text: () => 'La marque peut utiliser ton image et ta voix dans ses publicités, sans limite de durée.' },
];
// The brand's sheet: every brand has one (a young brand can be honest, an old one shady): it never says it alone.
function brandSheet(scam) {
  const s = { since: Math.random() < 0.15 ? -randi(5, 11) : randi(1998, 2023), fol: randi(8, 900) * 1000, rating: Math.round(rand(3.6, 4.8) * 10) / 10, reviews: randi(200, 20000), collabs: randi(5, 120), site: true };
  if (scam === 'impaye') Object.assign(s, { since: -randi(2, 6), collabs: randi(0, 3), reviews: randi(3, 40), fol: randi(1, 30) * 1000 });
  else if (scam === 'frais') Object.assign(s, { rating: Math.round(rand(1.4, 2.4) * 10) / 10, reviews: randi(80, 600), collabs: randi(300, 1200) });
  else if (scam === 'dangereux') Object.assign(s, { since: -randi(1, 8), reviews: randi(10, 90), rating: Math.round(rand(4.7, 5) * 10) / 10 });
  else if (scam === 'nul') Object.assign(s, { rating: Math.round(rand(1.5, 2.3) * 10) / 10, reviews: randi(800, 6000) });
  else if (scam === 'brief') Object.assign(s, { since: 0, fol: randi(20, 400), collabs: 0, reviews: 0, site: false });
  return s;
}
function sheetLine(g, d) {
  const s = d.info;
  if (!s) return '';
  const since = s.since === 0 ? 'date de création introuvable' : s.since < 0 ? `créée il y a ${-s.since} mois` : `fondée en ${s.since}`;
  return `${cap1(since)} · ${fmtN(s.fol)} abonnés · ${s.reviews ? `avis clients ${String(s.rating).replace('.', ',')}/5 (${fmtN(s.reviews)} avis)` : 'aucun avis client'} · ${s.collabs} ${plural(s.collabs, 'partenariat', 'partenariats')} avec des créateurs${s.site ? '' : ' · site web introuvable'}`;
}
const PITCH = {
  frais: (g, d) => `Félicitations ${g.player.name.split(' ')[0]} ! 🎉 Ton profil a été sélectionné pour rejoindre le programme ambassadeur de ${d.brand}. Places très limitées : je t’envoie les détails ⬇️`,
  brief: (g, d) => `Bonjour ${g.player.name.split(' ')[0]}, je suis chargée des campagnes de ${d.brand}. Budget validé pour une collaboration avec toi. Le contrat et le brief sont prêts, il ne reste qu’à les télécharger ⬇️`,
  impaye: (g, d) => `Salut ${g.player.name.split(' ')[0]} ! On lance ${d.product} et on veut des créateurs qui ont du style : on a un beau budget pour toi. Je t’envoie la proposition ⬇️`,
};
// Called by makeOffer once the offer exists: maybe a scam (terms changed accordingly); returns { pitch } or null.
function scamOffer(g, d, o) {
  d.info = brandSheet('');
  if (d.banned || o.legit || o.loyal || (easyGear() && o.scam === undefined)) return null; // (the suites before 0.20: as it was)
  const kind = o.scam !== undefined ? o.scam : Math.random() < scamChance(g, d.via) ? pickW(Object.keys(SCAM_KINDS).map((k) => ({ k, w: SCAM_KINDS[k].w }))).k : '';
  if (!kind || !SCAM_KINDS[kind]) return null;
  d.scam = kind;
  d.shady = false; // (the scam is the trap: no hidden ad on top)
  d.info = brandSheet(kind);
  const t = Date.now();
  d.expose = t + randi(2, 7) * DAY_MS; // the critic will tell (always when the player signed; about half of the others)
  if (kind === 'impaye' && d.gift) { const t1 = clamp(d.gift.t + 1, 0, 3); Object.assign(d.gift, { t: t1, value: GEAR[d.gift.kind].prices[t1] }); d.value = d.gift.value; d.product = `${GIFT_ART[d.gift.kind]} « ${giftName(g, d.gift)} »`; } // 0.21: gear too good to be true, that never ships
  else if (kind === 'impaye') { const fee = niceRound(Math.max(d.fee, 300) * rand(1.2, 1.5)); Object.assign(d, { fee, fee0: fee, base: fee, upfront: 0, payLate: 60 }); d.max = Math.round(fee * 1.4); d.maxBase = d.max; }
  else if (kind === 'frais') Object.assign(d, { gift: null, fee: 0, fee0: 0, base: null, maxBase: null, upfront: 0, value: randi(15, 40) * 10, costs: pick([29, 39, 49, 59, 79, 89]), product: 'son kit ambassadeur (produits et code promo à ton nom)', exclusive: false, max: 0 });
  else if (kind === 'dangereux') { if (d.gift) { d.gift = null; d.value = randi(4, 15) * 10; d.max = Math.max(40, Math.round(d.value * 0.8)); } d.product = pick(DANGER[d.sector] || DANGER.food); if (d.fee) { const fee = niceRound(d.fee * rand(1.3, 1.6)); Object.assign(d, { fee, fee0: fee, base: fee, upfront: fee >= 500 ? Math.round(fee * 0.3) : 0 }); d.max = Math.round(fee * 1.3); d.maxBase = d.max; } }
  else if (kind === 'clause') { const C = pick(CLAUSES); d.clause = { kind: C.kind, amount: niceRound(Math.max(150, (d.fee || d.value || 100) * 3)) }; d.clause.text = C.text(g, d.clause); } // (three times the contract)
  else if (kind === 'brief') Object.assign(d, { brief: pick(['brief_campagne.zip', 'contrat_signature.zip', 'Brief_Collab_2026.zip']) });
  return { pitch: PITCH[kind] ? PITCH[kind](g, d) : '' };
}
// What the player sees of the terms (neutral: the same lines for every brand).
function payTerms(g, d) {
  if (d.costs) return `Frais d’inscription à ta charge : ${fmtMoney(g, d.costs)}`;
  if (d.gift) return 'Le matos, envoyé à la signature'; // 0.21
  if (!d.fee) return 'Les produits, envoyés à la signature';
  if (d.payLate) return `En une fois, ${d.payLate} jours après la publication`;
  return d.upfront ? '30 % à la signature, le reste à la livraison' : 'À la livraison';
}

/* ---------- the agents: what they see, what they bring, how far they can go ---------- */
const AGENT_CEIL = [300, 1000, 2500, Infinity]; // the biggest contract each level handles (Débutant → Star du métier; 0.20 balance: on the brands' new prices)
const dealSize = (fee) => (fee < AGENT_CEIL[0] ? 0 : fee < AGENT_CEIL[1] ? 1 : fee < AGENT_CEIL[2] ? 2 : 3);
const AGENT_SEE = [0.45, 0.7, 0.9, 0.98];
const AGENT_WARN = {
  impaye: (d) => d.gift ? `J’ai regardé l’offre de ${d.brand} : du matos à ${fmtPlain(d.gift.value)} € pour une seule vidéo, par une boîte créée il y a quelques mois sans aucune collab derrière elle. Je le sens très mal : à mon avis, tu ne verras jamais le colis.` : `J’ai regardé l’offre de ${d.brand}. Pas d’acompte, paiement à ${d.payLate} jours, une boîte créée il y a quelques mois sans aucune collab derrière elle : je le sens très mal. À mon avis, ils ne paieront jamais.`,
  frais: (d) => `${d.brand} te demande de PAYER pour être « ambassadeur » ? Non. Une marque sérieuse paie les créateurs, pas l’inverse. C’est une arnaque, je refuserais.`,
  dangereux: (d) => `Je ne mettrais pas ton nom sur ${d.product}. Des promesses impossibles, aucun label, une marque sortie de nulle part : si ça tourne mal, c’est toi qu’on accusera.`,
  nul: (d) => `Avant de signer avec ${d.brand}, regarde leurs avis clients : c’est une catastrophe. Tes abonnés vont acheter ce que tu recommandes… et te le reprocher.`,
  clause: (d) => `Relis bien le contrat de ${d.brand} : « ${d.clause.text} » Ça, ce n’est pas standard du tout. Ça peut te coûter très cher.`,
  brief: (d) => `Surtout, n’ouvre pas le « brief » de ${d.brand} ! Un .zip à télécharger pour « signer », un site introuvable : c’est un classique pour pirater les comptes.`,
  shady: (d) => `${d.brand} ne veut pas de mention « Collaboration commerciale » ? C’est illégal. Si ça se voit, l’amende et le bad buzz seront pour toi, pas pour eux.`,
  banned: (d) => `${d.product}, c’est interdit à la promotion en France (${d.banned}). Même bien payé : je refuserais.`,
};
// An offer arrives: the agent reads it (a beginner sees less) and warns in private. What the agent brought, they did not see.
function agentReview(g, d) {
  const m = hasStaff(g, 'agent'), c = m && g.chars[m.c];
  if (!c || d.via === 'agent' || easyGear()) return false;
  const trap = d.scam || (d.banned ? 'banned' : d.shady ? 'shady' : '');
  if (!trap) return false;
  const see = AGENT_SEE[clamp(m.tier, 0, 3)] * (SCAM_KINDS[trap] && SCAM_KINDS[trap].sneaky ? 0.85 : 1);
  if (Math.random() >= see) return false;
  d.flagged = true;
  addIncomingDM(g, c, AGENT_WARN[trap](d), later() + 6000, { max: 400 });
  return true;
}
// How hard a contract is to negotiate: above the agent's level, a gamble; without an agent, a big brand gives nothing.
function dealHard(g, d) {
  if (!d.fee || d.scam || easyGear()) return;
  const size = dealSize(d.fee), m = hasStaff(g, 'agent');
  if (!m) { if (size >= 2) d.hard = 'alone'; return; }
  const gap = size - m.tier;
  if (gap >= 1) { d.hard = 'agent'; d.luck = gap === 1 ? 0.25 : gap === 2 ? 0.05 : 0.01; }
}
// The agent tries a contract above their level: once. Won: a better fee. Lost: the brand walks away.
function agentGamble(g, d) {
  const m = hasStaff(g, 'agent'), c = m && g.chars[m.c];
  if (!c || d.state !== 'offer' || d.hard !== 'agent' || d.tried) return false;
  d.tried = true;
  const first = c.name.split(' ')[0];
  if (Math.random() < (d.luck || 0)) {
    d.hard = ''; // (the brand gives what it can, now)
    const nf = Math.min(dealBounds(d).cap, niceRound(d.fee * rand(1.15, 1.3)));
    d.fee = nf;
    d.upfront = nf >= 500 ? Math.round(nf * 0.3) : 0;
    addIncomingDM(g, c, `C’est fait ! J’ai tenu bon avec ${d.brand} : ${fmtMoney(g, nf)}. Franchement, j’y croyais à moitié. Tu n’as plus qu’à signer 😎`, later() + 1500, { max: 300 });
    dmCard(g, g.chars[d.contact] || c, { sys: 'deal', deal: d.id, upd: true }, later() + 2500);
    addNotif(g, { k: 'money', c: c.id, text: `${first} a décroché mieux avec ${d.brand} : ${fmtMoney(g, nf)}.` });
    return 'won';
  }
  d.state = 'withdrawn';
  addIncomingDM(g, c, `Je suis désolé·e… ${d.brand} n’a pas aimé ma façon de négocier, ils se sont retirés. Un contrat de cette taille, ce n’était pas encore pour moi.`, later() + 1500, { max: 300 });
  addNotif(g, { k: 'money', c: c.id, text: `${d.brand} se retire : ${first} n’avait pas le niveau pour ce contrat.` });
  return 'lost';
}

/* ---------- signing, delivering: what a scam does ---------- */
// Before a signature (true: go on). A fee to pay; a « brief » to open; a trap clause of another contract.
function scamBeforeSign(g, d) {
  if (d.scam === 'frais' && d.costs && !pay(g, d.costs, `Frais d’inscription ${d.brand}`, 'deal')) { toast(`Il te faut ${fmtMoney(g, d.costs)} pour les frais d’inscription.`, 'bad'); return false; }
  penalClause(g, d);
  return true;
}
// After it: the « brief » was a virus; the « ambassador » kit never comes.
function scamAfterSign(g, d) {
  const t = Date.now();
  if (d.scam === 'brief') {
    d.state = 'scammed';
    const pc = g.gear && g.gear.items.pc;
    if (usable(pc)) pc.virus = 1;
    const loss = Math.round(g.stats.followers * 0.01);
    g.stats.followers = Math.max(0, g.stats.followers - loss);
    const dr = repMove(g, { cred: -6, pro: -4 }, 'ton compte piraté a envoyé des liens d’arnaque', { noCheck: true });
    addNotif(g, { k: 'money', text: `💀 Le « brief » de ${d.brand} était un piège : ${usable(pc) || (pc && pc.virus) ? 'un virus bloque ton ordinateur, et ' : ''}ton compte a été piraté une heure, le temps d’envoyer des liens douteux en ton nom (${repWord(dr)}, −${nAbonnes(loss)}).` });
    const at = t + randi(3000, 8000);
    addAmbientPost(g, { by: pick(CANCEL_NPCS)[0], text: `@${g.player.handle} vient de m’envoyer un lien super chelou en privé ?? piraté ou quoi` }, at, at);
    addTrigger(g, `Le compte du joueur s’est fait pirater : pendant une heure, des messages d’arnaque sont partis en son nom. Certains s’inquiètent pour lui, d’autres se moquent de sa naïveté.`);
    return;
  }
  if (d.scam === 'frais') d.lostAt = t + randi(2, 5) * DAY_MS; // (« waiting » for a kit that never comes)
}
// Another contract signed while a trap clause runs (6 months, any sector): the penalty.
function penalClause(g, d) {
  const t = Date.now();
  for (const x of g.deals) {
    if (x === d || !x.clause || x.clause.kind !== 'penal' || x.clause.paid || !['signed', 'done'].includes(x.state) || t - (x.signedAt || 0) > 180 * DAY_MS) continue;
    x.clause.paid = t;
    charge(g, x.clause.amount, `Pénalité du contrat ${x.brand} (exclusivité totale)`, 'fine');
    const c = g.chars[x.contact];
    if (c) addIncomingDM(g, c, `Bonjour. Nous avons vu ton partenariat avec ${d.brand}. Je te rappelle l’article 7 de notre contrat (exclusivité totale de 6 mois) : la pénalité de ${fmtMoney(g, x.clause.amount)} est due. Bonne journée.`, later() + 4000, { max: 320 });
    addNotif(g, { k: 'money', text: `⚖️ Pénalité : ton contrat avec ${x.brand} t’interdisait tout autre partenariat pendant 6 mois (−${fmtMoney(g, x.clause.amount)}).` });
  }
}
// At delivery: the money that never comes, the recall, the complaints, the face in an ad. true: the brand paid.
function scamOnDeliver(g, d) {
  const t = Date.now();
  if (d.scam === 'impaye') { d.unpaidAt = t + d.payLate * DAY_MS; return false; }
  if (d.scam === 'dangereux') d.recallAt = t + randi(1, 4) * DAY_MS;
  if (d.scam === 'nul') d.flopAt = t + randi(1, 3) * DAY_MS;
  if (d.scam === 'clause' && d.clause.kind === 'image') d.imageAt = t + randi(3, 10) * DAY_MS;
  return true;
}
// The clock: what a scam does days later, and the critic.
function tickScams(g, t = Date.now()) {
  let ch = false;
  for (const d of g.deals) {
    if (!d.scam) continue;
    const c = g.chars[d.contact];
    if (d.lostAt && t >= d.lostAt && d.gift) { d.lostAt = 0; d.state = 'scammed'; ch = true; if (c) c.ghost = true; addNotif(g, { k: 'money', text: `📦 Le colis de ${d.brand} (${giftName(g, d.gift)}) n’est jamais arrivé, et ${c ? c.name.split(' ')[0] + ' ne répond plus' : 'la marque a disparu'}.` }); }
    if (d.lostAt && t >= d.lostAt) { d.lostAt = 0; d.state = 'scammed'; ch = true; if (c) c.ghost = true; addNotif(g, { k: 'money', text: `📦 Le « kit ambassadeur » de ${d.brand} n’est jamais arrivé, et ${c ? c.name.split(' ')[0] : 'ton contact'} ne répond plus. Tes ${fmtMoney(g, d.costs)} sont perdus.` }); }
    if (d.unpaidAt && t >= d.unpaidAt) {
      d.unpaidAt = 0; d.unpaid = true; ch = true;
      if (c) c.ghost = true;
      addNotif(g, { k: 'money', text: `💸 ${d.payLate} jours plus tard : ${d.brand} n’a jamais payé tes ${fmtMoney(g, d.fee)}. Le contact a disparu.` });
    }
    if (d.recallAt && t >= d.recallAt) { d.recallAt = 0; ch = true; productRecall(g, d); }
    if (d.flopAt && t >= d.flopAt) { d.flopAt = 0; ch = true; productFlop(g, d); }
    if (d.imageAt && t >= d.imageAt) { d.imageAt = 0; ch = true; imageAbuse(g, d); }
    if (d.expose && t >= d.expose) { d.expose = 0; ch = true; criticExposes(g, d); }
  }
  for (const L of (g.career.loves || []).slice()) {
    if (t < L.at) continue;
    if (loyalOffer(g, L) || t - L.at > 20 * DAY_MS) { g.career.loves = g.career.loves.filter((x) => x !== L); ch = true; } // (no room for it today: tomorrow)
    else L.at = t + DAY_MS;
  }
  return ch;
}
function productRecall(g, d) {
  const t = Date.now(), loss = Math.round(g.stats.followers * 0.02);
  g.stats.followers = Math.max(0, g.stats.followers - loss);
  const dr = repMove(g, { cred: -12, image: -8, pro: -5 }, `tu as fait la promo d’un produit dangereux (${d.brand})`, { noCheck: true });
  g.pbb = { at: t, until: t + Math.round(PLAYER_BB_MS * staffMult(g, 'bb')), c: null, kind: 'produit' };
  let at = t + randi(2000, 5000);
  addAmbientPost(g, { by: 'alerte.conso', name: 'Alerte Conso', bio: 'rappels de produits et arnaques du quotidien', text: `⚠️ RAPPEL : ${d.product} (${d.brand}) est retiré de la vente, il présente un danger. Si vous en avez acheté, n’y touchez plus. Plusieurs créateurs en ont fait la promo.` }, at, at);
  at += randi(4000, 8000);
  addAmbientPost(g, { by: pick(CANCEL_NPCS)[0], text: `donc @${g.player.handle} nous a vendu un produit DANGEREUX. on en parle ? #RappelProduit` }, at, at);
  addNotif(g, { k: 'cancel', text: `⚠️ ${cap1(d.product)} (${d.brand}) est rappelé : il est dangereux. Tu en as fait la promo : bad buzz (${repWord(dr)}, −${nAbonnes(loss)}).` });
  addChronicle(g, `${g.player.name} a fait la promo d’un produit dangereux, rappelé depuis (${d.brand}).`);
  addTrigger(g, `Le produit dont le joueur a fait la promo (${d.product}, ${d.brand}) vient d’être rappelé : il est dangereux. Indignation, inquiétude, « il ne vérifie rien avant de vendre ? ».`);
  checkCancel(g);
}
function productFlop(g, d) {
  const loss = Math.round(g.stats.followers * 0.01);
  g.stats.followers = Math.max(0, g.stats.followers - loss);
  const dr = repMove(g, { cred: -6, image: -3 }, `le produit ${d.brand} que tu as recommandé est nul`);
  const t = Date.now();
  let at = t + randi(2000, 5000);
  for (const fn of [(h) => `j’ai acheté ${d.product} parce que @${h} le recommandait… franchement c’est nul, ça s’est cassé en deux jours`, (h) => `@${h} tu l’as vraiment testé ${d.product} ou t’as juste pris l’argent ?`]) { addAmbientPost(g, { by: pick(CANCEL_NPCS)[0], text: fn(g.player.handle) }, at, at); at += randi(5000, 10000); }
  addNotif(g, { k: 'reldown', text: `👎 Ceux qui ont acheté ${d.product} sur tes conseils sont déçus : c’est de la camelote (${repWord(dr)}, −${nAbonnes(loss)}).` });
}
function imageAbuse(g, d) {
  const dr = repMove(g, { image: -8, cred: -3 }, `${d.brand} met ton visage dans une pub ringarde`);
  const t = Date.now();
  addAmbientPost(g, { by: pick(CANCEL_NPCS)[0], text: `pourquoi @${g.player.handle} est dans une pub ${d.brand} en boucle sur toutes mes vidéos 😭 « jusqu’à −70 % » avec sa tête retouchée` }, t + 3000, t + 3000);
  addNotif(g, { k: 'reldown', text: `📺 ${d.brand} utilise ton visage et ta voix dans des pubs partout (ton contrat le permet, sans limite de durée) : on se moque (${repWord(dr)}).` });
}
// The critic on the platform exposes the scam: names those who promoted it (or got fooled).
function criticExposes(g, d) {
  if (d.scam && ['done', 'signed', 'scammed', 'waiting'].includes(d.state) && d.post) warmMove(g, -5, `tu as fait la promo d’une arnaque (${d.brand})`); // 0.21: the community saw it
  if (!d.scam) return; // (the player had the trap taken out)
  const h = g.player.handle, mine = ['signed', 'done', 'scammed', 'waiting'].includes(d.state) || d.unpaid;
  if (!mine && Math.random() < 0.5) return; // not every scam makes a video
  const lines = {
    impaye: `🧨 ARNAQUE : ${d.brand} ne paie pas les créateurs. Même méthode à chaque fois : gros cachet promis, zéro acompte, paiement « à ${d.payLate} jours »… puis plus rien.`,
    frais: `🧨 ARNAQUE : le « programme ambassadeur » de ${d.brand}. Tu paies des « frais », tu reçois trois babioles et un code promo. Personne n’est payé, sauf eux.`,
    dangereux: `🧨 DANGER : ${d.product} (${d.brand}) n’a aucune autorisation et des gens ont fini chez le médecin. Ceux qui en ont fait la promo devraient s’expliquer.`,
    nul: `🧨 J’ai testé ${d.product} de ${d.brand} : c’est du vent. Leurs avis clients sont catastrophiques pour une raison. Créateurs, vérifiez avant de vendre.`,
    clause: `🧨 Lisez vos contrats : ${d.brand} glisse une clause piège (« ${d.clause ? d.clause.text : ''} »). Des créateurs se retrouvent coincés.`,
    brief: `🧨 ALERTE : de faux contrats « ${d.brand} » circulent. Le « brief » à télécharger est un virus qui pirate vos comptes. Ne cliquez sur rien.`,
  };
  const victim = d.scam === 'impaye' || d.scam === 'frais' || d.scam === 'brief';
  const t = Date.now(), at = t + randi(2000, 6000);
  addAmbientPost(g, Object.assign({}, CRITIC, { text: lines[d.scam] + (mine ? ` ${victim ? 'Parmi ceux qui se sont fait avoir' : 'Parmi ceux qui en ont fait la promo'} : @${h}.` : '') }), at, at);
  if (d.state === 'signed') { // the contract of a scam no longer binds anyone
    d.state = 'scammed';
    if (d.scam === 'impaye' || d.scam === 'dangereux' || d.scam === 'nul') addNotif(g, { k: 'money', text: `Ton contrat avec ${d.brand} ne vaut plus rien : ${CRITIC.name} vient de démasquer l’arnaque. Tu n’as rien à livrer.` });
  }
  if (!mine) { addNotif(g, { k: 'money', text: `🧨 ${CRITIC.name} démasque ${d.brand} : ${d.state === 'declined' || d.state === 'expired' || d.state === 'withdrawn' ? 'tu as bien fait de ne pas signer' : 'une arnaque'}.` }); return; }
  if (!victim) { const dr = repMove(g, { cred: -5, pro: -4 }, `${CRITIC.name} te cite parmi ceux qui ont vendu ${d.brand}`); addNotif(g, { k: 'reldown', text: `🧨 ${CRITIC.name} démasque ${d.brand} et te cite parmi ceux qui en ont fait la promo (${repWord(dr)}).` }); }
  else addNotif(g, { k: 'money', text: `🧨 ${CRITIC.name} démasque ${d.brand} et te cite parmi les créateurs piégés.` });
  addTrigger(g, `${CRITIC.name}, youtubeur qui démonte les arnaques, expose ${d.brand} et cite le joueur parmi ${victim ? 'ceux qui se sont fait avoir' : 'ceux qui en ont fait la promo'}. Les réactions vont de la compassion aux moqueries.`);
}

/* ---------- the brands that love you back ---------- */
// A sponsored release that did very well: maybe a bonus nobody asked for, and the brand comes back sooner (and pays more).
function brandLove(g, d, perf) {
  if (!d || d.scam || !perf || !(perf.tier === 'top' || perf.viral) || easyGear()) return false;
  const c = g.chars[d.contact];
  const p = 0.35 + (hasBonus(g, 'produits') ? 0.15 : 0) + (perf.viral ? 0.1 : 0) + (perf.fit === 1 ? 0.1 : perf.fit === -1 ? -0.15 : 0); // 0.21: a placement that fits
  let gift = 0;
  if (Math.random() < p) {
    gift = niceRound(d.fee ? d.fee * rand(0.1, 0.25) : rand(60, 180));
    earn(g, gift, `Prime de ${d.brand} (ta vidéo a cartonné)`, 'deal');
    if (c) addIncomingDM(g, c, pick([`Les chiffres sont fous 🤯 On t’envoie une petite prime de ${fmtMoney(g, gift)}, cadeau. Merci !`, `Toute l’équipe a adoré. Pour te remercier : ${fmtMoney(g, gift)} de prime, sans rien demander en retour 🙏`]), later() + 5000, { max: 300 });
    addNotif(g, { k: 'money', text: `🎁 ${d.brand} t’envoie une prime de ${fmtMoney(g, gift)} : ta vidéo a cartonné.` });
  }
  g.career.loves = (g.career.loves || []).filter((x) => x.brand !== d.brand).concat({ brand: d.brand, sector: d.sector, contact: d.contact, what: d.what, emoji: d.emoji, product: d.product, at: Date.now() + randi(3, 10) * DAY_MS });
  return gift || true;
}
function loyalOffer(g, L) {
  if (g.deals.some((x) => x.brand.toLowerCase() === L.brand.toLowerCase() && DEAL_OPEN.includes(x.state))) return false;
  const c = g.chars[L.contact];
  return !!makeOffer(g, { brand: L.brand, sector: L.sector, what: L.what, emoji: L.emoji, product: L.product, contactId: c ? c.id : '', loyal: true, bonus: 1.15 * (hasBonus(g, 'produits') ? 1.1 : 1),
    text: `Re-coucou ${g.player.name.split(' ')[0]} ! Après le carton de notre dernière collab, on a tout de suite pensé à toi pour la suite. On remet ça ? ⬇️` });
}

/* ---------- what the AI knows of all this ---------- */
// For the brand's own DM: the secret it never admits, or a negotiation without mercy.
function scamCtx(g, d, c) {
  const n = c.name.split(' ')[0];
  const never = `Elle ne l’avoue JAMAIS, même si le joueur l’accuse : elle s’indigne, rassure, invente des références, ou change de sujet.`;
  const S0 = {
    impaye: `(Secret que le joueur ne doit jamais apprendre de ta bouche : ${d.brand} n’a aucune intention de payer. ${n} promet un paiement « à ${d.payLate} jours, comme tout le monde », esquive les questions sur l’entreprise, pousse à signer vite. ${never})`,
    frais: `(Secret : c’est une arnaque au « programme ambassadeur » : le joueur paie ${fmtMoney(g, d.costs)} de frais et ne recevra rien de valable. ${n} présente ça comme une chance rare « réservée aux meilleurs profils ». ${never})`,
    dangereux: `(Secret : ${d.product} est dangereux et n’a aucune autorisation. ${n} vante des résultats « incroyables » et répond de façon floue sur la sécurité ou les certifications. ${never})`,
    nul: `(Secret : le produit est de très mauvaise qualité, les clients se plaignent beaucoup. ${n} parle de « quelques avis de concurrents jaloux ». ${never})`,
    clause: `(Secret : le contrat contient une clause piégée : « ${d.clause ? d.clause.text : ''} ». ${n} la dit « standard » et n’accepte de l’enlever que si le joueur insiste beaucoup, en baissant alors fortement le prix. ${never})`,
    brief: `(Secret : c’est un faux contrat : le « brief » à télécharger (${d.brief}) est un virus. ${n} insiste pour qu’il le télécharge « pour signer », s’impatiente s’il hésite. ${never})`,
  };
  if (c.ghost) return `${n} fuit le joueur : elle ne répond plus que par des excuses vagues (« la compta… », « la semaine prochaine »), puis plus du tout.`;
  if (d.gift && d.scam === 'impaye') return `(Secret : ${d.brand} n’enverra jamais ${GIFT_ART[d.gift.kind]} « ${giftName(g, d.gift)} » : c’est un appât. ${n} jure que « le colis part cette semaine », parle de retards de livraison, de douane. ${never})`; // 0.21
  if (d.gift && d.scam === 'nul') return `(Secret : ${GIFT_ART[d.gift.kind]} « ${giftName(g, d.gift)} » est une contrefaçon qui lâchera vite. ${n} parle de « dernière génération », de « qualité pro ». ${never})`;
  return S0[d.scam] || '';
}
const HARD_CTX = (g, d, c) => d.hard === 'alone'
  ? `Ce contrat est énorme et le joueur négocie seul, sans agent : ${c.name.split(' ')[0]} est une négociatrice redoutable. Elle exige des chiffres précis, ne cède presque rien (quelques pourcents au mieux, jamais au-delà de ${fmtMoney(g, dealBounds(d).cap)}), et coupe court s’il bluffe ou insiste.`
  : d.hard === 'agent' ? `Ce contrat dépasse le niveau de l’agent du joueur : ${c.name.split(' ')[0]} préfère traiter avec des pros et lâche très peu.` : '';
// When the player asks a friend about a brand (named in the message): what the milieu may say of it.
function brandRumorLine(g, c, text) {
  const t = foldAcc(text || '');
  const d = g.deals.filter((x) => DEAL_OPEN.includes(x.state) || x.state === 'done').reverse().find((x) => x.brand && t.includes(foldAcc(x.brand)));
  if (!d || !isMain(c)) return '';
  const R = {
    impaye: 'des créateurs disent n’avoir jamais été payés par eux', frais: 'leur « programme ambassadeur », c’est payer pour recevoir trois babioles',
    dangereux: 'leur produit a l’air louche, sans aucune autorisation', nul: 'leurs clients se plaignent beaucoup, c’est de la camelote',
    clause: 'leurs contrats seraient pleins de pièges', brief: 'des comptes se sont fait pirater après avoir ouvert leurs « briefs »',
  };
  const bad = d.scam ? R[d.scam] : d.banned ? `ce genre de produit (${d.banned}) est interdit à la promo` : d.shady ? 'ils demandent souvent de cacher que c’est de la pub' : '';
  return `- Le joueur parle de la marque ${d.brand}. Ce qui se dit dans le milieu (${c.name} peut le savoir ou non, selon son réseau et son caractère ; s’il ne sait rien, il le dit) : ${bad || 'rien de spécial, une marque comme une autre'}.`;
}

/* ---------- the screens ---------- */
// The brand's sheet and the agent's box, inside the deal card.
function DealExtra({ g, d }) {
  const m = hasStaff(g, 'agent'), ag = m && g.chars[m.c];
  return html`${d.info ? html`<details class="dl-sheet"><summary>La marque</summary><p>${sheetLine(g, d)}</p></details>` : null}
    ${d.state === 'offer' && d.hard === 'agent' && ag && !d.tried ? html`<div class="dl-agent"><span>${STAFF_ROLES.agent.emoji} Ce contrat dépasse le niveau de ${ag.name.split(' ')[0]} (${tierName(m.tier, ag.g).toLowerCase()} : jusqu’à ${fmtMoney(g, AGENT_CEIL[m.tier])}). ${gx(ag.g, 'Il', 'Elle', 'Iel')} peut tenter de le négocier : ${Math.round((d.luck || 0) * 100)} % de chances de faire monter le prix, sinon la marque se retire.</span>
      <button class="btn btn-ghost btn-sm" onClick=${() => { agentGamble(g, d); update(); }}>Laisser ${ag.name.split(' ')[0]} négocier</button></div>` : null}`;
}
