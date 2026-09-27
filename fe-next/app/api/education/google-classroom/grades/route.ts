import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { googleErrorResponse, gateProTeacher, notFoundWhenDisabled, readGoogleToken, reauthResponse } from '@/lib/education/googleClassroomServer';
import { PushInputError, pushGrades } from '@/lib/education/googleClassroomPush';

/**
 * POST /api/education/google-classroom/grades — Teacher Pro, flagged OFF by default.
 * Body: { classroomId, lessonOrAssignmentId, courseId, courseWorkId, returnGrades? }
 *
 * 404 flag off · 401 unauthorized · 403 not_owner / not_pro · 400 bad body ·
 * 401 {reauth:true} no/foreign Google token or Google 401/403-scope ·
 * 409 not_linkable (courseWork not created by LexiClash) · 422 ungraded ·
 * 404 assignment_not_found / google_not_found · 429 {retryAfter}.
 * 200 → { updated, unmatched[], failed[], skipped[], retryAfter? }.
 */

const bodySchema = z.object({
  classroomId: z.string().uuid(),
  lessonOrAssignmentId: z.string().uuid(),
  courseId: z.string().min(1).max(64).regex(/^[\w-]+$/),
  courseWorkId: z.string().min(1).max(64).regex(/^[\w-]+$/),
  returnGrades: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const off = notFoundWhenDisabled();
  if (off) return off;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  const body = parsed.data;

  const gate = await gateProTeacher({ classroomId: body.classroomId });
  if (!gate.ok) return gate.response;

  const token = await readGoogleToken(req, gate.user.id);
  if (!token) return reauthResponse();

  try {
    const result = await pushGrades({
      admin: gate.admin,
      token,
      classroomId: body.classroomId,
      lessonOrAssignmentId: body.lessonOrAssignmentId,
      courseId: body.courseId,
      courseWorkId: body.courseWorkId,
      returnGrades: body.returnGrades === true,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof PushInputError) {
      return NextResponse.json({ ok: false, error: err.code }, { status: err.status });
    }
    return googleErrorResponse(err, 'grades');
  }
}
