import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '../../..');
const REVEAL_SURFACES = /<(SessionRevealHost|ResultsModals)\b/;

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === '__tests__' || name === 'node_modules') return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return name.endsWith('.tsx') ? [path] : [];
  });
}

describe('every screen that renders unlock reveals registers as a reveal host', () => {
  const rendering = [...tsxFiles(join(ROOT, 'components')), ...tsxFiles(join(ROOT, 'app'))]
    .filter((f) => REVEAL_SURFACES.test(readFileSync(f, 'utf8')));

  it('finds the known reveal screens', () => {
    expect(rendering.length).toBeGreaterThanOrEqual(3);
  });

  it.each(rendering.map((f) => [relative(ROOT, f), f]))('%s calls useRevealHost()', (_rel, file) => {
    expect(readFileSync(file, 'utf8')).toMatch(/useRevealHost\(\)/);
  });
});
