/**
 * PracticeSandbox responsive layout contract (className-based).
 *
 * The sandbox root MUST allow vertical scroll (and clip horizontally) at EVERY
 * breakpoint — not just desktop. The live games (e.g. DailyWordHuntSurvival)
 * use `overflow-x-clip overflow-y-auto`, so on short phones their content is
 * never clipped: the board fills the available flex space and the page scrolls
 * if the surrounding chrome doesn't fit. Practice previously used
 * `overflow-hidden md:overflow-y-auto`, which hard-clipped on mobile and
 * squeezed the board on short viewports (the reported "board responsiveness"
 * bug). This test pins the new contract so we don't regress to mobile clipping.
 *
 * NOTE: jsdom/happy-dom has no layout engine, so visual verification (no clipped
 * content, board fills the viewport) must be done via browser screenshot. This
 * test only verifies the className strings.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOTS = [
  'PracticeClassicSandbox.tsx',
  'PracticeWordHuntSandbox.tsx',
  'PracticeWheelSandbox.tsx',
];

describe('PracticeSandbox — responsive overflow contract (classNames)', () => {
  for (const file of ROOTS) {
    it(`${file} root scrolls vertically at every breakpoint (matches live game)`, () => {
      const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf-8');
      // Vertical scroll is always available — never hard-clipped on mobile.
      expect(content).toContain('overflow-y-auto');
      expect(content).toContain('overflow-x-clip');
      // Must NOT hard-clip content (the old mobile `overflow-hidden` default).
      expect(content).not.toContain('overflow-hidden md:overflow-y-auto');
    });
  }
});
