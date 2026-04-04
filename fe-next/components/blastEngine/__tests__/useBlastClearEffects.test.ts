/**
 * useBlastClearEffects - Tests for DEBRIS_COLORS and the clear effects hook.
 * Since the hook depends heavily on PixiJS refs, we focus on the exported
 * DEBRIS_COLORS config and verify the hook's type contract.
 */

import { DEBRIS_COLORS } from '../useBlastClearEffects';

describe('DEBRIS_COLORS', () => {
  it('should have colors for all special tile types', () => {
    const expectedTypes = [
      'standard', 'bomb', 'lightning', 'prism', 'gem',
      'gold', 'diamond', 'ice', 'frozen', 'rainbow', 'mirror', 'magnet',
    ];
    for (const type of expectedTypes) {
      expect(DEBRIS_COLORS[type]).toBeDefined();
      expect(typeof DEBRIS_COLORS[type]).toBe('number');
    }
  });

  it('should use standard color as fallback value', () => {
    expect(DEBRIS_COLORS.standard).toBe(0xfff5e6);
  });

  it('should have distinct colors for explosive types', () => {
    const explosiveColors = new Set([
      DEBRIS_COLORS.bomb,
      DEBRIS_COLORS.lightning,
      DEBRIS_COLORS.prism,
      DEBRIS_COLORS.magnet,
    ]);
    // All 4 explosive types should have different colors
    expect(explosiveColors.size).toBe(4);
  });

  it('should use hex color values (positive integers)', () => {
    for (const [, color] of Object.entries(DEBRIS_COLORS)) {
      expect(color).toBeGreaterThan(0);
      expect(color).toBeLessThanOrEqual(0xffffff);
    }
  });
});
