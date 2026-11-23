"""Fictional loyalty / membership / transit cards. Each builder returns a dict:
{slug, name, pages:[Sheet(front), Sheet(back)?], photo, qrcode:{format,text}, tags, folder, favorite, extra, created, used, useCount}"""
import random
import math
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from render import Sheet, font, gradient, hex_to_rgb, round_corners
import treepoem

CARD = (1600, 1009)


def ean_digits(data, eight=False):
    """data without the check digit, returns data with it"""
    total = sum(int(d) * ((3 if i % 2 == 0 else 1) if eight else (1 if i % 2 == 0 else 3)) for i, d in enumerate(data))
    return data + str((10 - total % 10) % 10)


def bc(kind, data, scale=4, **options):
    return treepoem.generate_barcode(kind, data, options=dict(scale=scale, **options)).convert('RGB')


def base(c0, c1=None, angle=30, seed=1):
    sheet = Sheet(*CARD, paper=c0, rng=random.Random(seed))
    if c1:
        sheet.image.paste(gradient(CARD, c0, c1, angle), (0, 0))
        sheet.draw = ImageDraw.Draw(sheet.image)
    return sheet


def white_box(sheet, image, xy, pad=22, radius=18):
    box = ImageOps.expand(image, pad, '#ffffff')
    mask = Image.new('L', box.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, box.width - 1, box.height - 1), radius=radius, fill=255)
    sheet.image.paste(box, xy, mask)
    sheet.draw = ImageDraw.Draw(sheet.image)
    return box.size


def circles(sheet, color, alpha=28, seed=0):
    layer = Image.new('RGBA', CARD, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rng = random.Random(seed)
    for _ in range(5):
        r = rng.randint(180, 420)
        x = rng.randint(-100, CARD[0])
        y = rng.randint(-150, CARD[1])
        d.ellipse((x - r, y - r, x + r, y + r), fill=hex_to_rgb(color) + (alpha,))
    sheet.image = Image.alpha_composite(sheet.image.convert('RGBA'), layer).convert('RGB')
    sheet.draw = ImageDraw.Draw(sheet.image)


def stripe_back(sheet, label_lines, dark='#111111'):
    sheet.rect((0, 70, CARD[0], 210), fill=dark)
    y = 760
    for line in label_lines:
        sheet.text((80, y), line, ('avenir', 28), '#ffffff', record=False)
        y += 40


# ----------------------------------------------------------------------------- loyalty


def greenleaf():
    sheet = base('#14532d', '#22c55e', 25, 1)
    circles(sheet, '#ffffff', 22, 1)
    sheet.draw.ellipse((90, 90, 200, 200), fill=hex_to_rgb('#ffffff'))
    sheet.draw.pieslice((112, 112, 190, 190), 200, 20, fill=hex_to_rgb('#16a34a'))
    sheet.text((230, 105), 'Greenleaf', ('avenir-bold', 84), '#ffffff', record=False)
    sheet.text((234, 195), 'MARKET · CLUB CARD', ('avenir-demi', 28), '#bbf7d0', spacing=6, record=False)
    img = bc('ean13', '401234500012', 5, height=1.0)
    img = img.resize((760, 230))
    white_box(sheet, img, (80, 470))
    sheet.text((100, 310), 'Dana Whitfield', ('avenir-demi', 52), '#ffffff', record=False)
    sheet.text((100, 375), 'Member since 2023', ('avenir', 28), '#bbf7d0', record=False)
    sheet.text((1500, 760), '4012 3450 0012', ('mono', 34), '#dcfce7', anchor='ra', record=False)
    return dict(slug='greenleaf-club', name='Greenleaf Club Card', pages=[sheet], photo=dict(kind='wood'), qrcode=dict(format='EAN_13', text=ean_digits('401234500012')), tags=['loyalty'], folder=None, favorite=True, created='2026-03-12 11:00', used='2026-11-18 18:20', useCount=34, extra=dict(color='#16a34a'))


def aurora():
    sheet = base('#0c1e4a', '#1d4ed8', 20, 2)
    for i in range(7):
        sheet.draw.arc((900 + i * 30, -300 + i * 24, 1900 + i * 30, 700 + i * 24), 100, 190, fill=hex_to_rgb('#60a5fa'), width=3)
    sheet.text((90, 90), 'Aurora', ('avenir-bold', 90), '#ffffff', record=False)
    sheet.text((94, 190), 'FLYER · GOLD', ('avenir-demi', 34), '#fcd34d', spacing=10, record=False)
    sheet.text((90, 520), 'MARTIN DUVAL', ('avenir-demi', 56), '#ffffff', spacing=4, record=False)
    sheet.text((90, 600), '6021 884 3317', ('mono-bold', 46), '#bfdbfe', record=False)
    sheet.text((90, 700), 'Miles 48,215', ('avenir-bold', 40), '#fcd34d', record=False)
    img = bc('azteccode', 'AAFF-6021884331-GOLD-DUVAL', 5).resize((300, 300))
    white_box(sheet, img, (1180, 560), pad=18)
    return dict(slug='aurora-flyer', name='Aurora Air Miles', pages=[sheet], photo=dict(kind='slate'), qrcode=dict(format='AZTEC', text='AAFF-6021884331-GOLD-DUVAL'), tags=['travel', 'loyalty'], folder=None, favorite=True, created='2026-02-01 09:00', used='2026-11-10 21:05', useCount=9, extra=dict(color='#1d4ed8'))


def velo():
    sheet = base('#f97316', '#fb923c', 30, 3)
    circles(sheet, '#ffffff', 30, 3)
    sheet.draw.ellipse((90, 90, 230, 230), outline=hex_to_rgb('#ffffff'), width=14)
    sheet.draw.ellipse((200, 90, 340, 230), outline=hex_to_rgb('#ffffff'), width=14)
    sheet.draw.line([(160, 160), (230, 100), (290, 160), (160, 160)], fill=hex_to_rgb('#ffffff'), width=10)
    sheet.text((380, 110), 'Velo City', ('arial-black', 86), '#ffffff', record=False)
    sheet.text((384, 210), 'BIKE SHARING · ANNUAL PASS', ('arial-bold', 28), '#7c2d12', spacing=4, record=False)
    sheet.text((90, 620), 'Martin Duval', ('arial-bold', 56), '#ffffff', record=False)
    sheet.text((90, 700), 'Valid until 31/12/2026', ('arial', 32), '#7c2d12', record=False)
    img = bc('qrcode', 'https://velocity.example/pass/VC-0074192-DUVAL', 6).resize((330, 330))
    white_box(sheet, img, (1130, 560), pad=20)
    return dict(slug='velo-city', name='Velo City annual pass', pages=[sheet], photo=dict(kind='wood'), qrcode=dict(format='QR_CODE', text='https://velocity.example/pass/VC-0074192-DUVAL'), tags=['transport'], folder=None, favorite=False, created='2026-01-05 08:30', used='2026-11-21 08:12', useCount=61, extra=dict(color='#f97316', expire_on={'type': 'date', 'value': 1798675200000, 'kind': 'expire_on'}))


def fitlab():
    sheet = base('#0f0f10', '#27272a', 10, 4)
    sheet.rect((0, 0, 40, CARD[1]), fill='#a3e635')
    sheet.text((110, 90), 'FITLAB', ('arial-black', 110), '#a3e635', record=False)
    sheet.text((114, 220), 'GYM & STUDIO · PREMIUM', ('arial-bold', 32), '#d4d4d8', spacing=5, record=False)
    sheet.text((110, 330), 'DUVAL MARTIN', ('arial-bold', 54), '#ffffff', spacing=3, record=False)
    sheet.text((110, 405), 'ID 0041 7782', ('mono', 40), '#a3e635', record=False)
    img = bc('code39', 'FL00417782', 4, height=1.0).resize((760, 190))
    white_box(sheet, img, (110, 490))
    back = base('#18181b', '#0f0f10', 60, 5)
    back.rect((0, 80, CARD[0], 220), fill='#000000')
    back.text((80, 300), 'Present this card at the front desk.', ('arial', 36), '#e4e4e7')
    back.text((80, 360), 'Open 6:00 – 23:00 · 7 days a week', ('arial', 36), '#e4e4e7')
    back.text((80, 760), 'fitlab.example · 04 72 00 18 18', ('arial-bold', 34), '#a3e635')
    return dict(slug='fitlab-gym', name='FitLab membership', pages=[sheet, back], photo=dict(kind='marble'), qrcode=dict(format='CODE_39', text='FL00417782'), tags=['sport'], folder=None, favorite=False, created='2026-04-02 18:10', used='2026-11-19 07:02', useCount=48, extra=dict(color='#a3e635', expire_on={'type': 'date', 'value': 1806537600000, 'kind': 'expire_on'}))


def cafe_stamp():
    sheet = base('#fef3c7', '#fde68a', 50, 6)
    sheet.rect((24, 24, CARD[0] - 24, CARD[1] - 24), outline='#92400e', width=4, radius=30)
    sheet.text((CARD[0] / 2, 80), 'CAFÉ BRUME', ('serif-bold', 80), '#78350f', anchor='ma', spacing=10, record=False)
    sheet.text((CARD[0] / 2, 190), 'Carte de fidélité · 10e café offert', ('serif', 36), '#92400e', anchor='ma', record=False)
    for index in range(10):
        cx = 220 + (index % 5) * 290
        cy = 430 + (index // 5) * 230
        sheet.draw.ellipse((cx - 90, cy - 90, cx + 90, cy + 90), outline=hex_to_rgb('#92400e'), width=5)
        if index < 7:
            sheet.draw.ellipse((cx - 62, cy - 62, cx + 62, cy + 62), fill=hex_to_rgb('#92400e'))
            sheet.text((cx, cy), 'B', ('serif-bold', 70), '#fef3c7', anchor='mm', record=False)
        elif index == 9:
            sheet.text((cx, cy), 'FREE', ('serif-bold', 42), '#b91c1c', anchor='mm', record=False)
    img = bc('qrcode', 'CAFEBRUME-LOYALTY-7-0012841', 4).resize((150, 150))
    white_box(sheet, img, (1360, 800), pad=10, radius=10)
    return dict(slug='cafe-brume-stamp', name='Café Brume stamp card', pages=[sheet], photo=dict(kind='linen'), qrcode=dict(format='QR_CODE', text='CAFEBRUME-LOYALTY-7-0012841'), tags=['loyalty'], folder=None, favorite=False, created='2026-09-10 12:00', used='2026-11-14 12:50', useCount=7, extra=dict(color='#92400e'))


def harbor():
    sheet = base('#1c1917', '#44403c', 20, 7)
    for r in range(380, 1100, 90):
        sheet.draw.arc((CARD[0] - r, CARD[1] - r, CARD[0] + r, CARD[1] + r), 180, 270, fill=hex_to_rgb('#b8892b'), width=2)
    sheet.text((90, 80), 'HARBOR', ('times-bold', 100), '#d4a24c', spacing=14, record=False)
    sheet.text((94, 200), 'HOTELS & RESORTS · REWARDS', ('times', 32), '#e7e5e4', spacing=8, record=False)
    sheet.text((90, 400), 'Mr Martin Duval', ('times', 56), '#fafaf9', record=False)
    sheet.text((90, 485), 'PLATINUM ELITE', ('times-bold', 40), '#d4a24c', spacing=8, record=False)
    sheet.text((90, 580), 'HR 5520 7741 03', ('mono', 44), '#e7e5e4', record=False)
    img = bc('pdf417', 'HARBOR|HR552077410 3|DUVAL|PLAT', 3, columns=6).resize((560, 200))
    white_box(sheet, img, (960, 470), pad=14)
    return dict(slug='harbor-hotels', name='Harbor Hotels Rewards', pages=[sheet], photo=dict(kind='slate'), qrcode=dict(format='PDF_417', text='HARBOR|HR5520774103|DUVAL|PLAT'), tags=['travel', 'loyalty'], folder=None, favorite=False, created='2026-05-22 15:30', used='2026-10-01 10:00', useCount=3, extra=dict(color='#d4a24c'))


def pharma():
    sheet = base('#ecfdf5', '#a7f3d0', 40, 8)
    sheet.rect((0, 0, CARD[0], 170), fill='#0b6e4f')
    sheet.text((90, 38), '+ PHARMA PLUS', ('arial-black', 80), '#ffffff', record=False)
    sheet.text((90, 220), 'Carte Avantages', ('arial-bold', 62), '#064e3b', record=False)
    sheet.text((90, 300), 'Martin DUVAL', ('arial', 46), '#065f46', record=False)
    sheet.text((90, 360), 'N° 2 0099 4471', ('mono-bold', 44), '#065f46', record=False)
    img = bc('ean8', ean_digits('2099447', True), 5, height=1.0).resize((520, 220))
    white_box(sheet, img, (90, 450))
    sheet.text((780, 500), '120 points', ('arial-black', 72), '#0b6e4f', record=False)
    sheet.text((780, 600), '= 6,00 € de remise', ('arial', 36), '#065f46', record=False)
    return dict(slug='pharma-plus', name='Pharma Plus — carte avantages', pages=[sheet], photo=dict(kind='marble'), qrcode=dict(format='EAN_8', text=ean_digits('2099447', True)), tags=['health', 'loyalty'], folder='Health', favorite=False, created='2026-06-03 10:00', used='2026-11-02 10:05', useCount=12, extra=dict(color='#0b6e4f'))


def booknook():
    sheet = base('#4c1d95', '#7c3aed', 60, 9)
    circles(sheet, '#ffffff', 20, 9)
    sheet.rect((90, 90, 190, 230), fill='#fbbf24', radius=8)
    sheet.rect((110, 90, 118, 230), fill='#b45309')
    sheet.text((230, 100), 'BookNook', ('serif-bold', 92), '#ffffff', record=False)
    sheet.text((234, 210), 'INDEPENDENT BOOKSTORE · READERS’ CLUB', ('avenir-demi', 27), '#ddd6fe', spacing=4, record=False)
    sheet.text((90, 400), 'Sofia Duval', ('serif', 62), '#ffffff', record=False)
    sheet.text((90, 490), '9 books bought · next one −15 %', ('avenir', 32), '#ddd6fe', record=False)
    img = bc('code128', 'BN-0008841-SD', 4, height=1.0).resize((640, 150))
    white_box(sheet, img, (90, 560), pad=14)
    return dict(slug='booknook', name='BookNook readers’ club', pages=[sheet], photo=dict(kind='wood'), qrcode=dict(format='CODE_128', text='BN-0008841-SD'), tags=['loyalty'], folder='Shops', favorite=False, created='2026-07-14 16:00', used='2026-09-30 17:10', useCount=5, extra=dict(color='#7c3aed'))


def cinema():
    sheet = base('#450a0a', '#991b1b', 20, 10)
    for x in range(40, CARD[0], 70):
        sheet.rect((x, 24, x + 36, 58), fill='#1f0505', radius=6)
        sheet.rect((x, CARD[1] - 58, x + 36, CARD[1] - 24), fill='#1f0505', radius=6)
    sheet.text((CARD[0] / 2, 120), 'CINÉMA LUMIÈRE', ('serif-bold', 96), '#fde68a', anchor='ma', spacing=8, record=False)
    sheet.text((CARD[0] / 2, 250), 'CARTE ILLIMITÉE', ('avenir-demi', 44), '#fecaca', anchor='ma', spacing=12, record=False)
    sheet.text((100, 520), 'Duval Martin', ('avenir-demi', 56), '#ffffff', record=False)
    sheet.text((100, 600), 'Abonné n° 0 3318 2207', ('mono', 38), '#fde68a', record=False)
    sheet.text((100, 680), 'Valable jusqu’au 28/02/2027', ('avenir', 32), '#fecaca', record=False)
    img = bc('datamatrix', 'CL-0331822070-DUVAL-UNL', 6).resize((300, 300))
    white_box(sheet, img, (1130, 520), pad=18)
    return dict(slug='cinema-lumiere', name='Cinéma Lumière — carte illimitée', pages=[sheet], photo=dict(kind='slate'), qrcode=dict(format='DATA_MATRIX', text='CL-0331822070-DUVAL-UNL'), tags=['leisure'], folder=None, favorite=False, created='2026-02-20 19:00', used='2026-10-19 20:30', useCount=14, extra=dict(color='#991b1b', expire_on={'type': 'date', 'value': 1803772800000, 'kind': 'expire_on'}))


def transit():
    sheet = base('#0369a1', '#0ea5e9', 15, 11)
    sheet.rect((0, 380, CARD[0], 470), fill='#ffffff')
    sheet.rect((0, 470, CARD[0], 490), fill='#facc15')
    sheet.text((90, 80), 'MÉTROPOLE', ('arial-black', 84), '#ffffff', record=False)
    sheet.text((94, 190), 'TRANSPORTS EN COMMUN · LYON', ('arial-bold', 30), '#e0f2fe', spacing=5, record=False)
    sheet.text((90, 395), 'Pass mensuel · Zones 1-3', ('arial-bold', 52), '#075985', record=False)
    sheet.text((90, 560), 'DUVAL Martin', ('arial-bold', 56), '#ffffff', record=False)
    sheet.text((90, 640), 'Novembre 2026', ('arial', 40), '#e0f2fe', record=False)
    img = bc('qrcode', 'METROPOLE|PASS|M|2026-11|ZN13|0099817245', 6).resize((300, 300))
    white_box(sheet, img, (1180, 580), pad=16)
    sheet.text((90, 880), 'N° 0099 8172 45', ('mono', 36), '#ffffff', record=False)
    return dict(slug='transit-pass', name='Transit pass — November', pages=[sheet], photo=dict(kind='desk'), qrcode=dict(format='QR_CODE', text='METROPOLE|PASS|M|2026-11|ZN13|0099817245'), tags=['transport'], folder=None, favorite=True, created='2026-11-01 07:40', used='2026-11-22 08:05', useCount=102, extra=dict(color='#0ea5e9', expire_on={'type': 'date', 'value': 1796000000000, 'kind': 'expire_on'}))


def health_card():
    front = base('#1e3a8a', '#3b82f6', 20, 12)
    front.rect((0, 0, CARD[0], 190), fill='#ffffff')
    front.text((90, 45), 'Blue Shield', ('avenir-bold', 84), '#1e3a8a', record=False)
    front.text((CARD[0] - 90, 70), 'HEALTH INSURANCE', ('avenir-demi', 34), '#475569', anchor='ra', spacing=4, record=False)
    front.text((90, 280), 'MEMBER', ('avenir', 28), '#bfdbfe', spacing=4, record=False)
    front.text((90, 324), 'Martin Duval', ('avenir-bold', 66), '#ffffff', record=False)
    front.text((90, 430), 'MEMBER ID', ('avenir', 28), '#bfdbfe', spacing=4, record=False)
    front.text((90, 474), 'BSH 774 019 228 03', ('mono-bold', 52), '#ffffff', record=False)
    front.text((90, 570), 'GROUP', ('avenir', 28), '#bfdbfe', spacing=4, record=False)
    front.text((90, 612), 'Helio Robotics · 00448', ('avenir-demi', 42), '#ffffff', record=False)
    front.text((90, 685), 'Rx BIN 610014   PCN BSH   Copay $20 / $40 / $100', ('avenir', 30), '#dbeafe', record=False)
    back = base('#f1f5f9', '#e2e8f0', 20, 13)
    back.rect((0, 70, CARD[0], 210), fill='#0f172a')
    back.text((90, 280), 'Member services 1-800-555-0172', ('avenir-demi', 38), '#0f172a', record=False)
    back.text((90, 340), 'Claims: PO Box 14, Portland OR 97201', ('avenir', 34), '#334155', record=False)
    img = bc('pdf417', 'BSH774019228|03|DUVAL|MARTIN|00448', 3, columns=8).resize((900, 260))
    white_box(back, img, (90, 520))
    return dict(slug='health-insurance', name='Blue Shield health card', pages=[front, back], photo=dict(kind='linen'), qrcode=dict(format='PDF_417', text='BSH774019228|03|DUVAL|MARTIN|00448'), tags=['health', 'insurance'], folder=None, favorite=True, created='2026-01-15 14:00', used='2026-11-06 12:15', useCount=18, extra=dict(color='#1e3a8a'))


def gift_card():
    sheet = base('#111827', '#4b5563', 40, 14)
    circles(sheet, '#fbbf24', 35, 14)
    sheet.text((90, 80), 'ORBIT', ('avenir-bold', 90), '#ffffff', spacing=16, record=False)
    sheet.text((94, 190), 'ELECTRONICS · GIFT CARD', ('avenir-demi', 32), '#fbbf24', spacing=6, record=False)
    sheet.text((90, 260), '€50.00', ('avenir-bold', 150), '#ffffff', record=False)
    sheet.text((94, 440), 'Balance remaining €32.50', ('avenir', 40), '#fde68a', record=False)
    sheet.text((94, 500), 'PIN 4417', ('mono-bold', 40), '#e5e7eb', record=False)
    img = bc('code128', 'OE5000-7743-9920-1148', 4, height=1.0).resize((760, 140))
    white_box(sheet, img, (90, 560), pad=14)
    return dict(slug='orbit-gift', name='Orbit Electronics gift card', pages=[sheet], photo=dict(kind='wood'), qrcode=dict(format='CODE_128', text='OE5000-7743-9920-1148'), tags=['gift'], folder=None, favorite=False, created='2026-10-12 17:35', used='2026-10-12 17:40', useCount=2, extra=dict(color='#4b5563', balance={'type': 'number', 'value': 32.5, 'kind': 'balance'}, expire_on={'type': 'date', 'value': 1822953600000, 'kind': 'expire_on'}))


def library():
    sheet = base('#fefce8', '#fef08a', 30, 15)
    sheet.rect((0, 0, CARD[0], 150), fill='#854d0e')
    sheet.text((90, 34), 'Bibliothèque Municipale', ('serif-bold', 68), '#fef9c3', record=False)
    sheet.rect((90, 230, 440, 680), fill='#d6d3d1', radius=14)
    sheet.draw.ellipse((200, 300, 330, 430), fill=hex_to_rgb('#a8a29e'))
    sheet.draw.pieslice((150, 460, 380, 700), 180, 360, fill=hex_to_rgb('#a8a29e'))
    sheet.text((520, 250), 'Carte de lecteur', ('serif', 40), '#78350f', record=False)
    sheet.text((520, 320), 'Sofia Duval', ('serif-bold', 70), '#422006', record=False)
    sheet.text((520, 420), 'N° lecteur 0 5532 117', ('mono', 38), '#78350f', record=False)
    sheet.text((520, 490), 'Prêts autorisés : 8 · durée 28 jours', ('serif', 34), '#78350f', record=False)
    img = bc('code128', 'BM0553211', 4, height=1.0).resize((640, 150))
    white_box(sheet, img, (520, 560), pad=14)
    return dict(slug='library-card', name='Bibliothèque — carte de lecteur', pages=[sheet], photo=dict(kind='marble'), qrcode=dict(format='CODE_128', text='BM0553211'), tags=['leisure'], folder=None, favorite=False, created='2026-03-08 11:00', used='2026-10-27 15:00', useCount=8, extra=dict(color='#854d0e', expire_on={'type': 'date', 'value': 1793404800000, 'kind': 'expire_on'}))


def carshare():
    sheet = base('#065f46', '#0f766e', 10, 16)
    sheet.text((90, 80), 'ZipGo', ('arial-black', 120), '#ffffff', record=False)
    sheet.text((94, 230), 'CAR SHARING', ('arial-bold', 36), '#99f6e4', spacing=10, record=False)
    sheet.draw.rounded_rectangle((900, 90, 1500, 300), radius=60, fill=hex_to_rgb('#14b8a6'))
    sheet.draw.ellipse((980, 240, 1080, 340), fill=hex_to_rgb('#042f2e'))
    sheet.draw.ellipse((1320, 240, 1420, 340), fill=hex_to_rgb('#042f2e'))
    sheet.text((90, 560), 'M. DUVAL', ('arial-bold', 62), '#ffffff', record=False)
    sheet.text((90, 650), 'Driver ID ZG-884-2210', ('mono', 38), '#99f6e4', record=False)
    img = bc('qrcode', 'zipgo://unlock/ZG-884-2210', 6).resize((300, 300))
    white_box(sheet, img, (1180, 560), pad=16)
    return dict(slug='zipgo', name='ZipGo car sharing', pages=[sheet], photo=dict(kind='slate'), qrcode=dict(format='QR_CODE', text='zipgo://unlock/ZG-884-2210'), tags=['transport'], folder='Transport', favorite=False, created='2026-08-19 09:00', used='2026-11-08 14:00', useCount=6, extra=dict(color='#0f766e'))


def petal():
    sheet = base('#fdf2f8', '#fbcfe8', 40, 17)
    for i in range(8):
        a = i * math.pi / 4
        cx, cy = 260 + math.cos(a) * 70, 200 + math.sin(a) * 70
        sheet.draw.ellipse((cx - 45, cy - 45, cx + 45, cy + 45), fill=hex_to_rgb('#ec4899'))
    sheet.draw.ellipse((220, 160, 300, 240), fill=hex_to_rgb('#fde047'))
    sheet.text((400, 120), 'Petal', ('times-italic', 120), '#9d174d', record=False)
    sheet.text((404, 260), 'COSMETICS · BEAUTY CLUB', ('avenir-demi', 30), '#be185d', spacing=6, record=False)
    sheet.text((90, 380), 'Sofia Duval', ('avenir-demi', 58), '#831843', record=False)
    sheet.text((90, 450), 'Rose level · 340 pts', ('avenir', 38), '#be185d', record=False)
    img = bc('ean13', '300112233445', 5, height=1.0).resize((640, 190))
    white_box(sheet, img, (90, 520), pad=14)
    return dict(slug='petal-beauty', name='Petal beauty club', pages=[sheet], photo=dict(kind='linen'), qrcode=dict(format='EAN_13', text=ean_digits('300112233445')), tags=['loyalty'], folder='Shops', favorite=False, created='2026-05-02 13:00', used='2026-10-05 16:40', useCount=4, extra=dict(color='#ec4899'))


def student():
    front = base('#1e293b', '#334155', 25, 18)
    front.rect((0, 0, CARD[0], 160), fill='#be123c')
    front.text((90, 40), 'Université de Lyon', ('serif-bold', 74), '#ffffff', record=False)
    front.rect((90, 230, 500, 780), fill='#cbd5e1', radius=16)
    front.draw.ellipse((200, 290, 390, 480), fill=hex_to_rgb('#94a3b8'))
    front.draw.pieslice((150, 520, 440, 820), 180, 360, fill=hex_to_rgb('#94a3b8'))
    front.text((580, 250), 'CARTE ÉTUDIANT', ('avenir-bold', 34), '#fda4af', spacing=6, record=False)
    front.text((580, 320), 'DUVAL', ('avenir-bold', 80), '#ffffff', record=False)
    front.text((580, 420), 'Sofia', ('avenir', 68), '#ffffff', record=False)
    front.text((580, 540), 'N° étudiant  22 114 058', ('mono', 38), '#e2e8f0', record=False)
    front.text((580, 610), 'Master 2 · Architecture', ('avenir', 36), '#e2e8f0', record=False)
    front.text((580, 680), 'Année 2026 – 2027', ('avenir', 36), '#e2e8f0', record=False)
    back = base('#f8fafc', '#e2e8f0', 20, 19)
    img = bc('code128', '22114058', 4, height=1.0).resize((900, 240))
    white_box(back, img, (350, 380), pad=20)
    back.text((CARD[0] / 2, 700), 'Valable jusqu’au 31/08/2027', ('avenir', 38), '#334155', anchor='ma', record=False)
    return dict(slug='student-card', name='Carte étudiante — Sofia', pages=[front, back], photo=dict(kind='desk'), qrcode=dict(format='CODE_128', text='22114058'), tags=['id'], folder='Health', favorite=False, created='2026-09-14 08:30', used='2026-11-04 12:00', useCount=22, extra=dict(color='#be123c', expire_on={'type': 'date', 'value': 1819000000000, 'kind': 'expire_on'}))


def parking():
    sheet = base('#1d4ed8', '#1e40af', 10, 20)
    sheet.rect((90, 90, 330, 330), fill='#ffffff', radius=40)
    sheet.text((210, 210), 'P', ('arial-black', 190), '#1d4ed8', anchor='mm', record=False)
    sheet.text((390, 110), 'QuickPark', ('arial-black', 100), '#ffffff', record=False)
    sheet.text((394, 230), 'SUBSCRIBER BADGE · LEVEL B', ('arial-bold', 30), '#bfdbfe', spacing=5, record=False)
    sheet.text((90, 520), 'GK-482-ZH', ('mono-bold', 90), '#ffffff', record=False)
    sheet.text((90, 640), 'Duval Martin · Resident', ('arial', 40), '#dbeafe', record=False)
    img = bc('qrcode', 'QP|B|GK482ZH|2026-12', 5).resize((260, 260))
    white_box(sheet, img, (1210, 620), pad=14)
    return dict(slug='quickpark', name='QuickPark subscriber badge', pages=[sheet], photo=dict(kind='wood'), qrcode=dict(format='QR_CODE', text='QP|B|GK482ZH|2026-12'), tags=['transport'], folder='Transport', favorite=False, created='2026-06-30 09:00', used='2026-11-12 19:00', useCount=27, extra=dict(color='#1d4ed8'))


def spa():
    sheet = base('#134e4a', '#2dd4bf', 70, 21)
    circles(sheet, '#ffffff', 22, 21)
    sheet.text((CARD[0] / 2, 150), 'SUNRISE SPA', ('serif', 110), '#f0fdfa', anchor='ma', spacing=12, record=False)
    sheet.text((CARD[0] / 2, 300), 'VOUCHER · MASSAGE DUO 60 MIN', ('avenir-demi', 38), '#ccfbf1', anchor='ma', spacing=6, record=False)
    sheet.text((CARD[0] / 2, 450), 'Valid until 30 April 2027', ('avenir', 40), '#ffffff', anchor='ma', record=False)
    img = bc('qrcode', 'SUNRISE-VOUCHER-D60-77412-RF', 6).resize((300, 300))
    white_box(sheet, img, (650, 560), pad=16)
    return dict(slug='sunrise-spa', name='Sunrise Spa voucher', pages=[sheet], photo=dict(kind='linen'), qrcode=dict(format='QR_CODE', text='SUNRISE-VOUCHER-D60-77412-RF'), tags=['gift'], folder='Shops', favorite=False, created='2026-11-20 10:00', used=None, useCount=0, extra=dict(color='#2dd4bf', expire_on={'type': 'date', 'value': 1809000000000, 'kind': 'expire_on'}))


def trattoria():
    sheet = base('#7f1d1d', '#b91c1c', 20, 22)
    for x in range(0, CARD[0], 80):
        sheet.rect((x, 0, x + 40, 60), fill='#fef2f2')
        sheet.rect((x + 40, 0, x + 80, 60), fill='#7f1d1d')
    sheet.text((CARD[0] / 2, 150), 'Trattoria', ('times-italic', 140), '#fef2f2', anchor='ma', record=False)
    sheet.text((CARD[0] / 2, 320), 'da Giovanni', ('times-bold', 90), '#fecaca', anchor='ma', record=False)
    sheet.text((CARD[0] / 2, 470), 'Fidelity card · 8 lunches = 1 free', ('avenir', 40), '#ffffff', anchor='ma', record=False)
    sheet.text((CARD[0] / 2, 570), 'No. 00 417', ('mono-bold', 56), '#fde68a', anchor='ma', record=False)
    return dict(slug='trattoria', name='Trattoria da Giovanni', pages=[sheet], photo=dict(kind='wood'), qrcode=None, tags=['loyalty'], folder=None, favorite=False, created='2026-08-01 12:30', used='2026-10-24 13:00', useCount=3, extra=dict(color='#b91c1c'))


def cardwallet_list():
    return [greenleaf, aurora, velo, fitlab, cafe_stamp, harbor, pharma, booknook, cinema, transit, health_card, gift_card, library, carshare, petal, student, parking, spa, trattoria]
