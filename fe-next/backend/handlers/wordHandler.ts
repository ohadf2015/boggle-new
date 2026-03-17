/**
 * Word Handler
 * Handles word submission, validation, and voting events
 */

import type { Server, Socket } from 'socket.io';
import type { GameState } from '../modules/gameState/types.js';
import type { LeaderboardPlayer } from '../modules/scoreManager.js';

import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  playerHasWord,
  updatePlayerScore,
  getLeaderboardThrottled,
  markUserActivity,
  recordPeerValidationVote,
  getFirstFinder,
} from '../modules/gameStateManager.js';

import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { isWordOnBoardAsync } from '../modules/wordValidatorPool.js';
import { isProfane } from '../utils/profanityFilter.js';
import { isDictionaryWord } from '../dictionary.js';
import { isSupabaseConfigured, recordPlayerWrongWord } from '../modules/supabaseServer.js';
import { recordVote, updatePendingCache, isWordCommunityValid, isWordValidForScoring } from '../modules/communityWordManager.js';
import { emitError, ErrorCodes } from '../utils/errorHandler.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { inc, incPerGame } from '../utils/metrics.js';
import logger from '../utils/logger.js';
import { isSocketMigrating } from './shared';
import { validatePayload, submitWordSchema, submitWordVoteSchema, submitPeerValidationVoteSchema } from '../utils/socketValidation.js';
import { handleValidatedWord, handleWordBecameValid, handlePeerRejection, type PeerValidationResult } from './wordValidationHandler';
import { spamDetector, PenaltyTier, InvalidReason, type InvalidReasonValue } from '../modules/spamDetector.js';
import { acquireGracePeriodLock, releaseGracePeriodLock } from '../services/gracePeriodLock';

// Rate limit weights
const SUBMIT_WORD_WEIGHT = parseInt(process.env.RATE_WEIGHT_SUBMITWORD || '1');

// Types for payloads
interface SubmitWordPayload {
  word: string;
  comboType?: string | null;
}

interface SubmitWordVotePayload {
  word: string;
  voteType: 'valid' | 'invalid';
  gameCode?: string;
  submittedBy?: string;
  isBot?: boolean;
}

interface SubmitPeerValidationVotePayload {
  word: string;
  isValid: boolean;
  gameCode?: string;
}



/**
 * Handle spam detection after an invalid word submission
 * Records the invalid word and applies progressive penalties
 * @param socket - Socket.IO socket instance
 * @param gameCode - Game code
 * @param username - Player username
 * @param word - The invalid word
 * @param reason - Reason for invalidity
 * @param game - Game object (for score updates)
 */
function handleSpamDetection(socket: Socket, gameCode: string, username: string, word: string, reason: InvalidReasonValue, game: GameState): void {
  const result = spamDetector.recordInvalidWord(gameCode, username, word, reason);

  // Only emit events when tier changes or penalties apply
  switch (result.tier) {
    case PenaltyTier.WARNING:
      if (result.message === 'warning') {
        socket.emit('spamWarning', {
          invalidCount: result.invalidCount,
          message: 'slow_down_too_many_invalid_words',
          tier: 'warning'
        });
      }
      break;

    case PenaltyTier.PENALTY:
      if (result.penaltyApplied && result.penaltyApplied > 0) {
        // Apply point deduction
        const currentScore = game.playerScores?.[username] || 0;
        const newScore = Math.max(0, currentScore - result.penaltyApplied);
        updatePlayerScore(gameCode, username, newScore, false);

        socket.emit('spamPenalty', {
          invalidCount: result.invalidCount,
          pointsDeducted: result.penaltyApplied,
          totalPenaltyPoints: result.totalPenaltyPoints,
          newScore: newScore,
          tier: 'penalty'
        });

        logger.info('SPAM', `Deducted ${result.penaltyApplied} points from ${username} (new score: ${newScore})`);
      }
      break;

    case PenaltyTier.COOLDOWN:
      if (result.cooldownDuration && result.cooldownDuration > 0) {
        socket.emit('spamCooldown', {
          invalidCount: result.invalidCount,
          duration: result.cooldownDuration,
          tier: 'cooldown'
        });

        // Schedule cooldown end notification
        setTimeout(() => {
          socket.emit('spamCooldownEnd', {
            message: 'cooldown_ended_you_can_submit_words_again'
          });
        }, result.cooldownDuration);
      }
      break;
  }
}

/**
 * Register word-related socket event handlers
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerWordHandlers(io: Server, socket: Socket): void {

  // Handle word submission
  socket.on('submitWord', async (data: SubmitWordPayload) => {
    if (isSocketMigrating(socket)) return;

    if (!checkRateLimit(socket.id, SUBMIT_WORD_WEIGHT)) {
      socket.emit('rateLimited');
      return;
    }

    // Validate payload
    const validation = validatePayload(submitWordSchema, data);
    if (!validation.success) {
      emitError(socket, `Invalid request: ${validation.error}`);
      return;
    }

    let gracePeriodLockId: string | null = null;
    try {
      const { word } = validation.data as SubmitWordPayload;

      const gameCode = getGameBySocketId(socket.id);
      const username = getUsernameBySocketId(socket.id);

      // Check for spam cooldown
      if (gameCode && username && spamDetector.isOnCooldown(gameCode, username)) {
        const remainingMs = spamDetector.getRemainingCooldown(gameCode, username);
        socket.emit('wordBlockedByCooldown', {
          word: word,
          remainingMs: remainingMs
        });
        return;
      }

      if (!gameCode || !username) {
        emitError(socket, ErrorCodes.PLAYER_NOT_IN_GAME);
        return;
      }

      if (!word) {
        emitError(socket, ErrorCodes.VALIDATION_MISSING_FIELD, {
          message: 'Word is required',
          details: { field: 'word' }
        });
        return;
      }

      const game = getGame(gameCode);

      // Grace period: Allow word submissions for 1.5 seconds after game ends
      // This handles network latency where client submits before receiving endGame event
      const GRACE_PERIOD_MS = 1500;
      const isWithinGracePeriod = game?.gameEndedAt &&
        (Date.now() - game.gameEndedAt) < GRACE_PERIOD_MS &&
        game.gameState === 'finished';

      if (!game || (game.gameState !== 'in-progress' && !isWithinGracePeriod)) {
        // Log detailed state for debugging second-game-in-room issues
        logger.warn('WORD', `Word submission rejected - game state issue`, {
          gameCode,
          username,
          word,
          gameExists: !!game,
          gameState: game?.gameState || 'NO_GAME',
          gameEndedAt: game?.gameEndedAt,
          timeSinceEnd: game?.gameEndedAt ? Date.now() - game.gameEndedAt : null,
          socketId: socket.id
        });
        emitError(socket, ErrorCodes.GAME_NOT_IN_PROGRESS);
        return;
      }

      // Grace period lock: Prevent race conditions in multi-instance deployments
      // where multiple late word submissions could be processed in parallel
      if (isWithinGracePeriod) {
        gracePeriodLockId = await acquireGracePeriodLock(gameCode);
        if (!gracePeriodLockId) {
          // Another instance is processing a grace period word, skip
          logger.debug('WORD', `Grace period lock not acquired for ${gameCode}, skipping`);
          return;
        }
        logger.info('WORD', `Word accepted during grace period`, {
          gameCode,
          username,
          word,
          timeSinceEnd: game.gameEndedAt ? Date.now() - game.gameEndedAt : 0
        });
      }

      // Helper to release grace period lock on early returns
      const releaseGraceLockIfNeeded = async (): Promise<void> => {
        if (gracePeriodLockId) {
          await releaseGracePeriodLock(gameCode, gracePeriodLockId);
        }
      };

      markUserActivity(gameCode, username);

      const normalizedWord = word.toLowerCase().trim().substring(0, 50);

      // Check for profanity
      if (isProfane(normalizedWord)) {
        socket.emit('wordRejected', {
          word: normalizedWord,
          reason: 'inappropriate'
        });
        handleSpamDetection(socket, gameCode, username, normalizedWord, InvalidReason.PROFANITY, game);
        await releaseGraceLockIfNeeded();
        return;
      }

      // Validate minimum word length
      const minLength = game.minWordLength || 2;
      if (normalizedWord.length < minLength) {
        socket.emit('wordTooShort', {
          word: normalizedWord,
          minLength: minLength
        });
        handleSpamDetection(socket, gameCode, username, normalizedWord, InvalidReason.TOO_SHORT, game);
        await releaseGraceLockIfNeeded();
        return;
      }

      // Check if already found
      if (playerHasWord(gameCode, username, normalizedWord)) {
        socket.emit('wordAlreadyFound', { word: normalizedWord });
        // Note: Not counted as spam - could be UX issue where user didn't see feedback
        await releaseGraceLockIfNeeded();
        return;
      }

      // Validate word on board (skip if no grid - shouldn't happen in normal gameplay)
      if (!game.letterGrid) {
        logger.warn('WORD', 'No letter grid available for word validation', { gameCode });
        await releaseGraceLockIfNeeded();
        return;
      }
      const isOnBoard = await isWordOnBoardAsync(normalizedWord, game.letterGrid, game.letterPositions);
      if (!isOnBoard) {
        inc('wordNotOnBoard');
        incPerGame(gameCode, 'wordNotOnBoard');
        socket.emit('wordNotOnBoard', { word: normalizedWord });
        handleSpamDetection(socket, gameCode, username, normalizedWord, InvalidReason.NOT_ON_BOARD, game);
        // Record invalid word submission for admin review (non-blocking)
        if (isSupabaseConfigured()) {
          recordPlayerWrongWord(normalizedWord, game.language || 'en', 'not_on_board').catch(() => {});
        }
        await releaseGraceLockIfNeeded();
        return;
      }

      // Check if someone else already found this word (first-to-find scoring)
      const firstFinder = getFirstFinder(gameCode, normalizedWord, username);
      if (firstFinder) {
        // Someone else already found this word - they get the points
        socket.emit('wordAlreadyFoundByOther', {
          word: normalizedWord,
          foundBy: firstFinder.username,
          foundByAvatar: firstFinder.avatar || null,
        });
        // Reset combo since word was already found
        // Note: We don't count this as spam - it's valid gameplay
        await releaseGraceLockIfNeeded();
        return;
      }

      // Check dictionary and community validation
      const isInDictionary = isDictionaryWord(normalizedWord, game.language);
      const isCommunityValidated = isWordCommunityValid(normalizedWord, game.language);
      const hasPositiveScore = isWordValidForScoring(normalizedWord, game.language);
      const shouldAutoValidate = isInDictionary || isCommunityValidated || hasPositiveScore;

      const comboType = (validation.data as SubmitWordPayload).comboType ?? null;

      if (shouldAutoValidate) {
        handleValidatedWord(io, socket, game, gameCode, username, normalizedWord, isInDictionary === true, comboType);
      } else {
        // Word not in dictionary - reject immediately (no pending/AI validation)
        inc('wordNeedsValidation');
        incPerGame(gameCode, 'wordNeedsValidation');
        socket.emit('wordRejected', {
          word: normalizedWord,
          reason: 'Not in dictionary'
        });
        handleSpamDetection(socket, gameCode, username, normalizedWord, InvalidReason.REJECTED, game);
      }

      // Update leaderboard - reduced throttle for more responsive score updates
      // Using 200ms as a balance between responsiveness and network efficiency
      const lbThrottleMs = parseInt(process.env.LEADERBOARD_THROTTLE_MS || '200');
      getLeaderboardThrottled(gameCode, (leaderboard: LeaderboardPlayer[]) => {
        broadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
      }, lbThrottleMs);

      // Release grace period lock after successful word processing
      await releaseGraceLockIfNeeded();

    } catch (error: unknown) {
      const err = error as Error;
      const catchGameCode = getGameBySocketId(socket.id);
      const catchUsername = getUsernameBySocketId(socket.id);
      // Log detailed error context for debugging
      logger.error('SOCKET', 'Error in submitWord handler', {
        error: err.message,
        stack: err.stack,
        gameCode: catchGameCode,
        username: catchUsername,
        socketId: socket.id,
      });
      emitError(socket, ErrorCodes.WORD_PROCESSING_ERROR, {
        correlationId: `${catchGameCode}-${Date.now()}`,
      });
      // Also emit wordRejected so the player gets visual feedback (word tile clears)
      const submittedWord = (data as SubmitWordPayload)?.word?.toLowerCase?.()?.trim?.()?.substring(0, 50);
      if (submittedWord) {
        socket.emit('wordRejected', { word: submittedWord, reason: 'error' });
      }
      // Release grace period lock if acquired
      if (gracePeriodLockId) {
        const catchGameCode2 = getGameBySocketId(socket.id);
        if (catchGameCode2) {
          await releaseGracePeriodLock(catchGameCode2, gracePeriodLockId);
        }
      }
    }
  });

  // Handle word vote submission (community validation)
  socket.on('submitWordVote', async (data: SubmitWordVotePayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    // Validate payload
    const validation = validatePayload(submitWordVoteSchema, data);
    if (!validation.success) {
      socket.emit('voteRecorded', { word: data?.word, success: false, error: 'Invalid request' });
      return;
    }

    try {
      const { word, voteType, gameCode: providedGameCode } = validation.data as SubmitWordVotePayload;
      const gameCode = providedGameCode || getGameBySocketId(socket.id);
      const username = getUsernameBySocketId(socket.id);

      if (!gameCode) return;

      const game = getGame(gameCode);
      if (!game) return;
      if (!username) return;

      const userData = game.users?.[username];
      const userId = userData?.authUserId || null;
      const guestId = userData?.guestTokenHash || null;

      if (!userId && !guestId) {
        logger.debug('VOTE', `No voter identifier for ${username}`);
        return;
      }

      // Map 'valid'/'invalid' to 'like'/'dislike' for the community word system
      const mappedVoteType: 'like' | 'dislike' = voteType === 'valid' ? 'like' : 'dislike';

      const result = await recordVote({
        word,
        language: game.language || 'en',
        userId,
        guestId,
        gameCode,
        voteType: mappedVoteType,
        submitter: data.submittedBy || 'unknown',
        isBotWord: data.isBot === true
      });

      if (result.success) {
        updatePendingCache(word, game.language || 'en', mappedVoteType);
        socket.emit('voteRecorded', { word, success: true });
        logger.info('VOTE', `${username} voted ${voteType} on "${word}"`);

        if (result.isNowValid) {
          handleWordBecameValid(io, socket, game, gameCode, word, data.submittedBy);
        }
      } else {
        socket.emit('voteRecorded', { word, success: false, error: result.error });
      }
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('VOTE', `Error in submitWordVote handler: ${err.message}`, { stack: err.stack });
      socket.emit('voteRecorded', { word: data?.word, success: false, error: 'Vote failed' });
    }
  });

  // Handle peer validation vote for AI-approved words
  socket.on('submitPeerValidationVote', async (data: SubmitPeerValidationVotePayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    // Validate payload
    const validation = validatePayload(submitPeerValidationVoteSchema, data);
    if (!validation.success) {
      socket.emit('peerVoteRecorded', { word: data?.word, success: false, error: 'Invalid request' });
      return;
    }

    try {
      const { word, isValid, gameCode: providedGameCode } = validation.data as SubmitPeerValidationVotePayload;
      const gameCode = providedGameCode || getGameBySocketId(socket.id);
      const username = getUsernameBySocketId(socket.id);

      if (!gameCode) return;
      if (!username) return;

      const game = getGame(gameCode);
      if (!game) return;

      const result: PeerValidationResult = recordPeerValidationVote(gameCode, username, isValid);

      if (result.success) {
        socket.emit('peerVoteRecorded', {
          word,
          success: true,
          totalVotes: result.totalVotes,
          invalidVotes: result.invalidVotes
        });
        logger.info('PEER_VALIDATION', `${username} voted ${isValid ? 'valid' : 'invalid'} on "${word}"`);

        if (result.shouldReject) {
          handlePeerRejection(io, gameCode, game, result);
        }
      } else {
        socket.emit('peerVoteRecorded', { word, success: false, error: result.error });
      }
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('PEER_VALIDATION', `Error in submitPeerValidationVote: ${err.message}`, { stack: err.stack });
      socket.emit('peerVoteRecorded', { word: data?.word, success: false, error: 'Vote failed' });
    }
  });

}

// Helper functions (handleValidatedWord, handleWordBecameValid, handlePeerRejection)
// are in ./wordValidationHandler.ts

export { registerWordHandlers };
