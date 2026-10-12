import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const createClientMock = vi.hoisted(() => vi.fn((url: string, key: string) => ({ url, key })));
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

import { createAdminClient, requireAdminClient } from '../admin';

describe('createAdminClient', () => {
  beforeEach(() => {
    createClientMock.mockClear();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key-a');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reuses one client across calls with the same configuration', () => {
    const first = createAdminClient();
    const second = createAdminClient();
    expect(second).toBe(first);
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it('builds a new client when the service key changes', () => {
    const first = createAdminClient();
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key-b');
    const second = createAdminClient();
    expect(second).not.toBe(first);
    expect(second).toMatchObject({ key: 'service-key-b' });
  });

  it('returns null for an unset or placeholder key', () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'placeholder');
    expect(createAdminClient()).toBeNull();
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect(createAdminClient()).toBeNull();
  });

  it('requireAdminClient returns the shared client, and throws when unconfigured', () => {
    expect(requireAdminClient()).toBe(createAdminClient());
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect(() => requireAdminClient()).toThrow(/service role/i);
  });
});
