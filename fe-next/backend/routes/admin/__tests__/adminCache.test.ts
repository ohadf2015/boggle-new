/**
 * Tests for admin Redis cache wrapper
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import { withCache, invalidateAdminCache } from '../adminCache';

// Mock Redis
const { mockGet, mockSetex, mockScanStream, mockDel } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockSetex = vi.fn();
  const mockScanStream = vi.fn();
  const mockDel = vi.fn();
  return { mockGet, mockSetex, mockScanStream, mockDel };
});

vi.mock('../../../redis/connection', () => ({
  getRedisClient: () => ({
    get: mockGet,
    setex: mockSetex,
    del: mockDel,
    scanStream: mockScanStream,
  }),
  isRedisAvailable: () => true,
}));

describe('adminCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withCache', () => {
    it('should return cached value when available', async () => {
      mockGet.mockResolvedValue(JSON.stringify({ total: 42 }));
      const fetcher = vi.fn();

      const result = await withCache('admin:stats', 60, fetcher);

      expect(result).toEqual({ total: 42 });
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should call fetcher and cache result on miss', async () => {
      mockGet.mockResolvedValue(null);
      mockSetex.mockResolvedValue('OK');
      const fetcher = vi.fn().mockResolvedValue({ total: 99 });

      const result = await withCache('admin:stats', 60, fetcher);

      expect(result).toEqual({ total: 99 });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(mockSetex).toHaveBeenCalledWith('admin:stats', 60, JSON.stringify({ total: 99 }));
    });

    it('should fall back to fetcher when Redis fails', async () => {
      mockGet.mockRejectedValue(new Error('connection lost'));
      const fetcher = vi.fn().mockResolvedValue({ fallback: true });

      const result = await withCache('admin:stats', 60, fetcher);

      expect(result).toEqual({ fallback: true });
    });
  });
});
