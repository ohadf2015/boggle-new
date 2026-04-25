'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
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
    playBlastBombSound,
    playBlastLightningSound,
    playBlastPrismSound,
    playTileSelectSound,
    playLongWordBonusSound,
    playLegendaryWordSound,
    playMegaCascadeSound,
    sfxMuted,
  } = useSoundEffects();

  const sfxMutedRef = useRef(sfxMuted);
  useEffect(() => { sfxMutedRef.current = sfxMuted; }, [sfxMuted]);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Release the AudioContext on unmount. Browsers cap concurrent AudioContexts
  // (~6 on Chrome) — leaking one per blast session eventually starves audio.
  useEffect(() => {
    return () => {
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => { /* ignore — already closing */ });
      }
      audioCtxRef.current = null;
    };
  }, []);

  const getAudioCtx = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      if (!audioCtxRef.current) {
        const WebkitAudioCtx = (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new (window.AudioContext || WebkitAudioCtx!)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch { return null; }
  }, []);

  /** Synthesize a short tone with configurable waveform, frequency, and duration */
  const synthTone = useCallback((freq: number, wave: OscillatorType, dur: number, vol = 0.1, detune = 0) => {
    if (sfxMutedRef.current) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }, [getAudioCtx]);

  /** Synthesized sound configs per tile type — unique waveform/freq combos */
  const TILE_SYNTH: Record<string, () => void> = useMemo(() => ({
    gold:      () => { synthTone(880, 'sine', 0.2, 0.08); synthTone(1320, 'sine', 0.15, 0.05); },
    silver:    () => { synthTone(784, 'triangle', 0.18, 0.07); synthTone(1175, 'triangle', 0.12, 0.04); },
    diamond:   () => { synthTone(1047, 'sine', 0.25, 0.06); synthTone(1568, 'sine', 0.2, 0.04); synthTone(2093, 'sine', 0.15, 0.03); },
    gem:       () => { synthTone(660, 'triangle', 0.2, 0.07); synthTone(990, 'triangle', 0.15, 0.05); },
    rainbow:   () => { synthTone(523, 'sine', 0.3, 0.06); synthTone(659, 'sine', 0.25, 0.05); synthTone(784, 'sine', 0.2, 0.04); },
    mirror:    () => { synthTone(698, 'square', 0.12, 0.04); synthTone(698, 'square', 0.12, 0.04); },
    magnet:    () => { synthTone(220, 'sawtooth', 0.25, 0.06); synthTone(330, 'sawtooth', 0.2, 0.04); },
    ice:       () => { synthTone(1200, 'sine', 0.15, 0.05, 30); synthTone(1600, 'sine', 0.1, 0.03, -30); },
    frozen:    () => { synthTone(1400, 'sine', 0.12, 0.04); synthTone(1800, 'sine', 0.1, 0.03); },
    wildcard:  () => { synthTone(440, 'triangle', 0.2, 0.06); synthTone(880, 'triangle', 0.15, 0.04); },
    countdown: () => { synthTone(200, 'square', 0.3, 0.08); synthTone(150, 'square', 0.2, 0.06); },
    shuffle:   () => { synthTone(500, 'triangle', 0.2, 0.06); synthTone(600, 'triangle', 0.18, 0.05); synthTone(700, 'triangle', 0.15, 0.04); },
    magma:     () => { synthTone(150, 'sawtooth', 0.3, 0.08); synthTone(100, 'sawtooth', 0.35, 0.06); synthTone(80, 'square', 0.25, 0.05); },
    portal:    () => { synthTone(400, 'sine', 0.3, 0.06, 100); synthTone(600, 'sine', 0.25, 0.05, -100); },
    catalyst:  () => { synthTone(550, 'triangle', 0.2, 0.07); synthTone(825, 'sine', 0.18, 0.05); synthTone(1100, 'sine', 0.12, 0.03); },
  }), [synthTone]);

  /** Play special tile activation sound based on tile type */
  const playSpecialTileSound = useCallback((tileType: string) => {
    // Use dedicated asset-based sounds for bomb/lightning/prism (existing)
    if (tileType === 'bomb') { playBlastBombSound(); return; }
    if (tileType === 'lightning') { playBlastLightningSound(); return; }
    if (tileType === 'prism') { playBlastPrismSound(); return; }
    // Synthesized sounds for all other special tiles
    TILE_SYNTH[tileType]?.();
  }, [playBlastBombSound, playBlastLightningSound, playBlastPrismSound, TILE_SYNTH]);

  /** Play tile select sound when player adds a tile to path */
  const playTileSelect = useCallback(() => {
    playTileSelectSound();
  }, [playTileSelectSound]);

  /** Play long word bonus sound for 6+ letter words, legendary for 8+ */
  const playLongWordBonus = useCallback((wordLength: number) => {
    if (wordLength >= 8) playLegendaryWordSound();
    else if (wordLength >= 6) playLongWordBonusSound();
  }, [playLongWordBonusSound, playLegendaryWordSound]);

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

  /** Pentatonic scale frequencies — C4, D4, E4, G4, A4, C5, D5, E5, G5, A5
   *  Pentatonic avoids semitone dissonance so every step sounds pleasant. */
  const PENTATONIC_SCALE = useMemo(() => [
    262, 294, 330, 392, 440, 523, 587, 659, 784, 880,
  ], []);

  /** Play cascade chain sound — pentatonic pitch ladder for satisfying escalation */
  const playCascadeChain = useCallback((level: number) => {
    // Mega cascade at 5+ chain — layer pentatonic arpeggio on top
    if (level >= 5) {
      playMegaCascadeSound();
      // Add shimmering arpeggio
      const base = PENTATONIC_SCALE[Math.min(level - 1, PENTATONIC_SCALE.length - 1)];
      synthTone(base, 'sine', 0.3, 0.06);
      synthTone(base * 1.5, 'sine', 0.25, 0.04); // fifth above
    } else {
      // Pentatonic tone per chain level — each step is a pleasant interval
      const freq = PENTATONIC_SCALE[Math.min(level, PENTATONIC_SCALE.length - 1)];
      synthTone(freq, 'triangle', 0.25, 0.1);
      // Layer a softer octave-up shimmer for depth
      synthTone(freq * 2, 'sine', 0.18, 0.04);
    }
  }, [playMegaCascadeSound, synthTone, PENTATONIC_SCALE]);

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
    if (sfxMutedRef.current) return;
    try {
      if (!audioCtxRef.current) {
        const WebkitAudioCtx = (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new (window.AudioContext || WebkitAudioCtx!)();
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

  /** Descending "deflate" tone when player cancels a partial path (2+ tiles) */
  const playPathCancel = useCallback((pathLength: number) => {
    if (pathLength < 2) return;
    // Quick descending glissando — higher start for longer paths
    const startFreq = PATH_TONE_FREQUENCIES[Math.min(pathLength - 1, PATH_TONE_FREQUENCIES.length - 1)];
    synthTone(startFreq * 0.7, 'triangle', 0.15, 0.06);
    setTimeout(() => synthTone(startFreq * 0.4, 'triangle', 0.12, 0.04), 40);
  }, [synthTone]);

  return {
    playTileClear,
    playCascadeChain,
    playComboActivation,
    playWaveClear,
    playMoveWarning,
    playWordReject,
    playComboTimeout,
    playPathTone,
    playPathCancel,
    playSpecialTileSound,
    playTileSelect,
    playLongWordBonus,
  };
}
