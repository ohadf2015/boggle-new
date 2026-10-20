'use client';

import { useCallback, useEffect, useRef } from 'react';
import { closeDailyTowerSession } from '@/lib/wordTowerV2/telemetry';
import {
  clearPagehideFinalizer,
  setPagehideFinalizer,
  updateActiveGameExtras,
} from '@/utils/abandonOnPagehide';

interface Args {
  daily: boolean;
  floors: number;
  peakM: number;
  /** Live standing height. `peakM` only updates when a run ends, so a daily
   * climb that is left mid-run would report heightM 0 without it. */
  heightM?: number;
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
 * SPA leave: the start hook's abandon is deferred a tick and re-checks the
 * active game, so the completion here cancels it.
 * pagehide: registered as the abandon handler's finalizer, because Chromium
 * runs `window` listeners in registration order (capture does not jump the
 * app-mount abandon listener). The own listener stays as a fallback.
 */
export function useDailyTowerLifecycle({ daily, floors, peakM, heightM = 0, score }: Args): void {
  const peakSeen = useRef(0);
  peakSeen.current = Math.max(peakSeen.current, peakM, heightM);
  const latest = useRef({ daily, floors, peakM: peakSeen.current, score });
  latest.current = { daily, floors, peakM: peakSeen.current, score };
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
    setPagehideFinalizer(onHide);
    return () => {
      window.removeEventListener('pagehide', onHide, true);
      clearPagehideFinalizer(onHide);
      close();
    };
  }, [daily, close]);
}
