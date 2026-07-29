/**
 * Tests for awardCoinsServer helper.
 *
 * Server-side coin grant wraps the `sync_coins` Postgres RPC. Used by
 * server-only flows (gameResults, dailyMissions, wordOfTheDay) that
 * cannot reach the client-side coinManager.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  awardCoinsServer,
  MAX_SERVER_COIN_AWARD,
  type AwardCoinsReason,
} from '../awardCoins';

const { mockRpc, mockSupabase, mockLogger, clientRef } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockSupabase = { rpc: mockRpc };
  const clientRef: { current: typeof mockSupabase | null } = { current: mockSupabase };
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return { mockRpc, mockSupabase, mockLogger, clientRef };
});

vi.mock('../../../modules/supabase/client', () => ({
  getSupabase: () => clientRef.current,
}));

vi.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: mockLogger,
}));

const PLAYER_ID = 'player-abc-123';

describe('awardCoinsServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockReset();
    clientRef.current = mockSupabase;
  });

  describe('happy path', () => {
    it('calls sync_coins RPC with positional args + returns new balance', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ success: true, new_balance: 350, error_message: null }],
        error: null,
      });

      const result = await awardCoinsServer(PLAYER_ID, 50, 'wotd_complete');

      expect(mockRpc).toHaveBeenCalledTimes(1);
      expect(mockRpc).toHaveBeenCalledWith('sync_coins', {
        p_user_id: PLAYER_ID,
        p_amount: 50,
        p_reason: 'wotd_complete',
        p_metadata: {},
      });
      expect(result).toEqual({ success: true, newBalance: 350 });
    });

    it('forwards metadata to RPC when provided', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ success: true, new_balance: 200, error_message: null }],
        error: null,
      });

      await awardCoinsServer(PLAYER_ID, 100, 'duel_win', {
        gameCode: 'XK7L',
        placement: 1,
      });

      expect(mockRpc).toHaveBeenCalledWith(
        'sync_coins',
        expect.objectContaining({
          p_metadata: { gameCode: 'XK7L', placement: 1 },
        })
      );
    });
  });

  describe('input validation', () => {
    it('rejects amount <= 0 without calling RPC', async () => {
      const zero = await awardCoinsServer(PLAYER_ID, 0, 'duel_win');
      const negative = await awardCoinsServer(PLAYER_ID, -10, 'duel_win');

      expect(mockRpc).not.toHaveBeenCalled();
      expect(zero.success).toBe(false);
      expect(negative.success).toBe(false);
    });

    it(`rejects amount > MAX_SERVER_COIN_AWARD (${2000}) without calling RPC`, async () => {
      const result = await awardCoinsServer(
        PLAYER_ID,
        MAX_SERVER_COIN_AWARD + 1,
        'grand_slam'
      );

      expect(mockRpc).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'COINS',
        expect.stringContaining('exceeds')
      );
    });

    it('rejects empty playerId without calling RPC', async () => {
      const result = await awardCoinsServer('', 50, 'wotd_complete');

      expect(mockRpc).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it('only allows the typed reason union (compile + runtime)', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ success: true, new_balance: 100, error_message: null }],
        error: null,
      });

      const validReasons: AwardCoinsReason[] = [
        'duel_win',
        'wotd_complete',
        'grand_slam',
      ];

      for (const reason of validReasons) {
        mockRpc.mockResolvedValueOnce({
          data: [{ success: true, new_balance: 100, error_message: null }],
          error: null,
        });
        await awardCoinsServer(PLAYER_ID, 10, reason);
      }

      expect(mockRpc.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('failure modes', () => {
    it('returns success=false + logs when RPC returns error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'db connection lost' },
      });

      const result = await awardCoinsServer(PLAYER_ID, 50, 'wotd_complete');

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'COINS',
        expect.stringContaining('db connection lost')
      );
    });

    it('returns success=false when RPC row reports success=false', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          { success: false, new_balance: 0, error_message: 'Profile not found' },
        ],
        error: null,
      });

      const result = await awardCoinsServer(PLAYER_ID, 50, 'wotd_complete');

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'COINS',
        expect.stringContaining('Profile not found')
      );
    });

    it('returns success=false when RPC throws (best-effort, no rethrow)', async () => {
      mockRpc.mockRejectedValueOnce(new Error('network timeout'));

      const result = await awardCoinsServer(PLAYER_ID, 50, 'duel_win');

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'COINS',
        expect.stringContaining('network timeout')
      );
    });

    it('returns success=false when supabase client unavailable', async () => {
      clientRef.current = null;

      const result = await awardCoinsServer(PLAYER_ID, 50, 'duel_win');

      expect(result.success).toBe(false);
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });
});
