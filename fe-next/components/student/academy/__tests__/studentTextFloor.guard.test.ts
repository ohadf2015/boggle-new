import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIRS = ['components/student', 'components/education/practice', 'components/education/economy'];

function sources(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : sources(rel);
    return /\.tsx?$/.test(e.name) ? [rel] : [];
  });
}

/** Arbitrary font sizes under 12px: text-[9px], text-[11px], text-[0.65rem], text-[0.7rem]. */
const TINY = /text-\[(?:(?:[0-9]|1[01])(?:\.\d+)?px|0\.(?:[0-6]\d*|7[0-4]?\d*)rem)\]/g;

describe('student screens never print text under 12px', () => {
  it.each(DIRS.flatMap(sources))('%s', (file) => {
    expect(fs.readFileSync(path.join(ROOT, file), 'utf8').match(TINY) ?? []).toEqual([]);
  });
});
