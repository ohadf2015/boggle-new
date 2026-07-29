/**
 * Achievement Definitions and Checking Logic
 * Handles in-game achievement tracking and awarding
 */

import type { Game, WordDetail } from '@/shared/types/game';
const { translations } = require('../../translations/index.js');
import logger from '../utils/logger';
import { hasNoVowels, hasAllVowels, isQWithoutU, isLongIsogram, LEVIATHAN_MIN_LENGTH } from './achievements/wordFeats';

// Achievement icons (language-independent)
export const ACHIEVEMENT_ICONS: Record<string, string> = {
  FIRST_BLOOD: '🎯',
  SPEED_DEMON: '⚡',
  WORD_MASTER: '📚',
  COMBO_KING: '🔥',
  PERFECTIONIST: '✨',
  LEXICON: '🏆',
  WORDSMITH: '🎓',
  QUICK_THINKER: '💨',
  DIVERSE_VOCABULARY: '🌈',
  DOUBLE_TROUBLE: '⚡⚡',
  TREASURE_HUNTER: '💎',
  // Existing achievements
  TRIPLE_THREAT: '🎰',
  UNSTOPPABLE: '🚀',
  COMEBACK_KID: '🔄',
  DICTIONARY_DIVER: '📖',
  LIGHTNING_ROUND: '⚡',
  RARE_GEM: '💠',
  EXPLORER: '🧭',
  STREAK_MASTER: '🔥',
  ANAGRAM_ARTIST: '🔀',
  // New elite achievements
  WORD_ARCHITECT: '🏛️',      // Find 5 words of 7+ letters
  SPEED_LEGEND: '🏎️',        // 30 words in 90 seconds
  COMBO_GOD: '👑',            // Reach 25+ combo streak
  VOCABULARY_TITAN: '🗿',     // 60+ valid words
  PRECISION_MASTER: '🎯',     // 30+ words with 100% accuracy
  LONG_WORD_CHAIN: '🔗',      // 4 consecutive words of 6+ letters

  // New competitive/style achievements
  MINIMALIST: '🎯',           // Win with only 4+ letter words (no 2-3 letter words)
  WORD_SNIPER: '🔫',          // Find 5+ unique words no other player found
  PHOTO_FINISH: '📸',         // Win by less than 5 points in multiplayer
  CLUTCH_PLAYER: '💪',        // Find 3+ valid words in the last 10 seconds

  // LIFETIME/CAREER ACHIEVEMENTS (tracked across all games)
  VETERAN: '🎖️',              // Play 50 games total
  CENTURION: '💯',            // Play 100 games total
  WORD_COLLECTOR: '📚',       // Find 1000 total valid words across all games
  WORD_HOARDER: '🗃️',         // Find 5000 total valid words across all games
  CHAMPION: '🏅',             // Win 25 games total
  LEGEND: '👑',               // Win 100 games total
  POINT_MASTER: '💰',         // Accumulate 10000 total points
  POINT_KING: '💎',           // Accumulate 50000 total points
  DEDICATION: '🔥',           // Play games on 7 different days
  LOYAL_PLAYER: '⭐',         // Play games on 30 different days

  // NEW
  EARLY_BIRD: '🐦',           // First valid word within 2 seconds of game start
  PALINDROME_HUNTER: '🪞',    // Submitted a palindrome word of 4+ letters
  COMEBACK_CHAMPION: '🦾',    // Won MP after late-game push from behind
  FIRST_GAME_WIN: '🌱',       // Win first ever game

  // RARE "word feat" achievements — clever word properties (Hall of Fame)
  CONSONANT_CULT: '🧩',       // A valid 4+ letter word with NO vowels (rhythm, crypt)
  VOWEL_HOARDER: '🌀',        // One word containing every vowel A,E,I,O,U
  ROGUE_Q: '🦂',              // A valid word with Q and no U (qi, qat, qoph)
  LEVIATHAN: '🐋',            // A monster 12+ letter word
  NO_REPEATS: '🔷',           // An 8+ letter isogram (every letter distinct)
  FLAWLESS_VICTORY: '🛡️',     // Won a game without a single invalid submission
};

export interface Achievement {
  name: string;
  description: string;
  icon: string;
}

export interface NewAchievement {
  key: string;
  icon: string;
}

export interface UserStats {
  gamesPlayed?: number;
  gamesWon?: number;
  totalWordsFound?: number;
  totalScore?: number;
  uniqueDaysPlayed?: number;
}

export interface LifetimeThreshold {
  stat: keyof UserStats;
  threshold: number;
}

// Extended word detail for achievement checking
interface WordDetailWithTimestamp extends WordDetail {
  timeSinceStart?: number;
  timestamp?: number;
}

// Extended game type for achievement checking
interface GameWithAchievements extends Game {
  firstWordFound?: boolean;
  gameDuration?: number;
  playerCombos?: Record<string, number>;
  startTime?: number;
}

/**
 * Get localized achievements based on locale
 */
export function getLocalizedAchievements(locale: string = 'he'): Record<string, Achievement> {
  const supportedLocale = ['he', 'en', 'sv', 'ja', 'es'].includes(locale) ? locale : 'he';
  const t = translations[supportedLocale].achievements;

  const achievements: Record<string, Achievement> = {};
  Object.keys(ACHIEVEMENT_ICONS).forEach(key => {
    if (!t[key]) {
      // Fallback for missing translation - use English or key name
      logger.warn('ACHIEVEMENT', `Missing translation for ${key} in locale ${supportedLocale}`);
      achievements[key] = {
        name: key.replace(/_/g, ' '),
        description: `Achievement: ${key}`,
        icon: ACHIEVEMENT_ICONS[key]
      };
    } else {
      achievements[key] = {
        name: t[key].name,
        description: t[key].description,
        icon: ACHIEVEMENT_ICONS[key]
      };
    }
  });

  return achievements;
}

// Legacy support - default to Hebrew
export const ACHIEVEMENTS = getLocalizedAchievements('he');

/**
 * Check and award LIVE achievements during gameplay (selective achievements only)
 */
export function checkLiveAchievements(
  game: Game,
  username: string,
  word: string,
  timeSinceStart: number
): NewAchievement[] {
  const gameWithAchievements = game as GameWithAchievements;

  // Ensure playerAchievements is initialized (defensive check for bots and edge cases)
  if (!game.playerAchievements) {
    game.playerAchievements = {};
  }
  if (!game.playerAchievements[username]) {
    game.playerAchievements[username] = [];
  }
  const achievements = game.playerAchievements[username];
  const newAchievements: NewAchievement[] = [];

  // Get all word details for this player
  const allWordDetails = (game.playerWordDetails?.[username] || []) as WordDetailWithTimestamp[];

  // Filter to only count ACTUALLY validated words
  const validatedWordDetails = allWordDetails.filter(w => w.validated === true || w.autoValidated === true);
  const validatedWordCount = validatedWordDetails.length;

  // Check if the current word is valid
  const currentWordDetails = allWordDetails.find(w => w.word.toLowerCase() === word.toLowerCase());
  const isCurrentWordValid = currentWordDetails
    ? (currentWordDetails.validated === true || currentWordDetails.autoValidated === true)
    : false;

  // Helper to add achievement
  const addAchievementAndReturn = (key: string): NewAchievement => {
    achievements.push(key);
    return { key, icon: ACHIEVEMENT_ICONS[key] };
  };

  // First Blood - first valid word meeting minimum length requirement (LIVE)
  const minWordLength = game.minWordLength || 2;
  if (!gameWithAchievements.firstWordFound && isCurrentWordValid && word.length >= minWordLength && !achievements.includes('FIRST_BLOOD')) {
    gameWithAchievements.firstWordFound = true;
    newAchievements.push(addAchievementAndReturn('FIRST_BLOOD'));
  }

  // Word Master - 7+ letter word (LIVE) - only if valid
  if (word.length >= 7 && isCurrentWordValid && !achievements.includes('WORD_MASTER')) {
    newAchievements.push(addAchievementAndReturn('WORD_MASTER'));
  }

  // Treasure Hunter - 8+ letter word (LIVE) - only if valid
  if (word.length >= 8 && isCurrentWordValid && !achievements.includes('TREASURE_HUNTER')) {
    newAchievements.push(addAchievementAndReturn('TREASURE_HUNTER'));
  }

  // Get game duration for time-scaled achievements
  const gameDuration = gameWithAchievements.gameDuration || 180;
  const timeScale = gameDuration / 180;
  const halfGameTime = gameDuration * 0.5;
  const earlyGameTime = gameDuration * 0.17;

  // Quick Thinker - valid word within first 1.5% of game (LIVE)
  const quickThinkerTime = Math.max(2, gameDuration * 0.015);
  if (timeSinceStart <= quickThinkerTime && isCurrentWordValid && !achievements.includes('QUICK_THINKER')) {
    newAchievements.push(addAchievementAndReturn('QUICK_THINKER'));
  }

  // Speed Demon - scaled word count in first half of game (LIVE)
  const speedDemonThreshold = Math.ceil(40 * timeScale);
  if (validatedWordCount >= speedDemonThreshold && timeSinceStart <= halfGameTime && !achievements.includes('SPEED_DEMON')) {
    newAchievements.push(addAchievementAndReturn('SPEED_DEMON'));
  }

  // Combo King - reach combo level 25+ (LIVE)
  const currentComboForKing = gameWithAchievements.playerCombos?.[username] || 0;
  if (currentComboForKing >= 25 && !achievements.includes('COMBO_KING')) {
    newAchievements.push(addAchievementAndReturn('COMBO_KING'));
  }

  // Wordsmith - 50 valid words (LIVE)
  if (validatedWordCount >= 50 && !achievements.includes('WORDSMITH')) {
    newAchievements.push(addAchievementAndReturn('WORDSMITH'));
  }

  // Lexicon - 65+ valid words (LIVE)
  if (validatedWordCount >= 65 && !achievements.includes('LEXICON')) {
    newAchievements.push(addAchievementAndReturn('LEXICON'));
  }

  // Double Trouble - 2 valid words within 1 second (LIVE)
  if (validatedWordDetails.length >= 2 && !achievements.includes('DOUBLE_TROUBLE')) {
    const lastTwo = validatedWordDetails.slice(-2);
    const t1 = lastTwo[0].timeSinceStart || 0;
    const t2 = lastTwo[1].timeSinceStart || 0;
    if (t2 - t1 <= 1) {
      newAchievements.push(addAchievementAndReturn('DOUBLE_TROUBLE'));
    }
  }

  // Triple Threat - 3 valid words within 3 seconds (LIVE)
  if (validatedWordDetails.length >= 3 && !achievements.includes('TRIPLE_THREAT')) {
    const lastThree = validatedWordDetails.slice(-3);
    const t1 = lastThree[0].timeSinceStart || 0;
    const t3 = lastThree[2].timeSinceStart || 0;
    if (t3 - t1 <= 3) {
      newAchievements.push(addAchievementAndReturn('TRIPLE_THREAT'));
    }
  }

  // Rare Gem - 9+ letter valid word (LIVE)
  if (word.length >= 9 && isCurrentWordValid && !achievements.includes('RARE_GEM')) {
    newAchievements.push(addAchievementAndReturn('RARE_GEM'));
  }

  // Lightning Round - scaled word count in first ~17% of game (LIVE)
  const lightningThreshold = Math.ceil(20 * timeScale);
  if (validatedWordCount >= lightningThreshold && timeSinceStart <= earlyGameTime && !achievements.includes('LIGHTNING_ROUND')) {
    newAchievements.push(addAchievementAndReturn('LIGHTNING_ROUND'));
  }

  // Unstoppable - 75+ valid words (LIVE)
  if (validatedWordCount >= 75 && !achievements.includes('UNSTOPPABLE')) {
    newAchievements.push(addAchievementAndReturn('UNSTOPPABLE'));
  }

  // Streak Master - 30+ combo streak (LIVE)
  const currentCombo = gameWithAchievements.playerCombos?.[username] || 0;
  if (currentCombo >= 30 && !achievements.includes('STREAK_MASTER')) {
    newAchievements.push(addAchievementAndReturn('STREAK_MASTER'));
  }

  // Comeback Kid - valid word in last 2% of game (LIVE)
  const comebackTime = Math.max(2, gameDuration * 0.02);
  if (timeSinceStart >= (gameDuration - comebackTime) && isCurrentWordValid && !achievements.includes('COMEBACK_KID')) {
    newAchievements.push(addAchievementAndReturn('COMEBACK_KID'));
  }

  // Anagram Artist - found 2 consecutive valid words that are anagrams of each other (LIVE)
  if (validatedWordDetails.length >= 2 && !achievements.includes('ANAGRAM_ARTIST')) {
    const lastTwo = validatedWordDetails.slice(-2);
    const word1 = lastTwo[0].word.toLowerCase();
    const word2 = lastTwo[1].word.toLowerCase();
    if (word1.length === word2.length && word1 !== word2) {
      const sorted1 = word1.split('').sort().join('');
      const sorted2 = word2.split('').sort().join('');
      if (sorted1 === sorted2) {
        newAchievements.push(addAchievementAndReturn('ANAGRAM_ARTIST'));
      }
    }
  }

  // Word Architect - 7 words of 7+ letters (LIVE)
  const longWords = validatedWordDetails.filter(w => w.word.length >= 7);
  if (longWords.length >= 7 && !achievements.includes('WORD_ARCHITECT')) {
    newAchievements.push(addAchievementAndReturn('WORD_ARCHITECT'));
  }

  // Speed Legend - scaled word count in first half of game (LIVE)
  const speedLegendThreshold = Math.ceil(50 * timeScale);
  if (validatedWordCount >= speedLegendThreshold && timeSinceStart <= halfGameTime && !achievements.includes('SPEED_LEGEND')) {
    newAchievements.push(addAchievementAndReturn('SPEED_LEGEND'));
  }

  // Combo God - 35+ combo streak (LIVE)
  if (currentCombo >= 35 && !achievements.includes('COMBO_GOD')) {
    newAchievements.push(addAchievementAndReturn('COMBO_GOD'));
  }

  // Vocabulary Titan - 85+ valid words (LIVE)
  if (validatedWordCount >= 85 && !achievements.includes('VOCABULARY_TITAN')) {
    newAchievements.push(addAchievementAndReturn('VOCABULARY_TITAN'));
  }

  // Long Word Chain - 4 consecutive words of 6+ letters (LIVE)
  if (validatedWordDetails.length >= 4 && !achievements.includes('LONG_WORD_CHAIN')) {
    const lastFour = validatedWordDetails.slice(-4);
    if (lastFour.every(w => w.word.length >= 6)) {
      newAchievements.push(addAchievementAndReturn('LONG_WORD_CHAIN'));
    }
  }

  // Early Bird - first valid word within 2 seconds of game start
  if (timeSinceStart <= 2 && isCurrentWordValid && !achievements.includes('EARLY_BIRD')) {
    newAchievements.push(addAchievementAndReturn('EARLY_BIRD'));
  }

  // Palindrome Hunter - palindrome word of 4+ letters
  if (word.length >= 4 && isCurrentWordValid && !achievements.includes('PALINDROME_HUNTER')) {
    const lower = word.toLowerCase();
    if (lower === lower.split('').reverse().join('')) {
      newAchievements.push(addAchievementAndReturn('PALINDROME_HUNTER'));
    }
  }

  // ── Rare "word feat" achievements (Hall of Fame) ──────────────────────────
  // Consonant Cult - a valid 4+ letter word with NO vowels (rhythm, crypt, nymph)
  if (isCurrentWordValid && !achievements.includes('CONSONANT_CULT') && hasNoVowels(word)) {
    newAchievements.push(addAchievementAndReturn('CONSONANT_CULT'));
  }

  // Vowel Hoarder - one word containing every vowel A, E, I, O, U (sequoia)
  if (isCurrentWordValid && !achievements.includes('VOWEL_HOARDER') && hasAllVowels(word)) {
    newAchievements.push(addAchievementAndReturn('VOWEL_HOARDER'));
  }

  // Rogue Q - a valid word with Q and no U (qi, qat, qoph)
  if (isCurrentWordValid && !achievements.includes('ROGUE_Q') && isQWithoutU(word)) {
    newAchievements.push(addAchievementAndReturn('ROGUE_Q'));
  }

  // Leviathan - a monster 12+ letter word
  if (isCurrentWordValid && !achievements.includes('LEVIATHAN') && word.length >= LEVIATHAN_MIN_LENGTH) {
    newAchievements.push(addAchievementAndReturn('LEVIATHAN'));
  }

  // No Repeats - an 8+ letter isogram (every letter distinct)
  if (isCurrentWordValid && !achievements.includes('NO_REPEATS') && isLongIsogram(word)) {
    newAchievements.push(addAchievementAndReturn('NO_REPEATS'));
  }

  return newAchievements;
}

/**
 * Check and award achievements for a word submission
 */
export function checkAndAwardAchievements(
  gameCode: string,
  username: string,
  word: string
): NewAchievement[] {
  // Import here to avoid circular dependency at module load time
  const { getGame } = require('./gameStateManager');

  const game = getGame(gameCode) as GameWithAchievements | null;
  if (!game || !game.playerAchievements || !game.playerAchievements[username]) {
    return [];
  }

  const currentTime = Date.now();
  const timeSinceStart = game.startTime ? (currentTime - game.startTime) / 1000 : 0;

  const newAchievements = checkLiveAchievements(game, username, word, timeSinceStart);

  if (newAchievements.length > 0) {
    logger.debug('ACHIEVEMENT', `${username} earned: ${newAchievements.map(a => a.key).join(', ')}`);
  }

  return newAchievements;
}

/**
 * Get achievements for a specific player in a game
 */
export function getPlayerAchievements(gameCode: string, username: string): string[] {
  const { getGame } = require('./gameStateManager');

  const game = getGame(gameCode);
  if (!game || !game.playerAchievements || !game.playerAchievements[username]) {
    return [];
  }

  return game.playerAchievements[username];
}

/**
 * Award final achievements after validation (post-game)
 */
export function awardFinalAchievements(game: Game, users: string[]): void {
  logger.debug('ACHIEVEMENT', `Awarding final achievements for ${users.length} players`);
  const gameWithAchievements = game as GameWithAchievements;

  if (!game.playerAchievements) {
    game.playerAchievements = {};
  }
  if (!game.playerWordDetails) {
    game.playerWordDetails = {};
  }

  users.forEach(username => {
    if (!game.playerWordDetails[username]) {
      logger.debug('ACHIEVEMENT', `Player ${username} missing word details during achievement calculation`);
      return;
    }

    if (!game.playerAchievements[username]) {
      game.playerAchievements[username] = [];
    }

    const userData = game.users?.[username];
    const isBot = userData?.isBot === true;
    if (isBot) {
      logger.debug('ACHIEVEMENT', `Calculating achievements for bot ${username}`);
    }

    const allWords = game.playerWordDetails[username] as WordDetailWithTimestamp[];
    const validWords = allWords.filter(w => w.validated === true);
    const currentAchievements = game.playerAchievements[username];

    const addAchievement = (achievementKey: string): void => {
      if (!currentAchievements.includes(achievementKey)) {
        currentAchievements.push(achievementKey);
      }
    };

    const gameDuration = gameWithAchievements.gameDuration || 180;
    const timeScale = gameDuration / 180;
    const halfGameTime = gameDuration * 0.5;
    const earlyGameTime = gameDuration * 0.17;

    // Word Master - 7+ letter word (validated)
    if (validWords.some(w => w.word.length >= 7)) {
      addAchievement('WORD_MASTER');
    }

    // Speed Demon - scaled word count in first half of game
    const speedDemonThreshold = Math.ceil(40 * timeScale);
    const wordsInHalfGame = validWords.filter(w => (w.timeSinceStart || 0) <= halfGameTime);
    if (wordsInHalfGame.length >= speedDemonThreshold) {
      addAchievement('SPEED_DEMON');
    }

    // Lexicon - 65+ valid words (scales slightly with game time)
    const lexiconThreshold = Math.ceil(65 * timeScale);
    if (validWords.length >= lexiconThreshold) {
      addAchievement('LEXICON');
    }

    // Perfectionist - all words valid AND scaled word count
    const perfectionistThreshold = Math.ceil(35 * timeScale);
    if (allWords.length >= perfectionistThreshold && allWords.every(w => w.validated === true)) {
      addAchievement('PERFECTIONIST');
    }

    // Wordsmith - scaled word count
    const wordsmithThreshold = Math.ceil(50 * timeScale);
    if (validWords.length >= wordsmithThreshold) {
      addAchievement('WORDSMITH');
    }

    // Diverse Vocabulary - found words of at least 7 different lengths
    const uniqueLengths = new Set(validWords.map(w => w.word.length));
    if (uniqueLengths.size >= 7) {
      addAchievement('DIVERSE_VOCABULARY');
    }

    // Treasure Hunter - found an 8+ letter word (validated)
    if (validWords.some(w => w.word.length >= 8)) {
      addAchievement('TREASURE_HUNTER');
    }

    // Rare Gem - 9+ letter word (validated)
    if (validWords.some(w => w.word.length >= 9)) {
      addAchievement('RARE_GEM');
    }

    // Explorer - found words of 8+ different lengths (validated)
    if (uniqueLengths.size >= 8) {
      addAchievement('EXPLORER');
    }

    // Dictionary Diver - scaled word count
    const dictionaryDiverThreshold = Math.ceil(65 * timeScale);
    if (validWords.length >= dictionaryDiverThreshold) {
      addAchievement('DICTIONARY_DIVER');
    }

    // Unstoppable - scaled word count
    const unstoppableThreshold = Math.ceil(75 * timeScale);
    if (validWords.length >= unstoppableThreshold) {
      addAchievement('UNSTOPPABLE');
    }

    // Lightning Round - scaled word count in first ~17% of game
    const lightningThreshold = Math.ceil(20 * timeScale);
    const wordsInEarlyGame = validWords.filter(w => (w.timeSinceStart || 0) <= earlyGameTime);
    if (wordsInEarlyGame.length >= lightningThreshold) {
      addAchievement('LIGHTNING_ROUND');
    }

    // Comeback Kid - found a valid word in last 2% of game
    const comebackTime = Math.max(2, gameDuration * 0.02);
    if (validWords.some(w => (w.timeSinceStart || 0) >= (gameDuration - comebackTime))) {
      addAchievement('COMEBACK_KID');
    }

    // Anagram Artist - found consecutive anagram words (post-validation)
    for (let i = 0; i < validWords.length - 1; i++) {
      const word1 = validWords[i].word.toLowerCase();
      const word2 = validWords[i + 1].word.toLowerCase();
      if (word1.length === word2.length && word1 !== word2) {
        const sorted1 = word1.split('').sort().join('');
        const sorted2 = word2.split('').sort().join('');
        if (sorted1 === sorted2) {
          addAchievement('ANAGRAM_ARTIST');
          break;
        }
      }
    }

    // Word Architect - 7 words of 7+ letters
    const longWords = validWords.filter(w => w.word.length >= 7);
    if (longWords.length >= 7) {
      addAchievement('WORD_ARCHITECT');
    }

    // Speed Legend - scaled word count in first half of game
    const speedLegendThreshold = Math.ceil(50 * timeScale);
    if (wordsInHalfGame.length >= speedLegendThreshold) {
      addAchievement('SPEED_LEGEND');
    }

    // Vocabulary Titan - scaled word count
    const vocabularyTitanThreshold = Math.ceil(85 * timeScale);
    if (validWords.length >= vocabularyTitanThreshold) {
      addAchievement('VOCABULARY_TITAN');
    }

    // Precision Master - scaled word count with 100% accuracy
    const precisionThreshold = Math.ceil(45 * timeScale);
    if (allWords.length >= precisionThreshold && allWords.every(w => w.validated === true)) {
      addAchievement('PRECISION_MASTER');
    }

    // Long Word Chain - check for 4 consecutive words of 6+ letters
    for (let i = 0; i < validWords.length - 3; i++) {
      if (validWords[i].word.length >= 6 &&
          validWords[i + 1].word.length >= 6 &&
          validWords[i + 2].word.length >= 6 &&
          validWords[i + 3].word.length >= 6) {
        addAchievement('LONG_WORD_CHAIN');
        break;
      }
    }

    // Minimalist - All valid words are 4+ letters (no 2-3 letter words)
    const minimalistThreshold = Math.ceil(20 * timeScale);
    if (validWords.length >= minimalistThreshold && validWords.every(w => w.word.length >= 4)) {
      addAchievement('MINIMALIST');
    }

    // Clutch Player - 3+ valid words in last 6% of game
    const clutchTime = Math.max(3, gameDuration * 0.06);
    const clutchWords = validWords.filter(w => (w.timeSinceStart || 0) >= (gameDuration - clutchTime));
    if (clutchWords.length >= 3) {
      addAchievement('CLUTCH_PLAYER');
    }
  });

  // Cross-player achievements (require comparing all players)
  const allPlayerWords: Record<string, Set<string>> = {};
  const playerScores: Record<string, number> = {};

  users.forEach(username => {
    const userData = game.users?.[username];
    if (userData?.isBot) return;

    const validWords = (game.playerWordDetails[username] || [])
      .filter(w => w.validated === true)
      .map(w => w.word.toLowerCase());
    allPlayerWords[username] = new Set(validWords);

    let score = 0;
    validWords.forEach(word => {
      score += word.length - 1;
    });
    playerScores[username] = score;
  });

  const humanPlayers = users.filter(u => !game.users?.[u]?.isBot);

  if (humanPlayers.length > 1) {
    const wordOccurrences: Record<string, number> = {};
    Object.values(allPlayerWords).forEach(wordSet => {
      wordSet.forEach(word => {
        wordOccurrences[word] = (wordOccurrences[word] || 0) + 1;
      });
    });

    humanPlayers.forEach(username => {
      const playerWordSet = allPlayerWords[username] || new Set();
      const currentAchievements = game.playerAchievements[username];

      // Word Sniper - 5+ unique words no other player found
      const uniqueWords = [...playerWordSet].filter(word => wordOccurrences[word] === 1);
      if (uniqueWords.length >= 5 && !currentAchievements.includes('WORD_SNIPER')) {
        currentAchievements.push('WORD_SNIPER');
      }

      // Photo Finish - Win by less than 5 points
      const myScore = playerScores[username] || 0;
      const otherScores = Object.entries(playerScores)
        .filter(([u]) => u !== username)
        .map(([, s]) => s);
      const maxOtherScore = Math.max(...otherScores, 0);

      if (myScore > maxOtherScore && myScore - maxOtherScore < 5 && !currentAchievements.includes('PHOTO_FINISH')) {
        currentAchievements.push('PHOTO_FINISH');
      }

      // Flawless Victory - won the game without a single invalid submission
      // (and put up a real game: 10+ valid words). Rare + deeply satisfying.
      const myAllWords = (game.playerWordDetails[username] || []);
      const myValidCount = myAllWords.filter(w => w.validated === true).length;
      if (
        myScore > maxOtherScore &&
        myAllWords.length >= 10 &&
        myValidCount >= 10 &&
        myAllWords.every(w => w.validated === true) &&
        !currentAchievements.includes('FLAWLESS_VICTORY')
      ) {
        currentAchievements.push('FLAWLESS_VICTORY');
      }

      // Comeback Champion - winner whose total points scored in last 25% of game
      // exceeded their total from the first 75%, AND they won.
      const myWords = (game.playerWordDetails[username] || [])
        .filter(w => w.validated === true) as WordDetailWithTimestamp[];
      const gameDuration = (gameWithAchievements.gameDuration || 180);
      const lateThreshold = gameDuration * 0.75;
      const lateScore = myWords
        .filter(w => (w.timeSinceStart || 0) >= lateThreshold)
        .reduce((sum, w) => sum + Math.max(w.word.length - 1, 0), 0);
      const earlyScore = myWords
        .filter(w => (w.timeSinceStart || 0) < lateThreshold)
        .reduce((sum, w) => sum + Math.max(w.word.length - 1, 0), 0);

      if (
        myScore > maxOtherScore &&
        lateScore > earlyScore &&
        !currentAchievements.includes('COMEBACK_CHAMPION')
      ) {
        currentAchievements.push('COMEBACK_CHAMPION');
      }
    });
  }
}

/**
 * Check and award lifetime/career achievements based on cumulative stats
 */
export function checkLifetimeAchievements(
  userStats: UserStats,
  existingAchievements: string[] = []
): NewAchievement[] {
  const newAchievements: NewAchievement[] = [];
  const existing = new Set(existingAchievements);

  const addIfNew = (key: string): void => {
    if (!existing.has(key)) {
      newAchievements.push({ key, icon: ACHIEVEMENT_ICONS[key] });
      existing.add(key);
    }
  };

  // Games played achievements
  if ((userStats.gamesPlayed || 0) >= 50) {
    addIfNew('VETERAN');
  }
  if ((userStats.gamesPlayed || 0) >= 100) {
    addIfNew('CENTURION');
  }

  // Words found achievements
  if ((userStats.totalWordsFound || 0) >= 1000) {
    addIfNew('WORD_COLLECTOR');
  }
  if ((userStats.totalWordsFound || 0) >= 5000) {
    addIfNew('WORD_HOARDER');
  }

  // Games won achievements
  if ((userStats.gamesWon || 0) >= 1) {
    addIfNew('FIRST_GAME_WIN');
  }
  if ((userStats.gamesWon || 0) >= 25) {
    addIfNew('CHAMPION');
  }
  if ((userStats.gamesWon || 0) >= 100) {
    addIfNew('LEGEND');
  }

  // Points accumulated achievements
  if ((userStats.totalScore || 0) >= 10000) {
    addIfNew('POINT_MASTER');
  }
  if ((userStats.totalScore || 0) >= 50000) {
    addIfNew('POINT_KING');
  }

  // Days played achievements
  if (userStats.uniqueDaysPlayed) {
    if (userStats.uniqueDaysPlayed >= 7) {
      addIfNew('DEDICATION');
    }
    if (userStats.uniqueDaysPlayed >= 30) {
      addIfNew('LOYAL_PLAYER');
    }
  }

  if (newAchievements.length > 0) {
    logger.debug('ACHIEVEMENT', `Lifetime achievements earned: ${newAchievements.map(a => a.key).join(', ')}`);
  }

  return newAchievements;
}

// Export lifetime achievement thresholds for UI display
export const LIFETIME_ACHIEVEMENT_THRESHOLDS: Record<string, LifetimeThreshold> = {
  FIRST_GAME_WIN: { stat: 'gamesWon', threshold: 1 },
  VETERAN: { stat: 'gamesPlayed', threshold: 50 },
  CENTURION: { stat: 'gamesPlayed', threshold: 100 },
  WORD_COLLECTOR: { stat: 'totalWordsFound', threshold: 1000 },
  WORD_HOARDER: { stat: 'totalWordsFound', threshold: 5000 },
  CHAMPION: { stat: 'gamesWon', threshold: 25 },
  LEGEND: { stat: 'gamesWon', threshold: 100 },
  POINT_MASTER: { stat: 'totalScore', threshold: 10000 },
  POINT_KING: { stat: 'totalScore', threshold: 50000 },
  DEDICATION: { stat: 'uniqueDaysPlayed', threshold: 7 },
  LOYAL_PLAYER: { stat: 'uniqueDaysPlayed', threshold: 30 },
};

// CommonJS exports for backward compatibility
module.exports = {
  ACHIEVEMENTS,
  ACHIEVEMENT_ICONS,
  getLocalizedAchievements,
  checkLiveAchievements,
  awardFinalAchievements,
  checkLifetimeAchievements,
  LIFETIME_ACHIEVEMENT_THRESHOLDS,
  checkAndAwardAchievements,
  getPlayerAchievements
};
