import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { useSettingFeedback } from './useSettingFeedback';

import { strings } from '@/i18n';
import { useTheme } from '@/theme';

import { cardStyle } from './cardStyle';
import { Icon, type IconName } from './Icon';
import { usePressMotion, useToggleProgress } from './usePressMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const TRACK_WIDTH = 56;
const TRACK_HEIGHT = 32;
const KNOB = 26;
const KNOB_TRAVEL = TRACK_WIDTH - KNOB - 6;

export interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
  /** Decorative leading icon. */
  icon?: IconName;
  testID?: string;
}

/** Large on/off switch. Screen readers hear "<label>, switch, on/off". */
export function ToggleRow({ label, value, onChange, hint, icon, testID }: ToggleRowProps) {
  const theme = useTheme();
  const { colors, typography, layout, spacing } = theme;
  const stateText = value ? strings.common.on : strings.common.off;
  const feedback = useSettingFeedback(label, stateText);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const stacked = useWindowDimensions().fontScale > 1.6;
  const motion = usePressMotion();
  const progress = useToggleProgress(value);

  return (
    <AnimatedPressable
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint ?? strings.common.toggleHint(value)}
      accessibilityState={{ checked: value }}
      onPressIn={() => {
        setPressed(true);
        motion.onPressIn();
      }}
      onPressOut={() => {
        setPressed(false);
        motion.onPressOut();
      }}
      onPress={() => {
        feedback();
        onChange(!value);
      }}
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
          flexDirection: stacked ? 'column' : 'row',
          alignItems: stacked ? 'stretch' : 'center',
          borderColor: pressed || focused ? colors.accent : colors.secondaryButton.border,
          borderWidth: focused ? layout.focusRingWidth : layout.buttonBorderWidth,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          marginBottom: spacing.md,
          transform: motion.transform,
        },
      ]}
    >
      <View style={[styles.labelRow, { flex: stacked ? 0 : 1 }]}>
        {icon ? (
          <View style={{ marginRight: spacing.md }}>
            <Icon name={icon} color={colors.accent} size={layout.iconSize} />
          </View>
        ) : null}
        <Text style={[typography.label, styles.label, { color: colors.textPrimary }]}>{label}</Text>
      </View>
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[
          styles.state,
          { marginLeft: stacked ? 0 : spacing.md, marginTop: stacked ? spacing.sm : 0 },
        ]}
      >
        <View
          style={[
            styles.track,
            {
              backgroundColor: value ? colors.accent : colors.background,
              borderColor: value ? colors.accent : colors.secondaryButton.border,
              borderWidth: layout.buttonBorderWidth,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.knob,
              {
                backgroundColor: colors.knob,
                borderColor: value ? colors.accent : colors.secondaryButton.border,
                shadowColor: colors.shadow,
                transform: [
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, KNOB_TRAVEL],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, marginLeft: spacing.sm, minWidth: 28 },
          ]}
        >
          {stateText}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1, flexWrap: 'wrap' },
  state: { flexDirection: 'row', alignItems: 'center' },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    padding: 1.5,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    borderWidth: 1,
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
