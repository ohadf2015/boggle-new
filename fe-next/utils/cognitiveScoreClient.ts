/**
 * Client-side Cognitive Score Calculator
 * Wrapper for cognitive score calculations that works in browser environment
 */

import type {
  CognitiveDomainScores,
  GameCognitiveScores,
  CognitiveCalculationInput,
  BrainScoreWeights,
} from '@/shared/types/cognitiveScores';
import { DEFAULT_BRAIN_SCORE_WEIGHTS } from '@/shared/types/cognitiveScores';

// ==================== Configuration ====================

const COGNITIVE_CONFIG = {
  // Words per minute baselines by grid size (for normalization)
  BASELINE_WPM: {
    '5x5': 12,
    '7x7': 18,
    '9x9': 25,
  } as Record<string, number>,

  // Achievement bonuses
  ACHIEVEMENT_BONUSES: {
    SPEED_DEMON: { domain: 'processingSpeed' as const, bonus: 0.1 },
    LIGHTNING_ROUND: { domain: 'processingSpeed' as const, bonus: 0.08 },
    SPEED_LEGEND: { domain: 'processingSpeed' as const, bonus: 0.15 },
    QUICK_THINKER: { domain: 'processingSpeed' as const, bonus: 0.05 },
    WORD_MASTER: { domain: 'workingMemory' as const, bonus: 0.1 },
    TREASURE_HUNTER: { domain: 'workingMemory' as const, bonus: 0.12 },
    RARE_GEM: { domain: 'workingMemory' as const, bonus: 0.15 },
    LONG_WORD_CHAIN: { domain: 'workingMemory' as const, bonus: 0.1 },
    COMBO_KING: { domain: 'attention' as const, bonus: 0.1 },
    COMBO_GOD: { domain: 'attention' as const, bonus: 0.15 },
    STREAK_MASTER: { domain: 'attention' as const, bonus: 0.08 },
    UNSTOPPABLE: { domain: 'attention' as const, bonus: 0.12 },
    DIVERSE_VOCABULARY: { domain: 'cognitiveFlexibility' as const, bonus: 0.1 },
    EXPLORER: { domain: 'cognitiveFlexibility' as const, bonus: 0.15 },
    ANAGRAM_ARTIST: { domain: 'cognitiveFlexibility' as const, bonus: 0.08 },
    WORDSMITH: { domain: 'vocabulary' as const, bonus: 0.05 },
    LEXICON: { domain: 'vocabulary' as const, bonus: 0.08 },
    VOCABULARY_TITAN: { domain: 'vocabulary' as const, bonus: 0.12 },
    DICTIONARY_DIVER: { domain: 'vocabulary' as const, bonus: 0.1 },
  } as Record<string, { domain: keyof CognitiveDomainScores; bonus: number }>,

  MIN_SCORE: 0,
  MAX_SCORE: 100,
  HINT_PENALTY: 8,
  MAX_HINT_PENALTY: 3,
};

// ==================== Helper Functions ====================

function clampScore(score: number): number {
  return Math.round(
    Math.max(COGNITIVE_CONFIG.MIN_SCORE, Math.min(COGNITIVE_CONFIG.MAX_SCORE, score))
  );
}

function getGridKey(gridSize: { rows: number; cols: number }): string {
  return `${gridSize.rows}x${gridSize.cols}`;
}

function applyAchievementBonus(
  baseScore: number,
  domain: keyof CognitiveDomainScores,
  achievements: string[]
): number {
  let score = baseScore;
  for (const achievementKey of achievements) {
    const bonusConfig = COGNITIVE_CONFIG.ACHIEVEMENT_BONUSES[achievementKey];
    if (bonusConfig && bonusConfig.domain === domain) {
      score = score * (1 + bonusConfig.bonus);
    }
  }
  return score;
}

// ==================== Domain Calculations ====================

function calculateProcessingSpeed(input: CognitiveCalculationInput): number {
  const { wordsFound, gameDuration, gridSize, achievements } = input;
  if (gameDuration <= 0) return 0;

  const gridKey = getGridKey(gridSize);
  const baseline = COGNITIVE_CONFIG.BASELINE_WPM[gridKey] || 15;
  const wpm = (wordsFound / gameDuration) * 60;
  let score = (wpm / baseline) * 50;
  score = applyAchievementBonus(score, 'processingSpeed', achievements);
  return clampScore(score);
}

function calculateWorkingMemory(input: CognitiveCalculationInput): number {
  const { playerWordDetails, gridSize, achievements } = input;
  const validWords = playerWordDetails.filter(w => w.validated !== false);
  if (validWords.length === 0) return 0;

  const avgLength = validWords.reduce((sum, w) => sum + w.word.length, 0) / validWords.length;
  const gridCells = gridSize.rows * gridSize.cols;
  const gridMultiplier = Math.sqrt(gridCells) / 5;
  let score = ((avgLength - 2) * gridMultiplier / 4) * 80;

  const longWordCount = validWords.filter(w => w.word.length >= 7).length;
  const longWordRatio = longWordCount / validWords.length;
  score += longWordRatio * 25;

  score = applyAchievementBonus(score, 'workingMemory', achievements);
  return clampScore(score);
}

function calculateAttention(input: CognitiveCalculationInput): number {
  const { maxCombo, validWordsFound, hintsUsed, achievements, accuracy } = input;
  if (validWordsFound === 0) return 0;

  const comboRatio = maxCombo / Math.max(1, validWordsFound);
  let score = Math.min(90, comboRatio * 130);
  score += accuracy * 0.1;

  // Hint penalty for singleplayer
  if (hintsUsed !== undefined && hintsUsed > 0) {
    const hintPenalty = Math.min(
      hintsUsed * COGNITIVE_CONFIG.HINT_PENALTY,
      COGNITIVE_CONFIG.HINT_PENALTY * COGNITIVE_CONFIG.MAX_HINT_PENALTY
    );
    score = Math.max(0, score - hintPenalty);
  }

  score = applyAchievementBonus(score, 'attention', achievements);
  return clampScore(score);
}

function calculateCognitiveFlexibility(input: CognitiveCalculationInput): number {
  const { playerWordDetails, achievements } = input;
  const validWords = playerWordDetails.filter(w => w.validated !== false);
  if (validWords.length < 3) return 0;

  const wordLengths = validWords.map(w => w.word.length);
  const uniqueLengths = new Set(wordLengths);
  const possibleLengths = 8;
  let score = (uniqueLengths.size / possibleLengths) * 70;

  const shortWords = validWords.filter(w => w.word.length <= 4).length;
  const longWords = validWords.filter(w => w.word.length >= 6).length;
  if (shortWords > 0 && longWords > 0) {
    const balance = Math.min(shortWords, longWords) / Math.max(shortWords, longWords);
    score += balance * 20;
  }

  const uniqueFirstLetters = new Set(validWords.map(w => w.word[0]?.toLowerCase()));
  const letterVariety = uniqueFirstLetters.size / 26;
  score += letterVariety * 10;

  score = applyAchievementBonus(score, 'cognitiveFlexibility', achievements);
  return clampScore(score);
}

function calculateVocabulary(input: CognitiveCalculationInput): number {
  const { playerWordDetails, achievements } = input;
  const validWords = playerWordDetails.filter(w => w.validated !== false);
  if (validWords.length === 0) return 0;

  const rareWords = validWords.filter(
    w => w.wordRarity === 'rare' || w.wordRarity === 'legendary'
  ).length;
  const legendaryWords = validWords.filter(w => w.wordRarity === 'legendary').length;
  const uncommonWords = validWords.filter(w => w.wordRarity === 'uncommon').length;

  const rarityScore = (rareWords + legendaryWords * 2 + uncommonWords * 0.5) / validWords.length;
  let score = Math.min(70, rarityScore * 150);

  const avgLength = validWords.reduce((sum, w) => sum + w.word.length, 0) / validWords.length;
  score += Math.min(20, (avgLength - 3) * 5);

  const uniqueFirstLetters = new Set(validWords.map(w => w.word[0]?.toLowerCase()));
  const letterDiversity = uniqueFirstLetters.size / Math.min(validWords.length, 20);
  score += letterDiversity * 10;

  score = applyAchievementBonus(score, 'vocabulary', achievements);
  return clampScore(score);
}

function calculateBrainScore(
  domains: CognitiveDomainScores,
  weights: BrainScoreWeights = DEFAULT_BRAIN_SCORE_WEIGHTS
): number {
  const weightedSum =
    domains.processingSpeed * weights.processingSpeed +
    domains.workingMemory * weights.workingMemory +
    domains.attention * weights.attention +
    domains.cognitiveFlexibility * weights.cognitiveFlexibility +
    domains.vocabulary * weights.vocabulary;
  return clampScore(weightedSum);
}

// ==================== Main Export ====================

/**
 * Calculate cognitive scores for a singleplayer game
 * Client-side version that can be used in React components
 */
export function calculateGameCognitiveScores(
  input: CognitiveCalculationInput,
  gameMode: 'singleplayer' | 'multiplayer' = 'singleplayer'
): GameCognitiveScores {
  const domains: CognitiveDomainScores = {
    processingSpeed: calculateProcessingSpeed(input),
    workingMemory: calculateWorkingMemory(input),
    attention: calculateAttention(input),
    cognitiveFlexibility: calculateCognitiveFlexibility(input),
    vocabulary: calculateVocabulary(input),
  };

  const brainScore = calculateBrainScore(domains);

  return {
    domains,
    brainScore,
    timestamp: Date.now(),
    gameMode,
    gridSize: getGridKey(input.gridSize),
    gameDuration: input.gameDuration,
  };
}

/**
 * Build cognitive calculation input from singleplayer game data
 */
export function buildCognitiveInputFromSinglePlayer(data: {
  playerWordData: Array<{
    word: string;
    score: number;
    isValid: boolean;
    comboBonus?: number;
    timestamp?: number;
    timeSinceStart?: number;
  }>;
  gameDuration: number;
  gridSize: { rows: number; cols: number };
  maxCombo: number;
  hintsUsed: number;
  achievements: string[];
}): CognitiveCalculationInput {
  const validWords = data.playerWordData.filter(w => w.isValid);

  return {
    wordsFound: data.playerWordData.length,
    validWordsFound: validWords.length,
    score: validWords.reduce((sum, w) => sum + w.score, 0),
    gameDuration: data.gameDuration,
    gridSize: data.gridSize,
    maxCombo: data.maxCombo,
    playerWordDetails: data.playerWordData.map(w => ({
      word: w.word,
      timestamp: w.timestamp,
      timeSinceStart: w.timeSinceStart,
      comboBonus: w.comboBonus || 0,
      validated: w.isValid,
      // In singleplayer, we don't have rarity data from multiplayer comparison
      // Longer words are considered more rare
      wordRarity: w.word.length >= 8 ? 'rare' as const :
                  w.word.length >= 6 ? 'uncommon' as const : 'common' as const,
    })),
    hintsUsed: data.hintsUsed,
    accuracy: data.playerWordData.length > 0
      ? (validWords.length / data.playerWordData.length) * 100
      : 0,
    achievements: data.achievements,
  };
}
