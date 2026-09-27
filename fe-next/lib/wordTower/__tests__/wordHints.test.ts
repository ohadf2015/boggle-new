import { describe, it, expect } from 'vitest';
import { countBuildableWords, pickClueWord } from '../wordHints';

describe('countBuildableWords', () => {
  // A small canonical (uppercase) dictionary.
  const dict = new Set(['CAT', 'CAR', 'CART', 'CARE', 'DOG', 'CA', 'CATS', 'ARC']);

  it('counts every word buildable from the wheel, regardless of first letter', () => {
    // wheel C,A,R,T,E → CAT, CAR, CART, CARE, ARC all buildable; CATS needs S, DOG needs D/O/G
    const n = countBuildableWords(dict, ['C', 'A', 'R', 'T', 'E'], 3);
    expect(n).toBe(5); // CAT, CAR, CART, CARE, ARC
  });

  it('excludes words shorter than minLen', () => {
    // 'CA' is buildable but length 2
    expect(countBuildableWords(dict, ['C', 'A'], 3)).toBe(0);
    expect(countBuildableWords(dict, ['C', 'A'], 2)).toBe(1); // now 'CA' counts
  });

  it('respects letter multiplicity (cannot reuse a tile it does not have)', () => {
    const d = new Set(['BOOK', 'BOO', 'BO']);
    // one O → 'BO' (len2 excluded at min3); 'BOO' needs two O → not buildable
    expect(countBuildableWords(d, ['B', 'O'], 3)).toBe(0);
    // two O → 'BOO' buildable; 'BOOK' needs K too
    expect(countBuildableWords(d, ['B', 'O', 'O'], 3)).toBe(1);
    // add K → BOOK also buildable
    expect(countBuildableWords(d, ['B', 'O', 'O', 'K'], 3)).toBe(2);
  });

  it('returns 0 for an empty wheel', () => {
    expect(countBuildableWords(dict, [], 3)).toBe(0);
  });

  it('works with Hebrew canonical letters', () => {
    const heb = new Set(['שלום', 'שלג', 'של']);
    // wheel ש,ל,ו,ם,ג → שלום (4) + שלג (3) buildable; של is len2
    expect(countBuildableWords(heb, ['ש', 'ל', 'ו', 'ם', 'ג'], 3)).toBe(2);
  });
});

describe('pickClueWord', () => {
  const dict = new Set(['CAT', 'CARE', 'CART', 'CARETAKER', 'DOG']);

  it('prefers a meatier word (>=4) so the masked clue shows more than 2 letters', () => {
    // wheel C,A,R,T,E → CAT(3), CARE(4), CART(4); prefers shortest >=4 → CARE
    expect(pickClueWord(dict, ['C', 'A', 'R', 'T', 'E'], 3)).toBe('CARE');
  });

  it('returns null when nothing is buildable', () => {
    expect(pickClueWord(dict, ['X', 'Y'], 3)).toBeNull();
    expect(pickClueWord(dict, [], 3)).toBeNull();
  });

  it('honours the minimum length and prefers a 4+ letter word', () => {
    const d = new Set(['GO', 'GOT', 'GOAT']);
    expect(pickClueWord(d, ['G', 'O', 'T', 'A'], 3)).toBe('GOAT'); // GO excluded (len2); GOAT preferred over GOT
    expect(pickClueWord(new Set(['GO', 'GOT']), ['G', 'O', 'T'], 3)).toBe('GOT'); // no 4+ → shortest >=3
  });

  it('only returns a word actually buildable from the wheel multiset', () => {
    const d = new Set(['BOOK']);
    expect(pickClueWord(d, ['B', 'O', 'K'], 3)).toBeNull(); // needs two O
    expect(pickClueWord(d, ['B', 'O', 'O', 'K'], 3)).toBe('BOOK');
  });

  // The reported bug: asking for a second clue on the SAME wheel handed back the
  // same word forever, so a stuck player paid a rewarded ad for zero new
  // information. `skip` advances through the candidate list.
  describe('skip — successive clues on one wheel', () => {
    const wheel = ['C', 'A', 'R', 'T', 'E'];

    it('returns a DIFFERENT word for each successive skip', () => {
      const first = pickClueWord(dict, wheel, 3, undefined, 0);
      const second = pickClueWord(dict, wheel, 3, undefined, 1);
      const third = pickClueWord(dict, wheel, 3, undefined, 2);
      expect(first).toBe('CARE'); // unchanged default: shortest >= 4 still leads
      expect(second).not.toBe(first);
      expect(third).not.toBe(first);
      expect(third).not.toBe(second);
      expect([first, second, third].every((w) => w !== null)).toBe(true);
    });

    it('wraps around rather than returning null once the candidates run out', () => {
      const d = new Set(['GOAT', 'GOT']);
      const a = pickClueWord(d, ['G', 'O', 'A', 'T'], 3, undefined, 0);
      const b = pickClueWord(d, ['G', 'O', 'A', 'T'], 3, undefined, 1);
      expect(pickClueWord(d, ['G', 'O', 'A', 'T'], 3, undefined, 2)).toBe(a);
      expect(b).not.toBe(a);
    });

    it('still returns null when nothing is buildable, whatever the skip', () => {
      expect(pickClueWord(dict, ['X', 'Y'], 3, undefined, 5)).toBeNull();
    });

    it('never suggests an already-used word', () => {
      const used = new Set(['CARE']);
      for (let skip = 0; skip < 6; skip++) {
        expect(pickClueWord(dict, wheel, 3, used, skip)).not.toBe('CARE');
      }
    });
  });
});

describe('usedWords exclusion', () => {
  const d = new Set(['CAT', 'CAR', 'CART', 'CARE', 'DOG']);
  it('countBuildableWords skips already-built words', () => {
    expect(countBuildableWords(d, ['C', 'A', 'R', 'T', 'E'], 3)).toBe(4);
    expect(countBuildableWords(d, ['C', 'A', 'R', 'T', 'E'], 3, new Set(['CAT']))).toBe(3);
  });
  it('pickClueWord never suggests a used word', () => {
    // CARE/CART used → only the two 3-letter words remain; either is a correct
    // clue (ties break alphabetically now that candidates are ranked, where they
    // used to fall out of dictionary iteration order).
    expect(['CAT', 'CAR']).toContain(pickClueWord(d, ['C', 'A', 'R', 'T', 'E'], 3, new Set(['CARE', 'CART'])));
  });
});
