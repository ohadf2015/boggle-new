/**
 * Test: gameResults.ts persists real_player_count
 *
 * The leaderboard excludes multiplayer games that had no real opponent (a lone
 * human vs bots). That gate relies on game_results storing how many REAL
 * (non-bot) players were present, captured at write time.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recordGameResult } from '../gameResults';

vi.mock('../client', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(function (data) {
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data, error: null })),
          })),
        };
      }),
    })),
  })),
}));

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('gameResults - real_player_count', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores the real (non-bot) player count when provided', async () => {
    const result = await recordGameResult({
      playerId: 'player-1',
      gameCode: 'GAME1',
      score: 100,
      placement: 1,
      gameMode: 'classic',
      realPlayerCount: 3,
    });

    expect(result.error).toBeNull();
    expect((result.data as { real_player_count: number }).real_player_count).toBe(3);
  });

  it('stores 1 for a lone human who played only against bots', async () => {
    const result = await recordGameResult({
      playerId: 'player-2',
      gameCode: 'GAME2',
      score: 80,
      placement: 1,
      gameMode: 'classic',
      realPlayerCount: 1,
    });

    expect(result.error).toBeNull();
    expect((result.data as { real_player_count: number }).real_player_count).toBe(1);
  });

  it('stores null when the count is unknown (legacy callers)', async () => {
    const result = await recordGameResult({
      playerId: 'player-3',
      gameCode: 'GAME3',
      score: 50,
      placement: 2,
      gameMode: 'classic',
      // realPlayerCount intentionally omitted
    });

    expect(result.error).toBeNull();
    expect((result.data as { real_player_count: number | null }).real_player_count).toBeNull();
  });
});
