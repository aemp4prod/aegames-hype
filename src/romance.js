/* =========================================================
   0.30: romance between adults: sensual (the default: the player said they are 18 or older at the start of the game) or
   modest (« pudique », an option in the game's settings).
   Sensual: closeness is allowed and can be sensual (desire said, kisses, caresses told by the sensations, massages,
   lighter outfits, undressing up to the threshold, waking up together); never explicit: once it becomes sex, the scene
   cuts (« Ce moment ne regarde pas les voyeurs. » … « Un peu plus tard… »; at the end of an evening, « La suite
   appartient à leur intimité. »). The pace follows each one's heart and their story (a guide for the AI, never a rule the
   game enforces): the impulsive go fast, even flirting; the cautious later; a fortress very late, all the way once won
   over. They may ask for it themselves. Consent both ways: they say no their way, warmly, never a wall. What was cut can
   be alluded to afterwards, between them, never told.
   ========================================================= */
const sensual = (g) => !(g && g.opts && g.opts.romance === 'pudique');
// How far and how soon each heart goes: hours in the step (flirt, couple…), a couple counting half as much again.
const HEART_INTIMACY = {
  impulsif: { soon: 0, ready: 0, word: 'va très vite, sensuel·le dès le flirt et prêt·e à finir la nuit ensemble dès un premier rendez-vous chez l’un ou l’autre' },
  jaloux: { soon: 6, ready: 24, word: 'va vite, intense et exclusif·ve' },
  serein: { soon: 24, ready: 72, word: 'se laisse aller quand ça se passe bien, après quelques jours' },
  anxieux: { soon: 48, ready: 96, word: 'en a envie mais a besoin d’être rassuré·e d’abord (la confiance compte plus que le temps)' },
  prudent: { soon: 72, ready: 144, word: 'y arrive plus tard, avec du temps et de la confiance' },
  inaccessible: { soon: 72, ready: 144, word: 'fait comme un·e prudent·e, une fois le joueur vraiment remarqué' },
  forteresse: { soon: 144, ready: 288, word: 'y arrive très tard, mais à fond une fois conquis·e' },
};
// Where they are with the player, in words (their heart, the time in this step, their trust): a guide, they decide.
function intimacyLv(g, c, t = Date.now()) {
  if (!c || !LOVE_ACTIVE.includes(c.vibe) || c.vibe === 'crush') return 0;
  const H = HEART_INTIMACY[c.coeur] || HEART_INTIMACY.serein;
  const since = c.pace && c.pace.at ? Math.max(0, (t - c.pace.at) / 3600000) : 0;
  const tr = trustOf(c), h = since * (PARTNER.includes(c.vibe) ? 1.5 : 1) + (tr >= 60 ? 24 : tr >= 40 ? 8 : 0) + (c.intimate ? 48 : 0);
  return h >= H.ready ? 2 : h >= H.soon ? 1 : 0;
}
function intimacyLine(g, c, t = Date.now()) {
  if (!sensual(g) || !c || !LOVE_ACTIVE.includes(c.vibe)) return null;
  const H = HEART_INTIMACY[c.coeur] || HEART_INTIMACY.serein, first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  const now = [`pas encore : baisers, câlins, tendresse ; une main qui s’aventure trop loin, ${il} la reprend gentiment (« pas encore… »), sans fermer la porte`,
    `ça commence : caresses, massages, une tenue plus légère, le lit pour se blottir ; ${il} peut le proposer`,
    `prêt·e : ça peut aller jusqu’au bout si le moment s’y prête (la scène coupe alors), et ${il} peut en prendre l’initiative`][intimacyLv(g, c, t)];
  return `Intimité avec ${first} (cœur ${c.coeur || 'serein'}, qui ${H.word}) : ${now}. Un repère, pas une règle : ${first} décide selon le moment, son envie et la soirée.${c.intimate ? ` Ils ont déjà partagé des moments intimes (coupés à l’écran) : ${il} peut y faire allusion avec complicité, sans jamais les raconter.` : ''}`;
}
const INTIMACY_BLOCK = ['## INTIMITÉ (mode sensuel, entre adultes : le joueur a 18 ans ou plus et l’a choisi)',
  '- Entre adultes qui le veulent, les rapprochements sont permis et peuvent être sensuels : désir dit franchement, baisers appuyés, caresses (même audacieuses, racontées par les sensations : frissons, souffle, mains qui s’attardent), massages, tenue légère, nuisette ou sous-vêtements évoqués sans détail cru, commencer à se déshabiller, se retrouver au lit, dormir ensemble.',
  '- Jamais explicite : ni description crue du corps nu, ni des actes sexuels. Dès que ça devient du sexe (préliminaires compris), la scène coupe.',
  '- Le rythme dépend du cœur de chacun et de leur histoire : l’impulsif va vite, même en flirt ; le jaloux aussi ; le serein après quelques jours ; l’anxieux quand il se sent rassuré ; le prudent plus tard ; la forteresse très tard, mais à fond une fois conquise.',
  '- Le personnage peut aussi proposer lui-même (rester dormir, un massage, venir se blottir, une tenue qu’il décrit pour taquiner), pas à chaque message.',
  '- Consentement des deux côtés : le personnage décide. S’il n’est pas prêt, il le dit à sa façon, avec tendresse ou humour, sans fermer la porte (« pas ce soir, mais… ») : jamais un mur, jamais une leçon. Si le joueur insiste lourdement après un non, ça refroidit.',
  '- Ce qui a été coupé peut revenir en allusions entre eux (un clin d’œil, une taquinerie, « on recommence quand tu veux », une gêne mignonne), jamais raconté ; en public, au plus un sous-entendu que seuls eux comprennent.'].join('\n');
// For every call: the mode, and its rules (in full only where they talk to the player: a conversation, a date, a visit).
function romanceCtx(g, kind) {
  if (!sensual(g)) return kind === 'private' || kind === 'scene' ? 'Romance pudique (le choix du joueur) : sentiments, baisers, câlins, tendresse ; si le joueur devient explicite, recentre avec tendresse ou humour.' : null;
  return kind === 'private' || kind === 'scene' ? INTIMACY_BLOCK : 'Romance : sensuelle entre adultes (le joueur a 18 ans ou plus), jamais explicite ; en public, au plus des sous-entendus.';
}
// A moment cut on screen: they remember it (allusions, never told).
function intimateMem(g, c, ev, t = Date.now()) {
  if (!c) return;
  c.intimate = { n: ((c.intimate && c.intimate.n) || 0) + 1, at: t };
  addMem(g, c, `on a partagé un moment intime${ev && ev.what ? ` (« ${str(ev.what, 40)} »)` : ''}, coupé à l’écran : on peut y faire allusion entre nous`);
}
// The line that cuts a scene, in a date, a visit or a conversation in person (sensual: when it becomes sex and they want it too).
const FADE_SENSUAL = (first, last, after = '') => `- Facultatif : si ça va jusqu’au sexe (préliminaires compris) et que ${first} le veut aussi, ${last || !after ? 'une dernière ligne' : 'une ligne'} {"t":"fade"} : la scène coupe là${last ? '' : `, et reprend un peu plus tard${after ? ` ; ${after}` : ''}`}. Juste avant, tu peux aller jusqu’au seuil (des gestes sensuels, une tenue qui glisse), sans détail cru.`;
// 0.31: after the cut, it is them who pick the conversation back up (in the same answer: no call more), a little later
const AFTER_SAY = 'une allusion, un regard, une complicité nouvelle ; jamais de détail';
const AFTER_TALK = (first, il) => `puis une dernière ligne {"t":"apres","text":"≤ 200 caractères","seen":"≤ 50 caractères : ce que le joueur voit"} : ce que ${first} dit un peu plus tard, quand la soirée reprend : c’est ${il} qui relance la conversation (${AFTER_SAY})`;
const AFTER_DM = (first, il) => `puis encore 1 message {"t":"msg"} de ${first}, un peu plus tard : c’est ${il} qui relance la conversation (${AFTER_SAY})`;
// The settings: a box on the new game, and in the game's settings.
function RomanceBox({ on, set }) {
  return html`<label class=${'check-card' + (on ? ' on' : '')}>
    <input type="checkbox" checked=${on} onChange=${(e) => set(e.target.checked)} />
    <span><b>Romance sensuelle 🔥</b><small>Entre adultes : rapprochements sensuels, au rythme de chaque personnage, et la scène coupe avant le sexe. Décoché : romance pudique (baisers, câlins, tendresse).</small></span>
  </label>`;
}
