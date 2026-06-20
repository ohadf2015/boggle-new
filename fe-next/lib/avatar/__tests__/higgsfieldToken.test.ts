import { vi, type Mock, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: vi.fn() }));

import { getHiggsfieldToken, clearHiggsfieldTokenCache } from '../higgsfieldToken';
import { getSupabaseAdmin } from '@/lib/admin/server';

const mockGetAdmin = getSupabaseAdmin as Mock;

function supabaseReturning(value: string | null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: value === null ? null : { value }, error: null })),
        })),
      })),
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearHiggsfieldTokenCache();
  delete process.env.HIGGSFIELD_TOKEN;
});
afterEach(() => clearHiggsfieldTokenCache());

describe('getHiggsfieldToken', () => {
  it('prefers the DB value', async () => {
    mockGetAdmin.mockReturnValue(supabaseReturning('db-token'));
    expect(await getHiggsfieldToken(1000)).toBe('db-token');
  });

  it('falls back to env when DB has no row', async () => {
    mockGetAdmin.mockReturnValue(supabaseReturning(null));
    process.env.HIGGSFIELD_TOKEN = 'env-token';
    expect(await getHiggsfieldToken(1000)).toBe('env-token');
  });

  it('caches within the TTL (no second DB read)', async () => {
    const client = supabaseReturning('db-token');
    mockGetAdmin.mockReturnValue(client);
    await getHiggsfieldToken(1000);
    await getHiggsfieldToken(1000 + 5_000); // within 30s TTL
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it('re-reads after the TTL expires', async () => {
    const client = supabaseReturning('db-token');
    mockGetAdmin.mockReturnValue(client);
    await getHiggsfieldToken(1000);
    await getHiggsfieldToken(1000 + 40_000); // past 30s TTL
    expect(client.from).toHaveBeenCalledTimes(2);
  });

  it('returns null when neither DB nor env has a token', async () => {
    mockGetAdmin.mockReturnValue(supabaseReturning(null));
    expect(await getHiggsfieldToken(1000)).toBeNull();
  });
});
