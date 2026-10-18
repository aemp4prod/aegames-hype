"""0.27: the second batch, more objects and the symbols (style D)."""
import math
from parts import *
from symbols import obj

D, DS = C['dark'], C['dark_s']
G, GS = C['grey'], C['grey_s']
RED, RED_S = C['heart'], '#D02247'


def mallette(p):
    p.line(Path().M(44, 38).L(44, 26).C(44, 18, 48, 16, 54, 16).L(74, 16).C(80, 16, 84, 18, 84, 26).L(84, 38), '#5E361C', 8, sil=True)
    case = rrect(8, 36, 112, 80, 12)
    obj(p, case, '#A8673A', '#8A4F27')
    p.add(rrect(8, 64, 112, 8, 0), '#8A4F27')
    obj(p, rrect(54, 58, 20, 20, 4), C['gold'], C['gold_s'], tone=(-.8, -1))
    p.add(rrect(60, 66, 8, 6, 2), '#B8860B')


def colis(p):
    top = Path().M(64, 8).L(120, 32).L(64, 56).L(8, 32).Z()
    left = Path().M(8, 32).L(64, 56).L(64, 122).L(8, 96).Z()
    right = Path().M(64, 56).L(120, 32).L(120, 96).L(64, 122).Z()
    p.sil_add(Path().M(64, 8).L(120, 32).L(120, 96).L(64, 122).L(8, 96).L(8, 32).Z())
    p.add(left, '#D9A066')
    p.add(right, '#C0864C')
    p.add(top, '#EDBB82')
    p.add(Path().M(36, 20).L(92, 44).L(92, 52).L(36, 28).Z(), '#F7E1C0')
    p.add(Path().M(92, 44).L(92, 110).L(84, 114).L(84, 48).Z(), '#F0D3A8')
    p.add(rrect(18, 64, 30, 18, 2).t((1, .43, 0, 1, 0, -8)), C['white'])
    p.line(Path().M(22, 64).L(42, 72.6), '#AAB2C0', 2.4)
    p.line(Path().M(22, 70).L(36, 76), '#AAB2C0', 2.4)


def etiquette(p):
    p.push(rot(-30, 64, 64))
    tag = rounded_poly([(30, 24), (110, 24), (110, 104), (30, 104), (8, 64)], [6, 10, 10, 6, 4])
    obj(p, tag, C['heart'], RED_S)
    p.add(Ell(28, 64, 8), C['white'])
    p.add(rrect(46, 48, 52, 9, 4.5), C['white'])
    p.add(rrect(46, 66, 36, 9, 4.5), '#FFB0C4')
    p.pop()
    p.line(Path().M(30, 46).C(20, 30, 26, 14, 40, 8), '#8F9AA8', 4, sil=True)


def calendrier(p):
    page = rrect(10, 16, 108, 102, 14)
    obj(p, page, C['white'], '#D6DAE4')
    p.clip_start(page)
    p.add(rrect(0, 0, 128, 44, 0), C['heart'])
    p.clip_end()
    for x in (36, 92):
        obj(p, rrect(x - 5, 6, 10, 22, 5), D, DS, tone=(-.8, -1))
    p.add(rrect(28, 24, 72, 9, 4.5), '#FFB0C4')
    for r in range(3):
        for c in range(4):
            x, y = 22 + c * 23, 54 + r * 19
            col = C['heart'] if (r, c) == (1, 2) else '#C9D0DC'
            p.add(rrect(x, y, 14, 12, 3), col)


def maison(p):
    obj(p, rrect(84, 18, 14, 30, 3), '#8A4F27', '#6E3B1A', tone=(-.8, 0))
    roof = rounded_poly([(64, 8), (122, 58), (6, 58)], [8, 6, 6])
    walls = rrect(20, 52, 88, 68, 6)
    obj(p, walls, '#FFE3B8', '#EBC690')
    obj(p, roof, C['heart'], RED_S)
    obj(p, rrect(52, 78, 24, 42, 5), '#7A4A2A', '#5E361C', tone=(-1, 0))
    p.add(Ell(70, 100, 2.4), C['gold'])
    for x in (28, 84):
        p.add(rrect(x, 68, 18, 18, 3), '#7FD3FF')
        p.add(rrect(x + 8, 68, 2, 18, 0), C['white'])
        p.add(rrect(x, 76, 18, 2, 0), C['white'])


def billets(p):
    for k, (dx, dy, a) in enumerate(((18, 26, -18), (54, 14, 8), (40, 56, -6))):
        p.push(rot(a, dx + 30, dy + 18))
        note = rrect(dx, dy, 60, 36, 5)
        obj(p, note, '#7FD18B', '#57B467', tone=(-1, -1.4))
        p.add(rrect(dx + 6, dy + 6, 48, 24, 3), '#A6E3AE')
        p.add(Ell(dx + 30, dy + 18, 9), '#57B467')
        p.add(Ell(dx + 30, dy + 18, 5), '#A6E3AE')
        p.pop()
    for (x0, y0, x1, y1) in ((92, 96, 112, 104), (86, 108, 104, 120), (100, 84, 118, 88)):
        p.line(Path().M(x0, y0).L(x1, y1), '#C9D0DC', 4.4, sil=True)
    for side in (-1, 1):  # the wings, on the top note
        wing = (Path().M(84, 22).C(84 + side * 8, 6, 84 + side * 26, 0, 84 + side * 36, 4).C(84 + side * 30, 10, 84 + side * 34, 14, 84 + side * 28, 18)
                .C(84 + side * 32, 22, 84 + side * 26, 26, 84 + side * 20, 26).C(84 + side * 14, 28, 84 + side * 6, 28, 84, 26).Z())
        p.add(wing, '#F4F7FB', sil=True)
        p.line(wing, '#AEB6C4', 2.4)
        p.line(Path().M(84 + side * 8, 22).C(84 + side * 16, 16, 84 + side * 24, 12, 84 + side * 30, 10), '#AEB6C4', 1.8)


def selfie(p):
    p.push(rot(-14, 64, 64))
    ph = rrect(48, 8, 52, 92, 12)
    obj(p, ph, D, DS)
    p.add(rrect(56, 16, 22, 22, 7), '#4A4F60')
    for (x, y) in ((62, 22), (72, 22), (62, 32)):
        p.add(Ell(x, y, 3.6), '#1A1D25')
        p.add(Ell(x - 1, y - 1, 1.2), '#7D86A0')
    p.add(Ell(88, 22, 2.4), '#FFF3B0')
    p.pop()
    arm = Path().M(4, 126).C(10, 108, 22, 94, 40, 86).L(54, 80).L(62, 98).L(44, 108).C(30, 114, 22, 122, 18, 128).Z()
    skin(p, arm, tone=(-2, -2))
    for (y, w) in ((60, 26), (72, 28), (84, 26)):
        skin(p, rrect(44, y, w, 12, 6).t(rot(-14, 64, 64)), tone=(0, -2.4))
    thumb = capsule(40, 70, 52, 48, 7).t(rot(-14, 64, 64))
    skin(p, thumb, tone=(-1.6, 0))
    p.add(Ell(51, 49, 3, 4.4, -14).t(rot(-14, 64, 64)), C['nail'])


# ---------------------------------------------------------------- symbols
def bulle(p):
    b = (Path().M(64, 10).C(98, 10, 120, 30, 120, 56).C(120, 82, 98, 102, 64, 102).C(56, 102, 48, 101, 42, 99)
         .L(14, 118).L(24, 88).C(14, 79, 8, 68, 8, 56).C(8, 30, 30, 10, 64, 10).Z())
    obj(p, b, C['white'], '#D6DAE4', tone=(-2, -2.6))
    for x in (40, 64, 88):
        p.add(Ell(x, 56, 7.6), '#8F9AA8')


def megaphone(p):
    p.push(rot(-12, 64, 64))
    p.line(Path().M(42, 86).L(52, 112), C['heart'], 12, sil=True)
    cone = Path().M(26, 44).L(98, 14).C(110, 30, 112, 82, 98, 108).L(26, 80).Z()
    obj(p, cone, C['heart'], RED_S)
    obj(p, rrect(8, 42, 22, 40, 7), D, DS, tone=(-1, -1.2))
    p.add(Ell(101, 61, 6, 44), '#FF8FA6')
    p.pop()
    for (x0, y0, x1, y1) in ((112, 30, 124, 20), (116, 60, 128, 60), (112, 90, 124, 100)):
        p.line(Path().M(x0, y0).L(x1, y1), C['gold'], 5.4, sil=True)


def _chart(p, up):
    card = rrect(10, 12, 108, 104, 14)
    obj(p, card, C['white'], '#D6DAE4')
    for y in (36, 58, 80):
        p.add(rrect(22, y, 84, 2.4, 1.2), '#E4E8F0')
    col = C['green'] if up else C['heart']
    pts = [(24, 96), (46, 74), (64, 84), (86, 50), (104, 30)] if up else [(24, 32), (46, 56), (64, 46), (86, 80), (104, 98)]
    line = Path().M(*pts[0])
    for pt in pts[1:]:
        line.L(*pt)
    p.line(line, col, 8)
    ex, ey = pts[-1]
    a = math.atan2(ey - pts[-2][1], ex - pts[-2][0])
    tip = [(ex + 10 * math.cos(a), ey + 10 * math.sin(a)), (ex + 12 * math.cos(a + 2.2), ey + 12 * math.sin(a + 2.2)),
           (ex + 12 * math.cos(a - 2.2), ey + 12 * math.sin(a - 2.2))]
    p.add(rounded_poly(tip, 1.6), col)


def hausse(p):
    _chart(p, True)


def baisse(p):
    _chart(p, False)


def boum(p):
    burst = star(64, 64, 60, 30, n=9, rotd=-80, round_=3)
    obj(p, burst, C['orange'], '#E4470B', tone=(-1.6, -2))
    p.add(star(64, 64, 38, 20, n=9, rotd=-60, round_=2), C['gold'])
    p.add(star(64, 64, 18, 10, n=7, rotd=-90, round_=1.4), '#FFF3B8')


def petard(p):
    p.push(rot(-30, 64, 70))
    stick = rrect(36, 44, 40, 78, 8)
    obj(p, stick, C['heart'], RED_S)
    p.add(rrect(36, 58, 40, 8, 0), C['white'])
    p.add(rrect(36, 100, 40, 8, 0), C['white'])
    obj(p, Ell(56, 46, 20, 6), '#FF8FA6', '#E8456A', tone=(-.6, -.8))
    p.line(Path().M(56, 44).C(56, 30, 66, 26, 70, 16), '#7A4A2A', 4.4, sil=True)
    p.pop()
    obj(p, sparkle(98, 20, 16, .22), C['gold'], C['gold_s'], tone=(-.8, -1))
    obj(p, sparkle(98, 20, 8, .2), C['orange'], '#E4470B', tone=None)


def attention(p):
    tri = rounded_poly([(64, 8), (122, 112), (6, 112)], [12, 10, 10])
    obj(p, tri, C['gold'], C['gold_s'])
    p.add(rounded_poly([(58, 40), (70, 40), (67, 80), (61, 80)], 3), D)
    p.add(Ell(64, 94, 6.6), D)


def interdit(p):
    ring = Ell(64, 64, 46)
    p.sil_add(Ell(64, 64, 56))
    p.line(ring, C['heart'], 18)
    p.line(Path().M(31, 31).L(97, 97), C['heart'], 18)
    p.add(Ell(48, 34, 6, 3, -40), C['white'], opacity=.85)


def lune(p):
    moon = Path().M(78, 8).C(42, 10, 18, 38, 18, 70).C(18, 102, 44, 122, 74, 122).C(94, 122, 110, 112, 118, 98).C(78, 104, 52, 80, 52, 50).C(52, 32, 62, 16, 78, 8).Z()
    obj(p, moon, C['gold'], C['gold_s'], tone=(-2, -2.6))
    p.add(Ell(38, 74, 6), '#F5BE21')
    p.add(Ell(50, 100, 4.4), '#F5BE21')
    for (x, y, r) in ((96, 30, 9), (112, 58, 6)):
        obj(p, sparkle(x, y, r), C['gold'], C['gold_s'], tone=None)


def soleil_leve(p):
    card = rrect(8, 8, 112, 112, 22)
    obj(p, card, '#FF9F6B', '#F57F48', tone=None)
    p.clip_start(card)
    p.add(rrect(0, 0, 128, 40, 0), '#FFB98C')
    p.add(Ell(64, 80, 30), C['gold'])
    p.add(Ell(64, 80, 22), '#FFE58A')
    p.add(rrect(0, 80, 128, 48, 0), '#4D8FE8')
    for (y, x0, x1) in ((88, 40, 88), (98, 30, 98), (108, 46, 82)):
        p.add(rrect(x0, y, x1 - x0, 4, 2), '#FFD06B')
    p.add(rrect(0, 112, 128, 16, 0), '#3B78CF')
    p.clip_end()


def papillon(p):
    for flip in (False, True):
        m = flipx() if flip else (1, 0, 0, 1, 0, 0)
        p.push(m)
        up = Path().M(62, 60).C(52, 30, 34, 10, 16, 16).C(4, 22, 8, 48, 22, 58).C(32, 66, 50, 66, 62, 62).Z()
        low = Path().M(62, 66).C(48, 66, 30, 72, 26, 88).C(22, 104, 36, 116, 48, 108).C(58, 100, 62, 82, 62, 66).Z()
        obj(p, up, '#5BA8F5', '#3B88DA')
        obj(p, low, '#8C7BF0', '#6E5CD4', tone=(-1.2, -1.6))
        p.add(Ell(28, 34, 7), C['white'], opacity=.9)
        p.add(Ell(40, 92, 5), C['white'], opacity=.9)
        p.pop()
    obj(p, capsule(64, 46, 64, 98, 6), D, DS, tone=(-.8, 0))
    for flip in (False, True):
        a = Path().M(62, 46).C(58, 34, 52, 26, 44, 22)
        p.line(a.t(flipx()) if flip else a, D, 3.4, sil=True)


def soleil(p):
    for k in range(10):
        a = math.radians(k * 36 - 90)
        cx, cy = 64 + 50 * math.cos(a), 64 + 50 * math.sin(a)
        ray = rounded_poly([(64 + 36 * math.cos(a - .2), 64 + 36 * math.sin(a - .2)), (cx + 8 * math.cos(a), cy + 8 * math.sin(a)),
                            (64 + 36 * math.cos(a + .2), 64 + 36 * math.sin(a + .2))], 3)
        obj(p, ray, C['orange'], '#E4470B', tone=None)
    obj(p, Ell(64, 64, 34), C['gold'], C['gold_s'], tone=(-1.8, -2.4))
    p.add(Ell(52, 50, 6, 3.6, -30), '#FFF3B8')


OBJETS_2 = [('mallette', mallette), ('colis', colis), ('etiquette', etiquette), ('calendrier', calendrier), ('maison', maison),
            ('billets', billets), ('selfie', selfie)]
SYMBOLES2 = [('bulle', bulle), ('megaphone', megaphone), ('hausse', hausse), ('baisse', baisse), ('boum', boum), ('petard', petard),
             ('attention', attention), ('interdit', interdit), ('lune', lune), ('soleil-leve', soleil_leve), ('papillon', papillon),
             ('soleil', soleil)]
OBJETS_2 += SYMBOLES2
