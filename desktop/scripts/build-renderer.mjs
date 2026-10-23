// Builds the game page of the desktop app from the shared game sources (../../src), fully offline:
// Preact + htm, the fonts and the ChatGPT marks are copied next to it. Nothing is loaded from the internet.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const game = join(root, '..', 'src');
const out = join(root, 'renderer');
const NM = join(root, 'node_modules');
const read = (p) => readFileSync(p, 'utf8');

rmSync(out, { recursive: true, force: true });
for (const d of ['', 'vendor', 'fonts', 'brand']) mkdirSync(join(out, d), { recursive: true });

// the photo pack's list goes into the page (its images are copied next to it below, in pack/)
const PACK = process.env.HYPE_PACK_DIR || join(root, '..', 'assets', 'pack');
function photosJs() {
  const src = read(join(game, 'photos.js'));
  const marker = '{ v: 1, people: [] } /*@pack*/';
  if (!src.includes(marker)) throw new Error('photos.js: pack marker missing');
  const man = join(PACK, 'manifest.json');
  return existsSync(man) ? src.replace(marker, JSON.stringify({ v: 1, people: JSON.parse(read(man)).people })) : src;
}
// the game: the same files as the Claude version, in the same order
const core = read(join(game, 'core.js')).replace("'use strict';\n", '');
const js = "(function () {\n'use strict';\n"
  + "if (!window.htmPreact) { document.getElementById('app').innerHTML = '<p style=\"padding:24px;font:16px system-ui\">Le jeu n’a pas pu se charger. Réinstalle Hype.</p>'; return; }\n"
  + core + '\n' + read(join(game, 'ai.js')) + '\n' + read(join(game, 'career.js')) + '\n' + read(join(game, 'trust.js')) + '\n' + read(join(game, 'standing.js')) + '\n' + read(join(game, 'hearts.js')) + '\n' + read(join(game, 'whispers.js')) + '\n' + read(join(game, 'train.js')) + '\n' + read(join(game, 'emoji-data.js')) + '\n' + read(join(game, 'emojis.js')) + '\n' + read(join(game, 'secrets.js')) + '\n' + read(join(game, 'dilemmas.js')) + '\n' + read(join(game, 'visits.js')) + '\n' + read(join(game, 'gear.js')) + '\n' + read(join(game, 'devis.js')) + '\n' + read(join(game, 'scams.js')) + '\n' + read(join(game, 'commu.js')) + '\n' + read(join(game, 'merch.js')) + '\n' + read(join(game, 'agency.js')) + '\n' + read(join(game, 'roles.js')) + '\n' + read(join(game, 'social.js')) + '\n' + read(join(game, 'toxic.js')) + '\n' + read(join(game, 'traitors.js')) + '\n' + read(join(game, 'romance.js')) + '\n' + read(join(game, 'temps.js')) + '\n' + read(join(game, 'traits.js')) + '\n' + read(join(game, 'stalkers.js')) + '\n' + read(join(game, 'studio.js')) + '\n' + read(join(game, 'montage.js')) + '\n' + read(join(game, 'services.js')) + '\n' + read(join(game, 'skills.js')) + '\n' + read(join(game, 'arcade.js')) + '\n' + read(join(game, 'inventory.js')) + '\n' + read(join(game, 'ach-icons.js')) + '\n' + read(join(game, 'succes.js')) + '\n' + read(join(game, 'prod.js')) + '\n' + photosJs() + '\n' + read(join(game, 'media.js')) + '\n' + read(join(game, 'ui.js')) + '\n})();\n';
writeFileSync(join(out, 'game.js'), js);
writeFileSync(join(out, 'style.css'), read(join(game, 'style.css')));
copyFileSync(join(root, 'lib', 'host-adapter.js'), join(out, 'host-adapter.js'));
copyFileSync(join(NM, 'htm', 'preact', 'standalone.umd.js'), join(out, 'vendor', 'preact.umd.js'));
copyFileSync(join(NM, 'htm', 'LICENSE'), join(out, 'vendor', 'htm-LICENSE.txt'));

// fonts: Latin and Latin Extended only, woff2 only
const FONTS = { onest: [400, 500, 600, 700], unbounded: [600, 700, 800], 'martian-mono': [400, 600] };
let css = '';
for (const [pkg, weights] of Object.entries(FONTS)) {
  const dir = join(NM, '@fontsource', pkg);
  copyFileSync(join(dir, 'LICENSE'), join(out, 'fonts', `${pkg}-OFL.txt`));
  for (const w of weights) {
    const all = read(join(dir, `${w}.css`));
    const re = /\/\* ([a-z-]+)-(latin|latin-ext)-(\d+)-normal \*\/\s*(@font-face \{[^}]+\})/g;
    for (let m; (m = re.exec(all));) {
      const file = `${m[1]}-${m[2]}-${m[3]}-normal.woff2`;
      copyFileSync(join(dir, 'files', file), join(out, 'fonts', file));
      css += `/* ${file} */\n` + m[4].replace(/src: [^;]+;/, `src: url(./${file}) format('woff2');`) + '\n';
    }
  }
}
writeFileSync(join(out, 'fonts', 'fonts.css'), css);

// the photo pack (made by tools/pack.py from the creator's export), when there is one
if (existsSync(join(PACK, 'manifest.json'))) {
  mkdirSync(join(out, 'pack'), { recursive: true });
  for (const f of readdirSync(PACK)) if (/^[\w.-]+\.(webp|jpe?g|png)$/i.test(f)) copyFileSync(join(PACK, f), join(out, 'pack', f));
}

// the ChatGPT marks for « Continuer avec ChatGPT » and the plan indicator (OpenAI brand guidelines apply)
copyFileSync(join(root, 'assets', 'brand', 'chatgpt-black.svg'), join(out, 'brand', 'chatgpt-black.svg'));
copyFileSync(join(root, 'assets', 'brand', 'chatgpt-white.svg'), join(out, 'brand', 'chatgpt-white.svg'));

writeFileSync(join(out, 'index.html'), `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Hype</title>
<link rel="stylesheet" href="fonts/fonts.css">
<link rel="stylesheet" href="style.css">
</head>
<body>
<div id="app"></div>
<script src="vendor/preact.umd.js"></script>
<script src="host-adapter.js"></script>
<script src="game.js"></script>
</body>
</html>
`);
console.log('renderer built →', out, Math.round(js.length / 1024) + ' KB of game');
