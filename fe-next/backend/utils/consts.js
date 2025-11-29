/**
 * Backend constants
 * Note: This is a JavaScript version of shared constants for Node.js backend use
 */

const DIFFICULTIES = {
  EASY: { nameKey: 'difficulty.easy', rows: 4, cols: 4 },
  MEDIUM: { nameKey: 'difficulty.medium', rows: 5, cols: 5 },
  HARD: { nameKey: 'difficulty.hard', rows: 7, cols: 7 },
  EXPERT: { nameKey: 'difficulty.expert', rows: 9, cols: 9 },
  MASTER: { nameKey: 'difficulty.master', rows: 11, cols: 11 },
};

const DEFAULT_DIFFICULTY = 'HARD';

const DEFAULT_MIN_WORD_LENGTH = 2;

module.exports = {
  DIFFICULTIES,
  DEFAULT_DIFFICULTY,
  DEFAULT_MIN_WORD_LENGTH,
};
