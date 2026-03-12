/**
 * @jest-environment jsdom
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Test for touch scrolling compliance on mobile result pages
 *
 * iOS Safari requires explicit touch-action and -webkit-overflow-scrolling for proper momentum scrolling.
 * Scrollable areas MUST have:
 * 1. touch-action: pan-y (allows vertical touch scrolling)
 * 2. -webkit-overflow-scrolling: touch (enables momentum scrolling)
 *
 * The utility class `scrollable-area` in globals.css provides both properties.
 * Alternatively, elements can use the `scroll-if-needed` class which includes -webkit-overflow-scrolling.
 *
 * CORRECT PATTERNS:
 * - `overflow-y-auto overscroll-contain scrollable-area`
 * - `scroll-if-needed`
 *
 * INCORRECT PATTERNS (broken touch scroll on iOS):
 * - `overflow-y-auto overscroll-contain` (missing touch-action)
 * - `overflow-y-auto` alone (missing overscroll and touch properties)
 */

describe('Result Pages Touch Scroll Compliance', () => {
  const SCROLLABLE_AREA_PATTERN = /scrollable-area/;
  const SCROLL_IF_NEEDED_PATTERN = /scroll-if-needed/;
  const WEBKIT_SCROLLING_PATTERN = /-webkit-overflow-scrolling:\s*touch/;

  /**
   * Helper to check if a scrollable element has proper touch handling
   * An element is properly configured if it has:
   * - scrollable-area class, OR
   * - scroll-if-needed class, OR
   * - -webkit-overflow-scrolling: touch inline
   */
  function hasProperTouchScrolling(className: string, inlineStyles?: string): boolean {
    const hasScrollableArea = SCROLLABLE_AREA_PATTERN.test(className);
    const hasScrollIfNeeded = SCROLL_IF_NEEDED_PATTERN.test(className);
    const hasWebkitScrolling = inlineStyles ? WEBKIT_SCROLLING_PATTERN.test(inlineStyles) : false;
    return hasScrollableArea || hasScrollIfNeeded || hasWebkitScrolling;
  }

  describe('ResultsPage.tsx', () => {
    const sourcePath = resolve(process.cwd(), 'components/views/ResultsPage.tsx');
    const source = readFileSync(sourcePath, 'utf-8');

    it('should have touch scrolling support on mobile tab content area', () => {
      // Find the mobile scrollable content area pattern:
      // <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-20">
      // This is the main scrollable area for mobile view

      // Look for mobile view scrollable area (line ~1351)
      const mobileScrollMatch = source.match(
        /className="flex-1\s+overflow-y-auto\s+[^"]*"/g
      );

      if (mobileScrollMatch) {
        mobileScrollMatch.forEach((match) => {
          const hasTouchSupport = hasProperTouchScrolling(match);
          // After fix, this should pass
          expect(hasTouchSupport).toBe(true);
        });
      }
    });

    it('should have touch scrolling support on desktop scrollable areas', () => {
      // Desktop view might also have scrollable areas that need touch support
      // Look for overflow-y-auto patterns
      const overflowPatterns = source.match(
        /className="[^"]*overflow-y-auto[^"]*"/g
      ) || [];

      // Each scrollable area should have touch support
      overflowPatterns.forEach((match) => {
        // Skip if it's inside a mock or test
        if (match.includes('mock') || match.includes('test')) return;

        // Check if this pattern has proper touch scrolling
        const hasTouchSupport = hasProperTouchScrolling(match);

        // This test verifies the fix is applied
        expect(hasTouchSupport).toBe(true);
      });
    });
  });

  describe('SinglePlayerResults.tsx', () => {
    const sourcePath = resolve(process.cwd(), 'components/singleplayer/SinglePlayerResults.tsx');
    const source = readFileSync(sourcePath, 'utf-8');

    it('should have touch scrolling support on mobile tab content area', () => {
      // Find the mobile scrollable content area pattern:
      // <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-28">

      const mobileScrollMatch = source.match(
        /className="flex-1\s+overflow-y-auto\s+[^"]*"/g
      );

      if (mobileScrollMatch) {
        mobileScrollMatch.forEach((match) => {
          const hasTouchSupport = hasProperTouchScrolling(match);
          // After fix, this should pass
          expect(hasTouchSupport).toBe(true);
        });
      }
    });

    it('should have touch scrolling support on landscape scrollable areas', () => {
      // Landscape view has scrollable columns
      // Look for overflow-y-auto patterns in landscape

      const overflowPatterns = source.match(
        /className="[^"]*overflow-y-auto[^"]*"/g
      ) || [];

      overflowPatterns.forEach((match) => {
        const hasTouchSupport = hasProperTouchScrolling(match);
        expect(hasTouchSupport).toBe(true);
      });
    });
  });

  describe('DailyWordHuntResults.tsx', () => {
    const sourcePath = resolve(process.cwd(), 'components/daily/DailyWordHuntResults.tsx');
    const source = readFileSync(sourcePath, 'utf-8');

    it('should have touch scrolling support on main content area', () => {
      // Find the main scrollable content area:
      // <div className="flex-1 overflow-y-auto px-3 pb-20 md:pb-6 relative">
      const overflowPatterns = source.match(
        /className="[^"]*overflow-y-auto[^"]*"/g
      ) || [];

      expect(overflowPatterns.length).toBeGreaterThan(0);

      overflowPatterns.forEach((match) => {
        const hasTouchSupport = hasProperTouchScrolling(match);
        expect(hasTouchSupport).toBe(true);
      });
    });
  });

  describe('DailyChallengeResults.tsx', () => {
    const sourcePath = resolve(process.cwd(), 'components/daily/DailyChallengeResults.tsx');
    const source = readFileSync(sourcePath, 'utf-8');

    it('should have touch scrolling support on main content area', () => {
      // Find scrollable content areas with overflow-y-auto
      const overflowPatterns = source.match(
        /className="[^"]*overflow-y-auto[^"]*"/g
      ) || [];

      expect(overflowPatterns.length).toBeGreaterThan(0);

      overflowPatterns.forEach((match) => {
        const hasTouchSupport = hasProperTouchScrolling(match);
        expect(hasTouchSupport).toBe(true);
      });
    });
  });

  describe('SharePanel.tsx', () => {
    const sourcePath = resolve(process.cwd(), 'components/daily/results/SharePanel.tsx');
    const source = readFileSync(sourcePath, 'utf-8');

    it('should have touch scrolling support on modal overlay', () => {
      // Find the modal overlay with overflow-y-auto:
      // className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      const overflowPatterns = source.match(
        /className="[^"]*overflow-y-auto[^"]*"/g
      ) || [];

      expect(overflowPatterns.length).toBeGreaterThan(0);

      overflowPatterns.forEach((match) => {
        const hasTouchSupport = hasProperTouchScrolling(match);
        expect(hasTouchSupport).toBe(true);
      });
    });
  });

  describe('SinglePlayerLobby.tsx', () => {
    const sourcePath = resolve(process.cwd(), 'components/singleplayer/SinglePlayerLobby.tsx');
    const source = readFileSync(sourcePath, 'utf-8');

    it('should have touch scrolling support on all scrollable areas', () => {
      const overflowPatterns = source.match(
        /className="[^"]*overflow-y-auto[^"]*"/g
      ) || [];

      expect(overflowPatterns.length).toBeGreaterThan(0);

      overflowPatterns.forEach((match) => {
        const hasTouchSupport = hasProperTouchScrolling(match);
        expect(hasTouchSupport).toBe(true);
      });
    });
  });

  describe('JoinView.tsx', () => {
    const sourcePath = resolve(process.cwd(), 'components/views/JoinView.tsx');
    const source = readFileSync(sourcePath, 'utf-8');

    it('should have touch scrolling support on all scrollable areas', () => {
      const overflowPatterns = source.match(
        /className="[^"]*overflow-y-auto[^"]*"/g
      ) || [];

      expect(overflowPatterns.length).toBeGreaterThan(0);

      overflowPatterns.forEach((match) => {
        const hasTouchSupport = hasProperTouchScrolling(match);
        expect(hasTouchSupport).toBe(true);
      });
    });
  });

  describe('Host and Player Components', () => {
    const components = [
      { name: 'TvLeaderboard', path: 'host/components/tv-broadcast/TvLeaderboard.tsx' },
      { name: 'HostPreGameView', path: 'host/components/HostPreGameView.tsx' },
      { name: 'EnhancedPlayerList', path: 'host/components/pre-game/desktop/EnhancedPlayerList.tsx' },
      { name: 'DesktopLobbyLayout', path: 'host/components/pre-game/desktop/DesktopLobbyLayout.tsx' },
      { name: 'PlayersListPanel', path: 'host/components/pre-game/PlayersListPanel.tsx' },
      { name: 'TvResultsLeaderboard', path: 'host/components/tv-results/TvResultsLeaderboard.tsx' },
      { name: 'PlayerWaitingView', path: 'player/components/PlayerWaitingView.tsx' },
      { name: 'FoundWordsList', path: 'player/components/in-game/FoundWordsList.tsx' },
      { name: 'LiveLeaderboard', path: 'player/components/in-game/LiveLeaderboard.tsx' },
    ];

    components.forEach(({ name, path }) => {
      it(`${name} should have touch scrolling support`, () => {
        const sourcePath = resolve(process.cwd(), path);
        const source = readFileSync(sourcePath, 'utf-8');

        const overflowPatterns = source.match(
          /className="[^"]*overflow-y-auto[^"]*"/g
        ) || [];

        expect(overflowPatterns.length).toBeGreaterThan(0);

        overflowPatterns.forEach((match) => {
          const hasTouchSupport = hasProperTouchScrolling(match);
          expect(hasTouchSupport).toBe(true);
        });
      });
    });
  });

  describe('CSS utility class validation', () => {
    const cssPath = resolve(process.cwd(), 'app/globals.css');
    const cssSource = readFileSync(cssPath, 'utf-8');

    it('scrollable-area class should have touch-action: pan-y', () => {
      expect(cssSource).toMatch(/\.scrollable-area\s*\{[^}]*touch-action:\s*pan-y/);
    });

    it('scrollable-area class should have -webkit-overflow-scrolling: touch', () => {
      expect(cssSource).toMatch(/\.scrollable-area\s*\{[^}]*-webkit-overflow-scrolling:\s*touch/);
    });

    it('scroll-if-needed class should have -webkit-overflow-scrolling: touch', () => {
      expect(cssSource).toMatch(/\.scroll-if-needed\s*\{[^}]*-webkit-overflow-scrolling:\s*touch/);
    });
  });
});
