/**
 * Crossword race (beta) — every human solves the same room-seeded puzzle.
 */

import type { GameModeModule } from './types';
import { initCrosswordMpState, standings } from '../modules/crosswordMpManager';
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

  initRound({ game, gameCode, language, playerUsernames }) {
    const locale = language as PuzzleLocale;
    const pool = getPool(locale);
    // Seeded by room + round: different rooms get different grids, deterministic per room.
    const puzzle = (pool.length > 0 ? pool[crosswordRoomSeed(`${gameCode}:${game.gameSessionId ?? ''}`) % pool.length] : null)
      ?? getDailyPuzzle(new Date().toISOString().slice(0, 10), locale);
    const racers = playerUsernames.filter((u) => !game.users[u]?.isBot);
    if (puzzle) game.crosswordMpState = initCrosswordMpState(racers, puzzle);
  },

  onLateJoin(game, username) {
    const cw = game.crosswordMpState;
    if (!cw || cw.progress[username]) return;
    cw.players.push(username);
    cw.progress[username] = { percent: 0, solved: false, elapsedMs: 0, score: 0 };
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

  // No words are banked here: the race standings are the result.
  rankResults(scores, game) {
    const cw = game.crosswordMpState;
    if (!cw) return scores;
    const byName = new Map(scores.map((s) => [s.username, s]));
    const ranked = standings(cw).flatMap((row) => {
      const entry = byName.get(row.username);
      return entry ? [{ ...entry, totalScore: row.score }] : [];
    });
    const racers = new Set(cw.players);
    const rest = scores.filter((s) => !racers.has(s.username)).map((s) => ({ ...s, totalScore: 0 }));
    return [...ranked, ...rest];
  },
};
