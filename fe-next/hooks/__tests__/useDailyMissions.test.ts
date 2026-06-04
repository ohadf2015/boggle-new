/**
 * Tests for useDailyMissions hook
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock supabase — must use inline factory to avoid hoisting issues
const { mockSingle } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  return { mockSingle };
});
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: (...args: unknown[]) => mockSingle(...args),
          }),
        }),
      }),
    }),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/components/quests/QuestCompletionToast', () => ({
  showQuestCompletionToast: vi.fn(),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playQuestCompleteSound: vi.fn() }),
}));

vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({
    showInterstitial: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Fix rotation to [wordHunt, multiplayer, brainDrills] for all tests
vi.mock('@/shared/dailyQuestPool', async () => {
  const actual = await vi.importActual<typeof import('@/shared/dailyQuestPool')>('@/shared/dailyQuestPool');
  return {
    ...actual,
    getDailyQuestModes: vi.fn().mockReturnValue(['wordHunt', 'multiplayer', 'brainDrills']),
  };
});

const { mockAddCoins } = vi.hoisted(() => ({ mockAddCoins: vi.fn() }));
vi.mock('@/utils/coinManager', async () => {
  const actual = await vi.importActual<typeof import('@/utils/coinManager')>('@/utils/coinManager');
  return { ...actual, addCoins: mockAddCoins };
});

import { useDailyMissions } from '../useDailyMissions';
import { showQuestCompletionToast } from '@/components/quests/QuestCompletionToast';
import { GRAND_SLAM_BONUS } from '@/utils/coinManager';

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ newlyCelebrated: true }),
  }) as unknown as typeof fetch;
});

const EMPTY_DATA = {
  word_hunt_completed: false,
  adventure_completed: false,
  community_completed: false,
  grand_slam_claimed: false,
};

const FULL_DATA = {
  word_hunt_completed: true,
  adventure_completed: true,
  community_completed: true,
  grand_slam_claimed: false,
};

describe('useDailyMissions', () => {
  it('returns loading true initially then resolves', async () => {
    mockSingle.mockResolvedValueOnce({ data: EMPTY_DATA, error: null });

    const { result } = renderHook(() => useDailyMissions());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.missions).toHaveLength(3);
    expect(result.current.completedCount).toBe(0);
    expect(result.current.isGrandSlam).toBe(false);
  });

  it('calculates completedCount and isGrandSlam correctly', async () => {
    mockSingle.mockResolvedValueOnce({ data: FULL_DATA, error: null });

    const { result } = renderHook(() => useDailyMissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.completedCount).toBe(3);
    expect(result.current.isGrandSlam).toBe(true);
    expect(result.current.grandSlamClaimed).toBe(false);
  });

  it('handles no row (PGRST116) gracefully', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'No rows' },
    });

    const { result } = renderHook(() => useDailyMissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.completedCount).toBe(0);
    expect(result.current.missions.every(m => !m.completed)).toBe(true);
  });

  it('provides correct hrefs for each mission', async () => {
    mockSingle.mockResolvedValueOnce({ data: EMPTY_DATA, error: null });

    const { result } = renderHook(() => useDailyMissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Rotation: [wordHunt, multiplayer, brainDrills] → hrefs from QUEST_MODE_HREFS
    const hrefs = result.current.missions.map(m => m.href);
    expect(hrefs).toEqual(['/daily', '/multiplayer', '/brain']);
  });

  it('sets grandSlamClaimed from DB data', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { ...FULL_DATA, grand_slam_claimed: true },
      error: null,
    });

    const { result } = renderHook(() => useDailyMissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.grandSlamClaimed).toBe(true);
  });

  it('shows Grand Slam toast when all 3 missions complete', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        ...FULL_DATA,
        word_hunt_celebrated: true,
        adventure_celebrated: true,
        community_celebrated: true,
      },
      error: null,
    });

    renderHook(() => useDailyMissions());

    await waitFor(() => {
      expect(showQuestCompletionToast).toHaveBeenCalledWith(
        expect.objectContaining({
          isGrandSlam: true,
          xpReward: 500,
          // Coins ARE granted server-side (GRAND_SLAM_COIN_REWARD=200); the toast
          // must surface the amount so the reward doesn't feel invisible.
          goldReward: 200,
        }),
      );
    });
  });

  it('shows Grand Slam toast (XP is server-granted, not client-side)', async () => {
    // Grand Slam coin grant is server-side via checkAndClaimGrandSlam RPC.
    // This test verifies the toast still fires for UX, but NOT the client-side coin grant.
    mockSingle.mockResolvedValueOnce({
      data: {
        ...FULL_DATA,
        word_hunt_celebrated: true,
        adventure_celebrated: true,
        community_celebrated: true,
      },
      error: null,
    });

    renderHook(() => useDailyMissions());

    await waitFor(() => {
      expect(showQuestCompletionToast).toHaveBeenCalledWith(
        expect.objectContaining({
          isGrandSlam: true,
          xpReward: 500,
        }),
      );
    });
    // Should NOT call addCoins (coins are server-granted)
    expect(mockAddCoins).not.toHaveBeenCalled();
  });

  it('does NOT show Grand Slam toast when missions are incomplete', async () => {
    mockSingle.mockResolvedValueOnce({ data: EMPTY_DATA, error: null });

    renderHook(() => useDailyMissions());

    await waitFor(() => {
      expect(showQuestCompletionToast).not.toHaveBeenCalled();
    });
  });

  it('does NOT fire per-quest toast on initial mount (pre-existing completions)', async () => {
    // One mission already completed at mount — this is the initial state, not a transition.
    mockSingle.mockResolvedValueOnce({
      data: {
        ...EMPTY_DATA,
        word_hunt_completed: true,
        word_hunt_celebrated: true,
      },
      error: null,
    });

    const { result } = renderHook(() => useDailyMissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should not celebrate a mission that was already celebrated server-side.
    expect(showQuestCompletionToast).not.toHaveBeenCalled();
  });

  it('fires per-quest toast when a mission transitions false → true after refetch', async () => {
    // First fetch: all incomplete. Second fetch (after visibility change): wordHunt done.
    mockSingle
      .mockResolvedValueOnce({ data: EMPTY_DATA, error: null })
      .mockResolvedValueOnce({
        data: { ...EMPTY_DATA, word_hunt_completed: true },
        error: null,
      });

    const { result } = renderHook(() => useDailyMissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(showQuestCompletionToast).not.toHaveBeenCalled();

    // Simulate user returning to tab after finishing Word Hunt.
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => {
      // rotation mock: slot 0 = wordHunt → toast key dailyMissions.wordHunt
      expect(showQuestCompletionToast).toHaveBeenCalledWith(
        expect.objectContaining({
          questName: 'dailyMissions.wordHunt',
          xpReward: 100,
        }),
      );
    });
  });
});
