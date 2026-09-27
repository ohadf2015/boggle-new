/**
 * Behaviour tests for the rush-tile cadence: spawn -> active state + broadcast,
 * then auto-clear after the duration + reschedule. Uses fake timers (timerManager
 * wraps the global setTimeout) with mocked game-state and socket deps.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mocks (declared before importing the SUT) ----
const game: Record<string, unknown> = {
  gameState: 'in-progress',
  gameSessionId: 'sess-1',
  letterGrid: [
    ['R', 'U', 'S', 'H'],
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'I'],
    ['J', 'K', 'L', 'M'],
  ],
  goldenLetters: [],
};

vi.mock('../gameStateManager.js', () => ({
  getGame: vi.fn(() => game),
  updateGame: vi.fn((_code: string, patch: Record<string, unknown>) => {
    Object.assign(game, patch);
  }),
}));

const broadcastToRoom = vi.fn();
vi.mock('../../utils/socketHelpers.js', () => ({
  broadcastToRoom: (...args: unknown[]) => broadcastToRoom(...args),
  getGameRoom: (code: string) => `room:${code}`,
}));

vi.mock('../../events/gameCleanup', () => ({
  gameCleanupEmitter: { onGameEnd: vi.fn(), onGameReset: vi.fn() },
}));

vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { startRushTiles, clearRushTileTimers } from './rushTilesManager';
import { RUSH_TILE_DURATION_MS, RUSH_SPAWN_MAX_MS } from './rushTilesLogic';

const io = {} as never;

describe('rushTilesManager cadence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    broadcastToRoom.mockClear();
    game.gameState = 'in-progress';
    game.rushTiles = undefined;
    game.rushTilesActive = undefined;
  });

  afterEach(() => {
    clearRushTileTimers('ABCD');
    vi.useRealTimers();
  });

  it('spawns a rush batch (active + broadcast) within the cadence window', () => {
    // Given a started cadence
    startRushTiles(io, 'ABCD');
    // When the max cadence delay elapses
    vi.advanceTimersByTime(RUSH_SPAWN_MAX_MS + 10);
    // Then a spawn was broadcast and the scoring gate is open
    const spawn = broadcastToRoom.mock.calls.find(c => c[2] === 'rushTilesSpawn');
    expect(spawn).toBeTruthy();
    expect((spawn![3] as { tiles: unknown[] }).tiles.length).toBeGreaterThan(0);
    expect(game.rushTilesActive).toBe(true);
    expect((game.rushTiles as unknown[]).length).toBeGreaterThan(0);
  });

  it('auto-clears the batch after the duration and reschedules the next', () => {
    // Given a spawned batch
    startRushTiles(io, 'ABCD');
    vi.advanceTimersByTime(RUSH_SPAWN_MAX_MS + 10);
    expect(game.rushTilesActive).toBe(true);
    broadcastToRoom.mockClear();

    // When the batch duration elapses
    vi.advanceTimersByTime(RUSH_TILE_DURATION_MS + 10);

    // Then the gate closes and a clear is broadcast
    expect(game.rushTilesActive).toBe(false);
    const clear = broadcastToRoom.mock.calls.find(c => c[2] === 'rushTilesClear');
    expect(clear).toBeTruthy();

    // And another batch eventually spawns (cadence is recurring)
    broadcastToRoom.mockClear();
    vi.advanceTimersByTime(RUSH_SPAWN_MAX_MS + 10);
    const nextSpawn = broadcastToRoom.mock.calls.find(c => c[2] === 'rushTilesSpawn');
    expect(nextSpawn).toBeTruthy();
  });

  it('stops the cadence once the game is no longer in-progress', () => {
    startRushTiles(io, 'ABCD');
    game.gameState = 'finished';
    vi.advanceTimersByTime(RUSH_SPAWN_MAX_MS + 10);
    // No spawn, no lingering timers
    const spawn = broadcastToRoom.mock.calls.find(c => c[2] === 'rushTilesSpawn');
    expect(spawn).toBeFalsy();
  });
});
