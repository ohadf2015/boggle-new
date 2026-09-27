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
 *
 * DB columns word_hunt/adventure/community_completed are SLOT containers (0/1/2).
 * getDailyQuests() determines which condition-based quest fills each slot per day.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { emitCoinEarned } from '@/utils/coinEarnedFx';
import {
  getDailyQuests,
  type DailyQuest,
  type QuestConditionType,
  type QuestFamily,
} from '@/shared/dailyQuestPool';

export interface Mission {
  slot: number;
  questId: string;
  type: QuestConditionType;
  family: QuestFamily;
  target: number;
  titleKey: string;
  descKey: string;
  icon: string;
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

// XP reward per individual daily quest (mirrors DAILY_QUEST_CONFIGS in QuestHub)
const PER_QUEST_XP = 100;

// Slot 0 → word_hunt, slot 1 → adventure, slot 2 → community (DB column prefixes)
const SLOT_COLUMNS = [
  'word_hunt_completed',
  'adventure_completed',
  'community_completed',
] as const;
const SLOT_CELEBRATION_KEYS = ['word_hunt', 'adventure', 'community'] as const;

type CelebrationKey = 'word_hunt' | 'adventure' | 'community' | 'grand_slam';

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
  const quests = getDailyQuests();
  const d = data ?? {
    word_hunt_completed: false,
    adventure_completed: false,
    community_completed: false,
  };
  return quests.map((quest: DailyQuest, i) => ({
    slot: i,
    questId: quest.id,
    type: quest.type,
    family: quest.family,
    target: quest.target,
    titleKey: quest.titleKey,
    descKey: quest.descKey,
    icon: quest.icon,
    completed: d[SLOT_COLUMNS[i]],
    href: quest.href,
  }));
}

async function requestCelebration(key: CelebrationKey): Promise<{ ok: boolean; newlyCelebrated: boolean }> {
  try {
    const res = await fetch('/api/daily-missions/celebrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    if (!res.ok) return { ok: false, newlyCelebrated: false };
    const json = await res.json();
    return { ok: true, newlyCelebrated: Boolean(json?.newlyCelebrated) };
  } catch {
    return { ok: false, newlyCelebrated: false };
  }
}

export function useDailyMissions(): UseDailyMissionsReturn {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { playQuestCompleteSound } = useSoundEffects();
  const playerId = user?.id ?? null;
  const pathname = usePathname();
  const isMounted = useRef(true);
  const didMountRef = useRef(false);

  const [missions, setMissions] = useState<Mission[]>(buildMissions(null));
  const [grandSlamClaimed, setGrandSlamClaimed] = useState(false);
  const [loading, setLoading] = useState(true);
  const celebratedRef = useRef<Record<CelebrationKey, boolean>>({
    word_hunt: false,
    adventure: false,
    community: false,
    grand_slam: false,
  });
  const prevGrandSlamRef = useRef<boolean>(false);
  const inFlightRef = useRef<Set<CelebrationKey>>(new Set());

  const tryCelebrate = useCallback(
    async (
      key: CelebrationKey,
      show: (newlyCelebrated: true) => void,
    ) => {
      if (celebratedRef.current[key]) return;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      const { ok, newlyCelebrated } = await requestCelebration(key);
      inFlightRef.current.delete(key);
      if (!isMounted.current) return;
      // Only mark celebrated if the request succeeded (ok=true)
      if (ok) {
        celebratedRef.current[key] = true;
      }
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

  // Refetch on in-app navigation. The hook lives in the persistent bottom nav,
  // so without this it never re-reads the row mid-session — a quest completed
  // during a game (server-side, fire-and-forget) would only toast on tab
  // refocus or a fresh QuestHub mount. Skip the initial mount (the effect above
  // already fetched). One short delayed retry covers the completion write
  // landing just after the route change.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    fetchMissions();
    const retry = setTimeout(() => {
      if (isMounted.current) fetchMissions();
    }, 2500);
    return () => clearTimeout(retry);
  }, [pathname, fetchMissions]);

  const completedCount = missions.filter(m => m.completed).length;
  const isGrandSlam = completedCount === missions.length && missions.length > 0;

  useEffect(() => {
    if (loading) return;
    for (const mission of missions) {
      if (!mission.completed) continue;
      const celebrationKey = SLOT_CELEBRATION_KEYS[mission.slot];
      if (!celebrationKey || celebratedRef.current[celebrationKey]) continue;
      // PvP quests (beat a human) are the brag-worthy ones — louder confetti.
      const isPvp = mission.family === 'pvp';
      void tryCelebrate(celebrationKey, () => {
        import('@/components/quests/QuestCompletionToast').then(({ showQuestCompletionToast }) => {
          showQuestCompletionToast({
            questName: t(mission.titleKey),
            xpReward: PER_QUEST_XP,
            isPvpWin: isPvp,
            dedupKey: `mission:${celebrationKey}`,
            t,
            onComplete: playQuestCompleteSound,
          });
        });
      });
    }
  }, [missions, loading, t, playQuestCompleteSound, tryCelebrate]);

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
      // Grand slam XP + coins are granted server-side (via checkAndClaimGrandSlam).
      // We mirror the server constants here purely for display so the reward
      // doesn't feel invisible — keep in sync with dailyMissionsManager
      // GRAND_SLAM_XP (500) + GRAND_SLAM_COIN_REWARD (200).
      // This toast fires on newlyCelebrated only (i.e., first mount after completion).
      import('@/components/quests/QuestCompletionToast').then(({ showQuestCompletionToast }) => {
        showQuestCompletionToast({
          questName: '',
          xpReward: 500,
          goldReward: 200,
          isGrandSlam: true,
          dedupKey: 'mission:grand_slam',
          t,
          onComplete: playQuestCompleteSound,
        });
      });
      // Server granted the 200 coins — fire the flying-coins + sound FX.
      emitCoinEarned(200);
    });
    prevGrandSlamRef.current = true;
  }, [isGrandSlam, loading, t, playQuestCompleteSound, tryCelebrate]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchMissions();
  }, [fetchMissions]);

  return { missions, completedCount, isGrandSlam, grandSlamClaimed, loading, refresh };
}
