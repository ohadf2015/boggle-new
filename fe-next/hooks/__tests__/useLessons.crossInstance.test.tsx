/**
 * A lesson created in the Lessons sheet must show up in Create Assignment and PLAY NOW,
 * which each mount their own useLessons() and fetched before the lesson existed.
 */
import { renderHook, act, waitFor } from '@testing-library/react';

const mockGetLessons = vi.fn();
const mockCreateLesson = vi.fn();
vi.mock('@/lib/supabase/education', () => ({
  getLessons: (...a: unknown[]) => mockGetLessons(...a),
  getLesson: vi.fn(async () => ({ data: null, error: null })),
  createLesson: (...a: unknown[]) => mockCreateLesson(...a),
  updateLesson: vi.fn(async () => ({ data: null, error: null })),
  deleteLesson: vi.fn(async () => ({ error: null })),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 'teacher-1' } }),
}));
vi.mock('@/lib/education/telemetry', () => ({ trackEduTeacherActionFailed: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { useLessons, notifyLessonsChanged } from '../useVocabularyLesson';

const EXISTING = { id: 'l1', name: 'Common English', teacher_id: 'teacher-1', words: [] };
const FRUITS = { id: 'l2', name: 'Fruits', teacher_id: 'teacher-1', classroom_id: null, words: [] };

describe('useLessons — writes reach every mounted list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLessons.mockResolvedValue({ data: [EXISTING], error: null });
    mockCreateLesson.mockResolvedValue({ data: FRUITS, error: null });
  });

  it('shows a lesson created in one list inside a second, already-mounted list', async () => {
    const builder = renderHook(() => useLessons());
    const picker = renderHook(() => useLessons());
    await waitFor(() => expect(picker.result.current.isLoading).toBe(false));
    expect(picker.result.current.lessons.map((l) => l.id)).toEqual(['l1']);

    mockGetLessons.mockResolvedValue({ data: [FRUITS, EXISTING], error: null });
    await act(async () => {
      await builder.result.current.createLesson({ name: 'Fruits', language: 'en', words: [] });
    });

    await waitFor(() => expect(picker.result.current.lessons.map((l) => l.id)).toContain('l2'));
  });

  it('refetches when a write happens outside any hook (a library copy)', async () => {
    const picker = renderHook(() => useLessons());
    await waitFor(() => expect(picker.result.current.isLoading).toBe(false));

    mockGetLessons.mockResolvedValue({ data: [FRUITS, EXISTING], error: null });
    act(() => notifyLessonsChanged());

    await waitFor(() => expect(picker.result.current.lessons.map((l) => l.id)).toContain('l2'));
  });

  it('stops listening after unmount', async () => {
    const picker = renderHook(() => useLessons());
    await waitFor(() => expect(picker.result.current.isLoading).toBe(false));
    picker.unmount();
    mockGetLessons.mockClear();
    act(() => notifyLessonsChanged());
    expect(mockGetLessons).not.toHaveBeenCalled();
  });
});
