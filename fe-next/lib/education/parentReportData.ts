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
 * a query error must never render as "this student has no progress yet".
 */
import { resolveDisplayName } from '@/lib/displayName';
import { loadStudentInsights, type InsightsClient } from './studentInsightsLoader';
import type { StudentInsights } from './studentInsights';
import logger from '@/utils/logger';

const GENERATED_DISPLAY_NAME = /^player_[0-9a-f]{8}$/i;

/** A typed display name is the child's name even when it reads like "Guest"; only the username can be a placeholder. */
function studentReportName(displayName: string | null | undefined, username: string | null | undefined): string | null {
  const typed = displayName?.trim();
  if (typed && !GENERATED_DISPLAY_NAME.test(typed)) return typed;
  return resolveDisplayName([username], '') || null;
}

export interface ParentReportSummary {
  /** Null when the student has no real name; the page shows a localized fallback. */
  displayName: string | null;
  totalXp: number;
  lessonsCompleted: number;
  wordsMastered: number;
  recentActivity: Array<{ completedAt: string }>;
  /** Optional so a summary without them still renders, with those sections hidden. */
  classroomName?: string;
  teacherName?: string;
  generatedAt?: string;
  insights?: StudentInsights;
}

export type ParentReportResult =
  | { status: 'ok'; data: ParentReportSummary }
  | { status: 'not_member' }
  | { status: 'error'; message: string };

const RECENT_ACTIVITY_LIMIT = 5;

function latestPerDay(newestFirst: string[]): string[] {
  const seen = new Set<string>();
  return newestFirst.filter((at) => {
    const day = at.slice(0, 10);
    if (seen.has(day)) return false;
    seen.add(day);
    return true;
  });
}

async function loadTeacherName(admin: InsightsClient, teacherId: string | null | undefined): Promise<string | undefined> {
  if (!teacherId) return undefined;
  const { data, error } = await admin
    .from('public_profiles')
    .select('display_name, username')
    .eq('id', teacherId)
    .maybeSingle();
  if (error) {
    logger.warn('[parent-report] teacher name read failed, line hidden', error);
    return undefined;
  }
  return resolveDisplayName([data?.display_name, data?.username], '') || undefined;
}

export async function loadParentReportData(
  admin: InsightsClient,
  studentId: string,
  classroomId: string,
  now: Date = new Date(),
): Promise<ParentReportResult> {
  const membership = await admin
    .from('classroom_memberships')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (membership.error) return { status: 'error', message: membership.error.message };
  if (!membership.data) return { status: 'not_member' };

  const [profileResult, classroomResult, insightsResult] = await Promise.all([
    admin.from('public_profiles').select('display_name, username').eq('id', studentId).maybeSingle(),
    admin.from('classrooms').select('name, teacher_id').eq('id', classroomId).maybeSingle(),
    loadStudentInsights(admin, studentId, classroomId, now),
  ]);

  if (profileResult.error) return { status: 'error', message: profileResult.error.message };
  if (classroomResult.error) return { status: 'error', message: classroomResult.error.message };
  if (!insightsResult.ok) return { status: 'error', message: insightsResult.message };

  const classroom = classroomResult.data as { name?: string | null; teacher_id?: string | null } | null;
  const teacherName = await loadTeacherName(admin, classroom?.teacher_id);
  const { insights, recentSessions } = insightsResult;

  return {
    status: 'ok',
    data: {
      displayName: studentReportName(profileResult.data?.display_name, profileResult.data?.username),
      totalXp: insights.totalXp,
      lessonsCompleted: insights.lessonsCompleted,
      wordsMastered: insights.wordsMastered,
      recentActivity: latestPerDay(recentSessions).slice(0, RECENT_ACTIVITY_LIMIT).map((completedAt) => ({ completedAt })),
      classroomName: classroom?.name || undefined,
      teacherName,
      generatedAt: now.toISOString(),
      insights,
    },
  };
}
