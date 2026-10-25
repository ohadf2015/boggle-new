import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertSubscription } from '../subscriptions';
import { createAdminClient } from '@/utils/supabase/admin';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));

function admin(existing: { data: unknown; error: unknown }, upsertResults: Array<{ error: unknown }> = [{ error: null }]) {
  const upsert = vi.fn();
  upsertResults.forEach((r) => upsert.mockResolvedValueOnce(r));
  const maybeSingle = vi.fn().mockResolvedValue(existing);
  const select = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) });
  return { upsert, select, client: { from: () => ({ upsert, select }) } };
}

const revoked = { userId: 'u1', tier: 'free' as const, status: 'canceled' as const, providerSubscriptionId: 'sub_1' };

describe('upsertSubscription — an older provider event never overwrites a newer one', () => {
  beforeEach(() => vi.mocked(createAdminClient).mockReset());

  it('skips a delayed subscription.updated that is older than the revoke already on the row', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { upsert, client } = admin({ data: { provider_event_at: '2026-10-09T11:00:00Z' }, error: null });
    vi.mocked(createAdminClient).mockReturnValue(client as never);
    await upsertSubscription({ userId: 'u1', tier: 'pro', status: 'active', eventAt: '2026-10-09T10:00:00Z' });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('writes a newer event and records its time', async () => {
    const { upsert, client } = admin({ data: { provider_event_at: '2026-10-09T10:00:00Z' }, error: null });
    vi.mocked(createAdminClient).mockReturnValue(client as never);
    await upsertSubscription({ ...revoked, eventAt: '2026-10-09T11:00:00Z' });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0]).toMatchObject({ tier: 'free', provider_event_at: '2026-10-09T11:00:00Z' });
  });

  it('still writes when the ordering column is not migrated yet, and the legacy retry drops it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const missing = { code: '42703', message: 'column subscriptions.provider_event_at does not exist' };
    const { upsert, client } = admin({ data: null, error: missing }, [{ error: { code: 'PGRST204', message: "Could not find the 'provider_event_at' column" } }, { error: null }]);
    vi.mocked(createAdminClient).mockReturnValue(client as never);
    await upsertSubscription({ ...revoked, eventAt: '2026-10-09T11:00:00Z' });
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[1][0]).not.toHaveProperty('provider_event_at');
  });

  it('leaves the column alone when the caller has no event time', async () => {
    const { upsert, select, client } = admin({ data: null, error: null });
    vi.mocked(createAdminClient).mockReturnValue(client as never);
    await upsertSubscription(revoked);
    expect(select).not.toHaveBeenCalled();
    expect(upsert.mock.calls[0][0]).not.toHaveProperty('provider_event_at');
  });
});
