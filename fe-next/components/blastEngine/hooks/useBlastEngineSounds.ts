// ─── Blast Engine Sound Effects ───────────────────────────────────────
// Hooks into the existing SoundEffectsContext to trigger sounds
// for swap, clear, combo, cascade, wave complete, and game over events.

'use client';

import { useEffect, useRef } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

interface BlastSoundEvents {
  /** Number of tiles cleared in last action */
  tilesCleared: number;
  /** Current combo level */
  comboLevel: number;
  /** Current cascade chain level */
  cascadeLevel: number;
  /** Wave was just cleared */
  waveCleared: boolean;
  /** Game is over */
  gameOver: boolean;
  /** A swap just happened */
  swapOccurred: boolean;
  /** Words found in last cascade step */
  wordsFoundCount: number;
}

export function useBlastEngineSounds(events: BlastSoundEvents): void {
  const sfx = useSoundEffects();
  const prevCombo = useRef(0);
  const prevCascade = useRef(0);
  const prevCleared = useRef(0);
  const prevWaveCleared = useRef(false);
  const prevSwap = useRef(false);

  // ─── Swap sound ─────────────────────────────────────────────────
  useEffect(() => {
    if (events.swapOccurred && !prevSwap.current) {
      // Use a subtle click for swap — reuse countdown beep at low volume
      sfx.playCountdownBeep?.(10);
    }
    prevSwap.current = events.swapOccurred;
  }, [events.swapOccurred, sfx]);

  // ─── Word found / tiles cleared ─────────────────────────────────
  useEffect(() => {
    if (events.tilesCleared > prevCleared.current && events.tilesCleared > 0) {
      sfx.playWordAcceptedSound?.();
    }
    prevCleared.current = events.tilesCleared;
  }, [events.tilesCleared, sfx]);

  // ─── Combo sounds ──────────────────────────────────────────────
  useEffect(() => {
    if (events.comboLevel > prevCombo.current && events.comboLevel >= 2) {
      // Ultra combo at 10+ — legendary sound!
      if (events.comboLevel >= 10 && prevCombo.current < 10) {
        sfx.playUltraComboSound?.();
      } else {
        sfx.playComboSound?.(events.comboLevel);
      }

      // Milestone sounds at 5, 10, 15
      if (events.comboLevel % 5 === 0) {
        sfx.playComboMilestoneSound?.(events.comboLevel);
      }
    }
    prevCombo.current = events.comboLevel;
  }, [events.comboLevel, sfx]);

  // ─── Cascade chain sounds ──────────────────────────────────────
  useEffect(() => {
    if (events.cascadeLevel > prevCascade.current && events.cascadeLevel >= 1) {
      // Mega cascade at 5+ chain — legendary sound!
      if (events.cascadeLevel >= 5) {
        sfx.playMegaCascadeSound?.();
      } else {
        sfx.playComboSound?.(events.cascadeLevel);
      }
    }
    prevCascade.current = events.cascadeLevel;
  }, [events.cascadeLevel, sfx]);

  // ─── Wave cleared ──────────────────────────────────────────────
  useEffect(() => {
    if (events.waveCleared && !prevWaveCleared.current) {
      sfx.playAchievementSound?.();
    }
    prevWaveCleared.current = events.waveCleared;
  }, [events.waveCleared, sfx]);

  // ─── Game over ─────────────────────────────────────────────────
  useEffect(() => {
    if (events.gameOver) {
      sfx.playComboBreakSound?.(events.comboLevel);
    }
  }, [events.gameOver, events.comboLevel, sfx]);
}
