import json, os, pathlib
root = pathlib.Path(__file__).parent
css = (root / 'src/style.css').read_text()
core = (root / 'src/core.js').read_text().replace("'use strict';\n", '', 1)
ai = (root / 'src/ai.js').read_text()
career = (root / 'src/career.js').read_text()
trust = (root / 'src/trust.js').read_text()
standing = (root / 'src/standing.js').read_text()
hearts = (root / 'src/hearts.js').read_text()
whispers = (root / 'src/whispers.js').read_text()
train = (root / 'src/train.js').read_text()
emojis = (root / 'src/emoji-data.js').read_text() + '\n' + (root / 'src/emojis.js').read_text()
secrets = (root / 'src/secrets.js').read_text() + '\n' + (root / 'src/dilemmas.js').read_text() + '\n' + (root / 'src/visits.js').read_text() + '\n' + (root / 'src/gear.js').read_text() + '\n' + (root / 'src/devis.js').read_text() + '\n' + (root / 'src/scams.js').read_text() + '\n' + (root / 'src/commu.js').read_text() + '\n' + (root / 'src/merch.js').read_text()
studio = (root / 'src/studio.js').read_text()
montage = (root / 'src/montage.js').read_text() + '\n' + (root / 'src/services.js').read_text() + '\n' + (root / 'src/skills.js').read_text() + '\n' + (root / 'src/arcade.js').read_text() + '\n' + (root / 'src/inventory.js').read_text()  # 0.23: the services after the edit and the thumbnail they reuse; 0.24: the skills, the purchases
photos = (root / 'src/photos.js').read_text()
media = (root / 'src/media.js').read_text()
ui = (root / 'src/ui.js').read_text()
# The photo pack's list goes into the page; its images are published next to it, in pack/ (tools/pack.py makes both).
pack = pathlib.Path(os.environ.get('HYPE_PACK_DIR') or (root / 'assets/pack'))
marker = '{ v: 1, people: [] } /*@pack*/'
assert marker in photos
if (pack / 'manifest.json').exists():
    people = json.loads((pack / 'manifest.json').read_text())['people']
    photos = photos.replace(marker, json.dumps({'v': 1, 'people': people}, ensure_ascii=False))
    print('pack:', len(people), 'people,', sum(len(p['photos']) for p in people), 'photos')
js = (
    "(function () {\n'use strict';\n"
    "if (!window.htmPreact) { document.getElementById('app').innerHTML = '<p style=\"padding:24px;font:16px system-ui\">Le jeu n’a pas pu se charger. Vérifie ta connexion puis recharge la page.</p>'; return; }\n"
    + core + "\n" + ai + "\n" + career + "\n" + trust + "\n" + standing + "\n" + hearts + "\n" + whispers + "\n" + train + "\n" + emojis + "\n" + secrets + "\n" + studio + "\n" + montage + "\n" + photos + "\n" + media + "\n" + ui + "\n})();\n"
)
page = f'''<title>Hype</title>
<meta name="description" content="Un jeu de réseau social simulé : tout le monde est une IA, sauf toi.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Martian+Mono:wght@400;600&family=Onest:wght@400;500;600;700&family=Unbounded:wght@600;700;800&display=swap">
<style>
{css}
</style>
<div id="app"></div>
<script src="https://cdn.jsdelivr.net/npm/htm@3.1.1/preact/standalone.umd.js"></script>
<script>
{js}
</script>
'''
(pathlib.Path(os.environ.get('HYPE_OUT') or (root / 'hype.html'))).write_text(page)
print('built', len(page.encode()), 'bytes')
