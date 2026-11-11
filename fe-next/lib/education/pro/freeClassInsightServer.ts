import type { SupabaseClient } from '@supabase/supabase-js';
import { FREE_PREVIEW_WORDS, type HardWord } from '@/lib/education/wordMasteryReport';
import { freeInsightClassId, rankWeekHardestWords } from './freeClassInsight';

type Read<T> = Promise<{ data: T | null; error: { message: string } | null }>;

const MAX_WEEK_ROWS = 2000;

export async function readFreeInsightClassId(sb: SupabaseClient, teacherId: string): Read<string> {
  const { data, error } = await sb.from('classrooms').select('id, created_at').eq('teacher_id', teacherId);
  if (error) return { data: null, error: { message: error.message } };
  return { data: freeInsightClassId((data ?? []) as { id: string; created_at: string }[]), error: null };
}

/** This week's hardest lesson words for one class, already cut to the free preview size. */
export async function readWeekHardestWords(
  sb: SupabaseClient,
  classroomId: string,
  sinceIso: string,
): Read<{ hardestWords: HardWord[]; sessions: number }> {
  const { data, error } = await sb
    .from('practice_sessions')
    .select('student_id, results')
    .eq('classroom_id', classroomId)
    .not('results->lessonWordsFound', 'is', null)
    .not('completed_at', 'is', null)
    .gte('started_at', sinceIso)
    .order('started_at', { ascending: true })
    .limit(MAX_WEEK_ROWS);
  if (error) return { data: null, error: { message: error.message } };
  const rows = ((data ?? []) as { student_id: string; results: unknown }[]).map((r) => ({ studentId: r.student_id, results: r.results }));
  return { data: rankWeekHardestWords(rows, FREE_PREVIEW_WORDS), error: null };
}
