/**
 * Shared Handler Utilities
 * Common functions used across multiple socket handlers
 */

const { getGame, updateGame, getTournamentIdFromGame, getLeaderboard } = require('../modules/gameStateManager');
const { broadcastToRoom, getGameRoom, getSocketById, safeEmit } = require('../utils/socketHelpers');
const { calculateWordScore, calculateGameScores } = require('../modules/scoringEngine');
const { awardFinalAchievements, checkAndAwardAchievements, getLocalizedAchievements, ACHIEVEMENT_ICONS } = require('../modules/achievementManager');
const { calculatePlayerTitles } = require('../modules/playerTitlesManager');
const { isDictionaryWord, addApprovedWord } = require('../dictionary');
const { processGameResults, isSupabaseConfigured } = require('../modules/supabaseServer');
const { invalidateLeaderboardCaches, incrementWordApproval } = require('../redisClient');
const {
  collectNonDictionaryWords,
  getWordsForPlayer,
  SELF_HEALING_CONFIG,
  filterWordsForAIValidation,
  resetGameAIValidationCount,
  cleanupGameTracking,
  isWordCommunityValid,
  isWordValidForScoring
} = require('../modules/communityWordManager');
const { validateWordsWithAI, isAIServiceAvailable } = require('../modules/aiValidationService');
const timerManager = require('../utils/timerManager');
const tournamentManager = require('../modules/tournamentManager');
const botManager = require('../modules/botManager');
const logger = require('../utils/logger');

/**
 * Start the game timer
 * @param {Server} io - Socket.IO server instance
 * @param {string} gameCode - Game code
 * @param {number} timerSeconds - Timer duration in seconds
 */
function startGameTimer(io, gameCode, timerSeconds) {
  const game = getGame(gameCode);
  if (!game) return;

  // Reset AI validation count for this game (hybrid cost-saving)
  resetGameAIValidationCount(gameCode);

  let remainingTime = timerSeconds;
  const intervalMs = parseInt(process.env.TIME_UPDATE_INTERVAL_MS || '1000');

  // Store remaining time in game state for late joiners
  updateGame(gameCode, { remainingTime });

  // Clear any existing timer
  timerManager.clearGameTimer(gameCode);

  // OPTIMIZATION: Track last broadcast time to reduce socket messages
  let lastBroadcastTime = remainingTime;

  // Create interval for time updates
  const timerId = setInterval(() => {
    remainingTime -= intervalMs / 1000;

    // Update remaining time in game state for late joiners
    updateGame(gameCode, { remainingTime });

    // Smart broadcasting to reduce network overhead
    const shouldBroadcast =
      remainingTime <= 10 ||
      remainingTime <= 0 ||
      (lastBroadcastTime - remainingTime >= 10) ||
      remainingTime === 60 || remainingTime === 30;

    if (shouldBroadcast) {
      broadcastToRoom(io, getGameRoom(gameCode), 'timeUpdate', {
        remainingTime
      });
      lastBroadcastTime = remainingTime;
    }

    if (remainingTime <= 0) {
      timerManager.clearGameTimer(gameCode);
      endGame(io, gameCode);
    }
  }, intervalMs);

  timerManager.setGameTimer(gameCode, timerId);

  // Start bots if any are in the game
  startBotsForGame(io, gameCode, game.letterGrid, game.language, timerSeconds);

  // Broadcast that game has officially started
  broadcastToRoom(io, getGameRoom(gameCode), 'startGame', {
    timerSeconds: remainingTime
  });
}

/**
 * End the game
 * @param {Server} io - Socket.IO server instance
 * @param {string} gameCode - Game code
 */
async function endGame(io, gameCode) {
  const game = getGame(gameCode);
  if (!game) return;

  // Stop timer
  timerManager.clearGameTimer(gameCode);

  // Stop all bots
  botManager.stopAllBots(gameCode);

  // Clean up AI validation tracking
  cleanupGameTracking(gameCode);

  // Update game state
  updateGame(gameCode, { gameState: 'finished' });

  // Notify clients that game has ended (sets up waiting state)
  broadcastToRoom(io, getGameRoom(gameCode), 'endGame', {});

  logger.info('GAME', `Game ${gameCode} ending, calculating final scores`);

  // Calculate and broadcast final scores
  await calculateAndBroadcastFinalScores(io, gameCode);

  // Collect non-dictionary words for feedback
  const nonDictWords = collectNonDictionaryWords(game);
  const playerCount = Object.keys(game.users).length;
  const FEEDBACK_TIMEOUT_SECONDS = 15;

  logger.info('GAME', `Game ${gameCode} ended. ${nonDictWords.length} non-dictionary words found, ${playerCount} players.`);

  // Send word feedback to each player
  if (nonDictWords.length > 0 && playerCount > 1) {
    const wordsPerPlayer = Math.min(SELF_HEALING_CONFIG.WORDS_PER_PLAYER, nonDictWords.length);

    setTimeout(() => {
      for (const [username, userData] of Object.entries(game.users)) {
        const wordsForPlayer = getWordsForPlayer(nonDictWords, username, game.language || 'en', wordsPerPlayer);

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
              language: game.language || 'en'
            });
          }
        }
      }
    }, 500);
  }

  // Handle peer validation for AI-approved words
  handlePeerValidation(io, gameCode, game, playerCount);

  // Handle tournament completion
  handleTournamentCompletion(io, gameCode, game);

  logger.info('SOCKET', `Game ${gameCode} ended`);
}

/**
 * Handle peer validation for AI-approved words
 */
function handlePeerValidation(io, gameCode, game, playerCount) {
  const { selectWordForPeerValidation } = require('../modules/gameStateManager');
  const PEER_VALIDATION_TIMEOUT_SECONDS = 20;
  const aiApprovedWords = game.aiApprovedWords || [];

  if (aiApprovedWords.length > 0 && playerCount >= 4) {
    const selectedWord = selectWordForPeerValidation(gameCode);

    if (selectedWord) {
      logger.info('PEER_VALIDATION', `Game ${gameCode}: Selected "${selectedWord.word}" for peer validation`);

      setTimeout(() => {
        for (const [username, userData] of Object.entries(game.users)) {
          if (username === selectedWord.submitter) continue;

          const playerSocket = getSocketById(io, userData.socketId);
          if (playerSocket) {
            safeEmit(playerSocket, 'peerValidationRequest', {
              word: selectedWord.word,
              submittedBy: selectedWord.submitter,
              submitterAvatar: game.users[selectedWord.submitter]?.avatar || null,
              confidence: selectedWord.confidence,
              timeoutSeconds: PEER_VALIDATION_TIMEOUT_SECONDS,
              gameCode,
              language: game.language || 'en'
            });
          }
        }
      }, 1000);
    }
  }
}

/**
 * Handle tournament completion after game ends
 */
function handleTournamentCompletion(io, gameCode, game) {
  const tournamentId = getTournamentIdFromGame(gameCode);
  if (!tournamentId) return;

  const roundResults = {};
  Object.keys(game.users).forEach(username => {
    const userData = game.users[username];
    if (userData && userData.socketId) {
      roundResults[userData.socketId] = {
        score: game.playerScores?.[username] || 0,
        words: (game.playerWords && game.playerWords[username]) || []
      };
    }
  });

  tournamentManager.completeTournamentRound(tournamentId, roundResults);
  const standings = tournamentManager.getTournamentStandings(tournamentId);
  const tournament = tournamentManager.getTournament(tournamentId);

  if (tournament && tournament.currentRound >= tournament.totalRounds) {
    broadcastToRoom(io, getGameRoom(gameCode), 'tournamentComplete', {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        totalRounds: tournament.totalRounds,
        currentRound: tournament.currentRound,
        status: 'completed'
      },
      standings
    });
  } else {
    broadcastToRoom(io, getGameRoom(gameCode), 'tournamentRoundCompleted', {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        totalRounds: tournament.totalRounds,
        currentRound: tournament.currentRound
      },
      standings
    });
  }
}

/**
 * Calculate and broadcast final scores
 */
async function calculateAndBroadcastFinalScores(io, gameCode) {
  const game = getGame(gameCode);
  if (!game || game.gameState !== 'finished') return;

  logger.info('FINAL_SCORES', `Calculating final scores for game ${gameCode}`);
  const language = game.language || 'en';

  // Build data structures in single pass
  const wordCountMap = {};
  const wordToSubmitters = new Map();
  const dictionaryValidatedWords = new Set();
  const communityValidatedWords = new Set();
  const nonDictionaryWords = [];
  const seenWords = new Set();

  for (const [username, words] of Object.entries(game.playerWords || {})) {
    for (const word of words) {
      wordCountMap[word] = (wordCountMap[word] || 0) + 1;

      if (!wordToSubmitters.has(word)) {
        wordToSubmitters.set(word, []);
      }
      wordToSubmitters.get(word).push(username);

      if (!seenWords.has(word)) {
        seenWords.add(word);

        if (isDictionaryWord(word, language)) {
          dictionaryValidatedWords.add(word);
        } else if (isWordCommunityValid(word, language) || isWordValidForScoring(word, language)) {
          communityValidatedWords.add(word);
        } else {
          nonDictionaryWords.push(word);
        }
      }
    }
  }

  // AI validation for non-dictionary words
  const aiValidatedWords = new Map();

  if (nonDictionaryWords.length > 0) {
    const { wordsForAI, skippedWords } = filterWordsForAIValidation(nonDictionaryWords, language, gameCode);

    for (const [word, result] of skippedWords.entries()) {
      aiValidatedWords.set(word, {
        isValid: result.isValid,
        isAiVerified: false,
        source: result.source,
        reason: result.reason
      });
    }

    if (wordsForAI.length > 0) {
      const aiAvailable = await isAIServiceAvailable();
      if (aiAvailable) {
        try {
          const aiResults = await validateWordsWithAI(wordsForAI, language);
          for (const result of aiResults) {
            aiValidatedWords.set(result.word, {
              isValid: result.isValid,
              isAiVerified: true,
              confidence: result.confidence
            });
          }
        } catch (err) {
          logger.error('AI_VALIDATION', `AI validation failed: ${err.message}`);
        }
      }
    }
  }

  // Calculate final scores
  const finalScores = calculateGameScores(
    game,
    wordCountMap,
    dictionaryValidatedWords,
    communityValidatedWords,
    aiValidatedWords
  );

  // Update game state with final scores
  for (const playerResult of finalScores) {
    game.playerScores[playerResult.username] = playerResult.totalScore;
  }

  // Award final achievements
  const usernames = finalScores.map(p => p.username);
  awardFinalAchievements(game, usernames);

  // Copy achievements to player results
  for (const playerResult of finalScores) {
    playerResult.achievements = game.playerAchievements?.[playerResult.username] || [];
  }

  // Calculate player titles
  const titles = calculatePlayerTitles(finalScores, game);
  for (const playerResult of finalScores) {
    playerResult.titles = titles[playerResult.username] || [];
  }

  // Broadcast results to all clients
  // Host expects 'validationComplete', players expect 'validatedScores'
  broadcastToRoom(io, getGameRoom(gameCode), 'validatedScores', {
    scores: finalScores,
    letterGrid: game.letterGrid
  });
  broadcastToRoom(io, getGameRoom(gameCode), 'validationComplete', {
    scores: finalScores,
    letterGrid: game.letterGrid
  });

  // Record to database
  if (isSupabaseConfigured()) {
    await recordGameResultsToSupabase(io, gameCode, finalScores, game);
  }
}

/**
 * Record game results to Supabase
 */
async function recordGameResultsToSupabase(io, gameCode, scoresArray, game) {
  try {
    const results = await processGameResults(gameCode, scoresArray, game);
    logger.info('SUPABASE', `Game ${gameCode} results recorded`);

    // Invalidate leaderboard caches
    await invalidateLeaderboardCaches();

    // Increment word approval counts for dictionary words
    for (const playerResult of scoresArray) {
      for (const wordDetail of playerResult.wordDetails || []) {
        if (wordDetail.validated && wordDetail.inDictionary) {
          await incrementWordApproval(wordDetail.word, game.language || 'en');
        }
      }
    }
  } catch (err) {
    logger.error('SUPABASE', `Failed to record game results: ${err.message}`);
  }
}

/**
 * Start bots for a game
 */
function startBotsForGame(io, gameCode, letterGrid, language, timerSeconds) {
  const bots = botManager.getGameBots(gameCode);
  if (bots.length === 0) return;

  logger.info('BOT', `Starting ${bots.length} bots for game ${gameCode}`);

  const { addPlayerWord, updatePlayerScore, trackBotWord } = require('../modules/gameStateManager');

  for (const bot of bots) {
    botManager.startBot(bot.id, letterGrid, language, timerSeconds, async (botId, word, score) => {
      const currentBot = botManager.getBot(botId);
      if (!currentBot) return;

      addPlayerWord(gameCode, currentBot.username, word, {
        autoValidated: true,
        score,
        comboBonus: 0,
        comboLevel: 0,
        isBot: true
      });

      trackBotWord(gameCode, word, currentBot.username, score);
      updatePlayerScore(gameCode, currentBot.username, score, true);

      const leaderboard = getLeaderboard(gameCode);
      broadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
    });
  }
}

/**
 * Check if socket is migrating to another tab
 */
function isSocketMigrating(socket) {
  return socket.data && socket.data.migrating === true;
}

module.exports = {
  startGameTimer,
  endGame,
  calculateAndBroadcastFinalScores,
  recordGameResultsToSupabase,
  startBotsForGame,
  isSocketMigrating,
  handlePeerValidation,
  handleTournamentCompletion
};
