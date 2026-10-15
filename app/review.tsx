import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { router, useFocusEffect, useIsFocused } from 'expo-router';

import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import { cues } from '@/cues';
import { hasMicrophonePermission, hasSpeechPermission } from '@/features/permissions/permissions';
import { deleteRecording, saveToPhotos } from '@/features/recording/files';
import type { VoiceCommand } from '@/features/voice/commands';
import { useVoiceCommands } from '@/features/voice/useVoiceCommands';
import { useAppActive } from '@/hooks/useAppActive';
import { strings } from '@/i18n';
import { useSession } from '@/store/sessionStore';
import { useTheme } from '@/theme';
import { useScreenAnnouncement } from '@/utils/accessibility';

const t = strings.review;

// Phase 1: summary, Save and Retake. Play and Share arrive in Phase 6.
export default function ReviewScreen() {
  const { colors, typography, spacing } = useTheme();
  const recording = useSession((s) => s.lastRecording);
  const setLastRecording = useSession((s) => s.setLastRecording);
  const markSaved = useSession((s) => s.markSaved);
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const [saving, setSaving] = useState(false);
  const [speechAllowed, setSpeechAllowed] = useState(false);

  useScreenAnnouncement(t.screenAnnouncement);

  const summary = recording ? t.summary(strings.common.duration(recording.durationMs / 1000)) : '';

  useFocusEffect(
    useCallback(() => {
      const current = useSession.getState().lastRecording;
      if (!current) return;
      cues.say({
        id: `sys.review.${current.uri}`,
        category: 'system',
        text: `${t.summary(strings.common.duration(current.durationMs / 1000))} ${current.savedToPhotos ? t.saved : current.autoSaveResult === 'denied' ? t.saveDenied : current.autoSaveResult === 'failed' ? t.saveFailed : t.nextSteps}`,
      });
    }, []),
  );

  useEffect(() => {
    hasSpeechPermission().then(setSpeechAllowed);
  }, []);

  const save = useCallback(async () => {
    const current = useSession.getState().lastRecording;
    if (!current || saving) return;
    if (current.savedToPhotos) {
      cues.say({ id: 'sys.alreadySaved', category: 'system', text: t.alreadySaved, force: true });
      return;
    }
    setSaving(true);
    const result = await saveToPhotos(current.uri);
    setSaving(false);
    if (result === 'saved') {
      markSaved();
      cues.say({
        id: `sys.saved.${current.uri}`,
        category: 'system',
        text: t.saved,
        earcon: 'saved',
        haptic: 'single',
        force: true,
      });
    } else {
      cues.say({
        id: `sys.saveError.${Date.now()}`,
        category: 'system',
        text: result === 'denied' ? t.saveDenied : t.saveFailed,
        earcon: 'error',
        haptic: 'double',
        force: true,
      });
    }
  }, [markSaved, saving]);

  const retake = useCallback(() => {
    const current = useSession.getState().lastRecording;
    if (current) deleteRecording(current.uri);
    setLastRecording(null);
    if (router.canGoBack()) router.back();
    else router.replace('/camera');
  }, [setLastRecording]);

  const onCommand = useCallback(
    (command: VoiceCommand) => {
      switch (command.type) {
        case 'saveVideo':
          save();
          return;
        case 'retakeVideo':
        case 'startRecording':
          retake();
          return;
        case 'help':
          cues.say({ id: 'sys.help', category: 'system', text: strings.voice.help, force: true });
          return;
        default:
          cues.say({ id: 'sys.notYet', category: 'system', text: strings.voice.notYet });
      }
    },
    [retake, save],
  );

  useVoiceCommands(
    isFocused && appActive && speechAllowed && hasMicrophonePermission() && recording !== null,
    onCommand,
  );

  return (
    <Screen>
      {/* Retake is the way back, so the header has no separate back button. */}
      <ScreenHeader title={t.title} hideBack />
      <Text style={[typography.heading, { color: colors.textPrimary, marginBottom: spacing.xl }]}>
        {recording ? summary : t.empty}
      </Text>
      {recording ? (
        <AccessibleButton
          variant="primary"
          label={recording.savedToPhotos ? t.savedLabel : t.save.label}
          hint={t.save.hint}
          onPress={save}
          disabled={saving}
          style={{ marginBottom: spacing.md }}
          testID="review-save"
        />
      ) : null}
      <AccessibleButton
        label={t.retake.label}
        hint={t.retake.hint}
        onPress={retake}
        testID="review-retake"
      />
    </Screen>
  );
}
