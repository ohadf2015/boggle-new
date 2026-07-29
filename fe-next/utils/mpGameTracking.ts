/**
 * Multiplayer Game Tracking Utilities
 *
 * Emits game_started and game_completed events to PostHog with MP-specific properties.
 * These events are consumed by the nightly intelligence suite (scripts/nightly/lib/intel/collectors/)
 * to build reports on MP mode popularity and outcomes.
 *
 * PostHog Event Schema:
 *   event: 'game_started' | 'game_completed'
 *   properties:
 *     - gameMode: 'classic' | 'blast' | 'word-hunt' | 'wheel-rush' | 'word-tower' | 'shiritori'
 *     - engineMode: 'multiplayer' (constant for MP events)
 *     - isMultiplayer: true (constant for MP events)
 *     - roundIndex: number (0-based round in session; 0 for first game, 1 for second, etc.)
 *     - playerCount: number (human players in the game)
 *     - gameCode: string (room code)
 *     [game_completed only:]
 *     - score: number (player's final score)
 *     - wordCount: number (total words found by player)
 *     - durationSec: number (game duration in seconds)
 *     - isWinner: boolean (whether player had highest/winning score)
 */

import { trackGameStart as trackGameStartBase, trackGameEnd as trackGameEndBase } from './growthTracking';
import type { GameMode } from '@/shared/types/game';

/**
 * Emit game_started for a multiplayer game with mode-specific tracking.
 *
 * Call this once per MP game start (after letter grid is generated, before timer starts).
 * The nightly intelligence suite monitors these events to track MP mode popularity.
 */
export function trackMpGameStart(args: {
  gameMode: GameMode;
  roundIndex: number;
  playerCount: number;
  gameCode: string;
  /** Number of bot players in the room (humans = playerCount). Optional; enables
   *  the admin game log to report human-vs-bot composition going forward. */
  botCount?: number;
}): void {
  const { gameMode, roundIndex, playerCount, gameCode, botCount } = args;

  trackGameStartBase('multiplayer', {
    gameMode,
    engineMode: 'multiplayer',
    isMultiplayer: true,
    roundIndex,
    playerCount,
    gameCode,
    ...(typeof botCount === 'number' ? { botCount } : {}),
  });
}

/**
 * Emit game_completed for a multiplayer game with mode-specific tracking.
 *
 * Call this once per MP game end (after results are finalized, before results screen).
 * Include isWinner so the nightly suite can segment outcomes by mode+result.
 */
export function trackMpGameEnd(args: {
  gameMode: GameMode;
  roundIndex: number;
  playerCount: number;
  gameCode: string;
  score: number;
  wordCount: number;
  durationSec: number;
  isWinner: boolean;
  /** Number of bot players in the room. Optional; surfaced in the admin game log. */
  botCount?: number;
}): void {
  const { gameMode, roundIndex, playerCount, gameCode, score, wordCount, durationSec, isWinner, botCount } = args;

  trackGameEndBase('multiplayer', score, wordCount, true, durationSec, {
    gameMode,
    engineMode: 'multiplayer',
    isMultiplayer: true,
    roundIndex,
    playerCount,
    gameCode,
    isWinner,
    ...(typeof botCount === 'number' ? { botCount } : {}),
  });
}
