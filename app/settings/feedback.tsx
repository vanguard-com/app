import { Text } from 'react-native';
import { useTheme } from '@/theme';
import { router } from 'expo-router';

import { AccessibleButton, Screen, ScreenHeader, ToggleRow } from '@/components';
import { strings } from '@/i18n';
import { useSettings } from '@/store/settingsStore';
import { useScreenAnnouncement } from '@/utils/accessibility';

export default function FeedbackSettings() {
  const t = strings.settings;
  const { colors, typography, spacing } = useTheme();
  const liveFeedback = useSettings((s) => s.liveFeedback);
  const update = useSettings((s) => s.update);

  useScreenAnnouncement(t.groups.feedback.label);

  return (
    <Screen>
      <ScreenHeader title={t.groups.feedback.label} />
      <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.md }]}>
        {strings.feedback.voiceFallback}
      </Text>
      <ToggleRow
        label={t.liveFeedback.label}
        value={liveFeedback}
        onChange={(value) => update({ liveFeedback: value })}
        testID="setting-live-feedback"
      />
      <AccessibleButton
        label={t.feedbackTypes.label}
        hint={t.feedbackTypes.hint}
        onPress={() => router.push('/settings/feedback-types')}
        testID="setting-feedback-types"
      />
    </Screen>
  );
}
