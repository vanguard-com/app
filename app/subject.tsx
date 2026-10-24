import { Text } from 'react-native';
import { router } from 'expo-router';

import { AccessibleButton, InfoCard, Screen, ScreenHeader } from '@/components';
import { subjectLabel } from '@/features/framing/subject';
import { strings } from '@/i18n';
import { useSession, type SubjectTarget } from '@/store/sessionStore';
import { useTheme } from '@/theme';
import { cues } from '@/cues';

// Phase 2 is face-first. Never offer a target the detector cannot track.
const OPTIONS: SubjectTarget[] = [{ kind: 'face' }];

export default function SubjectScreen() {
  const { colors, typography, spacing } = useTheme();
  const subject = useSession((s) => s.subject);
  const setSubject = useSession((s) => s.setSubject);
  const t = strings.subject;

  const choose = (target: SubjectTarget) => {
    setSubject(target);
    cues.say({
      id: 'sys.subject.selected',
      category: 'system',
      text: t.selected(subjectLabel(target)),
      force: true,
    });
    router.back();
  };

  return (
    <Screen>
      <ScreenHeader title={t.title} />
      <Text style={[typography.heading, { color: colors.textPrimary, marginBottom: spacing.lg }]}>
        {t.prompt}
      </Text>
      {OPTIONS.map((option) => (
        <AccessibleButton
          key={option.kind}
          icon="person-outline"
          label={subjectLabel(option)}
          hint={t.pick.hint}
          selected={subject.kind === option.kind}
          onPress={() => choose(option)}
          style={{ marginBottom: spacing.md }}
          testID={`subject-${option.kind}`}
        />
      ))}
      <InfoCard icon="information-circle-outline">{t.faceOnly}</InfoCard>
      <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.lg }]}>
        {t.guidanceHelp}
      </Text>
      <AccessibleButton
        navigation
        icon="settings-outline"
        label={strings.camera.settings.label}
        hint={strings.camera.settings.hint}
        onPress={() => router.push('/settings')}
        testID="subject-settings"
      />
    </Screen>
  );
}
