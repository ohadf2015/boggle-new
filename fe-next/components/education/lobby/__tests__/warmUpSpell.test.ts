import { describe, it, expect } from 'vitest';
import { initialSpell, spellableWords, spellReducer, spellWordIsRtl, type SpellState } from '../warmUpSpell';

function tapLetter(state: SpellState, letter: string): SpellState {
  const tile = state.tiles.findIndex((src, i) => !state.used[i] && state.words[state.wordIndex][src] === letter);
  return spellReducer(state, { type: 'tap', tile });
}
const word = (s: SpellState) => s.words[s.wordIndex].join('');

describe('warmUpSpell: spell a list word from scrambled tiles', () => {
  it('Given list words, Then only 3-8 letter words made of letters are kept, uppercased, once each', () => {
    expect(spellableWords(['cat', 'Cat', 'ox', 'photosynthesis', 'ice cream', 'dog!', 'river']).map((w) => w.join(''))).toEqual(['CAT', 'RIVER']);
  });

  it('Given Hebrew and kana words, Then they are kept; kanji is not, since nobody spells kanji tile by tile', () => {
    expect(spellableWords(['שלום', 'さくら', '学校']).map((w) => w.join(''))).toEqual(['שלום', 'さくら']);
    expect(spellWordIsRtl(['ש', 'ל', 'ו', 'ם'])).toBe(true);
    expect(spellWordIsRtl(['C', 'A', 'T'])).toBe(false);
  });

  it('Given a deal, Then the tiles are the word letters in a different order, every time the same for the same seed', () => {
    const a = initialSpell(spellableWords(['river']), 7);
    const b = initialSpell(spellableWords(['river']), 7);
    expect(a.tiles).toEqual(b.tiles);
    expect([...a.tiles].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(a.tiles).not.toEqual([0, 1, 2, 3, 4]);
  });

  it('When the right letters are tapped in order, Then the word fills, scores one star and the next word is dealt', () => {
    let s = initialSpell(spellableWords(['cat', 'dog']), 3);
    expect(word(s)).toBe('CAT');
    s = tapLetter(s, 'C');
    s = tapLetter(s, 'A');
    expect(s.filled).toBe(2);
    s = tapLetter(s, 'T');
    expect(s.score).toBe(1);
    expect(s.spelled).toBe(1);
    expect(word(s)).toBe('DOG');
    expect(s.filled).toBe(0);
    expect(s.used.every((u) => !u)).toBe(true);
  });

  it('When a wrong letter is tapped, Then nothing is lost: same word, same progress, same stars, the miss is flagged', () => {
    let s = initialSpell(spellableWords(['cat']), 3);
    s = tapLetter(s, 'C');
    const before = { filled: s.filled, score: s.score, wordIndex: s.wordIndex };
    s = tapLetter(s, 'T');
    expect({ filled: s.filled, score: s.score, wordIndex: s.wordIndex }).toEqual(before);
    expect(s.lastHit).toBe(false);
    expect(s.misses).toBe(1);
  });

  it('When a used tile or a tile out of range is tapped, Then the state is unchanged', () => {
    let s = initialSpell(spellableWords(['cat']), 3);
    s = tapLetter(s, 'C');
    const usedTile = s.used.findIndex(Boolean);
    expect(spellReducer(s, { type: 'tap', tile: usedTile })).toBe(s);
    expect(spellReducer(s, { type: 'tap', tile: 9 })).toBe(s);
  });

  it('Given a repeated letter, Then either copy of it fills the slot', () => {
    let s = initialSpell(spellableWords(['noon']), 5);
    for (const l of ['N', 'O', 'O', 'N']) s = tapLetter(s, l);
    expect(s.score).toBe(1);
  });
});
