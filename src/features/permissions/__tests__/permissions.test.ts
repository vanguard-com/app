import { Platform } from 'react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { VisionCamera } from 'react-native-vision-camera';
import { cues, speakAndWait } from '@/cues';
import {
  deferPermission,
  ensureCameraPermission,
  PERMISSION_KINDS,
  requestPermission,
} from '../permissions';

jest.mock('@/cues', () => ({ cues: { say: jest.fn() }, speakAndWait: jest.fn(async () => {}) }));
const camera = VisionCamera as unknown as {
  cameraPermissionStatus: string;
  microphonePermissionStatus: string;
};
const originalOS = Platform.OS;
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  camera.cameraPermissionStatus = 'not-determined';
  camera.microphonePermissionStatus = 'denied';
  jest.mocked(speakAndWait).mockResolvedValue(undefined);
  jest.mocked(VisionCamera.requestCameraPermission).mockImplementation(async () => {
    camera.cameraPermissionStatus = 'authorized';
    return true;
  });
});
afterEach(() => Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true }));

it('explains access before opening the native camera dialog', async () => {
  expect(await requestPermission('camera')).toBe(true);
  expect(jest.mocked(speakAndWait).mock.invocationCallOrder[0]).toBeLessThan(
    jest.mocked(VisionCamera.requestCameraPermission).mock.invocationCallOrder[0],
  );
});
it('does not open a dialog after navigation cancels its spoken explanation', async () => {
  let finish!: () => void;
  jest.mocked(speakAndWait).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const controller = new AbortController();
  const pending = requestPermission('camera', controller.signal);
  controller.abort();
  finish();
  expect(await pending).toBe(false);
  expect(VisionCamera.requestCameraPermission).not.toHaveBeenCalled();
});
it.each(PERMISSION_KINDS)('does nothing for an already cancelled %s request', async (kind) => {
  const controller = new AbortController();
  controller.abort();
  expect(await requestPermission(kind, controller.signal)).toBe(false);
  expect(speakAndWait).not.toHaveBeenCalled();
});
it('honours a deferred automatic request and still supports a later explicit request', async () => {
  deferPermission('camera');
  expect(await ensureCameraPermission()).toBe(false);
  expect(VisionCamera.requestCameraPermission).not.toHaveBeenCalled();
  expect(await requestPermission('camera')).toBe(true);
  expect(VisionCamera.requestCameraPermission).toHaveBeenCalledTimes(1);
});
it('requests only iOS speech access, without asking for a denied microphone again', async () => {
  const response = { granted: false, canAskAgain: true } as Awaited<
    ReturnType<typeof ExpoSpeechRecognitionModule.getSpeechRecognizerPermissionsAsync>
  >;
  jest
    .mocked(ExpoSpeechRecognitionModule.getSpeechRecognizerPermissionsAsync)
    .mockResolvedValueOnce(response);
  jest
    .mocked(ExpoSpeechRecognitionModule.requestSpeechRecognizerPermissionsAsync)
    .mockResolvedValueOnce({ ...response, granted: true });
  expect(await requestPermission('speech')).toBe(true);
  expect(ExpoSpeechRecognitionModule.requestSpeechRecognizerPermissionsAsync).toHaveBeenCalledTimes(
    1,
  );
  expect(ExpoSpeechRecognitionModule.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(VisionCamera.requestMicrophonePermission).not.toHaveBeenCalled();
});
it('explains the Android microphone dependency without silently requesting it from Speech', async () => {
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  expect(await requestPermission('speech')).toBe(false);
  expect(ExpoSpeechRecognitionModule.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(cues.say).toHaveBeenCalledWith(
    expect.objectContaining({ text: expect.stringContaining('microphone access first') }),
  );
});

it('joins a native dialog across app deactivation without opening a second request', async () => {
  let finish!: (granted: boolean) => void;
  jest.mocked(VisionCamera.requestCameraPermission).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const controller = new AbortController();
  const first = requestPermission('camera', controller.signal);
  await Promise.resolve();
  expect(VisionCamera.requestCameraPermission).toHaveBeenCalledTimes(1);
  controller.abort();
  const resumed = ensureCameraPermission(new AbortController().signal);
  camera.cameraPermissionStatus = 'authorized';
  finish(true);
  expect(await first).toBe(true);
  expect(await resumed).toBe(true);
  expect(VisionCamera.requestCameraPermission).toHaveBeenCalledTimes(1);
});
