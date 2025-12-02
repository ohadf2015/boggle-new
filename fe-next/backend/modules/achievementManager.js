// Achievement definitions and checking logic
const { translations } = require('../../translations/index.js');
const logger = require('../utils/logger');

// Achievement icons (language-independent)
const ACHIEVEMENT_ICONS = {
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
  LETTER_POPPER: '🎈',
  // New elite achievements
  WORD_ARCHITECT: '🏛️',      // Find 3 words of 7+ letters
  SPEED_LEGEND: '🏎️',        // 25 words in 90 seconds
  COMBO_GOD: '👑',            // Reach 20+ combo streak
  VOCABULARY_TITAN: '🗿',     // 50+ valid words
  PRECISION_MASTER: '🎯',     // 25+ words with 100% accuracy
  LONG_WORD_CHAIN: '🔗',      // 3 consecutive words of 6+ letters
};

// Get localized achievements based on locale
const getLocalizedAchievements = (locale = 'he') => {
  const supportedLocale = ['he', 'en', 'sv', 'ja'].includes(locale) ? locale : 'he';
  const t = translations[supportedLocale].achievements;

  const achievements = {};
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
};

// Legacy support - default to Hebrew
const ACHIEVEMENTS = getLocalizedAchievements('he');

// Check and award LIVE achievements during gameplay (selective achievements only)
const checkLiveAchievements = (game, username, word, timeSinceStart) => {
  const achievements = game.playerAchievements[username];
  const newAchievements = [];

  // Return unlocalized achievements (key + icon only) - frontend will localize using player's language

  // Get all word details for this player
  const allWordDetails = game.playerWordDetails?.[username] || [];

  // Filter to only count validated words (validated !== false)
  // Words with validated=null are pending (not yet rejected), so we count them for live achievements
  // Words with validated=false are explicitly rejected (wrong words)
  const validatedWordDetails = allWordDetails.filter(w => w.validated !== false);
  const validatedWordCount = validatedWordDetails.length;

  // Check if the current word being submitted is validated (not rejected)
  const currentWordDetails = allWordDetails.find(w => w.word.toLowerCase() === word.toLowerCase());
  const isCurrentWordValid = currentWordDetails ? currentWordDetails.validated !== false : true;

  // Helper to add achievement - returns unlocalized object with key and icon
  const addAchievementAndReturn = (key) => {
    achievements.push(key);
    return { key, icon: ACHIEVEMENT_ICONS[key] };
  };

  // First Blood - first valid word in the game (LIVE)
  if (!game.firstWordFound && isCurrentWordValid && !achievements.includes('FIRST_BLOOD')) {
    game.firstWordFound = true;
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

  // Quick Thinker - valid word within 2 seconds (LIVE) - VERY HARD
  if (timeSinceStart <= 2 && isCurrentWordValid && !achievements.includes('QUICK_THINKER')) {
    newAchievements.push(addAchievementAndReturn('QUICK_THINKER'));
  }

  // Speed Demon - 25 valid words in 90 seconds (LIVE) - VERY HARD
  if (validatedWordCount >= 25 && timeSinceStart <= 90 && !achievements.includes('SPEED_DEMON')) {
    newAchievements.push(addAchievementAndReturn('SPEED_DEMON'));
  }

  // Combo King - reach combo level 15+ (LIVE) - VERY HARD (now based on actual combo, not word count)
  const currentComboForKing = game.playerCombos?.[username] || 0;
  if (currentComboForKing >= 15 && !achievements.includes('COMBO_KING')) {
    newAchievements.push(addAchievementAndReturn('COMBO_KING'));
  }

  // Wordsmith - 30 valid words (LIVE) - HARDER
  if (validatedWordCount >= 30 && !achievements.includes('WORDSMITH')) {
    newAchievements.push(addAchievementAndReturn('WORDSMITH'));
  }

  // Lexicon - 40+ valid words (LIVE) - VERY HARD
  if (validatedWordCount >= 40 && !achievements.includes('LEXICON')) {
    newAchievements.push(addAchievementAndReturn('LEXICON'));
  }

  // Double Trouble - 2 valid words within 1 second (LIVE) - VERY HARD
  if (validatedWordDetails.length >= 2 && !achievements.includes('DOUBLE_TROUBLE')) {
    const lastTwo = validatedWordDetails.slice(-2);
    if (lastTwo[1].timeSinceStart - lastTwo[0].timeSinceStart <= 1) {
      newAchievements.push(addAchievementAndReturn('DOUBLE_TROUBLE'));
    }
  }

  // Triple Threat - 3 valid words within 3 seconds (LIVE) - VERY HARD
  if (validatedWordDetails.length >= 3 && !achievements.includes('TRIPLE_THREAT')) {
    const lastThree = validatedWordDetails.slice(-3);
    if (lastThree[2].timeSinceStart - lastThree[0].timeSinceStart <= 3) {
      newAchievements.push(addAchievementAndReturn('TRIPLE_THREAT'));
    }
  }

  // Rare Gem - 9+ letter valid word (LIVE)
  if (word.length >= 9 && isCurrentWordValid && !achievements.includes('RARE_GEM')) {
    newAchievements.push(addAchievementAndReturn('RARE_GEM'));
  }

  // Lightning Round - 12 valid words in first 30 seconds (LIVE) - VERY HARD
  if (validatedWordCount >= 12 && timeSinceStart <= 30 && !achievements.includes('LIGHTNING_ROUND')) {
    newAchievements.push(addAchievementAndReturn('LIGHTNING_ROUND'));
  }

  // Unstoppable - 55+ valid words (LIVE) - VERY HARD
  if (validatedWordCount >= 55 && !achievements.includes('UNSTOPPABLE')) {
    newAchievements.push(addAchievementAndReturn('UNSTOPPABLE'));
  }

  // Streak Master - 22+ combo streak (LIVE) - VERY HARD
  const currentCombo = game.playerCombos?.[username] || 0;
  if (currentCombo >= 22 && !achievements.includes('STREAK_MASTER')) {
    newAchievements.push(addAchievementAndReturn('STREAK_MASTER'));
  }

  // Comeback Kid - valid word in last 3 seconds (LIVE) - VERY HARD
  const gameDuration = game.gameDuration || 180; // Default 3 minutes
  if (timeSinceStart >= (gameDuration - 3) && isCurrentWordValid && !achievements.includes('COMEBACK_KID')) {
    newAchievements.push(addAchievementAndReturn('COMEBACK_KID'));
  }

  // Anagram Artist - found 2 consecutive valid words that are anagrams of each other (LIVE)
  if (validatedWordDetails.length >= 2 && !achievements.includes('ANAGRAM_ARTIST')) {
    const lastTwo = validatedWordDetails.slice(-2);
    const word1 = lastTwo[0].word.toLowerCase();
    const word2 = lastTwo[1].word.toLowerCase();
    // Check if same length and same letters (anagram)
    if (word1.length === word2.length && word1 !== word2) {
      const sorted1 = word1.split('').sort().join('');
      const sorted2 = word2.split('').sort().join('');
      if (sorted1 === sorted2) {
        newAchievements.push(addAchievementAndReturn('ANAGRAM_ARTIST'));
      }
    }
  }

  // NEW ELITE ACHIEVEMENTS

  // Word Architect - 5 words of 7+ letters (LIVE) - ELITE
  const longWords = validatedWordDetails.filter(w => w.word.length >= 7);
  if (longWords.length >= 5 && !achievements.includes('WORD_ARCHITECT')) {
    newAchievements.push(addAchievementAndReturn('WORD_ARCHITECT'));
  }

  // Speed Legend - 30 words in 90 seconds (LIVE) - ELITE
  if (validatedWordCount >= 30 && timeSinceStart <= 90 && !achievements.includes('SPEED_LEGEND')) {
    newAchievements.push(addAchievementAndReturn('SPEED_LEGEND'));
  }

  // Combo God - 25+ combo streak (LIVE) - ELITE
  if (currentCombo >= 25 && !achievements.includes('COMBO_GOD')) {
    newAchievements.push(addAchievementAndReturn('COMBO_GOD'));
  }

  // Vocabulary Titan - 60+ valid words (LIVE) - ELITE
  if (validatedWordCount >= 60 && !achievements.includes('VOCABULARY_TITAN')) {
    newAchievements.push(addAchievementAndReturn('VOCABULARY_TITAN'));
  }

  // Long Word Chain - 4 consecutive words of 6+ letters (LIVE) - ELITE
  if (validatedWordDetails.length >= 4 && !achievements.includes('LONG_WORD_CHAIN')) {
    const lastFour = validatedWordDetails.slice(-4);
    if (lastFour.every(w => w.word.length >= 6)) {
      newAchievements.push(addAchievementAndReturn('LONG_WORD_CHAIN'));
    }
  }

  return newAchievements;
};

/**
 * Check and award achievements for a word submission
 * Wrapper function that handles gameCode lookup and time calculation
 * @param {string} gameCode - Game identifier
 * @param {string} username - Player username
 * @param {string} word - The word submitted
 * @returns {Array} Array of newly awarded achievements
 */
const checkAndAwardAchievements = (gameCode, username, word) => {
  // Import here to avoid circular dependency at module load time
  const { getGame } = require('./gameStateManager');

  const game = getGame(gameCode);
  if (!game || !game.playerAchievements || !game.playerAchievements[username]) {
    return [];
  }

  // Calculate time since game start
  const currentTime = Date.now();
  const timeSinceStart = game.startTime ? (currentTime - game.startTime) / 1000 : 0;

  const newAchievements = checkLiveAchievements(game, username, word, timeSinceStart);

  if (newAchievements.length > 0) {
    logger.debug('ACHIEVEMENT', `${username} earned: ${newAchievements.map(a => a.key).join(', ')}`);
  }

  return newAchievements;
};

/**
 * Get achievements for a specific player in a game
 * @param {string} gameCode - Game identifier
 * @param {string} username - Player username
 * @returns {Array} Array of achievement keys the player has earned
 */
const getPlayerAchievements = (gameCode, username) => {
  // Import here to avoid circular dependency at module load time
  const { getGame } = require('./gameStateManager');

  const game = getGame(gameCode);
  if (!game || !game.playerAchievements || !game.playerAchievements[username]) {
    return [];
  }

  return game.playerAchievements[username];
};

// Award final achievements after validation (post-game)
const awardFinalAchievements = (game, users) => {
  logger.debug('ACHIEVEMENT', `Awarding final achievements for ${users.length} players`);
  users.forEach(username => {
    // Safety check: ensure player data exists
    if (!game.playerWordDetails[username]) {
      logger.warn('ACHIEVEMENT', `Player ${username} missing word details during achievement calculation`);
      return;
    }

    const allWords = game.playerWordDetails[username];
    const validWords = allWords.filter(w => w.validated === true);
    const currentAchievements = game.playerAchievements[username];

    // Helper function to add achievement if not already present
    const addAchievement = (achievementKey) => {
      if (!currentAchievements.includes(achievementKey)) {
        currentAchievements.push(achievementKey);
      }
    };

    // Note: FIRST_BLOOD, QUICK_THINKER, LONG_HAULER, and DOUBLE_TROUBLE are
    // timing-based achievements awarded during live gameplay and are preserved
    // during validation. They are NOT recalculated here.

    // Word Master - 7+ letter word (validated)
    if (validWords.some(w => w.word.length >= 7)) {
      addAchievement('WORD_MASTER');
    }

    // Speed Demon - 25 valid words in 90 seconds - VERY HARD
    const wordsIn90Sec = validWords.filter(w => w.timeSinceStart <= 90);
    if (wordsIn90Sec.length >= 25) {
      addAchievement('SPEED_DEMON');
    }

    // Lexicon - 40+ valid words - VERY HARD
    if (validWords.length >= 40) {
      addAchievement('LEXICON');
    }

    // Combo King is now checked live (based on combo level, not word count)

    // Perfectionist - all words valid AND at least 20 words (not trivial) - HARDER
    if (allWords.length >= 20 && allWords.every(w => w.validated === true)) {
      addAchievement('PERFECTIONIST');
    }

    // Wordsmith - 30+ valid words - HARDER
    if (validWords.length >= 30) {
      addAchievement('WORDSMITH');
    }

    // Diverse Vocabulary - found words of at least 6 different lengths - HARDER
    const uniqueLengths = new Set(validWords.map(w => w.word.length));
    if (uniqueLengths.size >= 6) {
      addAchievement('DIVERSE_VOCABULARY');
    }

    // Treasure Hunter - found an 8+ letter word (validated)
    if (validWords.some(w => w.word.length >= 8)) {
      addAchievement('TREASURE_HUNTER');
    }

    // EXISTING ACHIEVEMENTS (HARDER)

    // Rare Gem - 9+ letter word (validated)
    if (validWords.some(w => w.word.length >= 9)) {
      addAchievement('RARE_GEM');
    }

    // Explorer - found words of 7+ different lengths (validated) - HARDER
    if (uniqueLengths.size >= 7) {
      addAchievement('EXPLORER');
    }

    // Dictionary Diver - 50+ valid words - VERY HARD
    if (validWords.length >= 50) {
      addAchievement('DICTIONARY_DIVER');
    }

    // Unstoppable - 55+ valid words - VERY HARD
    if (validWords.length >= 55) {
      addAchievement('UNSTOPPABLE');
    }

    // Lightning Round - 12 valid words in first 30 seconds - VERY HARD
    const wordsIn30Sec = validWords.filter(w => w.timeSinceStart <= 30);
    if (wordsIn30Sec.length >= 12) {
      addAchievement('LIGHTNING_ROUND');
    }

    // Comeback Kid - found a valid word in the last 3 seconds - VERY HARD
    const gameDuration = game.gameDuration || 180; // Default 3 minutes
    if (validWords.some(w => w.timeSinceStart >= (gameDuration - 3))) {
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

    // NEW ELITE ACHIEVEMENTS (Final check)

    // Word Architect - 5 words of 7+ letters
    const longWords = validWords.filter(w => w.word.length >= 7);
    if (longWords.length >= 5) {
      addAchievement('WORD_ARCHITECT');
    }

    // Speed Legend - 30 words in 90 seconds - ELITE
    if (wordsIn90Sec.length >= 30) {
      addAchievement('SPEED_LEGEND');
    }

    // Vocabulary Titan - 60+ valid words - ELITE
    if (validWords.length >= 60) {
      addAchievement('VOCABULARY_TITAN');
    }

    // Precision Master - 30+ words with 100% accuracy - ELITE
    if (allWords.length >= 30 && allWords.every(w => w.validated === true)) {
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

    // Note: COMBO_KING, COMBO_GOD, STREAK_MASTER are combo-based achievements
    // that are primarily awarded during live gameplay
  });
};

module.exports = {
  ACHIEVEMENTS,
  ACHIEVEMENT_ICONS,
  getLocalizedAchievements,
  checkLiveAchievements,
  awardFinalAchievements,
  // Additional exports for socketHandlers.js compatibility
  checkAndAwardAchievements,
  getPlayerAchievements
};
