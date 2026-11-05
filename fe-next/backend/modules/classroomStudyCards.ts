import { buildStudyCards, type StudyCard } from '@/shared/utils/studyCards';
import { getSupabase } from './supabase/client.js';
import logger from '../utils/logger.js';

/** Once per game, at creation: never on the join path. A failed lookup still yields word-only cards. */
export async function loadStudyCards(lessonIds: string[], gameWords: string[], gameCode: string): Promise<StudyCard[]> {
  const supabase = getSupabase();
  if (!lessonIds.length || !supabase) return buildStudyCards(gameWords, []);
  try {
    const { data, error } = await supabase.from('vocabulary_lessons').select('words').in('id', lessonIds);
    if (error) throw new Error(error.message);
    return buildStudyCards(gameWords, ((data ?? []) as Array<{ words: unknown }>).map((row) => row.words));
  } catch (err) {
    logger.warn('CLASSROOM_GAME', `Study cards for ${gameCode} fell back to bare words: ${(err as Error).message}`);
    return buildStudyCards(gameWords, []);
  }
}
