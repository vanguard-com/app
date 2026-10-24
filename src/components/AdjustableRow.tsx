import {
  Animated,
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

import { cardStyle } from './cardStyle';
import { Icon, type IconName } from './Icon';
import { usePressMotion } from './usePressMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface AdjustableRowProps {
  label: string;
  /** Spoken and shown value, e.g. "Standard" or "80%". */
  valueText: string;
  onIncrement: () => void;
  onDecrement: () => void;
  /** Decorative leading icon. */
  icon?: IconName;
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
  icon,
  testID,
}: AdjustableRowProps) {
  const theme = useTheme();
  const { colors, typography, layout, spacing } = theme;
  const stacked = useWindowDimensions().fontScale > 1.6;
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const motion = usePressMotion();
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
    <AnimatedPressable
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: valueText }}
      accessibilityHint={strings.common.doubleTapToChange}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAction}
      onPressIn={() => {
        setPressed(true);
        motion.onPressIn();
      }}
      onPressOut={() => {
        setPressed(false);
        motion.onPressOut();
      }}
      onPress={increment}
      focusable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testID}
      style={[
        styles.row,
        cardStyle(theme),
        {
          minHeight: layout.minTouchTarget,
          minWidth: layout.minTouchTarget,
          borderColor: pressed || focused ? colors.accent : colors.secondaryButton.border,
          borderWidth: focused ? layout.focusRingWidth : layout.buttonBorderWidth,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          marginBottom: spacing.md,
          transform: motion.transform,
        },
      ]}
    >
      {icon ? (
        <View style={{ marginRight: spacing.md }}>
          <Icon name={icon} color={colors.accent} size={layout.iconSize} />
        </View>
      ) : null}
      <View
        style={[
          styles.text,
          stacked ? null : { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
        ]}
      >
        <Text style={[typography.label, { color: colors.textPrimary, flexShrink: 1 }]}>
          {label}
        </Text>
        <Text
          style={[
            typography.body,
            {
              color: colors.textSecondary,
              flexShrink: 1,
              marginLeft: stacked ? 0 : 'auto',
              paddingLeft: stacked ? 0 : spacing.sm,
            },
          ]}
        >
          {valueText}
        </Text>
      </View>
      <View style={{ marginLeft: spacing.sm }}>
        <Icon name="chevron-expand" color={colors.accent} size={22} />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
});
