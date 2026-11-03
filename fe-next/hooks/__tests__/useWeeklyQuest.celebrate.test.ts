import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { mockFrom, showToast } = vi.hoisted(() => ({ mockFrom: vi.fn(), showToast: vi.fn() }));

vi.mock('@/lib/supabase', () => ({ supabase: { from: (...a: unknown[]) => mockFrom(...a) } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-123' } }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/components/quests/QuestCompletionToast', () => ({ showQuestCompletionToast: showToast }));

import { useWeeklyQuest } from '../useWeeklyQuest';

function row(completed: boolean) {
  return {
    id: 'quest-1',
    quest_type: 'play_games',
    title: 'weeklyQuest.playGames',
    description: 'd',
    requirements: JSON.stringify({ target: 3, type: 'play_games' }),
    current_progress: JSON.stringify({ current: completed ? 3 : 1 }),
    xp_reward: 200,
    completed,
    week_start: '2026-11-02',
  };
}

function serve(data: unknown) {
  const single = vi.fn().mockResolvedValue({ data, error: null });
  mockFrom.mockReturnValue({
    select: () => ({ eq: () => ({ eq: () => ({ single, maybeSingle: single }) }) }),
  });
}

describe('useWeeklyQuest celebration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('celebrates a quest that is already complete on first load (finished while app was closed)', async () => {
    serve(row(true));
    renderHook(() => useWeeklyQuest());
    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1));
    expect(showToast.mock.calls[0][0]).toMatchObject({ xpReward: 200, dedupKey: 'weekly:play_games' });
  });

  it('does not celebrate the same quest twice across mounts', async () => {
    serve(row(true));
    const first = renderHook(() => useWeeklyQuest());
    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1));
    first.unmount();
    renderHook(() => useWeeklyQuest());
    await new Promise((r) => setTimeout(r, 50));
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it('stays quiet while the quest is incomplete', async () => {
    serve(row(false));
    const { result } = renderHook(() => useWeeklyQuest());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(showToast).not.toHaveBeenCalled();
  });

  it('still celebrates once when storage is blocked', async () => {
    serve(row(true));
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderHook(() => useWeeklyQuest());
    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1));
    vi.restoreAllMocks();
  });
});
