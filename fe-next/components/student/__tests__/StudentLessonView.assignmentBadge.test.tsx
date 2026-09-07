/**
 * A student must be able to tell an ASSIGNMENT from a lesson that is just there.
 *
 * Live: every card looked identical, so homework with a Friday deadline sat
 * beside optional practice with nothing to separate them. The data was already
 * on the card — `assignment.due_date` is fetched, and the focus is already read
 * for the "practise <focus>" button — it was simply never shown. A deadline the
 * student cannot see is a deadline they will miss.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}|${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',')}` : key,
    language: 'en',
  }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/components/motion/AdaptiveMotion', () => {
  const MOTION_PROPS = ['variants', 'initial', 'animate', 'exit', 'whileHover', 'whileTap', 'transition', 'custom'];
  const passthrough = (tag: string) => {
    function Passthrough({ children, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) {
      const dom = Object.fromEntries(Object.entries(rest).filter(([k]) => !MOTION_PROPS.includes(k)));
      return React.createElement(tag, dom, children);
    }
    Passthrough.displayName = `AdaptiveMotion.${tag}`;
    return Passthrough;
  };
  return {
    AdaptiveMotion: { div: passthrough('div'), span: passthrough('span'), h2: passthrough('h2') },
    AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div>loading</div> }));
vi.mock('@/components/ui/EnhancedEmptyState', () => ({ EnhancedEmptyState: () => <div>empty</div> }));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, size, ...props }: any) => <button {...props}>{children}</button>,
}));
vi.mock('@/components/practice/QuickPracticeButton', () => ({ QuickPracticeButton: () => <button>practice</button> }));

const { mockUseStudentProgress, mockUseStudentClassroom } = vi.hoisted(() => ({
  mockUseStudentProgress: vi.fn(),
  mockUseStudentClassroom: vi.fn(),
}));
vi.mock('@/hooks/useStudentProgress', () => ({ useStudentProgress: () => mockUseStudentProgress() }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => mockUseStudentClassroom() }));
// The wider "what may I practise" source. Empty here: these cases are about
// how a HOMEWORK card renders, so the second source must not add rows.
vi.mock('@/hooks/usePracticeLessons', () => ({
  usePracticeLessons: () => ({ lessons: [], isLoading: false, error: null }),
}));

import StudentLessonView from '../StudentLessonView';

const lesson = { id: 'l1', name: 'Week 3 Vocabulary', words: [{ word: 'banter', canIntegrate: true }] };

function withAssignment(assignment: unknown) {
  mockUseStudentProgress.mockReturnValue({
    lessons: [{ lessonId: 'l1', status: 'assigned', lesson, progress: null, assignment }],
    isLoading: false,
    error: null,
  });
}

describe('StudentLessonView — assignment badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStudentClassroom.mockReturnValue({ level: 'core', isLoading: false });
  });

  it('shows the due date when the lesson is assigned homework', () => {
    // GIVEN homework due on a specific day
    withAssignment({ id: 'a1', lesson_id: 'l1', classroom_id: 'c1', due_date: '2026-09-11T00:00:00Z' });
    render(<StudentLessonView />);

    // THEN the deadline is on the card itself, not somewhere they must go find
    expect(screen.getByTestId('assignment-due-badge')).toBeInTheDocument();
  });

  it('shows the assigned focus as a chip', () => {
    // GIVEN a teacher who pinned one vocabulary skill
    withAssignment({
      id: 'a1', lesson_id: 'l1', classroom_id: 'c1',
      due_date: '2026-09-11T00:00:00Z', practice_focus: 'synonym',
    });
    render(<StudentLessonView />);

    // THEN the skill is named, so "practice" is not a mystery box
    const chip = screen.getByTestId('assignment-focus-chip');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent('synonym');
  });

  it('shows no badge at all for a lesson that was never assigned', () => {
    // GIVEN a plain lesson the student may practise if they feel like it
    mockUseStudentProgress.mockReturnValue({
      lessons: [{ lessonId: 'l1', status: 'in_progress', lesson, progress: null, assignment: null }],
      isLoading: false,
      error: null,
    });
    render(<StudentLessonView />);

    // THEN nothing pretends there is a deadline
    expect(screen.queryByTestId('assignment-due-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('assignment-focus-chip')).not.toBeInTheDocument();
  });

  it('does not invent a deadline when the assignment has none', () => {
    // GIVEN an assignment with no due date — common and legitimate
    withAssignment({
      id: 'a1', lesson_id: 'l1', classroom_id: 'c1', due_date: null, practice_focus: 'synonym',
    });
    render(<StudentLessonView />);

    // THEN the focus still shows and no empty or fabricated date appears
    expect(screen.getByTestId('assignment-focus-chip')).toBeInTheDocument();
    expect(screen.queryByTestId('assignment-due-badge')).not.toBeInTheDocument();
  });

  it('marks a past-due assignment differently from an upcoming one', () => {
    // GIVEN homework whose date has passed
    withAssignment({ id: 'a1', lesson_id: 'l1', classroom_id: 'c1', due_date: '2020-01-01T00:00:00Z' });
    render(<StudentLessonView />);

    // THEN it says so. "Due 1 Jan 2020" with no emphasis reads as fine at a
    // glance, which is exactly how a missed deadline stays missed.
    expect(screen.getByTestId('assignment-due-badge')).toHaveAttribute('data-overdue', 'true');
  });
});
