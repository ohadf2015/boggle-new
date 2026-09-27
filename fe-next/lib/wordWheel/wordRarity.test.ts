import { describe, it, expect } from 'vitest';
import {
  aggregateWordPlayerCounts,
  pickRarestFind,
  selectRareFindCelebration,
  type RarityRow,
} from './wordRarity';

describe('aggregateWordPlayerCounts', () => {
  it('counts distinct players per word (case-insensitive)', () => {
    const rows: RarityRow[] = [
      { id: 'p1', words: ['CAT', 'cats', 'CANTER'] },
      { id: 'p2', words: ['CAT', 'DOG'] },
      { id: 'p3', words: ['Cat'] },
    ];
    const counts = aggregateWordPlayerCounts(rows);
    expect(counts.CAT).toBe(3);
    expect(counts.CATS).toBe(1);
    expect(counts.DOG).toBe(1);
    expect(counts.CANTER).toBe(1);
  });

  it('does not double-count a word the same player listed twice', () => {
    const rows: RarityRow[] = [{ id: 'p1', words: ['CAT', 'CAT'] }];
    expect(aggregateWordPlayerCounts(rows).CAT).toBe(1);
  });

  it('treats each null-id (guest) row as its own distinct player', () => {
    const rows: RarityRow[] = [
      { id: null, words: ['CAT'] },
      { id: null, words: ['CAT'] },
    ];
    expect(aggregateWordPlayerCounts(rows).CAT).toBe(2);
  });

  it('ignores non-string / empty entries', () => {
    const rows = [{ id: 'p1', words: ['CAT', '', null as unknown as string] }];
    const counts = aggregateWordPlayerCounts(rows);
    expect(counts.CAT).toBe(1);
    expect(Object.keys(counts)).toEqual(['CAT']);
  });
});

describe('pickRarestFind', () => {
  const counts = { CAT: 50, DOG: 12, CANTER: 1, NECTARS: 1, ZEBRA: 3 };

  it('picks the word with the fewest distinct players', () => {
    const find = pickRarestFind(['CAT', 'DOG', 'ZEBRA'], counts);
    expect(find).toEqual({ word: 'ZEBRA', playerCount: 3, isExclusive: false });
  });

  it('flags a word only this player found as exclusive', () => {
    const find = pickRarestFind(['CAT', 'CANTER'], counts);
    expect(find).toEqual({ word: 'CANTER', playerCount: 1, isExclusive: true });
  });

  it('breaks ties on count by preferring the longer word', () => {
    const find = pickRarestFind(['CANTER', 'NECTARS'], counts);
    expect(find?.word).toBe('NECTARS'); // both count 1, NECTARS is longer
  });

  it('is case-insensitive on the player words', () => {
    expect(pickRarestFind(['canter'], counts)?.word).toBe('CANTER');
  });

  it('returns null when no found word has rarity data', () => {
    expect(pickRarestFind(['UNKNOWN'], counts)).toBeNull();
    expect(pickRarestFind([], counts)).toBeNull();
  });
});

describe('selectRareFindCelebration', () => {
  it('celebrates an exclusive find once a real field has played', () => {
    // CAT found by 5 → field is real; CANTER only by this player.
    const counts = { CAT: 5, DOG: 4, CANTER: 1 };
    expect(selectRareFindCelebration(['CAT', 'CANTER'], counts)).toEqual({
      word: 'CANTER',
      playerCount: 1,
      isExclusive: true,
    });
  });

  it('suppresses "only you" when barely anyone has played (every count is 1)', () => {
    // You are effectively the only player → exclusivity is meaningless.
    const counts = { CAT: 1, CANTER: 1 };
    expect(selectRareFindCelebration(['CAT', 'CANTER'], counts)).toBeNull();
  });

  it('celebrates a rare-but-shared find (≤ 3 players)', () => {
    const counts = { CAT: 40, ZEBRA: 3 };
    expect(selectRareFindCelebration(['CAT', 'ZEBRA'], counts)).toEqual({
      word: 'ZEBRA',
      playerCount: 3,
      isExclusive: false,
    });
  });

  it('does not celebrate when the rarest find is still common', () => {
    const counts = { CAT: 40, DOG: 12 };
    expect(selectRareFindCelebration(['CAT', 'DOG'], counts)).toBeNull();
  });

  it('does not advertise the most-common word as rare in a tiny field', () => {
    // Everyone (all 3 players) found CANTER → it's the most common word, not rare.
    const counts = { CAT: 3, CANTER: 3 };
    expect(selectRareFindCelebration(['CAT', 'CANTER'], counts)).toBeNull();
  });

  it('does not celebrate "shared" rarity before a real field has played', () => {
    const counts = { CANTER: 2, DOG: 2 };
    expect(selectRareFindCelebration(['CANTER', 'DOG'], counts)).toBeNull();
  });

  it('returns null with no data', () => {
    expect(selectRareFindCelebration([], {})).toBeNull();
  });
});
