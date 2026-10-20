'use client';

import { useCallback, useEffect, useRef } from 'react';
import { closeDailyTowerSession } from '@/lib/wordTowerV2/telemetry';
import { updateActiveGameExtras } from '@/utils/abandonOnPagehide';

interface Args {
  daily: boolean;
  floors: number;
  peakM: number;
  score: number;
}

/**
 * Daily Word Tower has no results screen: the tower saves as it grows, so a
 * normal leave was `game_abandoned` with `words_found` 0.
 *
 * On pagehide (also the moment the day's checkpoint flushes) or SPA unmount,
 * floors > 0 emits one `game_completed` via `trackGameEnd` — retention streak
 * credit, and `markGameInactive` so the generic abandon does not also fire.
 * floors == 0 leaves that abandon in place; `words_found` / `floors` are
 * patched onto it as the tower grows.
 *
 * Must be called after `useGameStartTelemetry`: React cleans effects up in
 * reverse order, so this unmount runs before that hook's SPA abandon.
 * pagehide is capture so it beats the bubble abandon listener.
 */
export function useDailyTowerLifecycle({ daily, floors, peakM, score }: Args): void {
  const latest = useRef({ daily, floors, peakM, score });
  latest.current = { daily, floors, peakM, score };
  const startedAt = useRef<number | null>(null);
  const closed = useRef(false);

  const close = useCallback(() => {
    const s = latest.current;
    if (!s.daily || closed.current || s.floors <= 0) return;
    closed.current = true;
    const durationSec =
      startedAt.current == null ? undefined : Math.round((Date.now() - startedAt.current) / 1000);
    closeDailyTowerSession({
      floors: s.floors,
      heightM: s.peakM,
      score: s.score,
      durationSec,
      daily: true,
    });
  }, []);

  useEffect(() => {
    if (!daily) return;
    if (startedAt.current == null) startedAt.current = Date.now();
    const n = Math.max(0, Math.floor(floors));
    updateActiveGameExtras({ words_found: n, floors: n });
  }, [daily, floors]);

  useEffect(() => {
    if (!daily) return;
    const onHide = () => close();
    window.addEventListener('pagehide', onHide, true);
    return () => {
      window.removeEventListener('pagehide', onHide, true);
      close();
    };
  }, [daily, close]);
}
