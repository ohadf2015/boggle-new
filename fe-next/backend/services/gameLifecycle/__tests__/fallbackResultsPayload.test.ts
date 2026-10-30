import { describe, it, expect } from 'vitest';
import { buildFallbackResultsPayload } from '../fallbackResultsPayload';

describe('buildFallbackResultsPayload', () => {
  it('carries the round id so a classroom chest request can match it', () => {
    const payload = buildFallbackResultsPayload({
      gameSessionId: 7,
      letterGrid: [['a']],
      gameMode: 'classic',
      users: { ana: {} },
      playerScores: { ana: 12 },
      playerWords: { ana: ['cat'] },
    } as never);
    expect(payload.gameSessionId).toBe(7);
  });

  it('marks bots and the host like the scored payload, so a practice round still reads as practice', () => {
    const payload = buildFallbackResultsPayload({
      letterGrid: [['a']],
      users: { 'Sprout Bot': { isBot: true }, 'Ms Cohen': { isHost: true }, ana: {} },
    } as never);
    const flags = Object.fromEntries(payload.scores.map((s) => [s.username, [s.isBot, s.isHost]]));
    expect(flags).toEqual({ 'Sprout Bot': [true, false], 'Ms Cohen': [false, true], ana: [false, false] });
  });

  it('carries the signed-in user id like the scored payload; guests and bots have none', () => {
    const payload = buildFallbackResultsPayload({
      letterGrid: [['a']],
      users: { ana: { authUserId: 'uuid-ana' }, guest: {}, bot: { isBot: true, authUserId: 'x' } },
    } as never);
    const byName = Object.fromEntries(payload.scores.map((s) => [s.username, s]));
    expect(byName.ana).toHaveProperty('userId', 'uuid-ana');
    expect(byName.guest).not.toHaveProperty('userId');
    expect(byName.bot).not.toHaveProperty('userId');
  });

  it('a classroom room carries no user ids', () => {
    const payload = buildFallbackResultsPayload({
      letterGrid: [['a']],
      isClassroom: true,
      users: { kid: { authUserId: 'uuid-anon-kid' } },
    } as never);
    expect(payload.scores[0]).not.toHaveProperty('userId');
  });
});
