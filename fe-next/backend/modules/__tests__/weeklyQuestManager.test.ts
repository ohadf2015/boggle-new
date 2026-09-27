/**
 * Tests for weeklyQuestManager
 *
 * Covers: getAvailableQuests, selectQuest, getActiveQuest, updateQuestProgress
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  getAvailableQuests,
  selectQuest,
  getActiveQuest,
  updateQuestProgress,
  getWeekStart,
} from '../weeklyQuestManager';

// --- Supabase mock with full chain support ---

let mockChainResult: { data: unknown; error: unknown } = { data: null, error: null };

const createChain = () => {
  const chain: Record<string, Mock> = {};
  const self = () => chain;

  chain.select = vi.fn().mockImplementation(self);
  chain.eq = vi.fn().mockImplementation(self);
  chain.insert = vi.fn().mockImplementation(self);
  chain.update = vi.fn().mockImplementation(self);
  chain.single = vi.fn().mockImplementation(() => Promise.resolve(mockChainResult));

  return chain;
};

let currentChain = createChain();
const { mockFrom, mockRpc, mockSupabase } = vi.hoisted(() => {
  const mockFrom = vi.fn().mockImplementation(() => currentChain);
  const mockRpc = vi.fn().mockResolvedValue({ error: null });
  const mockSupabase = { from: mockFrom, rpc: mockRpc };
  return { mockFrom, mockRpc, mockSupabase };
});

vi.mock('../supabaseServer', () => ({
  getSupabase: () => mockSupabase,
}));

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const PLAYER_ID = 'player-abc-123';

beforeEach(() => {
  vi.clearAllMocks();
  currentChain = createChain();
  mockFrom.mockImplementation(() => currentChain);
  mockRpc.mockResolvedValue({ error: null });
  mockChainResult = { data: null, error: null };
});

describe('getWeekStart', () => {
  it('returns Monday for any day of the week', () => {
    // Wednesday 2026-03-18
    const wed = getWeekStart(new Date('2026-03-18T12:00:00Z'));
    expect(wed).toBe('2026-03-16');

    // Monday 2026-03-16
    const mon = getWeekStart(new Date('2026-03-16T12:00:00Z'));
    expect(mon).toBe('2026-03-16');

    // Sunday 2026-03-22
    const sun = getWeekStart(new Date('2026-03-22T12:00:00Z'));
    expect(sun).toBe('2026-03-16');
  });
});

describe('getAvailableQuests', () => {
  it('returns 3 quests: easy, medium, hard', () => {
    const quests = getAvailableQuests();
    expect(quests).toHaveLength(3);
    expect(quests[0].difficulty).toBe('easy');
    expect(quests[1].difficulty).toBe('medium');
    expect(quests[2].difficulty).toBe('hard');
  });

  it('returns deterministic quests for the same week', () => {
    const q1 = getAvailableQuests(new Date('2026-03-18'));
    const q2 = getAvailableQuests(new Date('2026-03-20'));
    expect(q1).toEqual(q2);
  });

  it('may return different quests for different weeks', () => {
    const q1 = getAvailableQuests(new Date('2026-03-16'));
    const q2 = getAvailableQuests(new Date('2026-03-23'));
    // Different week starts produce different IDs
    expect(q1[0].id).not.toBe(q2[0].id);
  });

  it('assigns correct XP for each difficulty', () => {
    const quests = getAvailableQuests();
    expect(quests[0].xpReward).toBe(200);
    expect(quests[1].xpReward).toBe(500);
    expect(quests[2].xpReward).toBe(1000);
  });

  it('each quest has id, type, target, description, difficulty', () => {
    const quests = getAvailableQuests();
    for (const q of quests) {
      expect(q.id).toBeDefined();
      expect(q.type).toBeDefined();
      expect(q.target).toBeGreaterThan(0);
      expect(q.description).toBeDefined();
      expect(['easy', 'medium', 'hard']).toContain(q.difficulty);
    }
  });
});

describe('selectQuest', () => {
  it('rejects if player already has a quest this week', async () => {
    // First call to .from() for checking existing — returns existing quest
    mockChainResult = { data: { id: 'existing' }, error: null };

    await expect(selectQuest(PLAYER_ID, 'easy_play_games_2026-03-16'))
      .rejects.toThrow('already selected');
  });

  it('rejects if quest id is invalid', async () => {
    // No existing quest
    mockChainResult = { data: null, error: { message: 'not found', code: 'PGRST116' } };

    await expect(selectQuest(PLAYER_ID, 'nonexistent_quest'))
      .rejects.toThrow('Invalid quest id');
  });

  it('inserts quest row for the player', async () => {
    const available = getAvailableQuests();
    const questId = available[0].id;

    // First call: check existing — no existing quest
    const checkChain = createChain();
    checkChain.single.mockResolvedValue({ data: null, error: { message: 'not found', code: 'PGRST116' } });

    // Second call: insert
    const insertChain = createChain();
    insertChain.single.mockResolvedValue({
      data: {
        id: 'new-uuid',
        quest_type: available[0].type,
        title: available[0].description,
        description: available[0].description,
        requirements: JSON.stringify({ target: available[0].target, type: available[0].type }),
        current_progress: JSON.stringify({ current: 0 }),
        xp_reward: available[0].xpReward,
        completed: false,
        week_start: getWeekStart(),
      },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? checkChain : insertChain;
    });

    const result = await selectQuest(PLAYER_ID, questId);
    expect(result.questType).toBe(available[0].type);
    expect(result.current).toBe(0);
    expect(result.completed).toBe(false);
  });
});

describe('getActiveQuest', () => {
  it('returns null when no active quest', async () => {
    mockChainResult = { data: null, error: { message: 'not found' } };
    const result = await getActiveQuest(PLAYER_ID);
    expect(result).toBeNull();
  });

  it('returns quest with progress when found', async () => {
    mockChainResult = {
      data: {
        id: 'quest-uuid',
        quest_type: 'play_games',
        title: 'Play 3 games',
        description: 'Play 3 games this week',
        requirements: JSON.stringify({ target: 3, type: 'play_games' }),
        current_progress: JSON.stringify({ current: 1 }),
        xp_reward: 200,
        completed: false,
        week_start: '2026-03-16',
      },
      error: null,
    };

    const result = await getActiveQuest(PLAYER_ID);
    expect(result).not.toBeNull();
    expect(result!.questType).toBe('play_games');
    expect(result!.current).toBe(1);
    expect(result!.target).toBe(3);
    expect(result!.xpReward).toBe(200);
    expect(result!.completed).toBe(false);
  });
});

describe('updateQuestProgress', () => {
  it('returns null when no active quest', async () => {
    mockChainResult = { data: null, error: { message: 'not found' } };
    const result = await updateQuestProgress(PLAYER_ID, { gamesPlayed: 1 });
    expect(result).toBeNull();
  });

  it('increments progress for matching quest type', async () => {
    // getActiveQuest chain
    const getChain = createChain();
    getChain.single.mockResolvedValue({
      data: {
        id: 'quest-uuid',
        quest_type: 'play_games',
        title: 'Play 3 games',
        description: 'Play 3 games this week',
        requirements: JSON.stringify({ target: 3, type: 'play_games' }),
        current_progress: JSON.stringify({ current: 1 }),
        xp_reward: 200,
        completed: false,
        week_start: getWeekStart(),
      },
      error: null,
    });

    // update chain
    const updateChain = createChain();
    updateChain.single.mockResolvedValue({ data: {}, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? getChain : updateChain;
    });

    const result = await updateQuestProgress(PLAYER_ID, { gamesPlayed: 1 });
    expect(result).not.toBeNull();
    expect(result!.current).toBe(2);
    expect(result!.completed).toBe(false);
  });

  it('marks quest complete when target reached', async () => {
    const getChain = createChain();
    getChain.single.mockResolvedValue({
      data: {
        id: 'quest-uuid',
        quest_type: 'play_games',
        title: 'Play 3 games',
        description: 'Play 3 games this week',
        requirements: JSON.stringify({ target: 3, type: 'play_games' }),
        current_progress: JSON.stringify({ current: 2 }),
        xp_reward: 200,
        completed: false,
        week_start: getWeekStart(),
      },
      error: null,
    });

    const updateChain = createChain();
    updateChain.single.mockResolvedValue({ data: {}, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? getChain : updateChain;
    });

    const result = await updateQuestProgress(PLAYER_ID, { gamesPlayed: 1 });
    expect(result).not.toBeNull();
    expect(result!.current).toBe(3);
    expect(result!.completed).toBe(true);
  });

  it('returns null when stat delta is zero', async () => {
    mockChainResult = {
      data: {
        id: 'quest-uuid',
        quest_type: 'play_games',
        title: 'Play 3 games',
        description: 'Play 3 games this week',
        requirements: JSON.stringify({ target: 3, type: 'play_games' }),
        current_progress: JSON.stringify({ current: 1 }),
        xp_reward: 200,
        completed: false,
        week_start: getWeekStart(),
      },
      error: null,
    };

    // Pass unrelated stat
    const result = await updateQuestProgress(PLAYER_ID, { wordsFound: 5 });
    expect(result).toBeNull();
  });

  describe('B8: Race condition fix — XP/avatar double-grant', () => {
    it('grants XP only when THIS call completes the quest (race-safe)', async () => {
      const getChain = createChain();
      getChain.single.mockResolvedValue({
        data: {
          id: 'quest-uuid',
          quest_type: 'play_games',
          title: 'Play 3 games',
          description: 'Play 3 games this week',
          requirements: JSON.stringify({ target: 3, type: 'play_games' }),
          current_progress: JSON.stringify({ current: 2 }),
          xp_reward: 500,
          completed: false,
          week_start: getWeekStart(),
        },
        error: null,
      });

      // Update chain: select() must resolve as a promise with {data, error}
      const updateChain = createChain();
      updateChain.select = vi.fn().mockResolvedValue({
        data: [{ id: 'quest-uuid' }], // 1 row affected = THIS call did the transition
        error: null,
      });
      updateChain.eq = vi.fn().mockReturnValue(updateChain);

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) return getChain;
        if (callCount === 2) return updateChain;
        return createChain();
      });

      const result = await updateQuestProgress(PLAYER_ID, { gamesPlayed: 1 });

      expect(result).not.toBeNull();
      expect(result!.completed).toBe(true);
      // XP should be granted when this call completed the quest
      expect(mockRpc).toHaveBeenCalledWith('increment_player_xp', {
        p_player_id: PLAYER_ID,
        p_xp_amount: 500,
      });
    });

    it('skips XP grant when another concurrent call already completed quest', async () => {
      const getChain = createChain();
      getChain.single.mockResolvedValue({
        data: {
          id: 'quest-uuid',
          quest_type: 'play_games',
          title: 'Play 3 games',
          description: 'Play 3 games this week',
          requirements: JSON.stringify({ target: 3, type: 'play_games' }),
          current_progress: JSON.stringify({ current: 2 }),
          xp_reward: 500,
          completed: false,
          week_start: getWeekStart(),
        },
        error: null,
      });

      // Update chain where select() returns 0 rows (already completed by concurrent call)
      const updateChain = createChain();
      updateChain.select = vi.fn().mockResolvedValue({
        data: [], // 0 rows affected = another call already completed
        error: null,
      });
      updateChain.eq = vi.fn().mockReturnValue(updateChain);

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) return getChain;
        if (callCount === 2) return updateChain;
        return createChain();
      });

      const result = await updateQuestProgress(PLAYER_ID, { gamesPlayed: 1 });

      expect(result).not.toBeNull();
      expect(result!.completed).toBe(true);
      // XP should NOT be granted — another call did the transition
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('progress-only update does not throw on select', async () => {
      const getChain = createChain();
      getChain.single.mockResolvedValue({
        data: {
          id: 'quest-uuid',
          quest_type: 'play_games',
          title: 'Play 3 games',
          description: 'Play 3 games this week',
          requirements: JSON.stringify({ target: 5, type: 'play_games' }),
          current_progress: JSON.stringify({ current: 1 }),
          xp_reward: 200,
          completed: false,
          week_start: getWeekStart(),
        },
        error: null,
      });

      // Update chain for progress-only: select() returns normally
      const updateChain = createChain();
      updateChain.select = vi.fn().mockResolvedValue({
        data: [{ id: 'quest-uuid' }],
        error: null,
      });
      updateChain.eq = vi.fn().mockReturnValue(updateChain);

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) return getChain;
        if (callCount === 2) return updateChain;
        return createChain();
      });

      const result = await updateQuestProgress(PLAYER_ID, { gamesPlayed: 1 });

      expect(result).not.toBeNull();
      expect(result!.current).toBe(2);
      expect(result!.completed).toBe(false);
    });

    it('returns null when getActiveQuest returns null (existing guard)', async () => {
      const getChain = createChain();
      getChain.single.mockResolvedValue({ data: null, error: null });

      mockFrom.mockReturnValue(getChain);

      const result = await updateQuestProgress(PLAYER_ID, { gamesPlayed: 1 });

      expect(result).toBeNull();
    });

    it('returns null when quest already completed (existing guard)', async () => {
      const getChain = createChain();
      getChain.single.mockResolvedValue({
        data: {
          id: 'quest-uuid',
          quest_type: 'play_games',
          title: 'Play 3 games',
          description: 'Play 3 games this week',
          requirements: JSON.stringify({ target: 3, type: 'play_games' }),
          current_progress: JSON.stringify({ current: 3 }),
          xp_reward: 200,
          completed: true, // Already completed
          week_start: getWeekStart(),
        },
        error: null,
      });

      mockFrom.mockReturnValue(getChain);

      const result = await updateQuestProgress(PLAYER_ID, { gamesPlayed: 1 });

      expect(result).toBeNull();
    });
  });
});
