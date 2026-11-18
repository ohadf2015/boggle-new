import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const LUCIDE_COINS = /import\s*\{[^}]*\bCoins\b[^}]*\}\s*from\s*['"]lucide-react['"]/;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path);
    return /\.tsx?$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

describe('coin icon', () => {
  it('never comes from lucide, whose inner tick looks like the Hebrew letter ך', () => {
    const files = ['components', 'app'].flatMap((d) => sources(join(ROOT, d)));
    expect(files.filter((f) => LUCIDE_COINS.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f))).toEqual([]);
  });
});
