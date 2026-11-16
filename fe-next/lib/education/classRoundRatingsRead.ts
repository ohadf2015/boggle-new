/**
 * Teacher read of class-round ratings. Rating column only — no student id, no name.
 * A failed read is null so the digest hides the line instead of inventing a mood.
 */

import type { ClassRoundRating } from './classRoundMood';

export const CLASS_ROUND_RATING_COLUMNS = 'rating';

export interface ClassRoundRatingReader {
  list(
    classroomId: string,
    gameCode: string,
  ): Promise<{ data: { rating: string }[] | null; error: { message: string } | null }>;
}

const RATING = new Set<string>(['bad', 'ok', 'great']);

export async function readClassRoundRatings(
  classroomId: string,
  gameCode: string,
  reader: ClassRoundRatingReader,
): Promise<ClassRoundRating[] | null> {
  if (!classroomId || !gameCode) return [];
  const { data, error } = await reader.list(classroomId, gameCode);
  if (error || !data) return null;
  return data.flatMap((row) => (RATING.has(row.rating) ? [row.rating as ClassRoundRating] : []));
}

/** Browser read. Selects `rating` only. */
export async function loadClassRoundRatings(
  classroomId: string,
  gameCode: string,
): Promise<ClassRoundRating[] | null> {
  const { supabase } = await import('@/lib/supabase');
  if (!supabase) return null;
  return readClassRoundRatings(classroomId, gameCode, {
    list: async (classId, code) => {
      const { data, error } = await supabase
        .from('class_round_ratings')
        .select(CLASS_ROUND_RATING_COLUMNS)
        .eq('classroom_id', classId)
        .eq('game_code', code);
      return {
        data: (data ?? null) as { rating: string }[] | null,
        error: error ? { message: error.message } : null,
      };
    },
  });
}
