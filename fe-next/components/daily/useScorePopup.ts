import { useState, useCallback, useRef, type RefObject } from 'react';

interface ScorePopupState {
  id: number;
  value: number;
  x: number;
  y: number;
  word?: string;
}

interface UseScorePopupOptions {
  /** Element whose center should be used as the popup origin. Falls back to viewport center. */
  originRef?: RefObject<HTMLElement | null>;
}

export function useScorePopup(options?: UseScorePopupOptions) {
  const { originRef } = options ?? {};
  const [scorePopup, setScorePopup] = useState<ScorePopupState | null>(null);
  const popupIdRef = useRef(0);

  const triggerPopup = useCallback((value: number, word?: string) => {
    let x = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
    let y = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;

    const origin = originRef?.current;
    if (origin && typeof origin.getBoundingClientRect === 'function') {
      const rect = origin.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    setScorePopup({
      id: ++popupIdRef.current,
      value,
      x,
      y,
      word,
    });
  }, [originRef]);

  const clearPopup = useCallback(() => setScorePopup(null), []);

  return { scorePopup, triggerPopup, clearPopup };
}
