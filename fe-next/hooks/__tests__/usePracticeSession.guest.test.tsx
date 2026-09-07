/**
 * Practice with no account.
 *
 * Every practice endpoint is `student_id`-keyed, so a visitor following a
 * lesson link has nothing to read and nothing to write. Left alone, the hook
 * fires a request that 401s, reports "Failed to fetch progress", and the
 * student is told their own practice failed. It should instead read and write
 * the device.
 *
 * Also covers the differentiation floor: `wordsForLevel` can filter a lesson
 * down to nothing (a lesson whose words are all tagged `challenge`, opened by a
 * student at the default level), and every practice screen bails on an empty
 * word list — a blank page with no error, which is the worst of both.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const { mockUseAuth, mockUseStudentClassroom } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseStudentClassroom: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => mockUseStudentClassroom() }));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { usePracticeProgress, usePracticeWords } from '../usePracticeSession';
import { readGuestPractice } from '@/lib/education/practiceGuestProgress';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  mockUseStudentClassroom.mockReturnValue({ level: 'core', isLoading: false });
});

describe('usePracticeProgress — no account', () => {
  it('never calls the server for a visitor with no session', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: false });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => usePracticeProgress('lesson-1', undefined, { totalWords: 4 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('remembers a started round on the device', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: false });
    vi.stubGlobal('fetch', vi.fn());

    const { result } = renderHook(() => usePracticeProgress('lesson-1', undefined, { totalWords: 4 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.startSession('flashcard');
    });

    expect(readGuestPractice('lesson-1').sessions.flashcard).toBe(1);
    expect(result.current.progress?.flashcard_sessions).toBe(1);
  });

  it('reports the local mastery a guest has earned, not not_started forever', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: false });
    vi.stubGlobal('fetch', vi.fn());
    localStorage.setItem(
      'lexiclash_guest_practice_lesson-1',
      JSON.stringify({ sessions: {}, cardsReviewed: 4, cardsCorrect: 4, wordsFound: ['a', 'b', 'c', 'd'], lastPracticeAt: null })
    );

    const { result } = renderHook(() => usePracticeProgress('lesson-1', undefined, { totalWords: 4 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mastery).toBe('mastered');
  });

  it('still starts a session successfully so the practice screen opens', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: false });
    vi.stubGlobal('fetch', vi.fn());

    const { result } = renderHook(() => usePracticeProgress('lesson-1', undefined, { totalWords: 4 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: { success: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.startSession('blitz');
    });

    expect(outcome?.success).toBe(true);
  });
});

describe('usePracticeWords — the differentiation filter has a floor', () => {
  const challengeOnly = [
    { word: 'quorum', level: 'challenge' as const, canIntegrate: true },
    { word: 'gambit', level: 'challenge' as const, canIntegrate: true },
  ];

  it('degrades to the whole lesson rather than handing back nothing', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: false });
    mockUseStudentClassroom.mockReturnValue({ level: 'core', isLoading: false });

    const { result } = renderHook(() => usePracticeWords(challengeOnly));

    // Every practice screen returns null on an empty word list, so the filtered
    // result would be a blank page with no message and no way forward.
    expect(result.current.words).toHaveLength(2);
  });

  it('still filters when the filter leaves something to practise', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: false });
    mockUseStudentClassroom.mockReturnValue({ level: 'core', isLoading: false });

    const mixed = [
      { word: 'cat', level: 'core' as const, canIntegrate: true },
      ...challengeOnly,
    ];
    const { result } = renderHook(() => usePracticeWords(mixed));

    expect(result.current.words.map((w) => w.word)).toEqual(['cat']);
  });

  it('leaves an empty lesson empty', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: false });
    const { result } = renderHook(() => usePracticeWords([]));
    expect(result.current.words).toHaveLength(0);
  });
});
