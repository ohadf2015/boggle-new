/**
 * GameBridge — typed singleton event bus between React and Phaser.
 *
 * Architecture:
 *   React  ──emit──▶ Phaser  (grid:update, word:feedback, effect:earthquake, …)
 *   Phaser ──emit──▶ React   (word:submit, word:change, selection:change, …)
 *
 * All data flows through this bridge. Phaser scenes MUST NOT hold references
 * to React props or callbacks — they subscribe to bridge events only.
 * This prevents stale closure bugs when React state updates.
 */

import type { LetterGrid } from '@/types';
import type { TileType, TileActivationEffect } from '@/types/adventure';
import type { BlastTileState, BlastExplosion, BlastScorePopup, CascadeHighlightWord, BlastComboEvent } from '@/components/blast/types';
import type { BlastComboType } from '@/components/blast/utils/blastCombos';
import type { AutoTriggerStep } from '@/components/blast/utils/blastLevelClear';

// ─── Event payload types ──────────────────────────────────────────────────────

export interface PathCellPayload {
  row: number;
  col: number;
  letter: string;
}

/** All typed events. Key = event name, Value = payload type. */
export interface BridgeEvents {
  // ── React → Phaser ──────────────────────────────────────────────────────────
  /** Full grid refresh — sent when game starts or board is reshuffled */
  'grid:update': {
    grid: LetterGrid;
    comboLevel: number;
    fireRoundActive: boolean;
    tileStates?: Record<string, string>;
    worldId?: number;
  };
  /** Word submission result — drives tile animations */
  'word:feedback': {
    type: 'accepted' | 'rejected' | 'duplicate' | 'foundByOther';
    word: string;
    score?: number;
  };
  /** Earthquake / fire-round camera effect */
  'effect:earthquake': {
    intensity: 'warning' | 'shaking' | 'fire-round';
  };
  /** Hint highlight — cells to blink */
  'selection:highlight': {
    cells: PathCellPayload[];
  };
  /** Accessibility flags — Phaser adjusts particle budget and durations */
  'accessibility:update': {
    reduceMotion: boolean;
    disableFireRoundLights: boolean;
    disableEarthquakeEffects: boolean;
    isLowEnd: boolean;
    /** Whether the current locale is RTL (e.g. Hebrew). Phaser can mirror directional UI. */
    isRTL: boolean;
  };
  /** Lock specific tiles (boss ability) — makes them unselectable with visual indicator */
  'tiles:lock': {
    lockedIndices: number[];
    gridSize: number;
  };
  /** Tear down the Phaser game and clean up resources */
  'scene:destroy': undefined;

  // ── React → Phaser (Blast Mode) ─────────────────────────────────────────────
  /** Full blast grid state — tiles, types, combo level */
  'blast:grid:update': {
    grid: LetterGrid;
    tileStates: BlastTileState[][];
    comboLevel: number;
  };
  /** Tiles cleared by word submission — trigger clear animations + explosions */
  'blast:tiles:clear': {
    clearedPositions: Array<{ row: number; col: number }>;
    explosions: BlastExplosion[];
    scorePopups: BlastScorePopup[];
  };
  /** Gravity phase — falling tiles move down, new tiles spawn from top */
  'blast:gravity:start': {
    fallingTiles: Array<{ row: number; col: number; fromRow: number; fallDistance: number }>;
    newTiles: Array<{ row: number; col: number; letter: string; type: string }>;
  };
  /** Cascade detected — highlight words before auto-clearing */
  'blast:cascade:highlight': {
    words: CascadeHighlightWord[];
  };
  /** Cascade words cleared — same structure as blast:tiles:clear + chain level */
  'blast:cascade:clear': {
    clearedPositions: Array<{ row: number; col: number }>;
    explosions: BlastExplosion[];
    scorePopups: BlastScorePopup[];
    chainLevel?: number;
  };
  /** Show hint path on grid */
  'blast:hint:show': {
    path: Array<{ row: number; col: number }>;
  };
  /** Clear hint display */
  'blast:hint:clear': undefined;
  /** Camera shake effect */
  'blast:shake': {
    intensity: 'light' | 'medium' | 'heavy';
  };
  /** Wave transition animation */
  'blast:wave:transition': {
    waveNumber: number;
    /** Optional wave score for the summary text */
    score?: number;
  };
  /** Combo triggered — spectacular multi-tile effect */
  'blast:combo:trigger': {
    comboType: BlastComboType;
    tiles: Array<{ row: number; col: number }>;
    label: string;
    clearedCount: number;
  };
  /** Level cleared — auto-trigger remaining special tiles + victory celebration */
  'blast:level:clear': {
    autoTriggerSequence: AutoTriggerStep[];
    movesRemaining: number;
    moveBonus: number;
    totalScore: number;
  };

  // ── React → Phaser (Boss UI) ────────────────────────────────────────────────
  /** Initialize boss UI — sent when boss battle starts */
  'boss:init': {
    bossName: string;
    bossImagePath: string;
    maxHP: number;
    currentHP: number;
    phase: string;
  };
  /** Boss HP changed — update HP bar display */
  'boss:damage': {
    currentHP: number;
    maxHP: number;
    phase: string;
  };
  /** Boss telegraphing an ability — show warning overlay */
  'boss:ability:telegraph': {
    abilityId: string;
    abilityName: string;
    duration: number;
    targetTiles: number[];
  };
  /** Boss ability lands — camera flash, slash marks, damage number */
  'boss:ability:execute': {
    abilityName: string | null;
    damage: number;
  };
  /** Boss taunt text — speech bubble display */
  'boss:taunt': {
    text: string;
    bossName: string;
    visible: boolean;
  };
  /** Boss phase transition (phase1 → phase2 → enraged) */
  'boss:phase:change': {
    phase: string;
  };
  /** Boss battle ended — cleanup all boss UI */
  'boss:end': {
    result: 'victory' | 'defeat';
  };

  // ── Phaser → React ──────────────────────────────────────────────────────────
  /** User drew a valid path — update React WordFormingArea */
  'word:submit': {
    word: string;
    path: PathCellPayload[];
  };
  /** Path changed mid-drag (word preview) */
  'word:change': {
    word: string;
    letterCount: number;
    path: PathCellPayload[];
  };
  /** Pointer selection changed */
  'selection:change': {
    cells: PathCellPayload[];
  };
  /** A special tile was activated (adventure mode) */
  'tile:activated': {
    row: number;
    col: number;
    tileType: TileType;
    effect: TileActivationEffect;
  };
  /** Phaser scene is mounted and ready to receive events */
  'scene:ready': undefined;

  // ── Phaser → React (Blast Mode) ─────────────────────────────────────────────
  /** Animation phase completed — React can proceed to next cascade phase */
  'blast:anim:complete': {
    phase: 'clear' | 'gravity' | 'cascade-highlight' | 'cascade-clear' | 'wave-transition' | 'level-clear';
  };
}

// ─── Internal listener registry ───────────────────────────────────────────────

type Listener<T> = (payload: T) => void;
type AnyListener = Listener<unknown>;

const registry = new Map<string, Set<AnyListener>>();

// ─── GameBridge namespace ─────────────────────────────────────────────────────

export const GameBridge = {
  /**
   * Subscribe to a typed event.
   * @returns Unsubscribe function for easy cleanup in useEffect returns.
   */
  on<K extends keyof BridgeEvents>(
    event: K,
    listener: Listener<BridgeEvents[K]>
  ): () => void {
    if (!registry.has(event)) {
      registry.set(event, new Set());
    }
    registry.get(event)!.add(listener as AnyListener);
    return () => GameBridge.off(event, listener);
  },

  /** Unsubscribe a specific listener. */
  off<K extends keyof BridgeEvents>(
    event: K,
    listener: Listener<BridgeEvents[K]>
  ): void {
    registry.get(event)?.delete(listener as AnyListener);
  },

  /** Subscribe to an event for exactly one invocation. */
  once<K extends keyof BridgeEvents>(
    event: K,
    listener: Listener<BridgeEvents[K]>
  ): void {
    const wrapper: Listener<BridgeEvents[K]> = (payload) => {
      listener(payload);
      GameBridge.off(event, wrapper);
    };
    GameBridge.on(event, wrapper);
  },

  /** Emit an event to all registered listeners. */
  emit<K extends keyof BridgeEvents>(
    event: K,
    payload: BridgeEvents[K]
  ): void {
    const listeners = registry.get(event);
    if (!listeners) return;
    // Iterate a copy so that listeners that call off() don't cause issues
    for (const listener of [...listeners]) {
      try {
        listener(payload as unknown);
      } catch (err) {
        console.error(`[GameBridge] listener error on "${String(event)}":`, err);
      }
    }
  },

  /**
   * Remove all listeners from all channels.
   * Call this when the game is unmounted to prevent memory leaks.
   */
  reset(): void {
    registry.clear();
  },
};
