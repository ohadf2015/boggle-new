/**
 * TDD — proactive dictionary candidate prioritization.
 * Pure logic: given raw candidate words, produce a deduped, novel-only,
 * frequency-ranked, bounded list of acceptable forms per language.
 * No DB / network — feeds the existing verify→promote gates.
 */
import { describe, it, expect } from 'vitest';
import { isAcceptableForm, prioritizeCandidates } from '../candidates';

describe('isAcceptableForm', () => {
  it('accepts plain lowercase latin for en/sv and rejects digits/empty', () => {
    expect(isAcceptableForm('cat', 'en')).toBe(true);
    expect(isAcceptableForm('cat1', 'en')).toBe(false);
    expect(isAcceptableForm('', 'en')).toBe(false);
    expect(isAcceptableForm('hörn', 'sv')).toBe(true); // å ä ö allowed
  });

  it('accepts Spanish ñ and accent-folded forms, rejects non-spanish chars', () => {
    expect(isAcceptableForm('nino', 'es')).toBe(true);
    expect(isAcceptableForm('niño', 'es')).toBe(true);
    expect(isAcceptableForm('cafe', 'es')).toBe(true);
    expect(isAcceptableForm('cat3', 'es')).toBe(false);
  });

  it('accepts Hebrew letters and rejects latin', () => {
    expect(isAcceptableForm('שלום', 'he')).toBe(true);
    expect(isAcceptableForm('shalom', 'he')).toBe(false);
  });

  it('accepts hiragana only for Japanese (rejects katakana, kanji, latin)', () => {
    expect(isAcceptableForm('ねこ', 'ja')).toBe(true);
    expect(isAcceptableForm('ネコ', 'ja')).toBe(false); // katakana
    expect(isAcceptableForm('猫', 'ja')).toBe(false); // kanji
    expect(isAcceptableForm('neko', 'ja')).toBe(false);
  });
});

describe('prioritizeCandidates', () => {
  const isKnown = (w: string) => w === 'known';

  it('dedups by normalized form, drops known + invalid, orders by freq rank', () => {
    const out = prioritizeCandidates(
      ['Cat', 'CAT', 'dog', 'xqz1', 'known'],
      { lang: 'en', isKnown, freqRank: new Map([['cat', 5], ['dog', 1]]), limit: 10 },
    );
    expect(out.map((c) => c.word)).toEqual(['dog', 'cat']); // dog rank1 before cat rank5
    expect(out.every((c) => c.lang === 'en')).toBe(true);
  });

  it('puts unknown-frequency words after ranked ones, stable among themselves', () => {
    const out = prioritizeCandidates(
      ['zebra', 'dog', 'apple'],
      { lang: 'en', isKnown: () => false, freqRank: new Map([['dog', 2]]), limit: 10 },
    );
    expect(out[0].word).toBe('dog');
    expect(out.slice(1).map((c) => c.word)).toEqual(['zebra', 'apple']); // input order preserved
  });

  it('respects the bound (limit)', () => {
    const out = prioritizeCandidates(
      ['dog', 'cat', 'fox'],
      { lang: 'en', isKnown: () => false, freqRank: new Map([['dog', 1], ['cat', 2], ['fox', 3]]), limit: 1 },
    );
    expect(out).toHaveLength(1);
    expect(out[0].word).toBe('dog');
  });

  it('normalizes Spanish accents so an accented input is checked/stored folded', () => {
    const out = prioritizeCandidates(
      ['café'],
      { lang: 'es', isKnown: () => false, limit: 5 },
    );
    expect(out).toHaveLength(1);
    expect(out[0].word).toBe('cafe');
  });

  it('drops a candidate already known under its normalized key', () => {
    const out = prioritizeCandidates(
      ['Perro'],
      { lang: 'es', isKnown: (w) => w === 'perro', limit: 5 },
    );
    expect(out).toHaveLength(0);
  });
});
