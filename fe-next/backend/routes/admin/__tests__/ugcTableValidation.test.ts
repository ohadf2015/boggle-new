/**
 * Tests for UGC table parameter validation (SQL injection fix)
 */

// Mock supabaseServer before imports
const { mockSelect, mockIn, mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockIn = vi.fn().mockResolvedValue({ data: [], error: null });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect, in: mockIn });
  const mockSupabase = { from: mockFrom };
  return { mockSelect, mockIn, mockFrom, mockSupabase };
});

vi.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => mockSupabase,
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import { resolveUGCTable, UGC_TABLES } from '../ugcModerationRoutes';

describe('UGC Table Validation', () => {
  // Given a valid table name, it should pass through
  it('should accept valid table names', () => {
    for (const table of UGC_TABLES) {
      expect(resolveUGCTable(table)).toBe(table);
    }
  });

  // Given an invalid/malicious table name, it should return the default
  it('should reject invalid table names and return default', () => {
    expect(resolveUGCTable('profiles')).toBe('community_boards');
    expect(resolveUGCTable('auth.users')).toBe('community_boards');
    expect(resolveUGCTable("'; DROP TABLE profiles;--")).toBe('community_boards');
    expect(resolveUGCTable('')).toBe('community_boards');
    expect(resolveUGCTable(undefined)).toBe('community_boards');
    expect(resolveUGCTable(null)).toBe('community_boards');
    expect(resolveUGCTable(123)).toBe('community_boards');
  });

  // Given no table param, it should default to community_boards
  it('should default to community_boards when not provided', () => {
    expect(resolveUGCTable(undefined)).toBe('community_boards');
  });
});
