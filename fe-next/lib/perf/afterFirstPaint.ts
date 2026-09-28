'use client';

import { useEffect, useState } from 'react';
import { isHeavyGamePath } from '@/lib/perf/heavyGamePath';

/**
 * Fullscreen game routes must not parse Auth/Music/Query/PostHog (or site
 * chrome) before first paint. Marketing routes keep the current eager boot.
 */
export function shouldMountHeavyClientBoot(
  pathname: string | null | undefined,
  afterFirstPaint: boolean,
): boolean {
  if (!isHeavyGamePath(pathname)) return true;
  return afterFirstPaint;
}

/**
 * @param defer when true, stays false until two chained rAFs (after first paint).
 *              when false, ready immediately (marketing routes).
 */
export function useAfterFirstPaint(defer: boolean): boolean {
  const [ready, setReady] = useState(!defer);

  useEffect(() => {
    if (!defer) {
      setReady(true);
      return undefined;
    }
    // Never drop the boot again after it has mounted — unmounting MusicProvider
    // on a client nav into a game route duplicates audio.
    if (ready) return undefined;
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setReady(true));
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, [defer, ready]);

  return ready;
}
