/**
 * Bulk Approve Invalid Words API Tests
 *
 * Tests for POST /api/admin/invalid-words/bulk-approve
 */

import { handleBulkApprove, type BulkApproveResult } from '../route';

// Mock Supabase
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseIn = jest.fn();
const mockSupabaseUpsert = jest.fn();
const mockSupabaseUpdate = jest.fn();
const mockSupabaseDelete = jest.fn();
const mockSupabaseEq = jest.fn();

// Test data
let mockSelectData: unknown[] = [];

jest.mock('@/backend/modules/supabaseServer', () => ({
  getSupabase: () => ({
    from: (table: string) => {
      mockSupabaseFrom(table);
      return {
        select: (columns: string) => {
          mockSupabaseSelect(columns);
          return {
            in: (column: string, values: string[]) => {
              mockSupabaseIn(column, values);
              return Promise.resolve({ data: mockSelectData, error: null });
            },
          };
        },
        upsert: (data: unknown, options?: unknown) => {
          mockSupabaseUpsert(data, options);
          return Promise.resolve({ error: null });
        },
        update: (data: unknown) => {
          mockSupabaseUpdate(data);
          return {
            eq: (col: string, val: string) => {
              mockSupabaseEq(col, val);
              return Promise.resolve({ error: null });
            },
          };
        },
        delete: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        }),
      };
    },
  }),
}));

const mockAdminUser = {
  id: 'admin-uuid',
  email: 'admin@test.com',
};

describe('Bulk Approve Invalid Words API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectData = [];
  });

  describe('Input validation', () => {
    it('returns 400 if wordIds is missing', async () => {
      const result = await handleBulkApprove({}, mockAdminUser);

      expect(result.error).toBe('Missing wordIds array');
      expect(result.status).toBe(400);
    });

    it('returns 400 if wordIds is empty', async () => {
      const result = await handleBulkApprove({ wordIds: [] }, mockAdminUser);

      expect(result.error).toBe('No words to approve');
      expect(result.status).toBe(400);
    });

    it('returns 400 if wordIds exceeds 100 limit', async () => {
      const wordIds = Array.from({ length: 101 }, (_, i) => `word-${i}`);
      const result = await handleBulkApprove({ wordIds }, mockAdminUser);

      expect(result.error).toBe('Too many words. Maximum 100 per batch.');
      expect(result.status).toBe(400);
    });
  });

  describe('Word approval', () => {
    it('approves valid words and returns counts', async () => {
      mockSelectData = [
        { id: 'word-1', word: 'testword', language: 'en', submission_count: 5, approved_at: null },
        { id: 'word-2', word: 'another', language: 'en', submission_count: 3, approved_at: null },
      ];

      const result = await handleBulkApprove(
        { wordIds: ['word-1', 'word-2'] },
        mockAdminUser
      );

      expect(result.success).toBe(true);
      expect(result.approved).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('skips already approved words', async () => {
      mockSelectData = [
        { id: 'word-1', word: 'testword', language: 'en', submission_count: 5, approved_at: '2026-01-01' },
      ];

      const result = await handleBulkApprove(
        { wordIds: ['word-1'] },
        mockAdminUser
      );

      expect(result.success).toBe(true);
      expect(result.approved).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ wordId: 'word-1', reason: 'Already approved' })
      );
    });

    it('skips words not found in database', async () => {
      mockSelectData = [];

      const result = await handleBulkApprove(
        { wordIds: ['nonexistent-word'] },
        mockAdminUser
      );

      expect(result.success).toBe(true);
      expect(result.approved).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ wordId: 'nonexistent-word', reason: 'Not found' })
      );
    });

    it('calculates votes based on submission count', async () => {
      mockSelectData = [
        { id: 'word-1', word: 'popular', language: 'en', submission_count: 15, approved_at: null },
      ];

      await handleBulkApprove({ wordIds: ['word-1'] }, mockAdminUser);

      // votesNeeded = max(10, min(15 * 2, 20)) = 20
      expect(mockSupabaseUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ likes_count: 20 }),
        expect.any(Object)
      );
    });

    it('caps votes at minimum 10', async () => {
      mockSelectData = [
        { id: 'word-1', word: 'rare', language: 'en', submission_count: 3, approved_at: null },
      ];

      await handleBulkApprove({ wordIds: ['word-1'] }, mockAdminUser);

      // votesNeeded = max(10, min(3 * 2, 20)) = 10
      expect(mockSupabaseUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ likes_count: 10 }),
        expect.any(Object)
      );
    });

    it('updates word_scores table with correct data', async () => {
      mockSelectData = [
        { id: 'word-1', word: 'testword', language: 'en', submission_count: 5, approved_at: null },
      ];

      await handleBulkApprove({ wordIds: ['word-1'] }, mockAdminUser);

      expect(mockSupabaseFrom).toHaveBeenCalledWith('word_scores');
      expect(mockSupabaseUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'testword',
          language: 'en',
          first_submitter: 'admin_approved',
        }),
        { onConflict: 'word,language' }
      );
    });

    it('marks word as approved in invalid_word_submissions', async () => {
      mockSelectData = [
        { id: 'word-1', word: 'testword', language: 'en', submission_count: 5, approved_at: null },
      ];

      await handleBulkApprove({ wordIds: ['word-1'] }, mockAdminUser);

      expect(mockSupabaseFrom).toHaveBeenCalledWith('invalid_word_submissions');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          approved_at: expect.any(String),
          approved_by: mockAdminUser.id,
        })
      );
    });
  });

  describe('Error handling', () => {
    it('continues processing after individual word failure', async () => {
      mockSelectData = [
        { id: 'word-1', word: 'testword', language: 'en', submission_count: 5, approved_at: null },
        { id: 'word-2', word: 'another', language: 'en', submission_count: 3, approved_at: null },
      ];

      // Make first upsert fail
      let callCount = 0;
      mockSupabaseUpsert.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ error: { message: 'Database error' } });
        }
        return Promise.resolve({ error: null });
      });

      const result = await handleBulkApprove(
        { wordIds: ['word-1', 'word-2'] },
        mockAdminUser
      );

      expect(result.approved).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ wordId: 'word-1', reason: expect.stringContaining('Database error') })
      );
    });
  });
});
