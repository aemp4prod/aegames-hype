"""The 37 faces of the sticker set (original drawings, flat style D)."""
from parts import *


def open_eyes(p, y=51, dx=19, rx=6.6, ry=8.6, glints=True, cy_off=0):
    for cx in (64 - dx, 64 + dx):
        ff(p, Ell(cx, y, rx, ry))
        if glints:
            glint(p, cx + 2.3, y - 3.4, 2.1)


def white_eye(p, cx, cy, rx, ry, px, py, pr, outline=2.2):
    e = Ell(cx, cy, rx, ry)
    p.add_clip(e, C['white'])
    ff(p, Ell(px, py, pr))
    p.clip_end()
    if outline:
        p.line(e, C['feat'], outline)


def side_eye(p, cx, cy, look=1, lid_y=None, w=22):
    """Half-lidded eye glancing sideways: white bowl, pupil, straight lid."""
    hw = w / 2.0
    ly = cy if lid_y is None else lid_y
    bowl = Path().M(cx - hw, ly).H(cx + hw).C(cx + hw, ly + 7.5, cx + hw * .55, ly + 11, cx, ly + 11).C(
        cx - hw * .55, ly + 11, cx - hw, ly + 7.5, cx - hw, ly).Z()
    p.add_clip(bowl, C['white'])
    ff(p, Ell(cx + look * 5.2, ly + 5.5, 5.6))
    p.clip_end()
    fs(p, Path().M(cx - hw - 1.5, ly).H(cx + hw + 1.5), 4.8)


# ---------------------------------------------------------------- ported from the first board
def rire_larmes(p):
    face(p)
    fs(p, arc_eye(44, 49, 22, 11).t(rot(-12, 44, 49)), 7.2)
    fs(p, arc_eye(84, 49, 22, 11).t(rot(12, 84, 49)), 7.2)
    ty, w, dep, dip = 69, 60, 34, 3.0
    mouth(p, laugh_mouth(64, ty, w, dep, dip), teeth=teeth_band(64, ty, w, dip, 8),
          tongue=Ell(64, ty + dep - 2, w * .27, dep * .36))
    tear(p, drop(33, 56, 17, 78, 10.5), [(13.5, 76, 2.8)])
    tear(p, drop(95, 56, 111, 78, 10.5), [(107.5, 76, 2.8)])


def mdr(p):
    face(p)
    p.push(rot(-24, 64, 64))
    fs(p, chevron(45, 49, 15, 16, True).t(rot(12, 45, 49)), 6.8)
    fs(p, chevron(83, 49, 15, 16, False).t(rot(12, 83, 49)), 6.8)
    ty, w, dep, dip = 66, 64, 38, 3.0
    mouth(p, laugh_mouth(64, ty, w, dep, dip), teeth=teeth_band(64, ty, w, dip, 8),
          tongue=Ell(64, ty + dep - 2, w * .27, dep * .36))
    tear(p, drop(35, 54, 21, 68, 8.2), [(18.6, 67, 2.1)])
    tear(p, drop(93, 54, 107, 68, 8.2), [(104.6, 67, 2.1)])
    p.pop()


def sourire(p):
    face(p)
    blush(p, 31, 72, 10.5, 6.5)
    blush(p, 97, 72, 10.5, 6.5)
    fs(p, arc_eye(45, 54, 20, 9), 6.4)
    fs(p, arc_eye(83, 54, 20, 9), 6.4)
    fs(p, smile_line(64, 78, 30, 9), 6.0)


def yeux_coeurs(p):
    face(p)
    ty, w, dep, dip = 75, 46, 26, 3.0
    mouth(p, laugh_mouth(64, ty, w, dep, dip), teeth=teeth_band(64, ty, w, dip, 7),
          tongue=Ell(64, ty + dep - 1, w * .26, dep * .34))
    heart(p, 43, 51, 32, -10, sil=False)
    heart(p, 85, 51, 32, 10, sil=False)


def coeurs(p):
    face(p)
    blush(p, 31, 70, 10, 6.5)
    blush(p, 97, 70, 10, 6.5)
    fs(p, arc_eye(45, 53, 20, 9), 6.6)
    fs(p, arc_eye(83, 53, 20, 9), 6.6)
    fs(p, smile_line(64, 76, 34, 11), 6.2)
    heart(p, 20, 28, 25, -20)
    heart(p, 110, 52, 22, 18)
    heart(p, 21, 104, 20, -8)


def bisou(p):
    face(p)
    ff(p, Ell(45, 51, 6.6, 8.6))
    glint(p, 47.2, 47.6, 2.1)
    fs(p, chevron(83, 51, 14, 14, False), 6.4)
    fs(p, pucker(62, 75, 20, 9), 6.0)
    heart(p, 98, 92, 26, 14)


def sanglots(p):
    face(p)
    fs(p, Path().M(27, 40).Q(39, 37, 50, 30), 6.0)
    fs(p, Path().M(101, 40).Q(89, 37, 78, 30), 6.0)
    fs(p, arc_eye(42, 52, 20, 7).t(rot(-8, 42, 52)), 6.6)
    fs(p, arc_eye(86, 52, 20, 7).t(rot(8, 86, 52)), 6.6)
    mouth(p, wail_mouth(64, 70, 36, 30), tongue=Ell(64, 100, 13, 10))
    tear(p, stream(42, 57, 9, 37.5, 104, 20), [(40, 69, 2.2)])
    tear(p, stream(86, 57, 9, 90.5, 104, 20), [(88, 69, 2.2)])


# ---------------------------------------------------------------- new faces
def grand_sourire(p):
    face(p)
    fs(p, arc_eye(44, 50, 21, 10), 6.8)
    fs(p, arc_eye(84, 50, 21, 10), 6.8)
    m = Path().M(31, 70).Q(64, 78, 97, 70).C(96, 89, 82, 101, 64, 101).C(46, 101, 32, 89, 31, 70).Z()
    p.add_clip(m, C['mouth'])
    p.add(Path().M(26, 60).L(102, 60).L(102, 81).Q(64, 89, 26, 81).Z(), C['white'])
    p.add(Path().M(26, 86).Q(64, 94, 102, 86).L(102, 112).L(26, 112).Z(), C['white'])
    p.clip_end()


def clin_doeil(p):
    face(p)
    ff(p, Ell(45, 51, 6.6, 8.6))
    glint(p, 47.3, 47.6, 2.1)
    fs(p, Path().M(36, 35).Q(45, 30.5, 54, 34), 5.0)
    fs(p, arc_eye(83, 54, 19, 8), 6.4)
    fs(p, Path().M(40, 76).C(50, 90, 76, 92, 89, 73), 6.2)


def narquois(p):
    face(p)
    side_eye(p, 44, 50, 1)
    side_eye(p, 84, 50, 1)
    fs(p, Path().M(33, 40).Q(43, 38, 54, 40.5), 4.8)
    fs(p, Path().M(74, 38).Q(84, 30, 95, 35), 4.8)
    fs(p, Path().M(52, 87).C(64, 90, 79, 87, 88, 75), 6.2)


def cool(p):
    face(p)
    lens = Path().M(23, 44).H(60).C(60, 57, 55, 65, 42.5, 65).C(30, 65, 24, 57, 23, 44).Z()
    p.add(lens, INK)
    p.add(lens.t(flipx()), INK)
    p.line(Path().M(20, 45).H(108), INK, 5.4)
    for x in (31, 73):
        p.line(Path().M(x, 50).L(x + 7, 57.5), C['white'], 3.2, opacity=.9)
    fs(p, Path().M(45, 84).C(54, 93, 74, 93, 85, 81), 6.2)


def etoiles(p):
    face(p)
    ty, w, dep = 72, 54, 30
    mouth(p, laugh_mouth(64, ty, w, dep, 3), teeth=teeth_band(64, ty, w, 3, 8), tongue=Ell(64, ty + dep - 2, 14, 10))
    for cx, a in ((44, -8), (84, 8)):
        p.add(star(cx, 50, 16.5, 7.4, rotd=-90 + a, round_=2.6), '#F2552C')
        p.add(Ell(cx - 3.6, 46.6, 1.9, 2.6, 30), C['white'], opacity=.9)


def fete(p):
    face(p, 64, 72, 48)
    blush(p, 38, 84, 8.5, 5.5)
    blush(p, 90, 84, 8.5, 5.5)
    fs(p, arc_eye(48, 68, 18, 8.5), 6.2)
    fs(p, arc_eye(80, 68, 18, 8.5), 6.2)
    # party horn from the mouth
    fs(p, Path().M(58, 92).Q(64, 97, 70, 92), 5.2)
    horn = Path().M(68, 90).L(106, 80).Q(112, 86, 109, 95).L(70, 98).Z()
    p.add(horn, C['blue'], sil=True, tone=(C['blue_s'], -1.6, -2.4))
    p.line(Path().M(82, 87).L(83.5, 95.5), C['white'], 3.2)
    p.line(Path().M(95, 84).L(97, 93.5), C['white'], 3.2)
    # party hat
    m = compose(tr(41, 28), rot(-24))
    hat = Path().M(-17, 4).Q(0, 9, 17, 4).L(2, -32).Q(0, -35, -2, -32).Z().t(m)
    p.add(hat, C['pink'], sil=True, tone=(C['pink_s'], -1.6, -2.4))
    p.clip_start(hat)
    for y in (-6, -18):
        p.line(Path().M(-20, y + 3).Q(0, y + 7, 20, y + 3).t(m), C['gold'], 4.2, cap='butt')
    p.clip_end()
    p.add(Ell(*ap(m, (0, -33)), 6.2), C['gold'], sil=True)
    # confetti
    for (x, y, w, h, a, col) in ((100, 28, 7, 12, 30, C['blue']), (114, 52, 7, 11, -25, C['green']),
                                 (86, 12, 6, 10, 70, C['pink']), (14, 70, 6, 10, -30, C['green'])):
        g = rrect(x - w / 2, y - h / 2, w, h, 2).t(rot(a, x, y))
        p.add(g, col, sil=True)
    p.add(Ell(108, 14, 4.2), C['gold'], sil=True)


def rire_gene(p):
    face(p)
    fs(p, arc_eye(44, 50, 20, 10), 6.6)
    fs(p, arc_eye(84, 50, 20, 10), 6.6)
    ty, w, dep = 70, 54, 30
    mouth(p, laugh_mouth(64, ty, w, dep, 3), teeth=teeth_band(64, ty, w, 3, 8), tongue=Ell(64, ty + dep - 2, 14, 10))
    tear(p, drop(104, 14, 106, 34, 8.5, belly=.06), [(103.5, 31, 2.2)])


def sourire_larme(p):
    face(p)
    fs(p, Path().M(31, 41).Q(40, 39, 50, 34), 4.6)
    fs(p, Path().M(97, 41).Q(88, 39, 78, 34), 4.6)
    fs(p, arc_eye(44, 55, 19, 8), 6.4)
    fs(p, arc_eye(84, 55, 19, 8), 6.4)
    fs(p, Path().M(48, 81).C(55, 88, 73, 88, 80, 81), 6.0)
    tear(p, drop(93, 60, 95, 76, 6.8, belly=.06), [(93.6, 73.6, 1.8)])


def a_lenvers(p):
    face(p)
    p.push(rot(180, 64, 64))
    open_eyes(p, 51, 19, 6.4, 8.4, glints=False)
    fs(p, smile_line(64, 78, 36, 10), 6.2)
    p.pop()
    glint(p, 85.3, 80.4, 2.1)
    glint(p, 47.3, 80.4, 2.1)


def fond(p):
    body = (Path().M(14, 60).C(14, 32, 37, 10, 64, 10).C(91, 10, 114, 32, 114, 60)
            .C(114, 76, 110, 86, 107, 94).C(105, 99, 110, 101, 116, 102).C(126, 104, 125, 117, 112, 117)
            .L(24, 117).C(6, 117, 4, 104, 14, 101).C(20, 99.5, 21, 96, 19, 90).C(16, 82, 14, 72, 14, 60).Z())
    p.add(body, C['face'], sil=True, tone=(C['shade'], -1.9, -3.8))
    ff(p, Ell(48, 54, 6.2, 8.2, -14))
    ff(p, Ell(81, 58, 6.2, 8.2, -14))
    glint(p, 50, 50.5, 2)
    glint(p, 83, 54.5, 2)
    fs(p, Path().M(42, 80).C(52, 88, 62, 90, 74, 86).C(80, 84, 84, 86, 88, 90), 6.0)


def pointing_hand(p, m, outline=3.0, flen=30):
    """Index finger up, other fingers curled (local: finger along -y, fist below the origin)."""
    p.push(m)
    skin(p, capsule(-9, 6, -9, -flen, 6.6), tone=(-1.6, 0), outline=outline)
    fist = (Path().M(-18, 4).C(-18, -2, -14, -4, -9, -4).L(14, -4).C(20, -4, 23, 0, 23, 6)
            .L(23, 24).C(23, 31, 18, 34, 11, 34).L(-6, 34).C(-14, 34, -19, 29, -19, 21).Z())
    skin(p, fist, outline=outline)
    for y in (7, 16, 25):
        p.line(Path().M(4, y).H(20), C['crease'], 2.6)
    p.line(Path().M(-17, 14).C(-10, 14, -3, 18, 2, 26), C['crease'], 2.6)
    p.pop()


def reflechit(p):
    face(p)
    ff(p, Ell(45, 54, 6.2, 8.2))
    ff(p, Ell(82, 52, 6.2, 8.2))
    glint(p, 47.3, 50.6, 2)
    glint(p, 84.3, 48.6, 2)
    fs(p, Path().M(34, 38).Q(44, 29, 55, 35), 5.0)
    fs(p, Path().M(73, 39).Q(83, 38, 93, 40.5), 5.0)
    fs(p, Path().M(44, 82).L(64, 78), 6.0)
    pointing_hand(p, compose(tr(90, 98), rot(-12)), flen=24)


def yeux_au_ciel(p):
    face(p)
    white_eye(p, 44, 54, 10.5, 12, 44, 46.5, 6)
    white_eye(p, 84, 54, 10.5, 12, 84, 46.5, 6)
    fs(p, Path().M(33, 35).Q(44, 31, 55, 35), 4.6)
    fs(p, Path().M(73, 35).Q(84, 31, 95, 35), 4.6)
    fs(p, Path().M(51, 88).Q(64, 85, 77, 87), 6.0)


def blase(p):
    face(p)
    side_eye(p, 44, 52, -1)
    side_eye(p, 84, 52, -1)
    fs(p, Path().M(33, 41).Q(43, 39, 54, 41.5), 4.8)
    fs(p, Path().M(74, 41.5).Q(85, 39, 95, 41), 4.8)
    fs(p, frown_line(64, 92, 26, 7), 6.0)


def rougit(p):
    face(p)
    blush(p, 29, 75, 13, 8.5, '#FF6F91')
    blush(p, 99, 75, 13, 8.5, '#FF6F91')
    white_eye(p, 45, 53, 10.5, 11.5, 45, 54, 4.2)
    white_eye(p, 83, 53, 10.5, 11.5, 83, 54, 4.2)
    fs(p, Path().M(35, 34).Q(45, 29, 55, 33), 4.6)
    fs(p, Path().M(73, 33).Q(83, 29, 93, 34), 4.6)
    fs(p, Path().M(57, 89).Q(64, 87, 71, 89), 5.6)


def bouche_bee(p):
    face(p)
    open_eyes(p, 53, 19, 6.6, 9)
    fs(p, Path().M(34, 35).Q(44, 29, 54, 33), 5.0)
    fs(p, Path().M(74, 33).Q(84, 29, 94, 35), 5.0)
    ff(p, Ell(64, 87, 10, 12.5), C['mouth'])


def cri(p):
    face(p)
    fear = Path().M(0, 0).H(128).V(46).C(110, 52, 98, 44, 84, 49).C(72, 54, 58, 45, 44, 50).C(30, 55, 18, 46, 0, 51).Z()
    p.clip_start(Ell(64, 64, 54))
    p.add(fear, '#A9D6F5')
    p.clip_end()
    white_eye(p, 45, 54, 9.5, 12.5, 45, 55, 3.4)
    white_eye(p, 83, 54, 9.5, 12.5, 83, 55, 3.4)
    ff(p, Ell(64, 92, 9, 16), C['mouth'])
    for flip in (False, True):
        hand = (Path().M(26, 116).C(18, 114, 14, 104, 15, 94).L(16, 72).C(16, 67, 23, 67, 23.5, 72).L(24, 80)
                .L(25, 66).C(25.5, 61, 32.5, 61, 32.5, 66).L(32.5, 80).L(34, 70).C(34.5, 65.5, 41, 66, 40.5, 71)
                .L(39, 92).C(39, 104, 36, 114, 26, 116).Z())
        if flip:
            hand = hand.t(flipx())
        skin(p, hand, outline=3.0)


def explose(p):
    burst = star(64, 34, 34, 21, n=9, rotd=-90, round_=3)
    p.add(burst, C['orange'], sil=True, tone=(C['orange_s'], -1.5, -2.5))
    p.add(star(64, 36, 21, 12, n=9, rotd=-70, round_=2), C['gold'])
    head = Path().M(29, 50).L(36, 44).L(43, 51).L(52, 44).L(60, 51).L(68, 44).L(76, 51).L(85, 44).L(92, 51).L(99, 46)
    head.C(106, 54, 110, 63, 110, 74).C(110, 99, 89, 120, 64, 120).C(39, 120, 18, 99, 18, 74).C(18, 64, 22, 56, 29, 50).Z()
    p.add(head, C['face'], sil=True, tone=(C['shade'], -1.7, -3.4))
    white_eye(p, 47, 76, 9, 10, 47, 76, 3.4)
    white_eye(p, 81, 76, 9, 10, 81, 76, 3.4)
    ff(p, Ell(64, 101, 8, 9.5), C['mouth'])


def grimace(p):
    face(p)
    open_eyes(p, 50, 19, 6.4, 8.4)
    fs(p, Path().M(34, 36).Q(44, 33, 54, 35), 4.6)
    fs(p, Path().M(74, 35).Q(84, 33, 94, 36), 4.6)
    m = rrect(33, 72, 62, 24, 11)
    p.add_clip(m, C['white'])
    p.line(Path().M(30, 84).H(98), C['mouth'], 2.6)
    for x in (48, 64, 80):
        p.line(Path().M(x, 70).V(98), C['mouth'], 2.6)
    p.clip_end()
    p.line(m, C['mouth'], 3.6)


def supplie(p):
    face(p)
    fs(p, Path().M(29, 41).Q(39, 39, 49, 33), 4.8)
    fs(p, Path().M(99, 41).Q(89, 39, 79, 33), 4.8)
    for cx in (44, 84):
        ff(p, Ell(cx, 57, 11, 12.5))
        glint(p, cx + 3.6, 52, 4.4)
        glint(p, cx - 4, 62.5, 2.1)
    fs(p, frown_line(64, 92, 16, 4), 5.2)


def larme(p):
    face(p)
    fs(p, Path().M(31, 40).Q(40, 38, 50, 33), 4.8)
    fs(p, Path().M(97, 40).Q(88, 38, 78, 33), 4.8)
    open_eyes(p, 54, 19, 6.4, 8.4)
    fs(p, frown_line(64, 93, 30, 9), 6.2)
    tear(p, drop(38, 64, 35, 80, 7.6, belly=.06), [(34, 77.4, 2)])


def colere(p):
    face(p, col=C['red'], shade=C['red_s'])
    dk = '#3B1010'
    fs(p, Path().M(30, 39).L(54, 49), 7.0, dk)
    fs(p, Path().M(98, 39).L(74, 49), 7.0, dk)
    ff(p, Ell(45, 59, 6.4, 7.2), dk)
    ff(p, Ell(83, 59, 6.4, 7.2), dk)
    fs(p, frown_line(64, 93, 34, 10), 6.6, dk)


def souffle(p):
    face(p)
    fs(p, Path().M(31, 40).L(54, 48), 6.4)
    fs(p, Path().M(97, 40).L(74, 48), 6.4)
    p.clip_start(Path().M(30, 46).L(56, 54).L(56, 70).L(30, 70).Z())
    ff(p, Ell(45, 59, 6.6, 8.4))
    p.clip_end()
    p.clip_start(Path().M(98, 46).L(72, 54).L(72, 70).L(98, 70).Z())
    ff(p, Ell(83, 59, 6.6, 8.4))
    p.clip_end()
    fs(p, frown_line(64, 92, 22, 5.5), 6.2)
    for flip in (False, True):
        puffs = [Ell(31, 98, 9.5), Ell(19, 92, 8.5), Ell(17, 106, 8), Ell(9, 99, 6.5)]
        for g in puffs:
            g2 = g.t(flipx()) if flip else g
            p.add(g2, '#E3EAF1', sil=True, tone=('#C2CEDA', -1.2, -1.8))


def rage(p):
    face(p, col='#E8453C', shade='#C9302E')
    dk = '#3B0E0E'
    fs(p, Path().M(28, 37).L(55, 50), 7.6, dk)
    fs(p, Path().M(100, 37).L(73, 50), 7.6, dk)
    ff(p, Ell(45, 60, 6.2, 6.6), dk)
    ff(p, Ell(83, 60, 6.2, 6.6), dk)
    p.add(rrect(28, 74, 72, 26, 9), INK)
    w = C['white']
    # '#'
    for x in (36.5, 42.5):
        p.line(Path().M(x + 1, 81).L(x - 1, 93), w, 2.4)
    for y in (84.5, 89.5):
        p.line(Path().M(33.5, y).H(46), w, 2.4)
    # '!'
    p.line(Path().M(56, 80.5).V(89), '#FFCB2E', 3.4)
    p.add(Ell(56, 94.4, 2.1), '#FFCB2E')
    # lightning
    p.add(rounded_poly([(73, 79), (66, 88.5), (71, 88.5), (68, 96), (76, 85.5), (71, 85.5)], .6), w)
    # star
    p.add(star(87.5, 87, 6.6, 2.8, rotd=-90, round_=.6), '#FF8FAA')


def nausee(p):
    face(p, col='#A3D65F', shade='#82BD43')
    dk = '#2C3A16'
    fs(p, Path().M(31, 40).Q(40, 38, 50, 33), 4.8, dk)
    fs(p, Path().M(97, 40).Q(88, 38, 78, 33), 4.8, dk)
    fs(p, cup_eye(44, 54, 18, 7), 6.0, dk)
    fs(p, cup_eye(84, 54, 18, 7), 6.0, dk)
    p.add(Ell(31, 78, 11, 8.5), '#8DC64A')
    p.add(Ell(97, 78, 11, 8.5), '#8DC64A')
    fs(p, Path().M(44, 87).C(49, 80, 54, 94, 59, 87).C(64, 80, 69, 94, 74, 87).C(78, 81, 82, 90, 85, 87), 5.4, dk)


def dort(p):
    face(p)
    fs(p, cup_eye(44, 56, 19, 7), 6.2)
    fs(p, cup_eye(84, 56, 19, 7), 6.2)
    ff(p, Ell(64, 87, 6.8, 8), C['mouth'])
    zc = '#5B6BD9'
    p.add(zglyph(86, 6, 20, 19, 5.4), zc, sil=True)
    p.add(zglyph(108, 30, 13, 12.5, 4.0), zc, sil=True)


def chut(p):
    face(p)
    open_eyes(p, 50, 19, 6.2, 8.2)
    fs(p, Path().M(35, 34).Q(45, 29, 55, 33), 4.8)
    fs(p, Path().M(73, 33).Q(83, 29, 93, 34), 4.8)
    ff(p, Ell(64, 84, 8, 6), C['mouth'])
    pointing_hand(p, compose(tr(73, 100), rot(0)), flen=30)


def ange(p):
    p.add(Ell(64, 15, 34, 9), C['blue'], sil=True)
    p.add(Ell(64, 15, 25, 4.6), C['white'])
    face(p, 64, 70, 50)
    blush(p, 37, 80, 9, 5.8)
    blush(p, 91, 80, 9, 5.8)
    fs(p, arc_eye(46, 64, 18, 8.5), 6.2)
    fs(p, arc_eye(82, 64, 18, 8.5), 6.2)
    fs(p, smile_line(64, 84, 30, 9), 6.0)


def diable(p):
    pc, ps, dk = C['purple'], C['purple_s'], '#2B1440'
    hornL = Path().M(28, 44).C(20, 34, 18, 20, 22, 8).C(30, 18, 40, 24, 46, 30).Z()
    p.add(hornL, ps, sil=True)
    p.add(hornL.t(flipx()), ps, sil=True)
    face(p, 64, 70, 50, col=pc, shade=ps)
    fs(p, Path().M(33, 52).L(54, 60), 6.4, dk)
    fs(p, Path().M(95, 52).L(74, 60), 6.4, dk)
    ff(p, Ell(46, 66, 5.8, 6.4), dk)
    ff(p, Ell(82, 66, 5.8, 6.4), dk)
    m = Path().M(36, 80).Q(64, 88, 92, 80).C(90, 98, 78, 108, 64, 108).C(50, 108, 38, 98, 36, 80).Z()
    mouth(p, m, teeth=Path().M(30, 74).H(98).V(89).Q(64, 96, 30, 89).Z(), col='#3A1858')


def crane(p):
    bone, bone_s, dk = '#F1EDE9', '#CFC6BF', '#3A3138'
    jaw = rrect(38, 80, 52, 38, 13)
    p.add(jaw, bone, sil=True, tone=(bone_s, -1.6, -3))
    p.add(Ell(64, 56, 48, 45), bone, sil=True, tone=(bone_s, -1.8, -3.6))
    for cx in (44, 84):
        ff(p, Ell(cx, 62, 12.5, 13.5), dk)
        glint(p, cx + 4, 57, 3)
    p.add(rounded_poly([(64, 76), (58, 86), (70, 86)], 1.6), dk)
    for x in (53, 64, 75):
        p.line(Path().M(x, 98).V(112), '#B8AEA7', 3.2)
    p.line(Path().M(41, 100).H(87), '#B8AEA7', 2.2)


def clown(p):
    for flip in (False, True):
        for (x, y, r) in ((18, 50, 12), (12, 66, 11), (19, 80, 11), (28, 38, 10)):
            g = Ell(x, y, r)
            p.add(g.t(flipx()) if flip else g, C['blue'], sil=True, tone=(C['blue_s'], -1, -1.6))
    face(p, 64, 66, 50, col='#FFF2E6', shade='#EDD5C4')
    for cx in (45, 83):
        p.add(rounded_poly([(cx, 36), (cx + 5, 49), (cx, 62), (cx - 5, 49)], 1.2), '#7B9CFF')
        ff(p, Ell(cx, 49, 5.6, 7.4))
        glint(p, cx + 2, 46, 1.8)
    m = Path().M(30, 78).Q(64, 92, 98, 78).C(96, 98, 82, 112, 64, 112).C(46, 112, 32, 98, 30, 78).Z()
    p.add(m, C['heart'])
    fs(p, Path().M(40, 88).Q(64, 102, 88, 88), 4.0, C['mouth'])
    p.add(Ell(64, 70, 11), '#F23B4F')
    glint(p, 60.5, 66, 3)


FACES = [
    ('rire-larmes', rire_larmes), ('mdr', mdr), ('sourire', sourire), ('grand-sourire', grand_sourire),
    ('yeux-coeurs', yeux_coeurs), ('coeurs', coeurs), ('bisou', bisou), ('clin-doeil', clin_doeil),
    ('narquois', narquois), ('cool', cool), ('etoiles', etoiles), ('fete', fete), ('rire-gene', rire_gene),
    ('sourire-larme', sourire_larme), ('a-lenvers', a_lenvers), ('fond', fond), ('reflechit', reflechit),
    ('yeux-au-ciel', yeux_au_ciel), ('blase', blase), ('rougit', rougit), ('bouche-bee', bouche_bee),
    ('cri', cri), ('explose', explose), ('grimace', grimace), ('supplie', supplie), ('larme', larme),
    ('sanglots', sanglots), ('colere', colere), ('souffle', souffle), ('rage', rage), ('nausee', nausee),
    ('dort', dort), ('chut', chut), ('ange', ange), ('diable', diable), ('crane', crane), ('clown', clown),
]
