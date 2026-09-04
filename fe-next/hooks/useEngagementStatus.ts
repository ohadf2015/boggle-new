/**
 * useEngagementStatus Hook
 *
 * Provides streak, XP, gold, and level data for the persistent StreakBar.
 * Uses Supabase REST for fresh data with localStorage cache for instant render.
 * Refreshes on window focus/visibility change.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getXpForLevel } from '@/shared/utils/adventureXpUtils';

const CACHE_KEY = 'lexiclash_engagement_status';
const STREAK_RISK_HOURS = 6;

interface EngagementStatusData {
  streak: number;
  longestStreak: number;
  freezesAvailable: number;
  level: number;
  xp: number;
  xpProgress: number;
  xpToNextLevel: number;
  gold: number;
  gamesToday: number;
  streakAtRisk: boolean;
  loading: boolean;
}

const DEFAULTS: EngagementStatusData = {
  streak: 0,
  longestStreak: 0,
  freezesAvailable: 0,
  level: 1,
  xp: 0,
  xpProgress: 0,
  xpToNextLevel: 100,
  gold: 0,
  gamesToday: 0,
  streakAtRisk: false,
  loading: false,
};

function calculateStreakAtRisk(streak: number): boolean {
  if (streak <= 0) return false;
  const now = new Date(Date.now());
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const hoursUntilMidnight = (midnight.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilMidnight < STREAK_RISK_HOURS;
}

function calculateXpProgress(totalXp: number, level: number): number {
  const xpForCurrent = getXpForLevel(level);
  const xpForNext = getXpForLevel(level + 1);
  const range = xpForNext - xpForCurrent;
  if (range <= 0) return 1;
  return Math.min(1, Math.max(0, (totalXp - xpForCurrent) / range));
}

function getCachedStatus(): EngagementStatusData | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    // Recalculate dynamic fields
    return {
      ...parsed,
      streakAtRisk: calculateStreakAtRisk(parsed.streak),
      loading: false,
    };
  } catch {
    return null;
  }
}

function setCachedStatus(data: EngagementStatusData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

export function useEngagementStatus(): EngagementStatusData {
  const { user } = useAuth();
  const playerId = user?.id ?? null;
  const isMounted = useRef(true);
  const fetchingRef = useRef(false);

  const [status, setStatus] = useState<EngagementStatusData>(() => {
    if (!playerId) return DEFAULTS;
    const cached = getCachedStatus();
    return cached ?? { ...DEFAULTS, loading: true };
  });

  const fetchStatus = useCallback(async () => {
    if (!playerId || fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      if (!supabase) {
        if (isMounted.current) setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      // Fetch engagement + profile in parallel.
      //
      // `maybeSingle`, NOT `single`: `single()` makes PostgREST answer **406** when the row
      // does not exist, which is the normal state for a player who has not played yet — no
      // `player_engagement` row is written until their first game. Every such visitor threw
      // a 406 (49 sessions in one week, the 4th-noisiest error in session replay) for a case
      // the code below already handles: every read is `?? 0`, so a missing row is expected,
      // not exceptional. `maybeSingle()` returns `{ data: null, error: null }` instead.
      const [engagementRes, profileRes] = await Promise.all([
        supabase.from('player_engagement')
          .select('current_streak, longest_streak, streak_freezes_available, games_today')
          .eq('player_id', playerId).maybeSingle(),
        supabase.from('profiles')
          .select('total_xp, current_level, total_coins')
          .eq('id', playerId).maybeSingle(),
      ]);

      if (!isMounted.current) return;

      const engagement = engagementRes.data;
      const profile = profileRes.data;

      const streak = engagement?.current_streak ?? 0;
      const level = profile?.current_level ?? 1;
      const totalXp = profile?.total_xp ?? 0;

      const newStatus: EngagementStatusData = {
        streak,
        longestStreak: engagement?.longest_streak ?? 0,
        freezesAvailable: engagement?.streak_freezes_available ?? 0,
        level,
        xp: totalXp,
        xpProgress: calculateXpProgress(totalXp, level),
        xpToNextLevel: Math.max(0, getXpForLevel(level + 1) - totalXp),
        gold: profile?.total_coins ?? 0,
        gamesToday: engagement?.games_today ?? 0,
        streakAtRisk: calculateStreakAtRisk(streak),
        loading: false,
      };

      setStatus(newStatus);
      setCachedStatus(newStatus);
    } catch {
      // On error, stop loading but keep cached/default data
      if (isMounted.current) {
        setStatus(prev => ({ ...prev, loading: false }));
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [playerId]);

  // Initial fetch
  useEffect(() => {
    if (!playerId) {
      setStatus(DEFAULTS);
      return;
    }
    fetchStatus();
  }, [playerId, fetchStatus]);

  // Refresh on visibility change
  useEffect(() => {
    if (!playerId) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [playerId, fetchStatus]);

  // Cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  return status;
}
