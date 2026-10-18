"""Hands (style D), reworked for 20 px: bold silhouette, contrasting cuff, strong creases."""
import math
from parts import *

CR = 3.6   # crease width


def cuff(p, g):
    p.add(g, C['cuff'], sil=True, tone=(C['cuff_s'], -1.6, -2.6))


def _pouce(p):
    # cuff behind the heel of the hand
    cuff(p, rrect(20, 100, 40, 24, 6).t(rot(10, 40, 112)))
    # four curled fingers, knuckles on the right
    rows = [(52, 47, 53, 17), (52, 64, 51, 17), (52, 81, 48, 16), (52, 97, 42, 15)]
    for (x, y, w, h) in reversed(rows):
        skin(p, rrect(x, y, w, h, h / 2.0), tone=(0, -3.4))
    # palm + thumb
    body = (Path().M(30, 104).C(24, 92, 25, 74, 30, 62)
            .C(33, 50, 34, 38, 37, 27).C(40, 15, 47, 8, 55, 9)
            .C(63, 10, 67, 17, 66, 26).C(65, 35, 61, 42, 62, 50)
            .C(64, 66, 64, 92, 62, 110).C(54, 114, 40, 114, 34, 109).C(32, 107, 31, 106, 30, 104).Z())
    skin(p, body, tone=(-3.4, 0))
    for (x, y, w, h) in rows[1:]:
        p.line(Path().M(x + 12, y + .6).H(x + w - 6), C['crease'], CR)
    p.line(Path().M(62.5, 49.5).Q(57, 53, 50, 52), C['crease'], CR)
    p.line(Path().M(62, 64).C(63.5, 80, 63.5, 94, 62, 108), C['crease'], 2.6)
    p.add(Ell(60.5, 20, 3.8, 7, 12), C['nail'])


def pouce(p):
    p.push(sc(1.06, 1.06, 64, 64))
    _pouce(p)
    p.pop()


def pouce_bas(p):
    p.push(compose(sc(1.06, 1.06, 64, 64), rot(180, 64, 64)))
    _pouce(p)
    p.pop()


def mains_jointes(p):
    def hand(q):
        mitt = (Path().M(64, 8)
                .C(67, 5, 73.5, 5.5, 75.5, 13)
                .C(76, 15, 76, 17, 75.8, 18.8)
                .C(79, 15.5, 86, 17, 87.2, 25.5)
                .C(87.5, 27.5, 87.4, 29.5, 87, 31.2)
                .C(90.5, 29.5, 96.5, 32.5, 96.5, 41)
                .C(96.5, 43, 96.2, 44.6, 95.8, 46)
                .C(99.5, 46, 104, 50, 104, 58)
                .C(105, 68, 106, 78, 104, 88)
                .C(102.5, 96, 99, 101, 95, 106)
                .L(64, 108).Z())
        skin(q, mitt, tone=(-3, 0))
        for ln in (Path().M(75.8, 19.6).C(74, 32, 72, 46, 71.4, 60),
                   Path().M(87, 31.8).C(84.4, 42, 82, 54, 81, 66),
                   Path().M(95.8, 46.6).C(93.4, 55, 91.4, 64, 90.6, 72)):
            q.line(ln, C['crease'], 3.0)
        thumb = (Path().M(64, 106).L(64, 62).C(64, 55.5, 68, 52, 71.8, 54)
                 .C(76, 56.4, 78, 66, 77.4, 78).C(77, 90, 74, 100, 67, 106.5).Z())
        skin(q, thumb, tone=(2.4, 0), outline=3.0)
        cuff(q, rrect(64, 101, 34, 22, 6))

    p.push(sc(1.06, 1.0, 64, 64))
    hand(p)
    p.push(flipx(64))
    hand(p)
    p.pop()
    p.line(Path().M(64, 10).V(56), C['crease'], 3.4)
    p.pop()


def mitten(fingers, bottom, left_x, right_x, depth=5.0):
    """Outline of an open hand seen from the palm: touching fingers [(cx, top, r)], palm down to `bottom`."""
    p = Path().M(left_x, bottom)
    n = len(fingers)
    for i, (cx, top, r) in enumerate(fingers):
        yt = top + r
        if i == 0:
            p.L(cx - r, yt + 8).L(cx - r, yt)
        p.extend(arc_segs(cx, yt, r, math.pi, 2 * math.pi))
        if i < n - 1:
            nx, ntop, nr = fingers[i + 1]
            notch = max(yt, ntop + nr) + depth
            p.L(cx + r, notch).L(nx - nr, ntop + nr)
        else:
            p.L(cx + r, yt + 8)
    p.L(right_x, bottom)
    return p.Z()


HAND_F = [(-13.2, -40, 4.8), (-3.8, -46, 4.6), (5.2, -43, 4.4), (13.4, -34, 3.8)]


def open_hand(p, m, outline=0.0):
    """Palm-view hand (fingers up), local origin = palm centre."""
    p.push(m)
    cuff(p, rrect(-15, 20, 30, 18, 5))
    skin(p, capsule(-12, 12, -27, -9, 6.0), tone=(-1.4, -1.6), outline=outline)
    body = mitten(HAND_F, 24, -18, 17.2)
    skin(p, body, tone=(-2.2, -2.4), outline=outline)
    for (x, top, r), (nx, ntop, nr) in zip(HAND_F, HAND_F[1:]):
        xb = x + r
        y0 = max(top + r, ntop + nr) + 5
        p.line(Path().M(xb, y0).L(xb + .3, y0 + 9), C['crease'], 2.6)
    p.line(Path().M(-17.6, 6).Q(-13, 9, -10.5, 15), C['crease'], 2.6)
    p.pop()


def bravo(p):
    open_hand(p, compose(tr(48, 76), rot(20), sc(1.2)))
    open_hand(p, compose(tr(82, 78), rot(-18), flipx(0), sc(1.2)), outline=3.2)
    for (x1, y1, x2, y2) in ((66, 4, 66, 15), (48, 9, 53, 18.5), (84, 9, 79, 18.5)):
        p.line(Path().M(x1, y1).L(x2, y2), '#F29C0A', 5.2, sil=True)


def coucou(p):
    open_hand(p, compose(tr(68, 74), rot(-16), sc(1.42)))
    p.line(Path().M(24, 30).Q(17, 44, 21, 58), '#F29C0A', 4.6, sil=True)
    p.line(Path().M(13, 24).Q(4, 44, 10, 64), '#F29C0A', 4.6, sil=True)
    p.line(Path().M(110, 88).Q(117, 76, 113, 63), '#F29C0A', 4.6, sil=True)


def muscle(p):
    arm = (Path().M(22, 120).L(96, 120).C(110, 120, 116, 110, 112, 96)
           .L(104, 46).L(80, 46).L(84, 80).C(78, 68, 66, 58, 52, 58).C(36, 58, 26, 66, 22, 78).Z())
    skin(p, arm, tone=(-3, -3.4))
    p.line(Path().M(84, 82).C(86, 88, 90, 92, 96, 94), C['crease'], 3.2)
    p.line(Path().M(38, 76).C(46, 70, 58, 70, 66, 76), C['skin_s'], 4.0)
    fist = rrect(74, 12, 40, 40, 14)
    skin(p, fist, tone=(-2.6, -3))
    for y in (22, 32, 42):
        p.line(Path().M(76, y).H(92), C['crease'], 3.0)
    skin(p, capsule(78, 18, 98, 22, 6.4), tone=(-1.4, -1.6), outline=2.6)
    cuff(p, rrect(10, 76, 20, 46, 6))


HANDS = [('pouce', pouce), ('pouce-bas', pouce_bas), ('bravo', bravo), ('mains-jointes', mains_jointes),
         ('muscle', muscle), ('coucou', coucou)]
