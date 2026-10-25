import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn(async () => null) }));
vi.mock('@/lib/subscriptions', () => ({ canAddStudent: vi.fn() }));
vi.mock('@/lib/education/classroomGameLookup', () => ({ lookupLiveClassroomGame: vi.fn(async () => null) }));
vi.mock('@/lib/education/liveGameForClassroom', () => ({ lookupLiveGameForClassroom: vi.fn(async () => null) }));
vi.mock('../endedSessionCode', () => ({
  lookupEndedClassroomSession: vi.fn(async () => null),
  recordEndedCodeTry: vi.fn(async () => undefined),
}));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { canAddStudent } from '@/lib/subscriptions';

const mocked = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

let ipCounter = 0;
const req = (body: unknown, ip = `10.0.0.${++ipCounter % 250}-${ipCounter}`) =>
  new Request('https://x.test/api/education/classroom/join', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  }) as never;

let signInAnonymously: ReturnType<typeof vi.fn>;
let requestInsert: ReturnType<typeof vi.fn>;
let profileUpsert: ReturnType<typeof vi.fn>;
let adminInsert: ReturnType<typeof vi.fn>;

const setup = (classroom: { id: string } | null) => {
  signInAnonymously = vi.fn(async () => ({ data: { user: { id: 'guest-1' } }, error: null }));
  requestInsert = vi.fn(async () => ({ error: null }));
  profileUpsert = vi.fn(async () => ({ error: null }));
  adminInsert = vi.fn(async () => ({ error: null }));
  mocked(createClient).mockResolvedValue({
    auth: { signInAnonymously },
    rpc: vi.fn(async () => ({ data: classroom ? [classroom] : [], error: null })),
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
      insert: requestInsert,
      upsert: profileUpsert,
    })),
  });
  mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ insert: adminInsert })) });
  mocked(canAddStudent).mockResolvedValue({ allowed: true, currentCount: 0, limit: 50 });
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked(getAuthedUser).mockResolvedValue(null);
});

describe('join route: nothing is created for a code that leads nowhere', () => {
  it('does not mint a guest account for an unknown code', async () => {
    setup(null);
    const res = await POST(req({ joinCode: 'ZZZZZZ', guestName: 'Dana' }));
    expect(res.status).toBe(400);
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('does not mint a guest account for a malformed code', async () => {
    setup({ id: 'c1' });
    const res = await POST(req({ joinCode: 'AB', guestName: 'Dana' }));
    expect(res.status).toBe(400);
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('does not mint a guest account for a full class, and hides the plan from the guest', async () => {
    setup({ id: 'c1' });
    mocked(canAddStudent).mockResolvedValue({
      allowed: false,
      reason: 'This classroom has reached the free tier limit of 50 students.',
      currentCount: 50,
      limit: 50,
    });
    const res = await POST(req({ joinCode: 'ABC123', guestName: 'Dana' }));
    expect(res.status).toBe(403);
    expect(signInAnonymously).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body).toEqual({ error: 'STUDENT_LIMIT_REACHED' });
  });
});

describe('join route: guest identity', () => {
  it('gives the guest a suffixed handle and a clean display name, never the raw name as username', async () => {
    setup({ id: 'c1' });
    const res = await POST(req({ joinCode: 'ABC123', guestName: '  Da\u0000na‮  ' + 'x'.repeat(80) }));
    expect(res.status).toBe(200);
    const opts = signInAnonymously.mock.calls[0][0] as { options: { data: Record<string, string> } };
    const { full_name, username } = opts.options.data;
    expect(full_name.startsWith('Dana')).toBe(true);
    expect(full_name.length).toBeLessThanOrEqual(40);
    expect(full_name).not.toMatch(/[\u0000-\u001f‮]/);
    expect(username).toMatch(/^dana[a-z0-9_]*-[a-z0-9]{6}$/);
    expect(profileUpsert).not.toHaveBeenCalled();
  });

  it('refuses a name that is only control characters or spaces', async () => {
    setup({ id: 'c1' });
    const res = await POST(req({ joinCode: 'ABC123', guestName: ' \u0007 ​ ' }));
    expect(res.status).toBe(401);
    expect(signInAnonymously).not.toHaveBeenCalled();
  });
});

describe('join route: membership write', () => {
  it('enrols through the service role, not the caller', async () => {
    mocked(getAuthedUser).mockResolvedValue({ id: 'student-1' });
    setup({ id: 'c1' });
    const res = await POST(req({ joinCode: 'ABC123' }));
    expect(res.status).toBe(200);
    expect(adminInsert).toHaveBeenCalledWith({ classroom_id: 'c1', student_id: 'student-1' });
    expect(requestInsert).not.toHaveBeenCalled();
  });

  it('answers the cap the database enforced as a full class', async () => {
    mocked(getAuthedUser).mockResolvedValue({ id: 'student-1' });
    setup({ id: 'c1' });
    adminInsert.mockResolvedValue({ error: { code: 'P0001', message: 'STUDENT_LIMIT_REACHED' } });
    const res = await POST(req({ joinCode: 'ABC123' }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'STUDENT_LIMIT_REACHED' });
  });

  it('treats a duplicate membership from a double tap as already joined', async () => {
    mocked(getAuthedUser).mockResolvedValue({ id: 'student-1' });
    setup({ id: 'c1' });
    adminInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key value' } });
    const res = await POST(req({ joinCode: 'ABC123' }));
    expect(res.status).toBe(200);
    expect((await res.json()).alreadyMember).toBe(true);
  });
});

describe('join route: code guessing', () => {
  it('lets a whole class on one school IP join', async () => {
    mocked(getAuthedUser).mockResolvedValue({ id: 'student-1' });
    setup({ id: 'c1' });
    for (let i = 0; i < 60; i++) {
      const res = await POST(req({ joinCode: 'ABC123' }, '203.0.113.7'));
      expect(res.status).toBe(200);
    }
  });

  it('throttles one IP that keeps missing codes', async () => {
    mocked(getAuthedUser).mockResolvedValue({ id: 'student-1' });
    setup(null);
    const statuses: number[] = [];
    for (let i = 0; i < 40; i++) {
      statuses.push((await POST(req({ joinCode: 'ZZZZZZ' }, '198.51.100.9'))).status);
    }
    expect(statuses.slice(0, 20).every((s) => s === 400)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});
