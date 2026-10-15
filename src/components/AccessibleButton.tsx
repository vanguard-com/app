import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

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
  role = 'button',
  selected,
  disabled,
  scheme,
  style,
  testID,
  onLongPress,
}: AccessibleButtonProps) {
  const { colors, typography, layout, spacing } = useTheme(scheme);
  const palette = variant === 'primary' ? colors.primaryButton : colors.secondaryButton;

  return (
    <Pressable
      accessible
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityRole={role}
      accessibilityState={{ disabled: !!disabled, selected }}
      disabled={disabled}
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
          borderWidth: pressed || selected ? layout.focusRingWidth : layout.buttonBorderWidth,
          backgroundColor: palette.background,
          borderColor: pressed || selected ? colors.accent : palette.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <View style={styles.row} importantForAccessibility="no-hide-descendants">
        {icon ? (
          <Text
            style={[typography.heading, { color: palette.text }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {icon}
          </Text>
        ) : null}
        {text !== '' ? (
          <Text
            style={[typography.label, { color: palette.text, marginLeft: icon ? spacing.sm : 0 }]}
          >
            {text ?? label}
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
