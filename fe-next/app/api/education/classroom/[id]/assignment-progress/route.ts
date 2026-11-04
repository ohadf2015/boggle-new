import { NextResponse } from 'next/server';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';
import { requireTeacherPro } from '@/lib/education/pro/requireTeacherPro';
import { readAssignmentProgressMatrix } from '@/lib/education/pro/assignmentProgressMatrixServer';
import logger from '@/utils/logger';

/**
 * GET /api/education/classroom/[id]/assignment-progress — the per-student
 * assignment progress matrix (Teacher Pro). 401/400/403 ownership, 402 not
 * Pro, 500 read failed, 200 { ok, matrix }. Every refusal above returns before
 * a single student row is read; a live access trial passes requireTeacherPro
 * exactly like the other Pro report routes.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorizeClassroomOwner(req, id);
  if (!auth.ok) return auth.response;

  const notPro = await requireTeacherPro(auth.userId);
  if (notPro) return notPro;

  const { data, error } = await readAssignmentProgressMatrix(auth.sb, auth.classroom.id);
  if (error || !data) {
    logger.error('[assignment-progress] read failed', error);
    return NextResponse.json({ ok: false, error: 'Could not read the assignment progress' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, matrix: data });
}
