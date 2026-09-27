import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'wordHuntPromoShown';
const MAX_SHOWS = 3;

/**
 * Tracks Word Hunt multiplayer promo impressions across the app.
 * Returns whether the promo should be shown and a function to record an impression.
 * Max 3 total impressions, shared across popup and banner.
 */
export function useWordHuntPromo() {
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const count = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    setCanShow(count < MAX_SHOWS);
  }, []);

  const recordImpression = useCallback(() => {
    if (typeof window === 'undefined') return;
    const count = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    localStorage.setItem(STORAGE_KEY, String(count + 1));
    if (count + 1 >= MAX_SHOWS) {
      setCanShow(false);
    }
  }, []);

  return { canShow, recordImpression };
}
