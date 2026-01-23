/**
 * Tutorial and Cutscene State Hooks
 *
 * Hooks for tracking viewed state of cutscenes (tutorial, level intros, world transitions).
 * Persists state to localStorage to prevent replays on subsequent visits.
 *
 * Features:
 * - SSR-safe (no localStorage access during hydration)
 * - Memoized callbacks with useCallback
 * - Type-safe exports
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ==============================================
// STORAGE KEYS
// ==============================================

const STORAGE_KEYS = {
  TUTORIAL_VIEWED: 'lexiclash:tutorial:viewed',
  WORLD_INTRO_VIEWED: 'lexiclash:world-intro:viewed',
  WORLD_TRANSITION_VIEWED: 'lexiclash:world-transition:viewed',
} as const;

// ==============================================
// TYPES
// ==============================================

export interface TutorialState {
  /** Whether the tutorial has been viewed */
  hasViewedTutorial: boolean;
  /** Mark the tutorial as viewed */
  markTutorialViewed: () => void;
}

export interface WorldIntroState {
  /** Whether the intro for this world has been viewed */
  hasViewedIntro: boolean;
  /** Mark the world intro as viewed */
  markIntroViewed: () => void;
}

export interface WorldTransitionState {
  /** Whether the transition between these worlds has been viewed */
  hasViewedTransition: boolean;
  /** Mark the world transition as viewed */
  markTransitionViewed: () => void;
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Safely get item from localStorage (returns null during SSR)
 */
function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely set item in localStorage (no-op during SSR)
 */
function safeSetItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Get array from localStorage JSON
 */
function getStoredArray(key: string): string[] {
  const stored = safeGetItem(key);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Add item to stored array and save
 */
function addToStoredArray(key: string, item: string): void {
  const arr = getStoredArray(key);
  if (!arr.includes(item)) {
    arr.push(item);
    safeSetItem(key, JSON.stringify(arr));
  }
}

// ==============================================
// HOOKS
// ==============================================

/**
 * Hook for tracking tutorial viewed state
 *
 * @returns Tutorial state with hasViewedTutorial and markTutorialViewed
 *
 * @example
 * const { hasViewedTutorial, markTutorialViewed } = useTutorialState();
 * if (!hasViewedTutorial) {
 *   showTutorial();
 *   markTutorialViewed();
 * }
 */
export function useTutorialState(): TutorialState {
  const [hasViewedTutorial, setHasViewedTutorial] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Read from localStorage on client-side mount
  useEffect(() => {
    const viewed = safeGetItem(STORAGE_KEYS.TUTORIAL_VIEWED) === 'true';
    setHasViewedTutorial(viewed);
    setIsHydrated(true);
  }, []);

  const markTutorialViewed = useCallback(() => {
    safeSetItem(STORAGE_KEYS.TUTORIAL_VIEWED, 'true');
    setHasViewedTutorial(true);
  }, []);

  // During SSR/hydration, return false to avoid mismatch
  return {
    hasViewedTutorial: isHydrated ? hasViewedTutorial : false,
    markTutorialViewed,
  };
}

/**
 * Hook for tracking world intro viewed state
 *
 * @param worldId - The world ID to check/mark (e.g., 'meadows', 'springs', 'caverns')
 * @returns World intro state with hasViewedIntro and markIntroViewed
 *
 * @example
 * const { hasViewedIntro, markIntroViewed } = useWorldIntroState('meadows');
 * if (!hasViewedIntro) {
 *   showWorldIntro();
 *   markIntroViewed();
 * }
 */
export function useWorldIntroState(worldId: string): WorldIntroState {
  const [hasViewedIntro, setHasViewedIntro] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Read from localStorage on client-side mount
  useEffect(() => {
    const viewedWorlds = getStoredArray(STORAGE_KEYS.WORLD_INTRO_VIEWED);
    setHasViewedIntro(viewedWorlds.includes(worldId));
    setIsHydrated(true);
  }, [worldId]);

  const markIntroViewed = useCallback(() => {
    addToStoredArray(STORAGE_KEYS.WORLD_INTRO_VIEWED, worldId);
    setHasViewedIntro(true);
  }, [worldId]);

  // During SSR/hydration, return false to avoid mismatch
  return {
    hasViewedIntro: isHydrated ? hasViewedIntro : false,
    markIntroViewed,
  };
}

/**
 * Hook for tracking world transition viewed state
 *
 * @param fromWorldId - The source world ID (e.g., 'meadows')
 * @param toWorldId - The destination world ID (e.g., 'springs')
 * @returns World transition state with hasViewedTransition and markTransitionViewed
 *
 * @example
 * const { hasViewedTransition, markTransitionViewed } = useWorldTransitionState('meadows', 'springs');
 * if (!hasViewedTransition) {
 *   showTransition();
 *   markTransitionViewed();
 * }
 */
export function useWorldTransitionState(
  fromWorldId: string,
  toWorldId: string
): WorldTransitionState {
  const [hasViewedTransition, setHasViewedTransition] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Create transition key (e.g., "meadows->springs")
  const transitionKey = `${fromWorldId}->${toWorldId}`;

  // Read from localStorage on client-side mount
  useEffect(() => {
    const viewedTransitions = getStoredArray(STORAGE_KEYS.WORLD_TRANSITION_VIEWED);
    setHasViewedTransition(viewedTransitions.includes(transitionKey));
    setIsHydrated(true);
  }, [transitionKey]);

  const markTransitionViewed = useCallback(() => {
    addToStoredArray(STORAGE_KEYS.WORLD_TRANSITION_VIEWED, transitionKey);
    setHasViewedTransition(true);
  }, [transitionKey]);

  // During SSR/hydration, return false to avoid mismatch
  return {
    hasViewedTransition: isHydrated ? hasViewedTransition : false,
    markTransitionViewed,
  };
}

// ==============================================
// UTILITY EXPORTS
// ==============================================

/**
 * Clear all cutscene viewed state (useful for testing/development)
 */
export function clearAllCutsceneState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.TUTORIAL_VIEWED);
    localStorage.removeItem(STORAGE_KEYS.WORLD_INTRO_VIEWED);
    localStorage.removeItem(STORAGE_KEYS.WORLD_TRANSITION_VIEWED);
  } catch {
    // Silently fail
  }
}

/**
 * Storage keys for external access (e.g., DevTools clearing)
 */
export const CUTSCENE_STORAGE_KEYS = STORAGE_KEYS;
