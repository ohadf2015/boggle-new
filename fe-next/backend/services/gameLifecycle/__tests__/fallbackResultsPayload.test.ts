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
});
