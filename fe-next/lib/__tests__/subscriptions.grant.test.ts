import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkTeacherSubscription } from '../subscriptions';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));

const DAY = 24 * 60 * 60 * 1000;

function clientReturning(row: Record<string, unknown> | null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => (row ? { data: row, error: null } : { data: null, error: { code: 'PGRST116' } })),
        })),
      })),
    })),
  };
}

/**
 * A complimentary grant lives in the same `subscriptions` row as a paid plan, so every
 * has_pro reader keeps working. The one difference: nothing renews a grant, so its
 * deadline is enforced here and a paying teacher's renewal date is not.
 */
describe('checkTeacherSubscription with admin grants', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.mocked(createAdminClient).mockReset();
  });

  it('a live grant is Pro and reports where it came from', async () => {
    vi.mocked(createAdminClient).mockReturnValue(clientReturning({
      tier: 'pro', status: 'active', source: 'admin_grant',
      current_period_end: new Date(Date.now() + 200 * DAY).toISOString(), cancel_at_period_end: false,
    }) as never);
    const s = await checkTeacherSubscription('u1');
    expect(s.has_pro).toBe(true);
    expect(s.source).toBe('admin_grant');
    expect(s.classes_limit).toBeNull();
  });

  it('a grant past its deadline falls back to free limits', async () => {
    vi.mocked(createAdminClient).mockReturnValue(clientReturning({
      tier: 'pro', status: 'active', source: 'admin_grant',
      current_period_end: new Date(Date.now() - DAY).toISOString(), cancel_at_period_end: false,
    }) as never);
    const s = await checkTeacherSubscription('u1');
    expect(s.has_pro).toBe(false);
    expect(s.classes_limit).not.toBeNull();
    expect(s.source).toBe('admin_grant');
  });

  it('a provider subscription whose period end is in the past stays Pro (webhook owns it)', async () => {
    vi.mocked(createAdminClient).mockReturnValue(clientReturning({
      tier: 'pro', status: 'active', source: 'polar',
      current_period_end: new Date(Date.now() - DAY).toISOString(), cancel_at_period_end: false,
    }) as never);
    const s = await checkTeacherSubscription('u1');
    expect(s.has_pro).toBe(true);
    expect(s.source).toBe('polar');
  });

  it('a row without the source column is treated as a provider row', async () => {
    vi.mocked(createAdminClient).mockReturnValue(clientReturning({
      tier: 'pro', status: 'active', current_period_end: null, cancel_at_period_end: false,
    }) as never);
    const s = await checkTeacherSubscription('u1');
    expect(s.has_pro).toBe(true);
    expect(s.source).toBe('polar');
  });
});
