'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { type AvatarMood, MOOD_DURATION_MS } from '@/lib/avatar/avatarMood';

export interface UseAvatarMoodResult {
  mood: AvatarMood;
  /**
   * Set the avatar's mood. Transient moods (correct/wrong/win/…) auto-clear back
   * to idle after their default lifetime; state moods (thinking/afk, duration 0)
   * persist until changed. Pass `durationMs` to override.
   */
  trigger: (mood: AvatarMood, durationMs?: number) => void;
  /** Force back to idle immediately. */
  reset: () => void;
}

/**
 * Transient avatar-mood state for a single avatar. Owns the auto-clear timer and
 * cleans it up on unmount. Drive `trigger` from game events (word submitted,
 * streak hit, round result) and feed `mood` into <Avatar mood={...} />.
 */
export function useAvatarMood(initial: AvatarMood = 'idle'): UseAvatarMoodResult {
  const [mood, setMood] = useState<AvatarMood>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const trigger = useCallback(
    (next: AvatarMood, durationMs?: number) => {
      clearTimer();
      setMood(next);
      const duration = durationMs ?? MOOD_DURATION_MS[next];
      if (duration > 0 && next !== 'idle') {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          setMood('idle');
        }, duration);
      }
    },
    [clearTimer],
  );

  const reset = useCallback(() => {
    clearTimer();
    setMood('idle');
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { mood, trigger, reset };
}
