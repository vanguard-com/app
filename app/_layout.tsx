import { useReducedMotion } from '@/utils/accessibility';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { applyAudioSession } from '@/audio/audioSession';
import { useCueEngineSync } from '@/cues/useCueEngineSync';
import { darkPalette, useTheme } from '@/theme';

// Settings come from MMKV synchronously, so the splash can hide as soon as the first frame renders.
SplashScreen.preventAutoHideAsync().catch(() => {});
applyAudioSession();

export default function RootLayout() {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  useCueEngineSync();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          // Gentle fade only: no fast or flashing motion.
          animation: reducedMotion ? 'none' : 'fade',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="camera"
          options={{ contentStyle: { backgroundColor: darkPalette.background } }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
