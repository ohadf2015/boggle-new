/**
 * Tests for UGC table parameter validation (SQL injection fix)
 */

// Mock supabaseServer before imports
const mockSelect = jest.fn().mockReturnThis();
const mockIn = jest.fn().mockResolvedValue({ data: [], error: null });
const mockFrom = jest.fn().mockReturnValue({ select: mockSelect, in: mockIn });
const mockSupabase = { from: mockFrom };

jest.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => mockSupabase,
}));

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
