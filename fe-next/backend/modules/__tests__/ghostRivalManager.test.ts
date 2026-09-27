/**
 * Tests for Ghost Rival Manager
 * Weekly auto-matched skill-similar rivalry system
 */

// Create a fresh chainable mock for each test
function createChainMock() {
  const mock: Record<string, Mock> = {};
  const methodNames = ['select', 'insert', 'update', 'eq', 'neq', 'gte', 'lte', 'order', 'limit', 'single'];
  for (const name of methodNames) {
    mock[name] = vi.fn(() => mock);
  }
  // Default terminal values
  mock.single.mockResolvedValue({ data: null, error: null });
  mock.limit.mockResolvedValue({ data: [], error: null });
  mock.insert.mockResolvedValue({ data: null, error: null });
  return mock;
}

let chain = createChainMock();
const { mockRpc, mockFrom } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockFrom = vi.fn(() => chain);
  return { mockRpc, mockFrom };
});

vi.mock('../../modules/supabaseServer', () => ({
  getSupabase: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  getWeekStart,
  getWeekEnd,
  getOrCreateWeeklyRival,
  updateRivalScore,
  getWeeklyRivalStatus,
} from '../ghostRivalManager';

describe('GhostRivalManager', () => {
  beforeEach(() => {
    chain = createChainMock();
    mockFrom.mockReturnValue(chain);
    mockRpc.mockReset();
  });

  // ─── Week helpers ─────────────────────────────────────────

  describe('getWeekStart', () => {
    it('should return a Monday at midnight', () => {
      const start = getWeekStart();
      expect(start.getDay()).toBe(1);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
    });
  });

  describe('getWeekEnd', () => {
    it('should return 7 days after week start', () => {
      const diff = getWeekEnd().getTime() - getWeekStart().getTime();
      expect(diff).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  // ─── getOrCreateWeeklyRival ───────────────────────────────

  describe('getOrCreateWeeklyRival', () => {
    it('should return existing rival if already matched this week', async () => {
      // GIVEN — first .single() call finds existing rivalry
      chain.single.mockResolvedValueOnce({
        data: {
          player_id: 'player-1',
          rival_id: 'rival-1',
          player_score: 100,
          rival_score: 120,
          rival: { id: 'rival-1', username: 'RivalGuy', avatar_image: 'av.png', total_score: 500 },
        },
        error: null,
      });

      const result = await getOrCreateWeeklyRival('player-1');

      expect(result).not.toBeNull();
      expect(result!.rival.id).toBe('rival-1');
      expect(result!.rival.username).toBe('RivalGuy');
      expect(result!.rival.score).toBe(120);
      expect(result!.player.score).toBe(100);
    });

    it('prefers a real display_name over a placeholder Player_<hex> username', async () => {
      // DB default usernames are `Player_<8hex>` placeholders; the chosen name lives
      // in display_name. The widget must show the real name, never the placeholder.
      chain.single.mockResolvedValueOnce({
        data: {
          player_id: 'player-1',
          rival_id: 'rival-1',
          player_score: 100,
          rival_score: 120,
          rival: { id: 'rival-1', username: 'Player_0e5fc437', display_name: 'Julian Hulsman', avatar_image: 'av.png', total_score: 500 },
        },
        error: null,
      });

      const result = await getOrCreateWeeklyRival('player-1');
      expect(result!.rival.username).toBe('Julian Hulsman');
    });

    it('falls back to "Ghost" when username is a placeholder and display_name is missing', async () => {
      chain.single.mockResolvedValueOnce({
        data: {
          player_id: 'player-1', rival_id: 'rival-1', player_score: 0, rival_score: 0,
          rival: { id: 'rival-1', username: 'Player_09e0d0a8', display_name: null, avatar_image: '', total_score: 0 },
        },
        error: null,
      });

      const result = await getOrCreateWeeklyRival('player-1');
      expect(result!.rival.username).toBe('Ghost');
    });

    it('should return null when no candidates found and no existing rival', async () => {
      // First single() = no existing rivalry
      // Second single() = player profile
      chain.single
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { total_score: 1000 }, error: null });

      // profiles query returns empty
      chain.limit.mockResolvedValueOnce({ data: [], error: null });

      const result = await getOrCreateWeeklyRival('player-1');
      expect(result).toBeNull();
    });

    // ─── same-language preference ──────────────────────────────
    // Cross-language total_score isn't truly comparable, but at minimum a
    // ghost rival should be someone who plays the same language. profiles.language
    // is ~40% populated, so this is a PREFERENCE with a language-agnostic fallback,
    // never a hard filter (which would starve matching).
    it('filters candidates to the player own language when known', async () => {
      chain.single
        .mockResolvedValueOnce({ data: null, error: null }) // no existing rivalry
        .mockResolvedValueOnce({ data: { total_score: 1000, language: 'he' }, error: null });
      chain.limit.mockResolvedValueOnce({
        data: [{ id: 'r-he', username: 'HeRival', display_name: null, avatar_image: 'a.png', total_score: 1000, language: 'he' }],
        error: null,
      });

      const result = await getOrCreateWeeklyRival('player-1');
      expect(result!.rival.id).toBe('r-he');
      expect(chain.eq).toHaveBeenCalledWith('language', 'he');
    });

    it('falls back to language-agnostic matching when no same-language candidate exists', async () => {
      chain.single
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { total_score: 1000, language: 'sv' }, error: null });
      chain.limit
        .mockResolvedValueOnce({ data: [], error: null }) // no sv candidates
        .mockResolvedValueOnce({ // fallback: any language
          data: [{ id: 'r-any', username: 'AnyRival', display_name: null, avatar_image: 'a.png', total_score: 1000, language: 'en' }],
          error: null,
        });

      const result = await getOrCreateWeeklyRival('player-1');
      expect(chain.eq).toHaveBeenCalledWith('language', 'sv'); // tried same-language first
      expect(result!.rival.id).toBe('r-any'); // but still matched via fallback
    });

    it('does NOT filter by language when the player language is null', async () => {
      chain.single
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { total_score: 1000, language: null }, error: null });
      chain.limit.mockResolvedValueOnce({
        data: [{ id: 'r-any', username: 'AnyRival', display_name: null, avatar_image: 'a.png', total_score: 1000, language: 'en' }],
        error: null,
      });

      const result = await getOrCreateWeeklyRival('player-1');
      expect(result!.rival.id).toBe('r-any');
      expect(chain.eq).not.toHaveBeenCalledWith('language', expect.anything());
    });
  });

  // ─── updateRivalScore ─────────────────────────────────────

  describe('updateRivalScore', () => {
    it('should return null for zero points', async () => {
      expect(await updateRivalScore('p1', 0)).toBeNull();
    });

    it('should return null for negative points', async () => {
      expect(await updateRivalScore('p1', -5)).toBeNull();
    });

    it('should call RPC to increment score', async () => {
      // RPC returns `TABLE(new_score integer)` shape: [{ new_score: 150 }]
      mockRpc.mockResolvedValue({ data: [{ new_score: 150 }], error: null });

      const result = await updateRivalScore('player-1', 50);

      expect(mockRpc).toHaveBeenCalledWith('increment_ghost_rival_score', {
        p_player_id: 'player-1',
        p_week_start: expect.any(String),
        p_points: 50,
      });
      expect(result).toEqual({ newScore: 150 });
    });

    it('should fall back to manual update when RPC function missing', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: '42883', message: 'function not found' },
      });
      // Manual fallback reads existing score then updates
      chain.single.mockResolvedValueOnce({ data: { player_score: 100 }, error: null });

      const result = await updateRivalScore('player-1', 50);
      expect(result).toEqual({ newScore: 150 });
    });

    it('should return null on other RPC errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: '99999', message: 'fail' } });

      const result = await updateRivalScore('player-1', 50);
      expect(result).toBeNull();
    });
  });

  // ─── getWeeklyRivalStatus ─────────────────────────────────

  describe('getWeeklyRivalStatus', () => {
    it('should return rival status when rivalry exists', async () => {
      chain.single.mockResolvedValueOnce({
        data: {
          player_score: 200,
          rival_score: 180,
          rival: { id: 'r1', username: 'TestRival', avatar_image: 'img.png', total_score: 5000 },
        },
        error: null,
      });

      const result = await getWeeklyRivalStatus('player-1');

      expect(result).not.toBeNull();
      expect(result!.rival.username).toBe('TestRival');
      expect(result!.player.score).toBe(200);
      expect(result!.rival.score).toBe(180);
    });

    it('prefers a real display_name over a placeholder username', async () => {
      chain.single.mockResolvedValueOnce({
        data: {
          player_score: 200, rival_score: 180,
          rival: { id: 'r1', username: 'Player_9662314e', display_name: 'Anja', avatar_image: 'img.png', total_score: 5000 },
        },
        error: null,
      });

      const result = await getWeeklyRivalStatus('player-1');
      expect(result!.rival.username).toBe('Anja');
    });

    it('should return null when no rivalry exists', async () => {
      chain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await getWeeklyRivalStatus('player-1');
      expect(result).toBeNull();
    });
  });
});
