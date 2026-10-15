import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, VisionCamera } from 'react-native-vision-camera';

import { applyAudioSession } from '@/audio/audioSession';
import { AccessibleButton, StatusBorder } from '@/components';
import { cues } from '@/cues';
import { subjectLabel } from '@/features/framing/subject';
import {
  ensureCameraPermission,
  ensureMicrophonePermission,
  ensureSpeechPermission,
  hasMicrophonePermission,
  hasSpeechPermission,
} from '@/features/permissions/permissions';
import { useRecorder } from '@/features/recording/useRecorder';
import type { VoiceCommand } from '@/features/voice/commands';
import { useVoiceCommands } from '@/features/voice/useVoiceCommands';
import { useAppActive } from '@/hooks/useAppActive';
import { useHardwareButton } from '@/hooks/useHardwareButton';
import { strings } from '@/i18n';
import { GUIDANCE_MODES, useSession } from '@/store/sessionStore';
import { nextInCycle, useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { useScreenAnnouncement } from '@/utils/accessibility';
import { formatClock, splitDuration } from '@/utils/time';

import { isHardwareButtonSupported } from '../modules/lumi-hardware-buttons';

const t = strings.camera;

export default function CameraScreen() {
  const { colors, typography, spacing, layout } = useTheme('dark');
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const appActive = useAppActive();

  const mode = useSession((s) => s.mode);
  const setMode = useSession((s) => s.setMode);
  const facing = useSession((s) => s.facing);
  const setFacing = useSession((s) => s.setFacing);
  const subject = useSession((s) => s.subject);
  const phase = useSession((s) => s.recordingPhase);
  const startedAt = useSession((s) => s.recordingStartedAt);
  const voiceWhileRecording = useSettings((s) => s.voiceCommandsWhileRecording);
  const elapsedInterval = useSettings((s) => s.elapsedTimeInterval);

  const [cameraAllowed, setCameraAllowed] = useState(
    () => VisionCamera.cameraPermissionStatus === 'authorized',
  );
  const [micAllowed, setMicAllowed] = useState(hasMicrophonePermission);
  const [speechAllowed, setSpeechAllowed] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const isRecording = phase === 'recording';
  const volumeButton = isHardwareButtonSupported();

  useScreenAnnouncement(t.screenAnnouncement);
  const elapsed = useElapsed(startedAt);

  // Permissions: explained by voice, asked one at a time, the first time the camera opens.
  const permissionFlowStarted = useRef(false);
  useEffect(() => {
    if (!isFocused || permissionFlowStarted.current) return;
    permissionFlowStarted.current = true;
    (async () => {
      setCameraAllowed(await ensureCameraPermission());
      const mic = await ensureMicrophonePermission();
      setMicAllowed(mic);
      if (mic) setSpeechAllowed(await ensureSpeechPermission());
    })();
  }, [isFocused]);

  // Pick up permissions changed in the phone's settings while Lumi was in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setCameraAllowed(VisionCamera.cameraPermissionStatus === 'authorized');
      setMicAllowed(hasMicrophonePermission());
      hasSpeechPermission().then(setSpeechAllowed);
    });
    return () => sub.remove();
  }, []);

  const recorder = useRecorder(micAllowed, {
    onStarted: () => {
      cues.clear('guidance');
      cues.say({
        id: `sys.rec.start.${Date.now()}`,
        category: 'system',
        text: micAllowed ? t.recordingStarted : `${t.recordingStarted}. ${t.micOff}`,
        earcon: 'start',
        haptic: 'single',
      });
    },
    onFinished: () => {
      cues.say({
        id: `sys.rec.stop.${Date.now()}`,
        category: 'system',
        text: t.recordingStopped,
        earcon: 'stop',
        haptic: 'single',
      });
      router.push('/review');
    },
    onError: (error) => {
      console.warn('Recording error', error);
      cues.say({
        id: `sys.rec.error.${Date.now()}`,
        category: 'system',
        text: t.recordFailed,
        earcon: 'error',
        haptic: 'double',
      });
    },
  });

  const toggleRecording = useCallback(() => {
    const current = useSession.getState().recordingPhase;
    if (current === 'recording') {
      recorder.stop();
    } else if (current === 'idle') {
      if (!cameraReady) {
        cues.say({ id: 'sys.notReady', category: 'system', text: t.status.notReady, force: true });
        return;
      }
      recorder.start();
    }
  }, [cameraReady, recorder]);

  const flip = useCallback(() => {
    if (useSession.getState().recordingPhase !== 'idle') {
      cues.say({ id: 'sys.notWhileRecording', category: 'system', text: t.notWhileRecording });
      return;
    }
    const next = useSession.getState().facing === 'front' ? 'back' : 'front';
    setFacing(next);
    cues.say({ id: `sys.facing.${next}`, category: 'system', text: t.facing[next], force: true });
  }, [setFacing]);

  const switchMode = () => {
    const next = nextInCycle(GUIDANCE_MODES, mode);
    setMode(next);
    cues.say({ id: `sys.mode.${next}`, category: 'system', text: t.modes[next], force: true });
  };

  const speakStatus = () => {
    const text = isRecording
      ? t.status.recording(strings.common.duration(elapsed / 1000))
      : cameraReady
        ? t.status.idle(t.facing[facing], t.modes[mode], subjectLabel(subject).toLowerCase())
        : t.status.notReady;
    cues.say({ id: 'sys.status', category: 'system', text, force: true });
  };

  const onCommand = useCallback(
    (command: VoiceCommand) => {
      const current = useSession.getState().recordingPhase;
      switch (command.type) {
        case 'startRecording':
          if (current === 'idle') toggleRecording();
          return;
        case 'stopRecording':
          if (current === 'recording') toggleRecording();
          return;
        case 'switchCamera':
          flip();
          return;
        case 'help':
          cues.say({ id: 'sys.help', category: 'system', text: strings.voice.help, force: true });
          return;
        default:
          cues.say({ id: 'sys.notYet', category: 'system', text: strings.voice.notYet });
      }
    },
    [flip, toggleRecording],
  );

  const screenLive = isFocused && appActive;
  useHardwareButton(screenLive && cameraReady, toggleRecording);
  useVoiceCommands(
    screenLive &&
      micAllowed &&
      speechAllowed &&
      (phase === 'idle' || (voiceWhileRecording && isRecording)),
    onCommand,
  );

  // Never leave a recording running in the background or behind another screen.
  useEffect(() => {
    if (!screenLive && useSession.getState().recordingPhase === 'recording') recorder.stop();
  }, [screenLive, recorder]);

  // Spoken elapsed time while recording (Settings > Camera and recording).
  useEffect(() => {
    if (startedAt === null || elapsedInterval === 0) return;
    let announced = 0;
    const id = setInterval(() => {
      const count = Math.floor((Date.now() - startedAt) / 1000 / elapsedInterval);
      if (count > announced) {
        announced = count;
        cues.say({
          id: `sys.elapsed.${count}`,
          category: 'system',
          text: t.elapsed(strings.common.duration(count * elapsedInterval)),
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt, elapsedInterval]);

  const edge = {
    top: insets.top + spacing.md,
    bottom: insets.bottom + spacing.md,
    left: insets.left + spacing.md,
    right: insets.right + spacing.md,
  };
  const { minutes, seconds } = splitDuration(elapsed);
  const recordHint = [isRecording ? t.record.stopHint : t.record.idleHint]
    .concat(volumeButton ? [t.record.volumeHint] : [])
    .join('. ');
  const centreMessage = !cameraAllowed
    ? strings.permissions.camera.screenText
    : !cameraReady
      ? t.starting
      : null;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      {cameraAllowed ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={facing}
          isActive={screenLive}
          outputs={recorder.outputs}
          onConfigured={recorder.onConfigured}
          onStarted={() => {
            setCameraReady(true);
            applyAudioSession();
          }}
          onStopped={() => setCameraReady(false)}
          onError={(error) => console.warn('Camera error', error)}
          onInterruptionStarted={() => {
            if (useSession.getState().recordingPhase === 'recording') {
              recorder.stop();
              cues.say({ id: 'sys.interrupted', category: 'system', text: t.interrupted });
            }
          }}
          allowHapticsAndSystemSoundsPlayback
          resizeMode="cover"
        />
      ) : null}

      {/* Top row: Settings (top left), timer, Flip (top right). Rendered first for screen reader order. */}
      <View style={[styles.corner, styles.layerControls, { top: edge.top, left: edge.left }]}>
        <AccessibleButton
          scheme="dark"
          label={t.settings.label}
          hint={t.settings.hint}
          icon="⚙"
          text=""
          onPress={() => router.push('/settings')}
          disabled={phase !== 'idle'}
          testID="camera-settings"
        />
      </View>

      {isRecording ? (
        <View
          style={[
            styles.timer,
            styles.layerControls,
            {
              top: edge.top,
              backgroundColor: colors.surfaceOverlay,
              borderRadius: layout.cornerRadius,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            },
          ]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={t.timerLabel(strings.common.duration(minutes * 60 + seconds))}
        >
          <Text style={[typography.timer, { color: colors.textPrimary }]}>
            {`● ${formatClock(elapsed)}`}
          </Text>
        </View>
      ) : null}

      <View style={[styles.corner, styles.layerControls, { top: edge.top, right: edge.right }]}>
        <AccessibleButton
          scheme="dark"
          label={t.flip.label}
          hint={t.flip.hint}
          icon="⟲"
          text=""
          onPress={flip}
          testID="camera-flip"
        />
      </View>

      {/* Centre: full screen camera area. Single tap speaks current status. */}
      <Pressable
        style={[StyleSheet.absoluteFill, styles.layerPreview, styles.center]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={t.preview.label}
        accessibilityHint={t.preview.hint}
        onPress={speakStatus}
        testID="camera-preview"
      >
        {centreMessage ? (
          <View
            style={{
              backgroundColor: colors.surfaceOverlay,
              borderRadius: layout.cornerRadius,
              padding: spacing.md,
              marginHorizontal: spacing.xl,
            }}
          >
            <Text style={[typography.body, styles.centerText, { color: colors.textPrimary }]}>
              {centreMessage}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {!cameraAllowed ? (
        <View style={[styles.settingsLink, styles.layerControls]} pointerEvents="box-none">
          <AccessibleButton
            scheme="dark"
            label={strings.permissions.openSettings.label}
            hint={strings.permissions.openSettings.hint}
            onPress={() => {
              Linking.openSettings().catch(() => {});
            }}
            testID="camera-open-settings"
          />
        </View>
      ) : null}

      <StatusBorder status={null} />

      {/* Bottom row: Mode (bottom left), Record (bottom centre), Subject (bottom right). */}
      <View style={[styles.corner, styles.layerControls, { bottom: edge.bottom, left: edge.left }]}>
        <AccessibleButton
          scheme="dark"
          label={t.mode.label(t.modes[mode])}
          hint={t.mode.hint}
          text={t.modes[mode]}
          onPress={switchMode}
          testID="camera-mode"
        />
      </View>

      <View
        style={[styles.recordWrap, styles.layerControls, { bottom: edge.bottom }]}
        pointerEvents="box-none"
      >
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={isRecording ? t.record.stopLabel : t.record.idleLabel}
          accessibilityHint={recordHint}
          accessibilityState={{ selected: isRecording, busy: phase === 'starting' }}
          onPress={toggleRecording}
          testID="camera-record"
          style={({ pressed }) => [
            styles.center,
            {
              width: layout.recordButtonSize,
              height: layout.recordButtonSize,
              borderRadius: layout.recordButtonSize / 2,
              backgroundColor: colors.primaryButton.background,
              borderWidth: layout.focusRingWidth,
              borderColor: pressed ? colors.textPrimary : colors.primaryButton.border,
            },
          ]}
        >
          {/* Shape, not only colour, shows state: circle = ready, square = recording. */}
          <View
            style={{
              width: isRecording ? 32 : 40,
              height: isRecording ? 32 : 40,
              borderRadius: isRecording ? 6 : 20,
              backgroundColor: colors.primaryButton.text,
            }}
          />
        </Pressable>
      </View>

      <View
        style={[styles.corner, styles.layerControls, { bottom: edge.bottom, right: edge.right }]}
      >
        <AccessibleButton
          scheme="dark"
          label={t.subject.label(subjectLabel(subject))}
          hint={t.subject.hint}
          text={subjectLabel(subject)}
          onPress={() => router.push('/subject')}
          disabled={phase !== 'idle'}
          testID="camera-subject"
        />
      </View>
    </View>
  );
}

function useElapsed(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  // `now` can be a moment older than `startedAt` until the first tick; clamp to 0.
  return startedAt === null ? 0 : Math.max(0, now - startedAt);
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  corner: { position: 'absolute' },
  timer: { position: 'absolute', alignSelf: 'center' },
  recordWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  settingsLink: { position: 'absolute', left: 0, right: 0, top: '60%', alignItems: 'center' },
  layerPreview: { zIndex: 1 },
  layerControls: { zIndex: 2 },
});
