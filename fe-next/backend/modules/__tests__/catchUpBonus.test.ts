import { describe, it, expect } from 'vitest';
import { computeCatchUpBonus, catchUpForPlayer, CATCH_UP_MAX_PCT } from '../catchUpBonus';

describe('computeCatchUpBonus', () => {
  it('gives nothing to the leader', () => {
    expect(computeCatchUpBonus(1, 5, 0)).toBe(0);
    expect(computeCatchUpBonus(1, 5, 400)).toBe(0);
  });

  it('gives nothing in rooms with fewer than 3 players', () => {
    expect(computeCatchUpBonus(2, 2, 500)).toBe(0);
  });

  it('gives nothing when there is no gap', () => {
    expect(computeCatchUpBonus(3, 4, 0)).toBe(0);
  });

  it('rises with rank and gap, capped at +20%', () => {
    const second = computeCatchUpBonus(2, 4, 300);
    const last = computeCatchUpBonus(4, 4, 300);
    const lastSmallGap = computeCatchUpBonus(4, 4, 30);
    expect(second).toBeGreaterThan(0);
    expect(last).toBeGreaterThan(second);
    expect(lastSmallGap).toBeLessThan(last);
    expect(computeCatchUpBonus(10, 10, 100_000)).toBe(CATCH_UP_MAX_PCT);
    expect(CATCH_UP_MAX_PCT).toBe(0.2);
  });
});

describe('catchUpForPlayer', () => {
  function room(scores: Record<string, number>, extra: Record<string, unknown> = {}, bots: string[] = []): any {
    const users: Record<string, unknown> = {};
    for (const u of Object.keys(scores)) users[u] = { isBot: bots.includes(u) };
    return { users, playerScores: { ...scores }, ...extra };
  }

  it('pays a trailing human a bonus on top of the word score', () => {
    const game = room({ lead: 400, mid: 200, tail: 50 });
    const r = catchUpForPlayer(game, 'tail', 50, 100);
    expect(r).not.toBeNull();
    expect(r!.bonus).toBeGreaterThan(0);
    expect(r!.bonus).toBeLessThanOrEqual(20);
    expect(r!.rank).toBe(3);
  });

  it('never pays the leader', () => {
    expect(catchUpForPlayer(room({ lead: 400, mid: 200, tail: 50 }), 'lead', 400, 100)).toBeNull();
  });

  it('counts humans only: two humans plus bots is not a catch-up room', () => {
    const game = room({ h1: 400, h2: 10, bot1: 900 }, {}, ['bot1']);
    expect(catchUpForPlayer(game, 'h2', 10, 100)).toBeNull();
  });

  it('skips ranked rooms and bots', () => {
    expect(catchUpForPlayer(room({ a: 400, b: 200, c: 0 }, { isRanked: true }), 'c', 0, 100)).toBeNull();
    expect(catchUpForPlayer(room({ a: 400, b: 200, c: 0, bot: 0 }, {}, ['bot']), 'bot', 0, 100)).toBeNull();
  });

  it('ignores a spectating classroom host when counting the room', () => {
    const game = room({ teacher: 0, s1: 300, s2: 20 }, { isClassroom: true, hostUsername: 'teacher' });
    game.users.teacher.isHost = true;
    expect(catchUpForPlayer(game, 's2', 20, 100)).toBeNull();
  });
});
