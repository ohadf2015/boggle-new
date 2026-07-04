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
  /** Turns remaining where frozen tile inner types are revealed (diamond effect) */
  diamondRevealTurns: number;
  /** Color counts in the last submitted word: { pink, cyan, lime } (for color_power tracking) */
  lastWordColorCounts?: { pink: number; cyan: number; lime: number };
}

/** Per-wave summary for results breakdown */
export interface WaveResult {
  waveNumber: number;
  score: number;
  wordsFound: number;
  clearPercentage: number;
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
}

// ==================== Special Tile Effects ====================

/** Score multiplier for gold tiles */
export const GOLD_MULTIPLIER = 3;
/** Gold tile awards +1 bonus move when cleared */
export const GOLD_BONUS_MOVES = 1;
/** Score multiplier for diamond tiles (wave 4+) */
export const DIAMOND_MULTIPLIER = 5;
/** Diamond reveals frozen tiles' inner types for N turns */
export const DIAMOND_REVEAL_TURNS = 3;
/** Number of adjacent cells a bomb clears */
export const BOMB_RADIUS = 1; // 3x3 area (8 adjacent cells)

/**
 * Runaway-chain guards (Bug: "too much blast radius — half the level disappears").
 * Bomb BFS + lightning/prism chains had no bound, so a dense special cluster could
 * detonate most of the board from one word. These cap a single move's chain so it
 * never wipes more than ~half the board. Normal 1–2-special chains sit well under
 * both limits, so ordinary play is never clipped.
 */
/** Max number of chained special detonations (bomb pop / lightning column / prism cross) per move. */
export const BLAST_MAX_CHAIN_DETONATIONS = 5;
/** Hard ceiling on tiles cleared by chain effects, as a fraction of the board. */
export const BLAST_MAX_CHAIN_CLEAR_FRACTION = 0.4;
/** Floor for the chain-clear ceiling on tiny boards. */
export const BLAST_MIN_CHAIN_CLEAR_CAP = 8;
/** Points paid per chain detonation suppressed by the budget — the cap reads
 * as an "overflow surge" payout, never as a nerf. */
export const OVERFLOW_SURGE_POINTS_PER_DETONATION = 10;

// ==================== Vortex (Magnet Rework) Constants ====================

/** Pull radius for Vortex tile (Manhattan distance) */
export const VORTEX_PULL_RADIUS = 2;
/** Explode radius for Vortex tile after pull phase (same as bomb) */
export const VORTEX_EXPLODE_RADIUS = 1;
/** Bonus score per tile pulled toward vortex center */
export const VORTEX_PULL_BONUS = 2;
/** Bonus score per tile cleared by vortex explosion */
export const VORTEX_EXPLODE_BONUS = 2;

// ==================== Frost (Frozen Rework) Constants ====================

/** Number of hits required to free a Frost tile (down from frozen's 3) */
export const FROST_HITS_REQUIRED = 2;
/** Bonus score awarded when Frost tile is freed and inner special activates */
export const FROST_REVEAL_BONUS = 3;
/** Multiplier applied by Rainbow Boost: copies and doubles the best special's effect, or doubles word score solo */
export const RAINBOW_BOOST_MULTIPLIER = 2;
/** Stagger delay (ms) between chain bomb explosions for visual ripple */
export const CHAIN_BOMB_STAGGER = 120;
/** Bonus per tile cleared by bomb area blast (+1 per tile) */
export const BOMB_AREA_CLEAR_BONUS = 1;
/** Bonus per tile cleared by lightning strike (+1 per tile in column) */
export const LIGHTNING_COLUMN_CLEAR_BONUS = 1;
/** Bonus for clearing an ice obstacle */
export const ICE_CLEAR_BONUS = 1;
/** Bonus for clearing a frozen obstacle (toughest) */
export const FROZEN_CLEAR_BONUS = 3;
/** Magnet search radius (2 = 5×5 area) */
export const MAGNET_RADIUS = 2;
/** Bonus per rainbow attracted by magnet tile (+3 per tile) */
export const MAGNET_ATTRACT_BONUS = 3;
/** Bonus per word a prism tile is used in (before detonation) */
export const PRISM_USE_BONUS = 2;
/** Bonus when prism detonates (cross-clear) */
export const PRISM_CROSS_BONUS = 5;

// ==================== Countdown Constants ====================

/** Initial countdown value (moves before auto-explosion) */
export const COUNTDOWN_INITIAL_MOVES = 3;
/** Score bonus for clearing a countdown tile in a word (defusing it) */
export const COUNTDOWN_DEFUSE_BONUS = 15;
/** Bonus moves awarded for defusing a countdown tile */
export const COUNTDOWN_DEFUSE_MOVES = 2;
/** Score penalty when countdown reaches 0 and explodes */
export const COUNTDOWN_EXPLOSION_PENALTY = 50;
/** Countdown explosion radius (same as bomb) */
export const COUNTDOWN_EXPLOSION_RADIUS = 1;

// ==================== Shuffle Constants ====================

/** Bonus score when shuffle tile is cleared (board rearrangement reward) */
export const SHUFFLE_CLEAR_BONUS = 5;

// ==================== Magma Constants ====================

/** Bonus score per tile cleared by magma diagonal blast */
export const MAGMA_DIAGONAL_CLEAR_BONUS = 2;
/** Magma clears both diagonals through its position (X-pattern, full grid reach) */
export const MAGMA_MULTIPLIER = 2;

// ==================== Crystal Constants ====================

/** Crystal tiles start at this multiplier when spawned */
export const CRYSTAL_START_MULTIPLIER = 1;
/** Maximum growth multiplier a crystal can reach (caps between-turn growth) */
export const CRYSTAL_MAX_MULTIPLIER = 5;

// ==================== Fuse Constants ====================

/** Turns on a fuse timer after its partner is cleared (before auto-detonation) */
export const FUSE_INITIAL_TIMER = 3;
/** Fuse detonation radius (1 = 3x3 bomb-style blast) */
export const FUSE_EXPLOSION_RADIUS = 1;
/** Score penalty when a lit fuse detonates (player failed to defuse in time) */
export const FUSE_EXPLOSION_PENALTY = 50;
/** Score bonus when a lit fuse is cleared in a word (successful defuse) */
export const FUSE_DEFUSE_BONUS = 15;
/** Bonus moves awarded for defusing a lit fuse in a word */
export const FUSE_DEFUSE_MOVES = 2;

// ==================== Anchor Constants ====================

/** Bonus score per letter in the word when an anchor tile is cleared in that word.
 * Linear scaling rewards long-word discovery without making short words useless. */
export const ANCHOR_LENGTH_BONUS = 3;

// ==================== Portal Constants ====================

/** Bonus score for using a portal in a word */
export const PORTAL_USE_BONUS = 5;
/** Portal words score at this multiplier */
export const PORTAL_WORD_MULTIPLIER = 2;

// ==================== Catalyst Constants ====================

/** Bonus score when catalyst is cleared */
export const CATALYST_CLEAR_BONUS = 10;
/** Radius of tiles upgraded by catalyst (1 = 3x3 area) */
export const CATALYST_UPGRADE_RADIUS = 1;

// ==================== Treasure Gem Constants ====================

/** Number of hits required to complete a Treasure Gem (shard collection) */
export const TREASURE_GEM_HITS_REQUIRED = 3;
/** Bonus awarded when all shards are collected (Treasure Gem completed) */
export const TREASURE_GEM_COMPLETION_BONUS = 25;
/** Number of random special tiles spawned on the board when a Treasure Gem completes */
export const TREASURE_GEM_SPAWN_COUNT = 2;
/** Bonus moves awarded when a gem is completed */
export const TREASURE_GEM_BONUS_MOVES = 2;

// ==================== Cascade Chain Constants ====================

/** Maximum number of auto-cascade chain levels before stopping */
export const MAX_CASCADE_CHAIN = 5;
/** Maximum words/clusters cleared per cascade level */
export const MAX_CASCADE_WORDS_PER_LEVEL = 1;
/** Chain level at which cascade auto-clears require a "quality" match.
 * Deep chains become rare/earned — variable-ratio reward instead of routine wipes. */
export const CASCADE_QUALITY_MIN_CHAIN = 3;
/** Minimum match-3 cluster size that counts as quality at deep chain levels. */
export const CASCADE_QUALITY_MIN_CLUSTER = 4;
/** Minimum auto-word length that counts as quality at deep chain levels. */
export const CASCADE_QUALITY_MIN_WORD_LEN = 5;
/** Minimum word length for cascade auto-detection (shorter words ignored) */
export const CASCADE_MIN_WORD_LENGTH = 4;
/** Delay (ms) before scanning for cascade words after grid settles.
 * Reduced from 700ms → 400ms to eliminate the "frozen board" dead gap. */
export const CASCADE_DETECTION_DELAY = 200;
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

// ==================== Cascade Highlight Types ====================

/** Phase of cascade word showcasing */
export type CascadeHighlightPhase = 'idle' | 'highlighting';

/** Data for a single cascade word being highlighted */
export interface CascadeHighlightWord {
  word: string;
  path: Array<{ row: number; col: number }>;
  score: number;
  chainLevel: number;
}

/** Aggregate data for all cascade words being highlighted at once */
export interface CascadeHighlightData {
  words: CascadeHighlightWord[];
}

/** Default distribution of special tiles (must sum to 1.0). Wave-gated tiles start at 0. */
export const SPECIAL_TILE_DISTRIBUTION: Record<Exclude<BlastTileType, 'standard'>, number> = {
  gold: 0.25,
  bomb: 0.25,
  rainbow: 0.25,
  ice: 0.25,
  lightning: 0,
  magnet: 0,
  prism: 0,
  gem: 0,
  frozen: 0,
  diamond: 0,
  countdown: 0,
  portal: 0,
  catalyst: 0,
  shuffle: 0,
  magma: 0,
  crystal: 0,
  fuse: 0,
  anchor: 0,
  mystery: 0,
  chocolate: 0,
  cake: 0,
  locked: 0,
  key: 0,
};

// ==================== Objectives ====================

export type BlastObjectiveType = 'collect_type' | 'clear_all_type' | 'score_target' | 'word_length' | 'clear_percent' | 'target_word' | 'color_power' | 'clear_jelly' | 'kill_cake' | 'stop_chocolate';

export type ColorTag = 'pink' | 'cyan' | 'lime';

export interface BlastObjective {
  type: BlastObjectiveType;
  /** Which tile type to collect (for collect_type/clear_all_type) */
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
  type: 'word' | 'bomb' | 'clear' | 'cascade' | 'lightning' | 'magnet' | 'prism' | 'gem' | 'combo' | 'mega_blast' | 'total_destruction';
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

// ==================== Combo Events ====================

export interface BlastComboEvent {
  comboType: import('./utils/blastCombos').BlastComboType;
  tiles: Array<{ row: number; col: number }>;
  label: string;
  clearedCount: number;
}
