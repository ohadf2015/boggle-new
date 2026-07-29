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

vi.mock('@/hooks/useStudentProgress', () => ({
  useStudentProgress: () => ({
    lessons: [
      { lessonId: 'l1', lesson: { words: [{ word: 'hello' }, { word: 'world' }] } },
    ],
  }),
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

describe('StudentHubLearnZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
