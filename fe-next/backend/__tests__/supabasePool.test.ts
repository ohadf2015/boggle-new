import { getPooledSupabaseClient, checkPoolHealth } from '../db/supabasePool';

// Mock createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: [{ id: '1' }], error: null })),
      })),
    })),
  })),
}));

describe('supabasePool', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('creates a pooled client with correct config', () => {
    const client = getPooledSupabaseClient();
    expect(client).toBeDefined();
    expect(client.from).toBeDefined();
  });

  it('returns same instance on subsequent calls (singleton)', () => {
    const client1 = getPooledSupabaseClient();
    const client2 = getPooledSupabaseClient();
    expect(client1).toBe(client2);
  });

  it('checkPoolHealth returns ok when query succeeds', async () => {
    const result = await checkPoolHealth();
    expect(result.ok).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
