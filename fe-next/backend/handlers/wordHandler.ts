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
  addPlayerWord as addPlayerWordToGame,
} from '../modules/gameStateManager.js';

import { volatileBroadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { isWordOnBoardAsync } from '../modules/wordValidatorPool.js';
import { isProfane } from '../utils/profanityFilter.js';
import { isDictionaryWord, isValidWordCached } from '../dictionary.js';
import { recordVote, updatePendingCache, isWordCommunityValid, isWordValidForScoring } from '../modules/communityWordManager.js';
import { emitError, ErrorCodes } from '../utils/errorHandler.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { checkSocketRateLimit } from '../middleware/rateLimiterRedis.js';
import { inc, incPerGame } from '../utils/metrics.js';
import logger from '../utils/logger.js';
import timerManager from '../utils/timerManager.js';
import { isSocketMigrating } from './shared';
import { validatePayload, submitWordSchema, submitWordVoteSchema, submitPeerValidationVoteSchema } from '../utils/socketValidation.js';
import { handleValidatedWord, handleWordBecameValid, handlePeerRejection, type PeerValidationResult } from './wordValidationHandler';
import { ensurePlayerState } from './playerDataInit';
import { spamDetector, PenaltyTier, InvalidReason, type InvalidReasonValue } from '../modules/spamDetector.js';
import { acquireGracePeriodLock, releaseGracePeriodLock } from '../services/gracePeriodLock';
import { calculateWordScore } from '../modules/scoringEngine.js';
import { isWordShapeWeird } from '@/shared/utils/wordShapeFilter';
import type { Language } from '@/shared/types';

// Rate limit weights
const SUBMIT_WORD_WEIGHT = parseInt(process.env.RATE_WEIGHT_SUBMITWORD || '3');

// Types for payloads
interface SubmitWordPayload {
  word: string;
  comboType?: string | null;
  inputMethod?: 'kb' | 'drag';
}

interface SubmitWordVotePayload {
  word: string;
  voteType: 'like' | 'dislike';
  gameCode?: string;
  submittedBy?: string;
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
        // Atomic penalty + clamp: read current score, compute floored result, write absolute value.
        // This avoids the race where a concurrent valid word increments the score between the delta
        // write and a separate clamp, causing those points to be silently discarded.
        const currentScore = game.playerScores?.[username] || 0;
        const newScore = Math.max(0, currentScore - result.penaltyApplied);
        updatePlayerScore(gameCode, username, newScore);

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

        // Schedule cooldown end notification (tracked by timerManager for cleanup on game delete)
        const cooldownKey = `spam:cooldown:${gameCode}:${username}`;
        timerManager.setTimeout(cooldownKey, () => {
          if (socket.connected) {
            socket.emit('spamCooldownEnd', {
              message: 'cooldown_ended_you_can_submit_words_again'
            });
          }
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

    // Per-action rate limit for word submissions (5/s)
    const rl = await checkSocketRateLimit(socket.id, 'wordSubmit');
    if (!rl.allowed) {
      logger.warn('RATE_LIMIT', 'Rate limited', { socketId: socket.id, action: 'wordSubmit' });
      socket.emit('rate-limited', { action: 'wordSubmit', retryAfterMs: rl.retryAfterMs });
      return;
    }

    // Validate payload
    const validation = validatePayload(submitWordSchema, data);
    if (!validation.success) {
      emitError(socket, `Invalid request: ${validation.error}`);
      return;
    }

    let gracePeriodLockId: string | null = null;
    let outerGameCode: string | null = null;
    try {
      const { word } = validation.data as SubmitWordPayload;

      const gameCode = getGameBySocketId(socket.id);
      outerGameCode = gameCode;
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
        logger.debug('WORD', `Word submission rejected - game state issue`, {
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
        gracePeriodLockId = await acquireGracePeriodLock(gameCode, username);
        if (!gracePeriodLockId) {
          // Another instance is processing a grace period word for this player, skip
          logger.debug('WORD', `Grace period lock not acquired for ${gameCode}:${username}, skipping`);
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
          await releaseGracePeriodLock(gameCode, gracePeriodLockId, username);
        }
      };

      // Blast scoring reads the server-side combo (game.playerCombos), while the
      // client combo HUD resets on every miss. Keep them in parity by breaking
      // the streak server-side on the same misses the client resets on — so the
      // "xN" badge the player sees matches the combo the server actually scores
      // with. Blast-scoped: classic combo semantics are intentionally unchanged.
      const breakBlastComboOnMiss = (): void => {
        if (game.gameMode !== 'blast') return;
        if (!game.playerCombos) game.playerCombos = {};
        game.playerCombos[username] = 0;
      };

      markUserActivity(gameCode, username);

      const normalizedWord = word.toLowerCase().trim().substring(0, 50);

      // Check for profanity
      if (isProfane(normalizedWord)) {
        socket.emit('wordRejected', {
          word: normalizedWord,
          reason: 'inappropriate'
        });
        breakBlastComboOnMiss();
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
        breakBlastComboOnMiss();
        handleSpamDetection(socket, gameCode, username, normalizedWord, InvalidReason.TOO_SHORT, game);
        await releaseGraceLockIfNeeded();
        return;
      }

      // Shape filter — reject garbage/abbrev/repeat-spam before dictionary lookup or queue logging
      const shape = isWordShapeWeird(normalizedWord, (game.language || 'en') as Language);
      if (shape.weird) {
        socket.emit('wordRejected', { word: normalizedWord, reason: 'invalid_shape', detail: shape.reason });
        breakBlastComboOnMiss();
        handleSpamDetection(socket, gameCode, username, normalizedWord, InvalidReason.INVALID_SHAPE, game);
        await releaseGraceLockIfNeeded();
        return;
      }

      // Check if already found
      if (playerHasWord(gameCode, username, normalizedWord)) {
        logger.debug('WORD', `Word already found`, {
          gameCode, username, word: normalizedWord,
          gameState: game.gameState,
          playerWordsCount: game.playerWords?.[username]?.length ?? -1,
          playerWords: game.playerWords?.[username]?.slice(0, 10),
        });
        socket.emit('wordAlreadyFound', { word: normalizedWord });
        breakBlastComboOnMiss();
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
        breakBlastComboOnMiss();
        handleSpamDetection(socket, gameCode, username, normalizedWord, InvalidReason.NOT_ON_BOARD, game);
        await releaseGraceLockIfNeeded();
        return;
      }

      // Check if someone else already found this word (first-to-find scoring)
      const firstFinder = getFirstFinder(gameCode, normalizedWord, username);
      if (firstFinder) {
        // Catch-up mechanic: give 50% partial credit for confirmation finds
        // This rewards word knowledge without devaluing first-find
        const inputMethod = (validation.data as SubmitWordPayload).inputMethod ?? 'drag';
        const baseScore = calculateWordScore(normalizedWord, 0, 1, 1, { inputMethod });
        const confirmationScore = Math.floor(baseScore * 0.5);

        if (confirmationScore > 0) {
          updatePlayerScore(gameCode, username, confirmationScore, true);
          addPlayerWordToGame(gameCode, username, normalizedWord, {
            score: confirmationScore,
            validated: true,
            autoValidated: true,
          });
        }

        socket.emit('wordAlreadyFoundByOther', {
          word: normalizedWord,
          foundBy: firstFinder.username,
          foundByAvatar: firstFinder.avatar || null,
          confirmationScore,
        });
        // Increment combo — player found a valid word, just not first
        ensurePlayerState(game, username);
        game.playerCombos[username] = (game.playerCombos[username] || 0) + 1;
        await releaseGraceLockIfNeeded();
        return;
      }

      // Check dictionary and community validation (Redis cache → in-memory fallback)
      const lang = game.language || 'en';
      let isInDictionary: boolean | null;
      try {
        isInDictionary = await isValidWordCached(normalizedWord, lang);
      } catch {
        // Fallback to in-memory dictionary check if cache layer fails
        isInDictionary = isDictionaryWord(normalizedWord, lang);
      }
      const isCommunityValidated = isWordCommunityValid(normalizedWord, lang);
      const hasPositiveScore = isWordValidForScoring(normalizedWord, lang);
      const shouldAutoValidate = isInDictionary || isCommunityValidated || hasPositiveScore;

      const comboType = (validation.data as SubmitWordPayload).comboType ?? null;
      const inputMethod = (validation.data as SubmitWordPayload).inputMethod ?? 'drag';

      if (shouldAutoValidate) {
        handleValidatedWord(io, socket, game, gameCode, username, normalizedWord, isInDictionary === true, comboType, inputMethod);
      } else {
        // Word not in dictionary - reject immediately (no pending/AI validation)
        inc('wordNeedsValidation');
        incPerGame(gameCode, 'wordNeedsValidation');
        socket.emit('wordRejected', {
          word: normalizedWord,
          reason: 'not_in_dictionary'
        });
        breakBlastComboOnMiss();
        handleSpamDetection(socket, gameCode, username, normalizedWord, InvalidReason.REJECTED, game);
      }

      // Leading-edge broadcast fires instantly after a quiet window; 500ms cap
      // only damps sustained bursts (3 concurrent games could fire 15 sorts/sec at 200ms).
      const lbThrottleMs = parseInt(process.env.LEADERBOARD_THROTTLE_MS || '500');
      getLeaderboardThrottled(gameCode, (leaderboard: LeaderboardPlayer[]) => {
        volatileBroadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
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
      // Release grace period lock if acquired — use outerGameCode as fallback
      // since socket may have disconnected and getGameBySocketId returns null
      if (gracePeriodLockId) {
        const catchGameCode2 = getGameBySocketId(socket.id) || outerGameCode;
        const catchUsername2 = getUsernameBySocketId(socket.id);
        if (catchGameCode2) {
          await releaseGracePeriodLock(catchGameCode2, gracePeriodLockId, catchUsername2 || undefined);
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

      if (!gameCode) {
        socket.emit('voteRecorded', { word, success: false, error: 'Not in a game' });
        return;
      }

      const game = getGame(gameCode);
      if (!game) {
        socket.emit('voteRecorded', { word, success: false, error: 'Game not found' });
        return;
      }
      if (!username) {
        socket.emit('voteRecorded', { word, success: false, error: 'Player not found' });
        return;
      }

      const userData = game.users?.[username];
      const userId = userData?.authUserId || null;
      const guestId = userData?.guestTokenHash || null;

      if (!userId && !guestId) {
        logger.debug('VOTE', `No voter identifier for ${username}`);
        socket.emit('voteRecorded', { word, success: false, error: 'No voter identity' });
        return;
      }

      const result = await recordVote({
        word,
        language: game.language || 'en',
        userId,
        guestId,
        gameCode,
        voteType,
        submitter: data.submittedBy || 'unknown',
        isBotWord: game.users?.[data.submittedBy || '']?.isBot === true
      });

      if (result.success) {
        updatePendingCache(word, game.language || 'en', voteType);
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

      if (!gameCode) {
        socket.emit('peerVoteRecorded', { word, success: false, error: 'Not in a game' });
        return;
      }
      if (!username) {
        socket.emit('peerVoteRecorded', { word, success: false, error: 'Player not found' });
        return;
      }

      const game = getGame(gameCode);
      if (!game) {
        socket.emit('peerVoteRecorded', { word, success: false, error: 'Game not found' });
        return;
      }

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
