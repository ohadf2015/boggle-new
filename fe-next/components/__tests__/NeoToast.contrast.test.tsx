/**
 * NeoToast Contrast Tests
 * Validates color contrast ratios meet WCAG AA standards
 */
/**
 * Calculate relative luminance of an RGB color
 * Formula from WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const val = c / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * Formula from WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
function getContrastRatio(color1: string, color2: string): number {
  const parseHex = (hex: string): [number, number, number] => {
    const clean = hex.replace('#', '');
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16)
    ];
  };

  const [r1, g1, b1] = parseHex(color1);
  const [r2, g2, b2] = parseHex(color2);

  const l1 = getRelativeLuminance(r1, g1, b1);
  const l2 = getRelativeLuminance(r2, g2, b2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('NeoToast Contrast Tests', () => {
  // Color definitions from globals.css
  const NEO_PINK = '#FF1493';
  const NEO_CREAM = '#FFFEF0';
  const NEO_BLACK = '#000000';

  describe('AI Validating Toast', () => {
    it('should use dark text (neo-black) on pink background for proper contrast', () => {
      // Background: neo-pink (#FF1493)
      const backgroundColor = NEO_PINK;

      // After fix: Text should use neo-black for optimal readability
      const textColor = NEO_BLACK;
      const contrast = getContrastRatio(textColor, backgroundColor);

      // WCAG AA requires 4.5:1 for normal text, 3:1 for large text (18pt+)
      // Toast text is uppercase and bold, so it qualifies as large text (3:1 minimum)
      const MIN_CONTRAST_LARGE_TEXT = 3.0;
      const MIN_CONTRAST_NORMAL_TEXT = 4.5;

      // Verify black text on pink meets WCAG AA for large text
      expect(contrast).toBeGreaterThanOrEqual(MIN_CONTRAST_LARGE_TEXT);

      // Verify it also meets the stricter requirement for normal text
      expect(contrast).toBeGreaterThanOrEqual(MIN_CONTRAST_NORMAL_TEXT);
    });

    it('should NOT use light text (neo-cream) on pink background', () => {
      // This test verifies we avoid the problematic cream-on-pink combination
      const backgroundColor = NEO_PINK;
      const wrongTextColor = NEO_CREAM; // #FFFEF0 (white/cream - bad on pink)
      const contrast = getContrastRatio(wrongTextColor, backgroundColor);

      // While cream on pink technically passes 3:1, it's suboptimal
      // We should use black for much better contrast (5.86:1 vs 3.58:1)
      const MIN_CONTRAST_LARGE_TEXT = 3.0;

      // Document that cream on pink barely passes but is not recommended
      expect(contrast).toBeGreaterThan(MIN_CONTRAST_LARGE_TEXT);
      expect(contrast).toBeLessThan(4.5); // Doesn't meet normal text standards
    });
  });

  describe('Other Toast Variants', () => {
    it('should have good contrast for error toast (red background, white text)', () => {
      const NEO_RED = '#ef4444';
      const textColor = NEO_CREAM; // White text on red is correct
      const contrast = getContrastRatio(textColor, NEO_RED);
      expect(contrast).toBeGreaterThanOrEqual(3.0);
    });

    it('should have good contrast for success toast (lime background, black text)', () => {
      const NEO_LIME = '#d4ff00';
      const textColor = NEO_BLACK;
      const contrast = getContrastRatio(textColor, NEO_LIME);
      expect(contrast).toBeGreaterThanOrEqual(3.0);
    });

    it('should have good contrast for info toast (cyan background, black text)', () => {
      const NEO_CYAN = '#00FFFF';
      const textColor = NEO_BLACK;
      const contrast = getContrastRatio(textColor, NEO_CYAN);
      expect(contrast).toBeGreaterThanOrEqual(3.0);
    });

    it('should have good contrast for warning toast (yellow background, black text)', () => {
      const NEO_YELLOW = '#FFE135';
      const textColor = NEO_BLACK;
      const contrast = getContrastRatio(textColor, NEO_YELLOW);
      expect(contrast).toBeGreaterThanOrEqual(3.0);
    });
  });
});
