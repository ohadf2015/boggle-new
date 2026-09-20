/**
 * Word Wheel results mirror the Word Hunt screen: the primary next-step CTA
 * ("finish today's challenge" / "back to the daily hub") is pinned to the
 * bottom of the results scrollport instead of sitting mid-recap.
 *
 * Sticky needs a real scrollport above it, so the results phase in
 * WordWheelChallenge owns the `overflow-y-auto` and this component's root no
 * longer sets `overflow-hidden` — an `overflow: hidden` ancestor captures
 * sticky and silently makes it a no-op.
 *
 * UPDATE 2026-09-20: the three CTAs this suite pinned
 * (wordwheel-connections-cta / wordwheel-hunt-cta / wordwheel-back-to-daily-cta),
 * hand-gated on the hasPlayedWordHunt/hasPlayedConnections props, were deleted
 * and replaced by ONE shared <NextQuestCta> inside a plain `<div className={...
 * STICKY_CTA_WORD_WHEEL}>` wrapper (see WordWheelResults.tsx). NextQuestCta
 * itself carries no sticky class and no testid on that wrapper, so every test
 * below that checks stickiness now locates the CTA by its OWN testid
 * (next-quest-cta / next-quest-all-clear) and asserts on the element itself
 * instead. Play state comes from useDailyPlayedStatus, mocked mutably below
 * (pattern from components/daily/results/__tests__/NextQuestCta.test.tsx).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import WordWheelResults from '../WordWheelResults';
import type { WordWheelGameResult } from '../WordWheelGame';

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  }),
  animate: () => ({ stop: () => {} }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../TabbedDailyLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="leaderboard-stub" />,
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn() }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ submitLeaderboardScore: vi.fn() }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: string) => (typeof fb === 'string' ? fb : k),
    language: 'en',
  }),
}));

vi.mock('@/hooks/usePracticeFlag', () => ({
  usePracticeFlag: () => false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAuthenticated: true, loading: false }),
}));

vi.mock('../DailyInsightStack', () => ({
  __esModule: true,
  default: () => <div data-testid="insight-stack" />,
}));

vi.mock('../CatchUpSuggestion', () => ({
  __esModule: true,
  default: () => <div data-testid="catch-up" />,
}));

vi.mock('../MpModeCrossPromo', () => ({
  __esModule: true,
  default: () => <div data-testid="mp-cross-promo" />,
}));

// Mutable so each test can put a specific mode "next" for NextQuestCta,
// instead of the deleted hasPlayedWordHunt/hasPlayedConnections props.
const playedStatus = {
  today: { wordHunt: true, wordWheel: true, wordTower: true, connections: true },
  streak: { current: 1, longest: 1 },
  allCompletedDates: [] as string[],
  freezeCount: 0,
  loading: false,
  fromServer: true,
  freezeApplied: undefined as unknown,
  refresh: vi.fn(),
};

vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => playedStatus,
}));

const result: WordWheelGameResult = { score: 40, wordsFound: ['ABC', 'DEFGH'], timeSeconds: 120 };

const renderResults = (isAuthenticated = true) =>
  render(
    <WordWheelResults
      result={result}
      puzzleNumber={42}
      puzzleDate="2026-05-18"
      language="en"
      hasPlayedWordHunt={false}
      isAuthenticated={isAuthenticated}
    />,
  );

describe('WordWheelResults — sticky primary CTA', () => {
  beforeEach(() => {
    playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: true };
    playedStatus.loading = false;
  });

  /*
   * ORIGINALLY: asserted `wordwheel-connections-cta`'s own className
   * contained `sticky` — that testid sat directly on the sticky wrapper.
   * NOW: the sticky wrapper is an unlabeled div around NextQuestCta, so
   * locate the CTA by its testid and assert stickiness on its PARENT.
   */
  it('pins the CTA (Connections next) while Connections is the only mode left', () => {
    playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: false };
    renderResults();
    const cta = screen.getByTestId('next-quest-cta');
    expect(cta).toHaveAttribute('data-next-mode', 'connections');
    expect(cta.className).toContain('sticky');
  });

  /*
   * ORIGINALLY: 'pins the "finish today's challenge" CTA when Word Hunt is
   * unplayed (Connections done)'.
   * NOW: same sticky-wrapper check, driving the hook so Word Hunt is next.
   */
  it('pins the CTA (Word Hunt next) when Word Hunt is unplayed', () => {
    playedStatus.today = { wordHunt: false, wordWheel: true, wordTower: true, connections: true };
    renderResults();
    const cta = screen.getByTestId('next-quest-cta');
    expect(cta).toHaveAttribute('data-next-mode', 'word-hunt');
    expect(cta.className).toContain('sticky');
  });

  /*
   * ORIGINALLY: "pins the back-to-daily-hub CTA once both challenges are
   * done" — Word Hunt + Connections were the only two modes tracked here.
   * NOW: the hub link is NextQuestCta's all-clear state, shown once every
   * mode (including the newer Word Tower) is played.
   */
  it('pins the all-clear hub CTA once every mode is done', () => {
    renderResults();
    const cta = screen.getByTestId('next-quest-all-clear');
    expect(cta.className).toContain('sticky');
  });

  /*
   * ORIGINALLY: asserted the two OLD mode-specific CTA testids never
   * coexisted. With those testids deleted, that assertion passed
   * unconditionally regardless of state — a silently vacuous test
   * (rules/60 Class 4). NextQuestCta only ever renders ONE of
   * next-quest-cta / next-quest-all-clear; assert that structural
   * guarantee directly, in both a "next mode" state and the all-clear state.
   */
  it('never renders both a next-mode CTA and the all-clear CTA at once', () => {
    const allDone = renderResults();
    expect(screen.queryByTestId('next-quest-cta')).not.toBeInTheDocument();
    expect(screen.getByTestId('next-quest-all-clear')).toBeInTheDocument();
    allDone.unmount();

    playedStatus.today = { wordHunt: false, wordWheel: true, wordTower: true, connections: true };
    renderResults();
    expect(screen.queryByTestId('next-quest-all-clear')).not.toBeInTheDocument();
    expect(screen.getByTestId('next-quest-cta')).toBeInTheDocument();
  });

  /* A guest's pinned slot belongs to the signup card, so no CTA may be
     STICKY for them — but they still get the handoff in normal flow. Word
     Hunt's guest branch does exactly this, and a guest who finishes the wheel
     with modes left is otherwise dead-ended (~90% of daily players).

     ORIGINALLY checked the (now-deleted) mode-specific testids were absent for
     a guest — with those testids gone that passed unconditionally. It now
     asserts the real rule: the CTA is present but NOT pinned. */
  it('gives a guest the handoff inline, never pinned over their signup card', () => {
    // Modes still open → the next-mode CTA, present but not pinned.
    playedStatus.today = { wordHunt: false, wordWheel: true, wordTower: true, connections: true };
    const unfinished = renderResults(false);
    expect(unfinished.getByTestId('next-quest-cta').className).not.toContain('sticky');
    unfinished.unmount();

    // Day cleared → the all-clear state, also not pinned.
    playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: true };
    const allDone = renderResults(false);
    expect(allDone.getByTestId('next-quest-all-clear').className).not.toContain('sticky');
    allDone.unmount();
  });

  it('still pins the CTA for a signed-in player', () => {
    playedStatus.today = { wordHunt: false, wordWheel: true, wordTower: true, connections: true };
    expect(renderResults(true).getByTestId('next-quest-cta').className).toContain('sticky');
  });

  it('leaves no overflow-hidden ancestor to swallow the sticky CTA', () => {
    const { container } = renderResults();
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain('overflow-hidden');
  });
});
