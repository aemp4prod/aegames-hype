"""0.27: the second batch, objects of a creator's life (style D: flat two tones, white die-cut border, small shadow)."""
import math
from parts import *
from symbols import obj, SK

D, DS = C['dark'], C['dark_s']
G, GS = C['grey'], C['grey_s']


def telephone(p):
    body = rrect(32, 6, 64, 116, 15)
    obj(p, body, D, DS)
    p.add(rrect(38, 13, 52, 102, 9), '#BDE7FF')
    p.clip_start(rrect(38, 13, 52, 102, 9))
    p.add(Path().M(38, 84).L(90, 52).L(90, 116).L(38, 116).Z(), '#9AD9FB')
    p.clip_end()
    p.add(capsule(55, 21, 73, 21, 3.6), D)
    for i, col in enumerate((C['pink'], C['gold'], C['green'])):
        p.add(rrect(45 + i * 14, 34, 10, 10, 3), col)
    p.add(rrect(45, 54, 38, 7, 3.5), C['white'])
    p.add(rrect(45, 66, 26, 7, 3.5), C['white'])
    p.add(capsule(55, 107, 73, 107, 2.2), D)


def appareil(p):
    obj(p, rrect(20, 24, 30, 18, 5), D, DS, tone=(-1, -1.4))
    body = rrect(8, 36, 112, 80, 16)
    obj(p, body, G, GS)
    p.clip_start(body)
    p.add(rrect(0, 58, 128, 36, 0), '#3A3F4F')
    p.clip_end()
    p.add(Ell(64, 76, 31), G)
    p.add(Ell(64, 76, 25), D)
    p.add(Ell(64, 76, 15), '#3E5A85')
    p.add(Ell(64, 76, 7), '#22324A')
    glint(p, 57, 69, 5)
    p.add(rrect(92, 44, 18, 8, 3), '#FFF3B0')
    p.add(Ell(24, 48, 4.2), C['heart'])


def clap(p):
    board = rrect(12, 48, 104, 70, 8)
    obj(p, board, D, DS)
    p.add(rrect(20, 66, 88, 4, 2), '#5B6070')
    p.add(rrect(20, 82, 60, 4, 2), '#5B6070')
    p.add(rrect(20, 98, 74, 4, 2), '#5B6070')
    p.push(rot(-14, 14, 44))
    top = rrect(10, 26, 106, 20, 5)
    obj(p, top, C['white'], '#D6DAE4', tone=(-1, -1.4))
    p.clip_start(top)
    for x in (14, 40, 66, 92):
        p.add(Path().M(x, 26).L(x + 14, 26).L(x + 4, 46).L(x - 10, 46).Z(), D)
    p.clip_end()
    p.pop()
    obj(p, Ell(17, 47, 6), C['heart'], '#D02247', tone=(-.8, -1))


def micro_studio(p):
    p.line(Path().M(34, 62).C(34, 90, 48, 101, 64, 101).C(80, 101, 94, 90, 94, 62), '#8F9AA8', 7, sil=True)
    obj(p, rrect(58, 100, 12, 14, 2), '#8F9AA8', '#6F7A88', tone=(-1, 0))
    obj(p, rrect(36, 112, 56, 10, 5), D, DS, tone=(-1, -1.2))
    head = rrect(42, 6, 44, 86, 22)
    obj(p, head, '#C9D1DB', '#A9B3C0')
    p.clip_start(head)
    for y in (22, 32, 42, 52, 62, 72):
        p.line(Path().M(40, y).L(88, y), '#8F9AA8', 2.4)
    p.add(rrect(40, 44, 48, 12, 0), C['pink'])
    p.clip_end()
    glint(p, 53, 20, 4.4)


def casque(p):
    band = Path().M(22, 74).C(18, 34, 40, 10, 64, 10).C(88, 10, 110, 34, 106, 74)
    p.line(band, D, 13, sil=True)
    p.line(band, '#5B6070', 5)
    for flip in (False, True):
        cup = rrect(8, 60, 32, 52, 14)
        pad = rrect(30, 66, 10, 40, 5)
        if flip:
            cup, pad = cup.t(flipx()), pad.t(flipx())
        obj(p, cup, C['pink'], C['pink_s'])
        p.add(pad, D)
    p.add(Ell(24, 86, 6), '#FF9CCB')
    p.add(Ell(104, 86, 6), '#FF9CCB')


def manette(p):
    body = (Path().M(30, 38).C(44, 34, 84, 34, 98, 38).C(116, 42, 124, 70, 122, 92).C(121, 106, 110, 112, 100, 104)
            .C(92, 97, 88, 88, 80, 86).L(48, 86).C(40, 88, 36, 97, 28, 104).C(18, 112, 7, 106, 6, 92)
            .C(4, 70, 12, 42, 30, 38).Z())
    obj(p, body, '#5B6BD9', '#4453B8')
    p.add(rrect(26, 56, 24, 8, 2.5), C['white'])
    p.add(rrect(34, 48, 8, 24, 2.5), C['white'])
    for (x, y, col) in ((92, 50, C['gold']), (104, 60, C['heart']), (80, 60, C['green']), (92, 70, C['blue'])):
        p.add(Ell(x, y, 5.6), col)
    p.add(capsule(56, 50, 62, 50, 2.4), '#C7CDF5')
    p.add(capsule(66, 50, 72, 50, 2.4), '#C7CDF5')


def pellicule(p):
    p.push(rot(-12, 64, 64))
    strip = rrect(10, 30, 108, 68, 6)
    obj(p, strip, D, DS)
    for k in range(8):
        x = 15 + k * 13
        p.add(rrect(x, 35, 7, 7, 1.6), C['white'])
        p.add(rrect(x, 86, 7, 7, 1.6), C['white'])
    for k, col in enumerate(('#FFB86B', '#7FD3FF', '#FF8FB8')):
        p.add(rrect(16 + k * 33, 48, 30, 32, 3), col)
    p.add(Path().M(20, 80).L(30, 64).L(38, 74).L(42, 68).L(46, 80).Z(), '#E8873A')
    p.add(Ell(70, 60, 5), C['white'])
    p.pop()


def ampoule(p):
    glass = Path().M(64, 8).C(90, 8, 104, 28, 104, 48).C(104, 66, 92, 74, 86, 86).L(42, 86).C(36, 74, 24, 66, 24, 48).C(24, 28, 38, 8, 64, 8).Z()
    obj(p, glass, C['gold'], C['gold_s'])
    p.line(Path().M(54, 84).L(57, 56).Q(64, 50, 71, 56).L(74, 84), '#E59A0C', 3.4)
    for (y, w) in ((88, 44), (99, 40), (110, 34)):
        obj(p, rrect(64 - w / 2, y, w, 10, 5), '#AEB6C4', '#8F99AA', tone=(-1, -1))
    glint(p, 44, 32, 7, 4.4)
    for a in (-150, -110, -70, -30):
        r0, r1 = 60, 70
        x0, y0 = 64 + r0 * math.cos(math.radians(a)), 50 + r0 * math.sin(math.radians(a))
        x1, y1 = 64 + r1 * math.cos(math.radians(a)), 50 + r1 * math.sin(math.radians(a))
        if y1 > 2:
            p.line(Path().M(x0, y0).L(x1, y1), C['gold'], 6, sil=True)


def cafe(p):
    obj(p, Ell(60, 108, 50, 12), G, GS, tone=(-1, -1.6))
    p.line(Path().M(90, 62).C(110, 60, 112, 88, 90, 90), '#F25A8A', 9, sil=True)
    cup = Path().M(20, 52).L(100, 52).L(96, 88).C(94, 104, 82, 110, 60, 110).C(38, 110, 26, 104, 24, 88).Z()
    obj(p, cup, '#FF6FA8', '#E8457F')
    p.add(Ell(60, 53, 40, 7), '#7A4A2A')
    p.add(Ell(60, 54, 32, 4.4), '#9A6238')
    for x in (44, 60, 76):
        p.line(Path().M(x, 40).C(x - 6, 32, x + 6, 26, x, 16), '#D9DEE7', 5, sil=True)


def trinque(p):
    for flip in (False, True):
        m = flipx() if flip else (1, 0, 0, 1, 0, 0)
        p.push(compose(m, rot(-16, 40, 64)))
        glass = Path().M(22, 10).L(58, 10).C(58, 34, 52, 50, 40, 52).C(28, 50, 22, 34, 22, 10).Z()
        obj(p, glass, '#E9F4FF', '#C6DCEF', tone=(-1, -1.4))
        p.clip_start(glass)
        p.add(rrect(18, 22, 44, 40, 0), '#FFD45C')
        for (bx, by, br) in ((32, 36, 2.4), (44, 30, 2), (38, 44, 1.8)):
            p.add(Ell(bx, by, br), '#FFF3B8')
        p.clip_end()
        p.line(Path().M(40, 52).L(40, 98), '#C6DCEF', 6, sil=True)
        obj(p, Ell(40, 104, 16, 5), '#E9F4FF', '#C6DCEF', tone=(-1, -1))
        p.pop()
    for (x, y, r) in ((64, 14, 7), (52, 6, 4), (78, 8, 4.6)):
        obj(p, sparkle(x, y, r), C['gold'], C['gold_s'], tone=(-.6, -.8))


def bieres(p):
    for flip in (False, True):
        m = flipx() if flip else (1, 0, 0, 1, 0, 0)
        p.push(compose(m, rot(-12, 40, 70)))
        p.line(Path().M(58, 56).C(74, 56, 74, 88, 58, 88), '#F2C14E', 7, sil=True)
        mug = rrect(14, 42, 46, 70, 8)
        obj(p, mug, '#FFB52E', '#E8920C')
        for x in (26, 38, 50):
            p.add(rrect(x - 2, 52, 4, 52, 2), '#FFD06B')
        foam = Path().M(12, 46).C(10, 36, 18, 28, 26, 32).C(30, 24, 42, 24, 46, 30).C(54, 26, 64, 32, 62, 44).C(56, 50, 20, 52, 12, 46).Z()
        obj(p, foam, C['white'], '#E6E1D8', tone=(-1, -1.2))
        p.pop()


def boisson(p):
    p.line(Path().M(70, 30).L(78, 6).L(96, 6), C['heart'], 7, sil=True)
    cup = Path().M(30, 36).L(98, 36).L(90, 120).L(38, 120).Z()
    obj(p, cup, C['heart'], '#D02247')
    p.clip_start(cup)
    p.add(rrect(20, 64, 90, 26, 0), C['white'])
    p.clip_end()
    obj(p, rrect(24, 28, 80, 14, 6), C['white'], '#E3E6EE', tone=(-1, -1.2))
    p.add(Ell(64, 77, 9, 7), C['heart'])


def pizza(p):
    p.push(rot(8, 64, 64))
    crust = Path().M(14, 22).C(40, 6, 88, 6, 114, 22).L(64, 122).Z()
    obj(p, crust, '#F2B45C', '#D9933A')
    cheese = Path().M(22, 30).C(46, 18, 82, 18, 106, 30).L(64, 112).Z()
    p.add(cheese, '#FFD54A')
    for (x, y, r) in ((50, 40, 8), (78, 42, 8), (64, 64, 7.4), (56, 86, 6), (74, 82, 5)):
        p.add(Ell(x, y, r), '#E2463A')
        p.add(Ell(x - r * .3, y - r * .3, r * .3), '#FF8A78')
    p.add(Path().M(36, 28).C(36, 40, 40, 44, 36, 52).L(32, 44).Z(), '#FFE58A')
    p.pop()


def shopping(p):
    for (x, col, cs, rd) in ((10, C['blue'], C['blue_s'], -6), (46, C['pink'], C['pink_s'], 6)):
        p.push(rot(rd, x + 36, 100))
        bag = Path().M(x, 44).L(x + 72, 44).L(x + 66, 118).L(x + 6, 118).Z()
        p.line(Path().M(x + 20, 52).L(x + 20, 34).C(x + 20, 18, x + 52, 18, x + 52, 34).L(x + 52, 52), '#3A3F4F', 5, sil=True)
        obj(p, bag, col, cs)
        p.add(Ell(x + 20, 54, 3.4), '#3A3F4F')
        p.add(Ell(x + 52, 54, 3.4), '#3A3F4F')
        p.pop()
    obj(p, star(84, 88, 13, 5.6, round_=1.4), C['gold'], C['gold_s'], tone=(-.8, -1))


def basket(p):
    sole = Path().M(6, 98).L(122, 98).C(124, 108, 118, 116, 106, 116).L(14, 116).C(8, 116, 4, 108, 6, 98).Z()
    obj(p, sole, C['white'], '#D6DAE4', tone=(-1, -1.4))
    up = (Path().M(8, 98).C(6, 80, 12, 62, 24, 54).L(44, 40).C(50, 36, 58, 38, 60, 46).L(64, 58).C(80, 62, 100, 70, 112, 78)
          .C(120, 84, 122, 92, 122, 98).Z())
    obj(p, up, C['heart'], '#D02247')
    p.clip_start(up)
    p.add(Path().M(0, 84).C(30, 76, 70, 86, 128, 80).L(128, 128).L(0, 128).Z(), '#FFFFFF')
    p.add(Path().M(10, 86).C(34, 80, 66, 88, 120, 84).L(120, 90).C(66, 94, 34, 86, 10, 92).Z(), '#2E3442')
    p.clip_end()
    for k in range(4):
        p.line(Path().M(48 + k * 7, 50 + k * 3).L(58 + k * 7, 46 + k * 3), C['white'], 3.6)
    p.add(Path().M(76, 70).C(86, 66, 100, 72, 104, 80).C(94, 76, 84, 76, 76, 70).Z(), C['white'])


OBJETS_1 = [('telephone', telephone), ('appareil', appareil), ('clap', clap), ('micro-studio', micro_studio), ('casque', casque),
            ('manette', manette), ('pellicule', pellicule), ('ampoule', ampoule), ('cafe', cafe), ('trinque', trinque),
            ('bieres', bieres), ('boisson', boisson), ('pizza', pizza), ('shopping', shopping), ('basket', basket)]
