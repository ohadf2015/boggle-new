/**
 * Bot Manager
 * Manages AI bot players for Boggle games
 *
 * REFACTORED: Core functionality extracted into focused modules:
 * - botConfig.ts        - Configuration constants (TIMING, WORDS, AVATARS, NAMES, PERSONALITIES)
 * - botBehavior.ts      - Word preparation, timing calculations, submission logic
 * - botCreation.ts      - Bot ID/name/avatar generation, bot object creation
 * - botLifecycle.ts     - Timer management, startBot/stopBot, word scheduling
 *
 * This file acts as a facade for bot CRUD management and re-exports all functionality.
 */

import type { LetterGrid, Language } from '@/shared/types/game';
import {
  createBot,
  generateBotId as _generateBotId,
  generateBotName as _generateBotName,
  resetBotIdCounter,
  type GameUser,
} from './botCreation';
import { startBot as _startBot, stopBot as _stopBot } from './botLifecycle';
import { BOT_CONFIG } from './botConfig';
import {
  prepareBotWords,
  cleanupPlayerWordsCache,
  clearBehaviorCaches,
  getCacheStats,
  addWordToBlacklist,
  type Bot,
  type WordSubmissionData,
} from './botBehavior';
import { getRecentGames } from '../services/playerGameHistory';
import { calculatePlayerLevel, selectBotDifficulty } from '../services/adaptiveDifficulty';
import logger from '../utils/logger';

// Re-export types
export type { Bot, WordSubmissionData };

// Re-export configuration
export { BOT_CONFIG };

// Re-export creation utilities
export {
  generateRandomPlayerName,
  getRandomGenericAvatar,
  type BotAvatar,
  type BotNameResult,
  type GameUser,
} from './botCreation';

// Re-export lifecycle
export { startBot, stopBot, resyncBotsForNewGrid } from './botLifecycle';

// Re-export blacklist management
export { addWordToBlacklist };

// Re-export behavior cache management (imported from botBehavior)
export { prepareBotWords, cleanupPlayerWordsCache };

// ==========================================
// Interfaces
// ==========================================

export interface BotStats {
  username: string;
  difficulty: string;
  wordsFound: number;
  score: number;
  comboLevel: number;
  isActive: boolean;
}

export interface BotManagerStats {
  activeGames: number;
  activeBots: number;
  activeTimers: number;
  playerWordsCacheSize: number;
  playerWordsCacheLanguages: string[];
  blacklistCacheSize: number;
  blacklistCacheLanguages: string[];
}

// ==========================================
// State Management
// ==========================================

// Active bots per game
const gameBots = new Map<string, Map<string, Bot>>();

// ==========================================
// Bot Management CRUD
// ==========================================

export function initializeGameBots(gameCode: string): Map<string, Bot> {
  if (!gameBots.has(gameCode)) {
    gameBots.set(gameCode, new Map());
  }
  return gameBots.get(gameCode)!;
}

export function addBot(gameCode: string, difficulty: string = 'medium', existingUsers: Record<string, GameUser> = {}, language: string = 'en'): Bot {
  const bots = initializeGameBots(gameCode);
  const bot = createBot(gameCode, difficulty, existingUsers, language);

  bots.set(bot.id, bot);
  logger.info('BOT', `Added ${difficulty} bot "${bot.username}" (${language}) to game ${gameCode}`);

  return bot;
}

/**
 * Re-register a bot AI instance for a game rehydrated from Redis after a server
 * restart. The in-memory Bot was lost, but its identity survived on the
 * `game.users` entry (username key, `playerId`, `avatar`, `botDifficulty`).
 *
 * Reconstruct it PRESERVING username / id / avatar so it maps back to the same
 * player slot — scores (`game.playerScores`) and word-hunt life
 * (`wordHuntState.playerLives`) are keyed by username, so a fresh random name
 * would orphan the bot. Behaviour fields (personality, timing) are freshly
 * randomised; they aren't persisted and don't need to match.
 *
 * No-op (returns null) if a bot with this username is already registered, so a
 * normal live reconnect never double-spawns.
 */
export function restoreBotFromUser(
  gameCode: string,
  username: string,
  user: { playerId?: string | null; avatar?: unknown; botDifficulty?: string },
  language: string = 'en',
): Bot | null {
  const bots = initializeGameBots(gameCode);
  for (const existing of bots.values()) {
    if (existing.username === username) return null;
  }

  const bot = createBot(gameCode, user.botDifficulty || 'medium', {}, language);
  bot.username = username;
  if (user.playerId) bot.id = String(user.playerId);
  if (user.avatar) bot.avatar = user.avatar as Bot['avatar'];
  bots.set(bot.id, bot);
  logger.info('BOT', `Restored bot "${username}" (${bot.difficulty}) to game ${gameCode} after rehydration`);
  return bot;
}

export async function addBotWithAdaptiveDifficulty(
  gameCode: string,
  userId?: string,
  manualDifficulty: string = 'medium',
  existingUsers: Record<string, GameUser> = {},
  language: string = 'en'
): Promise<Bot> {
  let difficulty = manualDifficulty;

  if (userId) {
    try {
      const recentGames = await getRecentGames(userId);
      const playerLevel = await calculatePlayerLevel(recentGames);
      difficulty = selectBotDifficulty(playerLevel);

      logger.info('ADAPTIVE_DIFFICULTY', `User ${userId} level: ${playerLevel}, bot difficulty: ${difficulty}`);
    } catch (error) {
      logger.error('ADAPTIVE_DIFFICULTY', `Failed to calculate adaptive difficulty for ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      difficulty = manualDifficulty;
    }
  }

  return addBot(gameCode, difficulty, existingUsers, language);
}

export function removeBot(gameCode: string, botIdOrUsername: string): boolean {
  const bots = gameBots.get(gameCode);
  if (!bots) return false;

  let botToRemove: Bot | null = null;
  for (const [id, bot] of bots) {
    if (id === botIdOrUsername || bot.username === botIdOrUsername) {
      botToRemove = bot;
      break;
    }
  }

  if (!botToRemove) return false;

  _stopBot(botToRemove);
  bots.delete(botToRemove.id);
  logger.info('BOT', `Removed bot "${botToRemove.username}" from game ${gameCode}`);

  return true;
}

export function getGameBots(gameCode: string): Bot[] {
  const bots = gameBots.get(gameCode);
  if (!bots) return [];
  return Array.from(bots.values());
}

export function getBotByUsername(gameCode: string, username: string): Bot | null {
  const bots = gameBots.get(gameCode);
  if (!bots) return null;

  for (const bot of bots.values()) {
    if (bot.username === username) return bot;
  }
  return null;
}

export function isBot(gameCode: string, username: string): boolean {
  return getBotByUsername(gameCode, username) !== null;
}

// ==========================================
// Game Lifecycle
// ==========================================

export function stopAllBots(gameCode: string): void {
  const bots = gameBots.get(gameCode);
  if (!bots) return;

  for (const bot of bots.values()) {
    _stopBot(bot);
  }

  logger.info('BOT', `Stopped all bots in game ${gameCode}`);
}

export function cleanupGameBots(gameCode: string): void {
  stopAllBots(gameCode);
  gameBots.delete(gameCode);
  resetBotIdCounter(gameCode);
  logger.info('BOT', `Cleaned up bots for game ${gameCode}`);
}

// ==========================================
// Bot State Management
// ==========================================

export function resetBotCombo(gameCode: string, username: string): void {
  const bot = getBotByUsername(gameCode, username);
  if (bot) {
    bot.comboLevel = 0;
  }
}

/**
 * Reset every bot's per-round in-memory state at the start of a new round.
 *
 * Bots are created once per room and REUSED across rounds. The classic driver
 * re-zeroes a bot via prepareBotWords, but the dedicated blast/wheel-rush drivers
 * never call it — so a reused bot kept a stale-high `bot.score`, which made
 * `shouldBotScore` reject every word and freeze the bot at 0. This is the bot-side
 * mirror of scoreManager.resetScoresForNewRound (which zeroes game.playerScores),
 * and is invoked together with it from resetGameForNewRound.
 */
export function resetBotsForNewRound(gameCode: string): void {
  for (const bot of getGameBots(gameCode)) {
    bot.score = 0;
    bot.comboLevel = 0;
    bot.wordsFound = [];
    bot.currentWordIndex = 0;
  }
}

export function getBotStats(gameCode: string, username: string): BotStats | null {
  const bot = getBotByUsername(gameCode, username);
  if (!bot) return null;

  return {
    username: bot.username,
    difficulty: bot.difficulty,
    wordsFound: bot.wordsFound.length,
    score: bot.score,
    comboLevel: bot.comboLevel,
    isActive: bot.isActive,
  };
}

export function getBotManagerStats(): BotManagerStats {
  let totalActiveBots = 0;
  let totalActiveTimers = 0;
  const gameCount = gameBots.size;

  for (const bots of gameBots.values()) {
    for (const bot of bots.values()) {
      if (bot.isActive) {
        totalActiveBots++;
        totalActiveTimers += bot.activeTimers.size;
      }
    }
  }

  return {
    activeGames: gameCount,
    activeBots: totalActiveBots,
    activeTimers: totalActiveTimers,
    ...getCacheStats(),
  };
}

export function clearBotManagerCaches(): void {
  clearBehaviorCaches();
}

