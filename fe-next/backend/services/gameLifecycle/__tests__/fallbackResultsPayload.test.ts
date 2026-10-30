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
});
