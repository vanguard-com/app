import { parseManifest, progressMilestone, shortDescription, supportsModel } from '../catalog';
const file = (rfilename: string) => ({ rfilename, lfs: { size: 1000, sha256: 'a'.repeat(64) } });
const metadata = {
  sha: 'b'.repeat(40),
  siblings: [
    file('SmolVLM2-500M-Video-Instruct-Q8_0.gguf'),
    file('mmproj-SmolVLM2-500M-Video-Instruct-f16.gguf'),
  ],
};
it('pins model and vision projector to one immutable publisher revision', () => {
  const m = parseManifest('standard', metadata);
  expect(m.bytes).toBe(2000);
  expect(m.files[0].url).toContain(`/resolve/${metadata.sha}/`);
  expect(m.files[1].name).toContain('mmproj-');
});
it('never treats a text-only Gemma file as an installable vision model', () => {
  expect(() =>
    parseManifest('detailed', { ...metadata, siblings: [file('gemma-3n-E2B-it-Q4_K_M.gguf')] }),
  ).toThrow('vision model pair');
});
it.each([
  {},
  { ...metadata, sha: 'main' },
  { ...metadata, siblings: [file('../SmolVLM2-500M-Video-Instruct-Q8_0.gguf')] },
  {
    ...metadata,
    siblings: [
      { ...metadata.siblings[0], lfs: { size: 1000, sha256: 'invalid' } },
      metadata.siblings[1],
    ],
  },
])('rejects incomplete or unverified manifests', (data) => {
  expect(() => parseManifest('standard', data)).toThrow();
});
it('checks RAM and space with a reserve, including unknown RAM', () => {
  expect(supportsModel('standard', 4 * 1024 ** 3, 4e9, 1e9)).toBe(true);
  expect(supportsModel('detailed', 4 * 1024 ** 3, 10e9, 3e9)).toBe(false);
  expect(supportsModel('detailed', 8 * 1024 ** 3, 3e9, 3e9)).toBe(false);
  expect(supportsModel('standard', null, 10e9, 1e9)).toBe(false);
});
it('reports every 20 percent boundary, bounded at 100', () => {
  expect([0, 19, 20, 39, 40, 99, 100, 120].map((n) => progressMilestone(n, 100))).toEqual([
    0, 0, 20, 20, 40, 80, 100, 100,
  ]);
  expect(progressMilestone(10, 0)).toBe(0);
});
it('limits generated text to three sentences and removes special tokens', () => {
  expect(shortDescription('<|im_start|>A chair. A lamp! A shelf? A cat.')).toBe(
    'A chair. A lamp! A shelf?',
  );
});
