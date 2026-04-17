import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase client factory
const selectMock = vi.fn();
const eqMock = vi.fn();
const singleMock = vi.fn();
const maybeSingleMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: fromMock,
  }),
}));

vi.mock('../logger', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

function setupChain(data: unknown, error: unknown = null) {
  singleMock.mockResolvedValue({ data, error });
  maybeSingleMock.mockResolvedValue({ data, error });
  eqMock.mockReturnValue({ single: singleMock, maybeSingle: maybeSingleMock, eq: eqMock });
  selectMock.mockReturnValue({ eq: eqMock });
  fromMock.mockReturnValue({
    select: selectMock,
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('featureFlags cache', () => {
  it('caches getFeatureFlag result across calls (cache hit)', async () => {
    setupChain({
      flag_name: 'test_flag',
      enabled: true,
      admin_only: false,
      rollout_percentage: 100,
      created_at: '2026-01-01',
    });

    const { getFeatureFlag, __clearFlagCache } = await import('../featureFlags');
    __clearFlagCache();

    await getFeatureFlag('test_flag');
    await getFeatureFlag('test_flag');
    await getFeatureFlag('test_flag');

    expect(singleMock.mock.calls.length + maybeSingleMock.mock.calls.length).toBe(1);
  });

  it('expires cache after TTL', async () => {
    vi.useFakeTimers();
    setupChain({
      flag_name: 'ttl_flag',
      enabled: true,
      admin_only: false,
      rollout_percentage: 50,
      created_at: '2026-01-01',
    });

    const { getFeatureFlag, __clearFlagCache, FLAG_CACHE_TTL_MS } = await import('../featureFlags');
    __clearFlagCache();

    await getFeatureFlag('ttl_flag');
    vi.advanceTimersByTime(FLAG_CACHE_TTL_MS + 1000);
    await getFeatureFlag('ttl_flag');

    expect(singleMock.mock.calls.length + maybeSingleMock.mock.calls.length).toBe(2);
  });

  it('invalidates cache on setFeatureFlag', async () => {
    setupChain({
      flag_name: 'write_flag',
      enabled: true,
      admin_only: false,
      rollout_percentage: 100,
      created_at: '2026-01-01',
    });

    const { getFeatureFlag, setFeatureFlag, __clearFlagCache } = await import('../featureFlags');
    __clearFlagCache();

    await getFeatureFlag('write_flag');
    await setFeatureFlag('write_flag', { enabled: false });
    await getFeatureFlag('write_flag');

    expect(singleMock.mock.calls.length + maybeSingleMock.mock.calls.length).toBe(2);
  });

  it('invalidates cache on deleteFeatureFlag', async () => {
    setupChain({
      flag_name: 'del_flag',
      enabled: true,
      admin_only: false,
      rollout_percentage: 100,
      created_at: '2026-01-01',
    });

    const { getFeatureFlag, deleteFeatureFlag, __clearFlagCache } = await import('../featureFlags');
    __clearFlagCache();

    await getFeatureFlag('del_flag');
    await deleteFeatureFlag('del_flag');
    await getFeatureFlag('del_flag');

    expect(singleMock.mock.calls.length + maybeSingleMock.mock.calls.length).toBe(2);
  });

  it('caches null results (missing flags) to prevent repeated lookups', async () => {
    // maybeSingle returns {data:null, error:null} for missing rows
    setupChain(null, null);

    const { getFeatureFlag, __clearFlagCache } = await import('../featureFlags');
    __clearFlagCache();

    await getFeatureFlag('missing_flag');
    await getFeatureFlag('missing_flag');

    expect(singleMock.mock.calls.length + maybeSingleMock.mock.calls.length).toBe(1);
  });
});
