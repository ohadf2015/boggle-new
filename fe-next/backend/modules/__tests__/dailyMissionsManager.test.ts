/**
 * Tests for dailyMissionsManager
 */

import { vi } from 'vitest';
import { getDailyMissions, completeMission, completeMissionForMode, checkAndClaimGrandSlam, markCelebrated, GRAND_SLAM_COIN_REWARD } from '../dailyMissionsManager';
import { getDailyQuestModes } from '../../../shared/dailyQuestPool';

const { mockAwardCoins } = vi.hoisted(() => {
  const mockAwardCoins = vi.fn();
  return { mockAwardCoins };
});
vi.mock('../../services/economy/awardCoins', () => ({
  awardCoinsServer: (...args: unknown[]) => mockAwardCoins(...args),
  MAX_SERVER_COIN_AWARD: 2000,
}));

// Mock supabaseServer
const { mockSelect, mockEq, mockMaybeSingle, mockSingle, mockUpdate, mockUpsert, mockRpc, mockFrom, mockSupabase, chainable } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockSingle = vi.fn();
  const mockUpdate = vi.fn();
  const mockUpsert = vi.fn();
  const mockRpc = vi.fn().mockResolvedValue({ error: null });
  const chainable = {
    select: mockSelect,
    eq: mockEq,
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
    update: mockUpdate,
    upsert: mockUpsert,
  };
  mockSelect.mockReturnValue(chainable);
  mockEq.mockReturnValue(chainable);
  mockUpdate.mockReturnValue(chainable);
  mockUpsert.mockReturnValue(chainable);
  const mockFrom = vi.fn().mockReturnValue(chainable);
  const mockSupabase = { from: mockFrom, rpc: mockRpc };
  return { mockSelect, mockEq, mockMaybeSingle, mockSingle, mockUpdate, mockUpsert, mockRpc, mockFrom, mockSupabase, chainable };
});


vi.mock('../supabase/client', () => ({
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

const PLAYER_ID = 'player-123';

const EMPTY_ROW = {
  word_hunt_completed: false,
  adventure_completed: false,
  community_completed: false,
  grand_slam_claimed: false,
  word_hunt_celebrated: false,
  adventure_celebrated: false,
  community_celebrated: false,
  grand_slam_celebrated: false,
};

const FULL_ROW = {
  word_hunt_completed: true,
  adventure_completed: true,
  community_completed: true,
  grand_slam_claimed: false,
  word_hunt_celebrated: false,
  adventure_celebrated: false,
  community_celebrated: false,
  grand_slam_celebrated: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  // Reset chain
  mockSelect.mockReturnValue(chainable);
  mockEq.mockReturnValue(chainable);
  mockUpdate.mockReturnValue(chainable);
  mockUpsert.mockReturnValue(chainable);
  mockFrom.mockReturnValue(chainable);
  mockAwardCoins.mockResolvedValue({ success: true, newBalance: 100 });
});

describe('getDailyMissions', () => {
  it('returns missions from existing row', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: EMPTY_ROW, error: null });

    const result = await getDailyMissions(PLAYER_ID);

    expect(result.wordHunt).toBe(false);
    expect(result.adventure).toBe(false);
    expect(result.community).toBe(false);
    expect(result.grandSlamClaimed).toBe(false);
    expect(result.completedCount).toBe(0);
    expect(mockFrom).toHaveBeenCalledWith('player_daily_missions');
  });

  it('upserts a new row when none exists (null data)', async () => {
    // First call: no row — maybeSingle returns null data, no error
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // After upsert, single() returns the inserted row
    mockSingle.mockResolvedValueOnce({ data: EMPTY_ROW, error: null });

    const result = await getDailyMissions(PLAYER_ID);

    expect(result.completedCount).toBe(0);
    expect(mockUpsert).toHaveBeenCalled();
  });

  it('returns defaults on unexpected error', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: { code: 'OTHER', message: 'fail' } });

    const result = await getDailyMissions(PLAYER_ID);

    expect(result.completedCount).toBe(0);
    expect(result.wordHunt).toBe(false);
  });

  it('counts completed missions correctly', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { ...EMPTY_ROW, word_hunt_completed: true, adventure_completed: true },
      error: null,
    });

    const result = await getDailyMissions(PLAYER_ID);

    expect(result.completedCount).toBe(2);
    expect(result.wordHunt).toBe(true);
    expect(result.adventure).toBe(true);
  });
});

describe('completeMission', () => {
  it('marks a mission as complete and returns updated missions', async () => {
    // getDailyMissions (ensure row exists)
    mockMaybeSingle
      .mockResolvedValueOnce({ data: EMPTY_ROW, error: null });

    // update call
    mockEq.mockReturnValue(chainable);
    mockUpdate.mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) });

    // getDailyMissions (return updated)
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { ...EMPTY_ROW, word_hunt_completed: true }, error: null });

    const result = await completeMission(PLAYER_ID, 'word_hunt');

    expect(result.wordHunt).toBe(true);
  });
});

describe('completeMissionForMode', () => {
  // SLOT_COLUMNS = [word_hunt_completed, adventure_completed, community_completed].
  // The mode that fills each slot rotates daily, so a mode MUST be credited to
  // the column for the slot it occupies *that day* — never a hardcoded column.
  // Regression guard for: completing the Word Hunt daily challenge marked
  // word_hunt_completed (slot 0) statically; on days where slot 0 is the
  // `multiplayer` mode the UI then showed "finished mp game".
  const SLOT_COLUMNS = ['word_hunt_completed', 'adventure_completed', 'community_completed'] as const;

  function setupCompleteMissionChain() {
    // getDailyMissions (ensure row) + getDailyMissions (return updated) both read maybeSingle
    mockMaybeSingle.mockResolvedValue({ data: EMPTY_ROW, error: null });
    // update().eq().eq() resolves with no error
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    });
  }

  it('credits wordHunt to the slot column it occupies today, not always word_hunt_completed', async () => {
    // 2026-05-20: modes = [multiplayer, wordHunt, brainDrills] → wordHunt is slot 1
    const DATE = '2026-05-20';
    const slot = getDailyQuestModes(DATE).indexOf('wordHunt');
    expect(slot).toBe(1); // pins the fixture so the assertion below is meaningful
    setupCompleteMissionChain();

    await completeMissionForMode('player-123', 'wordHunt', DATE);

    expect(mockUpdate).toHaveBeenCalledWith({ adventure_completed: true });
    expect(mockUpdate).not.toHaveBeenCalledWith({ word_hunt_completed: true });
  });

  it('credits multiplayer to the slot column it occupies today', async () => {
    // 2026-05-20: multiplayer is slot 0 → word_hunt_completed
    const DATE = '2026-05-20';
    const slot = getDailyQuestModes(DATE).indexOf('multiplayer');
    setupCompleteMissionChain();

    await completeMissionForMode('player-123', 'multiplayer', DATE);

    expect(mockUpdate).toHaveBeenCalledWith({ [SLOT_COLUMNS[slot]]: true });
  });
});

describe('checkAndClaimGrandSlam', () => {
  it('returns not claimed when missions incomplete', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: EMPTY_ROW, error: null });

    const result = await checkAndClaimGrandSlam(PLAYER_ID);

    expect(result.claimed).toBe(false);
    expect(result.reward).toBe(0);
  });

  it('claims grand slam when all 3 complete and grants XP', async () => {
    // getDailyMissions
    mockMaybeSingle.mockResolvedValueOnce({ data: FULL_ROW, error: null });

    // update grand_slam_claimed
    mockUpdate.mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) });

    const result = await checkAndClaimGrandSlam(PLAYER_ID);

    expect(result.claimed).toBe(true);
    expect(result.reward).toBe(500);
    // Verify XP was actually granted
    expect(mockRpc).toHaveBeenCalledWith('increment_player_xp', {
      p_player_id: PLAYER_ID,
      p_xp_amount: 500,
    });
  });

  it('returns already claimed when grand_slam_claimed is true', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { ...FULL_ROW, grand_slam_claimed: true },
      error: null,
    });

    const result = await checkAndClaimGrandSlam(PLAYER_ID);

    expect(result.claimed).toBe(true);
    expect(result.reward).toBe(0);
    // Should NOT grant XP again
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('does not grant XP when missions are incomplete', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: EMPTY_ROW, error: null });

    const result = await checkAndClaimGrandSlam(PLAYER_ID);

    expect(result.claimed).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('grants GRAND_SLAM_COIN_REWARD coins on claim (alongside XP)', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: FULL_ROW, error: null });
    mockUpdate.mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) });

    await checkAndClaimGrandSlam(PLAYER_ID);

    expect(mockAwardCoins).toHaveBeenCalledTimes(1);
    expect(mockAwardCoins).toHaveBeenCalledWith(
      PLAYER_ID,
      GRAND_SLAM_COIN_REWARD,
      'grand_slam',
      expect.any(Object),
    );
  });

  it('does NOT grant coins when already claimed (idempotent via grand_slam_claimed flag)', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { ...FULL_ROW, grand_slam_claimed: true },
      error: null,
    });

    await checkAndClaimGrandSlam(PLAYER_ID);

    expect(mockAwardCoins).not.toHaveBeenCalled();
  });

  it('does NOT grant coins when missions incomplete', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: EMPTY_ROW, error: null });

    await checkAndClaimGrandSlam(PLAYER_ID);

    expect(mockAwardCoins).not.toHaveBeenCalled();
  });

  it('still claims (returns claimed=true) when coin grant fails (best-effort)', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: FULL_ROW, error: null });
    mockUpdate.mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) });
    mockAwardCoins.mockResolvedValueOnce({ success: false, error: 'rpc fail' });

    const result = await checkAndClaimGrandSlam(PLAYER_ID);

    expect(result.claimed).toBe(true);
    expect(result.reward).toBe(500);
  });
});

describe('getDailyMissions — celebrated flags', () => {
  it('surfaces celebrated flags on the row (defaults to false when absent)', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        ...EMPTY_ROW,
        word_hunt_completed: true,
        word_hunt_celebrated: true,
        adventure_celebrated: null,
      },
      error: null,
    });

    const result = await getDailyMissions(PLAYER_ID);

    expect(result.wordHuntCelebrated).toBe(true);
    expect(result.adventureCelebrated).toBe(false);
    expect(result.communityCelebrated).toBe(false);
    expect(result.grandSlamCelebrated).toBe(false);
  });
});

describe('markCelebrated', () => {
  function setupCelebrationChain(affectedRows: Array<Record<string, unknown>>) {
    // Build an update().eq().eq().eq(col, false).select(col) chain that
    // resolves to { data: affectedRows, error: null } at the final .select().
    const finalThenable = { data: affectedRows, error: null };
    const selectFn = vi.fn().mockResolvedValue(finalThenable);
    const eqCol = vi.fn().mockReturnValue({ select: selectFn });
    const eqDate = vi.fn().mockReturnValue({ eq: eqCol });
    const eqPlayer = vi.fn().mockReturnValue({ eq: eqDate });
    mockUpdate.mockReturnValueOnce({ eq: eqPlayer });
    return { selectFn, eqCol, eqDate, eqPlayer };
  }

  it('returns newlyCelebrated=true when update affects a row (false→true transition)', async () => {
    // getDailyMissions (ensure row exists)
    mockMaybeSingle.mockResolvedValueOnce({ data: EMPTY_ROW, error: null });
    const { eqCol } = setupCelebrationChain([{ word_hunt_celebrated: true }]);

    const result = await markCelebrated(PLAYER_ID, 'word_hunt');

    expect(result.newlyCelebrated).toBe(true);
    // conditional flip: last .eq() filters on the column being false
    expect(eqCol).toHaveBeenCalledWith('word_hunt_celebrated', false);
  });

  it('returns newlyCelebrated=false when update affects zero rows (already celebrated)', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { ...EMPTY_ROW, word_hunt_celebrated: true },
      error: null,
    });
    setupCelebrationChain([]);

    const result = await markCelebrated(PLAYER_ID, 'word_hunt');

    expect(result.newlyCelebrated).toBe(false);
  });

  it('returns newlyCelebrated=false on db error', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: EMPTY_ROW, error: null });
    const selectFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const eqCol = vi.fn().mockReturnValue({ select: selectFn });
    const eqDate = vi.fn().mockReturnValue({ eq: eqCol });
    const eqPlayer = vi.fn().mockReturnValue({ eq: eqDate });
    mockUpdate.mockReturnValueOnce({ eq: eqPlayer });

    const result = await markCelebrated(PLAYER_ID, 'grand_slam');

    expect(result.newlyCelebrated).toBe(false);
  });

  it('returns newlyCelebrated=false for invalid celebration key', async () => {
    // @ts-expect-error — deliberately passing invalid key to test guard
    const result = await markCelebrated(PLAYER_ID, 'not_a_key');
    expect(result.newlyCelebrated).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
