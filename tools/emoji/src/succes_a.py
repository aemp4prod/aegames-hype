"""0.28.1: the achievements' icons, batch A (debut + coeur), in the sticker style D (flat two tones, white die-cut)."""
from parts import *
from symbols import obj
from geom import K, unit_heart, heart_m

RED, RED_S = C['heart'], '#D02247'
D, DS = C['dark'], C['dark_s']
PAPER, PAPER_S = C['white'], '#D6DAE4'
LINE = '#C9D0DC'
GLASS, GLASS_S = '#E9F4FF', '#C6DCEF'
WOOD, WOOD_S = '#E8B477', '#C98E4E'


# ---------------------------------------------------------------- helpers
def small_heart(p, cx, cy, w, rotd=0.0, col=None, sil=True):
    p.add(unit_heart().t(heart_m(cx, cy, w, rotd)), col or RED, sil=sil)


def bubble_card(x0, y0, x1, y1, r, ax, bx, tx, ty):
    """A rounded card with a little tail on its bottom edge (between ax and bx, tip at tx, ty)."""
    k = K * r
    return (Path().M(x0 + r, y0).H(x1 - r).C(x1 - r + k, y0, x1, y0 + r - k, x1, y0 + r)
            .V(y1 - r).C(x1, y1 - r + k, x1 - r + k, y1, x1 - r, y1)
            .H(bx).Q(bx - 4, ty - 6, tx, ty).Q(ax + 2, y1 + 4, ax, y1)
            .H(x0 + r).C(x0 + r - k, y1, x0, y1 - r + k, x0, y1 - r)
            .V(y0 + r).C(x0, y0 + r - k, x0 + r - k, y0, x0 + r, y0).Z())


def pencil(p, m, length=80):
    """A wooden pencil, tip at the local origin, body along -y."""
    p.push(m)
    L = length
    p.add(Path().M(0, 0).L(-8, -18).L(8, -18).Z(), '#FFE3A3', sil=True)
    p.add(Path().M(0, 0).L(-3.2, -7.2).L(3.2, -7.2).Z(), D)
    obj(p, rrect(-8.5, -L + 18, 17, L - 36, 1.5), C['gold'], C['gold_s'], tone=(-1.6, 0))
    p.add(rrect(2.6, -L + 18, 3.4, L - 36, 0), C['gold_s'])
    obj(p, rrect(-9, -L + 9, 18, 10, 1.5), '#C9D0DC', '#A9B3C0', tone=(-1.2, 0))
    obj(p, Path().M(-8.5, -L + 10).V(-L + 6).C(-8.5, -L - 1, 8.5, -L - 1, 8.5, -L + 6).V(-L + 10).Z(),
        C['pink'], C['pink_s'], tone=(-1.2, -1))
    p.pop()


def paper_lines(p, x, y, widths, gap=12, h=6, col=LINE):
    for i, w in enumerate(widths):
        p.add(rrect(x, y + i * gap, w, h, h / 2.0), col)


def coin(p, cx, cy, r):
    obj(p, Ell(cx, cy, r), C['gold'], C['gold_s'], tone=(-r * .12, -r * .16))
    p.line(Ell(cx - r * .06, cy - r * .1, r * .6), '#F0B21C', max(1.4, r * .16))


def sly_eye(p, cx, cy, look=1, w=20, col=None):
    """Half-lidded eye glancing sideways: white bowl, pupil, straight lid."""
    hw = w / 2.0
    bowl = Path().M(cx - hw, cy).H(cx + hw).C(cx + hw, cy + 7, cx + hw * .55, cy + 10, cx, cy + 10).C(
        cx - hw * .55, cy + 10, cx - hw, cy + 7, cx - hw, cy).Z()
    p.add_clip(bowl, C['white'])
    ff(p, Ell(cx + look * 4.6, cy + 5, 5.2), col)
    p.clip_end()
    fs(p, Path().M(cx - hw - 1.5, cy).H(cx + hw + 1.5), 4.4, col)


# ---------------------------------------------------------------- debut
def first_post(p):
    card = bubble_card(8, 12, 100, 96, 14, 22, 40, 14, 116)
    obj(p, card, PAPER, PAPER_S, tone=(-2, -2.6))
    p.add(Ell(28, 32, 9), C['pink'])
    p.add(rrect(42, 28, 34, 8, 4), LINE)
    paper_lines(p, 22, 50, (64, 56), gap=14, h=7)
    p.add(rrect(22, 78, 34, 7, 3.5), D)
    pencil(p, compose(tr(60, 82), rot(38)), 82)


def viral_post(p):
    pk, pks = C['pink'], C['pink_s']
    for (x, y, w, a) in ((33, 95, 26, -20), (16, 111, 16, -28)):
        small_heart(p, x, y, w, a, col=pk)
    m = compose(tr(79, 47), rot(45), sc(.9))
    p.push(m)
    flame = Path().M(-11, 28).C(-11, 44, -5, 52, 0, 62).C(5, 52, 11, 44, 11, 28).Z()
    obj(p, flame, C['orange'], '#E4470B', tone=(-1, 0))
    p.add(Path().M(-6, 30).C(-6, 40, -2, 46, 0, 52).C(2, 46, 6, 40, 6, 30).Z(), C['face'])
    finL = Path().M(-16, 4).C(-29, 8, -34, 22, -32, 38).L(-15, 28).Z()
    obj(p, finL, pk, pks, tone=(-1, -1.2))
    obj(p, finL.t(flipx(0)), pk, pks, tone=(-1, -1.2))
    body = Path().M(0, -54).C(15, -42, 19, -17, 18, 10).L(17, 32).L(-17, 32).L(-18, 10).C(-19, -17, -15, -42, 0, -54).Z()
    p.add_clip(body, C['grey'], sil=True)
    p.add(Path().M(6, -60).L(30, -60).L(30, 40).L(10, 40).C(14, 10, 14, -20, 6, -60).Z(), C['grey_s'])
    p.add(Path().M(-30, -60).H(30).V(-34).H(-30).Z(), pk)
    p.clip_end()
    p.add(Ell(0, -10, 10.5), C['white'])
    p.add(Ell(0, -10, 7.4), C['blue'])
    glint(p, -2.4, -12.6, 2.4)
    p.pop()


def flop_post(p):
    col, cs = '#8C7BF0', '#6E5CD4'
    dk = '#2B1D5C'
    m = compose(tr(64, 58), rot(-24), sc(1.04))
    knot = ap(m, (0, 50))
    # the limp string, fallen on the floor
    p.line(Path().M(*knot).C(knot[0] + 6, 110, 100, 116, 88, 117).L(36, 117).C(28, 117, 24, 110, 30, 106)
           .C(36, 102, 40, 112, 32, 116), '#8F9AA8', 3.6, sil=True)
    p.push(m)
    # a balloon losing its air: still round on top, crumpled towards the knot
    body = (Path().M(-41, -4).C(-41, -29, -23, -46, 0, -46).C(23, -46, 41, -29, 41, -4)
            .C(41, 4, 38, 10, 34, 15).L(25, 17).L(27, 29).L(14, 33).L(5, 47).L(-5, 47).L(-14, 34)
            .L(-27, 30).L(-25, 18).L(-34, 15).C(-38, 10, -41, 4, -41, -4).Z())
    obj(p, body, col, cs, tone=(-2, -2.8))
    for (x0, y0, x1, y1) in ((25, 17, 13, 9), (14, 33, 6, 24), (-25, 18, -13, 10), (-14, 34, -6, 25)):
        p.line(Path().M(x0, y0).L(x1, y1), cs, 3.2)
    p.add(rounded_poly([(-6, 45), (6, 45), (4, 54), (-4, 54)], 1.6), cs, sil=True)
    p.add(Ell(-24, -26, 7, 4, -40), C['white'], opacity=.85)
    fs(p, Path().M(-23, -11).Q(-16, -12, -9, -17), 3.8, dk)
    fs(p, Path().M(23, -11).Q(16, -12, 9, -17), 3.8, dk)
    fs(p, cup_eye(-15, -1, 12, 5), 4.6, dk)
    fs(p, cup_eye(15, -1, 12, 5), 4.6, dk)
    fs(p, frown_line(0, 18, 16, 4.4), 4.4, dk)
    p.pop()


def internet_laughingstock(p):
    hair, hair_s = C['orange'], C['orange_s']
    for flip in (False, True):
        for (x, y, r) in ((26, 34, 11), (20, 50, 10), (32, 22, 9)):
            g = Ell(x, y, r)
            obj(p, g.t(flipx()) if flip else g, hair, hair_s, tone=(-1, -1.4))
    ph = rrect(32, 12, 64, 106, 15)
    obj(p, ph, D, DS)
    p.add(rrect(38, 20, 52, 90, 9), '#BDE7FF')
    for cx in (53, 75):
        ff(p, Ell(cx, 50, 4.4, 5.6), D)
    m = Path().M(44, 78).Q(64, 86, 84, 78).C(82, 92, 74, 98, 64, 98).C(54, 98, 46, 92, 44, 78).Z()
    p.add(m, D)
    p.add(Ell(64, 66, 11), '#F23B4F')
    glint(p, 60.4, 62, 3)
    for flip in (False, True):
        for (tx, ty, cx, cy, R) in ((27, 74, 15, 86, 7.5), (30, 96, 19, 109, 6.5)):
            g = drop(tx, ty, cx, cy, R)
            tear(p, g.t(flipx()) if flip else g)


def sell_me_this_pen(p):
    p.push(sc(.95, .95, 64, 62))
    _sell_me_this_pen(p)
    p.pop()


def _sell_me_this_pen(p):
    p.push(rot(-8, 46, 76))
    sheet = rrect(10, 34, 74, 88, 9)
    obj(p, sheet, PAPER, PAPER_S, tone=(-1.8, -2.4))
    paper_lines(p, 20, 48, (52, 44, 52, 30), gap=12, h=6)
    p.pop()
    up = Path().M(10, 36).L(24, 22).L(32, 30).L(50, 12)
    p.line(up, C['green'], 7, sil=True)
    p.add(rounded_poly([(58, 4), (54, 22), (40, 8)], 1.6), C['green'], sil=True)
    m = compose(tr(46, 104), rot(40))
    p.push(m)
    nib = Path().M(0, 0).C(-4, -6, -8, -12, -8, -20).L(8, -20).C(8, -12, 4, -6, 0, 0).Z()
    obj(p, nib, C['gold'], C['gold_s'], tone=(-1, -.6))
    p.line(Path().M(0, -3).V(-13), D, 1.8)
    p.add(Ell(0, -14, 2), D)
    body = Path().M(-8, -19).H(8).L(10.5, -36).L(10.5, -92).C(10.5, -102, -10.5, -102, -10.5, -92).L(-10.5, -36).Z()
    obj(p, body, D, DS, tone=(-2, 0))
    p.add(rrect(-10.6, -64, 21.2, 6, 0), C['gold'])
    p.add(rrect(-10.6, -38, 21.2, 4, 0), C['gold'])
    p.add(rrect(-3, -94, 6, 30, 3), C['gold'])
    p.add(rrect(-7, -88, 3, 20, 1.5), '#5B6070')
    p.pop()


def first_contract(p):
    p.push(rot(-6, 60, 64))
    sheet = Path().M(18, 10).H(84).L(104, 30).V(112).C(104, 116, 102, 118, 98, 118).H(24).C(20, 118, 18, 116, 18, 112).Z()
    obj(p, sheet, PAPER, PAPER_S, tone=(-1.8, -2.4))
    p.add(Path().M(84, 10).V(26).C(84, 29, 85, 30, 88, 30).H(104).Z(), '#E3E7EF')
    paper_lines(p, 30, 26, (40, 52, 60, 48), gap=12, h=6)
    p.add(rrect(30, 98, 50, 3.4, 1.7), '#AEB6C4')
    sig = Path().M(32, 92).C(36, 78, 42, 74, 44, 82).C(46, 90, 48, 92, 52, 84).C(55, 78, 58, 80, 58, 86).C(58, 92, 64, 90, 76, 82)
    p.line(sig, '#3D57C9', 4.2)
    p.pop()
    coin(p, 102, 105, 12)
    obj(p, sparkle(114, 86, 7.5), C['gold'], C['gold_s'], tone=None)


def worldwide_trend(p):
    g = Ell(58, 60, 50)
    obj(p, g, C['blue'], C['blue_s'], tone=(-2.4, -3.2))
    p.clip_start(g)
    land = C['green']
    p.add(Path().M(22, 30).C(34, 18, 54, 16, 60, 26).C(64, 34, 52, 38, 50, 48).C(48, 58, 36, 62, 28, 56)
          .C(20, 50, 14, 40, 22, 30).Z(), land)
    p.add(Path().M(70, 20).C(84, 18, 104, 30, 108, 46).C(100, 50, 92, 44, 86, 50).C(80, 56, 72, 50, 70, 42)
          .C(68, 34, 62, 26, 70, 20).Z(), land)
    p.add(Path().M(40, 76).C(52, 70, 66, 76, 64, 88).C(62, 100, 52, 110, 44, 104).C(36, 98, 30, 84, 40, 76).Z(), land)
    p.clip_end()
    b = Ell(96, 94, 25)
    obj(p, b, C['pink'], C['pink_s'], tone=(-1.4, -1.8))
    w = C['white']
    for x in (90, 101):
        p.line(Path().M(x + 2.4, 82).L(x - 2.4, 106), w, 4.8)
    for y in (89, 99):
        p.line(Path().M(83, y).H(109), w, 4.8)


# ---------------------------------------------------------------- coeur
def first_crush(p):
    p.push(sc(.96, .96, 64, 66))
    _first_crush(p)
    p.pop()


def _first_crush(p):
    shaft, head, fl = '#E9A313', C['gold'], C['gold']
    p.line(Path().M(114, 18).L(18, 108), shaft, 6, sil=True)
    for k in range(3):
        p.add(rounded_poly([(112 - k * 6, 12 + k * 6), (124 - k * 6, 10 + k * 6), (116 - k * 6, 22 + k * 6)], 1.2), fl, sil=True)
    m = heart_m(64, 66, 92, 6)
    hp = unit_heart().t(m)
    p.add(hp, C['pink'], sil=True, tone=(C['pink_s'], -1.8, -2.6))
    blush(p, 40, 74, 8.5, 5.5, '#FFB0D2')
    blush(p, 86, 78, 8.5, 5.5, '#FFB0D2')
    dk = '#5C1033'
    fs(p, arc_eye(48, 62, 16, 7).t(rot(6, 48, 62)), 5.4, dk)
    fs(p, arc_eye(78, 65, 16, 7).t(rot(6, 78, 65)), 5.4, dk)
    fs(p, smile_line(62, 80, 14, 5).t(rot(6, 62, 80)), 4.8, dk)
    p.add(Ell(-.5, -.5, .2, .12).t(compose(m, rot(-40, -.5, -.5))), C['white'], opacity=.9)
    p.line(Path().M(30, 97).L(18, 108), shaft, 6)
    obj(p, rounded_poly([(6, 120), (12, 98), (28, 114)], 2), head, C['gold_s'], tone=(-1, -1.2))


def charro_two(p):
    heart(p, 40, 70, 62, -14, col=RED)
    cx, cy, a = 82, 62, 12
    hp = unit_heart().t(heart_m(cx, cy, 70, a))
    p.add(hp, C['white'], sil=True)
    p.line(hp, C['white'], 7)
    p.add(hp, C['pink'], tone=(C['pink_s'], -1.6, -2.4))
    dk = '#5C1033'
    p.push(compose(tr(cx, cy), rot(a)))
    ff(p, Ell(-10, -6, 4.4, 5.8), dk)
    glint(p, -8.5, -8.4, 1.6)
    fs(p, arc_eye(11, -3, 12, 5), 4.6, dk)
    fs(p, Path().M(3, -16).Q(9, -20, 16, -16), 3.6, dk)
    fs(p, Path().M(-14, 10).C(-8, 18, 6, 19, 14, 9), 4.4, dk)
    p.pop()


def charro_three(p):
    p.push(sc(.92, .92, 64, 64))
    _charro_three(p)
    p.pop()


def _charro_three(p):
    gr, grs = '#2A9E55', '#1F7A40'
    m = compose(tr(70, 50), rot(40), sc(.82))
    p.push(m)
    bottle = (Path().M(-9, 2).H(9).V(30).C(9, 38, 22, 42, 22, 56).V(96).C(22, 102, 18, 104, 14, 104).H(-14)
              .C(-18, 104, -22, 102, -22, 96).V(56).C(-22, 42, -9, 38, -9, 30).Z())
    obj(p, bottle, gr, grs, tone=(-2.4, 0))
    p.clip_start(bottle)
    p.add(rrect(-24, -2, 48, 34, 0), C['gold'])
    p.add(rrect(-24, 62, 48, 24, 0), C['gold'])
    p.add(rrect(-24, 30, 48, 4, 0), C['gold_s'])
    p.clip_end()
    p.pop()
    foam = '#FFFFFF'
    for (x, y, r) in ((72, 46, 8), (84, 34, 18), (100, 22, 16), (110, 42, 13), (76, 18, 12), (96, 48, 12)):
        p.add(Ell(x, y, r), foam, sil=True, tone=('#DCE3EC', -1.2, -1.8))
    for (x, y, w, a) in ((80, 30, 18, -12), (100, 20, 16, 10), (104, 44, 14, 16)):
        small_heart(p, x, y, w, a, col=RED, sil=False)
    obj(p, rrect(108, 2, 12, 16, 4).t(rot(30, 114, 10)), '#D9A066', '#B5803F', tone=(-1, -1))


def charro_week(p):
    fr, frs = D, DS
    p.push(compose(sc(.96, .96, 64, 64), rot(-7, 64, 64)))
    for flip in (False, True):
        mm = flipx() if flip else (1, 0, 0, 1, 0, 0)
        rim = Path().M(14, 32).H(60).C(63, 52, 60, 94, 35, 95).C(14, 95, 6, 74, 7, 39).C(7, 35, 10, 32, 14, 32).Z()
        obj(p, rim.t(mm), fr, frs, tone=(-1.8, -2.4))
    obj(p, rrect(54, 34, 20, 13, 5), fr, frs, tone=(0, -1.6))
    for flip in (False, True):
        mm = flipx() if flip else (1, 0, 0, 1, 0, 0)
        lens = Path().M(16, 41).H(53).C(55, 56, 52, 86, 35, 87).C(20, 87, 14, 72, 15, 45).C(15, 43, 15, 41, 16, 41).Z()
        p.add_clip(lens.t(mm), '#4A3784')
        p.add(Path().M(0, 74).L(128, 44).L(128, 128).L(0, 128).Z(), '#3A2A6B')
        p.clip_end()
    small_heart(p, 31, 62, 22, -10, col=C['pink'], sil=False)
    small_heart(p, 46, 76, 12, 10, col=C['pink'], sil=False)
    small_heart(p, 95, 64, 22, 10, col=C['pink'], sil=False)
    for x in (22, 83):
        p.line(Path().M(x, 54).L(x + 6, 48), C['white'], 3.2, opacity=.9)
    p.pop()


def charro_month(p):
    band, band_s = RED, RED_S
    for pts in ([(104, 36), (121, 22), (116, 40)], [(104, 44), (121, 54), (109, 56)]):
        obj(p, rounded_poly(pts, 2), band, band_s, tone=(-1, -1))
    head = Ell(62, 66, 52)
    p.add_clip(head, D, sil=True)
    p.add(Ell(66, 70, 52), DS)
    p.add(Ell(60, 63, 50), D)
    p.add(Path().M(0, 22).C(40, 18, 90, 20, 128, 30).V(46).C(90, 38, 40, 36, 0, 40).Z(), band)
    p.clip_end()
    p.add(rrect(22, 56, 80, 26, 13), C['face'])
    sly_eye(p, 46, 64, 1, 18)
    sly_eye(p, 78, 64, 1, 18)
    for x in (44, 62, 80):
        small_heart(p, x, 32, 12, 0, col=C['white'], sil=False)
    obj(p, Ell(106, 40, 7), band, band_s, tone=(-.8, -1))


def coin_coin(p):
    yel, yel_s = C['face'], C['shade']
    body = (Path().M(16, 84).C(16, 70, 30, 64, 46, 66).L(70, 70).C(84, 66, 96, 58, 110, 50).C(118, 46, 122, 54, 120, 64)
            .C(118, 76, 116, 88, 110, 98).C(100, 114, 84, 120, 64, 120).C(38, 120, 16, 108, 16, 84).Z())
    obj(p, body, yel, yel_s, tone=(-2, -2.8))
    obj(p, Ell(42, 46, 26), yel, yel_s, tone=(-1.8, -2.6))
    beak = Path().M(23, 45).C(16, 41, 9, 43, 7, 50).C(10, 54, 16, 56, 23, 56).Z()
    obj(p, beak, C['orange'], C['orange_s'], tone=(-1, -1))
    ff(p, Ell(36, 40, 4.6, 5.6))
    glint(p, 37.4, 37.6, 1.6)
    blush(p, 50, 52, 6, 4)
    p.add(Path().M(50, 86).C(62, 78, 80, 80, 88, 92).C(76, 100, 60, 98, 50, 86).Z(), yel_s)
    p.push(rot(8, 88, 52))
    pk, pks = C['pink'], C['pink_s']
    obj(p, rrect(66, 40, 44, 36, 5), pk, pks)
    p.add(rrect(84, 40, 8, 36, 0), C['white'])
    p.add(rrect(66, 52, 44, 7, 0), C['white'])
    for (ex, ey, a) in ((80, 34, -28), (96, 34, 28)):
        obj(p, Ell(ex, ey, 9, 6, a), C['white'], '#E3E7EF', tone=(-.8, -1))
    p.pop()


def enemies_to_lovers(p):
    bl, bls = '#DDE3EC', '#A9B3C0'
    p.push(sc(1.06, 1.06, 64, 59))
    for a in (-45, 45):
        p.push(compose(tr(64, 58), rot(a)))
        blade = Path().M(0, -66).L(10, -52).L(10, 22).L(-10, 22).L(-10, -52).Z()
        obj(p, blade, bl, bls, tone=(-3, 0))
        p.line(Path().M(0, -50).V(16), '#BCC5D2', 3)
        obj(p, rrect(-6, 30, 12, 22, 3), '#7A4A2A', '#5E361C', tone=(-1.2, 0))
        obj(p, rrect(-24, 20, 48, 12, 6), C['gold'], C['gold_s'], tone=(-1.2, -1.6))
        obj(p, Ell(0, 57, 8.5), C['gold'], C['gold_s'], tone=(-1.2, -1.6))
        p.pop()
    heart(p, 64, 55, 56, 0, col=RED, ring=7)
    p.pop()


def good_doggy(p):
    fur, fur_s = '#E8B477', '#CF9450'
    ear, ear_s = '#9A5B2E', '#7A4421'
    for flip in (False, True):
        e = Path().M(34, 26).C(18, 24, 8, 44, 10, 70).C(12, 86, 22, 96, 30, 90).C(36, 84, 38, 60, 42, 40).Z()
        obj(p, e.t(flipx()) if flip else e, ear, ear_s, tone=(-1.2, -1.6))
    head = Path().M(64, 18).C(90, 18, 102, 38, 100, 62).C(98, 92, 84, 110, 64, 110).C(44, 110, 30, 92, 28, 62).C(26, 38, 38, 18, 64, 18).Z()
    obj(p, head, fur, fur_s)
    p.add(Ell(64, 88, 22, 17), '#FFF1DC')
    dk = '#3B2316'
    for cx in (48, 80):
        ff(p, Ell(cx, 60, 8, 9.4), dk)
        glint(p, cx + 2.6, 56, 3.4)
        glint(p, cx - 3, 64, 1.6)
    fs(p, Path().M(38, 46).Q(46, 46, 54, 40), 4.2, dk)
    fs(p, Path().M(90, 46).Q(82, 46, 74, 40), 4.2, dk)
    p.add(Path().M(56, 76).C(56, 72, 72, 72, 72, 76).C(72, 82, 66, 85, 64, 85).C(62, 85, 56, 82, 56, 76).Z(), dk)
    fs(p, frown_line(64, 100, 14, 4), 3.6, dk)
    m = heart_m(99, 99, 31, 10)
    u = unit_heart().segs
    zig = [(-.14, -.38), (.1, -.14), (-.12, .12), (.08, .38), (-.06, .64)]
    left = Path(u[:4])
    for pt in zig:
        left.L(*pt)
    left.L(0, .92).Z()
    right = Path([('M', [(0, -.64)])] + u[4:7])
    for pt in reversed(zig):
        right.L(*pt)
    right.L(0, -.64).Z()
    p.add(left.t(compose(tr(-2.5, .5), rot(-8, 99, 114), m)), RED, sil=True)
    p.add(right.t(compose(tr(2.5, -.5), rot(8, 99, 114), m)), RED, sil=True)


def dart(p, x, y, a, col):
    p.push(compose(tr(x, y), rot(a)))
    p.add(Path().M(0, 0).L(-2, -8).L(2, -8).Z(), '#8F9AA8', sil=True)
    p.add(rrect(-3.6, -24, 7.2, 17, 3), D, sil=True)
    p.line(Path().M(0, -24).V(-32), D, 2.4, sil=True)
    obj(p, Path().M(0, -28).L(9, -36).L(9, -46).L(0, -40).L(-9, -46).L(-9, -36).Z(), col, C['blue_s'], tone=(-1, -1))
    p.pop()


def public_enemy(p):
    cx, cy = 56, 70
    obj(p, Ell(cx, cy, 50), RED, RED_S, tone=(-1.8, -2.4))
    for r, col in ((40, C['white']), (30, RED), (20, C['white']), (10, RED)):
        p.add(Ell(cx, cy, r), col)
    for (x, y) in ((56, 70), (32, 50), (80, 92), (36, 98), (82, 48)):
        dart(p, x, y, 40, C['blue'])


def too_fast(p):
    fur, fur_s = '#FFC4D8', '#F59BBB'
    sp = '#AEB6C4'
    for (y, x0, x1) in ((52, 2, 30), (64, 8, 22)):   # motion trails leaving the body
        p.line(Path().M(x0, y).H(x1), sp, 4.6, sil=True)
    # ears flat back, hind foot stretched back, front paws reaching forward
    for (cx, cy, rx, ry, a) in ((58, 32, 25, 8, 14), (66, 40, 22, 7.5, 26)):
        obj(p, Ell(cx, cy, rx, ry, a), fur, fur_s, tone=(-1, -1.4))
    p.add(Ell(57, 32, 17, 3.6, 14), '#FF6FA3')
    obj(p, Ell(25, 92, 15, 6.5, -32), fur, fur_s, tone=(-1, -1.4))
    obj(p, Ell(97, 88, 14, 6, 30), fur, fur_s, tone=(-1, -1.4))
    obj(p, Ell(60, 72, 35, 20, -12), fur, fur_s)
    obj(p, Ell(102, 82, 13, 5.5, 18), fur, fur_s, tone=(-1, -1.4))
    obj(p, Ell(29, 70, 9.5), C['white'], '#D6DAE4', tone=(-1.2, -1.4))
    obj(p, Ell(93, 54, 20, 17.5, -14), fur, fur_s, tone=(-1.6, -2.4))
    ff(p, Ell(100, 49, 4, 5))
    glint(p, 101.2, 47, 1.5)
    blush(p, 101, 62, 6, 3.8, '#FF7FAA')
    p.add(Ell(112, 54, 3.8, 3), C['pink_s'])
    heart(p, 108, 22, 24, 14, col=RED)


def friendzone(p):
    heart(p, 64, 48, 88, 0, col=C['pink'], glint_=False)
    dk = '#5C1033'
    fs(p, Path().M(40, 29).Q(46, 28, 51, 24), 3.6, dk)
    fs(p, Path().M(88, 29).Q(82, 28, 77, 24), 3.6, dk)
    for cx in (48, 80):
        ff(p, Ell(cx, 40, 4.6, 6), dk)
        glint(p, cx + 1.4, 37, 1.6)
    for x in (17, 40.5, 64, 87.5, 111):
        pk = rounded_poly([(x - 9, 118), (x - 9, 66), (x, 56), (x + 9, 66), (x + 9, 118)], [2, 2, 2.4, 2, 2])
        obj(p, pk, WOOD, WOOD_S, tone=(-1.4, -1.4))
    for y in (74, 100):
        obj(p, rrect(8, y, 112, 9, 2), '#D9A066', WOOD_S, tone=(0, -1.4))


def just_no(p):
    p.sil_add(Ell(64, 64, 56))
    p.add(Ell(64, 64, 46), C['white'])
    heart(p, 64, 66, 60, 0, col=C['pink'], sil=False)
    p.line(Ell(64, 64, 47), RED, 16)
    p.line(Path().M(32, 32).L(96, 96), RED, 16)
    p.add(Ell(48, 34, 6, 3, -40), C['white'], opacity=.85)


def milf_lover(p):
    wine, wine_s = '#B3173F', '#8C0F30'
    bowl = Path().M(28, 16).H(100).C(100, 52, 90, 76, 64, 78).C(38, 76, 28, 52, 28, 16).Z()
    p.line(Path().M(64, 76).V(110), GLASS_S, 7, sil=True)
    obj(p, Ell(64, 112, 26, 7), GLASS, GLASS_S, tone=(-1, -1.4))
    obj(p, bowl, GLASS, GLASS_S, tone=(-1.6, -2))
    p.clip_start(bowl)
    p.add(Path().M(20, 44).H(108).V(90).H(20).Z(), wine_s)
    p.add(Path().M(20, 44).H(108).V(90).H(20).Z().t(tr(-2, -2)), wine)
    p.add(Ell(64, 44, 37, 5), '#D6335B')
    p.clip_end()
    p.add(rrect(38, 22, 6, 18, 3), C['white'], opacity=.9)
    heart(p, 104, 20, 26, 14, col=C['pink'])


SUCCES = [
    ('first-post', first_post), ('viral-post', viral_post), ('flop-post', flop_post),
    ('internet-laughingstock', internet_laughingstock), ('sell-me-this-pen', sell_me_this_pen),
    ('first-contract', first_contract), ('worldwide-trend', worldwide_trend), ('first-crush', first_crush),
    ('charro-two', charro_two), ('charro-three', charro_three), ('charro-week', charro_week),
    ('charro-month', charro_month), ('coin-coin', coin_coin), ('enemies-to-lovers', enemies_to_lovers),
    ('good-doggy', good_doggy), ('public-enemy', public_enemy), ('too-fast', too_fast), ('friendzone', friendzone),
    ('just-no', just_no), ('milf-lover', milf_lover),
]
