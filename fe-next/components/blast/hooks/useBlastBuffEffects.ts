'use client';

import { useEffect, useRef, useState } from 'react';
import type { BlastTileState } from '@/shared/types/blast';
import type { BlastPregameBuff } from '../BlastPregameBuffModal';

interface BuffEffectsParams {
  buff: BlastPregameBuff | null | undefined;
  waveNumber: number;
  isMultiplayer: boolean;
  /** Engine slice — only the bits we touch */
  engine: {
    grid: unknown;
    tileStates: BlastTileState[][];
    /** Synced seeder — updates React state AND tileStatesRef so the bombs survive
     *  the first cascade. Plain setTileStates would let gravity, which reads the
     *  stale ref, wipe them on the next move. */
    seedTileStates: (updater: (prev: BlastTileState[][]) => BlastTileState[][]) => void;
    revive: (bonusMoves: number) => void;
    gameState: { isDeadEnd: boolean; isComplete: boolean };
  };
}

interface BuffEffectsReturn {
  /** Score multiplier to apply to baseScore (combo2x → 2, others → 1). Wave-1 only, never consumed. */
  scoreMultiplier: number;
  /** Whether the shield has been spent on a wave-1 dead-end revive. */
  shieldConsumed: boolean;
  /** Transient flag — true for SHIELD_TOAST_DURATION_MS right after the shield fires. */
  shieldToastVisible: boolean;
  /** Transient flag — true for BUFF_INTRO_DURATION_MS at the start of wave-1 SP
   *  to confirm to the player that their rewarded-ad buff is active. */
  buffIntroVisible: boolean;
}

/** Duration the "shield triggered" toast stays on screen, in ms. */
export const SHIELD_TOAST_DURATION_MS = 2800;
/** Duration the "buff active" intro banner stays on screen, in ms. */
export const BUFF_INTRO_DURATION_MS = 3000;

/** Number of bomb tiles seeded into the wave-1 board for the bomb buff. */
export const BOMB_BUFF_SEED_COUNT = 3;
/** Bonus moves granted alongside the free shield revive on wave-1 dead-end. */
export const SHIELD_BUFF_REVIVE_MOVES = 2;
/** Score multiplier applied to every word during wave 1 when the combo2x buff is active. */
export const COMBO_2X_BUFF_MULTIPLIER = 2;

/**
 * Applies real gameplay effects for the rewarded-ad pre-game buff:
 *   • bomb     → splice N standard tiles → bomb tiles in wave-1 board on first ready render
 *   • shield   → on first wave-1 dead-end, free revive (no ad needed) + bonus moves
 *   • combo2x  → return scoreMultiplier=2 so the word handler doubles base score
 *
 * Returns visibility flags for HUD chip rendering.
 */
export function useBlastBuffEffects({
  buff,
  waveNumber,
  isMultiplayer,
  engine,
}: BuffEffectsParams): BuffEffectsReturn {
  const isWave1Singleplayer = !isMultiplayer && waveNumber === 1;
  const bombSeededRef = useRef(false);
  const shieldArmedRef = useRef(false);
  const [shieldConsumed, setShieldConsumed] = useState(false);
  const [shieldToastVisible, setShieldToastVisible] = useState(false);
  const [buffIntroVisible, setBuffIntroVisible] = useState(false);

  // Arm shield once per buff selection.
  useEffect(() => {
    shieldArmedRef.current = isWave1Singleplayer && buff === 'shield';
    if (!isWave1Singleplayer || buff !== 'shield') setShieldConsumed(false);
  }, [buff, isWave1Singleplayer]);

  // Seed bomb tiles into wave-1 board after engine grid + tileStates are ready.
  useEffect(() => {
    if (bombSeededRef.current) return;
    if (!isWave1Singleplayer || buff !== 'bomb') return;
    if (!engine.grid || engine.tileStates.length === 0) return;

    bombSeededRef.current = true;
    engine.seedTileStates(prev => seedBombTiles(prev, BOMB_BUFF_SEED_COUNT));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot seed; engine ref methods are stable
  }, [buff, isWave1Singleplayer, engine.grid, engine.tileStates.length]);

  // Auto-revive on wave-1 dead-end if shield is armed and unspent.
  useEffect(() => {
    if (!shieldArmedRef.current) return;
    if (shieldConsumed) return;
    if (engine.gameState.isComplete) return;
    if (!engine.gameState.isDeadEnd) return;

    shieldArmedRef.current = false;
    setShieldConsumed(true);
    setShieldToastVisible(true);
    engine.revive(SHIELD_BUFF_REVIVE_MOVES);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- engine.revive is a stable callback
  }, [engine.gameState.isDeadEnd, engine.gameState.isComplete, shieldConsumed]);

  // Auto-hide the shield toast after SHIELD_TOAST_DURATION_MS.
  useEffect(() => {
    if (!shieldToastVisible) return;
    const timer = setTimeout(() => setShieldToastVisible(false), SHIELD_TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [shieldToastVisible]);

  // Show the "buff active" intro banner once on wave-1 SP entry so the player
  // sees what the rewarded ad bought them. Auto-dismiss after BUFF_INTRO_DURATION_MS.
  useEffect(() => {
    if (!isWave1Singleplayer || !buff) return;
    setBuffIntroVisible(true);
    const timer = setTimeout(() => setBuffIntroVisible(false), BUFF_INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isWave1Singleplayer, buff]);

  const scoreMultiplier = isWave1Singleplayer && buff === 'combo2x' ? COMBO_2X_BUFF_MULTIPLIER : 1;

  return { scoreMultiplier, shieldConsumed, shieldToastVisible, buffIntroVisible };
}

/**
 * Convert N random standard tiles into bomb tiles. Pure helper, exported for tests.
 * Skips already-cleared and already-special tiles. Deterministic per call seed.
 */
export function seedBombTiles(
  prev: BlastTileState[][],
  count: number,
  rng: () => number = Math.random,
): BlastTileState[][] {
  const candidates: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < prev.length; r++) {
    for (let c = 0; c < prev[r].length; c++) {
      const t = prev[r][c];
      if (!t.isCleared && t.type === 'standard') candidates.push({ r, c });
    }
  }
  if (candidates.length === 0) return prev;

  // Fisher-Yates shuffle, take first `count`
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const picked = new Set(candidates.slice(0, Math.min(count, candidates.length)).map(p => `${p.r},${p.c}`));

  return prev.map((row, r) =>
    row.map((tile, c) => (picked.has(`${r},${c}`) ? { ...tile, type: 'bomb' as const } : tile)),
  );
}

export default useBlastBuffEffects;
