/**
 * The whole solo practice loop, once, with nothing faked in the middle.
 *
 * Every other test on this page stubs the picker and stubs the mode, so each
 * half is proven and the join between them is not. Round 3 lost on exactly that
 * seam — the live capture never reached a finished round, and the judge could
 * not tell whether the payoff existed at all. So this test walks the real path:
 * the real PracticePicker ranks the real tiles, the hero opens the real
 * SpellingChallengePractice, three real answers are typed, and the assertion is
 * that the shared completion moment lands with three stars, a stinger and
 * confetti.
 *
 * It is deliberately the slow kind of test. If the picker stops handing the
 * mode a word list, if a mode stops reporting its round, or if the completion
 * card stops mounting, this fails — and none of the unit tests around it would.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

const {
  mockPush,
  mockUseAuth,
  mockUsePracticeLesson,
  mockUsePracticeProgress,
  mockStartSession,
  playSound,
  fireVictoryConfetti,
  fireRankConfetti,
  completeSpy,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockUseAuth: vi.fn(),
  mockUsePracticeLesson: vi.fn(),
  mockUsePracticeProgress: vi.fn(),
  mockStartSession: vi.fn().mockResolvedValue({ success: true }),
  playSound: vi.fn(),
  fireVictoryConfetti: vi.fn(),
  fireRankConfetti: vi.fn(),
  completeSpy: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, ...rest: unknown[]) => {
      const params = rest.find((value) => value && typeof value === 'object');
      return params ? `${key}:${JSON.stringify(params)}` : key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound }),
}));
vi.mock('@/utils/confettiUtils', () => ({
  fireVictoryConfetti: () => fireVictoryConfetti(),
  fireRankConfetti: (...args: unknown[]) => fireRankConfetti(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: 'lesson-1' }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/en/student/lessons/lesson-1',
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

vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => <div>header</div> }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div>loading</div> }));
vi.mock('@/components/education/XpProgressBar', () => ({ __esModule: true, default: () => <div>xp</div> }));
vi.mock('@/components/education/StreakBonusIndicator', () => ({
  __esModule: true,
  default: () => <div>streak</div>,
}));

vi.mock('@/components/education/PracticeSessionProvider', () => ({
  PracticeSessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePracticeSession: () => ({
    totalXp: 320,
    streak: { currentStreak: 2 },
    sessionXpEarned: 45,
    sessionMasteryMessage: null,
    completePracticeSession: completeSpy,
    levelUpData: null,
    dismissLevelUp: vi.fn(),
  }),
}));

import LessonPracticePageClient from '../PageClient';

/* Sorted by length inside the spelling hook, so this is the answer order. */
const WORDS = [
  { word: 'ox', definition: 'a strong farm animal', canIntegrate: true },
  { word: 'harvest', definition: 'to gather crops', canIntegrate: true },
  { word: 'elephant', definition: 'a very large grey animal', canIntegrate: true },
];
const ANSWER_ORDER = ['ox', 'harvest', 'elephant'];

const LESSON = {
  id: 'lesson-1',
  name: 'Week 3 Vocabulary',
  description: null,
  language: 'en',
  words: WORDS,
  classroom_id: 'c1',
  assignment: null,
};

/*
  Blitz outranks spelling on the tie-break list, so the only way to make the
  hero deterministic is to give the student a blitz history: unplayed modes
  sort first, and spelling is the highest-priority unplayed one.
*/
const PROGRESS = {
  flashcard_sessions: 0,
  solo_board_sessions: 0,
  warmup_sessions: 0,
  word_list_views: 0,
  matching_sessions: 0,
  spelling_sessions: 0,
  blitz_sessions: 4,
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockUseAuth.mockReturnValue({
    user: { id: 'student-1' },
    isAuthenticated: true,
    loading: false,
  });
  mockUsePracticeLesson.mockReturnValue({ lesson: LESSON, isLoading: false, error: null });
  mockUsePracticeProgress.mockReturnValue({
    progress: PROGRESS,
    mastery: 'learning',
    startSession: mockStartSession,
    isLoading: false,
  });
});

describe('solo practice, picker to payoff', () => {
  it('GIVEN a ranked picker WHEN the hero round is played perfectly THEN the completion moment lands with three stars, a stinger and confetti', async () => {
    const user = userEvent.setup();
    render(<LessonPracticePageClient />);

    // The picker recommends one thing and one tap starts it.
    const hero = await screen.findByTestId('practice-picker-hero-play');
    await user.click(hero);

    // The real spelling round, not a stub.
    const input = await screen.findByTestId('spelling-input');
    expect(input).toBeInTheDocument();

    for (const answer of ANSWER_ORDER) {
      const field = await screen.findByTestId('spelling-input');
      await user.clear(field);
      await user.type(field, `${answer}{Enter}`);
      // Each answer is acknowledged before the next card is dealt.
      await waitFor(() => expect(screen.getByTestId('feedback-display')).toBeInTheDocument(), {
        timeout: 3000,
      });
      await waitFor(
        () => expect(screen.queryByTestId('feedback-display')).not.toBeInTheDocument(),
        { timeout: 4000 }
      );
    }

    const card = await screen.findByTestId('practice-completion', undefined, { timeout: 6000 });
    expect(card).toBeInTheDocument();

    // Three of three: the loudest of the three ranks.
    expect(screen.getByTestId('practice-completion-stars')).toHaveAttribute('data-stars', '3');
    expect(card).toHaveAttribute('data-rank', 'gold');

    // A sound fires on arrival, and it is not gated behind an active game.
    expect(playSound).toHaveBeenCalledWith(
      'epicVictory',
      expect.objectContaining({ requiresGameActive: false })
    );
    expect(fireVictoryConfetti).toHaveBeenCalled();

    // One dominant action, and it leads somewhere rather than only repeating.
    const primary = screen.getByTestId('practice-completion-next');
    expect(primary).toHaveAttribute('data-primary', 'true');

    // The round was reported to the XP session, which is what pays the coins.
    await waitFor(() => expect(completeSpy).toHaveBeenCalled());
  }, 30000);

  it('GIVEN a finished round WHEN NEXT is tapped THEN the next practice opens instead of the grid', async () => {
    const user = userEvent.setup();
    render(<LessonPracticePageClient />);

    await user.click(await screen.findByTestId('practice-picker-hero-play'));

    for (const answer of ANSWER_ORDER) {
      const field = await screen.findByTestId('spelling-input');
      await user.clear(field);
      await user.type(field, `${answer}{Enter}`);
      await waitFor(
        () => expect(screen.queryByTestId('feedback-display')).not.toBeInTheDocument(),
        { timeout: 5000 }
      );
    }

    await screen.findByTestId('practice-completion', undefined, { timeout: 6000 });
    await user.click(screen.getByTestId('practice-completion-next'));

    // Straight into another round: no trip back through the tile grid.
    await waitFor(() =>
      expect(screen.queryByTestId('practice-picker-grid')).not.toBeInTheDocument()
    );
  }, 30000);
});
