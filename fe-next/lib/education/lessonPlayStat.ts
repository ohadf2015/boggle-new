import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

export async function bumpLessonStat(lessonId: string, kind: 'copy' | 'play'): Promise<void> {
  try {
    if (!supabase) return;
    const { error } = await supabase.rpc('bump_vocabulary_lesson_stat', { p_lesson_id: lessonId, p_kind: kind });
    if (error) logger.warn(`bump_vocabulary_lesson_stat ${kind} failed`, error.message);
  } catch (err) {
    logger.warn(`bump_vocabulary_lesson_stat ${kind} threw`, err);
  }
}

// A hosted or assigned list is the teacher's own copy; the play belongs to the Discover original.
export async function recordLessonPlays(lessonIds: readonly string[]): Promise<void> {
  const ids = [...new Set(lessonIds.filter(Boolean))];
  if (ids.length === 0) return;
  try {
    if (!supabase) return;
    const { data, error } = await supabase.from('vocabulary_lessons').select('id, source_lesson_id').in('id', ids);
    if (error) {
      logger.warn('recordLessonPlays lookup failed', error.message);
      return;
    }
    const rows = (data ?? []) as { id: string; source_lesson_id: string | null }[];
    const targets = [...new Set(rows.map((r) => r.source_lesson_id ?? r.id))];
    await Promise.all(targets.map((id) => bumpLessonStat(id, 'play')));
  } catch (err) {
    logger.warn('recordLessonPlays threw', err);
  }
}
