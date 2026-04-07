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
 *
 * Regular Level Objectives:
 * - wordCount: Find N words
 * - scoreTarget: Achieve N points
 * - clearIce: Clear N ice tiles
 * - longWords: Find N words with 5+ letters
 * - timeBonus: Complete with N seconds remaining
 * - collectGems: Collect N gems (special words)
 *
 * Boss Level Objectives (level 7 of each world):
 * - defeatBoss: Primary - reduce boss HP to 0
 * - surviveBattle: Secondary - finish with X% player health
 * - mechanicTrigger: Secondary - trigger boss twist mechanic N times
 * - noDamage: Bonus - complete without taking damage
 */
export type ObjectiveType =
  | 'wordCount'
  | 'scoreTarget'
  | 'clearIce'
  | 'longWords'
  | 'timeBonus'
  | 'collectGems'
  // Boss-specific objectives
  | 'defeatBoss'
  | 'surviveBattle'
  | 'mechanicTrigger'
  | 'noDamage';

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
  minWordLength?: 2 | 3 | 4 | 5;
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
  /** Level archetype that defines gameplay flavor */
  archetype?: LevelArchetype;
}

// ==============================================
// LEVEL ARCHETYPES
// ==============================================

/**
 * Level archetypes define distinct gameplay flavors.
 * Each archetype modifies objectives, tiles, and timer to create a unique feel,
 * even though the core mechanic (form words on a grid) stays the same.
 *
 * - standard: Balanced wordCount/score — the baseline Boggle experience
 * - excavation: Board starts heavily iced. Chip away to reveal letters. Strategic tile clearing.
 * - goldRush: Loaded with gold/multiplier tiles, short timer. Maximize value per word.
 * - puzzle: Small effective area, find specific long/hidden words. Brain teaser.
 * - survival: Timer drains fast, time tiles are lifelines. Every second counts.
 * - cascade: Aggressive board reshuffling. Combo chains and positioning matter.
 * - boss: Boss battle with HP, phases, and twist mechanics. (Existing system.)
 */
export type LevelArchetype =
  | 'standard'
  | 'excavation'
  | 'goldRush'
  | 'puzzle'
  | 'survival'
  | 'cascade'
  | 'boss';

// ==============================================
// ARCHETYPE MASTERY
// ==============================================

/**
 * Archetype mastery tier — earned by accumulating stars on levels of a given archetype.
 * Distinct from the numeric MasteryTier used for world mastery.
 */
export type ArchetypeMasteryTier = 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';

/**
 * Star thresholds to reach each archetype mastery tier.
 * e.g. bronze at 5 stars, silver at 15, gold at 30, diamond at 50.
 */
export interface ArchetypeMasteryThresholds {
  bronze: number;
  silver: number;
  gold: number;
  diamond: number;
}

/**
 * Passive bonus granted at an archetype mastery tier.
 * Each archetype rewards mastery with a thematic bonus.
 */
export interface ArchetypeMasteryBonus {
  /** Human-readable description (dev reference) */
  description: string;
  /** The bonus type — what game parameter is modified */
  bonusType: 'timer' | 'score' | 'tiles' | 'objectives';
  /** Numeric value of the bonus (interpretation depends on bonusType) */
  value: number;
}

/**
 * Per-archetype mastery state for a player.
 */
export interface ArchetypeMasteryState {
  /** Total stars earned on levels of this archetype */
  totalStars: number;
  /** Current mastery tier */
  tier: ArchetypeMasteryTier;
}

/**
 * Mastery archetypes — boss excluded (bosses don't have mastery tracks).
 */
export type MasterableArchetype = Exclude<LevelArchetype, 'boss'>;

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
  /** Gold currency */
  gold: number;
  /** Purchased upgrades — map of upgradeId to tier level */
  upgrades: Record<string, number>;
  /** Skill points available to spend */
  skillPoints: number;
  /** Skill tree — map of skillId to level */
  skillTree: Record<string, number>;
  /** Rune fragments available for forging */
  runeFragments: number;
  /** Forged runes inventory */
  runes: PlayerRune[];
  /** Adventure streak (consecutive play days) */
  streak?: { currentStreak: number; bestStreak: number; lastPlayedAt: string | null; freezesUsedThisWeek: number; lastFreezeWeek: string | null };
  /** Boss trophies earned (boss defeats across all modes) */
  bossTrophies?: number;
  /** Prestige level (resets after completing all worlds) */
  prestigeLevel?: number;
  /** Highest endless mode floor reached */
  endlessHighFloor?: number;
  /** Chapter quest progress — map of questId to current count (persists across sessions) */
  chapterQuestProgress?: Record<string, number>;
  /** Word album — all unique words found across adventure mode (uppercase) */
  wordAlbum?: string[];
  /** Claimed word album milestone targets (e.g. [50, 100]) */
  wordAlbumClaimedMilestones?: number[];
  /** Daily quest progress — map of questId to current count (resets daily) */
  dailyQuestProgress?: Record<string, number>;
  /** Last date daily quests were active (YYYY-MM-DD) — for reset detection */
  dailyQuestDate?: string;
  /** Per-archetype mastery progression */
  archetypeMastery?: Partial<Record<MasterableArchetype, ArchetypeMasteryState>>;
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

// ==============================================
// SKILL TREE SYSTEM
// ==============================================

/**
 * Skill tree paths (branching progression)
 * - Power: Offensive bonuses, damage multipliers
 * - Strategy: Board manipulation, combo enhancement
 * - Utility: Quality of life, power-up improvements
 */
export type SkillPath = 'power' | 'strategy' | 'utility';

/**
 * Skill effect type
 * - horizontal: Enables new strategies (75% of skills)
 * - vertical: Stat boost (25% of skills, limited)
 */
export type SkillEffectType = 'horizontal' | 'vertical';

/**
 * Individual skill in the tree
 */
export interface SkillNode {
  /** Unique identifier */
  id: string;
  /** i18n translation key for name */
  nameKey: string;
  /** i18n translation key for description */
  descriptionKey: string;
  /** Which path this skill belongs to */
  path: SkillPath;
  /** Tier within path (1, 2, or 3) */
  tier: 1 | 2 | 3;
  /** Skill points required to unlock */
  cost: number;
  /** Skill IDs that must be unlocked first */
  prerequisites: string[];
  /** Effect identifier for game logic */
  effectId: string;
  /** Type of progression (horizontal = strategy, vertical = stat) */
  effectType: SkillEffectType;
  /** Icon emoji or component key */
  icon: string;
}

/**
 * Player's skill tree state
 */
export interface SkillTreeState {
  /** Set of unlocked skill IDs */
  unlockedSkills: Set<string>;
  /** Available skill points to spend */
  availablePoints: number;
  /** Total skill points earned */
  totalPointsEarned: number;
}

// ==============================================
// QUEST TYPES
// ==============================================

/** Type of flash challenge (mid-level ephemeral) */
export type FlashChallengeType =
  // Word pattern challenges
  | 'longWord'
  | 'comboStreak'
  | 'specificLetter'
  | 'fastWord'
  | 'palindrome'
  | 'doubleLetters'
  | 'startsWith'
  | 'endsWith'
  // Board mechanic challenges
  | 'useGoldTile'
  | 'exactLength';

export interface FlashChallenge {
  id: string;
  type: FlashChallengeType;
  descriptionKey: string;
  param: string | number;
  durationSeconds: number;
  rewardCoins: number;
  rewardScore: number;
}

export type ChapterQuestType =
  | 'wordCountChapter'
  | 'defeatBossNoHint'
  | 'fullComboLevels'
  | 'perfectLevels'
  | 'longWordCount'
  | 'worldMechanicUse'
  | 'flashChallengeMaster'
  | 'bossHighHealth'
  | 'streakMaster'
  | 'scoreChallenge';

export interface QuestReward {
  coins: number;
  xp: number;
  badge?: string;
}

export interface ChapterQuest {
  id: string;
  chapterNumber: number;
  worldId: number;
  type: ChapterQuestType;
  titleKey: string;
  descriptionKey: string;
  target: number;
  reward: QuestReward;
}

export interface ChapterQuestProgress {
  questId: string;
  current: number;
  isComplete: boolean;
  rewardClaimed: boolean;
}

// ==============================================
// WORLD MASTERY
// ==============================================

/** Mastery tier for a world (0 = not started, 5 = complete mastery) */
export type MasteryTier = 0 | 1 | 2 | 3 | 4 | 5;

/** Criteria that contribute to world mastery */
export interface MasteryCriteria {
  /** All 7 levels completed with at least 1 star */
  allLevelsCompleted: boolean;
  /** All 7 levels completed with 3 stars */
  allLevelsPerfect: boolean;
  /** All chapter quests completed for this world */
  allQuestsCompleted: boolean;
  /** Boss defeated with 50%+ health remaining */
  bossHighHealth: boolean;
  /** Completed 3+ flash challenges in this world */
  flashChallengesMastered: boolean;
}

/** Per-world mastery state */
export interface WorldMastery {
  worldId: number;
  tier: MasteryTier;
  criteria: MasteryCriteria;
}

// ==============================================
// LOOT SYSTEM
// ==============================================

/** Types of loot drops from level completion */
export type LootType =
  | 'gold'
  | 'runeFragment'
  | 'loreScroll'
  | 'bossTrophy'
  | 'goldenQuill'
  | 'worldEssence'
  | 'ancientRelic'
  | 'cosmicShard';

/** Rarity tier for loot drops */
export type LootRarity = 'common' | 'rare' | 'epic' | 'legendary';

/** A single loot drop from level completion */
export interface LootDrop {
  type: LootType;
  quantity: number;
  rarity: LootRarity;
}

// ==============================================
// RUNE SYSTEM
// ==============================================

/** A forged rune in player inventory */
export interface PlayerRune {
  runeId: string;
  equipped: boolean;
}

/** Player's rune inventory and fragment count */
export interface RuneInventory {
  fragments: number;
  runes: PlayerRune[];
}

/** Shareable snapshot of adventure progress */
export interface AdventureShareData {
  worldsCompleted: number;
  totalStars: number;
  maxStars: number;
  bossesDefeated: number;
  bestStreak: number;
  masteryTiers: MasteryTier[];
}
