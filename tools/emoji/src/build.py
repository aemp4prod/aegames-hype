#!/usr/bin/env python3
"""Build the sticker set: svg/<id>.svg for every subject (+ index.json when all are present)."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from stk import Sticker
import faces

REG = list(faces.FACES)
for mod in ('hands', 'symbols'):
    try:
        m = __import__(mod)
        REG += getattr(m, mod.upper())
    except ImportError:
        pass


def build(only=None):
    os.makedirs(os.path.join(ROOT, 'svg'), exist_ok=True)
    total = 0
    sizes = []
    for name, fn in REG:
        if only and name not in only:
            continue
        p = Sticker(name)
        fn(p)
        svg = p.svg()
        with open(os.path.join(ROOT, 'svg', name + '.svg'), 'w') as fh:
            fh.write(svg)
        sizes.append((len(svg.encode()), name))
        total += len(svg.encode())
    return sizes, total


if __name__ == '__main__':
    only = sys.argv[1:] or None
    sizes, total = build(only)
    for b, n in sorted(sizes, reverse=True)[:8]:
        print('%6d %s' % (b, n))
    print('files %d  total %d B  avg %.0f B' % (len(sizes), total, total / max(1, len(sizes))))
