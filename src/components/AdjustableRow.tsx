import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type AccessibilityActionEvent,
} from 'react-native';
import { useState } from 'react';
import { useSettingFeedback } from './useSettingFeedback';

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
  const stacked = useWindowDimensions().fontScale > 1.6;
  const [focused, setFocused] = useState(false);
  const feedback = useSettingFeedback(label, valueText);
  const increment = () => {
    feedback();
    onIncrement();
  };
  const decrement = () => {
    feedback();
    onDecrement();
  };

  const onAction = (e: AccessibilityActionEvent) => {
    switch (e.nativeEvent.actionName) {
      case 'increment':
        increment();
        break;
      case 'decrement':
        decrement();
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
      onPress={increment}
      focusable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        {
          flexDirection: stacked ? 'column' : 'row',
          alignItems: stacked ? 'stretch' : 'center',
          minHeight: layout.minTouchTarget,
          minWidth: layout.minTouchTarget,
          borderRadius: layout.cornerRadius,
          backgroundColor: colors.surface,
          borderColor: pressed || focused ? colors.accent : colors.secondaryButton.border,
          borderWidth: focused ? layout.focusRingWidth : layout.buttonBorderWidth,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          marginBottom: spacing.md,
        },
      ]}
    >
      <Text style={[typography.label, { color: colors.textPrimary, flex: stacked ? 0 : 1 }]}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexShrink: 1,
          marginLeft: stacked ? 0 : spacing.md,
        }}
      >
        <Text style={[typography.body, { color: colors.textSecondary, flexShrink: 1 }]}>
          {valueText}
        </Text>
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[typography.heading, { color: colors.accent, marginLeft: spacing.sm }]}
        >
          ↕
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { justifyContent: 'center' },
});
