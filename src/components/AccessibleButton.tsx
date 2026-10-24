import {
  Animated,
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

import { cardStyle } from './cardStyle';
import { Icon, type IconName } from './Icon';
import { usePressMotion } from './usePressMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface AccessibleButtonProps {
  label: string;
  hint: string;
  onPress: () => void;
  /** Visible text. Defaults to `label`. */
  text?: string;
  /** Decorative icon shown before the text. Hidden from screen readers. */
  icon?: IconName;
  /** Short visible value on the trailing edge, e.g. "Allowed". The label must already say it. */
  trailing?: string;
  variant?: 'primary' | 'secondary';
  /** Align a destination row to the leading edge and show its navigation affordance. */
  navigation?: boolean;
  /** Icon above the text, for narrow camera corners. */
  stacked?: boolean;
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
  trailing,
  variant = 'secondary',
  navigation = false,
  stacked = false,
  role = 'button',
  selected,
  disabled,
  scheme,
  style,
  testID,
  onLongPress,
}: AccessibleButtonProps) {
  const theme = useTheme(scheme);
  const { colors, typography, layout, spacing } = theme;
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const motion = usePressMotion(!disabled);
  // A disabled primary action drops its fill so the dashed border shows it is unavailable.
  const primary = variant === 'primary' && !disabled;
  const palette = primary ? colors.primaryButton : colors.secondaryButton;
  const showText = text !== '';
  // Rows with an icon, value or chevron read left to right like an iOS list; plain buttons centre.
  const leading = showText && !stacked && (navigation || !!icon || !!trailing);
  const iconColor = primary ? palette.text : colors.accent;

  return (
    <AnimatedPressable
      accessible
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityRole={role}
      accessibilityState={{ disabled: !!disabled, selected }}
      disabled={disabled}
      focusable={!disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPressIn={() => {
        setPressed(true);
        motion.onPressIn();
      }}
      onPressOut={() => {
        setPressed(false);
        motion.onPressOut();
      }}
      onPress={onPress}
      onLongPress={onLongPress}
      testID={testID}
      hitSlop={8}
      style={[
        styles.base,
        !scheme && !primary && cardStyle(theme),
        !scheme &&
          primary &&
          theme.scheme === 'light' && {
            shadowColor: colors.accent,
            shadowOpacity: 0.22,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 3,
          },
        {
          minWidth: layout.minTouchTarget,
          minHeight: layout.minTouchTarget,
          borderRadius: layout.cornerRadius,
          borderWidth: focused ? layout.focusRingWidth : layout.buttonBorderWidth,
          backgroundColor: palette.background,
          borderColor: focused || pressed || selected ? colors.accent : palette.border,
          borderStyle: disabled ? 'dashed' : 'solid',
          transform: motion.transform,
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
        style={[styles.row, leading && styles.fullWidth, stacked && styles.stacked]}
        importantForAccessibility="no-hide-descendants"
      >
        {icon ? <Icon name={icon} color={iconColor} size={layout.iconSize} /> : null}
        {showText ? (
          <Text
            style={[
              typography.label,
              {
                color: palette.text,
                marginLeft: icon && !stacked ? spacing.md : 0,
                marginTop: icon && stacked ? spacing.xs : 0,
                flexShrink: 1,
                flex: leading ? 1 : undefined,
                textAlign: leading ? 'left' : 'center',
              },
            ]}
          >
            {text ?? label}
          </Text>
        ) : null}
        {trailing ? (
          <Text
            style={[
              typography.body,
              { color: primary ? palette.text : colors.textSecondary, marginLeft: spacing.sm },
            ]}
          >
            {trailing}
          </Text>
        ) : null}
        {selected ? (
          <View style={{ marginLeft: spacing.sm }}>
            <Icon name="checkmark-circle" color={iconColor} size={layout.iconSize} />
          </View>
        ) : null}
        {navigation ? (
          <View style={{ marginLeft: spacing.sm }}>
            <Icon
              name="chevron-forward"
              color={primary ? palette.text : colors.textSecondary}
              size={20}
            />
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
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
  fullWidth: { width: '100%' },
  stacked: { flexDirection: 'column' },
});
