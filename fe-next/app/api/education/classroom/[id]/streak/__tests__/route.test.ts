import { describe, it, expect, vi, beforeEach } from 'vitest';

const getAuthedUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getAuthedUser(...a) }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

let owned: { data: unknown; error: unknown } = { data: { id: 'c1' }, error: null };
const ownerQuery = { teacherId: '' };
const roundDays = vi.fn(async () => ['2026-10-22']);
vi.mock('@/lib/education/classroomHubStore', () => ({
  createSupabaseClassHubStore: () => ({ fetchRoundDays: roundDays }),
}));
const admin = {
  from: vi.fn(() => {
    const q = {
      select: () => q,
      eq: (col: string, val: string) => {
        if (col === 'teacher_id') ownerQuery.teacherId = val;
        return q;
      },
      maybeSingle: async () => owned,
    };
    return q;
  }),
};
let adminClient: unknown = admin;
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => adminClient }));

import { GET } from '../route';

const call = () =>
  GET(new Request('http://x/api/education/classroom/c1/streak') as never, { params: Promise.resolve({ id: 'c1' }) });

describe('GET /api/education/classroom/[id]/streak', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-23T09:00:00Z'));
    getAuthedUser.mockResolvedValue({ id: 't1' });
    owned = { data: { id: 'c1' }, error: null };
    adminClient = admin;
    roundDays.mockClear();
  });

  it('Given no session, When asked, Then 401', async () => {
    getAuthedUser.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
  });

  it('Given a teacher who does not own the class, When asked, Then 403 and no rounds are read', async () => {
    owned = { data: null, error: null };
    expect((await call()).status).toBe(403);
    expect(roundDays).not.toHaveBeenCalled();
  });

  it('Given the owning teacher and a class that played yesterday, When asked, Then the streak is at risk today', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ streak: 1, playedToday: false });
    expect(ownerQuery.teacherId).toBe('t1');
  });

  it('Given the service role is missing, When asked, Then 500', async () => {
    adminClient = null;
    expect((await call()).status).toBe(500);
  });
});
