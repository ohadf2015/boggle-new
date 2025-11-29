// Scoring calculation utilities

const { getGame, getLeaderboard } = require('./gameStateManager');

// Get flat combo bonus based on combo level
// Combo gives a flat bonus equal to the combo level (capped at 8)
// Combo 0-2: +0 bonus (no bonus for small combos)
// Combo 3: +1 bonus
// Combo 4: +2 bonus
// Combo 5: +3 bonus
// Combo 6: +4 bonus
// Combo 7: +6 bonus
// Combo 8+: +8 bonus (max)
const getComboBonus = (comboLevel) => {
  if (comboLevel <= 2) return 0; // No bonus for combos 0-2
  if (comboLevel === 3) return 1;
  if (comboLevel === 4) return 2;
  if (comboLevel === 5) return 3;
  if (comboLevel === 6) return 4;
  if (comboLevel === 7) return 6;
  return 8; // Max bonus at combo 8+
};

// Legacy function for backwards compatibility (now returns 1.0 always)
const getComboMultiplier = (comboLevel) => {
  return 1.0;
};

// Calculate score based on word length - 1 point per letter beyond the first
// This gives every letter value: 2 letters = 1 point, 3 letters = 2 points, 4 letters = 3 points, etc.
// Combo bonus is applied as flat addition
const calculateWordScore = (word, comboLevel = 0) => {
  const length = word.length;
  if (length === 1) return 0; // Single letters not allowed
  const baseScore = length - 1; // Each letter beyond the first gets 1 point
  const bonus = getComboBonus(comboLevel);
  return baseScore + bonus;
};

/**
 * Calculate final game scores for all players
 * @param {string} gameCode - Game code
 * @returns {object} - Score data for all players
 */
const calculateGameScores = (gameCode) => {
  const game = getGame(gameCode);
  if (!game) return {};

  const scores = {};
  const playerWords = game.playerWords || {};

  for (const [username, words] of Object.entries(playerWords)) {
    const uniqueWords = [...new Set(words)];
    let totalScore = 0;

    const wordScores = uniqueWords.map(word => {
      const score = calculateWordScore(word);
      totalScore += score;
      return { word, score };
    });

    scores[username] = {
      totalScore,
      words: wordScores,
      wordCount: uniqueWords.length
    };
  }

  return scores;
};

module.exports = {
  calculateWordScore,
  calculateGameScores,
  getComboBonus,
  getComboMultiplier // Legacy, kept for backwards compatibility
};
