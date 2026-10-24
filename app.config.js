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
      ...(config.plugins ?? []),
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
