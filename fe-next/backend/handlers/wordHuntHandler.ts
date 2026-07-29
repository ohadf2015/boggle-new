/**
 * Word Hunt Handler
 * Handles target word guess submissions for Word Hunt multiplayer mode
 */

import { z } from 'zod';
import type { Server, Socket } from 'socket.io';
import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  updatePlayerScore,
  addPlayerEventBonus,
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
import { endGame } from '../services/gameLifecycle/gameEnd.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { validatePayload } from '../utils/socketValidation.js';
import logger from '../utils/logger.js';
import timerManager from '../utils/timerManager.js';
import { gameCleanupEmitter } from '../events/gameCleanup.js';

// Clean up word hunt timers on game end/reset
gameCleanupEmitter.onGameEnd(({ gameCode }) => {
  timerManager.clearTimer(`wordHuntEnd:${gameCode}`);
});

gameCleanupEmitter.onGameReset(({ gameCode }) => {
  timerManager.clearTimer(`wordHuntEnd:${gameCode}`);
});

const submitTargetWordSchema = z.object({
  guess: z.string().min(1, 'Guess is required').max(50, 'Guess is too long').transform(s => s.toLowerCase().trim()),
});

interface SubmitTargetWordPayload {
  guess: string;
}

const MAX_GUESS_LENGTH = 50;
/** Delay before ending game after target found, allows celebration UI */
const TARGET_FOUND_END_DELAY_MS = 3000;

/**
 * Handle a target word guess submission.
 * Exported for direct use in tests and socket registration.
 *
 * Different-length guesses are treated as "discovery" feedback:
 * they return letter feedback for display but don't penalize life,
 * mirroring the SP survival mode behavior.
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

  const huntState = game.wordHuntState;
  if (!huntState) {
    socket.emit('error', { message: 'Word hunt state not initialized' });
    return;
  }

  if (huntState.eliminatedPlayers.includes(username)) {
    socket.emit('error', { message: 'You have been eliminated' });
    return;
  }

  // Target already found — reject further guesses
  if (huntState.targetFoundBy) {
    socket.emit('error', { message: 'Target word already found' });
    return;
  }

  const guess = (data.guess || '').toLowerCase().trim();
  if (!guess) {
    socket.emit('error', { message: 'Guess is required' });
    return;
  }

  if (guess.length > MAX_GUESS_LENGTH) {
    socket.emit('error', { message: 'Guess is too long' });
    return;
  }

  // Generate Wordle-style feedback
  const feedback = validateTargetGuess(huntState.targetWord, guess);

  // Different-length guesses are discovery feedback only (no penalty, can't be correct)
  const isDiscovery = guess.length !== huntState.targetWord.length;
  const isCorrect = !isDiscovery && feedback.every((f) => f === 'correct');

  if (isCorrect) {
    // Target found
    const result = recordTargetFound(huntState, username);

    // Apply finder bonus (decreasing: 20/12/8/5 for 1st/2nd/3rd/4th+) to player's score
    if (result.bonus > 0) {
      updatePlayerScore(gameCode, username, result.bonus, true);
      // The finder bonus is never stored in per-word details, so the end-of-game word
      // recompute would drop it. Mirror it into the event-bonus accumulator so it
      // survives into the result page. See playerEventBonuses.
      addPlayerEventBonus(gameCode, username, result.bonus);
    }

    socket.emit('wordHuntTargetResult', {
      guess,
      feedback,
      correct: true,
      isFirstFinder: result.isFirstFinder,
      bonus: result.bonus,
      livesRemaining: huntState.playerLives[username] || 0,
      isDiscovery: false,
    });

    broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntTargetFound', {
      username,
      targetWord: huntState.targetWord,
      isFirstFinder: result.isFirstFinder,
    });

    logger.info('WORD_HUNT', `${username} found target word "${huntState.targetWord}" in ${gameCode} (first: ${result.isFirstFinder})`);

    // End game after a short delay to allow celebration UI
    timerManager.setTimeout(`wordHuntEnd:${gameCode}`, () => {
      const currentGame = getGame(gameCode);
      if (currentGame && currentGame.gameState === 'in-progress') {
        logger.info('WORD_HUNT', `Ending game ${gameCode} after target word found`);
        endGame(io, gameCode);
      }
    }, TARGET_FOUND_END_DELAY_MS);
  } else if (isDiscovery) {
    // Discovery feedback: show letter matches without life penalty
    socket.emit('wordHuntTargetResult', {
      guess,
      feedback,
      correct: false,
      isFirstFinder: false,
      bonus: 0,
      livesRemaining: huntState.playerLives[username] || 0,
      isDiscovery: true,
    });
  } else {
    // Wrong same-length guess - penalize
    const penalty = penalizeWrongGuess(huntState, username);

    socket.emit('wordHuntTargetResult', {
      guess,
      feedback,
      correct: false,
      isFirstFinder: false,
      bonus: 0,
      livesRemaining: penalty.livesRemaining,
      isDiscovery: false,
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
  socket.on('submitTargetWord', (data: unknown) => {
    if (!checkRateLimit(socket.id, 5)) {
      socket.emit('rateLimited', { message: 'Too many guesses, slow down' });
      return;
    }

    // Validate payload with Zod schema
    const validation = validatePayload(submitTargetWordSchema, data);
    if (!validation.success) {
      socket.emit('error', { message: `Invalid guess: ${validation.error}` });
      return;
    }

    try {
      handleSubmitTargetWord(io, socket, validation.data as SubmitTargetWordPayload);
    } catch (error) {
      logger.error('WORD_HUNT', `Error handling submitTargetWord: ${(error as Error).message}`);
      socket.emit('error', { message: 'An error occurred processing your guess' });
    }
  });
}
