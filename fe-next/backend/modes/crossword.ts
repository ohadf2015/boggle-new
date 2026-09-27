/**
 * Crossword race (beta) — every human solves the same room-seeded puzzle.
 */

import type { GameModeModule } from './types';
import { initCrosswordMpState } from '../modules/crosswordMpManager';
import { getPool, getDailyPuzzle } from '@/lib/crossword/puzzles/index';
import type { PuzzleLocale } from '@/lib/crossword/types';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers';

/** Deterministic non-negative seed from a room key (FNV-1a) for picking a puzzle. */
export function crosswordRoomSeed(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const crosswordMode: GameModeModule = {
  id: 'crossword',

  initRound({ game, gameCode, language, humanUsernames }) {
    const locale = language as PuzzleLocale;
    const pool = getPool(locale);
    // Seeded by room + round: different rooms get different grids, deterministic per room.
    const puzzle = (pool.length > 0 ? pool[crosswordRoomSeed(`${gameCode}:${game.gameSessionId ?? ''}`) % pool.length] : null)
      ?? getDailyPuzzle(new Date().toISOString().slice(0, 10), locale);
    if (puzzle) game.crosswordMpState = initCrosswordMpState(humanUsernames, puzzle);
  },

  // After startGame so the client can mount the race view; reconnects poll requestCrosswordMpState.
  afterStart(io, gameCode, game) {
    const cw = game.crosswordMpState;
    if (!cw) return;
    broadcastToRoom(io, getGameRoom(gameCode), 'crosswordMpInit', {
      puzzle: cw.puzzle,
      players: cw.players,
      standings: cw.players.map((username, i) => ({ username, percent: 0, solved: false, elapsedMs: 0, score: 0, rank: i + 1 })),
      startedAt: cw.startedAt,
    });
  },
};
