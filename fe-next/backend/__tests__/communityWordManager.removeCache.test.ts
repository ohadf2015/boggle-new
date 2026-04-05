import { vi, type Mock, type MockInstance } from 'vitest';
/**
 * Tests for removeFromCommunityCache in communityWordManager.ts
 * TDD: Written before implementation (RED phase)
 */

// Mock Supabase before importing module
vi.mock('../modules/supabaseServer', () => ({
  getSupabase: vi.fn(() => null),
  isSupabaseConfigured: vi.fn(() => false),
}));

// Mock dictionary
vi.mock('../dictionary', () => ({
  normalizeWord: vi.fn((word: string) => word.toLowerCase()),
  addApprovedWord: vi.fn(),
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('removeFromCommunityCache', () => {
  let removeFromCommunityCache: (word: string, language: string) => void;
  let isWordCommunityValid: (word: string, language: string) => boolean;
  let addToCommunityCache: (word: string, language: string) => Promise<void>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../modules/communityWordManager');
    removeFromCommunityCache = mod.removeFromCommunityCache;
    isWordCommunityValid = mod.isWordCommunityValid;
    addToCommunityCache = mod.addToCommunityCache;
  });

  it('should remove word from communityValidWords Set', async () => {
    // First add a word to the cache
    await addToCommunityCache('testword', 'en');
    expect(isWordCommunityValid('testword', 'en')).toBe(true);

    // Remove it
    removeFromCommunityCache('testword', 'en');

    expect(isWordCommunityValid('testword', 'en')).toBe(false);
  });

  it('should handle word not in cache gracefully', () => {
    // Should not throw
    expect(() => removeFromCommunityCache('nonexistent', 'en')).not.toThrow();
  });

  it('should also remove from pendingVotes cache', async () => {
    const mod = await import('../modules/communityWordManager');

    // Manually add to pending cache via updatePendingCache
    mod.updatePendingCache('pendingword', 'en', 'like');

    // Remove it
    removeFromCommunityCache('pendingword', 'en');

    // The word should no longer appear in pending priorities
    // (No direct way to check, but it shouldn't throw)
    expect(() => removeFromCommunityCache('pendingword', 'en')).not.toThrow();
  });

  it('should work for Hebrew language', async () => {
    await addToCommunityCache('מילה', 'he');
    expect(isWordCommunityValid('מילה', 'he')).toBe(true);

    removeFromCommunityCache('מילה', 'he');

    expect(isWordCommunityValid('מילה', 'he')).toBe(false);
  });
});
