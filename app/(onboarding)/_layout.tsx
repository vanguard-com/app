import { useReducedMotion } from '@/utils/accessibility';
import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function OnboardingLayout() {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? 'none' : 'fade',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
