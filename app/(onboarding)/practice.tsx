import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  VisionCamera,
  useCameraDevice,
  type CameraOutput,
} from 'react-native-vision-camera';
import { useIsFocused, useLocalSearchParams } from 'expo-router';
import { AccessibleButton, InfoCard, Screen, ScreenHeader } from '@/components';
import { cues } from '@/cues';
import { finishOnboarding } from '@/features/onboarding/navigation';
import { getPermissionStatus } from '@/features/permissions/permissions';
import { useSession } from '@/store/sessionStore';
import { useNarration } from '@/features/onboarding/useNarration';
import { useAppActive } from '@/hooks/useAppActive';
import { useHardwareButton } from '@/hooks/useHardwareButton';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';
import { isHardwareButtonSupported } from '../../modules/lumi-hardware-buttons';

const PREVIEW_OUTPUTS: CameraOutput[] = [];

export default function Practice() {
  const { colors, typography, spacing } = useTheme();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const focused = useIsFocused(),
    appActive = useAppActive();
  const supported = isHardwareButtonSupported();
  const facing = useSession((s) => s.facing);
  const device = useCameraDevice(facing);
  const [cameraAllowed, setCameraAllowed] = useState(
    () => VisionCamera.cameraPermissionStatus === 'authorized',
  );
  const [previewReady, setPreviewReady] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const t = strings.onboarding.practice;
  const [running, setRunning] = useState(false);
  const current = useRef(false);
  const [tried, setTried] = useState({ button: false, volume: false });
  const volumeReady = supported && (Platform.OS !== 'ios' || previewReady);
  const volumeHelp = !supported
    ? t.noVolume
    : previewFailed
      ? t.previewFailed
      : Platform.OS === 'ios' && !previewReady
        ? cameraAllowed && device
          ? t.waitPreview
          : t.cameraNeeded
        : t.volume;
  const intro = `${t.intro} ${volumeHelp}`;
  const narration = useNarration('tutorial.practice', intro);
  const toggle = useCallback(
    (source: 'button' | 'volume') => {
      narration.stop();
      current.current = !current.current;
      setRunning(current.current);
      setTried((value) => ({ ...value, [source]: true }));
      cues.say({
        id: 'practice.action',
        category: 'system',
        text: current.current ? t.started : t.stopped,
        earcon: current.current ? 'start' : 'stop',
        haptic: 'single',
        force: true,
      });
    },
    [t, narration],
  );
  useHardwareButton(focused && appActive && volumeReady, () => toggle('volume'));
  useEffect(() => {
    let abandoned = false;
    if (focused && appActive)
      void getPermissionStatus('camera')
        .then((value) => {
          if (!abandoned) setCameraAllowed(value.granted);
        })
        .catch(() => {});
    return () => {
      abandoned = true;
    };
  }, [focused, appActive]);
  useEffect(() => () => cues.clearIds(['practice.action']), [focused, appActive]);
  return (
    <Screen>
      <ScreenHeader title={t.title} announce={false} />
      {cameraAllowed && device ? (
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ height: 180, marginBottom: spacing.md, backgroundColor: colors.surface }}
          testID="practice-preview"
        >
          <Camera
            device={device}
            outputs={PREVIEW_OUTPUTS}
            isActive={focused && appActive}
            mirrorMode="auto"
            allowHapticsAndSystemSoundsPlayback
            style={StyleSheet.absoluteFill}
            onStarted={() => {
              setPreviewReady(true);
              setPreviewFailed(false);
            }}
            onStopped={() => setPreviewReady(false)}
            onError={() => {
              setPreviewReady(false);
              setPreviewFailed(true);
            }}
          />
        </View>
      ) : null}
      <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.md }]}>
        {intro}
      </Text>
      <InfoCard
        icon={running ? 'radio-button-on' : 'pause-circle-outline'}
        title={running ? t.recording : t.idle}
      >
        {t.progress(tried.button, tried.volume)}
      </InfoCard>
      <AccessibleButton
        variant="primary"
        icon={running ? 'stop' : 'radio-button-on'}
        label={running ? t.stop.label : t.start.label}
        hint={running ? t.stop.hint : t.start.hint}
        onPress={() => toggle('button')}
        testID="practice-record"
      />
      <AccessibleButton
        icon="play-outline"
        label={strings.onboarding.again.label}
        hint={strings.onboarding.again.hint}
        onPress={narration.replay}
        testID="practice-repeat"
      />
      <AccessibleButton
        icon="camera-outline"
        label={
          replay === '1' ? strings.onboarding.replayFinish.label : strings.onboarding.finish.label
        }
        hint={
          replay === '1' ? strings.onboarding.replayFinish.hint : strings.onboarding.finish.hint
        }
        onPress={() => finishOnboarding(replay === '1')}
        testID="practice-next"
      />
    </Screen>
  );
}
