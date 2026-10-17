#!/usr/bin/env python3
"""The photo pack shipped with the game, made from the file the creator exports in the « Atelier photos »
(format « hype-pack »: people, their profile photo, their photos, labels and descriptions, images inside).

    python3 tools/pack.py hype-pack-photos-2026-10-20.json            # → assets/pack/
    python3 tools/pack.py export.json --out /tmp/pack                   # somewhere else (tests)

Writes one image file per photo (as the atelier made it: 720 × 900, WebP when the computer could) and
manifest.json, which build.py and desktop/scripts/build-renderer.mjs write into the game. The images are then
published next to the page, in pack/ (the Claude version) and copied into the app (the ChatGPT version).
"""
import argparse
import base64
import json
import pathlib
import re
import sys

ID = re.compile(r'^[a-z0-9][a-z0-9-]{0,30}$')
DATA = re.compile(r'^data:image/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$')
FILE = re.compile(r'^[\w.-]+\.(webp|jpe?g|png)$', re.I)
# the same lists as src/photos.js
SEASONS = {'all', 'ete', 'hiver', 'mi'}
MOMENTS = {'all', 'jour', 'soir'}
# a pack made with the 0.8.0 atelier had fixed labels: they become tags
OLD_PLACES = {'selfie': 'selfie', 'tenue': 'tenue', 'maison': 'maison', 'cafe': 'café', 'resto': 'resto', 'soiree': 'soirée', 'amis': 'amis', 'sport': 'sport',
              'plage': 'plage', 'nature': 'nature', 'ville': 'ville', 'voyage': 'voyage', 'travail': 'travail', 'concert': 'concert'}
OLD_OCCS = {'halloween': 'halloween', 'noel': 'noël', 'nouvelan': 'nouvel an', 'valentin': 'saint-valentin'}
DESC_MAX, PROFILE_MAX, TAG_MAX = 300, 300, 12
STYLES = {'moderne', 'magie', 'scifi', 'cyber', 'fantasy'}
GOAL = {'f': 7, 'm': 6, 'x': 2, 'photos': 9}
EXT = {'webp': 'webp', 'jpeg': 'jpg', 'png': 'png'}
MAGIC = {
    'webp': lambda b: b[:4] == b'RIFF' and b[8:12] == b'WEBP',
    'jpeg': lambda b: b[:3] == b'\xff\xd8\xff',
    'png': lambda b: b[:8] == b'\x89PNG\r\n\x1a\n',
}


def text(v, n):
    return re.sub(r'\s+', ' ', v if isinstance(v, str) else '').strip()[:n]


def main():
    ap = argparse.ArgumentParser(description='Le pack photos de Hype, à partir de l’export de l’Atelier photos.')
    ap.add_argument('export', help='le fichier exporté par l’atelier (format hype-pack)')
    ap.add_argument('--out', default=str(pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'pack'))
    a = ap.parse_args()
    src = json.loads(pathlib.Path(a.export).read_text(encoding='utf-8'))
    if not isinstance(src, dict) or src.get('format') != 'hype-pack' or not isinstance(src.get('people'), list):
        sys.exit('Ce fichier n’est pas un pack photos Hype (format « hype-pack »).')
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    for f in out.iterdir():  # the previous pack goes (only its own files)
        if f.is_file() and (FILE.match(f.name) or f.name == 'manifest.json'):
            f.unlink()
    warnings, size = [], 0

    def image(data, name):
        nonlocal size
        m = DATA.match(data or '') if isinstance(data, str) else None
        if not m:
            return None
        kind, b64 = m.groups()
        raw = base64.b64decode(b64)
        if not MAGIC[kind](raw) or len(raw) > 1_500_000:
            warnings.append(f'{name} : image illisible ou trop lourde, ignorée')
            return None
        fname = f'{name}.{EXT[kind]}'
        (out / fname).write_bytes(raw)
        size += len(raw)
        return fname

    people, seen = [], set()
    for x in src['people']:
        pid = x.get('id') if isinstance(x, dict) else None
        if not isinstance(pid, str) or not ID.match(pid) or pid in seen:
            warnings.append(f'personne ignorée (identifiant invalide ou en double) : {pid!r}')
            continue
        seen.add(pid)
        person = {
            'id': pid, 'g': x.get('g') if x.get('g') in ('f', 'm', 'x') else 'x',
            'style': x.get('style') if x.get('style') in STYLES else 'moderne',
            'label': text(x.get('label'), 30), 'look': text(x.get('look'), 60), 'profile': text(x.get('profile'), PROFILE_MAX),
            'portrait': image(x.get('portrait'), pid + '-p'), 'photos': [],
        }
        if not person['portrait']:
            warnings.append(f'{person["label"] or pid} : pas de photo de profil')
        if not person['profile']:
            warnings.append(f'{person["label"] or pid} : pas de profil (l’IA choisira ce visage au hasard)')
        for y in x.get('photos') or []:
            phid = y.get('id') if isinstance(y, dict) else None
            if not isinstance(phid, str) or not ID.match(phid) or not phid.startswith(pid + '-'):
                continue
            file = image(y.get('img'), phid)
            if not file:
                continue
            tags = y.get('tags') if isinstance(y.get('tags'), list) else [OLD_PLACES.get(k) for k in y.get('places') or []] + [OLD_OCCS.get(k) for k in y.get('occ') or []]
            tags = [t for t in dict.fromkeys(text(t, 24).lstrip('#').lower() for t in tags if isinstance(t, str)) if t][:TAG_MAX]
            ph = {
                'id': phid, 'file': file,
                'season': y.get('season') if y.get('season') in SEASONS else 'all',
                'moment': y.get('moment') if y.get('moment') in MOMENTS else 'all',
                'set': y.get('set') if isinstance(y.get('set'), str) and re.match(r'^s\d{1,3}$', y.get('set')) else '',
                'tags': tags,
                'desc': text(y.get('desc'), DESC_MAX),
            }
            if not ph['desc']:
                warnings.append(f'{person["label"] or pid} : la photo {phid} n’a pas de description')
            if not ph['tags']:
                warnings.append(f'{person["label"] or pid} : la photo {phid} n’a pas de tag')
            person['photos'].append(ph)
        sets = {}
        for ph in person['photos']:
            if ph['set']:
                sets.setdefault(ph['set'], []).append(ph)
        for k, grp in sets.items():
            if len(grp) < 2:
                grp[0]['set'] = ''  # a series of one photo is just a photo
        if len(person['photos']) < GOAL['photos']:
            warnings.append(f'{person["label"] or pid} : {len(person["photos"])} photos (objectif : {GOAL["photos"]})')
        people.append(person)

    (out / 'manifest.json').write_text(json.dumps({'v': 2, 'made': src.get('made'), 'people': people}, ensure_ascii=False, indent=1), encoding='utf-8')
    by = {k: sum(1 for p in people if p['g'] == k) for k in 'fmx'}
    n = sum(len(p['photos']) for p in people)
    pl = lambda k, one, many: f'{k} {one if k < 2 else many}'
    print(f'Pack : {pl(len(people), "personne", "personnes")} ({pl(by["f"], "femme", "femmes")}, {pl(by["m"], "homme", "hommes")}, {by["x"]} au look androgyne), {pl(n, "photo", "photos")}, {size / 1e6:.1f} Mo → {out}')
    for k, lb in (('f', 'femmes'), ('m', 'hommes'), ('x', 'personnes au look androgyne')):
        if by[k] < GOAL[k]:
            print(f'  à compléter : {GOAL[k] - by[k]} {lb} de plus pour couvrir toutes les parties')
    for w in warnings:
        print('  ⚠', w)


if __name__ == '__main__':
    main()
