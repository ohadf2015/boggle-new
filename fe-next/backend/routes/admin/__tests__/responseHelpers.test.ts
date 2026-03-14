/**
 * Tests for standardized admin API response helpers
 */

import { successResponse, errorResponse, paginatedResponse, buildPaginationMeta } from '../responseHelpers';

describe('responseHelpers', () => {
  describe('successResponse', () => {
    it('should wrap data with ok: true and timestamp', () => {
      const result = successResponse({ players: [] });
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ players: [] });
      expect(result.timestamp).toBeDefined();
    });

    it('should include optional meta', () => {
      const result = successResponse({ count: 5 }, { cached: true });
      expect(result.meta).toEqual({ cached: true });
    });

    it('should default meta to empty object', () => {
      const result = successResponse('hello');
      expect(result.meta).toEqual({});
    });
  });

  describe('errorResponse', () => {
    it('should wrap error with ok: false and code', () => {
      const result = errorResponse('NOT_FOUND', 'Player not found');
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('NOT_FOUND');
      expect(result.error.message).toBe('Player not found');
      expect(result.timestamp).toBeDefined();
    });

    it('should include optional details', () => {
      const result = errorResponse('VALIDATION', 'Bad input', { field: 'name' });
      expect(result.error.details).toEqual({ field: 'name' });
    });

    it('should default details to null', () => {
      const result = errorResponse('ERR', 'fail');
      expect(result.error.details).toBeNull();
    });
  });

  describe('buildPaginationMeta', () => {
    it('should compute hasMore correctly', () => {
      const meta = buildPaginationMeta(100, { limit: 50, offset: 0 });
      expect(meta.total).toBe(100);
      expect(meta.hasMore).toBe(true);
    });

    it('should return hasMore false at end', () => {
      const meta = buildPaginationMeta(100, { limit: 50, offset: 50 });
      expect(meta.hasMore).toBe(false);
    });

    it('should include nextCursor when provided', () => {
      const meta = buildPaginationMeta(100, { limit: 10, offset: 0 }, '2026-03-14T00:00:00Z');
      expect(meta.nextCursor).toBe('2026-03-14T00:00:00Z');
    });

    it('should default nextCursor to null', () => {
      const meta = buildPaginationMeta(5, { limit: 10, offset: 0 });
      expect(meta.nextCursor).toBeNull();
    });
  });

  describe('paginatedResponse', () => {
    it('should wrap items with pagination meta', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const pagination = buildPaginationMeta(2, { limit: 10, offset: 0 });
      const result = paginatedResponse(items, pagination);
      expect(result.ok).toBe(true);
      expect(result.data.items).toEqual(items);
      expect(result.data.pagination.total).toBe(2);
      expect(result.data.pagination.hasMore).toBe(false);
    });
  });
});
