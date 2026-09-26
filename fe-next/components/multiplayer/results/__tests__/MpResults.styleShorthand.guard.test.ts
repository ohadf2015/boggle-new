/**
 * Guard: no RESULTS-owned inline style mixes the `background` shorthand with a
 * `background*` longhand. React warns ("Updating a style property during
 * rerender (background) when a conflicting property is set (backgroundSize)")
 * the first time such an object re-renders with a new shorthand value, and the
 * shorthand silently resets the longhand in the browser. Round-1 capture logged
 * that warning once per client; this pins that none of it can come from here.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../../..');
const OWNED_DIRS = ['components/multiplayer/results'];
const OWNED_FILES = [
  'components/multiplayer/HostWordSelector.tsx',
  'components/multiplayer/NearRankTeaser.tsx',
  'components/multiplayer/NextModeTease.tsx',
  'components/multiplayer/GlobalRankBadge.tsx',
  'components/multiplayer/EloRankBadge.tsx',
  'components/multiplayer/WinStreakBadge.tsx',
];

function ownedSources(): string[] {
  const files = [...OWNED_FILES];
  for (const dir of OWNED_DIRS) {
    for (const f of fs.readdirSync(path.join(ROOT, dir))) {
      if (/\.tsx?$/.test(f)) files.push(path.join(dir, f));
    }
  }
  return files.filter((f) => fs.existsSync(path.join(ROOT, f)));
}

/** Each `{ ... }` object literal (non-nested) that declares a `background` shorthand key. */
export function mixedBackgroundObjects(src: string): string[] {
  const hits: string[] = [];
  const re = /\{[^{}]*\bbackground\s*:[^{}]*\}/g;
  for (const m of src.matchAll(re)) {
    if (/\bbackground[A-Z]\w*\s*:/.test(m[0])) hits.push(m[0].slice(0, 120));
  }
  return hits;
}

describe('RESULTS inline styles never mix background shorthand + longhand', () => {
  it('the detector catches the pattern React warns about', () => {
    expect(mixedBackgroundObjects("style={{ background: 'red', backgroundSize: '200% 100%' }}")).toHaveLength(1);
    expect(mixedBackgroundObjects("style={{ backgroundImage: 'x', backgroundSize: '7px 7px' }}")).toHaveLength(0);
    expect(mixedBackgroundObjects("style={{ background: 'red' }}")).toHaveLength(0);
  });

  it('scans a non-trivial set of owned files', () => {
    expect(ownedSources().length).toBeGreaterThan(15);
  });

  for (const file of ownedSources()) {
    it(file, () => {
      expect(mixedBackgroundObjects(fs.readFileSync(path.join(ROOT, file), 'utf8'))).toEqual([]);
    });
  }
});
