/**
 * Word Handler
 * Handles word submission, validation, and voting events
 */

import type { Server, Socket } from 'socket.io';
import type { Game, LeaderboardEntry, WordDetail, Language, Avatar } from '@/shared/types';

const {
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
  trackAiApprovedWord,
  getFirstFinder,
  recordFirstFinder,
} = require('../modules/gameStateManager');

const { broadcastToRoom, getGameRoom, getSocketById, safeEmit } = require('../utils/socketHelpers');
const { isWordOnBoardAsync } = require('../modules/wordValidatorPool');
const { isProfane } = require('../utils/profanityFilter');
const { calculateWordScore } = require('../modules/scoringEngine');
const { checkAndAwardAchievements, ACHIEVEMENT_ICONS } = require('../modules/achievementManager');
const { isDictionaryWord } = require('../dictionary');
const { isSupabaseConfigured, savePlayerWord, recordPlayerWrongWord } = require('../modules/supabaseServer');
const { recordVote, updatePendingCache, isWordCommunityValid, isWordValidForScoring } = require('../modules/communityWordManager');
const { emitError, ErrorMessages, ErrorCodes } = require('../utils/errorHandler');
const { checkRateLimit } = require('../utils/rateLimiter');
const { inc, incPerGame } = require('../utils/metrics');
const botManager = require('../modules/botManager');
const logger = require('../utils/logger');
const { isSocketMigrating } = require('./shared');
const { processLongWordEngagement } = require('./engagementHandler');
const { validatePayload, submitWordSchema, submitWordVoteSchema, submitPeerValidationVoteSchema } = require('../utils/socketValidation');
const { spamDetector, PenaltyTier, InvalidReason } = require('../modules/spamDetector');

// Rate limit weights
const SUBMIT_WORD_WEIGHT = parseInt(process.env.RATE_WEIGHT_SUBMITWORD || '1');

// Types for payloads
interface SubmitWordPayload {
  word: string;
  comboLevel?: number;
  fireRoundActive?: boolean;
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

interface SpamResult {
  tier: string;
  message?: string;
  penaltyApplied?: number;
  invalidCount: number;
  totalPenaltyPoints?: number;
  cooldownDuration?: number;
}

interface VoteResult {
  success: boolean;
  error?: string;
  isNowValid?: boolean;
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

interface GameUserData {
  socketId?: string;
  authUserId?: string | null;
  avatar?: Avatar;
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
function handleSpamDetection(socket: Socket, gameCode: string, username: string, word: string, reason: string, game: Game): void {
  const result: SpamResult = spamDetector.recordInvalidWord(gameCode, username, word, reason);

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
      const { word, comboLevel = 0, fireRoundActive = false } = validation.data as SubmitWordPayload;

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

      // Log if accepted during grace period
      if (isWithinGracePeriod) {
        logger.info('WORD', `Word accepted during grace period`, {
          gameCode,
          username,
          word,
          timeSinceEnd: Date.now() - game.gameEndedAt
        });
      }

      markUserActivity(gameCode, username);

      const normalizedWord = word.toLowerCase().trim().substring(0, 50);

      // Check for profanity
      if (isProfane(normalizedWord)) {
        socket.emit('wordRejected', {
          word: normalizedWord,
          reason: 'inappropriate'
        });
        handleSpamDetection(socket, gameCode, username, normalizedWord, InvalidReason.PROFANITY, game);
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
        return;
      }

      // Check if already found
      if (playerHasWord(gameCode, username, normalizedWord)) {
        socket.emit('wordAlreadyFound', { word: normalizedWord });
        // Note: Not counted as spam - could be UX issue where user didn't see feedback
        return;
      }

      // Validate word on board
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
        return;
      }

      // Check dictionary and community validation
      const isInDictionary = isDictionaryWord(normalizedWord, game.language);
      const isCommunityValidated = isWordCommunityValid(normalizedWord, game.language);
      const hasPositiveScore = isWordValidForScoring(normalizedWord, game.language);
      const shouldAutoValidate = isInDictionary || isCommunityValidated || hasPositiveScore;

      if (shouldAutoValidate) {
        handleValidatedWord(io, socket, game, gameCode, username, normalizedWord, comboLevel, isInDictionary, fireRoundActive);
      } else {
        handlePendingWord(socket, game, gameCode, username, normalizedWord, comboLevel, fireRoundActive);
      }

      // Update leaderboard - reduced throttle for more responsive score updates
      // Using 200ms as a balance between responsiveness and network efficiency
      const lbThrottleMs = parseInt(process.env.LEADERBOARD_THROTTLE_MS || '200');
      getLeaderboardThrottled(gameCode, (leaderboard: LeaderboardEntry[]) => {
        broadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
      }, lbThrottleMs);

    } catch (error: unknown) {
      const err = error as Error;
      const gameCode = getGameBySocketId(socket.id);
      const username = getUsernameBySocketId(socket.id);
      // Log detailed error context for debugging
      logger.error('SOCKET', 'Error in submitWord handler', {
        error: err.message,
        stack: err.stack,
        gameCode,
        username,
        socketId: socket.id,
      });
      emitError(socket, ErrorCodes.WORD_PROCESSING_ERROR, {
        correlationId: `${gameCode}-${Date.now()}`,
      });
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

    const userData: GameUserData | undefined = game.users?.[username];
    const userId = userData?.authUserId || null;
    const guestId = (game.users?.[username] as GameUserData & { guestTokenHash?: string })?.guestTokenHash || null;

    if (!userId && !guestId) {
      logger.debug('VOTE', `No voter identifier for ${username}`);
      return;
    }

    const result: VoteResult = await recordVote({
      word,
      language: game.language || 'en',
      userId,
      guestId,
      gameCode,
      voteType,
      submitter: data.submittedBy || 'unknown',
      isBotWord: data.isBot === true
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
  socket.on('validateWords', async (data: unknown) => {
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

function handleValidatedWord(io: Server, socket: Socket, game: Game, gameCode: string, username: string, normalizedWord: string, comboLevel: number, isInDictionary: boolean, fireRoundActive: boolean = false): void {
  const safeComboLevel = Math.max(0, Math.min(10, parseInt(String(comboLevel), 10) || 0));
  const fireRoundMultiplier = fireRoundActive ? 2 : 1;
  const baseScore = normalizedWord.length - 1;
  const wordScore = calculateWordScore(normalizedWord, safeComboLevel, fireRoundMultiplier);
  // Calculate combo bonus without fire round multiplier for display purposes
  const scoreWithoutMultiplier = calculateWordScore(normalizedWord, safeComboLevel, 1);
  const comboBonus = scoreWithoutMultiplier - baseScore;
  // Fire round bonus is the additional points from the 2x multiplier
  const fireRoundBonus = fireRoundActive ? scoreWithoutMultiplier : 0;

  if (!game.playerCombos) game.playerCombos = {};
  game.playerCombos[username] = safeComboLevel;

  // Record this player as the first finder of this word
  const userData = game.users?.[username];
  recordFirstFinder(gameCode, normalizedWord, username, userData?.avatar);

  addPlayerWord(gameCode, username, normalizedWord, {
    autoValidated: true,
    score: wordScore,
    comboBonus: comboBonus,
    comboLevel: safeComboLevel,
    fireRoundMultiplier: fireRoundMultiplier,
    fireRoundBonus: fireRoundBonus
  });

  // Save to database if dictionary word
  if (isInDictionary && isSupabaseConfigured()) {
    const userData: GameUserData | undefined = game.users?.[username];
    savePlayerWord({
      word: normalizedWord,
      language: game.language || 'en',
      gameCode,
      playerId: userData?.authUserId || null
    }).catch((err: Error) => {
      logger.debug('PLAYER_WORDS', `Failed to save player word: ${err.message}`);
    });
  }

  updatePlayerScore(gameCode, username, wordScore, true);

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
    autoValidated: true
  });

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
  });

  // Check achievements
  const achievements: Achievement[] = checkAndAwardAchievements(gameCode, username, normalizedWord);
  if (achievements.length > 0) {
    logger.info('ACHIEVEMENT', `Emitting liveAchievementUnlocked to ${username}: ${achievements.map(a => a.key).join(', ')} (gameState: ${game.gameState})`);
    socket.emit('liveAchievementUnlocked', { achievements });
  }

  // Process long word engagement (8+ letters triggers mystery reward chance)
  if (normalizedWord.length >= 8) {
    const userData: GameUserData | undefined = game.users?.[username];
    if (userData?.authUserId) {
      processLongWordEngagement(socket, userData.authUserId, normalizedWord, gameCode)
        .catch((err: Error) => logger.debug('ENGAGEMENT', `Long word engagement error: ${err.message}`));
    }
  }
}

function handlePendingWord(socket: Socket, game: Game, gameCode: string, username: string, normalizedWord: string, comboLevel: number, fireRoundActive: boolean = false): void {
  const safeComboLevel = Math.max(0, Math.min(10, parseInt(String(comboLevel), 10) || 0));
  const fireRoundMultiplier = fireRoundActive ? 2 : 1;
  const baseScore = normalizedWord.length - 1;
  // Calculate potential score with fire round multiplier
  const potentialScore = calculateWordScore(normalizedWord, safeComboLevel, fireRoundMultiplier);
  const scoreWithoutMultiplier = calculateWordScore(normalizedWord, safeComboLevel, 1);
  const comboBonus = scoreWithoutMultiplier - baseScore;
  const fireRoundBonus = fireRoundActive ? scoreWithoutMultiplier : 0;

  if (!game.playerCombos) game.playerCombos = {};
  game.playerCombos[username] = safeComboLevel;

  // Record this player as the first finder of this word (even for pending words)
  const userData = game.users?.[username];
  recordFirstFinder(gameCode, normalizedWord, username, userData?.avatar);

  addPlayerWord(gameCode, username, normalizedWord, {
    autoValidated: false,
    score: 0,
    potentialScore: potentialScore,
    comboBonus: comboBonus,
    comboLevel: safeComboLevel,
    fireRoundMultiplier: fireRoundMultiplier,
    fireRoundBonus: fireRoundBonus
  });

  inc('wordNeedsValidation');
  incPerGame(gameCode, 'wordNeedsValidation');

  socket.emit('wordNeedsValidation', {
    word: normalizedWord,
    message: 'Word will be validated at game end'
  });
}

function handleWordBecameValid(io: Server, socket: Socket, game: Game, gameCode: string, word: string, submitter?: string): void {
  if (submitter && game.playerWordDetails?.[submitter]) {
    const wordDetail = game.playerWordDetails[submitter].find((wd: WordDetail) => wd.word === word);
    if (wordDetail && wordDetail.validated !== true) {
      const potentialScore = wordDetail.score || calculateWordScore(word, wordDetail.comboLevel || 0);

      wordDetail.validated = true;
      wordDetail.validatedByCommunity = true;

      const currentScore = game.playerScores?.[submitter] || 0;
      const newScore = currentScore + potentialScore;
      updatePlayerScore(gameCode, submitter, newScore, false);

      logger.info('VOTE', `Word "${word}" validated! Awarding ${potentialScore} to ${submitter}`);

      const submitterData: GameUserData | undefined = game.users?.[submitter];
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

function handlePeerRejection(io: Server, gameCode: string, game: Game, result: PeerValidationResult): void {
  const scoreRemoved = removePeerRejectedWordScore(gameCode, result.word, result.submitter);

  logger.info('PEER_VALIDATION', `Word "${result.word}" rejected. Removed ${scoreRemoved} from ${result.submitter}`);

  // Record rejected word for admin review (if not a bot word)
  if (!result.isBot && result.word && isSupabaseConfigured()) {
    recordPlayerWrongWord(result.word, game.language || 'en', 'peer_rejected').catch(() => {});
  }

  // Blacklist bot words
  if (result.isBot && game.language) {
    botManager.addWordToBlacklist(result.word, game.language)
      .then((success: boolean) => {
        if (success) {
          logger.info('BOT', `Bot word "${result.word}" blacklisted for ${game.language}`);
        }
      })
      .catch((err: Error) => logger.warn('BOT', `Failed to blacklist: ${err.message}`));
  }

  broadcastToRoom(io, getGameRoom(gameCode), 'peerValidationResult', {
    word: result.word,
    submitter: result.submitter,
    rejected: true,
    invalidVotes: result.invalidVotes,
    validVotes: result.validVotes,
    scoreRemoved
  });

  const leaderboard: LeaderboardEntry[] = getLeaderboard(gameCode);
  broadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
}

module.exports = { registerWordHandlers };

export { registerWordHandlers };
