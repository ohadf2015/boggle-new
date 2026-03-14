/**
 * Tests for admin Redis cache wrapper
 */

import { withCache, invalidateAdminCache } from '../adminCache';

// Mock Redis
const mockGet = jest.fn();
const mockSetex = jest.fn();
const mockScanStream = jest.fn();
const mockDel = jest.fn();

jest.mock('../../../redis/connection', () => ({
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
    jest.clearAllMocks();
  });

  describe('withCache', () => {
    it('should return cached value when available', async () => {
      mockGet.mockResolvedValue(JSON.stringify({ total: 42 }));
      const fetcher = jest.fn();

      const result = await withCache('admin:stats', 60, fetcher);

      expect(result).toEqual({ total: 42 });
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should call fetcher and cache result on miss', async () => {
      mockGet.mockResolvedValue(null);
      mockSetex.mockResolvedValue('OK');
      const fetcher = jest.fn().mockResolvedValue({ total: 99 });

      const result = await withCache('admin:stats', 60, fetcher);

      expect(result).toEqual({ total: 99 });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(mockSetex).toHaveBeenCalledWith('admin:stats', 60, JSON.stringify({ total: 99 }));
    });

    it('should fall back to fetcher when Redis fails', async () => {
      mockGet.mockRejectedValue(new Error('connection lost'));
      const fetcher = jest.fn().mockResolvedValue({ fallback: true });

      const result = await withCache('admin:stats', 60, fetcher);

      expect(result).toEqual({ fallback: true });
    });
  });
});
