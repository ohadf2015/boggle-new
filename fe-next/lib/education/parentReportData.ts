/**
 * Read model for the public parent-report page.
 *
 * Scoped strictly to ONE (studentId, classroomId) pair, always via a
 * service-role client — the page has no session, so RLS can't help here.
 * Re-checks classroom membership at VIEW time (not just at link-issue time):
 * the token has no revocation list, so a student removed from the roster
 * must stop showing up here even on an unexpired link.
 *
 * Returns a discriminated union rather than an empty summary on failure —
 * a query error must never render as "this student has no progress yet"
 * (recurring-pitfalls Class 4: silent failure).
 */
import { resolveDisplayName } from '@/lib/displayName';

interface MinimalSupabaseClient {
  from: (table: string) => any;
}

export interface ParentReportSummary {
  displayName: string;
  totalXp: number;
  lessonsCompleted: number;
  wordsMastered: number;
  recentActivity: Array<{ completedAt: string }>;
}

export type ParentReportResult =
  | { status: 'ok'; data: ParentReportSummary }
  | { status: 'not_member' }
  | { status: 'error'; message: string };

const RECENT_ACTIVITY_LIMIT = 5;

export async function loadParentReportData(
  admin: MinimalSupabaseClient,
  studentId: string,
  classroomId: string,
): Promise<ParentReportResult> {
  const membership = await admin
    .from('classroom_memberships')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (membership.error) return { status: 'error', message: membership.error.message };
  if (!membership.data) return { status: 'not_member' };

  const [profileResult, progressResult, sessionsResult] = await Promise.all([
    admin.from('public_profiles').select('display_name, username').eq('id', studentId).maybeSingle(),
    admin.from('student_lesson_progress').select('total_xp, words_mastered, completed_at').eq('student_id', studentId),
    admin
      .from('practice_sessions')
      .select('completed_at')
      .eq('student_id', studentId)
      .eq('classroom_id', classroomId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(RECENT_ACTIVITY_LIMIT),
  ]);

  if (profileResult.error) return { status: 'error', message: profileResult.error.message };
  if (progressResult.error) return { status: 'error', message: progressResult.error.message };
  if (sessionsResult.error) return { status: 'error', message: sessionsResult.error.message };

  const displayName = resolveDisplayName(
    [profileResult.data?.display_name, profileResult.data?.username],
    'Student',
  );

  type ProgressRow = { total_xp: number | null; words_mastered: string[] | null; completed_at: string | null };
  const progressRows = (progressResult.data ?? []) as ProgressRow[];

  let totalXp = 0;
  let lessonsCompleted = 0;
  const masteredWords = new Set<string>();
  for (const row of progressRows) {
    totalXp += row.total_xp ?? 0;
    if (row.completed_at) lessonsCompleted += 1;
    for (const word of row.words_mastered ?? []) masteredWords.add(word);
  }

  type SessionRow = { completed_at: string | null };
  const recentActivity = ((sessionsResult.data ?? []) as SessionRow[])
    .filter((row): row is { completed_at: string } => typeof row.completed_at === 'string')
    .map((row) => ({ completedAt: row.completed_at }));

  return {
    status: 'ok',
    data: {
      displayName,
      totalXp,
      lessonsCompleted,
      wordsMastered: masteredWords.size,
      recentActivity,
    },
  };
}
