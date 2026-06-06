import { describe, it, expect } from 'vitest';
import { selectClosestRivals, type RivalInput } from './selectClosestRivals';

/**
 * Helper: build a RivalInput with sane defaults so each test states only what
 * it cares about (id, score, isMe).
 */
function p(id: string, score: number, isMe = false): RivalInput {
  return { id, name: id, score, isMe };
}

describe('selectClosestRivals', () => {
  it('returns null when there is no "me"', () => {
    const view = selectClosestRivals([p('a', 10), p('b', 5)], 3);
    expect(view).toBeNull();
  });

  it('returns null when "me" is the only player', () => {
    const view = selectClosestRivals([p('me', 10, true)], 3);
    expect(view).toBeNull();
  });

  it('two players: returns the one rival + me, sorted by score desc', () => {
    const view = selectClosestRivals([p('me', 10, true), p('rival', 25)], 3);
    expect(view).not.toBeNull();
    expect(view!.rows.map((r) => r.id)).toEqual(['rival', 'me']);
    expect(view!.total).toBe(2);
  });

  it('me in the middle: picks the 3 nearest neighbours by |score - myScore|', () => {
    // scores around me=50: 95,60,55, [50 me], 48,40,5
    const players = [
      p('top', 95),
      p('r1', 60),
      p('r2', 55),
      p('me', 50, true),
      p('r3', 48),
      p('low', 40),
      p('bottom', 5),
    ];
    const view = selectClosestRivals(players, 3);
    expect(view).not.toBeNull();
    // closest by |Δ|: r3(2), r2(5), r1(10) — NOT top(45) or low(10 tie? 40→10).
    // r1 Δ=10 and low Δ=10 tie → tie-break prefers AHEAD rival (r1) over behind (low).
    const ids = view!.rows.map((r) => r.id);
    expect(ids).toContain('r1');
    expect(ids).toContain('r2');
    expect(ids).toContain('r3');
    expect(ids).toContain('me');
    expect(ids).not.toContain('low');
    expect(ids).not.toContain('top');
  });

  it('display rows are sorted by score descending and include me', () => {
    const players = [p('r1', 60), p('r2', 55), p('me', 50, true), p('r3', 48)];
    const view = selectClosestRivals(players, 3);
    expect(view!.rows.map((r) => r.id)).toEqual(['r1', 'r2', 'me', 'r3']);
  });

  it('assigns true GLOBAL rank (not slice-local)', () => {
    const players = [
      p('top', 95), // rank 1
      p('r1', 60), // rank 2
      p('me', 50, true), // rank 3
      p('r3', 48), // rank 4
      p('bottom', 5), // rank 5
    ];
    const view = selectClosestRivals(players, 3);
    const rankOf = (id: string) => view!.rows.find((r) => r.id === id)!.rank;
    expect(rankOf('r1')).toBe(2);
    expect(rankOf('me')).toBe(3);
    expect(rankOf('r3')).toBe(4);
  });

  it('computes signed deltaToMe and direction', () => {
    const players = [p('ahead', 70), p('me', 50, true), p('behind', 30)];
    const view = selectClosestRivals(players, 3);
    const row = (id: string) => view!.rows.find((r) => r.id === id)!;
    expect(row('ahead').deltaToMe).toBe(20);
    expect(row('ahead').direction).toBe('ahead');
    expect(row('me').deltaToMe).toBe(0);
    expect(row('me').direction).toBe('tie');
    expect(row('behind').deltaToMe).toBe(-20);
    expect(row('behind').direction).toBe('behind');
  });

  it('me at the top: all rivals are behind', () => {
    const players = [p('me', 100, true), p('a', 90), p('b', 80), p('c', 70), p('d', 10)];
    const view = selectClosestRivals(players, 3);
    const ids = view!.rows.map((r) => r.id);
    expect(ids).toEqual(['me', 'a', 'b', 'c']); // me first (highest score)
    expect(view!.rows.find((r) => r.id === 'me')!.rank).toBe(1);
    expect(ids).not.toContain('d');
  });

  it('me at the bottom: all rivals are ahead', () => {
    const players = [p('a', 100), p('b', 90), p('c', 80), p('d', 70), p('me', 10, true)];
    const view = selectClosestRivals(players, 3);
    const ids = view!.rows.map((r) => r.id);
    // 3 nearest above me=10 are c(80),? actually nearest by |Δ|: d(60),c(70),b(80)
    expect(ids).toContain('d');
    expect(ids[ids.length - 1]).toBe('me'); // me last (lowest score)
  });

  it('fewer rivals than n: returns all of them + me', () => {
    const players = [p('me', 50, true), p('only', 40)];
    const view = selectClosestRivals(players, 3);
    expect(view!.rows.map((r) => r.id)).toEqual(['me', 'only']);
  });

  it('exact score tie: deterministic, includes the tied rival', () => {
    const players = [p('twin', 50), p('me', 50, true), p('far', 10)];
    const view = selectClosestRivals(players, 3);
    const ids = view!.rows.map((r) => r.id);
    expect(ids).toContain('twin');
    expect(ids).toContain('me');
    const twin = view!.rows.find((r) => r.id === 'twin')!;
    expect(twin.deltaToMe).toBe(0);
    expect(twin.direction).toBe('tie');
  });

  it('equal |Δ| above vs below: prefers the rival AHEAD (who I am chasing)', () => {
    // me=50, ahead by 10 (60) and behind by 10 (40); only room for one (n=1)
    const players = [p('ahead', 60), p('me', 50, true), p('behind', 40)];
    const view = selectClosestRivals(players, 1);
    const ids = view!.rows.map((r) => r.id);
    expect(ids).toContain('ahead');
    expect(ids).not.toContain('behind');
  });

  it('is pure: does not mutate the input array', () => {
    const players = [p('a', 10), p('me', 5, true)];
    const snapshot = JSON.parse(JSON.stringify(players));
    selectClosestRivals(players, 3);
    expect(players).toEqual(snapshot);
  });
});
