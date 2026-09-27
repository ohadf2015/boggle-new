import { describe, it, expect } from 'vitest';
import { LOCALE_CONFIGS } from '../locale-config';

describe('SV LocaleConfig', () => {
  const sv = LOCALE_CONFIGS.sv;

  it('tilePool has 29 letters including Å/Ä/Ö', () => {
    expect(sv.tilePool).toContain('Å');
    expect(sv.tilePool).toContain('Ä');
    expect(sv.tilePool).toContain('Ö');
    expect(sv.tilePool).toHaveLength(29);
  });

  it('normalize preserves Å/Ä/Ö and uppercases', () => {
    expect(sv.normalize('änka')).toBe('ÄNKA');
    expect(sv.normalize('ålder')).toBe('ÅLDER');
    expect(sv.normalize('över')).toBe('ÖVER');
  });

  it('wordLengthRange 3-7', () => {
    expect(sv.wordLengthRange.min).toBe(3);
    expect(sv.wordLengthRange.max).toBe(7);
  });

  it('rtl is false', () => {
    expect(sv.rtl).toBe(false);
  });
});
