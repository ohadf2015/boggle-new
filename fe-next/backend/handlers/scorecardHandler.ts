/**
 * Score Card Handler
 * Generates score card data for victory sharing graphics
 */

import type { Server, Socket } from 'socket.io';
import type {
  Avatar,
  WordDetail,
  ScoreCardData,
  ScoreCardStats,
  ScoreCardRank,
  ScoreCardMetadata,
  ScoreCardWord,
  GenerateScoreCardRequest,
  AchievementPayload
} from '@/shared/types';
import type { GameState } from '../modules/gameState/types.js';

import { getGame, getGameBySocketId, getUsernameBySocketId } from '../modules/gameStateManager.js';
import { safeEmit } from '../utils/socketHelpers.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { inc } from '../utils/metrics.js';
import { isSocketMigrating } from './shared';
import { validatePayload, generateScoreCardSchema } from '../utils/socketValidation.js';
import { ACHIEVEMENT_ICONS } from '../modules/achievementManager.js';
import logger from '../utils/logger.js';

// Rate limit weight for score card generation (medium-heavy operation)
const SCORECARD_WEIGHT = parseInt(process.env.RATE_WEIGHT_SCORECARD || '5');

// Types for internal use
interface SortedScore {
  username: string;
  score: number;
}

/**
 * Calculate player rank information
 * @param sortedScores - Array of {username, score} sorted by score descending
 * @param username - Target player username
 * @returns Rank information
 */
function calculateRank(sortedScores: SortedScore[], username: string): ScoreCardRank {
  const playerIndex = sortedScores.findIndex(p => p.username === username);
  if (playerIndex === -1) {
    return {
      rank: 0,
      totalPlayers: sortedScores.length,
      percentile: 0,
      isWinner: false,
      pointsFromWinner: 0,
      pointsFromNext: 0
    };
  }

  const rank = playerIndex + 1;
  const totalPlayers = sortedScores.length;
  const playerScore = sortedScores[playerIndex].score;
  const winnerScore = sortedScores[0].score;
  const isWinner = rank === 1 || playerScore === winnerScore; // Handle ties

  // Calculate percentile (100 = best, 0 = worst)
  const percentile = totalPlayers > 1
    ? Math.round(((totalPlayers - rank) / (totalPlayers - 1)) * 100)
    : 100;

  const pointsFromWinner = playerScore - winnerScore;
  const pointsFromNext = rank > 1 ? playerScore - sortedScores[playerIndex - 1].score : 0;

  return {
    rank,
    totalPlayers,
    percentile,
    isWinner,
    pointsFromWinner,
    pointsFromNext
  };
}

/**
 * Calculate player statistics from word details
 * @param wordDetails - Array of WordDetail objects
 * @param totalWordsFound - Total words submitted (including invalid)
 * @returns Statistics object
 */
function calculateStats(wordDetails: WordDetail[], totalWordsFound: number): ScoreCardStats {
  const validWords = wordDetails.filter(w => w.validated && !w.isDuplicate);
  const validWordsFound = validWords.length;

  // Find longest word
  let longestWord: string | null = null;
  let longestWordLength = 0;
  for (const wordDetail of wordDetails) {
    if (wordDetail.word.length > longestWordLength) {
      longestWordLength = wordDetail.word.length;
      longestWord = wordDetail.word;
    }
  }

  // Calculate accuracy
  const accuracy = totalWordsFound > 0
    ? Math.round((validWordsFound / totalWordsFound) * 100)
    : 0;

  // Calculate combo stats
  let maxCombo = 0;
  let totalComboBonus = 0;
  for (const wordDetail of wordDetails) {
    if (wordDetail.comboLevel && wordDetail.comboLevel > maxCombo) {
      maxCombo = wordDetail.comboLevel;
    }
    if (wordDetail.comboBonus) {
      totalComboBonus += wordDetail.comboBonus;
    }
  }

  // Calculate fire round bonus
  let totalFireRoundBonus = 0;
  for (const wordDetail of wordDetails) {
    if (wordDetail.fireRoundBonus) {
      totalFireRoundBonus += wordDetail.fireRoundBonus;
    }
  }

  // Count unique words (found by only this player)
  const uniqueWordsCount = wordDetails.filter(w => w.isUnique).length;

  // Calculate average word length (only valid words)
  const totalLength = validWords.reduce((sum, w) => sum + w.word.length, 0);
  const averageWordLength = validWordsFound > 0
    ? Math.round((totalLength / validWordsFound) * 10) / 10 // Round to 1 decimal
    : 0;

  return {
    totalWordsFound,
    validWordsFound,
    longestWord,
    longestWordLength,
    accuracy,
    maxCombo,
    totalComboBonus,
    totalFireRoundBonus,
    uniqueWordsCount,
    averageWordLength
  };
}

/**
 * Get top scoring words for display (up to 5)
 * @param wordDetails - Array of WordDetail objects
 * @returns Top words
 */
function getTopWords(wordDetails: WordDetail[]): ScoreCardWord[] {
  return wordDetails
    .filter(w => w.validated && !w.isDuplicate)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(w => ({
      word: w.word,
      baseScore: w.score - (w.comboBonus || 0) - (w.fireRoundBonus || 0),
      totalScore: w.score,
      comboBonus: w.comboBonus || undefined,
      fireRoundBonus: w.fireRoundBonus || undefined,
      isUnique: w.isUnique || false,
      isDuplicate: w.isDuplicate || false
    }));
}

/**
 * Generate score card data for a player
 * @param game - Game object
 * @param username - Player username
 * @returns Score card data
 */
function generateScoreCardData(game: GameState, username: string): ScoreCardData {
  // Get player data
  const user = game.users[username];
  if (!user) {
    throw new Error('Player not found in game');
  }

  // Get word details for this player (cast from unknown[] as stored in GameState)
  const wordDetails = (game.playerWordDetails?.[username] || []) as WordDetail[];
  const totalWordsFound = game.playerWords?.[username]?.length || 0;
  const score = game.playerScores?.[username] || 0;

  // Calculate rankings
  const sortedScores: SortedScore[] = Object.entries(game.playerScores || {})
    .map(([name, playerScore]) => ({ username: name, score: playerScore as number }))
    .sort((a, b) => b.score - a.score);

  const rank = calculateRank(sortedScores, username);

  // Calculate statistics
  const stats = calculateStats(wordDetails, totalWordsFound);

  // Get top words
  const topWords = getTopWords(wordDetails);

  // Get achievements (extract id from PlayerAchievement objects)
  const playerAchievements = game.playerAchievements?.[username] || [];
  const achievements: AchievementPayload[] = playerAchievements.map(a => ({
    key: a.id,
    icon: ACHIEVEMENT_ICONS[a.id] || '🏅'
  }));

  // Build metadata
  const metadata: ScoreCardMetadata = {
    gameCode: game.gameCode,
    language: game.language || 'en',
    timestamp: (game as GameState & { gameEndedAt?: number }).gameEndedAt || Date.now(),
    gameDuration: game.gameDuration || game.timerSeconds || 180,
    isRanked: game.isRanked || false,
    difficulty: game.difficulty,
    minWordLength: game.minWordLength || 2
  };

  // Get titles (may be stored in game state after calculation)
  const titles: string[] = (game as GameState & { playerTitles?: Record<string, string[]> }).playerTitles?.[username] || [];

  return {
    username,
    avatar: user.avatar ?? {},
    score,
    rank,
    stats,
    achievements,
    titles,
    metadata,
    topWords
  };
}

/**
 * Register score card socket event handlers
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerScorecardHandlers(io: Server, socket: Socket): void {

  /**
   * Handle score card generation request
   */
  socket.on('scorecard:generate', (data: GenerateScoreCardRequest) => {
    // Check for socket migration
    if (isSocketMigrating(socket)) return;

    // Rate limiting
    if (!checkRateLimit(socket.id, SCORECARD_WEIGHT)) {
      inc('rateLimited');
      socket.emit('rateLimited');
      safeEmit(socket, 'scorecard:error', {
        message: 'Rate limit exceeded. Please wait before requesting again.',
        code: 'RATE_LIMITED'
      });
      return;
    }

    // Validate payload
    const validation = validatePayload(generateScoreCardSchema, data);
    if (!validation.success) {
      safeEmit(socket, 'scorecard:error', {
        message: `Invalid request: ${validation.error}`,
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    const { gameCode: providedGameCode } = validation.data as GenerateScoreCardRequest;

    // Always use server-side identity to prevent spoofing
    const gameCode = providedGameCode || getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    // Validate game code and username
    if (!gameCode) {
      safeEmit(socket, 'scorecard:error', {
        message: 'Game not found. You must be in a game to request a score card.',
        code: 'GAME_NOT_FOUND'
      });
      return;
    }

    if (!username) {
      safeEmit(socket, 'scorecard:error', {
        message: 'Username not found. Please rejoin the game.',
        code: 'USERNAME_NOT_FOUND'
      });
      return;
    }

    // Get game
    const game = getGame(gameCode);
    if (!game) {
      safeEmit(socket, 'scorecard:error', {
        message: 'Game not found.',
        code: 'GAME_NOT_FOUND'
      });
      return;
    }

    // Verify game is finished
    if (game.gameState !== 'finished') {
      safeEmit(socket, 'scorecard:error', {
        message: 'Score cards are only available for finished games.',
        code: 'GAME_NOT_FINISHED'
      });
      return;
    }

    // Verify user is a player in this game
    if (!game.users[username]) {
      safeEmit(socket, 'scorecard:error', {
        message: 'You are not a player in this game.',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    // Generate score card data
    try {
      const scoreCardData = generateScoreCardData(game, username);

      // Emit success response
      safeEmit(socket, 'scorecard:data', {
        success: true,
        data: scoreCardData
      });

      logger.info('SCORECARD', `Generated score card for ${username} in game ${gameCode}`);
      inc('scorecard.generated');

    } catch (error: unknown) {
      const err = error as Error;
      logger.error('SCORECARD', `Error generating score card: ${err.message}`, { gameCode, username });
      safeEmit(socket, 'scorecard:error', {
        message: 'Failed to generate score card. Please try again.',
        code: 'GENERATION_ERROR'
      });
      inc('scorecard.error');
    }
  });
}

export {
  registerScorecardHandlers,
  calculateRank,
  calculateStats,
  getTopWords,
  generateScoreCardData
};
