'use client';

/**
 * useDailyMissions Hook
 * Fetches daily missions status from Supabase REST for authenticated users.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

export type MissionType = 'wordHunt' | 'adventure' | 'community';

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
  adventure: '/adventure',
  community: '/multiplayer',
};

// XP reward per individual daily quest (mirrors DAILY_QUEST_CONFIGS in QuestHub)
const PER_QUEST_XP = 100;

function buildMissions(data: {
  word_hunt_completed: boolean;
  adventure_completed: boolean;
  community_completed: boolean;
} | null): Mission[] {
  const d = data || {
    word_hunt_completed: false,
    adventure_completed: false,
    community_completed: false,
  };
  return [
    { type: 'wordHunt', completed: d.word_hunt_completed, href: MISSION_HREFS.wordHunt },
    { type: 'adventure', completed: d.adventure_completed, href: MISSION_HREFS.adventure },
    { type: 'community', completed: d.community_completed, href: MISSION_HREFS.community },
  ];
}

export function useDailyMissions(): UseDailyMissionsReturn {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { playQuestCompleteSound } = useSoundEffects();
  const playerId = user?.id ?? null;
  const isMounted = useRef(true);
  const prevGrandSlamRef = useRef(false);
  const hasShownGrandSlamToast = useRef(false);

  const [missions, setMissions] = useState<Mission[]>(buildMissions(null));
  const [grandSlamClaimed, setGrandSlamClaimed] = useState(false);
  const [loading, setLoading] = useState(true);
  const prevMissionsMapRef = useRef<Record<MissionType, boolean> | null>(null);

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
        .select('word_hunt_completed, adventure_completed, community_completed, grand_slam_claimed')
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
  const isGrandSlam = completedCount === missions.length && missions.length > 0;

  // Fire per-quest celebration toast when an individual mission transitions false → true.
  // Skips the initial mount (prevMissionsMapRef is null) so pre-existing completions don't re-celebrate.
  useEffect(() => {
    if (loading) return;
    const currentMap: Record<MissionType, boolean> = {
      wordHunt: missions.find(m => m.type === 'wordHunt')?.completed ?? false,
      adventure: missions.find(m => m.type === 'adventure')?.completed ?? false,
      community: missions.find(m => m.type === 'community')?.completed ?? false,
    };

    const prev = prevMissionsMapRef.current;
    if (prev) {
      const newlyCompleted = (Object.keys(currentMap) as MissionType[]).filter(
        key => !prev[key] && currentMap[key],
      );
      if (newlyCompleted.length > 0) {
        import('@/components/quests/QuestCompletionToast').then(({ showQuestCompletionToast }) => {
          newlyCompleted.forEach((type, idx) => {
            // Stagger multiple toasts slightly so they don't stack on top of each other.
            setTimeout(() => {
              showQuestCompletionToast({
                questName: t(`dailyMissions.${type}`),
                xpReward: PER_QUEST_XP,
                t,
                onComplete: idx === 0 ? playQuestCompleteSound : undefined,
              });
            }, idx * 400);
          });
        });
      }
    }
    prevMissionsMapRef.current = currentMap;
  }, [missions, loading, t, playQuestCompleteSound]);

  // Show Grand Slam celebration toast when all missions are completed
  useEffect(() => {
    if (isGrandSlam && !prevGrandSlamRef.current && !loading && !hasShownGrandSlamToast.current) {
      hasShownGrandSlamToast.current = true;
      import('@/components/quests/QuestCompletionToast').then(({ showQuestCompletionToast }) => {
        showQuestCompletionToast({
          questName: '',
          xpReward: 500,
          isGrandSlam: true,
          t,
          onComplete: playQuestCompleteSound,
        });
      });
    }
    prevGrandSlamRef.current = isGrandSlam;
  }, [isGrandSlam, loading, t, playQuestCompleteSound]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchMissions();
  }, [fetchMissions]);

  return { missions, completedCount, isGrandSlam, grandSlamClaimed, loading, refresh };
}
