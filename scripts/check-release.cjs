/* global __dirname */
/* eslint-disable no-console -- Release checks report evidence to the build log. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const eas = require('../eas.json');
const config = (profile) =>
  JSON.parse(
    execFileSync(
      process.execPath,
      [require.resolve('expo/bin/cli'), 'config', '--type', 'introspect', '--json'],
      {
        cwd: root,
        env: { ...process.env, LUMI_BUILD_PROFILE: profile, EXPO_NO_TELEMETRY: '1' },
        maxBuffer: 16 * 1024 * 1024,
        encoding: 'utf8',
      },
    ),
  );

for (const profile of ['development', 'preview', 'production']) {
  assert.equal(eas.build[profile].env.LUMI_BUILD_PROFILE, profile);
  const app = config(profile);
  const native = app._internal.modResults;
  const plist = native.ios.infoPlist;
  const manifest = native.android.manifest.manifest;
  assert.equal(app.ios.bundleIdentifier, 'com.vanguard.lumi');
  assert.equal(app.android.package, 'com.vanguard.lumi');
  assert.equal(native.ios.podfileProperties['ios.deploymentTarget'], '16.4');
  assert(
    native.android.gradleProperties.some(
      (p) => p.key === 'android.minSdkVersion' && p.value === '29',
    ),
  );
  for (const key of [
    'NSCameraUsageDescription',
    'NSMicrophoneUsageDescription',
    'NSSpeechRecognitionUsageDescription',
    'NSPhotoLibraryAddUsageDescription',
  ]) {
    assert(plist[key]?.length > 10, `Missing purpose: ${key}`);
  }
  assert(!plist.NSPhotoLibraryUsageDescription, 'Saving requires add-only Photos access');
  assert.equal(plist.ITSAppUsesNonExemptEncryption, false);
  assert(!plist.UIBackgroundModes?.includes('audio'));
  assert.equal(app.ios.privacyManifests.NSPrivacyTracking, false);
  assert.equal(manifest.application[0].$['android:allowBackup'], 'false');
  const schemes = (plist.CFBundleURLTypes ?? []).flatMap((entry) => entry.CFBundleURLSchemes ?? []);
  if (profile === 'development') {
    assert(
      native.android.gradleProperties.some(
        (p) => p.key === 'reactNativeArchitectures' && p.value === 'arm64-v8a,x86_64',
      ),
    );
    assert(schemes.includes('exp+lumi'));
    assert(plist.NSLocalNetworkUsageDescription);
  } else {
    assert(
      native.android.gradleProperties.some(
        (p) => p.key === 'reactNativeArchitectures' && p.value === 'arm64-v8a',
      ),
    );
    assert(!schemes.some((scheme) => scheme.startsWith('exp+')));
    assert(!plist.NSLocalNetworkUsageDescription);
    assert(!plist.NSBonjourServices);
    assert.equal(plist.NSAppTransportSecurity.NSAllowsArbitraryLoads, false);
    assert(!plist.NSAppTransportSecurity.NSAllowsLocalNetworking);
    assert.equal(manifest.application[0].$['android:usesCleartextTraffic'], 'false');
    assert(
      manifest['uses-permission'].some(
        (p) =>
          p.$['android:name'] === 'android.permission.SYSTEM_ALERT_WINDOW' &&
          p.$['tools:node'] === 'remove',
      ),
    );
    assert(!JSON.stringify(manifest).includes('exp+lumi'));
    for (const permission of [
      'READ_MEDIA_IMAGES',
      'READ_MEDIA_VIDEO',
      'READ_MEDIA_AUDIO',
      'ACCESS_MEDIA_LOCATION',
    ]) {
      assert(
        manifest['uses-permission'].some(
          (p) =>
            p.$['android:name'] === `android.permission.${permission}` &&
            p.$['tools:node'] === 'remove',
        ),
      );
    }
  }
  console.log(`${profile}: native configuration passed`);
}
assert.equal(eas.build.production.distribution, 'store');
assert.equal(eas.build.production.android.buildType, 'app-bundle');
assert.equal(eas.build.production.ios.buildConfiguration, 'Release');
assert.equal(eas.build.production.autoIncrement, true);
assert.equal(eas.build.development.developmentClient, true);
assert.equal(eas.submit.production.android.track, 'internal');
assert.equal(eas.submit.production.android.releaseStatus, 'draft');
const invalid = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'config', '--json'], {
  cwd: root,
  env: { ...process.env, LUMI_BUILD_PROFILE: 'prodution' },
  encoding: 'utf8',
});
assert.notEqual(invalid.status, 0);
assert(invalid.stderr.includes('Unknown Lumi build profile: prodution'));

for (const asset of [
  'icon.png',
  'splash-icon.png',
  'android-icon-foreground.png',
  'android-icon-background.png',
  'android-icon-monochrome.png',
]) {
  const png = fs.readFileSync(path.join(root, 'assets', asset));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1024);
  if (asset === 'icon.png') assert.equal(png[25], 2, 'Store icon must be opaque RGB');
}
console.log(
  'Profiles and 1024px icon sources passed; signed-store and phone acceptance are separate.',
);
