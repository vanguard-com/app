// Native folders are generated: choose the same profile for prebuild and compilation.
module.exports = ({ config }) => {
  const profile = process.env.LUMI_BUILD_PROFILE ?? process.env.EAS_BUILD_PROFILE ?? 'development';
  if (!['development', 'preview', 'production'].includes(profile)) {
    throw new Error(`Unknown Lumi build profile: ${profile}`);
  }
  const release = profile !== 'development';
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []).map((plugin) => {
        if (!release || !Array.isArray(plugin) || plugin[0] !== 'expo-build-properties')
          return plugin;
        return [
          plugin[0],
          { ...plugin[1], android: { ...plugin[1].android, buildArchs: ['arm64-v8a'] } },
        ];
      }),
      ...(release ? ['./plugins/withReleaseBuild.cjs'] : ['expo-dev-client']),
    ],
    android: {
      ...config.android,
      blockedPermissions: [
        ...(config.android?.blockedPermissions ?? []),
        ...(release ? ['android.permission.SYSTEM_ALERT_WINDOW'] : []),
      ],
    },
    extra: { ...config.extra, buildProfile: profile },
  };
};
