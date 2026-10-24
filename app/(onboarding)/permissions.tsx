import { useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, ScreenHeader } from '@/components';
import { nextOnboarding } from '@/features/onboarding/navigation';
import { useSettings } from '@/store/settingsStore';
import { PermissionDetails } from '@/features/permissions/PermissionDetails';
import { PERMISSION_KINDS } from '@/features/permissions/permissions';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';

export default function PermissionSetup() {
  const [step, setStep] = useState(0);
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const { colors, typography, spacing } = useTheme();
  const t = strings.onboarding;
  const kind = PERMISSION_KINDS[step],
    last = step === PERMISSION_KINDS.length - 1;
  return (
    <Screen>
      <ScreenHeader
        title={strings.permissions.names[kind]}
        announce={false}
        onBack={() => (step ? setStep(step - 1) : router.back())}
      />
      <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.md }]}>
        {t.accessStep(step + 1, PERMISSION_KINDS.length)}
      </Text>
      <PermissionDetails
        key={kind}
        kind={kind}
        onContinue={() => {
          if (!last) {
            setStep(step + 1);
            return;
          }
          useSettings.getState().update({ permissionsReviewed: true });
          nextOnboarding('/practice', replay === '1');
        }}
        continueLabel={last ? t.practiceLink : undefined}
      />
    </Screen>
  );
}
