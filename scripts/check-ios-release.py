"""Inspect the built unsigned Release archive, not just the source Info.plist."""

import pathlib
import plistlib
import json
import sys

archive = pathlib.Path(sys.argv[1])
app = archive / 'Products/Applications/Lumi.app'
with (app / 'Info.plist').open('rb') as file:
    plist = plistlib.load(file)
assert plist['CFBundleIdentifier'] == 'com.vanguard.lumi'
assert tuple(map(int, plist['MinimumOSVersion'].split('.'))) >= (16, 4)
assert not plist.get('NSLocalNetworkUsageDescription')
assert not plist.get('NSBonjourServices')
assert not plist.get('NSPhotoLibraryUsageDescription')
assert not plist.get('NSAppTransportSecurity', {}).get('NSAllowsArbitraryLoads')
assert not plist.get('NSAppTransportSecurity', {}).get('NSAllowsLocalNetworking')
assert 'audio' not in plist.get('UIBackgroundModes', [])
assert not any(s.startswith('exp+') for e in plist.get('CFBundleURLTypes', []) for s in e.get('CFBundleURLSchemes', []))
for key in ['NSCameraUsageDescription', 'NSMicrophoneUsageDescription',
            'NSSpeechRecognitionUsageDescription', 'NSPhotoLibraryAddUsageDescription']:
    assert len(plist[key]) > 10, key
assert (app / 'main.jsbundle').is_file(), 'Release JavaScript bundle missing'
with (app / 'PrivacyInfo.xcprivacy').open('rb') as file:
    privacy = plistlib.load(file)
assert privacy['NSPrivacyTracking'] is False
reasons = {item['NSPrivacyAccessedAPIType']: item['NSPrivacyAccessedAPITypeReasons']
           for item in privacy['NSPrivacyAccessedAPITypes']}
for category in ['UserDefaults', 'FileTimestamp', 'DiskSpace', 'SystemBootTime']:
    assert reasons['NSPrivacyAccessedAPICategory' + category], category
assert not any(p.name.startswith(('EXDevLauncher', 'EXDevMenu')) for p in app.rglob('*.bundle'))
manifests = {}
for source in sorted(app.rglob('PrivacyInfo.xcprivacy')):
    with source.open('rb') as file:
        manifests[str(source.relative_to(app))] = plistlib.load(file)
(archive.parent / 'ios-privacy-manifests.json').write_text(json.dumps(manifests, indent=2) + '\n')
print(f'Exported {len(manifests)} app/SDK privacy manifests for release review.')
print('Unsigned iOS Release archive: permissions, privacy reasons and bundled JavaScript passed.')
print('Apple signing, upload validation and final privacy labels remain owner release steps.')
