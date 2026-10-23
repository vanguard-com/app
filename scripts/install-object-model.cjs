/* global __dirname */
// Restore the reviewed official TensorFlow COCO SSD asset without changing its pinned checksum.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const metadata = JSON.parse(
  fs.readFileSync(path.join(root, 'assets/models/coco-ssd-mobilenet.json'), 'utf8'),
);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lumi-coco-'));
try {
  const archive = path.join(temp, 'model.zip');
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
      metadata.source,
      '-o',
      archive,
    ],
    { stdio: 'inherit' },
  );
  const bytes = execFileSync('unzip', ['-p', archive, 'detect.tflite'], {
    maxBuffer: 8 * 1024 * 1024,
  });
  if (
    bytes.length !== metadata.bytes ||
    bytes.toString('ascii', 4, 8) !== 'TFL3' ||
    crypto.createHash('sha256').update(bytes).digest('hex') !== metadata.sha256
  )
    throw new Error('COCO model changed; review its source and checksum before replacing it');
  fs.writeFileSync(path.join(root, 'assets/models/coco-ssd-mobilenet.tflite'), bytes);
  console.warn('Installed verified COCO SSD model:', bytes.length, 'bytes');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
