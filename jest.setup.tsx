/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories must require lazily */
// Native modules are not available under Jest. Pure logic is tested directly; native wrappers
// get minimal mocks here.

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => {
      throw new Error('Nitro HybridObjects are not available in Jest');
    }),
  },
}));

// The library ships a mock; add the session and device calls Lumi uses.
jest.mock('react-native-audio-api', () => {
  const mock = require('react-native-audio-api/mock');
  return {
    ...mock,
    AudioManager: {
      addSystemEventListener: jest.fn(() => ({ remove: jest.fn() })),
      setAudioSessionOptions: jest.fn(),
      setAudioSessionActivity: jest.fn(async () => {}),
      getDevicesInfo: jest.fn(async () => ({
        availableInputs: [],
        availableOutputs: [],
        currentInputs: [],
        currentOutputs: [],
      })),
    },
  };
});

jest.mock('react-native-vision-camera', () => {
  const { View } = require('react-native');
  const output = { createRecorder: jest.fn() };
  return {
    Camera: (props: object) => <View testID="vision-camera" {...props} />,
    CommonResolutions: { FHD_16_9: { width: 1920, height: 1080 } },
    useVideoOutput: () => output,
    useCameraDevice: () => ({ id: 'mock-camera', minZoom: 1, maxZoom: 3 }),
    VisionCamera: {
      cameraPermissionStatus: 'authorized',
      microphonePermissionStatus: 'authorized',
      requestCameraPermission: jest.fn(async () => true),
      requestMicrophonePermission: jest.fn(async () => true),
    },
  };
});

jest.mock('react-native-vision-camera-face-detector', () => ({
  createFaceDetectorOutput: jest.fn(() => ({})),
}));

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })),
    supportsOnDeviceRecognition: jest.fn(() => false),
    getSupportedLocales: jest.fn(async () => ({ locales: [], installedLocales: [] })),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => {}),
}));

jest.mock('expo-media-library/legacy', () => ({
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  saveToLibraryAsync: jest.fn(async () => {}),
}));

