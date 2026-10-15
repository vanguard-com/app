import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/theme';

/** Standard non-camera screen: safe area, themed background, scrolls when text is large. */
export function Screen({ children }: { children: ReactNode }) {
  const { colors, spacing, scheme } = useTheme();
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        style={styles.fill}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
