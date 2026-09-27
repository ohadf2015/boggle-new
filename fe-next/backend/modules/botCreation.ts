/**
 * Bot Creation Utilities
 * Handles bot ID generation, name/avatar generation, and bot object creation.
 */

import { getSeededAvatarConfig, hashString, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { CELEBRITY_BOTS, CELEBRITY_CHANCE } from './botCelebrities';
import type { Bot } from './botBehavior';

const botConfig = require('./botConfig');
const BOT_CONFIG = botConfig.BOT_CONFIG;
import logger from '../utils/logger';

// ==========================================
// Interfaces
// ==========================================

export interface BotAvatar {
  avatarImage?: string;
  customAvatar?: CustomAvatarConfig;
  emoji?: string;
  color?: string;
}

export interface BotNameResult {
  name: string;
  avatar: BotAvatar;
}

export interface GameUser {
  socketId?: string;
  avatar?: BotAvatar | null;
  isHost?: boolean;
  isBot?: boolean;
  [key: string]: unknown;
}

// ==========================================
// ID Generation
// ==========================================

// Bot ID counter per game
const botIdCounters = new Map<string, number>();

/**
 * Generate a unique bot ID for a game
 */
export function generateBotId(gameCode: string): string {
  const counter = (botIdCounters.get(gameCode) || 0) + 1;
  botIdCounters.set(gameCode, counter);
  return `bot-${counter}`;
}

/**
 * Reset bot ID counter for a game (used when cleaning up)
 */
export function resetBotIdCounter(gameCode: string): void {
  botIdCounters.delete(gameCode);
}

// ==========================================
// Name & Avatar Generation
// ==========================================

/**
 * Generate a bot name and avatar based on difficulty and language
 */
export function generateBotName(difficulty: string, existingNames: string[] = [], language: string = 'en'): BotNameResult {
  const langNames = BOT_CONFIG.NAMES[language] || BOT_CONFIG.NAMES.en;
  const namePool = langNames[difficulty] || langNames.medium;
  const botSuffix = langNames.botSuffix || 'Bot';

  // Funny viral twist: sometimes the opponent is a celebrity/politician lookalike
  // (Trump Bot, Bibi Bot, Einstein Bot...) with a handcrafted avatar that caricatures them.
  // Keeps the requested difficulty for timing — only name/avatar/emoji change.
  const availableCelebs = CELEBRITY_BOTS.filter((celeb) =>
    !existingNames.some((existing) => existing.toLowerCase().includes(celeb.name.toLowerCase()))
  );
  if (availableCelebs.length > 0 && Math.random() < CELEBRITY_CHANCE) {
    const celeb = availableCelebs[Math.floor(Math.random() * availableCelebs.length)];
    const botName = `${celeb.name} ${botSuffix}`.trim();
    return {
      name: botName,
      avatar: {
        customAvatar: celeb.customAvatar,
        emoji: celeb.emoji,
        color: celeb.color,
      },
    };
  }

  const availableEntries = namePool.filter((entry: { name: string }) =>
    !existingNames.some((existing: string) =>
      existing.toLowerCase().includes(entry.name.toLowerCase())
    )
  );

  const entry = availableEntries.length > 0
    ? availableEntries[Math.floor(Math.random() * availableEntries.length)]
    : namePool[Math.floor(Math.random() * namePool.length)];

  const suffix = Math.random() > 0.5 ? ` ${Math.floor(Math.random() * 99) + 1}` : '';
  const botName = `${entry.name} ${botSuffix}${suffix}`.trim();

  const customAvatar = getSeededAvatarConfig(hashString(botName));

  return {
    name: botName,
    avatar: {
      customAvatar,
      emoji: entry.emoji,
      color: entry.color,
    },
  };
}

/**
 * Generate a random player name with suited avatar (for players without custom names)
 */
export function generateRandomPlayerName(existingNames: string[] = [], language: string = 'en'): BotNameResult {
  const namePool = BOT_CONFIG.PLAYER_NAMES[language] || BOT_CONFIG.PLAYER_NAMES.en;

  const availableEntries = namePool.filter((entry: { name: string }) =>
    !existingNames.includes(entry.name)
  );

  const entry = availableEntries.length > 0
    ? availableEntries[Math.floor(Math.random() * availableEntries.length)]
    : namePool[Math.floor(Math.random() * namePool.length)];

  const customAvatar = getSeededAvatarConfig(hashString(entry.name));

  return {
    name: entry.name,
    avatar: {
      customAvatar,
      emoji: entry.emoji,
      color: entry.color,
    },
  };
}

/**
 * Get a random generic avatar for OAuth users
 */
export function getRandomGenericAvatar(): BotAvatar {
  const avatars = BOT_CONFIG.GENERIC_AVATARS;
  const legacyAvatar = avatars[Math.floor(Math.random() * avatars.length)];

  const customAvatar = getSeededAvatarConfig(hashString(`generic-${Date.now()}-${Math.random()}`));

  return {
    customAvatar,
    emoji: legacyAvatar.emoji,
    color: legacyAvatar.color,
  };
}

/**
 * Get a random personality type for a bot
 */
export function getRandomPersonality(): string {
  const personalities = Object.keys(BOT_CONFIG.PERSONALITIES);
  return personalities[Math.floor(Math.random() * personalities.length)];
}

// ==========================================
// Bot Object Creation
// ==========================================

/**
 * Create a bot player object
 */
export function createBot(gameCode: string, difficulty: string = 'medium', existingUsers: Record<string, GameUser> = {}, language: string = 'en'): Bot {
  const existingNames = Object.keys(existingUsers);

  const botId = generateBotId(gameCode);
  const { name: botName, avatar } = generateBotName(difficulty, existingNames, language);
  const personality = getRandomPersonality();
  const personalityTraits = BOT_CONFIG.PERSONALITIES[personality];

  const bot: Bot = {
    id: botId,
    gameCode,
    username: botName,
    avatar,
    difficulty: difficulty as 'easy' | 'medium' | 'hard',
    personality,
    isBot: true,
    wordsToFind: [],
    wordsFound: [],
    currentWordIndex: 0,
    score: 0,
    comboLevel: 0,
    inBurstMode: false,
    burstWordsRemaining: 0,
    nextWordTime: null,
    activeTimers: new Set(),
    isActive: false,
    avgThinkingTime: (BOT_CONFIG.TIMING[difficulty].minDelay +
      Math.random() * (BOT_CONFIG.TIMING[difficulty].maxDelay - BOT_CONFIG.TIMING[difficulty].minDelay)) *
      personalityTraits.delayMultiplier,
    typingSpeed: BOT_CONFIG.TIMING[difficulty].typingSpeed * (0.8 + Math.random() * 0.4),
    burstChance: personalityTraits.burstChance,
    pauseChance: personalityTraits.pauseChance || 0,
    comboFocus: personalityTraits.comboFocus,
  };

  logger.debug('BOT', `Created ${difficulty} bot "${botName}" with ${personality} personality`);
  return bot;
}
