/**
 * The classroom context that rides the `startGame` payload.
 *
 * This is what the projector needs in order to say, from across a room, what
 * the class is actually playing. It did not exist before 2026-09-16: a teacher
 * watching a team battle saw a flat individual leaderboard and no way to tell
 * who was on whose side.
 */

import { describe, it, expect } from 'vitest';
import { buildClassroomLiveContext } from '../classroomLiveContext';
import { assignTeams } from '../teamBattle';

const base = {
  gameCode: 'ABC123',
  lessonNames: ['Weather Words'],
  teacherName: 'Ms Rivera',
  settings: { playStyle: 'ffa' as const },
  roundsPlayed: undefined as number | undefined,
  teams: undefined,
};

describe('buildClassroomLiveContext', () => {
  it('returns null for a room that is not a classroom game', () => {
    expect(buildClassroomLiveContext({ game: null, humanUsernames: ['ana'] })).toBeNull();
  });

  it('numbers the round the class is about to play, not the ones behind it', () => {
    // Given no finished rounds, When the first round starts, Then it is ROUND 1.
    expect(buildClassroomLiveContext({ game: base, humanUsernames: ['ana'] })!.round).toBe(1);
    // Given one finished round, Then the next is ROUND 2.
    expect(
      buildClassroomLiveContext({ game: { ...base, roundsPlayed: 1 }, humanUsernames: ['ana'] })!.round
    ).toBe(2);
  });

  it('names the lesson so the projector can print it', () => {
    const ctx = buildClassroomLiveContext({ game: base, humanUsernames: ['ana'] })!;
    expect(ctx.lessonName).toBe('Weather Words');
  });

  it('carries no teams for a free-for-all', () => {
    const ctx = buildClassroomLiveContext({ game: base, humanUsernames: ['ana', 'bo'] })!;
    expect(ctx.playStyle).toBe('ffa');
    expect(ctx.teams).toBeUndefined();
  });

  it('deals teams for a team battle', () => {
    const game = { ...base, settings: { playStyle: 'teams' as const, teamCount: 2 } };
    const ctx = buildClassroomLiveContext({ game, humanUsernames: ['ana', 'bo', 'cy'] })!;
    expect(ctx.playStyle).toBe('teams');
    expect(ctx.teamCount).toBe(2);
    expect(ctx.teams).toEqual(assignTeams(['ana', 'bo', 'cy'], 2, 'ABC123'));
  });

  it('leaves the teacher off the teams — they project, they do not play', () => {
    const game = { ...base, settings: { playStyle: 'teams' as const, teamCount: 2 } };
    const ctx = buildClassroomLiveContext({
      game,
      humanUsernames: ['ana', 'bo', 'Ms Rivera'],
    })!;
    const everyone = ctx.teams!.flatMap((t) => t.memberNames);
    expect(everyone).not.toContain('Ms Rivera');
    expect(everyone.sort()).toEqual(['ana', 'bo']);
  });

  it('keeps round two on round one’s teams and seats the late arrival', () => {
    // The whole point: a student joining for round two must not re-colour the class.
    const round1 = buildClassroomLiveContext({
      game: { ...base, settings: { playStyle: 'teams' as const, teamCount: 2 } },
      humanUsernames: ['ana', 'bo', 'cy', 'di'],
    })!;
    const round2 = buildClassroomLiveContext({
      game: {
        ...base,
        roundsPlayed: 1,
        teams: round1.teams,
        settings: { playStyle: 'teams' as const, teamCount: 2 },
      },
      humanUsernames: ['ana', 'bo', 'cy', 'di', 'eli'],
    })!;

    for (const team of round1.teams!) {
      const same = round2.teams!.find((t) => t.id === team.id)!;
      expect(same.memberNames).toEqual(expect.arrayContaining(team.memberNames));
    }
    expect(round2.teams!.flatMap((t) => t.memberNames)).toContain('eli');
  });

  it('excludes bots from the deal', () => {
    const game = { ...base, settings: { playStyle: 'teams' as const, teamCount: 2 } };
    const ctx = buildClassroomLiveContext({
      game,
      humanUsernames: ['ana', 'bo'],
    })!;
    expect(ctx.teams!.flatMap((t) => t.memberNames).sort()).toEqual(['ana', 'bo']);
  });
});
