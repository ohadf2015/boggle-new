import { describe, it, expect } from 'vitest';
import { pickAccentForeground } from './accentForeground';
import { STYLES, STYLE_KEYS } from './styles';

describe('pickAccentForeground', () => {
  it('returns black on a near-white background', () => {
    expect(pickAccentForeground('#ffffff')).toBe('#000000');
  });

  it('returns white on a near-black background', () => {
    expect(pickAccentForeground('#000000')).toBe('#ffffff');
  });

  it('returns black on the bright lime brand default', () => {
    expect(pickAccentForeground('#bfff00')).toBe('#000000');
  });

  it('returns white on the dark navy background', () => {
    expect(pickAccentForeground('#1a1a2e')).toBe('#ffffff');
  });

  it('returns black on the amber jazz accent (light)', () => {
    expect(pickAccentForeground('#f2b134')).toBe('#000000');
  });

  it('picks the higher-WCAG-contrast color on a mid blue (black wins over white)', () => {
    // hasidic #3b6fff: white scores ~4.29:1 (fails AA normal), black ~4.9:1 (passes).
    expect(pickAccentForeground('#3b6fff')).toBe('#000000');
  });

  it('accepts hex without leading # and is case-insensitive', () => {
    expect(pickAccentForeground('BFFF00')).toBe('#000000');
    expect(pickAccentForeground('#000')).toBe('#ffffff');
  });

  it('falls back to black for malformed input (safe on the light default)', () => {
    expect(pickAccentForeground('not-a-color')).toBe('#000000');
    expect(pickAccentForeground('')).toBe('#000000');
  });

  it('returns a readable foreground (black or white) for every registered style accent', () => {
    for (const key of STYLE_KEYS) {
      const hex = STYLES[key].accentHex;
      if (!hex) continue; // default style has no accent
      const fg = pickAccentForeground(hex);
      expect(['#000000', '#ffffff']).toContain(fg);
    }
  });
});
