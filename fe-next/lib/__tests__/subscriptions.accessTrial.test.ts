import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';

const h = vi.hoisted(() => ({
  tables: {} as Record<string, { data?: unknown; count?: number; error: null | { message: string } }>,
}));

function chain(table: string) {
  const result = h.tables[table] ?? { data: null, count: 0, error: null };
  const c: Record<string, unknown> = {};
  const self = () => c;
  for (const m of ['select', 'eq', 'neq', 'order', 'limit', 'in']) c[m] = self;
  c.single = async () => ({ data: result.data ?? null, error: result.data ? null : { message: 'none' } });
  c.maybeSingle = async () => ({ data: result.data ?? null, error: result.error });
  c.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: result.data ?? null, count: result.count ?? 0, error: result.error }).then(resolve);
  return c;
}

const client = { from: (t: string) => chain(t) };
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => client }));
vi.mock('@/utils/supabase/server', () => ({ createClient: async () => client }));

import { canCreateClass, canAddStudent } from '../subscriptions';

const DAY = 86_400_000;
const freeRow = { tier: 'free', status: 'active', current_period_end: null, cancel_at_period_end: false };

describe('free-tier caps honour the live access trial, like every server Pro read', () => {
  beforeEach(() => {
    h.tables = {
      subscriptions: { data: freeRow, error: null },
      classrooms: { data: [{ teacher_id: 't1' }], count: FREE_TIER_LIMITS.classes, error: null },
      classroom_memberships: { count: FREE_TIER_LIMITS.studentsPerClass, error: null },
    };
  });

  it('lets a teacher on a live access trial create a class past the free cap', async () => {
    h.tables.teacher_access_requests = { data: { trial_expires_at: new Date(Date.now() + 5 * DAY).toISOString() }, error: null };
    const r = await canCreateClass('t1');
    expect(r.allowed).toBe(true);
    expect(r.limit).toBeNull();
  });

  it('lets a teacher on a live access trial seat a student past the free cap', async () => {
    h.tables.teacher_access_requests = { data: { trial_expires_at: new Date(Date.now() + 5 * DAY).toISOString() }, error: null };
    const r = await canAddStudent('c1');
    expect(r.allowed).toBe(true);
    expect(r.limit).toBeNull();
  });

  it('blocks again once the access trial has ended (existing classes are kept, new ones refused)', async () => {
    h.tables.teacher_access_requests = { data: { trial_expires_at: new Date(Date.now() - DAY).toISOString() }, error: null };
    const r = await canCreateClass('t1');
    expect(r.allowed).toBe(false);
    expect(r.currentCount).toBe(FREE_TIER_LIMITS.classes);
  });
});
