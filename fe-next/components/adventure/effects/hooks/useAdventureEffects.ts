/**
 * useAdventureEffects Hook
 *
 * Composite hook that manages all visual effects state for adventure mode.
 * Consolidates effects-related hooks to reduce complexity in main component.
 *
 * Combines:
 * - Screen shake
 * - Particle budget
 * - Lexi reactions
 * - Score popups
 * - Explosions
 * - Particle effects
 * - Chain bursts
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useScreenShake } from '@/hooks/useScreenShake';
import { useParticleBudget } from '@/hooks/useParticleBudget';
import { useLexiReactions, type GameStateForReactions, type LexiReaction } from '@/hooks/useLexiReactions';
import type {
  ScorePopupData,
  PendingExplosion,
  ChainBurstConfig,
  ParticleConfig,
} from '../AdventureEffectsLayer';

export interface UseAdventureEffectsProps {
  /** Game state for Lexi reactions */
  gameStateForReactions: {
    gameState: GameStateForReactions;
    isPlaying: boolean;
  };
}

export interface UseAdventureEffectsReturn {
  // Screen shake
  shakeRef: React.RefObject<HTMLDivElement | null>;
  shake: (intensity?: number) => void;

  // Particle budget
  particleBudget: ReturnType<typeof useParticleBudget>;

  // Lexi reactions
  reaction: LexiReaction | null;
  dismissReaction: () => void;

  // Score popups
  popupQueue: ScorePopupData[];
  currentPopup: ScorePopupData | null;
  addScorePopup: (popup: ScorePopupData) => void;
  handlePopupComplete: () => void;
  scoreDisplayRef: React.RefObject<HTMLDivElement | null>;

  // Explosions
  pendingExplosions: PendingExplosion[];
  addExplosion: (explosion: PendingExplosion) => void;
  removeExplosion: (explosionId: number) => void;

  // Chain bursts
  chainBurstConfig: ChainBurstConfig | null;
  setChainBurstConfig: (config: ChainBurstConfig | null) => void;

  // Adaptive particles
  particleConfig: ParticleConfig | null;
  setParticleConfig: (config: ParticleConfig | null) => void;
}

/**
 * Custom hook to manage all adventure mode visual effects.
 *
 * This hook consolidates multiple effects-related hooks and state
 * into a single, manageable interface. It reduces the number of
 * hooks in the main AdventureGame component from 42+ to a more
 * reasonable number.
 *
 * @param props - Configuration for effects
 * @returns Effects state and control functions
 *
 * @example
 * ```tsx
 * const effects = useAdventureEffects({
 *   gameStateForReactions: {
 *     score,
 *     combo,
 *     clearedCount,
 *     // ...
 *   },
 * });
 *
 * // Use in render:
 * <div ref={effects.shakeRef}>
 *   <AdventureEffectsLayer
 *     currentPopup={effects.currentPopup}
 *     reaction={effects.reaction}
 *     // ...
 *   />
 * </div>
 * ```
 */
export function useAdventureEffects({
  gameStateForReactions,
}: UseAdventureEffectsProps): UseAdventureEffectsReturn {
  // Screen shake effect
  const { shakeRef, shake } = useScreenShake();

  // Particle budget management
  const particleBudget = useParticleBudget();

  // Lexi reactions
  const { reaction, dismissReaction } = useLexiReactions({
    gameState: gameStateForReactions.gameState,
    isPlaying: gameStateForReactions.isPlaying,
  });

  // Score popup queue
  const [popupQueue, setPopupQueue] = useState<ScorePopupData[]>([]);
  const [currentPopup, setCurrentPopup] = useState<ScorePopupData | null>(null);
  const scoreDisplayRef = useRef<HTMLDivElement>(null);

  const addScorePopup = useCallback((popup: ScorePopupData) => {
    setPopupQueue((prev) => [...prev, popup]);
  }, []);

  const handlePopupComplete = useCallback(() => {
    setCurrentPopup(null);
    setPopupQueue((prev) => {
      const [, ...rest] = prev;
      if (rest.length > 0) {
        setCurrentPopup(rest[0]);
      }
      return rest;
    });
  }, []);

  // Start first popup when queue changes
  useEffect(() => {
    if (popupQueue.length > 0 && !currentPopup) {
      setCurrentPopup(popupQueue[0]);
    }
  }, [popupQueue, currentPopup]);

  // Explosion effects
  const [pendingExplosions, setPendingExplosions] = useState<PendingExplosion[]>([]);

  const addExplosion = useCallback((explosion: PendingExplosion) => {
    setPendingExplosions((prev) => [...prev, explosion]);
  }, []);

  const removeExplosion = useCallback((explosionId: number) => {
    setPendingExplosions((prev) => prev.filter((e) => e.id !== explosionId));
  }, []);

  // Chain particle burst
  const [chainBurstConfig, setChainBurstConfig] = useState<ChainBurstConfig | null>(null);

  // Adaptive particles
  const [particleConfig, setParticleConfig] = useState<ParticleConfig | null>(null);

  return {
    // Screen shake
    shakeRef,
    shake,

    // Particle budget
    particleBudget,

    // Lexi reactions
    reaction,
    dismissReaction,

    // Score popups
    popupQueue,
    currentPopup,
    addScorePopup,
    handlePopupComplete,
    scoreDisplayRef,

    // Explosions
    pendingExplosions,
    addExplosion,
    removeExplosion,

    // Chain bursts
    chainBurstConfig,
    setChainBurstConfig,

    // Adaptive particles
    particleConfig,
    setParticleConfig,
  };
}
