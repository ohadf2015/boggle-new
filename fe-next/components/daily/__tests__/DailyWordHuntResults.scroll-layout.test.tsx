/**
 * @jest-environment jsdom
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Test for scroll layout compliance in DailyWordHuntResults
 *
 * CRITICAL BUG FIX TEST:
 * When a flex container uses `h-dvh` (100% device viewport height), it locks
 * the component height to the viewport, preventing vertical scrolling even if
 * child elements have `overflow-y-auto`.
 *
 * CORRECT PATTERN (allows scrolling):
 * - Parent: `flex-1 flex flex-col min-h-0` (NO h-dvh)
 * - Scrollable child: `flex-1 min-h-0 overflow-y-auto`
 *
 * INCORRECT PATTERN (blocks scrolling):
 * - Parent: `flex-1 flex flex-col min-h-0 h-dvh` (h-dvh locks height)
 * - Scrollable child: `flex-1 min-h-0 overflow-y-auto` (can't scroll because parent is fixed)
 *
 * The issue is that `h-dvh` creates a fixed height constraint that prevents
 * the flex layout from properly distributing overflow to scrollable children.
 */

describe('DailyWordHuntResults Scroll Layout', () => {
  const sourcePath = resolve(process.cwd(), 'components/daily/DailyWordHuntResults.tsx');
  const source = readFileSync(sourcePath, 'utf-8');

  describe('Root container layout', () => {
    it('should NOT use h-dvh on the root motion.div to allow scrolling', () => {
      // The root container pattern should be:
      // className="flex-1 flex flex-col min-h-0"
      // NOT:
      // className="flex-1 flex flex-col min-h-0 h-dvh"
      //
      // h-dvh locks the height to viewport, preventing child scroll

      // Find the root motion.div container with key="word-hunt-results"
      const rootContainerPattern = /key="word-hunt-results"[\s\S]*?className="([^"]+)"/;
      const match = source.match(rootContainerPattern);

      expect(match).toBeTruthy();
      if (match) {
        const className = match[1];
        // Should NOT contain h-dvh which blocks scrolling
        expect(className).not.toMatch(/\bh-dvh\b/);
        expect(className).not.toMatch(/\bh-screen\b/);
        // Should have flex-1 for proper flex sizing
        expect(className).toMatch(/\bflex-1\b/);
        // Should have min-h-0 to allow overflow
        expect(className).toMatch(/\bmin-h-0\b/);
      }
    });

    it('should have overflow-y-auto on the scrollable content area', () => {
      // The scrollable content area should have:
      // - flex-1 (take remaining space)
      // - min-h-0 (allow overflow)
      // - overflow-y-auto (enable scrolling)
      // - scrollable-area (touch scrolling support)

      const scrollablePattern = /className="[^"]*overflow-y-auto[^"]*"/g;
      const matches = source.match(scrollablePattern) || [];

      expect(matches.length).toBeGreaterThan(0);

      // At least one scrollable area should have proper setup
      const hasProperScrollSetup = matches.some(
        (match) =>
          match.includes('overflow-y-auto') &&
          match.includes('min-h-0') &&
          match.includes('scrollable-area')
      );
      expect(hasProperScrollSetup).toBe(true);
    });
  });

  describe('Flex layout hierarchy', () => {
    it('should use proper flex hierarchy for scrolling', () => {
      // Proper hierarchy for scrollable flex layouts:
      // 1. Root: flex flex-col (NO fixed height like h-dvh)
      // 2. Header: flex-shrink-0 (fixed size)
      // 3. Content: flex-1 min-h-0 overflow-y-auto (scrollable)
      // 4. Footer: flex-shrink-0 fixed (if using fixed positioning)

      // Check for flex-shrink-0 on header
      expect(source).toMatch(/className="[^"]*flex-shrink-0[^"]*"/);

      // Check for overflow-y-auto content area
      expect(source).toMatch(/className="[^"]*flex-1[^"]*min-h-0[^"]*overflow-y-auto/);
    });
  });
});

describe('DailyChallengeResults Scroll Layout', () => {
  const sourcePath = resolve(process.cwd(), 'components/daily/DailyChallengeResults.tsx');
  const source = readFileSync(sourcePath, 'utf-8');

  describe('Root container layout', () => {
    it('should NOT use h-dvh on the root container', () => {
      // Find the root motion.div with key="results"
      const rootPattern = /key="results"[\s\S]*?className="([^"]+)"/;
      const match = source.match(rootPattern);

      expect(match).toBeTruthy();
      if (match) {
        const className = match[1];
        // Should NOT contain h-dvh
        expect(className).not.toMatch(/\bh-dvh\b/);
        expect(className).not.toMatch(/\bh-screen\b/);
      }
    });

    it('should have overflow-y-auto for scrolling', () => {
      const scrollablePattern = /className="[^"]*overflow-y-auto[^"]*"/;
      expect(source).toMatch(scrollablePattern);
    });
  });
});

describe('DailyChallenge Container Layout', () => {
  const sourcePath = resolve(process.cwd(), 'components/daily/DailyChallenge.tsx');
  const source = readFileSync(sourcePath, 'utf-8');

  describe('Root container constraints', () => {
    it('should have proper height constraints for child scroll containers', () => {
      // The DailyChallenge wrapper must constrain height so child scroll works.
      // CRITICAL: Using `min-h-full` alone does NOT constrain height - content can
      // grow beyond viewport and break child scroll containers.
      //
      // CORRECT PATTERNS (constrain height):
      // - `h-full flex flex-col` (fixed to parent height)
      // - `flex-1 flex flex-col min-h-0` (flex-constrained)
      //
      // INCORRECT PATTERNS (allow unbounded growth):
      // - `min-h-full flex flex-col` (can grow beyond parent, breaks child scroll)
      // - `flex flex-col` without height constraint
      //
      // When a container uses min-h-full, it says "be at least as tall as parent"
      // but allows the container to grow taller. This means child elements with
      // overflow-y-auto can't scroll because the parent grows to fit all content.

      // Find the root container div in DailyChallenge render
      const rootContainerPattern = /return\s*\(\s*<div\s+[\s\S]*?className="([^"]+)"/;
      const match = source.match(rootContainerPattern);

      expect(match).toBeTruthy();
      if (match) {
        const className = match[1];
        // Should NOT use min-h-full alone (breaks child scroll)
        const hasMinHFull = /\bmin-h-full\b/.test(className);
        // Must either use h-full OR flex-1 with min-h-0 to properly constrain height
        const hasHFull = /\bh-full\b/.test(className);
        const hasFlex1WithMinH0 = /\bflex-1\b/.test(className) && /\bmin-h-0\b/.test(className);

        // ASSERTION: Must have proper height constraint (not just min-h-full)
        // Should have flex-1 + min-h-0 OR h-full (but NOT min-h-full alone)
        expect(hasHFull || hasFlex1WithMinH0).toBe(true);

        // If min-h-full is present, it must be accompanied by proper constraints
        if (hasMinHFull) {
          expect(hasHFull || hasFlex1WithMinH0).toBe(true);
        }
      }
    });

    it('should NOT use min-h-full without height constraints', () => {
      // min-h-full alone is a known bug pattern that prevents child scroll
      const rootContainerPattern = /return\s*\(\s*<div\s+[\s\S]*?className="([^"]+)"/;
      const match = source.match(rootContainerPattern);

      expect(match).toBeTruthy();
      if (match) {
        const className = match[1];
        const hasMinHFullAlone =
          /\bmin-h-full\b/.test(className) &&
          !/\bflex-1\b/.test(className) &&
          !/\bh-full\b/.test(className);

        // Should NOT have min-h-full without flex-1 or h-full
        expect(hasMinHFullAlone).toBe(false);
      }
    });
  });
});

describe('DailyWordHuntResults Mobile Scroll with Fixed Tab Bar', () => {
  const sourcePath = resolve(process.cwd(), 'components/daily/DailyWordHuntResults.tsx');
  const source = readFileSync(sourcePath, 'utf-8');

  describe('Mobile scroll isolation', () => {
    it('should have an isolated scroll container that works independently of body scroll', () => {
      // CRITICAL BUG FIX:
      // When content has a fixed bottom tab bar, the scrollable area needs to:
      // 1. Be isolated from parent scroll context (not rely on body scroll)
      // 2. Have explicit height constraints (h-full or fixed height formula)
      // 3. Handle the fixed tab bar spacing correctly
      //
      // The problem: screen-fit-content has `overflow: visible !important` which
      // delegates scrolling to the body. But with a fixed bottom tab bar that
      // overlays content, we need the content area itself to scroll.
      //
      // Solution: On mobile, use fixed height classes or isolate-scroll pattern
      // to create an isolated scroll context that doesn't rely on body scroll.

      // Check that the main scrollable content area has isolate-scroll class on mobile
      // This class creates an isolated scroll container that works with fixed tab bars
      const scrollablePattern = /overflow-y-auto[^"]*(?:isolate-scroll|h-\[calc|max-h-\[calc)/;
      expect(source).toMatch(scrollablePattern);
    });

    it('should have explicit bottom padding for the fixed mobile tab bar', () => {
      // The scrollable content must have bottom padding to account for
      // the fixed mobile tab bar (which is ~60px + safe-area-inset-bottom)
      //
      // CORRECT: pb-[--mobile-bottom-safe] or pb-20 md:pb-6
      // This ensures content is scrollable past the fixed tab bar

      const scrollableContentPattern = /overflow-y-auto[^"]*pb-\[--mobile-bottom-safe\]/;
      expect(source).toMatch(scrollableContentPattern);
    });

    it('should have h-full on the parent DailyChallenge wrapper for scroll isolation', () => {
      // For scroll isolation to work, the parent component must provide
      // a fixed height context. This is ensured by DailyChallenge using
      // flex-1 + min-h-0 OR h-full.
      //
      // When screen-fit-content has overflow:visible, child scroll depends on
      // parent height being constrained. If parent can grow unbounded,
      // child overflow-y-auto won't scroll.

      // This test verifies DailyWordHuntResults expects proper parent context
      const rootFlexPattern = /key="word-hunt-results"[\s\S]*?className="([^"]+)"/;
      const match = source.match(rootFlexPattern);

      expect(match).toBeTruthy();
      if (match) {
        const className = match[1];
        // Root should use flex-1 to take all available parent space
        expect(className).toMatch(/\bflex-1\b/);
        // Root should have min-h-0 to allow content overflow
        expect(className).toMatch(/\bmin-h-0\b/);
      }
    });

    it('should use isolated-scroll class or equivalent for touch scrolling on iOS', () => {
      // iOS has quirks with nested scroll containers.
      // When content is nested inside a body that scrolls, and the content
      // also needs to scroll (with fixed elements), we need:
      // 1. overscroll-behavior: contain (prevents pull-to-refresh interference)
      // 2. -webkit-overflow-scrolling: touch (smooth momentum scrolling)
      // 3. scrollable-area class (applies touch-action: pan-y)

      // Verify the scrollable content has touch scrolling support
      const touchScrollPattern = /overflow-y-auto[^"]*scrollable-area|scrollable-area[^"]*overflow-y-auto/;
      expect(source).toMatch(touchScrollPattern);

      // Verify overscroll-contain is applied
      const overscrollPattern = /overflow-y-auto[^"]*overscroll-contain|overscroll-contain[^"]*overflow-y-auto/;
      expect(source).toMatch(overscrollPattern);
    });
  });
});

describe('BuzzResultsScreen Scroll Layout', () => {
  const sourcePath = resolve(process.cwd(), 'components/buzz/BuzzResultsScreen.tsx');
  const source = readFileSync(sourcePath, 'utf-8');

  describe('Root container layout', () => {
    it('should NOT use h-dvh on the root container', () => {
      // Find root motion.div patterns
      const rootPatterns = source.match(/className="[^"]*flex-1[^"]*flex[^"]*flex-col[^"]*"/g) || [];

      rootPatterns.forEach((pattern) => {
        // None should have h-dvh which blocks scrolling
        expect(pattern).not.toMatch(/\bh-dvh\b/);
        expect(pattern).not.toMatch(/\bh-screen\b/);
      });
    });

    it('should have overflow-y-auto for scrolling', () => {
      const scrollablePattern = /className="[^"]*overflow-y-auto[^"]*"/;
      expect(source).toMatch(scrollablePattern);
    });
  });
});
