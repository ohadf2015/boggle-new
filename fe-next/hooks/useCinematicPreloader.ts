/**
 * useCinematicPreloader Hook
 *
 * Preloads Remotion cinematic components to prevent black screen issues.
 * Uses requestIdleCallback for non-critical preloading.
 *
 * Usage:
 *   const { isPreloaded, preload, error } = useCinematicPreloader();
 *
 *   // Preload before showing cinematic
 *   useEffect(() => {
 *     preload(['VictoryCinematic', 'DefeatCinematic']);
 *   }, []);
 *
 *   // Show cinematic only when ready
 *   {isPreloaded && <CinematicPlayer ... />}
 */

import { useCallback, useRef, useState, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

export type CinematicType = 'VictoryCinematic' | 'DefeatCinematic' | 'BossEntranceCinematic';

interface PreloadState {
  /** Whether cinematics have been preloaded */
  isPreloaded: boolean;
  /** Preload specific cinematics */
  preload: (cinematics: CinematicType[]) => Promise<void>;
  /** Any error that occurred during preloading */
  error: Error | null;
  /** Loading state for individual cinematics */
  loadingStates: Record<string, boolean>;
}

// ============================================
// CONSTANTS
// ============================================

/** Cinematics that can be preloaded */
const CINEMATIC_MODULES: Record<CinematicType, () => Promise<unknown>> = {
  VictoryCinematic: () => import('@/components/adventure/cinematics/VictoryCinematic'),
  DefeatCinematic: () => import('@/components/adventure/cinematics/DefeatCinematic'),
  BossEntranceCinematic: () => import('@/components/adventure/boss/cinematics/BossEntranceCinematic'),
};

/** Delay before starting preload (ms) */
const PRELOAD_DELAY = 100;

// ============================================
// HOOK
// ============================================

export function useCinematicPreloader(): PreloadState {
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const preloadedRef = useRef<Set<string>>(new Set());
  const isPreloadingRef = useRef(false);

  /**
   * Preload specified cinematics
   */
  const preload = useCallback(async (cinematics: CinematicType[]): Promise<void> => {
    // Prevent concurrent preloads
    if (isPreloadingRef.current) {
      return;
    }

    isPreloadingRef.current = true;
    setError(null);

    try {
      // Filter out already preloaded cinematics
      const toPreload = cinematics.filter(
        (c) => !preloadedRef.current.has(c)
      );

      if (toPreload.length === 0) {
        setIsPreloaded(true);
        isPreloadingRef.current = false;
        return;
      }

      // Mark as loading
      const newLoadingStates: Record<string, boolean> = {};
      toPreload.forEach((c) => {
        newLoadingStates[c] = true;
      });
      setLoadingStates((prev) => ({ ...prev, ...newLoadingStates }));

      // Preload each cinematic
      const preloadPromises = toPreload.map(async (cinematic) => {
        try {
          const loader = CINEMATIC_MODULES[cinematic];
          if (loader) {
            await loader();
            preloadedRef.current.add(cinematic);
          }
        } catch (err) {
          console.warn(`Failed to preload ${cinematic}:`, err);
          // Don't throw - preloading is best-effort
        } finally {
          setLoadingStates((prev) => ({ ...prev, [cinematic]: false }));
        }
      });

      await Promise.all(preloadPromises);
      setIsPreloaded(true);
    } catch (err) {
      const preloadError = err instanceof Error ? err : new Error('Preload failed');
      setError(preloadError);
      console.error('Cinematic preloading error:', preloadError);
    } finally {
      isPreloadingRef.current = false;
    }
  }, []);

  return {
    isPreloaded,
    preload,
    error,
    loadingStates,
  };
}

// ============================================
// AUTO-PRELOAD HOOK
// ============================================

/**
 * Hook that automatically preloads cinematics after initial render
 * Uses requestIdleCallback for non-critical loading
 */
export function useAutoPreloadCinematics(
  cinematics: CinematicType[] = ['VictoryCinematic', 'DefeatCinematic'],
  delay: number = PRELOAD_DELAY
): Pick<PreloadState, 'isPreloaded' | 'error'> {
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const doPreload = async () => {
      // Wait for delay
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (cancelled) return;

      // Use requestIdleCallback if available, otherwise setImmediate
      const scheduleWork =
        typeof window !== 'undefined' && 'requestIdleCallback' in window
          ? window.requestIdleCallback
          : (cb: () => void) => setTimeout(cb, 1);

      scheduleWork(async () => {
        if (cancelled) return;

        try {
          const preloadPromises = cinematics.map(async (cinematic) => {
            const loader = CINEMATIC_MODULES[cinematic];
            if (loader) {
              await loader().catch(() => {
                // Preloading is best-effort, ignore errors
              });
            }
          });

          await Promise.all(preloadPromises);

          if (!cancelled) {
            setIsPreloaded(true);
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err : new Error('Auto-preload failed'));
          }
        }
      });
    };

    doPreload();

    return () => {
      cancelled = true;
    };
  }, [cinematics, delay]);

  return { isPreloaded, error };
}

export default useCinematicPreloader;
