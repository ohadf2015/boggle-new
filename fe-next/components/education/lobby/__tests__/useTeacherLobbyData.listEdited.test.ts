import { describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const getLessons = vi.fn();
vi.mock('@/lib/supabase/education', () => ({
  getLessons: (...a: unknown[]) => getLessons(...a),
  getClassrooms: vi.fn(async () => ({ data: [{ id: 'c1', language: 'en', name: 'c1' }] })),
  createLesson: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { useTeacherLobbyData } from '../useTeacherLobbyData';
import { notifyLessonsChanged } from '@/lib/education/lessonsChanged';

describe('useTeacherLobbyData — list edited from the lobby', () => {
  it('GIVEN a picked list WHEN it is edited elsewhere THEN the lobby holds the new words and keeps the pick', async () => {
    getLessons.mockResolvedValue({ data: [{ id: 'l1', language: 'en', name: 'l1', words: [{ word: 'old' }] }] });
    const t = (k: string) => k;
    const { result } = renderHook(() => useTeacherLobbyData('u1', t));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    getLessons.mockResolvedValue({ data: [{ id: 'l1', language: 'en', name: 'l1', words: [{ word: 'new' }] }] });
    act(() => notifyLessonsChanged());
    await waitFor(() => expect(result.current.lessons[0].words[0].word).toBe('new'));
    expect(result.current.selectedLessonIds).toEqual(['l1']);
  });
});
