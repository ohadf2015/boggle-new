import { useState, useEffect, useCallback, useRef } from 'react';

export function useTourPlayer(sceneDurations: number[], isDialogOpen: boolean) {
  const [currentScene, setCurrentScene] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Check for reduced motion preference
  const prefersReducedMotion = useCallback(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Main timer loop
  useEffect(() => {
    if (!isDialogOpen || isPaused || prefersReducedMotion()) {
      return;
    }

    const currentDuration = sceneDurations[currentScene - 1];
    if (currentDuration === 0) return; // Last scene doesn't auto-advance

    lastTimeRef.current = typeof window !== 'undefined' ? Date.now() : 0;
    let elapsedMs = 0;

    const tick = () => {
      elapsedMs = Date.now() - lastTimeRef.current;
      const pct = Math.min((elapsedMs / currentDuration) * 100, 100);
      setProgress(pct);

      if (elapsedMs >= currentDuration) {
        setCurrentScene((prev) => (prev < 5 ? prev + 1 : 5));
        setProgress(0);
      } else {
        timerRef.current = setTimeout(tick, 50);
      }
    };

    timerRef.current = setTimeout(tick, 50);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentScene, isDialogOpen, isPaused, sceneDurations, prefersReducedMotion]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const nextScene = useCallback(() => {
    if (currentScene < 5) {
      setCurrentScene((prev) => prev + 1);
      setProgress(0);
    }
  }, [currentScene]);

  const previousScene = useCallback(() => {
    if (currentScene > 1) {
      setCurrentScene((prev) => prev - 1);
      setProgress(0);
    }
  }, [currentScene]);

  const goToScene = useCallback((scene: number) => {
    if (scene >= 1 && scene <= 5) {
      setCurrentScene(scene);
      setProgress(0);
    }
  }, []);

  return {
    currentScene,
    isPaused,
    progress,
    togglePause,
    nextScene,
    previousScene,
    goToScene,
    cleanup,
  };
}
