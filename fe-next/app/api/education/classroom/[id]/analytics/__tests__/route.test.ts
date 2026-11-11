import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/education/ownedClassroomRoute', () => ({ authorizeClassroomOwner: vi.fn() }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: vi.fn() }));
vi.mock('@/lib/education/accessTrialServer', () => ({
  teacherHasProAccess: vi.fn(async (_u: string, s: { has_pro: boolean }) => s.has_pro),
}));
vi.mock('@/lib/education/pro/classAnalyticsServer', () => ({ readClassAnalytics: vi.fn() }));
vi.mock('@/lib/education/pro/freeClassInsightServer', () => ({ readFreeInsightClassId: vi.fn(), readWeekHardestWords: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { GET } from '../route';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { teacherHasProAccess } from '@/lib/education/accessTrialServer';
import { readClassAnalytics } from '@/lib/education/pro/classAnalyticsServer';
import { readFreeInsightClassId, readWeekHardestWords } from '@/lib/education/pro/freeClassInsightServer';

const CLASS = '11111111-1111-4111-8111-111111111111';
const metrics = {
  studentsNeedingHelp: 1, classAverageXp: 40, activeStudentsToday: 2, weeklyEngagement: 0, totalStudents: 3,
  commonMistakes: [{ word: 'desk', errorRate: 0.8, studentCount: 2 }],
  dailyActive: [{ day: '2026-11-10', count: 2 }],
  students: [
    { id: 's1', status: 'needsHelp', accuracy: 0.3, attempts: 10, xp: 30, lastPractice: '2026-11-09', activeDays: 2 },
    { id: 's2', status: 'thriving', accuracy: 0.9, attempts: 20, xp: 90, lastPractice: '2026-11-10', activeDays: 4 },
  ],
};
const hardWord = { word: 'desk', display: 'desk', attempts: 4, missed: 3, missRate: 75, studentsMissing: 2, studentsAsked: 2 };
const OTHER = '22222222-2222-4222-8222-222222222222';
const sb = { from: vi.fn() };
const call = () => GET(new Request(`http://t/api/education/classroom/${CLASS}/analytics`), { params: Promise.resolve({ id: CLASS }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authorizeClassroomOwner).mockResolvedValue({ ok: true, sb, userId: 't1', classroom: { id: CLASS } } as never);
  vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: true } as never);
  vi.mocked(readClassAnalytics).mockResolvedValue({ data: metrics as never, error: null });
  vi.mocked(readFreeInsightClassId).mockResolvedValue({ data: CLASS, error: null });
  vi.mocked(readWeekHardestWords).mockResolvedValue({ data: { hardestWords: [hardWord], sessions: 3 }, error: null });
});

describe('GET /api/education/classroom/[id]/analytics', () => {
  it('passes the ownership refusal through (401/403) and reads nothing', async () => {
    vi.mocked(authorizeClassroomOwner).mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 403 }) });
    expect((await call()).status).toBe(403);
    expect(readClassAnalytics).not.toHaveBeenCalled();
  });

  it('given a free teacher on a class that is not their oldest, when read, then 402 and no student rows are read', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    vi.mocked(readFreeInsightClassId).mockResolvedValue({ data: OTHER, error: null });
    const res = await call();
    expect(res.status).toBe(402);
    expect(readClassAnalytics).not.toHaveBeenCalled();
    expect(readWeekHardestWords).not.toHaveBeenCalled();
  });

  it('given a free teacher on their oldest class, when read, then only this week\'s free slice is sent', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    const res = await call();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(['free', 'ok', 'scope']);
    expect(body.scope).toBe('free');
    expect(Object.keys(body.free).sort()).toEqual(['hardestWords', 'pulse', 'sessionsThisWeek']);
    expect(body.free.pulse.needsHelp).toEqual([{ id: 's1', status: 'needsHelp' }]);
    expect(JSON.stringify(body)).not.toMatch(/accuracy|xp|activeDays|dailyActive|commonMistakes|lastPractice/);
    expect(body.free.hardestWords).toEqual([hardWord]);
    expect(body.free.sessionsThisWeek).toBe(3);
    expect(vi.mocked(readWeekHardestWords).mock.calls[0][1]).toBe(CLASS);
  });

  it('given the free-class lookup fails, when a free teacher reads, then 500 and nothing is sent', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    vi.mocked(readFreeInsightClassId).mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = await call();
    expect(res.status).toBe(500);
    expect(readClassAnalytics).not.toHaveBeenCalled();
  });

  it('given the week words read fails for a free teacher, when read, then 500', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    vi.mocked(readWeekHardestWords).mockResolvedValue({ data: null, error: { message: 'down' } });
    expect((await call()).status).toBe(500);
  });

  it('given an expired trial (free again), when reading a second class, then 402', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    vi.mocked(teacherHasProAccess).mockResolvedValueOnce(false);
    vi.mocked(readFreeInsightClassId).mockResolvedValue({ data: OTHER, error: null });
    expect((await call()).status).toBe(402);
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
    expect(readFreeInsightClassId).not.toHaveBeenCalled();
  });

  it('given admin-granted Pro on any class, when read, then the full metrics come back', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: true, source: 'admin' } as never);
    vi.mocked(readFreeInsightClassId).mockResolvedValue({ data: OTHER, error: null });
    const res = await call();
    expect(res.status).toBe(200);
    expect((await res.json()).metrics).toBeDefined();
  });

  it('500s when the read fails', async () => {
    vi.mocked(readClassAnalytics).mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect((await call()).status).toBe(500);
  });
});
