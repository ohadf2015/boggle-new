import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

/**
 * Hook to determine if a student is in their first experience in a classroom.
 * Returns true if the student has no completed practice/lesson/duel activity in this classroom yet.
 * This is activity-derived and self-clearing (once they play, it becomes false).
 *
 * Activity is tracked via:
 * - student_lesson_progress: any row = started or completed lesson
 * - practice_sessions: any row = did practice
 * - student_duels: any row = participated in duel
 */
export function useStudentFirstTimeInClassroom(
  userId: string,
  classroomId: string
): {
  isFirstTime: boolean;
  isLoading: boolean;
  error: string | null;
} {
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !classroomId) {
      setIsLoading(false);
      return;
    }

    const checkActivity = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = createClient();

        // Check if student has any lesson progress in this classroom
        const { count: lessonCount, error: lessonError } = await supabase
          .from('student_lesson_progress')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', userId)
          .eq('classroom_id', classroomId);

        if (lessonError && lessonError.code !== 'PGRST116') throw lessonError;

        // Check if student has any practice sessions in this classroom
        const { count: practiceCount, error: practiceError } = await supabase
          .from('practice_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', userId)
          .eq('classroom_id', classroomId);

        if (practiceError && practiceError.code !== 'PGRST116') throw practiceError;

        // Check if student has any duel participation
        const { count: duelCount, error: duelError } = await supabase
          .from('student_duels')
          .select('id', { count: 'exact', head: true })
          .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
          .eq('classroom_id', classroomId);

        if (duelError && duelError.code !== 'PGRST116') throw duelError;

        const totalActivity = (lessonCount ?? 0) + (practiceCount ?? 0) + (duelCount ?? 0);
        setIsFirstTime(totalActivity === 0);
      } catch (err) {
        console.error('Failed to check student activity:', err);
        setError(err instanceof Error ? err.message : 'Failed to check activity');
        // Default to showing the card on error (safer UX)
        setIsFirstTime(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkActivity();
  }, [userId, classroomId]);

  return { isFirstTime, isLoading, error };
}
