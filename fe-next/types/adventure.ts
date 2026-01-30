/**
 * Adventure Mode Type Definitions
 *
 * TypeScript interfaces and types for the LexiClash Adventure Mode feature.
 * These types support the progression system, level configuration, and gameplay state.
 */

import type { BossTwistType } from './boss';

// ==============================================
// TILE TYPES
// ==============================================

/**
 * Types of tiles in the adventure game grid
 * - standard: Normal letter tile
 * - gold: 3x point multiplier
 * - ice: Obstacle that must be cleared
 * - bomb: Clears entire row when used
 * - rainbow: Wildcard that matches any letter
 * - chain: Links adjacent tiles together for combo bonuses
 * - time: Adds bonus time when used in a word
 * - locked: Cannot be used until unlocked by word with same letter
 * - multiplier: Multiplies word score by 2x when used
 */
export type TileType = 'standard' | 'gold' | 'ice' | 'bomb' | 'rainbow' | 'chain' | 'time' | 'locked' | 'multiplier';

/**
 * Types of activation effects that can play when a special tile is used
 */
export type TileActivationEffect =
  | 'melt'      // Ice tile melted by adjacent word
  | 'explode'   // Bomb tile detonated
  | 'collect'   // Gold tile 3x multiplier collected
  | 'wildcard'  // Rainbow tile used as wildcard
  | 'link'      // Chain tile linked neighbors
  | 'timeBonus' // Time tile added seconds
  | 'unlock'    // Locked tile unlocked
  | 'multiply'  // Multiplier tile activated
  | null;

/**
 * State of an individual tile in the game grid
 */
export interface TileState {
  /** The letter displayed on this tile */
  letter: string;
  /** The type of tile (standard, gold, ice, bomb, rainbow, chain, time) */
  type: TileType;
  /** Whether the tile has been cleared/used */
  isCleared: boolean;
  /** Delay in ms before cascade animation (for cascade effects) */
  cascadeDelay?: number;
  /** Whether the tile is frozen (for ice tiles) */
  isFrozen?: boolean;
  /** Whether the tile is part of a chain (for chain tiles) */
  isChained?: boolean;
  /** Indices of tiles chained to this one (for chain tiles) */
  chainedWith?: number[];
  /** Bonus time value in seconds (for time tiles) */
  bonusTime?: number;
  /** Activation effect currently playing (clears after animation completes) */
  activationEffect?: TileActivationEffect;
  /** Timestamp when activation effect started (for animation timing) */
  activationTimestamp?: number;
}

/**
 * TileState with position information for flat grid representation
 * Used by AdventureGrid component for rendering tiles with unique keys
 */
export interface GridTileState extends TileState {
  /** Unique identifier for the tile */
  id: string;
  /** Row position (0-indexed) */
  row: number;
  /** Column position (0-indexed) */
  col: number;
}

/**
 * Configuration for a special tile placed on the grid
 */
export interface SpecialTile {
  /** Row position (0-indexed) */
  row: number;
  /** Column position (0-indexed) */
  col: number;
  /** Type of special tile */
  type: TileType;
}

// ==============================================
// OBJECTIVE TYPES
// ==============================================

/**
 * Types of objectives that can be assigned to levels
 * - wordCount: Find N words
 * - scoreTarget: Achieve N points
 * - clearIce: Clear N ice tiles
 * - longWords: Find N words with 5+ letters
 * - timeBonus: Complete with N seconds remaining
 * - collectGems: Collect N gems (special words)
 */
export type ObjectiveType =
  | 'wordCount'
  | 'scoreTarget'
  | 'clearIce'
  | 'longWords'
  | 'timeBonus'
  | 'collectGems';

/**
 * An objective to complete within a level
 */
export interface LevelObjective {
  /** Type of objective */
  type: ObjectiveType;
  /** Target value to achieve */
  target: number;
  /** Current progress toward the target */
  current?: number;
  /** Whether the objective has been completed */
  isComplete?: boolean;
  /** Whether this is the primary objective (required to complete level) */
  isPrimary?: boolean;
}

// ==============================================
// LEVEL CONFIGURATION
// ==============================================

/**
 * Configuration for a single adventure level
 */
export interface LevelConfig {
  /** World number (1-10) */
  world: number;
  /** Level number within the world (1-7) */
  level: number;
  /** Grid size (4x4, 5x5, 6x6, or 7x7) */
  gridSize: 4 | 5 | 6 | 7;
  /** Time limit in seconds */
  timerSeconds: number;
  /** Minimum word length required (default: 3, World 1 uses 2 for tutorials) */
  minWordLength?: 2 | 3;
  /** Objectives to complete */
  objectives: LevelObjective[];
  /** Special tiles to place on the grid */
  specialTiles: SpecialTile[];
  /** Difficulty level */
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  /** Optional hidden word to find for bonus */
  hiddenWord?: string;
  /** Optional world mechanic identifier */
  worldMechanic?: string;
  /** Chapter number within the world (1-3) */
  chapterNumber: 1 | 2 | 3;
  /** Level position within the chapter (1-3) */
  levelInChapter: 1 | 2 | 3;
  /** Whether this is a boss level (last level of world) */
  isBossLevel: boolean;
  /** Boss twist mechanic type (only present for boss levels) */
  bossTwist?: BossTwistType;
  /** Whether to show the boss intro cutscene */
  showBossIntro?: boolean;
}

// ==============================================
// PLAYER PROGRESSION
// ==============================================

/**
 * Record of a completed level
 */
export interface LevelCompletion {
  /** World number */
  world: number;
  /** Level number */
  level: number;
  /** Stars earned (0-3) */
  stars: 0 | 1 | 2 | 3;
  /** Best score achieved */
  bestScore: number;
  /** Most words found */
  bestWords: number;
  /** ISO timestamp of completion */
  completedAt: string;
}

/**
 * A player's attempt on a level (including failed attempts)
 * Used for "Partial Progress" UX showing encouragement on failures
 */
export interface LevelAttempt {
  /** World number (1-10) */
  world: number;
  /** Level within world (1-7) */
  level: number;
  /** Best word count across all attempts */
  bestWords: number;
  /** Best score across all attempts */
  bestScore: number;
  /** Best time remaining across all attempts */
  bestTimeRemaining: number;
  /** Best progress for each objective type */
  objectiveProgress: Record<string, number>;
  /** Total number of attempts on this level */
  attemptCount: number;
  /** Consecutive failures (resets on completion) - used for Retry Assist */
  consecutiveFailures: number;
  /** ISO timestamp of first attempt */
  firstAttemptAt: string;
  /** ISO timestamp of last attempt */
  lastAttemptAt: string;
}

/**
 * Player's overall progression in adventure mode
 */
export interface PlayerProgression {
  /** User identifier */
  userId: string;
  /** Player's current level (1-50) */
  playerLevel: number;
  /** Total experience points */
  xp: number;
  /** Current world being played */
  currentWorld: number;
  /** Current level within the world */
  currentLevel: number;
  /** Total stars collected across all levels */
  totalStars: number;
  /** Array of completed levels */
  completions: LevelCompletion[];
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
}

// ==============================================
// GAME STATE
// ==============================================

/**
 * Complete state of an adventure game session
 */
export interface AdventureGameState {
  /** Configuration for the current level */
  levelConfig: LevelConfig;
  /** 2D array of tile states */
  tiles: TileState[][];
  /** Current score */
  score: number;
  /** Words found so far */
  wordsFound: string[];
  /** Current objective progress */
  objectives: LevelObjective[];
  /** Current combo count */
  comboCount: number;
  /** Whether a cascade effect is currently active */
  cascadeActive: boolean;
  /** Whether the level is complete */
  isComplete: boolean;
  /** Stars earned (0 until level complete) */
  stars: 0 | 1 | 2 | 3;

  // Power-up state (POWER-03: Score Multiplier)
  /** Active score multiplier (1 = normal, 2 = power-up active) */
  scoreMultiplier?: number;
  /** Timestamp when multiplier expires (Date.now() + 30000) */
  multiplierExpiresAt?: number;

  // Hint state (POWER-02: Hint)
  /** Currently displayed hint word */
  hintWord?: string;
  /** Tile positions for hint highlight */
  hintTiles?: Array<{ row: number; col: number }>;
  /** Timestamp when hint expires (Date.now() + 5000) */
  hintExpiresAt?: number;
}

// ==============================================
// WORLD NAMES
// ==============================================

/**
 * World names for i18n translation keys
 * Each name represents a themed world in the adventure
 */
export const WORLD_NAMES = [
  'alphabetMeadows',
  'synonymSprings',
  'rootCaverns',
  'idiomArchipelago',
  'compoundCanyon',
  'anagramLabyrinth',
  'mirrorPalace',
  'neologismNebula',
  'polyglotPeaks',
  'lexiconThrone',
] as const;

/**
 * Union type of all world names
 */
export type WorldName = (typeof WORLD_NAMES)[number];

// ==============================================
// POWER-UP SYSTEM
// ==============================================

/**
 * Types of power-ups available in adventure mode
 * - freezeTime: Pauses the countdown timer (instant effect)
 * - hint: Reveals a valid word on the board (instant effect)
 * - scoreMultiplier: 2x score for 30 seconds (duration effect)
 */
export type PowerUpType = 'freezeTime' | 'hint' | 'scoreMultiplier';

/**
 * State of a power-up in the cooldown state machine
 * Lifecycle: ready -> active -> cooldown -> ready
 */
export type PowerUpState = 'ready' | 'active' | 'cooldown';

/**
 * Configuration for power-up effect durations (in seconds)
 * - 0 = instant activation (freezeTime, hint)
 * - >0 = duration-based effect (scoreMultiplier: 30s)
 */
export const POWER_UP_CONFIG: Record<PowerUpType, { effectDuration: number }> = {
  freezeTime: { effectDuration: 0 },
  hint: { effectDuration: 0 },
  scoreMultiplier: { effectDuration: 30 },
};

/**
 * Power-up instance with cooldown state tracking
 */
export interface PowerUp {
  /** Type of power-up */
  type: PowerUpType;
  /** Current state in lifecycle */
  state: PowerUpState;
  /** Remaining cooldown time in seconds (0 when ready or active) */
  remainingCooldown: number;
  /** Total cooldown duration (always 60s) */
  totalCooldown: number;
  /** Timestamp when power-up was activated (for drift-free calculation) */
  activatedAt?: number;
  /** Effect duration in seconds (0 for instant, 30 for scoreMultiplier) */
  effectDuration: number;
}

/**
 * Result of hint power-up effect
 * Contains the revealed word and its tile positions on the board
 */
export interface HintResult {
  /** The word revealed by the hint */
  word: string;
  /** Array of tile positions that form the word path */
  tiles: Array<{ row: number; col: number }>;
}
