import { fetchWithAuth } from '@/utils/authFetch';
import type { ClassReportData, DateRange, StudentReportData } from '@/lib/supabase/analyticsTypes';

type ReportRead<T> = { data: T | null; error: { message: string; status?: number } | null };

async function readReport<T>(url: string, dateRange?: DateRange): Promise<ReportRead<T>> {
  try {
    const res = await fetchWithAuth(url, { requireSession: true });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok && body.report) return { data: { ...body.report, dateRange: dateRange ?? null }, error: null };
    return { data: null, error: { message: body?.error ?? `Report unavailable (${res.status})`, status: res.status } };
  } catch (err) {
    return { data: null, error: { message: err instanceof Error ? err.message : 'Report unavailable', status: 0 } };
  }
}

export function fetchClassReport(classroomId: string, dateRange?: DateRange): Promise<ReportRead<ClassReportData>> {
  return readReport(`/api/education/classroom/${encodeURIComponent(classroomId)}/report`, dateRange);
}

export function fetchStudentReport(
  studentId: string,
  classroomId: string,
  dateRange?: DateRange,
): Promise<ReportRead<StudentReportData>> {
  return readReport(
    `/api/education/classroom/${encodeURIComponent(classroomId)}/report?studentId=${encodeURIComponent(studentId)}`,
    dateRange,
  );
}
