"""Hearts, symbols and the Minotaur (style D)."""
import math
from parts import *
from geom import Path as GPath

SK = (-1.8, -2.8)   # default two-tone shift for objects


def obj(p, g, col, shade, sil=True, tone=SK):
    p.add(g, col, sil=sil, tone=(shade, tone[0], tone[1]) if tone else None)


# ---------------------------------------------------------------- hearts
def coeur(p):
    heart(p, 64, 65, 104, 0)


def coeur_brise(p):
    u = unit_heart().segs
    zig = [(-.14, -.38), (.1, -.14), (-.12, .12), (.08, .38), (-.06, .64)]
    left = GPath(u[:4])
    for pt in zig:
        left.L(*pt)
    left.L(0, .92).Z()
    right = GPath([('M', [(0, -.64)])] + u[4:7])
    for pt in reversed(zig):
        right.L(*pt)
    right.L(0, -.64).Z()
    m = heart_m(64, 66, 100)
    lh = left.t(compose(tr(-5, 1), rot(-7, 64, 112), m))
    rh = right.t(compose(tr(5, -1), rot(7, 64, 112), m))
    p.add(lh, C['heart'], sil=True)
    p.add(rh, C['heart'], sil=True)
    p.add(Ell(-.5, -.5, .2, .12).t(compose(tr(-5, 1), rot(-7, 64, 112), m, rot(-40, -.5, -.5))), C['white'], opacity=.9)


def deux_coeurs(p):
    heart(p, 52, 74, 86, -12, col=C['pink'])
    heart(p, 98, 34, 46, 16, col=C['pink'], ring=7.0)


def coeur_brillant(p):
    heart(p, 58, 70, 96, -6, col=C['pink'])
    for (x, y, r) in ((102, 26, 17), (20, 30, 10), (110, 78, 9)):
        obj(p, sparkle(x, y, r), C['gold'], C['gold_s'], tone=(-1, -1.4))


# ---------------------------------------------------------------- symbols
def feu(p):
    outer = (Path().M(64, 121).C(36, 121, 20, 102, 22, 79).C(24, 59, 38, 50, 42, 33).C(50, 39, 55, 49, 53, 60)
             .C(61, 46, 67, 30, 60, 7).C(81, 19, 93, 37, 92, 58).C(96, 54, 98, 48, 96, 40)
             .C(107, 54, 109, 70, 107, 84).C(104, 104, 89, 121, 64, 121).Z())
    obj(p, outer, C['orange'], '#E4470B')
    inner = (Path().M(64, 119).C(47, 119, 39, 107, 41, 95).C(43, 83, 52, 78, 56, 67).C(62, 75, 62, 84, 60, 90)
             .C(67, 86, 71, 78, 70, 69).C(81, 79, 87, 92, 85, 103).C(83, 113, 75, 119, 64, 119).Z())
    p.add(inner, C['face'])
    p.add(Path().M(64, 117).C(56, 117, 52, 111, 53, 105).C(54, 99, 59, 96, 62, 90).C(67, 96, 72, 101, 72, 107)
          .C(72, 113, 69, 117, 64, 117).Z(), '#FFF1A8')


def etincelles(p):
    obj(p, sparkle(50, 72, 42, .19), C['gold'], C['gold_s'], tone=(-2, -2.6))
    obj(p, sparkle(99, 32, 21, .2), C['gold'], C['gold_s'], tone=(-1.2, -1.6))
    obj(p, sparkle(102, 98, 14, .2), C['gold'], C['gold_s'], tone=(-1, -1.3))


def cent(p):
    red, red_s = C['heart'], '#D02247'
    sk = (1, 0, -0.21, 1, 13.4, 0)
    one = rounded_poly([(17, 40), (31, 28), (39, 28), (39, 86), (28, 86), (28, 46), (21, 50)], 2.4).t(sk)
    obj(p, one, red, red_s, tone=(-1.2, -1.6))
    for cx in (60, 96):
        ring = Ell(cx, 57, 14, 24.5).path().t(sk)
        p.sil_add(Ell(cx, 57, 19.5, 30).path().t(sk))
        p.line(ring, red, 11)
    for (x1, x2, y) in ((16, 112, 98), (24, 100, 112)):
        g = capsule(x1, y, x2, y, 4.6).t(compose(tr(0, 0), (1, 0, -0.21, 1, 13.4, 0)))
        obj(p, g, red, red_s, tone=(-1, -1.2))


def etoile(p):
    obj(p, star(64, 68, 60, 26, round_=7), C['gold'], C['gold_s'], tone=(-2.2, -3.4))
    p.add(Ell(44, 46, 4.6, 8.4, 34), C['white'], opacity=.9)


def couronne(p):
    g, gs = C['gold'], C['gold_s']
    body = rounded_poly([(16, 44), (40, 74), (64, 34), (88, 74), (112, 44), (104, 98), (24, 98)], 4)
    obj(p, body, g, gs)
    for (x, y) in ((16, 42), (64, 31), (112, 42)):
        obj(p, Ell(x, y, 8.2), g, gs, tone=(-1, -1.4))
    obj(p, rrect(20, 92, 88, 22, 7), '#F7B321', '#DC9310', tone=(-1.4, -2))
    p.add(Ell(64, 103, 7.6, 6.4), C['pink'])
    p.add(Ell(42, 103, 4.6), C['blue'])
    p.add(Ell(86, 103, 4.6), C['blue'])
    p.add(rounded_poly([(64, 56), (71, 66), (64, 76), (57, 66)], 1.4), C['pink'])


def trophee(p):
    g, gs = C['gold'], C['gold_s']
    for flip in (False, True):
        h = Path().M(38, 26).C(14, 22, 12, 58, 42, 62)
        p.sil_add(Ell(28, 43, 17, 20).t(flipx()) if flip else Ell(28, 43, 17, 20))
        p.line(h.t(flipx()) if flip else h, '#E9A313', 7.4)
    cup = Path().M(30, 16).H(98).V(38).C(98, 66, 83, 82, 64, 82).C(45, 82, 30, 66, 30, 38).Z()
    obj(p, cup, g, gs)
    p.add(star(64, 42, 13, 5.6, round_=1.4), '#FFF0A8')
    obj(p, rrect(57, 78, 14, 16, 3), g, gs, tone=(-1, -1.4))
    obj(p, rrect(42, 90, 44, 10, 4), g, gs, tone=(-1, -1.4))
    obj(p, rrect(32, 98, 64, 22, 6), '#7A4A2A', '#5E361C', tone=(-1.4, -2))
    p.add(rrect(50, 104, 28, 9, 2.5), '#FFE070')


def argent(p):
    bag = (Path().M(64, 42).C(100, 42, 113, 76, 111, 96).C(109, 114, 92, 122, 64, 122)
           .C(36, 122, 19, 114, 17, 96).C(15, 76, 28, 42, 64, 42).Z())
    obj(p, bag, '#E8B86A', '#C99545')
    top = (Path().M(50, 42).C(41, 33, 38, 18, 46, 11).C(52, 17, 58, 19, 64, 13).C(70, 19, 76, 17, 82, 11)
           .C(90, 18, 87, 33, 78, 42).Z())
    obj(p, top, '#E8B86A', '#C99545', tone=(-1.2, -1.6))
    obj(p, rrect(44, 36, 40, 11, 5.5), '#9A6A33', '#7A4F22', tone=(-1, -1.4))
    eur = '#2E9E5B'
    p.line(arc(70, 86, 16, 42, 318), eur, 6.4)
    p.line(Path().M(46, 81).H(66), eur, 5.2)
    p.line(Path().M(46, 92).H(64), eur, 5.2)


def photo(p):
    d, ds = C['dark'], C['dark_s']
    obj(p, rrect(38, 24, 34, 20, 6), d, ds, tone=(-1, -1.4))
    obj(p, rrect(10, 36, 108, 78, 15), d, ds)
    p.add(rrect(10, 54, 108, 7, 0), '#474C5D')
    p.add(Ell(64, 77, 29), '#C9D3DE')
    p.add(Ell(64, 77, 21), '#22324A')
    p.add(Ell(64, 77, 11), '#3E5A85')
    glint(p, 57, 70, 5.2)
    glint(p, 71, 84, 2.4)
    p.add(rrect(86, 44, 20, 9, 3), '#FFF3B0')
    p.add(Ell(24, 47, 4), C['pink'])
    obj(p, star(104, 20, 19, 8, n=8, rotd=-90, round_=2), C['gold'], C['gold_s'], tone=(-1, -1.4))


def micro(p):
    p.push(rot(32, 64, 64))
    obj(p, Path().M(51, 64).H(77).L(72, 120).C(71.5, 124, 56.5, 124, 56, 120).Z(), C['pink'], C['pink_s'], tone=(-1.6, 0))
    obj(p, rrect(46, 54, 36, 14, 5), C['dark'], C['dark_s'], tone=(-1.2, -1.6))
    head = Ell(64, 32, 27)
    p.add_clip(head, '#C9D1DB', sil=True)
    p.add(Ell(66, 36, 27), '#A9B3C0')
    p.add(Ell(62, 29, 26), '#C9D1DB')
    for k in (-14, -4, 6, 16):
        p.line(Path().M(36, 32 + k).L(92, 32 + k), '#8F9AA8', 2.2)
        p.line(Path().M(64 + k, 2).L(64 + k, 62), '#8F9AA8', 2.2)
    p.clip_end()
    glint(p, 54, 21, 4.6)
    p.add(rrect(60, 80, 8, 12, 3), '#FFD1E6')
    p.pop()


def popcorn(p):
    red, red_s = C['heart'], '#D02247'
    for (x, y, r) in ((30, 46, 12), (46, 34, 13), (64, 28, 14), (82, 34, 13), (98, 46, 12),
                      (40, 52, 11), (58, 46, 12), (76, 48, 12), (90, 54, 10), (24, 58, 9), (104, 58, 9)):
        obj(p, Ell(x, y, r), '#FFF3D6', '#F0CF7E', tone=(-1.2, -1.8))
    bucket = rounded_poly([(22, 56), (106, 56), (94, 124), (34, 124)], 5)
    p.add_clip(bucket, red, sil=True)
    for x in (44, 64, 84):
        p.add(Path().M(x - 6, 50).L(x + 6, 50).L(x + 4.2, 130).L(x - 4.2, 130).Z().t(
            compose(tr(0, 0), (1, 0, (x - 64) * -.0015, 1, 0, 0))), C['white'])
    p.add(Path().M(96, 50).H(112).L(100, 130).H(86).Z(), red_s)
    p.clip_end()
    p.add(rrect(18, 52, 92, 10, 5), '#E3274D')


def yeux(p):
    for cx in (40, 88):
        e = Ell(cx, 64, 24, 34)
        p.add(e, C['white'], sil=True, tone=('#D8D2DD', -1.6, -2.8))
        p.line(e, '#3B2316', 2.8)
        ff(p, Ell(cx - 9, 70, 11, 13))
        glint(p, cx - 5, 64, 3.6)


def eclair(p):
    bolt = rounded_poly([(90, 4), (70, 54), (102, 54), (44, 124), (58, 70), (26, 70), (72, 4)], 3)
    obj(p, bolt, C['gold'], C['gold_s'], tone=(-2, -2.6))


def fusee(p):
    m = compose(tr(64, 66), rot(45), sc(1.06))
    p.push(m)
    flame = Path().M(-11, 28).C(-11, 44, -5, 52, 0, 62).C(5, 52, 11, 44, 11, 28).Z()
    obj(p, flame, C['orange'], '#E4470B', tone=(-1, 0))
    p.add(Path().M(-6, 30).C(-6, 40, -2, 46, 0, 52).C(2, 46, 6, 40, 6, 30).Z(), C['face'])
    finL = Path().M(-16, 4).C(-29, 8, -34, 22, -32, 38).L(-15, 28).Z()
    obj(p, finL, C['heart'], '#D02247', tone=(-1, -1.2))
    obj(p, finL.t(flipx(0)), C['heart'], '#D02247', tone=(-1, -1.2))
    body = Path().M(0, -54).C(15, -42, 19, -17, 18, 10).L(17, 32).L(-17, 32).L(-18, 10).C(-19, -17, -15, -42, 0, -54).Z()
    p.add_clip(body, C['grey'], sil=True)
    p.add(Path().M(6, -60).L(30, -60).L(30, 40).L(10, 40).C(14, 10, 14, -20, 6, -60).Z(), C['grey_s'])
    p.add(Path().M(-30, -60).H(30).V(-34).H(-30).Z(), C['heart'])
    p.clip_end()
    p.add(Ell(0, -10, 10.5), C['white'])
    p.add(Ell(0, -10, 7.4), C['blue'])
    glint(p, -2.4, -12.6, 2.4)
    p.pop()


def confettis(p):
    m = compose(tr(46, 82), rot(-45))
    p.push(m)
    cone = Path().M(-20, -12).L(0, 46).L(20, -12).Z()
    p.add_clip(cone, C['gold'], sil=True)
    for y in (2, 20):
        p.add(Path().M(-30, y).H(30).V(y + 8).H(-30).Z(), C['pink'])
    p.clip_end()
    p.add(Ell(0, -12, 20, 7), '#B87A12', sil=True)
    p.pop()
    pieces = [(Ell(74, 18, 5.5), C['pink']), (Ell(110, 52, 5), C['blue']), (Ell(92, 30, 4.4), C['gold']),
              (rrect(60, 30, 7, 13, 2).t(rot(-30, 63.5, 36.5)), C['blue']),
              (rrect(98, 64, 7, 13, 2).t(rot(40, 101.5, 70.5)), C['green']),
              (rrect(84, 10, 6, 11, 2).t(rot(60, 87, 15.5)), C['green']),
              (star(108, 18, 9, 4, round_=1), C['gold']), (star(80, 54, 8, 3.6, round_=1), C['pink'])]
    for g, col in pieces:
        p.add(g, col, sil=True)
    p.line(Path().M(60, 52).C(64, 40, 74, 46, 72, 36).C(70, 28, 80, 24, 82, 16), C['pink'], 4.4, sil=True)
    p.line(Path().M(70, 62).C(82, 60, 80, 72, 92, 72).C(100, 72, 104, 80, 114, 78), C['blue'], 4.4, sil=True)


def cadeau(p):
    pk, pks = C['pink'], C['pink_s']
    for (ex, ey, a) in ((46, 30, -28), (82, 30, 28)):
        loop = Ell(ex, ey, 17, 10.5, a)
        obj(p, loop, C['gold'], C['gold_s'], tone=(-1, -1.4))
        p.add(Ell(ex + (2 if a < 0 else -2), ey + 1, 8, 4.4, a), C['gold_s'])
    obj(p, rrect(20, 54, 88, 66, 8), pk, pks)
    obj(p, rrect(13, 40, 102, 22, 7), pk, pks, tone=(-1.4, -2))
    p.add(rrect(56, 40, 16, 80, 0), C['gold'])
    p.add(rrect(56, 54, 16, 8, 0), C['gold_s'])
    obj(p, Ell(64, 36, 8.5), C['gold'], C['gold_s'], tone=(-1, -1.2))


def valide(p):
    obj(p, rrect(14, 14, 100, 100, 26), C['green'], C['green_s'], tone=(-2.4, -3.2))
    p.line(Path().M(37, 66).L(56, 85).L(92, 45), C['white'], 15)


def non(p):
    red, red_s = C['heart'], '#D02247'
    obj(p, capsule(28, 28, 100, 100, 13), red, red_s, tone=(-1.4, -2))
    obj(p, capsule(100, 28, 28, 100, 13), red, red_s, tone=(-1.4, -2))


def musique(p):
    col, cs = '#5B6BD9', '#4453B8'
    obj(p, rrect(63, 18, 11, 80, 3), col, cs, tone=(-1.2, 0))
    obj(p, Path().M(64, 16).C(84, 20, 104, 34, 98, 64).C(93, 48, 82, 42, 70, 42).Z(), col, cs, tone=(-1, -1.6))
    obj(p, Ell(48, 96, 25, 18, -22), col, cs)
    p.add(Ell(42, 90, 6, 3.6, -22), C['white'], opacity=.9)


def vernis(p):
    from hands import cuff
    obj(p, rrect(12, 86, 26, 30, 7), C['pink'], C['pink_s'], tone=(-1.2, -1.6))
    obj(p, rrect(18, 68, 14, 20, 3), INK, '#0E090C', tone=(-1, 0))
    p.add(rrect(16, 94, 6, 14, 3), '#FF9CCB')
    p.push(compose(tr(76, 80), rot(22), sc(1.36)))
    cuff(p, rrect(-15, 22, 30, 16, 5))
    skin(p, capsule(-11, 12, -27, -6, 5.6), tone=(-1.2, -1.4))
    fingers = [(-12.4, -36, 4.1), (-3.8, -42, 4.1), (4.8, -39, 4.0), (13, -30, 3.6)]
    for (x, top, r) in fingers:
        p.add(capsule(x, 0, x, top + r, r), C['skin'], sil=True)
        p.add(Path().M(x - r + 1, top + r + 3).C(x - r + 1, top + 1.2, x + r - 1, top + 1.2, x + r - 1, top + r + 3)
              .L(x + r - 1, top + r + 6).Q(x, top + r + 7.4, x - r + 1, top + r + 6).Z(), C['pink'])
    skin(p, rrect(-17.5, -8, 35, 32, 12), tone=(-2.2, -2.4))
    p.pop()


def chevre(p):
    hc, hcs = '#A89B8E', '#86796D'
    hornL = Path().M(50, 34).C(42, 14, 24, 6, 12, 14).C(26, 16, 34, 26, 38, 40).Z()
    obj(p, hornL, hc, hcs, tone=(-1, -1.2))
    obj(p, hornL.t(flipx()), hc, hcs, tone=(-1, -1.2))
    for flip in (False, True):
        ear = Ell(22, 54, 17, 7.5, 18)
        ein = Ell(23, 54.5, 10, 3.6, 18)
        p.add(ear.t(flipx()) if flip else ear, '#E9D3B0', sil=True)
        p.add(ein.t(flipx()) if flip else ein, '#F4A7B5')
    beard = Path().M(54, 100).C(54, 112, 60, 122, 64, 126).C(68, 122, 74, 112, 74, 100).Z()
    obj(p, beard, '#CDB48C', '#B0966C', tone=(-1, -1))
    head = (Path().M(64, 28).C(82, 28, 92, 40, 92, 56).C(92, 70, 86, 80, 84, 92).C(82, 104, 74, 110, 64, 110)
            .C(54, 110, 46, 104, 44, 92).C(42, 80, 36, 70, 36, 56).C(36, 40, 46, 28, 64, 28).Z())
    obj(p, head, '#F1E2C8', '#D9C3A0')
    p.add(Ell(64, 94, 15, 12), '#FBF1E0')
    for cx in (52, 76):
        p.add(Ell(cx, 60, 7.4, 6.8), '#F7D25A')
        p.add(rrect(cx - 5.2, 58.4, 10.4, 3.4, 1.7), INK)
        p.line(Path().M(cx - 8, 55.5).Q(cx, 51.5, cx + 8, 55.5), '#3B2316', 2.6)
    ff(p, Ell(58, 92, 2.4, 3.2, 20))
    ff(p, Ell(70, 92, 2.4, 3.2, -20))
    fs(p, Path().M(57, 101).Q(64, 106, 71, 101), 3.0)


def minotaure(p):
    M = dict(fur='#B5683C', muzzle='#F9C7A6', horn='#F2DAA8', ear_in='#FF8DA5', cap='#2C2548', band='#F0368C',
             visor='#1B1630', gold='#FFCB2E', eye='#FFFFFF', tuft='#9A552E', dot='#F0368C')
    feat = '#3B2316'
    hornL = Path().M(42, 55).C(24, 58, 8, 47, 10, 14).C(17, 31, 30, 38, 46, 41).Z()
    p.add(hornL, M['horn'], sil=True)
    p.add(hornL.t(flipx()), M['horn'], sil=True)
    for q in (Path().M(25, 47).Q(28, 42, 29, 37), Path().M(19.5, 41).Q(22, 37, 22.5, 33)):
        p.line(q, '#C79C5E', 2.0, opacity=.6)
        p.line(q.t(flipx()), '#C79C5E', 2.0, opacity=.6)
    earL = Path().M(38, 58).C(30, 49, 15, 51, 6, 62).C(15, 73, 30, 71, 40, 67).Z()
    earLin = Path().M(36, 60).C(30, 55, 20, 57, 13, 62).C(20, 67.5, 30, 67, 37, 64.5).Z()
    for e, ei in ((earL, earLin), (earL.t(flipx()), earLin.t(flipx()))):
        p.add(e, M['fur'], sil=True)
        p.add(ei, M['ear_in'])
    head = (Path().M(64, 30).C(86, 30, 99, 42, 98, 60).C(97, 74, 92, 82, 90, 90)
            .L(38, 90).C(36, 82, 31, 74, 30, 60).C(29, 42, 42, 30, 64, 30).Z())
    p.add(head, M['fur'], sil=True)
    tuft = (Path().M(50, 46).C(49.5, 52, 53, 56.5, 57.5, 55.2).C(58.5, 58.6, 63, 60, 66.2, 57)
            .C(69.6, 59.4, 74.6, 57.6, 75.6, 53.2).C(78.4, 52.4, 79.6, 49, 78.6, 46).Z())
    p.add(tuft, M['tuft'])
    for ln in (Path().M(57.8, 50).Q(58, 53, 57.5, 55.2), Path().M(66.6, 51).Q(66.8, 54.5, 66.2, 57)):
        p.line(ln, '#6E3A1C', 1.6, opacity=.7)
    p.add(Ell(64, 98, 32, 20), M['muzzle'], sil=True)
    p.add(Ell(53, 96, 4.8, 3.4, 25), feat)
    p.add(Ell(75, 96, 4.8, 3.4, -25), feat)
    p.line(Path().M(46, 106).C(55, 113, 70, 113, 80, 106).Q(83, 104, 84, 101), feat, 3.6)
    p.line(arc(64, 104.5, 8, -52, 232), M['gold'], 4.2)
    eye = Ell(49, 66, 7.8, 8.4)
    p.add_clip(eye, M['eye'])
    p.add(Ell(51, 68, 4.6, 5.4), feat)
    p.add(Ell(53, 65.8, 1.6), C['white'])
    p.add(Path().M(38, 54).L(62, 54).L(62, 62.5).C(56, 60.5, 46, 60.5, 38, 63.5).Z(), M['fur'])
    p.clip_end()
    p.line(Path().M(41.4, 62.6).C(46, 60.6, 53, 60.6, 57.2, 62.2), feat, 2.6)
    p.line(arc_eye(79, 66, 14, 6.5), feat, 4.2)
    p.line(Path().M(40, 54.5).Q(48, 49.5, 57, 53), feat, 3.8)
    p.line(Path().M(71, 58).Q(79, 56.5, 88, 59.5), feat, 3.8)
    p.push(rot(-7, 64, 36))
    crown = (Path().M(40, 38).C(37, 30, 32, 20, 32, 14.5).C(32, 8.5, 48, 5.5, 64, 5.5)
             .C(80, 5.5, 96, 8.5, 96, 14.5).C(96, 20, 91, 30, 88, 38).Z())
    p.add(crown, M['cap'], sil=True)
    band = (Path().M(39, 30).C(52, 33, 76, 33, 89, 30).L(88.5, 39).C(76, 42, 52, 42, 39.5, 39).Z())
    p.add(band, M['band'], sil=True)
    visor = (Path().M(36, 39).C(52, 43.5, 76, 43.5, 92, 39).C(89, 48, 77, 52.5, 64, 52.5)
             .C(51, 52.5, 39, 48, 36, 39).Z())
    p.add(visor, M['visor'], sil=True)
    p.add(Ell(64, 20.5, 7.6, 6.8), M['gold'], sil=True)
    p.add(Ell(64, 20.5, 2.7), M['dot'])
    p.pop()


SYMBOLS = [
    ('coeur', coeur), ('coeur-brise', coeur_brise), ('deux-coeurs', deux_coeurs), ('coeur-brillant', coeur_brillant),
    ('feu', feu), ('etincelles', etincelles), ('cent', cent), ('etoile', etoile), ('couronne', couronne),
    ('trophee', trophee), ('argent', argent), ('photo', photo), ('micro', micro), ('popcorn', popcorn),
    ('yeux', yeux), ('eclair', eclair), ('fusee', fusee), ('confettis', confettis), ('cadeau', cadeau),
    ('valide', valide), ('non', non), ('musique', musique), ('vernis', vernis), ('chevre', chevre),
    ('minotaure', minotaure),
]
