/**
 * ClassroomManager — the Classes tab never scrolls the page.
 *
 * A teacher with more classes than fit the screen swipes through them sideways
 * (phone: one class in view) instead of scrolling a long column of cards.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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

const mq = { wide: false };
// `wide` is a desktop: every width query matches, the sideways-phone
// (orientation) query does not.
vi.mock('@/hooks/useMediaQuery', () => {
  const mqFor = (q: string) => (q.includes('orientation') ? false : mq.wide);
  return { useMediaQuery: mqFor, default: mqFor };
});
vi.mock('@/components/teacher/hq/ClassroomCardActivity', () => ({
  ClassroomCardActivity: ({ classroomId }: { classroomId: string }) => (
    <div data-testid="card-activity">{classroomId}</div>
  ),
}));

import ClassroomManager from '../ClassroomManager';

const scrollIntoView = vi.fn();

describe('ClassroomManager — swipe carousel instead of page scroll', () => {
  beforeEach(() => {
    state.classrooms = [mk(1), mk(2), mk(3)];
    mq.wide = false;
    scrollIntoView.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  it('Given three classes on a phone, Then every card is in the swipe track with a 1 of 3 indicator', () => {
    render(<ClassroomManager />);
    expect(screen.getAllByTestId('classroom-card')).toHaveLength(3);
    expect(screen.getByTestId('class-carousel-track')).toBeInTheDocument();
    expect(screen.getByTestId('class-carousel-status')).toHaveTextContent('"page":1');
    expect(screen.getByTestId('class-carousel-status')).toHaveTextContent('"pages":3');
    expect(screen.getByTestId('class-carousel-prev')).toBeDisabled();
  });

  it('When next is tapped, Then the second class scrolls into view', () => {
    render(<ClassroomManager />);
    fireEvent.click(screen.getByTestId('class-carousel-next'));
    const second = screen.getAllByRole('group')[1];
    expect(scrollIntoView.mock.contexts[0]).toBe(second);
    expect(second).toHaveTextContent('CODE02');
    expect(screen.getByTestId('class-carousel-prev')).not.toBeDisabled();
  });

  it('Given one class, Then there is no arrow nav at all', () => {
    state.classrooms = [mk(1)];
    render(<ClassroomManager />);
    expect(screen.queryByTestId('class-carousel-nav')).toBeNull();
  });

  it('Given three classes on a desktop row, Then they all fit and there is no arrow nav', () => {
    mq.wide = true;
    render(<ClassroomManager />);
    expect(screen.getAllByTestId('classroom-card')).toHaveLength(3);
    expect(screen.queryByTestId('class-carousel-nav')).toBeNull();
  });

  it('Given a class, Then its card has activity and a Start game into the host flow for that class', () => {
    state.classrooms = [mk(1)];
    render(<ClassroomManager />);
    expect(screen.getByTestId('card-activity')).toHaveTextContent('cls-1');
    expect(screen.getByTestId('classroom-card-start-game')).toHaveAttribute('href', '/en/education/classroom-game?classroomId=cls-1');
  });

  // A 375x667 phone spent ~70px on a title row AND a separate create row
  // above the one card; the title now shares the create button's row.
  it('Given a heading, Then it shares one row with the Create classroom button', () => {
    state.classrooms = [mk(1)];
    render(<ClassroomManager heading={<h1 data-testid="classes-title">Your classes</h1>} />);
    const row = screen.getByTestId('classroom-manager-toprow');
    expect(row.contains(screen.getByTestId('classes-title'))).toBe(true);
    expect(row.contains(screen.getByRole('link', { name: /teacher.classroom.create/ }))).toBe(true);
  });

  it('Given one class on a wide Classes tab, Then the free slot is a "new class" seat, not a void', () => {
    state.classrooms = [mk(1)];
    mq.wide = true;
    render(<ClassroomManager />);
    expect(screen.getByTestId('classroom-add-tile')).toHaveAttribute('href', '/en/teacher/classroom/new');
  });

  // r3 critic: beside ONE class the seat took half the desktop row — a second
  // card-sized slab that says less than the class card next to it.
  it('Given one class on a wide Classes tab, Then the add seat is compact — content-sized, not a card-sized slab', () => {
    state.classrooms = [mk(1)];
    mq.wide = true;
    render(<ClassroomManager />);
    const cls = screen.getByTestId('classroom-add-tile').parentElement!.className.toString();
    expect(cls).toMatch(/(^|\s)self-start(\s|$)/);
    expect(cls).toMatch(/(^|\s)shrink-0(\s|$)/);
    expect(cls).not.toMatch(/self-stretch|min-h-64/);
  });

  it('Given a full page, Then there is no add seat', () => {
    state.classrooms = [mk(1)];
    render(<ClassroomManager />);
    expect(screen.queryByTestId('classroom-add-tile')).toBeNull();
  });

  // Round 2 critic: the seat and the top-row button exposed the SAME accessible
  // name — two "Create Classroom" controls a screen reader cannot tell apart.
  it('Given the add seat, Then its accessible name is distinct from the header Create button', () => {
    state.classrooms = [mk(1)];
    mq.wide = true;
    render(<ClassroomManager />);
    expect(screen.getByTestId('classroom-add-tile')).toHaveAccessibleName(
      'teacher.classroom.createAnother',
    );
  });
});
