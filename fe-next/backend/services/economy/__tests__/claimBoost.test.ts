import { describe, it, expect, beforeEach, vi } from 'vitest';
import { claimBoostServer } from '../claimBoost';

const { mockRpc, mockSupabase, mockLogger, clientRef } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockSupabase = { rpc: mockRpc };
  const clientRef: { current: typeof mockSupabase | null } = { current: mockSupabase };
  const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { mockRpc, mockSupabase, mockLogger, clientRef };
});

vi.mock('../../../modules/supabase/client', () => ({
  getSupabase: () => clientRef.current,
}));
vi.mock('../../../utils/logger', () => ({ __esModule: true, default: mockLogger }));

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockReset();
  clientRef.current = mockSupabase;
  process.env.BOOST_TOKEN_SECRET = 'test-secret';
});

describe('claimBoostServer', () => {
  it('returns success + token on RPC success', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ success: true, remaining: 4, error_message: null }], error: null });
    const result = await claimBoostServer('user-1', 'sess-1', 'hint');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.token).toMatch(/^b1\.sess-1\.hint\.\d+\./);
  });

  it('forwards RPC error_message as result.error', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ success: false, remaining: 0, error_message: 'cap_reached' }], error: null });
    const result = await claimBoostServer('user-1', 'sess-1', 'hint');
    expect(result.success).toBe(false);
    expect(result.error).toBe('cap_reached');
    expect(result.token).toBeUndefined();
  });

  it('returns rpc_failed on supabase error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });
    const r = await claimBoostServer('user-1', 'sess-1', 'hint');
    expect(r.success).toBe(false);
    expect(r.error).toBe('rpc_failed');
  });

  it('returns rpc_failed when rpc throws', async () => {
    mockRpc.mockRejectedValueOnce(new Error('boom'));
    const r = await claimBoostServer('user-1', 'sess-1', 'hint');
    expect(r.success).toBe(false);
    expect(r.error).toBe('rpc_failed');
  });

  it('returns no_supabase when client unavailable', async () => {
    clientRef.current = null;
    const r = await claimBoostServer('user-1', 'sess-1', 'hint');
    expect(r.success).toBe(false);
    expect(r.error).toBe('no_supabase');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('rejects unknown boost type without RPC call', async () => {
    const r = await claimBoostServer('user-1', 'sess-1', 'sabotage' as never);
    expect(r.success).toBe(false);
    expect(r.error).toBe('invalid_type');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
