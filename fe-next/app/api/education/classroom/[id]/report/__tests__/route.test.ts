import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/education/ownedClassroomRoute', () => ({ authorizeClassroomOwner: vi.fn() }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: vi.fn() }));
vi.mock('@/lib/education/accessTrialServer', () => ({
  teacherHasProAccess: vi.fn(async (_u: string, s: { has_pro: boolean }) => s.has_pro),
}));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/education/studentInsightsLoader', () => ({ loadStudentInsights: vi.fn() }));
vi.mock('@/lib/supabase/analyticsReports', () => ({ getClassReportData: vi.fn(), getStudentReportData: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { GET } from '../route';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { teacherHasProAccess } from '@/lib/education/accessTrialServer';
import { createAdminClient } from '@/utils/supabase/admin';
import { loadStudentInsights } from '@/lib/education/studentInsightsLoader';
import { getClassReportData, getStudentReportData } from '@/lib/supabase/analyticsReports';

const CLASS = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';
const sb = { from: vi.fn() };
const classReport = { classroomId: CLASS, classroomName: '7B', studentRankings: [{ studentId: STUDENT, accuracy: 62 }] };
const studentReport = { studentId: STUDENT, studentName: 'Ana', metrics: { accuracy: 62 } };

let member: { id: string } | null = { id: 'm1' };
const admin = {
  from: vi.fn(() => ({
    select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: member, error: null }) }) }) }),
  })),
};

const call = (query = '') =>
  GET(new Request(`http://t/api/education/classroom/${CLASS}/report${query}`), { params: Promise.resolve({ id: CLASS }) });

beforeEach(() => {
  vi.clearAllMocks();
  member = { id: 'm1' };
  vi.mocked(authorizeClassroomOwner).mockResolvedValue({ ok: true, sb, userId: 't1', classroom: { id: CLASS } } as never);
  vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: true } as never);
  vi.mocked(createAdminClient).mockReturnValue(admin as never);
  vi.mocked(getClassReportData).mockResolvedValue({ data: classReport, error: null } as never);
  vi.mocked(getStudentReportData).mockResolvedValue({ data: studentReport, error: null } as never);
});

describe('GET /api/education/classroom/[id]/report', () => {
  it('passes a signed-out or not-owner refusal through and reads nothing', async () => {
    vi.mocked(authorizeClassroomOwner).mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 401 }) });
    expect((await call()).status).toBe(401);
    vi.mocked(authorizeClassroomOwner).mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 403 }) });
    expect((await call(`?studentId=${STUDENT}`)).status).toBe(403);
    expect(getClassReportData).not.toHaveBeenCalled();
    expect(getStudentReportData).not.toHaveBeenCalled();
  });

  it('402s a free teacher and reads no student rows', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    expect((await call()).status).toBe(402);
    expect((await call(`?studentId=${STUDENT}`)).status).toBe(402);
    expect(getClassReportData).not.toHaveBeenCalled();
    expect(getStudentReportData).not.toHaveBeenCalled();
    expect(loadStudentInsights).not.toHaveBeenCalled();
  });

  it('serves a teacher whose access trial is live', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    vi.mocked(teacherHasProAccess).mockResolvedValueOnce(true);
    expect((await call()).status).toBe(200);
  });

  it('gives a Pro teacher the class report, read on their own session client', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, report: classReport });
    expect(vi.mocked(getClassReportData).mock.calls[0][0]).toBe(CLASS);
    expect(vi.mocked(getClassReportData).mock.calls[0][2]).toBe(sb);
  });

  it('gives a Pro teacher one student report, with insights loaded on the server', async () => {
    vi.mocked(loadStudentInsights).mockResolvedValue({ ok: true, insights: { accuracy: 62 }, recentSessions: [] } as never);
    const res = await call(`?studentId=${STUDENT}`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, report: studentReport });
    const [studentId, classroomId, , , deps] = vi.mocked(getStudentReportData).mock.calls[0];
    expect([studentId, classroomId]).toEqual([STUDENT, CLASS]);
    expect(deps?.sb).toBe(sb);
    await expect(deps?.insights?.()).resolves.toEqual({ ok: true, insights: { accuracy: 62 } });
    expect(loadStudentInsights).toHaveBeenCalledWith(admin, STUDENT, CLASS);
  });

  it('400s a malformed student id and 403s a student outside the class', async () => {
    expect((await call('?studentId=nope')).status).toBe(400);
    member = null;
    expect((await call(`?studentId=${STUDENT}`)).status).toBe(403);
    expect(getStudentReportData).not.toHaveBeenCalled();
  });

  it('500s when the read fails', async () => {
    vi.mocked(getClassReportData).mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect((await call()).status).toBe(500);
  });
});
