import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClassHubStore } from './classroomHub';

/** Supabase adapter for `ClassHubStore`. Service role: the membership check is done here, not by RLS. */
export function createSupabaseClassHubStore(db: SupabaseClient): ClassHubStore {
  return {
    async isMember(classroomId, studentId) {
      const { data, error } = await db
        .from('classroom_memberships')
        .select('id')
        .eq('classroom_id', classroomId)
        .eq('student_id', studentId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },

    async fetchRoundDays(classroomId, sinceIso) {
      const { data, error } = await db
        .from('classroom_rounds')
        .select('completed_at')
        .eq('classroom_id', classroomId)
        .gte('completed_at', sinceIso);
      if (error) throw error;
      return (data ?? []).map((row: { completed_at: string }) => row.completed_at.slice(0, 10));
    },

    async hasRematchToday(classroomId, studentId, todayIso) {
      const { data, error } = await db
        .from('classroom_rematch_requests')
        .select('id')
        .eq('classroom_id', classroomId)
        .eq('student_id', studentId)
        .eq('request_date', todayIso)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },

    async insertRematch(classroomId, studentId, todayIso) {
      const { error } = await db
        .from('classroom_rematch_requests')
        .insert({ classroom_id: classroomId, student_id: studentId, request_date: todayIso });
      if (!error) return 'inserted';
      if (error.code === '23505') return 'duplicate';
      throw error;
    },
  };
}
