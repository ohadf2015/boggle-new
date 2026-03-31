/**
 * useStreakFreeze - Manages streak freeze items for daily challenges
 * Freezes protect streaks when a day is missed (max 3)
 */
import { useState, useCallback, useRef } from 'react';

const STORAGE_KEY = 'lexiclash_streak_freezes';
const MAX_FREEZES = 3;

interface StreakFreezeData {
  count: number;
}

function loadFreezeData(): StreakFreezeData {
  if (typeof window === 'undefined') return { count: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { count: Math.min(parsed.count ?? 0, MAX_FREEZES) };
    }
  } catch {
    // ignore
  }
  return { count: 0 };
}

function saveFreezeData(data: StreakFreezeData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useStreakFreeze() {
  const [freezeCount, setFreezeCount] = useState<number>(() => loadFreezeData().count);
  const countRef = useRef(freezeCount);

  // Keep ref in sync
  countRef.current = freezeCount;

  const earnFreeze = useCallback(() => {
    setFreezeCount((prev) => {
      const next = Math.min(prev + 1, MAX_FREEZES);
      saveFreezeData({ count: next });
      countRef.current = next;
      return next;
    });
  }, []);

  const consumeFreeze = useCallback((): boolean => {
    if (countRef.current <= 0) return false;
    setFreezeCount((prev) => {
      if (prev > 0) {
        const next = prev - 1;
        saveFreezeData({ count: next });
        countRef.current = next;
        return next;
      }
      return prev;
    });
    return true;
  }, []);

  return { freezeCount, earnFreeze, consumeFreeze };
}

export { MAX_FREEZES, STORAGE_KEY };
