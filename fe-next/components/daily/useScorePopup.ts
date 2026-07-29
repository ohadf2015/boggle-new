import { useState, useCallback, useRef } from 'react';

interface ScorePopupState {
  id: number;
  value: number;
  x: number;
  y: number;
  word?: string;
}

export function useScorePopup() {
  const [scorePopup, setScorePopup] = useState<ScorePopupState | null>(null);
  const popupIdRef = useRef(0);

  const triggerPopup = useCallback((value: number, word?: string) => {
    setScorePopup({
      id: ++popupIdRef.current,
      value,
      x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
      y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
      word,
    });
  }, []);

  const clearPopup = useCallback(() => setScorePopup(null), []);

  return { scorePopup, triggerPopup, clearPopup };
}
