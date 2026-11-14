export interface EduCategory {
  total: number;
  modes: Array<{ mode: string; count: number }>;
}

export interface EducationBreakdown {
  classGames: EduCategory;
  practice: EduCategory;
}

interface RoundRow { game_mode: string | null; teacher_id: string | null }
interface PracticeRow { mode: string | null; practice_type: string | null; student_id: string | null }

function category(modes: string[]): EduCategory {
  const counts = new Map<string, number>();
  for (const m of modes) counts.set(m, (counts.get(m) ?? 0) + 1);
  return {
    total: modes.length,
    modes: [...counts].map(([mode, count]) => ({ mode, count })).sort((a, b) => b.count - a.count),
  };
}

export function summarizeEducation(rounds: RoundRow[], practice: PracticeRow[], testIds: Set<string>): EducationBreakdown {
  const real = <T,>(id: string | null, row: T) => (id && testIds.has(id) ? [] : [row]);
  return {
    classGames: category(rounds.flatMap((r) => real(r.teacher_id, r.game_mode || 'other'))),
    practice: category(practice.flatMap((p) => real(p.student_id, p.mode || p.practice_type || 'other'))),
  };
}

interface Query extends PromiseLike<{ data: unknown; error: { message: string } | null }> {
  select: (cols: string) => Query;
  gte: (col: string, v: string) => Query;
  eq: (col: string, v: unknown) => Query;
  limit: (n: number) => Query;
}

// ponytail: 5000-row cap per window; classroom volume is ~500/month, switch to an RPC count if it nears the cap.
const ROW_CAP = 5000;

/** Classroom rounds and student practice in the window, or null when a read fails (the log still renders). */
export async function fetchEducationBreakdown(
  supabase: { from: (table: string) => Query },
  startDate: string | null,
): Promise<EducationBreakdown | null> {
  const since = (q: Query, col: string) => (startDate ? q.gte(col, startDate) : q);
  const [rounds, practice, tests] = await Promise.all([
    since(supabase.from('classroom_rounds').select('game_mode, teacher_id'), 'started_at').limit(ROW_CAP),
    since(supabase.from('practice_sessions').select('mode, practice_type, student_id'), 'started_at').limit(ROW_CAP),
    supabase.from('profiles').select('id').eq('is_test_account', true).limit(ROW_CAP),
  ]);
  const failed = rounds.error || practice.error || tests.error;
  if (failed) {
    console.error('[admin/game-logs] education breakdown failed:', failed.message);
    return null;
  }
  const testIds = new Set(((tests.data as Array<{ id: string }>) ?? []).map((p) => p.id));
  return summarizeEducation((rounds.data as RoundRow[]) ?? [], (practice.data as PracticeRow[]) ?? [], testIds);
}
