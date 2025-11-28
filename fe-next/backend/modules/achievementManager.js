// Achievement definitions and checking logic
const { translations } = require('../../translations/index.js');

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
  // New achievements
  TRIPLE_THREAT: '🎰',
  UNSTOPPABLE: '🚀',
  COMEBACK_KID: '🔄',
  DICTIONARY_DIVER: '📖',
  LIGHTNING_ROUND: '⚡',
  RARE_GEM: '💠',
  EXPLORER: '🧭',
  STREAK_MASTER: '🔥',
  ANAGRAM_ARTIST: '🔀',
};

// Get localized achievements based on locale
const getLocalizedAchievements = (locale = 'he') => {
  const supportedLocale = ['he', 'en', 'sv', 'ja'].includes(locale) ? locale : 'he';
  const t = translations[supportedLocale].achievements;

  const achievements = {};
  Object.keys(ACHIEVEMENT_ICONS).forEach(key => {
    achievements[key] = {
      name: t[key].name,
      description: t[key].description,
      icon: ACHIEVEMENT_ICONS[key]
    };
  });

  return achievements;
};

// Legacy support - default to Hebrew
const ACHIEVEMENTS = getLocalizedAchievements('he');

// Check and award LIVE achievements during gameplay (selective achievements only)
const checkLiveAchievements = (game, username, word, timeSinceStart) => {
  const achievements = game.playerAchievements[username];
  const newAchievements = [];

  // Get localized achievements based on game language
  const localizedAchievements = getLocalizedAchievements(game.language || 'he');

  // First Blood - first word in the game (LIVE)
  if (!game.firstWordFound && !achievements.includes('FIRST_BLOOD')) {
    game.firstWordFound = true;
    achievements.push('FIRST_BLOOD');
    newAchievements.push(localizedAchievements.FIRST_BLOOD);
  }

  // Word Master - 7+ letter word (LIVE)
  if (word.length >= 7 && !achievements.includes('WORD_MASTER')) {
    achievements.push('WORD_MASTER');
    newAchievements.push(localizedAchievements.WORD_MASTER);
  }

  // Treasure Hunter - 8+ letter word (LIVE)
  if (word.length >= 8 && !achievements.includes('TREASURE_HUNTER')) {
    achievements.push('TREASURE_HUNTER');
    newAchievements.push(localizedAchievements.TREASURE_HUNTER);
  }

  // Quick Thinker - word within 10 seconds (LIVE)
  if (timeSinceStart <= 10 && !achievements.includes('QUICK_THINKER')) {
    achievements.push('QUICK_THINKER');
    newAchievements.push(localizedAchievements.QUICK_THINKER);
  }

  // Speed Demon - 10 words in 2 minutes (LIVE)
  if (game.playerWords[username].length >= 10 && timeSinceStart <= 120 && !achievements.includes('SPEED_DEMON')) {
    achievements.push('SPEED_DEMON');
    newAchievements.push(localizedAchievements.SPEED_DEMON);
  }

  // Combo King - multiples of 5 words (LIVE)
  if (game.playerWords[username].length >= 5 &&
      game.playerWords[username].length % 5 === 0 &&
      !achievements.includes('COMBO_KING')) {
    achievements.push('COMBO_KING');
    newAchievements.push(localizedAchievements.COMBO_KING);
  }

  // Wordsmith - 15 words (LIVE)
  if (game.playerWords[username].length >= 15 && !achievements.includes('WORDSMITH')) {
    achievements.push('WORDSMITH');
    newAchievements.push(localizedAchievements.WORDSMITH);
  }

  // Lexicon - 20+ words (LIVE)
  if (game.playerWords[username].length >= 20 && !achievements.includes('LEXICON')) {
    achievements.push('LEXICON');
    newAchievements.push(localizedAchievements.LEXICON);
  }

  // Double Trouble - 2 words within 5 seconds (LIVE)
  const playerWordDetails = game.playerWordDetails[username];
  if (playerWordDetails.length >= 2 && !achievements.includes('DOUBLE_TROUBLE')) {
    const lastTwo = playerWordDetails.slice(-2);
    if (lastTwo[1].timeSinceStart - lastTwo[0].timeSinceStart <= 5) {
      achievements.push('DOUBLE_TROUBLE');
      newAchievements.push(localizedAchievements.DOUBLE_TROUBLE);
    }
  }

  // Triple Threat - 3 words within 8 seconds (LIVE)
  if (playerWordDetails.length >= 3 && !achievements.includes('TRIPLE_THREAT')) {
    const lastThree = playerWordDetails.slice(-3);
    if (lastThree[2].timeSinceStart - lastThree[0].timeSinceStart <= 8) {
      achievements.push('TRIPLE_THREAT');
      newAchievements.push(localizedAchievements.TRIPLE_THREAT);
    }
  }

  // Rare Gem - 9+ letter word (LIVE)
  if (word.length >= 9 && !achievements.includes('RARE_GEM')) {
    achievements.push('RARE_GEM');
    newAchievements.push(localizedAchievements.RARE_GEM);
  }

  // Lightning Round - 5 words in first 30 seconds (LIVE)
  if (game.playerWords[username].length >= 5 && timeSinceStart <= 30 && !achievements.includes('LIGHTNING_ROUND')) {
    achievements.push('LIGHTNING_ROUND');
    newAchievements.push(localizedAchievements.LIGHTNING_ROUND);
  }

  // Unstoppable - 30+ words (LIVE)
  if (game.playerWords[username].length >= 30 && !achievements.includes('UNSTOPPABLE')) {
    achievements.push('UNSTOPPABLE');
    newAchievements.push(localizedAchievements.UNSTOPPABLE);
  }

  // Streak Master - 10+ combo streak (LIVE)
  // Check if player has a combo tracker and reached 10+
  const currentCombo = game.playerCombos?.[username] || 0;
  if (currentCombo >= 10 && !achievements.includes('STREAK_MASTER')) {
    achievements.push('STREAK_MASTER');
    newAchievements.push(localizedAchievements.STREAK_MASTER);
  }

  // Comeback Kid - word in last 30 seconds (LIVE)
  // Note: gameDuration is in seconds, need to check if game duration exists
  const gameDuration = game.gameDuration || 180; // Default 3 minutes
  if (timeSinceStart >= (gameDuration - 30) && !achievements.includes('COMEBACK_KID')) {
    achievements.push('COMEBACK_KID');
    newAchievements.push(localizedAchievements.COMEBACK_KID);
  }

  // Anagram Artist - found 2 consecutive words that are anagrams of each other (LIVE)
  if (playerWordDetails.length >= 2 && !achievements.includes('ANAGRAM_ARTIST')) {
    const lastTwo = playerWordDetails.slice(-2);
    const word1 = lastTwo[0].word.toLowerCase();
    const word2 = lastTwo[1].word.toLowerCase();
    // Check if same length and same letters (anagram)
    if (word1.length === word2.length && word1 !== word2) {
      const sorted1 = word1.split('').sort().join('');
      const sorted2 = word2.split('').sort().join('');
      if (sorted1 === sorted2) {
        achievements.push('ANAGRAM_ARTIST');
        newAchievements.push(localizedAchievements.ANAGRAM_ARTIST);
      }
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

  return checkLiveAchievements(game, username, word, timeSinceStart);
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
  users.forEach(username => {
    // Safety check: ensure player data exists
    if (!game.playerWordDetails[username]) {
      console.warn(`Player ${username} missing word details during achievement calculation`);
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

    // Speed Demon - 10 valid words in 2 minutes
    const wordsIn2Min = validWords.filter(w => w.timeSinceStart <= 120);
    if (wordsIn2Min.length >= 10) {
      addAchievement('SPEED_DEMON');
    }

    // Lexicon - 20+ valid words
    if (validWords.length >= 20) {
      addAchievement('LEXICON');
    }

    // Combo King - 5+ valid words (multiples of 5)
    if (validWords.length >= 5 && validWords.length % 5 === 0) {
      addAchievement('COMBO_KING');
    }

    // Perfectionist - all words valid
    if (allWords.length > 0 && allWords.every(w => w.validated === true)) {
      addAchievement('PERFECTIONIST');
    }

    // Wordsmith - 15+ valid words
    if (validWords.length >= 15) {
      addAchievement('WORDSMITH');
    }

    // Diverse Vocabulary - found words of at least 4 different lengths
    const uniqueLengths = new Set(validWords.map(w => w.word.length));
    if (uniqueLengths.size >= 4) {
      addAchievement('DIVERSE_VOCABULARY');
    }

    // Treasure Hunter - found an 8+ letter word (validated)
    if (validWords.some(w => w.word.length >= 8)) {
      addAchievement('TREASURE_HUNTER');
    }

    // NEW ACHIEVEMENTS

    // Rare Gem - 9+ letter word (validated)
    if (validWords.some(w => w.word.length >= 9)) {
      addAchievement('RARE_GEM');
    }

    // Explorer - found words of 5+ different lengths (validated)
    if (uniqueLengths.size >= 5) {
      addAchievement('EXPLORER');
    }

    // Dictionary Diver - 25+ valid words
    if (validWords.length >= 25) {
      addAchievement('DICTIONARY_DIVER');
    }

    // Unstoppable - 30+ valid words
    if (validWords.length >= 30) {
      addAchievement('UNSTOPPABLE');
    }

    // Lightning Round - 5 valid words in first 30 seconds
    const wordsIn30Sec = validWords.filter(w => w.timeSinceStart <= 30);
    if (wordsIn30Sec.length >= 5) {
      addAchievement('LIGHTNING_ROUND');
    }

    // Comeback Kid - found a valid word in the last 30 seconds
    const gameDuration = game.gameDuration || 180; // Default 3 minutes
    if (validWords.some(w => w.timeSinceStart >= (gameDuration - 30))) {
      addAchievement('COMEBACK_KID');
    }

    // Anagram Artist - found consecutive anagram words (post-validation)
    // Check all consecutive valid word pairs
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

    // Note: TRIPLE_THREAT and STREAK_MASTER are timing/combo based achievements
    // that are primarily awarded during live gameplay
  });
};

module.exports = {
  ACHIEVEMENTS,
  getLocalizedAchievements,
  checkLiveAchievements,
  awardFinalAchievements,
  // Additional exports for socketHandlers.js compatibility
  checkAndAwardAchievements,
  getPlayerAchievements
};
