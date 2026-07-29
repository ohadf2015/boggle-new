import { describe, it, expect } from 'vitest';
import { LOCALE_CONFIGS } from '../locale-config';

describe('JA LocaleConfig', () => {
  const ja = LOCALE_CONFIGS.ja;

  it('tilePool contains hiragana with len 46-48', () => {
    expect(ja.tilePool.length).toBeGreaterThanOrEqual(46);
    expect(ja.tilePool.length).toBeLessThanOrEqual(48);
  });

  it('tilePool includes あ and ん', () => {
    expect(ja.tilePool).toContain('あ');
    expect(ja.tilePool).toContain('ん');
  });

  it('normalize is NFC only', () => {
    const str = 'こんにちは';
    expect(ja.normalize(str)).toBe(str.normalize('NFC'));
  });

  it('wordLengthRange 2-4', () => {
    expect(ja.wordLengthRange.min).toBe(2);
    expect(ja.wordLengthRange.max).toBe(4);
  });

  it('tileExtraPadding is 2', () => {
    expect(ja.tileExtraPadding).toBe(2);
  });

  it('fontStack includes Noto Sans JP', () => {
    expect(ja.fontStack).toMatch(/Noto Sans JP/i);
  });
});
