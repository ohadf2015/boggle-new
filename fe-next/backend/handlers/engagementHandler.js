/**
 * Engagement Handler
 * Handles engagement-related socket events:
 * - Daily challenges
 * - Streaks and login bonuses
 * - Calendar rewards
 * - Come-back campaigns
 * - Mystery rewards
 */

const {
  generateDailyChallenges,
  updateChallengeProgress,
  claimChallengeReward,
  getTodaysChallenges,
  getChallengeStats,
} = require('../modules/dailyChallengesManager');

const {
  recordLogin,
  getStreakXpMultiplier,
  getCalendarStatus,
  claimCalendarReward,
  checkComebackBonus,
  claimComebackBonus,
  calculateNearMisses,
  getOneMoreGamePrompt,
  rollMysteryReward,
  logMysteryReward,
  getEngagementStatus,
} = require('../modules/engagementManager');

const { safeEmit } = require('../utils/socketHelpers');
const { checkRateLimit } = require('../utils/rateLimiter');
const logger = require('../utils/logger');

/**
 * Register engagement socket event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Socket.IO socket instance
 */
function registerEngagementHandlers(io, socket) {

  // ==================== Daily Challenges ====================

  /**
   * Get today's daily challenges for the player
   */
  socket.on('engagement:getDailyChallenges', async (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const { playerId } = data || {};
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Player ID required' });
      return;
    }

    try {
      const challenges = await getTodaysChallenges(playerId);
      safeEmit(socket, 'engagement:dailyChallenges', { challenges });
      logger.debug('ENGAGEMENT', `Sent daily challenges to ${playerId}`);
    } catch (error) {
      logger.error('ENGAGEMENT', `Error getting challenges: ${error.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to get challenges' });
    }
  });

  /**
   * Claim reward for a completed challenge
   */
  socket.on('engagement:claimChallengeReward', async (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const { playerId, challengeId } = data || {};
    if (!playerId || !challengeId) {
      safeEmit(socket, 'engagement:error', { message: 'Player ID and Challenge ID required' });
      return;
    }

    try {
      const result = await claimChallengeReward(playerId, challengeId);
      safeEmit(socket, 'engagement:rewardClaimed', result);

      if (result.success) {
        logger.info('ENGAGEMENT', `Challenge reward claimed: ${result.reward.totalXp} XP for ${playerId}`);
      }
    } catch (error) {
      logger.error('ENGAGEMENT', `Error claiming challenge reward: ${error.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to claim reward' });
    }
  });

  // ==================== Streak System ====================

  /**
   * Record player login and return streak status
   */
  socket.on('engagement:recordLogin', async (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const { playerId } = data || {};
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Player ID required' });
      return;
    }

    try {
      const loginResult = await recordLogin(playerId);
      safeEmit(socket, 'engagement:loginResult', loginResult);

      // Check for comeback bonus
      const comebackStatus = await checkComebackBonus(playerId);
      if (comebackStatus.eligible) {
        safeEmit(socket, 'engagement:comebackAvailable', comebackStatus);
      }

      logger.info('ENGAGEMENT', `Login recorded for ${playerId}, streak: ${loginResult.streak}`);
    } catch (error) {
      logger.error('ENGAGEMENT', `Error recording login: ${error.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to record login' });
    }
  });

  // ==================== Calendar Rewards ====================

  /**
   * Get calendar status for the player
   */
  socket.on('engagement:getCalendarStatus', async (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const { playerId } = data || {};
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Player ID required' });
      return;
    }

    try {
      const status = await getCalendarStatus(playerId);
      safeEmit(socket, 'engagement:calendarStatus', status);
    } catch (error) {
      logger.error('ENGAGEMENT', `Error getting calendar status: ${error.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to get calendar status' });
    }
  });

  /**
   * Claim today's calendar reward
   */
  socket.on('engagement:claimCalendarReward', async (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const { playerId } = data || {};
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Player ID required' });
      return;
    }

    try {
      const result = await claimCalendarReward(playerId);
      safeEmit(socket, 'engagement:calendarRewardClaimed', result);

      if (result.success) {
        logger.info('ENGAGEMENT', `Calendar reward claimed for day ${result.reward.day} by ${playerId}`);
      }
    } catch (error) {
      logger.error('ENGAGEMENT', `Error claiming calendar reward: ${error.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to claim calendar reward' });
    }
  });

  // ==================== Come-back Campaigns ====================

  /**
   * Get comeback bonus status
   */
  socket.on('engagement:getComebackStatus', async (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const { playerId } = data || {};
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Player ID required' });
      return;
    }

    try {
      const status = await checkComebackBonus(playerId);
      safeEmit(socket, 'engagement:comebackStatus', status);
    } catch (error) {
      logger.error('ENGAGEMENT', `Error getting comeback status: ${error.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to get comeback status' });
    }
  });

  /**
   * Claim comeback bonus
   */
  socket.on('engagement:claimComebackBonus', async (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const { playerId } = data || {};
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Player ID required' });
      return;
    }

    try {
      const result = await claimComebackBonus(playerId);
      safeEmit(socket, 'engagement:comebackClaimed', result);

      if (result.success) {
        logger.info('ENGAGEMENT', `Comeback bonus claimed by ${playerId}: ${result.bonus.xpMultiplier}x XP`);
      }
    } catch (error) {
      logger.error('ENGAGEMENT', `Error claiming comeback bonus: ${error.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to claim comeback bonus' });
    }
  });

  // ==================== Full Engagement Status ====================

  /**
   * Get complete engagement status for player
   */
  socket.on('engagement:getStatus', async (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const { playerId } = data || {};
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Player ID required' });
      return;
    }

    try {
      const status = await getEngagementStatus(playerId);
      const challenges = await getTodaysChallenges(playerId);
      const stats = await getChallengeStats(playerId);

      safeEmit(socket, 'engagement:status', {
        ...status,
        dailyChallenges: challenges,
        challengeStats: stats,
      });
    } catch (error) {
      logger.error('ENGAGEMENT', `Error getting engagement status: ${error.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to get engagement status' });
    }
  });
}

/**
 * Process game end engagement events
 * Called by gameLifecycleHandler when a game ends
 * @param {Socket} socket - Player socket
 * @param {string} playerId - Player UUID
 * @param {Object} gameStats - Game statistics
 * @param {string} gameCode - Game code
 */
async function processGameEndEngagement(socket, playerId, gameStats, gameCode) {
  if (!playerId) return;

  try {
    // Update daily challenge progress
    const challengeUpdate = await updateChallengeProgress(playerId, gameStats);

    if (challengeUpdate.completed.length > 0) {
      safeEmit(socket, 'engagement:challengeCompleted', {
        completed: challengeUpdate.completed,
      });
    }

    if (challengeUpdate.updated.length > 0) {
      safeEmit(socket, 'engagement:challengeProgress', {
        progress: challengeUpdate.updated,
      });
    }

    // Calculate and send near-miss notifications
    const nearMisses = calculateNearMisses(gameStats, gameStats.achievements || []);
    if (nearMisses.length > 0) {
      safeEmit(socket, 'engagement:nearMisses', { nearMisses });
    }

    // Get one-more-game prompt
    const prompt = getOneMoreGamePrompt(gameStats);
    if (prompt) {
      safeEmit(socket, 'engagement:oneMoreGame', { prompt });
    }

    // Roll for mystery rewards
    const mysteryReward = rollMysteryReward('game_completion');
    if (mysteryReward) {
      await logMysteryReward(playerId, gameCode, mysteryReward);
      safeEmit(socket, 'engagement:mysteryReward', { reward: mysteryReward });
      logger.info('ENGAGEMENT', `Mystery reward: ${mysteryReward.display} for ${playerId}`);
    }

    // Check for win reward
    if (gameStats.isWinner) {
      const winReward = rollMysteryReward('win');
      if (winReward) {
        await logMysteryReward(playerId, gameCode, winReward);
        safeEmit(socket, 'engagement:mysteryReward', { reward: winReward });
      }
    }

    logger.debug('ENGAGEMENT', `Processed game end engagement for ${playerId}`);
  } catch (error) {
    logger.error('ENGAGEMENT', `Error processing game end engagement: ${error.message}`);
  }
}

/**
 * Process long word found engagement
 * Called when a player finds a long word (8+ letters)
 * @param {Socket} socket - Player socket
 * @param {string} playerId - Player UUID
 * @param {string} word - The word found
 * @param {string} gameCode - Game code
 */
async function processLongWordEngagement(socket, playerId, word, gameCode) {
  if (!playerId || word.length < 8) return;

  try {
    const reward = rollMysteryReward('long_word');
    if (reward) {
      await logMysteryReward(playerId, gameCode, reward);
      safeEmit(socket, 'engagement:mysteryReward', { reward });
      logger.debug('ENGAGEMENT', `Long word reward: ${reward.display} for ${word}`);
    }
  } catch (error) {
    logger.error('ENGAGEMENT', `Error processing long word engagement: ${error.message}`);
  }
}

/**
 * Process achievement earned engagement
 * Called when a player earns an achievement
 * @param {Socket} socket - Player socket
 * @param {string} playerId - Player UUID
 * @param {string} achievementId - Achievement ID
 * @param {string} gameCode - Game code
 */
async function processAchievementEngagement(socket, playerId, achievementId, gameCode) {
  if (!playerId) return;

  try {
    const reward = rollMysteryReward('achievement');
    if (reward) {
      await logMysteryReward(playerId, gameCode, reward);
      safeEmit(socket, 'engagement:mysteryReward', { reward });
      logger.debug('ENGAGEMENT', `Achievement reward: ${reward.display} for ${achievementId}`);
    }
  } catch (error) {
    logger.error('ENGAGEMENT', `Error processing achievement engagement: ${error.message}`);
  }
}

module.exports = {
  registerEngagementHandlers,
  processGameEndEngagement,
  processLongWordEngagement,
  processAchievementEngagement,
};
