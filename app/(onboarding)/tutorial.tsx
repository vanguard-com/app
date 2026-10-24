import { useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import { nextOnboarding } from '@/features/onboarding/navigation';
import { useNarration } from '@/features/onboarding/useNarration';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';

export default function Tutorial() {
  const [step, setStep] = useState(0);
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const t = strings.onboarding,
    lesson = t.lessons[step];
  const { colors, typography, spacing } = useTheme();
  const progress = t.lesson(step + 1, t.lessons.length);
  const narration = useNarration(
    `tutorial.lesson.${step}`,
    `${progress}. ${lesson.title}. ${lesson.text}`,
  );
  const practice = () => nextOnboarding('/permissions', replay === '1');
  return (
    <Screen>
      <ScreenHeader
        title={lesson.title}
        announce={false}
        onBack={() => (step ? setStep(step - 1) : router.back())}
      />
      <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.md }]}>
        {progress}
      </Text>
      <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.xl }]}>
        {lesson.text}
      </Text>
      <AccessibleButton
        label={t.again.label}
        hint={t.again.hint}
        onPress={narration.replay}
        testID="tutorial-repeat"
      />
      <AccessibleButton
        variant="primary"
        label={step === t.lessons.length - 1 ? t.skipLessons.label : t.next.label}
        hint={t.next.hint}
        onPress={() => (step === t.lessons.length - 1 ? practice() : setStep(step + 1))}
        testID="tutorial-next"
      />
      {step < t.lessons.length - 1 ? (
        <AccessibleButton
          label={t.skipLessons.label}
          hint={t.skipLessons.hint}
          onPress={practice}
          testID="tutorial-skip"
        />
      ) : null}
    </Screen>
  );
}
