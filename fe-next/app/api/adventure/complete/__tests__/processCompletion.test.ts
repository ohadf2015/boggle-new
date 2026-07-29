// @ts-nocheck
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  after: vi.fn((fn: () => Promise<void>) => fn()),
}));

const mockLoadDictionaryWords = vi.fn().mockResolvedValue(['cat', 'dog', 'tree', 'house', 'castle']);
vi.mock('@/app/api/word-solver/dictionaryLoader', () => ({
  loadDictionaryWords: (...args: unknown[]) => mockLoadDictionaryWords(...args),
}));

vi.mock('@/shared/utils/adventureXpUtils', () => ({
  getLevelFromXp: vi.fn((xp: number) => Math.floor(xp / 100) + 1),
}));

vi.mock('@/lib/adventure/upgradeConfig', () => ({
  getUpgradeEffect: vi.fn().mockReturnValue(0),
  getUpgradeTier: vi.fn().mockReturnValue(0),
}));

vi.mock('@/lib/adventure/lootGenerator', () => ({
  generateLevelLoot: vi.fn().mockReturnValue([]),
}));

vi.mock('@/backend/modules/dailyMissionsManager', () => ({
  completeMission: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lootInventory', () => ({
  persistLootToInventory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../weeklyQuest', () => ({
  updateWeeklyQuestProgress: vi.fn().mockResolvedValue(null),
}));

import { processAdventureCompletion } from '../processCompletion';

const validData = {
  world: 1, level: 1, stars: 3, score: 500, words: 10, timePlayed: 60,
};

function makeMockSupabase(opts: {
  progression?: Record<string, unknown> | null;
  completion?: Record<string, unknown> | null;
} = {}) {
  const progression = opts.progression ?? {
    user_id: 'user-1', player_level: 1, xp: 0,
    current_world: 1, current_level: 1, total_stars: 0, gold: 100,
  };
  const completion = opts.completion ?? null;

  return {
    auth: { getUser: vi.fn() },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'player_progression') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: progression, error: null }),
            }),
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: progression, error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'level_completions') {
        return {
          select: vi.fn().mockImplementation((cols: string) => {
            if (cols === 'gold_earned') {
              return {
                eq: vi.fn().mockReturnValue({
                  gte: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              };
            }
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: completion, error: null }),
                  }),
                }),
              }),
            };
          }),
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { world: 1, level: 1, stars: 3, best_score: 500, best_words: 10, completed_at: '2026-01-01T00:00:00Z' },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    }),
  };
}

describe('processAdventureCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects when timePlayed below minimum (security gate applies to offline-sync too)', async () => {
    const supabase = makeMockSupabase();
    const result = await processAdventureCompletion(
      { ...validData, timePlayed: 5 },
      'user-1',
      { supabase: supabase as unknown as never, source: 'offline-sync' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/timePlayed/);
    }
  });

  it('returns ok=true with completion + xpEarned + goldEarned on happy path', async () => {
    const supabase = makeMockSupabase();
    const result = await processAdventureCompletion(
      validData,
      'user-1',
      { supabase: supabase as unknown as never, source: 'live' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.success).toBe(true);
      expect(result.body.completion.world).toBe(1);
      expect(typeof result.body.xpEarned).toBe('number');
      expect(typeof result.body.goldEarned).toBe('number');
      expect(result.body.isReplay).toBe(false);
    }
  });

  it('flags isReplay=true on second completion', async () => {
    const supabase = makeMockSupabase({
      completion: { stars: 2, best_score: 300, best_words: 5 },
    });
    const result = await processAdventureCompletion(
      validData,
      'user-1',
      { supabase: supabase as unknown as never, source: 'offline-sync' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.isReplay).toBe(true);
    }
  });

  it('rejects skip-ahead with status 403', async () => {
    const supabase = makeMockSupabase({
      progression: {
        user_id: 'user-1', player_level: 1, xp: 0,
        current_world: 1, current_level: 1, total_stars: 0, gold: 100,
      },
      completion: null,
    });
    const result = await processAdventureCompletion(
      { ...validData, world: 5, level: 3 },
      'user-1',
      { supabase: supabase as unknown as never, source: 'offline-sync' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});
