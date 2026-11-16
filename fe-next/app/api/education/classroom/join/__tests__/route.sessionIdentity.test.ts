/**
 * A guest join mints an anonymous user in the browser, then POSTs. If that
 * session is not what the route uses, the route mints a second auth user and
 * writes the membership to them. /student then reads the browser user and
 * shows "no classroom".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn(async () => null) }));
vi.mock('@/lib/subscriptions', () => ({ canAddStudent: vi.fn(async () => ({ allowed: true, currentCount: 0, limit: 50 })) }));
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

const mocked = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

let signInAnonymously: ReturnType<typeof vi.fn>;
let adminInsert: ReturnType<typeof vi.fn>;

function setup() {
  signInAnonymously = vi.fn(async () => ({ data: { user: { id: 'server-minted' }, session: null }, error: null }));
  adminInsert = vi.fn(async () => ({ error: null }));
  mocked(createClient).mockResolvedValue({
    auth: { signInAnonymously },
    rpc: vi.fn(async () => ({ data: [{ id: 'class-1', teacher_id: 'teacher-1' }], error: null })),
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    })),
  });
  mocked(createAdminClient).mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'classroom_memberships') return { insert: adminInsert, select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) };
      return { update: () => ({ eq: async () => ({ error: null }) }), select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { teacher_id: 'teacher-1' } }) }) }) };
    }),
    auth: { admin: { updateUserById: vi.fn(async () => ({ error: null })) } },
  });
}

const req = (headers: Record<string, string> = {}) =>
  new Request('https://www.lexiclash.live/api/education/classroom/join', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9', ...headers },
    body: JSON.stringify({ joinCode: 'ABC123', guestName: 'Maya' }),
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  setup();
});

describe('POST /api/education/classroom/join — one identity', () => {
  it('does not mint a second user when the browser already presented a session that did not verify', async () => {
    mocked(getAuthedUser).mockResolvedValue(null);

    const res = await POST(req({ authorization: 'Bearer browser-session' }));

    expect(res.status).toBe(401);
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(adminInsert).not.toHaveBeenCalled();
  });

  it('writes the membership to the verified browser user and does not mint', async () => {
    mocked(getAuthedUser).mockResolvedValue({ id: 'browser-guest' });

    const res = await POST(req({ authorization: 'Bearer browser-session' }));

    expect(res.status).toBe(200);
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(adminInsert).toHaveBeenCalledWith(expect.objectContaining({
      classroom_id: 'class-1',
      student_id: 'browser-guest',
    }));
  });
});
