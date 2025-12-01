// Scoring calculation utilities

const { getGame, getLeaderboard } = require('./gameStateManager');

// Get combo multiplier based on combo level
// Higher combo levels give better multipliers
// Combo 0-2: x1.0 (no bonus for small combos)
// Combo 3-4: x1.25
// Combo 5-6: x1.5
// Combo 7-8: x1.75
// Combo 9-10: x2.0
// Combo 11+: x2.25 (max)
const getComboMultiplier = (comboLevel) => {
  if (comboLevel <= 2) return 1.0;
  if (comboLevel <= 4) return 1.25;
  if (comboLevel <= 6) return 1.5;
  if (comboLevel <= 8) return 1.75;
  if (comboLevel <= 10) return 2.0;
  return 2.25; // Max multiplier at combo 11+
};

// Get flat combo bonus based on combo level and word length
// Combo bonus now scales with word length to reward longer words in combos
// Formula: comboBonus = floor(comboLevel * wordLengthFactor)
// Optimized to help slower/perfectionist players who find quality words
// wordLengthFactor: 3 letters = 0.2, 4 letters = 0.5, 5 letters = 1.0, 6 letters = 1.5, 7+ letters = 2.0
const getComboBonus = (comboLevel, wordLength = 4) => {
  if (comboLevel <= 0) return 0; // No bonus for combo 0

  // Word length factor - longer words get significantly better combo bonuses
  // This rewards perfectionist players who find quality words
  // Short words still get minimal combo benefit to discourage short word spam
  let wordLengthFactor;
  if (wordLength <= 3) {
    wordLengthFactor = 0.2;  // Very short words - minimal combo bonus
  } else if (wordLength === 4) {
    wordLengthFactor = 0.5;  // Short words - modest combo bonus
  } else if (wordLength === 5) {
    wordLengthFactor = 1.0;  // Medium words - full base bonus
  } else if (wordLength === 6) {
    wordLengthFactor = 1.5;  // Good words - 1.5x bonus
  } else {
    wordLengthFactor = 2.0;  // Long words (7+) - 2x bonus (perfectionist reward)
  }

  // Base bonus scales with combo level, starting from combo 1
  // This helps slower players who build combos more deliberately
  const baseBonus = Math.min(comboLevel, 10); // Caps at 10 bonus points base

  return Math.floor(baseBonus * wordLengthFactor);
};

// Calculate score based on word length - 1 point per letter beyond the first
// This gives every letter value: 2 letters = 1 point, 3 letters = 2 points, 4 letters = 3 points, etc.
// Combo bonus is applied based on word length (longer words benefit more from combos)
const calculateWordScore = (word, comboLevel = 0) => {
  const length = word.length;
  if (length === 1) return 0; // Single letters not allowed
  const baseScore = length - 1; // Each letter beyond the first gets 1 point
  const bonus = getComboBonus(comboLevel, length);
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
