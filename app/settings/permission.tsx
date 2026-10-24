import { useLocalSearchParams } from 'expo-router';
import { Screen, ScreenHeader } from '@/components';
import { PermissionDetails } from '@/features/permissions/PermissionDetails';
import { PERMISSION_KINDS } from '@/features/permissions/permissions';
import { strings } from '@/i18n';

export default function PermissionSetting() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = PERMISSION_KINDS.find((value) => value === params.kind) ?? 'camera';
  return (
    <Screen>
      <ScreenHeader title={strings.permissions.names[kind]} announce={false} />
      <PermissionDetails key={kind} kind={kind} />
    </Screen>
  );
}
