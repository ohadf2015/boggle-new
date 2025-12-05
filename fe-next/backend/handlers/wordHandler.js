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
const { emitError, ErrorMessages } = require('../utils/errorHandler');
const { checkRateLimit } = require('../utils/rateLimiter');
const { inc, incPerGame } = require('../utils/metrics');
const botManager = require('../modules/botManager');
const logger = require('../utils/logger');
const { isSocketMigrating } = require('./shared');

// Rate limit weights
const SUBMIT_WORD_WEIGHT = parseInt(process.env.RATE_WEIGHT_SUBMITWORD || '1');

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

    try {
      const { word, comboLevel = 0 } = data;

      const gameCode = getGameBySocketId(socket.id);
      const username = getUsernameBySocketId(socket.id);

      if (!gameCode || !username || !word) {
        emitError(socket, ErrorMessages.INVALID_WORD_SUBMISSION);
        return;
      }

      const game = getGame(gameCode);
      if (!game || game.gameState !== 'in-progress') {
        emitError(socket, ErrorMessages.GAME_NOT_IN_PROGRESS);
        return;
      }

      markUserActivity(gameCode, username);

      const normalizedWord = word.toLowerCase().trim().substring(0, 50);

      // Check for profanity
      if (isProfane(normalizedWord)) {
        socket.emit('wordRejected', {
          word: normalizedWord,
          reason: 'inappropriate'
        });
        return;
      }

      // Validate minimum word length
      const minLength = game.minWordLength || 2;
      if (normalizedWord.length < minLength) {
        socket.emit('wordTooShort', {
          word: normalizedWord,
          minLength: minLength
        });
        return;
      }

      // Check if already found
      if (playerHasWord(gameCode, username, normalizedWord)) {
        socket.emit('wordAlreadyFound', { word: normalizedWord });
        return;
      }

      // Validate word on board
      const isOnBoard = await isWordOnBoardAsync(normalizedWord, game.letterGrid, game.letterPositions);
      if (!isOnBoard) {
        inc('wordNotOnBoard');
        incPerGame(gameCode, 'wordNotOnBoard');
        socket.emit('wordNotOnBoard', { word: normalizedWord });
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

    const { word, voteType, gameCode: providedGameCode } = data;
    const gameCode = providedGameCode || getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !word || !voteType) return;

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

    const { word, isValid, gameCode: providedGameCode } = data;
    const gameCode = providedGameCode || getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || word === undefined || isValid === undefined) return;

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
    socket.emit('liveAchievementUnlocked', { achievements });
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
