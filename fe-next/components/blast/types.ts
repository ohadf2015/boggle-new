import type { Language } from '@/shared/types/game';

// ==================== Tile Types (canonical source: @/shared/types/blast) ====================

// Import for local use + re-export so all blast component imports can use '../types' without change
import type { BlastTileType, BlastTileState } from '@/shared/types/blast';
export type { BlastTileType, BlastTileState };

// ==================== Difficulty ====================

export type BlastDifficulty = 'easy' | 'medium' | 'hard';

/** Preset configs per difficulty level */
export const BLAST_DIFFICULTY_PRESETS: Record<BlastDifficulty, {
  specialTileChance: number;
  gridSize: number;
}> = {
  easy:   { specialTileChance: 0.08, gridSize: 6 },
  medium: { specialTileChance: 0.15, gridSize: 6 },
  hard:   { specialTileChance: 0.25, gridSize: 6 },
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
}

export const DEFAULT_BLAST_CONFIG: BlastGameConfig = {
  gridSize: 6,
  specialTileChance: 0.15,
  language: 'en',
  difficulty: 'medium',
};

export type BlastPhase = 'ready' | 'playing' | 'waveTransition' | 'results';

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
}

// ==================== Special Tile Effects ====================

/** Score multiplier for gold tiles */
export const GOLD_MULTIPLIER = 3;
/** Score multiplier for silver tiles (wave 2+) */
export const SILVER_MULTIPLIER = 1.5;
/** Score multiplier for diamond tiles (wave 4+) */
export const DIAMOND_MULTIPLIER = 5;
/** Mirror tile: doubles partner special's effect. Solo = 2x word score. */
export const MIRROR_MULTIPLIER = 2;
/** Number of adjacent cells a bomb clears */
export const BOMB_RADIUS = 1; // 3x3 area (8 adjacent cells)

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
/** Bonus score for rainbow tiles (legacy — replaced by RAINBOW_BOOST_MULTIPLIER) */
export const RAINBOW_BONUS = 5;
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
/** Bonus per wildcard/rainbow attracted by magnet tile (+3 per tile) */
export const MAGNET_ATTRACT_BONUS = 3;
/** Bonus per word a prism tile is used in (before detonation) */
export const PRISM_USE_BONUS = 2;
/** Bonus when prism detonates (cross-clear) */
export const PRISM_CROSS_BONUS = 5;
/** Bonus per word a gem tile is used in */
export const GEM_USE_BONUS = 3;
/** Bonus when gem is finally collected (cleared) */
export const GEM_COLLECT_BONUS = 8;

// ==================== Treasure Gem Constants ====================

/** Number of hits required to complete a Treasure Gem (shard collection) */
export const TREASURE_GEM_HITS_REQUIRED = 3;
/** Bonus awarded when all shards are collected (Treasure Gem completed) */
export const TREASURE_GEM_COMPLETION_BONUS = 25;
/** Number of random special tiles spawned on the board when a Treasure Gem completes */
export const TREASURE_GEM_SPAWN_COUNT = 2;

// ==================== Cascade Chain Constants ====================

/** Maximum number of auto-cascade chain levels before stopping */
export const MAX_CASCADE_CHAIN = 5;
/** Maximum vertical words cleared per cascade level (limits simultaneous explosions) */
export const MAX_CASCADE_WORDS_PER_LEVEL = 1;
/** Minimum word length for cascade auto-detection (shorter words ignored) */
export const CASCADE_MIN_WORD_LENGTH = 4;
/** Delay (ms) before scanning for cascade words after grid settles */
export const CASCADE_DETECTION_DELAY = 700;
/** Bonus multiplier per chain level: base * chainLevel * this */
export const CASCADE_CHAIN_BONUS_MULTIPLIER = 0.5;

// ==================== Cascade Highlight Constants ====================

/** Duration (ms) cascade words stay highlighted on grid before clearing */
export const CASCADE_HIGHLIGHT_DURATION = 800;
/** Brief pause (ms) after banner before tiles clear */
export const CASCADE_HIGHLIGHT_LINGER = 200;

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
  mirror: 0,
  silver: 0,
  diamond: 0,
  wildcard: 0,
};

// ==================== Objectives ====================

export type BlastObjectiveType = 'collect_type' | 'clear_all_type' | 'score_target' | 'word_length';

export interface BlastObjective {
  type: BlastObjectiveType;
  /** Which tile type to collect (for collect_type/clear_all_type) */
  tileType?: BlastTileType;
  /** Target count (for collect_type) or score (for score_target) or word count (for word_length) */
  target: number;
  /** Minimum word length required (for word_length type) */
  minWordLength?: number;
}

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
