/**
 * LexiClash shares never carry emoji (product rule, see lib/share/stripEmoji.ts).
 * Every `navigator.share(...)` call site must strip emoji from the text/title
 * it hands the OS share sheet — verified here by requiring the file to at
 * least reference `stripEmoji`, so a new share sink can't silently reintroduce
 * emoji the way the pre-cce862d77 sinks did.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const DIRS = ['components', 'hooks', 'lib', 'utils', 'app'];

// Already strips at its own choke point — belt-and-suspenders callers route
// through it rather than referencing stripEmoji directly.
const ALLOWLIST = new Set(['utils/shareWithFallback.ts']);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : sourceFiles(p);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

const files = DIRS.flatMap((d) => sourceFiles(join(ROOT, d)));

describe('every navigator.share sink strips emoji', () => {
  it('no source calling navigator.share( omits a stripEmoji reference', () => {
    const offenders = files
      .filter((f) => f.slice(ROOT.length + 1).replace(/\\/g, '/') !== undefined)
      .filter((f) => {
        const rel = f.slice(ROOT.length + 1).replace(/\\/g, '/');
        if (ALLOWLIST.has(rel)) return false;
        const src = readFileSync(f, 'utf8');
        return /navigator\.share\(/.test(src) && !/stripEmoji/.test(src);
      })
      .map((f) => f.slice(ROOT.length + 1));
    expect(offenders).toEqual([]);
  });
});
