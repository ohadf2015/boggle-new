import { describe, it, expect } from 'vitest';
import { assignTeams, reconcileTeams, type ClassroomTeam } from '../teamBattle';
import { buildClassroomLiveContext } from '../classroomLiveContext';

const totals = (teams: ClassroomTeam[], ability: Record<string, number>) =>
  teams.map((t) => t.memberNames.reduce((sum, n) => sum + (ability[n.toLowerCase()] ?? 0), 0));

describe('assignTeams balanced by ability', () => {
  it('snake-drafts strongest first so an even roster splits into equal strength', () => {
    const ability = { ana: 3, bo: 3, cy: 1, di: 1 };
    const teams = assignTeams(['ana', 'bo', 'cy', 'di'], 2, 'ABC123', ability);
    expect(totals(teams, ability)).toEqual([4, 4]);
  });

  it('follows snake order across rounds of the draft', () => {
    const ability = { p6: 6, p5: 5, p4: 4, p3: 3, p2: 2, p1: 1 };
    const teams = assignTeams(Object.keys(ability), 2, 'SEED', ability);
    const sets = teams.map((t) => [...t.memberNames].sort());
    expect(sets).toContainEqual(['p2', 'p3', 'p6']);
    expect(sets).toContainEqual(['p1', 'p4', 'p5']);
  });

  it('keeps sizes within one on an odd roster', () => {
    const ability = { a: 3, b: 3, c: 2, d: 1, e: 1 };
    const teams = assignTeams(Object.keys(ability), 2, 'SEED', ability);
    const sizes = teams.map((t) => t.memberNames.length).sort();
    expect(sizes).toEqual([2, 3]);
    const [x, y] = totals(teams, ability);
    expect(Math.abs(x - y)).toBeLessThanOrEqual(3);
  });

  it('is deterministic regardless of input order', () => {
    const ability = { ana: 3, bo: 2, cy: 2, di: 1, eli: 2 };
    const names = Object.keys(ability);
    expect(assignTeams(names, 2, 'S', ability)).toEqual(assignTeams([...names].reverse(), 2, 'S', ability));
  });

  it('falls back to the seeded shuffle with no data or no spread', () => {
    const names = ['ana', 'bo', 'cy', 'di', 'eli', 'flo'];
    const plain = assignTeams(names, 2, 'ABC123');
    expect(assignTeams(names, 2, 'ABC123', {})).toEqual(plain);
    expect(assignTeams(names, 2, 'ABC123', { ana: 2, bo: 2, cy: 2, di: 2, eli: 2, flo: 2 })).toEqual(plain);
  });

  it('matches ability case-insensitively and still seats colliding names once', () => {
    const teams = assignTeams(['Ana', 'ana', 'Bo', 'cy'], 2, 'SEED', { ana: 3, bo: 1, cy: 1 });
    const all = teams.flatMap((t) => t.memberNames);
    expect(all).toHaveLength(3);
    const anaTeam = teams.find((t) => t.memberNames.some((n) => n.toLowerCase() === 'ana'))!;
    expect(anaTeam.memberNames).toHaveLength(1);
  });
});

describe('reconcileTeams balanced late join', () => {
  it('seats a newcomer on the weaker team when sizes tie', () => {
    const existing = [
      { id: 0, memberNames: ['ana'] },
      { id: 1, memberNames: ['bo'] },
    ];
    const ability = { ana: 3, bo: 1, cy: 2 };
    const after = reconcileTeams(existing, ['ana', 'bo', 'cy'], 2, 'S', ability);
    expect(after[1].memberNames).toEqual(['bo', 'cy']);
    expect(after[0].memberNames).toEqual(['ana']);
  });

  it('still fills the smallest team first even if it is stronger', () => {
    const existing = [
      { id: 0, memberNames: ['ana'] },
      { id: 1, memberNames: ['bo', 'cy'] },
    ];
    const after = reconcileTeams(existing, ['ana', 'bo', 'cy', 'di'], 2, 'S', { ana: 3, bo: 1, cy: 1, di: 1 });
    expect(after[0].memberNames).toEqual(['ana', 'di']);
  });

  it('never moves a seated student', () => {
    const existing = [
      { id: 0, memberNames: ['ana', 'bo'] },
      { id: 1, memberNames: ['cy'] },
    ];
    const after = reconcileTeams(existing, ['ana', 'bo', 'cy'], 2, 'S', { ana: 3, bo: 3, cy: 1 });
    expect(after).toEqual(existing);
  });
});

describe('buildClassroomLiveContext with abilities', () => {
  it('deals the first team round by ability', () => {
    const ability = { ana: 3, bo: 3, cy: 1, di: 1 };
    const ctx = buildClassroomLiveContext({
      game: { gameCode: 'ABC123', settings: { playStyle: 'teams', teamCount: 2 } },
      humanUsernames: ['ana', 'bo', 'cy', 'di'],
      abilities: ability,
    })!;
    expect(totals(ctx.teams!, ability)).toEqual([4, 4]);
  });
});
