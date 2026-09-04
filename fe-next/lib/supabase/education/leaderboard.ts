import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { resolveDisplayName } from '@/lib/displayName';
import type {
  LeaderboardEntry,
  ClassroomLeaderboardData,
  LeaderboardTimeScope,
  LeaderboardEntryWithDelta,
} from './types';

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
      .from('public_profiles')
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
        // `|| 'Unknown Student'` never fires for a placeholder: 'Player_570b3674' is a
        // truthy string. A whole class saw each other as hex ids on the leaderboard.
        displayName: resolveDisplayName([profile?.display_name], 'Unknown Student'),
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

/**
 * Get full classroom leaderboard (all students, not just top 3)
 * Extended version that supports time scopes and returns current_streak
 *
 * @param classroomId - Classroom ID
 * @param currentUserId - Current student's ID (to mark isCurrentUser)
 * @param timeScope - Time scope: 'weekly', 'monthly', or 'all-time'
 */
export async function getFullClassroomLeaderboard(
  classroomId: string,
  currentUserId: string,
  timeScope: LeaderboardTimeScope = 'all-time'
): Promise<{ data: Array<LeaderboardEntry & { currentStreak: number }>; error: { message: string } | null }> {
  if (!supabase) {
    return {
      data: [],
      error: { message: 'Supabase not configured' },
    };
  }

  try {
    // Get all students in classroom
    const { data: memberships, error: memberError } = await supabase
      .from('classroom_memberships')
      .select('student_id')
      .eq('classroom_id', classroomId);

    if (memberError) {
      logger.error('Error fetching classroom memberships:', memberError);
      return {
        data: [],
        error: { message: memberError.message },
      };
    }

    if (!memberships || memberships.length === 0) {
      return {
        data: [],
        error: null,
      };
    }

    const studentIds = memberships.map(m => m.student_id);

    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('public_profiles')
      .select('id, display_name, avatar_emoji, avatar_color')
      .in('id', studentIds);

    if (profilesError) {
      logger.error('Error fetching student profiles:', profilesError);
    }

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Get progress with optional time filtering
    let query = supabase
      .from('student_lesson_progress')
      .select('student_id, total_xp, current_level, current_streak, last_practice_date')
      .in('student_id', studentIds);

    if (timeScope === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte('last_practice_date', weekAgo.toISOString().split('T')[0]);
    } else if (timeScope === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      query = query.gte('last_practice_date', monthAgo.toISOString().split('T')[0]);
    }

    const { data: progressData, error: progressError } = await query;

    if (progressError) {
      logger.error('Error fetching student progress:', progressError);
      return {
        data: [],
        error: { message: progressError.message },
      };
    }

    // Aggregate XP and streak by student
    const studentDataMap = new Map<string, {
      totalXp: number;
      currentLevel: number;
      currentStreak: number;
      lastPracticeDate: string | null;
    }>();

    if (progressData) {
      progressData.forEach(p => {
        const existing = studentDataMap.get(p.student_id);
        if (existing) {
          existing.totalXp += p.total_xp;
          existing.currentLevel = Math.max(existing.currentLevel, p.current_level);
          existing.currentStreak = Math.max(existing.currentStreak, p.current_streak);
          if (p.last_practice_date) {
            if (!existing.lastPracticeDate || p.last_practice_date > existing.lastPracticeDate) {
              existing.lastPracticeDate = p.last_practice_date;
            }
          }
        } else {
          studentDataMap.set(p.student_id, {
            totalXp: p.total_xp,
            currentLevel: p.current_level,
            currentStreak: p.current_streak,
            lastPracticeDate: p.last_practice_date,
          });
        }
      });
    }

    // Build entries for ALL students
    const entries = memberships.map(m => {
      const profile = profileMap.get(m.student_id);
      const data = studentDataMap.get(m.student_id);
      const totalXp = data?.totalXp || 0;
      const currentLevel = data?.currentLevel || 1;
      const currentStreak = data?.currentStreak || 0;
      const lastPracticeDate = data?.lastPracticeDate;

      // Check if inactive
      let isInactive = false;
      if (lastPracticeDate) {
        const lastPractice = new Date(lastPracticeDate);
        const daysSince = Math.floor((Date.now() - lastPractice.getTime()) / (1000 * 60 * 60 * 24));
        isInactive = daysSince >= 7;
      }

      // Avatar URL
      const avatarUrl = profile?.avatar_emoji
        ? `data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="50" fill="${profile.avatar_color || '#4F46E5'}"/><text x="50" y="50" font-size="50" text-anchor="middle" dominant-baseline="central">${profile.avatar_emoji}</text></svg>`
          )}`
        : null;

      return {
        userId: m.student_id,
        // `|| 'Unknown Student'` never fires for a placeholder: 'Player_570b3674' is a
        // truthy string. A whole class saw each other as hex ids on the leaderboard.
        displayName: resolveDisplayName([profile?.display_name], 'Unknown Student'),
        avatarUrl,
        totalXp,
        currentLevel,
        currentStreak,
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

    return {
      data: entries,
      error: null,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getFullClassroomLeaderboard:', error);
    return {
      data: [],
      error: { message: error },
    };
  }
}

/**
 * Get leaderboard with rank delta (compares to previous snapshot)
 *
 * @param classroomId - Classroom ID
 * @param currentUserId - Current student's ID
 * @param timeScope - Time scope for leaderboard
 */
export async function getLeaderboardWithRankDelta(
  classroomId: string,
  currentUserId: string,
  timeScope: LeaderboardTimeScope
): Promise<{ data: LeaderboardEntryWithDelta[]; error: { message: string } | null }> {
  // Get current leaderboard
  const { data: currentEntries, error: currentError } = await getFullClassroomLeaderboard(
    classroomId,
    currentUserId,
    timeScope
  );

  if (currentError) {
    return { data: [], error: currentError };
  }

  // Get previous snapshot (most recent for this classroom + time_scope)
  // Only query for weekly/monthly (all-time doesn't have snapshots)
  let previousRanks = new Map<string, number>();

  if (supabase && (timeScope === 'weekly' || timeScope === 'monthly')) {
    const { data: snapshots, error: snapshotError } = await supabase
      .from('leaderboard_snapshots')
      .select('student_id, rank_position')
      .eq('classroom_id', classroomId)
      .eq('time_scope', timeScope)
      .order('snapshot_date', { ascending: false })
      .limit(100); // Get latest snapshot's entries

    if (!snapshotError && snapshots) {
      snapshots.forEach(s => {
        previousRanks.set(s.student_id, s.rank_position);
      });
    }
  }

  // Calculate rank delta for each entry
  const entriesWithDelta: LeaderboardEntryWithDelta[] = currentEntries.map(entry => {
    const previousRank = previousRanks.get(entry.userId) || null;
    const isNew = previousRank === null;
    const rankDelta = previousRank !== null ? previousRank - entry.rank : null;

    return {
      ...entry,
      previousRank,
      rankDelta,
      isNew,
    };
  });

  return {
    data: entriesWithDelta,
    error: null,
  };
}

/**
 * Save current leaderboard as snapshot (for rank delta tracking)
 * This should be called periodically (e.g., daily cron job)
 *
 * @param classroomId - Classroom ID
 * @param timeScope - Time scope to save snapshot for
 * @param entries - Current leaderboard entries
 */
export async function saveLeaderboardSnapshot(
  classroomId: string,
  timeScope: 'weekly' | 'monthly',
  entries: LeaderboardEntryWithDelta[]
): Promise<{ error: { message: string } | null }> {
  if (!supabase) {
    return { error: { message: 'Supabase not configured' } };
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const snapshots = entries.map(entry => ({
      classroom_id: classroomId,
      student_id: entry.userId,
      snapshot_date: today,
      time_scope: timeScope,
      total_xp: entry.totalXp,
      rank_position: entry.rank,
    }));

    const { error } = await supabase
      .from('leaderboard_snapshots')
      .upsert(snapshots, {
        onConflict: 'classroom_id,student_id,time_scope,snapshot_date',
      });

    if (error) {
      logger.error('Error saving leaderboard snapshot:', error);
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in saveLeaderboardSnapshot:', error);
    return { error: { message: error } };
  }
}

/**
 * Get tier badge for a student based on their rank
 *
 * @param rank - Student's rank (1-indexed)
 * @param totalStudents - Total students in classroom
 * @returns Tier label: 'top10', 'top25', 'top50', or null
 */
export function getLeaderboardTier(
  rank: number,
  totalStudents: number
): 'top10' | 'top25' | 'top50' | null {
  if (totalStudents < 10) {
    // Small classes: use rank-based tiers
    if (rank === 1) return 'top10';
    if (rank <= 3) return 'top25';
    if (rank <= 5) return 'top50';
    return null;
  }

  // Large classes: use percentage-based tiers
  const percentile = (rank / totalStudents) * 100;
  if (percentile <= 10) return 'top10';
  if (percentile <= 25) return 'top25';
  if (percentile <= 50) return 'top50';
  return null;
}
