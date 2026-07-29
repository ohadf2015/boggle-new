/**
 * Boss State Machine Types
 *
 * 5-phase state machine: intro -> phase1 -> phase2 -> enraged -> victory/defeat
 * Phase transitions at HP thresholds: 66% (phase1->phase2), 33% (phase2->enraged)
 */

/** Context (extended state) for boss state machine */
export interface BossStateMachineContext {
  /** Current HP (0 to maxHP) */
  hp: number;
  /** Maximum HP for this boss */
  maxHP: number;
  /** Total damage dealt this battle */
  totalDamageDealt: number;
  /** Boss ID for ability lookup */
  bossId: string;
  /** Seconds elapsed since battle start (for ability time_elapsed conditions) */
  timeElapsed?: number;
  /** Number of words found by player (for ability words_found conditions) */
  wordsFound?: number;
  /** Current player combo count (for ability combo_count conditions) */
  comboCount?: number;
}

/** Events that trigger state transitions */
export type BossStateMachineEvent =
  | { type: 'START_BATTLE' }
  | { type: 'DEAL_DAMAGE'; amount: number }
  | { type: 'TIMER_EXPIRED' }
  | { type: 'RESET' };

/** Possible states in the boss state machine */
export type BossStateMachineState =
  | 'intro'
  | 'phase1'
  | 'phase2'
  | 'enraged'
  | 'victory'
  | 'defeat';

/** HP thresholds for phase transitions */
export const BOSS_PHASE_THRESHOLDS = {
  /** HP percentage below which boss enters phase2 */
  PHASE2_THRESHOLD: 66,
  /** HP percentage below which boss enters enraged */
  ENRAGED_THRESHOLD: 33,
} as const;

/** Return type for useBossStateMachine hook */
export interface UseBossStateMachineReturn {
  /** Current state value (intro, phase1, phase2, enraged, victory, defeat) */
  state: BossStateMachineState;
  /** Current context (hp, maxHP, etc.) */
  context: BossStateMachineContext;
  /** Send event to state machine */
  send: (event: BossStateMachineEvent) => void;
  /** Start the battle (transition from intro to phase1) */
  startBattle: () => void;
  /** Deal damage to boss */
  dealDamage: (amount: number) => void;
  /** End battle due to timer expiration (defeat) */
  timerExpired: () => void;
  /** Reset state machine to initial state */
  reset: () => void;
  /** HP as percentage (0-100) */
  hpPercentage: number;
  /** Whether battle is in active phase (phase1, phase2, or enraged) */
  isActive: boolean;
  /** Whether boss is enraged */
  isEnraged: boolean;
  /** Whether boss is defeated */
  isVictory: boolean;
  /** Whether player lost */
  isDefeat: boolean;
}
