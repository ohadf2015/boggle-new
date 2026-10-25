import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/education/ownedClassroomRoute', () => ({ authorizeClassroomOwner: vi.fn() }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: vi.fn() }));
vi.mock('@/lib/education/accessTrialServer', () => ({
  teacherHasProAccess: vi.fn(async (_u: string, s: { has_pro: boolean }) => s.has_pro),
}));
vi.mock('@/lib/education/pro/classAnalyticsServer', () => ({ readClassAnalytics: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { GET } from '../route';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { teacherHasProAccess } from '@/lib/education/accessTrialServer';
import { readClassAnalytics } from '@/lib/education/pro/classAnalyticsServer';

const CLASS = '11111111-1111-4111-8111-111111111111';
const metrics = {
  studentsNeedingHelp: 1, classAverageXp: 40, activeStudentsToday: 2, weeklyEngagement: 0, totalStudents: 3,
  commonMistakes: [{ word: 'desk', errorRate: 0.8, studentCount: 2 }],
};
const sb = { from: vi.fn() };
const call = () => GET(new Request(`http://t/api/education/classroom/${CLASS}/analytics`), { params: Promise.resolve({ id: CLASS }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authorizeClassroomOwner).mockResolvedValue({ ok: true, sb, userId: 't1', classroom: { id: CLASS } } as never);
  vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: true } as never);
  vi.mocked(readClassAnalytics).mockResolvedValue({ data: metrics, error: null });
});

describe('GET /api/education/classroom/[id]/analytics', () => {
  it('passes the ownership refusal through (401/403) and reads nothing', async () => {
    vi.mocked(authorizeClassroomOwner).mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 403 }) });
    expect((await call()).status).toBe(403);
    expect(readClassAnalytics).not.toHaveBeenCalled();
  });

  it('402s a free teacher and reads no student rows', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    const res = await call();
    expect(res.status).toBe(402);
    expect(readClassAnalytics).not.toHaveBeenCalled();
  });

  it('lets a teacher on a live access trial in', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    vi.mocked(teacherHasProAccess).mockResolvedValueOnce(true);
    expect((await call()).status).toBe(200);
  });

  it('gives a Pro teacher the class metrics read on their own client', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, metrics });
    expect(readClassAnalytics).toHaveBeenCalledWith(sb, CLASS, 't1');
  });

  it('500s when the read fails', async () => {
    vi.mocked(readClassAnalytics).mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect((await call()).status).toBe(500);
  });
});
