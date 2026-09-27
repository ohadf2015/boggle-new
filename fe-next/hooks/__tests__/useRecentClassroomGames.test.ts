import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useRecentClassroomGames } from '../useRecentClassroomGames';
import { getRecentClassroomGames } from '@/lib/supabase/analyticsLastGame';

vi.mock('@/lib/supabase/analyticsLastGame', () => ({
  getRecentClassroomGames: vi.fn(),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const game = {
  gameCode: 'G1', gameMode: 'classic', playedAt: '2026-09-04T10:00:00Z', lessonIds: ['l1'],
  players: [], missedWords: [], totalLessonWords: 0, wordsNobodyFound: [], coveragePct: 0,
  averageAccuracyPct: 0, participation: { played: 0, roster: 0 },
};

describe('useRecentClassroomGames', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts loading and resolves to the games list', async () => {
    (getRecentClassroomGames as Mock).mockResolvedValue({ data: [game], error: null });

    const { result } = renderHook(() => useRecentClassroomGames({ classroomId: 'class-1', limit: 3 }));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.games).toEqual([game]);
    expect(result.current.error).toBeNull();
    // passes the classroom, the limit and a translated fallback name for unnamed students
    expect(getRecentClassroomGames).toHaveBeenCalledWith('class-1', 3, { fallbackName: 'teacher.lastGame.studentFallback' });
  });

  it('surfaces a query error', async () => {
    (getRecentClassroomGames as Mock).mockResolvedValue({ data: [], error: { message: 'boom' } });

    const { result } = renderHook(() => useRecentClassroomGames({ classroomId: 'class-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.games).toEqual([]);
  });

  it('does not fetch without a classroomId', async () => {
    const { result } = renderHook(() => useRecentClassroomGames({ classroomId: '' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getRecentClassroomGames).not.toHaveBeenCalled();
    expect(result.current.games).toEqual([]);
  });

  it('refresh re-runs the query', async () => {
    (getRecentClassroomGames as Mock).mockResolvedValue({ data: [game], error: null });
    const { result } = renderHook(() => useRecentClassroomGames({ classroomId: 'class-1' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.refresh(); });

    expect(getRecentClassroomGames).toHaveBeenCalledTimes(2);
  });
});
