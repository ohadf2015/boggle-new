import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The guest path of the classroom-join route creates an anonymous auth user and then writes
 * them a profile so the teacher's roster has a name to show.
 *
 * That write set `is_guest: true` — a column `public.profiles` does not have. PostgREST
 * rejects the whole upsert ("Could not find the 'is_guest' column of 'profiles' in the schema
 * cache"), and the route only logged it and carried on, so the guest joined with NO profile
 * row at all: a membership pointing at a user who renders nameless and faceless on every
 * teacher screen.
 *
 * It went unnoticed because the statement before it — signInAnonymously() — was failing
 * first: anonymous sign-ins were disabled on the project, so the route 500'd before ever
 * reaching this line. With anonymous auth now enabled, this became the next thing in the way.
 *
 * Guest-ness needs no column of our own: Supabase already flags it as
 * `auth.users.is_anonymous`, which is what `signInAnonymously()` sets.
 */

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn(async () => null) }));
vi.mock('@/lib/subscriptions', () => ({
  canAddStudent: vi.fn(async () => ({ allowed: true, currentCount: 0, limit: 30 })),
}));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';

const GUEST_ID = 'guest-uid-1';

/**
 * Stands in for PostgREST: an upsert naming a column outside `columns` fails the way the
 * live database fails, rather than silently accepting anything the route sends.
 */
const makeClient = (columns: string[]) => {
  const upsert = vi.fn((row: Record<string, unknown>) => {
    const unknownColumn = Object.keys(row).find((c) => !columns.includes(c));
    return Promise.resolve(
      unknownColumn
        ? { error: { message: `Could not find the '${unknownColumn}' column of 'profiles' in the schema cache` } }
        : { error: null }
    );
  });

  return {
    upsert,
    auth: { signInAnonymously: vi.fn(async () => ({ data: { user: { id: GUEST_ID } }, error: null })) },
    rpc: vi.fn(async () => ({ data: [{ id: 'c-1', teacher_id: 't-1' }], error: null })),
    from: vi.fn((table: string) => {
      if (table === 'profiles') return { upsert };
      if (table === 'classroom_memberships') return {
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
        insert: async () => ({ error: null }),
      };
      return {};
    }),
  };
};

const PROFILE_COLUMNS = ['id', 'username', 'display_name', 'user_role'];

const req = (body: unknown) =>
  new Request('http://t/api/education/classroom/join', { method: 'POST', body: JSON.stringify(body) }) as never;

describe('POST /api/education/classroom/join — guest path', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes a guest profile the profiles table can actually accept', async () => {
    const client = makeClient(PROFILE_COLUMNS);
    (createClient as any).mockResolvedValue(client);

    await POST(req({ joinCode: 'ABC123', guestName: 'Dana' }));

    expect(client.upsert).toHaveBeenCalled();
    const row = client.upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(row).toMatchObject({ id: GUEST_ID, username: 'Dana' });
    // Guest-ness lives on auth.users.is_anonymous; profiles has no such column.
    expect(row).not.toHaveProperty('is_guest');
  });

  it('does not join a guest whose profile write failed, leaving a nameless member', async () => {
    // Only `id` accepted, so writing a username fails — stands for any schema drift.
    const client = makeClient(['id']);
    (createClient as any).mockResolvedValue(client);

    const res = await POST(req({ joinCode: 'ABC123', guestName: 'Dana' }));

    expect(res.status).toBe(500);
  });
});
