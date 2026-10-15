import { Text } from 'react-native';
import { router } from 'expo-router';

import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import { subjectLabel } from '@/features/framing/subject';
import { strings } from '@/i18n';
import { useSession, type SubjectTarget } from '@/store/sessionStore';
import { useTheme } from '@/theme';
import { announce, useScreenAnnouncement } from '@/utils/accessibility';

// Phase 2 is face-first. Never offer a target the detector cannot track.
const OPTIONS: SubjectTarget[] = [{ kind: 'face' }];

export default function SubjectScreen() {
  const { colors, typography, spacing } = useTheme();
  const subject = useSession((s) => s.subject);
  const setSubject = useSession((s) => s.setSubject);
  const t = strings.subject;

  useScreenAnnouncement(t.screenAnnouncement);

  const choose = (target: SubjectTarget) => {
    setSubject(target);
    announce(t.selected(subjectLabel(target)));
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
          label={subjectLabel(option)}
          hint={t.pick.hint}
          selected={subject.kind === option.kind}
          onPress={() => choose(option)}
          style={{ marginBottom: spacing.md }}
          testID={`subject-${option.kind}`}
        />
      ))}
      <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.lg }]}>{t.faceOnly}</Text>
      <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.lg }]}>{t.guidanceHelp}</Text>
      <AccessibleButton label={strings.camera.settings.label} hint={strings.camera.settings.hint} onPress={() => router.push('/settings')} testID="subject-settings" />
    </Screen>
  );
}

