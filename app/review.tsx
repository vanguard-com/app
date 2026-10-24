import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { router, useFocusEffect, useIsFocused } from 'expo-router';

import { applyAudioSession } from '@/audio/audioSession';
import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import { cues } from '@/cues';
import { hasMicrophonePermission, hasSpeechPermission } from '@/features/permissions/permissions';
import { deleteRecording, saveToPhotos } from '@/features/recording/files';
import { shareRecording } from '@/features/recording/share';
import { recordingSummary } from '@/features/recording/summary';
import { claimSpeech } from '@/features/voice/speechLease';
import type { VoiceCommand } from '@/features/voice/commands';
import { useVoiceCommands } from '@/features/voice/useVoiceCommands';
import { useAppActive } from '@/hooks/useAppActive';
import { strings } from '@/i18n';
import { useRecordingHistory } from '@/store/recordingHistory';
import { useSession } from '@/store/sessionStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

const t = strings.review;

export default function ReviewScreen() {
  const { colors, typography, spacing } = useTheme();
  const recording = useSession((s) => s.lastRecording);
  const detailed = useSettings((s) => s.verbosity === 'detailed');
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const mounted = useRef(true);
  const live = useRef({ isFocused, appActive });
  const [speechAllowed, setSpeechAllowed] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useLayoutEffect(() => {
    live.current = { isFocused, appActive };
  });
  useEffect(() => {
    if (isFocused && appActive) void hasSpeechPermission().then(setSpeechAllowed);
  }, [isFocused, appActive]);

  useFocusEffect(
    useCallback(() => {
      applyAudioSession();
      const current = useSession.getState().lastRecording;
      cues.say({
        id: `sys.review.${current?.uri ?? 'empty'}`,
        category: 'system',
        text: current
          ? `${recordingSummary(current, useSettings.getState().verbosity === 'detailed')} ${current.savedToPhotos ? t.saved : current.autoSaveResult === 'denied' ? t.saveDenied : current.autoSaveResult === 'failed' ? t.saveFailed : t.nextSteps}`
          : t.empty,
        force: true,
      });
      return () => {
        cues.clearCategory('system');
      };
    }, []),
  );

  const save = useCallback(async () => {
    const current = useSession.getState().lastRecording;
    if (!current || operation.current) return;
    if (current.savedToPhotos) {
      cues.say({ id: 'sys.alreadySaved', category: 'system', text: t.alreadySaved, force: true });
      return;
    }
    operation.current = true;
    setBusy(true);
    try {
      const result = await saveToPhotos(current.uri);
      if (result === 'saved' && useSession.getState().lastRecording?.uri === current.uri)
        useSession.getState().markSaved();
      if (!mounted.current || !live.current.isFocused || !live.current.appActive) return;
      cues.say({
        id: `sys.save.${current.uri}.${result}`,
        category: 'system',
        text: result === 'saved' ? t.saved : result === 'denied' ? t.saveDenied : t.saveFailed,
        earcon: result === 'saved' ? 'saved' : 'error',
        haptic: result === 'saved' ? 'single' : 'double',
        force: true,
      });
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }, []);

  const share = useCallback(async () => {
    const current = useSession.getState().lastRecording;
    if (!current || operation.current) return;
    let release: () => void;
    try {
      release = claimSpeech('review.share');
    } catch {
      cues.say({ id: 'sys.review.busy', category: 'system', text: t.busy, force: true });
      return;
    }
    operation.current = true;
    setBusy(true);
    cues.clear();
    try {
      // Capture has already moved this file into app storage before Review is shown.
      const result = await shareRecording(
        current.uri,
        () => mounted.current && live.current.isFocused && live.current.appActive,
      );
      if (
        result !== 'opened' &&
        result !== 'cancelled' &&
        mounted.current &&
        live.current.isFocused &&
        live.current.appActive
      )
        cues.say({
          id: `sys.share.${result}`,
          category: 'system',
          force: true,
          earcon: 'error',
          text:
            result === 'missing'
              ? t.shareMissing
              : result === 'unavailable'
                ? t.shareUnavailable
                : t.shareFailed,
        });
    } finally {
      operation.current = false;
      setBusy(false);
      if (mounted.current && live.current.isFocused && live.current.appActive) applyAudioSession();
      release();
    }
  }, []);

  const play = useCallback((analyse = false) => {
    if (operation.current || !useSession.getState().lastRecording) return;
    router.push({ pathname: '/playback', params: { analyse: analyse ? '1' : '0' } });
  }, []);

  const retake = useCallback(() => {
    if (operation.current) return;
    const current = useSession.getState().lastRecording;
    if (current) {
      deleteRecording(current.uri);
      useRecordingHistory.getState().forget(current.uri);
    }
    useSession.getState().setLastRecording(null);
    if (router.canGoBack()) router.back();
    else router.replace('/camera');
  }, []);

  const onCommand = useCallback(
    (command: VoiceCommand) => {
      switch (command.type) {
        case 'playVideo':
          play();
          return;
        case 'analyseVoice':
          play(true);
          return;
        case 'saveVideo':
          void save();
          return;
        case 'postVideo':
          void share();
          return;
        case 'retakeVideo':
          retake();
          return;
        case 'help':
          cues.say({
            id: 'sys.help',
            category: 'system',
            text: strings.voice.help.review,
            force: true,
          });
          return;
        default:
          cues.say({
            id: 'sys.reviewOnly',
            category: 'system',
            text: strings.voice.cameraOnly,
            force: true,
          });
      }
    },
    [play, retake, save, share],
  );

  useVoiceCommands(
    isFocused &&
      appActive &&
      !busy &&
      speechAllowed &&
      hasMicrophonePermission() &&
      recording !== null,
    onCommand,
  );

  return (
    <Screen>
      <ScreenHeader title={t.title} hideBack />
      <Text style={[typography.heading, { color: colors.textPrimary, marginBottom: spacing.lg }]}>
        {recording ? recordingSummary(recording, detailed) : t.empty}
      </Text>
      {recording ? (
        <>
          <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.md }]}>
            {recording.savedToPhotos ? t.saved : t.nextSteps}
          </Text>
          <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.md }]}>
            {t.shareInfo}
          </Text>
          <AccessibleButton
            variant="primary"
            label={t.play.label}
            hint={t.play.hint}
            onPress={() => play()}
            disabled={busy}
            testID="review-play"
          />
          <AccessibleButton
            label={t.retake.label}
            hint={t.retake.hint}
            onPress={retake}
            disabled={busy}
            testID="review-retake"
          />
          <AccessibleButton
            label={recording.savedToPhotos ? t.savedLabel : t.save.label}
            hint={t.save.hint}
            onPress={() => void save()}
            disabled={busy}
            testID="review-save"
          />
          <AccessibleButton
            label={t.share.label}
            hint={t.share.hint}
            onPress={() => void share()}
            disabled={busy}
            testID="review-share"
          />
        </>
      ) : (
        <AccessibleButton
          label={t.retake.label}
          hint={t.retake.hint}
          onPress={retake}
          testID="review-retake"
        />
      )}
    </Screen>
  );
}
