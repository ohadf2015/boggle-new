import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/server', () => ({ createRequestClient: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: vi.fn() }));
vi.mock('@/lib/education/accessTrialServer', () => ({
  teacherHasProAccess: vi.fn(async (_u: string, s: { has_pro: boolean }) => s.has_pro),
}));
vi.mock('@/lib/education/pro/teacherExportServer', () => ({ readTeacherExportRows: vi.fn() }));

import { GET } from '../route';
import { createRequestClient } from '@/utils/supabase/server';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { teacherHasProAccess } from '@/lib/education/accessTrialServer';
import { readTeacherExportRows } from '@/lib/education/pro/teacherExportServer';

const row = {
  classroomId: 'c1',
  classroomName: '7A',
  studentId: 's1',
  studentName: 'Ada',
  lessonsCompleted: 1,
  wordsMastered: 2,
  totalXp: 30,
  lastActive: null,
  gamesPlayed: 4,
};

const sb = (user: { id: string } | null) => ({ auth: { getUser: vi.fn(async () => ({ data: { user }, error: null })) } });
const call = () => GET(new Request('http://t/api/education/classroom/export-all'));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createRequestClient).mockResolvedValue({ supabase: sb({ id: 't1' }), token: null } as never);
  vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: true } as never);
  vi.mocked(readTeacherExportRows).mockResolvedValue({ data: [row], error: null });
});

describe('GET /api/education/classroom/export-all', () => {
  it('401 when signed out', async () => {
    vi.mocked(createRequestClient).mockResolvedValue({ supabase: sb(null), token: null } as never);
    expect((await call()).status).toBe(401);
    expect(readTeacherExportRows).not.toHaveBeenCalled();
  });

  it('402s a free teacher and reads no student rows', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    const res = await call();
    expect(res.status).toBe(402);
    expect(readTeacherExportRows).not.toHaveBeenCalled();
  });

  it('lets a free teacher export while their access trial is live', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    vi.mocked(teacherHasProAccess).mockResolvedValueOnce(true);
    expect((await call()).status).toBe(200);
  });

  it('gives a Pro teacher the rows of every class they own', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, rows: [row] });
    expect(readTeacherExportRows).toHaveBeenCalledWith(expect.anything(), 't1');
  });

  it('500 (not an empty file) when a read fails', async () => {
    vi.mocked(readTeacherExportRows).mockResolvedValue({ data: [], error: { message: 'boom' } });
    expect((await call()).status).toBe(500);
  });
});
