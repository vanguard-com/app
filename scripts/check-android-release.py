"""Check the merged release manifest and all shipped arm64 ELF load alignments."""

import pathlib
import struct
import sys
import xml.etree.ElementTree as ET
import zipfile

manifest_path, apk_path, aab_path = map(pathlib.Path, sys.argv[1:])
android = '{http://schemas.android.com/apk/res/android}'
manifest = ET.parse(manifest_path).getroot()
assert manifest.attrib['package'] == 'com.vanguard.lumi'
app = manifest.find('application')
assert app is not None
assert app.attrib.get(android + 'debuggable', 'false') == 'false'
assert app.attrib.get(android + 'usesCleartextTraffic') == 'false'
assert app.attrib.get(android + 'allowBackup') == 'false'
permissions = {p.attrib[android + 'name'] for p in manifest.findall('uses-permission')}
for forbidden in ['SYSTEM_ALERT_WINDOW', 'READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO',
                  'READ_MEDIA_AUDIO', 'READ_EXTERNAL_STORAGE', 'ACCESS_MEDIA_LOCATION',
                  'READ_MEDIA_VISUAL_USER_SELECTED', 'com.google.android.gms.permission.AD_ID']:
    name = forbidden if '.' in forbidden else 'android.permission.' + forbidden
    assert name not in permissions, f'Unexpected permission: {name}'
assert not manifest.findall(".//data[@" + android + "scheme='exp+lumi']")
sdk = manifest.find('uses-sdk')
assert sdk is not None
assert int(sdk.attrib[android + 'minSdkVersion']) == 29
assert int(sdk.attrib[android + 'targetSdkVersion']) >= 35
for archive in [apk_path, aab_path]:
    with zipfile.ZipFile(archive) as bundle:
        libraries = [n for n in bundle.namelist() if '/arm64-v8a/' in n and n.endswith('.so')]
        assert libraries, f'No arm64 libraries in {archive}'
        for name in libraries:
            data = bundle.read(name)
            assert data[:5] == b'\x7fELF\x02', name
            assert data[5] == 1, f'Expected little-endian ELF: {name}'
            offset = struct.unpack_from('<Q', data, 32)[0]
            entry_size, count = struct.unpack_from('<HH', data, 54)
            for i in range(count):
                header = offset + i * entry_size
                if struct.unpack_from('<I', data, header)[0] == 1:  # PT_LOAD
                    align = struct.unpack_from('<Q', data, header + 48)[0]
                    assert align >= 16384, f'{name}: segment alignment {align} is below 16 KB'
        print(f'{archive.name}: {len(libraries)} arm64 libraries have 16 KB ELF alignment')
print('Merged Android manifest passed. CI artifacts use a test key; do not submit them to Play.')
