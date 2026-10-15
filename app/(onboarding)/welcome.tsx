import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import { strings } from '@/i18n';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { useScreenAnnouncement } from '@/utils/accessibility';

// Phase 0 placeholder. The spoken tutorial, practice mode and permission flow arrive in Phase 7.
export default function Welcome() {
  const { colors, typography, spacing } = useTheme();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const update = useSettings((s) => s.update);
  const t = strings.onboarding;

  useScreenAnnouncement(t.screenAnnouncement);

  const finish = () => {
    update({ onboardingComplete: true });
    if (replay && router.canGoBack()) router.back();
    else router.replace('/camera');
  };

  return (
    <Screen>
      <ScreenHeader title={t.title} hideBack={!replay} />
      <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.xl }]}>
        {t.intro}
      </Text>
      <AccessibleButton
        variant="primary"
        label={t.start.label}
        hint={t.start.hint}
        onPress={finish}
        testID="welcome-start"
      />
    </Screen>
  );
}
