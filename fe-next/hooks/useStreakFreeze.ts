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
  const hasSyncedRef = useRef(false);

  // Keep ref in sync
  countRef.current = freezeCount;

  // Fetch from Supabase on mount when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.id || hasSyncedRef.current || !supabase) return;
    hasSyncedRef.current = true;

    supabase
      .from('profiles')
      .select('streak_freeze_count')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;
        const serverCount = data.streak_freeze_count ?? 0;
        saveFreezeData({ count: serverCount });
        setFreezeCount(serverCount);
        countRef.current = serverCount;
      }, () => {});
  }, [isAuthenticated, user?.id]);

  const earnFreeze = useCallback(() => {
    setFreezeCount((prev) => {
      const next = Math.min(prev + 1, MAX_FREEZES);
      saveFreezeData({ count: next });
      countRef.current = next;
      if (isAuthenticated && user?.id) syncFreezeToSupabase(user.id, next);
      return next;
    });
  }, [isAuthenticated, user?.id]);

  const consumeFreeze = useCallback((): boolean => {
    if (countRef.current <= 0) return false;
    setFreezeCount((prev) => {
      if (prev > 0) {
        const next = prev - 1;
        saveFreezeData({ count: next });
        countRef.current = next;
        if (isAuthenticated && user?.id) syncFreezeToSupabase(user.id, next);
        return next;
      }
      return prev;
    });
    return true;
  }, [isAuthenticated, user?.id]);

  return { freezeCount, earnFreeze, consumeFreeze };
}

export { MAX_FREEZES, STORAGE_KEY };
