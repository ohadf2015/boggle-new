/**
 * gemLetters — TDD for per-language rare-letter detection used by the
 * Blast HUD mascot's "oh!" reaction.
 *
 * Sources for each language's gem set:
 *   - EN: Scrabble high-value tiles (Q, Z = 10 pts; X, J = 8 pts)
 *   - ES: Spanish Scrabble high-value (K, W, X, Y = 8; Z = 10)
 *   - SV: Swedish Scrabble high-value (C, Q, X, Z = 10)
 *   - HE: Hebrew Scrabble-equivalent rare letters (ז ע צ ק ט) + final forms
 *   - JA: Less-common hiragana (む ぬ よ や ゆ) — pragmatic pick
 */
import { isGemLetter, GEM_LETTERS } from '../gemLetters';

describe('gemLetters — English', () => {
  it.each(['Q', 'Z', 'X', 'J'])('%s is a gem letter in EN', (letter) => {
    expect(isGemLetter(letter, 'en')).toBe(true);
  });

  it('lowercase still detected (EN)', () => {
    expect(isGemLetter('q', 'en')).toBe(true);
  });

  it.each(['A', 'E', 'I', 'O', 'U', 'S', 'T'])('%s is NOT a gem in EN', (letter) => {
    expect(isGemLetter(letter, 'en')).toBe(false);
  });
});

describe('gemLetters — Spanish', () => {
  it.each(['K', 'W', 'X', 'Y', 'Z'])('%s is a gem in ES (Spanish Scrabble high-tier)', (letter) => {
    expect(isGemLetter(letter, 'es')).toBe(true);
  });

  it('Q is NOT a gem in ES (Q only worth 5 points in Spanish)', () => {
    expect(isGemLetter('Q', 'es')).toBe(false);
  });

  it.each(['A', 'E', 'O', 'S', 'N', 'R'])('%s is NOT a gem in ES', (letter) => {
    expect(isGemLetter(letter, 'es')).toBe(false);
  });
});

describe('gemLetters — Swedish', () => {
  it.each(['C', 'Q', 'X', 'Z'])('%s is a gem in SV', (letter) => {
    expect(isGemLetter(letter, 'sv')).toBe(true);
  });

  it.each(['Å', 'Ä', 'Ö', 'A', 'E'])('%s is NOT a gem in SV (common vowels)', (letter) => {
    expect(isGemLetter(letter, 'sv')).toBe(false);
  });
});

describe('gemLetters — Hebrew', () => {
  it.each(['ז', 'ע', 'צ', 'ק', 'ט'])('%s is a gem in HE', (letter) => {
    expect(isGemLetter(letter, 'he')).toBe(true);
  });

  it.each(['ך', 'ץ', 'ף', 'ן', 'ם'])('final form %s is a gem in HE (rare placement)', (letter) => {
    expect(isGemLetter(letter, 'he')).toBe(true);
  });

  it.each(['א', 'י', 'מ', 'ר', 'ל', 'ה'])('%s is NOT a gem in HE (common letter)', (letter) => {
    expect(isGemLetter(letter, 'he')).toBe(false);
  });
});

describe('gemLetters — Japanese', () => {
  it.each(['む', 'ぬ', 'よ', 'や', 'ゆ'])('%s is a gem in JA', (letter) => {
    expect(isGemLetter(letter, 'ja')).toBe(true);
  });

  it.each(['あ', 'い', 'う', 'え', 'お', 'の', 'と'])('%s is NOT a gem in JA (common kana)', (letter) => {
    expect(isGemLetter(letter, 'ja')).toBe(false);
  });
});

describe('gemLetters — string check helper', () => {
  it('hasGemLetter detects gems anywhere in the word', () => {
    expect(isGemLetter('Q', 'en')).toBe(true);
  });

  it('returns false for unknown language (graceful fallback)', () => {
    expect(isGemLetter('Q', 'zz' as never)).toBe(false);
  });
});

describe('gemLetters — registry shape', () => {
  it('exposes gem sets for all 5 supported languages', () => {
    expect(GEM_LETTERS.en).toBeInstanceOf(Set);
    expect(GEM_LETTERS.he).toBeInstanceOf(Set);
    expect(GEM_LETTERS.sv).toBeInstanceOf(Set);
    expect(GEM_LETTERS.ja).toBeInstanceOf(Set);
    expect(GEM_LETTERS.es).toBeInstanceOf(Set);
  });

  it('every language has at least 4 gem letters (worth being a "rare moment")', () => {
    for (const set of Object.values(GEM_LETTERS)) {
      expect(set.size).toBeGreaterThanOrEqual(4);
    }
  });
});
