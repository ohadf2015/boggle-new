/**
 * Regression: the completion toast must only be authorised for work that is
 * actually done. markCelebrated() backs POST /api/daily-missions/celebrate and
 * its `newlyCelebrated: true` is the sole signal the client uses to pop the
 * quest-completion toast, so it must never flip for an incomplete mission.
 */

import { vi } from 'vitest';
import { markCelebrated, type CelebrationKey } from '../dailyMissionsManager';

const { mockMaybeSingle, mockUpdate, chainable, mockSupabase } = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn();
  const mockUpdate = vi.fn();
  const chainable: Record<string, unknown> = {};
  chainable.select = vi.fn().mockReturnValue(chainable);
  chainable.eq = vi.fn().mockReturnValue(chainable);
  chainable.upsert = vi.fn().mockReturnValue(chainable);
  chainable.maybeSingle = mockMaybeSingle;
  chainable.update = mockUpdate;
  const mockSupabase = { from: vi.fn().mockReturnValue(chainable), rpc: vi.fn().mockResolvedValue({ error: null }) };
  return { mockMaybeSingle, mockUpdate, chainable, mockSupabase };
});

vi.mock('../supabase/client', () => ({ getSupabase: () => mockSupabase }));
vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock('../../services/economy/awardCoins', () => ({
  awardCoinsServer: vi.fn().mockResolvedValue({ success: true, newBalance: 0 }),
  MAX_SERVER_COIN_AWARD: 2000,
}));

const ROW = {
  word_hunt_completed: false,
  adventure_completed: false,
  community_completed: false,
  grand_slam_claimed: false,
  word_hunt_celebrated: false,
  adventure_celebrated: false,
  community_celebrated: false,
  grand_slam_celebrated: false,
};

/** update().eq().eq().eq(col,false).select(col) resolving to one flipped row. */
function wireFlipSucceeds() {
  const select = vi.fn().mockResolvedValue({ data: [{ ok: true }], error: null });
  const eqCol = vi.fn().mockReturnValue({ select });
  const eqDate = vi.fn().mockReturnValue({ eq: eqCol });
  const eqPlayer = vi.fn().mockReturnValue({ eq: eqDate });
  mockUpdate.mockReturnValue({ eq: eqPlayer });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdate.mockReturnValue(chainable);
  wireFlipSucceeds();
});

describe('markCelebrated — only celebrates what is truly complete', () => {
  const slotCases: Array<[CelebrationKey, string]> = [
    ['word_hunt', 'word_hunt_completed'],
    ['adventure', 'adventure_completed'],
    ['community', 'community_completed'],
  ];

  it.each(slotCases)('does not celebrate %s while its mission is incomplete', async (key) => {
    // Given a fresh row where nothing is completed
    mockMaybeSingle.mockResolvedValue({ data: { ...ROW }, error: null });

    // When the client asks to celebrate it (stale/forged call)
    const result = await markCelebrated('player-1', key);

    // Then no toast is authorised and the celebrated flag is untouched
    expect(result.newlyCelebrated).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it.each(slotCases)('celebrates %s once its mission is complete', async (key, completedCol) => {
    mockMaybeSingle.mockResolvedValue({ data: { ...ROW, [completedCol]: true }, error: null });

    const result = await markCelebrated('player-1', key);

    expect(result.newlyCelebrated).toBe(true);
  });

  it('does not celebrate grand_slam when only 2 of 3 missions are complete', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { ...ROW, word_hunt_completed: true, adventure_completed: true },
      error: null,
    });

    const result = await markCelebrated('player-1', 'grand_slam');

    expect(result.newlyCelebrated).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('celebrates grand_slam when all 3 missions are complete', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { ...ROW, word_hunt_completed: true, adventure_completed: true, community_completed: true },
      error: null,
    });

    const result = await markCelebrated('player-1', 'grand_slam');

    expect(result.newlyCelebrated).toBe(true);
  });
});
