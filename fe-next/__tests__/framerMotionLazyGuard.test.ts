import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * GUARD: app code renders framer-motion through `m` (LazyMotion), never `motion`.
 * `LazyMotionRoot` loads the feature set once; `motion` ships the full engine
 * into whichever chunk imports it.
 */

const ROOT = join(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'hooks', 'lib', 'host', 'player', 'utils', 'contexts'];
const SKIP = new Set(['node_modules', '.next', '__tests__', '__mocks__', 'e2e', 'dist', 'build']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\./.test(name)) out.push(full);
  }
  return out;
}

const MOTION_IMPORT = /import\s+(?:type\s+)?\{[^}]*\bmotion\b[^}]*\}\s*from\s*['"]framer-motion['"]/;

describe('framer-motion import guard', () => {
  it('no non-test source file imports `motion` from framer-motion', () => {
    const offenders: string[] = [];
    for (const d of SCAN_DIRS) {
      let files: string[] = [];
      try { files = walk(join(ROOT, d)); } catch { continue; }
      for (const f of files) {
        if (MOTION_IMPORT.test(readFileSync(f, 'utf8'))) offenders.push(relative(ROOT, f));
      }
    }
    expect(offenders).toEqual([]);
  });
});
