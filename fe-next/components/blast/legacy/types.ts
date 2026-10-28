import type { Language } from '@/shared/types/game';

// ==================== Tile Types (canonical source: @/shared/types/blast) ====================

// Import for local use + re-export so all blast component imports can use '../types' without change
import type { BlastTileType, BlastTileState } from '@/shared/types/blast';
export type { BlastTileType, BlastTileState };

// ==================== Difficulty ====================

export type BlastDifficulty = 'easy' | 'medium' | 'hard';

/** Preset configs per difficulty level — tuned for competitive play.
 * Medium is tighter: fewer specials means more strategic word-finding required.
 * Hard has more specials but smaller grid = harder to find long words. */
export const BLAST_DIFFICULTY_PRESETS: Record<BlastDifficulty, {
  specialTileChance: number;
  gridSize: number;
}> = {
  easy:   { specialTileChance: 0.08, gridSize: 6 },
  medium: { specialTileChance: 0.12, gridSize: 6 },
  hard:   { specialTileChance: 0.20, gridSize: 5 },
};

/** Resolve a full BlastGameConfig from language + optional difficulty */
export function resolveBlastConfig(
  language: Language,
  difficulty: BlastDifficulty = 'medium',
): BlastGameConfig {
  const preset = BLAST_DIFFICULTY_PRESETS[difficulty];
  return {
    gridSize: preset.gridSize,
    specialTileChance: preset.specialTileChance,
    language,
    difficulty,
  };
}

// ==================== Game State ====================

export interface BlastGameConfig {
  /** Grid size (rows/cols) — always square */
  gridSize: number;
  /** Chance of a cell being special (0-1) */
  specialTileChance: number;
  /** Game language */
  language: Language;
  /** Difficulty level */
  difficulty?: BlastDifficulty;
  /** Custom special tile distribution (overrides default). Used by wave system. */
  customDistribution?: Record<string, number>;
  /** Board clearing behavior after words are submitted.
   * - 'refill' (default): empty cells are filled with new tiles from above.
   * - 'shrink': board progressively shrinks — cleared cells stay empty. */
  boardClearMode?: 'refill' | 'shrink';
}

export const DEFAULT_BLAST_CONFIG: BlastGameConfig = {
  gridSize: 6,
  specialTileChance: 0.15,
  language: 'en',
  difficulty: 'medium',
  boardClearMode: 'shrink',
};

export type BlastPhase = 'ready' | 'waveIntro' | 'playing' | 'waveTransition' | 'highlight' | 'results';

export interface BlastGameState {
  score: number;
  wordsFound: string[];
  tilesCleared: number;
  totalTiles: number;
  comboCount: number;
  isComplete: boolean;
  /** True when no more valid words can be formed from uncleared tiles */
  isDeadEnd: boolean;
  /** Current cascade chain level (0 = no cascade active) */
  cascadeChainLevel: number;
  /** Moves remaining in the current wave */
  movesRemaining: number;
  /** Moves used so far in the current wave */
  movesUsed: number;
  /** Total moves allowed for the current wave */
  totalMoves: number;
  /** Bonus score accumulated from leftover moves at end of level */
  bonusMoveScore: number;
  /** Per-type count of tiles cleared this wave (for objective tracking) */
  tileTypeClears: Record<BlastTileType, number>;
  /** Diamonds collected this run (earned by rare words) */
  diamondsCollected: number;
  /** Color counts in the last submitted word: { pink, cyan, lime } (for color_power tracking) */
  lastWordColorCounts?: { pink: number; cyan: number; lime: number };
}

/** Per-wave summary for results breakdown */
export interface WaveResult {
  waveNumber: number;
  score: number;
  wordsFound: number;
  clearPercentage: number;
  /** Coins, stars and chest bonus earned by clearing this wave */
  reward?: import('./utils/blastWaveConfig').BlastWaveClearReward;
}

// ==================== Results ====================

export interface BlastResultsData {
  finalScore: number;
  tilesCleared: number;
  totalTiles: number;
  clearPercentage: number;
  wordsFound: string[];
  bestWord: string;
  maxCombo: number;
  /** 1-3 stars based on clear percentage */
  stars: 1 | 2 | 3;
  /** Number of waves completed (0 = failed on wave 1) */
  wavesCompleted: number;
  /** Per-wave breakdown for results screen */
  waveResults: WaveResult[];
  /** Weekly leaderboard percentile (0-100, higher = better). Populated by backend. */
  percentile?: number;
  /** Cohort label for leaderboard (e.g. "weekly") */
  cohort?: string;
  /** Previous personal best score (for PB delta display) */
  previousBest?: number;
  /** Best single wave (derived from waveResults) */
  bestWave?: { waveNumber: number; score: number };
  /** Badges unlocked this run (for achievement ribbon) */
  badges?: Array<{ id: string; icon: string; label: string; isNew?: boolean }>;
  /** Sprint 3 polish: target_word goal context surfaced on the results card so
   *  the player sees acknowledgement either way ("Target was: CRYSTAL" on miss,
   *  "FOUND IT!" on hit). Optional — only set when the wave actually had a
   *  target_word objective. */
  targetWord?: string;
  targetWordFound?: boolean;
  /** True when the player accepted the rewarded-ad continue offer at any point in this run.
   *  Gates progress persistence: a wave-loss with no ad watched (and < 90% clear) must NOT
   *  save score/PB/leaderboard/XP — see BlastView.handleGameEnd save gate. */
  adContinueUsed?: boolean;
  /** Final wave's objective progress snapshot — results screen renders a
   *  per-objective ✓/✗ summary so the player sees exactly which goals landed.
   *  clear_percent is filtered at render (the fail card already covers it). */
  finalObjectives?: BlastObjectiveProgress[];
  /** Coins earned this run (SP only) — awarded to global context on save. */
  sessionCoins?: number;
  /** Diamonds collected this run (earned by rare words) */
  diamondsCollected?: number;
  /** Bombs detonated this run, chains included */
  bombsPopped?: number;
}

// ==================== Special Tile Effects ====================

/** Score multiplier for gold tiles */
export const GOLD_MULTIPLIER = 3;
/** Gold tile awards +1 bonus move when cleared */
export const GOLD_BONUS_MOVES = 1;
/** Flat score bonus for clearing an earned diamond */
export const DIAMOND_CLEAR_BONUS = 30;
/** Number of adjacent cells a bomb clears */
export const BOMB_RADIUS = 1; // 3x3 area (8 adjacent cells)

/**
 * Runaway-chain guards: cap a single move's bomb chain so it never wipes more
 * than ~half the board. Normal 1–2-bomb chains sit well under both limits.
 */
/** Max number of chained bomb detonations per move. */
export const BLAST_MAX_CHAIN_DETONATIONS = 5;
/** Hard ceiling on tiles cleared by chain effects, as a fraction of the board. */
export const BLAST_MAX_CHAIN_CLEAR_FRACTION = 0.4;
/** Floor for the chain-clear ceiling on tiny boards. */
export const BLAST_MIN_CHAIN_CLEAR_CAP = 8;
/** Points paid per chain detonation suppressed by the budget — the cap reads
 * as an "overflow surge" payout, never as a nerf. */
export const OVERFLOW_SURGE_POINTS_PER_DETONATION = 10;
/** Stagger delay (ms) between chain bomb explosions for visual ripple */
export const CHAIN_BOMB_STAGGER = 120;
/** Bonus per tile cleared by bomb area blast (+1 per tile) */
export const BOMB_AREA_CLEAR_BONUS = 1;

// ==================== Cascade Chain Constants ====================

/** Maximum number of auto-cascade chain levels before stopping */
export const MAX_CASCADE_CHAIN = 5;
/** Chain level at which cascade auto-clears require a "quality" match.
 * Deep chains become rare/earned — variable-ratio reward instead of routine wipes. */
export const CASCADE_QUALITY_MIN_CHAIN = 3;
/** Minimum match-3 cluster size that counts as quality at deep chain levels. */
export const CASCADE_QUALITY_MIN_CLUSTER = 4;
/** Minimum auto-word length that counts as quality at deep chain levels. */
export const CASCADE_QUALITY_MIN_WORD_LEN = 5;
/** Minimum word length for cascade auto-detection (shorter words ignored) */
export const CASCADE_MIN_WORD_LENGTH = 4;
/** Bonus multiplier per chain level: base * chainLevel * this */
export const CASCADE_CHAIN_BONUS_MULTIPLIER = 0.75;

// ==================== Cascade Momentum System ====================

/** Momentum points required for each cascade tier (cumulative thresholds).
 * Players build momentum by finding words; higher tiers unlock deeper cascades.
 * Raised from [0,2,4,7,11] → deeper chains now require sustained play, not
 * just 2-4 words. Prevents near-full-board wipes from short sessions. */
export const CASCADE_MOMENTUM_THRESHOLDS = [0, 3, 6, 10, 15] as const;
/** Momentum points earned per word found (before cascade detection) */
export const CASCADE_MOMENTUM_PER_WORD = 1;
/** Bonus momentum for words of 5+ letters */
export const CASCADE_MOMENTUM_LONG_WORD_BONUS = 1;
/** Momentum decay per turn when no cascade triggers (cool-down) */
export const CASCADE_MOMENTUM_DECAY = 1;
/** Maximum cascade chain allowed at each momentum tier (index = tier).
 * Capped tiers 2-3 at 2 to reduce mid-game avalanche cascades. */
export const CASCADE_TIER_MAX_CHAIN = [1, 2, 2, 3, 4] as const;

// ==================== Cascade Highlight Constants ====================

/** Duration (ms) cascade words stay highlighted on grid before clearing.
 * Reduced from 800ms → 600ms for snappier cascade pacing. */
export const CASCADE_HIGHLIGHT_DURATION = 600;
/** Brief pause (ms) after banner before tiles clear */
export const CASCADE_HIGHLIGHT_LINGER = 150;

/** Default split of randomly spawned specials (diamonds are earned, never rolled). */
export const SPECIAL_TILE_DISTRIBUTION: Record<Exclude<BlastTileType, 'standard'>, number> = {
  gold: 0.5,
  bomb: 0.5,
  diamond: 0,
};

// ==================== Objectives ====================

export type BlastObjectiveType = 'collect_type' | 'score_target' | 'word_length' | 'clear_percent' | 'target_word' | 'color_power';

export type ColorTag = 'pink' | 'cyan' | 'lime';

export interface BlastObjective {
  type: BlastObjectiveType;
  /** Which tile type to collect (for collect_type) */
  tileType?: BlastTileType;
  /** Target count (for collect_type) or score (for score_target) or word count (for word_length) */
  target: number;
  /** Minimum word length required (for word_length type) */
  minWordLength?: number;
  /** Target word to find (for target_word type) */
  targetWord?: string;
  /** Color tag for color_power objective */
  colorTag?: ColorTag;
  /** Minimum count of colored tiles required (for color_power type) */
  minColorCount?: number;
}

/** 2D grid of letters for Blast board representation */
export type LetterGrid = string[][];

export interface BlastObjectiveProgress {
  objective: BlastObjective;
  current: number;
  isComplete: boolean;
}

// ==================== Animation Events ====================

export interface BlastExplosion {
  id: string;
  row: number;
  col: number;
  type: 'word' | 'bomb' | 'clear' | 'cascade' | 'combo' | 'mega_blast' | 'total_destruction';
  intensity: 1 | 2 | 3 | 4;
  timestamp: number;
}

export interface BlastScorePopup {
  id: string;
  score: number;
  /** Grid row (converted to pixel position in BlastExplosionLayer) */
  row: number;
  /** Grid col (converted to pixel position in BlastExplosionLayer) */
  col: number;
  isSpecial: boolean;
  timestamp: number;
  /** Tile type that triggered this popup (for color-coded display) */
  tileType?: BlastTileType;
}
