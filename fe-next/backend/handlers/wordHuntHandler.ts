/**
 * Word Hunt Handler
 * Handles target word guess submissions for Word Hunt multiplayer mode
 */

import type { Server, Socket } from 'socket.io';
import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
} from '../modules/gameStateManager.js';
import {
  validateTargetGuess,
  recordTargetFound,
  penalizeWrongGuess,
} from '../modules/wordHuntManager.js';
import {
  broadcastToRoom,
  getGameRoom,
} from '../utils/socketHelpers.js';
import logger from '../utils/logger.js';

interface SubmitTargetWordPayload {
  guess: string;
}

/**
 * Handle a target word guess submission.
 * Exported for direct use in tests and socket registration.
 */
export function handleSubmitTargetWord(
  io: Server,
  socket: Socket,
  data: SubmitTargetWordPayload,
): void {
  const gameCode = getGameBySocketId(socket.id);
  const username = getUsernameBySocketId(socket.id);

  if (!gameCode || !username) {
    socket.emit('error', { message: 'Not in a game' });
    return;
  }

  const game = getGame(gameCode);
  if (!game) {
    socket.emit('error', { message: 'Game not found' });
    return;
  }

  if (game.gameState !== 'in-progress') {
    socket.emit('error', { message: 'Game is not in progress' });
    return;
  }

  if (game.gameMode !== 'word-hunt') {
    socket.emit('error', { message: 'Not a word-hunt game' });
    return;
  }

  const huntState = (game as any).wordHuntState;
  if (!huntState) {
    socket.emit('error', { message: 'Word hunt state not initialized' });
    return;
  }

  if (huntState.eliminatedPlayers.includes(username)) {
    socket.emit('error', { message: 'You have been eliminated' });
    return;
  }

  const guess = (data.guess || '').toLowerCase().trim();
  if (!guess) {
    socket.emit('error', { message: 'Guess is required' });
    return;
  }

  // Generate Wordle-style feedback
  const feedback = validateTargetGuess(huntState.targetWord, guess);
  const isCorrect = feedback.every((f) => f === 'correct');

  if (isCorrect) {
    // Target found
    const result = recordTargetFound(huntState, username);

    socket.emit('wordHuntTargetResult', {
      guess,
      feedback,
      correct: true,
      isFirstFinder: result.isFirstFinder,
      bonus: result.bonus,
      livesRemaining: huntState.playerLives[username] || 0,
    });

    broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntTargetFound', {
      username,
      targetWord: huntState.targetWord,
      isFirstFinder: result.isFirstFinder,
    });

    logger.info('WORD_HUNT', `${username} found target word "${huntState.targetWord}" in ${gameCode} (first: ${result.isFirstFinder})`);
  } else {
    // Wrong guess - penalize
    const penalty = penalizeWrongGuess(huntState, username);

    socket.emit('wordHuntTargetResult', {
      guess,
      feedback,
      correct: false,
      isFirstFinder: false,
      bonus: 0,
      livesRemaining: penalty.livesRemaining,
    });

    if (penalty.eliminated) {
      broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntEliminated', {
        username,
      });

      logger.info('WORD_HUNT', `${username} eliminated in ${gameCode} (wrong guess)`);
    }
  }
}

/**
 * Register word hunt socket event handlers
 */
export function registerWordHuntHandlers(io: Server, socket: Socket): void {
  socket.on('submitTargetWord', (data: SubmitTargetWordPayload) => {
    handleSubmitTargetWord(io, socket, data);
  });
}
