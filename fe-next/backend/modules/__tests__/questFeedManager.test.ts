import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isBroadcastableFamily,
  recordQuestAchievement,
  getRecentAchievements,
} from '../questFeedManager';

const { mockFrom, mockInsert, mockMaybeSingle, mockProfileSelect, mockState } = vi.hoisted(() => {
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const mockMaybeSingle = vi.fn();
  const mockProfileSelect = vi.fn();
  const mockState: { feedRows: unknown[] } = { feedRows: [] };

  const mockFrom = vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }),
      };
    }
    // quest_achievement_feed
    return {
      insert: mockInsert,
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: mockState.feedRows, error: null }),
        }),
      }),
    };
  });
  return { mockFrom, mockInsert, mockMaybeSingle, mockProfileSelect, mockState };
});

vi.mock('../supabase/client', () => ({ getSupabase: () => ({ from: mockFrom }) }));
vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
  mockState.feedRows = [];
});

describe('isBroadcastableFamily', () => {
  it('broadcasts PvP and grand_slam', () => {
    expect(isBroadcastableFamily('pvp')).toBe(true);
    expect(isBroadcastableFamily('grand_slam')).toBe(true);
  });
  it('does NOT broadcast skill or discovery (avoid feed spam)', () => {
    expect(isBroadcastableFamily('skill')).toBe(false);
    expect(isBroadcastableFamily('discovery')).toBe(false);
    expect(isBroadcastableFamily('')).toBe(false);
  });
});

describe('recordQuestAchievement', () => {
  it('skips non-broadcastable families without touching the DB', async () => {
    await recordQuestAchievement('p1', 'long_word_7', 'skill');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('skips when the player opted out (share_achievements=false)', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { display_name: 'Ann', share_achievements: false },
    });
    await recordQuestAchievement('p1', 'beat_human', 'pvp');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('inserts a feed row for a broadcastable opted-in completion', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { display_name: 'Ann', share_achievements: true },
    });
    await recordQuestAchievement('p1', 'beat_human', 'pvp');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ player_id: 'p1', quest_id: 'beat_human', family: 'pvp', display_name: 'Ann' }),
    );
  });

  it('falls back to username then a generic name', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { display_name: null, username: 'annie', share_achievements: true },
    });
    await recordQuestAchievement('p1', 'grand_slam', 'grand_slam');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: 'annie' }),
    );
  });
});

describe('getRecentAchievements', () => {
  it('maps DB rows to entries newest-first', async () => {
    mockState.feedRows = [
      { display_name: 'Ann', quest_id: 'beat_human', family: 'pvp', created_at: '2026-06-27T10:00:00Z' },
    ];
    const out = await getRecentAchievements(20);
    expect(out).toEqual([
      { displayName: 'Ann', questId: 'beat_human', family: 'pvp', createdAt: '2026-06-27T10:00:00Z' },
    ]);
  });

  it('returns [] when there are no rows', async () => {
    const out = await getRecentAchievements();
    expect(out).toEqual([]);
  });
});
