import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completeDailyQuestsForResult, checkAndClaimGrandSlam, PER_MISSION_XP } from '../dailyMissionsManager';
import { emptyQuestResult } from '../../../shared/dailyQuestPool';
import { xpForLevel } from '../../../shared/xp/levelCurve';

const { mockFrom, mockRpc, mockUpdateQuestProgress } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockUpdateQuestProgress: vi.fn(),
}));

vi.mock('../supabase/client', () => ({ getSupabase: () => ({ from: mockFrom, rpc: mockRpc }) }));
vi.mock('../../services/economy/awardCoins', () => ({ awardCoinsServer: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock('../questFeedManager', () => ({ recordQuestAchievement: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../weeklyQuestManager', () => ({
  getActiveQuest: vi.fn().mockResolvedValue(null),
  updateQuestProgress: (...a: unknown[]) => mockUpdateQuestProgress(...a),
}));
vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const PLAYER = 'player-1';
const DATE = '2026-06-27';
const ROW = {
  word_hunt_completed: false,
  adventure_completed: false,
  community_completed: false,
  grand_slam_claimed: false,
};

/** Every query reads `row`; an update applies only when its `.eq` filters on row columns match, like Postgres. */
function fakeDb(row: Record<string, unknown>, opts: { updateAffects?: (patch: Record<string, unknown>) => boolean } = {}) {
  const state = { ...row };
  mockFrom.mockImplementation(() => {
    let patch: Record<string, unknown> | null = null;
    const filters: [string, unknown][] = [];
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        filters.push([col, val]);
        return chain;
      },
      upsert: () => chain,
      maybeSingle: () => Promise.resolve({ data: { ...state }, error: null }),
      single: () => Promise.resolve({ data: { ...state }, error: null }),
      update: (p: Record<string, unknown>) => {
        patch = p;
        return chain;
      },
      then: (resolve: (v: unknown) => unknown) => {
        const matches = filters.every(([k, v]) => !(k in state) || state[k] === v);
        const affects = patch ? matches && (opts.updateAffects?.(patch) ?? true) : true;
        if (patch && affects) Object.assign(state, patch);
        return Promise.resolve({ data: affects ? [patch ?? {}] : [], error: null }).then(resolve);
      },
    };
    return chain;
  });
  return state;
}

function xpRow(oldLevel: number, newLevel: number, granted: number) {
  const total = newLevel > oldLevel ? xpForLevel(newLevel) + 1 : xpForLevel(oldLevel) + granted + 1;
  return { data: [{ new_total_xp: total, xp_granted: granted, new_level: newLevel }], error: null };
}

const winAll = emptyQuestResult({
  longestWordLength: 20,
  score: 5000,
  wordsFound: 80,
  maxCombo: 20,
  isMultiplayer: true,
  humanOpponentCount: 1,
  isTopHuman: true,
  beatHumanOpponent: true,
  mode: 'classic',
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateQuestProgress.mockResolvedValue(null);
});

describe('completeDailyQuestsForResult reports the level change', () => {
  it('returns null when the result completes no quest', async () => {
    fakeDb(ROW);
    await expect(completeDailyQuestsForResult(PLAYER, emptyQuestResult(), DATE)).resolves.toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns the level-up a mission grant caused', async () => {
    fakeDb(ROW);
    mockRpc.mockResolvedValueOnce(xpRow(4, 5, PER_MISSION_XP)).mockResolvedValue(xpRow(5, 5, PER_MISSION_XP));
    const out = await completeDailyQuestsForResult(PLAYER, winAll, DATE);
    expect(mockRpc).toHaveBeenCalled();
    expect(out?.levelUp).toEqual({ oldLevel: 4, newLevel: 5 });
    expect(out?.xpEarned).toBeGreaterThanOrEqual(PER_MISSION_XP);
  });

  it('folds in the weekly quest XP the grand slam completes', async () => {
    fakeDb({ ...ROW, word_hunt_completed: true, adventure_completed: true, community_completed: true });
    mockRpc.mockResolvedValue(xpRow(6, 6, 50));
    mockUpdateQuestProgress.mockResolvedValue({
      completed: true,
      xpGrant: { xpEarned: 300, newTotalXp: xpForLevel(7) + 1, oldLevel: 6, newLevel: 7, leveledUp: true },
    });
    const out = await completeDailyQuestsForResult(PLAYER, winAll, DATE);
    expect(mockUpdateQuestProgress).toHaveBeenCalledWith(PLAYER, { dailyMissionDaysCompleted: 1 });
    expect(out?.levelUp).toEqual({ oldLevel: 6, newLevel: 7 });
  });

  it('announces nothing on a replay: every slot is already complete', async () => {
    fakeDb({ word_hunt_completed: true, adventure_completed: true, community_completed: true, grand_slam_claimed: true });
    const out = await completeDailyQuestsForResult(PLAYER, winAll, DATE);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(out).toBeNull();
  });
});

describe('checkAndClaimGrandSlam claims once', () => {
  it('grants nothing when a concurrent claim already flipped the flag', async () => {
    fakeDb(
      { word_hunt_completed: true, adventure_completed: true, community_completed: true, grand_slam_claimed: false },
      { updateAffects: (patch) => !('grand_slam_claimed' in patch) },
    );
    const out = await checkAndClaimGrandSlam(PLAYER, DATE);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(out.reward).toBe(0);
  });

  it('returns the grant on a genuine claim', async () => {
    fakeDb({ word_hunt_completed: true, adventure_completed: true, community_completed: true, grand_slam_claimed: false });
    mockRpc.mockResolvedValue(xpRow(2, 3, 500));
    const out = await checkAndClaimGrandSlam(PLAYER, DATE);
    expect(out).toMatchObject({ claimed: true, reward: 500 });
    expect(out.xpGrant?.newLevel).toBe(3);
  });
});
