/**
 * Persist one class-bubble rating per (student, game_code).
 * The caller supplies the upsert so tests do not touch Supabase.
 * RLS is the authority: a student can only write their own membership row.
 */

export type ClassRoundRatingValue = 'bad' | 'ok' | 'great';

export interface ClassRoundRatingUpsert {
  student_id: string;
  classroom_id: string;
  game_code: string;
  rating: ClassRoundRatingValue;
}

export interface ClassRoundRatingWriteInput {
  surface: string;
  studentId?: string | null;
  classroomId?: string | null;
  gameCode?: string | null;
  rating: string;
}

export interface ClassRoundRatingWriter {
  upsert(
    row: ClassRoundRatingUpsert,
    opts: { onConflict: 'student_id,game_code' },
  ): Promise<{ error: { message: string } | null }>;
}

const RATINGS = new Set<string>(['bad', 'ok', 'great']);

export function planClassRoundRatingWrite(
  input: ClassRoundRatingWriteInput,
): ClassRoundRatingUpsert | null {
  if (input.surface !== 'class_round') return null;
  if (!input.studentId || !input.classroomId || !input.gameCode) return null;
  if (!RATINGS.has(input.rating)) return null;
  return {
    student_id: input.studentId,
    classroom_id: input.classroomId,
    game_code: input.gameCode,
    rating: input.rating as ClassRoundRatingValue,
  };
}

export async function persistClassRoundRating(
  input: ClassRoundRatingWriteInput,
  writer: ClassRoundRatingWriter,
): Promise<'saved' | 'skipped' | 'failed'> {
  const row = planClassRoundRatingWrite(input);
  if (!row) return 'skipped';
  try {
    const { error } = await writer.upsert(row, { onConflict: 'student_id,game_code' });
    return error ? 'failed' : 'saved';
  } catch {
    return 'failed';
  }
}

/** Browser write. Never throws into the rating tap. */
export async function saveClassRoundRating(
  input: ClassRoundRatingWriteInput,
): Promise<'saved' | 'skipped' | 'failed'> {
  const { supabase } = await import('@/lib/supabase');
  if (!supabase) return 'skipped';
  return persistClassRoundRating(input, {
    upsert: async (row, opts) => {
      const { error } = await supabase.from('class_round_ratings').upsert(row, opts);
      return { error: error ? { message: error.message } : null };
    },
  });
}
