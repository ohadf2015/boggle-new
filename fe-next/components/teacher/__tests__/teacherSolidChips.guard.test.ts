import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../..');
const DIRS = ['components/teacher', 'app/[locale]/teacher'];
// A pale wash of an accent inside its own accent outline reads as a faded chip on the cream surface.
const PALE_CHIP = /\bborder-neo-(lime|cyan|pink|purple|yellow|red)\s+bg-neo-\1\/\d+/g;
// Status filter cards whose label colour is shared with plain-cream rows; a solid fill would hide that text.
const ALLOW = new Set(['components/teacher/analytics/overview/overviewModel.ts']);

function files(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir)).flatMap((name) => {
    const rel = path.join(dir, name);
    if (statSync(path.join(ROOT, rel)).isDirectory()) return name === '__tests__' ? [] : files(rel);
    return /\.(tsx?|ts)$/.test(name) && !/\.test\./.test(name) ? [rel] : [];
  });
}

describe('teacher status chips on the sky page', () => {
  it('are solid accent fills with a black outline, never a pale wash', () => {
    const offenders = DIRS.flatMap(files)
      .filter((f) => !ALLOW.has(f))
      .flatMap((f) => (readFileSync(path.join(ROOT, f), 'utf8').match(PALE_CHIP) ?? []).map((m) => `${f}: ${m}`));
    expect(offenders).toEqual([]);
  });
});
