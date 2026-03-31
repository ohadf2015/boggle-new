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
            single: (...args: unknown[]) => mockSingle(...args),
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

import { useDailyMissions } from '../useDailyMissions';
import { showQuestCompletionToast } from '@/components/quests/QuestCompletionToast';

beforeEach(() => {
  vi.clearAllMocks();
});

const EMPTY_DATA = {
  word_hunt_completed: false,
  brain_drill_completed: false,
  adventure_completed: false,
  community_completed: false,
  grand_slam_claimed: false,
};

const FULL_DATA = {
  word_hunt_completed: true,
  brain_drill_completed: true,
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

    expect(result.current.missions).toHaveLength(4);
    expect(result.current.completedCount).toBe(0);
    expect(result.current.isGrandSlam).toBe(false);
  });

  it('calculates completedCount and isGrandSlam correctly', async () => {
    mockSingle.mockResolvedValueOnce({ data: FULL_DATA, error: null });

    const { result } = renderHook(() => useDailyMissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.completedCount).toBe(4);
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

    const hrefs = result.current.missions.map(m => m.href);
    expect(hrefs).toEqual(['/daily', '/drill', '/adventure', '/community/create']);
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

  it('shows Grand Slam toast when all 4 missions complete', async () => {
    mockSingle.mockResolvedValueOnce({ data: FULL_DATA, error: null });

    renderHook(() => useDailyMissions());

    await waitFor(() => {
      expect(showQuestCompletionToast).toHaveBeenCalledWith(
        expect.objectContaining({
          isGrandSlam: true,
          xpReward: 500,
        }),
      );
    });
  });

  it('does NOT show Grand Slam toast when missions are incomplete', async () => {
    mockSingle.mockResolvedValueOnce({ data: EMPTY_DATA, error: null });

    renderHook(() => useDailyMissions());

    await waitFor(() => {
      expect(showQuestCompletionToast).not.toHaveBeenCalled();
    });
  });
});
