import { NextResponse } from 'next/server';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { getClassMastery } from '@/lib/supabase/wordMastery';
import { buildWordMasteryReport, toFreePreview } from '@/lib/education/wordMasteryReport';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';
import { buildClassInsights } from '@/components/teacher/reports/classInsights';
import logger from '@/utils/logger';

/**
 * GET /api/education/classroom/[id]/word-mastery — Teacher Pro per-word mastery.
 * 401 / 400 / 403 from the ownership check; free teachers get 402 { locked, preview }
 * (top words + totals only), Pro gets 200 { locked: false, report }.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorizeClassroomOwner(req, id);
  if (!auth.ok) return auth.response;

  const [subscription, mastery] = await Promise.all([
    checkTeacherSubscription(auth.userId),
    getClassMastery(auth.classroom.id, auth.sb as never),
  ]);

  if (mastery.error || !mastery.data) {
    logger.error('[word-mastery] evidence read failed', mastery.error);
    return NextResponse.json({ ok: false, error: mastery.error?.message ?? 'No data' }, { status: 500 });
  }

  const report = buildWordMasteryReport(mastery.data);
  if (!subscription.has_pro) {
    return NextResponse.json(
      { ok: false, error: 'Teacher Pro required', locked: true, preview: toFreePreview(report) },
      { status: 402 },
    );
  }
  return NextResponse.json({ ok: true, locked: false, report, insights: buildClassInsights(mastery.data) });
}
