import { Screen, ScreenHeader, ToggleRow } from '@/components';
import { strings } from '@/i18n';
import { useSettings, type FeedbackToggles } from '@/store/settingsStore';

const TYPES: (keyof FeedbackToggles)[] = ['eyeContact', 'expression', 'posture', 'voice'];

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
          label={t[key].label}
          value={feedback[key]}
          onChange={(value) => setFeedback(key, value)}
          testID={`setting-feedback-${key}`}
        />
      ))}
    </Screen>
  );
}
