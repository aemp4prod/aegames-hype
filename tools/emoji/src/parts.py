"""Palette and shared parts for the flat sticker set (style D)."""
import math
from geom import Path, compose, tr, sc, rot, flipx, ap, arc, arc_segs, heart_m, unit_heart, drop, capsule, rrect
from stk import Sticker, Ell, INK

C = dict(
    face='#FFC933', shade='#F4AE1E', feat='#3B2316', mouth='#5C2216', tongue='#FF6E84', white='#fff',
    tear='#4DB6F5', heart='#F43C5E', blush='#FF8FAA',
    skin='#FFC933', skin_s='#F4AC1C', crease='#C97C06', cuff='#5DBDF5', cuff_s='#3FA4E6', nail='#FFEC9E',
    pink='#FF4FA0', pink_s='#E0237A', hot='#D8136F', ink=INK,
    blue='#4DB6F5', blue_s='#2F9BE0', green='#3DBE6B', green_s='#2A9E55', orange='#FF7A1A', orange_s='#E85D0C',
    gold='#FFCB2E', gold_s='#EBA514', purple='#9B5DE5', purple_s='#7E45C8', red='#F25A4A', red_s='#D8423A',
    grey='#E4E8F0', grey_s='#C3CAD8', dark='#343846', dark_s='#22252F',
)
FACE_TONE = (-1.9, -3.8)   # flat two-tone: the base colour is shifted up-left, the shade shows bottom-right


# ------------------------------------------------------------------ geometry helpers
def arc_eye(cx, cy, w, h, kx=.40):
    """Closed happy eye: an arch, ends at cy + h/2, peak at cy - h/2."""
    hw = w / 2.0
    yc = cy + h / 2.0 - (4.0 / 3.0) * h
    return Path().M(cx - hw, cy + h / 2.0).C(cx - kx * w, yc, cx + kx * w, yc, cx + hw, cy + h / 2.0)


def cup_eye(cx, cy, w, h, kx=.40):
    """Closed relaxed eye: a cup (sleeping)."""
    return arc_eye(cx, cy, w, h, kx).t((1, 0, 0, -1, 0, 2 * cy))


def chevron(cx, cy, w, h, pointing_right=True):
    hw, hh = w / 2.0, h / 2.0
    p = (Path().M(cx - hw, cy - hh).Q(cx + hw * .05, cy - hh * .62, cx + hw, cy)
         .Q(cx + hw * .05, cy + hh * .62, cx - hw, cy + hh))
    return p if pointing_right else p.t(flipx(cx))


def smile_line(cx, y, w, h):
    hw = w / 2.0
    return Path().M(cx - hw, y).C(cx - hw * .5, y + h * 4.0 / 3.0, cx + hw * .5, y + h * 4.0 / 3.0, cx + hw, y)


def frown_line(cx, y, w, h):
    """An arch mouth: ends at y, top at y - h."""
    hw = w / 2.0
    return Path().M(cx - hw, y).C(cx - hw * .5, y - h * 4.0 / 3.0, cx + hw * .5, y - h * 4.0 / 3.0, cx + hw, y)


def laugh_mouth(cx, ty, w, depth, dip=3.0):
    hw = w / 2.0
    return (Path().M(cx - hw, ty)
            .Q(cx, ty + dip * 2, cx + hw, ty)
            .C(cx + hw, ty + depth * .72, cx + hw * .55, ty + depth, cx, ty + depth)
            .C(cx - hw * .55, ty + depth, cx - hw, ty + depth * .72, cx - hw, ty).Z())


def teeth_band(cx, ty, w, dip, t):
    hw = w / 2.0 + 4
    return (Path().M(cx - hw, ty - 6).L(cx + hw, ty - 6).L(cx + hw, ty + t - 1)
            .Q(cx, ty + dip * 2 + t, cx - hw, ty + t - 1).Z())


def wail_mouth(cx, ty, w, h):
    hw = w / 2.0
    return (Path().M(cx - hw, ty + .80 * h)
            .C(cx - hw * .92, ty + .10 * h, cx - hw * .45, ty, cx, ty)
            .C(cx + hw * .45, ty, cx + hw * .92, ty + .10 * h, cx + hw, ty + .80 * h)
            .C(cx + hw * .80, ty + 1.04 * h, cx - hw * .80, ty + 1.04 * h, cx - hw, ty + .80 * h).Z())


def pucker(x, y, h, bw):
    return (Path().M(x, y)
            .C(x + bw * 1.3, y - h * .02, x + bw * 1.3, y + h * .47, x + bw * .1, y + h * .5)
            .C(x + bw * 1.3, y + h * .53, x + bw * 1.3, y + h * 1.02, x, y + h))


def stream(xt, yt, wt, xb, yb, wb):
    lt, rt = xt - wt / 2.0, xt + wt / 2.0
    lb, rb = xb - wb / 2.0, xb + wb / 2.0
    hgt = yb - yt
    return (Path().M(lt, yt)
            .C(lt - 1, yt + hgt * .45, lb + 1, yb - hgt * .35, lb, yb)
            .C(lb, yb + wb * .62, rb, yb + wb * .62, rb, yb)
            .C(rb - 1, yb - hgt * .35, rt + 1, yt + hgt * .45, rt, yt)
            .C(rt, yt - wt * .62, lt, yt - wt * .62, lt, yt).Z())


def star(cx, cy, R, r, n=5, rotd=-90.0, round_=0.0):
    """Star polygon; round_ > 0 softens the outer points with quadratic corners."""
    pts = []
    for i in range(2 * n):
        a = math.radians(rotd + i * 180.0 / n)
        rr = R if i % 2 == 0 else r
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return rounded_poly(pts, [round_ if i % 2 == 0 else round_ * .35 for i in range(2 * n)])


def rounded_poly(pts, radii):
    """Closed polygon with corners rounded by quadratic curves (radius per vertex, in units)."""
    n = len(pts)
    if not isinstance(radii, (list, tuple)):
        radii = [radii] * n
    p = Path()
    for i in range(n):
        a, b, c = pts[i - 1], pts[i], pts[(i + 1) % n]
        r = radii[i]
        da = math.hypot(a[0] - b[0], a[1] - b[1])
        dc = math.hypot(c[0] - b[0], c[1] - b[1])
        r = min(r, da * .45, dc * .45)
        p1 = (b[0] + (a[0] - b[0]) * r / da, b[1] + (a[1] - b[1]) * r / da) if r else b
        p2 = (b[0] + (c[0] - b[0]) * r / dc, b[1] + (c[1] - b[1]) * r / dc) if r else b
        if i == 0:
            p.M(*p1)
        else:
            p.L(*p1)
        if r:
            p.Q(b[0], b[1], *p2)
    return p.Z()


def sparkle(cx, cy, R, k=.2, Rx=None):
    """Four-pointed sparkle with concave sides."""
    Rx = R if Rx is None else Rx
    q = R * k
    return (Path().M(cx, cy - R).Q(cx + q, cy - q, cx + Rx, cy).Q(cx + q, cy + q, cx, cy + R)
            .Q(cx - q, cy + q, cx - Rx, cy).Q(cx - q, cy - q, cx, cy - R).Z())


def zglyph(x, y, w, h, t):
    """A bold 'Z' as a filled outline (top-left corner at x, y)."""
    pts = [(x, y), (x + w, y), (x + w, y + t), (x + t * 1.25, y + h - t), (x + w, y + h - t), (x + w, y + h),
           (x, y + h), (x, y + h - t), (x + w - t * 1.25, y + t), (x, y + t)]
    return rounded_poly(pts, .8)


# ------------------------------------------------------------------ painting helpers
def face(p, cx=64.0, cy=64.0, r=54.0, col=None, shade=None):
    p.add(Ell(cx, cy, r), col or C['face'], sil=True, tone=(shade or C['shade'], r * FACE_TONE[0] / 54, r * FACE_TONE[1] / 54))


def fs(p, path, w, col=None, op=None):
    p.line(path, col or C['feat'], w, opacity=op)


def ff(p, g, col=None):
    p.add(g, col or C['feat'])


def glint(p, cx, cy, r, rx=None):
    p.add(Ell(cx, cy, rx or r, r), C['white'])


def mouth(p, path, teeth=None, tongue=None, col=None):
    p.add_clip(path, col or C['mouth'])
    if teeth is not None:
        p.add(teeth, C['white'])
    if tongue is not None:
        p.add(tongue, C['tongue'])
    p.clip_end()


def tear(p, g, glints=(), col=None):
    p.add(g, col or C['tear'], sil=True)
    for gx, gy, gr in glints:
        p.add(Ell(gx, gy, gr * .75, gr), C['white'], opacity=.9)


def heart(p, cx, cy, w, rotd=0.0, col=None, glint_=True, sil=True, ring=0.0):
    m = heart_m(cx, cy, w, rotd)
    hp = unit_heart().t(m)
    if ring:
        p.add(hp, C['white'], sil=sil)   # thin white keyline around an overlapping heart
        p.line(hp, C['white'], ring)
        p.add(hp, col or C['heart'])
    else:
        p.add(hp, col or C['heart'], sil=sil)
    if glint_ and w > 30:
        p.add(Ell(-.5, -.5, .2, .12).t(compose(m, rot(-40, -.5, -.5))), C['white'], opacity=.9)


def blush(p, cx, cy, rx, ry, col=None):
    p.add(Ell(cx, cy, rx, ry), col or C['blush'])


def skin(p, g, sil=True, tone=(-2.6, -3.0), col=None, shade=None, outline=0.0, ocol=None):
    p.add(g, col or C['skin'], sil=sil, tone=(shade or C['skin_s'], tone[0], tone[1]) if tone else None)
    if outline:
        p.line(g, ocol or C['crease'], outline)
