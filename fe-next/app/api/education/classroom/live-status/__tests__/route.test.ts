import { describe, it, expect, vi, beforeEach } from 'vitest';

const getAuthedUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getAuthedUser(...a) }));

const lookupLiveGameForClassroom = vi.fn();
vi.mock('@/lib/education/liveGameForClassroom', () => ({
  lookupLiveGameForClassroom: (...a: unknown[]) => lookupLiveGameForClassroom(...a),
}));

const from = vi.fn();
const createAdminClient = vi.fn();
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => createAdminClient() }));

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn() } }));

import { GET } from '../route';

const req = () => ({ headers: new Headers() }) as never;

/** admin.from('classrooms').select('id').eq('teacher_id', uid) -> { data, error } */
function mockClassrooms(rows: { id: string }[] | null, error: { message: string } | null = null) {
  const eq = vi.fn().mockResolvedValue({ data: rows, error });
  const select = vi.fn().mockReturnValue({ eq });
  from.mockReturnValue({ select });
  createAdminClient.mockReturnValue({ from });
}

describe('GET /api/education/classroom/live-status', () => {
  beforeEach(() => {
    getAuthedUser.mockReset();
    lookupLiveGameForClassroom.mockReset();
    createAdminClient.mockReset();
    from.mockReset();
  });

  it('401 when signed out', async () => {
    getAuthedUser.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it('live:true when any of the teacher\'s classrooms has a running game', async () => {
    getAuthedUser.mockResolvedValue({ id: 't1' });
    mockClassrooms([{ id: 'c1' }, { id: 'c2' }]);
    lookupLiveGameForClassroom.mockImplementation(async (id: string) => (id === 'c2' ? 'ABC123' : null));
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ live: true });
  });

  it('live:false when no classroom is playing', async () => {
    getAuthedUser.mockResolvedValue({ id: 't1' });
    mockClassrooms([{ id: 'c1' }]);
    lookupLiveGameForClassroom.mockResolvedValue(null);
    const res = await GET(req());
    expect(await res.json()).toEqual({ live: false });
  });

  it('live:false for a teacher with no classrooms', async () => {
    getAuthedUser.mockResolvedValue({ id: 't1' });
    mockClassrooms([]);
    const res = await GET(req());
    expect(await res.json()).toEqual({ live: false });
    expect(lookupLiveGameForClassroom).not.toHaveBeenCalled();
  });

  it('fails OPEN (live:false) when the classroom list errors — a hiccup must never hide the offer', async () => {
    getAuthedUser.mockResolvedValue({ id: 't1' });
    mockClassrooms(null, { message: 'db down' });
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ live: false });
  });

  it('fails OPEN when the database is unreachable mid-check', async () => {
    getAuthedUser.mockResolvedValue({ id: 't1' });
    mockClassrooms([{ id: 'c1' }]);
    lookupLiveGameForClassroom.mockRejectedValue(new Error('redis gone'));
    const res = await GET(req());
    expect(await res.json()).toEqual({ live: false });
  });
});
