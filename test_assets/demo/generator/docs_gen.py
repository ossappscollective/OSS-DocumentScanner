"""Realistic (fictional) scanned documents. Every builder returns a dict:
{ slug, name, lang, pages: [Sheet,...], photo: {kind, rotation, ...}, tags, folder, extra, favorite, ... }"""
import random
import math
from PIL import Image, ImageDraw
from render import Sheet, font, paragraph, hex_to_rgb, gradient, wrap_text
import treepoem

A4 = (1240, 1754)


def barcode_image(kind, data, scale=3, **options):
    return treepoem.generate_barcode(kind, data, options=dict(scale=scale, **options)).convert('RGB')


def money(value, symbol='€', after=True):
    text = f'{value:,.2f}'
    if symbol == '€':
        text = text.replace(',', ' ').replace('.', ',') if after else text
        return f'{text} €' if after else f'€{text}'
    return f'{symbol}{value:,.2f}'


# --------------------------------------------------------------------------- receipts


def receipt_cafe():
    rng = random.Random(11)
    sheet = Sheet(620, 1180, paper='#f6f4ee', rng=rng)
    mono = ('mono', 22)
    y = 50
    sheet.text((310, y), 'CAFÉ BRUME', ('courier-bold', 44), anchor='ma', spacing=4)
    y += 62
    for line in ['14 Rue des Tanneurs', '69002 Lyon', 'Tel. 04 78 55 01 42', 'SIRET 812 445 190 00017']:
        sheet.text((310, y), line, ('courier', 21), anchor='ma')
        y += 28
    y += 14
    sheet.text((40, y), 'Table 7        Serveur: Camille', ('courier', 21))
    y += 28
    sheet.text((40, y), '14/11/2026                    12:47', ('courier', 21))
    y += 42
    sheet.line((40, y), (580, y), '#555555', 2)
    y += 16
    items = [('2', 'Café crème', 2.80), ('1', 'Croque Madame', 11.50), ('1', 'Salade chèvre chaud', 13.90), ('1', 'Tarte citron meringuée', 6.80), ('1', 'Jus orange pressé', 4.50), ('1', 'Eau pétillante 50cl', 3.40)]
    total = 0
    for qty, label, price in items:
        amount = price * int(qty)
        total += amount
        sheet.text((40, y), f'{qty} x', ('courier', 22))
        sheet.text((100, y), label, ('courier', 22))
        sheet.text((580, y), f'{amount:.2f}', ('courier', 22), anchor='ra')
        y += 36
    y += 6
    sheet.line((40, y), (580, y), '#555555', 2)
    y += 22
    sheet.text((40, y), 'TOTAL TTC', ('courier-bold', 30))
    sheet.text((580, y), f'{total:.2f} EUR', ('courier-bold', 30), anchor='ra')
    y += 56
    for label, value in [('dont TVA 10%', total / 11), ('Carte bancaire', total)]:
        sheet.text((40, y), label, ('courier', 21))
        sheet.text((580, y), f'{value:.2f}', ('courier', 21), anchor='ra')
        y += 30
    y += 24
    sheet.text((310, y), 'Merci de votre visite !', ('courier-bold', 24), anchor='ma')
    y += 34
    sheet.text((310, y), 'A très bientôt chez Café Brume', ('courier', 20), anchor='ma')
    y += 56
    bc = barcode_image('code128', 'CB141126124700731', scale=2, height=0.7)
    bc = bc.resize((460, 120))
    sheet.paste(bc, (80, y))
    sheet.finish(grain=2.6, vignette=0.04)
    return dict(
        slug='receipt-cafe-brume', name='Café Brume lunch', lang='fra', pages=[sheet], photo=dict(kind='wood', scale=0.9, rotation=-4),
        tags=['receipt'], folder=None, created='2026-11-14 12:52', favorite=False, extra=dict(Total='38,90 €'),
    )


def receipt_grocery():
    rng = random.Random(12)
    sheet = Sheet(640, 1500, paper='#f9f8f4', rng=rng)
    y = 46
    sheet.rect((60, y, 580, y + 70), fill='#1f7a3d', radius=10)
    sheet.text((320, y + 35), 'Greenleaf Market', ('avenir-bold', 40), '#ffffff', anchor='mm')
    y += 96
    for line in ['Organic · Local · Fresh', '221 Elm Street, Portland OR', 'Store #0412 · (503) 555-0188']:
        sheet.text((320, y), line, ('mono', 19), '#333333', anchor='ma')
        y += 26
    y += 12
    sheet.text((40, y), '11/18/2026   18:21   Reg 3   Cashier: Dana', ('mono', 18), '#333333')
    y += 34
    sheet.line((40, y), (600, y), '#777777', 1)
    y += 12
    items = [
        ('Organic bananas 1.12 lb', 1.34), ('Sourdough loaf', 5.49), ('Free range eggs 12ct', 6.29), ('Oat milk 64oz', 4.79), ('Baby spinach 5oz', 3.99),
        ('Avocado Hass x4', 5.96), ('Greek yogurt 32oz', 5.49), ('Cherry tomatoes', 4.29), ('Parmigiano 0.42 lb', 9.87), ('Dark chocolate 85%', 3.79),
        ('Sparkling water 6pk', 5.99), ('Pasta fusilli', 2.49), ('Olive oil EVOO 500ml', 11.99), ('Lemons 3 ct', 2.19), ('Coffee beans 12oz', 12.49),
    ]
    total = 0
    for label, price in items:
        total += price
        sheet.text((40, y), label, ('mono', 20), '#1d1d1d')
        sheet.text((600, y), f'{price:.2f}', ('mono', 20), '#1d1d1d', anchor='ra')
        y += 31
    y += 6
    sheet.line((40, y), (600, y), '#777777', 1)
    y += 16
    tax = round(total * 0.0, 2)
    for label, value, bold in [('SUBTOTAL', total, False), ('TAX', tax, False), ('TOTAL', total + tax, True)]:
        fnt = ('mono-bold', 28) if bold else ('mono', 22)
        sheet.text((40, y), label, fnt)
        sheet.text((600, y), f'${value:.2f}', fnt, anchor='ra')
        y += 42 if bold else 32
    y += 8
    sheet.text((40, y), 'VISA ****  4721      APPROVED', ('mono', 19), '#333333')
    y += 34
    sheet.text((40, y), 'You saved $6.40 with your Greenleaf card', ('mono', 19), '#1f7a3d')
    y += 50
    bc = barcode_image('ean13', '401234500012', scale=2, height=0.8).resize((380, 110))
    sheet.paste(bc, (130, y))
    y += 128
    sheet.text((320, y), 'Thank you for shopping local!', ('avenir-demi', 24), '#1f7a3d', anchor='ma')
    sheet.finish(grain=2.4, vignette=0.04)
    return dict(
        slug='receipt-greenleaf', name='Greenleaf Market groceries', lang='eng', pages=[sheet], photo=dict(kind='slate', scale=0.93, rotation=3),
        tags=['receipt'], folder=None, created='2026-11-18 18:25', favorite=False, extra=dict(Total='$' + f'{total:.2f}'),
    )


def receipt_pharmacy():
    rng = random.Random(13)
    sheet = Sheet(620, 900, paper='#fbfbf8', rng=rng)
    y = 44
    sheet.text((310, y), '+ PHARMA PLUS', ('arial-bold', 38), '#0b6e4f', anchor='ma')
    y += 54
    for line in ['Pharmacie du Centre · 8 Place Bellecour', '69002 Lyon · 04 72 40 11 23']:
        sheet.text((310, y), line, ('arial', 19), '#333333', anchor='ma')
        y += 26
    y += 14
    sheet.text((40, y), 'Ticket n° 0049317     02/11/2026  10:03', ('mono', 17), '#333333')
    y += 40
    sheet.line((40, y), (580, y), '#777777', 1)
    y += 14
    items = [('Doliprane 1000mg x8', 2.18), ('Vitamine D3 spray', 8.90), ('Sérum physiologique x40', 4.35), ('Crème mains Weleda', 7.50), ('Pansements assortis', 3.20)]
    total = 0
    for label, price in items:
        total += price
        sheet.text((40, y), label, ('arial', 21), '#1d1d1d')
        sheet.text((580, y), f'{price:.2f}', ('arial', 21), '#1d1d1d', anchor='ra')
        y += 34
    y += 8
    sheet.line((40, y), (580, y), '#777777', 1)
    y += 18
    sheet.text((40, y), 'TOTAL', ('arial-bold', 28))
    sheet.text((580, y), f'{total:.2f} €', ('arial-bold', 28), anchor='ra')
    y += 52
    sheet.text((40, y), 'Part Sécurité sociale          6,12 €', ('arial', 19), '#333333')
    y += 28
    sheet.text((40, y), 'Part mutuelle                       4,01 €', ('arial', 19), '#333333')
    y += 28
    sheet.text((40, y), 'Reste à charge                   %.2f €' % (total - 10.13 if total > 10.13 else 0), ('arial', 19), '#333333')
    sheet.finish()
    return dict(
        slug='receipt-pharmacy', name='Pharmacie du Centre', lang='fra', pages=[sheet], photo=dict(kind='marble', scale=0.88, rotation=-2),
        tags=['receipt', 'health'], folder='Health', created='2026-11-02 10:08', favorite=False, extra=dict(Total=f'{total:.2f} €'),
    )


# --------------------------------------------------------------------------- invoices & bills


def invoice_studio():
    rng = random.Random(21)
    sheet = Sheet(*A4, rng=rng)
    margin = 110
    accent = '#2d4de0'
    sheet.rect((0, 0, A4[0], 14), fill=accent)
    sheet.text((margin, 90), 'northwind', ('avenir-bold', 54), accent)
    sheet.text((margin + 232, 90), 'studio', ('avenir', 54), '#1b1b1f')
    sheet.text((A4[0] - margin, 98), 'INVOICE', ('avenir-bold', 40), '#1b1b1f', anchor='ra', spacing=6)
    sheet.text((A4[0] - margin, 156), 'INV-2026-0142', ('avenir-med', 26), '#555555', anchor='ra')
    y = 260
    for label, lines in [('FROM', ['Northwind Studio SARL', '48 Quai Saint-Antoine', '69002 Lyon, France', 'VAT FR 58 812445190']), ('BILL TO', ['Helio Robotics GmbH', 'Attn. Accounts Payable', 'Sendlinger Str. 24', '80331 München, Germany'])]:
        x = margin if label == 'FROM' else 520
        sheet.text((x, y), label, ('avenir-bold', 18), '#8a8a93', spacing=3)
        yy = y + 34
        for line in lines:
            sheet.text((x, yy), line, ('avenir', 24), '#222222')
            yy += 34
    for label, value, x in [('Issue date', 'Nov 3, 2026', 900), ('Due date', 'Dec 3, 2026', 900)]:
        pass
    sheet.text((900, y), 'ISSUED', ('avenir-bold', 18), '#8a8a93', spacing=3)
    sheet.text((900, y + 34), 'Nov 3, 2026', ('avenir', 24))
    sheet.text((900, y + 90), 'DUE', ('avenir-bold', 18), '#8a8a93', spacing=3)
    sheet.text((900, y + 124), 'Dec 3, 2026', ('avenir-demi', 24), accent)
    y = 520
    sheet.rect((margin, y, A4[0] - margin, y + 54), fill='#eef1fd')
    for label, x, anchor in [('Description', margin + 20, 'la'), ('Qty', 780, 'ra'), ('Rate', 940, 'ra'), ('Amount', A4[0] - margin - 20, 'ra')]:
        sheet.text((x, y + 15), label, ('avenir-bold', 20), accent, anchor=anchor)
    y += 54
    rows = [
        ('Brand identity — discovery workshop', 1, 1800.00), ('Logo suite & usage guidelines', 1, 3200.00), ('Website UI design (12 screens)', 12, 260.00), ('Illustration set (icons x40)', 40, 35.00), ('Design handoff & dev support', 8, 95.00),
    ]
    subtotal = 0
    for label, qty, rate in rows:
        amount = qty * rate
        subtotal += amount
        sheet.text((margin + 20, y + 20), label, ('avenir', 23), '#222222')
        sheet.text((780, y + 20), str(qty), ('avenir', 23), '#222222', anchor='ra')
        sheet.text((940, y + 20), f'{rate:,.2f}', ('avenir', 23), '#222222', anchor='ra')
        sheet.text((A4[0] - margin - 20, y + 20), f'{amount:,.2f}', ('avenir', 23), '#222222', anchor='ra')
        y += 66
        sheet.line((margin, y), (A4[0] - margin, y), '#e2e3ea', 2)
    y += 40
    vat = subtotal * 0.2
    for label, value, strong in [('Subtotal', subtotal, False), ('VAT 20%', vat, False), ('Total due', subtotal + vat, True)]:
        if strong:
            sheet.rect((700, y - 10, A4[0] - margin, y + 66), fill=accent, radius=10)
            sheet.text((730, y + 14), label, ('avenir-bold', 28), '#ffffff')
            sheet.text((A4[0] - margin - 24, y + 14), f'€ {value:,.2f}', ('avenir-bold', 30), '#ffffff', anchor='ra')
        else:
            sheet.text((730, y), label, ('avenir', 24), '#555555')
            sheet.text((A4[0] - margin - 24, y), f'€ {value:,.2f}', ('avenir', 24), '#222222', anchor='ra')
        y += 56 if not strong else 90
    y += 40
    sheet.text((margin, y), 'PAYMENT DETAILS', ('avenir-bold', 18), '#8a8a93', spacing=3)
    y += 36
    for line in ['Bank: Meridian Bank', 'IBAN: FR76 3000 6000 0112 3456 7890 189', 'BIC: AGRIFRPP', 'Reference: INV-2026-0142']:
        sheet.text((margin, y), line, ('avenir', 23), '#222222')
        y += 34
    sheet.text((margin, A4[1] - 130), 'Thank you for your business. Payment within 30 days, late fee 1.5% per month.', ('avenir', 20), '#777777')
    sheet.rect((0, A4[1] - 14, A4[0], A4[1]), fill=accent)
    sheet.finish()
    return dict(
        slug='invoice-northwind', name='Invoice INV-2026-0142', lang='eng', pages=[sheet], photo=dict(kind='wood', scale=0.9),
        tags=['invoice', 'work'], folder=None, created='2026-11-03 09:14', favorite=True,
        extra=dict(Amount={'type': 'number', 'value': round(subtotal + vat, 2)}, Due={'type': 'date', 'value': 1796245200000}),
    )


def bill_energy():
    """French electricity bill with a consumption bar chart."""
    rng = random.Random(22)
    sheet = Sheet(*A4, rng=rng)
    margin = 100
    green = '#16a34a'
    dark = '#10361f'
    sheet.rect((0, 0, A4[0], 220), fill=dark)
    sheet.text((margin, 70), 'Énergie Verte', ('avenir-bold', 56), '#ffffff')
    sheet.text((margin, 140), 'Votre fournisseur d’électricité 100 % renouvelable', ('avenir', 22), '#9ee2b5')
    sheet.text((A4[0] - margin, 80), 'FACTURE', ('avenir-bold', 36), '#ffffff', anchor='ra', spacing=5)
    sheet.text((A4[0] - margin, 134), 'N° 2026-11-884217', ('avenir', 22), '#9ee2b5', anchor='ra')
    y = 290
    sheet.text((margin, y), 'Martin Duval', ('avenir-demi', 28))
    for line in ['12 rue de la République', '69001 Lyon']:
        y += 38
        sheet.text((margin, y), line, ('avenir', 24))
    sheet.rect((730, 270, A4[0] - margin, 470), fill='#f0fdf4', outline=green, width=3, radius=14)
    sheet.text((760, 292), 'Montant à payer', ('avenir', 24), '#166534')
    sheet.text((760, 330), '87,46 €', ('avenir-bold', 64), dark)
    sheet.text((760, 420), 'Prélèvement le 12/12/2026', ('avenir', 21), '#166534')
    y = 540
    sheet.text((margin, y), 'Votre consommation', ('avenir-bold', 30), dark)
    sheet.text((margin, y + 44), 'Période du 01/09/2026 au 31/10/2026 · 412 kWh', ('avenir', 22), '#555555')
    chart_top = y + 110
    months = ['Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct']
    values = [260, 310, 340, 300, 240, 190, 150, 130, 140, 160, 195, 217]
    bw = 70
    for index, (month, value) in enumerate(zip(months, values)):
        height = value * 0.62
        x = margin + index * (bw + 28)
        color = green if index >= 10 else '#bde8cb'
        sheet.rect((x, chart_top + 240 - height, x + bw, chart_top + 240), fill=color, radius=6)
        sheet.text((x + bw / 2, chart_top + 258), month, ('avenir', 19), '#555555', anchor='ma')
        sheet.text((x + bw / 2, chart_top + 230 - height), str(value), ('avenir', 17), '#166534', anchor='ms')
    y = chart_top + 340
    sheet.rect((margin, y, A4[0] - margin, y + 50), fill=dark)
    for label, x, anchor in [('Détail', margin + 20, 'la'), ('Quantité', 760, 'ra'), ('Prix unit.', 960, 'ra'), ('Total HT', A4[0] - margin - 20, 'ra')]:
        sheet.text((x, y + 13), label, ('avenir-bold', 20), '#ffffff', anchor=anchor)
    y += 50
    rows = [('Abonnement 6 kVA (2 mois)', '2', '14,52 €', '29,04 €'), ('Consommation heures pleines', '298 kWh', '0,2516 €', '74,98 €'), ('Consommation heures creuses', '114 kWh', '0,1896 €', '21,61 €'), ('Taxes et contributions', '', '', '14,82 €')]
    for row in rows:
        for text, x, anchor in zip(row, [margin + 20, 760, 960, A4[0] - margin - 20], ['la', 'ra', 'ra', 'ra']):
            sheet.text((x, y + 17), text, ('avenir', 22), '#222222', anchor=anchor)
        y += 58
        sheet.line((margin, y), (A4[0] - margin, y), '#dddddd', 2)
    y += 36
    for label, value, bold in [('Total HT', '72,64 €', False), ('TVA 20 %', '14,52 €', False), ('Total TTC', '87,46 €', True)]:
        fnt = ('avenir-bold', 30) if bold else ('avenir', 24)
        sheet.text((760, y), label, fnt)
        sheet.text((A4[0] - margin, y), value, fnt, anchor='ra')
        y += 50
    sheet.text((margin, A4[1] - 120), 'Pour toute question : 09 70 00 12 34 · energieverte.example.fr', ('avenir', 20), '#666666')
    sheet.finish()
    return dict(
        slug='bill-energie-verte', name='Facture Énergie Verte — Oct. 2026', lang='fra', pages=[sheet], photo=dict(kind='linen', scale=0.9, rotation=2),
        tags=['bill', 'home'], folder='Home/Bills', created='2026-11-09 18:02', favorite=False, extra=dict(Montant={'type': 'number', 'value': 87.46}),
    )


def bill_internet():
    rng = random.Random(23)
    sheet = Sheet(*A4, rng=rng)
    margin = 110
    blue = '#0ea5e9'
    sheet.rect((0, 0, A4[0], 12), fill=blue)
    sheet.text((margin, 80), 'FibreNet', ('arial-black', 58), blue)
    sheet.text((margin, 150), 'Gigabit home internet', ('arial', 24), '#555555')
    sheet.text((A4[0] - margin, 86), 'Monthly statement', ('arial-bold', 32), '#222222', anchor='ra')
    sheet.text((A4[0] - margin, 134), 'November 2026', ('arial', 26), '#666666', anchor='ra')
    y = 250
    sheet.text((margin, y), 'Account holder', ('arial', 20), '#888888')
    sheet.text((margin, y + 30), 'Martin Duval', ('arial-bold', 28))
    sheet.text((margin, y + 70), '12 rue de la République, 69001 Lyon', ('arial', 24))
    sheet.text((margin, y + 104), 'Account no. 7 4412 0098 31', ('arial', 22), '#555555')
    sheet.rect((730, 240, A4[0] - margin, 410), fill='#e0f2fe', radius=16)
    sheet.text((765, 262), 'Total due', ('arial', 24), '#075985')
    sheet.text((765, 300), '€39.99', ('arial-black', 60), '#0c4a6e')
    sheet.text((765, 375), 'Due Dec 5, 2026', ('arial', 21), '#075985')
    y = 500
    for label, value in [('Fibre Gigabit 1 Gb/s', '€34.99'), ('TV Plus option', '€0.00'), ('Router rental', '€3.00'), ('Static IP option', '€2.00'), ('Promotional credit', '−€0.00'), ('Loyalty discount (12 months)', '−€0.00')]:
        sheet.text((margin, y), label, ('arial', 26))
        sheet.text((A4[0] - margin, y), value, ('arial', 26), anchor='ra')
        y += 56
        sheet.line((margin, y - 12), (A4[0] - margin, y - 12), '#e5e7eb', 2)
    y += 20
    sheet.text((margin, y), 'Usage this month', ('arial-bold', 30))
    y += 56
    for label, value, ratio in [('Download', '412 GB', 0.62), ('Upload', '38 GB', 0.18), ('Peak speed', '941 Mb/s', 0.94)]:
        sheet.text((margin, y), label, ('arial', 24), '#555555')
        sheet.rect((margin + 230, y + 4, A4[0] - margin - 150, y + 30), fill='#e5e7eb', radius=13)
        sheet.rect((margin + 230, y + 4, margin + 230 + (A4[0] - 2 * margin - 380) * ratio, y + 30), fill=blue, radius=13)
        sheet.text((A4[0] - margin, y), value, ('arial-bold', 24), anchor='ra')
        y += 62
    sheet.text((margin, A4[1] - 120), 'Questions? support@fibrenet.example · 0 800 123 456 (free)', ('arial', 21), '#777777')
    sheet.finish()
    return dict(
        slug='bill-fibrenet', name='FibreNet — Nov 2026', lang='eng', pages=[sheet], photo=dict(kind='wood', scale=0.88, rotation=-3),
        tags=['bill', 'home'], folder='Home/Bills', created='2026-11-05 20:31', favorite=False, extra=dict(Montant={'type': 'number', 'value': 39.99}),
    )


# --------------------------------------------------------------------------- contracts & letters


LEASE_TEXT = [
    ('Article 1 — Premises', 'The Landlord leases to the Tenant the residential premises located at 12 rue de la République, 69001 Lyon, on the third floor, comprising three rooms, a kitchen, a bathroom and a private cellar numbered 14 (the “Premises”). The Premises are leased unfurnished and are intended exclusively for residential use.'),
    ('Article 2 — Term', 'This lease is concluded for an initial term of three (3) years beginning on March 1, 2026 and ending on February 28, 2029. It shall be renewed automatically for successive periods of three years unless terminated by either party in accordance with the notice periods set out in Article 9.'),
    ('Article 3 — Rent and charges', 'The monthly rent is set at one thousand one hundred and fifty euros (€1,150.00), payable in advance on the first day of each month, plus a monthly provision for charges of one hundred and twenty euros (€120.00), subject to annual reconciliation. The rent shall be revised each year on the anniversary of the lease according to the Reference Rent Index.'),
    ('Article 4 — Security deposit', 'On signing, the Tenant shall pay a security deposit equal to one month’s rent excluding charges, namely €1,150.00. The deposit shall be returned within one month of the handover of keys if the inventory of fixtures shows no difference with the entry inventory, and within two months otherwise.'),
    ('Article 5 — Condition of the Premises', 'The Tenant acknowledges having received the Premises in good condition as recorded in the entry inventory of fixtures drawn up jointly on February 27, 2026. The Tenant shall maintain the Premises in good repair and shall carry out routine maintenance and minor repairs.'),
    ('Article 6 — Insurance', 'The Tenant shall insure the Premises against fire, water damage and any other risk arising from their status as occupant and shall provide a certificate of insurance to the Landlord on signing and each year thereafter.'),
]
LEASE_TEXT2 = [
    ('Article 7 — Use and subletting', 'The Tenant shall use the Premises peacefully and in accordance with their intended purpose. Subletting, whether total or partial, is prohibited without the prior written consent of the Landlord, including as to the rent of the sublease.'),
    ('Article 8 — Works', 'The Tenant may not carry out any transformation of the Premises without the prior written agreement of the Landlord. Works carried out without such agreement may be required to be undone at the Tenant’s expense when the keys are returned.'),
    ('Article 9 — Termination', 'The Tenant may terminate the lease at any time subject to a notice period of three months, reduced to one month in the cases provided by law. The Landlord may give notice only at the end of the term, six months in advance, for a legitimate and serious reason.'),
    ('Article 10 — Jurisdiction', 'Any dispute relating to the interpretation or performance of this lease shall be submitted to the courts having jurisdiction over the location of the Premises, after an attempt at amicable settlement.'),
]


def lease():
    rng = random.Random(31)
    pages = []
    margin = 130
    width = A4[0] - 2 * margin

    def header(sheet, number):
        sheet.text((A4[0] / 2, 90), 'RESIDENTIAL LEASE AGREEMENT', ('times-bold', 34), '#111111', anchor='ma', spacing=3)
        sheet.line((margin, 150), (A4[0] - margin, 150), '#111111', 2)
        sheet.text((A4[0] / 2, A4[1] - 80), f'Page {number} of 3', ('times', 20), '#555555', anchor='ma')
        sheet.text((margin, A4[1] - 80), 'Initials: ____ / ____', ('times', 20), '#555555')

    sheet = Sheet(*A4, paper='#fdfcf8', rng=rng)
    header(sheet, 1)
    y = 190
    sheet.text((margin, y), 'BETWEEN THE UNDERSIGNED', ('times-bold', 24))
    y += 50
    y = paragraph(sheet, margin, y, 'Mr. Louis Ferrand, born on 04/09/1971 in Villeurbanne, residing at 27 avenue Berthelot, 69007 Lyon, hereinafter the “Landlord”,', ('times', 25), width, justify=True)
    y += 18
    sheet.text((margin, y), 'AND', ('times-bold', 24))
    y += 44
    y = paragraph(sheet, margin, y, 'Mr. Martin Duval and Ms. Sofia Duval, residing at the Premises described below, hereinafter the “Tenant”.', ('times', 25), width, justify=True)
    y += 34
    sheet.text((margin, y), 'IT IS AGREED AS FOLLOWS', ('times-bold', 24))
    y += 52
    for title, body in LEASE_TEXT[:3]:
        sheet.text((margin, y), title, ('times-bold', 25))
        y += 42
        y = paragraph(sheet, margin, y, body, ('times', 24), width, justify=True) + 22
    sheet.finish(grain=1.8)
    pages.append(sheet)

    sheet = Sheet(*A4, paper='#fdfcf8', rng=rng)
    header(sheet, 2)
    y = 190
    for title, body in LEASE_TEXT[3:]:
        sheet.text((margin, y), title, ('times-bold', 25))
        y += 42
        y = paragraph(sheet, margin, y, body, ('times', 24), width, justify=True) + 22
    for title, body in LEASE_TEXT2[:2]:
        sheet.text((margin, y), title, ('times-bold', 25))
        y += 42
        y = paragraph(sheet, margin, y, body, ('times', 24), width, justify=True) + 22
    sheet.finish(grain=1.8)
    pages.append(sheet)

    sheet = Sheet(*A4, paper='#fdfcf8', rng=rng)
    header(sheet, 3)
    y = 190
    for title, body in LEASE_TEXT2[2:]:
        sheet.text((margin, y), title, ('times-bold', 25))
        y += 42
        y = paragraph(sheet, margin, y, body, ('times', 24), width, justify=True) + 22
    y += 40
    sheet.text((margin, y), 'Done in Lyon, on February 27, 2026, in two original copies.', ('times', 24))
    y += 110
    for x, who in [(margin, 'The Landlord'), (A4[0] / 2 + 40, 'The Tenant')]:
        sheet.text((x, y), who, ('times-bold', 24))
        sheet.text((x, y + 36), '“Read and approved”', ('times-italic', 22), '#444444')
        sheet.line((x, y + 250), (x + 420, y + 250), '#111111', 2)
    # hand signatures as bezier-ish strokes
    d = sheet.draw
    for x0, color in [(margin + 30, '#1a2a8a'), (A4[0] / 2 + 70, '#1a2a8a')]:
        pts = []
        for t in range(0, 100):
            u = t / 99
            pts.append((x0 + u * 330, y + 190 + math.sin(u * 14) * 38 * (1 - u * 0.5) + math.sin(u * 5) * 10))
        d.line(pts, fill=hex_to_rgb(color), width=5, joint='curve')
        d.line([(x0 + 20, y + 225), (x0 + 340, y + 205)], fill=hex_to_rgb(color), width=3)
    sheet.finish(grain=1.8)
    pages.append(sheet)
    return dict(
        slug='lease-agreement', name='Lease agreement — 12 rue de la République', lang='eng', pages=pages, photo=dict(kind='wood', scale=0.9),
        tags=['contract', 'important'], folder='Home/Rental', created='2026-02-27 16:40', favorite=True, extra={},
    )


def letter_tax():
    rng = random.Random(32)
    sheet = Sheet(*A4, rng=rng)
    margin = 130
    sheet.rect((margin, 90, margin + 110, 200), fill='#1d3a8a')
    sheet.text((margin + 55, 145), 'DGFiP', ('arial-bold', 28), '#ffffff', anchor='mm')
    sheet.text((margin + 140, 100), 'DIRECTION GÉNÉRALE DES FINANCES PUBLIQUES', ('arial-bold', 20))
    sheet.text((margin + 140, 130), 'Service des impôts des particuliers · Lyon 1er', ('arial', 20), '#444444')
    sheet.text((margin + 140, 160), '3 rue Paul Montrochet, 69002 Lyon', ('arial', 20), '#444444')
    y = 330
    for line in ['Monsieur Martin DUVAL', '12 rue de la République', '69001 LYON']:
        sheet.text((780, y), line, ('arial', 26))
        y += 38
    y = 560
    sheet.text((margin, y), 'AVIS D’IMPÔT 2026', ('arial-bold', 36), '#1d3a8a')
    sheet.text((margin, y + 50), 'Impôt sur les revenus de l’année 2025', ('arial', 26))
    sheet.line((margin, y + 100), (A4[0] - margin, y + 100), '#1d3a8a', 3)
    y += 140
    rows = [('Numéro fiscal', '23 17 456 789 012'), ('Date d’établissement', '24/07/2026'), ('Revenu brut global', '52 480 €'), ('Revenu imposable', '47 232 €'), ('Nombre de parts', '2,5'), ('Impôt sur le revenu net', '2 316 €'), ('Prélèvements déjà versés', '2 804 €')]
    for label, value in rows:
        sheet.text((margin, y), label, ('arial', 25), '#444444')
        sheet.text((A4[0] - margin, y), value, ('arial-bold', 25), anchor='ra')
        y += 52
        sheet.line((margin, y - 12), (A4[0] - margin, y - 12), '#dddddd', 1)
    y += 30
    sheet.rect((margin, y, A4[0] - margin, y + 150), fill='#ecfdf3', outline='#16a34a', width=3, radius=12)
    sheet.text((margin + 36, y + 26), 'Vous bénéficiez d’un remboursement', ('arial-bold', 28), '#166534')
    sheet.text((margin + 36, y + 76), '488 €', ('arial-black', 54), '#166534')
    sheet.text((A4[0] - margin - 36, y + 90), 'versé sous 15 jours', ('arial', 23), '#166534', anchor='ra')
    y += 210
    paragraph(sheet, margin, y, 'Ce remboursement sera effectué par virement sur le compte bancaire dont vous avez communiqué les coordonnées. Vous pouvez contester cet avis jusqu’au 31/12/2027 depuis votre espace particulier sur impots.example.fr.', ('arial', 22), A4[0] - 2 * margin, '#333333')
    sheet.finish()
    return dict(
        slug='tax-notice-2025', name='Avis d’impôt 2026', lang='fra', pages=[sheet], photo=dict(kind='marble', scale=0.9, rotation=-2),
        tags=['tax', 'important'], folder='Taxes/2025', created='2026-07-26 11:20', favorite=True, extra={},
    )


def bank_statement():
    rng = random.Random(33)
    sheet = Sheet(*A4, rng=rng)
    margin = 100
    navy = '#0f2b5b'
    sheet.rect((0, 0, A4[0], 170), fill=navy)
    sheet.text((margin, 60), 'MERIDIAN', ('avenir-bold', 52), '#ffffff', spacing=8)
    sheet.text((margin, 124), 'BANK', ('avenir', 22), '#9db4e0', spacing=10)
    sheet.text((A4[0] - margin, 64), 'Account statement', ('avenir-demi', 32), '#ffffff', anchor='ra')
    sheet.text((A4[0] - margin, 112), 'October 1 – October 31, 2026', ('avenir', 22), '#9db4e0', anchor='ra')
    y = 220
    sheet.text((margin, y), 'Martin Duval · Joint current account', ('avenir-demi', 26))
    sheet.text((margin, y + 36), 'IBAN FR76 3000 6000 0112 3456 7890 189', ('mono', 21), '#555555')
    cards = [('Opening balance', '€ 3,412.18'), ('Credits', '+ € 4,260.00'), ('Debits', '− € 3,871.54'), ('Closing balance', '€ 3,800.64')]
    for index, (label, value) in enumerate(cards):
        x = margin + index * 262
        sheet.rect((x, y + 96, x + 240, y + 206), fill='#f1f5fb', radius=12)
        sheet.text((x + 20, y + 114), label, ('avenir', 19), '#52638a')
        sheet.text((x + 20, y + 152), value, ('avenir-bold', 25), navy)
    y += 270
    sheet.rect((margin, y, A4[0] - margin, y + 48), fill=navy)
    for label, x, anchor in [('Date', margin + 16, 'la'), ('Description', margin + 170, 'la'), ('Debit', 920, 'ra'), ('Credit', A4[0] - margin - 16, 'ra')]:
        sheet.text((x, y + 12), label, ('avenir-bold', 19), '#ffffff', anchor=anchor)
    y += 48
    tx = [
        ('Oct 01', 'Rent — L. Ferrand', 1270.00, None), ('Oct 02', 'Greenleaf Market', 64.18, None), ('Oct 03', 'Salary — Helio Robotics', None, 3150.00), ('Oct 04', 'Énergie Verte', 87.46, None),
        ('Oct 06', 'Café Brume', 38.90, None), ('Oct 08', 'FibreNet', 39.99, None), ('Oct 09', 'Transit pass', 49.00, None), ('Oct 12', 'Refund — Orbit Audio', None, 129.00),
        ('Oct 14', 'Pharma Plus', 20.13, None), ('Oct 17', 'Freelance — Northwind', None, 981.00), ('Oct 19', 'Cinéma Lumière', 22.00, None), ('Oct 21', 'Greenleaf Market', 91.57, None),
        ('Oct 24', 'FitLab Gym', 39.90, None), ('Oct 27', 'Velo City Bikes', 18.00, None), ('Oct 29', 'Transfer to savings', 500.00, None), ('Oct 31', 'Account fee', 2.50, None),
    ]
    for index, (date, desc, debit, credit) in enumerate(tx):
        if index % 2:
            sheet.rect((margin, y, A4[0] - margin, y + 54), fill='#f7f9fc')
        sheet.text((margin + 16, y + 14), date, ('avenir', 21), '#444444')
        sheet.text((margin + 170, y + 14), desc, ('avenir', 22), '#1b1b1f')
        if debit:
            sheet.text((920, y + 14), f'{debit:,.2f}', ('avenir', 22), '#b91c1c', anchor='ra')
        if credit:
            sheet.text((A4[0] - margin - 16, y + 14), f'{credit:,.2f}', ('avenir-demi', 22), '#15803d', anchor='ra')
        y += 54
    sheet.line((margin, y), (A4[0] - margin, y), navy, 3)
    sheet.text((margin, A4[1] - 110), 'Meridian Bank SA · RCS Paris 552 120 222 · Deposits guaranteed up to €100,000', ('avenir', 18), '#777777')
    sheet.finish()
    return dict(
        slug='bank-statement-oct', name='Meridian Bank — October 2026', lang='eng', pages=[sheet], photo=dict(kind='slate', scale=0.9, rotation=1.5),
        tags=['bank'], folder=None, created='2026-11-01 08:45', favorite=False, extra={},
    )


def prescription():
    rng = random.Random(34)
    sheet = Sheet(1240, 1090, paper='#fcfbf7', rng=rng)
    margin = 110
    teal = '#0f766e'
    sheet.text((margin, 70), 'Dr. Elena Marchetti', ('serif-bold', 46), teal)
    sheet.text((margin, 128), 'General Practitioner · RPPS 10003 874 521', ('serif', 22), '#555555')
    sheet.text((A4[0] - margin, 80), '37 rue Garibaldi', ('serif', 22), '#555555', anchor='ra')
    sheet.text((A4[0] - margin, 110), '69003 Lyon', ('serif', 22), '#555555', anchor='ra')
    sheet.text((A4[0] - margin, 140), 'Tel. 04 78 60 22 18', ('serif', 22), '#555555', anchor='ra')
    sheet.line((margin, 190), (A4[0] - margin, 190), teal, 3)
    sheet.text((margin, 230), 'Lyon, le 6 novembre 2026', ('serif', 26))
    sheet.text((margin, 290), 'Patient : Martin DUVAL — né le 14/06/1989', ('serif-bold', 26))
    sheet.text((margin, 380), 'Rx', ('serif-bold', 80), teal)
    y = 400
    for line in ['Amoxicilline 1 g — 1 comprimé matin et soir', 'pendant 6 jours', '', 'Paracétamol 1000 mg — si douleur ou fièvre,', 'maximum 3 comprimés par jour', '', 'Spray nasal sérum physiologique, 3×/jour']:
        sheet.text((margin + 110, y), line, ('hand', 32), '#1b2a6b')
        y += 52
    sheet.text((A4[0] - margin - 30, y + 30), 'E. Marchetti', ('hand', 56), '#1b2a6b', anchor='ra')
    sheet.finish()
    return dict(
        slug='prescription', name='Prescription — Dr Marchetti', lang='fra', pages=[sheet], photo=dict(kind='marble', scale=0.82, rotation=-4),
        tags=['health'], folder='Health', created='2026-11-06 12:10', favorite=False, extra={},
    )


def lab_results():
    rng = random.Random(35)
    sheet = Sheet(*A4, rng=rng)
    margin = 100
    purple = '#6d28d9'
    sheet.rect((0, 0, A4[0], 150), fill='#f5f3ff')
    sheet.text((margin, 50), 'BioLab', ('avenir-bold', 54), purple)
    sheet.text((margin + 195, 70), 'Laboratoire d’analyses médicales', ('avenir', 22), '#555555')
    sheet.text((A4[0] - margin, 60), 'Résultats d’analyses', ('avenir-demi', 30), '#222222', anchor='ra')
    sheet.text((A4[0] - margin, 100), 'Prélèvement du 17/10/2026', ('avenir', 22), '#555555', anchor='ra')
    y = 200
    sheet.text((margin, y), 'Patient : DUVAL Martin · 37 ans', ('avenir-demi', 26))
    sheet.text((margin, y + 40), 'Prescripteur : Dr E. Marchetti', ('avenir', 23), '#555555')
    y += 110
    sheet.rect((margin, y, A4[0] - margin, y + 48), fill=purple)
    for label, x, anchor in [('Analyse', margin + 16, 'la'), ('Résultat', 640, 'ra'), ('Unité', 760, 'la'), ('Valeurs usuelles', A4[0] - margin - 16, 'ra')]:
        sheet.text((x, y + 12), label, ('avenir-bold', 19), '#ffffff', anchor=anchor)
    y += 48
    rows = [
        ('HÉMATOLOGIE', None), ('Hémoglobine', '14,8', 'g/dL', '13,0 – 17,0', False), ('Hématocrite', '44', '%', '40 – 52', False), ('Leucocytes', '6,2', 'G/L', '4,0 – 10,0', False), ('Plaquettes', '248', 'G/L', '150 – 400', False),
        ('BIOCHIMIE', None), ('Glycémie à jeun', '0,92', 'g/L', '0,70 – 1,10', False), ('Cholestérol total', '2,31', 'g/L', '< 2,00', True), ('HDL cholestérol', '0,58', 'g/L', '> 0,40', False), ('LDL cholestérol', '1,52', 'g/L', '< 1,30', True),
        ('Créatinine', '8,6', 'mg/L', '7,0 – 12,0', False), ('Vitamine D (25-OH)', '24', 'ng/mL', '30 – 100', True),
    ]
    for row in rows:
        if row[1] is None:
            y += 20
            sheet.text((margin + 16, y), row[0], ('avenir-bold', 21), purple, spacing=2)
            y += 46
            continue
        label, value, unit, ref, flagged = row
        sheet.text((margin + 16, y), label, ('avenir', 23))
        sheet.text((640, y), value, ('avenir-bold', 23), '#b91c1c' if flagged else '#111111', anchor='ra')
        sheet.text((760, y), unit, ('avenir', 21), '#666666')
        sheet.text((A4[0] - margin - 16, y), ref, ('avenir', 21), '#666666', anchor='ra')
        if flagged:
            sheet.text((675, y - 2), '*', ('avenir-bold', 30), '#b91c1c')
        y += 50
        sheet.line((margin, y - 10), (A4[0] - margin, y - 10), '#ece9f7', 1)
    sheet.text((margin, y + 30), '* valeur hors des normes usuelles', ('avenir', 20), '#b91c1c')
    sheet.finish()
    return dict(
        slug='lab-results', name='BioLab — résultats d’analyses', lang='fra', pages=[sheet], photo=dict(kind='wood', scale=0.9, rotation=2.5),
        tags=['health'], folder='Health', created='2026-10-19 15:05', favorite=False, extra={},
    )


# --------------------------------------------------------------------------- travel / events


def itinerary():
    rng = random.Random(41)
    sheet = Sheet(*A4, rng=rng)
    margin = 100
    sky = '#0369a1'
    sheet.rect((0, 0, A4[0], 260), fill=gradient((A4[0], 260), '#0c4a6e', '#38bdf8', 20).convert('RGB').getdata()[0] if False else '#075985')
    grad = gradient((A4[0], 260), '#0c4a6e', '#38bdf8', 20)
    sheet.image.paste(grad, (0, 0))
    sheet.draw = ImageDraw.Draw(sheet.image)
    sheet.text((margin, 70), 'Aurora Air', ('avenir-bold', 50), '#ffffff')
    sheet.text((margin, 140), 'Your trip to Lisbon', ('avenir-demi', 34), '#e0f2fe')
    sheet.text((margin, 192), 'Booking reference  K7PQ2M · 3 passengers', ('avenir', 23), '#bae6fd')
    y = 320
    legs = [('OUTBOUND', 'Fri 12 Dec 2026', 'LYS', 'Lyon Saint-Exupéry', '07:15', 'LIS', 'Lisbon Humberto Delgado', '08:55', 'AA 1824 · 2h40'), ('RETURN', 'Tue 16 Dec 2026', 'LIS', 'Lisbon Humberto Delgado', '19:40', 'LYS', 'Lyon Saint-Exupéry', '23:20', 'AA 1827 · 2h40')]
    for tag, date, a, aname, at, b, bname, bt, meta in legs:
        sheet.rect((margin, y, A4[0] - margin, y + 330), fill='#f8fafc', outline='#e2e8f0', width=3, radius=18)
        sheet.text((margin + 36, y + 30), tag, ('avenir-bold', 19), sky, spacing=3)
        sheet.text((A4[0] - margin - 36, y + 30), date, ('avenir-demi', 23), '#334155', anchor='ra')
        sheet.text((margin + 36, y + 80), a, ('avenir-bold', 84), '#0f172a')
        sheet.text((A4[0] - margin - 36, y + 80), b, ('avenir-bold', 84), '#0f172a', anchor='ra')
        sheet.text((margin + 36, y + 190), aname, ('avenir', 21), '#475569')
        sheet.text((A4[0] - margin - 36, y + 190), bname, ('avenir', 21), '#475569', anchor='ra')
        sheet.text((margin + 36, y + 230), at, ('avenir-bold', 36), '#0f172a')
        sheet.text((A4[0] - margin - 36, y + 230), bt, ('avenir-bold', 36), '#0f172a', anchor='ra')
        sheet.line((margin + 300, y + 128), (A4[0] - margin - 300, y + 128), sky, 4)
        sheet.text((A4[0] / 2, y + 150), meta, ('avenir', 20), sky, anchor='ma')
        y += 370
    sheet.text((margin, y + 10), 'HOTEL', ('avenir-bold', 19), sky, spacing=3)
    sheet.text((margin, y + 50), 'Hotel Alfama Vista 4-star', ('avenir-bold', 32))
    sheet.text((margin, y + 96), 'Rua de São Pedro 28 · 1100-399 Lisboa', ('avenir', 23), '#475569')
    sheet.text((margin, y + 136), 'Dec 12 – Dec 16 · 4 nights · 2 rooms · breakfast included', ('avenir', 23), '#475569')
    bc = barcode_image('qrcode', 'AA-K7PQ2M-LYS-LIS-20261212', scale=4).resize((190, 190))
    sheet.paste(bc, (A4[0] - margin - 190, y + 40))
    sheet.finish()
    return dict(
        slug='trip-lisbon', name='Lisbon trip — flights & hotel', lang='eng', pages=[sheet], photo=dict(kind='linen', scale=0.9, rotation=-2),
        tags=['travel'], folder=None, created='2026-11-10 21:00', favorite=True, extra={},
    )


def event_ticket():
    rng = random.Random(42)
    sheet = Sheet(*A4, paper='#ffffff', rng=rng)
    bg = gradient((A4[0], 760), '#1e1b4b', '#c026d3', 35)
    sheet.image.paste(bg, (0, 0))
    sheet.draw = ImageDraw.Draw(sheet.image)
    margin = 100
    sheet.text((margin, 120), 'NEON LIGHTS', ('arial-black', 96), '#ffffff')
    sheet.text((margin, 230), 'FESTIVAL 2027', ('arial-black', 96), '#f0abfc')
    sheet.text((margin, 380), 'Sat 19 June 2027 · gates 15:00', ('arial-bold', 34), '#ffffff')
    sheet.text((margin, 430), 'Parc de Parilly, Bron · Lyon', ('arial', 30), '#f5d0fe')
    for index, name in enumerate(['The Midnight Echo', 'Vela & The Static', 'Lumen Theory', 'DJ Orion']):
        sheet.text((margin, 530 + index * 52), name, ('arial-bold', 30), '#ffffff')
    y = 840
    sheet.text((margin, y), 'ADMIT ONE', ('arial-black', 44), '#1e1b4b')
    sheet.text((margin, y + 66), 'General admission · Standing · 18+', ('arial', 28), '#444444')
    sheet.text((margin, y + 120), 'Martin Duval', ('arial-bold', 34))
    sheet.text((margin, y + 170), 'Order 4471-9902-31 · €89.00 incl. fees', ('arial', 24), '#555555')
    for yy in range(1010, 1060, 18):
        pass
    sheet.line((margin, 1090), (A4[0] - margin, 1090), '#bbbbbb', 3)
    for x in range(margin, A4[0] - margin, 26):
        sheet.draw.ellipse((x, 1084, x + 12, 1096), fill=hex_to_rgb('#ffffff'))
    qr = barcode_image('qrcode', 'NLF27-4471-9902-31-GA-0001', scale=7).resize((520, 520))
    sheet.paste(qr, (margin, 1180))
    sheet.text((margin + 600, 1230), 'Present this code', ('arial-bold', 32))
    sheet.text((margin + 600, 1276), 'at the gate. One entry', ('arial', 28), '#444444')
    sheet.text((margin + 600, 1316), 'per ticket. Screenshots', ('arial', 28), '#444444')
    sheet.text((margin + 600, 1356), 'are accepted.', ('arial', 28), '#444444')
    sheet.text((margin, 1740 - 80), 'Ticket ID NLF27-4471-9902-31-GA-0001', ('mono', 20), '#777777')
    sheet.finish(grain=1.5)
    return dict(
        slug='event-ticket-neon', name='Neon Lights Festival ticket', lang='eng', pages=[sheet], photo=dict(kind='slate', scale=0.9, rotation=2),
        tags=['ticket', 'travel'], folder=None, created='2026-11-12 19:44', favorite=False, extra={},
    )


# --------------------------------------------------------------------------- misc scans


def warranty():
    rng = random.Random(51)
    sheet = Sheet(1240, 900, paper='#fbfaf5', rng=rng)
    sheet.rect((24, 24, 1216, 876), outline='#b08d2c', width=6)
    sheet.rect((40, 40, 1200, 860), outline='#b08d2c', width=2)
    sheet.text((620, 120), 'ORBIT AUDIO', ('avenir-bold', 56), '#1b1b1f', anchor='ma', spacing=14)
    sheet.text((620, 200), 'CERTIFICATE OF WARRANTY', ('serif', 34), '#b08d2c', anchor='ma', spacing=6)
    y = 300
    for label, value in [('Product', 'Halo ANC Wireless Headphones · Midnight Blue'), ('Serial number', 'OA-H2-7731-0049'), ('Purchased', 'October 12, 2026 · Orbit Electronics Lyon'), ('Warranty period', '24 months · valid until October 12, 2028')]:
        sheet.text((140, y), label, ('serif', 26), '#777777')
        sheet.text((460, y), value, ('serif-bold', 28), '#1b1b1f')
        y += 64
    y += 20
    paragraph(sheet, 140, y, 'This warranty covers manufacturing defects in materials and workmanship under normal use. Keep this certificate together with your proof of purchase. It does not cover accidental damage, battery wear or unauthorized repairs.', ('serif', 24), 940, '#333333')
    sheet.draw.ellipse((920, 640, 1090, 810), outline=hex_to_rgb('#b91c1c'), width=5)
    sheet.text((1005, 725), 'VERIFIED', ('arial-bold', 24), '#b91c1c', anchor='mm', spacing=3)
    sheet.finish()
    return dict(
        slug='warranty-orbit', name='Orbit Audio headphones warranty', lang='eng', pages=[sheet], photo=dict(kind='wood', scale=0.85, rotation=3),
        tags=['warranty'], folder='Home/Warranties', created='2026-10-12 17:30', favorite=False, extra=dict(Expires={'type': 'date', 'value': 1823299200000}),
    )


def recipe_page():
    rng = random.Random(52)
    sheet = Sheet(1100, 1500, paper='#f7f1e3', rng=rng)
    margin = 110
    sheet.text((margin, 90), 'BREAKFAST', ('serif', 22), '#a16207', spacing=6)
    sheet.text((margin, 130), 'Lemon Ricotta Pancakes', ('serif-bold', 62), '#3b2a14')
    sheet.line((margin, 220), (margin + 160, 220), '#a16207', 4)
    y = paragraph(sheet, margin, 250, 'Light, tender and fragrant with lemon zest, these pancakes are the weekend breakfast we make most often. Serve them with berries, a spoonful of honey and plenty of coffee.', ('serif', 27), 880, '#3b2a14', leading=1.4)
    y += 24
    sheet.text((margin, y), 'Serves 4  ·  Prep 10 min  ·  Cook 15 min', ('serif-bold', 22), '#a16207')
    y += 70
    sheet.text((margin, y), 'Ingredients', ('serif-bold', 36), '#3b2a14')
    y += 66
    for item in ['250 g ricotta', '3 eggs, separated', '120 ml milk', '100 g plain flour', '2 tbsp sugar', 'zest of 2 lemons + juice of 1', '1 tsp baking powder', 'butter, for the pan']:
        sheet.draw.ellipse((margin, y + 12, margin + 10, y + 22), fill=hex_to_rgb('#a16207'))
        sheet.text((margin + 30, y), item, ('serif', 27), '#3b2a14')
        y += 44
    y += 30
    sheet.text((margin, y), 'Method', ('serif-bold', 36), '#3b2a14')
    y += 66
    steps = ['Whisk the ricotta, egg yolks, milk, lemon zest and juice until smooth. Fold in the flour, sugar and baking powder.', 'Beat the egg whites to soft peaks and fold them gently through the batter.', 'Cook ladlefuls in a buttered pan over medium heat, 2 minutes per side, until golden.']
    for index, step in enumerate(steps, 1):
        sheet.text((margin, y - 4), str(index), ('serif-bold', 40), '#a16207')
        y = paragraph(sheet, margin + 56, y, step, ('serif', 26), 820, '#3b2a14', leading=1.38) + 18
    # book gutter
    arr = sheet.image
    sheet.finish(grain=2.0)
    return dict(
        slug='recipe-lemon-pancakes', name='Recipe — lemon ricotta pancakes', lang='eng', pages=[sheet], photo=dict(kind='wood', scale=0.9, rotation=-3, curl=True),
        tags=['recipe'], folder=None, created='2026-09-27 10:12', favorite=True, extra={},
    )


def whiteboard():
    rng = random.Random(53)
    sheet = Sheet(1700, 1100, paper='#f3f5f4', rng=rng)
    sheet.text((100, 70), 'Sprint 24 — planning', ('marker', 66), '#1d4ed8')
    sheet.line((100, 160), (820, 160), '#1d4ed8', 6)
    cols = [('TODO', '#dc2626', ['Onboarding flow v2', 'Dark mode QA', 'Export to PDF/A', 'Fix OCR on rotated pages']), ('DOING', '#ea580c', ['Folder sync', 'Search accents (done)']), ('DONE', '#16a34a', ['Crop handles', 'Backup restore', 'Share sheet'])]
    x = 100
    for title, color, items in cols:
        sheet.text((x, 220), title, ('marker', 52), color)
        sheet.line((x, 290), (x + 440, 290), color, 5)
        yy = 330
        for item in items:
            sheet.rect((x, yy, x + 450, yy + 90), outline=hex_to_rgb(color), width=4, radius=10)
            sheet.text((x + 20, yy + 22), item, ('marker', 34), '#222222')
            yy += 120
        x += 520
    sheet.text((100, 920), 'Demo Fri 10:00 · retro Fri 15:30', ('marker', 40), '#7c3aed')
    # glare
    arr = sheet.image.convert('RGBA')
    glare = gradient((1700, 1100), '#ffffff', '#ffffff', 0).convert('RGBA')
    mask = Image.new('L', (1700, 1100), 0)
    ImageDraw.Draw(mask).polygon([(900, 0), (1250, 0), (850, 1100), (500, 1100)], fill=40)
    from PIL import ImageFilter
    mask = mask.filter(ImageFilter.GaussianBlur(60))
    sheet.image = Image.composite(glare.convert('RGB'), sheet.image, mask)
    sheet.draw = ImageDraw.Draw(sheet.image)
    sheet.finish(grain=1.5, vignette=0.03)
    return dict(
        slug='whiteboard-sprint', name='Whiteboard — sprint planning', lang='eng', pages=[sheet], photo=dict(kind='desk', scale=0.9, rotation=1, perspective=0.08),
        tags=['work'], folder='Work', created='2026-11-16 10:42', favorite=False, extra={},
    )


def handwritten_list():
    rng = random.Random(54)
    sheet = Sheet(1000, 1400, paper='#fefce8', rng=rng)
    for yy in range(180, 1380, 62):
        sheet.line((60, yy), (940, yy), '#bfd7ea', 2)
    sheet.line((130, 0), (130, 1400), '#f4a6a6', 3)
    sheet.text((170, 70), 'Weekend list', ('note', 66), '#1e3a8a')
    items = ['buy tickets for Lisbon (done)', 'call landlord about boiler', 'pick up dry cleaning', 'birthday gift for Sofia!', 'renew transit pass', 'tax refund?? check account', 'water the plants', 'book dentist']
    yy = 205
    for item in items:
        sheet.text((170, yy), item, ('note', 44), '#1e293b')
        yy += 62
    sheet.finish(grain=2.0)
    return dict(
        slug='handwritten-list', name='Weekend to-do list', lang='eng', pages=[sheet], photo=dict(kind='wood', scale=0.9, rotation=-7),
        tags=[], folder=None, created='2026-11-20 08:10', favorite=False, extra={},
    )


def business_card():
    rng = random.Random(55)
    sheet = Sheet(1050, 600, paper='#fefefe', rng=rng)
    bg = gradient((1050, 600), '#111827', '#374151', 20)
    sheet.image.paste(bg, (0, 0))
    sheet.draw = ImageDraw.Draw(sheet.image)
    sheet.rect((0, 0, 24, 600), fill='#f59e0b')
    sheet.text((100, 90), 'Sofia Rinaldi', ('avenir-bold', 62), '#ffffff')
    sheet.text((100, 170), 'Principal Architect', ('avenir', 30), '#f59e0b')
    sheet.text((100, 230), 'Rinaldi & Partners · Architecture + Interiors', ('avenir', 24), '#d1d5db')
    for index, line in enumerate(['+39 02 555 0142', 'sofia@rinaldi-partners.example', 'via Tortona 21, 20144 Milano', 'rinaldi-partners.example']):
        sheet.text((100, 340 + index * 44), line, ('avenir', 26), '#e5e7eb')
    qr = barcode_image('qrcode', 'MECARD:N:Rinaldi,Sofia;TEL:+390255501 42;EMAIL:sofia@rinaldi-partners.example;;', scale=5).resize((190, 190))
    from PIL import ImageOps
    sheet.paste(ImageOps.expand(qr, 8, '#ffffff'), (790, 330))
    sheet.finish(grain=2.0, vignette=0.02)
    return dict(
        slug='business-card', name='Sofia Rinaldi — business card', lang='eng', pages=[sheet], photo=dict(kind='marble', scale=0.7, rotation=-8, perspective=0.1, size_ratio=0.75),
        tags=['contact'], folder='Work', created='2026-10-30 14:15', favorite=False, extra={},
    )


def certificate():
    rng = random.Random(56)
    sheet = Sheet(1754, 1240, paper='#fffdf7', rng=rng)
    gold = '#b8860b'
    for inset, width in [(30, 8), (52, 2)]:
        sheet.rect((inset, inset, 1754 - inset, 1240 - inset), outline=gold, width=width)
    sheet.text((877, 170), 'CERTIFICATE OF COMPLETION', ('times-bold', 66), '#1b1b1f', anchor='ma', spacing=4)
    sheet.line((560, 270), (1194, 270), gold, 3)
    sheet.text((877, 320), 'This is to certify that', ('times-italic', 34), '#555555', anchor='ma')
    sheet.text((877, 400), 'Martin Duval', ('serif-bold', 110), '#1b1b1f', anchor='ma')
    sheet.text((877, 560), 'has successfully completed the course', ('times-italic', 34), '#555555', anchor='ma')
    sheet.text((877, 630), 'Advanced Landscape Photography', ('times-bold', 58), gold, anchor='ma')
    sheet.text((877, 730), '40 hours · Grade: Distinction', ('times', 32), '#333333', anchor='ma')
    sheet.line((250, 1040), (650, 1040), '#111111', 2)
    sheet.line((1104, 1040), (1504, 1040), '#111111', 2)
    sheet.text((450, 1060), 'Course director', ('times', 26), '#555555', anchor='ma')
    sheet.text((1304, 1060), 'Date · June 21, 2026', ('times', 26), '#555555', anchor='ma')
    sheet.text((450, 980), 'A. Whitfield', ('hand', 60), '#1a2a8a', anchor='ma')
    sheet.draw.ellipse((780, 850, 970, 1040), outline=hex_to_rgb(gold), width=6)
    sheet.draw.ellipse((796, 866, 954, 1024), outline=hex_to_rgb(gold), width=2)
    sheet.text((875, 945), '*', ('arial-bold', 80), gold, anchor='mm')
    sheet.finish()
    return dict(
        slug='certificate-photography', name='Photography course certificate', lang='eng', pages=[sheet], photo=dict(kind='linen', scale=0.92, rotation=1, landscape=True),
        tags=['certificate'], folder=None, created='2026-06-21 18:30', favorite=False, extra={},
    )


def flyer():
    rng = random.Random(57)
    sheet = Sheet(*A4, paper='#fff7ed', rng=rng)
    bg = gradient((A4[0], 900), '#f97316', '#fbbf24', 70)
    sheet.image.paste(bg, (0, 0))
    sheet.draw = ImageDraw.Draw(sheet.image)
    sheet.text((A4[0] / 2, 130), 'SATURDAY', ('arial-black', 70), '#7c2d12', anchor='ma', spacing=14)
    sheet.text((A4[0] / 2, 240), 'FARMERS MARKET', ('arial-black', 112), '#ffffff', anchor='ma')
    sheet.text((A4[0] / 2, 380), 'Place Carnot · every Saturday 8:00 – 13:00', ('arial-bold', 34), '#7c2d12', anchor='ma')
    # simple veg illustrations
    for cx, cy, r, col in [(260, 640, 130, '#dc2626'), (520, 700, 90, '#16a34a'), (780, 620, 140, '#ea580c'), (1000, 700, 100, '#7e22ce')]:
        sheet.draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=hex_to_rgb(col))
        sheet.draw.polygon([(cx - 20, cy - r), (cx, cy - r - 60), (cx + 20, cy - r)], fill=hex_to_rgb('#166534'))
    y = 1000
    for line in ['Fresh vegetables & fruit', 'Local cheese, honey & bread', 'Live music from 10:00', 'Free tasting workshops for kids']:
        sheet.text((200, y), '● ' + line, ('arial-bold', 44), '#7c2d12')
        y += 90
    sheet.text((A4[0] / 2, 1500), 'marche-carnot.example', ('arial', 40), '#9a3412', anchor='ma')
    sheet.finish(grain=2.2)
    return dict(
        slug='flyer-market', name='Farmers market flyer', lang='eng', pages=[sheet], photo=dict(kind='desk', scale=0.9, rotation=4),
        tags=[], folder=None, created='2026-10-04 09:20', favorite=False, extra={},
    )


def car_service():
    rng = random.Random(58)
    sheet = Sheet(*A4, rng=rng)
    margin = 110
    red = '#dc2626'
    sheet.rect((0, 0, A4[0], 20), fill=red)
    sheet.text((margin, 80), 'GARAGE DUVAL', ('arial-black', 58), '#1b1b1f')
    sheet.text((margin, 150), 'Entretien & réparation toutes marques · Villeurbanne', ('arial', 24), '#555555')
    sheet.text((A4[0] - margin, 90), 'FACTURE', ('arial-bold', 40), red, anchor='ra', spacing=4)
    sheet.text((A4[0] - margin, 144), 'F-2026-1187 · 30/10/2026', ('arial', 24), '#555555', anchor='ra')
    y = 250
    sheet.text((margin, y), 'Véhicule : Peugeot 308 · 112 480 km', ('arial-bold', 26))
    sheet.text((margin, y + 40), 'Immatriculation : GK-482-ZH', ('arial', 24), '#555555')
    y += 120
    sheet.rect((margin, y, A4[0] - margin, y + 52), fill='#1b1b1f')
    for label, x, anchor in [('Désignation', margin + 18, 'la'), ('Qté', 820, 'ra'), ('P.U. HT', 980, 'ra'), ('Total HT', A4[0] - margin - 18, 'ra')]:
        sheet.text((x, y + 13), label, ('arial-bold', 21), '#ffffff', anchor=anchor)
    y += 52
    rows = [('Vidange huile moteur 5W30 (4,2 L)', 1, 69.00), ('Filtre à huile', 1, 14.50), ('Filtre à air', 1, 22.00), ('Plaquettes de frein avant (jeu)', 1, 86.00), ('Main d’œuvre (2,5 h)', 2.5, 62.00), ('Contrôle niveaux & géométrie', 1, 25.00)]
    total = 0
    for label, qty, price in rows:
        amount = qty * price
        total += amount
        sheet.text((margin + 18, y + 18), label, ('arial', 23))
        sheet.text((820, y + 18), f'{qty:g}', ('arial', 23), anchor='ra')
        sheet.text((980, y + 18), f'{price:.2f}', ('arial', 23), anchor='ra')
        sheet.text((A4[0] - margin - 18, y + 18), f'{amount:.2f}', ('arial', 23), anchor='ra')
        y += 60
        sheet.line((margin, y), (A4[0] - margin, y), '#e5e7eb', 2)
    y += 36
    for label, value, bold in [('Total HT', total, False), ('TVA 20 %', total * 0.2, False), ('Net à payer', total * 1.2, True)]:
        fnt = ('arial-black', 34) if bold else ('arial', 25)
        sheet.text((700, y), label, fnt)
        sheet.text((A4[0] - margin, y), f'{value:,.2f} €'.replace(',', ' ').replace('.', ','), fnt, anchor='ra')
        y += 56
    y += 30
    sheet.text((margin, y), 'Prochain entretien conseillé : 127 000 km ou octobre 2027', ('arial', 23), '#555555')
    sheet.text((margin, y + 40), 'Règlement par carte bancaire — Merci de votre confiance.', ('arial', 23), '#555555')
    sheet.finish()
    return dict(
        slug='car-service', name='Garage Duval — révision 308', lang='fra', pages=[sheet], photo=dict(kind='wood', scale=0.9, rotation=-1.5),
        tags=['invoice', 'car'], folder=None, created='2026-10-30 17:40', favorite=False, extra=dict(Montant={'type': 'number', 'value': round(total * 1.2, 2)}),
    )


HIRAGINO = None


def jp_font(size, bold=False):
    from PIL import ImageFont
    for path in ['/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc', '/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc', '/System/Library/Fonts/Hiragino Sans GB.ttc', '/System/Library/Fonts/PingFang.ttc', '/Library/Fonts/Arial Unicode.ttf', '/System/Library/Fonts/Supplemental/Arial Unicode.ttf']:
        try:
            return ImageFont.truetype(path, size, index=1 if bold and path.endswith('.ttc') else 0)
        except OSError:
            continue
    raise OSError('no CJK font')


def receipt_japan():
    rng = random.Random(59)
    sheet = Sheet(640, 1000, paper='#faf8f3', rng=rng)
    y = 50
    sheet.text((320, y), '居酒屋 さくら', jp_font(50, True), '#1b1b1f', anchor='ma')
    y += 76
    sheet.text((320, y), '領収書', jp_font(36), '#1b1b1f', anchor='ma', spacing=10)
    y += 56
    for line in ['東京都新宿区歌舞伎町1-2-3', 'TEL 03-5555-0123']:
        sheet.text((320, y), line, jp_font(22), '#333333', anchor='ma')
        y += 32
    y += 16
    sheet.text((40, y), '2026年11月8日  21:34', jp_font(22), '#333333')
    y += 34
    sheet.text((40, y), 'お会計  テーブル 5番', jp_font(22), '#333333')
    y += 48
    sheet.line((40, y), (600, y), '#555555', 2)
    y += 16
    items = [('生ビール', 2, 650), ('焼き鳥盛り合わせ', 1, 1480), ('枝豆', 1, 480), ('刺身三種盛り', 1, 1980), ('だし巻き卵', 1, 780), ('お茶漬け', 2, 590)]
    total = 0
    for label, qty, price in items:
        amount = qty * price
        total += amount
        sheet.text((40, y), f'{label}', jp_font(24), '#1b1b1f')
        sheet.text((410, y), f'×{qty}', jp_font(24), '#1b1b1f', anchor='ra')
        sheet.text((600, y), f'¥{amount:,}', jp_font(24), '#1b1b1f', anchor='ra')
        y += 46
    y += 8
    sheet.line((40, y), (600, y), '#555555', 2)
    y += 22
    sheet.text((40, y), '合計（税込）', jp_font(32, True))
    sheet.text((600, y), f'¥{total:,}', jp_font(36, True), anchor='ra')
    y += 64
    sheet.text((40, y), f'（内消費税10%  ¥{round(total / 11):,}）', jp_font(22), '#333333')
    y += 56
    sheet.text((320, y), 'ありがとうございました', jp_font(28), '#1b1b1f', anchor='ma')
    sheet.finish(grain=2.6, vignette=0.04)
    return dict(
        slug='receipt-izakaya', name='居酒屋さくら — 領収書', lang='jpn', pages=[sheet], photo=dict(kind='slate', scale=0.9, rotation=5),
        tags=['receipt', 'travel'], folder='Receipts', created='2026-11-08 21:40', favorite=False, extra=dict(Total=f'¥{total:,}'),
    )


def handbook():
    """6 page multi-page document (dense text) for page navigation tests."""
    rng = random.Random(60)
    pages = []
    margin = 120
    width = A4[0] - 2 * margin
    chapters = [
        ('1. Welcome', 'Welcome to Helio Robotics. This handbook describes how we work together, what you can expect from us and what we expect from you. It is a living document: if something is unclear or out of date, open a pull request against the handbook repository and tag the People team.'),
        ('2. Working hours', 'Core hours are 10:00 to 16:00 local time. Outside of core hours you are free to organise your day around your own rhythm and your team’s commitments. We do not measure presence, we measure outcomes. Please keep your calendar up to date so teammates know when you are available.'),
        ('3. Remote work', 'You can work from home, from a coworking space or from our offices in Munich and Lyon. We provide a home-office budget of €600 on joining and €200 each following year for equipment such as a monitor, chair or desk. Keep receipts in the expense tool.'),
        ('4. Time off', 'Full-time employees receive 30 days of paid vacation per year plus public holidays. Vacation requests are made in the HR tool at least two weeks in advance for periods longer than five days. Sick leave does not count against your vacation allowance.'),
        ('5. Learning budget', 'Each employee has an annual learning budget of €1,500 for books, courses and conferences, plus two paid days per year to attend. Share what you learn in the engineering newsletter, or give a short talk at the monthly brown-bag session.'),
        ('6. Security basics', 'Use the company password manager, enable two-factor authentication everywhere, lock your screen when you step away and report lost devices within one hour to security@helio.example. Never share credentials over chat or email.'),
    ]
    for index, (title, body) in enumerate(chapters, 1):
        sheet = Sheet(*A4, paper='#fffffe', rng=rng)
        sheet.text((margin, 90), 'Helio Robotics · Employee Handbook', ('sans', 22), '#888888')
        sheet.line((margin, 135), (A4[0] - margin, 135), '#dddddd', 2)
        sheet.text((margin, 200), title, ('sans-bold', 56), '#0f172a')
        y = paragraph(sheet, margin, 300, body, ('sans', 28), width, '#1f2937', leading=1.5)
        y = paragraph(sheet, margin, y + 30, body.split('.')[0] + '. Details and exceptions are documented in the internal wiki and may vary per country due to local labour law and collective agreements.', ('sans', 28), width, '#1f2937', leading=1.5)
        y += 40
        sheet.rect((margin, y, A4[0] - margin, y + 170), fill='#eff6ff', radius=14)
        sheet.text((margin + 30, y + 26), 'Good to know', ('sans-bold', 26), '#1d4ed8')
        paragraph(sheet, margin + 30, y + 72, 'Questions about this chapter? Ask in #people-help or email people@helio.example.', ('sans', 25), width - 60, '#1e3a8a')
        sheet.text((A4[0] / 2, A4[1] - 90), f'{index}', ('sans', 24), '#888888', anchor='ma')
        sheet.finish(grain=1.6)
        pages.append(sheet)
    return dict(
        slug='handbook-helio', name='Helio Robotics — employee handbook', lang='eng', pages=pages, photo=dict(kind='wood', scale=0.9),
        tags=['work'], folder='Work', created='2026-09-01 09:00', favorite=False, extra={},
    )


def insurance_cert():
    rng = random.Random(61)
    sheet = Sheet(*A4, rng=rng)
    margin = 110
    sheet.rect((0, 0, A4[0], 200), fill='#0b3d91')
    sheet.text((margin, 70), 'Blue Shield', ('avenir-bold', 56), '#ffffff')
    sheet.text((margin, 140), 'Home & Contents Insurance', ('avenir', 26), '#bcd0f5')
    sheet.text((A4[0] - margin, 80), 'CERTIFICATE', ('avenir-bold', 34), '#ffffff', anchor='ra', spacing=5)
    sheet.text((A4[0] - margin, 130), 'Policy HC-77-402918', ('avenir', 24), '#bcd0f5', anchor='ra')
    y = 280
    for label, value in [('Policyholder', 'Martin & Sofia Duval'), ('Insured address', '12 rue de la République, 69001 Lyon'), ('Period', 'Mar 1, 2026 to Feb 28, 2027'), ('Annual premium', '€ 214.80 (paid monthly)')]:
        sheet.text((margin, y), label, ('avenir', 22), '#6b7280')
        sheet.text((margin, y + 32), value, ('avenir-bold', 30), '#111827')
        y += 100
    y += 20
    sheet.text((margin, y), 'Cover summary', ('avenir-bold', 30), '#0b3d91')
    y += 64
    for label, value in [('Fire & water damage', '€ 150,000'), ('Theft & vandalism', '€ 30,000'), ('Personal liability', '€ 4,500,000'), ('Glass breakage', 'Included'), ('Deductible', '€ 150')]:
        sheet.text((margin, y), label, ('avenir', 26))
        sheet.text((A4[0] - margin, y), value, ('avenir-demi', 26), anchor='ra')
        y += 56
        sheet.line((margin, y - 12), (A4[0] - margin, y - 12), '#e5e7eb', 1)
    bc = barcode_image('code128', 'HC77402918', scale=2, height=0.8).resize((420, 110))
    sheet.paste(bc, (margin, A4[1] - 280))
    sheet.text((margin, A4[1] - 150), 'Show this certificate to your landlord on request.', ('avenir', 22), '#6b7280')
    sheet.finish()
    return dict(
        slug='insurance-certificate', name='Home insurance certificate', lang='eng', pages=[sheet], photo=dict(kind='marble', scale=0.9, rotation=-1.5),
        tags=['insurance', 'important'], folder='Home/Rental', created='2026-03-02 12:00', favorite=False, extra=dict(Expires={'type': 'date', 'value': 1803600000000}),
    )


def old_trashed():
    rng = random.Random(62)
    sheet = Sheet(620, 800, paper='#f4f2ea', rng=rng)
    sheet.text((310, 60), 'QUICK PARK', ('courier-bold', 42), anchor='ma', spacing=4)
    y = 140
    for line in ['Parking ticket', 'Entry  09:12  Oct 02', 'Exit   11:48  Oct 02', 'Duration 2h36', '', 'Amount paid: 7.80 EUR']:
        sheet.text((60, y), line, ('courier', 26))
        y += 44
    sheet.finish(grain=2.8)
    return dict(
        slug='parking-ticket', name='Parking ticket', lang='eng', pages=[sheet], photo=dict(kind='slate', scale=0.85, rotation=6),
        tags=['receipt'], folder='Receipts', created='2026-10-02 11:50', favorite=False, extra={}, trashed='2026-11-15 09:30',
    )


BUILDERS = [
    receipt_cafe, receipt_grocery, receipt_pharmacy, receipt_japan, invoice_studio, bill_energy, bill_internet, lease, letter_tax, bank_statement,
    prescription, lab_results, itinerary, event_ticket, warranty, recipe_page, whiteboard, handwritten_list, business_card, certificate, flyer,
    car_service, handbook, insurance_cert, old_trashed,
]
