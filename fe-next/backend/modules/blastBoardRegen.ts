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

import type { Server } from 'socket.io';
import type { GameState } from './gameState/types.js';
import type { BlastTileState } from '@/shared/types/blast';
import type { LetterGrid, Language } from '@/shared/types';

import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { getGameBots, resyncBotsForNewGrid } from './botManager.js';
import {
  isBlastBoardCleared,
  regenerateBlastBoard,
  recordBlastBoardClear,
  tryBeginWaveAdvance,
  endWaveAdvance,
} from './blastModeManager.js';
import { makePositionsMap } from './wordValidator.js';
import { generateRandomTable } from '../utils/gameUtils.js';
import { generateRichBoard } from '../utils/boardSelection.js';
import logger from '../utils/logger.js';

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
): boolean {
  if (isBlastBoardCleared(tileStates)) return true;
  return countSurviving(tileStates) < Math.max(2, minWordLength);
}

/**
 * If the board is exhausted, regenerate a fresh full letter board in place and
 * broadcast it to the room. Returns true if a regeneration happened.
 *
 * `blastState` is mutated in place (Object.assign) and `game.letterGrid` /
 * `letterPositions` are synced so the next word validates against the new board.
 */
export function regenerateBlastBoardIfExhausted(params: {
  io: Server;
  gameCode: string;
  game: GameState;
  username: string;
  newTileStates: BlastTileState[][];
}): boolean {
  const { io, gameCode, game, username, newTileStates } = params;
  const blastState = game.blastModeState;
  if (!blastState) return false;

  const minWordLength = game.minWordLength ?? DEFAULT_MIN_WORD_LENGTH;
  if (!isBlastBoardExhausted(newTileStates, minWordLength)) return false;
  if (!tryBeginWaveAdvance(gameCode)) return false;

  try {
    recordBlastBoardClear(blastState, username);

    // Fresh full board of letters — anti-cheat server-side generation, same
    // recipe as game start. The cleared grid is all-empty, so we cannot reuse
    // it. Broadcast below carries the new grid to peers (no seed reproduction).
    const lang = (game.language || 'en') as Language;
    const gridSize = (blastState.grid?.length ?? game.letterGrid?.length ?? 6);
    const freshGrid = generateRichBoard(
      () => generateRandomTable(gridSize, gridSize, lang),
      lang,
      gridSize,
      gridSize,
    ) as LetterGrid;

    const next = regenerateBlastBoard(blastState, gameCode, freshGrid);
    const nextGrid = next.grid ?? freshGrid;
    Object.assign(blastState, {
      overlay: next.overlay,
      overlayMap: next.overlayMap,
      tileStates: next.tileStates,
      seed: next.seed,
      grid: nextGrid,
      refillCount: next.refillCount,
    });
    game.letterGrid = nextGrid;
    game.letterPositions = makePositionsMap(nextGrid, lang);

    logger.info('BLAST', `Board exhausted in ${gameCode} by ${username} — fresh board (refill #${next.refillCount})`);

    broadcastToRoom(io, getGameRoom(gameCode), 'blastBoardUpdate', {
      grid: nextGrid,
      tileStates: next.tileStates,
      overlay: next.overlay,
      seed: next.seed,
      clearedBy: '__board_regenerated__',
      word: '',
      clearedCount: 0,
      totalMoves: blastState.totalMoves ?? 0,
    });

    void resyncBotsForNewGrid(getGameBots(gameCode), nextGrid, lang);
    return true;
  } finally {
    endWaveAdvance(gameCode);
  }
}
