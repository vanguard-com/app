import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadTensorflowModel } from 'react-native-fast-tflite';
import { createResizer, isResizerAvailable } from 'react-native-vision-camera-resizer';

import { loadPoseResources } from '../poseResources';

describe('bundled MoveNet artifact', () => {
  it('matches its recorded checksum and is a real TensorFlow Lite flatbuffer', () => {
    const root = resolve(__dirname, '../../../../');
    const bytes = readFileSync(resolve(root, 'assets/models/movenet-lightning.tflite'));
    const metadata = JSON.parse(
      readFileSync(resolve(root, 'assets/models/movenet-lightning.json'), 'utf8'),
    );
    expect(bytes.toString('ascii', 4, 8)).toBe('TFL3');
    expect(bytes.length).toBe(metadata.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(metadata.sha256);
  });
  it('loads the expected model contract and releases it if the tensor shape is wrong', async () => {
    jest.mocked(isResizerAvailable).mockReturnValue(true);
    const dispose = jest.fn();
    jest.mocked(loadTensorflowModel).mockResolvedValueOnce({
      inputs: [{ dataType: 'float32', shape: [1, 1] }],
      outputs: [],
      dispose,
    } as unknown as Awaited<ReturnType<typeof loadTensorflowModel>>);
    await expect(loadPoseResources()).rejects.toThrow('Unexpected MoveNet');
    expect(dispose).toHaveBeenCalled();
    const model = {
      inputs: [{ dataType: 'uint8', shape: [1, 192, 192, 3] }],
      outputs: [{ dataType: 'float32', shape: [1, 1, 17, 3] }],
      dispose,
    };
    jest
      .mocked(loadTensorflowModel)
      .mockResolvedValueOnce(model as unknown as Awaited<ReturnType<typeof loadTensorflowModel>>);
    const resizer = { resize: jest.fn(), dispose: jest.fn() };
    jest
      .mocked(createResizer)
      .mockResolvedValueOnce(resizer as unknown as Awaited<ReturnType<typeof createResizer>>);
    expect(await loadPoseResources()).toEqual({ model, resizer });
    expect(createResizer).toHaveBeenCalledWith(
      expect.objectContaining({ dataType: 'uint8', scaleMode: 'contain', width: 192, height: 192 }),
    );
  });
});
