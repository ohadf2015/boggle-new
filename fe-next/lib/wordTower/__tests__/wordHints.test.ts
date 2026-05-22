import { describe, it, expect } from 'vitest';
import { countBuildableWords, pickClueWord } from '../wordHints';

describe('countBuildableWords', () => {
  // A small canonical (uppercase) dictionary.
  const dict = new Set(['CAT', 'CAR', 'CART', 'CARE', 'DOG', 'CA', 'CATS', 'ARC']);

  it('counts words that start with the anchor and are buildable from anchor + tray', () => {
    // anchor C, tray has A,R,T,E → CAR, CART, CARE, CAT buildable; CATS needs S; ARC starts with A
    const n = countBuildableWords(dict, 'C', ['A', 'R', 'T', 'E'], 3);
    expect(n).toBe(4); // CAT, CAR, CART, CARE
  });

  it('excludes words shorter than minLen', () => {
    // 'CA' starts with C and is buildable but is length 2
    expect(countBuildableWords(dict, 'C', ['A'], 3)).toBe(0);
    expect(countBuildableWords(dict, 'C', ['A'], 2)).toBe(1); // now 'CA' counts
  });

  it('excludes words not starting with the anchor', () => {
    // anchor A: only ARC starts with A; buildable from A + R,C
    expect(countBuildableWords(dict, 'A', ['R', 'C'], 3)).toBe(1);
  });

  it('respects letter multiplicity (cannot reuse a tile it does not have)', () => {
    const d = new Set(['BOOK', 'BOO', 'BO']);
    // anchor B, tray has one O → 'BO' (len2 excluded at min3); 'BOO' needs two O → not buildable
    expect(countBuildableWords(d, 'B', ['O'], 3)).toBe(0);
    // tray has two O → 'BOO' buildable; 'BOOK' needs K too
    expect(countBuildableWords(d, 'B', ['O', 'O'], 3)).toBe(1);
    // add K → BOOK also buildable
    expect(countBuildableWords(d, 'B', ['O', 'O', 'K'], 3)).toBe(2);
  });

  it('returns 0 for an empty anchor', () => {
    expect(countBuildableWords(dict, '', ['A', 'B'], 3)).toBe(0);
  });

  it('works with Hebrew canonical letters', () => {
    const heb = new Set(['שלום', 'שלג', 'של']);
    // anchor ש, tray ל,ו,ם,ג → שלום (4) + שלג (3) buildable; של is len2
    expect(countBuildableWords(heb, 'ש', ['ל', 'ו', 'ם', 'ג'], 3)).toBe(2);
  });
});

describe('pickClueWord', () => {
  const dict = new Set(['CAT', 'CARE', 'CART', 'CARETAKER', 'DOG']);

  it('prefers a meatier word (>=4) so the masked clue shows more than 2 letters', () => {
    // anchor C, tray A,R,T,E → CAT(3), CARE(4), CART(4); prefers shortest >=4 → CARE
    expect(pickClueWord(dict, 'C', ['A', 'R', 'T', 'E'], 3)).toBe('CARE');
  });

  it('returns null when nothing is buildable', () => {
    expect(pickClueWord(dict, 'C', ['X', 'Y'], 3)).toBeNull();
    expect(pickClueWord(dict, '', ['A'], 3)).toBeNull();
  });

  it('honours the minimum length and prefers a 4+ letter word', () => {
    const d = new Set(['GO', 'GOT', 'GOAT']);
    expect(pickClueWord(d, 'G', ['O', 'T', 'A'], 3)).toBe('GOAT'); // GO excluded (len2); GOAT preferred over GOT
    expect(pickClueWord(new Set(['GO', 'GOT']), 'G', ['O', 'T'], 3)).toBe('GOT'); // no 4+ → shortest >=3
  });

  it('only returns a word actually buildable from the tray multiset', () => {
    const d = new Set(['BOOK']);
    expect(pickClueWord(d, 'B', ['O', 'K'], 3)).toBeNull(); // needs two O
    expect(pickClueWord(d, 'B', ['O', 'O', 'K'], 3)).toBe('BOOK');
  });
});
