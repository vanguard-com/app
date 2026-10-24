import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import { finishOnboarding, nextOnboarding } from '@/features/onboarding/navigation';
import { useNarration } from '@/features/onboarding/useNarration';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';

export default function Welcome() {
  const { colors, typography, spacing } = useTheme();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const t = strings.onboarding;
  const narration = useNarration('tutorial.welcome', `${t.title}. ${t.intro}`);
  const skip = replay === '1' ? t.replayFinish : t.skip;
  return (
    <Screen>
      <ScreenHeader title={t.title} hideBack={replay !== '1'} announce={false} />
      <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.xl }]}>
        {t.intro}
      </Text>
      <AccessibleButton
        variant="primary"
        icon="school-outline"
        label={t.start.label}
        hint={t.start.hint}
        onPress={() => nextOnboarding('/tutorial', replay === '1')}
        testID="welcome-start"
      />
      <AccessibleButton
        icon="play-outline"
        label={t.again.label}
        hint={t.again.hint}
        onPress={narration.replay}
        testID="welcome-repeat"
      />
      <AccessibleButton
        icon="camera-outline"
        label={skip.label}
        hint={skip.hint}
        onPress={() => finishOnboarding(replay === '1')}
        testID="welcome-skip"
      />
    </Screen>
  );
}
