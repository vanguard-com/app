/// <reference types="node" />
import fs from 'fs';
import path from 'path';

// Enforces "use only theme tokens": no colour literals outside src/theme/theme.ts.
const ROOT = path.resolve(__dirname, '../../..');
const SCAN_DIRS = ['app', 'src'];
const ALLOWED = new Set([path.join(ROOT, 'src/theme/theme.ts')]);

const HEX_LITERAL = /['"`]#[0-9a-fA-F]{3,8}['"`]/;
const RGB_LITERAL = /['"`]rgba?\(/;
const NAMED_COLOR =
  /\b(color|backgroundColor|borderColor|tintColor|shadowColor|[a-zA-Z]+Color)\s*[:=]\s*\{?\s*['"](?!transparent['"])[a-zA-Z]+['"]/;

function listSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || entry.name === 'node_modules'
        ? []
        : listSourceFiles(full);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe('theme tokens only', () => {
  const files = SCAN_DIRS.flatMap((d) => listSourceFiles(path.join(ROOT, d))).filter(
    (f) => !ALLOWED.has(f),
  );

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [path.relative(ROOT, f), f]))('%s has no colour literals', (_, file) => {
    const offending = fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(
        ({ line }) => HEX_LITERAL.test(line) || RGB_LITERAL.test(line) || NAMED_COLOR.test(line),
      );
    expect(offending).toEqual([]);
  });
});
