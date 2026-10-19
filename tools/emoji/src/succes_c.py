"""0.28.1: the achievements' icons, third batch (style D: flat two tones, white die-cut border, small shadow).
One drawing per achievement of src/succes.js (the key, with _ for -), listed in SUCCES at the bottom; built by build3.py."""
from parts import *
import math
from symbols import obj
from hands import open_hand
from faces2 import _accord

D, DS = C['dark'], C['dark_s']
RED, RED_S = C['heart'], '#D02247'
LEATHER, LEATHER_S, LEATHER_D = '#A8673A', '#8A4F27', '#5E361C'
NOTE, NOTE_S, NOTE_L = '#7FD18B', '#57B467', '#A6E3AE'
CARD, CARD_S = '#D9A066', '#C0864C'


# ---------------------------------------------------------------- helpers
def rect(x, y, w, h):
    """A sharp rectangle (rrect with r=0 would write empty curves)."""
    return Path().M(x, y).L(x + w, y).L(x + w, y + h).L(x, y + h).Z()


def euro(p, cx, cy, r, col, w=None):
    """A euro sign drawn with strokes, as on the game's money bag, centred on (cx, cy)."""
    w = w or r * .4
    p.line(arc(cx + r * .375, cy, r, 42, 318), col, w)
    p.line(Path().M(cx - r * 1.125, cy - r * .3125).H(cx + r * .125), col, w * .81)
    p.line(Path().M(cx - r * 1.125, cy + r * .375).H(cx), col, w * .81)


def coin(p, cx, cy, r, sil=True):
    """A gold coin with an orange rim (so that it stays apart from the yellow hands)."""
    obj(p, Ell(cx, cy, r), '#F7A21B', '#E0820C', sil=sil, tone=(-r * .06, -r * .09))
    p.add(Ell(cx - r * .05, cy - r * .07, r * .76), '#FFD447')
    euro(p, cx - r * .06, cy - r * .07, r * .34, '#E8920F')


def money_bag(p):
    """The game's money bag (128 grid)."""
    bag = (Path().M(64, 42).C(100, 42, 113, 76, 111, 96).C(109, 114, 92, 122, 64, 122)
           .C(36, 122, 19, 114, 17, 96).C(15, 76, 28, 42, 64, 42).Z())
    obj(p, bag, '#E8B86A', '#C99545')
    top = (Path().M(50, 42).C(41, 33, 38, 18, 46, 11).C(52, 17, 58, 19, 64, 13).C(70, 19, 76, 17, 82, 11)
           .C(90, 18, 87, 33, 78, 42).Z())
    obj(p, top, '#E8B86A', '#C99545', tone=(-1.2, -1.6))
    obj(p, rrect(44, 36, 40, 11, 5.5), '#9A6A33', '#7A4F22', tone=(-1, -1.4))
    euro(p, 64, 86, 16, '#2E9E5B')


def tri_pts(cx, cy, h):
    """A play triangle pointing right, its centroid on (cx, cy)."""
    w = h * .88
    left = cx - w / 3.0
    return [(left, cy - h / 2.0), (left + w, cy), (left, cy + h / 2.0)]


def frame_miter(p, x, y, w, h, t, light, shade, r=6.0):
    """A picture frame: lit top and left, shaded bottom and right, mitred corners."""
    outer = rrect(x, y, w, h, r)
    p.add(outer, shade, sil=True)
    p.clip_start(outer)
    p.add(Path().M(x - 2, y - 2).L(x + w + 2, y - 2).L(x + w - t, y + t).L(x + t, y + h - t).L(x - 2, y + h + 2).Z(), light)
    p.clip_end()


PLAQUE = dict(
    silver=dict(f='#D5DBE5', fs='#AEB6C4', panel='#97A1B2', panel_s='#7C8799', med='#F1F4F8', med_s='#C3CAD8', tri='#646F83'),
    gold=dict(f=C['gold'], fs=C['gold_s'], panel='#E8A010', panel_s='#C98508', med='#FFE070', med_s=C['gold_s'], tri='#B06F06'),
    diamond=dict(f='#BDE9FF', fs='#7FCBF2', panel='#5BB5EC', panel_s='#3E9AD6', med='#F2FBFF', med_s='#B8E6FD', med_d='#80CBF3',
                 tri='#2477B8', glint='#FFFFFF'),
    ruby=dict(f='#FF5A7A', fs='#D8264E', panel='#C41C44', panel_s='#A01036', med='#FFC2CE', med_s='#FF7D98', med_d='#E23A5E',
              tri='#86102E', glint='#FFD0DA'),
    poop=dict(f='#B9824F', fs='#94603A', panel='#7A4A2A', panel_s='#5E361C', med=None, tri='#FFFFFF'),
)


def gem_disc(p, cx, cy, r, light, mid, dark, n=8):
    """A cut gem seen from above: a table (inner polygon) and a ring of facets lit from the top left."""
    disc = Ell(cx, cy, r)
    p.add_clip(disc, mid)
    ri = r * .64
    for k in range(n):
        a0 = math.radians(k * 360.0 / n - 90 - 180.0 / n)
        a1 = a0 + 2 * math.pi / n
        am = (a0 + a1) / 2
        lit = -(math.cos(am) + math.sin(am)) / math.sqrt(2)     # facing the light (top left)
        col = light if lit > .35 else dark if lit < -.35 else mid
        if col == mid:
            continue
        p.add(Path().M(cx + ri * math.cos(a0), cy + ri * math.sin(a0)).L(cx + 1.3 * r * math.cos(a0), cy + 1.3 * r * math.sin(a0))
              .L(cx + 1.3 * r * math.cos(a1), cy + 1.3 * r * math.sin(a1)).L(cx + ri * math.cos(a1), cy + ri * math.sin(a1)).Z(), col)
    p.clip_end()
    table = [(cx + ri * math.cos(math.radians(k * 360.0 / n - 90 - 180.0 / n)), cy + ri * math.sin(math.radians(k * 360.0 / n - 90 - 180.0 / n)))
             for k in range(n)]
    p.add(rounded_poly(table, 0), light)


def plaque(p, m, medal=None):
    """The 'Play Button' plaque of the subscriber milestones: same frame, panel and plate; the material changes."""
    frame_miter(p, 16, 8, 96, 112, 12, m['f'], m['fs'])
    p.add(rrect(28, 20, 72, 88, 3), m['panel'], tone=(m['panel_s'], 2, 3))
    if medal:
        medal(p, m)
    else:
        if m.get('glint'):   # cut crystal: a faceted medallion, light on the frame
            gem_disc(p, 64, 58, 27, m['med'], m['med_s'], m['med_d'])
            for (x0, y0, x1, y1) in ((20, 34, 34, 20), (94, 116, 108, 102)):
                p.line(Path().M(x0, y0).L(x1, y1), m['glint'], 2.8, opacity=.9)
        else:
            obj(p, Ell(64, 58, 27), m['med'], m['med_s'], sil=False, tone=(-1.4, -1.8))
        p.add(rounded_poly(tri_pts(66.5, 58, 27), 3.4), m['tri'])
    p.add(rrect(46, 93, 36, 7, 2), m['f'])


# ---------------------------------------------------------------- the drawings
def partner_program(p):
    p.push(compose(tr(0, 18), sc(1.02, 1.02, 64, 73)))
    _accord(p)
    p.pop()
    coin(p, 64, 31, 22)
    obj(p, sparkle(101, 22, 10), C['gold'], C['gold_s'], tone=None)
    obj(p, sparkle(27, 30, 7), C['gold'], C['gold_s'], tone=None)


def silver_play_button(p):
    plaque(p, PLAQUE['silver'])


def golden_play_button(p):
    plaque(p, PLAQUE['gold'])


def diamond_play_button(p):
    plaque(p, PLAQUE['diamond'])
    obj(p, sparkle(108, 14, 12, .2), '#7FCBF2', '#5BB5EC', tone=None)


def ruby_play_button(p):
    plaque(p, PLAQUE['ruby'])
    obj(p, sparkle(108, 14, 12, .2), '#FF5A7A', '#D8264E', tone=None)


def _poop(p, m):
    P, PS = '#D39A62', '#AE7444'
    tip = Path().M(54, 46).C(56, 36, 64, 34, 68, 26).C(74, 32, 76, 42, 72, 48).Z()
    obj(p, tip, P, PS, sil=False, tone=(-1, -1.2))
    for t in (Ell(64, 49, 15, 9), Ell(64, 63, 23, 11), Ell(64, 78, 30, 12)):
        obj(p, t, P, PS, sil=False, tone=(-1.2, -1.8))
    for x in (57, 71):
        p.add(Ell(x, 61, 4.2, 4.8), C['white'])
        p.add(Ell(x + .8, 62, 2.2, 2.8), INK)
    p.add(rounded_poly(tri_pts(65, 78, 13), 2), m['tri'])


def fly(p, x, y, a=0.0):
    p.push(rot(a, x, y))
    for s in (-1, 1):
        p.add(Ell(x + s * 5.4, y - 5.4, 6, 3.8, s * 35), '#E3F1FF', sil=True)
    p.add(Ell(x, y, 5, 6), D, sil=True)
    p.pop()


def poopy_play_button(p):
    plaque(p, PLAQUE['poop'], medal=_poop)
    fly(p, 108, 18, -20)
    fly(p, 18, 100, 20)


def pigeon(p):
    body_c, body_s, bar = '#AEB6C4', '#8F99AA', '#5F6A7D'
    neck, neck_s = '#4FC3A1', '#35A586'
    feet = '#F27C8C'
    for x in (40, 55):
        p.line(Path().M(x, 100).L(x, 112), feet, 4.4, sil=True)
        for (dx, dy) in ((-6, 4), (1, 6), (8, 4)):
            p.line(Path().M(x, 112).L(x + dx, 112 + dy), feet, 3.4, sil=True)
    tail = rounded_poly([(30, 64), (4, 54), (4, 82), (30, 86)], 4)
    obj(p, tail, body_s, '#727D90', tone=(-1, -1.2))
    p.add(rounded_poly([(4, 54), (12, 57), (12, 80), (4, 82)], 3), bar)
    body = (Path().M(62, 42).C(80, 44, 88, 60, 86, 78).C(84, 96, 66, 106, 48, 104).C(30, 102, 20, 88, 22, 74)
            .C(26, 56, 44, 40, 62, 42).Z())
    obj(p, body, body_c, body_s)
    p.add(Path().M(56, 44).C(70, 38, 86, 48, 86, 66).C(80, 60, 70, 58, 58, 60).Z(), neck)
    wing = Path().M(28, 74).C(38, 62, 58, 62, 68, 72).C(60, 86, 42, 94, 24, 90).Z()
    p.add(wing, body_s)
    p.line(Path().M(34, 82).L(52, 75), bar, 3.6)
    p.line(Path().M(36, 89).L(56, 82), bar, 3.6)
    obj(p, Ell(72, 32, 16), body_c, body_s, tone=(-1.2, -1.6))
    p.add(rounded_poly([(84, 30), (99, 36), (84, 41)], 1.6), '#4A4F60', sil=True)
    p.add(Ell(76, 29, 4.8), C['orange'])
    p.add(Ell(77, 29, 2.5), INK)
    # the shopping bags, hanging from the beak by their handles
    for (x, y, col, cs) in ((90, 64, neck, neck_s), (70, 58, C['pink'], C['pink_s'])):
        bag = rounded_poly([(x, y), (x + 30, y), (x + 28, y + 46), (x + 2, y + 46)], 3)
        p.line(Path().M(x + 8, y + 2).C(x + 8, y - 14, 91, 38, 93, 37).C(95, 38, x + 22, y - 14, x + 22, y + 2), '#3A3F4F', 3.4, sil=True)
        obj(p, bag, col, cs, tone=(-1.2, -1.6))
        p.add(Ell(x + 8, y + 6, 2.6), '#3A3F4F')
        p.add(Ell(x + 22, y + 6, 2.6), '#3A3F4F')


def moth(p, x, y, s=1.0):
    wing, wing_s, body = '#C4B8A8', '#A89B8B', '#7A6B5C'
    p.push(compose(tr(x, y), sc(s)))
    for f in (1, -1):
        up = rounded_poly([(0, -2), (f * 22, -14), (f * 20, 4)], 4)
        lo = rounded_poly([(0, 2), (f * 16, 8), (f * 8, 16)], 3)
        p.add(lo, wing_s, sil=True)
        p.add(up, wing, sil=True)
        p.add(Ell(f * 13, -4, 3), wing_s)
        p.line(Path().M(f * 1.4, -9).Q(f * 3, -16, f * 8, -19), body, 2, sil=True)
    p.add(Ell(0, 1, 3.6, 10), body)
    p.pop()


def in_the_red(p):
    p.add(rrect(14, 44, 96, 34, 10), LEATHER_D, sil=True)
    obj(p, rrect(10, 58, 104, 60, 12), LEATHER, LEATHER_S)
    p.line(rrect(16, 64, 92, 48, 8), '#C98A55', 2, opacity=.9)
    obj(p, rrect(84, 70, 36, 26, 9), LEATHER_S, LEATHER_D, tone=(-1, -1.2))
    p.add(Ell(106, 83, 4.4), C['gold'])
    obj(p, capsule(72, 24, 116, 24, 10), RED, RED_S, tone=(-1.2, -1.6))
    moth(p, 36, 24)
    for (x, y, r) in ((42, 44, 2.2), (46, 52, 1.8)):
        p.add(Ell(x, y, r), '#C4B8A8', sil=True)


def incorruptible(p):
    p.push(compose(tr(86, 68), sc(.72), tr(-64, -66)))
    money_bag(p)
    p.pop()
    open_hand(p, compose(tr(46, 72), rot(-8), sc(1.3)))


def billboard(p):
    post, post_s = '#8F9AA8', '#6F7A88'
    p.sil_add(rrect(40, 80, 49, 34, 2))     # the die-cut fills the space between the posts, around the brace
    for x in (36, 84):
        obj(p, rrect(x, 76, 9, 44, 2), post, post_s, tone=(-1, 0))
    p.line(Path().M(40, 92).L(88, 110), post_s, 3.4)
    p.line(Path().M(88, 92).L(40, 110), post_s, 3.4)
    # the lamps that light the poster, on their arms
    lamps = (30, 98)
    for x in lamps:
        p.line(Path().M(x, 22).L(x, 8), D, 3.6, sil=True)
        obj(p, rrect(x - 9, 6, 18, 8, 3), D, DS, tone=(-.8, -1))
    board = rrect(8, 20, 112, 58, 5)
    obj(p, board, C['white'], '#D6DAE4', tone=(-1.4, -2))
    poster = rrect(14, 26, 100, 46, 2)
    p.add(poster, C['pink'])
    p.clip_start(poster)
    rays = []
    for k in range(8):
        a = math.radians(k * 45 + 10)
        rays.append(Path().M(64, 49).L(64 + 90 * math.cos(a), 49 + 90 * math.sin(a)).L(64 + 90 * math.cos(a + .4), 49 + 90 * math.sin(a + .4)).Z())
    p.add(merged(rays), '#FF77B6')
    p.add(merged([Path().M(x - 6, 26).L(x + 6, 26).L(x + 18, 72).L(x - 18, 72).Z() for x in lamps]), '#FFF3B8', opacity=.35)
    p.clip_end()
    obj(p, star(64, 51, 23, 10, round_=3), C['gold'], C['gold_s'], sil=False, tone=(-1.2, -1.6))
    obj(p, rrect(10, 76, 108, 7, 2), D, DS, tone=(-1, -1))


def flame(p, x, y, w, h, sil=True):
    """A small flame standing on (x, y): orange tongue, yellow heart."""
    def tongue(cx, by, ww, hh):
        return (Path().M(cx, by - hh).C(cx + ww * .14, by - hh * .62, cx + ww * .5, by - hh * .56, cx + ww * .5, by - hh * .22)
                .C(cx + ww * .5, by + ww * .1, cx + ww * .26, by + ww * .2, cx, by + ww * .2)
                .C(cx - ww * .26, by + ww * .2, cx - ww * .5, by + ww * .1, cx - ww * .5, by - hh * .22)
                .C(cx - ww * .5, by - hh * .5, cx - ww * .16, by - hh * .6, cx, by - hh).Z())
    obj(p, tongue(x, y, w, h), C['orange'], '#E4470B', sil=sil, tone=(-.8, -1))
    p.add(tongue(x, y + 1, w * .52, h * .5), C['face'])


def big_spender(p):
    m = compose(tr(64, 50), sc(1.0, .8), tr(-64, -64))
    p.push(m)
    outer = (Path().M(64, 121).C(36, 121, 20, 102, 22, 79).C(24, 59, 38, 50, 42, 33).C(50, 39, 55, 49, 53, 60)
             .C(61, 46, 67, 30, 60, 7).C(81, 19, 93, 37, 92, 58).C(96, 54, 98, 48, 96, 40)
             .C(107, 54, 109, 70, 107, 84).C(104, 104, 89, 121, 64, 121).Z())
    obj(p, outer, C['orange'], '#E4470B')
    core = (Path().M(64, 112).C(44, 112, 36, 98, 38, 84).C(40, 70, 50, 62, 54, 48).C(62, 58, 63, 68, 61, 76)
            .C(68, 70, 72, 60, 71, 50).C(84, 62, 90, 78, 88, 92).C(86, 104, 78, 112, 64, 112).Z())
    p.add(core, C['face'])
    p.pop()
    p.push(rot(-12, 64, 88))
    card = rrect(12, 60, 104, 62, 10)
    obj(p, card, '#5B6BD9', '#4453B8')
    obj(p, rrect(26, 74, 22, 17, 4), C['gold'], C['gold_s'], sil=False, tone=(-.8, -1))
    for k in range(4):
        p.add(rrect(26 + k * 20, 102, 14, 6, 3), '#C7CDF5')
    flame(p, 28, 68, 22, 30)   # the corner of the card catches fire
    p.pop()


def yard_sale(p):
    inside = Path().M(18, 50).L(110, 50).L(104, 62).L(24, 62).Z()
    p.add(inside, '#A8733F', sil=True)
    # an old record, sticking out of the box
    p.add(Ell(68, 42, 20), D, sil=True, tone=(DS, -1, -1.4))
    p.line(Ell(68, 42, 14), '#4A4F60', 1.8)
    p.add(Ell(68, 42, 6.4), C['pink'])
    p.add(Ell(68, 42, 1.8), D)
    for flip in (False, True):
        fl = Path().M(18, 52).L(4, 30).L(36, 26).L(50, 52).Z()
        obj(p, fl.t(flipx()) if flip else fl, '#EDBB82', '#D9A066', tone=(-1, -1.2))
    front = rrect(18, 52, 92, 66, 6)
    obj(p, front, CARD, CARD_S)
    p.add(rect(18, 52, 92, 8), '#C0864C')
    # the price tag, hanging from a string
    p.line(Path().M(98, 56).C(104, 62, 100, 70, 92, 74), '#8F9AA8', 3, sil=True)
    p.push(rot(-24, 82, 92))
    tag = rounded_poly([(70, 72), (104, 72), (104, 110), (70, 110), (58, 91)], [4, 6, 6, 4, 3])
    obj(p, tag, RED, RED_S, tone=(-1, -1.4))
    p.add(Ell(70, 91, 4.4), C['white'])
    p.add(rrect(80, 84, 18, 5, 2.5), C['white'])
    p.add(rrect(80, 94, 12, 5, 2.5), '#FFB0C4')
    p.pop()


def the_boss(p):
    p.line(Path().M(44, 46).L(44, 34).C(44, 26, 48, 24, 54, 24).L(74, 24).C(80, 24, 84, 26, 84, 34).L(84, 46), '#5E361C', 8, sil=True)
    case = rrect(8, 44, 112, 74, 12)
    obj(p, case, '#A8673A', '#8A4F27')
    p.add(rect(8, 70, 112, 8), '#8A4F27')
    obj(p, rrect(54, 64, 20, 20, 4), C['gold'], C['gold_s'], tone=(-.8, -1))
    p.add(rrect(60, 72, 8, 6, 2), '#B8860B')
    p.push(compose(tr(95, 25), rot(14), sc(.42), tr(-64, -72)))
    g, gs = C['gold'], C['gold_s']
    body = rounded_poly([(16, 44), (40, 74), (64, 34), (88, 74), (112, 44), (104, 98), (24, 98)], 4)
    obj(p, body, g, gs)
    for (x, y) in ((16, 42), (64, 31), (112, 42)):
        obj(p, Ell(x, y, 9), g, gs, tone=(-1, -1.4))
    obj(p, rrect(20, 92, 88, 22, 7), '#F7B321', '#DC9310', tone=(-1.4, -2))
    p.add(Ell(64, 103, 9, 7.4), C['pink'])
    p.pop()


def jail_time(p):
    win = Path().M(14, 120).L(14, 54).C(14, 24, 36, 8, 64, 8).C(92, 8, 114, 24, 114, 54).L(114, 120).Z()
    obj(p, win, '#C3BCB4', '#A39B93')
    inner = Path().M(28, 112).L(28, 56).C(28, 34, 44, 22, 64, 22).C(84, 22, 100, 34, 100, 56).L(100, 112).Z()
    p.add(inner, '#2B3350', tone=('#1E2438', 2, 3))
    p.clip_start(inner)
    p.add(Path().M(76, 30).C(66, 32, 62, 44, 66, 52).C(70, 58, 80, 58, 86, 52).C(78, 52, 72, 44, 76, 30).Z(), C['gold'])
    p.clip_end()
    for x in (42, 64, 86):
        obj(p, rrect(x - 4, 16, 8, 100, 3), '#D5DBE5', '#9AA4B4', sil=False, tone=(-1, 0))
    obj(p, rrect(24, 70, 80, 8, 3), '#D5DBE5', '#9AA4B4', sil=False, tone=(0, -1))


def tv_show(p):
    for (x, y) in ((40, 8), (90, 6)):
        p.line(Path().M(64, 30).L(x, y), D, 4, sil=True)
        p.add(Ell(x, y, 4.4), D, sil=True)
    obj(p, rrect(50, 22, 28, 12, 5), D, DS, tone=(-1, -1))
    for x in (28, 92):
        obj(p, rrect(x, 104, 10, 14, 3), D, DS, tone=(-1, 0))
    body = rrect(8, 30, 112, 80, 18)
    obj(p, body, C['red'], C['red_s'])
    scr = rrect(18, 40, 74, 60, 14)
    p.add(scr, '#BDE7FF', tone=('#8CCFF2', 2, 3))
    p.add(Path().M(26, 64).C(30, 52, 38, 46, 50, 44).L(46, 50).C(38, 52, 32, 58, 30, 66).Z(), C['white'])
    obj(p, star(55, 70, 18, 8, round_=2.2), C['gold'], C['gold_s'], sil=False, tone=(-1, -1.4))
    for y in (52, 74):
        obj(p, Ell(106, y, 7), '#FFE3B8', '#EBC690', sil=False, tone=(-.8, -1))
    for y in (90, 96):
        p.add(rrect(99, y - 1.4, 14, 2.8, 1.4), C['red_s'])
    obj(p, sparkle(112, 18, 11), C['gold'], C['gold_s'], tone=None)
    obj(p, sparkle(16, 22, 8), C['gold'], C['gold_s'], tone=None)


def bundle(p, x, y, w=28, h=18, rotd=0.0):
    """A wad of banknotes seen from the side, with its paper band."""
    p.push(rot(rotd, x + w / 2.0, y + h / 2.0))
    obj(p, rrect(x, y, w, h, 3), NOTE, NOTE_S, tone=(-.9, -1.4))
    p.add(merged([rect(x + 2.5, y + h * .36, w - 6, 1.9), rect(x + 2.5, y + h * .66, w - 6, 1.9)]), NOTE_S)
    p.add(rect(x + w / 2 - 3.5, y, 7, h), '#FFE070')
    p.pop()


def clapper(p):
    """The game's clapperboard (128 grid)."""
    board = rrect(12, 48, 104, 70, 8)
    obj(p, board, D, DS)
    p.add(rrect(20, 66, 88, 5, 2.5), '#5B6070')
    p.add(rrect(20, 84, 60, 5, 2.5), '#5B6070')
    p.push(rot(-14, 14, 44))
    top = rrect(10, 26, 106, 20, 5)
    obj(p, top, C['white'], '#D6DAE4', tone=(-1, -1.4))
    p.clip_start(top)
    for x in (14, 40, 66, 92):
        p.add(Path().M(x, 26).L(x + 14, 26).L(x + 4, 46).L(x - 10, 46).Z(), D)
    p.clip_end()
    p.pop()
    obj(p, Ell(17, 47, 6), C['heart'], '#D02247', tone=(-.8, -1))


def mrbeast(p):
    w, h = 28, 18
    rows = [(8, (0, 0, 0, 0)), (22, (-3, 2, -2)), (36, (3, -3))]
    for r, (x0, rots) in enumerate(rows):
        for k, a in enumerate(rots):
            bundle(p, x0 + k * w, 119 - h * (r + 1), w, h, a)
    p.push(compose(tr(66, 40), rot(-8), sc(.44), tr(-64, -72)))
    clapper(p)
    p.pop()


def born_to_be_hero(p):
    cape = (Path().M(48, 20).L(80, 20)
            .C(92, 46, 106, 72, 120, 96)
            .Q(106, 98, 98, 112).Q(86, 100, 72, 116).Q(60, 104, 46, 116).Q(32, 104, 14, 110)
            .C(24, 80, 38, 46, 48, 20).Z())
    obj(p, cape, RED, RED_S)
    p.add(Path().M(80, 20).C(92, 46, 106, 72, 120, 96).Q(111, 97, 105, 101).C(98, 74, 88, 46, 80, 20).Z(), '#A8173A')
    for ln in (Path().M(56, 28).C(52, 56, 46, 84, 42, 108), Path().M(73, 28).C(76, 56, 80, 84, 84, 106)):
        p.line(ln, RED_S, 3)
    obj(p, rrect(42, 12, 44, 13, 6.5), C['gold'], C['gold_s'], tone=(-1, -1.2))
    for x in (49, 79):
        p.add(Ell(x, 18.5, 3.8), '#FFF0A8')
    shield = Path().M(46, 50).L(82, 50).L(82, 68).C(82, 82, 72, 90, 64, 94).C(56, 90, 46, 82, 46, 68).Z()
    obj(p, shield, C['gold'], C['gold_s'], sil=False, tone=(-1.2, -1.6))
    p.add(star(64, 69, 14, 6.2, round_=1.6), RED)


def subject_expert(p):
    hc, hcs = C['red'], C['red_s']
    cap = Path().M(32, 56).L(32, 86).C(32, 100, 96, 100, 96, 86).L(96, 56).Z()
    obj(p, cap, DS, '#16181F')
    board = rounded_poly([(64, 26), (122, 50), (64, 74), (6, 50)], 4)
    obj(p, board, D, DS, tone=(-1.4, -2))
    for flip in (False, True):
        horn = Path().M(30, 50).C(24, 38, 20, 26, 24, 10).C(32, 22, 40, 32, 44, 44).Z()
        obj(p, horn.t(flipx()) if flip else horn, hc, hcs, tone=(-1, -1.2))
    p.line(Path().M(64, 50).L(98, 62).L(98, 86), C['gold'], 3.4, sil=True)
    obj(p, rrect(93, 84, 10, 22, 4), C['gold'], C['gold_s'], tone=(-.8, 0))
    obj(p, Ell(64, 50, 6), C['gold'], C['gold_s'], sil=False, tone=(-.6, -.8))


def merged(shapes):
    """One compound path from several shapes (same colour, one two-tone for all: a much lighter svg)."""
    out = Path()
    for g in shapes:
        out = out + (g.path() if isinstance(g, Ell) else g)
    return out


def laurel_leaves(cx, cy, R, a0=100, a1=205, n=5, leaf=(8.5, 3.8)):
    """The leaves of the left branch of a laurel wreath (angles in degrees, y down: 90 = bottom), as paths."""
    out = []
    for k in range(n):
        a = a0 + 6 + k * (a1 - a0 - 10) / (n - 1.0)
        t = math.radians(a)
        for side, tilt in ((1, -28), (-1, 28)):
            r = R + side * (leaf[1] + 1.4)
            x, y = cx + r * math.cos(t), cy + r * math.sin(t)
            out.append(Ell(x + math.cos(t + math.pi / 2) * leaf[0] * .5, y + math.sin(t + math.pi / 2) * leaf[0] * .5,
                           leaf[0], leaf[1], a + 90 + tilt).path())
    t = math.radians(a1)
    out.append(Ell(cx + R * math.cos(t), cy + R * math.sin(t), leaf[0], leaf[1], a1 + 90).path())
    return out


def living_legend(p):
    disc = Ell(64, 64, 56)
    p.add_clip(disc, '#2E2470', sil=True)
    p.add(Ell(72, 70, 56), '#251C5C')
    p.line(arc(64, 64, 36, 190, 340, 22), '#4B3BA6', 12)
    p.line(arc(64, 64, 32, 10, 160, 19), '#4B3BA6', 10)
    p.line(arc(64, 64, 36, 210, 320, 22), '#7A66DA', 4)
    p.line(arc(64, 64, 32, 30, 140, 19), '#7A66DA', 3.4)
    for (x, y, r) in ((24, 46, 2.2), (100, 34, 2.4), (30, 88, 1.8), (100, 92, 2), (52, 16, 1.8), (110, 62, 1.6), (78, 14, 1.4)):
        p.add(Ell(x, y, r), C['white'])
    p.clip_end()
    leaves = laurel_leaves(64, 62, 44, 100, 200, 5)
    leaves += [g.t(flipx()) for g in leaves]
    stem = arc(64, 62, 44, 100, 192)
    for g in (stem, stem.t(flipx())):
        p.line(g, C['gold_s'], 3)
    obj(p, merged(leaves), C['gold'], C['gold_s'], sil=False, tone=(-.6, -.8))
    obj(p, star(64, 60, 29, 12.5, round_=3.4), C['gold'], C['gold_s'], sil=False, tone=(-1.4, -2))
    p.add(Ell(53, 49, 2.8, 5, 34), C['white'], opacity=.9)
    obj(p, sparkle(96, 28, 7), C['white'], '#D6DAE4', sil=False, tone=None)


def sleepless_night(p):
    moon = Path().M(100, 6).C(80, 8, 66, 24, 66, 44).C(66, 64, 82, 78, 100, 78).C(110, 78, 118, 74, 124, 66).C(100, 70, 84, 56, 84, 38).C(84, 26, 90, 14, 100, 6).Z()
    obj(p, moon, C['gold'], C['gold_s'], tone=(-1.2, -1.6))
    O, OS, OL = '#A8673A', '#8A4F27', '#F1D7B0'
    p.add(capsule(10, 112, 118, 112, 6), '#6E3B1A', sil=True)
    for x in (48, 66):
        p.line(Path().M(x - 4, 106).L(x - 4, 114), C['orange'], 3.4)
        p.line(Path().M(x + 2, 106).L(x + 2, 114), C['orange'], 3.4)
    for flip in (False, True):
        ear = rounded_poly([(30, 40), (26, 14), (48, 32)], 3)
        obj(p, ear.t(flipx(57)) if flip else ear, O, OS, tone=(-1, -1.2))
    body = Ell(57, 70, 38, 42)
    obj(p, body, O, OS)
    p.add(Ell(57, 88, 24, 22), OL)
    for flip in (False, True):
        wing = Path().M(22, 62).C(14, 76, 18, 96, 30, 104).C(30, 90, 30, 74, 22, 62).Z()
        p.add(wing.t(flipx(57)) if flip else wing, OS, sil=True)
    for cx in (42, 72):
        p.add(Ell(cx, 56, 16), OL)
        p.add(Ell(cx, 61.4, 12, 11.6), '#A97BB8')   # the dark circles of a sleepless night
        p.add(Ell(cx, 56, 12), C['white'])
        p.add(Ell(cx, 57, 7), INK)
        glint(p, cx + 2.4, 54, 2.4)
    p.add(rounded_poly([(53, 66), (61, 66), (57, 76)], 1.6), C['orange'])


SUCCES = [
    ('partner-program', partner_program), ('silver-play-button', silver_play_button),
    ('golden-play-button', golden_play_button), ('diamond-play-button', diamond_play_button),
    ('ruby-play-button', ruby_play_button), ('poopy-play-button', poopy_play_button), ('pigeon', pigeon),
    ('in-the-red', in_the_red), ('incorruptible', incorruptible), ('billboard', billboard), ('big-spender', big_spender),
    ('yard-sale', yard_sale), ('the-boss', the_boss), ('jail-time', jail_time), ('tv-show', tv_show), ('mrbeast', mrbeast),
    ('born-to-be-hero', born_to_be_hero), ('subject-expert', subject_expert), ('living-legend', living_legend),
    ('sleepless-night', sleepless_night),
]
