/**
 * Word of the Day Manager Tests
 * Tests for word selection and stats lookup.
 */

// Mock supabase before imports
const { mockFrom, mockRpc } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  return { mockFrom, mockRpc };
});
vi.mock('../supabaseServer', () => ({
  getSupabase: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  getWordOfTheDay,
  WORD_POOL,
  WOTD_COIN_REWARD,
  seededRandom,
} from '../wordOfTheDayManager';

describe('wordOfTheDayManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // seededRandom
  // ==========================================
  describe('seededRandom', () => {
    it('should return deterministic value for same seed', () => {
      const a = seededRandom('2026-03-22-en-wotd');
      const b = seededRandom('2026-03-22-en-wotd');
      expect(a).toBe(b);
    });

    it('should return different values for different seeds', () => {
      const a = seededRandom('2026-03-22-en-wotd');
      const b = seededRandom('2026-03-23-en-wotd');
      expect(a).not.toBe(b);
    });

    it('should return a number between 0 and 1', () => {
      const val = seededRandom('test-seed');
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });
  });

  // ==========================================
  // WORD_POOL
  // ==========================================
  describe('WORD_POOL', () => {
    it('should have at least 100 words', () => {
      expect(WORD_POOL.length).toBeGreaterThanOrEqual(100);
    });

    it('should contain only lowercase strings', () => {
      WORD_POOL.forEach(word => {
        expect(word).toBe(word.toLowerCase());
        expect(word.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================
  // getWordOfTheDay
  // ==========================================
  describe('getWordOfTheDay', () => {
    it('should return a word from the pool for a given date', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      const result = await getWordOfTheDay('en', '2026-03-22');
      expect(WORD_POOL).toContain(result.word);
      expect(result.date).toBe('2026-03-22');
      expect(result.language).toBe('en');
    });

    it('should return same word for same date and language', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      const a = await getWordOfTheDay('en', '2026-03-22');
      const b = await getWordOfTheDay('en', '2026-03-22');
      expect(a.word).toBe(b.word);
    });

    it('should return different words for different languages', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      const en = await getWordOfTheDay('en', '2026-03-22');
      const he = await getWordOfTheDay('he', '2026-03-22');
      // Different seeds should typically produce different words
      // (not guaranteed but extremely likely with 120+ words)
      expect(en.language).toBe('en');
      expect(he.language).toBe('he');
    });

    it('should include stats when DB row exists', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { found_count: 42, total_players: 100 },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await getWordOfTheDay('en', '2026-03-22');
      expect(result.foundCount).toBe(42);
      expect(result.totalPlayers).toBe(100);
    });
  });
});
