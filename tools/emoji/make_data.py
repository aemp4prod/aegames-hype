#!/usr/bin/env python3
"""Writes src/emoji-data.js (the game's sticker emojis) from the drawings in svg/, in the order of the catalogs, and
refreshes the Minotaur of the train (src/train.js).

    python3 tools/emoji/src/build.py      # the 67 stickers of the 0.17 (and the Minotaur) → tools/emoji/svg/
    python3 tools/emoji/src/build2.py     # the 57 of the 0.27 → tools/emoji/svg/
    python3 tools/emoji/make_data.py      # → src/emoji-data.js
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
GAME = HERE.parent.parent / 'src'
sys.path.insert(0, str(HERE / 'src'))
from catalog import CATALOG  # noqa: E402
from catalog2 import CATALOG2  # noqa: E402

rows = []
for (eid, char, name, tags, cat) in CATALOG + CATALOG2:
    svg = (HERE / 'svg' / (eid + '.svg')).read_text(encoding='utf-8').strip().replace('\n', '')
    assert '`' not in svg and '${' not in svg, eid
    rows.append([eid, char, name, tags, cat, svg])
assert len({r[0] for r in rows}) == len(rows), 'an id twice'
assert len({r[1].replace('️', '') for r in rows}) == len(rows), 'an emoji twice'
head = ('/* =========================================================\n'
        '   The game\'s own emojis: %d original stickers (67 in the 0.17, the rest in the 0.27), style « Autocollant »\n'
        '   (generated from the emoji set, do not edit by hand). [id, emoji, name, tags for the search, category, svg]\n'
        '   ========================================================= */\n') % len(rows)
body = 'const EMOS = [\n' + ',\n'.join('  ' + json.dumps(r[:5], ensure_ascii=False)[:-1] + ', `' + r[5] + '`]' for r in rows) + ',\n];\n'
(GAME / 'emoji-data.js').write_text(head + body, encoding='utf-8')
(HERE / 'index.json').write_text(json.dumps([{'id': r[0], 'char': r[1], 'name': r[2], 'tags': r[3], 'cat': r[4]} for r in rows], ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
mino = (HERE / 'svg' / 'minotaure.svg').read_text(encoding='utf-8').strip().replace('\n', '')
assert '`' not in mino and '${' not in mino
train = (GAME / 'train.js').read_text(encoding='utf-8')
train = re.sub(r"const MINO_SVG = `.*?`;", lambda m: 'const MINO_SVG = `' + mino + '`;', train, count=1, flags=re.S)
(GAME / 'train.js').write_text(train, encoding='utf-8')
print('emoji-data.js', len(head + body), 'bytes;', len(rows), 'emojis')
