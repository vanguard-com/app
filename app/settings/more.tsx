import { Linking } from 'react-native';
import { router } from 'expo-router';

import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import { PRIVACY_POLICY_URL } from '@/config/app';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';
import { useScreenAnnouncement } from '@/utils/accessibility';

// Scene description model selection joins this screen in Phase 5.
export default function MoreSettings() {
  const { spacing } = useTheme();
  const t = strings.settings;
  useScreenAnnouncement(t.groups.more.label);

  return (
    <Screen>
      <ScreenHeader title={t.groups.more.label} />
      <AccessibleButton
        label={t.replayTutorial.label}
        hint={t.replayTutorial.hint}
        onPress={() => router.push({ pathname: '/welcome', params: { replay: '1' } })}
        style={{ marginBottom: spacing.md }}
        testID="setting-replay-tutorial"
      />
      <AccessibleButton
        label={t.privacy.label}
        hint={t.privacy.hint}
        role="link"
        onPress={() => {
          Linking.openURL(PRIVACY_POLICY_URL).catch(() => {});
        }}
        style={{ marginBottom: spacing.md }}
        testID="setting-privacy"
      />
      <AccessibleButton
        label={t.about.label}
        hint={t.about.hint}
        onPress={() => router.push('/settings/about')}
        testID="setting-about"
      />
    </Screen>
  );
}
