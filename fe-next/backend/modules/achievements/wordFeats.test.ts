import { describe, it, expect } from 'vitest';
import {
  hasNoVowels,
  hasAllVowels,
  isQWithoutU,
  isLongIsogram,
  LEVIATHAN_MIN_LENGTH,
  ISOGRAM_MIN_LENGTH,
} from './wordFeats';

describe('wordFeats — rare word-property predicates', () => {
  describe('hasNoVowels (Consonant Cult)', () => {
    it('accepts real vowelless words of length >= 4', () => {
      expect(hasNoVowels('rhythm')).toBe(true);
      expect(hasNoVowels('crypt')).toBe(true);
      expect(hasNoVowels('nymph')).toBe(true);
      expect(hasNoVowels('LYNX')).toBe(true); // case-insensitive
    });
    it('rejects any word containing a,e,i,o,u', () => {
      expect(hasNoVowels('apple')).toBe(false);
      expect(hasNoVowels('sky')).toBe(false); // too short anyway, but also y-only is fine length-gated
    });
    it('rejects short words (< 4) to avoid trivial unlocks', () => {
      expect(hasNoVowels('by')).toBe(false);
      expect(hasNoVowels('cry')).toBe(false);
    });
    it('treats y as a non-vowel (vocalic y still counts as vowelless)', () => {
      expect(hasNoVowels('glyph')).toBe(true);
    });
  });

  describe('hasAllVowels (Vowel Hoarder)', () => {
    it('accepts words containing every vowel a,e,i,o,u', () => {
      expect(hasAllVowels('sequoia')).toBe(true);
      expect(hasAllVowels('education')).toBe(true);
      expect(hasAllVowels('FACETIOUS')).toBe(true);
    });
    it('rejects words missing any vowel', () => {
      expect(hasAllVowels('aeiu')).toBe(false); // no o
      expect(hasAllVowels('apple')).toBe(false);
    });
  });

  describe('isQWithoutU (Q Goes Solo)', () => {
    it('accepts words with q and no u', () => {
      expect(isQWithoutU('qi')).toBe(true);
      expect(isQWithoutU('qat')).toBe(true);
      expect(isQWithoutU('QOPH')).toBe(true);
    });
    it('rejects q-words that contain u', () => {
      expect(isQWithoutU('quiz')).toBe(false);
      expect(isQWithoutU('queen')).toBe(false);
    });
    it('rejects words without q', () => {
      expect(isQWithoutU('zebra')).toBe(false);
    });
  });

  describe('isLongIsogram (No Repeats)', () => {
    it('accepts long words with all-distinct letters', () => {
      expect(isLongIsogram('computers')).toBe(true); // 9 unique
      expect(isLongIsogram('UNCOPYRIGHTABLE'.slice(0, 9))).toBe(true);
    });
    it('rejects words with a repeated letter', () => {
      expect(isLongIsogram('balloon')).toBe(false);
      expect(isLongIsogram('letterheads')).toBe(false);
    });
    it('rejects words shorter than the threshold', () => {
      expect(isLongIsogram('cat')).toBe(false);
      expect(isLongIsogram('words')).toBe(false); // 5 < 8
    });
  });

  it('exposes sane thresholds', () => {
    expect(LEVIATHAN_MIN_LENGTH).toBe(12);
    expect(ISOGRAM_MIN_LENGTH).toBe(8);
  });
});
