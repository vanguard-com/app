import { Screen, ScreenHeader, ToggleRow, type IconName } from '@/components';
import { strings } from '@/i18n';
import { useSettings, type FeedbackToggles } from '@/store/settingsStore';

const TYPES: (keyof FeedbackToggles)[] = ['eyeContact', 'expression', 'posture', 'voice'];
const ICONS: Record<keyof FeedbackToggles, IconName> = {
  eyeContact: 'eye-outline',
  expression: 'happy-outline',
  posture: 'body-outline',
  voice: 'mic-outline',
};

export default function FeedbackTypesSettings() {
  const t = strings.settings;
  const feedback = useSettings((s) => s.feedback);
  const setFeedback = useSettings((s) => s.setFeedback);

  return (
    <Screen>
      <ScreenHeader title={t.feedbackTypes.label} />
      {TYPES.map((key) => (
        <ToggleRow
          key={key}
          icon={ICONS[key]}
          label={t[key].label}
          value={feedback[key]}
          onChange={(value) => setFeedback(key, value)}
          testID={`setting-feedback-${key}`}
        />
      ))}
    </Screen>
  );
}
