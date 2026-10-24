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
  const React = require('react');
  const output = { createRecorder: jest.fn() };
  const frameOutput = {};
  return {
    Camera: React.forwardRef(function CameraMock(props: object, ref: unknown) {
      React.useImperativeHandle(ref, () => ({ cancelZoomAnimation: jest.fn() }));
      return <View testID="vision-camera" {...props} />;
    }),
    CommonResolutions: { FHD_16_9: { width: 1920, height: 1080 } },
    useVideoOutput: jest.fn(() => output),
    useFrameOutput: jest.fn(() => frameOutput),
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
  createFaceDetector: jest.fn(() => ({ detectFaces: jest.fn(() => []) })),
}));

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })),
    getSpeechRecognizerPermissionsAsync: jest.fn(async () => ({
      granted: false,
      canAskAgain: false,
    })),
    requestSpeechRecognizerPermissionsAsync: jest.fn(async () => ({
      granted: false,
      canAskAgain: false,
    })),
    supportsOnDeviceRecognition: jest.fn(() => false),
    getStateAsync: jest.fn(async () => 'inactive'),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
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

jest.mock('expo-sensors', () => ({
  DeviceMotion: {
    isAvailableAsync: jest.fn(async () => true),
    getPermissionsAsync: jest.fn(async () => ({ granted: true })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  return {
    ...mock,
    useSharedValue: (initial: unknown) => {
      const { useRef } = require('react');
      const ref = useRef();
      if (!ref.current)
        ref.current = {
          value: initial,
          set(value: unknown) {
            this.value = value;
          },
          get() {
            return this.value;
          },
        };
      return ref.current;
    },
  };
});

jest.mock('react-native-fast-tflite', () => ({ loadTensorflowModel: jest.fn() }));
jest.mock('react-native-vision-camera-resizer', () => ({
  createResizer: jest.fn(),
  isResizerAvailable: jest.fn(() => false),
}));

jest.mock('llama.rn', () => ({ initLlama: jest.fn() }));
jest.mock('react-native-nitro-image', () => ({ Images: { loadFromFileAsync: jest.fn() } }));
jest.mock('expo-network', () => ({
  NetworkStateType: { WIFI: 'WIFI', CELLULAR: 'CELLULAR', NONE: 'NONE' },
  getNetworkStateAsync: jest.fn(async () => ({
    type: 'WIFI',
    isConnected: true,
    isInternetReachable: true,
  })),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('expo-device', () => ({
  totalMemory: 8 * 1024 ** 3,
  deviceType: 1,
  DeviceType: { PHONE: 1 },
  modelName: 'Test phone',
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));

jest.mock('expo-video', () => ({
  VideoView: (props: object) => {
    const { View } = require('react-native');
    return <View {...props} />;
  },
  useVideoPlayer: jest.fn((source, setup) => {
    const { useMemo } = require('react');
    return useMemo(() => {
      const listeners = new Map<string, Set<(payload: unknown) => void>>();
      const emit = (name: string, payload?: unknown) =>
        listeners.get(name)?.forEach((cb) => cb(payload));
      const player = {
        currentTime: 0,
        duration: 10,
        status: 'readyToPlay',
        play: jest.fn(() => emit('playingChange', { isPlaying: true })),
        pause: jest.fn(() => emit('playingChange', { isPlaying: false })),
        addListener: (name: string, cb: (payload: unknown) => void) => {
          if (!listeners.has(name)) listeners.set(name, new Set());
          listeners.get(name)!.add(cb);
          return { remove: () => listeners.get(name)?.delete(cb) };
        },
        emit,
      };
      setup?.(player);
      return player;
      // Match expo-video: setup applies only when a source creates a new native player.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [source]);
  }),
}));
