import { useRef } from 'react';
import { Pressable, Text } from 'react-native';

import { router } from 'expo-router';
import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import { APP_VERSION, DEBUG_UNLOCK_TAPS, SUPPORT_EMAIL } from '@/config/app';
import { strings } from '@/i18n';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { announce, useScreenAnnouncement } from '@/utils/accessibility';

// Taps further apart than this restart the count.
const TAP_WINDOW_MS = 1500;

export default function AboutScreen() {
  const { colors, typography, spacing, layout } = useTheme();
  const t = strings.settings;
  const debugOverlay = useSettings((s) => s.debugOverlay);
  const update = useSettings((s) => s.update);
  const taps = useRef<{ count: number; last: number }>({ count: 0, last: 0 });

  useScreenAnnouncement(t.about.label);

  const onVersionTap = () => {
    const now = Date.now();
    const count = now - taps.current.last > TAP_WINDOW_MS ? 1 : taps.current.count + 1;
    taps.current = { count, last: now };
    if (count >= DEBUG_UNLOCK_TAPS) {
      taps.current = { count: 0, last: 0 };
      const next = !debugOverlay;
      update({ debugOverlay: next });
      announce(next ? t.debugEnabled : t.debugDisabled);
    }
  };

  return (
    <Screen>
      <ScreenHeader title={t.about.label} />
      <Pressable
        accessibilityRole="text"
        accessibilityLabel={t.version(APP_VERSION)}
        onPress={onVersionTap}
        style={{ minHeight: layout.minTouchTarget, justifyContent: 'center' }}
        testID="about-version"
      >
        <Text style={[typography.label, { color: colors.textPrimary }]}>
          {t.version(APP_VERSION)}
        </Text>
      </Pressable>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
        {t.aboutBody}
      </Text>
      {debugOverlay ? (
        <AccessibleButton
          label={strings.background.benchmark.label}
          hint={strings.background.benchmark.hint}
          onPress={() => router.push('/benchmark')}
        />
      ) : null}
      <Text
        selectable
        style={[typography.body, { color: colors.textPrimary, marginTop: spacing.md }]}
      >
        {t.contact(SUPPORT_EMAIL)}
      </Text>
    </Screen>
  );
}
