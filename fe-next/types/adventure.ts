/**
 * Adventure Mode Type Definitions
 *
 * TypeScript interfaces and types for the LexiClash Adventure Mode feature.
 * These types support the progression system, level configuration, and gameplay state.
 */

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
 */
export type TileType = 'standard' | 'gold' | 'ice' | 'bomb' | 'rainbow';

/**
 * State of an individual tile in the game grid
 */
export interface TileState {
  /** The letter displayed on this tile */
  letter: string;
  /** The type of tile (standard, gold, ice, bomb, rainbow) */
  type: TileType;
  /** Whether the tile has been cleared/used */
  isCleared: boolean;
  /** Delay in ms before cascade animation (for cascade effects) */
  cascadeDelay?: number;
  /** Whether the tile is frozen (for ice tiles) */
  isFrozen?: boolean;
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
  /** Level number within the world (1-10) */
  level: number;
  /** Grid size (4x4, 5x5, 6x6, or 7x7) */
  gridSize: 4 | 5 | 6 | 7;
  /** Time limit in seconds */
  timerSeconds: number;
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
