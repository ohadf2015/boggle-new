/**
 * selectUniqueWords — single source of truth for "words only you found".
 *
 * Used by both the "Only You" highlight count (ResultsMainContent) and the
 * UniqueWordsSection chip list, so the badge can never disagree with the list.
 */

import { selectUniqueWords } from '../selectUniqueWords';
import type { WordObject } from '@/components/results/types';

const w = (word: string, opts: Partial<WordObject> = {}): WordObject => ({
  word,
  score: word.length,
  validated: true,
  isDuplicate: false,
  ...opts,
});

describe('selectUniqueWords', () => {
  it('returns words only the current player found', () => {
    const result = selectUniqueWords(
      { Alice: [w('dog'), w('cat')], Bob: [w('cat'), w('fish')] },
      'Alice',
    );
    expect(result).toEqual(['dog']);
  });

  it('excludes the current player\'s invalid and duplicate words', () => {
    const result = selectUniqueWords(
      {
        Alice: [w('dog'), w('bad', { validated: false }), w('dup', { isDuplicate: true })],
        Bob: [w('zzz')],
      },
      'Alice',
    );
    expect(result).toEqual(['dog']);
  });

  it('ignores opponents\' duplicate-flagged words when deciding uniqueness', () => {
    // Bob "found" cat but it was flagged a duplicate → it must NOT cancel
    // Alice's cat. This is the asymmetry the old inline count got wrong.
    const result = selectUniqueWords(
      { Alice: [w('cat')], Bob: [w('cat', { isDuplicate: true })] },
      'Alice',
    );
    expect(result).toEqual(['cat']);
  });

  it('is case-insensitive when comparing across players', () => {
    const result = selectUniqueWords(
      { Alice: [w('Dog')], Bob: [w('DOG')] },
      'Alice',
    );
    expect(result).toEqual([]);
  });

  it('sorts longest-first', () => {
    const result = selectUniqueWords(
      { Alice: [w('go'), w('apple'), w('tree')], Bob: [w('zzz')] },
      'Alice',
    );
    expect(result).toEqual(['apple', 'tree', 'go']);
  });

  it('returns empty when fewer than 2 players (solo)', () => {
    expect(selectUniqueWords({ Alice: [w('dog')] }, 'Alice')).toEqual([]);
  });

  it('returns empty when the current player has no words', () => {
    expect(selectUniqueWords({ Alice: [], Bob: [w('dog')] }, 'Alice')).toEqual([]);
  });

  it('count of the result equals the rendered list length (badge/list parity)', () => {
    const players = {
      Alice: [w('strongest'), w('panda'), w('cat')],
      Bob: [w('cat'), w('panda', { isDuplicate: true })],
    };
    const list = selectUniqueWords(players, 'Alice');
    // strongest (unique) + panda (Bob's was a dup, so still unique to Alice)
    expect(list).toEqual(['strongest', 'panda']);
    expect(list.length).toBe(2);
  });
});
