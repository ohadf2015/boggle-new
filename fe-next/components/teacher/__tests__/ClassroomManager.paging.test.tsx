/**
 * ClassroomManager — the Classes tab never scrolls the page.
 *
 * A teacher with more classes than fit the screen pages through them (phone:
 * one class per page) instead of scrolling a long column of cards.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, a?: unknown, p?: Record<string, unknown>) => {
      const params = (typeof a === 'object' ? a : p) as Record<string, unknown> | undefined;
      return params ? `${k}:${JSON.stringify(params)}` : k;
    },
    language: 'en',
  }),
}));
vi.mock('@/components/teacher/ClassroomStudentList', () => ({
  default: () => <div data-testid="classroom-student-list" />,
}));

const mk = (n: number) => ({
  id: `cls-${n}`,
  name: `Class ${n}`,
  language: 'en',
  teacher_id: 'user1',
  join_code: `CODE0${n}`,
  created_at: '2026-09-15',
  member_count: n,
});
const state = { classrooms: [mk(1), mk(2), mk(3)] };

vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: state.classrooms,
    isLoading: false,
    createClassroom: vi.fn(),
    updateClassroom: vi.fn(),
    deleteClassroom: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import ClassroomManager from '../ClassroomManager';

describe('ClassroomManager — paging instead of page scroll', () => {
  beforeEach(() => {
    state.classrooms = [mk(1), mk(2), mk(3)];
  });

  it('Given three classes on a phone, Then one card shows with a 1 of 3 pager', () => {
    render(<ClassroomManager />);
    expect(screen.getAllByTestId('classroom-card')).toHaveLength(1);
    expect(screen.getByTestId('classroom-join-code')).toHaveTextContent('CODE01');
    expect(screen.getByTestId('class-pager-status')).toHaveTextContent('"page":1');
    expect(screen.getByTestId('class-pager-status')).toHaveTextContent('"pages":3');
    expect(screen.getByTestId('class-pager-prev')).toBeDisabled();
  });

  it('When next is tapped, Then the next class shows', () => {
    render(<ClassroomManager />);
    fireEvent.click(screen.getByTestId('class-pager-next'));
    expect(screen.getByTestId('classroom-join-code')).toHaveTextContent('CODE02');
    expect(screen.getByTestId('class-pager-prev')).not.toBeDisabled();
  });

  it('Given one class, Then there is no pager at all', () => {
    state.classrooms = [mk(1)];
    render(<ClassroomManager />);
    expect(screen.queryByTestId('class-pager')).toBeNull();
  });
});
