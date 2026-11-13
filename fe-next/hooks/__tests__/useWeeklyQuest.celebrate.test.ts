import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { mockFrom, showToast, postWithAuth } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  showToast: vi.fn(),
  postWithAuth: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({ supabase: { from: (...a: unknown[]) => mockFrom(...a) } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-123' } }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/components/quests/QuestCompletionToast', () => ({ showQuestCompletionToast: showToast }));
vi.mock('@/utils/authFetch', () => ({ postWithAuth }));

import { useWeeklyQuest } from '../useWeeklyQuest';
import { requestQuestCheck } from '@/lib/quests/questCheck';

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

const serverSays = (newlyCelebrated: boolean) =>
  postWithAuth.mockResolvedValue({ ok: true, json: async () => ({ newlyCelebrated }) });

describe('useWeeklyQuest celebration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('celebrates when the server says this completion is new (also covers finishing while the app was closed)', async () => {
    serve(row(true));
    serverSays(true);
    renderHook(() => useWeeklyQuest());
    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1));
    expect(showToast.mock.calls[0][0]).toMatchObject({ xpReward: 200, dedupKey: 'weekly:play_games' });
    expect(postWithAuth).toHaveBeenCalledWith('/api/weekly-quest/celebrate', { questId: 'quest-1' });
  });

  it('stays quiet when another device already celebrated it, and stops asking', async () => {
    serve(row(true));
    serverSays(false);
    const first = renderHook(() => useWeeklyQuest());
    await waitFor(() => expect(postWithAuth).toHaveBeenCalledTimes(1));
    expect(showToast).not.toHaveBeenCalled();
    first.unmount();
    renderHook(() => useWeeklyQuest());
    await new Promise((r) => setTimeout(r, 50));
    expect(postWithAuth).toHaveBeenCalledTimes(1);
  });

  it('does not ask or celebrate again once this device has celebrated', async () => {
    serve(row(true));
    serverSays(true);
    const first = renderHook(() => useWeeklyQuest());
    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1));
    first.unmount();
    renderHook(() => useWeeklyQuest());
    await new Promise((r) => setTimeout(r, 50));
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(postWithAuth).toHaveBeenCalledTimes(1);
  });

  it('a failed request shows nothing and is retried on the next mount', async () => {
    serve(row(true));
    postWithAuth.mockResolvedValue({ ok: false, json: async () => ({}) });
    const first = renderHook(() => useWeeklyQuest());
    await waitFor(() => expect(postWithAuth).toHaveBeenCalledTimes(1));
    expect(showToast).not.toHaveBeenCalled();
    first.unmount();
    serverSays(true);
    renderHook(() => useWeeklyQuest());
    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1));
  });

  it('a rejected request does not throw', async () => {
    serve(row(true));
    postWithAuth.mockRejectedValue(new Error('offline'));
    renderHook(() => useWeeklyQuest());
    await waitFor(() => expect(postWithAuth).toHaveBeenCalled());
    expect(showToast).not.toHaveBeenCalled();
  });

  it('stays quiet and makes no request while the quest is incomplete', async () => {
    serve(row(false));
    const { result } = renderHook(() => useWeeklyQuest());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(postWithAuth).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('given the weekly quest finishes in a game, when a quest check is requested, then it celebrates as a weekly win without navigating', async () => {
    serve(row(false));
    const { result, unmount } = renderHook(() => useWeeklyQuest());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(showToast).not.toHaveBeenCalled();

    serve(row(true));
    serverSays(true);
    requestQuestCheck();

    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1));
    expect(showToast.mock.calls[0][0]).toMatchObject({ isWeekly: true, dedupKey: 'weekly:play_games' });
    unmount();
  });
});
