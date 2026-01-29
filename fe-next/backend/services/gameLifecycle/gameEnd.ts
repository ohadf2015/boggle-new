/**
 * Game End Service
 *
 * Orchestrates game ending: stops timers/bots, cleans up state,
 * triggers score calculation, and handles post-game workflows.
 */

import type { Server } from 'socket.io';
import { getGame, transitionGameState } from '../../modules/gameStateManager';
import {
  collectNonDictionaryWords,
  getWordsForPlayer,
  SELF_HEALING_CONFIG,
  cleanupGameTracking,
} from '../../modules/communityWordManager';
import { broadcastToRoom, getGameRoom, getSocketById, safeEmit } from '../../utils/socketHelpers';
import timerManager from '../../utils/timerManager';
import * as botManager from '../../modules/botManager';
import { gameCleanupEmitter } from '../../events/gameCleanup';
import { calculateAndBroadcastFinalScores } from './gameScores';
import { handlePeerValidation } from './peerValidation';
import { handleTournamentCompletion } from './tournamentEnd';
import logger from '../../utils/logger';

const FEEDBACK_TIMEOUT_SECONDS = 15;

/**
 * End the game
 *
 * Orchestrates the full game end sequence:
 * 1. Stops timer and bots
 * 2. Cleans up game state (hints, earthquake, AI tracking)
 * 3. Transitions game state machine
 * 4. Broadcasts endGame event
 * 5. Calculates and broadcasts final scores
 * 6. Sends word feedback requests
 * 7. Handles peer validation and tournaments
 */
export async function endGame(io: Server, gameCode: string): Promise<void> {
  const game = getGame(gameCode);
  if (!game) return;

  // Stop timer
  timerManager.clearTimer(gameCode);

  // Stop all bots
  botManager.stopAllBots(gameCode);

  // Clean up AI validation tracking
  cleanupGameTracking(gameCode);

  // Emit cleanup event - handlers subscribe to this to clean their state
  // This breaks circular dependencies (earthquakeHandler, hintHandler subscribe)
  gameCleanupEmitter.emitGameEnd(gameCode);

  // Transition game state using state machine (guards against invalid transitions)
  const transitionResult = transitionGameState(gameCode, 'END', { immediate: true });
  if (!transitionResult.success) {
    logger.warn('GAME', `Failed to end game ${gameCode}: ${transitionResult.error}`);
    return;
  }

  // Record end timestamp for grace period handling
  game.gameEndedAt = Date.now();

  // Notify clients that game has ended (sets up waiting state)
  broadcastToRoom(io, getGameRoom(gameCode), 'endGame', {});

  logger.info('GAME', `Game ${gameCode} ending, calculating final scores`);

  // Small delay to allow clients to process endGame event and set up waiting state
  // This prevents race conditions where validatedScores arrives before UI is ready
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Calculate and broadcast final scores
  await calculateAndBroadcastFinalScores(io, gameCode);

  // Collect non-dictionary words for feedback
  const nonDictWords = collectNonDictionaryWords(game);
  const playerCount = Object.keys(game.users).length;

  logger.info(
    'GAME',
    `Game ${gameCode} ended. ${nonDictWords.length} non-dictionary words found, ${playerCount} players.`
  );

  // Send word feedback to each player (help us build the dictionary)
  // Delayed by 20 seconds to allow players to review results first
  if (nonDictWords.length > 0 && playerCount > 1) {
    const wordsPerPlayer = Math.min(
      SELF_HEALING_CONFIG.WORDS_PER_PLAYER,
      nonDictWords.length
    );

    setTimeout(() => {
      for (const [username, userData] of Object.entries(game.users) as [
        string,
        { socketId: string; avatar?: { emoji: string; color: string } }
      ][]) {
        const wordsForPlayer = getWordsForPlayer(
          nonDictWords,
          username,
          game.language || 'en',
          wordsPerPlayer
        );

        if (wordsForPlayer.length > 0) {
          const playerSocket = getSocketById(io, userData.socketId);
          if (playerSocket) {
            safeEmit(playerSocket, 'showWordFeedback', {
              word: wordsForPlayer[0].word,
              submittedBy: wordsForPlayer[0].submittedBy,
              submitterAvatar: wordsForPlayer[0].submitterAvatar,
              voteInfo: wordsForPlayer[0].voteInfo,
              wordQueue: wordsForPlayer,
              timeoutSeconds: FEEDBACK_TIMEOUT_SECONDS,
              gameCode,
              language: game.language || 'en',
            });
          }
        }
      }
    }, 20000); // 20 second delay to allow players to review results first
  }

  // Handle peer validation for AI-approved words
  handlePeerValidation(io, gameCode, game, playerCount);

  // Handle tournament completion
  handleTournamentCompletion(io, gameCode, game);

  logger.info('SOCKET', `Game ${gameCode} ended`);
}
