#!/usr/bin/env python3
"""0.27: build the second batch's stickers (svg/<id>.svg), the first set's code untouched."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from stk import Sticker
REG = []
for mod, name in (('objets', 'OBJETS'), ('objets2', 'OBJETS'), ('faces2', 'FACES2'), ('mains2', 'MAINS2'), ('coeurs2', 'COEURS2'), ('symboles2', 'SYMBOLES2')):
    try:
        m = __import__(mod)
    except ImportError:
        continue
    for k in sorted(x for x in dir(m) if x.startswith(name)):
        REG += getattr(m, k)
only = sys.argv[1:] or None
n = 0
for name, fn in REG:
    if only and name not in only:
        continue
    p = Sticker(name)
    fn(p)
    open(os.path.join(ROOT, 'svg', name + '.svg'), 'w').write(p.svg())
    n += 1
print('built', n, 'stickers:', ','.join(x for x, _ in REG if not only or x in only))
