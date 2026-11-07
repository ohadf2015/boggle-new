import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockCapture, classroomState, lessonsState } = vi.hoisted(() => ({
  mockCapture: vi.fn(),
  classroomState: { classroomId: null as string | null, isLoading: false },
  lessonsState: { lessons: [] as unknown[], isLoading: false, error: null as string | null },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => classroomState }));
vi.mock('@/hooks/usePracticeLessons', () => ({ usePracticeLessons: () => ({ ...lessonsState, refresh: vi.fn() }) }));
vi.mock('@/lib/education/telemetryCore', () => ({ safeCapture: mockCapture }));

import { DeadEndPracticeLink } from '../DeadEndPracticeLink';

const lesson = { id: 'L1', name: 'Week 9 words', classroom_id: 'c1', words: [{ word: 'cat' }], assignment: { created_at: '2026-11-01' } };
const practice = () => screen.getByTestId('dead-end-practice');

beforeEach(() => {
  vi.useFakeTimers();
  mockCapture.mockClear();
  classroomState.classroomId = null;
  classroomState.isLoading = false;
  lessonsState.lessons = [];
  lessonsState.isLoading = false;
});
afterEach(() => vi.useRealTimers());

describe('<DeadEndPracticeLink>', () => {
  it('GIVEN an anonymous guest with no class THEN one tap opens the no-account practice round', () => {
    render(<DeadEndPracticeLink state="invalid_code" />);
    expect(practice()).toHaveAttribute('href', '/he/join/practice');
    expect(practice()).toHaveTextContent('education.student.deadEnd.practiceCta');
    expect(practice()).toHaveTextContent('education.student.deadEnd.starterWords');
  });

  it("GIVEN an enrolled student whose class has a list THEN it opens the class's latest list", () => {
    classroomState.classroomId = 'c1';
    lessonsState.lessons = [lesson];
    render(<DeadEndPracticeLink state="ended" />);
    expect(practice()).toHaveAttribute('href', '/he/student/lessons/L1?mode=spelling');
    expect(practice()).toHaveTextContent('Week 9 words');
  });

  it('GIVEN the server enrolled them in the ended game class THEN that class is used even before their own class loads', () => {
    classroomState.isLoading = true;
    lessonsState.lessons = [lesson];
    render(<DeadEndPracticeLink state="ended" classroomId="c1" />);
    expect(practice()).toHaveAttribute('href', '/he/student/lessons/L1?mode=spelling');
  });

  it('GIVEN an enrolled student whose class has no lists yet THEN it falls back to the starter round, not a dead button', () => {
    classroomState.classroomId = 'c1';
    render(<DeadEndPracticeLink state="room_gone" />);
    expect(practice()).toHaveAttribute('href', '/he/join/practice');
  });

  it('GIVEN the lesson lookup failed THEN it fails open to the starter round', () => {
    classroomState.classroomId = 'c1';
    lessonsState.error = 'Failed to load lessons';
    render(<DeadEndPracticeLink state="room_gone" />);
    expect(practice()).toHaveAttribute('href', '/he/join/practice');
    lessonsState.error = null;
  });

  it('GIVEN the lookup is still out THEN the button holds (no href to flip), and a slow lookup gives way to the starter round', () => {
    classroomState.isLoading = true;
    render(<DeadEndPracticeLink state="ended" />);
    expect(practice()).not.toHaveAttribute('href');
    expect(practice()).toHaveAttribute('role', 'status');
    expect(practice()).toHaveTextContent('education.student.deadEnd.practiceCta');
    expect(screen.queryByRole('link')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(practice()).toHaveAttribute('href', '/he/join/practice');
  });

  it('GIVEN the lookup gave up WHEN the class list arrives later THEN the button upgrades to the class list', () => {
    classroomState.isLoading = true;
    const { rerender } = render(<DeadEndPracticeLink state="ended" />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    classroomState.isLoading = false;
    classroomState.classroomId = 'c1';
    lessonsState.lessons = [lesson];
    rerender(<DeadEndPracticeLink state="ended" />);
    expect(practice()).toHaveAttribute('href', '/he/student/lessons/L1?mode=spelling');
    expect(practice()).toHaveTextContent('Week 9 words');
  });

  it('records the dead end once on show and the recovery with its target on tap', () => {
    render(<DeadEndPracticeLink state="no_room" />);
    expect(mockCapture).toHaveBeenCalledWith('edu_dead_end_shown', { state: 'no_room' });
    fireEvent.click(practice());
    expect(mockCapture).toHaveBeenCalledWith('edu_dead_end_recovered', { state: 'no_room', target: 'public_list' });
    expect(mockCapture.mock.calls.filter(([e]) => e === 'edu_dead_end_shown')).toHaveLength(1);
  });

  it('never shows a price, upgrade or Pro word to a student', () => {
    const { container } = render(<DeadEndPracticeLink state="ended" />);
    expect(container.textContent).not.toMatch(/pro\b|upgrade|\$|price/i);
  });
});
