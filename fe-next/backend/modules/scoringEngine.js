// Scoring calculation utilities

// Calculate score based on word length - 1 point per letter beyond the first
// This gives every letter value: 2 letters = 1 point, 3 letters = 2 points, 4 letters = 3 points, etc.
const calculateWordScore = (word) => {
  const length = word.length;
  if (length === 1) return 0; // Single letters not allowed
  return length - 1; // Each letter beyond the first gets 1 point
};

module.exports = {
  calculateWordScore
};
