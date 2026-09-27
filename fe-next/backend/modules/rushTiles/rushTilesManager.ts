/**
 * Rush Tiles Manager
 *
 * Recurring transient bonus tiles for multiplayer classic. Every ~18–26s the
 * server spawns 2–3 random tiles visible to ALL players, broadcasts them, and
 * clears them after ~10s — a sustained "rush" mechanic, distinct from the
 * one-shot round events (blizzard/lightning/meteor).
 *
 * State (`rushTiles` + `rushTilesActive`) is kept independent of
 * `activeRoundEvent` so a rush batch and a round event can be live at the same
 * instant without clobbering each other's scoring gate.
 *
 * Timers use the `rushTiles:${gameCode}:` prefix:
 *   - `:next`  — reschedules itself; drives the recurring cadence
 *   - `:clear` — per-batch expiry, fires once ~10s after each spawn
 * Game-end / reset clears all of them via gameCleanupEmitter.
 */

import type { Server } from 'socket.io';

import { getGame, updateGame } from '../gameStateManager.js';
import { broadcastToRoom, getGameRoom } from '../../utils/socketHelpers.js';
import timerManager from '../../utils/timerManager';
import { gameCleanupEmitter } from '../../events/gameCleanup';
import logger from '../../utils/logger.js';
import {
  computeRushTilePositions,
  nextRushDelayMs,
  rushTileCountForGrid,
  RUSH_TILE_DURATION_MS,
} from './rushTilesLogic';

// ==================== Cleanup Registration ====================

gameCleanupEmitter.onGameEnd(({ gameCode }) => {
  clearRushTileTimers(gameCode);
});

gameCleanupEmitter.onGameReset(({ gameCode }) => {
  clearRushTileTimers(gameCode);
});

// ==================== Public API ====================

/** Clear all rush-tile timers for a game (cadence + any pending batch clear). */
export function clearRushTileTimers(gameCode: string): void {
  timerManager.clearTimersWithPrefix(`rushTiles:${gameCode}:`);
}

/**
 * Begin the recurring rush-tile cadence for a classic multiplayer game.
 * Idempotent-ish: clears any existing rush timers first.
 */
export function startRushTiles(io: Server, gameCode: string): void {
  clearRushTileTimers(gameCode);
  scheduleNextBatch(io, gameCode);
  logger.info('RUSH_TILE', `Game ${gameCode}: rush-tile cadence started`);
}

// ==================== Internals ====================

function scheduleNextBatch(io: Server, gameCode: string): void {
  const delay = nextRushDelayMs();
  timerManager.setTimeout(
    `rushTiles:${gameCode}:next`,
    () => spawnBatch(io, gameCode),
    delay,
  );
}

function spawnBatch(io: Server, gameCode: string): void {
  const game = getGame(gameCode);
  if (!game || game.gameState !== 'in-progress') {
    // Game gone / not running — stop the cadence (do not reschedule).
    clearRushTileTimers(gameCode);
    return;
  }

  const grid = game.letterGrid as ReadonlyArray<ReadonlyArray<string>> | undefined;
  if (!grid?.length) {
    // No board yet — try again next cadence tick.
    scheduleNextBatch(io, gameCode);
    return;
  }

  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  // Avoid landing on golden letters so the two bonuses stay visually distinct.
  const exclude = new Set((game.goldenLetters || []).map(g => `${g.row},${g.col}`));
  const count = rushTileCountForGrid(rows, cols);
  const tiles = computeRushTilePositions(rows, cols, count, Math.random, exclude);

  if (tiles.length === 0) {
    scheduleNextBatch(io, gameCode);
    return;
  }

  updateGame(gameCode, { rushTiles: tiles, rushTilesActive: true });

  const room = getGameRoom(gameCode);
  broadcastToRoom(io, room, 'rushTilesSpawn', {
    tiles,
    durationMs: RUSH_TILE_DURATION_MS,
    gameSessionId: game.gameSessionId,
  });

  logger.debug('RUSH_TILE', `Game ${gameCode}: spawned ${tiles.length} rush tiles (${RUSH_TILE_DURATION_MS}ms)`);

  // Per-batch expiry: clear state + tell clients, then queue the next batch.
  timerManager.setTimeout(
    `rushTiles:${gameCode}:clear`,
    () => {
      const cg = getGame(gameCode);
      if (!cg || cg.gameState !== 'in-progress') {
        clearRushTileTimers(gameCode);
        return;
      }
      updateGame(gameCode, { rushTiles: [], rushTilesActive: false });
      broadcastToRoom(io, getGameRoom(gameCode), 'rushTilesClear', {
        gameSessionId: cg.gameSessionId,
      });
      logger.debug('RUSH_TILE', `Game ${gameCode}: rush tiles cleared`);
      scheduleNextBatch(io, gameCode);
    },
    RUSH_TILE_DURATION_MS,
  );
}
