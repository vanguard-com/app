import { useRef } from 'react';
import * as Reanimated from 'react-native-reanimated';
import { fireEvent } from '@testing-library/react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { VisionCamera, useVideoOutput } from 'react-native-vision-camera';
import { cues } from '@/cues';
import * as permissions from '@/features/permissions/permissions';
import { useHardwareButton } from '@/hooks/useHardwareButton';
import { useSettings } from '@/store/settingsStore';
import { useSession } from '@/store/sessionStore';
import { strings } from '@/i18n';

jest.mock('@/features/voice/useVoiceCommands', () => ({ useVoiceCommands: jest.fn() }));
jest.mock('@/cues/useCueEngineSync', () => ({ useCueEngineSync: jest.fn() }));
jest.mock('@/hooks/useAppActive', () => ({ useAppActive: () => true }));
jest.mock('@/hooks/useHardwareButton', () => ({ useHardwareButton: jest.fn() }));
jest.mock('../modules/lumi-hardware-buttons', () => ({ isHardwareButtonSupported: () => true }));
jest.mock('@/features/onboarding/useNarration', () => ({
  useNarration: () => ({ replay: jest.fn(), stop: jest.fn() }),
}));
jest.mock('@/cues', () => ({
  cues: {
    say: jest.fn(),
    configure: jest.fn(),
    clear: jest.fn(),
    clearCategory: jest.fn(),
    clearIds: jest.fn(),
    guideTone: jest.fn(),
  },
}));
jest.mock('@/features/permissions/permissions', () => ({
  ...jest.requireActual('@/features/permissions/permissions'),
  getPermissionStatus: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestPermission: jest.fn(async () => false),
  ensureCameraPermission: jest.fn(async () => false),
  ensureMicrophonePermission: jest.fn(async () => false),
  ensureSpeechPermission: jest.fn(async () => false),
  hasMicrophonePermission: () => false,
  hasSpeechPermission: jest.fn(async () => false),
}));
// Router's test-only Reanimated replacement needs native-like stable shared-value identities.
jest.spyOn(Reanimated, 'useSharedValue').mockImplementation(function useStableValue(initial) {
  const ref = useRef({
    value: initial,
    set(value: unknown) {
      this.value = value;
    },
  });
  return ref.current as unknown as Reanimated.SharedValue<typeof initial>;
});

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.getState().reset();
  useSession.getState().stopRecording();
  useSession.getState().setLastRecording(null);
  jest.mocked(permissions.requestPermission).mockResolvedValue(false);
  (VisionCamera as unknown as { cameraPermissionStatus: string }).cameraPermissionStatus = 'denied';
  jest
    .mocked(permissions.getPermissionStatus)
    .mockResolvedValue({ granted: false, canAskAgain: true });
});
async function press(id: string) {
  fireEvent.press(screen.getByTestId(id));
  await act(async () => {});
}
async function skipAccess() {
  for (let index = 0; index < 4; index++) await press('permission-next');
}

it('completes lessons, skippable access and safe practice without making a recording', async () => {
  const view = renderRouter('./app', { initialUrl: '/' });
  await act(async () => {});
  await press('welcome-start');
  for (let index = 0; index < 4; index++) {
    expect(screen.getByText(strings.onboarding.lesson(index + 1, 4))).toBeTruthy();
    await press('tutorial-next');
  }
  expect(view.getPathname()).toBe('/permissions');
  await skipAccess();
  expect(view.getPathname()).toBe('/practice');
  await press('practice-record');
  expect(screen.getByText(strings.onboarding.practice.recording)).toBeTruthy();
  expect(jest.mocked(useHardwareButton).mock.calls.at(-1)![0]).toBe(false);
  await press('practice-record');
  expect(screen.getByText(strings.onboarding.practice.idle)).toBeTruthy();
  expect(useSession.getState().recordingPhase).toBe('idle');
  expect(useSession.getState().lastRecording).toBeNull();
  expect(useSettings.getState().onboardingComplete).toBe(false);
  await press('practice-next');
  expect(view.getPathname()).toBe('/camera');
  expect(useSettings.getState().onboardingComplete).toBe(true);
  expect(useSettings.getState().permissionsReviewed).toBe(true);
  expect(permissions.requestPermission).not.toHaveBeenCalled();
  expect(permissions.ensureCameraPermission).not.toHaveBeenCalled();
  expect(permissions.ensureMicrophonePermission).not.toHaveBeenCalled();
  const output = jest.mocked(useVideoOutput).mock.results.at(-1)!.value;
  expect(output.createRecorder).not.toHaveBeenCalled();
});

it('replays and returns to More without changing sound/feedback or an existing recording', async () => {
  const settings = useSettings.getState();
  settings.update({
    onboardingComplete: true,
    permissionsReviewed: true,
    voiceRate: 1.5,
    cueVolume: 0.4,
    liveFeedback: true,
  });
  const recording = {
    uri: 'file:///existing.mp4',
    durationMs: 5000,
    hasAudio: true,
    savedToPhotos: true,
  };
  useSession.getState().setLastRecording(recording);
  const view = renderRouter('./app', { initialUrl: '/settings/more' });
  await act(async () => {});
  await press('setting-replay-tutorial');
  await press('welcome-start');
  await press('tutorial-skip');
  await skipAccess();
  await press('practice-next');
  expect(view.getPathname()).toBe('/settings/more');
  expect(useSettings.getState()).toMatchObject({
    voiceRate: 1.5,
    cueVolume: 0.4,
    liveFeedback: true,
    onboardingComplete: true,
  });
  expect(useSession.getState().lastRecording).toEqual(recording);
});

it('enables iPhone volume practice only after an allowed preview starts, with no recorder output', async () => {
  (VisionCamera as unknown as { cameraPermissionStatus: string }).cameraPermissionStatus =
    'authorized';
  jest
    .mocked(permissions.getPermissionStatus)
    .mockImplementation(async (kind) => ({ granted: kind === 'camera', canAskAgain: true }));
  renderRouter('./app', { initialUrl: '/practice' });
  await act(async () => {});
  expect(jest.mocked(useHardwareButton).mock.calls.at(-1)![0]).toBe(false);
  const preview = screen.getByTestId('vision-camera', { includeHiddenElements: true });
  expect(preview.props.outputs).toEqual([]);
  act(() => preview.props.onStarted());
  const [enabled, volume] = jest.mocked(useHardwareButton).mock.calls.at(-1)!;
  expect(enabled).toBe(true);
  act(() => volume());
  expect(screen.getByText(strings.onboarding.practice.recording)).toBeTruthy();
  expect(useSession.getState().recordingPhase).toBe('idle');
  expect(useSession.getState().lastRecording).toBeNull();
  expect(useVideoOutput).not.toHaveBeenCalled();
});

it('aborts a pending request when its screen closes and ignores the late result', async () => {
  let finish!: (allowed: boolean) => void;
  jest.mocked(permissions.requestPermission).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = renderRouter('./app', { initialUrl: '/settings/permission?kind=photos' });
  await act(async () => {});
  await press('permission-allow');
  const signal = jest.mocked(permissions.requestPermission).mock.calls.at(-1)![1];
  expect(signal?.aborted).toBe(false);
  view.unmount();
  expect(signal?.aborted).toBe(true);
  jest.mocked(cues.say).mockClear();
  await act(async () => finish(true));
  expect(cues.say).not.toHaveBeenCalled();
});

it('leaves a retry and navigation available after a native permission error', async () => {
  jest
    .mocked(permissions.requestPermission)
    .mockRejectedValueOnce(new Error('permission module failure'));
  renderRouter('./app', { initialUrl: '/permissions' });
  await act(async () => {});
  await press('permission-allow');
  expect(screen.getByText(strings.permissions.status.unavailable)).toBeTruthy();
  expect(screen.getByTestId('permission-next').props.accessibilityState.disabled).toBe(false);
  expect(cues.say).toHaveBeenCalledWith(
    expect.objectContaining({ text: strings.permissions.failed }),
  );
});
