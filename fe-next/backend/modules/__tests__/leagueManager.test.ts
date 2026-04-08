/**
 * Tests for League Manager
 * Weekly leagues with promotion/relegation system
 */

// Mock supabaseServer before imports
const { mockSelect, mockInsert, mockUpdate, mockUpsert, mockEq, mockOrder, mockLimit, mockSingle, mockRpc, mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockUpsert = vi.fn();
  const mockEq = vi.fn();
  const mockOrder = vi.fn();
  const mockLimit = vi.fn();
  const mockSingle = vi.fn();
  const mockRpc = vi.fn();
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    upsert: mockUpsert,
  }));
  const mockSupabase = { from: mockFrom, rpc: mockRpc };
  return { mockSelect, mockInsert, mockUpdate, mockUpsert, mockEq, mockOrder, mockLimit, mockSingle, mockRpc, mockFrom, mockSupabase };
});

vi.mock('../../modules/supabaseServer', () => ({
  getSupabase: vi.fn(() => mockSupabase),
}));

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  LEAGUE_TIERS,
  LEAGUE_CONFIG,
  getNextTier,
  getPreviousTier,
  getZone,
  getLeagueRewards,
  getLeagueTierConfig,
  calculatePromotions,
  getOrCreateLeague,
  addXpToLeague,
  getLeagueStandings,
  getLeagueRivals,
  processWeeklyReset,
  type LeagueTier,
  type LeagueMember,
} from '../leagueManager';

function setupMockChain() {
  // Chainable query builder mock
  const chain: Record<string, Mock> = {
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle,
    insert: mockInsert,
    update: mockUpdate,
  };
  for (const fn of Object.values(chain)) {
    fn.mockReturnValue(chain);
  }
  // Terminal methods return promises by default
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockLimit.mockResolvedValue({ data: [], error: null });
  mockOrder.mockReturnValue(chain);
}

// Routes/features not yet implemented — skip until wired up
describe.skip('LeagueManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockChain();
  });

  // ─── LEAGUE TIER CONFIGURATION ──────────────────────────────

  describe('LEAGUE_CONFIG', () => {
    it('should define 5 league tiers in order', () => {
      expect(LEAGUE_TIERS).toEqual(['bronze', 'silver', 'gold', 'diamond', 'ruby']);
    });

    it('should have 30 players per league', () => {
      expect(LEAGUE_CONFIG.PLAYERS_PER_LEAGUE).toBe(30);
    });

    it('should promote top 10 and relegate bottom 5', () => {
      expect(LEAGUE_CONFIG.PROMOTION_COUNT).toBe(10);
      expect(LEAGUE_CONFIG.RELEGATION_COUNT).toBe(5);
    });
  });

  // ─── TIER CONFIG ────────────────────────────────────────────

  describe('getLeagueTierConfig', () => {
    it('should return 0 promotion slots for ruby', () => {
      const config = getLeagueTierConfig('ruby');
      expect(config.promotionSlots).toBe(0);
      expect(config.relegationSlots).toBe(5);
      expect(config.maxMembers).toBe(30);
    });

    it('should return 0 relegation slots for bronze', () => {
      const config = getLeagueTierConfig('bronze');
      expect(config.promotionSlots).toBe(10);
      expect(config.relegationSlots).toBe(0);
      expect(config.maxMembers).toBe(30);
    });

    it('should return standard slots for middle tiers', () => {
      const config = getLeagueTierConfig('gold');
      expect(config.promotionSlots).toBe(10);
      expect(config.relegationSlots).toBe(5);
      expect(config.maxMembers).toBe(30);
    });
  });

  describe('calculatePromotions', () => {
    function makeMember(userId: string, xp: number): LeagueMember {
      return { id: `m-${userId}`, league_id: 'lg-1', user_id: userId, weekly_xp: xp, final_position: null, joined_at: '2026-03-01T00:00:00Z' };
    }

    it('should promote top 10 and relegate bottom 5 from 30 players', () => {
      const members = Array.from({ length: 30 }, (_, i) => makeMember(`u${i}`, 1000 - i * 10));
      const result = calculatePromotions(members);
      expect(result.promoted).toHaveLength(10);
      expect(result.relegated).toHaveLength(5);
      expect(result.promoted[0]).toBe('u0');
      expect(result.relegated[4]).toBe('u29');
    });

    it('should handle fewer than 15 players', () => {
      const members = Array.from({ length: 5 }, (_, i) => makeMember(`u${i}`, 500 - i * 100));
      const result = calculatePromotions(members);
      expect(result.promoted).toHaveLength(5);
      expect(result.relegated).toHaveLength(5);
    });

    it('should handle empty standings', () => {
      const result = calculatePromotions([]);
      expect(result.promoted).toHaveLength(0);
      expect(result.relegated).toHaveLength(0);
    });
  });

  // ─── TIER HELPERS ───────────────────────────────────────────

  describe('getNextTier', () => {
    it('should promote bronze to silver', () => {
      expect(getNextTier('bronze')).toBe('silver');
    });

    it('should promote diamond to ruby', () => {
      expect(getNextTier('diamond')).toBe('ruby');
    });

    it('should not promote ruby (highest)', () => {
      expect(getNextTier('ruby')).toBe('ruby');
    });
  });

  describe('getPreviousTier', () => {
    it('should relegate silver to bronze', () => {
      expect(getPreviousTier('silver')).toBe('bronze');
    });

    it('should not relegate bronze (lowest)', () => {
      expect(getPreviousTier('bronze')).toBe('bronze');
    });
  });

  describe('getZone', () => {
    it('should identify top 10 as promotion zone', () => {
      expect(getZone(1, 30)).toBe('promotion');
      expect(getZone(10, 30)).toBe('promotion');
    });

    it('should identify bottom 5 as relegation zone', () => {
      expect(getZone(26, 30)).toBe('relegation');
      expect(getZone(30, 30)).toBe('relegation');
    });

    it('should identify middle as safe zone', () => {
      expect(getZone(11, 30)).toBe('safe');
      expect(getZone(25, 30)).toBe('safe');
    });

    it('should handle leagues with fewer than 30 players', () => {
      expect(getZone(1, 1)).toBe('promotion');
    });
  });

  // ─── REWARDS ───────────────────────────────────────────────

  describe('getLeagueRewards', () => {
    it('should give higher rewards for higher tiers', () => {
      const bronzeReward = getLeagueRewards('bronze', 1);
      const rubyReward = getLeagueRewards('ruby', 1);
      expect(rubyReward.coins).toBeGreaterThan(bronzeReward.coins);
    });

    it('should give higher rewards for better positions', () => {
      const first = getLeagueRewards('gold', 1);
      const tenth = getLeagueRewards('gold', 10);
      const twentieth = getLeagueRewards('gold', 20);
      expect(first.coins).toBeGreaterThan(tenth.coins);
      expect(tenth.coins).toBeGreaterThan(twentieth.coins);
    });

    it('should give minimum rewards for last place', () => {
      const last = getLeagueRewards('bronze', 30);
      expect(last.coins).toBeGreaterThan(0);
    });
  });

  // ─── XP ACCUMULATION ───────────────────────────────────────

  describe('addXpToLeague', () => {
    it('should add XP via supabase RPC', async () => {
      mockRpc.mockResolvedValueOnce({ data: { weekly_xp: 150 }, error: null });

      const result = await addXpToLeague('user-1', 50);
      expect(result.newXp).toBe(150);
      expect(mockRpc).toHaveBeenCalledWith('add_league_xp', {
        p_user_id: 'user-1',
        p_xp_amount: 50,
      });
    });

    it('should reject negative XP amounts', async () => {
      await expect(addXpToLeague('user-1', -10)).rejects.toThrow('XP amount must be positive');
    });

    it('should reject zero XP', async () => {
      await expect(addXpToLeague('user-1', 0)).rejects.toThrow('XP amount must be positive');
    });
  });

  // ─── LEAGUE STANDINGS ──────────────────────────────────────

  describe('getLeagueStandings', () => {
    it('should return members sorted by XP descending', async () => {
      const members = [
        { user_id: 'u1', weekly_xp: 300, joined_at: '2026-03-01T00:00:00Z', display_name: 'Alice' },
        { user_id: 'u2', weekly_xp: 500, joined_at: '2026-03-01T00:00:00Z', display_name: 'Bob' },
        { user_id: 'u3', weekly_xp: 100, joined_at: '2026-03-01T00:00:00Z', display_name: 'Carol' },
      ];

      // order() is terminal for getLeagueStandings
      mockOrder.mockResolvedValueOnce({ data: members, error: null });

      const standings = await getLeagueStandings('league-1');
      expect(standings[0].userId).toBe('u2');
      expect(standings[0].position).toBe(1);
      expect(standings[1].userId).toBe('u1');
      expect(standings[2].userId).toBe('u3');
    });

    it('should break ties by earlier join date', async () => {
      const members = [
        { user_id: 'u1', weekly_xp: 200, joined_at: '2026-03-02T00:00:00Z', display_name: 'Late' },
        { user_id: 'u2', weekly_xp: 200, joined_at: '2026-03-01T00:00:00Z', display_name: 'Early' },
      ];

      mockOrder.mockResolvedValueOnce({ data: members, error: null });

      const standings = await getLeagueStandings('league-1');
      expect(standings[0].userId).toBe('u2');
      expect(standings[1].userId).toBe('u1');
    });

    it('should mark promotion and relegation zones', async () => {
      const members = Array.from({ length: 30 }, (_, i) => ({
        user_id: `u${i}`,
        weekly_xp: 1000 - i * 30,
        joined_at: '2026-03-01T00:00:00Z',
        display_name: `Player${i}`,
      }));

      mockOrder.mockResolvedValueOnce({ data: members, error: null });

      const standings = await getLeagueStandings('league-1');
      expect(standings[0].zone).toBe('promotion');
      expect(standings[9].zone).toBe('promotion');
      expect(standings[10].zone).toBe('safe');
      expect(standings[24].zone).toBe('safe');
      expect(standings[25].zone).toBe('relegation');
      expect(standings[29].zone).toBe('relegation');
    });

    it('should handle empty league', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null });
      const standings = await getLeagueStandings('league-empty');
      expect(standings).toEqual([]);
    });

    it('should handle single player league', async () => {
      mockOrder.mockResolvedValueOnce({
        data: [{ user_id: 'u1', weekly_xp: 50, joined_at: '2026-03-01T00:00:00Z', display_name: 'Solo' }],
        error: null,
      });
      const standings = await getLeagueStandings('league-solo');
      expect(standings).toHaveLength(1);
      expect(standings[0].position).toBe(1);
      expect(standings[0].zone).toBe('promotion');
    });
  });

  // ─── WEEKLY RESET ──────────────────────────────────────────

  describe('processWeeklyReset', () => {
    it('should promote top 10, relegate bottom 5, keep middle', async () => {
      const leagues = [{ id: 'league-1', tier: 'silver' }];
      const members = Array.from({ length: 30 }, (_, i) => ({
        user_id: `u${i}`,
        weekly_xp: 1000 - i * 30,
        joined_at: '2026-03-01T00:00:00Z',
        display_name: `Player${i}`,
      }));

      // First order call: get active leagues
      mockOrder.mockResolvedValueOnce({ data: leagues, error: null });
      // Second order call: get standings for league-1
      mockOrder.mockResolvedValueOnce({ data: members, error: null });

      const result = await processWeeklyReset();
      expect(result.leaguesProcessed).toBe(1);
      expect(result.promoted).toBe(10);
      expect(result.relegated).toBe(5);
      expect(result.stayed).toBe(15);
    });

    it('should not promote players already in ruby tier', async () => {
      mockOrder.mockResolvedValueOnce({
        data: [{ id: 'league-ruby', tier: 'ruby' }],
        error: null,
      });
      mockOrder.mockResolvedValueOnce({
        data: [{ user_id: 'u1', weekly_xp: 999, joined_at: '2026-03-01T00:00:00Z', display_name: 'Top' }],
        error: null,
      });

      const result = await processWeeklyReset();
      expect(result.promoted).toBe(0);
    });

    it('should not relegate players already in bronze tier', async () => {
      const members = Array.from({ length: 30 }, (_, i) => ({
        user_id: `u${i}`,
        weekly_xp: 1000 - i * 30,
        joined_at: '2026-03-01T00:00:00Z',
        display_name: `Player${i}`,
      }));

      mockOrder.mockResolvedValueOnce({
        data: [{ id: 'league-bronze', tier: 'bronze' }],
        error: null,
      });
      mockOrder.mockResolvedValueOnce({ data: members, error: null });

      const result = await processWeeklyReset();
      expect(result.relegated).toBe(0);
    });
  });

  // ─── GET LEAGUE RIVALS ──────────────────────────────────────

  describe('getLeagueRivals', () => {
    function makeStandingsMembers(count: number) {
      return Array.from({ length: count }, (_, i) => ({
        user_id: `u${i}`,
        weekly_xp: 1000 - i * 30,
        joined_at: '2026-03-01T00:00:00Z',
        display_name: `Player${i}`,
      }));
    }

    it('should return player above and below in standings', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { league_id: 'league-1', user_id: 'u5' },
        error: null,
      });
      mockOrder.mockResolvedValueOnce({
        data: makeStandingsMembers(10),
        error: null,
      });

      const result = await getLeagueRivals('u5');
      expect(result.player.position).toBe(6);
      expect(result.above).not.toBeNull();
      expect(result.above!.username).toBe('Player4');
      expect(result.above!.position).toBe(5);
      expect(result.below).not.toBeNull();
      expect(result.below!.username).toBe('Player6');
      expect(result.below!.position).toBe(7);
    });

    it('should return null above when player is first', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { league_id: 'league-1', user_id: 'u0' },
        error: null,
      });
      mockOrder.mockResolvedValueOnce({
        data: makeStandingsMembers(5),
        error: null,
      });

      const result = await getLeagueRivals('u0');
      expect(result.above).toBeNull();
      expect(result.below).not.toBeNull();
      expect(result.player.position).toBe(1);
    });

    it('should return null below when player is last', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { league_id: 'league-1', user_id: 'u4' },
        error: null,
      });
      mockOrder.mockResolvedValueOnce({
        data: makeStandingsMembers(5),
        error: null,
      });

      const result = await getLeagueRivals('u4');
      expect(result.below).toBeNull();
      expect(result.above).not.toBeNull();
      expect(result.player.position).toBe(5);
    });

    it('should return both null for solo player', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { league_id: 'league-1', user_id: 'u0' },
        error: null,
      });
      mockOrder.mockResolvedValueOnce({
        data: [{ user_id: 'u0', weekly_xp: 100, joined_at: '2026-03-01T00:00:00Z', display_name: 'Solo' }],
        error: null,
      });

      const result = await getLeagueRivals('u0');
      expect(result.above).toBeNull();
      expect(result.below).toBeNull();
      expect(result.player.position).toBe(1);
      expect(result.player.score).toBe(100);
    });

    it('should throw when player not in a league', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(getLeagueRivals('no-league-user')).rejects.toThrow(
        'Player not in a league'
      );
    });
  });

  // ─── GET OR CREATE LEAGUE ─────────────────────────────────

  describe('getOrCreateLeague', () => {
    it('should return existing league if player already in one', async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'member-1',
          league_id: 'league-1',
          user_id: 'user-1',
          league: { id: 'league-1', tier: 'bronze' },
        },
        error: null,
      });

      const result = await getOrCreateLeague('user-1');
      expect(result.leagueId).toBe('league-1');
      expect(result.tier).toBe('bronze');
    });

    it('should join open league with room', async () => {
      // No existing membership
      mockSingle.mockResolvedValueOnce({ data: null, error: null });
      // Open league found
      mockLimit.mockResolvedValueOnce({
        data: [{ id: 'open-league', tier: 'silver', member_count: 20 }],
        error: null,
      });
      // Insert member
      mockSingle.mockResolvedValueOnce({
        data: { id: 'member-2', league_id: 'open-league' },
        error: null,
      });

      const result = await getOrCreateLeague('user-1', 'silver');
      expect(result.leagueId).toBe('open-league');
    });

    it('should create new league when none available', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: null });
      mockLimit.mockResolvedValueOnce({ data: [], error: null });
      mockSingle.mockResolvedValueOnce({
        data: { id: 'new-league', tier: 'bronze' },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { id: 'member-1', league_id: 'new-league' },
        error: null,
      });

      const result = await getOrCreateLeague('user-1');
      expect(result.leagueId).toBe('new-league');
      expect(result.tier).toBe('bronze');
    });
  });
});
