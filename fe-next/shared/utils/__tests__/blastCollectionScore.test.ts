import { describe, it, expect } from 'vitest';
import {
  blastCollectionScore,
  compareBlastStandings,
  BLAST_COIN_POINTS,
  BLAST_DIAMOND_POINTS,
} from '../blastCollectionScore';

describe('blastCollectionScore', () => {
  it('prices coins and diamonds, diamonds far above coins', () => {
    expect(BLAST_DIAMOND_POINTS).toBeGreaterThanOrEqual(BLAST_COIN_POINTS * 5);
  });

  it('returns a full breakdown for coins and diamonds', () => {
    expect(blastCollectionScore({ coins: 3, diamonds: 2 })).toEqual({
      coinPoints: 3 * BLAST_COIN_POINTS,
      diamondPoints: 2 * BLAST_DIAMOND_POINTS,
      total: 3 * BLAST_COIN_POINTS + 2 * BLAST_DIAMOND_POINTS,
      breakdown: {
        coins: { count: 3, points: 3 * BLAST_COIN_POINTS },
        diamonds: { count: 2, points: 2 * BLAST_DIAMOND_POINTS },
      },
    });
  });

  it('treats missing or negative counts as zero (stats saved before collection existed)', () => {
    expect(blastCollectionScore({}).total).toBe(0);
    expect(blastCollectionScore({ coins: -4, diamonds: undefined }).total).toBe(0);
  });
});

describe('compareBlastStandings', () => {
  it('ranks by total score first', () => {
    const rows = [
      { username: 'a', score: 100, diamondsCollected: 5 },
      { username: 'b', score: 200, diamondsCollected: 0 },
    ];
    expect([...rows].sort(compareBlastStandings).map(r => r.username)).toEqual(['b', 'a']);
  });

  it('breaks a score tie by diamonds collected', () => {
    const rows = [
      { username: 'a', score: 150, diamondsCollected: 1 },
      { username: 'b', score: 150, diamondsCollected: 3 },
      { username: 'c', score: 150 },
    ];
    expect([...rows].sort(compareBlastStandings).map(r => r.username)).toEqual(['b', 'a', 'c']);
  });
});
