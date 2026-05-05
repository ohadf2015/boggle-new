/**
 * Hebrew final-letter audit — practice boards must NEVER include sofits
 * (ם ץ ך ן ף). Real letter pool excludes them (lib/adventure/gridConstants.ts);
 * static practice boards must match.
 *
 * This test reads the source files and asserts no final-form glyph appears
 * in the Hebrew board literals. Bug it would have caught: pre-2026-05-05
 * boards baked in ם and ן, breaking the "matches real game" promise.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SOFITS = ['ם', 'ץ', 'ך', 'ן', 'ף'];

const FILES = [
  'components/practice/PracticeClassicSandbox.tsx',
  'components/practice/PracticeWordHuntSandbox.tsx',
  'components/practice/PracticeWheelSandbox.tsx',
  'components/practice/PracticeMiniDemo.tsx',
];

describe('Practice boards — Hebrew finals audit', () => {
  for (const rel of FILES) {
    it(`${rel} contains no Hebrew final letters`, () => {
      const abs = path.join(process.cwd(), rel);
      const src = fs.readFileSync(abs, 'utf8');
      // Strip comments — block + single-line — so doc-comments mentioning the
      // sofits (e.g. "no ם ץ ך ן ף") don't trip the audit.
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      for (const sofit of SOFITS) {
        expect(stripped, `${rel} contains sofit "${sofit}"`).not.toContain(sofit);
      }
    });
  }
});
