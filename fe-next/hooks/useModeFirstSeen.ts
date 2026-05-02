'use client';

import { useCallback, useEffect, useState } from 'react';

export const MODE_INTRO_VERSION = 1;

export type IntroMode = 'classic' | 'blast' | 'wordHunt' | 'wheelRush';

const storageKey = (mode: IntroMode) => `lc_seen_mode_${mode}`;

function readSeen(mode: IntroMode): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const v = window.localStorage.getItem(storageKey(mode));
    return v !== null && Number(v) === MODE_INTRO_VERSION;
  } catch {
    return true;
  }
}

export function useModeFirstSeen(mode: IntroMode) {
  const [hasSeen, setHasSeen] = useState<boolean>(() => readSeen(mode));

  useEffect(() => {
    setHasSeen(readSeen(mode));
  }, [mode]);

  const markSeen = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey(mode), String(MODE_INTRO_VERSION));
    } catch {
      /* private mode / quota exceeded — ignore */
    }
    setHasSeen(true);
  }, [mode]);

  return { hasSeen, markSeen };
}
