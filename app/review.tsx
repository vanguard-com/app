import { Text } from 'react-native';
import { router } from 'expo-router';

import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';
import { useScreenAnnouncement } from '@/utils/accessibility';

// Phase 0 placeholder. Spoken summary, Play, Save and Share arrive in Phases 1 and 6.
export default function ReviewScreen() {
  const { colors, typography, spacing } = useTheme();
  const t = strings.review;

  useScreenAnnouncement(t.screenAnnouncement);

  return (
    <Screen>
      {/* Retake is the way back, so the header has no separate back button. */}
      <ScreenHeader title={t.title} hideBack />
      <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.xl }]}>
        {t.empty}
      </Text>
      <AccessibleButton
        variant="primary"
        label={t.retake.label}
        hint={t.retake.hint}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/camera'))}
        testID="review-retake"
      />
    </Screen>
  );
}
