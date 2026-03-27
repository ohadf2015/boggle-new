/**
 * useAdventureBossNew — Simplified Boss Battle Hook
 *
 * Single unified hook managing the entire boss fight:
 * - HP system: baseHP = worldId * 100
 * - 3 phases: Normal (100-50%), Angry (50-25%), Desperate (<25%)
 * - Simple attacks: lockTiles, scramble, timePenalty
 * - Attack frequency scales with phase
 * - Taunts from existing bossConfig system
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { getBossConfig, getBossTaunt } from '@/lib/adventure/bossConfig';
import type { BossConfig, BossTauntEvent } from '@/types/boss';

// ==============================================
// TYPES
// ==============================================

export type BossPhaseNew = 'normal' | 'angry' | 'desperate';

export type BossAttackType = 'lockTiles' | 'scramble' | 'timePenalty' | 'damage' | 'gridEffect';

export interface BossAttack {
  type: BossAttackType;
  /** For lockTiles: tile indices to lock */
  lockedTiles?: number[];
  /** For timePenalty: seconds to remove */
  seconds?: number;
  /** For damage: HP damage to deal to player */
  damage?: number;
  /** For gridEffect: effect name from bossConfig phase modifiers */
  gridEffect?: string;
}

export interface UseAdventureBossNewProps {
  worldId: number | null;
  /** Called when boss HP reaches 0 */
  onVictory?: () => void;
  /** Called when battle ends in defeat (timer expired) */
  onDefeat?: () => void;
  /** Called when boss executes an attack */
  onAttack?: (attack: BossAttack) => void;
  /** Grid size for lockTiles target selection (default 16) */
  gridSize?: number;
}

export interface UseAdventureBossNewReturn {
  /** Whether boss battle is active */
  isActive: boolean;
  /** Current HP */
  hp: number;
  /** Maximum HP */
  maxHP: number;
  /** HP as percentage (0-100) */
  hpPercentage: number;
  /** Current phase */
  phase: BossPhaseNew;
  /** Boss config (null if no boss) */
  boss: BossConfig | null;
  /** Current taunt translation key (null if none) */
  currentTaunt: string | null;
  /** Tile indices currently locked by boss */
  lockedTiles: number[];
  /** Start the boss battle */
  startBattle: () => void;
  /** End the battle (victory or defeat) */
  endBattle: (result: 'victory' | 'defeat') => void;
  /** Deal damage to boss (returns actual damage dealt) */
  dealDamage: (score: number) => number;
  /** Trigger a taunt for a specific event */
  triggerTaunt: (event: BossTauntEvent) => void;
  /** Reset all boss state */
  reset: () => void;
}

// ==============================================
// CONSTANTS
// ==============================================

/** Attack interval in ms per phase */
const ATTACK_INTERVALS: Record<BossPhaseNew, number> = {
  normal: 15000,
  angry: 10000,
  desperate: 7000,
};

/** Taunt display duration in ms */
const TAUNT_DURATION = 3500;

/** Lock tiles duration in ms */
const LOCK_DURATION = 5000;

/** All possible attack types */
const ATTACK_TYPES: BossAttackType[] = ['lockTiles', 'scramble', 'timePenalty', 'damage'];

/** Base damage per phase */
const PHASE_DAMAGE: Record<BossPhaseNew, number> = {
  normal: 8,
  angry: 12,
  desperate: 18,
};

// ==============================================
// HELPERS
// ==============================================

function derivePhase(hp: number, maxHP: number, phaseThresholds?: { angry: number; desperate: number }): BossPhaseNew {
  if (maxHP <= 0) return 'normal';
  const pct = (hp / maxHP) * 100;
  const desperateAt = phaseThresholds?.desperate ?? 33;
  const angryAt = phaseThresholds?.angry ?? 66;
  if (pct < desperateAt) return 'desperate';
  if (pct < angryAt) return 'angry';
  return 'normal';
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ==============================================
// HOOK
// ==============================================

export function useAdventureBossNew({
  worldId,
  onVictory,
  onDefeat,
  onAttack,
  gridSize = 16,
}: UseAdventureBossNewProps): UseAdventureBossNewReturn {
  // Boss config (memoized by worldId)
  const boss = useMemo(() => {
    if (worldId === null) return null;
    return getBossConfig(worldId);
  }, [worldId]);

  // Core state
  const [isActive, setIsActive] = useState(false);
  const [hp, setHp] = useState(0);
  const [maxHP, setMaxHP] = useState(0);
  const [phase, setPhase] = useState<BossPhaseNew>('normal');
  const [currentTaunt, setCurrentTaunt] = useState<string | null>(null);
  const [lockedTiles, setLockedTiles] = useState<number[]>([]);

  // Refs for timers and synchronous access
  const attackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tauntTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<BossPhaseNew>('normal');
  const isActiveRef = useRef(false);
  const hpRef = useRef(0);

  // Keep refs in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    hpRef.current = hp;
  }, [hp]);

  // Callback refs to avoid stale closures in intervals
  const onAttackRef = useRef(onAttack);
  const onVictoryRef = useRef(onVictory);
  const onDefeatRef = useRef(onDefeat);
  useEffect(() => { onAttackRef.current = onAttack; }, [onAttack]);
  useEffect(() => { onVictoryRef.current = onVictory; }, [onVictory]);
  useEffect(() => { onDefeatRef.current = onDefeat; }, [onDefeat]);

  // HP percentage
  const hpPercentage = maxHP > 0 ? Math.round((hp / maxHP) * 100) : 0;

  // ==============================================
  // TAUNT SYSTEM
  // ==============================================

  const showTaunt = useCallback((tauntKey: string) => {
    if (tauntTimerRef.current) clearTimeout(tauntTimerRef.current);
    setCurrentTaunt(tauntKey);
    tauntTimerRef.current = setTimeout(() => {
      setCurrentTaunt(null);
    }, TAUNT_DURATION);
  }, []);

  const triggerTaunt = useCallback((event: BossTauntEvent) => {
    if (worldId === null) return;
    const tauntKey = getBossTaunt(worldId, event);
    if (tauntKey) {
      showTaunt(tauntKey);
    }
  }, [worldId, showTaunt]);

  // ==============================================
  // ATTACK SYSTEM
  // ==============================================

  const clearAttackTimer = useCallback(() => {
    if (attackTimerRef.current) {
      clearInterval(attackTimerRef.current);
      attackTimerRef.current = null;
    }
  }, []);

  const executeAttack = useCallback(() => {
    if (!isActiveRef.current) return;

    const attackType = pickRandom(ATTACK_TYPES);
    const attack: BossAttack = { type: attackType };

    if (attackType === 'lockTiles') {
      const tileCount = randomInt(2, 4);
      const tiles: number[] = [];
      while (tiles.length < tileCount) {
        const idx = randomInt(0, gridSize - 1);
        if (!tiles.includes(idx)) tiles.push(idx);
      }
      attack.lockedTiles = tiles;

      // Set locked tiles in state
      setLockedTiles(tiles);
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      lockTimerRef.current = setTimeout(() => {
        setLockedTiles([]);
      }, LOCK_DURATION);
    } else if (attackType === 'timePenalty') {
      attack.seconds = randomInt(3, 5);
    } else if (attackType === 'damage') {
      attack.damage = PHASE_DAMAGE[phaseRef.current] + randomInt(0, 5);
    }

    onAttackRef.current?.(attack);
  }, [gridSize]);

  const startAttackTimer = useCallback((forPhase: BossPhaseNew) => {
    clearAttackTimer();
    const interval = ATTACK_INTERVALS[forPhase];
    attackTimerRef.current = setInterval(() => {
      executeAttack();
    }, interval);
  }, [clearAttackTimer, executeAttack]);

  // ==============================================
  // BATTLE LIFECYCLE
  // ==============================================

  const startBattle = useCallback(() => {
    if (worldId === null || !boss) return;

    const bossMaxHP = worldId * 100;
    setHp(bossMaxHP);
    setMaxHP(bossMaxHP);
    setPhase('normal');
    setIsActive(true);
    setLockedTiles([]);
    phaseRef.current = 'normal';
    isActiveRef.current = true;
    hpRef.current = bossMaxHP;

    // Start taunt
    const tauntKey = getBossTaunt(worldId, 'onStart');
    if (tauntKey) showTaunt(tauntKey);

    // Start attack timer
    startAttackTimer('normal');
  }, [worldId, boss, showTaunt, startAttackTimer]);

  const endBattle = useCallback((result: 'victory' | 'defeat') => {
    setIsActive(false);
    isActiveRef.current = false;
    clearAttackTimer();

    if (result === 'victory') {
      onVictoryRef.current?.();
    } else {
      onDefeatRef.current?.();
    }
  }, [clearAttackTimer]);

  const dealDamage = useCallback((score: number): number => {
    if (!isActiveRef.current) return 0;

    const currentHP = hpRef.current;
    const actualDamage = Math.min(score, currentHP);
    const newHP = Math.max(0, currentHP - score);

    hpRef.current = newHP;
    setHp(newHP);

    return actualDamage;
  }, []);

  // Phase derivation from HP changes
  useEffect(() => {
    if (!isActive || maxHP <= 0) return;

    const newPhase = derivePhase(hp, maxHP);
    if (newPhase !== phase) {
      setPhase(newPhase);
      phaseRef.current = newPhase;

      // Only restart attack timer if battle is still active (ref check avoids
      // the race where endBattle set isActiveRef=false but isActive state
      // hasn't propagated to this effect yet)
      if (isActiveRef.current) {
        startAttackTimer(newPhase);
      }

      // Emit grid effect for this phase (boss visual signature)
      if (boss?.phases) {
        const phaseIndex = newPhase === 'normal' ? 0 : newPhase === 'angry' ? 1 : 2;
        const phaseConfig = boss.phases[phaseIndex];
        const gridEffectName = phaseConfig?.mechanicModifiers?.gridEffect as string | undefined;
        if (gridEffectName) {
          onAttackRef.current?.({ type: 'gridEffect', gridEffect: gridEffectName });
        }
      }

      // Trigger phase change taunt
      if (worldId !== null) {
        if (newPhase === 'angry') {
          const tauntKey = getBossTaunt(worldId, 'onMechanic');
          if (tauntKey) showTaunt(tauntKey);
        } else if (newPhase === 'desperate') {
          const tauntKey = getBossTaunt(worldId, 'onLowTime');
          if (tauntKey) showTaunt(tauntKey);
        }
      }
    }

    // Check victory
    if (hp <= 0 && isActive) {
      endBattle('victory');
    }
  }, [hp, maxHP, isActive, phase, worldId, boss?.phases, showTaunt, startAttackTimer, endBattle]);

  // Reset function
  const reset = useCallback(() => {
    setIsActive(false);
    isActiveRef.current = false;
    setHp(0);
    hpRef.current = 0;
    setMaxHP(0);
    setPhase('normal');
    phaseRef.current = 'normal';
    setCurrentTaunt(null);
    setLockedTiles([]);
    clearAttackTimer();
    if (tauntTimerRef.current) clearTimeout(tauntTimerRef.current);
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
  }, [clearAttackTimer]);

  // Cleanup on unmount or worldId change
  useEffect(() => {
    return () => {
      clearAttackTimer();
      if (tauntTimerRef.current) clearTimeout(tauntTimerRef.current);
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, [clearAttackTimer]);

  // Deactivate when worldId becomes null
  useEffect(() => {
    if (worldId === null && isActive) {
      reset();
    }
  }, [worldId, isActive, reset]);

  return {
    isActive,
    hp,
    maxHP,
    hpPercentage,
    phase,
    boss,
    currentTaunt,
    lockedTiles,
    startBattle,
    endBattle,
    dealDamage,
    triggerTaunt,
    reset,
  };
}
