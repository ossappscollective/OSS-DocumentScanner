"""Removes paths inside an iOS app container (devicectl has no delete).
usage: ios_rm.py <udid> <bundle id> <path relative to the container | @manifest.json: Documents/data/<doc id> of its documents> ..."""
import asyncio
import json
import sys

from pymobiledevice3.lockdown import create_using_usbmux
from pymobiledevice3.services.house_arrest import HouseArrestService


async def main(udid, bundle, paths):
    lockdown = await create_using_usbmux(serial=udid)
    afc = await HouseArrestService.create(lockdown, bundle_id=bundle)
    expanded = []
    for path in paths:
        if path.startswith('@'):
            with open(path[1:]) as handle:
                expanded += ['Documents/data/' + doc['id'] for doc in json.load(handle)['documents']]
        else:
            expanded.append(path)
    for path in expanded:
        if await afc.exists(path):
            await afc.rm(path)
            print('removed', path)


asyncio.run(main(sys.argv[1], sys.argv[2], sys.argv[3:]))
