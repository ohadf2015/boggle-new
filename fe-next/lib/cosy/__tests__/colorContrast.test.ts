import { describe, it, expect } from 'vitest';
import { parseColor, relativeLuminance, contrastRatio } from '../colorContrast';

describe('parseColor', () => {
  it('parses #rrggbb hex', () => {
    expect(parseColor('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });
  it('parses #rgb shorthand', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });
  it('parses modern space-separated hsl()', () => {
    expect(parseColor('hsl(0 0% 0%)')).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseColor('hsl(0 0% 100%)')).toEqual({ r: 255, g: 255, b: 255 });
  });
  it('parses comma hsl() and rgb()', () => {
    expect(parseColor('hsl(0, 0%, 100%)')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('rgb(255 255 255)')).toEqual({ r: 255, g: 255, b: 255 });
  });
  it('parses a bare "r g b" triplet (used by --neo-black/--neo-white)', () => {
    expect(parseColor('56 58 72')).toEqual({ r: 56, g: 58, b: 72 });
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black vs white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
  it('returns 1 for identical colors', () => {
    expect(contrastRatio('#345678', '#345678')).toBeCloseTo(1, 5);
  });
  it('is order-independent', () => {
    expect(contrastRatio('#111111', '#eeeeee')).toBeCloseTo(
      contrastRatio('#eeeeee', '#111111'),
      5,
    );
  });
  it('relativeLuminance: white=1, black=0', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 3);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 3);
  });
});
