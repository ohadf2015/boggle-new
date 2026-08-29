/**
 * useStreakFreeze - Manages streak freeze items for daily challenges
 * Freezes protect streaks when a day is missed (max 3)
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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

function syncFreezeToSupabase(userId: string, count: number): void {
  if (!supabase) return;
  supabase
    .from('profiles')
    .update({ streak_freeze_count: count })
    .eq('id', userId)
    .then(() => {}, () => {});
}

export function useStreakFreeze() {
  const [freezeCount, setFreezeCount] = useState<number>(() => loadFreezeData().count);
  const countRef = useRef(freezeCount);
  const { user, isAuthenticated } = useAuth();
  // Read the id once so the callbacks below close over a primitive. Depending on
  // `user?.id` while reading `user.id` makes the React Compiler infer the wider
  // `user` and refuse to preserve the memoization.
  const userId = user?.id;
  const hasSyncedRef = useRef(false);

  // Keep ref in sync
  countRef.current = freezeCount;

  // Fetch from Supabase on mount when authenticated
  useEffect(() => {
    if (!isAuthenticated || !userId || hasSyncedRef.current || !supabase) return;
    hasSyncedRef.current = true;

    supabase
      .from('profiles')
      .select('streak_freeze_count')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;
        const serverCount = data.streak_freeze_count ?? 0;
        saveFreezeData({ count: serverCount });
        setFreezeCount(serverCount);
        countRef.current = serverCount;
      }, () => {});
  }, [isAuthenticated, userId]);

  // Persistence runs here, not inside the setState updater: React may invoke an
  // updater more than once (StrictMode double-invoke, concurrent replay), which
  // duplicated the Supabase write. `countRef` mirrors the state and is advanced
  // synchronously, so back-to-back calls in one tick still compound correctly.
  const earnFreeze = useCallback(() => {
    const next = Math.min(countRef.current + 1, MAX_FREEZES);
    countRef.current = next;
    saveFreezeData({ count: next });
    if (isAuthenticated && userId) syncFreezeToSupabase(userId, next);
    setFreezeCount(next);
  }, [isAuthenticated, userId]);

  const consumeFreeze = useCallback((): boolean => {
    if (countRef.current <= 0) return false;
    const next = countRef.current - 1;
    countRef.current = next;
    saveFreezeData({ count: next });
    if (isAuthenticated && userId) syncFreezeToSupabase(userId, next);
    setFreezeCount(next);
    return true;
  }, [isAuthenticated, userId]);

  return { freezeCount, earnFreeze, consumeFreeze };
}

export { MAX_FREEZES, STORAGE_KEY };
