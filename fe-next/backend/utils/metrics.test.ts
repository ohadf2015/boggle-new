import { describe, it, expect, beforeEach } from 'vitest';
import { incPerGame, ensureGame, getRoomMetrics, deleteRoom, resetAll } from './metrics';

describe('metrics perRoom lifecycle', () => {
  beforeEach(() => {
    resetAll();
  });

  it('removes a single game\'s per-room counters on deleteRoom (prevents unbounded heap growth)', () => {
    // Given two games have accumulated per-room metrics
    incPerGame('GAME_A', 'wordAccepted', 3);
    incPerGame('GAME_B', 'wordAccepted', 1);
    expect(getRoomMetrics().map((r) => r.gameCode).sort()).toEqual(['GAME_A', 'GAME_B']);

    // When one game is deleted (game end / stale sweep)
    deleteRoom('GAME_A');

    // Then only the surviving game remains — no orphaned entry leaks
    const remaining = getRoomMetrics();
    expect(remaining.map((r) => r.gameCode)).toEqual(['GAME_B']);
  });

  it('is a no-op for unknown, null, or undefined game codes', () => {
    ensureGame('GAME_C');
    expect(() => deleteRoom('DOES_NOT_EXIST')).not.toThrow();
    expect(() => deleteRoom(null)).not.toThrow();
    expect(() => deleteRoom(undefined)).not.toThrow();
    // Existing game untouched by bogus deletes
    expect(getRoomMetrics().map((r) => r.gameCode)).toEqual(['GAME_C']);
  });
});
