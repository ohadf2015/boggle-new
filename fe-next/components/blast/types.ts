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

export type BlastPhase = 'ready' | 'waveIntro' | 'playing' | 'waveTransition' | 'results';

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
/** Gold tile awards +1 bonus move when cleared */
export const GOLD_BONUS_MOVES = 1;
/** Score multiplier for silver tiles (wave 2+) */
export const SILVER_MULTIPLIER = 1.5;
/** Silver tile extends all active countdown timers by +1 move */
export const SILVER_COUNTDOWN_EXTEND = 1;
/** Score multiplier for diamond tiles (wave 4+) */
export const DIAMOND_MULTIPLIER = 5;
/** Diamond reveals frozen tiles' inner types for N turns */
export const DIAMOND_REVEAL_TURNS = 3;
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

// ==================== Wildcard Constants ====================

/** Wildcard scores the highest Scrabble-value letter it could represent */
export const WILDCARD_CLEAR_BONUS = 0;
/** Scrabble letter values for wildcard scoring */
export const SCRABBLE_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
  N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
};

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

// ==================== Virus Constants ====================

/** Score value when clearing a virus tile (worthless — clear them to stop spread) */
export const VIRUS_CLEAR_SCORE = 0;
/** Number of adjacent tiles a virus infects per turn */
export const VIRUS_SPREAD_COUNT = 1;
/** Clearing 3+ virus tiles in one word triggers a mass cure (clears ALL virus) */
export const VIRUS_MASS_CURE_THRESHOLD = 3;

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
export const MAX_CASCADE_CHAIN = 2;
/** Maximum words/clusters cleared per cascade level */
export const MAX_CASCADE_WORDS_PER_LEVEL = 1;
/** Minimum word length for cascade auto-detection (shorter words ignored) */
export const CASCADE_MIN_WORD_LENGTH = 3;
/** Delay (ms) before scanning for cascade words after grid settles.
 * Reduced from 700ms → 400ms to eliminate the "frozen board" dead gap. */
export const CASCADE_DETECTION_DELAY = 200;
/** Bonus multiplier per chain level: base * chainLevel * this */
export const CASCADE_CHAIN_BONUS_MULTIPLIER = 0.5;

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
  mirror: 0,
  silver: 0,
  diamond: 0,
  wildcard: 0,
  countdown: 0,
  virus: 0,
  portal: 0,
  catalyst: 0,
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
