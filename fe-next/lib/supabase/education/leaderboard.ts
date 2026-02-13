import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import type { LeaderboardEntry, ClassroomLeaderboardData } from './types';

/**
 * Get classroom leaderboard (top 3 students + current user rank)
 *
 * @param classroomId - Classroom ID
 * @param currentUserId - Current student's ID (to mark isCurrentUser)
 * @param timeScope - 'all-time' (default) or 'weekly'
 */
export async function getClassroomLeaderboard(
  classroomId: string,
  currentUserId: string,
  timeScope: 'weekly' | 'all-time' = 'all-time'
): Promise<{ data: ClassroomLeaderboardData; error: { message: string } | null }> {
  if (!supabase) {
    return {
      data: { topThree: [], currentUserRank: null, totalStudents: 0 },
      error: { message: 'Supabase not configured' },
    };
  }

  try {
    // Get all students in classroom (student_id only)
    const { data: memberships, error: memberError } = await supabase
      .from('classroom_memberships')
      .select('student_id')
      .eq('classroom_id', classroomId);

    if (memberError) {
      logger.error('Error fetching classroom memberships:', memberError);
      return {
        data: { topThree: [], currentUserRank: null, totalStudents: 0 },
        error: { message: memberError.message },
      };
    }

    if (!memberships || memberships.length === 0) {
      return {
        data: { topThree: [], currentUserRank: null, totalStudents: 0 },
        error: null,
      };
    }

    const studentIds = memberships.map(m => m.student_id);

    // Fetch profiles for all student_ids separately (profiles.id = auth.users.id = student_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_emoji, avatar_color')
      .in('id', studentIds);

    if (profilesError) {
      logger.error('Error fetching student profiles:', profilesError);
      // Continue without profile data rather than failing completely
    }

    // Create a map of profiles by id for quick lookup
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Get progress for all students in this classroom
    // For weekly scope: filter by last_practice_date within last 7 days
    let query = supabase
      .from('student_lesson_progress')
      .select('student_id, total_xp, current_level, last_practice_date')
      .in('student_id', studentIds);

    if (timeScope === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte('last_practice_date', weekAgo.toISOString().split('T')[0]);
    }

    const { data: progressData, error: progressError } = await query;

    if (progressError) {
      logger.error('Error fetching student progress:', progressError);
      return {
        data: { topThree: [], currentUserRank: null, totalStudents: 0 },
        error: { message: progressError.message },
      };
    }

    // Aggregate XP by student (sum across all lessons)
    const studentXpMap = new Map<string, {
      totalXp: number;
      currentLevel: number;
      lastPracticeDate: string | null;
    }>();

    if (progressData) {
      progressData.forEach(p => {
        const existing = studentXpMap.get(p.student_id);
        if (existing) {
          existing.totalXp += p.total_xp;
          // Use highest level and most recent practice date
          existing.currentLevel = Math.max(existing.currentLevel, p.current_level);
          if (p.last_practice_date) {
            if (!existing.lastPracticeDate || p.last_practice_date > existing.lastPracticeDate) {
              existing.lastPracticeDate = p.last_practice_date;
            }
          }
        } else {
          studentXpMap.set(p.student_id, {
            totalXp: p.total_xp,
            currentLevel: p.current_level,
            lastPracticeDate: p.last_practice_date,
          });
        }
      });
    }

    // Build leaderboard entries
    const entries: LeaderboardEntry[] = memberships.map(m => {
      const profile = profileMap.get(m.student_id);
      const xpData = studentXpMap.get(m.student_id);
      const totalXp = xpData?.totalXp || 0;
      const currentLevel = xpData?.currentLevel || 1;
      const lastPracticeDate = xpData?.lastPracticeDate;

      // Check if inactive (7+ days since last practice)
      let isInactive = false;
      if (lastPracticeDate) {
        const lastPractice = new Date(lastPracticeDate);
        const daysSince = Math.floor((Date.now() - lastPractice.getTime()) / (1000 * 60 * 60 * 24));
        isInactive = daysSince >= 7;
      }

      // Avatar URL construction (using emoji + color)
      const avatarUrl = profile?.avatar_emoji
        ? `data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="50" fill="${profile.avatar_color || '#4F46E5'}"/><text x="50" y="50" font-size="50" text-anchor="middle" dominant-baseline="central">${profile.avatar_emoji}</text></svg>`
          )}`
        : null;

      return {
        userId: m.student_id,
        displayName: profile?.display_name || 'Unknown Student',
        avatarUrl,
        totalXp,
        currentLevel,
        rank: 0, // Will be set below
        isCurrentUser: m.student_id === currentUserId,
        isInactive,
      };
    });

    // Sort by XP descending
    entries.sort((a, b) => b.totalXp - a.totalXp);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Get top 3
    const topThree = entries.slice(0, 3);

    // Get current user rank (if not in top 3)
    const currentUserInTopThree = topThree.some(e => e.isCurrentUser);
    const currentUserRank = currentUserInTopThree
      ? null
      : entries.find(e => e.isCurrentUser) || null;

    return {
      data: {
        topThree,
        currentUserRank,
        totalStudents: memberships.length,
      },
      error: null,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getClassroomLeaderboard:', error);
    return {
      data: { topThree: [], currentUserRank: null, totalStudents: 0 },
      error: { message: error },
    };
  }
}
