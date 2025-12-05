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
  UNDERDOG: '🐕',             // Come from behind to win (was trailing at halftime)
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

  // First Blood - first 4+ letter valid word in the game (LIVE) - must show skill
  if (!game.firstWordFound && isCurrentWordValid && word.length >= 4 && !achievements.includes('FIRST_BLOOD')) {
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

  // Get game duration for time-scaled achievements (default 180 seconds = 3 minutes)
  const gameDuration = game.gameDuration || 180;
  // Scale thresholds based on game duration (normalize to 180s baseline)
  const timeScale = gameDuration / 180;
  // Half-game time (50% of game duration)
  const halfGameTime = gameDuration * 0.5;
  // First sixth of game (for Lightning Round, ~17% of game)
  const earlyGameTime = gameDuration * 0.17;

  // Quick Thinker - valid word within first 1.5% of game (LIVE) - VERY HARD
  const quickThinkerTime = Math.max(2, gameDuration * 0.015);
  if (timeSinceStart <= quickThinkerTime && isCurrentWordValid && !achievements.includes('QUICK_THINKER')) {
    newAchievements.push(addAchievementAndReturn('QUICK_THINKER'));
  }

  // Speed Demon - scaled word count in first half of game (LIVE) - ELITE
  // Base: 28 words in 90s for 180s game = ~0.31 words/sec
  // Scale requirement: Math.ceil(28 * timeScale) words in halfGameTime
  const speedDemonThreshold = Math.ceil(28 * timeScale);
  if (validatedWordCount >= speedDemonThreshold && timeSinceStart <= halfGameTime && !achievements.includes('SPEED_DEMON')) {
    newAchievements.push(addAchievementAndReturn('SPEED_DEMON'));
  }

  // Combo King - reach combo level 18+ (LIVE) - ELITE (now based on actual combo, not word count)
  const currentComboForKing = game.playerCombos?.[username] || 0;
  if (currentComboForKing >= 18 && !achievements.includes('COMBO_KING')) {
    newAchievements.push(addAchievementAndReturn('COMBO_KING'));
  }

  // Wordsmith - 35 valid words (LIVE) - HARD
  if (validatedWordCount >= 35 && !achievements.includes('WORDSMITH')) {
    newAchievements.push(addAchievementAndReturn('WORDSMITH'));
  }

  // Lexicon - 45+ valid words (LIVE) - ELITE
  if (validatedWordCount >= 45 && !achievements.includes('LEXICON')) {
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

  // Lightning Round - scaled word count in first ~17% of game (LIVE) - ELITE
  // Base: 15 words in 30s for 180s game
  const lightningThreshold = Math.ceil(15 * timeScale);
  if (validatedWordCount >= lightningThreshold && timeSinceStart <= earlyGameTime && !achievements.includes('LIGHTNING_ROUND')) {
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

  // Comeback Kid - valid word in last 2% of game (LIVE) - VERY HARD
  // For 180s game = last 3.6s, for 60s game = last 1.2s (min 2s)
  const comebackTime = Math.max(2, gameDuration * 0.02);
  if (timeSinceStart >= (gameDuration - comebackTime) && isCurrentWordValid && !achievements.includes('COMEBACK_KID')) {
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

  // Speed Legend - scaled word count in first half of game (LIVE) - ELITE
  // Base: 30 words in 90s for 180s game
  const speedLegendThreshold = Math.ceil(30 * timeScale);
  if (validatedWordCount >= speedLegendThreshold && timeSinceStart <= halfGameTime && !achievements.includes('SPEED_LEGEND')) {
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

    // Skip bots - they don't get achievements to avoid cluttering the UI
    // and because their performance is programmatic, not skill-based
    const userData = game.users?.[username];
    if (userData?.isBot) {
      logger.debug('ACHIEVEMENT', `Skipping achievements for bot ${username}`);
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

    // Get game duration for time-scaled achievements (default 180 seconds = 3 minutes)
    const gameDuration = game.gameDuration || 180;
    const timeScale = gameDuration / 180;
    const halfGameTime = gameDuration * 0.5;
    const earlyGameTime = gameDuration * 0.17;

    // Word Master - 7+ letter word (validated)
    if (validWords.some(w => w.word.length >= 7)) {
      addAchievement('WORD_MASTER');
    }

    // Speed Demon - scaled word count in first half of game - ELITE
    const speedDemonThreshold = Math.ceil(28 * timeScale);
    const wordsInHalfGame = validWords.filter(w => w.timeSinceStart <= halfGameTime);
    if (wordsInHalfGame.length >= speedDemonThreshold) {
      addAchievement('SPEED_DEMON');
    }

    // Lexicon - 45+ valid words (scales slightly with game time) - ELITE
    const lexiconThreshold = Math.ceil(45 * timeScale);
    if (validWords.length >= lexiconThreshold) {
      addAchievement('LEXICON');
    }

    // Combo King is now checked live (based on combo level, not word count)

    // Perfectionist - all words valid AND scaled word count (not trivial) - HARD
    const perfectionistThreshold = Math.ceil(25 * timeScale);
    if (allWords.length >= perfectionistThreshold && allWords.every(w => w.validated === true)) {
      addAchievement('PERFECTIONIST');
    }

    // Wordsmith - scaled word count - HARD
    const wordsmithThreshold = Math.ceil(35 * timeScale);
    if (validWords.length >= wordsmithThreshold) {
      addAchievement('WORDSMITH');
    }

    // Diverse Vocabulary - found words of at least 7 different lengths - HARD
    const uniqueLengths = new Set(validWords.map(w => w.word.length));
    if (uniqueLengths.size >= 7) {
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

    // Explorer - found words of 8+ different lengths (validated) - ELITE
    if (uniqueLengths.size >= 8) {
      addAchievement('EXPLORER');
    }

    // Dictionary Diver - scaled word count - VERY HARD
    const dictionaryDiverThreshold = Math.ceil(50 * timeScale);
    if (validWords.length >= dictionaryDiverThreshold) {
      addAchievement('DICTIONARY_DIVER');
    }

    // Unstoppable - scaled word count - VERY HARD
    const unstoppableThreshold = Math.ceil(55 * timeScale);
    if (validWords.length >= unstoppableThreshold) {
      addAchievement('UNSTOPPABLE');
    }

    // Lightning Round - scaled word count in first ~17% of game - ELITE
    const lightningThreshold = Math.ceil(15 * timeScale);
    const wordsInEarlyGame = validWords.filter(w => w.timeSinceStart <= earlyGameTime);
    if (wordsInEarlyGame.length >= lightningThreshold) {
      addAchievement('LIGHTNING_ROUND');
    }

    // Comeback Kid - found a valid word in last 2% of game - VERY HARD
    const comebackTime = Math.max(2, gameDuration * 0.02);
    if (validWords.some(w => w.timeSinceStart >= (gameDuration - comebackTime))) {
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

    // Speed Legend - scaled word count in first half of game - ELITE
    const speedLegendThreshold = Math.ceil(30 * timeScale);
    if (wordsInHalfGame.length >= speedLegendThreshold) {
      addAchievement('SPEED_LEGEND');
    }

    // Vocabulary Titan - scaled word count - ELITE
    const vocabularyTitanThreshold = Math.ceil(60 * timeScale);
    if (validWords.length >= vocabularyTitanThreshold) {
      addAchievement('VOCABULARY_TITAN');
    }

    // Precision Master - scaled word count with 100% accuracy - ELITE
    const precisionThreshold = Math.ceil(35 * timeScale);
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

    // NEW COMPETITIVE/STYLE ACHIEVEMENTS

    // Minimalist - All valid words are 4+ letters (no 2-3 letter words), scaled word count - HARD
    const minimalistThreshold = Math.ceil(20 * timeScale);
    if (validWords.length >= minimalistThreshold && validWords.every(w => w.word.length >= 4)) {
      addAchievement('MINIMALIST');
    }

    // Clutch Player - 3+ valid words in last 6% of game
    // For 180s game = last ~10s, for 60s game = last ~4s
    const clutchTime = Math.max(3, gameDuration * 0.06);
    const clutchWords = validWords.filter(w => w.timeSinceStart >= (gameDuration - clutchTime));
    if (clutchWords.length >= 3) {
      addAchievement('CLUTCH_PLAYER');
    }

    // Note: COMBO_KING, COMBO_GOD, STREAK_MASTER are combo-based achievements
    // that are primarily awarded during live gameplay
    // Note: WORD_SNIPER, PHOTO_FINISH, UNDERDOG require cross-player comparison
    // and are handled separately after all players are processed
  });

  // Cross-player achievements (require comparing all players)
  const allPlayerWords = {};
  const playerScores = {};

  users.forEach(username => {
    const userData = game.users?.[username];
    if (userData?.isBot) return; // Skip bots

    const validWords = (game.playerWordDetails[username] || [])
      .filter(w => w.validated === true)
      .map(w => w.word.toLowerCase());
    allPlayerWords[username] = new Set(validWords);

    // Calculate total score for this player
    let score = 0;
    validWords.forEach(word => {
      score += word.length - 1; // Base score
    });
    playerScores[username] = score;
  });

  const humanPlayers = users.filter(u => !game.users?.[u]?.isBot);

  // Only award competitive achievements in multiplayer
  if (humanPlayers.length > 1) {
    // Find all words found by each player and count occurrences
    const wordOccurrences = {};
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
    });
  }
};

/**
 * Check and award lifetime/career achievements based on cumulative stats
 * This should be called after updating the user's stats in the database
 * @param {Object} userStats - The user's cumulative stats
 * @param {number} userStats.gamesPlayed - Total games played
 * @param {number} userStats.gamesWon - Total games won
 * @param {number} userStats.totalWordsFound - Total valid words found across all games
 * @param {number} userStats.totalScore - Total points accumulated
 * @param {number} userStats.uniqueDaysPlayed - Number of unique days played (optional)
 * @param {Array} existingAchievements - Array of achievement keys already earned
 * @returns {Array} Array of newly awarded lifetime achievements
 */
const checkLifetimeAchievements = (userStats, existingAchievements = []) => {
  const newAchievements = [];
  const existing = new Set(existingAchievements);

  const addIfNew = (key) => {
    if (!existing.has(key)) {
      newAchievements.push({ key, icon: ACHIEVEMENT_ICONS[key] });
      existing.add(key);
    }
  };

  // Games played achievements
  if (userStats.gamesPlayed >= 50) {
    addIfNew('VETERAN');
  }
  if (userStats.gamesPlayed >= 100) {
    addIfNew('CENTURION');
  }

  // Words found achievements
  if (userStats.totalWordsFound >= 1000) {
    addIfNew('WORD_COLLECTOR');
  }
  if (userStats.totalWordsFound >= 5000) {
    addIfNew('WORD_HOARDER');
  }

  // Games won achievements
  if (userStats.gamesWon >= 25) {
    addIfNew('CHAMPION');
  }
  if (userStats.gamesWon >= 100) {
    addIfNew('LEGEND');
  }

  // Points accumulated achievements
  if (userStats.totalScore >= 10000) {
    addIfNew('POINT_MASTER');
  }
  if (userStats.totalScore >= 50000) {
    addIfNew('POINT_KING');
  }

  // Days played achievements (if tracking unique days)
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
};

// Export lifetime achievement thresholds for UI display
const LIFETIME_ACHIEVEMENT_THRESHOLDS = {
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

module.exports = {
  ACHIEVEMENTS,
  ACHIEVEMENT_ICONS,
  getLocalizedAchievements,
  checkLiveAchievements,
  awardFinalAchievements,
  checkLifetimeAchievements,
  LIFETIME_ACHIEVEMENT_THRESHOLDS,
  // Additional exports for socketHandlers.js compatibility
  checkAndAwardAchievements,
  getPlayerAchievements
};
