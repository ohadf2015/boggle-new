// Scoring calculation utilities - ported from fe-next/backend/modules/scoringEngine.js

// Calculate combo multiplier based on combo level
// Combo 0: 1x (no bonus)
// Combo 1: 1.1x (+10%)
// Combo 2: 1.2x (+20%)
// Combo 3: 1.4x (+40%)
// Combo 4: 1.6x (+60%)
// Combo 5: 1.8x (+80%)
// Combo 6+: 2.0x (max bonus, +100%)
export const getComboMultiplier = (comboLevel: number): number => {
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
export const calculateWordScore = (word: string, comboLevel = 0): number => {
  const length = word.length;
  if (length === 1) return 0; // Single letters not allowed
  const baseScore = length - 1; // Each letter beyond the first gets 1 point
  const multiplier = getComboMultiplier(comboLevel);
  return Math.floor(baseScore * multiplier);
};

// Word score entry for display
export interface WordScoreEntry {
  word: string;
  score: number;
  comboLevel?: number;
  validated?: boolean;
  isDuplicate?: boolean;
}

// Player score summary
export interface PlayerScoreSummary {
  totalScore: number;
  words: WordScoreEntry[];
  wordCount: number;
}

// Calculate scores for a list of words (client-side version)
export const calculateWordsScore = (
  words: string[],
  comboLevels?: number[]
): PlayerScoreSummary => {
  const uniqueWords = [...new Set(words)];
  let totalScore = 0;

  const wordScores: WordScoreEntry[] = uniqueWords.map((word, index) => {
    const comboLevel = comboLevels?.[index] || 0;
    const score = calculateWordScore(word, comboLevel);
    totalScore += score;
    return { word, score, comboLevel };
  });

  return {
    totalScore,
    words: wordScores,
    wordCount: uniqueWords.length
  };
};
