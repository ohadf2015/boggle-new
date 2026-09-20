/**
 * The Mastery Rating card ("am I getting better?") used to live inside the
 * collapsed "Full recap" accordion (`defaultExpanded={false}`), so it never
 * rendered into the DOM until a player tapped to expand it — and guests
 * never even mounted it until they dismissed the signup nudge (that early
 * return skipped the recap entirely).
 *
 * A test that mocks `MasteryRatingSection` away (like the other
 * WordHuntResultsContent test files do) would pass identically whether the
 * fix landed or not — that's exactly how this shipped broken. This file
 * renders the REAL `MasteryRatingSection` + `MasteryRating` (only the data
 * hook is mocked) and asserts the card is present in the DOM without any
 * click, for both the guest and the authed path, on both a win and a loss —
 * and that it sits outside the still-collapsed recap accordion.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWheelPlayed = vi.fn<() => boolean>(() => false);
const mockIsGuest = vi.fn<() => boolean>(() => false);
const mockUseMasteryRatingData = vi.fn(() => ({
  attempts: [
    { solved: true, attempts_used: 2 },
    { solved: true, attempts_used: 1 },
  ],
  loading: false,
  error: null as string | null,
}));
const mockLanguage = vi.fn<() => string>(() => 'en');

vi.mock('@/hooks/useDailyModePlayed', () => ({
  useDailyModePlayed: () => mockWheelPlayed(),
}));

vi.mock('@/hooks/useIsGuest', () => ({
  useIsGuest: () => mockIsGuest(),
  default: () => mockIsGuest(),
}));

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'control', trackExposure: vi.fn() }),
}));

vi.mock('@/hooks/useMasteryRatingData', () => ({
  useMasteryRatingData: () => mockUseMasteryRatingData(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: mockLanguage(), t: (k: string) => k }),
}));

vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedWordWheelToday: () => false,
  hasPlayedWordHuntToday: () => false,
  getPastWordHuntPerformance: () => null,
}));

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: () => <div data-testid="mascot" />,
}));

// Every heavy sibling is stubbed EXCEPT MasteryRatingSection — that one is
// the real component (real MasteryRating underneath), backed only by the
// mocked data hook above. This is the whole point of the test.
vi.mock('../results', async () => {
  const { MasteryRatingSection } = await import('../results/mastery/MasteryRatingSection');
  return {
    ResultDisplay: () => <div data-testid="result-display" />,
    PerformanceSection: () => <div data-testid="performance-section" />,
    RankBadge: () => <div data-testid="rank-badge" />,
    StatsBlurb: () => <div data-testid="stats-blurb" />,
    PastPerformanceCompare: () => <div data-testid="past-performance-compare" />,
    DailyWordHuntFacts: () => <div data-testid="facts" />,
    EmojiShareCard: () => <div data-testid="emoji-share" />,
    ShareSection: () => <div data-testid="share-section" />,
    CoinUnlockCard: () => <div data-testid="coin-unlock" />,
    MoreOptionsAccordion: () => <div data-testid="more-options" />,
    StreakFreezeIndicator: () => <div data-testid="streak-freeze" />,
    MasteryRatingSection,
  };
});

vi.mock('../TabbedDailyLeaderboard', () => ({
  default: function MockLeaderboard() { return <div data-testid="leaderboard" />; },
}));

vi.mock('@/components/daily/results/DismissibleSignupLine', () => ({
  __esModule: true,
  default: function MockSignupLine() { return <div data-testid="signup-line" />; },
  isSignupLineDismissedLocally: () => false,
}));

vi.mock('@/components/daily/results/ResultsSignupModal', () => ({
  __esModule: true,
  default: function MockSignupModal() { return <div data-testid="signup-modal" />; },
}));

vi.mock('../WatchAdButton', () => ({
  default: function MockWatchAdButton() { return <div data-testid="watch-ad" />; },
}));

vi.mock('@/components/ads/WatchAdForRevealButton', () => ({
  default: function MockWatchAdForRevealButton() { return <div data-testid="watch-ad-reveal" />; },
}));

vi.mock('@/components/results/NextStepPrompt', () => ({
  default: function MockNextStepPrompt() { return <div data-testid="next-step" />; },
}));

import { WordHuntResultsContent, type WordHuntResultsContentProps } from '../WordHuntResultsContent';

function buildProps(overrides: Partial<WordHuntResultsContentProps>): WordHuntResultsContentProps {
  return {
    result: {
      solved: true,
      attemptsUsed: 3,
      targetWord: 'HELLO',
      streakDays: 5,
      wordsDiscovered: [{ word: 'HELLO', lifeGained: 2, timestamp: Date.now(), tokensGained: 0 }],
      efficiencyScore: 85,
      lifeRemaining: 10,
      attempts: [],
      puzzleNumber: 42,
      puzzleDate: '2026-03-14',
      language: 'en' as const,
      completedAt: new Date().toISOString(),
    } as unknown as WordHuntResultsContentProps['result'],
    puzzleNumber: 42,
    puzzleDate: '2026-03-14',
    language: 'en',
    countdown: '23:59:59',
    isNewCompletion: true,
    survivalBonusTime: 2,
    rarestWord: null,
    emojiWords: [],
    stats: null,
    shareHandlers: {
      handleNativeShare: vi.fn(),
      handleChallengeShare: vi.fn(),
      handleWhatsApp: vi.fn(),
      handleTwitter: vi.fn(),
      handleTelegram: vi.fn(),
      handleCopy: vi.fn(),
      handleDownloadShareImage: vi.fn(),
      handleLinkedIn: vi.fn(),
      handleFacebook: vi.fn(),
      handleEmail: vi.fn(),
      handleSMS: vi.fn(),
      copied: false,
      isGeneratingImage: false,
      showSharePanel: false,
      setShowSharePanel: vi.fn(),
      ogImageUrl: null,
    },
    coinActions: {
      coinReward: null,
      handleRetryChallenge: vi.fn(),
      canAffordRetry: true,
      canAffordReveal: true,
      retryCost: 50,
      currentCoins: 100,
      targetWordRevealed: false,
      revealCost: 25,
      handleRevealTargetWord: vi.fn(),
      handleRevealTargetWordViaAd: vi.fn(),
    },
    isAuthenticated: true,
    inlineSignupDismissed: false,
    onInlineSignupDismiss: vi.fn(),
    leaderboardKey: 0,
    profile: { id: 'player-1' },
    guestFingerprint: null,
    onGameLanguageChange: vi.fn(),
    onShowCreatePuzzle: vi.fn(),
    onSpendStart: vi.fn(),
    t: (k: string, fallback?: string | Record<string, string | number>) =>
      typeof fallback === 'string' ? fallback : k,
    ...overrides,
  } as WordHuntResultsContentProps;
}

describe('WordHuntResultsContent — Mastery Rating is reachable at a glance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWheelPlayed.mockReturnValue(false);
    mockIsGuest.mockReturnValue(false);
    mockLanguage.mockReturnValue('en');
    mockUseMasteryRatingData.mockReturnValue({
      attempts: [
        { solved: true, attempts_used: 2 },
        { solved: true, attempts_used: 1 },
      ],
      loading: false,
      error: null,
    });
  });

  it('renders expanded (no click) for an authed player on a WIN', () => {
    mockIsGuest.mockReturnValue(false);
    render(<WordHuntResultsContent {...buildProps({ isAuthenticated: true, result: { ...buildProps({}).result, solved: true } })} />);
    expect(screen.getByTestId('mastery-rating')).toBeInTheDocument();
    // The recap accordion is still collapsed — proves the card lives outside it.
    expect(screen.queryByTestId('past-performance-compare')).toBeNull();
  });

  it('renders expanded (no click) for an authed player on a LOSS', () => {
    mockIsGuest.mockReturnValue(false);
    render(
      <WordHuntResultsContent
        {...buildProps({ isAuthenticated: true, result: { ...buildProps({}).result, solved: false } })}
      />,
    );
    expect(screen.getByTestId('mastery-rating')).toBeInTheDocument();
    expect(screen.queryByTestId('past-performance-compare')).toBeNull();
  });

  it('renders expanded (no click, no nudge dismissal) for a GUEST on a WIN', () => {
    mockIsGuest.mockReturnValue(true);
    render(
      <WordHuntResultsContent
        {...buildProps({
          isAuthenticated: false,
          profile: null,
          guestFingerprint: 'guest-fp-1',
          inlineSignupDismissed: false,
          result: { ...buildProps({}).result, solved: true },
        })}
      />,
    );
    expect(screen.getByTestId('mastery-rating')).toBeInTheDocument();
  });

  it('renders expanded (no click, no nudge dismissal) for a GUEST on a LOSS', () => {
    mockIsGuest.mockReturnValue(true);
    render(
      <WordHuntResultsContent
        {...buildProps({
          isAuthenticated: false,
          profile: null,
          guestFingerprint: 'guest-fp-1',
          inlineSignupDismissed: false,
          result: { ...buildProps({}).result, solved: false },
        })}
      />,
    );
    expect(screen.getByTestId('mastery-rating')).toBeInTheDocument();
  });

  it('would FAIL if the section were unmounted (sanity check on the assertion itself)', () => {
    // Guard against a vacuous test: if MasteryRatingSection renders nothing,
    // getByTestId must throw. Confirm the hook is actually being read (rated
    // state), not just that some element with a data-testid exists.
    render(<WordHuntResultsContent {...buildProps({})} />);
    const card = screen.getByTestId('mastery-rating');
    expect(card.getAttribute('data-mastery-state')).toBe('rated');
    expect(card.textContent).toMatch(/\d/);
  });

  it('day one: a brand-new player (zero attempts) still sees a rating card, not nothing', () => {
    mockUseMasteryRatingData.mockReturnValue({ attempts: [], loading: false, error: null });
    render(<WordHuntResultsContent {...buildProps({})} />);
    const card = screen.getByTestId('mastery-rating');
    expect(card.getAttribute('data-mastery-state')).toBe('new');
    // Placeholder number slot, not the internal `current: 1000` identity value.
    expect(card.textContent).toContain('–');
    expect(card.textContent).not.toContain('1000');
  });

  it('does not render nothing while the attempt history is still loading', () => {
    mockUseMasteryRatingData.mockReturnValue({ attempts: [], loading: true, error: null });
    render(<WordHuntResultsContent {...buildProps({})} />);
    const card = screen.getByTestId('mastery-rating');
    expect(card.getAttribute('data-mastery-state')).toBe('pending');
  });

  it('treats an unresolved identity (guestFingerprint not set yet) as pending, not day-one', () => {
    // DailyWordHuntResults seeds guestFingerprint via useState(null) then an
    // effect fills it in — first paint has neither playerId nor
    // guestFingerprint. A RETURNING guest must not flash "Play today to
    // start your rating" during that window.
    mockUseMasteryRatingData.mockReturnValue({ attempts: [], loading: false, error: null });
    render(<WordHuntResultsContent {...buildProps({ profile: null, guestFingerprint: null })} />);
    const card = screen.getByTestId('mastery-rating');
    expect(card.getAttribute('data-mastery-state')).toBe('pending');
  });

  it('keeps the Change number LTR under Hebrew even though the card is RTL', () => {
    mockLanguage.mockReturnValue('he');
    render(<WordHuntResultsContent {...buildProps({})} />);
    const card = screen.getByTestId('mastery-rating');
    const changeValue = card.querySelector('[dir="ltr"]');
    expect(changeValue).not.toBeNull();
    expect(changeValue?.textContent).toMatch(/^[+-]?\d+$/);
  });
});
