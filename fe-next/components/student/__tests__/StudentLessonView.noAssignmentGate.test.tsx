/**
 * Plug and play: a lesson the student can see is a lesson they can practise.
 *
 * Live, solo practice was gated behind a separate "Create Assignment" step that
 * lives in a different tab from where lessons are made. A teacher who built a
 * word list and even ran a live game with it had still not made it practisable.
 * This card list is where that gate showed up for the student: it was built
 * purely from assignment rows, so an un-assigned classroom lesson simply did
 * not exist.
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
vi.mock('@/components/practice/QuickPracticeButton', () => ({
  QuickPracticeButton: ({ lessonId }: { lessonId: string }) => (
    <button data-testid={`practice-${lessonId}`}>practice</button>
  ),
}));

const { mockUseStudentProgress, mockUseStudentClassroom, mockUsePracticeLessons } = vi.hoisted(() => ({
  mockUseStudentProgress: vi.fn(),
  mockUseStudentClassroom: vi.fn(),
  mockUsePracticeLessons: vi.fn(),
}));
vi.mock('@/hooks/useStudentProgress', () => ({ useStudentProgress: () => mockUseStudentProgress() }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => mockUseStudentClassroom() }));
vi.mock('@/hooks/usePracticeLessons', () => ({ usePracticeLessons: () => mockUsePracticeLessons() }));

import StudentLessonView from '../StudentLessonView';

const CLASSROOM_LESSON = {
  id: 'l-open',
  name: 'Week 3 Vocabulary',
  description: null,
  language: 'en',
  words: [{ word: 'banter' }, { word: 'quorum' }],
  classroom_id: 'c1',
  assignment: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseStudentClassroom.mockReturnValue({ level: 'core' });
  mockUseStudentProgress.mockReturnValue({ lessons: [], isLoading: false, error: null });
  mockUsePracticeLessons.mockReturnValue({ lessons: [], isLoading: false, error: null });
});

describe('StudentLessonView — assignment is metadata, not a gate', () => {
  it('lists a classroom lesson that no teacher ever assigned', () => {
    mockUsePracticeLessons.mockReturnValue({ lessons: [CLASSROOM_LESSON], isLoading: false, error: null });

    render(<StudentLessonView />);

    expect(screen.getByText('Week 3 Vocabulary')).toBeInTheDocument();
    expect(screen.getByTestId('practice-l-open')).toBeInTheDocument();
  });

  it('shows no due-date badge on a lesson with no assignment', () => {
    mockUsePracticeLessons.mockReturnValue({ lessons: [CLASSROOM_LESSON], isLoading: false, error: null });

    render(<StudentLessonView />);

    expect(screen.queryByTestId('assignment-due-badge')).not.toBeInTheDocument();
  });

  it('renders one card, not two, when a lesson is both assigned and in my classroom', () => {
    mockUseStudentProgress.mockReturnValue({
      lessons: [
        {
          lessonId: 'l-open',
          status: 'started',
          lesson: { id: 'l-open', name: 'Week 3 Vocabulary', words: CLASSROOM_LESSON.words },
          progress: { words_mastered: ['banter'] },
          assignment: { due_date: '2026-09-30' },
        },
      ],
      isLoading: false,
      error: null,
    });
    mockUsePracticeLessons.mockReturnValue({ lessons: [CLASSROOM_LESSON], isLoading: false, error: null });

    render(<StudentLessonView />);

    expect(screen.getAllByTestId('practice-l-open')).toHaveLength(1);
    // The assignment half wins where the two disagree: the deadline is real.
    expect(screen.getByTestId('assignment-due-badge')).toBeInTheDocument();
  });

  it('stays on the empty state only when BOTH sources are empty', () => {
    render(<StudentLessonView />);
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('waits for both sources before deciding the student has nothing', () => {
    mockUsePracticeLessons.mockReturnValue({ lessons: [], isLoading: true, error: null });

    render(<StudentLessonView />);

    // Rendering the empty state while a source is still resolving is the
    // "join a classroom" prompt flashing at a student who already has lessons.
    expect(screen.queryByText('empty')).not.toBeInTheDocument();
    expect(screen.getByText('loading')).toBeInTheDocument();
  });
});
