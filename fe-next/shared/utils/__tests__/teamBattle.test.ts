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
