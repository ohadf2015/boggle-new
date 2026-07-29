/**
 * Round Events Manager
 * Handles mid-game environmental events (blizzard, lightning, meteor)
 * that add variety and engagement to multiplayer rounds.
 */

import type { Server } from 'socket.io';
import type { GameState } from './gameState/types.js';

import { getGame, updateGame } from './gameStateManager.js';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import timerManager from '../utils/timerManager';
import { gameCleanupEmitter } from '../events/gameCleanup';
import logger from '../utils/logger.js';
import { executeEarthquakeSequence } from '../handlers/earthquakeHandler.js';

// ==================== Types ====================

export type RoundEventType = 'blizzard' | 'lightning' | 'meteor';

export interface RoundEventData {
  blizzard?: { frozenTiles: Array<{ row: number; col: number }>; comboDecayMultiplier: number; durationMs: number };
  lightning?: { chargedTiles: Array<{ row: number; col: number }>; bonusMultiplier: number; durationMs: number };
  meteor?: { affectedTiles: Array<{ row: number; col: number; newLetter: string }>; scoreMultiplier: number; durationMs: number };
}

// ==================== Configuration ====================

export const EVENT_CONFIG: Record<RoundEventType, { durationMs: number; warningMs: number }> = {
  blizzard: { durationMs: 18_000, warningMs: 3_000 },
  lightning: { durationMs: 15_000, warningMs: 3_000 },
  meteor: { durationMs: 12_000, warningMs: 3_000 },
};

export type CatalystType = RoundEventType | 'earthquake';

export const CATALYST_POOL: readonly CatalystType[] = [
  'blizzard',
  'lightning',
  'meteor',
  'earthquake',
] as const;

export function pickRandomCatalyst(): CatalystType {
  return CATALYST_POOL[Math.floor(Math.random() * CATALYST_POOL.length)];
}

const SCHEDULE_MIN_PERCENT = 0.50;
const SCHEDULE_MAX_PERCENT = 0.75;

// Letters weighted by typical frequency for random tile replacement
const LETTER_POOL = 'AAABBBCCDDDEEEEFFFGGHHHIIIIJJKLLLLMMNNNNOOOOPPPQRRRRSSSSTTTTUUUVVWWXYYZ';

// ==================== Cleanup Registration ====================

gameCleanupEmitter.onGameEnd(({ gameCode }) => {
  clearRoundEventTimers(gameCode);
});

gameCleanupEmitter.onGameReset(({ gameCode }) => {
  clearRoundEventTimers(gameCode);
});

// ==================== Helpers ====================

function pickRandomTiles(
  grid: Array<Array<unknown>>,
  count: number,
  exclude: Set<string> = new Set()
): Array<{ row: number; col: number }> {
  const result: Array<{ row: number; col: number }> = [];
  const rows = grid.length;
  const cols = (grid[0] as unknown[])?.length || 0;
  let attempts = 0;
  const maxAttempts = rows * cols * 2;

  while (result.length < count && attempts < maxAttempts) {
    attempts++;
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);
    const key = `${row},${col}`;
    if (!exclude.has(key)) {
      exclude.add(key);
      result.push({ row, col });
    }
  }
  return result;
}

function pickRandomLetter(): string {
  return LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)];
}

// ==================== Public API ====================

/**
 * Clear all round event timers for a game.
 */
export function clearRoundEventTimers(gameCode: string): void {
  timerManager.clearTimersWithPrefix(`roundEvent:${gameCode}:`);
}

/**
 * Schedule a random mid-game event for the given game.
 * Stores the schedule in game state and sets up timers.
 */
export function scheduleRoundEvent(
  io: Server,
  gameCode: string,
  _game: GameState,
  totalTimerSeconds: number
): void {
  const catalyst = pickRandomCatalyst();
  const triggerAtPercent =
    SCHEDULE_MIN_PERCENT + Math.random() * (SCHEDULE_MAX_PERCENT - SCHEDULE_MIN_PERCENT);

  updateGame(gameCode, {
    roundEventSchedule: { eventType: catalyst, triggerAtPercent },
    activeRoundEvent: null,
  });

  const triggerDelayMs = totalTimerSeconds * 1000 * triggerAtPercent;

  timerManager.setTimeout(
    `roundEvent:${gameCode}:trigger`,
    () => {
      const currentGame = getGame(gameCode);
      if (!currentGame || currentGame.gameState !== 'in-progress') {
        clearRoundEventTimers(gameCode);
        return;
      }

      if (catalyst === 'earthquake') {
        updateGame(gameCode, { earthquakeTriggered: true });
        const armedGame = getGame(gameCode);
        if (armedGame) {
          executeEarthquakeSequence(io, gameCode, armedGame);
        }
        return;
      }

      executeRoundEvent(io, gameCode, currentGame, catalyst as RoundEventType);
    },
    triggerDelayMs
  );

  logger.info(
    'ROUND_EVENT',
    `Game ${gameCode}: scheduled catalyst '${catalyst}' at ${Math.round(triggerAtPercent * 100)}% of game (${Math.round(triggerDelayMs / 1000)}s)`
  );
}

// ==================== Event Execution ====================

function executeRoundEvent(
  io: Server,
  gameCode: string,
  game: GameState,
  eventType: RoundEventType
): void {
  const room = getGameRoom(gameCode);
  const config = EVENT_CONFIG[eventType];

  // Phase 1: Warning
  broadcastToRoom(io, room, 'roundEventWarning', {
    eventType,
    gameSessionId: game.gameSessionId,
    timestamp: Date.now(),
  });

  logger.debug('ROUND_EVENT', `Game ${gameCode}: WARNING for '${eventType}'`);

  // Phase 2: Active
  timerManager.setTimeout(
    `roundEvent:${gameCode}:start`,
    () => {
      const currentGame = getGame(gameCode);
      if (!currentGame || currentGame.gameState !== 'in-progress') {
        clearRoundEventTimers(gameCode);
        return;
      }

      updateGame(gameCode, { activeRoundEvent: eventType });

      const eventData = buildEventData(eventType, currentGame);

      broadcastToRoom(io, room, 'roundEventStart', {
        eventType,
        gameSessionId: currentGame.gameSessionId,
        duration: config.durationMs,
        data: eventData as Record<string, unknown>,
      });

      // Persist blizzard frozen tiles so word validation can reject them
      if (eventType === 'blizzard' && eventData.blizzard) {
        const cg = getGame(gameCode);
        if (cg) {
          (cg as GameState & { frozenTiles?: Array<{ row: number; col: number }> }).frozenTiles =
            eventData.blizzard.frozenTiles;
        }
      }

      // Persist lightning charged tiles so word validation can check them
      if (eventType === 'lightning' && eventData.lightning) {
        updateGame(gameCode, {
          goldenLetters: [
            ...(currentGame.goldenLetters || []),
            // charged tiles are not golden letters but we store them so validation can find them
          ],
        });
        // Store charged tiles directly on game object for fast access during validation
        const cg = getGame(gameCode);
        if (cg) {
          (cg as GameState & { lightningTiles?: Array<{ row: number; col: number }> }).lightningTiles =
            eventData.lightning.chargedTiles;
        }
      }

      // For meteor: apply new letters to the grid
      if (eventType === 'meteor' && eventData.meteor && currentGame.letterGrid) {
        const newGrid = currentGame.letterGrid.map(row => [...row]) as string[][];
        for (const tile of eventData.meteor.affectedTiles) {
          if (newGrid[tile.row]) {
            newGrid[tile.row][tile.col] = tile.newLetter;
          }
        }
        updateGame(gameCode, { letterGrid: newGrid as typeof currentGame.letterGrid });
      }

      logger.info('ROUND_EVENT', `Game ${gameCode}: '${eventType}' STARTED (${config.durationMs}ms)`);
    },
    config.warningMs
  );

  // Phase 3: End
  timerManager.setTimeout(
    `roundEvent:${gameCode}:end`,
    () => {
      const currentGame = getGame(gameCode);
      if (!currentGame || currentGame.gameState !== 'in-progress') {
        clearRoundEventTimers(gameCode);
        return;
      }

      updateGame(gameCode, { activeRoundEvent: null });

      // Clean up blizzard frozen tiles
      if (eventType === 'blizzard') {
        const bg = getGame(gameCode);
        if (bg) {
          delete (bg as GameState & { frozenTiles?: unknown }).frozenTiles;
        }
      }

      // Clean up lightning tiles
      if (eventType === 'lightning') {
        const cg = getGame(gameCode);
        if (cg) {
          delete (cg as GameState & { lightningTiles?: unknown }).lightningTiles;
        }
      }

      broadcastToRoom(io, room, 'roundEventEnd', {
        eventType,
        gameSessionId: currentGame.gameSessionId,
      });

      logger.info('ROUND_EVENT', `Game ${gameCode}: '${eventType}' ENDED`);
      clearRoundEventTimers(gameCode);
    },
    config.warningMs + config.durationMs
  );
}

function buildEventData(eventType: RoundEventType, game: GameState): RoundEventData {
  const grid = (game.letterGrid as Array<Array<unknown>>) || [];

  switch (eventType) {
    case 'blizzard': {
      const frozenTiles = pickRandomTiles(grid, 5);
      return {
        blizzard: { frozenTiles, comboDecayMultiplier: 0.5, durationMs: EVENT_CONFIG.blizzard.durationMs },
      };
    }

    case 'lightning': {
      const chargedTiles = pickRandomTiles(grid, 3);
      return {
        lightning: {
          chargedTiles,
          bonusMultiplier: 1.5,
          durationMs: EVENT_CONFIG.lightning.durationMs,
        },
      };
    }

    case 'meteor': {
      const affectedPositions = pickRandomTiles(grid, 4);
      const affectedTiles = affectedPositions.map(pos => ({
        ...pos,
        newLetter: pickRandomLetter(),
      }));
      return {
        meteor: {
          affectedTiles,
          scoreMultiplier: 1.5,
          durationMs: EVENT_CONFIG.meteor.durationMs,
        },
      };
    }

    default:
      return {};
  }
}
