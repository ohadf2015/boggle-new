// Scoring calculation utilities

const { getGame, getLeaderboard } = require('./gameStateManager');

// Calculate combo multiplier based on combo level
// Combo 0: 1x (no bonus)
// Combo 1: 1.1x (+10%)
// Combo 2: 1.2x (+20%)
// Combo 3: 1.4x (+40%)
// Combo 4: 1.6x (+60%)
// Combo 5: 1.8x (+80%)
// Combo 6+: 2.0x (max bonus, +100%)
const getComboMultiplier = (comboLevel) => {
  if (comboLevel <= 0) return 1.0;
  if (comboLevel === 1) return 1.1;
  if (comboLevel === 2) return 1.2;
  if (comboLevel === 3) return 1.4;
  if (comboLevel === 4) return 1.6;
  if (comboLevel === 5) return 1.8;
  return 2.0; // Max multiplier for combo 6+
};

// Calculate score based on word length - 1 point per letter beyond the first
// This gives every letter value: 2 letters = 1 point, 3 letters = 2 points, 4 letters = 3 points, etc.
// Combo bonus is applied as a multiplier (rounded down)
const calculateWordScore = (word, comboLevel = 0) => {
  const length = word.length;
  if (length === 1) return 0; // Single letters not allowed
  const baseScore = length - 1; // Each letter beyond the first gets 1 point
  const multiplier = getComboMultiplier(comboLevel);
  return Math.floor(baseScore * multiplier);
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
  getComboMultiplier
};
