import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const getLessons = vi.fn();
const getClassrooms = vi.fn();
vi.mock('@/lib/supabase/education', () => ({
  getLessons: (...a: unknown[]) => getLessons(...a),
  getClassrooms: (...a: unknown[]) => getClassrooms(...a),
  createLesson: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { useTeacherLobbyData } from '../useTeacherLobbyData';

const t = (k: string) => k;
const lesson = (id: string, language: string) => ({ id, language, name: id, words: [] });
const classroom = (id: string, language: string) => ({ id, language, name: id });

// getLessons is newest-first.
const LESSONS = [lesson('common-english', 'en'), lesson('food-he', 'he'), lesson('animals-he', 'he')];

describe('useTeacherLobbyData — preselected word list follows the class language', () => {
  beforeEach(() => {
    getLessons.mockResolvedValue({ data: LESSONS });
  });

  it('GIVEN a Hebrew class and a newer English list WHEN the lobby loads THEN the newest Hebrew list is preselected', async () => {
    getClassrooms.mockResolvedValue({ data: [classroom('class-he', 'he')] });
    const { result } = renderHook(() => useTeacherLobbyData('u1', t));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.selectedClassroomId).toBe('class-he');
    expect(result.current.selectedLessonIds).toEqual(['food-he']);
  });

  it('GIVEN a Swedish class with no Swedish list WHEN the lobby loads THEN no list is preselected', async () => {
    getClassrooms.mockResolvedValue({ data: [classroom('class-sv', 'sv')] });
    const { result } = renderHook(() => useTeacherLobbyData('u1', t));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.selectedLessonIds).toEqual([]);
  });

  it('GIVEN an auto-picked list WHEN the teacher switches to a class in another language THEN the list re-picks for it', async () => {
    getClassrooms.mockResolvedValue({ data: [classroom('class-he', 'he'), classroom('class-en', 'en')] });
    const { result } = renderHook(() => useTeacherLobbyData('u1', t));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setSelectedClassroomId('class-en'));
    expect(result.current.selectedLessonIds).toEqual(['common-english']);
  });

  it('GIVEN a list the teacher picked by hand WHEN they switch class THEN their pick is kept', async () => {
    getClassrooms.mockResolvedValue({ data: [classroom('class-he', 'he'), classroom('class-en', 'en')] });
    const { result } = renderHook(() => useTeacherLobbyData('u1', t));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setSelectedLessonIds(['animals-he']));
    act(() => result.current.setSelectedClassroomId('class-en'));
    expect(result.current.selectedLessonIds).toEqual(['animals-he']);
  });

  it('GIVEN an explicit ?lessonId= WHEN the lobby loads THEN it wins over the class default', async () => {
    getClassrooms.mockResolvedValue({ data: [classroom('class-he', 'he')] });
    const { result } = renderHook(() => useTeacherLobbyData('u1', t, 'common-english'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.selectedLessonIds).toEqual(['common-english']);
  });
});
