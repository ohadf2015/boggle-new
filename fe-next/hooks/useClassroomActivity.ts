'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useMounted } from '@/hooks/useMounted';
import logger from '@/utils/logger';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ActivityItem {
  id: string;
  type: 'duel_completed' | 'achievement_unlocked';
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface UseClassroomActivityReturn {
  activities: ActivityItem[];
  isLoading: boolean;
  error: string | null;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Classroom activity hook
 *
 * Fetches recent classroom activity by combining data from student_duels
 * and student_achievements tables, sorted by timestamp.
 *
 * @param classroomId - Classroom ID to fetch activity for
 * @param limit - Maximum number of activities to fetch (default: 20)
 * @returns Activity state
 *
 * @example
 * const { activities, isLoading, error } = useClassroomActivity('classroom-123');
 *
 * activities.map(activity => (
 *   <div key={activity.id}>
 *     {activity.actorName} {activity.type === 'duel_completed' ? 'won a duel' : 'unlocked an achievement'}
 *   </div>
 * ));
 */
export function useClassroomActivity(
  classroomId: string | null,
  limit: number = 20
): UseClassroomActivityReturn {
  const isMounted = useMounted();
  const supabase = createClient();

  const [state, setState] = useState<UseClassroomActivityReturn>({
    activities: [],
    isLoading: false,
    error: null,
  });

  const fetchActivity = useCallback(async () => {
    if (!supabase || !classroomId) {
      setState({
        activities: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch classroom members to filter achievements
      const { data: classroomMembers, error: membersError } = await supabase
        .from('classroom_memberships')
        .select('student_id')
        .eq('classroom_id', classroomId);

      if (membersError) {
        throw new Error(`Failed to fetch classroom members: ${membersError.message}`);
      }

      const studentIds = classroomMembers?.map(m => m.student_id) || [];

      // Fetch duels and achievements in parallel
      const [duelsResult, achievementsResult] = await Promise.all([
        // Fetch recent completed duels
        supabase
          .from('student_duels')
          .select(
            `
            id,
            completed_at,
            winner_id,
            challenger_id,
            opponent_id,
            challenger:profiles!student_duels_challenger_id_fkey(display_name, avatar_emoji),
            opponent:profiles!student_duels_opponent_id_fkey(display_name, avatar_emoji)
          `
          )
          .eq('classroom_id', classroomId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .range(0, limit - 1),

        // Fetch recent achievements (filtered by classroom members)
        studentIds.length > 0
          ? supabase
              .from('student_achievements')
              .select(
                `
                id,
                unlocked_at,
                student_id,
                student:profiles!student_achievements_student_id_fkey(display_name, avatar_emoji),
                achievement:achievement_definitions!student_achievements_achievement_id_fkey(key, icon)
              `
              )
              .in('student_id', studentIds)
              .order('unlocked_at', { ascending: false })
              .range(0, limit - 1)
          : Promise.resolve({ data: [], error: null }),
      ]);

      // PGRST205 = table not found (student_duels hasn't been created yet)
      if (duelsResult.error && duelsResult.error.code !== 'PGRST205') {
        throw new Error(`Failed to fetch duels: ${duelsResult.error.message}`);
      }

      if (achievementsResult.error) {
        throw new Error(`Failed to fetch achievements: ${achievementsResult.error.message}`);
      }

      // Transform duels into ActivityItems
      const duelActivities: ActivityItem[] = (duelsResult.data || []).map((duel: any) => {
        const winner = duel.winner_id || duel.challenger_id; // Use challenger if no winner (draw)
        const isChallenger = winner === duel.challenger_id;
        const actor = isChallenger ? duel.challenger : duel.opponent;

        return {
          id: `duel-${duel.id}`,
          type: 'duel_completed' as const,
          actorId: winner,
          actorName: actor?.display_name || 'Unknown',
          actorAvatar: actor?.avatar_emoji,
          timestamp: new Date(duel.completed_at),
          metadata: {
            duelId: duel.id,
            winnerId: duel.winner_id,
          },
        };
      });

      // Transform achievements into ActivityItems
      const achievementActivities: ActivityItem[] = (achievementsResult.data || []).map((ach: any) => ({
        id: `achievement-${ach.id}`,
        type: 'achievement_unlocked' as const,
        actorId: ach.student_id,
        actorName: ach.student?.display_name || 'Unknown',
        actorAvatar: ach.student?.avatar_emoji,
        timestamp: new Date(ach.unlocked_at),
        metadata: {
          achievementKey: ach.achievement?.key,
          achievementIcon: ach.achievement?.icon,
        },
      }));

      // Merge and sort by timestamp DESC
      const merged = [...duelActivities, ...achievementActivities]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

      if (isMounted.current) {
        setState({
          activities: merged,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      logger.error('Error fetching classroom activity:', err);
      if (isMounted.current) {
        setState({
          activities: [],
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to load classroom activity',
        });
      }
    }
  }, [classroomId, limit, supabase, isMounted]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return state;
}

export default useClassroomActivity;
