// Scoring calculation utilities

// Calculate score based on word length with bonus for longer words
const calculateWordScore = (word) => {
  const length = word.length;
  if (length === 1) return 0; // Single letters not allowed
  if (length === 2) return 1; // 2-letter words: 1 point
  if (length === 3) return 1; // 3-letter words: 1 point
  if (length === 4) return 2; // 4-letter words: 2 points
  if (length === 5) return 3; // 5-letter words: 3 points
  if (length === 6) return 5; // 6-letter words: 5 points
  if (length === 7) return 7; // 7-letter words: 7 points
  return 10 + (length - 8) * 3; // 8+ letters: 10, 13, 16, 19...
};

module.exports = {
  calculateWordScore
};
