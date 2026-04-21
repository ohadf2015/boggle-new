/**
 * Tests for dailyMissionsManager
 */

import { vi } from 'vitest';
import { getDailyMissions, completeMission, checkAndClaimGrandSlam, markCelebrated } from '../dailyMissionsManager';

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
