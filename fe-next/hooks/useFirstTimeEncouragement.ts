'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type EncouragementTrigger =
  | 'game-start'
  | 'first-word'
  | 'long-word'
  | 'combo'
  | 'halfway'
  | 'almost-done';

const GAMES_PLAYED_KEY = 'lexiclash_games_played';
const FIRST_TIME_THRESHOLD = 3;
const RATE_LIMIT_MS = 15_000;
const AUTO_DISMISS_MS = 2_500;

export interface UseFirstTimeEncouragementReturn {
  currentTrigger: EncouragementTrigger | null;
  triggerEncouragement: (trigger: EncouragementTrigger) => void;
  dismiss: () => void;
  isFirstTimePlayer: boolean;
}

export function useFirstTimeEncouragement(): UseFirstTimeEncouragementReturn {
  const [currentTrigger, setCurrentTrigger] = useState<EncouragementTrigger | null>(null);
  const lastShownRef = useRef(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isFirstTimePlayer = typeof window !== 'undefined'
    ? (parseInt(localStorage.getItem(GAMES_PLAYED_KEY) || '0', 10) < FIRST_TIME_THRESHOLD)
    : false;

  const dismiss = useCallback(() => {
    setCurrentTrigger(null);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  const triggerEncouragement = useCallback((trigger: EncouragementTrigger) => {
    if (!isFirstTimePlayer) return;
    const now = Date.now();
    if (now - lastShownRef.current < RATE_LIMIT_MS) return;

    lastShownRef.current = now;
    setCurrentTrigger(trigger);

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setCurrentTrigger(null), AUTO_DISMISS_MS);
  }, [isFirstTimePlayer]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  return { currentTrigger, triggerEncouragement, dismiss, isFirstTimePlayer };
}
