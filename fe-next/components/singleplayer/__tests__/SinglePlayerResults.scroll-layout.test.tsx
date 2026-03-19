/**
 * @jest-environment jsdom
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Test for scroll layout compliance in SinglePlayerResults
 *
 * Uses natural page scroll (no internal overflow container) so mobile
 * scrolling works reliably. Fixed bottom bar on mobile provides the
 * sticky CTA. Bottom padding (pb-40) ensures content clears the bar.
 */

describe('SinglePlayerResults Scroll Layout', () => {
  const sourcePath = resolve(
    process.cwd(),
    'components/singleplayer/SinglePlayerResults.tsx'
  );
  const source = readFileSync(sourcePath, 'utf-8');

  describe('Natural scroll layout', () => {
    it('should NOT use overflow-y-auto (relies on natural page scroll)', () => {
      // The portrait/desktop layout section should not have overflow-y-auto.
      // Internal scroll containers inside unconstrained parents never activate.
      // The landscape section still uses overflow-y-auto (that's fine - it has h-screen).
      const portraitSection = source.split('PORTRAIT / DESKTOP')[1];
      expect(portraitSection).not.toMatch(/overflow-y-auto/);
    });

    it('should have bottom padding on mobile for the sticky bar', () => {
      // pb-20 ensures content scrolls past the fixed bottom bar without excess whitespace
      expect(source).toMatch(/pb-20/);
    });

    it('should use min-h-dvh for full-page feel', () => {
      expect(source).toMatch(/min-h-dvh/);
    });
  });

  describe('Mobile sticky bar', () => {
    it('should conditionally render sticky bar for non-desktop only', () => {
      // Uses isDesktop hook to conditionally render (not md:hidden CSS)
      expect(source).toMatch(/!isDesktop/);
    });

    it('should have fixed bottom bar with z-50 for mobile CTA', () => {
      expect(source).toMatch(/fixed bottom-0.*z-50|z-50.*fixed bottom-0/);
    });

    it('should use landscape variant for compact layout in sticky bar', () => {
      // The sticky bar uses the compact landscape variant of NextStepPrompt
      expect(source).toMatch(/variant="landscape"/);
    });
  });
});
