/**
 * Word Handler
 * Handles word submission, validation, and voting events
 */

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
  trackAiApprovedWord
} = require('../modules/gameStateManager');

const { broadcastToRoom, getGameRoom, getSocketById, safeEmit } = require('../utils/socketHelpers');
const { isWordOnBoardAsync } = require('../modules/wordValidatorPool');
const { isProfane } = require('../utils/profanityFilter');
const { calculateWordScore } = require('../modules/scoringEngine');
const { checkAndAwardAchievements, ACHIEVEMENT_ICONS } = require('../modules/achievementManager');
const { isDictionaryWord } = require('../dictionary');
const { isSupabaseConfigured, savePlayerWord } = require('../modules/supabaseServer');
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

/**
 * Handle spam detection after an invalid word submission
 * Records the invalid word and applies progressive penalties
 * @param {Socket} socket - Socket.IO socket instance
 * @param {string} gameCode - Game code
 * @param {string} username - Player username
 * @param {string} word - The invalid word
 * @param {string} reason - Reason for invalidity
 * @param {object} game - Game object (for score updates)
 */
function handleSpamDetection(socket, gameCode, username, word, reason, game) {
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
      if (result.penaltyApplied > 0) {
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
      if (result.cooldownDuration > 0) {
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
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Socket.IO socket instance
 */
function registerWordHandlers(io, socket) {

  // Handle word submission
  socket.on('submitWord', async (data) => {
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
      const { word, comboLevel = 0 } = validation.data;

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

      if (!gameCode || !username || !word) {
        emitError(socket, ErrorMessages.INVALID_WORD_SUBMISSION);
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
        return;
      }

      // Check dictionary and community validation
      const isInDictionary = isDictionaryWord(normalizedWord, game.language);
      const isCommunityValidated = isWordCommunityValid(normalizedWord, game.language);
      const hasPositiveScore = isWordValidForScoring(normalizedWord, game.language);
      const shouldAutoValidate = isInDictionary || isCommunityValidated || hasPositiveScore;

      if (shouldAutoValidate) {
        handleValidatedWord(io, socket, game, gameCode, username, normalizedWord, comboLevel, isInDictionary);
      } else {
        handlePendingWord(socket, game, gameCode, username, normalizedWord, comboLevel);
      }

      // Update leaderboard
      const lbThrottleMs = parseInt(process.env.LEADERBOARD_THROTTLE_MS || '500');
      getLeaderboardThrottled(gameCode, (leaderboard) => {
        broadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
      }, lbThrottleMs);

    } catch (error) {
      logger.error('SOCKET', 'Error in submitWord handler', error);
      emitError(socket, 'An error occurred while processing your word');
    }
  });

  // Handle word vote submission (community validation)
  socket.on('submitWordVote', async (data) => {
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

    const { word, voteType, gameCode: providedGameCode } = validation.data;
    const gameCode = providedGameCode || getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game) return;

    const userData = game.users?.[username];
    const userId = userData?.authUserId || null;
    const guestId = userData?.guestTokenHash || null;

    if (!userId && !guestId) {
      logger.debug('VOTE', `No voter identifier for ${username}`);
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
  socket.on('submitPeerValidationVote', async (data) => {
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

    const { word, isValid, gameCode: providedGameCode } = validation.data;
    const gameCode = providedGameCode || getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game) return;

    const result = recordPeerValidationVote(gameCode, username, isValid);

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
  socket.on('validateWords', async (data) => {
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

function handleValidatedWord(io, socket, game, gameCode, username, normalizedWord, comboLevel, isInDictionary) {
  const safeComboLevel = Math.max(0, Math.min(10, parseInt(comboLevel) || 0));
  const baseScore = normalizedWord.length - 1;
  const wordScore = calculateWordScore(normalizedWord, safeComboLevel);
  const comboBonus = wordScore - baseScore;

  if (!game.playerCombos) game.playerCombos = {};
  game.playerCombos[username] = safeComboLevel;

  addPlayerWord(gameCode, username, normalizedWord, {
    autoValidated: true,
    score: wordScore,
    comboBonus: comboBonus,
    comboLevel: safeComboLevel
  });

  // Save to database if dictionary word
  if (isInDictionary && isSupabaseConfigured()) {
    const userData = game.users?.[username];
    savePlayerWord({
      word: normalizedWord,
      language: game.language || 'en',
      gameCode,
      playerId: userData?.authUserId || null
    }).catch(err => {
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
    autoValidated: true
  });

  // Check achievements
  const achievements = checkAndAwardAchievements(gameCode, username, normalizedWord);
  if (achievements.length > 0) {
    logger.info('ACHIEVEMENT', `Emitting liveAchievementUnlocked to ${username}: ${achievements.map(a => a.key).join(', ')} (gameState: ${game.gameState})`);
    socket.emit('liveAchievementUnlocked', { achievements });
  }

  // Process long word engagement (8+ letters triggers mystery reward chance)
  if (normalizedWord.length >= 8) {
    const userData = game.users?.[username];
    if (userData?.authUserId) {
      processLongWordEngagement(socket, userData.authUserId, normalizedWord, gameCode)
        .catch(err => logger.debug('ENGAGEMENT', `Long word engagement error: ${err.message}`));
    }
  }
}

function handlePendingWord(socket, game, gameCode, username, normalizedWord, comboLevel) {
  const safeComboLevel = Math.max(0, Math.min(10, parseInt(comboLevel) || 0));
  const baseScore = normalizedWord.length - 1;
  const potentialScore = calculateWordScore(normalizedWord, safeComboLevel);
  const comboBonus = potentialScore - baseScore;

  if (!game.playerCombos) game.playerCombos = {};
  game.playerCombos[username] = safeComboLevel;

  addPlayerWord(gameCode, username, normalizedWord, {
    autoValidated: false,
    score: 0,
    comboBonus: comboBonus,
    comboLevel: safeComboLevel
  });

  inc('wordNeedsValidation');
  incPerGame(gameCode, 'wordNeedsValidation');

  socket.emit('wordNeedsValidation', {
    word: normalizedWord,
    message: 'Word will be validated at game end'
  });
}

function handleWordBecameValid(io, socket, game, gameCode, word, submitter) {
  if (submitter && game.playerWordDetails?.[submitter]) {
    const wordDetail = game.playerWordDetails[submitter].find(wd => wd.word === word);
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

function handlePeerRejection(io, gameCode, game, result) {
  const scoreRemoved = removePeerRejectedWordScore(gameCode, result.word, result.submitter);

  logger.info('PEER_VALIDATION', `Word "${result.word}" rejected. Removed ${scoreRemoved} from ${result.submitter}`);

  // Blacklist bot words
  if (result.isBot && game.language) {
    botManager.addWordToBlacklist(result.word, game.language)
      .then(success => {
        if (success) {
          logger.info('BOT', `Bot word "${result.word}" blacklisted for ${game.language}`);
        }
      })
      .catch(err => logger.warn('BOT', `Failed to blacklist: ${err.message}`));
  }

  broadcastToRoom(io, getGameRoom(gameCode), 'peerValidationResult', {
    word: result.word,
    submitter: result.submitter,
    rejected: true,
    invalidVotes: result.invalidVotes,
    validVotes: result.validVotes,
    scoreRemoved
  });

  const leaderboard = getLeaderboard(gameCode);
  broadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
}

module.exports = { registerWordHandlers };
