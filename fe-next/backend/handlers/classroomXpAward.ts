// Only errors with a DB code are retried: those statements did not commit, and both writes are additive.
import type { getSupabase } from '../modules/supabase/client';
import logger from '../utils/logger';

type Supabase = NonNullable<ReturnType<typeof getSupabase>>;

const ATTEMPTS = 3;
const BACKOFF_MS = 150;

export class DbWriteError extends Error {
  constructor(message: string, readonly code: string | undefined) {
    super(message);
  }
}

function isRetryable(err: unknown): boolean {
  return err instanceof DbWriteError && typeof err.code === 'string' && err.code.length > 0;
}

export async function retryDbWrite<T>(op: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await op();
    } catch (err) {
      if (attempt >= ATTEMPTS || !isRetryable(err)) throw err;
      await new Promise((r) => setTimeout(r, BACKOFF_MS * attempt));
    }
  }
}

export async function awardLessonXp(
  supabase: Supabase,
  args: { userId: string; lessonIds: string[]; score: number; gameCode: string }
): Promise<number> {
  if (args.score <= 0 || args.lessonIds.length === 0) return 0;
  const totalXp = Math.max(10, Math.floor(args.score / 10));
  // At least 1 per lesson: flooring 10 XP across 11+ lessons paid a scoring student nothing.
  const perLessonXp = Math.max(1, Math.floor(totalXp / args.lessonIds.length));
  let awarded = 0;
  for (const lessonId of args.lessonIds) {
    try {
      await retryDbWrite(async () => {
        const { error } = await supabase.rpc('award_education_xp', {
          p_student_id: args.userId,
          p_xp_amount: perLessonXp,
          p_lesson_id: lessonId,
        });
        if (error) throw new DbWriteError(error.message, error.code);
      });
      awarded += perLessonXp;
    } catch (err) {
      logger.error(
        'CLASSROOM_GAME',
        `Failed to award XP for ${args.userId} on lesson ${lessonId} (game ${args.gameCode}): ${(err as Error).message}`
      );
    }
  }
  return awarded;
}
