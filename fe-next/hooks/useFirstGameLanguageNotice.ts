'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { isGameplayPath } from '@/lib/gameplayRoutes';
import type { Language } from '@/types';

/** localStorage flag — set the first time the notice is shown, ever. */
export const FIRST_GAME_LANG_NOTICE_KEY = 'boggle_first_game_lang_shown';

function readShown(): boolean {
  try {
    return localStorage.getItem(FIRST_GAME_LANG_NOTICE_KEY) === '1';
  } catch {
    return false;
  }
}

function markShown(): void {
  try {
    localStorage.setItem(FIRST_GAME_LANG_NOTICE_KEY, '1');
  } catch {
    // ignore (private mode etc.)
  }
}

/**
 * Drives the one-time "you're playing in <language>" notice. The first time a
 * player reaches an actual gameplay screen we emphasise which language the game
 * is in — important now that we silently route close-but-unshipped languages to
 * a neighbour (a Brazilian browser lands on Spanish); this is the visible signal
 * + the affordance to change it. Shows once ever, then never again.
 */
export function useFirstGameLanguageNotice(): {
  visible: boolean;
  language: Language;
  dismiss: () => void;
} {
  const { language } = useLanguageSafe();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (readShown()) return;
    if (!isGameplayPath(pathname)) return;
    // Mark immediately so a remount / route change can't show it twice.
    markShown();
    setVisible(true);
  }, [pathname]);

  const dismiss = useCallback(() => setVisible(false), []);

  return { visible, language, dismiss };
}
