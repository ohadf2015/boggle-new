// Scoring calculation utilities

const { getGame, getLeaderboard } = require('./gameStateManager');

// Calculate score based on word length - 1 point per letter beyond the first
// This gives every letter value: 2 letters = 1 point, 3 letters = 2 points, 4 letters = 3 points, etc.
const calculateWordScore = (word) => {
  const length = word.length;
  if (length === 1) return 0; // Single letters not allowed
  return length - 1; // Each letter beyond the first gets 1 point
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
  calculateGameScores
};
