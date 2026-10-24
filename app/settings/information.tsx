import { Linking } from 'react-native';
import { router } from 'expo-router';
import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import { PRIVACY_POLICY_URL } from '@/config/app';
import { strings } from '@/i18n';
import { cues } from '@/cues';
export default function InformationScreen() {
  const t = strings.settings;
  return (
    <Screen>
      <ScreenHeader title={strings.background.information.label} />
      <AccessibleButton
        label={t.privacy.label}
        hint={t.privacy.hint}
        role="link"
        onPress={() => {
          void Linking.openURL(PRIVACY_POLICY_URL).catch(() =>
            cues.say({
              id: 'sys.link.failed',
              category: 'system',
              text: strings.common.linkFailed,
              force: true,
            }),
          );
        }}
      />
      <AccessibleButton
        navigation
        label={t.about.label}
        hint={t.about.hint}
        onPress={() => router.push('/settings/about')}
      />
    </Screen>
  );
}
