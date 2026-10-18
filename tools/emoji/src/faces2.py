"""0.27: the second batch, faces, hands and hearts (style D)."""
import math
from parts import *
from faces import open_eyes, white_eye, pointing_hand
from hands import open_hand, cuff
from symbols import obj
from geom import unit_heart, heart_m


# ---------------------------------------------------------------- faces
def sourire_leger(p):
    face(p)
    open_eyes(p, 53, 19, 6.2, 8.4)
    fs(p, smile_line(64, 80, 34, 8), 6.0)


def soulage(p):
    face(p)
    blush(p, 31, 74, 10, 6, '#FFA6BC')
    blush(p, 97, 74, 10, 6, '#FFA6BC')
    fs(p, Path().M(33, 36).Q(44, 31, 55, 36), 4.4)
    fs(p, Path().M(73, 36).Q(84, 31, 95, 36), 4.4)
    fs(p, cup_eye(45, 55, 20, 8), 6.0)
    fs(p, cup_eye(83, 55, 20, 8), 6.0)
    fs(p, smile_line(64, 82, 26, 6), 5.8)


def entre_doigts(p):
    face(p)
    white_eye(p, 84, 52, 11, 12.5, 86, 54, 5)
    fs(p, Path().M(72, 34).Q(84, 28, 96, 33), 4.6)
    ff(p, Ell(64, 90, 7, 5.4), C['mouth'])
    # the hand over the other eye, fingers apart
    p.push(compose(tr(44, 74), rot(10), sc(1.06)))
    for (x, top, r) in ((-20, -44, 6.4), (-7, -50, 6.6), (6, -48, 6.4), (18, -40, 5.8)):
        skin(p, capsule(x, 6, x, top + r, r), tone=(-1.4, 0), outline=3.0)
    skin(p, rrect(-27, -6, 52, 34, 13), tone=(-2, -2.4), outline=3.0)
    for x in (-13.5, -.5, 12):
        p.line(Path().M(x, -2).L(x, 6), C['crease'], 2.4)
    p.pop()


def emu(p):
    face(p)
    fs(p, Path().M(29, 40).Q(39, 37, 49, 31), 4.6)
    fs(p, Path().M(99, 40).Q(89, 37, 79, 31), 4.6)
    for cx in (44, 84):
        ff(p, Ell(cx, 56, 11.5, 13))
        glint(p, cx + 3.8, 50.6, 4.6)
        glint(p, cx - 4.2, 61.5, 2.2)
        p.add(Path().M(cx - 12, 61).C(cx - 10, 72, cx + 10, 72, cx + 12, 61).C(cx + 8, 66, cx - 8, 66, cx - 12, 61).Z(), C['tear'])
    fs(p, Path().M(52, 90).C(58, 86, 70, 86, 76, 90), 5.4)
    fs(p, Path().M(54, 95).Q(64, 99, 74, 95), 3.0, op=.5)


def rire(p):
    face(p)
    fs(p, arc_eye(44, 48, 20, 9), 6.4)
    fs(p, arc_eye(84, 48, 20, 9), 6.4)
    ty, w, dep, dip = 66, 58, 36, 2.6
    mouth(p, laugh_mouth(64, ty, w, dep, dip), teeth=teeth_band(64, ty, w, dip, 7), tongue=Ell(64, ty + dep - 2, w * .27, dep * .36))


def sueur(p):
    face(p)
    p.clip_start(Ell(64, 64, 54))
    p.add(Path().M(0, 0).H(128).V(42).C(96, 50, 32, 50, 0, 42).Z(), '#7CC3F2')
    p.clip_end()
    fs(p, Path().M(31, 48).Q(40, 44, 50, 38), 4.6)
    fs(p, Path().M(97, 48).Q(88, 44, 78, 38), 4.6)
    open_eyes(p, 60, 19, 6, 8)
    mouth(p, wail_mouth(64, 80, 30, 20))
    tear(p, drop(108, 20, 106, 46, 9), [(103.6, 44, 2.2)])


def gele(p):
    face(p, col='#8DD3FA', shade='#5FB4EC')
    for (x, y, rx, ry) in ((40, 18, 12, 7), (64, 13, 12, 7), (88, 18, 12, 7)):
        p.add(Ell(x, y, rx, ry), C['white'])
    fs(p, Path().M(33, 40).Q(44, 36, 54, 39), 4.6, '#1F4A73')
    fs(p, Path().M(74, 39).Q(84, 36, 95, 40), 4.6, '#1F4A73')
    ff(p, Ell(45, 54, 6, 8), '#1F4A73')
    ff(p, Ell(83, 54, 6, 8), '#1F4A73')
    m = rrect(34, 74, 60, 22, 10)
    p.add_clip(m, C['white'])
    p.line(Path().M(30, 85).H(98), '#1F4A73', 2.4)
    for x in (49, 64, 79):
        p.line(Path().M(x, 72).V(98), '#1F4A73', 2.4)
    p.clip_end()
    p.line(m, '#1F4A73', 3.4)
    for (x, l) in ((40, 10), (56, 14), (72, 9), (88, 12)):
        p.add(Path().M(x - 4, 113).L(x + 4, 113).L(x, 113 + l).Z(), '#D9F1FF', sil=True)


def inspecteur(p):
    face(p)
    fs(p, Path().M(28, 32).Q(40, 22, 54, 30), 4.8)
    fs(p, Path().M(74, 40).Q(85, 38, 96, 41), 4.8)
    ff(p, Ell(43, 52, 6, 8))
    glint(p, 45, 49, 2)
    p.add(Ell(84, 54, 15), '#DFF3FF', opacity=.75)
    ff(p, Ell(84, 55, 7, 8.6))
    glint(p, 86.4, 51.4, 2.2)
    p.line(Ell(84, 54, 15), '#C99515', 5)
    p.line(Path().M(96, 64).C(104, 80, 100, 98, 110, 112), '#C99515', 2.6, sil=True)
    fs(p, Path().M(48, 86).Q(58, 83, 72, 85), 5.6)


def sonne(p):
    face(p)
    for cx in (45, 83):
        fs(p, Path().M(cx - 8, 44).L(cx + 8, 60), 5.4)
        fs(p, Path().M(cx + 8, 44).L(cx - 8, 60), 5.4)
    ff(p, Ell(64, 87, 9, 11), C['mouth'])
    for (x, y) in ((20, 22), (106, 18), (112, 46)):
        obj(p, star(x, y, 9, 4, round_=1), C['gold'], C['gold_s'], tone=None)


def motus(p):
    face(p)
    open_eyes(p, 51, 19, 6.2, 8.2)
    fs(p, Path().M(34, 35).Q(44, 31, 54, 34), 4.6)
    fs(p, Path().M(74, 34).Q(84, 31, 94, 35), 4.6)
    p.line(Path().M(38, 84).H(90), '#8F9AA8', 9)
    for x in range(42, 90, 8):
        p.line(Path().M(x, 79).V(89), '#5B6070', 2.4)
    obj(p, rrect(84, 80, 14, 22, 5), '#C9D1DB', '#A9B3C0', tone=(-.6, -.8))
    p.add(rrect(88, 90, 6, 8, 2), '#8F9AA8')


# ---------------------------------------------------------------- hands
def hourra(p):
    open_hand(p, compose(tr(40, 72), rot(-14), sc(1.12)))
    open_hand(p, compose(tr(88, 72), rot(14), flipx(0), sc(1.12)), outline=3.0)
    for (x1, y1, x2, y2) in ((64, 6, 64, 18), (48, 12, 52, 21), (80, 12, 76, 21)):
        p.line(Path().M(x1, y1).L(x2, y2), '#F29C0A', 5.2, sil=True)


def coeur_mains(p):
    heart(p, 64, 62, 54, 0, col=C['pink'], glint_=False)
    for flip in (False, True):
        m = flipx() if flip else (1, 0, 0, 1, 0, 0)
        p.push(m)
        curl = Path().M(60, 40).C(54, 26, 34, 22, 26, 34).C(18, 46, 26, 62, 44, 78).C(52, 86, 58, 92, 62, 98)
        p.line(curl, C['skin'], 15, sil=True)
        p.line(Path().M(30, 38).C(26, 44, 26, 52, 30, 58), C['crease'], 2.6)
        p.line(Path().M(40, 30).C(36, 34, 34, 38, 34, 42), C['crease'], 2.6)
        cuff(p, rrect(30, 96, 26, 22, 6).t(rot(24, 43, 107)))
        skin(p, rrect(40, 82, 22, 24, 8).t(rot(24, 51, 94)), tone=(-1.4, -1.6), outline=2.4)
        p.pop()


def ok(p):
    p.push(compose(tr(64, 70), rot(-10), sc(1.25)))
    cuff(p, rrect(-16, 30, 32, 18, 5))
    for (x, top, r) in ((-2, -46, 6.4), (10, -42, 6.2), (21, -34, 5.6)):
        skin(p, capsule(x, 0, x, top + r, r), tone=(-1.2, 0), outline=2.8)
    palm = Path().M(-26, -2).C(-26, -12, -20, -16, -12, -16).L(26, -16).C(30, -6, 30, 18, 22, 28).C(14, 36, -10, 36, -18, 28).C(-26, 20, -26, 8, -26, -2).Z()
    skin(p, palm, tone=(-2.2, -2.4), outline=2.8)
    ring = Ell(-18, -12, 11, 11)
    p.line(ring, C['skin'], 9, sil=True)
    p.line(Ell(-18, -12, 15.5, 15.5), C['crease'], 2.4)
    p.line(Ell(-18, -12, 6.5, 6.5), C['crease'], 2.4)
    for x in (4, 15.5):
        p.line(Path().M(x, -14).V(-6), C['crease'], 2.4)
    p.pop()


def ici(p):
    pointing_hand(p, compose(tr(60, 74), rot(180), sc(1.55)), flen=30)


def accord(p):
    p.push(sc(1.14, 1.14, 64, 72))
    _accord(p)
    p.pop()


def _accord(p):
    cuff(p, rrect(4, 56, 30, 34, 7))
    p.add(rrect(94, 56, 30, 34, 7), C['pink'], sil=True, tone=(C['pink_s'], -1.6, -2.6))
    skin(p, Path().M(28, 58).C(46, 46, 70, 46, 84, 52).L(98, 60).L(96, 88).C(82, 98, 56, 100, 40, 92).L(28, 86).Z(), tone=(-2.2, -2.6), outline=3.0)
    for (y, w) in ((60, 38), (70, 40), (80, 36)):
        skin(p, capsule(86 - w, y, 86, y, 6), tone=(0, -1.6), outline=2.6)
    skin(p, capsule(40, 56, 66, 46, 7), tone=(-1.4, 0), outline=2.6)
    p.line(Path().M(70, 90).C(78, 92, 88, 90, 96, 84), C['crease'], 2.6)


# ---------------------------------------------------------------- hearts
def _heart_col(p, col, glint_=True):
    heart(p, 64, 65, 104, 0, col=col, glint_=glint_)


def coeur_jaune(p):
    _heart_col(p, C['gold'])


def coeur_orange(p):
    _heart_col(p, C['orange'])


def coeur_blanc(p):
    m = heart_m(64, 65, 104, 0)
    hp = unit_heart().t(m)
    p.add(hp, '#F6F4F8', sil=True, tone=('#DCD6E2', -2, -2.6))
    p.line(hp, '#CFC8D6', 2.6)


def coeurs_tournent(p):
    p.line(Ell(64, 64, 50, 26, -30), '#FFB0D2', 3.2, sil=False)
    heart(p, 44, 74, 62, -14, col=C['pink'])
    heart(p, 94, 38, 40, 16, col=C['pink'], ring=6.0)


def coup_de_foudre(p):
    p.line(Path().M(14, 112).L(110, 18), '#B07A3A', 6, sil=True)
    heart(p, 62, 66, 84, -8, col=C['heart'])
    p.line(Path().M(30, 96).L(14, 112), '#B07A3A', 6)
    p.add(rounded_poly([(118, 10), (114, 32), (96, 14)], 2), '#8F9AA8', sil=True)
    for k in range(3):
        p.add(rounded_poly([(14 + k * 5, 104 - k * 5), (6 + k * 5, 112 - k * 5), (10 + k * 5, 120 - k * 5)], 1.2), C['pink'], sil=True)


def mot_doux(p):
    env = rrect(8, 26, 112, 80, 10)
    obj(p, env, C['white'], '#E3DCE6')
    p.line(Path().M(12, 32).L(64, 72).L(116, 32), '#E8B4CC', 4)
    p.line(Path().M(14, 100).L(50, 66), '#EFD3E0', 3)
    p.line(Path().M(114, 100).L(78, 66), '#EFD3E0', 3)
    heart(p, 64, 74, 36, 0, col=C['heart'])


def coeur_cadeau(p):
    m = heart_m(64, 70, 100, 0)
    hp = unit_heart().t(m)
    p.add(hp, C['heart'], sil=True)
    p.clip_start(hp)
    p.add(rrect(56, 0, 16, 128, 0), C['gold'])
    p.clip_end()
    for (ex, ey, a) in ((48, 22, -28), (80, 22, 28)):
        obj(p, Ell(ex, ey, 15, 9.5, a), C['gold'], C['gold_s'], tone=(-.8, -1.2))
        p.add(Ell(ex + (2 if a < 0 else -2), ey + 1, 7, 4, a), C['gold_s'])
    obj(p, Ell(64, 27, 8), C['gold'], C['gold_s'], tone=(-.8, -1))


def bague(p):
    p.line(Ell(64, 82, 36, 34), C['gold'], 11, sil=True)
    p.line(Path().M(40, 58).C(48, 52, 56, 50, 64, 50), '#FFE58A', 3.4)
    gem = rounded_poly([(44, 30), (54, 14), (74, 14), (84, 30), (64, 54)], 2.4)
    obj(p, gem, '#9FE3FF', '#5FC4F0', tone=(-1, -1.2))
    p.add(rounded_poly([(54, 14), (74, 14), (68, 30), (60, 30)], 1), '#D9F5FF')
    p.line(Path().M(44, 30).H(84), '#5FC4F0', 2)
    obj(p, rrect(52, 48, 24, 10, 3), C['gold'], C['gold_s'], tone=(-.6, -.8))


FACES2 = [('sourire-leger', sourire_leger), ('soulage', soulage), ('entre-doigts', entre_doigts), ('emu', emu), ('rire', rire),
          ('sueur', sueur), ('gele', gele), ('inspecteur', inspecteur), ('sonne', sonne), ('motus', motus)]
FACES2_MAINS = [('hourra', hourra), ('coeur-mains', coeur_mains), ('ok', ok), ('ici', ici), ('accord', accord)]
FACES2_COEURS = [('coeur-jaune', coeur_jaune), ('coeur-orange', coeur_orange), ('coeur-blanc', coeur_blanc),
                 ('coeurs-tournent', coeurs_tournent), ('coup-de-foudre', coup_de_foudre), ('mot-doux', mot_doux),
                 ('coeur-cadeau', coeur_cadeau), ('bague', bague)]
