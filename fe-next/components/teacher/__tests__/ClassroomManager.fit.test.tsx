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

vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false }) }));
vi.mock('@/lib/education/useTeacherAccess', () => ({ useTeacherAccess: () => ({ trial: null, isLoading: false }) }));

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

const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);
const LOUD = /^bg-neo-(lime|yellow|cyan|pink)(\/\d+)?$/;

describe('ClassroomManager: every class count fits the screen', () => {
  beforeEach(() => {
    state.classrooms = [mk(1), mk(2), mk(3)];
    mq.wide = false;
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('given several classes on a phone, then the free-class meter and the class switcher share one row above the cards', () => {
    render(<ClassroomManager />);
    const bar = screen.getByTestId('class-carousel-bar');
    expect(bar).toContainElement(screen.getByTestId('class-cap-meter'));
    expect(bar).toContainElement(screen.getByTestId('class-carousel-nav'));
    expect(bar.compareDocumentPosition(screen.getByTestId('class-carousel-track')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('given the switcher, then its arrows are outlined and its "2 of 3" reads in normal case, so Pick a game stays the one lime fill', () => {
    render(<ClassroomManager />);
    const nav = screen.getByTestId('class-carousel-nav');
    for (const el of [nav, ...nav.querySelectorAll('[class]')]) expect(tokens(el).filter((c) => LOUD.test(c))).toEqual([]);
    expect(nav.innerHTML).not.toMatch(/\buppercase\b/);
    expect(screen.getByTestId('class-carousel-prev')).toHaveAttribute('aria-label');
  });

  it('given the free cap is reached, then the meter is a calm line with an outlined Pro link, no yellow fills', () => {
    render(<ClassroomManager />);
    const meter = screen.getByTestId('class-cap-meter');
    expect(screen.getByTestId('class-cap-cta')).toBeInTheDocument();
    for (const el of [meter, ...meter.querySelectorAll('[class]')]) expect(tokens(el).filter((c) => LOUD.test(c))).toEqual([]);
  });

  it('given one class, then there is no switcher and no empty bar', () => {
    state.classrooms = [mk(1)];
    render(<ClassroomManager />);
    expect(screen.queryByTestId('class-carousel-nav')).toBeNull();
  });

  it('given the cap on a phone, then the meter stays one line: short count, no bar, the Pro link a titled crown', () => {
    render(<ClassroomManager />);
    const cta = screen.getByTestId('class-cap-cta');
    expect(cta).toHaveAttribute('title', 'eduPlans.cap.cta');
    expect(cta.querySelector('.max-sm\\:sr-only')).toHaveTextContent('eduPlans.cap.cta');
    expect(screen.getByRole('progressbar').className).toMatch(/max-sm:hidden/);
    expect(screen.getByTestId('class-cap-meter').textContent).toContain('eduPlans.cap.used');
  });
});
