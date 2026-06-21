/**
 * Tests for cross-language (global) daily-challenge leaderboard ordering.
 *
 * Background: each language plays a DIFFERENT daily puzzle, and the SQL views
 * rank players with ROW_NUMBER() PARTITIONed by language — so every language
 * gets its own rank #1. Historically the API also filtered `.eq('language', x)`,
 * so a player only ever saw competitors from their own language.
 *
 * New requirement: the daily-challenge leaderboard must include players from
 * ALL languages in a single global ranking. Because the view's rank_position is
 * per-language, the route can no longer trust it once the language filter is
 * dropped — it must re-sort the merged rows by the same scoring criteria and
 * renumber rank_position 1..N globally.
 *
 * These tests pin down that pure ordering + reranking logic.
 */

import { describe, it, expect } from 'vitest';
import {
  rerankSequential,
  sortWordHuntRowsGlobally,
  sortWordWheelRowsGlobally,
  sortClassicPuzzleRowsGlobally,
} from '../leaderboardSort';

describe('rerankSequential', () => {
  it('renumbers rank_position 1..N regardless of incoming per-language ranks', () => {
    const rows = [
      { player_id: 'a', language: 'he', rank_position: 1 },
      { player_id: 'x', language: 'en', rank_position: 1 },
      { player_id: 'b', language: 'he', rank_position: 2 },
    ];

    expect(rerankSequential(rows).map((r) => r.rank_position)).toEqual([1, 2, 3]);
  });

  it('returns an empty array unchanged', () => {
    expect(rerankSequential([])).toEqual([]);
  });

  it('preserves all other row fields', () => {
    const reranked = rerankSequential([{ player_id: 'a', score: 100, rank_position: 9 }]);
    expect(reranked[0]).toMatchObject({ player_id: 'a', score: 100, rank_position: 1 });
  });
});

describe('sortWordHuntRowsGlobally', () => {
  it('interleaves players from different languages by efficiency score', () => {
    const rows = [
      { player_id: 'he-top', language: 'he', solved: true, efficiency_score: 800, attempts_used: 2, completed_at: '2026-06-21T10:00:00Z' },
      { player_id: 'en-top', language: 'en', solved: true, efficiency_score: 950, attempts_used: 1, completed_at: '2026-06-21T09:00:00Z' },
      { player_id: 'he-2', language: 'he', solved: true, efficiency_score: 900, attempts_used: 3, completed_at: '2026-06-21T11:00:00Z' },
    ];

    const sorted = sortWordHuntRowsGlobally(rows);

    // Global order by efficiency desc: en-top(950), he-2(900), he-top(800)
    expect(sorted.map((r) => r.player_id)).toEqual(['en-top', 'he-2', 'he-top']);
  });

  it('ranks solved players above unsolved ones', () => {
    const rows = [
      { player_id: 'unsolved-high', language: 'en', solved: false, efficiency_score: 999, attempts_used: 10, completed_at: '2026-06-21T08:00:00Z' },
      { player_id: 'solved-low', language: 'he', solved: true, efficiency_score: 100, attempts_used: 9, completed_at: '2026-06-21T09:00:00Z' },
    ];

    expect(sortWordHuntRowsGlobally(rows).map((r) => r.player_id)).toEqual(['solved-low', 'unsolved-high']);
  });

  it('breaks ties on fewer attempts, then earlier completion', () => {
    const rows = [
      { player_id: 'later', language: 'en', solved: true, efficiency_score: 500, attempts_used: 2, completed_at: '2026-06-21T12:00:00Z' },
      { player_id: 'fewer-attempts', language: 'he', solved: true, efficiency_score: 500, attempts_used: 1, completed_at: '2026-06-21T13:00:00Z' },
      { player_id: 'earlier', language: 'sv', solved: true, efficiency_score: 500, attempts_used: 2, completed_at: '2026-06-21T11:00:00Z' },
    ];

    expect(sortWordHuntRowsGlobally(rows).map((r) => r.player_id)).toEqual(['fewer-attempts', 'earlier', 'later']);
  });

  it('does not mutate the input array', () => {
    const rows = [
      { player_id: 'a', language: 'en', solved: true, efficiency_score: 1, attempts_used: 1, completed_at: 'z' },
      { player_id: 'b', language: 'he', solved: true, efficiency_score: 2, attempts_used: 1, completed_at: 'z' },
    ];
    const snapshot = rows.map((r) => r.player_id);
    sortWordHuntRowsGlobally(rows);
    expect(rows.map((r) => r.player_id)).toEqual(snapshot);
  });
});

describe('sortWordWheelRowsGlobally', () => {
  it('orders all languages by score desc, then word_count desc, then earlier completion', () => {
    const rows = [
      { player_id: 'he', language: 'he', score: 120, word_count: 8, completed_at: '2026-06-21T10:00:00Z' },
      { player_id: 'en', language: 'en', score: 200, word_count: 12, completed_at: '2026-06-21T09:00:00Z' },
      { player_id: 'es-a', language: 'es', score: 120, word_count: 10, completed_at: '2026-06-21T11:00:00Z' },
    ];

    expect(sortWordWheelRowsGlobally(rows).map((r) => r.player_id)).toEqual(['en', 'es-a', 'he']);
  });
});

describe('sortClassicPuzzleRowsGlobally', () => {
  it('orders all languages by score desc, word_count desc, then faster time (nulls last)', () => {
    const rows = [
      { player_id: 'he', language: 'he', score: 300, word_count: 20, time_seconds: 90 },
      { player_id: 'en', language: 'en', score: 300, word_count: 20, time_seconds: 60 },
      { player_id: 'no-time', language: 'sv', score: 300, word_count: 20, time_seconds: null },
    ];

    expect(sortClassicPuzzleRowsGlobally(rows).map((r) => r.player_id)).toEqual(['en', 'he', 'no-time']);
  });
});
