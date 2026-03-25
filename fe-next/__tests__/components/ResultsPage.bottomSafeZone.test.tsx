/**
 * Test: ResultsPage mobile bottom safe zone
 *
 * Bug Context:
 * - ResultsPage has a fixed MobileTabBar at the bottom of the screen on mobile
 * - The scrollable content area uses pb-[--mobile-bottom-safe] for padding
 * - The actual tab bar height may differ from the CSS variable value
 * - This can cause content to be partially hidden behind the tab bar
 *
 * Expected Behavior:
 * - Content padding should be >= actual tab bar height + safe area
 * - The --mobile-bottom-safe variable should account for:
 *   - .mobile-tab-bar min-height (56px)
 *   - .mobile-tab-bar padding-top (0.5rem = 8px)
 *   - .mobile-tab-bar padding-bottom (at least 0.5rem = 8px)
 *   - Parent wrapper border-t-4 (4px)
 *   - Safe area inset
 * - Total base height should be at least 76px (56 + 8 + 8 + 4)
 */

import fs from 'fs';
import path from 'path';

describe('ResultsPage mobile bottom safe zone', () => {
  let globalsCSS: string;
  let animationsCSS: string;
  let resultsPageTSX: string;

  beforeAll(() => {
    // Read the CSS files
    globalsCSS = fs.readFileSync(
      path.join(__dirname, '../../app/globals.css'),
      'utf-8'
    );
    animationsCSS = fs.readFileSync(
      path.join(__dirname, '../../app/animations.css'),
      'utf-8'
    );
    resultsPageTSX = fs.readFileSync(
      path.join(__dirname, '../../components/views/ResultsPage.tsx'),
      'utf-8'
    );
  });

  describe('CSS variable --mobile-tab-bar-height', () => {
    test('should account for actual .mobile-tab-bar height (min-height + padding)', () => {
      // .mobile-tab-bar has:
      // - min-height: 56px
      // - padding-top: 0.5rem (8px)
      // - padding-bottom: max(0.5rem, safe-area) (at least 8px)
      // Total base = 56 + 8 + 8 = 72px (without parent border)
      //
      // Plus ResultsPage wrapper has border-t-4 (4px)
      // Total = 76px
      //
      // The CSS variable should be at least 76px (4.75rem) to prevent content hiding

      // Extract --mobile-tab-bar-height value
      const heightMatch = globalsCSS.match(
        /--mobile-tab-bar-height:\s*([^;]+);/
      );
      expect(heightMatch).toBeTruthy();

      const heightValue = heightMatch?.[1]?.trim() || '';

      // Convert to pixels if it's in rem
      // 4rem = 64px, 4.75rem = 76px, 5rem = 80px
      if (heightValue.includes('rem')) {
        const remValue = parseFloat(heightValue);
        const pxValue = remValue * 16;

        // Should be at least 76px to account for actual tab bar height
        expect(pxValue).toBeGreaterThanOrEqual(76);
      } else if (heightValue.includes('px')) {
        const pxValue = parseFloat(heightValue);
        expect(pxValue).toBeGreaterThanOrEqual(76);
      }
    });
  });

  describe('ResultsPage mobile scroll container', () => {
    test('should have sufficient bottom padding to clear floating pill bar', () => {
      // pb-36 = 144px clearance for the floating bar (reactions row + CTA + safe area).
      expect(resultsPageTSX).toContain('pb-36');
    });

    test('floating pill bar should have fixed positioning', () => {
      // The floating bar uses fixed positioning with margin offset
      expect(resultsPageTSX).toContain('fixed bottom-3');
      expect(resultsPageTSX).toContain('inset-x-3');
    });
  });

  describe('.mobile-tab-bar CSS class', () => {
    test('should have consistent height calculation', () => {
      // Verify the mobile-tab-bar class exists and has expected properties
      expect(animationsCSS).toContain('.mobile-tab-bar');

      // Check min-height
      const minHeightMatch = animationsCSS.match(
        /\.mobile-tab-bar\s*\{[^}]*min-height:\s*([^;]+)/
      );
      expect(minHeightMatch).toBeTruthy();
      expect(minHeightMatch?.[1]).toContain('56');

      // Check padding-top
      const paddingTopMatch = animationsCSS.match(
        /\.mobile-tab-bar\s*\{[^}]*padding-top:\s*([^;]+)/
      );
      expect(paddingTopMatch).toBeTruthy();
      expect(paddingTopMatch?.[1]).toContain('0.5rem');
    });
  });
});
