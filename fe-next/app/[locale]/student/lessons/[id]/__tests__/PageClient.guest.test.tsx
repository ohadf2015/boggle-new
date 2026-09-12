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

describe('lesson practice with no account', () => {
  it('does not bounce a visitor with no session to the home page', async () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, loading: false });

    render(<LessonPracticePageClient />);

    await waitFor(() => expect(screen.getByTestId('pick-flashcard')).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('gives the XP provider a stable on-device identity', async () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, loading: false });

    render(<LessonPracticePageClient />);

    const provider = await screen.findByTestId('session-provider');
    const first = provider.getAttribute('data-student-id');
    expect(first).toBeTruthy();

    // Same device, same identity — otherwise the streak and the achievement
    // counters, which are keyed by this id, reset on every page load.
    const { unmount } = render(<LessonPracticePageClient />);
    expect(screen.getAllByTestId('session-provider')[1].getAttribute('data-student-id')).toBe(first);
    unmount();
  });

  it('uses the signed-in user id when there is one', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'student-1' }, isAuthenticated: true, loading: false });

    render(<LessonPracticePageClient />);

    const provider = await screen.findByTestId('session-provider');
    expect(provider.getAttribute('data-student-id')).toBe('student-1');
  });

  it('says so when the lesson link is dead instead of spinning', async () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, loading: false });
    mockUsePracticeLesson.mockReturnValue({ lesson: null, isLoading: false, error: 'Lesson not found' });

    render(<LessonPracticePageClient />);

    expect(await screen.findByText('education.practice.lessonUnavailable')).toBeInTheDocument();
  });
});

describe('round end offers the next mode', () => {
  it('is three taps from lesson to playing', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ user: { id: 'student-1' }, isAuthenticated: true, loading: false });

    render(<LessonPracticePageClient />);

    // Tap 1 was the lesson card that navigated here. Tap 2 picks a mode; the
    // drill itself is on screen with no third confirmation.
    await user.click(await screen.findByTestId('pick-flashcard'));
    expect(await screen.findByTestId('finish-round')).toBeInTheDocument();
  });

  it('offers a next mode after the round and switches to it in one tap', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ user: { id: 'student-1' }, isAuthenticated: true, loading: false });

    render(<LessonPracticePageClient />);
    await user.click(await screen.findByTestId('pick-flashcard'));
    await user.click(await screen.findByTestId('finish-round'));

    const next = await screen.findByTestId('practice-next-mode');
    await user.click(next);

    // The next ready tile after flashcards is the word list, per picker order.
    expect(await screen.findByTestId('word-list')).toBeInTheDocument();
  });

  it('shows no next-mode bar before a round is finished', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ user: { id: 'student-1' }, isAuthenticated: true, loading: false });

    render(<LessonPracticePageClient />);
    await user.click(await screen.findByTestId('pick-flashcard'));

    expect(screen.queryByTestId('practice-next-mode')).not.toBeInTheDocument();
  });
});

/*
 * The r2 capture caught this flow dead-ending twice: a lesson a student reached
 * from their own hub answered with nothing, and the screen that replaced it
 * offered a single way out — back to the list they had just come from. A load
 * that failed once is very often a load that succeeds on the retry, so the
 * dominant action on that screen is TRY AGAIN; the way back is the smaller one.
 */
describe('lesson that would not load', () => {
  it('leads with a retry rather than only a way out', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'student-1' }, loading: false });
    mockUsePracticeLesson.mockReturnValue({ lesson: null, isLoading: false, error: null });
    mockUsePracticeProgress.mockReturnValue({
      progress: null,
      mastery: null,
      startSession: mockStartSession,
      isLoading: false,
    });

    render(<LessonPracticePageClient />);

    const retry = await screen.findByTestId('practice-lesson-retry');
    expect(retry).toHaveAttribute('data-primary', 'true');
    // And the escape hatch is still there, one step down.
    expect(screen.getByTestId('practice-lesson-exit')).not.toHaveAttribute('data-primary');
  });
});

/*
 * Pitfalls Class 1 — a level-up that the finished round already celebrated on
 * its completion card must not reappear as a modal over the NEXT round. The
 * page clears the pending level-up as it opens a mode, so the only surface that
 * can ever show it is one that is not being played on.
 */
describe('level-up never lands on top of a round', () => {
  it('clears any pending level-up when the next mode opens', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ user: { id: 'student-1' }, loading: false });
    mockUsePracticeLesson.mockReturnValue({ lesson: LESSON, isLoading: false, error: null });
    mockUsePracticeProgress.mockReturnValue({
      progress: null,
      mastery: null,
      startSession: mockStartSession,
      isLoading: false,
    });

    render(<LessonPracticePageClient />);
    await user.click(await screen.findByTestId('pick-flashcard'));
    await waitFor(() => expect(mockDismissLevelUp).toHaveBeenCalled());
  });
});
