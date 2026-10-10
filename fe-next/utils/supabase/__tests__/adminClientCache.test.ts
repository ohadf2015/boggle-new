import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const createClientMock = vi.hoisted(() => vi.fn((url: string, key: string) => ({ url, key })));
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

import { createAdminClient } from '../admin';

describe('createAdminClient', () => {
  const env = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };

  beforeEach(() => {
    createClientMock.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proj.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key-a';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = env.url;
    process.env.SUPABASE_SERVICE_ROLE_KEY = env.key;
  });

  it('reuses one client across calls with the same configuration', () => {
    const first = createAdminClient();
    const second = createAdminClient();
    expect(second).toBe(first);
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it('builds a new client when the service key changes', () => {
    const first = createAdminClient();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key-b';
    const second = createAdminClient();
    expect(second).not.toBe(first);
    expect(second).toMatchObject({ key: 'service-key-b' });
  });

  it('returns null for an unset or placeholder key', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder';
    expect(createAdminClient()).toBeNull();
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(createAdminClient()).toBeNull();
  });
});
