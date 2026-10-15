// Version-pinned native throttle: the upstream output has preview resolution and backpressure,
// but no inference-rate option. Gate BEFORE ML Kit, not just JS callbacks, to limit battery use.
const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(require.resolve('react-native-vision-camera-face-detector/package.json'));
const marker = 'LUMI_FRAMING_12_FPS';
const patches = [
  ['ios/HybridFaceDetectorOutput.swift',
    '  private var isBusy = false',
    '  private var lastDetectionTime: TimeInterval = 0 // ' + marker + '\n  private var isBusy = false',
    '    if isBusy { return }',
    '    if isBusy { return }\n    let now = ProcessInfo.processInfo.systemUptime\n    if now - lastDetectionTime < (1.0 / 12.0) { return }\n    lastDetectionTime = now'],
  ['android/src/main/java/com/margelo/nitro/camera/facedetector/HybridFaceDetectorOutput.kt',
    '  private var isBusy = AtomicBoolean(false)',
    '  private var lastDetectionNanos = 0L // ' + marker + '\n  private var isBusy = AtomicBoolean(false)',
    '  override fun analyze(imageProxy: ImageProxy) {',
    '  override fun analyze(imageProxy: ImageProxy) {\n    val now = System.nanoTime()\n    if (now - lastDetectionNanos < 83_333_333L) {\n      imageProxy.close()\n      return\n    }\n    lastDetectionNanos = now'],
];
for (const [relative, field, replacementField, gate, replacementGate] of patches) {
  const file = path.join(root, relative);
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(marker)) continue;
  if (!source.includes(field) || !source.includes(gate)) throw new Error('Face detector source changed; review Lumi throttle: ' + relative);
  fs.writeFileSync(file, source.replace(field, replacementField).replace(gate, replacementGate));
}
