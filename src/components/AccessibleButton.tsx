import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useState } from 'react';

import { useTheme, type ColorScheme } from '@/theme';

export interface AccessibleButtonProps {
  label: string;
  hint: string;
  onPress: () => void;
  /** Visible text. Defaults to `label`. */
  text?: string;
  /** Decorative glyph shown before the text. Hidden from screen readers. */
  icon?: string;
  variant?: 'primary' | 'secondary';
  /** Align a destination row to the leading edge and show its navigation affordance. */
  navigation?: boolean;
  role?: AccessibilityRole;
  selected?: boolean;
  disabled?: boolean;
  /** Force a colour scheme (camera screen passes 'dark'). */
  scheme?: ColorScheme;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  onLongPress?: () => void;
}

export function AccessibleButton({
  label,
  hint,
  onPress,
  text,
  icon,
  variant = 'secondary',
  navigation = false,
  role = 'button',
  selected,
  disabled,
  scheme,
  style,
  testID,
  onLongPress,
}: AccessibleButtonProps) {
  const { colors, typography, layout, spacing } = useTheme(scheme);
  const [focused, setFocused] = useState(false);
  const palette = variant === 'primary' ? colors.primaryButton : colors.secondaryButton;

  return (
    <Pressable
      accessible
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityRole={role}
      accessibilityState={{ disabled: !!disabled, selected }}
      disabled={disabled}
      focusable={!disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      onLongPress={onLongPress}
      testID={testID}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          minWidth: layout.minTouchTarget,
          minHeight: layout.minTouchTarget,
          borderRadius: layout.cornerRadius,
          borderWidth: focused ? layout.focusRingWidth : layout.buttonBorderWidth,
          backgroundColor: palette.background,
          borderColor: focused || pressed || selected ? colors.accent : palette.border,
          borderStyle: disabled ? 'dashed' : 'solid',
          transform: [{ scale: pressed ? 0.98 : 1 }],
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          // Stacked buttons on normal screens need a visible gap. Camera controls (scheme set) are
          // placed absolutely, so they get none.
          marginBottom: scheme ? 0 : spacing.md,
        },
        style,
      ]}
    >
      <View
        style={[styles.row, navigation && { width: '100%' }]}
        importantForAccessibility="no-hide-descendants"
      >
        {icon ? (
          <Text
            style={[
              typography.heading,
              {
                color: variant === 'primary' ? palette.text : colors.accent,
                minWidth: navigation ? 28 : undefined,
                textAlign: 'center',
              },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {icon}
          </Text>
        ) : null}
        {text !== '' ? (
          <Text
            style={[
              typography.label,
              {
                color: palette.text,
                marginLeft: icon ? spacing.sm : 0,
                flexShrink: 1,
                flex: navigation ? 1 : undefined,
                textAlign: navigation ? 'left' : 'center',
              },
            ]}
          >
            {text ?? label}
          </Text>
        ) : null}
        {selected ? (
          <Text style={[typography.label, { color: palette.text, marginLeft: spacing.sm }]}>✓</Text>
        ) : null}
        {navigation ? (
          <Text style={[typography.heading, { color: palette.text, marginLeft: spacing.sm }]}>
            ›
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
});
