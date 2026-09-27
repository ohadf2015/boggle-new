import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertSubscription } from '../subscriptions';
import { createAdminClient } from '@/utils/supabase/admin';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));

/**
 * The Polar webhook is the only writer of paid subscriptions. It now stamps
 * `source` / `grant_id`, columns added by 20260905120000. The migration
 * pipeline (supabase-migrations.yml) has been failing on an empty access token
 * since July, so the app can be deployed ahead of its schema. A webhook that
 * throws on an unknown column would silently stop recording every payment —
 * so on that specific error, log loudly and write the row the old way.
 */
const MISSING_COLUMN = { code: 'PGRST204', message: "Could not find the 'source' column of 'subscriptions' in the schema cache" };

function adminWithUpsert(results: Array<{ error: unknown }>) {
  const upsert = vi.fn();
  results.forEach((r) => upsert.mockResolvedValueOnce(r));
  return { upsert, client: { from: () => ({ upsert }) } };
}

const args = { userId: 'u1', tier: 'pro' as const, status: 'active' as const, providerSubscriptionId: 'sub_1' };

describe('upsertSubscription — schema-behind fallback', () => {
  beforeEach(() => vi.mocked(createAdminClient).mockReset());

  it('writes source/grant_id when the schema has them', async () => {
    const { upsert, client } = adminWithUpsert([{ error: null }]);
    vi.mocked(createAdminClient).mockReturnValue(client as never);
    await upsertSubscription(args);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0]).toMatchObject({ source: 'polar', grant_id: null });
  });

  it('retries without the new columns when the DB does not know them, and says so', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { upsert, client } = adminWithUpsert([{ error: MISSING_COLUMN }, { error: null }]);
    vi.mocked(createAdminClient).mockReturnValue(client as never);
    await expect(upsertSubscription(args)).resolves.toBeUndefined();
    expect(upsert).toHaveBeenCalledTimes(2);
    const retry = upsert.mock.calls[1][0];
    expect(retry).not.toHaveProperty('source');
    expect(retry).not.toHaveProperty('grant_id');
    expect(retry).toMatchObject({ user_id: 'u1', tier: 'pro', status: 'active' });
    expect(err).toHaveBeenCalledWith(expect.stringMatching(/migration/i), expect.anything());
    err.mockRestore();
  });

  it('still throws on any other error — a real failure must not be swallowed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { upsert, client } = adminWithUpsert([{ error: { code: '42501', message: 'permission denied' } }]);
    vi.mocked(createAdminClient).mockReturnValue(client as never);
    await expect(upsertSubscription(args)).rejects.toBeTruthy();
    expect(upsert).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});
