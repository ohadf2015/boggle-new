import { describe, it, expect } from 'vitest';
import { detectOvertakes } from './overtakeDetection';

/** Build a best-first leaderboard from [username, score] pairs. */
function lb(...pairs: Array<[string, number]>) {
  return pairs.map(([username, score]) => ({ username, score }));
}

describe('detectOvertakes', () => {
  it('reports my current 1-based rank', () => {
    const board = lb(['ann', 30], ['me', 20], ['bob', 10]);
    expect(detectOvertakes(board, board, 'me').myRank).toBe(2);
  });

  it('flags a player who crossed from below me to above me', () => {
    // Given bob was below me, now bob is above me
    const prev = lb(['ann', 30], ['me', 20], ['bob', 10]);
    const next = lb(['ann', 30], ['bob', 25], ['me', 20]);
    // When detecting overtakes
    const res = detectOvertakes(prev, next, 'me');
    // Then bob is named and my rank dropped to 3
    expect(res.overtakenBy).toEqual(['bob']);
    expect(res.myRank).toBe(3);
  });

  it('does NOT flag when my rank improved', () => {
    const prev = lb(['ann', 30], ['bob', 25], ['me', 20]);
    const next = lb(['ann', 30], ['me', 26], ['bob', 25]);
    const res = detectOvertakes(prev, next, 'me');
    expect(res.overtakenBy).toEqual([]);
    expect(res.myRank).toBe(2);
  });

  it('does NOT flag a player who was already above me (no crossing)', () => {
    // ann was above me and stays above me — not an overtake even if gap grew
    const prev = lb(['ann', 30], ['me', 20]);
    const next = lb(['ann', 40], ['me', 20]);
    expect(detectOvertakes(prev, next, 'me').overtakenBy).toEqual([]);
  });

  it('flags multiple simultaneous overtakers', () => {
    const prev = lb(['me', 20], ['bob', 10], ['cat', 8]);
    const next = lb(['bob', 25], ['cat', 22], ['me', 20]);
    const res = detectOvertakes(prev, next, 'me');
    expect(res.overtakenBy.sort()).toEqual(['bob', 'cat']);
    expect(res.myRank).toBe(3);
  });

  it('handles a newcomer who joins above me as an overtake', () => {
    // A late joiner not present before, now ranked above me
    const prev = lb(['me', 20], ['bob', 10]);
    const next = lb(['newbie', 30], ['me', 20], ['bob', 10]);
    expect(detectOvertakes(prev, next, 'me').overtakenBy).toEqual(['newbie']);
  });

  it('returns rank 0 and no overtakes when I am absent', () => {
    const board = lb(['ann', 30], ['bob', 10]);
    const res = detectOvertakes(board, board, 'me');
    expect(res.myRank).toBe(0);
    expect(res.overtakenBy).toEqual([]);
  });

  it('no overtakes on the very first snapshot (empty prev)', () => {
    const next = lb(['ann', 30], ['me', 20]);
    expect(detectOvertakes([], next, 'me').overtakenBy).toEqual([]);
  });
});
