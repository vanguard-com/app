import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type AccessibilityProps } from 'react-native';

import { useTheme } from '@/theme';

import { cardStyle } from './cardStyle';
import { Icon, type IconName } from './Icon';

export interface InfoCardProps {
  /** Decorative leading icon. */
  icon?: IconName;
  title?: string;
  children?: ReactNode;
  /** Announce changes (status cards). */
  live?: boolean;
  testID?: string;
}

/** Quiet grouped panel for status or help text. Read as plain text by screen readers. */
export function InfoCard({ icon, title, children, live, testID }: InfoCardProps) {
  const theme = useTheme();
  const { colors, typography, spacing, layout } = theme;
  const liveProps: AccessibilityProps = live ? { accessibilityLiveRegion: 'polite' } : {};
  return (
    <View
      style={[
        cardStyle(theme),
        styles.row,
        { padding: spacing.md, marginBottom: spacing.md, borderColor: colors.divider },
      ]}
      testID={testID}
    >
      {icon ? (
        <View style={{ marginRight: spacing.md, marginTop: 2 }}>
          <Icon name={icon} color={colors.accent} size={layout.iconSize} />
        </View>
      ) : null}
      <View style={styles.text} {...liveProps}>
        {title ? (
          <Text style={[typography.label, { color: colors.textPrimary }]}>{title}</Text>
        ) : null}
        {children ? (
          <Text
            style={[
              typography.body,
              {
                color: title ? colors.textSecondary : colors.textPrimary,
                marginTop: title ? 2 : 0,
              },
            ]}
          >
            {children}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Centred placeholder for screens with nothing to show yet. */
export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: IconName;
  title: string;
  body?: string;
}) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={[styles.empty, { paddingVertical: spacing.xl }]}>
      <View
        style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.divider }]}
      >
        <Icon name={icon} color={colors.accent} size={40} />
      </View>
      <Text
        accessibilityRole="header"
        style={[typography.heading, { color: colors.textPrimary, marginTop: spacing.md }]}
      >
        {title}
      </Text>
      {body ? (
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
          ]}
        >
          {body}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  text: { flex: 1 },
  empty: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
