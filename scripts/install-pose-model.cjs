/* global __dirname */
// Download Google's MoveNet Lightning through its official Kaggle distribution.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const source =
  'https://www.kaggle.com/api/v1/models/google/movenet/tfLite/singlepose-lightning-tflite-int8/1/download';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lumi-pose-'));
try {
  const archive = path.join(temp, 'model.tar.gz');
  execFileSync(
    'curl',
    [
      '--fail',
      '--location',
      '--proto',
      '=https',
      '--tlsv1.2',
      '--silent',
      '--show-error',
      source,
      '-o',
      archive,
    ],
    { stdio: 'inherit' },
  );
  const names = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n');
  const models = names.filter(
    (name) =>
      name.endsWith('.tflite') &&
      !name.startsWith('-') &&
      !name.startsWith('/') &&
      !name.split('/').includes('..'),
  );
  if (models.length !== 1) throw new Error('Expected exactly one model in the official archive');
  const bytes = execFileSync('tar', ['-xOzf', archive, '--', models[0]], {
    maxBuffer: 16 * 1024 * 1024,
  });
  if (bytes.toString('ascii', 4, 8) !== 'TFL3') throw new Error('Not a TensorFlow Lite model');
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const metadataPath = path.join(root, 'assets/models/movenet-lightning.json');
  if (fs.existsSync(metadataPath)) {
    const expected = JSON.parse(fs.readFileSync(metadataPath, 'utf8')).sha256;
    if (sha256 !== expected)
      throw new Error('Model checksum changed; review the official release before replacing it');
  }
  fs.writeFileSync(path.join(root, 'assets/models/movenet-lightning.tflite'), bytes);
  fs.writeFileSync(
    metadataPath,
    JSON.stringify({ source, licence: 'Apache-2.0', sha256, bytes: bytes.length }, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(root, 'src/features/feedback/poseAsset.ts'),
    "// Google MoveNet Lightning, provenance and checksum in assets/models/movenet-lightning.json.\n// eslint-disable-next-line @typescript-eslint/no-require-imports\nexport const poseAsset: number | null = require('../../../assets/models/movenet-lightning.tflite');\n",
  );
  console.warn('Installed verified MoveNet asset:', bytes.length, 'bytes; SHA-256:', sha256);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
