// The definitions of Hype's achievements for the Æ Games Launcher's backend (table achievement_definitions), written
// from the game's own list (src/succes.js), so that the two never drift apart.
// Run: node tools/achievements-sql.mjs > docs/aegames-achievements.sql
// The keys are a permanent API: never renamed, never reused. Titles and descriptions may change in the base without a
// new version of the game.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'src', 'succes.js'), 'utf8');
const pick = (name) => {
  const m = src.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n\\]);`));
  if (!m) throw new Error(`${name} introuvable dans src/succes.js`);
  return m[1];
};
// (the list as the game has it; « px » gives the neutral form, as the base has one text for every player)
const ACH = new Function('px', `return ${pick('ACH')};`)((g, m, f, x) => x).map((A) => Object.assign({}, A, { desc: typeof A.desc === 'function' ? A.desc(null) : A.desc }));
const GROUPS = new Function(`return ${src.match(/const ACH_GROUPS = (\[[^\n]*\]);/)[1]};`)();
const VERSION = (readFileSync(join(ROOT, 'src', 'core.js'), 'utf8').match(/const APP_VERSION = '([^']+)'/) || [])[1] || '?';

// An icon per achievement (Lucide names, like the launcher's « users »); points by how hard it is.
const ICON = {
  'first-post': 'pen-line', 'viral-post': 'rocket', 'flop-post': 'trending-down', 'internet-laughingstock': 'laugh', 'sell-me-this-pen': 'pen-tool', 'first-contract': 'file-signature',
  'worldwide-trend': 'globe', 'first-crush': 'heart', 'charro-two': 'users', 'charro-three': 'party-popper', 'charro-week': 'glasses', 'charro-month': 'eye-off', 'coin-coin': 'gift',
  'enemies-to-lovers': 'swords', 'good-doggy': 'dog', 'public-enemy': 'target', 'too-fast': 'rabbit', friendzone: 'hand-heart', 'just-no': 'ban', 'milf-lover': 'wine', 'gilf-lover': 'coffee',
  'date-from-hell': 'flame', 'stood-up': 'calendar-x', ghosted: 'ghost', 'ex-comeback': 'repeat', 'express-wedding': 'zap', ungrateful: 'tag', engaged: 'gem', married: 'church',
  phoenix: 'flame-kindling', 'fake-proof-busted': 'file-warning', 'the-crow': 'bird', 'public-apology': 'megaphone', 'apology-accepted': 'handshake', 'secret-out': 'lock-open',
  'cashed-the-check': 'banknote', 'owned-the-bad-buzz': 'shield', 'hype-train': 'train-front', cancelled: 'circle-slash', 'gaining-traction': 'trending-up', 'partner-program': 'badge-dollar-sign',
  'silver-play-button': 'medal', 'golden-play-button': 'trophy', 'diamond-play-button': 'diamond', 'ruby-play-button': 'crown', 'poopy-play-button': 'trash-2', pigeon: 'shopping-bag',
  'in-the-red': 'trending-down', incorruptible: 'hand', billboard: 'presentation', 'big-spender': 'credit-card', 'yard-sale': 'package', 'the-boss': 'briefcase', 'jail-time': 'siren',
  'tv-show': 'tv', mrbeast: 'clapperboard', 'born-to-be-hero': 'shield-check', 'subject-expert': 'graduation-cap', 'living-legend': 'sparkles', 'sleepless-night': 'moon',
};
const POINTS = { debut: 5, coeur: 10, drama: 15, avance: 15, argent: 15, rare: 50 };
const HARD = new Set(['charro-month', 'ruby-play-button', 'diamond-play-button', 'mrbeast', 'express-wedding', 'phoenix', 'pigeon', 'charro-week']);
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const rows = ACH.map((A, k) => {
  const pts = HARD.has(A.id) ? 40 : POINTS[A.grp] || 10;
  return `  ('hype', ${q(A.id)}, ${q(A.name)}, ${q(A.desc)}, ${q(ICON[A.id] || 'award')}, ${q(A.goal ? 'high_watermark' : 'binary')}, ${A.goal || 1}, null, ${pts}, ${A.hidden ? 'true' : 'false'}, ${100 + k * 10})`;
});
const missing = ACH.filter((A) => !ICON[A.id]).map((A) => A.id);
if (missing.length) console.error('icônes manquantes :', missing.join(', '));

process.stdout.write(`-- Hype ${VERSION} : les définitions de ses succès pour Æ Games Launcher (table achievement_definitions).
-- Écrit par tools/achievements-sql.mjs à partir de src/succes.js : ${ACH.length} succès, en ${GROUPS.length} groupes
-- (${GROUPS.map((g) => g[1]).join(', ')}).
-- À exécuter dans le SQL Editor de Supabase, après 202610190003_hype_achievements.sql.
-- - Les clés sont une API permanente : ne jamais les renommer ni les réutiliser.
-- - progress_kind : « binary » pour un succès qui se débloque d'un coup (le jeu envoie « unlock »), « high_watermark »
--   pour un succès compté (le jeu envoie un total avec « set », la base garde le plus haut).
-- - first-crush, gaining-traction et worldwide-trend existent déjà : « on conflict » les laisse tels quels.
insert into public.achievement_definitions (
  game_key, achievement_key, title, description, icon_key,
  progress_kind, goal, max_increment, points, is_hidden, sort_order
) values
${rows.join(',\n')}
on conflict (game_key, achievement_key) do nothing;
`);
