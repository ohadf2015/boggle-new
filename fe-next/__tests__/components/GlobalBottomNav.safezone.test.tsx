/**
 * Test: GlobalBottomNav safe zone - Content should not be hidden behind bottom nav
 *
 * Bug Context:
 * - GlobalBottomNav is a fixed element at the bottom of the screen
 * - The actual tab bar height includes: min-height (56px) + padding (16px) + border (4px) = ~76px
 * - Content using `page-content-safe` class was only adding device safe area + 16px
 * - This caused content to be hidden behind the bottom nav on mobile
 *
 * Expected Behavior:
 * - `--mobile-bottom-safe` CSS variable should include FULL nav height (80px + safe area)
 * - `page-content-safe` class should use `--mobile-bottom-safe` on mobile
 * - On desktop (lg+), no extra padding needed (nav is hidden)
 */

import fs from 'fs';
import path from 'path';

describe('GlobalBottomNav safe zone', () => {
  let globalsCSS: string;
  let animationsCSS: string;

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
  });

  describe('CSS variable --mobile-bottom-safe', () => {
    test('should be defined in globals.css', () => {
      expect(globalsCSS).toContain('--mobile-bottom-safe');
    });

    test('should include mobile tab bar height (80px)', () => {
      // The variable should reference --mobile-tab-bar-height which is 5rem (80px)
      // This accounts for: min-height (56px) + padding (16px) + border (4px) + safety margin
      expect(globalsCSS).toContain('--mobile-tab-bar-height: 5rem');
      expect(globalsCSS).toMatch(
        /--mobile-bottom-safe:\s*calc\([^)]*--mobile-tab-bar-height/
      );
    });

    test('should include device safe area inset', () => {
      // Should include env(safe-area-inset-bottom)
      expect(globalsCSS).toMatch(
        /--mobile-bottom-safe:[^;]*safe-area-inset-bottom/
      );
    });
  });

  describe('page-content-safe class', () => {
    test('should use --mobile-bottom-safe variable for padding', () => {
      // The page-content-safe class should use the correct variable
      // that accounts for the full bottom nav height
      expect(animationsCSS).toContain('.page-content-safe');

      // Should use --mobile-bottom-safe (which includes nav height + safe area)
      // NOT just --bottom-safe-padding (which was only safe area + 16px)
      const pageContentSafeMatch = animationsCSS.match(
        /\.page-content-safe\s*\{[^}]*padding-bottom:\s*([^;]+)/
      );
      expect(pageContentSafeMatch).toBeTruthy();

      const paddingValue = pageContentSafeMatch?.[1] || '';
      // Should include the mobile bottom safe variable
      expect(paddingValue).toContain('--mobile-bottom-safe');
    });

    test('should have 0 padding on tablet/desktop (sm breakpoint - matches GlobalBottomNav sm:hidden)', () => {
      // On sm+ (640px), GlobalBottomNav is hidden (sm:hidden), so no padding needed
      // Check that there's a media query for sm+ that sets page-content-safe padding to 0
      const smMediaQueryMatch = animationsCSS.match(
        /@media\s*\(\s*min-width:\s*640px\s*\)\s*\{[\s\S]*?\.page-content-safe\s*\{[\s\S]*?padding-bottom:\s*0/
      );
      expect(smMediaQueryMatch).toBeTruthy();
    });
  });

  describe('GlobalBottomNav height consistency', () => {
    test('globals.css --mobile-tab-bar-height should account for full tab bar height', () => {
      // The CSS variable must account for:
      // - .mobile-tab-bar min-height: 56px
      // - .mobile-tab-bar padding-top: 0.5rem (8px)
      // - .mobile-tab-bar padding-bottom: at least 0.5rem (8px)
      // - Parent wrapper border-t-4: 4px
      // Total base height: 76px minimum
      // Using 5rem (80px) for safety margin
      expect(globalsCSS).toContain('--mobile-tab-bar-height: 5rem');
    });
  });
});
