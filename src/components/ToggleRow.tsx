import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { useSettingFeedback } from './useSettingFeedback';

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
  const feedback = useSettingFeedback(label, stateText);
  const [focused, setFocused] = useState(false);
  const stacked = useWindowDimensions().fontScale > 1.6;

  return (
    <Pressable
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint ?? strings.common.toggleHint(value)}
      accessibilityState={{ checked: value }}
      onPress={() => {
        feedback();
        onChange(!value);
      }}
      focusable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: layout.minTouchTarget,
          minWidth: layout.minTouchTarget,
          flexDirection: stacked ? 'column' : 'row',
          alignItems: stacked ? 'stretch' : 'center',
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
      <Text
        style={[
          typography.label,
          styles.label,
          { color: colors.textPrimary, flex: stacked ? 0 : 1 },
        ]}
      >
        {label}
      </Text>
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[
          styles.state,
          { marginLeft: stacked ? 0 : spacing.md, marginTop: stacked ? spacing.sm : 0 },
        ]}
      >
        <Text style={[typography.label, { color: colors.textSecondary, marginRight: spacing.sm }]}>
          {stateText}
        </Text>
        <View
          style={[
            styles.track,
            {
              backgroundColor: value ? colors.primaryButton.background : colors.background,
              borderColor: value ? colors.accent : colors.secondaryButton.border,
              borderWidth: layout.buttonBorderWidth,
              alignItems: value ? 'flex-end' : 'flex-start',
            },
          ]}
        >
          <View
            style={[
              styles.thumb,
              { backgroundColor: value ? colors.primaryButton.text : colors.textSecondary },
            ]}
          >
            {value ? (
              <Text style={[styles.check, { color: colors.primaryButton.background }]}>✓</Text>
            ) : null}
          </View>
        </View>
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
  state: { flexDirection: 'row', alignItems: 'center' },
  track: { width: 56, height: 32, borderRadius: 16, padding: 3, justifyContent: 'center' },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
});
