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
