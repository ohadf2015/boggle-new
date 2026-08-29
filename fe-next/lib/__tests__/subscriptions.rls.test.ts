import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `canAddStudent` is the free-tier 30-student cap, and the only caller is the classroom-join
 * route — where the person being counted is, by definition, NOT yet a member of the
 * classroom and is not its teacher.
 *
 * Both of its reads ran on the request-scoped client, and RLS answers a non-member with
 * nothing:
 *
 *   - `classroom_memberships` SELECT is `auth.uid() = student_id OR is_classroom_owner(...)`,
 *     so the count came back 0 for a classroom that demonstrably has members. Verified live:
 *     a signed-in non-member counts 0 rows on a classroom holding 1. `currentCount` was
 *     therefore always 0 and the cap has never once fired.
 *   - `classrooms` SELECT only resolved because of a blanket
 *     `auth.uid() IS NOT NULL AND join_code IS NOT NULL` clause that also lets any signed-in
 *     user enumerate every classroom and join code in the database. That clause is dead
 *     weight — the join route resolves the code through the SECURITY DEFINER
 *     `lookup_classroom_by_join_code` RPC — but it cannot be dropped while this function
 *     leans on it.
 *
 * This is a capacity check the server performs ON BEHALF of the teacher, not a read the
 * joining student is entitled to make, so it belongs on the service-role client.
 */

const mockRequestClient = () => ({ from: vi.fn(() => ({ select: () => ({ eq: () => ({}) }) })) });

/**
 * Service-role client. `members` is the true membership count; `classroom` is the row the
 * teacher_id lookup resolves to.
 */
const mockAdminClient = (
  opts: { members?: number; classroom?: { teacher_id: string } | null; tier?: 'free' | 'pro' } = {}
) => {
  const { members = 0, classroom = { teacher_id: 'teacher-1' }, tier = null } = opts as never;
  return {
    from: vi.fn((table: string) => {
      if (table === 'classrooms') return {
        select: () => ({ eq: async () => ({ data: classroom ? [classroom] : [], error: null }) }),
      };
      if (table === 'classroom_memberships') return {
        select: () => ({ eq: async () => ({ count: members, error: null }) }),
      };
      if (table === 'subscriptions') return {
        select: () => ({
          eq: () => ({
            single: async () =>
              tier
                ? { data: { tier, status: 'active', current_period_end: null, cancel_at_period_end: false }, error: null }
                : { data: null, error: { message: 'no rows' } },
          }),
        }),
      };
      return {};
    }),
  };
};

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { canAddStudent, upsertSubscription, logSubscriptionEvent } from '../subscriptions';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

describe('canAddStudent counts through the service-role client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue(mockRequestClient());
  });

  it('sees the real membership count, not the zero RLS shows a non-member', async () => {
    (createAdminClient as any).mockReturnValue(mockAdminClient({ members: 30 }));

    const out = await canAddStudent('c-1');

    // 30 of 30 on the free tier — the cap must fire. On the request-scoped client the count
    // read 0 and this returned allowed:true forever.
    expect(out.currentCount).toBe(30);
    expect(out.allowed).toBe(false);
  });

  it('still admits a student when the classroom is under the cap', async () => {
    (createAdminClient as any).mockReturnValue(mockAdminClient({ members: 5 }));

    const out = await canAddStudent('c-1');

    expect(out.allowed).toBe(true);
    expect(out.currentCount).toBe(5);
  });

  it("honours the TEACHER's Pro plan even though the reader is the joining student", async () => {
    // `subscriptions` SELECT is own-row-only. Read on the request-scoped client, a student
    // joining a Pro teacher's class saw no subscription row at all, so the teacher silently
    // degraded to the free 30-student cap.
    (createAdminClient as any).mockReturnValue(mockAdminClient({ members: 200, tier: 'pro' }));

    const out = await canAddStudent('c-1');

    expect(out.allowed).toBe(true);
    expect(out.limit).toBeNull();
  });

  it('never reads classrooms or memberships on the request-scoped client', async () => {
    const request = mockRequestClient();
    (createClient as any).mockResolvedValue(request);
    (createAdminClient as any).mockReturnValue(mockAdminClient({ members: 1 }));

    await canAddStudent('c-1');

    const tablesRead = request.from.mock.calls.map((c) => c[0]);
    expect(tablesRead).not.toContain('classrooms');
    expect(tablesRead).not.toContain('classroom_memberships');
  });

  it('refuses rather than silently admitting when the service-role key is absent', async () => {
    (createAdminClient as any).mockReturnValue(null);

    const out = await canAddStudent('c-1');

    expect(out.allowed).toBe(false);
    expect(out.reason).toBeTruthy();
  });

  it('reports classroom-not-found when the id resolves to no row', async () => {
    (createAdminClient as any).mockReturnValue(mockAdminClient({ classroom: null }));

    const out = await canAddStudent('c-1');

    expect(out.allowed).toBe(false);
    expect(out.reason).toContain('not found');
  });
});

/**
 * Both writers are called only from the payment webhooks (Polar, LemonSqueezy), where there
 * is no user session — so the request-scoped client acts as `anon`.
 *
 * `subscriptions` grants writes to `service_role` only, so the upsert was refused by RLS and
 * threw. `subscription_events` only accepted the insert because its policy was mistakenly
 * granted to PUBLIC (the same policy that let anyone forge billing events); once that is
 * scoped to service_role, an anon-key insert fails too.
 */
describe('webhook writers use the service-role client', () => {
  const writeClient = () => {
    const insert = vi.fn(async () => ({ error: null }));
    const upsert = vi.fn(async () => ({ error: null }));
    return { insert, upsert, from: vi.fn(() => ({ insert, upsert })) };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts the subscription through the admin client, not the request client', async () => {
    const request = writeClient();
    const admin = writeClient();
    (createClient as any).mockResolvedValue(request);
    (createAdminClient as any).mockReturnValue(admin);

    await upsertSubscription({ userId: 'u-1', tier: 'pro', status: 'active' } as never);

    expect(admin.upsert).toHaveBeenCalled();
    expect(request.from).not.toHaveBeenCalled();
  });

  it('logs the subscription event through the admin client, not the request client', async () => {
    const request = writeClient();
    const admin = writeClient();
    (createClient as any).mockResolvedValue(request);
    (createAdminClient as any).mockReturnValue(admin);

    await logSubscriptionEvent({ userId: 'u-1', eventType: 'created', payload: {} });

    expect(admin.insert).toHaveBeenCalled();
    expect(request.from).not.toHaveBeenCalled();
  });
});
