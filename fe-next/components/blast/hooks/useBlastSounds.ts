'use client';

import { useCallback, useRef } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

// ── Web Audio path-tone oscillator ──
// Chromatic scale from C4 upward — each letter in the path plays the next note
const PATH_TONE_FREQUENCIES = [
  261.6, 293.7, 329.6, 349.2, 392.0, 440.0, 493.9, 523.3, // C4–C5
  587.3, 659.3, 698.5, 784.0, 880.0, 987.8, 1047,          // D5–C6
];

/**
 * useBlastSounds — consolidates all blast-specific sound triggers.
 * Maps blast game events to the shared SoundEffectsContext functions.
 * Includes Web Audio oscillator for path-building chromatic tones.
 */
export function useBlastSounds() {
  const {
    playComboSound,
    playComboMilestoneSound,
    playComboBreakSound,
    playErrorSound,
    playAchievementSound,
    playCountdownBeep,
    playSound,
  } = useSoundEffects();

  const audioCtxRef = useRef<AudioContext | null>(null);

  /** Play tile clear sound with pitch scaled by word length */
  const playTileClear = useCallback((count: number) => {
    // Pitch up for longer words: 3-letter=1.0, 7-letter=1.3
    const rate = 1.0 + Math.max(0, count - 3) * 0.075;
    playSound('wordAccepted', { volume: 0.4, rate: Math.min(rate, 1.5) });
    // Layer combo sound for 5+ letter clears
    if (count >= 5) {
      playComboSound(Math.min(count - 3, 5));
    }
  }, [playSound, playComboSound]);

  /** Play cascade chain sound — pitch escalates faster for Blast chains */
  const playCascadeChain = useCallback((level: number) => {
    // Boost level by 2 so Blast cascades feel more dramatic than standard combos
    playComboSound(level + 2);
  }, [playComboSound]);

  /** Play combo activation sound — milestone for tier 2+, combo for tier 1 */
  const playComboActivation = useCallback((tier: 1 | 2 | 3) => {
    if (tier >= 2) {
      playComboMilestoneSound(tier === 3 ? 15 : 10);
    } else {
      playComboSound(3);
    }
  }, [playComboMilestoneSound, playComboSound]);

  /** Play wave clear celebration sound */
  const playWaveClear = useCallback(() => {
    playAchievementSound();
  }, [playAchievementSound]);

  /** Play countdown beep at 3, 2, 1 moves remaining */
  const playMoveWarning = useCallback((movesLeft: number) => {
    if (movesLeft >= 1 && movesLeft <= 3) {
      playCountdownBeep(movesLeft);
    }
  }, [playCountdownBeep]);

  /** Play word rejection sound */
  const playWordReject = useCallback(() => {
    playErrorSound();
  }, [playErrorSound]);

  /** Play combo timeout / break sound */
  const playComboTimeout = useCallback(() => {
    playComboBreakSound(1);
  }, [playComboBreakSound]);

  /** Play a chromatic tone as the player adds a tile to their path.
   *  Uses Web Audio oscillator — zero-latency, no asset needed. */
  const playPathTone = useCallback((pathLength: number) => {
    if (typeof window === 'undefined') return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const freq = PATH_TONE_FREQUENCIES[Math.min(pathLength - 1, PATH_TONE_FREQUENCIES.length - 1)];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Silently ignore — audio not critical
    }
  }, []);

  return {
    playTileClear,
    playCascadeChain,
    playComboActivation,
    playWaveClear,
    playMoveWarning,
    playWordReject,
    playComboTimeout,
    playPathTone,
  };
}
