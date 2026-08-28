"""Redraw the English overlay cards in French, straight onto the source photos.

The cards are baked into screenshot-*.jpg, so there is no clean background to
reuse: the French card is drawn OVER the English one, at the same position and
slightly larger, which hides it completely. Output keeps the source dimensions.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

F = '/System/Library/Fonts/Supplemental/Arial.ttf'
FB = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
FG = '/System/Library/Fonts/Supplemental/Georgia.ttf'
font = lambda p, s: ImageFont.truetype(p, s)

def rounded(draw, box, r, fill):
    draw.rounded_rectangle(box, radius=r, fill=fill)

def card(img, spec):
    x, y, w, h = spec['card']
    # soft shadow, drawn on its own layer then blurred
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((x, y + 14, x + w, y + h + 14), radius=26,
                                         fill=(0, 0, 0, 46))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(22)))

    d = ImageDraw.Draw(img)
    rounded(d, (x, y, x + w, y + h), 26, (255, 255, 255, 255))

    # eyebrow, letter-spaced by hand (PIL has no tracking)
    ex, ey = x + 34, y + 34
    for ch in spec['eyebrow'].upper():
        d.text((ex, ey), ch, font=font(FB, 16), fill=(168, 162, 158))
        ex += d.textlength(ch, font=font(FB, 16)) + 2.6

    ry = y + 118
    for i, r in enumerate(spec['rows']):
        cy = ry + 40
        if i:
            d.line((x + 34, ry - 20, x + w - 34, ry - 20), fill=(239, 238, 236), width=1)
        if r.get('avatar'):
            d.ellipse((x + 34, cy - 33, x + 100, cy + 33), fill=r['avatarBg'])
            fa = font(FG, 27)
            d.text((x + 67, cy), r['avatar'], font=fa, fill=(87, 83, 78), anchor='mm')
            tx = x + 120
        else:
            d.ellipse((x + 34, cy - 17, x + 68, cy + 17), fill=r['tickBg'])
            cx = x + 51
            if r['tick'] == 'check':
                # Drawn, not typed: Arial has no U+2713, so the glyph rendered
                # as an empty box.
                d.line((cx - 7, cy, cx - 2, cy + 5), fill=r['tickFg'], width=3)
                d.line((cx - 2, cy + 5, cx + 7, cy - 5), fill=r['tickFg'], width=3)
            else:
                d.ellipse((cx - 2, cy - 2, cx + 2, cy + 2), fill=r['tickFg'])
            tx = x + 88
        d.text((tx, cy - 24), r['name'], font=font(FB, 25), fill=(28, 25, 23))
        d.text((tx, cy + 7), r['sub'], font=font(F, 20), fill=(168, 162, 158))
        if r.get('chip'):
            fc = font(F, 19)
            cw = d.textlength(r['chip'], font=fc) + 44
            rx = x + w - 34
            rounded(d, (rx - cw, cy - 23, rx, cy + 23), 23, r['chipBg'])
            d.text((rx - cw / 2, cy), r['chip'], font=fc, fill=r['chipFg'], anchor='mm')
        ry += 120
    return img

SHOTS = [
  dict(src='public/screenshot-access.jpg', out='public/screenshot-access-fr.jpg',
       card=(76, 142, 794, 502), eyebrow='Proches & accès',
       rows=[
         dict(avatar='T', avatarBg=(231,239,228), name='Thomas', sub='Conjoint',
              chip='Accès complet', chipBg=(238,241,248), chipFg=(45,80,130)),
         dict(avatar='L', avatarBg=(236,234,246), name='Léa', sub='Fille',
              chip='Documents uniquement', chipBg=(234,241,232), chipFg=(63,107,59)),
         dict(avatar='B', avatarBg=(241,239,236), name='Cabinet Berthier', sub='Notaire',
              chip='Scellé jusqu’au moment venu', chipBg=(244,243,241), chipFg=(87,83,78)),
       ]),
  dict(src='public/screenshot-doc.jpg', out='public/screenshot-doc-fr.jpg',
       card=(78, 144, 790, 498), eyebrow='Ce mois-ci',
       rows=[
         dict(tick='check', tickBg=(231,239,228), tickFg=(76,125,71),
              name='Assurance habitation renouvelée', sub='Mise à jour il y a 2 jours'),
         dict(tick='check', tickBg=(231,239,228), tickFg=(76,125,71),
              name='Nouvelle assurance vie ajoutée', sub='Mise à jour la semaine dernière'),
         dict(tick='dot', tickBg=(244,243,241), tickFg=(168,162,158),
              name='Passeport valable encore 6 mois', sub='Un rappel discret, quand vous voulez',
              chip='Vérifier', chipBg=(244,243,241), chipFg=(87,83,78)),
       ]),
]

for s in SHOTS:
    img = Image.open(s['src']).convert('RGBA')
    card(img, s)
    img.convert('RGB').save(s['out'], 'JPEG', quality=88, optimize=True, progressive=True)
    print('  écrit %s (%dx%d)' % (s['out'], img.width, img.height))
