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
};

// Get localized achievements based on locale
const getLocalizedAchievements = (locale = 'he') => {
  const supportedLocale = ['he', 'en', 'sv'].includes(locale) ? locale : 'he';
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

  return newAchievements;
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
  });
};

module.exports = {
  ACHIEVEMENTS,
  getLocalizedAchievements,
  checkLiveAchievements,
  awardFinalAchievements
};
