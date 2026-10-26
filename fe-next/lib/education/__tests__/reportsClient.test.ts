import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: vi.fn() }));

import { fetchWithAuth } from '@/utils/authFetch';
import { fetchClassReport, fetchStudentReport } from '../reportsClient';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => vi.clearAllMocks());

describe('reportsClient', () => {
  it('reads the class report from the Pro-checked route, never the tables', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue(json(200, { ok: true, report: { classroomName: '7B' } }));
    const { data, error } = await fetchClassReport('c1');
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/education/classroom/c1/report', { requireSession: true });
    expect(error).toBeNull();
    expect(data).toEqual({ classroomName: '7B', dateRange: null });
  });

  it('reads one student report with the student in the query', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue(json(200, { ok: true, report: { studentName: 'Ana' } }));
    const range = { start: new Date('2026-01-01'), end: new Date('2026-01-31') };
    const { data } = await fetchStudentReport('s 1', 'c1', range);
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/education/classroom/c1/report?studentId=s%201', { requireSession: true });
    expect(data).toEqual({ studentName: 'Ana', dateRange: range });
  });

  it('turns a 402 into an error with no data', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue(json(402, { ok: false, error: 'Teacher Pro required' }));
    await expect(fetchClassReport('c1')).resolves.toEqual({ data: null, error: { message: 'Teacher Pro required', status: 402 } });
  });

  it('turns a network failure into an error, not a throw', async () => {
    vi.mocked(fetchWithAuth).mockRejectedValue(new Error('offline'));
    await expect(fetchStudentReport('s1', 'c1')).resolves.toEqual({ data: null, error: { message: 'offline', status: 0 } });
  });
});
