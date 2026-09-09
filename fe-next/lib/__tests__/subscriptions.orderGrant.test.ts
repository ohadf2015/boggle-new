import { describe, it, expect, vi, beforeEach } from 'vitest';
import { grantProFromOrder } from '../subscriptions';
import { createAdminClient } from '@/utils/supabase/admin';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));

/**
 * 2026-09-09 production incident — the first paying Teacher Pro (order of
 * 2026-09-09T00:50Z): Polar delivered `subscription.active` (which stamped
 * `current_period_end` and the provider subscription id) and then
 * `order.created` 1.5s later. The order handler ran a FULL upsert with
 * `currentPeriodEnd: undefined → null` and no providerSubscriptionId, wiping
 * both fields the subscription event had just written. The row the paying
 * teacher's dashboard read had no renewal date and no subscription id.
 *
 * Rule under test: an order event may never overwrite provider-owned fields.
 * - No row (or an admin grant) → full belt-and-braces upsert, as before.
 * - A provider-owned row (source polar/lemon_squeezy, or NULL source on a
 *   pre-column row) → stamp ONLY the order id.
 */

function adminClient({ existing }: { existing: Record<string, unknown> | null }) {
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: existing, error: null });
  const select = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) });
  const client = { from: vi.fn().mockReturnValue({ select, update, upsert }) };
  return { client, update, upsert, select };
}

const polarRow = { tier: 'pro', status: 'active', source: 'polar', current_period_end: '2026-10-09T00:00:00Z' };

describe('grantProFromOrder — order events must not wipe provider fields', () => {
  beforeEach(() => vi.mocked(createAdminClient).mockReset());

  it('full belt-and-braces upsert when the user has no subscription row', async () => {
    const { client, upsert, update } = adminClient({ existing: null });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    await grantProFromOrder({ userId: 'u1', providerOrderId: 'ord_1' });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', tier: 'pro', status: 'active', lemon_squeezy_order_id: 'ord_1' }),
      expect.anything()
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('stamps ONLY the order id when a provider subscription row exists', async () => {
    const { client, upsert, update } = adminClient({ existing: polarRow });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    await grantProFromOrder({ userId: 'u1', providerOrderId: 'ord_1' });

    expect(upsert).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({ lemon_squeezy_order_id: 'ord_1' });
  });

  it('treats a pre-source-column provider row (source NULL) as provider-owned', async () => {
    const { client, upsert, update } = adminClient({ existing: { ...polarRow, source: null } });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    await grantProFromOrder({ userId: 'u1', providerOrderId: 'ord_1' });

    expect(upsert).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });

  it('full upsert replaces an admin grant — a payment beats a gift', async () => {
    const { client, upsert, update } = adminClient({ existing: { ...polarRow, source: 'admin_grant' } });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    await grantProFromOrder({ userId: 'u1', providerOrderId: 'ord_1' });

    expect(update).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', tier: 'pro', status: 'active', source: 'polar', grant_id: null }),
      expect.anything()
    );
  });
});
