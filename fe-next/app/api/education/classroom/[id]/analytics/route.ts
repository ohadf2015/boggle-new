import { NextResponse } from 'next/server';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { teacherHasProAccess } from '@/lib/education/accessTrialServer';
import { readClassAnalytics } from '@/lib/education/pro/classAnalyticsServer';
import { toFreeClassPulse, type FreeClassInsight } from '@/lib/education/pro/freeClassInsight';
import { readFreeInsightClassId, readWeekHardestWords } from '@/lib/education/pro/freeClassInsightServer';
import logger from '@/utils/logger';

const WEEK_MS = 7 * 86_400_000;

const readFailed = (what: string, error: unknown) => {
  logger.error(`[class-analytics] ${what} read failed`, error);
  return NextResponse.json({ ok: false, error: 'Could not read class analytics' }, { status: 500 });
};

/**
 * GET /api/education/classroom/[id]/analytics. 401/400/403 ownership; Pro or live access trial gets the full
 * dashboard; a free teacher gets this week's slice (pulse + 3 hardest words) for their oldest class only, else 402.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorizeClassroomOwner(req, id);
  if (!auth.ok) return auth.response;

  const subscription = await checkTeacherSubscription(auth.userId);
  if (await teacherHasProAccess(auth.userId, subscription)) {
    const { data, error } = await readClassAnalytics(auth.sb, auth.classroom.id, auth.userId);
    if (error || !data) return readFailed('pro', error);
    return NextResponse.json({ ok: true, metrics: data });
  }

  const freeClass = await readFreeInsightClassId(auth.sb, auth.userId);
  if (freeClass.error) return readFailed('free class', freeClass.error);
  if (freeClass.data !== auth.classroom.id) {
    return NextResponse.json({ ok: false, error: 'Teacher Pro required' }, { status: 402 });
  }

  const [metrics, words] = await Promise.all([
    readClassAnalytics(auth.sb, auth.classroom.id, auth.userId),
    readWeekHardestWords(auth.sb, auth.classroom.id, new Date(Date.now() - WEEK_MS).toISOString()),
  ]);
  if (metrics.error || !metrics.data) return readFailed('free pulse', metrics.error);
  if (words.error || !words.data) return readFailed('free words', words.error);

  const free: FreeClassInsight = {
    pulse: toFreeClassPulse(metrics.data),
    hardestWords: words.data.hardestWords,
    sessionsThisWeek: words.data.sessions,
  };
  return NextResponse.json({ ok: true, scope: 'free', free });
}
