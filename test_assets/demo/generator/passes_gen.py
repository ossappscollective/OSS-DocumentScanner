"""Unsigned fictional .pkpass files (the apps do not verify the signature)."""
import hashlib
import io
import json
import zipfile
from PIL import Image, ImageDraw
from render import font, gradient, hex_to_rgb


def png(image):
    buf = io.BytesIO()
    image.save(buf, 'PNG')
    return buf.getvalue()


def icon_image(color, letter, size):
    img = Image.new('RGB', (size, size), hex_to_rgb(color))
    d = ImageDraw.Draw(img)
    fnt = font('avenir-bold', int(size * 0.62))
    d.text((size / 2, size / 2), letter, font=fnt, fill=(255, 255, 255), anchor='mm')
    return img


def logo_image(color, text, height):
    fnt = font('avenir-bold', int(height * 0.62))
    probe = ImageDraw.Draw(Image.new('RGB', (10, 10)))
    width = int(probe.textlength(text, font=fnt)) + 10
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    ImageDraw.Draw(img).text((0, height / 2), text, font=fnt, fill=hex_to_rgb(color) + (255,), anchor='lm')
    return img


def strip_image(c0, c1, width, height):
    return gradient((width, height), c0, c1, 20)


def write_pass(path, pass_json, logo_text, icon_color, letter, logo_color='#ffffff', strip=None):
    files = {'pass.json': json.dumps(pass_json, ensure_ascii=False, indent=1).encode()}
    files['icon.png'] = png(icon_image(icon_color, letter, 29))
    files['icon@2x.png'] = png(icon_image(icon_color, letter, 58))
    files['logo.png'] = png(logo_image(logo_color, logo_text, 50))
    files['logo@2x.png'] = png(logo_image(logo_color, logo_text, 100))
    if strip:
        files['strip.png'] = png(strip_image(strip[0], strip[1], 375, 123))
        files['strip@2x.png'] = png(strip_image(strip[0], strip[1], 750, 246))
    manifest = {name: hashlib.sha1(data).hexdigest() for name, data in files.items()}
    files['manifest.json'] = json.dumps(manifest).encode()
    files['signature'] = b'demo-unsigned'
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, data in files.items():
            archive.writestr(name, data)


def build_all(directory):
    common = dict(formatVersion=1, teamIdentifier='DEMO000000')

    write_pass(
        directory + '/aurora-air-boarding-lys-lis.pkpass',
        dict(
            common, description='Aurora Air boarding pass', organizationName='Aurora Air', passTypeIdentifier='pass.example.aurora.boarding', serialNumber='AA1824-K7PQ2M-1',
            relevantDate='2026-12-12T07:15:00+01:00', backgroundColor='#0c4a6e', foregroundColor='#ffffff', labelColor='#bae6fd',
            boardingPass=dict(
                transitType='PKTransitTypeAir',
                headerFields=[dict(key='gate', label='GATE', value='B14'), dict(key='seat', label='SEAT', value='14A')],
                primaryFields=[dict(key='origin', label='Lyon', value='LYS'), dict(key='destination', label='Lisbon', value='LIS')],
                secondaryFields=[dict(key='name', label='PASSENGER', value='DUVAL/MARTIN'), dict(key='class', label='CLASS', value='Economy Plus')],
                auxiliaryFields=[dict(key='flight', label='FLIGHT', value='AA 1824'), dict(key='date', label='DATE', value='12 Dec 2026'), dict(key='boarding', label='BOARDING', value='06:35'), dict(key='group', label='GROUP', value='2')],
                backFields=[dict(key='pnr', label='Booking reference', value='K7PQ2M'), dict(key='baggage', label='Baggage', value='1 x 23 kg included'), dict(key='contact', label='Contact', value='+33 4 72 00 11 22')],
            ),
            barcodes=[dict(format='PKBarcodeFormatAztec', message='M1DUVAL/MARTIN    EK7PQ2M LYSLISAA 1824 346Y014A0012 100', messageEncoding='iso-8859-1')],
        ),
        'Aurora Air', '#0c4a6e', 'A', strip=None,
    )

    write_pass(
        directory + '/neon-lights-festival.pkpass',
        dict(
            common, description='Neon Lights Festival ticket', organizationName='Neon Lights', passTypeIdentifier='pass.example.neonlights.ticket', serialNumber='NLF27-4471-9902-31',
            relevantDate='2027-06-19T15:00:00+02:00', backgroundColor='#4c1d95', foregroundColor='#ffffff', labelColor='#f0abfc',
            eventTicket=dict(
                primaryFields=[dict(key='event', label='EVENT', value='Neon Lights Festival 2027')],
                secondaryFields=[dict(key='loc', label='VENUE', value='Parc de Parilly, Bron'), dict(key='date', label='DATE', value='Sat 19 June 2027')],
                auxiliaryFields=[dict(key='gate', label='GATES', value='15:00'), dict(key='type', label='TICKET', value='General admission')],
                backFields=[dict(key='terms', label='Terms', value='One entry per ticket. 18+ only. No refunds.'), dict(key='order', label='Order', value='4471-9902-31')],
            ),
            barcodes=[dict(format='PKBarcodeFormatQR', message='NLF27-4471-9902-31-GA-0001', messageEncoding='iso-8859-1')],
        ),
        'NEON LIGHTS', '#c026d3', 'N', strip=('#1e1b4b', '#c026d3'),
    )

    write_pass(
        directory + '/greenleaf-coupon.pkpass',
        dict(
            common, description='Greenleaf Market coupon', organizationName='Greenleaf Market', passTypeIdentifier='pass.example.greenleaf.coupon', serialNumber='GL-CPN-2026-1130',
            expirationDate='2026-11-30T23:59:00+01:00', backgroundColor='#14532d', foregroundColor='#ffffff', labelColor='#bbf7d0',
            coupon=dict(
                primaryFields=[dict(key='offer', label='SAVE', value='15% off')],
                secondaryFields=[dict(key='details', label='ON', value='All organic fruit & vegetables')],
                auxiliaryFields=[dict(key='exp', label='EXPIRES', value='30 Nov 2026')],
                backFields=[dict(key='terms', label='Terms', value='One use per customer. Not combinable with other offers.')],
            ),
            barcodes=[dict(format='PKBarcodeFormatCode128', message='GLCPN20261130', messageEncoding='iso-8859-1')],
        ),
        'Greenleaf', '#16a34a', 'G', strip=('#14532d', '#22c55e'),
    )

    write_pass(
        directory + '/cafe-brume-storecard.pkpass',
        dict(
            common, description='Café Brume loyalty card', organizationName='Café Brume', passTypeIdentifier='pass.example.cafebrume.store', serialNumber='CB-0012841',
            backgroundColor='#78350f', foregroundColor='#fef3c7', labelColor='#fcd34d',
            storeCard=dict(
                primaryFields=[dict(key='stamps', label='STAMPS', value='7 / 10')],
                secondaryFields=[dict(key='name', label='MEMBER', value='Martin Duval')],
                auxiliaryFields=[dict(key='next', label='NEXT REWARD', value='Free coffee in 3')],
                backFields=[dict(key='about', label='About', value='Every 10th coffee is on us.')],
            ),
            barcodes=[dict(format='PKBarcodeFormatQR', message='CAFEBRUME-LOYALTY-7-0012841', messageEncoding='iso-8859-1')],
        ),
        'Café Brume', '#92400e', 'B',
    )

    write_pass(
        directory + '/metropole-train-ticket.pkpass',
        dict(
            common, description='Intercités train ticket', organizationName='Rail Express', passTypeIdentifier='pass.example.railexpress.ticket', serialNumber='RX-9980-441',
            relevantDate='2026-12-20T09:42:00+01:00', backgroundColor='#7f1d1d', foregroundColor='#ffffff', labelColor='#fecaca',
            boardingPass=dict(
                transitType='PKTransitTypeTrain',
                headerFields=[dict(key='coach', label='COACH', value='12'), dict(key='seat', label='SEAT', value='54')],
                primaryFields=[dict(key='origin', label='Lyon Part-Dieu', value='LYP'), dict(key='destination', label='Paris Gare de Lyon', value='PLY')],
                secondaryFields=[dict(key='name', label='PASSENGER', value='Martin Duval'), dict(key='class', label='CLASS', value='2nd')],
                auxiliaryFields=[dict(key='train', label='TRAIN', value='TGV 6612'), dict(key='dep', label='DEPARTS', value='09:42'), dict(key='arr', label='ARRIVES', value='11:44')],
                backFields=[dict(key='ref', label='Booking ref', value='RX9980441')],
            ),
            barcodes=[dict(format='PKBarcodeFormatPDF417', message='RX9980441|LYP|PLY|20261220|0942|C12|S54', messageEncoding='iso-8859-1')],
        ),
        'Rail Express', '#b91c1c', 'R',
    )
