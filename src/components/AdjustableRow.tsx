import { Pressable, StyleSheet, Text, type AccessibilityActionEvent } from 'react-native';

import { strings } from '@/i18n';
import { useTheme } from '@/theme';

export interface AdjustableRowProps {
  label: string;
  /** Spoken and shown value, e.g. "Standard" or "80%". */
  valueText: string;
  onIncrement: () => void;
  onDecrement: () => void;
  testID?: string;
}

/**
 * Multi-value setting. VoiceOver: swipe up/down to change. TalkBack: volume keys or swipe up/down
 * (depending on TalkBack version). Double tap always steps forward and wraps.
 */
export function AdjustableRow({
  label,
  valueText,
  onIncrement,
  onDecrement,
  testID,
}: AdjustableRowProps) {
  const { colors, typography, layout, spacing } = useTheme();

  const onAction = (e: AccessibilityActionEvent) => {
    switch (e.nativeEvent.actionName) {
      case 'increment':
        onIncrement();
        break;
      case 'decrement':
        onDecrement();
        break;
    }
  };

  return (
    <Pressable
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: valueText }}
      accessibilityHint={strings.common.doubleTapToChange}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAction}
      onPress={onIncrement}
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
          paddingVertical: spacing.sm,
          marginBottom: spacing.md,
        },
      ]}
    >
      <Text style={[typography.label, { color: colors.textPrimary }]}>{label}</Text>
      <Text style={[typography.body, { color: colors.textSecondary }]}>{valueText}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { justifyContent: 'center' },
});
