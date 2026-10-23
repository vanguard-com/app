import { loadTensorflowModel } from 'react-native-fast-tflite';
import { createResizer, isResizerAvailable } from 'react-native-vision-camera-resizer';

export async function loadObjectResources() {
  if (!isResizerAvailable()) throw new Error('GPU resizer unavailable');
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro requires a static bundled model asset.
  const asset = require('../../../assets/models/coco-ssd-mobilenet.tflite');
  const model = await loadTensorflowModel(asset, []);
  const shapes = ['1,10,4', '1,10', '1,10', '1'];
  if (
    model.inputs.length !== 1 ||
    model.inputs[0].dataType !== 'uint8' ||
    model.inputs[0].shape.join(',') !== '1,300,300,3' ||
    model.outputs.length !== 4 ||
    model.outputs.some((o, i) => o.dataType !== 'float32' || o.shape.join(',') !== shapes[i])
  ) {
    model.dispose();
    throw new Error('Unexpected COCO SSD tensor contract');
  }
  try {
    return {
      model,
      resizer: await createResizer({
        width: 300,
        height: 300,
        channelOrder: 'rgb',
        dataType: 'uint8',
        scaleMode: 'contain',
        pixelLayout: 'interleaved',
      }),
    };
  } catch (error) {
    model.dispose();
    throw error;
  }
}
