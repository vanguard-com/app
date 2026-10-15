import { Pressable, StyleSheet, Text, View } from 'react-native';

import { strings } from '@/i18n';
import { useTheme } from '@/theme';

export interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
  testID?: string;
}

/** Large on/off switch. Screen readers hear "<label>, switch, on/off". */
export function ToggleRow({ label, value, onChange, hint, testID }: ToggleRowProps) {
  const { colors, typography, layout, spacing } = useTheme();
  const stateText = value ? strings.common.on : strings.common.off;

  return (
    <Pressable
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint ?? strings.common.toggleHint(value)}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: layout.minTouchTarget,
          borderRadius: layout.cornerRadius,
          backgroundColor: colors.surface,
          borderColor: pressed ? colors.accent : colors.secondaryButton.border,
          borderWidth: pressed ? layout.focusRingWidth : layout.buttonBorderWidth,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.md,
        },
      ]}
    >
      <Text style={[typography.label, styles.label, { color: colors.textPrimary }]}>{label}</Text>
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[
          styles.pill,
          {
            borderColor: value ? colors.good : colors.textSecondary,
            borderStyle: value ? 'solid' : 'dashed',
            borderWidth: layout.buttonBorderWidth,
            borderRadius: layout.cornerRadius,
            paddingHorizontal: spacing.sm,
          },
        ]}
      >
        <Text style={[typography.label, { color: colors.textPrimary }]}>
          {value ? `✓ ${stateText}` : stateText}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { flex: 1, flexWrap: 'wrap' },
  pill: { minWidth: 72, alignItems: 'center' },
});
