"""0.28.1: the achievements' icons, part B (relations, drama, the climb), style « Autocollant »."""
from parts import *
from symbols import obj
import math

RED, RED_S = C['heart'], '#D02247'
D, DS = C['dark'], C['dark_s']
FIRE, FIRE_S = C['orange'], '#E4470B'


# ---------------------------------------------------------------- helpers
def ring_shape(cx, cy, R, r):
    """A flat ring (annulus): the outer circle, then the inner one wound the other way (a hole)."""
    return Ell(cx, cy, R).path() + Ell(cx, cy, r).path().t((1, 0, 0, -1, 0, 2 * cy))


def arrowhead(x, y, ang, L=14.0, W=11.0, r=2.0):
    """Triangle with its tip at (x, y), pointing along ang (radians)."""
    ca, sa = math.cos(ang), math.sin(ang)
    bx, by = x - L * ca, y - L * sa
    return rounded_poly([(x, y), (bx - W * sa, by + W * ca), (bx + W * sa, by - W * ca)], r)


def leaf(x, y, ang, L, W):
    """A pointed leaf, its stalk at (x, y), pointing along ang (degrees, 0 = up)."""
    g = Path().M(0, 0).C(-W, -L * .28, -W * .85, -L * .78, 0, -L).C(W * .85, -L * .78, W, -L * .28, 0, 0).Z()
    return g.t(compose(tr(x, y), rot(ang)))


def puff(p, x, y, r, col='#FFFFFF', shade='#D6DAE4'):
    obj(p, Ell(x, y, r), col, shade, tone=(-1.2, -1.8))


# ---------------------------------------------------------------- 1. GILF Lover: a teapot, its steam draws a heart
def gilf_lover(p):
    pot, pot_s = C['blue'], C['blue_s']
    hm = heart_m(38, 22, 42, 14)
    hp = unit_heart().t(hm)
    p.sil_add(hp)
    tip = ap(hm, (0, .92))
    p.line(Path().M(16, 61).C(9, 54, 19, 49, 24, 48).C(29, 47, 30, 44, tip[0], tip[1]), C['pink'], 6.6, sil=True)
    p.line(hp, C['pink'], 6.6, sil=True)
    p.line(Path().M(100, 74).C(122, 70, 124, 104, 98, 106), pot_s, 9, sil=True)
    spout = Path().M(38, 100).C(26, 98, 18, 84, 13, 67).C(12, 63, 15, 61, 19, 62).L(22, 63).C(27, 76, 33, 82, 42, 84).Z()
    obj(p, spout, pot, pot_s, tone=(-1, -1.4))
    obj(p, rrect(46, 108, 40, 11, 5), pot_s, '#1F86C9', tone=(-1, -1))
    body = Path().M(66, 58).C(91, 58, 104, 72, 104, 89).C(104, 106, 90, 116, 66, 116).C(42, 116, 28, 106, 28, 89).C(28, 72, 41, 58, 66, 58).Z()
    obj(p, body, pot, pot_s)
    obj(p, Path().M(46, 62).C(46, 48, 86, 48, 86, 62).Z(), pot, pot_s, tone=(-1, -1.4))
    p.add(rrect(42, 58, 48, 8, 4), pot_s, sil=True)
    obj(p, Ell(66, 46, 6.5), C['gold'], C['gold_s'], tone=(-.8, -1))
    for k in range(5):
        a = math.radians(k * 72 - 90)
        p.add(Ell(66 + 7.5 * math.cos(a), 88 + 7.5 * math.sin(a), 5.6), C['white'])
    p.add(Ell(66, 88, 4.4), C['gold'])


# ---------------------------------------------------------------- 2. Date from hell: a horned heart in the flames
def date_from_hell(p):
    hornL = Path().M(30, 40).C(20, 30, 16, 16, 20, 4).C(28, 16, 40, 22, 48, 30).Z()
    obj(p, hornL, D, DS, tone=(-1, -1.2))
    obj(p, hornL.t(flipx()), D, DS, tone=(-1, -1.2))
    heart(p, 64, 68, 94, 0, col=RED)
    flames = (Path().M(64, 124).C(40, 124, 22, 116, 18, 100).C(16, 92, 18, 84, 22, 76).C(26, 86, 32, 92, 38, 94)
              .C(38, 86, 42, 78, 50, 72).C(52, 82, 56, 88, 60, 90).C(62, 82, 66, 74, 76, 66).C(78, 78, 76, 86, 74, 92)
              .C(82, 90, 88, 84, 90, 76).C(96, 82, 98, 90, 96, 96).C(102, 94, 106, 88, 108, 80).C(114, 92, 112, 106, 106, 112)
              .C(98, 120, 84, 124, 64, 124).Z())
    obj(p, flames, FIRE, FIRE_S, tone=(-1.2, -1.6))
    inner = (Path().M(64, 122).C(48, 122, 38, 116, 38, 106).C(38, 100, 42, 96, 46, 92).C(48, 98, 52, 102, 56, 104)
             .C(58, 98, 62, 92, 68, 88).C(70, 96, 70, 102, 68, 106).C(74, 104, 78, 100, 80, 94).C(86, 100, 88, 108, 84, 114)
             .C(80, 120, 74, 122, 64, 122).Z())
    p.add(inner, C['face'])


# ---------------------------------------------------------------- 3. Stood up (« poser un lapin »): a rabbit, a clock, a wilted rose
def stood_up(p):
    obj(p, Ell(90, 38, 29), D, DS, tone=(-1.2, -1.6))
    p.add(Ell(89, 37, 22.5), C['white'])
    for k in range(4):
        a = math.radians(k * 90)
        p.add(Ell(89 + 17 * math.cos(a), 37 + 17 * math.sin(a), 2.2), D)
    p.line(Path().M(89, 37).L(89, 22), D, 4.4)
    p.line(Path().M(89, 37).L(76, 37), D, 4.4)
    p.add(Ell(89, 37, 3.2), RED)
    fur, fur_s, inner, snout = '#D9A574', '#B98250', '#FF9FB4', '#F7E6D2'
    earL = Path().M(30, 56).C(22, 40, 20, 18, 28, 10).C(36, 14, 42, 36, 42, 54).Z()
    obj(p, earL, fur, fur_s, tone=(-1, -1.4))
    p.add(Path().M(32, 50).C(27, 38, 26, 24, 29, 17).C(34, 22, 37, 36, 37, 50).Z(), inner)
    earR = Path().M(46, 52).C(54, 40, 70, 36, 80, 44).C(78, 52, 66, 56, 54, 60).Z()
    obj(p, earR, fur, fur_s, tone=(-1, -1.4))
    p.add(Path().M(52, 53).C(58, 46, 68, 43, 74, 46).C(70, 51, 62, 53, 54, 56).Z(), inner)
    obj(p, Ell(44, 100, 28, 22), fur, fur_s)
    p.add(Ell(44, 104, 16, 14), snout)
    obj(p, Ell(42, 70, 21, 18), fur, fur_s)
    p.add(Ell(42, 78, 10, 7.4), snout)
    ff(p, Ell(33, 69, 3.2, 4))
    ff(p, Ell(51, 69, 3.2, 4))
    p.add(Ell(42, 75, 3.4, 2.6), C['pink'])
    for x in (28, 60):
        obj(p, Ell(x, 118, 9, 5), fur, fur_s, tone=(-.8, -1))
    # the rose, held in the paws: a drooping stem, its head hanging
    stem = Path().M(52, 100).C(58, 84, 70, 74, 82, 76).C(92, 78, 97, 86, 97, 93)
    p.line(stem, C['green'], 4.4, sil=True)
    p.add(leaf(66, 80, -120, 15, 6), C['green'], sil=True)
    bloom = (Path().M(87, 96).C(83, 104, 85, 113, 91, 117).Q(94.5, 112, 98, 118).Q(101.5, 112, 105, 117)
             .C(111, 113, 112, 104, 108, 96).C(104, 91, 91, 91, 87, 96).Z())
    obj(p, bloom, RED, RED_S, tone=(-1, -1.2))
    p.line(Path().M(91, 101).C(93, 109, 101, 110, 104, 101), RED_S, 2.4)
    p.add(Path().M(88, 95).L(97, 89).L(107, 95).Q(97, 99, 88, 95).Z(), C['green_s'])
    obj(p, Ell(76, 119, 5, 3, -20), RED, RED_S, tone=(-.6, -.8))
    obj(p, Ell(52, 100, 6, 5), fur, fur_s, tone=(-.6, -.8))


# ---------------------------------------------------------------- 4. Ghosted: a little ghost and its « … »
def ghosted(p):
    gc, gs = '#F4F1FB', '#CFC6E6'
    p.push(rot(-6, 48, 80))
    g = (Path().M(16, 112).L(16, 66).C(16, 46, 30, 32, 48, 32).C(66, 32, 80, 46, 80, 66).L(80, 112)
         .Q(75, 120, 69, 112).Q(64, 104, 59, 112).Q(53, 120, 48, 112).Q(43, 104, 37, 112).Q(32, 120, 27, 112).Q(21, 104, 16, 112).Z())
    obj(p, capsule(8, 90, 20, 76, 6), gc, gs, tone=(-1, -1.2))
    obj(p, capsule(88, 90, 76, 76, 6), gc, gs, tone=(-1, -1.2))
    obj(p, g, gc, gs, tone=(-2, -3))
    ff(p, Ell(38, 62, 5.4, 7.4), INK)
    ff(p, Ell(58, 62, 5.4, 7.4), INK)
    ff(p, Ell(48, 80, 5, 6.4), INK)
    p.pop()
    b = rrect(62, 8, 60, 42, 21)
    obj(p, Path().M(70, 40).L(62, 60).L(84, 46).Z(), C['blue'], C['blue_s'], tone=(-1, -1.2))
    obj(p, b, C['blue'], C['blue_s'])
    for x in (78, 92, 106):
        p.add(Ell(x, 29, 5), C['white'])


# ---------------------------------------------------------------- 5. The ex's comeback: two hearts in a looping arrow
def ex_comeback(p):
    col = C['purple']
    R = 48
    for (a0, a1) in ((196, 318), (16, 138)):
        p.line(arc(64, 64, R, a0, a1), col, 10, sil=True)
        a = math.radians(a1)
        x, y = 64 + R * math.cos(a), 64 + R * math.sin(a)
        t = a + math.pi / 2
        p.add(arrowhead(x + 12 * math.cos(t), y + 12 * math.sin(t), t, 18, 13, 2.4), col, sil=True)
    heart(p, 50, 68, 48, -14, col=C['pink'])
    heart(p, 80, 60, 42, 14, col=RED, ring=6.0)


# ---------------------------------------------------------------- 6. Express wedding: two rings, a lightning bolt through them
def express_wedding(p):
    g, gs = C['gold'], C['gold_s']
    A, B, R, r = (42, 78), (84, 60), 29, 21
    bolt = rounded_poly([(88, 2), (66, 50), (94, 50), (40, 126), (56, 68), (28, 68), (66, 2)], 3)
    obj(p, bolt, C['pink'], C['pink_s'], tone=(-1.6, -2))
    for c in (B, A):
        obj(p, ring_shape(c[0], c[1], R, r), g, gs, tone=(-1.2, -1.8))
    p.clip_start(rrect(62, 74, 26, 26, 0))
    obj(p, ring_shape(B[0], B[1], R, r), g, gs, tone=(-1.2, -1.8))
    p.clip_end()
    for (cx, cy) in (A, B):
        p.line(arc(cx, cy, 25, 196, 246), '#FFE58A', 3)


# ---------------------------------------------------------------- 7. Ungrateful: a gift with a price tag
def ungrateful(p):
    bc, bs = C['blue'], C['blue_s']
    for (ex, ey, a) in ((38, 34, -28), (68, 34, 28)):
        obj(p, Ell(ex, ey, 15, 9.5, a), C['gold'], C['gold_s'], tone=(-1, -1.4))
        p.add(Ell(ex + (2 if a < 0 else -2), ey + 1, 7, 4, a), C['gold_s'])
    obj(p, rrect(14, 60, 78, 60, 8), bc, bs)
    obj(p, rrect(8, 46, 90, 20, 7), bc, bs, tone=(-1.4, -2))
    p.add(rrect(45, 46, 16, 74, 0), C['gold'])
    p.add(rrect(45, 60, 16, 6, 0), C['gold_s'])
    obj(p, Ell(53, 40, 8), C['gold'], C['gold_s'], tone=(-1, -1.2))
    p.line(Path().M(58, 42).C(74, 46, 88, 52, 96, 66), '#8F9AA8', 3.2, sil=True)
    p.push(compose(tr(100, 88), rot(22)))
    tag = rounded_poly([(0, -30), (16, -16), (16, 28), (-16, 28), (-16, -16)], [4, 4, 6, 6, 4])
    obj(p, tag, RED, RED_S, tone=(-1.2, -1.6))
    p.add(Ell(0, -17, 4.2), C['white'])
    p.add(rrect(-8, -2, 16, 6, 3), C['white'])
    p.add(rrect(-8, 10, 11, 6, 3), '#FFB0C4')
    p.pop()


# ---------------------------------------------------------------- 8. Engaged (« Oui ! »): an open ring box
def engaged(p):
    obj(p, rrect(18, 10, 92, 66, 14), RED, RED_S)
    p.add(rrect(26, 18, 76, 50, 9), '#FFE3EA')
    p.line(Ell(64, 72, 22, 20), C['gold'], 8)
    p.line(arc(64, 72, 22, 196, 250, 20), '#FFE58A', 2.6)
    gem = rounded_poly([(46, 38), (55, 25), (73, 25), (82, 38), (64, 60)], 2.4)
    obj(p, gem, '#9FE3FF', '#5FC4F0', tone=(-1, -1.4))
    p.add(rounded_poly([(55, 25), (73, 25), (69, 38), (59, 38)], 1), '#D9F5FF')
    box = rrect(12, 76, 104, 42, 10)
    obj(p, box, RED, RED_S)
    p.add(rrect(20, 76, 88, 12, 6), '#A3122F')
    p.add(rrect(12, 96, 104, 4, 0), RED_S)
    p.add(Ell(64, 108, 6, 4.4), C['gold'])
    obj(p, sparkle(110, 12, 12), C['gold'], C['gold_s'], tone=None)
    p.sil_add(Ell(110, 12, 8))


# ---------------------------------------------------------------- 9. Married: a tiered wedding cake, a heart on top
def married(p):
    cr, crs = '#FFF4E2', '#EBCFA8'
    pk = C['pink']
    obj(p, Ell(64, 117, 52, 7), C['gold'], C['gold_s'], tone=(-1, -1.2))
    for (x, y, w, h) in ((16, 86, 96, 30), (28, 60, 72, 30), (40, 36, 48, 28)):
        obj(p, rrect(x, y, w, h, 8), cr, crs, tone=(-1.6, -2.2))
        n = int(w / 12)
        step = (w - 4) / n
        dr = Path().M(x + 2, y + 6).L(x + 2, y + 10)
        for k in range(n):
            x0 = x + 2 + k * step
            dr.C(x0 + step * .1, y + 16, x0 + step * .45, y + 16, x0 + step * .5, y + 11)
            dr.C(x0 + step * .55, y + 8, x0 + step * .9, y + 8, x0 + step, y + 10)
        dr.L(x + w - 2, y + 6).Z()
        p.clip_start(rrect(x, y, w, h, 8))
        p.add(rrect(x, y, w, 9, 0), pk)
        p.add(dr, pk)
        p.clip_end()
    heart(p, 64, 20, 30, 0, col=RED)


# ---------------------------------------------------------------- 10. Phoenix: a firebird rising from the flames
def phoenix(p):
    for flip in (False, True):
        p.push(flipx() if flip else (1, 0, 0, 1, 0, 0))
        obj(p, drop(8, 8, 50, 58, 13), C['red'], C['red_s'], tone=(-1.2, -1.6))
        obj(p, drop(4, 40, 50, 64, 12), FIRE, FIRE_S, tone=(-1.2, -1.6))
        obj(p, drop(18, 72, 52, 70, 10), C['gold'], C['gold_s'], tone=(-1, -1.4))
        p.pop()
    base = (Path().M(64, 124).C(42, 124, 22, 118, 18, 106).C(15, 97, 17, 88, 22, 78).C(25, 88, 30, 94, 36, 96)
            .C(36, 87, 39, 79, 46, 72).C(47, 82, 51, 90, 56, 95).L(72, 95).C(77, 90, 81, 82, 82, 72)
            .C(89, 79, 92, 87, 92, 96).C(98, 94, 103, 88, 106, 78).C(111, 88, 113, 97, 110, 106).C(106, 118, 86, 124, 64, 124).Z())
    obj(p, base, C['red'], C['red_s'], tone=(-1.2, -1.6))
    inner = (Path().M(64, 122).C(48, 122, 34, 118, 31, 110).C(30, 105, 31, 100, 34, 95).C(37, 101, 41, 104, 46, 105)
             .C(47, 99, 49, 94, 53, 90).C(56, 97, 60, 101, 64, 102).C(68, 101, 72, 97, 75, 90).C(79, 94, 81, 99, 82, 105)
             .C(87, 104, 91, 101, 94, 95).C(97, 100, 98, 105, 97, 110).C(94, 118, 80, 122, 64, 122).Z())
    p.add(inner, FIRE)
    obj(p, drop(64, 118, 64, 62, 17), FIRE, FIRE_S, tone=(-1.4, -2))
    obj(p, drop(64, 104, 64, 66, 11), C['gold'], C['gold_s'], tone=None)
    for (tx, ty, cx) in ((56, 10, 60), (64, 6, 64), (72, 10, 68)):
        obj(p, drop(tx, ty, cx, 26, 4.4), FIRE, FIRE_S, tone=None)
    obj(p, Ell(64, 38, 13), C['gold'], C['gold_s'], tone=(-1, -1.4))
    p.add(rounded_poly([(59, 42), (69, 42), (64, 51)], 1.4), FIRE)
    ff(p, Ell(58, 37, 2.6, 3.2), INK)
    ff(p, Ell(70, 37, 2.6, 3.2), INK)


# ---------------------------------------------------------------- 11. « Le comte de menthe et cristaux »: a cracked crystal, a sprig of mint
def fake_proof_busted(p):
    pc, ps, lt = C['purple'], C['purple_s'], '#C4A0F4'
    T, R1, R2, B, L2, L1 = (64, 4), (90, 30), (90, 100), (64, 116), (38, 100), (38, 30)
    crack = [(74, 14), (62, 38), (72, 58), (58, 80), (66, 96), (56, 111)]
    left = [T] + crack + [L2, L1]
    right = [crack[0], R1, R2, B] + crack[::-1][:-1]
    face = rounded_poly([L1, T, B, L2], 0)
    for (pts, m) in ((left, compose(tr(-3, 0), rot(-4, 56, 111))), (right, compose(tr(3, 0), rot(4, 56, 111)))):
        p.push(m)
        g = rounded_poly(pts, 1.6)
        obj(p, g, pc, ps)
        p.clip_start(g)
        p.add(face.t(tr(-1.8, -2.8)), lt)
        p.clip_end()
        p.pop()
    p.line(Path().M(30, 124).C(28, 112, 28, 98, 32, 86), C['green_s'], 4, sil=True)
    for (x, y, a, L, W) in ((30, 108, -58, 26, 11), (30, 104, 52, 26, 11), (31, 92, -40, 17, 8), (31, 90, 34, 17, 8)):
        g = leaf(x, y, a, L, W)
        obj(p, g, C['green'], C['green_s'], tone=(-1, -1.2))
        p.line(Path().M(0, -L * .15).L(0, -L * .72).t(compose(tr(x, y), rot(a))), '#A6E3AE', 2)


# ---------------------------------------------------------------- 12. The crow: a black crow, a sealed envelope in its beak
def the_crow(p):
    k, ks = '#3A3F4F', '#262A35'
    obj(p, rounded_poly([(84, 90), (124, 110), (120, 122), (78, 108)], 3), k, ks, tone=(-1, -1.4))
    for x in (64, 78):
        p.line(Path().M(x, 104).L(x - 1, 114), '#5B6070', 4, sil=True)
        p.line(Path().M(x - 7, 116).L(x + 4, 116), '#5B6070', 4, sil=True)
    body = Path().M(40, 62).C(54, 52, 86, 60, 98, 82).C(104, 96, 92, 108, 74, 108).C(54, 108, 36, 94, 34, 80).C(32, 72, 34, 66, 40, 62).Z()
    obj(p, body, k, ks)
    wing = Path().M(52, 70).C(68, 66, 90, 74, 104, 98).C(94, 96, 90, 100, 86, 98).C(80, 100, 74, 98, 70, 94).C(60, 90, 50, 82, 52, 70).Z()
    obj(p, wing, '#262A35', '#171A21', tone=(-1, -1.2))
    obj(p, Ell(46, 46, 21), k, ks)
    obj(p, rounded_poly([(32, 38), (4, 50), (32, 58)], 2.4), '#5B6070', '#454A58', tone=(-.8, -1))
    p.add(Ell(48, 42, 6.2), C['gold'])
    p.add(Ell(47, 42, 3), INK)
    p.add(Ell(48.6, 40.4, 1.2), C['white'])
    p.push(compose(tr(22, 70), rot(-12)))
    obj(p, rrect(-20, -14, 42, 30, 4), C['white'], '#D6DAE4', tone=(-1, -1.4))
    p.line(Path().M(-18, -12).L(1, 4).L(20, -12), '#C3CAD8', 2.6)
    p.add(Ell(1, 4, 6.4), RED)
    p.add(Ell(1, 4, 3), '#FF8FA6')
    p.pop()


# ---------------------------------------------------------------- 13. « Ohh, grand prince »: a megaphone with a little crown
def public_apology(p):
    pc, ps = C['purple'], C['purple_s']
    p.push(rot(-14, 64, 70))
    p.line(Path().M(46, 92).L(54, 114), D, 12, sil=True)
    cone = Path().M(28, 58).L(96, 34).C(108, 50, 110, 92, 96, 110).L(28, 86).Z()
    obj(p, cone, pc, ps)
    obj(p, rrect(10, 54, 22, 36, 7), D, DS, tone=(-1, -1.2))
    p.add(Ell(99, 72, 6, 36), '#C9A8F7')
    crown = rounded_poly([(36, 50), (38, 20), (51, 34), (62, 12), (73, 32), (86, 18), (88, 46)], [2, 3, 2, 3, 2, 3, 2])
    obj(p, crown, C['gold'], C['gold_s'], tone=(-1, -1.4))
    for (x, y) in ((38, 18), (62, 10), (86, 16)):
        obj(p, Ell(x, y, 4.6), C['gold'], C['gold_s'], tone=(-.6, -.8))
    p.add(rounded_poly([(62, 30), (67, 37), (62, 44), (57, 37)], 1), C['pink'])
    p.pop()
    for (x0, y0, x1, y1) in ((110, 34, 122, 24), (114, 64, 126, 62), (112, 94, 122, 102)):
        p.line(Path().M(x0, y0).L(x1, y1), C['gold'], 5.4, sil=True)


# ---------------------------------------------------------------- 14. « Est-ce que c'est bon pour vous ? »: a white flag with a heart
def apology_accepted(p):
    p.line(Path().M(28, 122).L(34, 16), '#A8673A', 7, sil=True)
    flag = Path().M(34, 18).C(54, 8, 70, 26, 90, 20).C(100, 17, 108, 14, 118, 18).L(116, 74).C(106, 70, 98, 72, 88, 76).C(68, 84, 56, 66, 34, 76).Z()
    obj(p, flag, C['white'], '#D6DAE4', tone=(-1.6, -2.6))
    heart(p, 76, 46, 36, -6, col=RED, sil=False)
    obj(p, Ell(34, 13, 7), C['gold'], C['gold_s'], tone=(-.8, -1))


# ---------------------------------------------------------------- 15. « J'fais des trucs un peu malsains »: an open padlock, a bubble escapes
def secret_out(p):
    p.push(rot(-8, 48, 90))
    p.line(Path().M(30, 66).L(30, 42).C(30, 20, 66, 20, 66, 40).L(66, 48), '#AEB6C4', 10, sil=True)
    p.line(Path().M(28, 46).C(30, 32, 40, 28, 48, 28), '#D9DEE7', 3)
    obj(p, rrect(12, 62, 70, 58, 12), C['gold'], C['gold_s'])
    p.add(Ell(47, 84, 7.4), D)
    p.add(rrect(44, 86, 6, 16, 3), D)
    p.pop()
    obj(p, Path().M(74, 40).L(68, 60).L(88, 46).Z(), C['pink'], C['pink_s'], tone=(-1, -1.2))
    obj(p, rrect(66, 8, 56, 42, 20), C['pink'], C['pink_s'])
    p.add(rrect(78, 21, 32, 6, 3), C['white'])
    p.add(rrect(78, 32, 22, 6, 3), C['white'])


# ---------------------------------------------------------------- 16. « Moi j'ai touché le chèque »: a cheque flies away
def cashed_the_check(p):
    for side in (-1, 1):
        x0 = 64 + side * 30
        wing = (Path().M(x0, 60).C(x0 + side * 4, 40, x0 + side * 22, 22, x0 + side * 36, 22).C(x0 + side * 32, 30, x0 + side * 36, 34, x0 + side * 30, 40)
                .C(x0 + side * 34, 46, x0 + side * 28, 52, x0 + side * 22, 52).C(x0 + side * 18, 58, x0 + side * 10, 62, x0, 62).Z())
        p.add(wing, '#F4F7FB', sil=True)
        p.line(wing, '#AEB6C4', 2.4)
        p.line(Path().M(x0 + side * 6, 54).C(x0 + side * 14, 46, x0 + side * 22, 38, x0 + side * 30, 32), '#AEB6C4', 1.8)
    p.push(rot(-10, 64, 80))
    ch = rrect(12, 56, 104, 52, 6)
    obj(p, ch, '#A6E3AE', '#7FD18B')
    p.clip_start(ch)
    p.add(rrect(12, 56, 20, 52, 0), '#7FD18B')
    p.clip_end()
    p.add(rrect(78, 64, 30, 13, 4), C['white'])
    p.add(rrect(40, 66, 30, 5, 2.5), '#57B467')
    p.line(Path().M(48, 94).C(54, 82, 58, 100, 64, 90).C(68, 84, 72, 96, 78, 92).L(104, 92), '#2A9E55', 3.2)
    p.pop()


# ---------------------------------------------------------------- 17. « Gngn je pensais pas ça de toi »: a shield, a splattered tomato
def owned_the_bad_buzz(p):
    sh = Path().M(64, 8).C(80, 16, 98, 18, 114, 16).L(114, 58).C(114, 90, 94, 110, 64, 124).C(34, 110, 14, 90, 14, 58).L(14, 16).C(30, 18, 48, 16, 64, 8).Z()
    obj(p, sh, '#C9D1DB', '#A9B3C0')
    obj(p, sh.t(sc(.8, .8, 64, 62)), C['blue'], C['blue_s'], tone=(-1.2, -1.6))
    radii = [29, 19, 25, 17, 31, 18, 23, 15, 28, 19, 26, 16]
    pts = [(62 + rr * math.cos(math.radians(i * 30 - 75)), 56 + rr * math.sin(math.radians(i * 30 - 75))) for i, rr in enumerate(radii)]
    red, red_s = C['red'], C['red_s']
    p.add(rounded_poly(pts, 5), red)
    for (x, y0, y1, r) in ((50, 66, 90, 4.6), (68, 70, 98, 4.2), (80, 62, 80, 3.4)):
        p.add(capsule(x, y0, x, y1, r), red)
    p.add(rounded_poly([(62 + rr * .55 * math.cos(math.radians(i * 30 - 60)), 56 + rr * .55 * math.sin(math.radians(i * 30 - 60)))
                        for i, rr in enumerate(radii)], 3), red_s)
    p.add(star(60, 52, 10, 3.4, n=5, rotd=-80, round_=1.2), C['green'])
    for (x, y, r) in ((96, 34, 4.4), (28, 40, 3.6), (100, 70, 3)):
        p.add(Ell(x, y, r), red)


# ---------------------------------------------------------------- 18. Hype train: a horned steam engine, in the Minotaur's colours
MINO = dict(navy='#2C2548', navy_s='#1B1630', face='#3B3366', pink='#F0368C', pink_s='#C81F6E', gold='#FFCB2E', gold_s='#EBA514',
            horn='#F2DAA8', horn_s='#D9BC85', ridge='#C79C5E', smoke='#F1EEF7', smoke_s='#CFC8DF')


def hype_train(p):
    M = MINO
    for (x, y, r) in ((74, 14, 8.5), (90, 9, 8), (104, 16, 6.5)):
        obj(p, Ell(x, y, r), M['smoke'], M['smoke_s'], tone=(-1, -1.4))
    # three-quarter view: the far horn behind the boiler, the cab, the boiler and its chimney
    p.add(Path().M(38, 54).C(42, 42, 50, 32, 62, 28).C(58, 36, 56, 46, 52, 56).Z(), M['horn_s'], sil=True)
    obj(p, rrect(86, 38, 34, 64, 6), M['navy'], M['navy_s'])
    obj(p, rrect(82, 30, 42, 11, 5), M['pink'], M['pink_s'], tone=(-1, -1.2))
    p.add(rrect(93, 48, 19, 20, 5), '#BDE7FF')
    boiler = rrect(26, 52, 66, 38, 10)
    obj(p, boiler, M['navy'], M['navy_s'])
    p.clip_start(boiler)
    for x in (56, 72):
        p.add(rrect(x, 48, 7, 46, 0), M['pink'])
    p.clip_end()
    p.add(rounded_poly([(64, 30), (84, 30), (80, 52), (68, 52)], 2.4), M['navy'], sil=True)
    p.add(rrect(61, 26, 26, 7, 3), M['pink'], sil=True)
    # the front, seen at an angle: the badge of the conductor's cap, the near horn
    obj(p, Ell(30, 71, 15, 21), M['face'], M['navy_s'], tone=(-1, -1.4))
    p.add(Ell(29, 64, 5.4, 6.2), M['gold'])
    p.add(Ell(29, 64, 2.2), M['pink'])
    near = Path().M(26, 56).C(14, 54, 4, 44, 6, 18).C(12, 33, 22, 40, 36, 44).Z()
    obj(p, near, M['horn'], M['horn_s'], tone=(-1, -1.2))
    for q in (Path().M(14, 44).Q(16.5, 39, 17, 35), Path().M(9.5, 36).Q(11.5, 32, 12, 28)):
        p.line(q, M['ridge'], 2.0, opacity=.6)
    obj(p, rounded_poly([(4, 118), (20, 94), (34, 94), (34, 118)], 3), M['pink'], M['pink_s'], tone=(-1, -1.2))
    p.add(rrect(26, 88, 98, 10, 4), M['navy_s'], sil=True)
    for (cx, r) in ((50, 15), (95, 17)):
        p.add(Ell(cx, 104, r), M['navy_s'], sil=True)
        p.add(Ell(cx, 104, r - 6), M['pink'])
        p.add(Ell(cx, 104, 4), M['gold'])
    p.line(Path().M(50, 108).L(95, 108), M['gold'], 4)


# ---------------------------------------------------------------- 19. Cancelled: an extinguisher puts out a little flame
def cancelled(p):
    p.line(Path().M(50, 36).C(66, 28, 80, 30, 88, 42), D, 6.4, sil=True)
    obj(p, rounded_poly([(84, 36), (96, 44), (90, 52), (80, 46)], 2), D, DS, tone=(-.8, -1))
    p.line(Path().M(34, 30).L(62, 18), D, 6, sil=True)
    obj(p, rrect(32, 26, 24, 18, 4), D, DS, tone=(-1, -1.2))
    cyl = rrect(20, 40, 48, 82, 18)
    obj(p, cyl, RED, RED_S)
    p.clip_start(cyl)
    p.add(rrect(0, 70, 128, 20, 0), C['white'])
    p.clip_end()
    p.add(rrect(34, 75, 20, 4, 2), '#C3CAD8')
    p.add(rrect(34, 82, 14, 4, 2), '#C3CAD8')
    fl = (Path().M(106, 122).C(94, 122, 88, 114, 90, 104).C(92, 96, 98, 94, 100, 86).C(106, 92, 108, 96, 108, 100)
          .C(112, 98, 114, 94, 114, 92).C(120, 100, 120, 110, 116, 116).C(114, 120, 110, 122, 106, 122).Z())
    obj(p, fl, FIRE, FIRE_S, tone=(-1, -1.2))
    p.add(Path().M(106, 120).C(100, 120, 97, 116, 98, 111).C(99, 107, 103, 106, 104, 102).C(108, 106, 110, 109, 110, 112)
          .C(110, 117, 108, 120, 106, 120).Z(), C['face'])
    for (x, y, r) in ((98, 58, 10), (110, 72, 11), (96, 80, 9), (114, 92, 8.5), (100, 98, 8)):
        puff(p, x, y, r)


# ---------------------------------------------------------------- 20. Gaining traction: a rising curve and a new follower
def gaining_traction(p):
    col = C['green']
    p.line(Path().M(12, 96).C(36, 96, 52, 92, 64, 76).C(74, 62, 82, 40, 96, 26), col, 12, sil=True)
    p.add(arrowhead(112, 12, math.radians(-45), 22, 16, 3), col, sil=True)
    bc, bs = C['blue'], C['blue_s']
    obj(p, Path().M(70, 122).C(70, 104, 80, 96, 94, 96).C(108, 96, 118, 104, 118, 122).Z(), bc, bs, tone=(-1.2, -1.6))
    obj(p, Ell(94, 80, 12.5), bc, bs, tone=(-1, -1.4))


SUCCES = [
    ('gilf-lover', gilf_lover), ('date-from-hell', date_from_hell), ('stood-up', stood_up), ('ghosted', ghosted),
    ('ex-comeback', ex_comeback), ('express-wedding', express_wedding), ('ungrateful', ungrateful), ('engaged', engaged),
    ('married', married), ('phoenix', phoenix), ('fake-proof-busted', fake_proof_busted), ('the-crow', the_crow),
    ('public-apology', public_apology), ('apology-accepted', apology_accepted), ('secret-out', secret_out),
    ('cashed-the-check', cashed_the_check), ('owned-the-bad-buzz', owned_the_bad_buzz), ('hype-train', hype_train),
    ('cancelled', cancelled), ('gaining-traction', gaining_traction),
]
