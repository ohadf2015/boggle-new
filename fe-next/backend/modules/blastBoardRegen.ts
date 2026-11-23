/**
 * Blast Board Regeneration (shared MP helper)
 *
 * Single source of truth for the "board exhausted → refresh" decision, used by
 * the human word path (wordValidationHandler) AND both bot paths (botBlast,
 * botGame). Blast MP runs gravity with refill=false so the shared board SHRINKS
 * as words clear; this helper decides when it has shrunk far enough to refresh
 * and regenerates a fresh full letter board for everyone.
 *
 * Keeping the rule here (not copy-pasted across three call sites) guarantees
 * humans and bots never disagree about when the board refreshes — a past source
 * of desync when each site hardcoded its own refill flag.
 */

import type { Server, Socket } from 'socket.io';
import type { GameState } from './gameState/types.js';
import type { BlastTileState } from '@/shared/types/blast';
import type { BlastPlayerBoard, Language } from '@/shared/types/game';
import type { LetterGrid } from '@/shared/types';

import { safeEmit } from '../utils/socketHelpers.js';
import {
  getOrInitPlayerBoard,
  isBlastBoardCleared,
  regeneratePlayerBoard,
  recordBlastBoardClear,
  tryBeginWaveAdvance,
  endWaveAdvance,
} from './blastModeManager.js';
import { generateRandomTable } from '../utils/gameUtils.js';
import { generateRichBoard } from '../utils/boardSelection.js';
import logger from '../utils/logger.js';
import { hasValidWords } from '@/components/blast/legacy/utils/blastDeadEndDetector';
import { isValidWord } from '../dictionary.js';

/** Word search on a shrunken board only: few tiles keep it to a few thousand checks. */
const SPARSE_BOARD_TILES = 12;
const SPARSE_WORD_MAX = 6;

/** Fallback min length when a game omits one — matches the lowest configurable. */
const DEFAULT_MIN_WORD_LENGTH = 3;

/**
 * Count surviving (non-cleared) tiles in a tile-state grid.
 */
function countSurviving(tileStates: BlastTileState[][]): number {
  return tileStates.reduce(
    (sum, row) => sum + row.filter(t => !t.isCleared).length,
    0,
  );
}

/**
 * Decide whether the post-gravity board is exhausted and should refresh.
 *
 * Exhausted when fully cleared OR when too few tiles survive to ever form a
 * min-length word (a soft freeze on a shared board where several players clear
 * at once). Both cases warrant a full refresh — and only fire at the very end
 * of a board, so the refresh reads as a satisfying reset, never per-word churn.
 */
export function isBlastBoardExhausted(
  tileStates: BlastTileState[][],
  minWordLength: number,
  words?: { grid: string[][]; checkWord: (word: string) => boolean },
): boolean {
  if (isBlastBoardCleared(tileStates)) return true;
  const surviving = countSurviving(tileStates);
  if (surviving < Math.max(2, minWordLength)) return true;
  // A few leftover tiles that spell nothing left the player stuck until the timer.
  if (!words || surviving > SPARSE_BOARD_TILES) return false;
  const live = tileStates.map((row, r) => row.map((t, c) => (t.isCleared ? '' : words.grid[r]?.[c] ?? '')));
  return !hasValidWords(live, '', words.checkWord, new Set(), minWordLength, SPARSE_WORD_MAX);
}

/**
 * If THIS player's board is exhausted, regenerate a fresh full board for that
 * player and (for humans) unicast it to them. Returns true if regenerated.
 *
 * Per-player: boards are independent, so the regen touches only `board` and is
 * sent only to the owning `socket` (humans) — bots regen silently (no socket).
 * Because the game ends only on the round timer, a player can clear and refill
 * MANY boards in one round.
 */
export function regenerateBlastBoardIfExhausted(params: {
  io: Server;
  gameCode: string;
  game: GameState;
  username: string;
  board: BlastPlayerBoard;
  newTileStates: BlastTileState[][];
  socket?: Socket;
}): boolean {
  const { gameCode, game, username, board, newTileStates, socket } = params;
  const blastState = game.blastModeState;
  if (!blastState) return false;

  const minWordLength = game.minWordLength ?? DEFAULT_MIN_WORD_LENGTH;
  const lang = (game.language || 'en') as Language;
  // An unloaded dictionary (null) counts as a word, so it never forces a refresh.
  const checkWord = (w: string) => isValidWord(w.toLowerCase(), lang) !== false;
  if (!isBlastBoardExhausted(newTileStates, minWordLength, { grid: board.grid, checkWord })) return false;
  // Per-player lock (boards are independent → no cross-player race; this only
  // guards a same-player double-fire).
  const lockKey = `${gameCode}:${username}`;
  if (!tryBeginWaveAdvance(lockKey)) return false;

  try {
    recordBlastBoardClear(blastState, username); // bumps playerStats[username].boardClears
    refreshBoard({ gameCode, game, username, board, socket, now: Date.now() });
    logger.info('BLAST', `Board exhausted in ${gameCode} by ${username} — fresh board (refill #${board.refillCount})`);
    return true;
  } finally {
    endWaveAdvance(lockKey);
  }
}

/** Fresh full board of letters for one player (server-side generation), unicast to its owner. */
function refreshBoard(params: { gameCode: string; game: GameState; username: string; board: BlastPlayerBoard; socket?: Socket; now: number }): void {
  const { gameCode, game, username, board, socket, now } = params;
  const lang = (game.language || 'en') as Language;
  const gridSize = (board.grid?.length ?? 6);
  const freshGrid = generateRichBoard(
    () => generateRandomTable(gridSize, gridSize, lang),
    lang,
    gridSize,
    gridSize,
  ) as LetterGrid;

  regeneratePlayerBoard(board, gameCode, username, freshGrid);
  board.regeneratedAt = now;

  // Bots have no socket → silent regen.
  if (socket) {
    safeEmit(socket, 'blastBoardUpdate', {
      grid: board.grid,
      tileStates: board.tileStates,
      overlay: board.overlay,
      seed: board.seed,
      clearedBy: '__board_regenerated__',
      word: '',
      clearedCount: 0,
      totalMoves: board.totalMoves ?? 0,
    });
  }
}

/** A dead-end report this soon after a refresh was about the board it replaced. */
const DEAD_END_STALE_MS = 3000;

/**
 * A player's board has no word left. With anyone else in the room the round
 * goes on (it ends on the timer), so only that player's board refreshes; a
 * solo room may end early, as it always has.
 */
export function refreshBlastBoardOnDeadEnd(params: {
  io: Server;
  gameCode: string;
  game: GameState;
  username: string;
  socket?: Socket;
  now: number;
}): 'regenerated' | 'recent' | 'solo' {
  const { gameCode, game, username, socket, now } = params;
  const blastState = game.blastModeState;
  if (!blastState || Object.keys(game.users ?? {}).length < 2) return 'solo';
  const board = getOrInitPlayerBoard(blastState, username);
  if (board.regeneratedAt !== undefined && now - board.regeneratedAt < DEAD_END_STALE_MS) return 'recent';
  const lockKey = `${gameCode}:${username}`;
  if (!tryBeginWaveAdvance(lockKey)) return 'recent';
  try {
    refreshBoard({ gameCode, game, username, board, socket, now });
    logger.info('BLAST', `Dead end in ${gameCode} for ${username} — fresh board (refill #${board.refillCount})`);
    return 'regenerated';
  } finally {
    endWaveAdvance(lockKey);
  }
}
