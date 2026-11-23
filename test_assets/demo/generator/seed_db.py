"""Adds the demo manifest to an app SQLite db (idempotent: fixed ids, INSERT OR REPLACE).

    python seed_db.py <documentscanner|cardwallet> <db.sqlite> [--clean]

--clean empties Document/Page/Folder/Tag first. --data-prefix=<abs path of the app data folder> stores pass image paths (cardwallet). The images (<app>/data/*) are copied by the deploy scripts.
"""
import json
import os
import sqlite3
import sys
import unicodedata

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def normalize(value):
    if not value:
        return ''
    text = unicodedata.normalize('NFD', str(value).lower())
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
    for a, b in [('ß', 'ss'), ('ł', 'l'), ('ø', 'o'), ('œ', 'oe'), ('æ', 'ae')]:
        text = text.replace(a, b)
    return text


def columns(connection, table):
    return {row[1] for row in connection.execute(f'PRAGMA table_info("{table}")')}


def insert(connection, table, values):
    available = columns(connection, table)
    values = {key: value for key, value in values.items() if key in available}
    names = ','.join(f'"{key}"' for key in values)
    marks = ','.join('?' for _ in values)
    connection.execute(f'INSERT OR REPLACE INTO "{table}" ({names}) VALUES ({marks})', list(values.values()))


def main():
    app, db_path = sys.argv[1], sys.argv[2]
    clean = '--clean' in sys.argv
    prefix = next((arg.split('=', 1)[1] for arg in sys.argv if arg.startswith('--data-prefix=')), None)
    with open(os.path.join(ROOT, app, 'manifest.json')) as handle:
        manifest = json.load(handle)
    connection = sqlite3.connect(db_path)
    connection.execute('PRAGMA foreign_keys=OFF')
    if clean:
        for table in ['DocumentsTags', 'DocumentsFolders', 'PKPass', 'Page', 'Document', 'Folder', 'Tag']:
            if table in {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}:
                connection.execute(f'DELETE FROM "{table}"')
    for folder in manifest['folders']:
        insert(connection, 'Folder', dict(id=folder['id'], name=folder['name'], color=folder['color'], modifiedDate=folder['modifiedDate']))
    for tag in manifest['tags']:
        insert(connection, 'Tag', dict(id=tag['id'], name=tag['name']))
    for doc in manifest['documents']:
        insert(
            connection,
            'Document',
            dict(
                id=doc['id'], createdDate=doc['createdDate'], modifiedDate=doc['modifiedDate'], name=doc['name'], nameSearch=normalize(doc['name']), _synced=0, favorite=doc['favorite'],
                usedDate=doc['usedDate'], useCount=doc['useCount'], extra=json.dumps(doc['extra'], ensure_ascii=False) if doc['extra'] else None,
                pagesOrder=json.dumps([page['id'] for page in doc['pages']]), trashedDate=doc['trashedDate'],
            ),
        )
        connection.execute('DELETE FROM DocumentsTags WHERE document_id=?', [doc['id']])
        connection.execute('DELETE FROM DocumentsFolders WHERE document_id=?', [doc['id']])
        for tag_id in doc['tags']:
            connection.execute('INSERT OR REPLACE INTO DocumentsTags (document_id, tag_id) VALUES (?, ?)', [doc['id'], str(tag_id)])
        for folder_id in doc['folders']:
            connection.execute('INSERT OR REPLACE INTO DocumentsFolders (document_id, folder_id) VALUES (?, ?)', [doc['id'], str(folder_id)])
        for page in doc['pages']:
            pkpass = page.get('pkpass')
            if pkpass:
                assert prefix, '--data-prefix=<absolute data folder of the app> is needed for passes'
                images = {key: f"{prefix}/{doc['id']}/{page['id']}/pkpass/{name}" for key, name in pkpass['images'].items()}
                insert(
                    connection, 'PKPass',
                    dict(id=pkpass['id'], page_id=page['id'], passType=pkpass['passType'], passData=json.dumps(pkpass['passData'], ensure_ascii=False), images=json.dumps(images), createdDate=page['createdDate'], modifiedDate=page['createdDate']),
                )
                insert(
                    connection, 'Page',
                    dict(id=page['id'], createdDate=page['createdDate'], modifiedDate=page['modifiedDate'], pageIndex=-1, rotation=0, scale=1, document_id=doc['id'], extra=json.dumps(page['extra']), pkpass_id=pkpass['id']),
                )
                continue
            ocr = page.get('ocrData')
            insert(
                connection,
                'Page',
                dict(
                    id=page['id'], createdDate=page['createdDate'], modifiedDate=page['modifiedDate'], pageIndex=-1, colorType=page['colorType'], colorMatrix=None, transforms=None,
                    rotation=page['rotation'], scale=page['scale'], crop=json.dumps(page['crop']), ocrData=json.dumps(ocr, ensure_ascii=False) if ocr else None,
                    ocrDataSearch=normalize(ocr['text']) if ocr else None, width=page['width'], height=page['height'], size=page['size'], sourceSize=page['sourceSize'],
                    sourceImagePath=page['sourceImagePath'], imagePath=page['imagePath'], document_id=doc['id'], extra=json.dumps(page['extra']) if page.get('extra') else None,
                    brightness=0, contrast=1, sourceImageWidth=page['sourceImageWidth'], sourceImageHeight=page['sourceImageHeight'], sourceImageRotation=page['sourceImageRotation'],
                    qrcode=json.dumps(page['qrcode']) if 'qrcode' in page else None, colors=json.dumps(page['colors']) if 'colors' in page else None,
                ),
            )
    connection.commit()
    connection.execute('PRAGMA journal_mode=DELETE')
    connection.commit()
    for table in ['Document', 'Page', 'Folder', 'Tag']:
        print(table, connection.execute(f'SELECT count(*) FROM {table}').fetchone()[0])
    connection.close()


if __name__ == '__main__':
    main()
