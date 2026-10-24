const {
  withInfoPlist,
  withAndroidManifest,
  withPodfile,
  withSettingsGradle,
} = require('expo/config-plugins');

const excluded = ['expo-dev-client', 'expo-dev-launcher', 'expo-dev-menu'];

module.exports = function withReleaseBuild(config) {
  config = withPodfile(config, (mod) => {
    const marker = '  use_expo_modules!';
    const replacement = `${marker}(:exclude => ${JSON.stringify(excluded)})`;
    if (!mod.modResults.contents.includes(replacement)) {
      if (!mod.modResults.contents.includes(marker)) throw new Error('Review release Podfile hook');
      mod.modResults.contents = mod.modResults.contents.replace(marker, replacement);
    }
    return mod;
  });
  config = withSettingsGradle(config, (mod) => {
    const marker = 'expoAutolinking.useExpoModules()';
    const exclusion = `expoAutolinking.exclude = ${JSON.stringify(excluded)}`;
    if (!mod.modResults.contents.includes(exclusion)) {
      if (!mod.modResults.contents.includes(marker)) throw new Error('Review release Gradle hook');
      mod.modResults.contents = mod.modResults.contents.replace(marker, `${exclusion}\n${marker}`);
    }
    return mod;
  });
  config = withInfoPlist(config, (mod) => {
    // Expo auto-applies dev-client's plugin because it is installed for development builds.
    const plist = mod.modResults;
    delete plist.NSLocalNetworkUsageDescription;
    delete plist.NSBonjourServices;
    for (const key of Object.keys(plist)) {
      if (key.startsWith('DEV_CLIENT_')) delete plist[key];
    }
    for (const entry of plist.CFBundleURLTypes ?? []) {
      entry.CFBundleURLSchemes = entry.CFBundleURLSchemes?.filter(
        (scheme) => !scheme.startsWith('exp+'),
      );
    }
    plist.CFBundleURLTypes = plist.CFBundleURLTypes?.filter(
      (entry) => entry.CFBundleURLSchemes?.length,
    );
    plist.NSAppTransportSecurity = { NSAllowsArbitraryLoads: false };
    return mod;
  });
  return withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (!app) throw new Error('Missing Android application');
    app.$['android:usesCleartextTraffic'] = 'false';
    for (const activity of app.activity ?? []) {
      for (const filter of activity['intent-filter'] ?? []) {
        if (filter.data) {
          filter.data = filter.data.filter(
            (entry) => entry.$ && !entry.$['android:scheme']?.startsWith('exp+'),
          );
          if (!filter.data.length) delete filter.data;
        }
      }
    }
    return mod;
  });
};
