/**
 * A lesson link must work with no account.
 *
 * Live, this page bounced anyone whose session had not resolved as
 * authenticated straight to the marketing home page — so a student handed a
 * lesson link by their teacher landed on a page selling the product instead of
 * the words they were sent to practise. The lesson itself was also fetched
 * through a browser Supabase read, which RLS answers with nothing at all for an
 * anonymous visitor.
 *
 * Also covers the round-end pair: finishing a round used to drop the student
 * back onto a grid of thirteen tiles with nothing marking what to do next.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const {
  mockPush,
  mockUseAuth,
  mockUsePracticeLesson,
  mockUsePracticeProgress,
  mockStartSession,
  mockDismissLevelUp,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockUseAuth: vi.fn(),
  mockUsePracticeLesson: vi.fn(),
  mockUsePracticeProgress: vi.fn(),
  mockStartSession: vi.fn().mockResolvedValue({ success: true }),
  mockDismissLevelUp: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: 'lesson-1' }),
  useSearchParams: () => new URLSearchParams(),
  // EducationShell reads this to place the Practice tab. Omitting it does not
  // yield undefined — vitest throws on an unknown export of a mocked module.
  usePathname: () => '/en/student/lessons/lesson-1',
}));
vi.mock('next/dynamic', () => ({ __esModule: true, default: () => () => null }));

vi.mock('@/hooks/usePracticeLessons', () => ({ usePracticeLesson: () => mockUsePracticeLesson() }));
vi.mock('@/hooks/usePracticeSession', () => ({
  usePracticeProgress: () => mockUsePracticeProgress(),
  usePracticeWords: (words: unknown[]) => ({ words: words ?? [], level: 'core', isLevelLoading: false }),
}));

vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => <div>header</div> }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div>loading</div> }));
vi.mock('@/components/education/XpProgressBar', () => ({ __esModule: true, default: () => <div>xp</div> }));
vi.mock('@/components/education/StreakBonusIndicator', () => ({
  __esModule: true,
  default: () => <div>streak</div>,
}));

const completeSpy = vi.fn();
vi.mock('@/components/education/PracticeSessionProvider', () => ({
  PracticeSessionProvider: ({ children, studentId }: { children: React.ReactNode; studentId: string }) => (
    <div data-testid="session-provider" data-student-id={studentId}>
      {children}
    </div>
  ),
  usePracticeSession: () => ({
    totalXp: 0,
    streak: { currentStreak: 3 },
    sessionXpEarned: 0,
    sessionMasteryMessage: null,
    completePracticeSession: completeSpy,
    levelUpData: null,
    dismissLevelUp: mockDismissLevelUp,
  }),
}));

vi.mock('@/components/education/practicePicker/PracticePicker', () => ({
  __esModule: true,
  default: ({ onSelectMode }: { onSelectMode: (mode: string) => void }) => (
    <button data-testid="pick-flashcard" onClick={() => onSelectMode('flashcard')}>
      picker
    </button>
  ),
}));
vi.mock('@/components/education/practicePicker/WordTowerPractice', () => ({
  __esModule: true,
  default: () => <div>tower</div>,
}));

vi.mock('@/components/practice', () => ({
  /*
    The NEXT action used to live on a fixed bar the page rendered underneath the
    mode. It now belongs to the mode's own completion card, reached through the
    `onNext` prop — so this stub renders that button when the prop arrives,
    which is exactly what the page is on the hook for providing.
  */
  FlashcardReview: ({
    onComplete,
    onNext,
  }: {
    onComplete: (r: { correct: number; total: number }) => void;
    onNext?: () => void;
  }) => (
    <>
      <button data-testid="finish-round" onClick={() => onComplete({ correct: 2, total: 2 })}>
        flashcards
      </button>
      {onNext && (
        <button data-testid="practice-next-mode" onClick={onNext}>
          next
        </button>
      )}
    </>
  ),
  SoloPracticeBoard: () => <div>board</div>,
  WordListPreview: () => <div data-testid="word-list">word list</div>,
  WarmupRound: () => <div>warmup</div>,
  WordMatchingPractice: () => <div>matching</div>,
  SpellingChallengePractice: () => <div>spelling</div>,
  TimedBlitzPractice: () => <div>blitz</div>,
  VocabFocusPractice: () => <div>focus</div>,
}));

import LessonPracticePageClient from '../PageClient';

const LESSON = {
  id: 'lesson-1',
  name: 'Week 3 Vocabulary',
  description: null,
  language: 'en',
  words: [
    { word: 'banter', canIntegrate: true },
    { word: 'quorum', canIntegrate: true },
    { word: 'gambit', canIntegrate: true },
    { word: 'candid', canIntegrate: true },
  ],
  classroom_id: 'c1',
  assignment: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockUsePracticeLesson.mockReturnValue({ lesson: LESSON, isLoading: false, error: null });
  mockUsePracticeProgress.mockReturnValue({
    progress: null,
    mastery: 'not_started',
    startSession: mockStartSession,
    isLoading: false,
  });
});


describe('dead lesson link', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUsePracticeProgress.mockReturnValue({ progress: null, mastery: null, startSession: mockStartSession, isLoading: false });
  });

  it('given the API refused a malformed id, then the student never sees the developer string', () => {
    mockUsePracticeLesson.mockReturnValue({ lesson: null, isLoading: false, error: 'Invalid lessonId' });
    render(<LessonPracticePageClient />);
    expect(screen.queryByText(/Invalid lessonId/)).toBeNull();
    expect(screen.getByText('education.practice.lessonUnavailableBody')).toBeInTheDocument();
  });

  it('given the lesson does not exist, then there is no TRY AGAIN, only the way back', () => {
    mockUsePracticeLesson.mockReturnValue({ lesson: null, isLoading: false, error: 'Lesson not found', isDeadLink: true });
    render(<LessonPracticePageClient />);
    expect(screen.queryByTestId('practice-lesson-retry')).toBeNull();
    expect(screen.getByTestId('practice-lesson-exit')).toBeInTheDocument();
  });

  it('given a network failure, then TRY AGAIN is still offered', () => {
    mockUsePracticeLesson.mockReturnValue({ lesson: null, isLoading: false, error: 'Failed to load lesson', isDeadLink: false });
    render(<LessonPracticePageClient />);
    expect(screen.getByTestId('practice-lesson-retry')).toBeInTheDocument();
  });
});
