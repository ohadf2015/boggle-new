// Player Titles Manager - Assigns fun categories/titles to players based on their gameplay
const { translations } = require('../../translations/index.js');

/**
 * Calculate player titles based on game performance
 * Each player gets assigned a title based on their unique strengths in the game
 * @param {Array} scoresArray - Array of player score objects with allWords, validWordCount, etc.
 * @param {string} locale - The game language for localized titles
 * @param {number} gameDuration - Game duration in seconds
 * @returns {Object} Map of username -> { titleKey, title (localized object) }
 */
const calculatePlayerTitles = (scoresArray, locale = 'he', gameDuration = 180) => {
  if (!scoresArray || scoresArray.length === 0) {
    return {};
  }

  const supportedLocale = ['he', 'en', 'sv', 'ja'].includes(locale) ? locale : 'he';
  const titleTranslations = translations[supportedLocale].playerTitles;

  // Calculate stats for each player
  const playerStats = scoresArray.map(player => {
    const allWords = player.allWords || [];
    const validWords = allWords.filter(w => w.validated && !w.isDuplicate);
    const invalidWords = allWords.filter(w => !w.validated || w.isDuplicate);

    // Calculate various metrics
    const totalComboBonus = validWords.reduce((sum, w) => sum + (w.comboBonus || 0), 0);
    const longestWordLength = validWords.reduce((max, w) => Math.max(max, w.word?.length || 0), 0);
    const uniqueLengths = new Set(validWords.map(w => w.word?.length || 0)).size;
    const bigWords = validWords.filter(w => (w.word?.length || 0) >= 6).length;

    // Words per minute (using game duration)
    const wordsPerMinute = validWords.length / (gameDuration / 60);

    // Accuracy: percentage of valid words
    const accuracy = allWords.length > 0 ? (validWords.length / allWords.length) * 100 : 0;
    const isPerfect = allWords.length > 0 && validWords.length === allWords.length;

    // Early bird: words submitted in first 60 seconds (if timing data available)
    const earlyWords = validWords.filter(w => (w.timeSinceStart || 0) <= 60).length;

    // Clutch: words in last 30 seconds
    const clutchWords = validWords.filter(w => (w.timeSinceStart || 0) >= (gameDuration - 30)).length;

    // Consistency: standard deviation of time between words (lower = more consistent)
    let consistency = 0;
    if (validWords.length >= 3) {
      const times = validWords.map(w => w.timeSinceStart || 0).sort((a, b) => a - b);
      const gaps = [];
      for (let i = 1; i < times.length; i++) {
        gaps.push(times[i] - times[i - 1]);
      }
      if (gaps.length > 0) {
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
        consistency = 100 - Math.min(Math.sqrt(variance), 100); // Higher = more consistent
      }
    }

    return {
      username: player.username,
      score: player.score,
      validWordCount: validWords.length,
      totalWordCount: allWords.length,
      invalidCount: invalidWords.length,
      totalComboBonus,
      longestWordLength,
      uniqueLengths,
      bigWords,
      wordsPerMinute,
      accuracy,
      isPerfect,
      earlyWords,
      clutchWords,
      consistency
    };
  });

  // Track which titles have been assigned
  const assignedTitles = {};
  const usedTitles = new Set();

  // Sort players by score to determine champion
  const sortedByScore = [...playerStats].sort((a, b) => b.score - a.score);

  // Helper to assign a title if not already taken
  const assignTitle = (username, titleKey) => {
    if (!usedTitles.has(titleKey) && !assignedTitles[username]) {
      assignedTitles[username] = {
        titleKey,
        title: titleTranslations[titleKey]
      };
      usedTitles.add(titleKey);
      return true;
    }
    return false;
  };

  // 1. Champion - winner (only if there's a clear winner with > 0 score)
  if (sortedByScore[0]?.score > 0) {
    assignTitle(sortedByScore[0].username, 'champion');
  }

  // 2. Perfectionist - best accuracy (100% valid, at least 3 words)
  const perfectPlayers = playerStats.filter(p => p.isPerfect && p.validWordCount >= 3);
  if (perfectPlayers.length > 0) {
    // Among perfect players, pick the one with most words
    const bestPerfect = perfectPlayers.sort((a, b) => b.validWordCount - a.validWordCount)[0];
    assignTitle(bestPerfect.username, 'perfectionist');
  }

  // 3. Speedster - fastest words per minute (at least 5 words)
  const fastPlayers = playerStats.filter(p => p.validWordCount >= 5);
  if (fastPlayers.length > 0) {
    const fastest = fastPlayers.sort((a, b) => b.wordsPerMinute - a.wordsPerMinute)[0];
    assignTitle(fastest.username, 'speedster');
  }

  // 4. Wordsmith - most words (not already champion)
  const mostWords = [...playerStats].sort((a, b) => b.validWordCount - a.validWordCount)[0];
  if (mostWords && mostWords.validWordCount > 0) {
    assignTitle(mostWords.username, 'wordsmith');
  }

  // 5. Scholar - longest word
  const longestWordPlayer = [...playerStats].sort((a, b) => b.longestWordLength - a.longestWordLength)[0];
  if (longestWordPlayer && longestWordPlayer.longestWordLength >= 5) {
    assignTitle(longestWordPlayer.username, 'scholar');
  }

  // 6. Explorer - most diverse word lengths (at least 4 different lengths)
  const explorerCandidate = [...playerStats].sort((a, b) => b.uniqueLengths - a.uniqueLengths)[0];
  if (explorerCandidate && explorerCandidate.uniqueLengths >= 4) {
    assignTitle(explorerCandidate.username, 'explorer');
  }

  // 7. Sniper - best accuracy but NOT perfect (between 80-99%)
  const sniperCandidates = playerStats.filter(p => p.accuracy >= 80 && p.accuracy < 100 && p.validWordCount >= 3);
  if (sniperCandidates.length > 0) {
    const bestSniper = sniperCandidates.sort((a, b) => b.accuracy - a.accuracy)[0];
    assignTitle(bestSniper.username, 'sniper');
  }

  // 8. Combo Master - highest combo bonus
  const comboMaster = [...playerStats].sort((a, b) => b.totalComboBonus - a.totalComboBonus)[0];
  if (comboMaster && comboMaster.totalComboBonus >= 5) {
    assignTitle(comboMaster.username, 'comboMaster');
  }

  // 9. Early Bird - most words in first minute
  const earlyBird = [...playerStats].sort((a, b) => b.earlyWords - a.earlyWords)[0];
  if (earlyBird && earlyBird.earlyWords >= 3) {
    assignTitle(earlyBird.username, 'earlyBird');
  }

  // 10. Clutch Player - most words in final 30 seconds
  const clutchPlayer = [...playerStats].sort((a, b) => b.clutchWords - a.clutchWords)[0];
  if (clutchPlayer && clutchPlayer.clutchWords >= 2) {
    assignTitle(clutchPlayer.username, 'clutchPlayer');
  }

  // 11. Big Word Hunter - most 6+ letter words
  const bigWordHunter = [...playerStats].sort((a, b) => b.bigWords - a.bigWords)[0];
  if (bigWordHunter && bigWordHunter.bigWords >= 2) {
    assignTitle(bigWordHunter.username, 'bigWordHunter');
  }

  // 12. Consistent Player - most consistent timing
  const consistentPlayer = [...playerStats].sort((a, b) => b.consistency - a.consistency)[0];
  if (consistentPlayer && consistentPlayer.consistency >= 50 && consistentPlayer.validWordCount >= 5) {
    assignTitle(consistentPlayer.username, 'consistentPlayer');
  }

  // For any remaining players without titles, don't assign anything
  // They'll show up without a special title

  console.log(`[TITLES] Assigned titles for ${Object.keys(assignedTitles).length} players:`,
    Object.entries(assignedTitles).map(([username, t]) => `${username}: ${t.titleKey}`).join(', ')
  );

  return assignedTitles;
};

module.exports = {
  calculatePlayerTitles
};
