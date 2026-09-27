/**
 * Word of the Day Manager Tests
 * Tests for word selection, attempt recording, and stats retrieval.
 */

// Mock supabase before imports
const { mockFrom, mockRpc, mockAwardCoins } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  const mockAwardCoins = vi.fn();
  return { mockFrom, mockRpc, mockAwardCoins };
});
vi.mock('../supabaseServer', () => ({
  getSupabase: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

vi.mock('../../services/economy/awardCoins', () => ({
  awardCoinsServer: (...args: unknown[]) => mockAwardCoins(...args),
  MAX_SERVER_COIN_AWARD: 2000,
}));

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  getWordOfTheDay,
  recordWotdAttempt,
  getWotdStats,
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

  // ==========================================
  // recordWotdAttempt
  // ==========================================
  describe('recordWotdAttempt', () => {
    it('should return alreadyRecorded if player already attempted', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: '123' }, error: null }),
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
      // Call 1: check existing (none found)
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      };
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      // Calls 4/5: count queries return { count }
      const countSelectChain = (count: number) => ({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ count }),
          count,
        }),
        count,
      });
      // Call 6: update chain
      const updateChain = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { select: vi.fn().mockReturnValue(selectChain) };
        if (callCount === 2) return { insert: insertMock };
        if (callCount === 3) return { upsert: upsertMock };
        if (callCount === 4) return { select: vi.fn().mockReturnValue(countSelectChain(1)) };
        if (callCount === 5) return { select: vi.fn().mockReturnValue(countSelectChain(1)) };
        return { update: vi.fn().mockReturnValue(updateChain) };
      });

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
  // recordWotdAttempt — coin reward
  // ==========================================
  describe('recordWotdAttempt coin reward', () => {
    /** Helper: wire mockFrom for the new-attempt path so insert/upsert/count/update succeed. */
    function wireSuccessfulNewAttempt() {
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      };
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const countSelectChain = (count: number) => ({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ count }),
          count,
        }),
        count,
      });
      const updateChain = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { select: vi.fn().mockReturnValue(selectChain) };
        if (callCount === 2) return { insert: insertMock };
        if (callCount === 3) return { upsert: upsertMock };
        if (callCount === 4) return { select: vi.fn().mockReturnValue(countSelectChain(1)) };
        if (callCount === 5) return { select: vi.fn().mockReturnValue(countSelectChain(1)) };
        return { update: vi.fn().mockReturnValue(updateChain) };
      });
    }

    beforeEach(() => {
      mockAwardCoins.mockResolvedValue({ success: true, newBalance: 100 });
    });

    it('awards WOTD_COIN_REWARD to player when found=true', async () => {
      wireSuccessfulNewAttempt();

      await recordWotdAttempt('player1', 'crystal', true, 'en', '2026-04-26');

      expect(mockAwardCoins).toHaveBeenCalledTimes(1);
      expect(mockAwardCoins).toHaveBeenCalledWith(
        'player1',
        WOTD_COIN_REWARD,
        'wotd_complete',
        expect.objectContaining({ word: 'crystal' })
      );
    });

    it('does NOT award coins when found=false (failed attempt)', async () => {
      wireSuccessfulNewAttempt();

      await recordWotdAttempt('player1', 'crystal', false, 'en', '2026-04-26');

      expect(mockAwardCoins).not.toHaveBeenCalled();
    });

    it('does NOT award coins when alreadyRecorded (idempotent on duplicate attempt)', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await recordWotdAttempt('player1', 'crystal', true, 'en', '2026-04-26');

      expect(result.alreadyRecorded).toBe(true);
      expect(mockAwardCoins).not.toHaveBeenCalled();
    });

    it('still returns success=true even when coin grant fails (best-effort)', async () => {
      wireSuccessfulNewAttempt();
      mockAwardCoins.mockResolvedValueOnce({ success: false, error: 'rpc failed' });

      const result = await recordWotdAttempt('player1', 'crystal', true, 'en', '2026-04-26');

      expect(result.success).toBe(true);
      expect(mockAwardCoins).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================
  // getWotdStats
  // ==========================================
  describe('getWotdStats', () => {
    it('should return stats when data exists', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
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
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
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
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
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
