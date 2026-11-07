import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { classroomState, lessonsState } = vi.hoisted(() => ({
  classroomState: { classroomId: null as string | null, isLoading: false },
  lessonsState: { lessons: [] as unknown[], isLoading: false },
}));

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en' }) }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => classroomState }));
vi.mock('@/hooks/usePracticeLessons', () => ({ usePracticeLessons: () => lessonsState }));

import { useDeadEndPractice } from '../useDeadEndPractice';

const lesson = { id: 'L1', name: 'Week 9', classroom_id: 'c1', words: [{ word: 'cat' }], assignment: null, created_at: '2026-11-01' };

beforeEach(() => {
  vi.useFakeTimers();
  classroomState.classroomId = null;
  classroomState.isLoading = false;
  lessonsState.lessons = [];
  lessonsState.isLoading = false;
});
afterEach(() => vi.useRealTimers());

describe('useDeadEndPractice', () => {
  it('GIVEN lessons arrive after the 2.5s give-up THEN the starter round upgrades to the class list', () => {
    classroomState.classroomId = 'c1';
    lessonsState.isLoading = true;
    const { result, rerender } = renderHook(() => useDeadEndPractice());
    expect(result.current.href).toBeNull();

    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(result.current.target).toBe('public_list');
    expect(result.current.href).toBe('/en/join/practice');

    lessonsState.lessons = [lesson];
    lessonsState.isLoading = false;
    rerender();
    expect(result.current.target).toBe('class_list');
    expect(result.current.href).toBe('/en/student/lessons/L1?mode=spelling');
  });

  it('GIVEN the class list is settled THEN a later refetch to nothing does not move the button back', () => {
    classroomState.classroomId = 'c1';
    lessonsState.lessons = [lesson];
    const { result, rerender } = renderHook(() => useDeadEndPractice());
    expect(result.current.target).toBe('class_list');

    lessonsState.lessons = [];
    rerender();
    expect(result.current.href).toBe('/en/student/lessons/L1?mode=spelling');
  });
});
