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

vi.mock('@/components/teacher/classroom/ClassAvatarStack', () => ({
  ClassAvatarStack: ({ classroomId }: { classroomId: string }) => <span data-testid="avatar-stack-for">{classroomId}</span>,
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

  it('Given a heading, Then it shares one row with the New class link', () => {
    state.classrooms = [mk(1)];
    render(<ClassroomManager heading={<h1 data-testid="classes-title">Your classes</h1>} />);
    const row = screen.getByTestId('classroom-manager-toprow');
    expect(row.contains(screen.getByTestId('classes-title'))).toBe(true);
    expect(row.contains(screen.getByTestId('classroom-create-link'))).toBe(true);
  });

  it.each([
    ['phone', false],
    ['wide screen', true],
  ])('Given one class on a %s, Then there is exactly one "New class" entry', (_label, wide) => {
    state.classrooms = [mk(1)];
    mq.wide = wide;
    render(<ClassroomManager />);
    expect(screen.queryByTestId('classroom-add-tile')).toBeNull();
    const links = screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/en/teacher/classroom/new');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent('eduShell.home.newClass');
  });

  it('Given classes, Then "New class" is a quiet outlined control, not a second colored button', () => {
    state.classrooms = [mk(1)];
    render(<ClassroomManager />);
    const cls = screen.getByTestId('classroom-create-link').className;
    expect(cls).not.toMatch(/(^|\s)bg-neo-(cyan|lime|pink|yellow)(\s|$)/);
    expect(cls).toMatch(/border-neo-cream/);
  });

  it('Given a class, Then its card shows a short student preview', () => {
    state.classrooms = [mk(1)];
    render(<ClassroomManager />);
    expect(screen.getByTestId('avatar-stack-for')).toHaveTextContent('cls-1');
  });
});
