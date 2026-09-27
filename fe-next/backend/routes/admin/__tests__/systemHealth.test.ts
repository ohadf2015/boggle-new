/**
 * Tests for system health endpoint
 */

const { mockPing, mockFrom } = vi.hoisted(() => {
  const mockPing = vi.fn();
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
  });
  return { mockPing, mockFrom };
});

vi.mock('../../../redis/connection', () => ({
  getRedisClient: () => ({ ping: mockPing }),
  isRedisAvailable: () => true,
  getRedisHealth: () => ({ available: true, lastCheck: Date.now(), stale: false }),
  getRedisMetrics: vi.fn().mockResolvedValue({ available: true, keyCount: 42 }),
}));

vi.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => ({ from: mockFrom }),
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import { checkSystemHealth } from '../systemHealthRoutes';

describe('systemHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return ok when all systems are healthy', async () => {
    mockPing.mockResolvedValue('PONG');
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ error: null, count: 100 }),
    });

    const result = await checkSystemHealth();

    expect(result.redis).toBe('ok');
    expect(result.database).toBe('ok');
    expect(result.process.heapMB).toBeGreaterThan(0);
    expect(result.process.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('should return down when Redis fails', async () => {
    mockPing.mockRejectedValue(new Error('Connection refused'));
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ error: null, count: 100 }),
    });

    const result = await checkSystemHealth();

    expect(result.redis).toBe('down');
    expect(result.database).toBe('ok');
  });

  it('should return down when DB fails', async () => {
    mockPing.mockResolvedValue('PONG');
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ error: { message: 'timeout' } }),
    });

    const result = await checkSystemHealth();

    expect(result.redis).toBe('ok');
    expect(result.database).toBe('down');
  });
});
