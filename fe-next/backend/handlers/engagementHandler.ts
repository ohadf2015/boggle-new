/**
 * Engagement Handler
 * Handles engagement-related socket events:
 * - Daily challenges
 * - Streaks and login bonuses
 * - Calendar rewards
 * - Come-back campaigns
 * - Mystery rewards
 */

import type { Server, Socket } from 'socket.io';
import type {
  DailyChallenge,
  ChallengeProgress,
  CompletedChallenge,
  MysteryReward,
  NearMiss,
  OneMoreGamePrompt
} from '@/shared/types';

import {
  updateChallengeProgress,
  claimChallengeReward,
  getTodaysChallenges,
  getChallengeStats,
} from '../modules/dailyChallengesManager';

import {
  recordLogin,
  getCalendarStatus,
  claimCalendarReward,
  checkComebackBonus,
  claimComebackBonus,
  calculateNearMisses,
  getOneMoreGamePrompt,
  rollMysteryReward,
  logMysteryReward,
  getEngagementStatus,
} from '../modules/engagementManager';

import {
  getDailyMissions,
} from '../modules/dailyMissionsManager';

import {
  getWordOfTheDay,
  recordWotdAttempt,
  getWotdStats,
} from '../modules/wordOfTheDayManager';

import { safeEmit } from '../utils/socketHelpers';
import { checkRateLimit } from '../utils/rateLimiter';
import logger from '../utils/logger';

interface ClaimChallengePayload {
  challengeId: string;
}

interface GameStats {
  score: number;
  wordCount: number;
  longestWord: string;
  isWinner: boolean;
  placement: number;
  playerCount: number;
  achievements: string[];
}

interface ChallengeUpdateResult {
  completed: CompletedChallenge[];
  updated: ChallengeProgress[];
}

interface ChallengeRewardResult {
  success: boolean;
  reward?: {
    totalXp: number;
  };
  error?: string;
}

interface LoginResultType {
  streak: number;
}

interface ComebackStatusType {
  eligible: boolean;
}

interface ComebackClaimResultType {
  success: boolean;
  bonus?: {
    xpMultiplier: number;
  };
}

interface CalendarStatusType {
  currentDay: number;
  claimedDays: number[];
  todayClaimable: boolean;
  rewards: unknown[];
}

interface CalendarRewardResultType {
  success: boolean;
  reward?: {
    day: number;
  };
}

interface EngagementStatusType {
  streak: number;
  streakMultiplier: number;
  calendarDay: number;
  comebackEligible: boolean;
}

interface ChallengeStatsType {
  completed: number;
  total: number;
}

/**
 * Resolve authenticated user from socket auth middleware.
 * Rejects client-supplied IDs — prevents victim-impersonation on progression endpoints.
 */
function getAuthedPlayerId(socket: Socket): string | null {
  const verified = (socket.data as Record<string, unknown> | undefined)?.verifiedUserId;
  return typeof verified === 'string' && verified.length > 0 ? verified : null;
}

/**
 * Transform a database challenge record to the client DailyChallenge format.
 */

function transformDbChallenge(c: any): DailyChallenge {
  return {
    id: (c.id as string) || '',
    type: c.challenge_type as DailyChallenge['type'],
    title: c.title as string,
    description: c.description as string,
    target: c.target_value as number,
    current: c.current_value as number,
    tier: c.challenge_tier as DailyChallenge['tier'],
    xpReward: c.xp_reward as number,
    completed: c.completed as boolean,
    claimed: c.claimed as boolean,
  };
}

/**
 * Register engagement socket event handlers
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerEngagementHandlers(io: Server, socket: Socket): void {

  // ==================== Daily Challenges ====================

  socket.on('engagement:getDailyChallenges', async () => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const playerId = getAuthedPlayerId(socket);
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Authentication required' });
      return;
    }

    try {
      const dbChallenges = await getTodaysChallenges(playerId);
      const challenges = dbChallenges.map(transformDbChallenge);
      safeEmit(socket, 'engagement:dailyChallenges', { challenges });
      logger.debug('ENGAGEMENT', `Sent daily challenges to ${playerId}`);
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('ENGAGEMENT', `Error getting challenges: ${err.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to get challenges' });
    }
  });

  socket.on('engagement:claimChallengeReward', async (data: ClaimChallengePayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const playerId = getAuthedPlayerId(socket);
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Authentication required' });
      return;
    }

    const { challengeId } = data || {};
    if (!challengeId) {
      safeEmit(socket, 'engagement:error', { message: 'Challenge ID required' });
      return;
    }

    try {
      const result: ChallengeRewardResult = await claimChallengeReward(playerId, challengeId);
      safeEmit(socket, 'engagement:rewardClaimed', result);

      if (result.success && result.reward) {
        logger.info('ENGAGEMENT', `Challenge reward claimed: ${result.reward.totalXp} XP for ${playerId}`);
      }
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('ENGAGEMENT', `Error claiming challenge reward: ${err.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to claim reward' });
    }
  });

  // ==================== Streak System ====================

  socket.on('engagement:recordLogin', async () => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const playerId = getAuthedPlayerId(socket);
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Authentication required' });
      return;
    }

    try {
      const loginResult: LoginResultType = await recordLogin(playerId);
      safeEmit(socket, 'engagement:loginResult', loginResult);

      const comebackStatus: ComebackStatusType = await checkComebackBonus(playerId);
      if (comebackStatus.eligible) {
        safeEmit(socket, 'engagement:comebackAvailable', comebackStatus);
      }

      logger.info('ENGAGEMENT', `Login recorded for ${playerId}, streak: ${loginResult.streak}`);
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('ENGAGEMENT', `Error recording login: ${err.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to record login' });
    }
  });

  // ==================== Calendar Rewards ====================

  socket.on('engagement:getCalendarStatus', async () => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const playerId = getAuthedPlayerId(socket);
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Authentication required' });
      return;
    }

    try {
      const status = await getCalendarStatus(playerId);
      safeEmit(socket, 'engagement:calendarStatus', status);
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('ENGAGEMENT', `Error getting calendar status: ${err.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to get calendar status' });
    }
  });

  socket.on('engagement:claimCalendarReward', async () => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const playerId = getAuthedPlayerId(socket);
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Authentication required' });
      return;
    }

    try {
      const result: CalendarRewardResultType = await claimCalendarReward(playerId);
      safeEmit(socket, 'engagement:calendarRewardClaimed', result);

      if (result.success && result.reward) {
        logger.info('ENGAGEMENT', `Calendar reward claimed for day ${result.reward.day} by ${playerId}`);
      }
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('ENGAGEMENT', `Error claiming calendar reward: ${err.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to claim calendar reward' });
    }
  });

  // ==================== Come-back Campaigns ====================

  socket.on('engagement:getComebackStatus', async () => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const playerId = getAuthedPlayerId(socket);
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Authentication required' });
      return;
    }

    try {
      const status: ComebackStatusType = await checkComebackBonus(playerId);
      safeEmit(socket, 'engagement:comebackStatus', status);
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('ENGAGEMENT', `Error getting comeback status: ${err.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to get comeback status' });
    }
  });

  socket.on('engagement:claimComebackBonus', async () => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const playerId = getAuthedPlayerId(socket);
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Authentication required' });
      return;
    }

    try {
      const result: ComebackClaimResultType = await claimComebackBonus(playerId);
      safeEmit(socket, 'engagement:comebackClaimed', result);

      if (result.success && result.bonus) {
        logger.info('ENGAGEMENT', `Comeback bonus claimed by ${playerId}: ${result.bonus.xpMultiplier}x XP`);
      }
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('ENGAGEMENT', `Error claiming comeback bonus: ${err.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to claim comeback bonus' });
    }
  });

  // ==================== Daily Missions ====================

  socket.on('engagement:getDailyMissions', async () => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const playerId = getAuthedPlayerId(socket);
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Authentication required' });
      return;
    }

    try {
      const missions = await getDailyMissions(playerId);
      safeEmit(socket, 'engagement:dailyMissions', { missions });
      logger.debug('ENGAGEMENT', `Sent daily missions to ${playerId}`);
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('ENGAGEMENT', `Error getting daily missions: ${err.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to get daily missions' });
    }
  });

  // NOTE: a former `engagement:completeMission` socket handler let the CLIENT
  // mark any daily slot complete by key. Under condition-based quests that was a
  // bypass/exploit (complete arbitrary slots → Grand Slam XP with no gameplay)
  // and nothing emitted it. Daily quests now complete ONLY server-side via
  // completeDailyQuestsForResult at the game-end seams.

  // ==================== Full Engagement Status ====================

  socket.on('engagement:getStatus', async () => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const playerId = getAuthedPlayerId(socket);
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Authentication required' });
      return;
    }

    try {
      const status = await getEngagementStatus(playerId);
      const dbChallenges = await getTodaysChallenges(playerId);
      const stats = await getChallengeStats(playerId);

      const dailyChallenges = dbChallenges.map(transformDbChallenge);

      safeEmit(socket, 'engagement:status', {
        ...status,
        dailyChallenges,
        challengeStats: stats,
      });
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('ENGAGEMENT', `Error getting engagement status: ${err.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to get engagement status' });
    }
  });

  // ==================== Word of the Day ====================

  socket.on('engagement:getWotd', async (data: { language: string; date?: string }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const { language, date } = data || {};
    if (!language) {
      safeEmit(socket, 'engagement:error', { message: 'Language required' });
      return;
    }

    try {
      const wotd = await getWordOfTheDay(language, date);
      safeEmit(socket, 'engagement:wotd', wotd);
      logger.debug('ENGAGEMENT', `Sent WOTD to socket ${socket.id}`);
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('ENGAGEMENT', `Error getting WOTD: ${err.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to get Word of the Day' });
    }
  });

  socket.on('engagement:recordWotd', async (data: {
    word: string;
    found: boolean;
    language: string;
    date?: string;
  }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const playerId = getAuthedPlayerId(socket);
    if (!playerId) {
      safeEmit(socket, 'engagement:error', { message: 'Authentication required' });
      return;
    }

    const { word, language, found, date } = data || {};
    if (!word || !language) {
      safeEmit(socket, 'engagement:error', { message: 'Word and language required' });
      return;
    }

    try {
      const result = await recordWotdAttempt(playerId, word, found, language, date);
      safeEmit(socket, 'engagement:wotdRecorded', result);

      const stats = await getWotdStats(language, date);
      safeEmit(socket, 'engagement:wotdStats', stats);

      logger.info('ENGAGEMENT', `WOTD attempt recorded for ${playerId}: found=${found}`);
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('ENGAGEMENT', `Error recording WOTD: ${err.message}`);
      safeEmit(socket, 'engagement:error', { message: 'Failed to record Word of the Day attempt' });
    }
  });
}

/**
 * Process game end engagement events
 * Called by gameLifecycleHandler when a game ends
 * @param socket - Player socket
 * @param playerId - Player UUID
 * @param gameStats - Game statistics
 * @param gameCode - Game code
 */
async function processGameEndEngagement(socket: Socket, playerId: string, gameStats: GameStats, gameCode: string): Promise<void> {
  if (!playerId) return;

  try {
    // Daily quest completion is handled by the canonical seam
    // (recordGameResultsToSupabase → completeDailyQuestsForResult), which has the
    // full human roster + per-player words to evaluate condition-based quests.
    // Do NOT hard-complete a slot here — that would credit whatever quest happens
    // to occupy slot 2 regardless of whether its condition was met.

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
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('ENGAGEMENT', `Error processing game end engagement: ${err.message}`);
  }
}

/**
 * Process long word found engagement
 * Called when a player finds a long word (8+ letters)
 * @param socket - Player socket
 * @param playerId - Player UUID
 * @param word - The word found
 * @param gameCode - Game code
 */
async function processLongWordEngagement(socket: Socket, playerId: string, word: string, gameCode: string): Promise<void> {
  if (!playerId || word.length < 8) return;

  try {
    const reward = rollMysteryReward('long_word');
    if (reward) {
      await logMysteryReward(playerId, gameCode, reward);
      safeEmit(socket, 'engagement:mysteryReward', { reward });
      logger.debug('ENGAGEMENT', `Long word reward: ${reward.display} for ${word}`);
    }
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('ENGAGEMENT', `Error processing long word engagement: ${err.message}`);
  }
}

/**
 * Process achievement earned engagement
 * Called when a player earns an achievement
 * @param socket - Player socket
 * @param playerId - Player UUID
 * @param achievementId - Achievement ID
 * @param gameCode - Game code
 */
async function processAchievementEngagement(socket: Socket, playerId: string, achievementId: string, gameCode: string): Promise<void> {
  if (!playerId) return;

  try {
    const reward = rollMysteryReward('achievement');
    if (reward) {
      await logMysteryReward(playerId, gameCode, reward);
      safeEmit(socket, 'engagement:mysteryReward', { reward });
      logger.debug('ENGAGEMENT', `Achievement reward: ${reward.display} for ${achievementId}`);
    }
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('ENGAGEMENT', `Error processing achievement engagement: ${err.message}`);
  }
}

export {
  registerEngagementHandlers,
  processGameEndEngagement,
  processLongWordEngagement,
  processAchievementEngagement,
};
