import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { darkPalette, useTheme } from '@/theme';

// Settings come from MMKV synchronously, so the splash can hide as soon as the first frame renders.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { colors } = useTheme();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          // Gentle fade only: no fast or flashing motion.
          animation: 'fade',
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
