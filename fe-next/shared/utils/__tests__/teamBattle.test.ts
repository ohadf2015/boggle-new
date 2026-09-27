/**
 * Team battle assignment + standings.
 *
 * The whole design rests on determinism: the server deals teams when it
 * builds the classroom summary, and every client renders them without another
 * round-trip. These tests pin that contract.
 */

import { describe, it, expect } from 'vitest';
import {
  assignTeams,
  computeTeamStandings,
  clampTeamCount,
  reconcileTeams,
} from '../teamBattle';

describe('clampTeamCount', () => {
  it('clamps to [2, 4] and defaults to 2', () => {
    expect(clampTeamCount(undefined)).toBe(2);
    expect(clampTeamCount(1)).toBe(2);
    expect(clampTeamCount(2)).toBe(2);
    expect(clampTeamCount(4)).toBe(4);
    expect(clampTeamCount(9)).toBe(4);
    expect(clampTeamCount(NaN)).toBe(2);
  });
});

describe('assignTeams', () => {
  const players = ['ana', 'bo', 'cy', 'di', 'eli', 'flo', 'gus'];

  it('is deterministic for the same seed regardless of input order', () => {
    const a = assignTeams(players, 2, 'ABC123');
    const b = assignTeams([...players].reverse(), 2, 'ABC123');
    expect(a).toEqual(b);
  });

  it('varies with the seed (different rooms get different deals)', () => {
    const a = assignTeams(players, 2, 'ABC123');
    const b = assignTeams(players, 2, 'XYZ999');
    expect(a).not.toEqual(b);
  });

  it('deals every player exactly once and keeps sizes within one', () => {
    const teams = assignTeams(players, 3, 'ABC123');
    const all = teams.flatMap((t) => t.memberNames);
    expect(all.sort()).toEqual([...players].sort());
    const sizes = teams.map((t) => t.memberNames.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it('dedupes usernames case-insensitively on the sort path', () => {
    const teams = assignTeams(['Ana', 'ana', 'bo'], 2, 'SEED');
    const all = teams.flatMap((t) => t.memberNames);
    expect(all).toHaveLength(2);
  });

  it('handles fewer players than teams', () => {
    const teams = assignTeams(['solo'], 4, 'SEED');
    expect(teams.flatMap((t) => t.memberNames)).toEqual(['solo']);
    expect(teams).toHaveLength(4);
  });
});

describe('computeTeamStandings', () => {
  it('sums member scores and ranks teams highest first', () => {
    const teams = assignTeams(['ana', 'bo', 'cy', 'di'], 2, 'ABC123');
    const scores = [
      { username: 'ana', score: 30 },
      { username: 'bo', score: 10 },
      { username: 'cy', score: 20 },
      { username: 'di', score: 5 },
    ];
    const standings = computeTeamStandings(teams, scores);
    expect(standings[0].totalScore).toBeGreaterThanOrEqual(standings[1].totalScore);
    const total = standings.reduce((s, t) => s + t.totalScore, 0);
    expect(total).toBe(65);
  });

  it('matches scores case-insensitively and counts missing players as 0', () => {
    const teams = [{ id: 0, memberNames: ['Ana', 'ghost'] }];
    const standings = computeTeamStandings(teams, [{ username: 'ANA', score: 12 }]);
    expect(standings[0].totalScore).toBe(12);
    expect(standings[0].members.find((m) => m.username === 'ghost')?.score).toBe(0);
  });
});

describe('reconcileTeams', () => {
  const seed = 'ABC123';

  it('deals from scratch when there is no existing assignment', () => {
    // Given no prior teams, When reconciling, Then it matches a fresh deal.
    const fresh = assignTeams(['ana', 'bo', 'cy'], 2, seed);
    expect(reconcileTeams(undefined, ['ana', 'bo', 'cy'], 2, seed)).toEqual(fresh);
  });

  it('never moves a student who is already seated', () => {
    // Given a dealt roster, When one more student joins mid-lesson,
    // Then every original student keeps the exact team they had.
    const before = assignTeams(['ana', 'bo', 'cy', 'di'], 2, seed);
    const after = reconcileTeams(before, ['ana', 'bo', 'cy', 'di', 'eli'], 2, seed);

    for (const team of before) {
      const same = after.find((t) => t.id === team.id)!;
      for (const name of team.memberNames) {
        expect(same.memberNames).toContain(name);
      }
    }
  });

  it('seats a newcomer on the smallest team', () => {
    const existing = [
      { id: 0, memberNames: ['ana', 'bo'] },
      { id: 1, memberNames: ['cy'] },
    ];
    const after = reconcileTeams(existing, ['ana', 'bo', 'cy', 'di'], 2, seed);
    expect(after[1].memberNames).toEqual(['cy', 'di']);
    expect(after[0].memberNames).toEqual(['ana', 'bo']);
  });

  it('splits two newcomers instead of stacking them on one team', () => {
    const existing = [
      { id: 0, memberNames: ['ana'] },
      { id: 1, memberNames: ['bo'] },
    ];
    const after = reconcileTeams(existing, ['ana', 'bo', 'cy', 'di'], 2, seed);
    expect(after[0].memberNames).toHaveLength(2);
    expect(after[1].memberNames).toHaveLength(2);
  });

  it('treats a re-typed nickname as the same student, whatever the case', () => {
    // Guest students retype their name every round; 'Ana' and 'ana' are one child.
    const existing = [
      { id: 0, memberNames: ['Ana'] },
      { id: 1, memberNames: ['bo'] },
    ];
    const after = reconcileTeams(existing, ['ana', 'bo'], 2, seed);
    expect(after[0].memberNames).toEqual(['Ana']);
    expect(after[1].memberNames).toEqual(['bo']);
  });

  it('keeps a student who sat this round out', () => {
    // Wifi dropped, or they stepped out. Their seat waits for them.
    const existing = [
      { id: 0, memberNames: ['ana', 'cy'] },
      { id: 1, memberNames: ['bo'] },
    ];
    const after = reconcileTeams(existing, ['ana', 'bo'], 2, seed);
    expect(after[0].memberNames).toContain('cy');
  });

  it('re-deals from scratch when the teacher changes the team count', () => {
    const existing = assignTeams(['ana', 'bo', 'cy', 'di'], 2, seed);
    const after = reconcileTeams(existing, ['ana', 'bo', 'cy', 'di'], 4, seed);
    expect(after).toEqual(assignTeams(['ana', 'bo', 'cy', 'di'], 4, seed));
    expect(after).toHaveLength(4);
  });

  it('is idempotent — reconciling twice changes nothing', () => {
    const once = reconcileTeams(undefined, ['ana', 'bo', 'cy'], 2, seed);
    const twice = reconcileTeams(once, ['ana', 'bo', 'cy'], 2, seed);
    expect(twice).toEqual(once);
  });
});

describe('the deal survives the round it was dealt for', () => {
  const seed = 'ABC123';

  it('keeps every colour when a student drops mid-round', () => {
    // The projector painted this deal for three minutes. If results re-derived
    // it from whoever happened to finish, a dropped student would recolour the
    // whole class between the bar and the podium — the room WILL notice.
    const atStart = assignTeams(['ana', 'bo', 'cy', 'di'], 2, seed);
    const atResults = reconcileTeams(atStart, ['ana', 'bo', 'cy'], 2, seed);
    expect(atResults).toEqual(atStart);
  });

  it('would have recoloured the class without the stored deal', () => {
    // The bug this guards, stated as a fact: dealing from the finishing roster
    // is NOT the same deal. If this ever starts passing, the seeded shuffle
    // became order-stable and the guard above is no longer load-bearing.
    const atStart = assignTeams(['ana', 'bo', 'cy', 'di'], 2, seed);
    const reDealt = assignTeams(['ana', 'bo', 'cy'], 2, seed);
    expect(reDealt).not.toEqual(atStart);
  });
});
