import { router } from 'expo-router';

import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';
import { useScreenAnnouncement } from '@/utils/accessibility';

export default function MoreSettings() {
  const { spacing } = useTheme();
  const t = strings.settings;
  useScreenAnnouncement(t.groups.more.label);

  return (
    <Screen>
      <ScreenHeader title={t.groups.more.label} />
      <AccessibleButton
        label={strings.background.models.label}
        hint={strings.background.models.hint}
        onPress={() => router.push('/settings/models')}
        style={{ marginBottom: spacing.md }}
      />
      <AccessibleButton
        label={t.replayTutorial.label}
        hint={t.replayTutorial.hint}
        onPress={() => router.push({ pathname: '/welcome', params: { replay: '1' } })}
        style={{ marginBottom: spacing.md }}
        testID="setting-replay-tutorial"
      />
      <AccessibleButton
        label={strings.background.information.label}
        hint={strings.background.information.hint}
        onPress={() => router.push('/settings/information')}
      />
    </Screen>
  );
}
