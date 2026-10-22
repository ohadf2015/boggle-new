import type { StudentInsights } from './studentInsights';

export type StudentInsightsFetch = { ok: true; insights: StudentInsights } | { ok: false; status: number };

export function studentInsightsUrl(classroomId: string, studentId: string): string {
  return `/api/education/classroom/${classroomId}/members/${studentId}/insights`;
}

/** Browser read of the shared insights; the route loads them with the service role, so teacher and parent get the same rows. */
export async function fetchStudentInsights(
  classroomId: string,
  studentId: string,
  fetcher: typeof fetch = fetch,
): Promise<StudentInsightsFetch> {
  try {
    const res = await fetcher(studentInsightsUrl(classroomId, studentId));
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok && body.insights) return { ok: true, insights: body.insights as StudentInsights };
    return { ok: false, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
