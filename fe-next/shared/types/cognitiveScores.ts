/**
 * Cognitive Skills Tracking Types
 * Defines cognitive domains, score structures, and calculation inputs
 * for the Brain Training feature
 */

// ==================== Core Domain Scores ====================

/**
 * Individual cognitive domain scores (0-100 each)
 */
export interface CognitiveDomainScores {
  /** How quickly words are found and submitted (words per minute, normalized) */
  processingSpeed: number;
  /** Ability to track patterns and find longer words on larger grids */
  workingMemory: number;
  /** Focus and consistency - combo maintenance, avoiding hints */
  attention: number;
  /** Diversity of word lengths and strategy adaptation */
  cognitiveFlexibility: number;
  /** Knowledge of rare/unusual words */
  vocabulary: number;
}

/**
 * Keys for cognitive domains (for iteration)
 */
export type CognitiveDomainKey = keyof CognitiveDomainScores;

/**
 * All cognitive domain keys
 */
export const COGNITIVE_DOMAIN_KEYS: CognitiveDomainKey[] = [
  'processingSpeed',
  'workingMemory',
  'attention',
  'cognitiveFlexibility',
  'vocabulary',
];

// ==================== Per-Game Scores ====================

/**
 * Per-game cognitive assessment
 */
export interface GameCognitiveScores {
  /** Individual domain scores */
  domains: CognitiveDomainScores;
  /** Weighted average brain score (0-100) */
  brainScore: number;
  /** When calculated (ms since epoch) */
  timestamp: number;
  /** Game mode */
  gameMode: 'singleplayer' | 'multiplayer';
  /** Grid size (e.g., "5x5", "7x7", "9x9") */
  gridSize: string;
  /** Game duration in seconds */
  gameDuration: number;
}

// ==================== Lifetime Profile ====================

/**
 * Trend direction indicator
 * -1 = declining, 0 = stable, 1 = improving
 */
export type TrendDirection = -1 | 0 | 1;

/**
 * Trend indicators for all domains plus overall
 */
export interface CognitiveTrends {
  processingSpeed: TrendDirection;
  workingMemory: TrendDirection;
  attention: TrendDirection;
  cognitiveFlexibility: TrendDirection;
  vocabulary: TrendDirection;
  overall: TrendDirection;
}

/**
 * Lifetime/rolling cognitive profile stored in user profile
 */
export interface CognitiveProfile {
  /** Rolling 30-game averages */
  currentScores: CognitiveDomainScores;
  /** Current weighted brain score average */
  currentBrainScore: number;
  /** All-time peak scores */
  peakScores: CognitiveDomainScores;
  /** All-time peak brain score */
  peakBrainScore: number;
  /** Trend indicators for each domain */
  trends: CognitiveTrends;
  /** Number of games analyzed */
  gamesAnalyzed: number;
  /** ISO date of last update */
  lastUpdated: string;
}

// ==================== Calculation Inputs ====================

/**
 * Word detail for cognitive calculation
 */
export interface CognitiveWordDetail {
  /** The word text */
  word: string;
  /** Timestamp when found (ms since epoch) */
  timestamp?: number;
  /** Time since game start (seconds) */
  timeSinceStart?: number;
  /** Combo bonus earned */
  comboBonus?: number;
  /** Whether word was validated */
  validated?: boolean;
  /** Word rarity category */
  wordRarity?: 'common' | 'uncommon' | 'rare' | 'legendary';
}

/**
 * Input data for cognitive score calculation
 */
export interface CognitiveCalculationInput {
  // Per-game data
  /** Total words found (including invalid) */
  wordsFound: number;
  /** Valid words that counted toward score */
  validWordsFound: number;
  /** Total game score */
  score: number;
  /** Game duration in seconds */
  gameDuration: number;
  /** Grid dimensions */
  gridSize: { rows: number; cols: number };
  /** Maximum combo achieved */
  maxCombo: number;

  /** Word details for analysis */
  playerWordDetails: CognitiveWordDetail[];

  // Game-specific
  /** Number of hints used (singleplayer only) */
  hintsUsed?: number;
  /** Accuracy percentage (valid/total) */
  accuracy: number;

  // Achievement context
  /** Achievement keys earned in this game */
  achievements: string[];
}

/**
 * Lifetime context for calculation (from user profile)
 */
export interface CognitiveLifetimeContext {
  /** Total games played */
  totalGames: number;
  /** Achievement counts by key */
  achievementCounts: Record<string, number>;
  /** Total hints used across all games */
  totalHintsUsed: number;
  /** Previous cognitive profile (for trend calculation) */
  previousProfile?: CognitiveProfile | null;
}

// ==================== Configuration ====================

/**
 * Brain score weights configuration
 */
export interface BrainScoreWeights {
  processingSpeed: number;
  workingMemory: number;
  attention: number;
  cognitiveFlexibility: number;
  vocabulary: number;
}

/**
 * Default equal weights (20% each)
 */
export const DEFAULT_BRAIN_SCORE_WEIGHTS: BrainScoreWeights = {
  processingSpeed: 0.2,
  workingMemory: 0.2,
  attention: 0.2,
  cognitiveFlexibility: 0.2,
  vocabulary: 0.2,
};

// ==================== UI Display ====================

/**
 * Domain configuration for UI display
 */
export interface CognitiveDomainConfig {
  /** Domain key */
  key: CognitiveDomainKey;
  /** Display icon (emoji) */
  icon: string;
  /** Tailwind color class for text/accents */
  color: string;
  /** Tailwind background color class */
  bgColor: string;
  /** Translation key for label */
  labelKey: string;
  /** Translation key for description tooltip */
  descriptionKey: string;
}

/**
 * UI configuration for all cognitive domains
 */
export const COGNITIVE_DOMAIN_CONFIG: CognitiveDomainConfig[] = [
  {
    key: 'processingSpeed',
    icon: '⚡',
    color: 'text-neo-yellow',
    bgColor: 'bg-neo-yellow',
    labelKey: 'cognitive.processingSpeed',
    descriptionKey: 'cognitive.processingSpeedDesc',
  },
  {
    key: 'workingMemory',
    icon: '🧠',
    color: 'text-neo-cyan',
    bgColor: 'bg-neo-cyan',
    labelKey: 'cognitive.workingMemory',
    descriptionKey: 'cognitive.workingMemoryDesc',
  },
  {
    key: 'attention',
    icon: '🎯',
    color: 'text-neo-pink',
    bgColor: 'bg-neo-pink',
    labelKey: 'cognitive.attention',
    descriptionKey: 'cognitive.attentionDesc',
  },
  {
    key: 'cognitiveFlexibility',
    icon: '🔀',
    color: 'text-neo-orange',
    bgColor: 'bg-neo-orange',
    labelKey: 'cognitive.cognitiveFlexibility',
    descriptionKey: 'cognitive.cognitiveFlexibilityDesc',
  },
  {
    key: 'vocabulary',
    icon: '📚',
    color: 'text-neo-lime',
    bgColor: 'bg-neo-lime',
    labelKey: 'cognitive.vocabulary',
    descriptionKey: 'cognitive.vocabularyDesc',
  },
];

/**
 * Get config for a specific domain
 */
export function getDomainConfig(key: CognitiveDomainKey): CognitiveDomainConfig | undefined {
  return COGNITIVE_DOMAIN_CONFIG.find(c => c.key === key);
}

// ==================== Score Levels ====================

/**
 * Score level thresholds for categorization
 */
export const SCORE_LEVELS = {
  EXCELLENT: 85,
  GREAT: 70,
  GOOD: 55,
  IMPROVING: 40,
  NEEDS_PRACTICE: 0,
} as const;

/**
 * Get score level label key for a score
 */
export function getScoreLevelKey(score: number): string {
  if (score >= SCORE_LEVELS.EXCELLENT) return 'cognitive.excellent';
  if (score >= SCORE_LEVELS.GREAT) return 'cognitive.great';
  if (score >= SCORE_LEVELS.GOOD) return 'cognitive.good';
  if (score >= SCORE_LEVELS.IMPROVING) return 'cognitive.improving';
  return 'cognitive.needsPractice';
}

/**
 * Get encouragement message key based on brain score
 */
export function getEncouragementKey(brainScore: number): string {
  if (brainScore >= SCORE_LEVELS.EXCELLENT) return 'cognitive.excellentScore';
  if (brainScore >= SCORE_LEVELS.GREAT) return 'cognitive.greatScore';
  if (brainScore >= SCORE_LEVELS.GOOD) return 'cognitive.goodScore';
  if (brainScore >= SCORE_LEVELS.IMPROVING) return 'cognitive.improvingScore';
  return 'cognitive.lowScore';
}
