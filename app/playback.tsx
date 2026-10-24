import { useCallback, useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { VideoView } from 'expo-video';

import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import { cues } from '@/cues';
import { useRecordedVoice } from '@/features/feedback/useRecordedVoice';
import { hasMicrophonePermission, hasSpeechPermission } from '@/features/permissions/permissions';
import { usePlayback } from '@/features/recording/usePlayback';
import type { VoiceCommand } from '@/features/voice/commands';
import { useVoiceCommands } from '@/features/voice/useVoiceCommands';
import { useAppActive } from '@/hooks/useAppActive';
import { strings } from '@/i18n';
import { useSession } from '@/store/sessionStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

const t = strings.playback;

export default function PlaybackScreen() {
  const { colors, typography, spacing } = useTheme();
  const recording = useSession((s) => s.lastRecording);
  const feedbackEnabled = useSettings((s) => s.liveFeedback && s.feedback.voice);
  const detailed = useSettings((s) => s.verbosity === 'detailed');
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const active = isFocused && appActive;
  const { analyse } = useLocalSearchParams<{ analyse?: string }>();
  const playback = usePlayback(recording?.uri, active);
  const voice = useRecordedVoice(recording, active && !playback.playing, feedbackEnabled);
  const [speechAllowed, setSpeechAllowed] = useState(false);
  const initialAction = useRef(false);
  useEffect(() => {
    if (active) void hasSpeechPermission().then(setSpeechAllowed);
  }, [active]);

  const analyseVoice = useCallback(() => {
    if (!feedbackEnabled || !recording?.hasAudio) {
      cues.say({ id: 'sys.analysis.off', category: 'system', text: t.analysisOff, force: true });
      return;
    }
    if (!playback.playing) void voice.start();
  }, [feedbackEnabled, recording?.hasAudio, playback.playing, voice]);

  useEffect(() => {
    if (!active || initialAction.current || !recording) return;
    // Let effect cleanup cancel an uncommitted launch (including Strict Mode's replay).
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled || initialAction.current) return;
      initialAction.current = true;
      if (analyse === '1') analyseVoice();
      else playback.play();
    });
    return () => {
      cancelled = true;
    };
  }, [active, analyse, analyseVoice, playback, recording]);

  const onCommand = useCallback(
    (command: VoiceCommand) => {
      switch (command.type) {
        case 'playVideo':
          if (!voice.busy) playback.play();
          return;
        case 'restartVideo':
          if (!voice.busy) playback.play(true);
          return;
        case 'pauseVideo':
          playback.pause();
          return;
        case 'analyseVoice':
          analyseVoice();
          return;
        case 'cancelVoiceAnalysis':
          voice.cancel();
          return;
        case 'help':
          cues.say({
            id: 'sys.help',
            category: 'system',
            text: strings.voice.help.playback,
            force: true,
          });
          return;
        default:
          cues.say({
            id: 'sys.playback.review',
            category: 'system',
            text: t.reviewOnly,
            force: true,
          });
      }
    },
    [analyseVoice, playback, voice],
  );
  useVoiceCommands(
    active &&
      !playback.playing &&
      !voice.busy &&
      speechAllowed &&
      hasMicrophonePermission() &&
      !!recording,
    onCommand,
  );

  const back = () => {
    playback.pause();
    voice.cancel();
    if (router.canGoBack()) router.back();
    else router.replace('/review');
  };
  return (
    <Screen>
      <ScreenHeader title={t.title} onBack={back} />
      {recording ? (
        <>
          <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.md }]}>
            {t.screenAnnouncement}
          </Text>
          <VideoView
            player={playback.player}
            nativeControls={false}
            contentFit="contain"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            allowsPictureInPicture={false}
            style={{
              width: '100%',
              aspectRatio: 16 / 9,
              backgroundColor: colors.surface,
              marginBottom: spacing.md,
            }}
          />
          <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.md }]}>
            {playback.failed
              ? t.failed
              : t.position(
                  strings.common.duration(playback.position),
                  strings.common.duration(recording.durationMs / 1000),
                )}
          </Text>
          <AccessibleButton
            variant="primary"
            label={playback.playing ? t.pause.label : t.play.label}
            hint={playback.playing ? t.pause.hint : t.play.hint}
            onPress={() => (playback.playing ? playback.pause() : playback.play())}
            disabled={voice.busy || playback.failed}
            testID="playback-toggle"
          />
          <AccessibleButton
            label={t.restart.label}
            hint={t.restart.hint}
            onPress={() => playback.play(true)}
            disabled={voice.busy || playback.failed}
            testID="playback-restart"
          />
          {recording.hasAudio && feedbackEnabled ? (
            <AccessibleButton
              label={
                voice.busy
                  ? strings.feedback.cancelVoice.label
                  : strings.feedback.analyseVoice.label
              }
              hint={
                voice.busy ? strings.feedback.cancelVoice.hint : strings.feedback.analyseVoice.hint
              }
              onPress={() => (voice.busy ? voice.cancel() : analyseVoice())}
              disabled={playback.playing}
              testID="playback-voice"
            />
          ) : null}
          {voice.busy ? (
            <Text
              style={[typography.body, { color: colors.textPrimary }]}
              accessibilityLiveRegion="polite"
            >
              {strings.feedback.progress(voice.progress)}
            </Text>
          ) : null}
          {recording.voiceSummary ? (
            <Text style={[typography.body, { color: colors.textPrimary }]}>
              {strings.feedback.voiceSummary(recording.voiceSummary, detailed)}
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={[typography.body, { color: colors.textPrimary }]}>{strings.review.empty}</Text>
      )}
    </Screen>
  );
}
