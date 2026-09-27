/**
 * Test: gameResults.ts game mode default fallback
 * Verifies that undefined gameMode defaults to 'classic', NOT 'multiplayer'
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recordGameResult } from '../gameResults';

// Mock Supabase client
vi.mock('../client', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(function(data) {
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              // Return the data that was inserted so we can verify gameMode
              return { data, error: null };
            })
          }))
        };
      })
    }))
  }))
}));

vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }
}));

describe('gameResults - game mode default fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should store game_mode as "classic" when gameMode is undefined', async () => {
    const result = await recordGameResult({
      playerId: 'player-1',
      gameCode: 'GAME123',
      score: 100,
      wordCount: 5,
      placement: 1,
      language: 'en',
      timePlayed: 60,
      // gameMode intentionally undefined
    });

    // The insert should have been called with game_mode='classic'
    expect(result.error).toBeNull();
    expect(result.data.game_mode).toBe('classic');
  });

  it('should store game_mode as the explicit value when provided', async () => {
    const result = await recordGameResult({
      playerId: 'player-2',
      gameCode: 'GAME456',
      score: 150,
      wordCount: 8,
      placement: 1,
      language: 'en',
      timePlayed: 90,
      gameMode: 'blast',
    });

    expect(result.error).toBeNull();
    expect(result.data.game_mode).toBe('blast');
  });

  it('should store game_mode as the explicit value for word-hunt', async () => {
    const result = await recordGameResult({
      playerId: 'player-3',
      gameCode: 'GAME789',
      score: 200,
      wordCount: 12,
      placement: 1,
      language: 'en',
      timePlayed: 120,
      gameMode: 'word-hunt',
    });

    expect(result.error).toBeNull();
    expect(result.data.game_mode).toBe('word-hunt');
  });

  it('should store game_mode as the explicit value for wheel-rush', async () => {
    const result = await recordGameResult({
      playerId: 'player-4',
      gameCode: 'GAME101112',
      score: 250,
      wordCount: 15,
      placement: 1,
      language: 'en',
      timePlayed: 180,
      gameMode: 'wheel-rush',
    });

    expect(result.error).toBeNull();
    expect(result.data.game_mode).toBe('wheel-rush');
  });

  it('should NOT default to "multiplayer"', async () => {
    const result = await recordGameResult({
      playerId: 'player-5',
      gameCode: 'GAME131415',
      score: 50,
      wordCount: 3,
      placement: 2,
      language: 'en',
      gameMode: undefined,
    });

    expect(result.error).toBeNull();
    // This is the key assertion: ensure it's NOT 'multiplayer'
    expect(result.data.game_mode).not.toBe('multiplayer');
    expect(result.data.game_mode).toBe('classic');
  });
});
