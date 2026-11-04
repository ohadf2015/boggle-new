import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/education/ownedClassroomRoute', () => ({ authorizeClassroomOwner: vi.fn() }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: vi.fn() }));
vi.mock('@/lib/education/accessTrialServer', () => ({
  teacherHasProAccess: vi.fn(async (_u: string, s: { has_pro: boolean }) => s.has_pro),
}));
vi.mock('@/lib/education/pro/assignmentProgressMatrixServer', () => ({
  readAssignmentProgressMatrix: vi.fn(),
}));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { GET } from '../route';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { teacherHasProAccess } from '@/lib/education/accessTrialServer';
import { readAssignmentProgressMatrix } from '@/lib/education/pro/assignmentProgressMatrixServer';

const CLASS = '11111111-1111-4111-8111-111111111111';
const matrix = {
  assignments: [{ id: 'a1', title: 'Week 1', dueDate: '2026-10-06' }],
  rows: [
    {
      studentId: 's1',
      studentName: 'Ada',
      cells: [{ completed: true, correctness: 75 }],
      trend: 'none',
    },
  ],
};
const sb = { from: vi.fn() };
const call = () =>
  GET(new Request(`http://t/api/education/classroom/${CLASS}/assignment-progress`), {
    params: Promise.resolve({ id: CLASS }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authorizeClassroomOwner).mockResolvedValue({
    ok: true,
    sb,
    userId: 't1',
    classroom: { id: CLASS },
  } as never);
  vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: true } as never);
  vi.mocked(readAssignmentProgressMatrix).mockResolvedValue({ data: matrix, error: null });
});

describe('GET /api/education/classroom/[id]/assignment-progress', () => {
  it('passes the ownership refusal through (401/403) and reads nothing', async () => {
    vi.mocked(authorizeClassroomOwner).mockResolvedValue({
      ok: false,
      response: NextResponse.json({}, { status: 403 }),
    });
    expect((await call()).status).toBe(403);
    expect(readAssignmentProgressMatrix).not.toHaveBeenCalled();
  });

  it('402s a free teacher and reads no student rows', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    const res = await call();
    expect(res.status).toBe(402);
    expect(readAssignmentProgressMatrix).not.toHaveBeenCalled();
  });

  it('lets a teacher on a live access trial in', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    vi.mocked(teacherHasProAccess).mockResolvedValueOnce(true);
    expect((await call()).status).toBe(200);
  });

  it('gives a Pro teacher the matrix read on their own client', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, matrix });
    expect(readAssignmentProgressMatrix).toHaveBeenCalledWith(sb, CLASS);
  });

  it('500s when the read fails', async () => {
    vi.mocked(readAssignmentProgressMatrix).mockResolvedValue({
      data: null,
      error: { message: 'boom' },
    });
    expect((await call()).status).toBe(500);
  });
});
