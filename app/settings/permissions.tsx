import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { router, useIsFocused } from 'expo-router';
import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import {
  getPermissionStatus,
  PERMISSION_KINDS,
  type PermissionKind,
} from '@/features/permissions/permissions';
import { useAppActive } from '@/hooks/useAppActive';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';

export default function PermissionSettings() {
  const t = strings.permissions;
  const { colors, typography, spacing } = useTheme();
  const [values, setValues] = useState<Partial<Record<PermissionKind, boolean | 'error'>>>({});
  const focused = useIsFocused(),
    active = useAppActive();
  useEffect(() => {
    if (!focused || !active) return;
    let abandoned = false;
    void Promise.all(
      PERMISSION_KINDS.map(async (kind) => {
        try {
          return [kind, (await getPermissionStatus(kind)).granted] as const;
        } catch {
          return [kind, 'error'] as const;
        }
      }),
    ).then((entries) => {
      if (!abandoned) setValues(Object.fromEntries(entries));
    });
    return () => {
      abandoned = true;
    };
  }, [focused, active]);
  return (
    <Screen>
      <ScreenHeader title={t.title} />
      <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.md }]}>
        {t.manageIntro}
      </Text>
      {PERMISSION_KINDS.map((kind) => (
        <AccessibleButton
          key={kind}
          label={t.item(
            t.names[kind],
            values[kind] === undefined
              ? t.status.unknown
              : values[kind] === 'error'
                ? t.status.unavailable
                : values[kind]
                  ? t.status.allowed
                  : t.status.off,
          )}
          hint={t.detailHint}
          onPress={() => router.push({ pathname: '/settings/permission', params: { kind } })}
          testID={`access-${kind}`}
        />
      ))}
    </Screen>
  );
}
