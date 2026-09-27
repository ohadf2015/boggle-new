import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  gateProTeacher,
  googleErrorResponse,
  notFoundWhenDisabled,
  readGoogleToken,
  reauthResponse,
} from '@/lib/education/googleClassroomServer';
import { createCourseWork } from '@/lib/education/googleClassroomApi';

/**
 * POST /api/education/google-classroom/coursework { classroomId, courseId, title }
 * Creates a 100-point PUBLISHED Classroom assignment owned by LexiClash's
 * Google project — the only kind studentSubmissions.patch may grade.
 */
const bodySchema = z.object({
  classroomId: z.string().uuid(),
  courseId: z.string().regex(/^[\w-]{1,64}$/),
  title: z.string().trim().min(1).max(200),
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

  const gate = await gateProTeacher({ classroomId: parsed.data.classroomId });
  if (!gate.ok) return gate.response;

  const token = await readGoogleToken(req, gate.user.id);
  if (!token) return reauthResponse();

  try {
    const courseWork = await createCourseWork(token, parsed.data.courseId, { title: parsed.data.title, maxPoints: 100 });
    return NextResponse.json({ ok: true, courseWork: { ...courseWork, associatedWithDeveloper: true } });
  } catch (err) {
    return googleErrorResponse(err, 'create courseWork');
  }
}
