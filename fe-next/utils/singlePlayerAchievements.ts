/**
 * Single Player Achievement Calculator
 * Client-side achievement logic for single player mode
 * Note: These achievements are NOT saved to the profile - only multiplayer achievements are saved
 */

// Achievement icons (same as backend)
export const ACHIEVEMENT_ICONS: Record<string, string> = {
  FIRST_BLOOD: '🎯',
  SPEED_DEMON: '⚡',
  WORD_MASTER: '📚',
  COMBO_KING: '🔥',
  PERFECTIONIST: '✨',
  LEXICON: '🏆',
  WORDSMITH: '🎓',
  QUICK_THINKER: '💨',
  LONG_HAULER: '🏃',
  DIVERSE_VOCABULARY: '🌈',
  DOUBLE_TROUBLE: '⚡⚡',
  TREASURE_HUNTER: '💎',
  TRIPLE_THREAT: '🎰',
  UNSTOPPABLE: '🚀',
  COMEBACK_KID: '🔄',
  DICTIONARY_DIVER: '📖',
  LIGHTNING_ROUND: '⚡',
  RARE_GEM: '💠',
  EXPLORER: '🧭',
  STREAK_MASTER: '🔥',
  ANAGRAM_ARTIST: '🔀',
  WORD_ARCHITECT: '🏛️',
  SPEED_LEGEND: '🏎️',
  COMBO_GOD: '👑',
  VOCABULARY_TITAN: '🗿',
  PRECISION_MASTER: '🎯',
  LONG_WORD_CHAIN: '🔗',
  MINIMALIST: '🎯',
  CLUTCH_PLAYER: '💪',
};

export interface SinglePlayerAchievement {
  key: string;
  icon: string;
}

export interface WordData {
  word: string;
  score: number;
  timestamp: number;
  timeSinceStart: number;
  isValid: boolean;
  comboBonus?: number;
}

interface AchievementState {
  achievements: string[];
  firstWordFound: boolean;
  maxCombo: number;
}

/**
 * Check live achievements during gameplay
 * Called when a word is validated
 */
export function checkLiveAchievements(
  state: AchievementState,
  validatedWords: WordData[],
  currentWord: string,
  currentWordValid: boolean,
  timeSinceStart: number,
  currentCombo: number,
  gameDuration: number
): SinglePlayerAchievement[] {
  const newAchievements: SinglePlayerAchievement[] = [];
  const minWordLength = 2;

  // Scale thresholds based on game duration (normalize to 180s baseline)
  const timeScale = gameDuration / 180;
  const halfGameTime = gameDuration * 0.5;
  const earlyGameTime = gameDuration * 0.17;

  const addAchievement = (key: string): void => {
    if (!state.achievements.includes(key)) {
      state.achievements.push(key);
      newAchievements.push({ key, icon: ACHIEVEMENT_ICONS[key] });
    }
  };

  // Track max combo
  if (currentCombo > state.maxCombo) {
    state.maxCombo = currentCombo;
  }

  // First Blood - first valid word meeting minimum length requirement
  if (!state.firstWordFound && currentWordValid && currentWord.length >= minWordLength) {
    state.firstWordFound = true;
    addAchievement('FIRST_BLOOD');
  }

  // Word Master - 7+ letter word
  if (currentWord.length >= 7 && currentWordValid) {
    addAchievement('WORD_MASTER');
  }

  // Treasure Hunter - 8+ letter word
  if (currentWord.length >= 8 && currentWordValid) {
    addAchievement('TREASURE_HUNTER');
  }

  // Rare Gem - 9+ letter word
  if (currentWord.length >= 9 && currentWordValid) {
    addAchievement('RARE_GEM');
  }

  // Quick Thinker - valid word within first 1.5% of game
  const quickThinkerTime = Math.max(2, gameDuration * 0.015);
  if (timeSinceStart <= quickThinkerTime && currentWordValid) {
    addAchievement('QUICK_THINKER');
  }

  const validatedWordCount = validatedWords.length;

  // Speed Demon - scaled word count in first half of game
  const speedDemonThreshold = Math.ceil(40 * timeScale);
  if (validatedWordCount >= speedDemonThreshold && timeSinceStart <= halfGameTime) {
    addAchievement('SPEED_DEMON');
  }

  // Combo King - reach combo level 25+
  if (currentCombo >= 25) {
    addAchievement('COMBO_KING');
  }

  // Wordsmith - 50 valid words
  if (validatedWordCount >= 50) {
    addAchievement('WORDSMITH');
  }

  // Lexicon - 65+ valid words
  if (validatedWordCount >= 65) {
    addAchievement('LEXICON');
  }

  // Double Trouble - 2 valid words within 1 second
  if (validatedWords.length >= 2) {
    const lastTwo = validatedWords.slice(-2);
    if (lastTwo[1].timeSinceStart - lastTwo[0].timeSinceStart <= 1) {
      addAchievement('DOUBLE_TROUBLE');
    }
  }

  // Triple Threat - 3 valid words within 3 seconds
  if (validatedWords.length >= 3) {
    const lastThree = validatedWords.slice(-3);
    if (lastThree[2].timeSinceStart - lastThree[0].timeSinceStart <= 3) {
      addAchievement('TRIPLE_THREAT');
    }
  }

  // Lightning Round - scaled word count in first ~17% of game
  const lightningThreshold = Math.ceil(20 * timeScale);
  if (validatedWordCount >= lightningThreshold && timeSinceStart <= earlyGameTime) {
    addAchievement('LIGHTNING_ROUND');
  }

  // Unstoppable - 75+ valid words
  if (validatedWordCount >= 75) {
    addAchievement('UNSTOPPABLE');
  }

  // Streak Master - 30+ combo streak
  if (currentCombo >= 30) {
    addAchievement('STREAK_MASTER');
  }

  // Comeback Kid - valid word in last 2% of game
  const comebackTime = Math.max(2, gameDuration * 0.02);
  if (timeSinceStart >= (gameDuration - comebackTime) && currentWordValid) {
    addAchievement('COMEBACK_KID');
  }

  // Anagram Artist - 2 consecutive valid words that are anagrams
  if (validatedWords.length >= 2) {
    const lastTwo = validatedWords.slice(-2);
    const word1 = lastTwo[0].word.toLowerCase();
    const word2 = lastTwo[1].word.toLowerCase();
    if (word1.length === word2.length && word1 !== word2) {
      const sorted1 = word1.split('').sort().join('');
      const sorted2 = word2.split('').sort().join('');
      if (sorted1 === sorted2) {
        addAchievement('ANAGRAM_ARTIST');
      }
    }
  }

  // Word Architect - 7 words of 7+ letters
  const longWords = validatedWords.filter(w => w.word.length >= 7);
  if (longWords.length >= 7) {
    addAchievement('WORD_ARCHITECT');
  }

  // Speed Legend - scaled word count in first half of game
  const speedLegendThreshold = Math.ceil(50 * timeScale);
  if (validatedWordCount >= speedLegendThreshold && timeSinceStart <= halfGameTime) {
    addAchievement('SPEED_LEGEND');
  }

  // Combo God - 35+ combo streak
  if (currentCombo >= 35) {
    addAchievement('COMBO_GOD');
  }

  // Vocabulary Titan - 85+ valid words
  if (validatedWordCount >= 85) {
    addAchievement('VOCABULARY_TITAN');
  }

  // Long Word Chain - 4 consecutive words of 6+ letters
  if (validatedWords.length >= 4) {
    const lastFour = validatedWords.slice(-4);
    if (lastFour.every(w => w.word.length >= 6)) {
      addAchievement('LONG_WORD_CHAIN');
    }
  }

  return newAchievements;
}

/**
 * Calculate final achievements after game ends
 * Called with all validated words
 */
export function calculateFinalAchievements(
  validatedWords: WordData[],
  allWords: WordData[],
  gameDuration: number,
  maxCombo: number
): SinglePlayerAchievement[] {
  const achievements: string[] = [];
  const result: SinglePlayerAchievement[] = [];

  const addAchievement = (key: string): void => {
    if (!achievements.includes(key)) {
      achievements.push(key);
      result.push({ key, icon: ACHIEVEMENT_ICONS[key] });
    }
  };

  // Scale thresholds based on game duration
  const timeScale = gameDuration / 180;
  const halfGameTime = gameDuration * 0.5;
  const earlyGameTime = gameDuration * 0.17;

  // First Blood - any valid word (should have been earned live, but check anyway)
  if (validatedWords.length > 0) {
    addAchievement('FIRST_BLOOD');
  }

  // Word Master - 7+ letter word
  if (validatedWords.some(w => w.word.length >= 7)) {
    addAchievement('WORD_MASTER');
  }

  // Treasure Hunter - 8+ letter word
  if (validatedWords.some(w => w.word.length >= 8)) {
    addAchievement('TREASURE_HUNTER');
  }

  // Rare Gem - 9+ letter word
  if (validatedWords.some(w => w.word.length >= 9)) {
    addAchievement('RARE_GEM');
  }

  // Speed Demon - scaled word count in first half of game
  const speedDemonThreshold = Math.ceil(40 * timeScale);
  const wordsInHalfGame = validatedWords.filter(w => w.timeSinceStart <= halfGameTime);
  if (wordsInHalfGame.length >= speedDemonThreshold) {
    addAchievement('SPEED_DEMON');
  }

  // Lexicon - 65+ valid words (scaled)
  const lexiconThreshold = Math.ceil(65 * timeScale);
  if (validatedWords.length >= lexiconThreshold) {
    addAchievement('LEXICON');
  }

  // Combo King - max combo 25+
  if (maxCombo >= 25) {
    addAchievement('COMBO_KING');
  }

  // Perfectionist - all words valid AND scaled word count
  const perfectionistThreshold = Math.ceil(35 * timeScale);
  if (allWords.length >= perfectionistThreshold && allWords.every(w => w.isValid)) {
    addAchievement('PERFECTIONIST');
  }

  // Wordsmith - scaled word count
  const wordsmithThreshold = Math.ceil(50 * timeScale);
  if (validatedWords.length >= wordsmithThreshold) {
    addAchievement('WORDSMITH');
  }

  // Diverse Vocabulary - words of at least 7 different lengths
  const uniqueLengths = new Set(validatedWords.map(w => w.word.length));
  if (uniqueLengths.size >= 7) {
    addAchievement('DIVERSE_VOCABULARY');
  }

  // Explorer - words of 8+ different lengths
  if (uniqueLengths.size >= 8) {
    addAchievement('EXPLORER');
  }

  // Dictionary Diver - scaled word count
  const dictionaryDiverThreshold = Math.ceil(65 * timeScale);
  if (validatedWords.length >= dictionaryDiverThreshold) {
    addAchievement('DICTIONARY_DIVER');
  }

  // Unstoppable - scaled word count
  const unstoppableThreshold = Math.ceil(75 * timeScale);
  if (validatedWords.length >= unstoppableThreshold) {
    addAchievement('UNSTOPPABLE');
  }

  // Lightning Round - scaled word count in first ~17% of game
  const lightningThreshold = Math.ceil(20 * timeScale);
  const wordsInEarlyGame = validatedWords.filter(w => w.timeSinceStart <= earlyGameTime);
  if (wordsInEarlyGame.length >= lightningThreshold) {
    addAchievement('LIGHTNING_ROUND');
  }

  // Comeback Kid - valid word in last 2% of game
  const comebackTime = Math.max(2, gameDuration * 0.02);
  if (validatedWords.some(w => w.timeSinceStart >= (gameDuration - comebackTime))) {
    addAchievement('COMEBACK_KID');
  }

  // Anagram Artist - found consecutive anagram words
  for (let i = 0; i < validatedWords.length - 1; i++) {
    const word1 = validatedWords[i].word.toLowerCase();
    const word2 = validatedWords[i + 1].word.toLowerCase();
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
  const longWords = validatedWords.filter(w => w.word.length >= 7);
  if (longWords.length >= 7) {
    addAchievement('WORD_ARCHITECT');
  }

  // Speed Legend - scaled word count in first half of game
  const speedLegendThreshold = Math.ceil(50 * timeScale);
  if (wordsInHalfGame.length >= speedLegendThreshold) {
    addAchievement('SPEED_LEGEND');
  }

  // Streak Master - max combo 30+
  if (maxCombo >= 30) {
    addAchievement('STREAK_MASTER');
  }

  // Combo God - max combo 35+
  if (maxCombo >= 35) {
    addAchievement('COMBO_GOD');
  }

  // Vocabulary Titan - scaled word count
  const vocabularyTitanThreshold = Math.ceil(85 * timeScale);
  if (validatedWords.length >= vocabularyTitanThreshold) {
    addAchievement('VOCABULARY_TITAN');
  }

  // Precision Master - scaled word count with 100% accuracy
  const precisionThreshold = Math.ceil(45 * timeScale);
  if (allWords.length >= precisionThreshold && allWords.every(w => w.isValid)) {
    addAchievement('PRECISION_MASTER');
  }

  // Long Word Chain - 4 consecutive words of 6+ letters
  for (let i = 0; i < validatedWords.length - 3; i++) {
    if (
      validatedWords[i].word.length >= 6 &&
      validatedWords[i + 1].word.length >= 6 &&
      validatedWords[i + 2].word.length >= 6 &&
      validatedWords[i + 3].word.length >= 6
    ) {
      addAchievement('LONG_WORD_CHAIN');
      break;
    }
  }

  // Minimalist - All valid words are 4+ letters (no 2-3 letter words), scaled word count
  const minimalistThreshold = Math.ceil(20 * timeScale);
  if (validatedWords.length >= minimalistThreshold && validatedWords.every(w => w.word.length >= 4)) {
    addAchievement('MINIMALIST');
  }

  // Clutch Player - 3+ valid words in last 6% of game
  const clutchTime = Math.max(3, gameDuration * 0.06);
  const clutchWords = validatedWords.filter(w => w.timeSinceStart >= (gameDuration - clutchTime));
  if (clutchWords.length >= 3) {
    addAchievement('CLUTCH_PLAYER');
  }

  // Quick Thinker - valid word within first 1.5% of game
  const quickThinkerTime = Math.max(2, gameDuration * 0.015);
  if (validatedWords.some(w => w.timeSinceStart <= quickThinkerTime)) {
    addAchievement('QUICK_THINKER');
  }

  // Double Trouble - 2 valid words within 1 second
  for (let i = 0; i < validatedWords.length - 1; i++) {
    if (validatedWords[i + 1].timeSinceStart - validatedWords[i].timeSinceStart <= 1) {
      addAchievement('DOUBLE_TROUBLE');
      break;
    }
  }

  // Triple Threat - 3 valid words within 3 seconds
  for (let i = 0; i < validatedWords.length - 2; i++) {
    if (validatedWords[i + 2].timeSinceStart - validatedWords[i].timeSinceStart <= 3) {
      addAchievement('TRIPLE_THREAT');
      break;
    }
  }

  return result;
}

/**
 * Create initial achievement state for tracking during gameplay
 */
export function createAchievementState(): AchievementState {
  return {
    achievements: [],
    firstWordFound: false,
    maxCombo: 0,
  };
}
