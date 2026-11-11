import { describe, it, expect } from 'vitest';
import { pickNearMiss, nearMissMargin, pickResultsCelebration, type NearMissInput } from '../nearMiss';

function input(overrides: Partial<NearMissInput> = {}): NearMissInput {
  return {
    score: 47,
    best: 50,
    isNewBest: false,
    hasHistory: true,
    isRecord: false,
    rival: null,
    ...overrides,
  };
}

describe('nearMissMargin', () => {
  it('Given a small target, When computing the margin, Then it never drops below 3 points', () => {
    expect(nearMissMargin(10)).toBe(3);
  });
  it('Given a big target, When computing the margin, Then it is 10% of the target', () => {
    expect(nearMissMargin(200)).toBe(20);
  });
});

describe('pickNearMiss', () => {
  it('Given a score 3 under the best, When picked, Then it is a best near-miss with gap 3', () => {
    expect(pickNearMiss(input())).toEqual({ kind: 'best', gap: 3 });
  });

  it('Given a score far under the best, When picked, Then there is no line', () => {
    expect(pickNearMiss(input({ score: 20, best: 50 }))).toBeNull();
  });

  it('Given a new best after earlier games, When picked, Then it celebrates the new best', () => {
    expect(pickNearMiss(input({ score: 60, best: 60, isNewBest: true }))).toEqual({ kind: 'newBest' });
  });

  it('Given any record flag is set, When picked, Then it celebrates and never shows a gap', () => {
    expect(pickNearMiss(input({ isRecord: true }))).toEqual({ kind: 'newBest' });
  });

  it('Given the very first game, When picked, Then there is no line', () => {
    expect(pickNearMiss(input({ hasHistory: false, isNewBest: true, score: 40, best: 40 }))).toBeNull();
  });

  it('Given a score of 0, When picked, Then there is no line', () => {
    expect(pickNearMiss(input({ score: 0, best: 2 }))).toBeNull();
  });

  it('Given a tie with the best, When picked, Then there is no line (a tie is not a record and not a gap)', () => {
    expect(pickNearMiss(input({ score: 50, best: 50 }))).toBeNull();
  });

  it('Given the bot above is closer than the best, When picked, Then the bot near-miss wins', () => {
    expect(pickNearMiss(input({ rival: { name: 'Robo', score: 49 } }))).toEqual({ kind: 'rival', gap: 2, name: 'Robo' });
  });

  it('Given the bot above is within the margin and the best is not, When picked, Then the bot near-miss shows', () => {
    expect(pickNearMiss(input({ score: 20, best: 90, rival: { name: 'Robo', score: 22 } }))).toEqual({ kind: 'rival', gap: 2, name: 'Robo' });
  });

  it('Given the best is closer than the bot above, When picked, Then the best near-miss wins', () => {
    expect(pickNearMiss(input({ score: 48, best: 50, rival: { name: 'Robo', score: 51 } }))).toEqual({ kind: 'best', gap: 2 });
  });

  it('Given a bot tied with the player, When picked, Then the tie is not a gap', () => {
    expect(pickNearMiss(input({ score: 20, best: 90, rival: { name: 'Robo', score: 20 } }))).toBeNull();
  });
});

describe('pickResultsCelebration', () => {
  it('Given a solo-bots win, When picked, Then the champion clip plays', () => {
    expect(pickResultsCelebration({ won: true, newBest: false, rank: 1, totalPlayers: 3, hadBingo: false })).toBe('champion');
  });
  it('Given a new best without a win, When picked, Then the knight clip plays (never defeat)', () => {
    expect(pickResultsCelebration({ won: false, newBest: true, rank: 3, totalPlayers: 3, hadBingo: false })).toBe('knight');
  });
  it('Given a 7+ letter word on a win, When picked, Then the bingo clip plays', () => {
    expect(pickResultsCelebration({ won: true, newBest: false, rank: 1, totalPlayers: 2, hadBingo: true })).toBe('bingo');
  });
  it('Given neither a win nor a new best, When picked, Then nothing plays', () => {
    expect(pickResultsCelebration({ won: false, newBest: false, rank: 2, totalPlayers: 3, hadBingo: true })).toBeNull();
  });
});
