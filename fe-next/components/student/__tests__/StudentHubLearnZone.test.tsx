import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockT = vi.fn((key: string) => key);
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en' }),
}));

const mockUseStudentProgress = vi.fn(() => ({
  lessons: [
    { lessonId: 'l1', lesson: { words: [{ word: 'hello' }, { word: 'world' }] } },
  ],
}));
vi.mock('@/hooks/useStudentProgress', () => ({
  useStudentProgress: () => mockUseStudentProgress(),
}));

const mockUsePracticeLessons = vi.fn(() => ({
  lessons: [] as unknown[],
  isLoading: false,
  error: null,
  refresh: vi.fn(),
}));
vi.mock('@/hooks/usePracticeLessons', () => ({
  usePracticeLessons: () => mockUsePracticeLessons(),
}));

vi.mock('@/hooks/useSpacedRepetition', () => ({
  useSpacedRepetition: () => ({ wordsForToday: ['hello'] }),
}));

vi.mock('@/components/education/ReviewDueBadge', () => ({
  ReviewDueBadge: ({ count }: { count: number }) => (
    <div data-testid="review-badge">Review {count}</div>
  ),
}));

vi.mock('@/components/education/animations/WordOfTheDay', () => ({
  WordOfTheDay: ({ word }: { word: string }) => <div data-testid="wotd">{word}</div>,
}));

vi.mock('@/components/education/challenges/ChallengePanel', () => ({
  ChallengePanel: () => <div data-testid="challenge-panel" />,
}));

vi.mock('@/components/student/StudentLessonView', () => ({
  __esModule: true,
  default: () => <div data-testid="lesson-view" />,
}));

vi.mock('@/components/education/ClassroomLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="leaderboard" />,
}));

vi.mock('framer-motion', () => {
  const R = require('react');
  const Div = R.forwardRef(function Div(props: Record<string, unknown>, ref: unknown) {
    const { children, ...rest } = props as React.PropsWithChildren<Record<string, unknown>>;
    return R.createElement('div', { ...rest, ref }, children);
  });
  return {
    m: { div: Div, button: Div },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

import { StudentHubLearnZone } from '../StudentHubLearnZone';

const defaultAssignedLessons = [
  { lessonId: 'l1', lesson: { words: [{ word: 'hello' }, { word: 'world' }] } },
];
const defaultPracticeLessons: unknown[] = [];

describe('StudentHubLearnZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStudentProgress.mockReturnValue({ lessons: defaultAssignedLessons });
    mockUsePracticeLessons.mockReturnValue({
      lessons: defaultPracticeLessons,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it('renders ReviewDueBadge when words are due', () => {
    render(<StudentHubLearnZone userId="u-1" classroomId="cls-1" />);
    expect(screen.getByTestId('review-badge')).toBeInTheDocument();
  });

  it('renders WordOfTheDay', () => {
    render(<StudentHubLearnZone userId="u-1" classroomId="cls-1" />);
    expect(screen.getByTestId('wotd')).toBeInTheDocument();
  });

  it('renders ChallengePanel', () => {
    render(<StudentHubLearnZone userId="u-1" classroomId="cls-1" />);
    expect(screen.getByTestId('challenge-panel')).toBeInTheDocument();
  });

  it('renders StudentLessonView', () => {
    render(<StudentHubLearnZone userId="u-1" classroomId="cls-1" />);
    expect(screen.getByTestId('lesson-view')).toBeInTheDocument();
  });

  it('renders leaderboard when expanded', () => {
    render(<StudentHubLearnZone userId="u-1" classroomId="cls-1" />);
    // Leaderboard is collapsed by default — click to expand
    fireEvent.click(screen.getByText('student.dashboard.leaderboard'));
    expect(screen.getByTestId('leaderboard')).toBeInTheDocument();
  });

  it('renders section title', () => {
    render(<StudentHubLearnZone userId="u-1" classroomId="cls-1" />);
    expect(mockT).toHaveBeenCalledWith('student.hub.learnZone');
  });

  // Bug: with no assigned lessons, `firstLesson` used to come from
  // useStudentProgress() alone, so a student who has practisable-but-unassigned
  // lessons got lessonId='' and words=[] — ReviewDueBadge and WordOfTheDay both
  // silently vanished even though the student has something to practise.
  it('surfaces ReviewDueBadge and WordOfTheDay from a practisable (unassigned) lesson when there are no assigned lessons', () => {
    mockUseStudentProgress.mockReturnValue({ lessons: [] });
    mockUsePracticeLessons.mockReturnValue({
      lessons: [
        {
          id: 'p1',
          name: 'Practisable Lesson',
          description: null,
          language: 'en',
          words: [{ word: 'hello' }],
          classroom_id: null,
          assignment: null,
        },
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<StudentHubLearnZone userId="u-1" classroomId="cls-1" />);

    expect(screen.getByTestId('review-badge')).toBeInTheDocument();
    expect(screen.getByTestId('wotd')).toBeInTheDocument();
    // Single-word list ⇒ pickWordOfTheDay is deterministic
    expect(screen.getByTestId('wotd')).toHaveTextContent('hello');
  });

  // A lesson present in BOTH sources must merge into ONE entry, and the
  // assigned/progress-bearing entry must win — it carries the real deadline
  // and mastery data, which a synthesized practisable-only entry does not.
  it('dedupes a lesson present in both sources, preferring the assigned entry', () => {
    mockUseStudentProgress.mockReturnValue({
      lessons: [
        { lessonId: 'l1', lesson: { words: [{ word: 'assignedword' }] } },
      ],
    });
    mockUsePracticeLessons.mockReturnValue({
      lessons: [
        {
          id: 'l1',
          name: 'Same Lesson, Practisable Copy',
          description: null,
          language: 'en',
          words: [{ word: 'practisableword' }],
          classroom_id: null,
          assignment: null,
        },
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<StudentHubLearnZone userId="u-1" classroomId="cls-1" />);

    // Exactly one Word of the Day node, sourced from the assigned entry's words.
    expect(screen.getAllByTestId('wotd')).toHaveLength(1);
    expect(screen.getByTestId('wotd')).toHaveTextContent('assignedword');
  });
});
