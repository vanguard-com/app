import { loadTensorflowModel } from 'react-native-fast-tflite';
import { createResizer, isResizerAvailable } from 'react-native-vision-camera-resizer';

import { poseAsset } from './poseAsset';

export async function loadPoseResources() {
  if (poseAsset === null) throw new Error('MoveNet model is not installed in this build');
  if (!isResizerAvailable()) throw new Error('The GPU resizer is unavailable');
  const model = await loadTensorflowModel(poseAsset, []);
  if (
    model.inputs.length !== 1 ||
    model.inputs[0].dataType !== 'uint8' ||
    model.inputs[0].shape.join(',') !== '1,192,192,3' ||
    model.outputs.length !== 1 ||
    model.outputs[0].dataType !== 'float32' ||
    model.outputs[0].shape.join(',') !== '1,1,17,3'
  ) {
    model.dispose();
    throw new Error('Unexpected MoveNet tensor contract');
  }
  try {
    const resizer = await createResizer({
      width: 192,
      height: 192,
      channelOrder: 'rgb',
      dataType: 'uint8',
      scaleMode: 'contain',
      pixelLayout: 'interleaved',
    });
    return { model, resizer };
  } catch (error) {
    model.dispose();
    throw error;
  }
}
