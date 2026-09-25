import { NextResponse, type NextRequest } from 'next/server';
import { gateProTeacher, googleErrorResponse, readGoogleToken, reauthResponse } from '@/lib/education/googleClassroomServer';
import { listCourseWork, listTeacherCourses } from '@/lib/education/googleClassroomApi';

/**
 * GET /api/education/google-classroom/courses           → { courses }
 * GET /api/education/google-classroom/courses?courseId=X → { courseWork }
 * Teacher Pro; 401 {reauth:true} when the Google token is absent/expired.
 */
export async function GET(req: NextRequest) {
  const gate = await gateProTeacher();
  if (!gate.ok) return gate.response;

  const token = await readGoogleToken(req, gate.user.id);
  if (!token) return reauthResponse();

  const courseId = req.nextUrl.searchParams.get('courseId');
  if (courseId !== null && !/^[\w-]{1,64}$/.test(courseId)) {
    return NextResponse.json({ ok: false, error: 'invalid_course' }, { status: 400 });
  }
  try {
    if (courseId) return NextResponse.json({ ok: true, courseWork: await listCourseWork(token, courseId) });
    return NextResponse.json({ ok: true, courses: await listTeacherCourses(token) });
  } catch (err) {
    return googleErrorResponse(err, courseId ? 'list courseWork' : 'list courses');
  }
}
