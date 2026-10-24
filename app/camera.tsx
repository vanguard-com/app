import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, VisionCamera, useCameraDevice, type CameraRef } from 'react-native-vision-camera';

import { useBackgroundCamera } from '@/features/background/useBackgroundCamera';
import { useSceneDescription } from '@/features/background/useSceneDescription';
import { useModels, refreshModels, deleteModel } from '@/features/background/models';
import { applyAudioSession } from '@/audio/audioSession';
import { AccessibleButton, StatusBorder } from '@/components';
import { cues } from '@/cues';
import { subjectLabel } from '@/features/framing/subject';
import { useFeedbackCamera } from '@/features/feedback/useFeedbackCamera';
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
import { RecordingStats } from '@/features/recording/stats';
import type { Box } from '@/features/framing/model';
import type { LightingResult } from '@/features/lighting/model';
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
  const liveFeedback = useSettings((s) => s.liveFeedback);
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
  const recordingStats = useRef(new RecordingStats());
  const observeFraming = useCallback((box: Box | null, at: number) => {
    if (useSession.getState().recordingPhase === 'recording')
      recordingStats.current.sampleFraming(box, at);
  }, []);
  const observeLighting = useCallback((result: LightingResult, at: number) => {
    if (useSession.getState().recordingPhase === 'recording')
      recordingStats.current.sampleLighting(result, at);
  }, []);
  const framing = useFraming(
    cameraRef,
    facing,
    screenLive && cameraAllowed && cameraReady && subject.kind === 'face' && mode === 'framing',
    previewSize,
    true,
    observeFraming,
  );
  const background = useBackgroundCamera(
    cameraRef,
    screenLive && cameraAllowed && cameraReady && (mode === 'framing' || mode === 'background'),
    facing,
    previewSize,
    framing.receiveFaces,
    mode === 'framing',
    observeLighting,
  );
  const scene = useSceneDescription(
    cameraRef,
    screenLive && cameraAllowed && cameraReady && phase === 'idle',
    background.summary,
  );
  const backgroundRequested = useRef(false);
  const speakBackground = background.speakStatus;
  useEffect(() => {
    if (
      backgroundRequested.current &&
      background.objects.length &&
      screenLive &&
      mode === 'background'
    ) {
      backgroundRequested.current = false;
      speakBackground();
    }
  }, [background.objects, speakBackground, screenLive, mode]);
  useEffect(() => {
    if (!screenLive || mode !== 'background') {
      backgroundRequested.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (backgroundRequested.current) {
        backgroundRequested.current = false;
        speakBackground();
      }
    }, 2500);
    return () => {
      clearTimeout(timer);
    };
  }, [screenLive, mode, speakBackground]);
  const lightingActive = screenLive && cameraAllowed && cameraReady && mode === 'lighting';
  const scan = useLightScan(lightingActive, phase === 'idle');
  const lighting = useLighting(
    cameraRef,
    lightingActive,
    previewSize,
    facing,
    scan.sample,
    !scan.running,
    observeLighting,
  );
  const feedback = useFeedbackCamera(
    cameraRef,
    screenLive && cameraAllowed && cameraReady && mode === 'feedback',
    facing,
    previewSize,
  );
  const feedbackWanted = useRef(false);
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
  const guidanceText =
    mode === 'background'
      ? background.status === 'unavailable'
        ? strings.background.unavailable
        : background.summary()
      : mode === 'lighting'
        ? lightingText
        : mode === 'feedback'
          ? !liveFeedback
            ? strings.feedback.off
            : strings.feedback.status(feedback.observation, feedback.poseStatus)
          : framing.statusText;
  const guidanceStatus =
    mode === 'background'
      ? 'adjust'
      : mode === 'lighting'
        ? lighting.result.state === 'good' && !scan.running
          ? 'good'
          : 'adjust'
        : mode === 'feedback'
          ? 'adjust'
          : framing.result.status;

  useEffect(() => {
    setMode('framing');
    void refreshModels();
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
      recordingStats.current = new RecordingStats();
      feedback.beginStats();
      feedbackWanted.current =
        useSession.getState().mode === 'feedback' && useSettings.getState().liveFeedback;
      cues.clear('guidance');
      cues.say({
        id: `sys.rec.start.${Date.now()}`,
        category: 'system',
        text: micAllowed ? t.recordingStarted : `${t.recordingStarted}. ${t.micOff}`,
        earcon: 'start',
        haptic: 'single',
      });
    },
    onCaptured: (info) => ({
      ...info,
      recordingSummary: recordingStats.current.finish(
        (useSession.getState().recordingStartedAt ?? Date.now() - info.durationMs) +
          info.durationMs,
      ),
      ...(feedbackWanted.current ? { feedbackSummary: feedback.finishStats() } : {}),
    }),
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
      scene.cancel();
      recorder.start();
    }
  }, [cameraReady, recorder, scene]);

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
        case 'whatIsBehindMe':
          if (
            useSession.getState().mode === 'framing' ||
            useSession.getState().mode === 'background'
          ) {
            speakBackground();
            return;
          }
          if (current !== 'idle') {
            cues.say({
              id: 'background.busy',
              category: 'system',
              text: strings.background.idleOnly,
              force: true,
            });
            return;
          }
          backgroundRequested.current = true;
          setMode('background');
          speakBackground();
          return;
        case 'describeBackground':
          if (current !== 'idle') {
            cues.say({
              id: 'background.busy',
              category: 'system',
              text: strings.background.idleOnly,
              force: true,
            });
            return;
          }
          void scene.describe();
          return;
        case 'cancelScene':
          scene.cancel();
          return;
        case 'installDetailedMode':
        case 'useSceneModel':
        case 'deleteSceneModel': {
          if (current !== 'idle') {
            cues.say({
              id: 'background.busy',
              category: 'system',
              text: strings.background.idleOnly,
              force: true,
            });
            return;
          }
          const model = command.type === 'installDetailedMode' ? 'detailed' : command.model;
          if (command.type === 'deleteSceneModel') {
            scene.cancel();
            void deleteModel(model)
              .then(() =>
                cues.say({
                  id: 'model.deleted',
                  category: 'system',
                  text: strings.background.deleted,
                  force: true,
                }),
              )
              .catch(() => {});
            return;
          }
          if (command.type === 'useSceneModel' && useModels.getState().installed[model]) {
            useSettings.getState().update({ sceneModel: model });
            cues.say({
              id: 'model.selected',
              category: 'system',
              text: strings.background.modelNames[model],
              force: true,
            });
          } else router.push({ pathname: '/settings/scene-model', params: { model } });
          return;
        }
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
        case 'feedback':
          if (command.on && current !== 'idle' && useSession.getState().mode !== 'feedback') {
            cues.say({
              id: 'sys.notWhileRecording',
              category: 'system',
              text: t.notWhileRecording,
            });
            return;
          }
          useSettings.getState().update({ liveFeedback: command.on });
          if (command.on) setMode('feedback');
          cues.say({
            id: `feedback.master.${command.on}`,
            category: 'system',
            text: command.on ? strings.feedback.on : strings.feedback.off,
            force: true,
          });
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
          cues.say({
            id: 'sys.help',
            category: 'system',
            text: strings.voice.help.camera,
            force: true,
          });
          return;
        case 'postVideo':
        case 'saveVideo':
        case 'playVideo':
          cues.say({
            id: 'sys.reviewOnly',
            category: 'system',
            text: strings.voice.reviewOnly,
            force: true,
          });
          return;
        default:
          cues.say({ id: 'sys.cameraOnly', category: 'system', text: strings.voice.cameraOnly });
      }
    },
    [
      flip,
      toggleRecording,
      setMode,
      speakLightingStatus,
      beginScan,
      cancelScan,
      speakBackground,
      scene,
    ],
  );

  const outputs = useMemo(
    () => [
      ...recorder.outputs,
      ...(mode === 'framing' || mode === 'background' ? [background.output] : []),
      ...(mode === 'lighting' ? [lighting.output] : []),
      ...(mode === 'feedback' ? [feedback.output] : []),
    ],
    [recorder.outputs, background.output, mode, lighting.output, feedback.output],
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
          onPress={() =>
            setMode(
              mode === 'framing'
                ? 'lighting'
                : mode === 'lighting'
                  ? 'feedback'
                  : mode === 'feedback'
                    ? 'background'
                    : 'framing',
            )
          }
          testID="camera-mode"
        />
        {mode === 'background' ? (
          <AccessibleButton
            scheme="dark"
            label={scene.busy ? strings.background.cancel.label : strings.background.describe.label}
            hint={scene.busy ? strings.background.cancel.hint : strings.background.describe.hint}
            disabled={phase !== 'idle'}
            onPress={scene.busy ? scene.cancel : () => void scene.describe()}
            testID="camera-describe"
          />
        ) : null}
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
