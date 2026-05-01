import { describe, it, expect, beforeEach } from 'vitest';
import { pickBotWord, __resetBotDictCache } from '../botWordPicker';
import type { Tile } from '../../types';

const T = (letter: string, id: number): Tile => ({
  id,
  letter,
  letterValue: 1,
  rarity: 'common',
});

describe('pickBotWord', () => {
  beforeEach(() => __resetBotDictCache());

  it('picks the longest valid word ≥4 from available tiles', () => {
    const tiles: Tile[] = ['S', 'T', 'A', 'R', 'E', 'I', 'O', 'N'].map((l, i) => T(l, i));
    const pick = pickBotWord(tiles);
    expect(pick).not.toBeNull();
    expect(pick!.word.length).toBeGreaterThanOrEqual(4);
  });

  it('skips claimed tiles', () => {
    const tiles: Tile[] = ['S', 'T', 'A', 'R'].map((l, i) => ({
      ...T(l, i),
      claimedBy: 'bot' as const,
      claimTurnsRemaining: 2,
    }));
    expect(pickBotWord(tiles)).toBeNull();
  });

  it('returns null when no valid word can be made', () => {
    const tiles: Tile[] = ['Z', 'X', 'Q', 'J'].map((l, i) => T(l, i));
    const pick = pickBotWord(tiles);
    expect(pick).toBeNull();
  });

  it('caps bot pick at 6 letters', () => {
    const tiles: Tile[] = 'STORMINGER'.split('').map((l, i) => T(l, i));
    const pick = pickBotWord(tiles);
    expect(pick).not.toBeNull();
    expect(pick!.word.length).toBeLessThanOrEqual(6);
  });

  it('returned tileIds reference real free tiles', () => {
    const tiles: Tile[] = 'STAREION'.split('').map((l, i) => T(l, i));
    const pick = pickBotWord(tiles);
    expect(pick).not.toBeNull();
    pick!.tileIds.forEach((id) => {
      const t = tiles.find((tt) => tt.id === id);
      expect(t).toBeDefined();
      expect(t?.claimedBy).toBeFalsy();
    });
  });
});
