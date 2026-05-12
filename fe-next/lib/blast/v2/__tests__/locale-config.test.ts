import { describe, it, expect } from 'vitest';
import { LOCALE_CONFIGS } from '../locale-config';

describe('EN LocaleConfig', () => {
  const en = LOCALE_CONFIGS.en;

  it('locale code is en', () => {
    expect(en.locale).toBe('en');
  });

  it('rtl is false', () => {
    expect(en.rtl).toBe(false);
  });

  it('normalize uppercases', () => {
    expect(en.normalize('hello')).toBe('HELLO');
  });

  it('displayChar identity', () => {
    expect(en.displayChar('A', 0, 3)).toBe('A');
    expect(en.displayChar('Z', 2, 2)).toBe('Z');
  });

  it('tilePool has 26 letters', () => {
    expect(en.tilePool).toHaveLength(26);
  });

  it('wordLengthRange 3-7', () => {
    expect(en.wordLengthRange.min).toBe(3);
    expect(en.wordLengthRange.max).toBe(7);
  });

  it('letterFrequency sums close to 1', () => {
    const sum = Object.values(en.letterFrequency).reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0.99);
    expect(sum).toBeLessThan(1.01);
  });

  it('bonusDictionary returns Promise<Set>', async () => {
    const result = en.bonusDictionary();
    expect(result).toBeInstanceOf(Promise);
    const set = await result;
    expect(set).toBeInstanceOf(Set);
  });
});
