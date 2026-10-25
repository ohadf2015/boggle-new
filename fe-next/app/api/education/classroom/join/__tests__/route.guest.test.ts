import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Guest path of the classroom-join route. The guest's profile row comes from the
 * handle_new_user trigger reading the sign-in metadata (full_name, username), the
 * same way signInAsGuestStudent does on the client, so the route writes no profile.
 */

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({ from: () => ({ insert: async () => ({ error: null }) }) }),
}));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn(async () => null) }));
vi.mock('@/lib/subscriptions', () => ({
  canAddStudent: vi.fn(async () => ({ allowed: true, currentCount: 0, limit: 30 })),
}));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';

const GUEST_ID = 'guest-uid-1';

const makeClient = () => ({
  auth: { signInAnonymously: vi.fn(async () => ({ data: { user: { id: GUEST_ID } }, error: null })) },
  rpc: vi.fn(async () => ({ data: [{ id: 'c-1', teacher_id: 't-1' }], error: null })),
  from: vi.fn(() => ({ upsert: vi.fn() })),
});

const req = (body: unknown) =>
  new Request('http://t/api/education/classroom/join', { method: 'POST', body: JSON.stringify(body) }) as never;

describe('POST /api/education/classroom/join — guest path', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes the typed name to the sign-in metadata the profile trigger reads', async () => {
    const client = makeClient();
    (createClient as any).mockResolvedValue(client);

    await POST(req({ joinCode: 'ABC123', guestName: 'Dana' }));

    expect(client.auth.signInAnonymously).toHaveBeenCalledWith({
      options: { data: expect.objectContaining({ full_name: 'Dana' }) },
    });
  });

  /**
   * The route once read the body twice (guest name, then join code). A Request body
   * is single-use, so the second read threw and the guest got a 400 after an
   * anonymous user already existed.
   */
  it('joins a guest instead of 400ing on a body it already consumed', async () => {
    (createClient as any).mockResolvedValue(makeClient());

    const res = await POST(req({ joinCode: 'ABC123', guestName: 'Dana' }));

    expect(res.status).toBe(200);
  });

  it('500s and enrols nobody when the guest session cannot be created', async () => {
    const client = makeClient();
    client.auth.signInAnonymously.mockResolvedValue({ data: { user: null }, error: { message: 'disabled' } } as never);
    (createClient as any).mockResolvedValue(client);

    const res = await POST(req({ joinCode: 'ABC123', guestName: 'Dana' }));

    expect(res.status).toBe(500);
  });
});
