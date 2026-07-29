/**
 * emitSinglePlayerGameEnd — singleplayer game_completed PostHog telemetry
 *
 * PostHog funnel showed singleplayer 11 started / 0 completed while every
 * other mode was 100%. Root cause: useSinglePlayerCore never called
 * trackGameEnd on game-over. This helper centralizes the emission so
 * both the happy-path (buildGameResults) and the fallback (buildFallbackResults)
 * branches record a completion event.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SinglePlayerResultsData } from '../../../SinglePlayerView';

const trackGameEnd = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGameEnd: (...args: unknown[]) => trackGameEnd(...args),
}));

import { emitSinglePlayerGameEnd } from '../buildGameResults';

function makeResults(overrides: Partial<SinglePlayerResultsData> = {}): SinglePlayerResultsData {
  return {
    playerScore: 42,
    playerWords: ['cat', 'dog', 'bird'],
    playerWordData: [],
    gameDuration: 120,
    botScores: [{ name: 'Bot1', score: 30, words: [] }],
    grid: [['A']],
    allPossibleWords: [],
    isNewHighScore: false,
    achievements: [],
    botWordsForValidation: [],
    gameSessionId: 'session-xyz',
    language: 'en',
    maxCombo: 3,
    ...overrides,
  } as SinglePlayerResultsData;
}

describe('emitSinglePlayerGameEnd', () => {
  beforeEach(() => {
    trackGameEnd.mockClear();
  });

  it("fires trackGameEnd with 'singleplayer' mode, score, wordCount, completed=true, duration", () => {
    emitSinglePlayerGameEnd(makeResults({ playerScore: 42, playerWords: ['a', 'b', 'c'], gameDuration: 95 }), 'classic');

    expect(trackGameEnd).toHaveBeenCalledTimes(1);
    expect(trackGameEnd).toHaveBeenCalledWith(
      'singleplayer',
      42,
      3,
      true,
      95,
      expect.objectContaining({ subMode: 'classic' })
    );
  });

  it('marks isWinner=true when player beats every bot', () => {
    emitSinglePlayerGameEnd(
      makeResults({ playerScore: 100, botScores: [{ name: 'B1', score: 40, words: [] }, { name: 'B2', score: 80, words: [] }] }),
      'solo-bots'
    );

    const extras = trackGameEnd.mock.calls[0][5] as Record<string, unknown>;
    expect(extras.isWinner).toBe(true);
  });

  it('marks isWinner=false when any bot ties or beats player', () => {
    emitSinglePlayerGameEnd(
      makeResults({ playerScore: 50, botScores: [{ name: 'B1', score: 60, words: [] }] }),
      'classic'
    );
    expect((trackGameEnd.mock.calls[0][5] as Record<string, unknown>).isWinner).toBe(false);

    trackGameEnd.mockClear();
    emitSinglePlayerGameEnd(
      makeResults({ playerScore: 50, botScores: [{ name: 'B1', score: 50, words: [] }] }),
      'classic'
    );
    expect((trackGameEnd.mock.calls[0][5] as Record<string, unknown>).isWinner).toBe(false);
  });

  it('treats practice (no bots) as winner by default', () => {
    emitSinglePlayerGameEnd(makeResults({ playerScore: 0, botScores: [] }), 'practice');
    expect((trackGameEnd.mock.calls[0][5] as Record<string, unknown>).isWinner).toBe(true);
  });

  it('passes subMode through verbatim', () => {
    emitSinglePlayerGameEnd(makeResults(), 'practice');
    expect((trackGameEnd.mock.calls[0][5] as Record<string, unknown>).subMode).toBe('practice');
  });
});
