import type { Server } from 'socket.io';
import type { Language, LetterGrid } from '@/shared/types';
import { getGame } from './gameStateManager.js';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { getCachedTrie } from './boggleSolver.js';
import { findAllWordsAsync } from './wordValidatorPool.js';
import logger from '../utils/logger.js';

/** Board words of at least this length count toward the "N words on board" chip. */
const MIN_DISPLAY_WORD_LENGTH = 5;

/**
 * Count and broadcast the board's words (PERF-012: through the worker pool so
 * the DFS doesn't block the event loop). Re-run whenever the grid changes.
 */
export async function emitTotalBoardWords(io: Server, gameCode: string, letterGrid: LetterGrid, gameLang: Language, minWordLength: number): Promise<void> {
  try {
    const allWords = await findAllWordsAsync(letterGrid, gameLang, {
      minLength: minWordLength, maxLength: 15, maxWords: 10000, trie: getCachedTrie(gameLang),
    });
    const totalBoardWords = allWords.filter((word: string) => word.length >= MIN_DISPLAY_WORD_LENGTH).length;
    const currentGame = getGame(gameCode);
    if (currentGame) currentGame.totalBoardWords = totalBoardWords;
    broadcastToRoom(io, getGameRoom(gameCode), 'totalBoardWords', { count: totalBoardWords });
    logger.debug('SOCKET', `Game ${gameCode} has ${totalBoardWords} possible words on board`);
  } catch (err: unknown) {
    logger.error('SOCKET', `Failed to calculate total board words for ${gameCode}`, err as Error);
  }
}
