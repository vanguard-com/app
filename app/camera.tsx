import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, VisionCamera, useCameraDevice, type CameraRef } from 'react-native-vision-camera';

import { applyAudioSession } from '@/audio/audioSession';
import { AccessibleButton, StatusBorder } from '@/components';
import { cues } from '@/cues';
import { subjectLabel } from '@/features/framing/subject';
import { useFraming } from '@/features/framing/useFraming';
import { useLighting } from '@/features/lighting/useLighting';
import { useLightScan } from '@/features/lighting/useLightScan';
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
import { useSession } from '@/store/sessionStore';
import { useSettings } from '@/store/settingsStore';
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
  const device = useCameraDevice(
    facing,
    facing === 'back' ? { physicalDevices: ['wide-angle', 'ultra-wide-angle'] } : undefined,
  );
  const cameraRef = useRef<CameraRef>(null);
  const initializedDevice = useRef<string | null>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
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
  const debugOverlay = useSettings((s) => s.debugOverlay);
  const screenLive = isFocused && appActive;
  const framing = useFraming(
    cameraRef,
    facing,
    screenLive && cameraAllowed && cameraReady && subject.kind === 'face' && mode === 'framing',
    previewSize,
  );
  const lightingActive = screenLive && cameraAllowed && cameraReady && mode === 'lighting';
  const scan = useLightScan(lightingActive, phase === 'idle');
  const lighting = useLighting(
    cameraRef,
    lightingActive,
    previewSize,
    facing,
    scan.sample,
    !scan.running,
  );
  const scanRequested = useRef(false);
  const startScan = scan.start;
  const cancelScan = scan.cancel;
  const speakLightingStatus = lighting.speakStatus;
  useEffect(() => {
    if (!screenLive || phase !== 'idle' || mode !== 'lighting') scanRequested.current = false;
  }, [screenLive, phase, mode]);
  useEffect(() => {
    if (mode === 'lighting' && lightingActive && scanRequested.current) {
      scanRequested.current = false;
      void startScan();
    }
  }, [mode, lightingActive, startScan]);
  const beginScan = useCallback(() => {
    if (!screenLive || !cameraReady || phase !== 'idle') {
      cues.say({
        id: 'lighting.scan.busy',
        category: 'system',
        text: strings.lighting.scanIdleOnly,
        force: true,
      });
      return;
    }
    if (mode === 'lighting') void startScan();
    else {
      scanRequested.current = true;
      setMode('lighting');
    }
  }, [screenLive, cameraReady, phase, mode, startScan, setMode]);
  const lightingText =
    scan.result.phase === 'scanning'
      ? strings.lighting.scanning(scan.result.progress)
      : scan.result.phase === 'guiding'
        ? strings.lighting.scanTurn(
            scan.result.turn < 0 ? 'left' : 'right',
            Math.round(Math.abs(scan.result.turn)),
          )
        : strings.lighting.states[lighting.result.state];
  const guidanceText = mode === 'lighting' ? lightingText : framing.statusText;
  const guidanceStatus =
    mode === 'lighting'
      ? lighting.result.state === 'good' && !scan.running
        ? 'good'
        : 'adjust'
      : framing.result.status;

  useEffect(() => {
    setMode('framing');
  }, [setMode]);

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
      cameraRef.current?.cancelZoomAnimation();
      recorder.start();
    }
  }, [cameraReady, recorder]);

  const flip = useCallback(() => {
    if (useSession.getState().recordingPhase !== 'idle') {
      cues.say({ id: 'sys.notWhileRecording', category: 'system', text: t.notWhileRecording });
      return;
    }
    scanRequested.current = false;
    const next = useSession.getState().facing === 'front' ? 'back' : 'front';
    setCameraReady(false);
    setFacing(next);
    cues.say({ id: `sys.facing.${next}`, category: 'system', text: t.facing[next], force: true });
  }, [setFacing]);

  const speakStatus = () => {
    const text = isRecording
      ? t.status.recording(strings.common.duration(elapsed / 1000))
      : cameraReady
        ? t.status.idle(t.facing[facing], t.modes[mode], subjectLabel(subject).toLowerCase())
        : t.status.notReady;
    cues.say({
      id: 'sys.status',
      category: 'system',
      text: `${text} ${guidanceText}`,
      force: true,
    });
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
        case 'focusOn':
          if (/^(my )?face$/.test(command.subject)) {
            useSession.getState().setSubject({ kind: 'face' });
            cues.say({
              id: 'sys.faceSelected',
              category: 'system',
              text: strings.subject.selected(strings.subject.options.face),
              force: true,
            });
          } else {
            cues.say({
              id: 'sys.faceOnly',
              category: 'system',
              text: strings.subject.faceOnly,
              force: true,
            });
          }
          return;
        case 'checkLighting':
          if (current !== 'idle' && useSession.getState().mode !== 'lighting') {
            cues.say({
              id: 'sys.notWhileRecording',
              category: 'system',
              text: t.notWhileRecording,
            });
            return;
          }
          setMode('lighting');
          speakLightingStatus();
          return;
        case 'cancelLightScan':
          scanRequested.current = false;
          cancelScan();
          return;
        case 'findLight':
          beginScan();
          return;
        case 'help':
          cues.say({ id: 'sys.help', category: 'system', text: strings.voice.help, force: true });
          return;
        default:
          cues.say({ id: 'sys.notYet', category: 'system', text: strings.voice.notYet });
      }
    },
    [flip, toggleRecording, setMode, speakLightingStatus, beginScan, cancelScan],
  );

  const outputs = useMemo(
    () => [
      ...recorder.outputs,
      ...(subject.kind === 'face' && mode === 'framing' ? [framing.output] : []),
      ...(mode === 'lighting' ? [lighting.output] : []),
    ],
    [recorder.outputs, framing.output, subject.kind, mode, lighting.output],
  );
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

      {cameraAllowed && device ? (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          mirrorMode="auto"
          isActive={screenLive}
          outputs={outputs}
          onLayout={(event) => setPreviewSize(event.nativeEvent.layout)}
          onConfigured={recorder.onConfigured}
          onStarted={() => {
            setCameraReady(true);
            applyAudioSession();
            const controller = cameraRef.current?.controller;
            if (controller && initializedDevice.current !== device.id) {
              initializedDevice.current = device.id;
              const factor = controller.displayableZoomFactor;
              if (Number.isFinite(factor) && factor > 0) {
                try {
                  controller.setZoom(
                    Math.max(
                      controller.minZoom,
                      Math.min(controller.maxZoom, controller.zoom / factor),
                    ),
                  );
                } catch (error) {
                  console.warn('Could not initialize zoom', error);
                }
              }
            }
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

      {/* At most six camera controls, with mode and scan anchored at the left edge. */}

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

      {cameraAllowed ? (
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
      ) : null}

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

      <StatusBorder status={screenLive && cameraReady ? guidanceStatus : null} />
      {debugOverlay && framing.result.box ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            zIndex: 2,
            left: framing.result.box.x * previewSize.width,
            top: framing.result.box.y * previewSize.height,
            width: framing.result.box.width * previewSize.width,
            height: framing.result.box.height * previewSize.height,
            borderColor: colors.adjust,
            borderWidth: 2,
            borderStyle: 'dashed',
          }}
        />
      ) : null}
      {cameraReady ? (
        <View
          pointerEvents="none"
          style={[styles.guidance, { backgroundColor: colors.surfaceOverlay, top: edge.top + 80 }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={[typography.status, { color: colors.textPrimary }]}>
            {guidanceStatus === 'good' ? '✓ ' : guidanceStatus === 'problem' ? '! ' : '↔ '}
            {guidanceText}
          </Text>
          {debugOverlay ? (
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {mode === 'lighting'
                ? strings.lighting.debug(lighting.result.overall, lighting.result.face)
                : strings.framing.debug(framing.fps, framing.result.box)}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.corner,
          styles.layerControls,
          { bottom: edge.bottom + 100, left: edge.left },
        ]}
      >
        <AccessibleButton
          scheme="dark"
          label={t.mode.label(t.modes[mode])}
          hint={t.mode.hint}
          text={t.modes[mode]}
          disabled={phase !== 'idle'}
          onPress={() => setMode(mode === 'framing' ? 'lighting' : 'framing')}
          testID="camera-mode"
        />
        {mode === 'lighting' ? (
          <AccessibleButton
            scheme="dark"
            label={scan.running ? strings.lighting.cancelScan.label : strings.lighting.scan.label}
            hint={scan.running ? strings.lighting.cancelScan.hint : strings.lighting.scan.hint}
            disabled={phase !== 'idle'}
            onPress={beginScan}
            testID="camera-scan"
          />
        ) : null}
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
  guidance: { position: 'absolute', left: 24, right: 24, padding: 16, borderRadius: 16, zIndex: 2 },
});
