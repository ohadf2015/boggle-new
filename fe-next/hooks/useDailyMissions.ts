'use client';

/**
 * useDailyMissions Hook
 * Fetches daily missions status from Supabase REST for authenticated users.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export type MissionType = 'wordHunt' | 'brainDrill' | 'adventure' | 'community';

export interface Mission {
  type: MissionType;
  completed: boolean;
  href: string;
}

export interface UseDailyMissionsReturn {
  missions: Mission[];
  completedCount: number;
  isGrandSlam: boolean;
  grandSlamClaimed: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const MISSION_HREFS: Record<MissionType, string> = {
  wordHunt: '/daily',
  brainDrill: '/drill',
  adventure: '/adventure',
  community: '/community',
};

function buildMissions(data: {
  word_hunt_completed: boolean;
  brain_drill_completed: boolean;
  adventure_completed: boolean;
  community_completed: boolean;
} | null): Mission[] {
  const d = data || {
    word_hunt_completed: false,
    brain_drill_completed: false,
    adventure_completed: false,
    community_completed: false,
  };
  return [
    { type: 'wordHunt', completed: d.word_hunt_completed, href: MISSION_HREFS.wordHunt },
    { type: 'brainDrill', completed: d.brain_drill_completed, href: MISSION_HREFS.brainDrill },
    { type: 'adventure', completed: d.adventure_completed, href: MISSION_HREFS.adventure },
    { type: 'community', completed: d.community_completed, href: MISSION_HREFS.community },
  ];
}

export function useDailyMissions(): UseDailyMissionsReturn {
  const { user } = useAuth();
  const playerId = user?.id ?? null;
  const isMounted = useRef(true);

  const [missions, setMissions] = useState<Mission[]>(buildMissions(null));
  const [grandSlamClaimed, setGrandSlamClaimed] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMissions = useCallback(async () => {
    if (!playerId || !supabase) {
      setMissions(buildMissions(null));
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('player_daily_missions')
        .select('word_hunt_completed, brain_drill_completed, adventure_completed, community_completed, grand_slam_claimed')
        .eq('player_id', playerId)
        .eq('mission_date', today)
        .single();

      if (!isMounted.current) return;

      if (error && error.code === 'PGRST116') {
        // No row yet — all incomplete
        setMissions(buildMissions(null));
        setGrandSlamClaimed(false);
      } else if (error) {
        setMissions(buildMissions(null));
        setGrandSlamClaimed(false);
      } else {
        setMissions(buildMissions(data));
        setGrandSlamClaimed(data?.grand_slam_claimed ?? false);
      }
    } catch {
      if (isMounted.current) {
        setMissions(buildMissions(null));
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [playerId]);

  useEffect(() => {
    isMounted.current = true;
    setLoading(true);
    fetchMissions();

    // Re-fetch when user returns to the page (e.g., after completing a game)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isMounted.current) {
        fetchMissions();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted.current = false;
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchMissions]);

  const completedCount = missions.filter(m => m.completed).length;
  const isGrandSlam = completedCount === 4;

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchMissions();
  }, [fetchMissions]);

  return { missions, completedCount, isGrandSlam, grandSlamClaimed, loading, refresh };
}
