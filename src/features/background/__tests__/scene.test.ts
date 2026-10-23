import { AppState } from 'react-native';
import { initLlama, type LlamaContext } from 'llama.rn';
import { hashModelFile } from '../../../../modules/lumi-model-files';
import {
  cancelScene,
  describeScene,
  forgetVerifiedModel,
  inspectSceneModel,
  useSceneState,
  waitForScene,
} from '../scene';
import type { ModelManifest } from '../catalog';

const mockManifest: ModelManifest = {
  kind: 'standard',
  repo: 'test',
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
jest.mock('../modelStore', () => ({
  modelDirectory: () => 'file:///models/',
  useModels: { getState: () => ({ installed: { standard: mockManifest } }) },
}));
jest.mock('../../../../modules/lumi-model-files', () => ({
  hashModelFile: jest.fn(),
  cancelModelHash: jest.fn(),
}));
const context = {
  initMultimodal: jest.fn(),
  getMultimodalSupport: jest.fn(),
  completion: jest.fn(),
  release: jest.fn(),
  stopCompletion: jest.fn(),
};
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(AppState, 'currentState', {
    value: 'active',
    writable: true,
    configurable: true,
  });
  forgetVerifiedModel('standard');
  jest.mocked(hashModelFile).mockResolvedValue('a'.repeat(64));
  jest.mocked(initLlama).mockResolvedValue(context as unknown as LlamaContext);
  context.initMultimodal.mockResolvedValue(true);
  context.getMultimodalSupport.mockResolvedValue({ vision: true, audio: false });
  context.completion.mockResolvedValue({ text: 'A shelf. A lamp. A window. Extra sentence.' });
  context.release.mockResolvedValue(undefined);
  context.stopCompletion.mockResolvedValue(undefined);
});
afterEach(async () => {
  cancelScene();
  await waitForScene();
});
it('runs only local images with bounded output and frees the native context', async () => {
  const result = await describeScene('file:///photo.jpg', 'standard');
  expect(result.text).toBe('A shelf. A lamp. A window.');
  expect(result.revision).toBe(mockManifest.revision);
  expect(initLlama).toHaveBeenCalledWith(
    expect.objectContaining({ ctx_shift: false, n_ctx: 2048, use_mmap: true }),
  );
  expect(context.completion).toHaveBeenCalledWith(
    expect.objectContaining({
      n_predict: 96,
      messages: [
        {
          role: 'user',
          content: [
            expect.any(Object),
            { type: 'image_url', image_url: { url: 'file:///photo.jpg' } },
          ],
        },
      ],
    }),
  );
  expect(context.release).toHaveBeenCalledTimes(1);
  expect(useSceneState.getState().busy).toBe(false);
});
it('validates actual vision support on install without generating a description', async () => {
  await inspectSceneModel(mockManifest);
  expect(context.completion).not.toHaveBeenCalled();
  expect(context.getMultimodalSupport).toHaveBeenCalled();
  expect(context.release).toHaveBeenCalled();
});
it('rejects text-only projectors and frees native memory', async () => {
  context.getMultimodalSupport.mockResolvedValueOnce({ vision: false });
  await expect(describeScene('file:///photo.jpg', 'standard')).rejects.toThrow(
    'vision unavailable',
  );
  expect(context.release).toHaveBeenCalled();
});
it('rejects remote image URLs without invoking the runtime', async () => {
  await expect(describeScene('https://example.com/photo.jpg', 'standard')).rejects.toThrow(
    'unavailable',
  );
  expect(initLlama).not.toHaveBeenCalled();
});
it('rejects mismatched model hashes before native initialization', async () => {
  jest.mocked(hashModelFile).mockResolvedValueOnce('0'.repeat(64));
  await expect(describeScene('file:///photo.jpg', 'standard')).rejects.toThrow('checksum');
  expect(initLlama).not.toHaveBeenCalled();
});
it('retains exclusive ownership while a cancelled initializer is still running', async () => {
  let finish!: (value: LlamaContext) => void;
  jest.mocked(initLlama).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pending = describeScene('file:///photo.jpg', 'standard');
  const assertion = expect(pending).rejects.toThrow('cancelled');
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  cancelScene();
  await expect(describeScene('file:///other.jpg', 'standard')).rejects.toThrow('busy');
  finish(context as unknown as LlamaContext);
  await assertion;
  expect(context.completion).not.toHaveBeenCalled();
  expect(context.release).toHaveBeenCalledTimes(1);
  expect(useSceneState.getState().busy).toBe(false);
});
