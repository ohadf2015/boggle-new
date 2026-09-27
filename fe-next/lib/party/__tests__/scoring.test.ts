import { describe, expect, it } from 'vitest';
import { rankPlayers, scoreTurn, totalsAfterRound } from '../scoring';
import type { PartyPlayer, PlayerRoundResult } from '../types';

const players: PartyPlayer[] = [
  { id: 'a', name: 'Ada', color: '#FF6B6B', emoji: '🦊' },
  { id: 'b', name: 'Bea', color: '#4ECDC4', emoji: '🐱' },
  { id: 'c', name: 'Cal', color: '#45B7D1', emoji: '🐼' },
];

describe('scoreTurn', () => {
  it('scores every valid unique word for the first player', () => {
    const result = scoreTurn({
      words: ['cat', 'house', 'cat'],
      claimedByEarlier: new Set(),
      alreadyFoundThisTurn: new Set(),
    });
    expect(result.accepted.map((w) => w.word)).toEqual(['cat', 'house']);
    expect(result.accepted.every((w) => w.unique)).toBe(true);
    expect(result.rejectedDuplicates).toEqual(['cat']);
    expect(result.roundScore).toBeGreaterThan(0);
    expect(result.roundScore).toBe(result.accepted.reduce((sum, w) => sum + w.score, 0));
  });

  it('dedups words already found by earlier players in the same round', () => {
    const result = scoreTurn({
      words: ['cat', 'dog', 'house'],
      claimedByEarlier: new Set(['cat']),
      alreadyFoundThisTurn: new Set(),
    });
    const unique = result.accepted.filter((w) => w.unique).map((w) => w.word);
    const stolen = result.accepted.filter((w) => !w.unique).map((w) => w.word);
    expect(unique).toEqual(['dog', 'house']);
    expect(stolen).toEqual(['cat']);
    expect(result.roundScore).toBe(
      result.accepted.filter((w) => w.unique).reduce((sum, w) => sum + w.score, 0),
    );
  });

  it('is case-insensitive when matching claimed words', () => {
    const result = scoreTurn({
      words: ['CAT', 'Dog'],
      claimedByEarlier: new Set(['cat']),
      alreadyFoundThisTurn: new Set(),
    });
    expect(result.accepted.find((w) => w.word === 'cat')?.unique).toBe(false);
    expect(result.accepted.find((w) => w.word === 'dog')?.unique).toBe(true);
  });
});

describe('totalsAfterRound', () => {
  it('accumulates unique scores across rounds', () => {
    const round1: PlayerRoundResult[] = [
      { playerId: 'a', words: [], roundScore: 10 },
      { playerId: 'b', words: [], roundScore: 4 },
    ];
    const after1 = totalsAfterRound({}, round1);
    expect(after1).toEqual({ a: 10, b: 4 });
    const round2: PlayerRoundResult[] = [
      { playerId: 'a', words: [], roundScore: 3 },
      { playerId: 'b', words: [], roundScore: 12 },
    ];
    expect(totalsAfterRound(after1, round2)).toEqual({ a: 13, b: 16 });
  });
});

describe('rankPlayers', () => {
  it('orders by cumulative score descending and names a winner', () => {
    const ranked = rankPlayers(players, { a: 13, b: 16, c: 16 });
    expect(ranked[0]?.player.id).toBe('b');
    expect(ranked[0]?.place).toBe(1);
    expect(ranked[1]?.place).toBe(1);
    expect(ranked[2]?.player.id).toBe('a');
    expect(ranked[2]?.place).toBe(3);
    expect(rankPlayers(players, { a: 20, b: 5, c: 1 })[0]?.player.id).toBe('a');
  });
});
