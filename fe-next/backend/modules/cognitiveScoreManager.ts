/**
 * Cognitive Score Manager
 * Calculates and manages cognitive skill scores for players
 *
 * Follows patterns from:
 * - xpManager.ts (calculation and configuration pattern)
 * - achievementManager.ts (per-game and lifetime tracking)
 * - playerArchetypes.ts (player classification)
 */

import type {
  CognitiveDomainScores,
  GameCognitiveScores,
  CognitiveProfile,
  CognitiveCalculationInput,
  CognitiveLifetimeContext,
  BrainScoreWeights,
  CognitiveTrends,
  TrendDirection,
} from '@/shared/types/cognitiveScores';
import { DEFAULT_BRAIN_SCORE_WEIGHTS } from '@/shared/types/cognitiveScores';

// ==================== Configuration ====================

export const COGNITIVE_CONFIG = {
  // Words per minute baselines by grid size (for normalization)
  // These represent "good" performance levels
  BASELINE_WPM: {
    '5x5': 12, // Smaller grid = fewer words expected
    '7x7': 18, // Medium grid
    '9x9': 25, // Larger grid = more words possible
  } as Record<string, number>,

  // Achievement weights for cognitive factor bonuses
  ACHIEVEMENT_BONUSES: {
    // Processing Speed achievements
    SPEED_DEMON: { domain: 'processingSpeed' as const, bonus: 0.1 },
    LIGHTNING_ROUND: { domain: 'processingSpeed' as const, bonus: 0.08 },
    SPEED_LEGEND: { domain: 'processingSpeed' as const, bonus: 0.15 },
    QUICK_THINKER: { domain: 'processingSpeed' as const, bonus: 0.05 },

    // Working Memory achievements
    WORD_MASTER: { domain: 'workingMemory' as const, bonus: 0.1 },
    TREASURE_HUNTER: { domain: 'workingMemory' as const, bonus: 0.12 },
    RARE_GEM: { domain: 'workingMemory' as const, bonus: 0.15 },
    LONG_WORD_CHAIN: { domain: 'workingMemory' as const, bonus: 0.1 },

    // Attention achievements
    COMBO_KING: { domain: 'attention' as const, bonus: 0.1 },
    COMBO_GOD: { domain: 'attention' as const, bonus: 0.15 },
    STREAK_MASTER: { domain: 'attention' as const, bonus: 0.08 },
    UNSTOPPABLE: { domain: 'attention' as const, bonus: 0.12 },

    // Cognitive Flexibility achievements
    DIVERSE_VOCABULARY: { domain: 'cognitiveFlexibility' as const, bonus: 0.1 },
    EXPLORER: { domain: 'cognitiveFlexibility' as const, bonus: 0.15 },
    ANAGRAM_ARTIST: { domain: 'cognitiveFlexibility' as const, bonus: 0.08 },

    // Vocabulary achievements
    WORDSMITH: { domain: 'vocabulary' as const, bonus: 0.05 },
    LEXICON: { domain: 'vocabulary' as const, bonus: 0.08 },
    VOCABULARY_TITAN: { domain: 'vocabulary' as const, bonus: 0.12 },
    DICTIONARY_DIVER: { domain: 'vocabulary' as const, bonus: 0.1 },
  } as Record<string, { domain: keyof CognitiveDomainScores; bonus: number }>,

  // Score boundaries
  MIN_SCORE: 0,
  MAX_SCORE: 100,

  // Rolling average window for profile
  ROLLING_WINDOW_SIZE: 30,

  // Minimum games before showing trends
  MIN_GAMES_FOR_TREND: 5,

  // Trend threshold (change needed to count as improving/declining)
  TREND_THRESHOLD: 3,

  // Hint penalty for attention score (per hint used)
  HINT_PENALTY: 8,

  // Max hints before score bottoms out
  MAX_HINT_PENALTY: 3,
} as const;

// ==================== Helper Functions ====================

/**
 * Clamp a value between min and max, then round
 */
function clampScore(score: number): number {
  return Math.round(
    Math.max(COGNITIVE_CONFIG.MIN_SCORE, Math.min(COGNITIVE_CONFIG.MAX_SCORE, score))
  );
}

/**
 * Get grid key from dimensions
 */
function getGridKey(gridSize: { rows: number; cols: number }): string {
  return `${gridSize.rows}x${gridSize.cols}`;
}

/**
 * Apply achievement bonuses for a specific domain
 */
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

// ==================== Domain Calculation Functions ====================

/**
 * Calculate Processing Speed score (0-100)
 * Measures: words found per minute, normalized by grid complexity
 */
export function calculateProcessingSpeed(
  input: CognitiveCalculationInput,
  _context?: CognitiveLifetimeContext
): number {
  const { wordsFound, gameDuration, gridSize, achievements } = input;

  if (gameDuration <= 0) return 0;

  const gridKey = getGridKey(gridSize);
  const baseline = COGNITIVE_CONFIG.BASELINE_WPM[gridKey] || 15;

  // Words per minute
  const wpm = (wordsFound / gameDuration) * 60;

  // Base score: WPM relative to baseline
  // At baseline = 50, at 2x baseline = 100
  let score = (wpm / baseline) * 50;

  // Apply achievement bonuses
  score = applyAchievementBonus(score, 'processingSpeed', achievements);

  return clampScore(score);
}

/**
 * Calculate Working Memory score (0-100)
 * Measures: ability to hold and process complex letter patterns
 */
export function calculateWorkingMemory(
  input: CognitiveCalculationInput,
  _context?: CognitiveLifetimeContext
): number {
  const { playerWordDetails, gridSize, achievements } = input;

  const validWords = playerWordDetails.filter(w => w.validated !== false);

  if (validWords.length === 0) return 0;

  // Average word length (longer words = more working memory load)
  const avgLength =
    validWords.reduce((sum, w) => sum + w.word.length, 0) / validWords.length;

  // Grid complexity multiplier (larger grids = harder to track)
  // 5x5 = 25, 7x7 = 49, 9x9 = 81
  const gridCells = gridSize.rows * gridSize.cols;
  const gridMultiplier = Math.sqrt(gridCells) / 5; // 5x5=1.0, 7x7=1.4, 9x9=1.8

  // Base score: avg word length with grid bonus
  // avgLength of 4 on 5x5 = ~40, avgLength of 6 on 9x9 = ~86
  let score = ((avgLength - 2) * gridMultiplier / 4) * 80;

  // Bonus for finding 7+ letter words (requires stronger working memory)
  const longWordCount = validWords.filter(w => w.word.length >= 7).length;
  const longWordRatio = longWordCount / validWords.length;
  score += longWordRatio * 25;

  // Apply achievement bonuses
  score = applyAchievementBonus(score, 'workingMemory', achievements);

  return clampScore(score);
}

/**
 * Calculate Attention score (0-100)
 * Measures: sustained focus, combo maintenance, minimal distractions
 */
export function calculateAttention(
  input: CognitiveCalculationInput,
  context?: CognitiveLifetimeContext
): number {
  const { maxCombo, validWordsFound, hintsUsed, achievements, accuracy } = input;

  if (validWordsFound === 0) return 0;

  // Combo consistency: max combo relative to total valid words
  // High combo with many words = sustained attention
  const comboRatio = maxCombo / Math.max(1, validWordsFound);

  // Base score from combo performance
  // comboRatio of 0.5 = ~65, comboRatio of 0.7 = ~90
  let score = Math.min(90, comboRatio * 130);

  // Accuracy bonus (attention helps avoid invalid submissions)
  score += accuracy * 0.1; // Up to +10 for 100% accuracy

  // Hint penalty (singleplayer only) - using hints suggests attention lapses
  if (hintsUsed !== undefined && hintsUsed > 0) {
    const hintPenalty = Math.min(
      hintsUsed * COGNITIVE_CONFIG.HINT_PENALTY,
      COGNITIVE_CONFIG.HINT_PENALTY * COGNITIVE_CONFIG.MAX_HINT_PENALTY
    );
    score = Math.max(0, score - hintPenalty);
  }

  // Lifetime no-hint bonus (from context)
  if (context && context.totalGames > 0) {
    const gamesWithoutHints = Math.max(
      0,
      context.totalGames - Math.ceil(context.totalHintsUsed / 3)
    ); // Assume ~3 hints per hint-using game
    const noHintRatio = gamesWithoutHints / context.totalGames;
    score = Math.min(100, score + noHintRatio * 10);
  }

  // Apply achievement bonuses
  score = applyAchievementBonus(score, 'attention', achievements);

  return clampScore(score);
}

/**
 * Calculate Cognitive Flexibility score (0-100)
 * Measures: ability to switch between different word patterns and lengths
 */
export function calculateCognitiveFlexibility(
  input: CognitiveCalculationInput,
  _context?: CognitiveLifetimeContext
): number {
  const { playerWordDetails, achievements } = input;

  const validWords = playerWordDetails.filter(w => w.validated !== false);

  if (validWords.length < 3) return 0;

  // Count unique word lengths used
  const wordLengths = validWords.map(w => w.word.length);
  const uniqueLengths = new Set(wordLengths);
  const possibleLengths = 8; // Typically 3-10 letter words (8 possible lengths)

  // Base score: diversity of word lengths
  let score = (uniqueLengths.size / possibleLengths) * 70;

  // Balance bonus: mixing short and long words (not just one type)
  const shortWords = validWords.filter(w => w.word.length <= 4).length;
  const longWords = validWords.filter(w => w.word.length >= 6).length;

  if (shortWords > 0 && longWords > 0) {
    const balance =
      Math.min(shortWords, longWords) / Math.max(shortWords, longWords);
    score += balance * 20;
  }

  // Variety in first letters (shows exploration of different board areas)
  const uniqueFirstLetters = new Set(
    validWords.map(w => w.word[0]?.toLowerCase())
  );
  const letterVariety = uniqueFirstLetters.size / 26;
  score += letterVariety * 10;

  // Apply achievement bonuses
  score = applyAchievementBonus(score, 'cognitiveFlexibility', achievements);

  return clampScore(score);
}

/**
 * Calculate Vocabulary score (0-100)
 * Measures: knowledge of rare/unusual words
 */
export function calculateVocabulary(
  input: CognitiveCalculationInput,
  _context?: CognitiveLifetimeContext
): number {
  const { playerWordDetails, achievements } = input;

  const validWords = playerWordDetails.filter(w => w.validated !== false);

  if (validWords.length === 0) return 0;

  // Count words by rarity
  const rareWords = validWords.filter(
    w => w.wordRarity === 'rare' || w.wordRarity === 'legendary'
  ).length;
  const legendaryWords = validWords.filter(
    w => w.wordRarity === 'legendary'
  ).length;
  const uncommonWords = validWords.filter(
    w => w.wordRarity === 'uncommon'
  ).length;

  // Rarity ratio score (legendary counts double)
  const rarityScore =
    (rareWords + legendaryWords * 2 + uncommonWords * 0.5) / validWords.length;
  let score = Math.min(70, rarityScore * 150);

  // Word length variety bonus (vocabulary breadth)
  const avgLength =
    validWords.reduce((sum, w) => sum + w.word.length, 0) / validWords.length;
  score += Math.min(20, (avgLength - 3) * 5);

  // Unique first letters bonus (diverse vocabulary)
  const uniqueFirstLetters = new Set(
    validWords.map(w => w.word[0]?.toLowerCase())
  );
  const letterDiversity = uniqueFirstLetters.size / Math.min(validWords.length, 20);
  score += letterDiversity * 10;

  // Apply achievement bonuses
  score = applyAchievementBonus(score, 'vocabulary', achievements);

  return clampScore(score);
}

// ==================== Main Calculation Functions ====================

/**
 * Calculate weighted Brain Score from all domains
 */
export function calculateBrainScore(
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

/**
 * Main entry point: Calculate all cognitive scores for a game
 */
export function calculateGameCognitiveScores(
  input: CognitiveCalculationInput,
  lifetimeContext?: CognitiveLifetimeContext,
  gameMode: 'singleplayer' | 'multiplayer' = 'multiplayer'
): GameCognitiveScores {
  const domains: CognitiveDomainScores = {
    processingSpeed: calculateProcessingSpeed(input, lifetimeContext),
    workingMemory: calculateWorkingMemory(input, lifetimeContext),
    attention: calculateAttention(input, lifetimeContext),
    cognitiveFlexibility: calculateCognitiveFlexibility(input, lifetimeContext),
    vocabulary: calculateVocabulary(input, lifetimeContext),
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

// ==================== Profile Management ====================

/**
 * Calculate trend direction from score change
 */
function calculateTrendDirection(
  currentScore: number,
  previousScore: number
): TrendDirection {
  const diff = currentScore - previousScore;
  if (diff >= COGNITIVE_CONFIG.TREND_THRESHOLD) return 1; // Improving
  if (diff <= -COGNITIVE_CONFIG.TREND_THRESHOLD) return -1; // Declining
  return 0; // Stable
}

/**
 * Create initial cognitive profile from first game
 */
export function createInitialProfile(
  gameScores: GameCognitiveScores
): CognitiveProfile {
  return {
    currentScores: { ...gameScores.domains },
    currentBrainScore: gameScores.brainScore,
    peakScores: { ...gameScores.domains },
    peakBrainScore: gameScores.brainScore,
    trends: {
      processingSpeed: 0,
      workingMemory: 0,
      attention: 0,
      cognitiveFlexibility: 0,
      vocabulary: 0,
      overall: 0,
    },
    gamesAnalyzed: 1,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update lifetime cognitive profile with new game scores
 * Uses exponential moving average for smooth trends
 */
export function updateCognitiveProfile(
  currentProfile: CognitiveProfile | null,
  newGameScores: GameCognitiveScores
): CognitiveProfile {
  // Initialize if no existing profile
  if (!currentProfile) {
    return createInitialProfile(newGameScores);
  }

  const gamesAnalyzed = currentProfile.gamesAnalyzed + 1;

  // Weight for new score (decreases as more games are analyzed, min 1/30)
  const weight = Math.max(
    1 / COGNITIVE_CONFIG.ROLLING_WINDOW_SIZE,
    1 / gamesAnalyzed
  );
  const oldWeight = 1 - weight;

  // Calculate new rolling averages
  const newCurrentScores: CognitiveDomainScores = {
    processingSpeed: clampScore(
      currentProfile.currentScores.processingSpeed * oldWeight +
        newGameScores.domains.processingSpeed * weight
    ),
    workingMemory: clampScore(
      currentProfile.currentScores.workingMemory * oldWeight +
        newGameScores.domains.workingMemory * weight
    ),
    attention: clampScore(
      currentProfile.currentScores.attention * oldWeight +
        newGameScores.domains.attention * weight
    ),
    cognitiveFlexibility: clampScore(
      currentProfile.currentScores.cognitiveFlexibility * oldWeight +
        newGameScores.domains.cognitiveFlexibility * weight
    ),
    vocabulary: clampScore(
      currentProfile.currentScores.vocabulary * oldWeight +
        newGameScores.domains.vocabulary * weight
    ),
  };

  // Update peaks (all-time highs)
  const newPeakScores: CognitiveDomainScores = {
    processingSpeed: Math.max(
      currentProfile.peakScores.processingSpeed,
      newGameScores.domains.processingSpeed
    ),
    workingMemory: Math.max(
      currentProfile.peakScores.workingMemory,
      newGameScores.domains.workingMemory
    ),
    attention: Math.max(
      currentProfile.peakScores.attention,
      newGameScores.domains.attention
    ),
    cognitiveFlexibility: Math.max(
      currentProfile.peakScores.cognitiveFlexibility,
      newGameScores.domains.cognitiveFlexibility
    ),
    vocabulary: Math.max(
      currentProfile.peakScores.vocabulary,
      newGameScores.domains.vocabulary
    ),
  };

  const newCurrentBrainScore = calculateBrainScore(newCurrentScores);
  const newPeakBrainScore = Math.max(
    currentProfile.peakBrainScore,
    newGameScores.brainScore
  );

  // Calculate trends (only if we have enough games)
  const canCalculateTrends =
    gamesAnalyzed >= COGNITIVE_CONFIG.MIN_GAMES_FOR_TREND;

  const newTrends: CognitiveTrends = canCalculateTrends
    ? {
        processingSpeed: calculateTrendDirection(
          newCurrentScores.processingSpeed,
          currentProfile.currentScores.processingSpeed
        ),
        workingMemory: calculateTrendDirection(
          newCurrentScores.workingMemory,
          currentProfile.currentScores.workingMemory
        ),
        attention: calculateTrendDirection(
          newCurrentScores.attention,
          currentProfile.currentScores.attention
        ),
        cognitiveFlexibility: calculateTrendDirection(
          newCurrentScores.cognitiveFlexibility,
          currentProfile.currentScores.cognitiveFlexibility
        ),
        vocabulary: calculateTrendDirection(
          newCurrentScores.vocabulary,
          currentProfile.currentScores.vocabulary
        ),
        overall: calculateTrendDirection(
          newCurrentBrainScore,
          currentProfile.currentBrainScore
        ),
      }
    : currentProfile.trends;

  return {
    currentScores: newCurrentScores,
    currentBrainScore: newCurrentBrainScore,
    peakScores: newPeakScores,
    peakBrainScore: newPeakBrainScore,
    trends: newTrends,
    gamesAnalyzed,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get strongest and weakest domains from scores
 */
export function analyzeDomainStrengths(scores: CognitiveDomainScores): {
  strongest: keyof CognitiveDomainScores;
  weakest: keyof CognitiveDomainScores;
} {
  const entries = Object.entries(scores) as [keyof CognitiveDomainScores, number][];
  entries.sort((a, b) => b[1] - a[1]);

  return {
    strongest: entries[0][0],
    weakest: entries[entries.length - 1][0],
  };
}

// ==================== Exports ====================

// CommonJS exports for backward compatibility with backend
module.exports = {
  COGNITIVE_CONFIG,
  calculateProcessingSpeed,
  calculateWorkingMemory,
  calculateAttention,
  calculateCognitiveFlexibility,
  calculateVocabulary,
  calculateBrainScore,
  calculateGameCognitiveScores,
  createInitialProfile,
  updateCognitiveProfile,
  analyzeDomainStrengths,
};
