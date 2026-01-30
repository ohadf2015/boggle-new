/**
 * AdventureTile Special Styles Test
 *
 * Tests CSS styling for locked and multiplier tile types.
 * Since we can't test actual CSS rendering in Jest, we verify:
 * 1. CSS file contains expected class definitions
 * 2. Class naming follows project conventions
 * 3. Keyframe animations are defined
 * 4. Reduced motion media query includes new tile types
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('AdventureTile Special Styles', () => {
  const cssContent = readFileSync(
    join(__dirname, '../AdventureTile.css'),
    'utf-8'
  );

  describe('Locked Tile Styling', () => {
    it('should define tile-locked-enhanced class', () => {
      expect(cssContent).toMatch(/\.tile-locked-enhanced\s*\{/);
    });

    it('should define locked glow keyframe animation', () => {
      expect(cssContent).toMatch(/@keyframes locked-/);
    });

    it('should include tile-locked-enhanced in reduced motion rules', () => {
      expect(cssContent).toMatch(
        /@media \(prefers-reduced-motion: reduce\)[\s\S]*tile-locked-enhanced/
      );
    });

    it('should define overlay elements for locked visual effects', () => {
      expect(cssContent).toMatch(/\.tile-locked-enhanced::before/);
    });

    it('should define locked filter effect (desaturation)', () => {
      expect(cssContent).toMatch(/\.tile-locked-enhanced[\s\S]*filter/);
    });

    it('should define at least one locked animation keyframe', () => {
      // Should have locked-pulse or locked-chains or similar
      const lockedKeyframes = cssContent.match(/@keyframes locked-\w+/g);
      expect(lockedKeyframes).toBeTruthy();
      expect(lockedKeyframes!.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Multiplier Tile Styling', () => {
    it('should define tile-multiplier-enhanced class', () => {
      expect(cssContent).toMatch(/\.tile-multiplier-enhanced\s*\{/);
    });

    it('should define multiplier glow keyframe animation', () => {
      expect(cssContent).toMatch(/@keyframes multiplier-/);
    });

    it('should include tile-multiplier-enhanced in reduced motion rules', () => {
      expect(cssContent).toMatch(
        /@media \(prefers-reduced-motion: reduce\)[\s\S]*tile-multiplier-enhanced/
      );
    });

    it('should define overlay elements for multiplier visual effects', () => {
      expect(cssContent).toMatch(/\.tile-multiplier-enhanced::before/);
    });

    it('should define multiplier filter effect (brightness boost)', () => {
      expect(cssContent).toMatch(/\.tile-multiplier-enhanced[\s\S]*filter/);
    });

    it('should define at least two multiplier animation keyframes', () => {
      // Should have multiplier-pulse, multiplier-radiate, multiplier-sparkle, etc.
      const multiplierKeyframes = cssContent.match(/@keyframes multiplier-\w+/g);
      expect(multiplierKeyframes).toBeTruthy();
      expect(multiplierKeyframes!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Consistency with existing tile styles', () => {
    it('should follow GPU-accelerated property pattern (transform, opacity, filter)', () => {
      // Locked and multiplier styles should only animate transform/opacity/filter
      const lockedSection = cssContent.match(
        /@keyframes locked-[\s\S]*?(?=@keyframes|\/\*|$)/
      );
      const multiplierSection = cssContent.match(
        /@keyframes multiplier-[\s\S]*?(?=@keyframes|\/\*|$)/
      );

      // Should NOT animate width, height, top, left, margin, padding
      expect(lockedSection?.[0]).not.toMatch(/\b(width|height|top|left|margin|padding)\s*:/);
      expect(multiplierSection?.[0]).not.toMatch(/\b(width|height|top|left|margin|padding)\s*:/);
    });

    it('should use similar animation naming conventions as existing tiles', () => {
      // Existing tiles use patterns like: gold-sparkle, ice-shimmer, bomb-pulse
      // Locked/multiplier should follow: locked-*, multiplier-*
      expect(cssContent).toMatch(/@keyframes (gold|ice|bomb|rainbow|chain|time)-\w+/);
      expect(cssContent).toMatch(/@keyframes locked-\w+/);
      expect(cssContent).toMatch(/@keyframes multiplier-\w+/);
    });

    it('should include both locked and multiplier in reduced motion fallback', () => {
      const reducedMotionBlock = cssContent.match(
        /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/
      );

      expect(reducedMotionBlock).toBeTruthy();
      expect(reducedMotionBlock![0]).toMatch(/\.tile-locked-enhanced/);
      expect(reducedMotionBlock![0]).toMatch(/\.tile-multiplier-enhanced/);
      expect(reducedMotionBlock![0]).toMatch(/animation:\s*none\s*!important/);
    });
  });
});
