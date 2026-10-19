#!/usr/bin/env python3
"""0.28.1: the achievements' icons (svg/ach-<key>.svg), one per achievement of src/succes.js, in the same sticker style.
The drawings live in succes_a.py, succes_b.py and succes_c.py (a list SUCCES of (key, function) in each).

    python3 tools/emoji/src/build3.py               # all of them
    python3 tools/emoji/src/build3.py phoenix pigeon  # only these
    python3 tools/emoji/make_ach.py                 # → src/ach-icons.js
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from stk import Sticker
REG = []
for mod in ('succes_a', 'succes_b', 'succes_c'):
    try:
        m = __import__(mod)
    except Exception as e:  # (a module still being drawn does not stop the others)
        if not (isinstance(e, ImportError) and mod in str(e)):
            print('skipping', mod + ':', type(e).__name__, e, file=sys.stderr)
        continue
    REG += list(getattr(m, 'SUCCES', []))
only = sys.argv[1:] or None
n = 0
for key, fn in REG:
    if only and key not in only:
        continue
    p = Sticker('ach-' + key)
    fn(p)
    open(os.path.join(ROOT, 'svg', 'ach-' + key + '.svg'), 'w').write(p.svg())
    n += 1
print('built', n, 'achievement icons:', ','.join(k for k, _ in REG if not only or k in only))
