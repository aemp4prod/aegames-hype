"""Tiny geometry kit: absolute-coordinate paths that can be transformed by an affine matrix.

Everything is built from M/L/Q/C/Z so that rotations and scalings stay exact (no SVG arcs).
Matrices use the SVG convention (a, b, c, d, e, f): x' = a*x + c*y + e, y' = b*x + d*y + f.
"""
import math

K = 0.5522847498  # cubic approximation of a quarter circle


def fmt(v):
    s = ('%.2f' % v).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '', '-') else s


# ---------------------------------------------------------------- affine
def mul(m1, m2):
    a1, b1, c1, d1, e1, f1 = m1
    a2, b2, c2, d2, e2, f2 = m2
    return (a1 * a2 + c1 * b2, b1 * a2 + d1 * b2,
            a1 * c2 + c1 * d2, b1 * c2 + d1 * d2,
            a1 * e2 + c1 * f2 + e1, b1 * e2 + d1 * f2 + f1)


def compose(*ms):
    """compose(A, B, C) applies C first, then B, then A."""
    m = (1, 0, 0, 1, 0, 0)
    for x in ms:
        m = mul(m, x)
    return m


def tr(dx, dy):
    return (1, 0, 0, 1, dx, dy)


def sc(sx, sy=None, cx=0.0, cy=0.0):
    sy = sx if sy is None else sy
    return compose(tr(cx, cy), (sx, 0, 0, sy, 0, 0), tr(-cx, -cy))


def rot(deg, cx=0.0, cy=0.0):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return compose(tr(cx, cy), (c, s, -s, c, 0, 0), tr(-cx, -cy))


def flipx(cx=64.0):
    return (-1, 0, 0, 1, 2 * cx, 0)


def ap(m, p):
    a, b, c, d, e, f = m
    x, y = p
    return (a * x + c * y + e, b * x + d * y + f)


# ---------------------------------------------------------------- path
class Path:
    def __init__(self, segs=None):
        self.segs = list(segs or [])

    def M(self, x, y):
        self.segs.append(('M', [(x, y)]))
        return self

    def L(self, x, y):
        self.segs.append(('L', [(x, y)]))
        return self

    def Q(self, x1, y1, x, y):
        self.segs.append(('Q', [(x1, y1), (x, y)]))
        return self

    def C(self, x1, y1, x2, y2, x, y):
        self.segs.append(('C', [(x1, y1), (x2, y2), (x, y)]))
        return self

    def Z(self):
        self.segs.append(('Z', []))
        return self

    def cur(self):
        start = None
        cur = None
        for c, pts in self.segs:
            if c == 'M':
                start = cur = pts[0]
            elif c == 'Z':
                cur = start
            else:
                cur = pts[-1]
        return cur

    def H(self, x):
        return self.L(x, self.cur()[1])

    def V(self, y):
        return self.L(self.cur()[0], y)

    def extend(self, segs):
        self.segs.extend(segs)
        return self

    def t(self, m):
        return Path([(c, [ap(m, p) for p in pts]) for c, pts in self.segs])

    def __add__(self, o):
        return Path(self.segs + o.segs)

    def reversed_open(self):
        """Reverse an open path made of one M followed by L/Q/C segments."""
        pts = []  # list of (cmd, controls, end)
        cur = None
        start = None
        for c, p in self.segs:
            if c == 'M':
                cur = p[0]
                start = cur
            else:
                pts.append((c, p[:-1], cur, p[-1]))
                cur = p[-1]
        out = Path().M(*cur)
        for c, ctrl, a, b in reversed(pts):
            if c == 'L':
                out.L(*a)
            elif c == 'Q':
                out.Q(ctrl[0][0], ctrl[0][1], *a)
            elif c == 'C':
                out.C(ctrl[1][0], ctrl[1][1], ctrl[0][0], ctrl[0][1], *a)
        return out

    @property
    def d(self):
        out = []
        for c, pts in self.segs:
            out.append(c + ' '.join(fmt(x) + ' ' + fmt(y) for x, y in pts))
        return ''.join(out)

    def bbox(self):
        xs = [p[0] for _, pts in self.segs for p in pts]
        ys = [p[1] for _, pts in self.segs for p in pts]
        return min(xs), min(ys), max(xs), max(ys)


# ---------------------------------------------------------------- shapes
def ellipse(cx, cy, rx, ry):
    return (Path().M(cx + rx, cy)
            .C(cx + rx, cy + K * ry, cx + K * rx, cy + ry, cx, cy + ry)
            .C(cx - K * rx, cy + ry, cx - rx, cy + K * ry, cx - rx, cy)
            .C(cx - rx, cy - K * ry, cx - K * rx, cy - ry, cx, cy - ry)
            .C(cx + K * rx, cy - ry, cx + rx, cy - K * ry, cx + rx, cy).Z())


def circle(cx, cy, r):
    return ellipse(cx, cy, r, r)


def rrect(x, y, w, h, r):
    r = min(r, w / 2.0, h / 2.0)
    k = K * r
    return (Path().M(x + r, y).L(x + w - r, y)
            .C(x + w - r + k, y, x + w, y + r - k, x + w, y + r)
            .L(x + w, y + h - r)
            .C(x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h)
            .L(x + r, y + h)
            .C(x + r - k, y + h, x, y + h - r + k, x, y + h - r)
            .L(x, y + r)
            .C(x, y + r - k, x + r - k, y, x + r, y).Z())


def arc_segs(cx, cy, r, a0, a1, ry=None):
    """Cubic segments of a circular/elliptic arc from angle a0 to a1 (radians, y-down)."""
    ry = r if ry is None else ry
    n = max(1, int(math.ceil(abs(a1 - a0) / (math.pi / 2) - 1e-9)))
    da = (a1 - a0) / n
    k = 4.0 / 3.0 * math.tan(da / 4.0)
    segs = []
    for i in range(n):
        t0 = a0 + i * da
        t1 = t0 + da
        p0 = (cx + r * math.cos(t0), cy + ry * math.sin(t0))
        p3 = (cx + r * math.cos(t1), cy + ry * math.sin(t1))
        p1 = (p0[0] - k * r * math.sin(t0), p0[1] + k * ry * math.cos(t0))
        p2 = (p3[0] + k * r * math.sin(t1), p3[1] - k * ry * math.cos(t1))
        segs.append(('C', [p1, p2, p3]))
    return segs


def arc(cx, cy, r, a0deg, a1deg, ry=None):
    a0, a1 = math.radians(a0deg), math.radians(a1deg)
    ry = r if ry is None else ry
    p = Path().M(cx + r * math.cos(a0), cy + ry * math.sin(a0))
    return p.extend(arc_segs(cx, cy, r, a0, a1, ry))


def unit_heart():
    """My own plump heart, x in [-1, 1], y from -0.96 (lobes) to 0.92 (tip)."""
    return (Path().M(0, 0.92)
            .C(-0.22, 0.75, -1.0, 0.30, -1.0, -0.30)
            .C(-1.0, -0.72, -0.68, -0.97, -0.34, -0.97)
            .C(-0.13, -0.97, -0.03, -0.83, 0, -0.64)
            .C(0.03, -0.83, 0.13, -0.97, 0.34, -0.97)
            .C(0.68, -0.97, 1.0, -0.72, 1.0, -0.30)
            .C(1.0, 0.30, 0.22, 0.75, 0, 0.92).Z())


def heart_m(cx, cy, w, rotd=0.0):
    return compose(tr(cx, cy), rot(rotd), sc(w / 2.0))


def heart(cx, cy, w, rotd=0.0):
    return unit_heart().t(heart_m(cx, cy, w, rotd))


def drop(px, py, cx, cy, R, belly=0.12):
    """Tear drop: tip at P, round body of radius R centred on C, sides slightly convex."""
    dx, dy = px - cx, py - cy
    d = math.hypot(dx, dy)
    a0 = math.atan2(dy, dx)
    al = math.acos(min(0.999, R / d))
    t1, t2 = a0 + al, a0 - al + 2 * math.pi
    T1 = (cx + R * math.cos(t1), cy + R * math.sin(t1))
    T2 = (cx + R * math.cos(t2), cy + R * math.sin(t2))

    def ctrl(T, t):
        L = math.hypot(T[0] - px, T[1] - py)
        n = (math.cos(t), math.sin(t))                 # outward normal of that side
        u = ((T[0] - px) / L, (T[1] - py) / L)         # tip -> tangent point
        near_tip = (px + u[0] * L * 0.42 + n[0] * belly * L, py + u[1] * L * 0.42 + n[1] * belly * L)
        near_T = (T[0] - u[0] * L * 0.30, T[1] - u[1] * L * 0.30)
        return near_tip, near_T

    a1, b1 = ctrl(T1, t1)
    p = Path().M(px, py).C(a1[0], a1[1], b1[0], b1[1], *T1)
    p.extend(arc_segs(cx, cy, R, t1, t2))
    a2, b2 = ctrl(T2, t2)
    p.C(b2[0], b2[1], a2[0], a2[1], px, py)
    return p.Z()


def capsule(x1, y1, x2, y2, r):
    """Stadium shape between two centre points."""
    a = math.atan2(y2 - y1, x2 - x1)
    n = (math.cos(a + math.pi / 2), math.sin(a + math.pi / 2))
    p = Path().M(x1 + n[0] * r, y1 + n[1] * r).L(x2 + n[0] * r, y2 + n[1] * r)
    p.extend(arc_segs(x2, y2, r, a + math.pi / 2, a - math.pi / 2))
    p.L(x1 - n[0] * r, y1 - n[1] * r)
    p.extend(arc_segs(x1, y1, r, a - math.pi / 2, a - 3 * math.pi / 2))
    return p.Z()
