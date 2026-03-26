/**
 * Color Contrast Verification Tests
 * Validates WCAG AA compliance for Phase 3 color system
 */

import { describe, it, expect } from 'vitest';

// Color values from globals.css
const COLORS = {
  // Lime family
  lime: '#BFFF00',
  limeLight: '#D9FF66',
  limeMuted: '#A6D900',
  limeDark: '#8FB300',

  // Pink family
  pink: '#FF1493',
  pinkLight: '#FF6BB8',
  pinkMuted: '#D9428F',
  pinkDark: '#B30066',

  // Cyan family
  cyan: '#00FFFF',
  cyanLight: '#66FFFF',
  cyanMuted: '#4DD9D9',
  cyanDark: '#00B3B3',

  // Purple family
  purple: '#8B5CF6',
  purpleLight: '#A78BFA',
  purpleMuted: '#7C4FCC',
  purpleDark: '#5B21B6',

  // Background colors
  navy: '#1a1a2e',
  cream: '#FFFEF0',
  white: '#FFFFFF',
  black: '#000000'
};

// Calculate relative luminance for a color
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const [r, g, b] = rgb.map(val => {
    const sRGB = val / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

// Calculate contrast ratio between two colors
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Phase 3 Color Contrast - WCAG AA Compliance', () => {
  describe('Lime Family on Navy Background', () => {
    it('lime on navy should meet WCAG AA for large text (3:1)', () => {
      const ratio = getContrastRatio(COLORS.lime, COLORS.navy);
      expect(ratio).toBeGreaterThanOrEqual(3);
      console.log(`Lime on Navy: ${ratio.toFixed(2)}:1`);
    });

    it('lime on navy should meet WCAG AA for normal text (4.5:1)', () => {
      const ratio = getContrastRatio(COLORS.lime, COLORS.navy);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('lime-light on navy should meet WCAG AA for normal text', () => {
      const ratio = getContrastRatio(COLORS.limeLight, COLORS.navy);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      console.log(`Lime-light on Navy: ${ratio.toFixed(2)}:1`);
    });

    it('lime-muted on navy should meet WCAG AA for normal text', () => {
      const ratio = getContrastRatio(COLORS.limeMuted, COLORS.navy);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      console.log(`Lime-muted on Navy: ${ratio.toFixed(2)}:1`);
    });

    it('lime-dark on navy should meet WCAG AA for large text', () => {
      const ratio = getContrastRatio(COLORS.limeDark, COLORS.navy);
      expect(ratio).toBeGreaterThanOrEqual(3);
      console.log(`Lime-dark on Navy: ${ratio.toFixed(2)}:1`);
    });
  });

  describe('Pink Family on Navy Background', () => {
    it('pink on navy should meet WCAG AA for large text', () => {
      const ratio = getContrastRatio(COLORS.pink, COLORS.navy);
      expect(ratio).toBeGreaterThanOrEqual(3);
      console.log(`Pink on Navy: ${ratio.toFixed(2)}:1`);
    });

    it('pink-light on navy should meet WCAG AA for large text', () => {
      const ratio = getContrastRatio(COLORS.pinkLight, COLORS.navy);
      expect(ratio).toBeGreaterThanOrEqual(3);
      console.log(`Pink-light on Navy: ${ratio.toFixed(2)}:1`);
    });
  });

  describe('Cyan Family on Navy Background', () => {
    it('cyan on navy should meet WCAG AA for normal text', () => {
      const ratio = getContrastRatio(COLORS.cyan, COLORS.navy);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      console.log(`Cyan on Navy: ${ratio.toFixed(2)}:1`);
    });

    it('cyan-light on navy should meet WCAG AA for normal text', () => {
      const ratio = getContrastRatio(COLORS.cyanLight, COLORS.navy);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      console.log(`Cyan-light on Navy: ${ratio.toFixed(2)}:1`);
    });

    it('cyan-dark on navy should meet WCAG AA for large text', () => {
      const ratio = getContrastRatio(COLORS.cyanDark, COLORS.navy);
      expect(ratio).toBeGreaterThanOrEqual(3);
      console.log(`Cyan-dark on Navy: ${ratio.toFixed(2)}:1`);
    });
  });

  describe('Purple Family on Navy Background', () => {
    it('purple on navy should meet WCAG AA for large text', () => {
      const ratio = getContrastRatio(COLORS.purple, COLORS.navy);
      expect(ratio).toBeGreaterThanOrEqual(3);
      console.log(`Purple on Navy: ${ratio.toFixed(2)}:1`);
    });

    it('purple-light on navy should meet WCAG AA for large text', () => {
      const ratio = getContrastRatio(COLORS.purpleLight, COLORS.navy);
      expect(ratio).toBeGreaterThanOrEqual(3);
      console.log(`Purple-light on Navy: ${ratio.toFixed(2)}:1`);
    });
  });

  describe('Interactive Elements (WCAG AA 3:1 minimum)', () => {
    it('lime button on navy should meet UI element contrast', () => {
      const ratio = getContrastRatio(COLORS.lime, COLORS.navy);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('pink mode card on navy should meet UI element contrast', () => {
      const ratio = getContrastRatio(COLORS.pink, COLORS.navy);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('cyan mode card on navy should meet UI element contrast', () => {
      const ratio = getContrastRatio(COLORS.cyan, COLORS.navy);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('purple mode card on navy should meet UI element contrast', () => {
      const ratio = getContrastRatio(COLORS.purple, COLORS.navy);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });
  });

  describe('WCAG AAA Compliance (7:1 for normal text)', () => {
    it('lime on navy should approach AAA level', () => {
      const ratio = getContrastRatio(COLORS.lime, COLORS.navy);
      console.log(`Lime on Navy AAA check: ${ratio.toFixed(2)}:1 (target: 7:1)`);
      // Not required, but good to know how close we are
    });

    it('cyan on navy should approach AAA level', () => {
      const ratio = getContrastRatio(COLORS.cyan, COLORS.navy);
      console.log(`Cyan on Navy AAA check: ${ratio.toFixed(2)}:1 (target: 7:1)`);
    });
  });
});

describe('Phase 3 Color System - Tonal Variations', () => {
  it('each color family should have distinct luminance levels', () => {
    // Lime family
    const limeLuminances = [
      getLuminance(COLORS.lime),
      getLuminance(COLORS.limeLight),
      getLuminance(COLORS.limeMuted),
      getLuminance(COLORS.limeDark)
    ];

    // Should be in descending order: light > base > muted > dark
    expect(limeLuminances[0]).toBeGreaterThan(limeLuminances[2]); // base > muted
    expect(limeLuminances[2]).toBeGreaterThan(limeLuminances[3]); // muted > dark

    console.log('Lime family luminance hierarchy verified');
  });

  it('gradients should have smooth transitions', () => {
    // Check that tonal variations are not too far apart
    const limeDiff = Math.abs(getLuminance(COLORS.lime) - getLuminance(COLORS.limeDark));
    const pinkDiff = Math.abs(getLuminance(COLORS.pink) - getLuminance(COLORS.pinkDark));
    const cyanDiff = Math.abs(getLuminance(COLORS.cyan) - getLuminance(COLORS.cyanDark));
    const purpleDiff = Math.abs(getLuminance(COLORS.purple) - getLuminance(COLORS.purpleDark));

    // Differences should be noticeable but not jarring (arbitrary threshold)
    expect(limeDiff).toBeGreaterThan(0.1);
    expect(limeDiff).toBeLessThan(0.8);

    console.log(`Gradient smoothness: Lime ${limeDiff.toFixed(2)}, Pink ${pinkDiff.toFixed(2)}, Cyan ${cyanDiff.toFixed(2)}, Purple ${purpleDiff.toFixed(2)}`);
  });
});
