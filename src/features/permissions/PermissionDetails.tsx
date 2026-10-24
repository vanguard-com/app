import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Linking, Text } from 'react-native';
import { useIsFocused } from 'expo-router';
import { AccessibleButton, InfoCard } from '@/components';
import { cues } from '@/cues';
import { useNarration } from '@/features/onboarding/useNarration';
import { useAppActive } from '@/hooks/useAppActive';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';
import {
  getPermissionStatus,
  deferPermission,
  requestPermission,
  type PermissionKind,
  type PermissionStatus,
} from './permissions';

export function PermissionDetails({
  kind,
  onContinue,
  continueLabel,
}: {
  kind: PermissionKind;
  onContinue?: () => void;
  continueLabel?: { label: string; hint: string };
}) {
  const { colors, typography, spacing } = useTheme();
  const t = strings.permissions;
  const focused = useIsFocused(),
    active = useAppActive();
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const live = useRef(false);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useLayoutEffect(() => {
    live.current = focused && active;
  });
  const explanation = `${t.names[kind]}. ${t.reasons[kind]} ${t.optional}`;
  const narration = useNarration(`permission.${kind}.intro`, explanation, !attempted);
  useEffect(() => {
    let abandoned = false;
    if (focused && active)
      void getPermissionStatus(kind)
        .then((value) => {
          if (!abandoned) {
            setStatus(value);
            setFailed(false);
          }
        })
        .catch(() => {
          if (!abandoned) setFailed(true);
        });
    return () => {
      abandoned = true;
      controller.current?.abort();
    };
  }, [kind, focused, active]);
  const request = useCallback(async () => {
    if (controller.current || !live.current) return;
    narration.stop();
    const job = new AbortController();
    controller.current = job;
    setAttempted(true);
    setBusy(true);
    try {
      const granted = await requestPermission(kind, job.signal);
      const updated = job.signal.aborted
        ? null
        : await getPermissionStatus(kind).catch(() => ({ granted, canAskAgain: !granted }));
      if (!job.signal.aborted && live.current) {
        setStatus(updated);
        setFailed(false);
        if (granted)
          cues.say({
            id: `perm.${kind}.allowed`,
            category: 'system',
            text: t.granted,
            force: true,
          });
      }
    } catch {
      if (!job.signal.aborted && live.current) {
        setFailed(true);
        cues.say({
          id: 'perm.request.failed',
          category: 'system',
          text: t.failed,
          earcon: 'error',
          force: true,
        });
      }
    } finally {
      // iOS permission dialogs can make the app inactive before their result arrives. The
      // request stays cancelled, but a still-visible page needs the final OS status on return.
      if (job.signal.aborted && mounted.current && live.current) {
        try {
          const current = await getPermissionStatus(kind);
          if (mounted.current && live.current) setStatus(current);
        } catch {}
      }
      if (controller.current === job) controller.current = null;
      if (mounted.current) setBusy(false);
    }
  }, [kind, narration, t]);
  const openSettings = () => {
    narration.stop();
    void Linking.openSettings().catch(() =>
      cues.say({
        id: 'perm.settings.failed',
        category: 'system',
        text: t.settingsFailed,
        force: true,
      }),
    );
  };
  const next = status?.granted
    ? (continueLabel ?? strings.onboarding.next)
    : (continueLabel ?? t.skip);
  return (
    <>
      <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.md }]}>
        {explanation}
      </Text>
      <InfoCard
        live
        icon={
          failed
            ? 'alert-circle-outline'
            : !status
              ? 'help-circle-outline'
              : status.granted
                ? 'checkmark-circle'
                : 'information-circle-outline'
        }
        title={
          failed
            ? t.status.unavailable
            : !status
              ? t.status.unknown
              : status.granted
                ? t.status.allowed
                : t.deniedInfo
        }
      />
      {!status?.granted ? (
        <AccessibleButton
          icon="shield-checkmark-outline"
          label={t.allow.label}
          hint={t.allow.hint}
          onPress={() => void request()}
          disabled={busy || status?.canAskAgain === false}
          testID="permission-allow"
        />
      ) : null}
      {onContinue ? (
        <AccessibleButton
          variant="primary"
          navigation
          label={next.label}
          hint={next.hint}
          onPress={() => {
            if (!status?.granted) deferPermission(kind);
            onContinue();
          }}
          disabled={busy}
          testID="permission-next"
        />
      ) : null}
      <AccessibleButton
        icon="settings-outline"
        label={t.openSettings.label}
        hint={t.openSettings.hint}
        onPress={openSettings}
        disabled={busy}
        testID="permission-settings"
      />
      <AccessibleButton
        icon="volume-high-outline"
        label={strings.onboarding.again.label}
        hint={strings.onboarding.again.hint}
        onPress={narration.replay}
        disabled={busy}
        testID="permission-repeat"
      />
    </>
  );
}
