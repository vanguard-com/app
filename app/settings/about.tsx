import { useRef } from 'react';
import { Text } from 'react-native';

import { router } from 'expo-router';
import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import { APP_VERSION, DEBUG_UNLOCK_TAPS, SUPPORT_EMAIL } from '@/config/app';
import { strings } from '@/i18n';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { cues } from '@/cues';

// Taps further apart than this restart the count.
const TAP_WINDOW_MS = 1500;

export default function AboutScreen() {
  const { colors, typography, spacing } = useTheme();
  const t = strings.settings;
  const debugOverlay = useSettings((s) => s.debugOverlay);
  const update = useSettings((s) => s.update);
  const taps = useRef<{ count: number; last: number }>({ count: 0, last: 0 });

  const onVersionTap = () => {
    const now = Date.now();
    const count = now - taps.current.last > TAP_WINDOW_MS ? 1 : taps.current.count + 1;
    taps.current = { count, last: now };
    if (count >= DEBUG_UNLOCK_TAPS) {
      taps.current = { count: 0, last: 0 };
      const next = !debugOverlay;
      update({ debugOverlay: next });
      cues.say({
        id: 'sys.debug',
        category: 'system',
        text: next ? t.debugEnabled : t.debugDisabled,
        force: true,
      });
    }
  };

  return (
    <Screen>
      <ScreenHeader title={t.about.label} />
      <AccessibleButton
        icon="pulse-outline"
        label={t.version(APP_VERSION)}
        hint={t.versionHint}
        onPress={onVersionTap}
        testID="about-version"
      />
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
        {t.aboutBody}
      </Text>
      {debugOverlay ? (
        <AccessibleButton
          navigation
          icon="speedometer-outline"
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
