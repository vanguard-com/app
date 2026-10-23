import { AppState } from 'react-native';
import * as FS from 'expo-file-system/legacy';
import * as Network from 'expo-network';
import { hashModelFile, prepareModelDirectory } from '../../../../modules/lumi-model-files';
import { inspectSceneModel } from '../scene';
import { cancelModelDownload, installModel, refreshModels, useModels } from '../models';
import { useSettings } from '@/store/settingsStore';
import type { ModelManifest } from '../catalog';

jest.mock('@/cues', () => ({ cues: { say: jest.fn() } }));
jest.mock('../scene', () => ({
  inspectSceneModel: jest.fn(async () => {}),
  cancelScene: jest.fn(),
  waitForScene: jest.fn(async () => {}),
  forgetVerifiedModel: jest.fn(),
}));
jest.mock('../../../../modules/lumi-model-files', () => ({
  prepareModelDirectory: jest.fn(async () => {}),
  hashModelFile: jest.fn(),
  cancelModelHash: jest.fn(),
}));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  FileSystemSessionType: { FOREGROUND: 0 },
  getFreeDiskStorageAsync: jest.fn(),
  deleteAsync: jest.fn(async () => {}),
  getInfoAsync: jest.fn(),
  createDownloadResumable: jest.fn(),
  moveAsync: jest.fn(async () => {}),
  writeAsStringAsync: jest.fn(async () => {}),
  readAsStringAsync: jest.fn(async () => {
    throw new Error('missing');
  }),
}));
const manifest: ModelManifest = {
  kind: 'standard',
  repo: 'ggml-org/SmolVLM2-500M-Video-Instruct-GGUF',
  revision: 'b'.repeat(40),
  bytes: 2000,
  files: [
    {
      name: 'model.gguf',
      bytes: 1000,
      sha256: 'a'.repeat(64),
      url: 'https://huggingface.co/model',
    },
    {
      name: 'mmproj.gguf',
      bytes: 1000,
      sha256: 'a'.repeat(64),
      url: 'https://huggingface.co/projector',
    },
  ],
};
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(AppState, 'currentState', {
    value: 'active',
    writable: true,
    configurable: true,
  });
  useSettings.getState().reset();
  useModels.setState({ installed: {}, phase: 'idle', progress: 0, downloading: null });
  jest.mocked(Network.getNetworkStateAsync).mockResolvedValue({
    type: Network.NetworkStateType.WIFI,
    isConnected: true,
    isInternetReachable: true,
  });
  jest.mocked(FS.getFreeDiskStorageAsync).mockResolvedValue(10e9);
  jest.mocked(FS.getInfoAsync).mockResolvedValue({
    exists: true,
    isDirectory: false,
    size: 1000,
    uri: 'file:///model',
    modificationTime: 0,
  });
  jest.mocked(hashModelFile).mockResolvedValue('a'.repeat(64));
  jest.mocked(FS.createDownloadResumable).mockImplementation(
    () =>
      ({
        downloadAsync: async () => ({ status: 200 }),
        pauseAsync: async () => ({}),
      }) as FS.DownloadResumable,
  );
});
it('never starts downloads on mobile data unless enabled', async () => {
  jest
    .mocked(Network.getNetworkStateAsync)
    .mockResolvedValue({ type: Network.NetworkStateType.CELLULAR, isConnected: true });
  await expect(installModel(manifest)).rejects.toThrow('wifi');
  expect(FS.createDownloadResumable).not.toHaveBeenCalled();
  expect(useModels.getState().installed).toEqual({});
});
it('checks space before downloading and prepares backup exclusion before writing files', async () => {
  jest.mocked(FS.getFreeDiskStorageAsync).mockResolvedValueOnce(0);
  await expect(installModel(manifest)).rejects.toThrow('capacity');
  expect(FS.createDownloadResumable).not.toHaveBeenCalled();
  await installModel(manifest);
  expect(prepareModelDirectory).toHaveBeenCalledWith('file:///docs/scene-models/standard/');
  expect(hashModelFile).toHaveBeenCalledTimes(2);
  expect(inspectSceneModel).toHaveBeenCalledWith(manifest);
  expect(useModels.getState().installed.standard).toEqual(manifest);
});
it('never installs a corrupt file and cleans the partial directory', async () => {
  jest.mocked(hashModelFile).mockResolvedValueOnce('f'.repeat(64));
  await expect(installModel(manifest)).rejects.toThrow('checksum');
  expect(inspectSceneModel).not.toHaveBeenCalled();
  expect(FS.writeAsStringAsync).not.toHaveBeenCalled();
  expect(FS.deleteAsync).toHaveBeenLastCalledWith('file:///docs/scene-models/standard/', {
    idempotent: true,
  });
  expect(useModels.getState().phase).toBe('idle');
});
it('does not install a pair rejected by the native multimodal runtime', async () => {
  jest.mocked(inspectSceneModel).mockRejectedValueOnce(new Error('vision unavailable'));
  await expect(installModel(manifest)).rejects.toThrow('vision unavailable');
  expect(FS.writeAsStringAsync).not.toHaveBeenCalled();
  expect(useModels.getState().installed).toEqual({});
});
it('cancels an in-flight download, blocks a second install, and never writes the ready marker', async () => {
  let finish!: (result: unknown) => void, entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const pause = jest.fn(async () => ({}));
  jest.mocked(FS.createDownloadResumable).mockImplementationOnce(
    () =>
      ({
        downloadAsync: () => {
          entered();
          return new Promise((resolve) => {
            finish = resolve;
          });
        },
        pauseAsync: pause,
      }) as unknown as FS.DownloadResumable,
  );
  const pending = installModel(manifest);
  const assertion = expect(pending).rejects.toThrow('cancelled');
  await started;
  await expect(installModel(manifest)).rejects.toThrow('busy');
  await cancelModelDownload();
  finish({ status: 200 });
  await assertion;
  expect(pause).toHaveBeenCalled();
  expect(FS.writeAsStringAsync).not.toHaveBeenCalled();
  expect(useModels.getState().installed).toEqual({});
});
it('ignores missing metadata and restores the Standard fallback', async () => {
  useSettings.getState().update({ sceneModel: 'detailed' });
  await refreshModels();
  expect(useSettings.getState().sceneModel).toBe('standard');
  expect(useModels.getState().installed).toEqual({});
});
