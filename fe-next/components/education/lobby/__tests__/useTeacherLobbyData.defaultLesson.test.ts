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

describe('useTeacherLobbyData — preselected word list in a multi-language class', () => {
  beforeEach(() => {
    window.localStorage.clear();
    getLessons.mockResolvedValue({ data: LESSONS });
  });

  it('GIVEN a Hebrew-default class and a newer English list WHEN the lobby loads THEN the newest list of any language is preselected', async () => {
    getClassrooms.mockResolvedValue({ data: [classroom('class-he', 'he')] });
    const { result } = renderHook(() => useTeacherLobbyData('u1', t));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.selectedClassroomId).toBe('class-he');
    expect(result.current.selectedLessonIds).toEqual(['common-english']);
  });

  it('GIVEN this class last played a Hebrew list WHEN the lobby loads THEN that list comes back', async () => {
    window.localStorage.setItem('lexiclash_recent_game_settings', JSON.stringify([{ classroomId: 'class-sv', lessonIds: ['animals-he'], savedAt: 1 }]));
    getClassrooms.mockResolvedValue({ data: [classroom('class-sv', 'sv')] });
    const { result } = renderHook(() => useTeacherLobbyData('u1', t));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.selectedLessonIds).toEqual(['animals-he']);
  });

  it('GIVEN an auto-picked list WHEN the teacher switches class THEN the list re-picks for that class', async () => {
    window.localStorage.setItem(
      'lexiclash_recent_game_settings',
      JSON.stringify([{ classroomId: 'class-he', lessonIds: ['food-he'], savedAt: 1 }, { classroomId: 'class-en', lessonIds: ['animals-he'], savedAt: 2 }])
    );
    getClassrooms.mockResolvedValue({ data: [classroom('class-he', 'he'), classroom('class-en', 'en')] });
    const { result } = renderHook(() => useTeacherLobbyData('u1', t));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.selectedLessonIds).toEqual(['food-he']);
    act(() => result.current.setSelectedClassroomId('class-en'));
    expect(result.current.selectedLessonIds).toEqual(['animals-he']);
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
