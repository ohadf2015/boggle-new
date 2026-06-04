import { describe, it, expect } from 'vitest';
import { selectClosestRival } from '../closestRival';

const p = (username: string, score: number) => ({ username, score });

describe('selectClosestRival', () => {
  it('returns null when there are no opponents', () => {
    expect(selectClosestRival([p('alice', 10)], 'alice')).toBeNull();
    expect(selectClosestRival([], 'alice')).toBeNull();
  });

  it('returns the only opponent when there is exactly one', () => {
    const rival = selectClosestRival([p('alice', 10), p('bob', 40)], 'alice');
    expect(rival?.username).toBe('bob');
  });

  it('never returns the current player even if scores tie', () => {
    const rival = selectClosestRival([p('alice', 30), p('bob', 30)], 'alice');
    expect(rival?.username).toBe('bob');
  });

  it('picks the opponent whose score is nearest to mine (not the leader)', () => {
    // me=30; bob gap=60, carol gap=5 → carol is the closest rival even though
    // bob leads the board. Focus follows the neck-and-neck threat.
    const rival = selectClosestRival(
      [p('alice', 30), p('bob', 90), p('carol', 25)],
      'alice',
    );
    expect(rival?.username).toBe('carol');
  });

  it('breaks an equal-gap tie in favour of the opponent ahead (the chase target)', () => {
    // me=30; bob=50 (gap 20, ahead), carol=10 (gap 20, behind) → prefer bob.
    const rival = selectClosestRival(
      [p('alice', 30), p('bob', 50), p('carol', 10)],
      'alice',
    );
    expect(rival?.username).toBe('bob');
  });

  it('still finds the closest rival when everyone is behind me', () => {
    // me=100; bob=40 (gap 60), carol=80 (gap 20) → carol is closest.
    const rival = selectClosestRival(
      [p('alice', 100), p('bob', 40), p('carol', 80)],
      'alice',
    );
    expect(rival?.username).toBe('carol');
  });

  it('is deterministic for fully tied opponents (stable by username)', () => {
    const board = [p('me', 0), p('zoe', 50), p('amy', 50)];
    expect(selectClosestRival(board, 'me')?.username).toBe('amy');
  });
});
