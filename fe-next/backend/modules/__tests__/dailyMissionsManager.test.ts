/**
 * Tests for dailyMissionsManager
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import { getDailyMissions, completeMission, checkAndClaimGrandSlam } from '../dailyMissionsManager';

// Mock supabaseServer
const { mockSelect, mockEq, mockSingle, mockUpdate, mockUpsert, mockRpc, mockFrom, mockSupabase, chainable } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockUpdate = vi.fn();
  const mockUpsert = vi.fn();
  const mockRpc = vi.fn().mockResolvedValue({ error: null });
  const chainable = {
    select: mockSelect,
    eq: mockEq,
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
  return { mockSelect, mockEq, mockSingle, mockUpdate, mockUpsert, mockRpc, mockFrom, mockSupabase, chainable };
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
const TODAY = new Date().toISOString().split('T')[0];

const EMPTY_ROW = {
  word_hunt_completed: false,
  brain_drill_completed: false,
  adventure_completed: false,
  community_completed: false,
  grand_slam_claimed: false,
};

const FULL_ROW = {
  word_hunt_completed: true,
  brain_drill_completed: true,
  adventure_completed: true,
  community_completed: true,
  grand_slam_claimed: false,
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
    mockSingle.mockResolvedValueOnce({ data: EMPTY_ROW, error: null });

    const result = await getDailyMissions(PLAYER_ID);

    expect(result.wordHunt).toBe(false);
    expect(result.brainDrill).toBe(false);
    expect(result.adventure).toBe(false);
    expect(result.community).toBe(false);
    expect(result.grandSlamClaimed).toBe(false);
    expect(result.completedCount).toBe(0);
    expect(mockFrom).toHaveBeenCalledWith('player_daily_missions');
  });

  it('upserts a new row when none exists (PGRST116)', async () => {
    // First call: no row
    mockSingle
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'No rows' } })
      // After upsert
      .mockResolvedValueOnce({ data: EMPTY_ROW, error: null });

    const result = await getDailyMissions(PLAYER_ID);

    expect(result.completedCount).toBe(0);
    expect(mockUpsert).toHaveBeenCalled();
  });

  it('returns defaults on unexpected error', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'OTHER', message: 'fail' } });

    const result = await getDailyMissions(PLAYER_ID);

    expect(result.completedCount).toBe(0);
    expect(result.wordHunt).toBe(false);
  });

  it('counts completed missions correctly', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { ...EMPTY_ROW, word_hunt_completed: true, adventure_completed: true },
      error: null,
    });

    const result = await getDailyMissions(PLAYER_ID);

    expect(result.completedCount).toBe(2);
    expect(result.wordHunt).toBe(true);
    expect(result.adventure).toBe(true);
    expect(result.brainDrill).toBe(false);
  });
});

describe('completeMission', () => {
  it('marks a mission as complete and returns updated missions', async () => {
    // getDailyMissions (ensure row exists)
    mockSingle
      .mockResolvedValueOnce({ data: EMPTY_ROW, error: null });

    // update call
    mockEq.mockReturnValue(chainable);
    mockUpdate.mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) });

    // getDailyMissions (return updated)
    mockSingle
      .mockResolvedValueOnce({ data: { ...EMPTY_ROW, word_hunt_completed: true }, error: null });

    const result = await completeMission(PLAYER_ID, 'word_hunt');

    expect(result.wordHunt).toBe(true);
  });
});

describe('checkAndClaimGrandSlam', () => {
  it('returns not claimed when missions incomplete', async () => {
    mockSingle.mockResolvedValueOnce({ data: EMPTY_ROW, error: null });

    const result = await checkAndClaimGrandSlam(PLAYER_ID);

    expect(result.claimed).toBe(false);
    expect(result.reward).toBe(0);
  });

  it('claims grand slam when all 4 complete and grants XP', async () => {
    // getDailyMissions
    mockSingle.mockResolvedValueOnce({ data: FULL_ROW, error: null });

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
    mockSingle.mockResolvedValueOnce({
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
    mockSingle.mockResolvedValueOnce({ data: EMPTY_ROW, error: null });

    const result = await checkAndClaimGrandSlam(PLAYER_ID);

    expect(result.claimed).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
