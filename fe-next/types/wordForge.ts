/**
 * Word Forge Mode — Type Definitions
 *
 * A standalone roguelike word game mode.
 * Core formula: Word Score = Letter Points × Length Bonus × Rune Multipliers
 */

// ─── Rune Cards ────────────────────────────────────────────

export type RuneCategory = 'chip' | 'mult' | 'special' | 'cursed';
export type RuneRarity = 'common' | 'rare' | 'legendary';

/** Static definition of a rune card (catalog entry) */
export interface RuneCardDef {
  id: string;
  name: string;
  descriptionKey: string; // i18n key
  category: RuneCategory;
  rarity: RuneRarity;
  icon: string; // emoji
  unlockTier: number; // 0=starting, 1-5=progressive unlock
}

/** A rune card instance in a run (could be enhanced in v2) */
export interface RuneCard {
  def: RuneCardDef;
  /** Unique instance ID for this run */
  instanceId: string;
}

// ─── Scoring ───────────────────────────────────────────────

/** Result of scoring a single word with all rune effects */
export interface WordScoreResult {
  word: string;
  /** Raw letter point sum */
  basePoints: number;
  /** Length-based multiplier */
  lengthBonus: number;
  /** Individual rune effects that triggered */
  runeEffects: RuneEffect[];
  /** Final score after all multipliers */
  totalScore: number;
}

/** A single rune's contribution to a word's score */
export interface RuneEffect {
  runeId: string;
  runeName: string;
  /** What the rune added/multiplied */
  description: string;
  /** 'addPoints' = flat addition, 'multiply' = multiplicative */
  type: 'addPoints' | 'multiply';
  value: number;
}

// ─── Boss Constraints ──────────────────────────────────────

export interface BossConstraintDef {
  id: string;
  name: string;
  descriptionKey: string; // i18n key
  icon: string;
}

/** Active boss constraint for current round */
export interface ActiveBossConstraint {
  def: BossConstraintDef;
}

// ─── Run State ─────────────────────────────────────────────

export type RunPhase =
  | 'idle'        // Not in a run
  | 'playing'     // In a round, finding words
  | 'pickRune'    // Between rounds, choosing a rune
  | 'bossReveal'  // Showing boss constraint before boss round
  | 'roundResult' // Brief round completion summary
  | 'runOver';    // Run ended (win or lose)

export interface WordForgeRunState {
  /** Current run phase */
  phase: RunPhase;
  /** Current round (1-indexed) */
  round: number;
  /** Max rounds before endless (9 for standard) */
  maxRounds: number;
  /** Current score in this round */
  roundScore: number;
  /** Target score to beat this round */
  roundTarget: number;
  /** Total score across all rounds */
  totalScore: number;
  /** Seconds remaining in current round */
  timeRemaining: number;
  /** Timer duration for current round (usually 60) */
  timerDuration: number;
  /** Words found this round */
  wordsThisRound: string[];
  /** All words found this run */
  allWords: string[];
  /** Equipped rune cards (max 5, expandable in meta) */
  runes: RuneCard[];
  /** Max rune slots (default 5) */
  maxRuneSlots: number;
  /** Active boss constraint (null if not a boss round) */
  bossConstraint: ActiveBossConstraint | null;
  /** Current rune offering (3 cards to pick from) */
  runeOffering: RuneCardDef[] | null;
  /** The letter grid for current round */
  grid: string[][];
  /** Grid size (default 5) */
  gridSize: number;
  /** Best word this run (for end screen) */
  bestWord: { word: string; score: number } | null;
  /** Score history per round */
  roundHistory: RoundResult[];
  /** Pending skip bonus points (applied next round start) */
  skipBonus: number;
  /** Letters banned by oathOfSilence (from last word) */
  bannedLetters: Set<string>;
  /** Random seed for deterministic boss selection per run */
  runSeed: number;
}

export interface RoundResult {
  round: number;
  score: number;
  target: number;
  passed: boolean;
  wordsFound: number;
  bestWord: string;
  bestWordScore: number;
  wasBossRound: boolean;
  bossConstraintId: string | null;
}

// ─── Meta Progression ──────────────────────────────────────

export interface WordForgeProgress {
  userId: string;
  /** Total Forge XP earned across all runs */
  totalXp: number;
  /** Current unlock tier (0-5+) */
  unlockTier: number;
  /** Highest round ever reached */
  highestRound: number;
  /** Total runs completed */
  totalRuns: number;
  /** Total runs won (beat round 9) */
  runsWon: number;
  /** Best total score in a single run */
  bestRunScore: number;
  /** Daily streak count */
  dailyStreak: number;
  /** Last played date (ISO string) */
  lastPlayedAt: string | null;
  /** Max rune slots unlocked (starts at 5) */
  maxRuneSlots: number;
  /** Unlocked features */
  unlockedFeatures: string[];
}

// ─── Scoring Context (passed to rune evaluators) ──────────

export interface ScoringContext {
  /** The word being scored */
  word: string;
  /** Previous word (null if first word this round) */
  previousWord: string | null;
  /** How many words found consecutively (for combo runes) */
  comboCount: number;
  /** Seconds since round started when word was found */
  elapsedSeconds: number;
  /** Time taken to find this specific word (seconds) */
  wordFindTime: number;
  /** Current round number */
  round: number;
  /** Whether this is a boss round */
  isBossRound: boolean;
  /** Active boss constraint ID (if any) */
  bossConstraintId: string | null;
  /** Grid state (for tile-based runes in v2) */
  grid: string[][];
  /** All words found this round so far */
  wordsThisRound: string[];
  /** All words found this run */
  allWordsThisRun: string[];
}
