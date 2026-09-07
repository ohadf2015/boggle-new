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

const { mockPush, mockUseAuth, mockUsePracticeLesson, mockUsePracticeProgress, mockStartSession } =
  vi.hoisted(() => ({
    mockPush: vi.fn(),
    mockUseAuth: vi.fn(),
    mockUsePracticeLesson: vi.fn(),
    mockUsePracticeProgress: vi.fn(),
    mockStartSession: vi.fn().mockResolvedValue({ success: true }),
  }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: 'lesson-1' }),
  useSearchParams: () => new URLSearchParams(),
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
    dismissLevelUp: vi.fn(),
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
  FlashcardReview: ({ onComplete }: { onComplete: (r: { correct: number; total: number }) => void }) => (
    <button data-testid="finish-round" onClick={() => onComplete({ correct: 2, total: 2 })}>
      flashcards
    </button>
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
