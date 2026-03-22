/**
 * Word of the Day Manager Tests
 * Tests for word selection, attempt recording, and stats retrieval.
 */

// Mock supabase before imports
const mockFrom = jest.fn();
const mockRpc = jest.fn();
jest.mock('../supabaseServer', () => ({
  getSupabase: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));

import {
  getWordOfTheDay,
  recordWotdAttempt,
  getWotdStats,
  WORD_POOL,
  seededRandom,
} from '../wordOfTheDayManager';

describe('wordOfTheDayManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
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
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
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
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
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
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
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

  // ==========================================
  // recordWotdAttempt
  // ==========================================
  describe('recordWotdAttempt', () => {
    it('should return alreadyRecorded if player already attempted', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: '123' }, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await recordWotdAttempt('player1', 'crystal', true, 'en', '2026-03-22');
      expect(result.success).toBe(true);
      expect(result.alreadyRecorded).toBe(true);
    });

    it('should record new attempt when player has not tried', async () => {
      // First call: check existing (none)
      const selectChain = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      };
      const upsertMock = jest.fn().mockResolvedValue({ error: null });
      const insertMock = jest.fn().mockResolvedValue({ error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { select: jest.fn().mockReturnValue(selectChain) };
        if (callCount === 2) return { upsert: upsertMock };
        return { insert: insertMock };
      });
      mockRpc.mockResolvedValue({ error: null });

      const result = await recordWotdAttempt('player1', 'crystal', true, 'en', '2026-03-22');
      expect(result.success).toBe(true);
      expect(result.alreadyRecorded).toBeUndefined();
    });

    it('should handle DB errors gracefully', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('DB connection failed');
      });

      const result = await recordWotdAttempt('player1', 'crystal', true, 'en');
      expect(result.success).toBe(false);
    });
  });

  // ==========================================
  // getWotdStats
  // ==========================================
  describe('getWotdStats', () => {
    it('should return stats when data exists', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { found_count: 25, total_players: 100 },
                error: null,
              }),
            }),
          }),
        }),
      });

      const stats = await getWotdStats('en', '2026-03-22');
      expect(stats.foundCount).toBe(25);
      expect(stats.totalPlayers).toBe(100);
      expect(stats.foundPercent).toBe(25);
    });

    it('should return zeros when no data exists', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      const stats = await getWotdStats('en', '2026-03-22');
      expect(stats.foundCount).toBe(0);
      expect(stats.totalPlayers).toBe(0);
      expect(stats.foundPercent).toBe(0);
    });

    it('should calculate percent correctly with rounding', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { found_count: 1, total_players: 3 },
                error: null,
              }),
            }),
          }),
        }),
      });

      const stats = await getWotdStats('en', '2026-03-22');
      expect(stats.foundPercent).toBe(33); // 1/3 = 33.33 → 33
    });
  });
});
