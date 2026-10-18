"""Flat 'Autocollant' sticker painter: compact, self-contained SVG with file-prefixed ids.

Geometry comes in as geom.Path (absolute M/L/Q/C/Z) or Ell (ellipse); the current transform is applied,
then everything is written with 1-decimal numbers and the shorter of absolute/relative path commands.
"""
import math
from geom import Path, compose, tr, sc, rot, flipx, ap, K, arc_segs

INK = '#1D1419'
BORDER = 7.0          # white die-cut border, in final 128-unit space
SCALE = 0.86          # artwork is drawn on a 128 grid and shrunk to leave room for the border
SHADOW = (INK, .3, 1.6, 2.0)    # colour, opacity, blur, dy  (final units)
EDGE = (INK, .2, 1.2)           # faint hairline outside the white border: colour, opacity, width


# ------------------------------------------------------------------ numbers
def t10(v):
    return int(round(v * 10))


def num(t):
    neg = t < 0
    t = abs(t)
    s = str(t // 10) if t % 10 == 0 else '%d.%d' % (t // 10, t % 10)
    if s.startswith('0.'):
        s = s[1:]
    return ('-' + s) if neg and s != '0' else s


def n1(v):
    return num(t10(v))


def join_tokens(tokens):
    out = []
    prev = None
    for tok in tokens:
        if prev is not None and not tok[0].isalpha() and not prev[0].isalpha():
            if not (tok[0] == '-' or (tok[0] == '.' and '.' in prev)):
                out.append(' ')
        out.append(tok)
        prev = tok
    return ''.join(out)


def minify(path):
    """Compact 'd' for a geom.Path: 1 decimal, relative/absolute per segment, implicit repeats, H/V."""
    tokens = []
    cur = (0, 0)
    start = (0, 0)
    last_cmd = None
    for c, pts in path.segs:
        P = [(t10(x), t10(y)) for x, y in pts]
        if c == 'Z':
            tokens.append('z')
            cur = start
            last_cmd = 'z'
            continue
        if c == 'M':
            a = P[0]
            rel = (a[0] - cur[0], a[1] - cur[1])
            sa = [num(a[0]), num(a[1])]
            sr = [num(rel[0]), num(rel[1])]
            if last_cmd is None or len(''.join(sa)) <= len(''.join(sr)):
                tokens += ['M'] + sa
                last_cmd = 'M'
            else:
                tokens += ['m'] + sr
                last_cmd = 'm'
            cur = start = a
            continue
        end = P[-1]
        cands = []
        if c == 'L':
            if end[1] == cur[1]:
                cands.append(('H', [num(end[0])]))
                cands.append(('h', [num(end[0] - cur[0])]))
            elif end[0] == cur[0]:
                cands.append(('V', [num(end[1])]))
                cands.append(('v', [num(end[1] - cur[1])]))
            else:
                cands.append(('L', [num(end[0]), num(end[1])]))
                cands.append(('l', [num(end[0] - cur[0]), num(end[1] - cur[1])]))
        else:
            ab = []
            rl = []
            for x, y in P:
                ab += [num(x), num(y)]
                rl += [num(x - cur[0]), num(y - cur[1])]
            cands.append((c, ab))
            cands.append((c.lower(), rl))

        def cost(cmd, nums):
            implicit = cmd == last_cmd or (cmd == 'l' and last_cmd == 'm') or (cmd == 'L' and last_cmd == 'M')
            return len(join_tokens(([] if implicit else [cmd]) + nums)) + (0 if implicit else 0), implicit

        best = None
        for cmd, nums in cands:
            k, imp = cost(cmd, nums)
            if best is None or k < best[0]:
                best = (k, cmd, nums, imp)
        _, cmd, nums, imp = best
        if not imp:
            tokens.append(cmd)
        tokens += nums
        last_cmd = cmd
        cur = end
    return join_tokens(tokens)


# ------------------------------------------------------------------ shapes
class Ell:
    """Ellipse that stays an <ellipse>/<circle> under similarity transforms."""

    def __init__(self, cx, cy, rx, ry=None, rotd=0.0):
        self.cx, self.cy, self.rx = cx, cy, rx
        self.ry = rx if ry is None else ry
        self.rotd = rotd

    def path(self):
        cx, cy, rx, ry = self.cx, self.cy, self.rx, self.ry
        p = (Path().M(cx + rx, cy)
             .C(cx + rx, cy + K * ry, cx + K * rx, cy + ry, cx, cy + ry)
             .C(cx - K * rx, cy + ry, cx - rx, cy + K * ry, cx - rx, cy)
             .C(cx - rx, cy - K * ry, cx - K * rx, cy - ry, cx, cy - ry)
             .C(cx + K * rx, cy - ry, cx + rx, cy - K * ry, cx + rx, cy).Z())
        return p.t(rot(self.rotd, cx, cy)) if self.rotd else p

    def t(self, m):
        a, b, c, d, e, f = m
        # similarity: columns orthogonal and of equal length
        s1 = math.hypot(a, b)
        s2 = math.hypot(c, d)
        if abs(s1 - s2) > 1e-6 or abs(a * c + b * d) > 1e-6:
            return self.path().t(m)
        cx, cy = ap(m, (self.cx, self.cy))
        det = a * d - b * c
        ang = math.degrees(math.atan2(b, a))
        rotd = (self.rotd + ang) if det > 0 else (ang - self.rotd)
        return Ell(cx, cy, self.rx * s1, self.ry * s1, rotd)

    def el(self, attrs=''):
        rd = self.rotd % 180
        if abs(self.rx - self.ry) < 0.05:
            return '<circle cx="%s" cy="%s" r="%s"%s/>' % (n1(self.cx), n1(self.cy), n1(self.rx), attrs)
        if abs(rd) < 0.5 or abs(rd - 180) < 0.5:
            return '<ellipse cx="%s" cy="%s" rx="%s" ry="%s"%s/>' % (n1(self.cx), n1(self.cy), n1(self.rx), n1(self.ry), attrs)
        if abs(rd - 90) < 0.5:
            return '<ellipse cx="%s" cy="%s" rx="%s" ry="%s"%s/>' % (n1(self.cx), n1(self.cy), n1(self.ry), n1(self.rx), attrs)
        return '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" transform="rotate(%s %s %s)"%s/>' % (
            n1(self.cx), n1(self.cy), n1(self.rx), n1(self.ry), n1(self.rotd), n1(self.cx), n1(self.cy), attrs)

    def shifted(self, dx, dy):
        return Ell(self.cx + dx, self.cy + dy, self.rx, self.ry, self.rotd)


def path_el(p, attrs=''):
    return '<path d="%s"%s/>' % (minify(p), attrs)


def el_of(g, attrs=''):
    return g.el(attrs) if isinstance(g, Ell) else path_el(g, attrs)


def shift(g, dx, dy):
    return g.shifted(dx, dy) if isinstance(g, Ell) else g.t(tr(dx, dy))


def A(**kw):
    out = ''
    for k, v in kw.items():
        if v is None:
            continue
        k = k.rstrip('_').replace('_', '-')
        if isinstance(v, float):
            v = n1(v)
        out += ' %s="%s"' % (k, v)
    return out


# ------------------------------------------------------------------ painter
class Sticker:
    def __init__(self, name):
        self.name = name
        self.k = 0
        self.defs = []
        self.art = []
        self.sil = []
        self.m = sc(SCALE, SCALE, 64, 64)   # shrink baked into the coordinates (no transform group)
        self.stack = []

    def nid(self):
        self.k += 1
        return '%s-%d' % (self.name, self.k)   # digits only: never equal to the '-s' / '-f' ids

    @staticmethod
    def _b36(n):
        s = ''
        while True:
            n, r = divmod(n, 36)
            s = '0123456789abcdefghijklmnopqrstuvwxyz'[r] + s
            if n == 0:
                return s

    # transforms
    def push(self, m):
        self.stack.append(self.m)
        self.m = compose(self.m, m)

    def pop(self):
        self.m = self.stack.pop()

    def T(self, g):
        return g.t(self.m)

    def scale(self):
        a, b, c, d, e, f = self.m
        return abs(a * d - b * c) ** .5

    # shape handle: inline or shared through <defs>
    def _handle(self, g, uses):
        """Return a function attrs -> element string, defining g once if it is reused."""
        if isinstance(g, Ell) or uses < 2:
            return lambda attrs='', gg=g: el_of(gg, attrs)
        i = self.nid()
        self.defs.append(path_el(g, ' id="%s"' % i))
        return lambda attrs='', i=i: '<use href="#%s"%s/>' % (i, attrs)

    def add(self, g, fill, sil=False, tone=None, opacity=None):
        """Fill a shape. tone=(shade, dx, dy): flat two-tone (shade shows where the shifted base does not cover)."""
        g = self.T(g)
        uses = (1 if sil else 0) + (3 if tone else 1)
        h = self._handle(g, uses)
        if sil:
            self.sil.append(h(''))
        if tone:
            shade, dx, dy = tone
            self.art.append(h(A(fill=shade, opacity=opacity)))
            cid = self.nid()
            self.defs.append('<clipPath id="%s">%s</clipPath>' % (cid, h('')))
            if isinstance(g, Ell):
                inner = el_of(g.shifted(dx, dy), A(fill=fill))
            elif h('').startswith('<use'):
                inner = h(A(fill=fill, x=float(dx) if dx else None, y=float(dy) if dy else None))
            else:
                inner = el_of(shift(g, dx, dy), A(fill=fill))
            self.art.append('<g clip-path="url(#%s)">%s</g>' % (cid, inner))
        else:
            self.art.append(h(A(fill=fill, opacity=opacity)))
        return g

    def add_clip(self, g, fill, sil=False):
        """Paint a shape and open a clip group with the same shape (call clip_end() after the inner parts)."""
        g = self.T(g)
        h = self._handle(g, 2 + (1 if sil else 0))
        if sil:
            self.sil.append(h(''))
        self.art.append(h(A(fill=fill)))
        cid = self.nid()
        self.defs.append('<clipPath id="%s">%s</clipPath>' % (cid, h('')))
        self.art.append('<g clip-path="url(#%s)">' % cid)
        return g

    def sil_add(self, g):
        self.sil.append(el_of(self.T(g)))

    def line(self, p, color, w, cap='round', join='round', opacity=None, sil=False):
        p = self.T(p)
        w = w * self.scale()
        closed = isinstance(p, Ell)
        self.art.append(el_of(p, A(fill='none', stroke=color, stroke_width=float(w),
                                   stroke_linecap=None if closed else cap,
                                   stroke_linejoin=None if closed else join, opacity=opacity)))
        if sil:
            self.sil.append(el_of(p, A(fill='none', stroke_width=float(w + 2 * BORDER))))

    def clip_start(self, g):
        g = self.T(g)
        cid = self.nid()
        self.defs.append('<clipPath id="%s">%s</clipPath>' % (cid, el_of(g)))
        self.art.append('<g clip-path="url(#%s)">' % cid)

    def clip_end(self):
        self.art.append('</g>')

    def raw(self, s):
        self.art.append(s)

    # output
    def svg(self):
        n = self.name
        bw = 2 * BORDER
        scol, sop, sblur, sdy = SHADOW
        ecol, eop, ew = EDGE
        defs = ''.join(self.defs)
        defs += '<g id="%s-s" stroke-linejoin="round">%s</g>' % (n, ''.join(self.sil))
        defs += ('<filter id="%s-f" x="-.2" y="-.2" width="1.4" height="1.5">'
                 '<feGaussianBlur stdDeviation="%s"/></filter>' % (n, n1(sblur)))
        body = ('<use href="#{n}-s" fill="{s}" stroke="{s}" stroke-width="{bw}" opacity="{so}" filter="url(#{n}-f)" y="{dy}"/>'
                '<use href="#{n}-s" fill="{e}" stroke="{e}" stroke-width="{ew}" opacity="{eo}"/>'
                '<use href="#{n}-s" fill="#fff" stroke="#fff" stroke-width="{bw}"/>').format(
            n=n, s=scol, bw=n1(bw), so=n1(sop), dy=n1(sdy), e=ecol, ew=n1(bw + 2 * ew), eo=n1(eop))
        return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">'
                '<defs>%s</defs>%s%s</svg>' % (defs, body, ''.join(self.art)))
