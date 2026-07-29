import { describe, it, expect } from 'vitest';
import { LOCALE_CONFIGS } from '../locale-config';

describe('HE LocaleConfig', () => {
  const he = LOCALE_CONFIGS.he;

  it('rtl is true', () => {
    expect(he.rtl).toBe(true);
  });

  it('tilePool excludes 5 final forms', () => {
    expect(he.tilePool).not.toContain('ך');
    expect(he.tilePool).not.toContain('ם');
    expect(he.tilePool).not.toContain('ן');
    expect(he.tilePool).not.toContain('ף');
    expect(he.tilePool).not.toContain('ץ');
    expect(he.tilePool).toHaveLength(22);
  });

  it('normalize folds final forms', () => {
    expect(he.normalize('שלום')).toBe('שלומ');
    expect(he.normalize('ך')).toBe('כ');
  });

  it('displayChar final-form folds at word end', () => {
    expect(he.displayChar('מ', 3, 4)).toBe('ם');
    expect(he.displayChar('כ', 2, 3)).toBe('ך');
    expect(he.displayChar('מ', 0, 3)).toBe('מ');
  });

  it('wordLengthRange 3-5', () => {
    expect(he.wordLengthRange.min).toBe(3);
    expect(he.wordLengthRange.max).toBe(5);
  });

  it('locale is he', () => {
    expect(he.locale).toBe('he');
  });
});
