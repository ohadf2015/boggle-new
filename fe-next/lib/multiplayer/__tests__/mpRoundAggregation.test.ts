/**
 * Test: aggregateRoundsFromResults
 * Verifies grouping of game_results into ordered rounds with mode+score breakdown
 */

import { describe, it, expect } from 'vitest';
import { aggregateRoundsFromResults } from '../mpRoundAggregation';

describe('aggregateRoundsFromResults', () => {
  it('should return empty array for empty input', () => {
    const result = aggregateRoundsFromResults([]);
    expect(result).toEqual([]);
  });

  it('should aggregate single-round two-player game', () => {
    const rows = [
      {
        game_code: 'GAME1',
        game_mode: 'classic',
        score: 250,
        word_count: 12,
        placement: 1,
        created_at: '2026-05-29T10:00:00Z',
        username: 'Alice',
        player_id: 'user-1',
      },
      {
        game_code: 'GAME1',
        game_mode: 'classic',
        score: 180,
        word_count: 8,
        placement: 2,
        created_at: '2026-05-29T10:00:00Z',
        username: 'Bob',
        player_id: 'user-2',
      },
    ];

    const result = aggregateRoundsFromResults(rows);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      roundIndex: 0,
      gameMode: 'classic',
      topScore: 250,
    });
    expect(result[0].scores).toHaveLength(2);
    expect(result[0].scores[0]).toMatchObject({
      username: 'Alice',
      score: 250,
      wordCount: 12,
      placement: 1,
    });
  });

  it('should preserve round ordering by created_at', () => {
    const rows = [
      // Round 1 (classic)
      {
        game_code: 'GAME1',
        game_mode: 'classic',
        score: 200,
        word_count: 10,
        placement: 1,
        created_at: '2026-05-29T10:00:00Z',
        username: 'Alice',
        player_id: 'user-1',
      },
      {
        game_code: 'GAME1',
        game_mode: 'classic',
        score: 150,
        word_count: 7,
        placement: 2,
        created_at: '2026-05-29T10:00:00Z',
        username: 'Bob',
        player_id: 'user-2',
      },
      // Round 2 (blast)
      {
        game_code: 'GAME1',
        game_mode: 'blast',
        score: 300,
        word_count: 20,
        placement: 1,
        created_at: '2026-05-29T10:02:00Z',
        username: 'Alice',
        player_id: 'user-1',
      },
      {
        game_code: 'GAME1',
        game_mode: 'blast',
        score: 280,
        word_count: 18,
        placement: 2,
        created_at: '2026-05-29T10:02:00Z',
        username: 'Bob',
        player_id: 'user-2',
      },
    ];

    const result = aggregateRoundsFromResults(rows);

    expect(result).toHaveLength(2);
    expect(result[0].roundIndex).toBe(0);
    expect(result[0].gameMode).toBe('classic');
    expect(result[1].roundIndex).toBe(1);
    expect(result[1].gameMode).toBe('blast');
  });

  it('should handle different game modes in sequence', () => {
    const rows = [
      {
        game_code: 'MP123',
        game_mode: 'classic',
        score: 100,
        word_count: 5,
        placement: 1,
        created_at: '2026-05-29T12:00:00Z',
        username: 'Player1',
        player_id: 'p1',
      },
      {
        game_code: 'MP123',
        game_mode: 'word-hunt',
        score: 150,
        word_count: 8,
        placement: 1,
        created_at: '2026-05-29T12:02:00Z',
        username: 'Player1',
        player_id: 'p1',
      },
      {
        game_code: 'MP123',
        game_mode: 'wheel-rush',
        score: 120,
        word_count: 6,
        placement: 1,
        created_at: '2026-05-29T12:04:00Z',
        username: 'Player1',
        player_id: 'p1',
      },
    ];

    const result = aggregateRoundsFromResults(rows);

    expect(result).toHaveLength(3);
    expect(result[0].gameMode).toBe('classic');
    expect(result[1].gameMode).toBe('word-hunt');
    expect(result[2].gameMode).toBe('wheel-rush');
  });

  it('should calculate topScore correctly per round', () => {
    const rows = [
      {
        game_code: 'GAME2',
        game_mode: 'blast',
        score: 500,
        word_count: 30,
        placement: 1,
        created_at: '2026-05-29T11:00:00Z',
        username: 'Winner',
        player_id: 'user-w',
      },
      {
        game_code: 'GAME2',
        game_mode: 'blast',
        score: 350,
        word_count: 20,
        placement: 2,
        created_at: '2026-05-29T11:00:00Z',
        username: 'Runner-up',
        player_id: 'user-r',
      },
    ];

    const result = aggregateRoundsFromResults(rows);

    expect(result[0].topScore).toBe(500);
  });
});
