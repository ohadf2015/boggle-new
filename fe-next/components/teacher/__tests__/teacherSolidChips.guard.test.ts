import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../..');
const DIRS = ['components/teacher', 'app/[locale]/teacher'];
// A pale wash of an accent inside its own accent outline reads as a faded chip on the cream surface.
const PALE_CHIP = /\bborder-(?:neo-(lime|cyan|pink|purple|yellow|red)(?:\/\d+)?|edu-(lime|cyan|pink|purple|yellow)-ink)\s+bg-neo-(?:\1|\2)\/\d+/g;
const PALE_TILE = /\bbg-neo-red\/\d+/g;
const ALLOW = new Set<string>();

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
      .flatMap((f) => {
        const src = readFileSync(path.join(ROOT, f), 'utf8');
        return [...(src.match(PALE_CHIP) ?? []), ...(src.match(PALE_TILE) ?? [])].map((m) => `${f}: ${m}`);
      });
    expect(offenders).toEqual([]);
  });
});
