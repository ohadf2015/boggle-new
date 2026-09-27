/**
 * Vocabulary Handler
 * Handles vocabulary word selection for teacher lessons
 *
 * TDD: GREEN phase - Implementation to make tests pass
 */

import type { Socket } from 'socket.io';
import type { GameState } from '../modules/gameState/types';
import { checkWordIntegration } from '@/hooks/wordIntegrationLogic';

import { checkRateLimit } from '../utils/rateLimiter.js';
import logger from '../utils/logger.js';

/**
 * Payload for selecting/deselecting a vocabulary word
 */
interface SelectWordPayload {
  word: string;
  include: boolean;
}

/**
 * Handle vocabulary word selection/deselection
 * Only host can select words, only in finished game state
 *
 * @param socket - Socket making the request
 * @param game - Game state
 * @param payload - Word and include/exclude flag
 */
export async function handleSelectVocabularyWord(
  socket: Socket,
  game: GameState,
  payload: SelectWordPayload
): Promise<void> {
  // Validate host
  if (socket.id !== game.hostSocketId) {
    socket.emit('error', { message: 'Only host can select vocabulary words' });
    logger.warn('VOCABULARY', `Non-host ${socket.id} tried to select vocabulary word`);
    return;
  }

  // Validate game state
  if (game.gameState !== 'finished') {
    socket.emit('error', { message: 'Can only select words after game ends' });
    logger.warn('VOCABULARY', `Host tried to select word in ${game.gameState} state`);
    return;
  }

  // Validate word
  if (!payload.word || !payload.word.trim()) {
    socket.emit('error', { message: 'Invalid word' });
    logger.warn('VOCABULARY', 'Empty word received');
    return;
  }

  // Initialize selectedVocabulary if not exists
  if (!game.selectedVocabulary) {
    game.selectedVocabulary = new Set<string>();
  }

  // Toggle selection
  if (payload.include) {
    game.selectedVocabulary.add(payload.word);
    logger.info('VOCABULARY', `Added word: ${payload.word} to game ${game.gameCode}`);
  } else {
    game.selectedVocabulary.delete(payload.word);
    logger.info('VOCABULARY', `Removed word: ${payload.word} from game ${game.gameCode}`);
  }

  // Build response with canIntegrate status for each word
  const selectedWords = Array.from(game.selectedVocabulary).map((word) => {
    const integrationResult = checkWordIntegration(word, game.language);
    return {
      word,
      canIntegrate: integrationResult.canIntegrate,
      reason: integrationResult.reason,
    };
  });

  // Emit updated selection to host
  socket.emit('vocabularySelectionUpdated', { selectedWords });
}

/**
 * Register vocabulary-related socket event handlers
 *
 * @param socket - Socket instance
 * @param getGame - Function to retrieve game by code
 */
export function registerVocabularyHandlers(
  socket: Socket,
  getGame: (code: string) => GameState | null | undefined
): void {
  socket.on('selectVocabularyWord', async (payload: SelectWordPayload) => {
    // Weight 2: per-word toggle is moderate-frequency in classroom UI
    if (!checkRateLimit(socket.id, 2)) {
      socket.emit('error', { message: 'Slow down' });
      return;
    }
    try {
      const { getGameBySocketId } = await import('../modules/gameStateManager.js');
      const gameCode = getGameBySocketId(socket.id);

      if (!gameCode) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const game = getGame(gameCode);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      await handleSelectVocabularyWord(socket, game, payload);
    } catch (error) {
      const err = error as Error;
      logger.error('VOCABULARY', `Error selecting vocabulary word: ${err.message}`);
      socket.emit('error', { message: 'Failed to select vocabulary word' });
    }
  });
}

