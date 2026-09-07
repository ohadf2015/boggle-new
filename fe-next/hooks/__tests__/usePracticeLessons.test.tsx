/**
 * usePracticeLessons / usePracticeLesson — the client half of "plug and play".
 *
 * The list is personal and needs a session. The single lesson is a share link
 * and must resolve for a visitor with no account, which is why it does NOT go
 * through `getLesson` (a browser RLS read that returns nothing for an anon).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { usePracticeLessons, usePracticeLesson } from '../usePracticeLessons';

const LESSON = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Week 3 Vocabulary',
  language: 'en',
  words: [{ word: 'banter' }],
  classroom_id: 'c1',
  assignment: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, json: async () => body });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('usePracticeLessons', () => {
  it('returns every practisable lesson, assignment or not', async () => {
    stubFetch({ lessons: [LESSON] });
    const { result } = renderHook(() => usePracticeLessons());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.lessons).toHaveLength(1);
    expect(result.current.lessons[0].assignment).toBeNull();
  });

  it('does not call the list route without a session', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: false });
    const fetchMock = stubFetch({ lessons: [] });

    const { result } = renderHook(() => usePracticeLessons());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces a failure instead of pretending the student has no lessons', async () => {
    stubFetch({ error: 'Service unavailable' }, false);
    const { result } = renderHook(() => usePracticeLessons());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Service unavailable');
  });
});

describe('usePracticeLesson', () => {
  it('resolves a lesson for a visitor with NO account', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: false });
    const fetchMock = stubFetch({ lesson: LESSON });

    const { result } = renderHook(() => usePracticeLesson(LESSON.id));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(`lessonId=${LESSON.id}`));
    expect(result.current.lesson?.name).toBe('Week 3 Vocabulary');
  });

  it('reports a missing lesson rather than spinning forever', async () => {
    stubFetch({ error: 'Lesson not found' }, false);
    const { result } = renderHook(() => usePracticeLesson(LESSON.id));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.lesson).toBeNull();
    expect(result.current.error).toBe('Lesson not found');
  });

  it('settles without a fetch when there is no lesson id', async () => {
    const fetchMock = stubFetch({ lesson: LESSON });
    const { result } = renderHook(() => usePracticeLesson(undefined));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
