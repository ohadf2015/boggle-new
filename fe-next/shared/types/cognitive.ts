/**
 * Cognitive Scoring System Types
 *
 * Types for the Brain Training feature that tracks 5 cognitive domains:
 * - Processing Speed: How fast you find words
 * - Working Memory: Ability to hold and use multiple pieces of information
 * - Attention: Focus and sustained concentration
 * - Cognitive Flexibility: Ability to switch between different tasks/patterns
 * - Vocabulary: Depth and breadth of word knowledge
 */

// ============================================
// Core Types
// ============================================

/** The five cognitive domains tracked by the brain training system */
export type CognitiveDomain =
  | 'processingSpeed'
  | 'workingMemory'
  | 'attention'
  | 'flexibility'
  | 'vocabulary';

/** Trend direction for domain progress */
export type TrendDirection = 'improving' | 'stable' | 'declining';

/** Brain tier levels based on overall score */
export type BrainTier =
  | 'novice'      // 0-19
  | 'apprentice'  // 20-39
  | 'intermediate' // 40-59
  | 'advanced'    // 60-79
  | 'expert'      // 80-89
  | 'master';     // 90-100

/** Available drill types */
export type DrillType =
  | 'lightning-round'   // Processing Speed
  | 'memory-hunt'       // Working Memory
  | 'combo-master'      // Attention
  | 'pattern-switcher'  // Cognitive Flexibility
  | 'rare-gems';        // Vocabulary

// ============================================
// Score Interfaces
// ============================================

/** Individual domain score with trend */
export interface DomainScore {
  score: number;        // 0-100
  trend: TrendDirection;
}

/** All five domain scores */
export interface CognitiveDomains {
  processingSpeed: DomainScore;
  workingMemory: DomainScore;
  attention: DomainScore;
  flexibility: DomainScore;
  vocabulary: DomainScore;
}

/** Complete brain score profile for a user */
export interface BrainScore {
  id: string;
  userId: string;

  // Scores
  overallScore: number;
  processingSpeed: number;
  workingMemory: number;
  attention: number;
  flexibility: number;
  vocabulary: number;

  // Tier info
  tier: BrainTier;
  tierProgress: number;

  // Activity tracking
  gamesAnalyzed: number;
  drillsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityAt: string | null;

  createdAt: string;
  updatedAt: string;
}

/** Brain score with computed domains (for UI display) */
export interface BrainScoreWithDomains extends Omit<BrainScore, 'processingSpeed' | 'workingMemory' | 'attention' | 'flexibility' | 'vocabulary'> {
  domains: CognitiveDomains;
}

// ============================================
// Game Cognitive Score
// ============================================

/** Raw game data used for cognitive scoring calculation */
export interface GameCognitiveInput {
  // Game results
  wordsFound: number;
  gameDurationSeconds: number;
  gridSize: number;            // 25, 36, or 49

  // Word details
  wordLengths: number[];       // Length of each found word
  maxCombo: number;
  hintsUsed: number;

  // Rarity breakdown
  rareWordCount: number;
  legendaryWordCount: number;

  // Optional for more precise calculations
  totalWordsInGrid?: number;
  comboBreaks?: number;
}

/** Cognitive scores calculated for a single game */
export interface GameCognitiveScore {
  id?: string;
  userId: string;
  gameSessionId?: string;

  // Individual domain scores for this game (0-100)
  processingSpeed: number;
  workingMemory: number;
  attention: number;
  flexibility: number;
  vocabulary: number;

  // Raw metrics stored for reference
  wordsPerMinute: number;
  avgWordLength: number;
  maxCombo: number;
  uniqueWordLengths: number;
  rareWordCount: number;
  legendaryWordCount: number;
  hintsUsed: number;
  gridSize: number;
  gameDurationSeconds: number;

  createdAt?: string;
}

// ============================================
// History & Progress
// ============================================

/** Period type for historical snapshots */
export type HistoryPeriodType = 'daily' | 'weekly' | 'monthly';

/** Historical brain score snapshot */
export interface BrainScoreHistory {
  id: string;
  userId: string;

  periodType: HistoryPeriodType;
  periodStart: string;  // ISO date string

  // Scores at this snapshot
  overallScore: number;
  processingSpeed: number;
  workingMemory: number;
  attention: number;
  flexibility: number;
  vocabulary: number;

  // Activity during this period
  gamesPlayed: number;
  drillsCompleted: number;

  createdAt: string;
}

// ============================================
// Drill Types
// ============================================

/** Progress for a specific drill type */
export interface DrillProgress {
  id: string;
  userId: string;
  drillType: DrillType;

  level: number;        // 1-5
  highScore: number;
  totalPlays: number;
  totalScore: number;
  avgScore: number;

  lastPlayedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Individual drill session result */
export interface DrillSession {
  id: string;
  userId: string;

  drillType: DrillType;
  level: number;        // 1-5

  score: number;
  durationSeconds: number;
  wordsFound: number;

  domainScoreEarned: number;

  createdAt: string;
}

/** Drill configuration for each level */
export interface DrillLevelConfig {
  level: number;
  targetScore: number;     // Score needed to unlock next level
  timeLimit?: number;       // In seconds, if applicable
  extraParams: Record<string, number | string>;  // Drill-specific parameters
}

/** Full drill definition */
export interface DrillDefinition {
  id: DrillType;
  domain: CognitiveDomain;
  name: string;
  description: string;
  icon: string;
  color: string;
  levels: DrillLevelConfig[];
}

// ============================================
// Tier Configuration
// ============================================

/** Configuration for each brain tier */
export interface TierConfig {
  tier: BrainTier;
  minScore: number;
  maxScore: number;
  nextTier: BrainTier | null;
  color: string;
}

/** All tier configurations */
export const TIER_CONFIGS: TierConfig[] = [
  { tier: 'novice', minScore: 0, maxScore: 19, nextTier: 'apprentice', color: 'slate-400' },
  { tier: 'apprentice', minScore: 20, maxScore: 39, nextTier: 'intermediate', color: 'neo-green' },
  { tier: 'intermediate', minScore: 40, maxScore: 59, nextTier: 'advanced', color: 'neo-cyan' },
  { tier: 'advanced', minScore: 60, maxScore: 79, nextTier: 'expert', color: 'neo-purple' },
  { tier: 'expert', minScore: 80, maxScore: 89, nextTier: 'master', color: 'neo-orange' },
  { tier: 'master', minScore: 90, maxScore: 100, nextTier: null, color: 'neo-yellow' },
];

// ============================================
// Scoring Constants
// ============================================

/** Thresholds for processing speed calculation by grid size */
export const WPM_THRESHOLDS: Record<number, number> = {
  25: 12,   // 5x5 grid - expect ~12 WPM for 100 score
  36: 14,   // 6x6 grid - expect ~14 WPM for 100 score
  49: 15,   // 7x7 grid - expect ~15 WPM for 100 score
};

/** Grid normalizers for working memory calculation */
export const GRID_NORMALIZERS: Record<number, number> = {
  25: 1.0,
  36: 1.15,
  49: 1.3,
};

/** Domain weights for overall score calculation */
export const DOMAIN_WEIGHTS: Record<CognitiveDomain, number> = {
  processingSpeed: 0.20,
  workingMemory: 0.25,
  attention: 0.20,
  flexibility: 0.15,
  vocabulary: 0.20,
};

/** Mapping from drill type to target domain */
export const DRILL_DOMAINS: Record<DrillType, CognitiveDomain> = {
  'lightning-round': 'processingSpeed',
  'memory-hunt': 'workingMemory',
  'combo-master': 'attention',
  'pattern-switcher': 'flexibility',
  'rare-gems': 'vocabulary',
};
