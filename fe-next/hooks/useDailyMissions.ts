'use client';

/**
 * useDailyMissions Hook
 * Fetches daily missions status from Supabase REST for authenticated users.
 *
 * Toast dedup is server-authoritative: per-mission "celebrated" flags live on
 * the player_daily_missions row. When a mission is completed but not yet
 * celebrated, we POST /api/daily-missions/celebrate which conditionally
 * flips the flag and reports whether this call was the transition. Only that
 * caller shows the toast — so Capacitor webview + browser agree on which
 * completions have been seen, and navigating back to the page doesn't re-fire.
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

type CelebrationKey = 'word_hunt' | 'adventure' | 'community' | 'grand_slam';

const MISSION_TO_CELEBRATION: Record<MissionType, CelebrationKey> = {
  wordHunt: 'word_hunt',
  adventure: 'adventure',
  community: 'community',
};

interface MissionRow {
  word_hunt_completed: boolean;
  adventure_completed: boolean;
  community_completed: boolean;
  grand_slam_claimed?: boolean;
  word_hunt_celebrated?: boolean | null;
  adventure_celebrated?: boolean | null;
  community_celebrated?: boolean | null;
  grand_slam_celebrated?: boolean | null;
}

function buildMissions(data: MissionRow | null): Mission[] {
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

async function requestCelebration(key: CelebrationKey): Promise<boolean> {
  try {
    const res = await fetch('/api/daily-missions/celebrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    return Boolean(json?.newlyCelebrated);
  } catch {
    return false;
  }
}

export function useDailyMissions(): UseDailyMissionsReturn {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { playQuestCompleteSound } = useSoundEffects();
  const playerId = user?.id ?? null;
  const isMounted = useRef(true);

  const [missions, setMissions] = useState<Mission[]>(buildMissions(null));
  const [grandSlamClaimed, setGrandSlamClaimed] = useState(false);
  const [loading, setLoading] = useState(true);
  // Celebrated flags from server — used to gate which transitions require a
  // POST. Completed-but-already-celebrated missions never fire a toast.
  const celebratedRef = useRef<Record<CelebrationKey, boolean>>({
    word_hunt: false,
    adventure: false,
    community: false,
    grand_slam: false,
  });
  // Last seen completion state — to detect false→true transitions between
  // fetches (completing a game in another tab, for example).
  const prevMissionsMapRef = useRef<Record<MissionType, boolean> | null>(null);
  const prevGrandSlamRef = useRef<boolean>(false);
  // Guard against concurrent POSTs for the same key within one session.
  const inFlightRef = useRef<Set<CelebrationKey>>(new Set());

  const tryCelebrate = useCallback(
    async (
      key: CelebrationKey,
      show: (newlyCelebrated: true) => void,
    ) => {
      if (celebratedRef.current[key]) return;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      const newlyCelebrated = await requestCelebration(key);
      inFlightRef.current.delete(key);
      if (!isMounted.current) return;
      celebratedRef.current[key] = true; // either we flipped it, or it was already true
      if (newlyCelebrated) show(true);
    },
    [],
  );

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
        .select(
          'word_hunt_completed, adventure_completed, community_completed, grand_slam_claimed, word_hunt_celebrated, adventure_celebrated, community_celebrated, grand_slam_celebrated',
        )
        .eq('player_id', playerId)
        .eq('mission_date', today)
        .maybeSingle();

      if (!isMounted.current) return;

      if (error || !data) {
        setMissions(buildMissions(null));
        setGrandSlamClaimed(false);
        celebratedRef.current = {
          word_hunt: false,
          adventure: false,
          community: false,
          grand_slam: false,
        };
      } else {
        setMissions(buildMissions(data as MissionRow));
        setGrandSlamClaimed(data.grand_slam_claimed ?? false);
        celebratedRef.current = {
          word_hunt: Boolean(data.word_hunt_celebrated),
          adventure: Boolean(data.adventure_celebrated),
          community: Boolean(data.community_celebrated),
          grand_slam: Boolean(data.grand_slam_celebrated),
        };
      }
    } catch {
      if (isMounted.current) setMissions(buildMissions(null));
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    isMounted.current = true;
    setLoading(true);
    fetchMissions();

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

  // On every missions change: for any mission that is completed but not yet
  // celebrated server-side, POST to /api/daily-missions/celebrate. Only the
  // caller that server reports as "newlyCelebrated" shows the toast — which
  // means a single mission fires exactly once per day across devices.
  useEffect(() => {
    if (loading) return;
    const currentMap: Record<MissionType, boolean> = {
      wordHunt: missions.find(m => m.type === 'wordHunt')?.completed ?? false,
      adventure: missions.find(m => m.type === 'adventure')?.completed ?? false,
      community: missions.find(m => m.type === 'community')?.completed ?? false,
    };

    const keys: MissionType[] = ['wordHunt', 'adventure', 'community'];
    for (const type of keys) {
      if (!currentMap[type]) continue;
      const celebrationKey = MISSION_TO_CELEBRATION[type];
      if (celebratedRef.current[celebrationKey]) continue;
      void tryCelebrate(celebrationKey, () => {
        import('@/components/quests/QuestCompletionToast').then(({ showQuestCompletionToast }) => {
          showQuestCompletionToast({
            questName: t(`dailyMissions.${type}`),
            xpReward: PER_QUEST_XP,
            dedupKey: `mission:${celebrationKey}`,
            t,
            onComplete: playQuestCompleteSound,
          });
        });
      });
    }
    prevMissionsMapRef.current = currentMap;
  }, [missions, loading, t, playQuestCompleteSound, tryCelebrate]);

  // Grand Slam: fire once when all three complete, gated by server celebrated
  // flag so a second device (or returning to the page) doesn't re-show it.
  useEffect(() => {
    if (loading) return;
    if (!isGrandSlam) {
      prevGrandSlamRef.current = false;
      return;
    }
    if (celebratedRef.current.grand_slam) {
      prevGrandSlamRef.current = true;
      return;
    }
    void tryCelebrate('grand_slam', () => {
      import('@/components/quests/QuestCompletionToast').then(({ showQuestCompletionToast }) => {
        showQuestCompletionToast({
          questName: '',
          xpReward: 500,
          isGrandSlam: true,
          dedupKey: 'mission:grand_slam',
          t,
          onComplete: playQuestCompleteSound,
        });
      });
    });
    prevGrandSlamRef.current = true;
  }, [isGrandSlam, loading, t, playQuestCompleteSound, tryCelebrate]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchMissions();
  }, [fetchMissions]);

  return { missions, completedCount, isGrandSlam, grandSlamClaimed, loading, refresh };
}
