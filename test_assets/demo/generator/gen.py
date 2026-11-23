"""Generates the demo data of both apps into test_assets/demo/<app>/ (manifest.json + data/) and the import files.

    python gen.py            # everything
    python gen.py docs       # documentscanner only
    python gen.py cards      # cardwallet only
    python gen.py imports    # files meant to be imported (pdf, photos, pkpass, backups)

Needs: pillow numpy treepoem (+ ghostscript) -> see requirements.txt
"""
import io
import json
import os
import random
import shutil
import sys
import zipfile
import zlib
from datetime import datetime
from zoneinfo import ZoneInfo

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import cards_gen
import docs_gen
import passes_gen
from render import desk_photo

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PARIS = ZoneInfo('Europe/Paris')
FORMATS = {'QR_CODE': 'QRCode', 'EAN_8': 'EAN-8', 'EAN_13': 'EAN-13', 'AZTEC': 'Aztec', 'CODE_39': 'Code39', 'CODE_128': 'Code128', 'PDF_417': 'PDF417', 'DATA_MATRIX': 'DataMatrix'}
FOLDER_COLORS = {'Receipts': '#f59e0b', 'Health': '#10b981', 'Travel': '#0ea5e9', 'Home': '#8b5cf6', 'Work': '#3b82f6', 'Taxes': '#ef4444', 'Shops': '#ec4899', 'Transport': '#14b8a6'}
FOLDER_BASE = 1790000000000
TAG_BASE = 1790100000000


def ms(text):
    return int(datetime.strptime(text, '%Y-%m-%d %H:%M').replace(tzinfo=PARIS).timestamp() * 1000)


def jpeg_bytes(image, quality):
    buf = io.BytesIO()
    image.convert('RGB').save(buf, 'JPEG', quality=quality, optimize=True, progressive=False)
    return buf.getvalue()


def palette(image, count=5):
    small = image.convert('RGB').resize((160, 100))
    quant = small.quantize(count, method=Image.Quantize.MEDIANCUT)
    colors = quant.getpalette()[: count * 3]
    counts = sorted(quant.getcolors(), reverse=True)
    result = []
    for _, index in counts:
        r, g, b = colors[index * 3 : index * 3 + 3]
        result.append('#%02x%02x%02x' % (r, g, b))
    return result


def ocr_data(sheet, factor):
    lines = {}
    for text, x0, y0, x1, y1, line_id in sheet.words:
        lines.setdefault(line_id, []).append((text, x0, y0, x1, y1))
    blocks = []
    rng = random.Random(7)
    for line_id in sorted(lines):
        words = sorted(lines[line_id], key=lambda w: w[1])
        text = ' '.join(w[0] for w in words)
        x0 = min(w[1] for w in words) * factor
        y0 = min(w[2] for w in words) * factor
        x1 = max(w[3] for w in words) * factor
        y1 = max(w[4] for w in words) * factor
        blocks.append(dict(box=dict(x=round(x0), y=round(y0), width=round(x1 - x0), height=round(y1 - y0)), text=text, confidence=round(rng.uniform(86, 98), 2)))
    return dict(text='\n'.join(block['text'] for block in blocks), blocks=blocks, imageWidth=round(sheet.width * factor), imageHeight=round(sheet.height * factor))


# ------------------------------------------------------------------ hard photos (detection / crop tests)


def _lowlight(image, rng):
    from PIL import ImageEnhance
    import numpy as np
    arr = np.asarray(ImageEnhance.Brightness(image).enhance(0.42)).astype('float32')
    arr += np.random.default_rng(rng.randint(0, 1 << 30)).normal(0, 9, arr.shape)
    return Image.fromarray(arr.clip(0, 255).astype('uint8'))


def _glare(image, rng):
    from PIL import ImageDraw, ImageFilter
    layer = Image.new('L', image.size, 0)
    w, h = image.size
    ImageDraw.Draw(layer).ellipse((w * 0.35, h * 0.1, w * 0.95, h * 0.5), fill=210)
    layer = layer.filter(ImageFilter.GaussianBlur(w * 0.07))
    return Image.composite(Image.new('RGB', image.size, (255, 255, 255)), image, layer)


def _shadow(image, rng):
    from PIL import ImageDraw, ImageFilter
    layer = Image.new('L', image.size, 0)
    w, h = image.size
    ImageDraw.Draw(layer).polygon([(w * 0.55, 0), (w, 0), (w, h * 0.65), (w * 0.3, h)], fill=170)
    layer = layer.filter(ImageFilter.GaussianBlur(w * 0.012))
    return Image.composite(Image.new('RGB', image.size, (15, 12, 10)), image, layer)


def _partial(image, rng):
    # the page runs off the left and bottom of the frame
    w, h = image.size
    return image.crop((int(w * 0.14), 0, w, int(h * 0.86))).resize((w, h), Image.LANCZOS)


def _clutter(image, rng):
    from PIL import ImageDraw
    d = ImageDraw.Draw(image)
    w, h = image.size
    d.rounded_rectangle((w * 0.02, h * 0.08, w * 0.11, h * 0.6), radius=24, fill=(30, 58, 138))  # a pen
    d.ellipse((w * 0.86, h * 0.76, w * 0.97, h * 0.76 + w * 0.11), fill=(212, 175, 55), outline=(150, 120, 30), width=6)  # a coin
    return image


HARD_EFFECTS = {'lowlight': _lowlight, 'glare': _glare, 'shadow': _shadow, 'partial': _partial, 'clutter': _clutter}


def make_item(item, out_data, is_card, index):
    """Writes the images of one document/card, returns its manifest entry."""
    seed = zlib.crc32(item['slug'].encode())
    rng = random.Random(seed)
    created = ms(item['created'])
    doc_id = str(created)
    modified = ms(item.get('used') or item['created']) if item.get('used') else created
    pages = []
    for page_index, sheet in enumerate(item['pages']):
        out_w = 960 if is_card else 900
        factor = out_w / sheet.width
        flat = sheet.image.resize((out_w, round(sheet.height * factor)), Image.LANCZOS)
        photo_cfg = item.get('photo', {})
        landscape = flat.width > flat.height * 1.05
        size = (1200, 900) if is_card else ((1333, 1000) if landscape else (1000, 1333))
        scale = photo_cfg.get('scale', 0.72 if is_card else 0.86)
        photo, quad = desk_photo(flat, size, photo_cfg.get('kind', 'wood'), rng, photo_cfg.get('rotation'), scale, photo_cfg.get('perspective', 0.05))
        page_id = f'{created + 40 + page_index * 7}_{page_index}'
        page_dir = os.path.join(out_data, doc_id, page_id)
        os.makedirs(page_dir, exist_ok=True)
        image_bytes = jpeg_bytes(flat, 78)
        source_bytes = jpeg_bytes(photo, 68)
        # the content hash is in the names: the apps cache images by path, a regenerated image must not hit a stale cache entry
        image_name = f'image_{zlib.crc32(image_bytes):08x}.jpg'
        capture_name = f'capture_{created - 3000 + page_index}_{zlib.crc32(source_bytes):08x}.jpg'
        with open(os.path.join(page_dir, image_name), 'wb') as handle:
            handle.write(image_bytes)
        with open(os.path.join(page_dir, capture_name), 'wb') as handle:
            handle.write(source_bytes)
        page = dict(
            id=page_id, createdDate=created + 40 + page_index * 7, modifiedDate=created + 40 + page_index * 7, document_id=doc_id, colorType='normal', rotation=0, scale=1,
            crop=[list(point) for point in quad], width=flat.width, height=flat.height, size=len(image_bytes), sourceSize=len(source_bytes),
            sourceImagePath=f'/{doc_id}/{page_id}/{capture_name}', sourceImageWidth=photo.width, sourceImageHeight=photo.height, sourceImageRotation=0,
            imagePath=f'/{doc_id}/{page_id}/{image_name}',
        )
        if is_card:
            page['colors'] = palette(flat)
            page['qrcode'] = [dict(text=item['qrcode']['text'], format=FORMATS[item['qrcode']['format']])] if item.get('qrcode') and page_index == 0 else []
            page['extra'] = {'color': item['extra'].get('color')} if item['extra'].get('color') else None
        else:
            page['ocrData'] = ocr_data(sheet, factor)
        pages.append(page)
    if item.get('colortype') and not is_card:
        pages[0]['colorType'] = item['colortype']
    return dict(
        id=doc_id, name=item['name'], createdDate=created, modifiedDate=max(created, modified), favorite=1 if item.get('favorite') else 0,
        usedDate=ms(item['used']) if item.get('used') else None, useCount=item.get('useCount', 0),
        trashedDate=ms(item['trashed']) if item.get('trashed') else None, extra=item.get('extra') or None, tags=item.get('tags', []), folder=item.get('folder'), pages=pages,
    ), page_dir


def build_manifest(items, app, is_card):
    out_app = os.path.join(ROOT, app)
    if os.path.isdir(out_app):
        shutil.rmtree(out_app)
    out_data = os.path.join(out_app, 'data')
    os.makedirs(out_data)
    documents = []
    for index, item in enumerate(items):
        doc, _ = make_item(item, out_data, is_card, index)
        documents.append(doc)
        print(f'  {app}: {item["slug"]}')
    folder_names = set()
    for doc in documents:
        if doc['folder']:
            parts = doc['folder'].split('/')
            for depth in range(1, len(parts) + 1):
                folder_names.add('/'.join(parts[:depth]))
    folders = []
    for index, name in enumerate(sorted(folder_names)):
        root = name.split('/')[0]
        folders.append(dict(id=FOLDER_BASE + index * 1000, name=name, color=FOLDER_COLORS.get(root) if '/' not in name else None, modifiedDate=ms('2026-11-01 10:00')))
    folder_ids = {folder['name']: folder['id'] for folder in folders}
    tag_names = sorted({tag for doc in documents for tag in doc['tags']})
    tags = [dict(id=TAG_BASE + index, name=name) for index, name in enumerate(tag_names)]
    tag_ids = {tag['name']: tag['id'] for tag in tags}
    for doc in documents:
        doc['folders'] = [folder_ids[doc['folder']]] if doc['folder'] else []
        doc['tags'] = [tag_ids[name] for name in doc['tags']]
        del doc['folder']
    manifest = dict(app=app, folders=folders, tags=tags, documents=documents)
    with open(os.path.join(out_app, 'manifest.json'), 'w') as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=1)
    return manifest


def gen_docs():
    items = [builder() for builder in docs_gen.BUILDERS]
    return items, build_manifest(items, 'documentscanner', False)


PASS_DOCS = [
    ('aurora-air-boarding-lys-lis.pkpass', '2026-11-10 21:10', True, ['travel'], 'Boarding pass LYS-LIS'),
    ('neon-lights-festival.pkpass', '2026-11-12 19:50', False, ['ticket'], 'Neon Lights Festival ticket'),
    ('greenleaf-coupon.pkpass', '2026-11-17 09:00', False, ['loyalty'], 'Greenleaf coupon'),
    ('cafe-brume-storecard.pkpass', '2026-11-14 12:55', False, ['loyalty'], 'Café Brume store pass'),
    ('metropole-train-ticket.pkpass', '2026-11-15 18:30', True, ['travel', 'transport'], 'Train ticket LYP-PLY'),
]


def add_passes(manifest):
    """Fictional passes: written as import files and, unzipped, as pass documents of the cardwallet db."""
    cards_dir = os.path.join(ROOT, 'import', 'cardwallet')
    os.makedirs(cards_dir, exist_ok=True)
    passes_gen.build_all(cards_dir)
    tag_by_name = {tag['name']: tag['id'] for tag in manifest['tags']}
    for file_name, created_text, favorite, tag_names, name in PASS_DOCS:
        created = ms(created_text)
        doc_id = str(created)
        page_id = f'{doc_id}_0'
        pass_dir = os.path.join(ROOT, 'cardwallet', 'data', doc_id, page_id, 'pkpass')
        os.makedirs(pass_dir, exist_ok=True)
        with zipfile.ZipFile(os.path.join(cards_dir, file_name)) as archive:
            archive.extractall(pass_dir)
        for junk in ('manifest.json', 'signature'):
            os.remove(os.path.join(pass_dir, junk))
        with open(os.path.join(pass_dir, 'pass.json')) as handle:
            pass_data = json.load(handle)
        images = {}
        for image_name in sorted(os.listdir(pass_dir)):
            if image_name.endswith('.png'):
                images[image_name.replace('.png', '').replace('@2x', '2x').replace('@3x', '3x')] = image_name
        for tag_name in tag_names:
            if tag_name not in tag_by_name:
                tag_id = TAG_BASE + 100 + len(manifest['tags'])
                manifest['tags'].append(dict(id=tag_id, name=tag_name))
                tag_by_name[tag_name] = tag_id
        manifest['documents'].append(
            dict(
                id=doc_id, name=name, createdDate=created, modifiedDate=created, favorite=1 if favorite else 0, usedDate=created, useCount=3, trashedDate=None, extra=None,
                tags=[tag_by_name[tag_name] for tag_name in tag_names], folders=[],
                pages=[dict(id=page_id, createdDate=created + 5, modifiedDate=created + 5, document_id=doc_id, extra={'color': pass_data.get('backgroundColor')}, pkpass=dict(id=f'{page_id}_pkpass', passType='pkpass', passData=pass_data, images=images))],
            )
        )
        print(f'  cardwallet: pass {file_name}')
    with open(os.path.join(ROOT, 'cardwallet', 'manifest.json'), 'w') as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=1)


def gen_cards():
    items = [builder() for builder in cards_gen.cardwallet_list()]
    manifest = build_manifest(items, 'cardwallet', True)
    add_passes(manifest)
    return items, manifest


# ------------------------------------------------------------------ import files


def backup_zip(path, app_id, manifest, wanted, id_shift, name_suffix):
    """A backup zip in the app format (data/<docid>/data.json + images, folders.json)."""
    folders_by_id = {folder['id']: folder for folder in manifest['folders']}
    used_folders = {}
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as archive:
        for doc in manifest['documents']:
            if doc['name'] not in wanted:
                continue
            new_id = str(int(doc['id']) + id_shift)
            pages_json = []
            for page_index, page in enumerate(doc['pages']):
                new_page_id = f"{int(page['id'].split('_')[0]) + id_shift}_{page_index}"
                src_dir = os.path.join(ROOT, manifest['app'], 'data', doc['id'], page['id'])
                for file_name in os.listdir(src_dir):
                    archive.write(os.path.join(src_dir, file_name), f'data/{new_id}/{new_page_id}/{file_name}')
                page_copy = dict(page, id=new_page_id, document_id=new_id, imagePath=page['imagePath'].replace(doc['id'], new_id).replace(page['id'], new_page_id), sourceImagePath=page['sourceImagePath'].replace(doc['id'], new_id).replace(page['id'], new_page_id))
                pages_json.append(page_copy)
            data = dict(
                db_version=3, id=new_id, createdDate=doc['createdDate'], modifiedDate=doc['modifiedDate'], name=doc['name'] + name_suffix, tags=[], folders=doc['folders'], _synced=0,
                pagesOrder=[page['id'] for page in pages_json], pages=pages_json, extra=doc['extra'] or {}, favorite=doc['favorite'], useCount=0,
            )
            for folder_id in doc['folders']:
                used_folders[folder_id] = folders_by_id[folder_id]
            archive.writestr(f'data/{new_id}/data.json', json.dumps(data, ensure_ascii=False))
        archive.writestr('folders.json', json.dumps(list(used_folders.values()), ensure_ascii=False))


def gen_imports(doc_items, doc_manifest, card_items, card_manifest):
    base = os.path.join(ROOT, 'import')
    docs_dir = os.path.join(base, 'documentscanner')
    cards_dir = os.path.join(base, 'cardwallet')
    os.makedirs(docs_dir, exist_ok=True)
    os.makedirs(cards_dir, exist_ok=True)
    by_slug = {item['slug']: item for item in doc_items}

    # PDFs: multi page, single page, text receipt
    def save_pdf(slug_list, file_name):
        images = []
        for slug in slug_list:
            for sheet in by_slug[slug]['pages']:
                images.append(sheet.image.convert('RGB').resize((900, round(sheet.height * 900 / sheet.width)), Image.LANCZOS))
        images[0].save(os.path.join(docs_dir, file_name), 'PDF', resolution=150.0, save_all=True, append_images=images[1:])

    save_pdf(['lease-agreement'], 'lease-agreement-3p.pdf')
    save_pdf(['handbook-helio'], 'employee-handbook-6p.pdf')
    save_pdf(['invoice-northwind'], 'invoice-INV-2026-0142.pdf')
    save_pdf(['bill-energie-verte', 'bill-fibrenet', 'bank-statement-oct'], 'home-bills-bundle.pdf')
    save_pdf(['tax-notice-2025'], 'avis-impot-2026.pdf')

    # photos of documents on a desk: the app has to detect the page itself
    for slug, kind, rotation in [('receipt-greenleaf', 'wood', 4), ('trip-lisbon', 'linen', -3), ('lab-results', 'marble', 2), ('whiteboard-sprint', 'desk', 0), ('recipe-lemon-pancakes', 'slate', -5), ('car-service', 'wood', 1)]:
        sheet = by_slug[slug]['pages'][0]
        flat = sheet.image.resize((900, round(sheet.height * 900 / sheet.width)), Image.LANCZOS)
        landscape = flat.width > flat.height
        photo, _ = desk_photo(flat, (1800, 1350) if landscape else (1350, 1800), kind, random.Random(zlib.crc32(slug.encode())), rotation, 0.84, 0.07)
        photo.save(os.path.join(docs_dir, f'photo-{slug}.jpg'), 'JPEG', quality=72, optimize=True)
    # harder photos: low light, glare, a hard shadow, a page cut by the frame, a cluttered desk, a strong angle
    for slug, effect, kind, rotation, perspective in [('invoice-northwind', 'lowlight', 'wood', -3, 0.07), ('bill-energie-verte', 'glare', 'slate', 5, 0.08), ('bank-statement-oct', 'shadow', 'wood', -6, 0.07), ('lease-agreement', 'partial', 'linen', 2, 0.06), ('bill-fibrenet', 'clutter', 'marble', -4, 0.07), ('tax-notice-2025', None, 'desk', 9, 0.16)]:
        sheet = by_slug[slug]['pages'][0]
        flat = sheet.image.resize((900, round(sheet.height * 900 / sheet.width)), Image.LANCZOS)
        rng = random.Random(zlib.crc32((slug + 'hard').encode()))
        photo, _ = desk_photo(flat, (1350, 1800), kind, rng, rotation, 0.84, perspective)
        if effect:
            photo = HARD_EFFECTS[effect](photo, rng)
        photo.save(os.path.join(docs_dir, f'photo-hard-{effect or "angle"}-{slug}.jpg'), 'JPEG', quality=72, optimize=True)
    # flat png scan + large flat jpg
    by_slug['bank-statement-oct']['pages'][0].image.resize((900, 1273), Image.LANCZOS).save(os.path.join(docs_dir, 'scan-bank-statement.png'), 'PNG', optimize=True)
    by_slug['certificate-photography']['pages'][0].image.convert('RGB').resize((1100, 779), Image.LANCZOS).save(os.path.join(docs_dir, 'scan-certificate-landscape.jpg'), 'JPEG', quality=80)
    backup_zip(os.path.join(docs_dir, 'com.akylas.documentscanner_backup_2026-11-20_09-00-00.zip'), 'com.akylas.documentscanner', doc_manifest, {'Café Brume lunch', 'Invoice INV-2026-0142', 'Lisbon trip — flights & hotel'}, 3600000, ' (backup)')

    # cards: photos on a desk (card detection + barcode scan), bare barcode images, passes, backup
    card_by_slug = {item['slug']: item for item in card_items}
    for slug, kind in [('greenleaf-club', 'wood'), ('health-insurance', 'linen'), ('transit-pass', 'desk'), ('aurora-flyer', 'slate')]:
        flat = card_by_slug[slug]['pages'][0].image
        photo, _ = desk_photo(flat, (1600, 1200), kind, random.Random(zlib.crc32(slug.encode())), 3, 0.72, 0.06)
        photo.save(os.path.join(cards_dir, f'card-photo-{slug}.jpg'), 'JPEG', quality=72, optimize=True)
    for slug, effect, kind in [('health-insurance', 'lowlight', 'slate'), ('transit-pass', 'glare', 'desk'), ('greenleaf-club', 'clutter', 'wood')]:
        flat = card_by_slug[slug]['pages'][0].image
        rng = random.Random(zlib.crc32((slug + 'hard').encode()))
        photo, _ = desk_photo(flat, (1600, 1200), kind, rng, -8, 0.7, 0.1)
        photo = HARD_EFFECTS[effect](photo, rng)
        photo.save(os.path.join(cards_dir, f'card-photo-hard-{effect}-{slug}.jpg'), 'JPEG', quality=72, optimize=True)
    import treepoem
    codes = [('qrcode', 'https://example.com/loyalty/AB-4471-9020', 'barcode-qrcode.png', 8), ('ean13', '590123412345', 'barcode-ean13.png', 6), ('code128', 'LIBRARY-0055-3211', 'barcode-code128.png', 5), ('pdf417', 'BOARDING|DUVAL|LYS-LIS|AA1824', 'barcode-pdf417.png', 4), ('azteccode', 'TICKET-AZTEC-2026-0042', 'barcode-aztec.png', 8), ('datamatrix', 'DM-SERIAL-77412', 'barcode-datamatrix.png', 10)]
    for kind, data, file_name, scale in codes:
        image = treepoem.generate_barcode(kind, data, options=dict(scale=scale)).convert('RGB')
        canvas = Image.new('RGB', (image.width + 160, image.height + 160), 'white')
        canvas.paste(image, (80, 80))
        canvas.save(os.path.join(cards_dir, file_name), 'PNG')
    shutil.copy(os.path.join(ROOT, '..', 'passes', 'Eurowings.pkpass'), os.path.join(cards_dir, 'eurowings-sample.pkpass'))
    backup_zip(os.path.join(cards_dir, 'com.akylas.cardwallet_backup_2026-11-20_09-00-00.zip'), 'com.akylas.cardwallet', card_manifest, {'Greenleaf Club Card', 'Blue Shield health card', 'Trattoria da Giovanni'}, 3600000, ' (backup)')


def main():
    what = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if what in ('all', 'cards', 'imports') and os.path.isdir(os.path.join(ROOT, 'import', 'cardwallet')):
        shutil.rmtree(os.path.join(ROOT, 'import', 'cardwallet'))
    if what in ('all', 'docs', 'imports') and os.path.isdir(os.path.join(ROOT, 'import', 'documentscanner')):
        shutil.rmtree(os.path.join(ROOT, 'import', 'documentscanner'))
    doc_items = doc_manifest = card_items = card_manifest = None
    if what in ('all', 'docs', 'imports'):
        doc_items, doc_manifest = gen_docs()
    if what in ('all', 'cards', 'imports'):
        card_items, card_manifest = gen_cards()
    if what in ('all', 'imports'):
        gen_imports(doc_items, doc_manifest, card_items, card_manifest)


if __name__ == '__main__':
    main()
