import { describe, it, expect, vi, beforeEach } from 'vitest';
import { grantProFromCheckout } from '../subscriptions';
import { createAdminClient } from '@/utils/supabase/admin';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));

function adminClient({ existing }: { existing: Record<string, unknown> | null }) {
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: existing, error: null });
  const select = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) });
  const client = { from: vi.fn().mockReturnValue({ select, update, upsert }) };
  return { client, update, upsert };
}

const polarRow = {
  tier: 'pro',
  status: 'active',
  source: 'polar',
  current_period_end: '2026-10-09T00:00:00Z',
  lemon_squeezy_subscription_id: 'sub_existing',
};

describe('grantProFromCheckout — checkout completion must not wipe provider fields', () => {
  beforeEach(() => vi.mocked(createAdminClient).mockReset());

  it('full upsert grants Pro when the teacher has no subscription row', async () => {
    const { client, upsert, update } = adminClient({ existing: null });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    await grantProFromCheckout({
      userId: 'u1',
      status: 'active',
      providerSubscriptionId: 'sub_9',
      providerProductId: 'prod-pro',
    });

    expect(update).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        tier: 'pro',
        status: 'active',
        source: 'polar',
        lemon_squeezy_subscription_id: 'sub_9',
        lemon_squeezy_variant_id: 'prod-pro',
      }),
      expect.anything(),
    );
  });

  it('does not upsert over a provider row that already has a renewal date', async () => {
    const { client, upsert, update } = adminClient({ existing: polarRow });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    await grantProFromCheckout({
      userId: 'u1',
      providerSubscriptionId: 'sub_other',
      currentPeriodEnd: null,
    });

    expect(upsert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('stamps a missing subscription id without nulling the period end', async () => {
    const { client, upsert, update } = adminClient({
      existing: { ...polarRow, lemon_squeezy_subscription_id: null },
    });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    await grantProFromCheckout({
      userId: 'u1',
      providerSubscriptionId: 'sub_9',
      currentPeriodEnd: null,
    });

    expect(upsert).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({ lemon_squeezy_subscription_id: 'sub_9' });
  });
});
