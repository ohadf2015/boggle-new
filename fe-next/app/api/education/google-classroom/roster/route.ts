import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { gateProTeacher, googleErrorResponse, readGoogleToken, reauthResponse } from '@/lib/education/googleClassroomServer';
import { isRosterImportServerEnabled } from '@/lib/education/googleClassroomRoster';
import { RosterInputError, fetchRoster, matchRosterToClass } from '@/lib/education/googleClassroomRosterServer';

/**
 * GET  ?classroomId=&courseId= → { students: [{ displayName, emailHash }] }
 * POST { classroomId, courseId, link? } → matched/unmatched counts + consent per match.
 * 404 unless GC_ROSTER_IMPORT_ENABLED=true; owner-checked; never creates accounts.
 */

const COURSE_ID = /^[\w-]{1,64}$/;
const bodySchema = z.object({
  classroomId: z.string().uuid(),
  courseId: z.string().regex(COURSE_ID),
  link: z.boolean().optional(),
});

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });
const badRequest = (error: string) => NextResponse.json({ ok: false, error }, { status: 400 });

export async function GET(req: NextRequest) {
  if (!isRosterImportServerEnabled()) return notFound();
  const classroomId = req.nextUrl.searchParams.get('classroomId') ?? '';
  const courseId = req.nextUrl.searchParams.get('courseId') ?? '';
  if (!z.string().uuid().safeParse(classroomId).success || !COURSE_ID.test(courseId)) return badRequest('invalid_query');

  const gate = await gateProTeacher({ classroomId });
  if (!gate.ok) return gate.response;
  const token = await readGoogleToken(req, gate.user.id);
  if (!token) return reauthResponse();

  try {
    const roster = await fetchRoster(token, courseId);
    return NextResponse.json({ ok: true, students: roster.map((r) => ({ displayName: r.displayName, emailHash: r.emailHash })) });
  } catch (err) {
    return googleErrorResponse(err, 'roster list');
  }
}

export async function POST(req: NextRequest) {
  if (!isRosterImportServerEnabled()) return notFound();
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('invalid_json');
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return badRequest('invalid_body');
  const body = parsed.data;

  const gate = await gateProTeacher({ classroomId: body.classroomId });
  if (!gate.ok) return gate.response;
  const token = await readGoogleToken(req, gate.user.id);
  if (!token) return reauthResponse();

  try {
    const result = await matchRosterToClass({
      admin: gate.admin,
      userClient: await createClient(),
      token,
      classroomId: body.classroomId,
      courseId: body.courseId,
      link: body.link === true,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof RosterInputError) return NextResponse.json({ ok: false, error: err.code }, { status: err.status });
    return googleErrorResponse(err, 'roster match');
  }
}
