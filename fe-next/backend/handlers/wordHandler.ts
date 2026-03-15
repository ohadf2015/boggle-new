/**
 * Word Handler
 * Handles word submission, validation, and voting events
 */

import type { Server, Socket } from 'socket.io';
import type { WordDetail } from '@/shared/types';
import type { GameState } from '../modules/gameState/types.js';
import type { LeaderboardPlayer } from '../modules/scoreManager.js';

import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  addPlayerWord,
  playerHasWord,
  updatePlayerScore,
  getLeaderboard,
  getLeaderboardThrottled,
  markUserActivity,
  recordPeerValidationVote,
  removePeerRejectedWordScore,
  getFirstFinder,
  recordFirstFinder,
} from '../modules/gameStateManager.js';

import { broadcastToRoom, getGameRoom, getSocketById, safeEmit } from '../utils/socketHelpers.js';
import { isWordOnBoardAsync } from '../modules/wordValidatorPool.js';
import { isProfane } from '../utils/profanityFilter.js';
import { calculateWordScore } from '../modules/scoringEngine.js';
import { checkAndAwardAchievements } from '../modules/achievementManager.js';
import { isDictionaryWord } from '../dictionary.js';
import { isSupabaseConfigured, savePlayerWord, recordPlayerWrongWord } from '../modules/supabaseServer.js';
import { recordVote, updatePendingCache, isWordCommunityValid, isWordValidForScoring } from '../modules/communityWordManager.js';
import { emitError, ErrorCodes } from '../utils/errorHandler.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { inc, incPerGame } from '../utils/metrics.js';
import { addWordToBlacklist } from '../modules/botManager.js';
import logger from '../utils/logger.js';
import { isSocketMigrating } from './shared';
import { processLongWordEngagement } from './engagementHandler';
import { validatePayload, submitWordSchema, submitWordVoteSchema, submitPeerValidationVoteSchema } from '../utils/socketValidation.js';
import { spamDetector, PenaltyTier, InvalidReason, type InvalidReasonValue } from '../modules/spamDetector.js';
import { acquireGracePeriodLock, releaseGracePeriodLock } from '../services/gracePeriodLock';
import { calculateBlastTileBonus, getTilesOnPath, recordBlastMove } from '../modules/blastModeManager.js';
import { restoreLife, getLifeBonus, computeDiscoveryClues } from '../modules/wordHuntManager.js';

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

interface PeerValidationResult {
  success: boolean;
  error?: string;
  totalVotes?: number;
  invalidVotes?: number;
  validVotes?: number;
  shouldReject?: boolean;
  word?: string;
  submitter?: string;
  isBot?: boolean;
}

interface Achievement {
  key: string;
  icon: string;
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
      let gracePeriodLockId: string | null = null;
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
      // Note: gracePeriodLockId is out of scope in catch block, but the lock has a short TTL (2s)
      // so it will auto-expire if we can't release it here. This is acceptable for error cases.
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
  });

  // Handle validate words (legacy, for host validation)
  socket.on('validateWords', async (_data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }
    // This handler is kept for backwards compatibility but validation
    // is now automatic. Just acknowledge receipt.
    socket.emit('validationComplete', { success: true });
  });
}

// Helper functions

function handleValidatedWord(io: Server, socket: Socket, game: GameState, gameCode: string, username: string, normalizedWord: string, isInDictionary: boolean, comboType?: string | null): void {
  // Derive combo and fire round from server state (never trust client)
  const safeComboLevel = game.playerCombos?.[username] || 0;
  const fireRoundActive = game.fireRoundActive === true;
  const fireRoundMultiplier = fireRoundActive ? 2 : 1;
  const baseScore = normalizedWord.length - 1;
  const wordScore = calculateWordScore(normalizedWord, safeComboLevel, fireRoundMultiplier);
  // Calculate combo bonus without fire round multiplier for display purposes
  const scoreWithoutMultiplier = calculateWordScore(normalizedWord, safeComboLevel, 1);
  const comboBonus = scoreWithoutMultiplier - baseScore;
  // Fire round bonus is the additional points from the 2x multiplier
  const fireRoundBonus = fireRoundActive ? scoreWithoutMultiplier : 0;

  // Increment server-side combo on each accepted word
  if (!game.playerCombos) game.playerCombos = {};
  game.playerCombos[username] = safeComboLevel + 1;

  // Record this player as the first finder of this word
  const userData = game.users?.[username];
  recordFirstFinder(gameCode, normalizedWord, username, userData?.avatar ?? undefined);

  // Check if word is from lesson vocabulary (classroom games)
  const fromLesson = game.lessonVocabulary?.has(normalizedWord.toUpperCase()) || false;

  // Calculate blast mode tile bonus BEFORE storing word details so the stored
  // score includes tile bonuses (used by scoringEngine for final results).
  let blastTileBonus = 0;
  let blastTilesCleared: string[] = [];
  let blastMoveResult: { movesUsed: number; bonusMove: boolean } | null = null;

  if (game.gameMode === 'blast' && game.blastModeState) {
    try {
      const blastState = game.blastModeState;
      const tilesOnPath = getTilesOnPath(normalizedWord, game.letterPositions || new Map(), blastState.overlay, blastState.overlayMap);
      blastTileBonus = calculateBlastTileBonus(tilesOnPath);
      blastTilesCleared = tilesOnPath;
      const gemCount = tilesOnPath.filter(t => t === 'gem').length;
      blastMoveResult = recordBlastMove(blastState, username, safeComboLevel, normalizedWord, tilesOnPath.length, gemCount);
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('BLAST', `Blast bonus calculation error: ${error.message}`);
      blastTileBonus = 0;
    }
  }

  addPlayerWord(gameCode, username, normalizedWord, {
    autoValidated: true,
    score: wordScore + blastTileBonus,
    comboBonus: comboBonus,
    comboLevel: safeComboLevel,
    fireRoundMultiplier: fireRoundMultiplier,
    fireRoundBonus: fireRoundBonus,
    fromLesson: fromLesson
  });

  // Save to database if dictionary word
  if (isInDictionary && isSupabaseConfigured()) {
    savePlayerWord({
      word: normalizedWord,
      language: game.language || 'en',
      gameCode,
      playerId: userData?.authUserId || null
    }).catch((err: Error) => {
      logger.debug('PLAYER_WORDS', `Failed to save player word: ${err.message}`);
    });
  }

  // Single atomic score update: word score + blast tile bonus (if any)
  updatePlayerScore(gameCode, username, wordScore + blastTileBonus, true);

  inc('wordAccepted');
  incPerGame(gameCode, 'wordAccepted');

  socket.emit('wordAccepted', {
    word: normalizedWord,
    score: wordScore,
    baseScore: baseScore,
    comboBonus: comboBonus,
    comboLevel: safeComboLevel,
    fireRoundActive: fireRoundActive,
    fireRoundMultiplier: fireRoundMultiplier,
    fireRoundBonus: fireRoundBonus,
    autoValidated: true,
    fromLesson: fromLesson,
    // Merged blast data (Fix 2): includes tile bonus, moves, combo info in single emit
    ...(blastMoveResult ? {
      blast: {
        tileBonus: blastTileBonus,
        tilesCleared: blastTilesCleared,
        movesUsed: blastMoveResult.movesUsed,
        bonusMove: blastMoveResult.bonusMove,
        comboType: comboType ?? null,
      },
    } : {}),
  });

  // Restore life in word-hunt mode when a word is accepted
  if (game.gameMode === 'word-hunt' && game.wordHuntState) {
    try {
      // wordHuntManager imported at top level
      const huntState = game.wordHuntState;
      const lifeBonus = getLifeBonus(normalizedWord.length);
      restoreLife(huntState, username, lifeBonus);
      // Broadcast updated lives immediately so clients don't wait for next timer tick
      broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntLifeUpdate', {
        playerLives: huntState.playerLives,
        eliminatedPlayers: huntState.eliminatedPlayers,
      });
      // Mark last broadcast time so gameTimer skips the redundant tick broadcast
      huntState.lastLifeUpdateAt = Date.now();

      // Compute discovery clues — sent only to the player who found the word (competitive)
      const gameStartedAt = game.gameStartedAt || 0;
      const elapsed = Date.now() - gameStartedAt;
      const CLUE_DELAY = 15_000; // 15s before clues start
      const CLUE_THROTTLE = 5_000; // 5s between clue broadcasts per player

      if (elapsed >= CLUE_DELAY) {
        const clues = computeDiscoveryClues(huntState.targetWord, normalizedWord);
        if (clues.greenPositions.length > 0 || clues.knownLetters.length > 0) {
          // Per-player throttle: don't flood clues
          if (!huntState.lastClueAt) huntState.lastClueAt = {};
          const lastClue = huntState.lastClueAt[username] || 0;
          if (Date.now() - lastClue >= CLUE_THROTTLE) {
            huntState.lastClueAt[username] = Date.now();
            huntState.discoveryWordCount = (huntState.discoveryWordCount || 0) + 1;
            // Send only to the submitting player, not the whole room
            socket.emit('wordHuntDiscoveryClues', {
              word: normalizedWord,
              greenPositions: clues.greenPositions,
              knownLetters: clues.knownLetters,
            });
          }
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('WORD_HUNT', `Life restoration error: ${error.message}`);
    }
  }

  // Broadcast playerFoundWord to room for TV broadcast mode
  // Includes combo level and word for exciting notifications
  const totalScore = (game.playerScores?.[username] || 0) + wordScore;
  const playerWordCount = (game.playerWords?.[username]?.length || 0) + 1;
  broadcastToRoom(io, getGameRoom(gameCode), 'playerFoundWord', {
    username: username,
    word: normalizedWord,
    wordCount: playerWordCount,
    score: totalScore,
    comboLevel: safeComboLevel,
    // Merged combo sync (Fix 2): combo type embedded in playerFoundWord instead of separate event
    ...(comboType ? { comboSync: { comboType, username } } : {}),
  });

  // Check achievements
  const achievements: Achievement[] = checkAndAwardAchievements(gameCode, username, normalizedWord);
  if (achievements.length > 0) {
    logger.info('ACHIEVEMENT', `Emitting liveAchievementUnlocked to ${username}: ${achievements.map(a => a.key).join(', ')} (gameState: ${game.gameState})`);
    socket.emit('liveAchievementUnlocked', { achievements });
  }

  // Process long word engagement (8+ letters triggers mystery reward chance)
  if (normalizedWord.length >= 8) {
    if (userData?.authUserId) {
      processLongWordEngagement(socket, userData.authUserId, normalizedWord, gameCode)
        .catch((err: Error) => logger.debug('ENGAGEMENT', `Long word engagement error: ${err.message}`));
    }
  }
}

function handleWordBecameValid(io: Server, _socket: Socket, game: GameState, gameCode: string, word: string, submitter?: string): void {
  if (submitter && game.playerWordDetails?.[submitter]) {
    const wordDetails = game.playerWordDetails[submitter] as WordDetail[];
    const wordDetail = wordDetails.find((wd: WordDetail) => wd.word === word);
    if (wordDetail && wordDetail.validated !== true) {
      const potentialScore = wordDetail.score || calculateWordScore(word, wordDetail.comboLevel || 0);

      wordDetail.validated = true;
      wordDetail.validatedByCommunity = true;

      const currentScore = game.playerScores?.[submitter] || 0;
      const newScore = currentScore + potentialScore;
      updatePlayerScore(gameCode, submitter, newScore, false);

      logger.info('VOTE', `Word "${word}" validated! Awarding ${potentialScore} to ${submitter}`);

      const submitterData = game.users?.[submitter];
      if (submitterData?.socketId) {
        const submitterSocket = getSocketById(io, submitterData.socketId);
        if (submitterSocket) {
          safeEmit(submitterSocket, 'wordValidatedByVotes', {
            word,
            score: potentialScore,
            newTotalScore: newScore
          });
        }
      }
    }
  }

  broadcastToRoom(io, getGameRoom(gameCode), 'wordBecameValid', {
    word,
    language: game.language || 'en'
  });
}

function handlePeerRejection(io: Server, gameCode: string, game: GameState, result: PeerValidationResult): void {
  // Guard against missing word or submitter
  if (!result.word || !result.submitter) {
    logger.warn('PEER_VALIDATION', 'Missing word or submitter in peer rejection result');
    return;
  }

  // Type assertion after null checks
  const word: string = result.word;
  const submitter: string = result.submitter;

  const scoreRemoved = removePeerRejectedWordScore(gameCode, word, submitter);

  logger.info('PEER_VALIDATION', `Word "${word}" rejected. Removed ${scoreRemoved} from ${submitter}`);

  // Record rejected word for admin review (if not a bot word)
  if (!result.isBot && isSupabaseConfigured()) {
    recordPlayerWrongWord(word, game.language || 'en', 'peer_rejected').catch(() => {});
  }

  // Blacklist bot words
  if (result.isBot && game.language) {
    addWordToBlacklist(word, game.language)
      .then((success: boolean) => {
        if (success) {
          logger.info('BOT', `Bot word "${word}" blacklisted for ${game.language}`);
        }
      })
      .catch((err: Error) => logger.warn('BOT', `Failed to blacklist: ${err.message}`));
  }

  broadcastToRoom(io, getGameRoom(gameCode), 'peerValidationResult', {
    word,
    submitter,
    rejected: true,
    invalidVotes: result.invalidVotes,
    validVotes: result.validVotes,
    scoreRemoved
  });

  const leaderboard: LeaderboardPlayer[] = getLeaderboard(gameCode);
  broadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
}

export { registerWordHandlers };
