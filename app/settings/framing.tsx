import { Text } from 'react-native';
import { AdjustableRow, Screen, ScreenHeader, ToggleRow } from '@/components';
import { strings } from '@/i18n';
import { nextInCycle, useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

const ZONES = [0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9] as const;

export default function FramingSettings() {
  const t = strings.settings;
  const { colors, typography, spacing } = useTheme();
  const autoLens = useSettings((s) => s.autoLens),
    zone = useSettings((s) => s.safeZone);
  const update = useSettings((s) => s.update);
  return (
    <Screen>
      <ScreenHeader title={t.framing.label} />
      <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.md }]}>
        {t.safeZone.help}
      </Text>
      <ToggleRow
        icon="camera-outline"
        label={t.autoLens.label}
        value={autoLens}
        onChange={(value) => update({ autoLens: value })}
        testID="setting-auto-lens"
      />
      <AdjustableRow
        icon="scan-outline"
        label={t.safeZone.label}
        valueText={t.safeZone.value(Math.round(zone * 100))}
        onIncrement={() => update({ safeZone: nextInCycle<number>(ZONES, zone) })}
        onDecrement={() => update({ safeZone: nextInCycle<number>(ZONES, zone, -1) })}
        testID="setting-safe-zone"
      />
    </Screen>
  );
}
