/**
 * Boss Battle Type Definitions
 *
 * TypeScript interfaces and types for the Adventure Mode boss battle system.
 * Each world (1-10) has a unique boss at level 7 with a distinct "twist mechanic"
 * that changes core gameplay.
 */

import type { AdventureGameState } from './adventure';

// ==============================================
// BOSS TWIST MECHANICS
// ==============================================

/**
 * Unique twist mechanic types for each boss
 * Each modifies gameplay in a distinct way during boss levels
 */
export type BossTwistType =
  | 'popQuiz'           // Ms. Grammar - word category requirements
  | 'hiveMind'          // Spelling Bee - sticky tiles + synonym pairs
  | 'etymologyDig'      // Professor Thesaurus - root word chains
  | 'idiomBattle'       // Captain Metaphor - idiom word challenges
  | 'assemblyLine'      // Baron Buildaword - compound word construction
  | 'scrambledReality'  // Puzzle Master - anagram chaos
  | 'mirrorMatch'       // Reflection King - palindrome power
  | 'stellarForge'      // Cosmic Wordsmith - evolving letters
  | 'babelSummit'       // Linguist Sage - multilingual challenges
  | 'finalWord';        // Lexicon Dragon - all mechanics combined

/**
 * All valid boss twist types for validation
 */
export const BOSS_TWIST_TYPES: BossTwistType[] = [
  'popQuiz',
  'hiveMind',
  'etymologyDig',
  'idiomBattle',
  'assemblyLine',
  'scrambledReality',
  'mirrorMatch',
  'stellarForge',
  'babelSummit',
  'finalWord',
];

// ==============================================
// BOSS TAUNTS
// ==============================================

/**
 * Boss dialogue lines keyed by gameplay event
 * All values are translation keys resolved at render time
 */
export interface BossTaunts {
  /** Lines shown at the start of the boss battle */
  onStart: string[];
  /** Lines for when the player finds a strong word */
  onGoodWord: string[];
  /** Lines for when the player submits a weak/invalid word */
  onBadWord: string[];
  /** Lines triggered by the boss's unique mechanic */
  onMechanic: string[];
  /** Lines when the timer is running low */
  onLowTime: string[];
  /** Victory line (player wins) */
  onVictory: string;
  /** Defeat line (player loses) */
  onDefeat: string;
}

/**
 * Events that can trigger a boss taunt
 */
export type BossTauntEvent = keyof BossTaunts;

// ==============================================
// BOSS MECHANIC CONFIGURATION
// ==============================================

/**
 * Configuration for a boss's unique twist mechanic
 */
export interface BossTwistMechanic {
  /** Which twist type this mechanic uses */
  type: BossTwistType;
  /** Translation key for mechanic description (shown in boss intro) */
  description: string;
  /** Mechanic-specific parameters (varies per twist type) */
  params: Record<string, unknown>;
}

// ==============================================
// BOSS CONFIGURATION
// ==============================================

/**
 * Complete configuration for a single boss character
 */
export interface BossConfig {
  /** Unique boss identifier matching WORLD_CONFIGS bossName */
  id: string;
  /** World number this boss belongs to (1-10) */
  worldId: number;
  /** Translation key for the boss's display name */
  displayName: string;
  /** Short personality description (internal, not displayed) */
  personality: string;
  /** Visual theme identifier for styling */
  visualTheme: string;
  /** Path to the boss character image */
  imagePath: string;
  /** The boss's unique twist mechanic */
  twistMechanic: BossTwistMechanic;
  /** Boss dialogue lines */
  taunts: BossTaunts;
}

// ==============================================
// BOSS GAME STATE
// ==============================================

/**
 * Runtime state for an active boss battle
 * Managed by useBossMechanics hook
 */
export interface BossGameState {
  /** Index of the last taunt shown (cycles through available taunts) */
  currentTauntIndex: number;
  /** Timestamp of the last taunt shown (for cooldown) */
  lastTauntTime: number;
  /** Mechanic-specific runtime state (varies per twist type) */
  mechanicState: Record<string, unknown>;
  /** Current phase for multi-phase bosses (e.g., finalWord) */
  phase?: string;
  /** Whether the boss intro has been shown */
  introShown: boolean;
  /** Whether the boss is currently active (between intro and victory/defeat) */
  isActive: boolean;
}

/**
 * Result of checking a word against the boss's twist mechanic
 */
export interface BossMechanicResult {
  /** Whether the word satisfies the current mechanic requirement */
  meetsRequirement: boolean;
  /** Score multiplier applied by the mechanic (1.0 = no change) */
  scoreMultiplier: number;
  /** Optional taunt event to trigger */
  triggerTaunt?: BossTauntEvent;
  /** Optional feedback message translation key */
  feedbackKey?: string;
  /** Whether this result should trigger a visual effect */
  triggerEffect?: boolean;
}

/**
 * Props for boss-related hooks
 */
export interface UseBossMechanicsReturn {
  /** Whether boss mechanics are active */
  isActive: boolean;
  /** Current mechanic requirement description (translation key) */
  currentRequirement?: string;
  /** Check a word against the boss mechanic */
  checkWord: (word: string) => BossMechanicResult;
  /** Trigger a taunt for a specific event */
  triggerTaunt: (event: BossTauntEvent) => void;
  /** Advance to next phase (for multi-phase bosses) */
  advancePhase: () => void;
  /** Currently displayed taunt (translation key, null if none) */
  currentTaunt: string | null;
  /** Whether a taunt is currently being shown */
  showTaunt: boolean;
  /** Boss game state */
  bossState: BossGameState;
  /** The boss config (null if not a boss level) */
  boss: BossConfig | null;
}

/**
 * Props for BossIntro component
 */
export interface BossIntroProps {
  /** Boss configuration */
  boss: BossConfig;
  /** World number for theming */
  worldNumber: number;
  /** Callback when player is ready to start */
  onStart: () => void;
  /** Callback to skip the intro */
  onSkip: () => void;
}

/**
 * Props for BossDialogue component
 */
export interface BossDialogueProps {
  /** Boss configuration */
  boss: BossConfig;
  /** Current taunt translation key */
  currentTaunt: string;
  /** Whether the dialogue is visible */
  isVisible: boolean;
  /** Position of the dialogue overlay */
  position?: 'top' | 'bottom';
}

/**
 * Props for BossVictory component
 */
export interface BossVictoryProps {
  /** Boss configuration */
  boss: BossConfig;
  /** Whether the player won */
  isVictory: boolean;
  /** Stars earned (0-3) */
  stars: 0 | 1 | 2 | 3;
  /** Final score */
  score: number;
  /** Words found */
  wordsFound: string[];
  /** Game state at completion */
  gameState: AdventureGameState;
  /** Callback to continue to next level */
  onContinue: () => void;
  /** Callback to retry the boss level */
  onRetry: () => void;
}
