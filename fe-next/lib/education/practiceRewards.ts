import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import { writeAwards, type AwardState } from '@/lib/education/grantStudentAwards';
import type { AwardUnlock } from '@/lib/education/studentAwards';
import type { PracticeStreak } from '@/lib/education/practiceStreak';

export interface PracticeRewards {
  newAwards: AwardUnlock[] | null;
  practiceStreak: PracticeStreak | null;
}

// Runs only after the XP RPC committed, so the award state read before it plus this completion's XP is the new total.
export async function grantPracticeRewards({
  getAdmin,
  awardState,
  studentId,
  lessonId,
  xp,
  streak,
}: {
  getAdmin: () => SupabaseClient | null;
  awardState: AwardState | null;
  studentId: string;
  lessonId: string;
  xp: number;
  streak: PracticeStreak | null;
}): Promise<PracticeRewards> {
  const saveStreak = async (): Promise<PracticeStreak | null> => {
    if (!streak) return null;
    const admin = awardState?.admin ?? getAdmin();
    if (!admin) {
      logger.error('Practice streak not saved: service-role client unavailable');
      return null;
    }
    try {
      const { error } = await admin
        .from('student_lesson_progress')
        .update({ current_streak: streak.current, longest_streak: streak.longest })
        .eq('student_id', studentId)
        .eq('lesson_id', lessonId);
      if (error) throw error;
      return streak;
    } catch (err) {
      logger.error('Practice streak not saved:', err);
      return null;
    }
  };
  const [newAwards, practiceStreak] = await Promise.all([
    awardState ? writeAwards(awardState, studentId, xp > 0 ? { lessonId, xp } : null) : null,
    saveStreak(),
  ]);
  return { newAwards, practiceStreak };
}
