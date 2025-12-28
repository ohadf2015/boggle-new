/**
 * Shared Handler Utilities
 * Common functions used across multiple socket handlers
 */

import type { Server, Socket } from 'socket.io';
import type { Game, LetterGrid, Language, LeaderboardEntry, WordDetail } from '@/shared/types';

const { getGame, updateGame, getTournamentIdFromGame, getLeaderboard, transitionGameState } = require('../modules/gameStateManager');
const { broadcastToRoom, getGameRoom, getSocketById, safeEmit } = require('../utils/socketHelpers');
const { calculateWordScore, calculateGameScores } = require('../modules/scoringEngine');
const { awardFinalAchievements, checkAndAwardAchievements, getLocalizedAchievements, ACHIEVEMENT_ICONS } = require('../modules/achievementManager');
const { calculatePlayerTitles } = require('../modules/playerTitlesManager');
const { isDictionaryWord, addApprovedWord } = require('../dictionary');
const { processGameResults, isSupabaseConfigured } = require('../modules/supabaseServer');
const { invalidateLeaderboardCaches, incrementWordApproval } = require('../redisClient');
const { processGameEndEngagement, processAchievementEngagement } = require('./engagementHandler');
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
const { clearGameHintState } = require('./hintHandler');
const logger = require('../utils/logger');

// Types for internal use
interface BotSubmission {
  botId: string;
  username: string;
  word: string;
  score: number;
  comboLevel?: number;
}

interface Bot {
  id: string;
  username: string;
  isActive: boolean;
  gameCode?: string;
}

interface AIValidationResult {
  isValid: boolean;
  isAiVerified: boolean;
  confidence?: number;
  reason?: string;
  source?: string;
}

interface PlayerResult {
  username: string;
  totalScore: number;
  wordDetails: WordDetail[];
  achievements: Array<{ key: string; icon: string }>;
  titles?: string[];
}

interface XpInfo {
  socketId?: string;
  xpEarned: number;
  xpBreakdown: Record<string, number>;
  newTotalXp: number;
  newLevel: number;
  leveledUp?: boolean;
  oldLevel?: number;
  levelsGained?: number;
  newTitles?: string[];
}

interface GameResults {
  xpResults?: Record<string, XpInfo>;
}

/**
 * Start the game timer
 * @param io - Socket.IO server instance
 * @param gameCode - Game code
 * @param timerSeconds - Timer duration in seconds
 */
function startGameTimer(io: Server, gameCode: string, timerSeconds: number): void {
  const game = getGame(gameCode);
  if (!game) return;

  // Reset AI validation count for this game (hybrid cost-saving)
  resetGameAIValidationCount(gameCode);

  const intervalMs = parseInt(process.env.TIME_UPDATE_INTERVAL_MS || '1000');

  // TIMESTAMP-BASED TIMING: Use actual elapsed time to prevent drift
  // This fixes the 7-10 second timer drift issue in multiplayer games
  const startTimestamp = Date.now();
  const endTimestamp = startTimestamp + (timerSeconds * 1000);

  // Store remaining time in game state for late joiners
  updateGame(gameCode, { remainingTime: timerSeconds, gameStartTimestamp: startTimestamp });

  // Clear any existing timer
  timerManager.clearGameTimer(gameCode);

  // OPTIMIZATION: Track last broadcast time to reduce socket messages
  let lastBroadcastTime = timerSeconds;
  let lastBroadcastSecond = timerSeconds;

  // Create interval for time updates
  const timerId = setInterval(() => {
    // Calculate remaining time based on actual elapsed time (prevents drift)
    const now = Date.now();
    const remainingMs = Math.max(0, endTimestamp - now);
    const remainingTime = Math.ceil(remainingMs / 1000);

    // Update remaining time in game state for late joiners
    updateGame(gameCode, { remainingTime });

    // Smart broadcasting to reduce network overhead
    // Only broadcast when the displayed second changes
    const secondChanged = remainingTime !== lastBroadcastSecond;
    const shouldBroadcast = secondChanged && (
      remainingTime <= 10 ||
      remainingTime <= 0 ||
      (lastBroadcastTime - remainingTime >= 10) ||
      remainingTime === 60 || remainingTime === 30
    );

    if (shouldBroadcast) {
      broadcastToRoom(io, getGameRoom(gameCode), 'timeUpdate', {
        remainingTime,
        gameSessionId: game.gameSessionId
      });
      lastBroadcastTime = remainingTime;
    }
    lastBroadcastSecond = remainingTime;

    if (remainingTime <= 0) {
      timerManager.clearGameTimer(gameCode);
      endGame(io, gameCode);
    }
  }, intervalMs);

  timerManager.setGameTimer(gameCode, timerId);

  // Start bots if any are in the game
  startBotsForGame(io, gameCode, game.letterGrid, game.language, timerSeconds);

  // NOTE: We do NOT broadcast 'startGame' here anymore.
  // The game start has already been broadcast from gameLifecycleHandler with all necessary data.
  // A second broadcast was causing issues with the second game in the same room getting stuck.
}

/**
 * End the game
 * @param io - Socket.IO server instance
 * @param gameCode - Game code
 */
async function endGame(io: Server, gameCode: string): Promise<void> {
  const game = getGame(gameCode);
  if (!game) return;

  // Stop timer
  timerManager.clearGameTimer(gameCode);

  // Stop all bots
  botManager.stopAllBots(gameCode);

  // Clean up AI validation tracking
  cleanupGameTracking(gameCode);

  // Clear hint state for this game
  clearGameHintState(gameCode);

  // Clear earthquake state for this game
  const { clearGameEarthquakeState } = require('./earthquakeHandler');
  clearGameEarthquakeState(gameCode);

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
  await new Promise(resolve => setTimeout(resolve, 500));

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
      for (const [username, userData] of Object.entries(game.users) as [string, { socketId: string; avatar?: { emoji: string; color: string } }][]) {
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
function handlePeerValidation(io: Server, gameCode: string, game: Game, playerCount: number): void {
  const { selectWordForPeerValidation } = require('../modules/gameStateManager');
  const PEER_VALIDATION_TIMEOUT_SECONDS = 20;
  const aiApprovedWords = game.aiApprovedWords || [];

  if (aiApprovedWords.length > 0 && playerCount >= 4) {
    const selectedWord = selectWordForPeerValidation(gameCode);

    if (selectedWord) {
      logger.info('PEER_VALIDATION', `Game ${gameCode}: Selected "${selectedWord.word}" for peer validation`);

      setTimeout(() => {
        for (const [username, userData] of Object.entries(game.users) as [string, { socketId: string; avatar?: { emoji: string; color: string } }][]) {
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
function handleTournamentCompletion(io: Server, gameCode: string, game: Game): void {
  const tournamentId = getTournamentIdFromGame(gameCode);
  if (!tournamentId) return;

  const roundResults: Record<string, { score: number; words: string[] }> = {};
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
async function calculateAndBroadcastFinalScores(io: Server, gameCode: string): Promise<void> {
  const game = getGame(gameCode);
  if (!game || game.gameState !== 'finished') return;

  logger.info('FINAL_SCORES', `Calculating final scores for game ${gameCode}`);
  const language = game.language || 'en';

  // Build data structures in single pass
  const wordCountMap: Record<string, number> = {};
  const wordToSubmitters = new Map<string, string[]>();
  const dictionaryValidatedWords = new Set<string>();
  const communityValidatedWords = new Set<string>();
  const nonDictionaryWords: string[] = [];
  const seenWords = new Set<string>();

  for (const [username, words] of Object.entries(game.playerWords || {}) as [string, string[]][]) {
    for (const word of words) {
      wordCountMap[word] = (wordCountMap[word] || 0) + 1;

      if (!wordToSubmitters.has(word)) {
        wordToSubmitters.set(word, []);
      }
      wordToSubmitters.get(word)!.push(username);

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
  const aiValidatedWords = new Map<string, AIValidationResult>();

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
              confidence: result.confidence,
              reason: result.reason // Include AI's reason for validation/rejection
            });
          }
        } catch (err: unknown) {
          const error = err as Error;
          logger.error('AI_VALIDATION', `AI validation failed: ${error.message}`);
        }
      }
    }
  }

  // Get player count for duplicate rule logic
  const playerCount = Object.keys(game.users || {}).length;

  // Disable duplicate rule for large rooms (more than 7 players)
  const duplicateRuleDisabled = playerCount > 7;

  // Calculate final scores
  const finalScores: PlayerResult[] = calculateGameScores(
    game,
    wordCountMap,
    dictionaryValidatedWords,
    communityValidatedWords,
    aiValidatedWords,
    { playerCount }
  );

  // Update game state with final scores
  for (const playerResult of finalScores) {
    game.playerScores[playerResult.username] = playerResult.totalScore;
  }

  // Award final achievements
  const usernames = finalScores.map(p => p.username);
  awardFinalAchievements(game, usernames);

  // Copy achievements to player results (convert keys to objects with icons)
  for (const playerResult of finalScores) {
    const achievementKeys: string[] = game.playerAchievements?.[playerResult.username] || [];
    playerResult.achievements = achievementKeys.map(key => ({
      key,
      icon: ACHIEVEMENT_ICONS[key] || '🏅'
    }));
  }

  // Calculate player titles
  const titles = calculatePlayerTitles(finalScores, game);
  for (const playerResult of finalScores) {
    playerResult.titles = titles[playerResult.username] || [];
  }

  // Broadcast results to all clients
  // Host expects 'validationComplete', players expect 'validatedScores'
  // Include duplicateRuleDisabled flag so frontend can display a notice
  broadcastToRoom(io, getGameRoom(gameCode), 'validatedScores', {
    scores: finalScores,
    letterGrid: game.letterGrid,
    duplicateRuleDisabled,
    playerCount
  });
  broadcastToRoom(io, getGameRoom(gameCode), 'validationComplete', {
    scores: finalScores,
    letterGrid: game.letterGrid,
    duplicateRuleDisabled,
    playerCount
  });

  // Record to database
  if (isSupabaseConfigured()) {
    await recordGameResultsToSupabase(io, gameCode, finalScores, game);
  }
}

/**
 * Record game results to Supabase and emit XP/engagement events
 */
async function recordGameResultsToSupabase(io: Server, gameCode: string, scoresArray: PlayerResult[], game: Game): Promise<void> {
  try {
    // Build userAuthMap from game.users
    const userAuthMap: Record<string, { authUserId: string | null; guestTokenHash: string | null; guestSessionId: string | null; socketId: string | null }> = {};
    for (const [username, userData] of Object.entries(game.users || {}) as [string, { authUserId?: string; guestTokenHash?: string; guestSessionId?: string; socketId?: string }][]) {
      userAuthMap[username] = {
        authUserId: userData.authUserId || null,
        guestTokenHash: userData.guestTokenHash || null,
        guestSessionId: userData.guestSessionId || null,
        socketId: userData.socketId || null
      };
    }

    // Build gameInfo from game object
    const gameInfo = {
      language: game.language || 'en',
      isRanked: game.isRanked || false,
      timePlayed: game.timerSeconds || 0
    };

    const results: GameResults = await processGameResults(gameCode, scoresArray, gameInfo, userAuthMap);
    logger.info('SUPABASE', `Game ${gameCode} results recorded`);

    // Emit XP events to each player
    if (results.xpResults) {
      for (const [username, xpInfo] of Object.entries(results.xpResults)) {
        if (xpInfo.socketId) {
          const playerSocket = getSocketById(io, xpInfo.socketId);
          if (playerSocket) {
            // Emit XP gained event
            safeEmit(playerSocket, 'xpGained', {
              xpEarned: xpInfo.xpEarned,
              xpBreakdown: xpInfo.xpBreakdown,
              newTotalXp: xpInfo.newTotalXp,
              newLevel: xpInfo.newLevel,
            });
            logger.debug('XP', `Emitted xpGained to ${username}: +${xpInfo.xpEarned} XP`);

            // Emit level up event if applicable
            if (xpInfo.leveledUp) {
              safeEmit(playerSocket, 'levelUp', {
                oldLevel: xpInfo.oldLevel,
                newLevel: xpInfo.newLevel,
                levelsGained: xpInfo.levelsGained,
                newTitles: xpInfo.newTitles || [],
              });
              logger.info('XP', `Emitted levelUp to ${username}: ${xpInfo.oldLevel} -> ${xpInfo.newLevel}`);
            }
          }
        }
      }
    }

    // Process engagement events for each player
    const playerCount = scoresArray.length;
    const sortedScores = [...scoresArray].sort((a, b) => b.totalScore - a.totalScore);
    const winnerUsername = sortedScores[0]?.username;

    for (const playerResult of scoresArray) {
      const userData = game.users?.[playerResult.username] as { socketId?: string; authUserId?: string } | undefined;
      if (!userData) continue;

      const playerSocket = getSocketById(io, userData.socketId);
      const playerId = userData.authUserId;

      // Build game stats for engagement processing
      const gameStats = {
        score: playerResult.totalScore || 0,
        wordCount: playerResult.wordDetails?.length || 0,
        longestWord: playerResult.wordDetails?.reduce((max: string, w: WordDetail) =>
          (w.word?.length || 0) > (max?.length || 0) ? w.word : max, '') || '',
        isWinner: playerResult.username === winnerUsername && playerCount > 1,
        placement: sortedScores.findIndex(p => p.username === playerResult.username) + 1,
        playerCount,
        achievements: playerResult.achievements?.map(a => a.key) || [],
      };

      // Process engagement (daily challenges, near-misses, mystery rewards)
      if (playerSocket && playerId) {
        await processGameEndEngagement(playerSocket, playerId, gameStats, gameCode);

        // Process achievement engagement for mystery rewards
        for (const achievement of (playerResult.achievements || [])) {
          await processAchievementEngagement(playerSocket, playerId, achievement.key, gameCode);
        }
      }
    }

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
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('SUPABASE', `Failed to record game results: ${error.message}`);
  }
}

/**
 * Start bots for a game
 * Note: Bot initialization is async but we don't await to avoid blocking the game timer.
 * Each bot tracks its own start time to calculate accurate remaining game time.
 */
function startBotsForGame(io: Server, gameCode: string, letterGrid: LetterGrid | null, language: Language, timerSeconds: number): void {
  const bots: Bot[] = botManager.getGameBots(gameCode);
  if (bots.length === 0) return;

  // Safety check: ensure letterGrid is valid before starting bots
  if (!letterGrid || !Array.isArray(letterGrid) || letterGrid.length === 0) {
    logger.error('BOT', `Cannot start bots for game ${gameCode}: letterGrid is invalid`);
    return;
  }

  logger.info('BOT', `Starting ${bots.length} bots for game ${gameCode}`);

  const { addPlayerWord, updatePlayerScore, trackBotWord } = require('../modules/gameStateManager');

  // Store game start time so bots can calculate actual remaining time
  const gameStartTime = Date.now();

  for (const bot of bots) {
    // Start each bot with its own callback
    // Note: startBot is async but we intentionally don't await it here
    // to allow bots to initialize in parallel without blocking
    botManager.startBot(bot, letterGrid, language, async (submission: BotSubmission) => {
      // Destructure the submission object from botManager
      const { botId, username, word, score, comboLevel } = submission;

      // Use the bot from closure - it's the same bot object
      if (!bot || !bot.isActive) return;

      // Safety check: ensure word is valid
      if (!word || typeof word !== 'string') {
        logger.warn('BOT', `Bot "${username}" submitted invalid word: ${word}`);
        return;
      }

      addPlayerWord(gameCode, username, word, {
        autoValidated: true,
        score,
        comboBonus: 0,
        comboLevel: comboLevel || 0,
        isBot: true
      });

      trackBotWord(gameCode, word, username, score);
      updatePlayerScore(gameCode, username, score, true);

      const leaderboard: LeaderboardEntry[] = getLeaderboard(gameCode);
      broadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
    }, timerSeconds, gameStartTime);
  }
}

/**
 * Check if socket is migrating to another tab
 */
function isSocketMigrating(socket: Socket): boolean {
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

export {
  startGameTimer,
  endGame,
  calculateAndBroadcastFinalScores,
  recordGameResultsToSupabase,
  startBotsForGame,
  isSocketMigrating,
  handlePeerValidation,
  handleTournamentCompletion
};
