/**
 * Bot Behavior Module
 * Handles bot word preparation, timing calculations, and submission logic
 *
 * Extracted from botManager.ts for better separation of concerns
 */

import type { LetterGrid, Language } from '@/shared/types/game';

const { findWordsForBots } = require('./boggleSolver');
const { calculateWordScore } = require('./scoringEngine');
const { BOT_CONFIG } = require('./botConfig');
const { ensureLanguageLoaded } = require('../dictionary');
import logger from '../utils/logger';

// Re-export cache module
export {
  cleanupPlayerWordsCache,
  getCachedPlayerWords,
  getCachedBlacklist,
  clearBehaviorCaches,
  getCacheStats,
  getCachedDifficultyParams,
  getCachedWrongWords,
  addWordToBlacklist,
} from './botBehaviorCache';

import {
  getCachedPlayerWords,
  getCachedBlacklist,
  getCachedDifficultyParams,
  getCachedWrongWords,
} from './botBehaviorCache';
import { incrementBotWordUsage } from './supabaseServer';

// Bot interface
export interface Bot {
  id: string;
  gameCode: string;
  username: string;
  avatar: {
    avatarImage?: string;
    emoji?: string;
    color?: string;
  };
  difficulty: 'easy' | 'medium' | 'hard';
  personality: string;
  isBot: boolean;
  // Language the bot is playing in, stamped at prepareBotWords time.
  // Used to credit times_found_by_bots on the words a bot actually submits.
  language?: Language;
  wordsToFind: string[];
  wordsFound: string[];
  currentWordIndex: number;
  score: number;
  comboLevel: number;
  inBurstMode: boolean;
  burstWordsRemaining: number;
  nextWordTime: number | null;
  activeTimers: Set<ReturnType<typeof setTimeout>>;
  isActive: boolean;
  avgThinkingTime: number;
  typingSpeed: number;
  burstChance: number;
  pauseChance: number;
  comboFocus: boolean;
  dynamicMinDelay?: number;
  dynamicMaxDelay?: number;
  dynamicStartDelay?: number;
}

// Word submission callback data
export interface WordSubmissionData {
  botId: string;
  username: string;
  word: string;
  score: number;
  comboLevel: number;
}

// ==========================================
// Word Generation
// ==========================================

/**
 * Generate fake/wrong words from the grid that look real but aren't in dictionary
 */
export function generateWrongWords(grid: LetterGrid, count: number): string[] {
  if (!grid || !grid.length || !grid[0] || count <= 0) return [];

  const rows = grid.length;
  const cols = grid[0].length;
  const wrongWords: string[] = [];
  const directions: [number, number][] = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  for (let attempt = 0; attempt < count * 3 && wrongWords.length < count; attempt++) {
    const wordLength = 3 + Math.floor(Math.random() * 4);
    let word = '';
    const visited = new Set<string>();

    let row = Math.floor(Math.random() * rows);
    let col = Math.floor(Math.random() * cols);

    for (let i = 0; i < wordLength; i++) {
      const key = `${row},${col}`;
      if (visited.has(key) || row < 0 || row >= rows || col < 0 || col >= cols) break;

      visited.add(key);
      word += grid[row][col].toLowerCase();

      const validMoves = directions.filter(([dr, dc]) => {
        const nr = row + dr;
        const nc = col + dc;
        return nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(`${nr},${nc}`);
      });

      if (validMoves.length === 0) break;
      const [dr, dc] = validMoves[Math.floor(Math.random() * validMoves.length)];
      row += dr;
      col += dc;
    }

    if (word.length >= 2 && !wrongWords.includes(word)) {
      wrongWords.push(word);
    }
  }

  return wrongWords;
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Below this many words in the player-frequency corpus, the distribution is too
// thin to band meaningfully — fall back to the legacy binary prioritization.
// Self-adjusting on corpus size (auto-includes a language once it grows) rather
// than a hardcoded language list. ponytail: count-gate, raise if banding feels noisy.
export const MIN_CORPUS_FOR_BANDING = 200;

/**
 * Reorder a bot's candidate words by REAL player-frequency, banded by difficulty.
 *
 * `rankByWord` maps a word to its 0-based frequency rank (0 = most-submitted), so a
 * word's rankRatio ∈ [0,1] is 0 for the commonest word and ~1 for the rarest. Each
 * word gets a difficulty-dependent weight (easy → favour common, hard → favour rare
 * real words, medium → mild common lean); words absent from the corpus get a small
 * base weight so they still appear (more tolerated for hard bots). Final ordering is
 * weighted-random without replacement (Efraimidis–Spirakis: key = rand^(1/weight),
 * sort desc) — so two bots on the same board don't reveal an identical sequence.
 *
 * `rand` is injectable for deterministic tests.
 */
export function orderWordPoolByFrequencyBand(
  wordPool: string[],
  rankByWord: Map<string, number>,
  corpusSize: number,
  difficulty: 'easy' | 'medium' | 'hard',
  rand: () => number = Math.random,
): string[] {
  const weightFor = (word: string): number => {
    const rank = rankByWord.get(word);
    if (rank === undefined) {
      // Not a known player word — keep it possible, more so for harder bots.
      return difficulty === 'hard' ? 0.5 : difficulty === 'medium' ? 0.3 : 0.05;
    }
    const rankRatio = corpusSize > 1 ? rank / (corpusSize - 1) : 0;
    if (difficulty === 'easy') return Math.pow(1 - rankRatio, 2) + 0.05; // common-heavy
    if (difficulty === 'hard') return 0.25 + rankRatio;                  // rare-leaning
    return 1.1 - rankRatio;                                              // medium: mild common lean
  };

  return [...wordPool]
    .map((word) => {
      const w = Math.max(weightFor(word), 1e-6);
      const u = Math.min(Math.max(rand(), 1e-9), 1); // guard log(0)
      return { word, key: Math.pow(u, 1 / w) };
    })
    .sort((a, b) => b.key - a.key)
    .map((e) => e.word);
}

/**
 * Prepare bot for a game - find words and set up submission queue
 */
export async function prepareBotWords(bot: Bot, grid: LetterGrid, language: Language): Promise<void> {
  const staticConfig = BOT_CONFIG.WORDS[bot.difficulty] || BOT_CONFIG.WORDS.medium;

  bot.language = language;
  const dynamicParams = await getCachedDifficultyParams(language, bot.difficulty);

  const config = {
    maxWordLength: staticConfig.maxWordLength,
    wordsPerMinute: dynamicParams?.adjustedWordsPerMinute ?? staticConfig.wordsPerMinute,
    focusOnShort: staticConfig.focusOnShort,
    missChance: dynamicParams?.adjustedMissChance ?? staticConfig.missChance,
    wrongWordChance: dynamicParams?.adjustedWrongWordChance ?? staticConfig.wrongWordChance,
  };

  if (dynamicParams) {
    bot.dynamicMinDelay = dynamicParams.adjustedMinDelay;
    bot.dynamicMaxDelay = dynamicParams.adjustedMaxDelay;
    bot.dynamicStartDelay = dynamicParams.adjustedStartDelay;
    logger.debug('BOT', `Bot "${bot.username}" using dynamic params: ${config.wordsPerMinute} wpm, ${(config.missChance * 100).toFixed(1)}% miss, ${(config.wrongWordChance * 100).toFixed(1)}% wrong, delays ${dynamicParams.adjustedMinDelay}-${dynamicParams.adjustedMaxDelay}ms`);
  }

  if (!grid || !Array.isArray(grid) || grid.length === 0) {
    logger.warn('BOT', `Bot "${bot.username}" prepareBotWords called with invalid grid`);
    bot.wordsToFind = [];
    return;
  }

  // Ensure the dictionary for this language is loaded before solving
  // Without this, lazy-loaded languages (non-English) may have empty word sets,
  // causing the solver to find 0 words
  await ensureLanguageLoaded(language);

  const categorizedWords = findWordsForBots(grid, language, {
    minLength: 3,
    maxLength: config.maxWordLength
  });

  const totalSolverWords = categorizedWords.easy.length + categorizedWords.medium.length + categorizedWords.hard.length;
  if (totalSolverWords === 0) {
    logger.warn('BOT', `Bot "${bot.username}" solver found 0 words for grid (language: ${language})`);
  }

  let wordPool: string[] = [];

  if (config.focusOnShort) {
    wordPool = [
      ...categorizedWords.easy,
      ...categorizedWords.medium.slice(0, Math.floor(categorizedWords.medium.length * 0.3))
    ];
  } else if (bot.difficulty === 'hard') {
    wordPool = [
      ...categorizedWords.hard,
      ...categorizedWords.medium,
      ...categorizedWords.easy
    ];
  } else {
    wordPool = [
      ...categorizedWords.medium,
      ...categorizedWords.easy.slice(0, Math.floor(categorizedWords.easy.length * 0.7)),
      ...categorizedWords.hard.slice(0, Math.floor(categorizedWords.hard.length * 0.3))
    ];
  }

  const beforeMissFilter = wordPool.length;
  wordPool = wordPool.filter(() => Math.random() > config.missChance);

  if (wordPool.length < 3 && beforeMissFilter >= 3) {
    const allWords = [...categorizedWords.easy, ...categorizedWords.medium, ...categorizedWords.hard];
    const uniqueWords = [...new Set(allWords)];
    wordPool = uniqueWords.slice(0, Math.min(5, uniqueWords.length));
    logger.debug('BOT', `Bot "${bot.username}" missChance filtered too aggressively, restored ${wordPool.length} words`);
  }

  try {
    const blacklist = await getCachedBlacklist(language);
    if (blacklist.size > 0) {
      const beforeCount = wordPool.length;
      wordPool = wordPool.filter(word => !blacklist.has(word.toLowerCase()));
      const filtered = beforeCount - wordPool.length;
      if (filtered > 0) {
        logger.debug('BOT', `Bot "${bot.username}" filtered out ${filtered} blacklisted words`);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.debug('BOT', `Failed to apply blacklist filter: ${message}`);
  }

  try {
    // getCachedPlayerWords returns words already ordered by times_submitted DESC,
    // so the array index IS the frequency rank — no extra query needed.
    const playerWords = await getCachedPlayerWords(language);
    if (playerWords.length >= MIN_CORPUS_FOR_BANDING) {
      const rankByWord = new Map(playerWords.map((w, i) => [w, i]));
      wordPool = orderWordPoolByFrequencyBand(wordPool, rankByWord, playerWords.length, bot.difficulty);
      logger.debug('BOT', `Bot "${bot.username}" frequency-banded ${wordPool.length} words (${bot.difficulty}, corpus ${playerWords.length})`);
    } else if (playerWords.length > 0) {
      // Corpus too thin to band — keep the legacy binary prioritization.
      const playerSet = new Set(playerWords);
      const prioritizedWords: string[] = [];
      const otherWords: string[] = [];

      for (const word of wordPool) {
        if (playerSet.has(word)) {
          prioritizedWords.push(word);
        } else {
          otherWords.push(word);
        }
      }

      shuffleArray(prioritizedWords);
      shuffleArray(otherWords);

      wordPool = [...prioritizedWords, ...otherWords];

      if (prioritizedWords.length > 0) {
        logger.debug('BOT', `Bot "${bot.username}" prioritizing ${prioritizedWords.length} player-submitted words (thin corpus)`);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.debug('BOT', `Player word prioritization failed: ${message}`);
    shuffleArray(wordPool);
  }

  const wrongWordChance = config.wrongWordChance || 0;
  if (wrongWordChance > 0) {
    const wrongWordCount = Math.ceil(wordPool.length * wrongWordChance);

    let wrongWords: string[] = [];
    try {
      const realWrongWords = await getCachedWrongWords(language, 100);
      if (realWrongWords.length > 0) {
        const shuffledWrongWords = [...realWrongWords].sort(() => Math.random() - 0.5);
        wrongWords = shuffledWrongWords.slice(0, wrongWordCount);
        logger.debug('BOT', `Bot "${bot.username}" using ${wrongWords.length} real player wrong words`);
      }
    } catch {
      // Fall back to generated wrong words
    }

    if (wrongWords.length < wrongWordCount) {
      const generatedCount = wrongWordCount - wrongWords.length;
      const generatedWords = generateWrongWords(grid, generatedCount);
      wrongWords = [...wrongWords, ...generatedWords];
    }

    for (const wrongWord of wrongWords) {
      if (!wordPool.includes(wrongWord)) {
        const insertPos = Math.floor(Math.random() * wordPool.length);
        wordPool.splice(insertPos, 0, wrongWord);
      }
    }

    logger.debug('BOT', `Bot "${bot.username}" will try ${wrongWords.length} wrong words`);
  }

  bot.wordsToFind = wordPool;
  bot.wordsFound = [];
  bot.currentWordIndex = 0;
  bot.score = 0;
  bot.comboLevel = 0;
  bot.inBurstMode = false;
  bot.burstWordsRemaining = 0;

  logger.debug('BOT', `Bot "${bot.username}" prepared ${wordPool.length} words to find`);
}

// ==========================================
// Timing Calculations
// ==========================================

/**
 * Calculate delay until next word submission (human-like timing)
 */
export function calculateNextDelay(bot: Bot): number {
  const staticTiming = BOT_CONFIG.TIMING[bot.difficulty] || BOT_CONFIG.TIMING.medium;

  const minDelay = bot.dynamicMinDelay ?? staticTiming.minDelay;
  const maxDelay = bot.dynamicMaxDelay ?? staticTiming.maxDelay;

  if (!bot.inBurstMode && Math.random() < (bot.burstChance || 0.15)) {
    bot.inBurstMode = true;
    bot.burstWordsRemaining = 2 + Math.floor(Math.random() * 3);
    logger.debug('BOT', `Bot "${bot.username}" entering burst mode (${bot.burstWordsRemaining} words)`);
  }

  if (bot.inBurstMode && bot.burstWordsRemaining > 0) {
    bot.burstWordsRemaining--;
    if (bot.burstWordsRemaining === 0) {
      bot.inBurstMode = false;
      logger.debug('BOT', `Bot "${bot.username}" exiting burst mode`);
    }
    return Math.round(500 + Math.random() * 1500);
  }

  if (bot.pauseChance && Math.random() < bot.pauseChance) {
    logger.debug('BOT', `Bot "${bot.username}" taking a thinking pause`);
    return Math.round(8000 + Math.random() * 7000);
  }

  let delay = minDelay + Math.random() * (maxDelay - minDelay);

  const nextWord = bot.wordsToFind[bot.currentWordIndex];
  if (nextWord) {
    delay += nextWord.length * bot.typingSpeed;
  }

  if (Math.random() < 0.12) {
    delay += 1000 + Math.random() * 3000;
  }

  if (bot.comboLevel > 0) {
    const comboSpeedBoost = bot.comboFocus ? 0.07 : 0.05;
    delay *= Math.max(0.5, 1 - (bot.comboLevel * comboSpeedBoost));
  }

  delay *= 0.9 + Math.random() * 0.2;

  return Math.round(delay);
}

// ==========================================
// Word Submission
// ==========================================

/**
 * Submit a word from the bot
 */
export async function submitBotWord(
  bot: Bot,
  onWordSubmit: ((data: WordSubmissionData) => number | boolean | void | Promise<number | boolean | void>) | null
): Promise<void> {
  if (!bot.isActive || bot.currentWordIndex >= bot.wordsToFind.length) {
    return;
  }

  const word = bot.wordsToFind[bot.currentWordIndex];
  bot.currentWordIndex++;

  if (bot.wordsFound.includes(word)) {
    return;
  }

  const score = calculateWordScore(word, bot.comboLevel);

  let accepted = true;
  let credited = score;
  if (onWordSubmit && typeof onWordSubmit === 'function') {
    const result = await onWordSubmit({
      botId: bot.id,
      username: bot.username,
      word,
      score,
      comboLevel: bot.comboLevel,
    });
    if (result === false) accepted = false;
    // Numeric return = the actual credited total (base + blast/wordHunt bonus).
    // Must use typeof === 'number' rather than truthy check so a legitimate 0
    // doesn't collapse to the reject path.
    else if (typeof result === 'number') credited = result;
  }

  if (!accepted) {
    bot.comboLevel = 0;
    return;
  }

  bot.wordsFound.push(word);
  bot.score += credited;
  bot.comboLevel++;

  // Credit the word the bot actually found so the player_words corpus knows
  // which words bots use (times_found_by_bots). Fire-and-forget: never block
  // the bot loop or fail a game on a DB hiccup.
  if (bot.language) {
    void incrementBotWordUsage(word, bot.language);
  }

  logger.debug('BOT', `Bot "${bot.username}" submitted "${word}" (score: ${score}, combo: ${bot.comboLevel})`);
}

// CommonJS exports for backward compatibility
module.exports = {
  // Word preparation
  prepareBotWords,
  orderWordPoolByFrequencyBand,
  MIN_CORPUS_FOR_BANDING,
  generateWrongWords,

  // Timing
  calculateNextDelay,

  // Word submission
  submitBotWord,

  // Cache management (re-exported from botBehaviorCache)
  ...require('./botBehaviorCache'),
};
