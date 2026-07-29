'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type AnimationPhase =
  | 'idle'
  | 'header'
  | 'stats'
  | 'podium-3rd'
  | 'podium-2nd'
  | 'podium-1st'
  | 'confetti'
  | 'awards'
  | 'player-spotlight'
  | 'leaderboard'
  | 'controls'
  | 'complete'
  | 'tournament-transition'
  | 'tournament-standings';

export type SoundType = 'whoosh' | 'pop' | 'fanfare' | 'victory' | 'ding' | 'ready';

interface AnimationPhaseConfig {
  phase: AnimationPhase;
  duration: number; // milliseconds
  sound?: SoundType;
}

// Animation sequence with timing
const ANIMATION_SEQUENCE: AnimationPhaseConfig[] = [
  { phase: 'header', duration: 1000, sound: 'whoosh' },
  { phase: 'stats', duration: 2000, sound: 'pop' },
  { phase: 'podium-3rd', duration: 2000, sound: 'fanfare' },
  { phase: 'podium-2nd', duration: 2000, sound: 'fanfare' },
  { phase: 'podium-1st', duration: 3000, sound: 'victory' },
  { phase: 'confetti', duration: 1500 },
  { phase: 'awards', duration: 3000, sound: 'ding' },
  { phase: 'player-spotlight', duration: 4000, sound: 'pop' },
  { phase: 'leaderboard', duration: 1000 },
  { phase: 'controls', duration: 500, sound: 'ready' },
  { phase: 'complete', duration: 0 },
];

// Tournament mode adds these phases after 'complete'
const TOURNAMENT_SEQUENCE: AnimationPhaseConfig[] = [
  { phase: 'tournament-transition', duration: 2000, sound: 'whoosh' },
  { phase: 'tournament-standings', duration: 0 },
];

interface UseTvResultsAnimationOptions {
  enabled?: boolean;
  autoAdvance?: boolean;
  isTournament?: boolean;
  playerCount?: number;
  onPhaseChange?: (phase: AnimationPhase) => void;
  onSound?: (sound: SoundType) => void;
}

interface UseTvResultsAnimationResult {
  currentPhase: AnimationPhase;
  phaseIndex: number;
  isComplete: boolean;
  isAnimating: boolean;
  skipToEnd: () => void;
  advancePhase: () => void;
  restart: () => void;
  getPhaseVisibility: (phase: AnimationPhase) => boolean;
}

/**
 * useTvResultsAnimation - Orchestrates the TV results reveal sequence
 * Auto-advances through phases with configurable timing
 * Host can skip to end at any time
 */
export function useTvResultsAnimation({
  enabled = true,
  autoAdvance = true,
  isTournament = false,
  playerCount = 0,
  onPhaseChange,
  onSound,
}: UseTvResultsAnimationOptions = {}): UseTvResultsAnimationResult {
  const [currentPhase, setCurrentPhase] = useState<AnimationPhase>('idle');
  const [phaseIndex, setPhaseIndex] = useState(-1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isManualSkipRef = useRef(false);

  // Build the complete sequence based on mode
  const sequence = isTournament
    ? [...ANIMATION_SEQUENCE, ...TOURNAMENT_SEQUENCE]
    : ANIMATION_SEQUENCE;

  // Adjust sequence for player count (skip podium phases if not enough players)
  const adjustedSequence = sequence.filter(config => {
    if (playerCount < 3 && config.phase === 'podium-3rd') return false;
    if (playerCount < 2 && config.phase === 'podium-2nd') return false;
    return true;
  });

  const isComplete = currentPhase === 'complete' || currentPhase === 'tournament-standings';
  const isAnimating = !isComplete && currentPhase !== 'idle';

  // Internal phase advance - defined before useEffects that use it
  const advancePhaseInternal = useCallback(() => {
    setPhaseIndex(prev => {
      const nextIndex = prev + 1;
      if (nextIndex >= adjustedSequence.length) {
        return prev;
      }

      const nextConfig = adjustedSequence[nextIndex];
      setCurrentPhase(nextConfig.phase);
      onPhaseChange?.(nextConfig.phase);

      if (nextConfig.sound) {
        onSound?.(nextConfig.sound);
      }

      return nextIndex;
    });
  }, [adjustedSequence, onPhaseChange, onSound]);

  // Start animation when enabled
  useEffect(() => {
    if (enabled && currentPhase === 'idle') {
      // Small delay before starting
      timerRef.current = setTimeout(() => {
        advancePhaseInternal();
      }, 300);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, currentPhase, advancePhaseInternal]);

  // Handle auto-advance
  useEffect(() => {
    if (!autoAdvance || isComplete || currentPhase === 'idle') return;
    if (isManualSkipRef.current) return;

    const currentConfig = adjustedSequence[phaseIndex];
    if (!currentConfig || currentConfig.duration === 0) return;

    timerRef.current = setTimeout(() => {
      advancePhaseInternal();
    }, currentConfig.duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentPhase, phaseIndex, autoAdvance, isComplete, adjustedSequence, advancePhaseInternal]);

  // Public advance (for manual control)
  const advancePhase = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    advancePhaseInternal();
  }, [advancePhaseInternal]);

  // Skip to end
  const skipToEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    isManualSkipRef.current = true;

    const endPhase = isTournament ? 'tournament-standings' : 'complete';
    const endIndex = adjustedSequence.findIndex(c => c.phase === endPhase);

    setPhaseIndex(endIndex >= 0 ? endIndex : adjustedSequence.length - 1);
    setCurrentPhase(endPhase);
    onPhaseChange?.(endPhase);
  }, [isTournament, adjustedSequence, onPhaseChange]);

  // Restart animation
  const restart = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    isManualSkipRef.current = false;
    setPhaseIndex(-1);
    setCurrentPhase('idle');

    // Start fresh
    timerRef.current = setTimeout(() => {
      advancePhaseInternal();
    }, 300);
  }, [advancePhaseInternal]);

  // Get visibility for a phase (visible if we've passed it)
  const getPhaseVisibility = useCallback((phase: AnimationPhase): boolean => {
    if (currentPhase === 'idle') return false;

    const targetIndex = adjustedSequence.findIndex(c => c.phase === phase);
    return targetIndex <= phaseIndex;
  }, [currentPhase, phaseIndex, adjustedSequence]);

  return {
    currentPhase,
    phaseIndex,
    isComplete,
    isAnimating,
    skipToEnd,
    advancePhase,
    restart,
    getPhaseVisibility,
  };
}

export default useTvResultsAnimation;
