/**
 * @jest-environment jsdom
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Test for mobile scroll layout compliance in SinglePlayerResults
 *
 * CRITICAL BUG FIX TEST:
 * When a mobile view has a fixed bottom tab bar, the scrollable content area
 * needs explicit height constraints via the `isolate-scroll` class to create
 * an isolated scroll context that works independently of body scroll.
 *
 * Without `isolate-scroll`, the flex container can grow infinitely and never
 * trigger overflow scrolling, leaving users unable to scroll on mobile.
 *
 * CORRECT PATTERN (allows scrolling with fixed tab bar):
 * - Parent: `min-h-dvh flex flex-col`
 * - Scrollable child: `flex-1 min-h-0 overflow-y-auto overscroll-contain scrollable-area isolate-scroll`
 *
 * INCORRECT PATTERN (blocks scrolling):
 * - Scrollable child: `flex-1 min-h-0 overflow-y-auto scrollable-area` (missing isolate-scroll)
 */

describe('SinglePlayerResults Mobile Scroll Layout', () => {
  const sourcePath = resolve(
    process.cwd(),
    'components/singleplayer/SinglePlayerResults.tsx'
  );
  const source = readFileSync(sourcePath, 'utf-8');

  describe('Mobile scroll isolation', () => {
    it('should have isolate-scroll class on mobile scrollable container for fixed tab bar compatibility', () => {
      // CRITICAL BUG FIX:
      // The mobile view has a fixed bottom tab bar. For scrolling to work,
      // the content area needs the `isolate-scroll` class which provides:
      // 1. Explicit height constraint (calc(100dvh - header - tab bar))
      // 2. Isolated scroll context (not relying on body scroll)
      // 3. Touch scrolling support (-webkit-overflow-scrolling: touch)
      //
      // Pattern: overflow-y-auto + isolate-scroll together

      const scrollablePattern =
        /overflow-y-auto[^"]*isolate-scroll|isolate-scroll[^"]*overflow-y-auto/;
      expect(source).toMatch(scrollablePattern);
    });

    it('should have explicit bottom padding for the fixed mobile tab bar', () => {
      // The scrollable content must have bottom padding to account for
      // the fixed mobile tab bar (which is ~64px + safe-area-inset-bottom)
      //
      // CORRECT: pb-[--mobile-bottom-safe]
      // This ensures content is scrollable past the fixed tab bar

      const bottomPaddingPattern =
        /overflow-y-auto[^"]*pb-\[--mobile-bottom-safe\]/;
      expect(source).toMatch(bottomPaddingPattern);
    });

    it('should have touch scrolling support classes on mobile scroll container', () => {
      // iOS has quirks with nested scroll containers.
      // The scrollable area needs:
      // 1. overscroll-behavior: contain (prevents pull-to-refresh interference)
      // 2. scrollable-area class (applies touch-action: pan-y)

      // Verify the scrollable content has touch scrolling support
      const touchScrollPattern =
        /overflow-y-auto[^"]*scrollable-area|scrollable-area[^"]*overflow-y-auto/;
      expect(source).toMatch(touchScrollPattern);

      // Verify overscroll-contain is applied
      const overscrollPattern =
        /overflow-y-auto[^"]*overscroll-contain|overscroll-contain[^"]*overflow-y-auto/;
      expect(source).toMatch(overscrollPattern);
    });

    it('should have min-h-0 on the scrollable container to allow overflow', () => {
      // min-h-0 is essential for flex children to have overflow-y-auto work
      // Without it, the flex item's minimum size is content-based and won't shrink

      const minH0Pattern =
        /overflow-y-auto[^"]*min-h-0|min-h-0[^"]*overflow-y-auto/;
      expect(source).toMatch(minH0Pattern);
    });
  });

  describe('Mobile view structure', () => {
    it('should have md:hidden class to only show mobile layout on small screens', () => {
      // The mobile view should be wrapped with md:hidden to hide on desktop
      // and the fixed tab bar should only appear in mobile view

      expect(source).toMatch(/md:hidden/);
    });

    it('should have fixed bottom tab bar with proper z-index', () => {
      // The fixed bottom tab bar needs:
      // - fixed position
      // - bottom-0
      // - proper z-index (z-50)

      expect(source).toMatch(/fixed\s+bottom-0.*z-50|z-50.*fixed\s+bottom-0/);
    });
  });
});
