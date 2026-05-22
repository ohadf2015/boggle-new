'use client';

import { useEffect, useRef } from 'react';
import { advanceKonami } from '@/utils/konamiSequence';

/**
 * Fires `onUnlock` when the user enters the Konami code on a physical keyboard.
 * Keystrokes inside text fields are ignored so it never interferes with typing
 * (room codes, chat, usernames). The matcher state lives in a ref, so changing
 * `onUnlock` between renders does not reset progress.
 */
export function useKonamiCode(onUnlock: () => void): void {
  const progressRef = useRef(0);
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const { progress, matched } = advanceKonami(progressRef.current, e.key);
      progressRef.current = progress;
      if (matched) onUnlockRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
