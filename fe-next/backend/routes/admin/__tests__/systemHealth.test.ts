/**
 * Tests for system health endpoint
 */

const mockPing = jest.fn();
const mockFrom = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnThis(),
});

jest.mock('../../../redis/connection', () => ({
  getRedisClient: () => ({ ping: mockPing }),
  isRedisAvailable: () => true,
  getRedisHealth: () => ({ available: true, lastCheck: Date.now(), stale: false }),
  getRedisMetrics: jest.fn().mockResolvedValue({ available: true, keyCount: 42 }),
}));

jest.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => ({ from: mockFrom }),
}));

import { checkSystemHealth } from '../systemHealthRoutes';

describe('systemHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return ok when all systems are healthy', async () => {
    mockPing.mockResolvedValue('PONG');
    mockFrom.mockReturnValue({
      select: jest.fn().mockResolvedValue({ error: null, count: 100 }),
    });

    const result = await checkSystemHealth();

    expect(result.redis).toBe('ok');
    expect(result.database).toBe('ok');
    expect(result.process.heapMB).toBeGreaterThan(0);
    expect(result.process.uptimeSeconds).toBeGreaterThan(0);
  });

  it('should return down when Redis fails', async () => {
    mockPing.mockRejectedValue(new Error('Connection refused'));
    mockFrom.mockReturnValue({
      select: jest.fn().mockResolvedValue({ error: null, count: 100 }),
    });

    const result = await checkSystemHealth();

    expect(result.redis).toBe('down');
    expect(result.database).toBe('ok');
  });

  it('should return down when DB fails', async () => {
    mockPing.mockResolvedValue('PONG');
    mockFrom.mockReturnValue({
      select: jest.fn().mockResolvedValue({ error: { message: 'timeout' } }),
    });

    const result = await checkSystemHealth();

    expect(result.redis).toBe('ok');
    expect(result.database).toBe('down');
  });
});
