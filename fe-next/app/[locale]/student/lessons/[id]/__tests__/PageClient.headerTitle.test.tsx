/**
 * The lesson's own name is the title of the screen — not its UUID.
 *
 * `EducationHeader` draws a breadcrumb row under itself on every phone-width
 * page that does NOT pass a `title`, and the last crumb is built from the URL
 * segment. On this route that segment is the lesson id, so a student opening a
 * teacher's link read `Education › Student › Lessons › d647f2f8…` above the
 * games — a raw database id on the one screen a twelve year old starts from
 * (seen on the r5 capture at 390x844).
 *
 * Passing the lesson name does two things at once: it names where the student
 * is, and it retires the crumb row — one fewer chrome line on a 844px phone,
 * which is also why the picker below no longer repeats the name.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
  useParams: () => ({ id: 'd647f2f8-2642-4664-a358-a4d5c52df6ac' }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/en/student/lessons/d647f2f8-2642-4664-a358-a4d5c52df6ac',
}));
vi.mock('next/dynamic', () => ({ __esModule: true, default: () => () => null }));

vi.mock('@/hooks/usePracticeLessons', () => ({ usePracticeLesson: () => mockUsePracticeLesson() }));
vi.mock('@/hooks/usePracticeSession', () => ({
  usePracticeProgress: () => mockUsePracticeProgress(),
  usePracticeWords: (words: unknown[]) => ({
    words: words ?? [],
    level: 'core',
    isLevelLoading: false,
  }),
}));

/* The real header is the thing under test here — but only through its props. */
vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: ({ title }: { title?: string }) => (
    <div data-testid="education-header" data-title={title ?? ''}>
      header
    </div>
  ),
}));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div>loading</div> }));
vi.mock('@/components/education/XpProgressBar', () => ({
  __esModule: true,
  default: () => <div>xp</div>,
}));
vi.mock('@/components/education/StreakBonusIndicator', () => ({
  __esModule: true,
  default: () => <div>streak</div>,
}));
vi.mock('@/components/education/PracticeSessionProvider', () => ({
  PracticeSessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePracticeSession: () => ({
    totalXp: 0,
    streak: { currentStreak: 0 },
    sessionXpEarned: 0,
    sessionMasteryMessage: null,
    completePracticeSession: vi.fn(),
    levelUpData: null,
    dismissLevelUp: vi.fn(),
  }),
}));
vi.mock('@/components/education/practicePicker/WordTowerPractice', () => ({
  __esModule: true,
  default: () => <div>tower</div>,
}));
vi.mock('@/components/practice', () => ({
  FlashcardReview: () => <div>flashcards</div>,
  SoloPracticeBoard: () => <div>board</div>,
  WordListPreview: () => <div>word list</div>,
  WarmupRound: () => <div>warmup</div>,
  WordMatchingPractice: () => <div>matching</div>,
  SpellingChallengePractice: () => <div>spelling</div>,
  TimedBlitzPractice: () => <div>blitz</div>,
  VocabFocusPractice: () => <div>focus</div>,
}));

import LessonPracticePageClient from '../PageClient';

const LESSON = {
  id: 'd647f2f8-2642-4664-a358-a4d5c52df6ac',
  name: 'Word Power A',
  description: null,
  language: 'en',
  words: [
    { word: 'brave', definition: 'ready to face danger', canIntegrate: true },
    { word: 'gloomy', definition: 'dark and a little sad', canIntegrate: true },
    { word: 'rapid', definition: 'happening very fast', canIntegrate: true },
    { word: 'ancient', definition: 'from a very long time ago', canIntegrate: true },
  ],
  classroom_id: 'c1',
  assignment: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockUseAuth.mockReturnValue({ user: { id: 'student-1' }, isAuthenticated: true, loading: false });
  mockUsePracticeLesson.mockReturnValue({ lesson: LESSON, isLoading: false, error: null });
  mockUsePracticeProgress.mockReturnValue({
    progress: null,
    mastery: 'not_started',
    startSession: mockStartSession,
    isLoading: false,
  });
});

describe('lesson practice header', () => {
  it('titles the screen with the lesson name, which retires the id breadcrumb', async () => {
    render(<LessonPracticePageClient />);

    const header = await waitFor(() => screen.getByTestId('education-header'));
    expect(header.getAttribute('data-title')).toBe('Word Power A');
  });

  /*
    The header draws its title in the brand lockup, which has no truncation of
    its own and sits in a row with the back button, the mute toggle and the
    menu. A teacher's real lesson names run long ("Unit 4 — Greek and Latin
    Roots, Week 2"), and an untrimmed one pushes that row off a 390px phone.
  */
  it('trims a long lesson name so it cannot push the header row off a phone', async () => {
    mockUsePracticeLesson.mockReturnValue({
      lesson: { ...LESSON, name: 'Unit 4 — Greek and Latin Roots, Week 2' },
      isLoading: false,
      error: null,
    });

    render(<LessonPracticePageClient />);

    const header = await waitFor(() => screen.getByTestId('education-header'));
    const title = header.getAttribute('data-title') ?? '';
    expect(title.length).toBeLessThanOrEqual(24);
    expect(title.endsWith('…')).toBe(true);
    expect(title.startsWith('Unit 4')).toBe(true);
  });

  /*
    The first paint has no lesson yet, so an untitled header there drew the id
    crumb row for the length of the fetch and then dropped it — the UUID was
    the first thing on screen, and the row's removal shifted the layout under
    the student's thumb. Title every state, never only the loaded one.
  */
  it('titles the loading state too, so the id crumb never flashes', async () => {
    mockUsePracticeLesson.mockReturnValue({ lesson: null, isLoading: true, error: null });

    render(<LessonPracticePageClient />);

    const header = await waitFor(() => screen.getByTestId('education-header'));
    expect(header.getAttribute('data-title')).toBeTruthy();
  });

  it('titles the dead-link state too', async () => {
    mockUsePracticeLesson.mockReturnValue({ lesson: null, isLoading: false, error: 'gone' });

    render(<LessonPracticePageClient />);

    const header = await waitFor(() => screen.getByTestId('education-header'));
    expect(header.getAttribute('data-title')).toBeTruthy();
  });

  it('never prints the lesson id anywhere on the picker screen', async () => {
    const { container } = render(<LessonPracticePageClient />);

    await waitFor(() => expect(screen.getByTestId('education-header')).toBeInTheDocument());
    expect(container.textContent).not.toContain('d647f2f8');
  });
});
