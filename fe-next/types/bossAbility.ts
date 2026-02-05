/**
 * Boss Ability Type Definitions
 *
 * Extensible ability system for boss battles:
 * - Each boss has 2-3 unique abilities
 * - Abilities have cooldowns, activation conditions, and effects
 * - Telegraph system warns players before ability execution
 */

import type { BossStateMachineContext, BossStateMachineState } from './bossStateMachine';

// ==============================================
// TELEGRAPH CONFIGURATION
// ==============================================

/**
 * Configuration for attack telegraph (2s warning)
 */
export interface TelegraphConfig {
  /** Duration of telegraph in ms (default: 2000) */
  duration: number;
  /** Visual type of telegraph */
  visualType: 'tiles' | 'screen' | 'boss';
  /** Particle effect to show (optional) */
  particleEffect?: 'warning' | 'swirl' | 'bees' | 'sparkle';
  /** Sound effect ID (optional) */
  soundEffect?: string;
}

// ==============================================
// TARGET SPECIFICATION
// ==============================================

/**
 * Target specification for abilities that affect tiles
 */
export interface AbilityTarget {
  /** How to select target tiles */
  type: 'random' | 'row' | 'column' | 'diagonal' | 'all' | 'specific';
  /** Number of tiles to target (for random) */
  count?: number;
  /** Specific tile indices (for specific type) */
  indices?: number[];
}

// ==============================================
// ABILITY EFFECTS
// ==============================================

/**
 * Effect to apply when ability executes
 */
export interface AbilityEffect {
  /** Type of effect */
  type:
    | 'change_tiles'      // Change tile letters/types
    | 'lock_tiles'        // Prevent tile selection
    | 'scramble'          // Shuffle tiles
    | 'timer_penalty'     // Reduce timer
    | 'score_modifier'    // Change scoring
    | 'spawn_special'     // Add special tiles
    | 'requirement'       // Force word requirement
    | 'player_damage';    // Deal damage to player health

  /** Target tiles (for tile-affecting effects) */
  target?: AbilityTarget;

  /** Duration in ms (for temporary effects) */
  duration?: number;

  /** Effect-specific parameters */
  params?: Record<string, unknown>;
}

// ==============================================
// ACTIVATION CONDITIONS
// ==============================================

/**
 * Activation condition for abilities
 */
export interface ActivationCondition {
  /** Type of condition */
  type:
    | 'phase'           // Based on boss phase
    | 'hp_threshold'    // Based on HP percentage
    | 'time_elapsed'    // Based on battle time
    | 'words_found'     // Based on player words
    | 'combo_count';    // Based on player combo

  /** Value to compare against */
  value: number | string;

  /** Comparison operator */
  operator?: '=' | '<' | '>' | '<=' | '>=';
}

// ==============================================
// BOSS ABILITY DEFINITION
// ==============================================

/**
 * Complete boss ability definition
 */
export interface BossAbility {
  /** Unique ability identifier */
  id: string;

  /** Boss ID this ability belongs to */
  bossId: string;

  /** Display name (translation key) */
  name: string;

  /** Description (translation key) */
  description: string;

  /** Cooldown in seconds between uses */
  cooldown: number;

  /** Conditions that must be met to activate */
  activationConditions: ActivationCondition[];

  /** Effects to apply when executed */
  effects: AbilityEffect[];

  /** Telegraph configuration */
  telegraph: TelegraphConfig;

  /** Priority (higher = checked first) */
  priority: number;

  /** Whether this ability can be interrupted */
  interruptible: boolean;
}

// ==============================================
// RUNTIME STATE
// ==============================================

/**
 * Runtime state for an ability during battle
 */
export interface AbilityRuntimeState {
  /** Ability ID */
  abilityId: string;

  /** Time until cooldown expires (ms) */
  cooldownRemaining: number;

  /** Whether currently in telegraph phase */
  isTelegraphing: boolean;

  /** Number of times used this battle */
  useCount: number;

  /** Last activation timestamp */
  lastActivatedAt: number | null;
}

// ==============================================
// HOOK RETURN TYPE
// ==============================================

/**
 * Return type for useBossAbilities hook
 */
export interface UseBossAbilitiesReturn {
  /** All abilities for current boss */
  abilities: BossAbility[];

  /** Runtime state for each ability */
  abilityStates: Map<string, AbilityRuntimeState>;

  /** Currently telegraphing ability (if any) */
  telegraphingAbility: BossAbility | null;

  /** Check if any ability can activate */
  checkActivation: (context: BossStateMachineContext, state: BossStateMachineState) => BossAbility | null;

  /** Start ability telegraph */
  startAbility: (abilityId: string) => void;

  /** Execute ability effects */
  executeAbility: (abilityId: string) => AbilityEffect[];

  /** Tick cooldowns (call every frame/interval) */
  tickCooldowns: (deltaMs: number) => void;

  /** Reset all ability states */
  resetAbilities: () => void;
}
