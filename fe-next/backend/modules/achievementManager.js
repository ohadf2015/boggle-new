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
  LETTER_POPPER: '🎈',
};

// Get localized achievements based on locale
const getLocalizedAchievements = (locale = 'he') => {
  const supportedLocale = ['he', 'en', 'sv', 'ja'].includes(locale) ? locale : 'he';
  const t = translations[supportedLocale].achievements;

  const achievements = {};
  Object.keys(ACHIEVEMENT_ICONS).forEach(key => {
    if (!t[key]) {
      // Fallback for missing translation - use English or key name
      console.warn(`[ACHIEVEMENT] Missing translation for ${key} in locale ${supportedLocale}`);
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

  // Get localized achievements based on game language
  const localizedAchievements = getLocalizedAchievements(game.language || 'he');

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

  // First Blood - first valid word in the game (LIVE)
  if (!game.firstWordFound && isCurrentWordValid && !achievements.includes('FIRST_BLOOD')) {
    game.firstWordFound = true;
    achievements.push('FIRST_BLOOD');
    newAchievements.push(localizedAchievements.FIRST_BLOOD);
  }

  // Word Master - 7+ letter word (LIVE) - only if valid
  if (word.length >= 7 && isCurrentWordValid && !achievements.includes('WORD_MASTER')) {
    achievements.push('WORD_MASTER');
    newAchievements.push(localizedAchievements.WORD_MASTER);
  }

  // Treasure Hunter - 8+ letter word (LIVE) - only if valid
  if (word.length >= 8 && isCurrentWordValid && !achievements.includes('TREASURE_HUNTER')) {
    achievements.push('TREASURE_HUNTER');
    newAchievements.push(localizedAchievements.TREASURE_HUNTER);
  }

  // Quick Thinker - valid word within 5 seconds (LIVE) - HARDER
  if (timeSinceStart <= 5 && isCurrentWordValid && !achievements.includes('QUICK_THINKER')) {
    achievements.push('QUICK_THINKER');
    newAchievements.push(localizedAchievements.QUICK_THINKER);
  }

  // Speed Demon - 15 valid words in 2 minutes (LIVE) - HARDER
  if (validatedWordCount >= 15 && timeSinceStart <= 120 && !achievements.includes('SPEED_DEMON')) {
    achievements.push('SPEED_DEMON');
    newAchievements.push(localizedAchievements.SPEED_DEMON);
  }

  // Combo King - multiples of 8 valid words (LIVE) - HARDER
  if (validatedWordCount >= 8 &&
      validatedWordCount % 8 === 0 &&
      !achievements.includes('COMBO_KING')) {
    achievements.push('COMBO_KING');
    newAchievements.push(localizedAchievements.COMBO_KING);
  }

  // Wordsmith - 20 valid words (LIVE) - HARDER
  if (validatedWordCount >= 20 && !achievements.includes('WORDSMITH')) {
    achievements.push('WORDSMITH');
    newAchievements.push(localizedAchievements.WORDSMITH);
  }

  // Lexicon - 28+ valid words (LIVE) - HARDER
  if (validatedWordCount >= 28 && !achievements.includes('LEXICON')) {
    achievements.push('LEXICON');
    newAchievements.push(localizedAchievements.LEXICON);
  }

  // Double Trouble - 2 valid words within 2 seconds (LIVE) - HARDER
  if (validatedWordDetails.length >= 2 && !achievements.includes('DOUBLE_TROUBLE')) {
    const lastTwo = validatedWordDetails.slice(-2);
    if (lastTwo[1].timeSinceStart - lastTwo[0].timeSinceStart <= 2) {
      achievements.push('DOUBLE_TROUBLE');
      newAchievements.push(localizedAchievements.DOUBLE_TROUBLE);
    }
  }

  // Triple Threat - 3 valid words within 5 seconds (LIVE) - HARDER
  if (validatedWordDetails.length >= 3 && !achievements.includes('TRIPLE_THREAT')) {
    const lastThree = validatedWordDetails.slice(-3);
    if (lastThree[2].timeSinceStart - lastThree[0].timeSinceStart <= 5) {
      achievements.push('TRIPLE_THREAT');
      newAchievements.push(localizedAchievements.TRIPLE_THREAT);
    }
  }

  // Rare Gem - 9+ letter valid word (LIVE)
  if (word.length >= 9 && isCurrentWordValid && !achievements.includes('RARE_GEM')) {
    achievements.push('RARE_GEM');
    newAchievements.push(localizedAchievements.RARE_GEM);
  }

  // Lightning Round - 8 valid words in first 30 seconds (LIVE) - HARDER
  if (validatedWordCount >= 8 && timeSinceStart <= 30 && !achievements.includes('LIGHTNING_ROUND')) {
    achievements.push('LIGHTNING_ROUND');
    newAchievements.push(localizedAchievements.LIGHTNING_ROUND);
  }

  // Unstoppable - 40+ valid words (LIVE) - HARDER
  if (validatedWordCount >= 40 && !achievements.includes('UNSTOPPABLE')) {
    achievements.push('UNSTOPPABLE');
    newAchievements.push(localizedAchievements.UNSTOPPABLE);
  }

  // Streak Master - 15+ combo streak (LIVE) - HARDER
  // Check if player has a combo tracker and reached 15+
  const currentCombo = game.playerCombos?.[username] || 0;
  if (currentCombo >= 15 && !achievements.includes('STREAK_MASTER')) {
    achievements.push('STREAK_MASTER');
    newAchievements.push(localizedAchievements.STREAK_MASTER);
  }

  // Comeback Kid - valid word in last 4 seconds (LIVE) - HARDER
  // Note: gameDuration is in seconds, need to check if game duration exists
  const gameDuration = game.gameDuration || 180; // Default 3 minutes
  if (timeSinceStart >= (gameDuration - 4) && isCurrentWordValid && !achievements.includes('COMEBACK_KID')) {
    achievements.push('COMEBACK_KID');
    newAchievements.push(localizedAchievements.COMEBACK_KID);
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
    console.log(`[ACHIEVEMENT] Skip - no game/playerAchievements for ${username} in ${gameCode}`);
    return [];
  }

  // Calculate time since game start
  const currentTime = Date.now();
  const timeSinceStart = game.startTime ? (currentTime - game.startTime) / 1000 : 0;

  console.log(`[ACHIEVEMENT] Checking achievements for ${username} - word: "${word}", timeSinceStart: ${timeSinceStart.toFixed(1)}s, wordCount: ${game.playerWords[username]?.length || 0}`);

  const newAchievements = checkLiveAchievements(game, username, word, timeSinceStart);

  if (newAchievements.length > 0) {
    console.log(`[ACHIEVEMENT] ${username} earned:`, newAchievements.map(a => a.name).join(', '));
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
  console.log(`[ACHIEVEMENT] awarding final achievements for ${users.length} players`);
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

    // Speed Demon - 15 valid words in 2 minutes - HARDER
    const wordsIn2Min = validWords.filter(w => w.timeSinceStart <= 120);
    if (wordsIn2Min.length >= 15) {
      addAchievement('SPEED_DEMON');
    }

    // Lexicon - 28+ valid words - HARDER
    if (validWords.length >= 28) {
      addAchievement('LEXICON');
    }

    // Combo King - 8+ valid words (multiples of 8) - HARDER
    if (validWords.length >= 8 && validWords.length % 8 === 0) {
      addAchievement('COMBO_KING');
    }

    // Perfectionist - all words valid
    if (allWords.length > 0 && allWords.every(w => w.validated === true)) {
      addAchievement('PERFECTIONIST');
    }

    // Wordsmith - 20+ valid words - HARDER
    if (validWords.length >= 20) {
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

    // Dictionary Diver - 32+ valid words - HARDER
    if (validWords.length >= 32) {
      addAchievement('DICTIONARY_DIVER');
    }

    // Unstoppable - 40+ valid words - HARDER
    if (validWords.length >= 40) {
      addAchievement('UNSTOPPABLE');
    }

    // Lightning Round - 8 valid words in first 30 seconds - HARDER
    const wordsIn30Sec = validWords.filter(w => w.timeSinceStart <= 30);
    if (wordsIn30Sec.length >= 8) {
      addAchievement('LIGHTNING_ROUND');
    }

    // Comeback Kid - found a valid word in the last 4 seconds - HARDER
    const gameDuration = game.gameDuration || 180; // Default 3 minutes
    if (validWords.some(w => w.timeSinceStart >= (gameDuration - 4))) {
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

    console.log(`[ACHIEVEMENT] Final achievements for ${username}:`, currentAchievements);
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
