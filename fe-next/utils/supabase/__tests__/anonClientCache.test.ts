import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const createClientMock = vi.hoisted(() =>
  vi.fn((url: string, key: string, options?: unknown) => ({ url, key, options })),
);
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

import { getAnonClient } from '../anon';

describe('getAnonClient', () => {
  beforeEach(() => {
    createClientMock.mockClear();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key-a');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reuses one client across calls with the same configuration', () => {
    const first = getAnonClient();
    expect(getAnonClient()).toBe(first);
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it('never starts the auth refresh timer that pins a client in memory', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key-options');
    getAnonClient();
    expect(createClientMock.mock.calls[0][2]).toMatchObject({
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  });

  it('builds a new client when the anon key changes', () => {
    const first = getAnonClient();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key-b');
    expect(getAnonClient()).not.toBe(first);
  });

  it('returns null when the url or anon key is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    expect(getAnonClient()).toBeNull();
  });
});
