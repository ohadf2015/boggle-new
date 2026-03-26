/**
 * Test for isolate-scroll CSS class height calculation
 * Using require to avoid vitest.setup.js window mock issues
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Test for isolate-scroll CSS class height calculation
 *
 * CRITICAL BUG FIX TEST:
 * The isolate-scroll class creates a fixed-height scroll container for mobile
 * pages with fixed bottom tab bars. The height calculation must account for
 * all PARENT elements that consume viewport space, but NOT sibling elements
 * within the flex container.
 *
 * CORRECT: Subtract only parent-level elements outside the flex container
 * - AutoHideHeader (60px) - outside the component
 * - main.pb-16 (64px) - layout padding outside the component
 * - safe-area-inset-bottom - device safe area
 *
 * INCORRECT: Subtract sibling elements inside the flex container
 * - Compact Header - this is a sibling, flex handles its sizing automatically
 *
 * When isolate-scroll incorrectly subtracts sibling height (48px), the scroll
 * area becomes 48px shorter than needed, preventing scrolling.
 */

describe('isolate-scroll CSS Class', () => {
  const cssPath = resolve(process.cwd(), 'app/animations.css');
  const css = readFileSync(cssPath, 'utf-8');

  describe('Height calculation', () => {
    it('should NOT subtract sibling compact header height (48px)', () => {
      // Find the isolate-scroll class definition
      const isolateScrollPattern = /\.isolate-scroll\s*\{[^}]*height:\s*calc\(([^)]+)\)/;
      const match = css.match(isolateScrollPattern);

      expect(match).toBeTruthy();
      if (match) {
        const calcFormula = match[1];

        // The formula should NOT contain 48px (the compact header height)
        // because the compact header is a sibling element in the flex layout,
        // not a parent element outside the component.
        //
        // Flex layout automatically handles sibling sizing - we only need
        // to subtract parent elements that consume space OUTSIDE our component.
        expect(calcFormula).not.toMatch(/48px/);

        // Should contain AutoHideHeader (60px)
        expect(calcFormula).toMatch(/60px/);

        // Should contain main.pb-16 (64px)
        expect(calcFormula).toMatch(/64px/);

        // Should contain safe-area-inset-bottom
        expect(calcFormula).toMatch(/env\s*\(\s*safe-area-inset-bottom/);
      }
    });

    it('should only subtract parent-level elements in height calculation', () => {
      // The correct formula accounts for:
      // 1. 100dvh - full viewport
      // 2. -60px - AutoHideHeader (parent element, always present)
      // 3. -64px - main.pb-16 (layout padding for bottom nav space)
      // 4. -safe-area - device safe area
      //
      // NOT included (because they're siblings in flex layout):
      // - Compact header inside the component

      const isolateScrollPattern = /\.isolate-scroll\s*\{[^}]*height:\s*calc\(([^)]+)\)/;
      const match = css.match(isolateScrollPattern);

      expect(match).toBeTruthy();
      if (match) {
        const calcFormula = match[1];

        // Parse the explicit subtraction values (find all "- NNpx" patterns)
        // Note: 0px is a default fallback for env(), not an explicit subtraction
        const pxValues = calcFormula.match(/- \d+px/g) || [];

        // Should have exactly 2 subtraction values: 60px and 64px
        // (not 3 values which would include the incorrect 48px)
        expect(pxValues).toHaveLength(2);
        expect(pxValues).toContain('- 60px');
        expect(pxValues).toContain('- 64px');
      }
    });
  });
});
