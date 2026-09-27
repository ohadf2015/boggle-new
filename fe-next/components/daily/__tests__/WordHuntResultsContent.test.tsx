/**
 * Tests that WordHuntResultsContent renders the same sections
 * as were previously inline in DailyWordHuntResults.
 *
 * Post-gauntlet (2026-09-19): CatchUpSuggestion, both rewarded-ad buttons,
 * RivalCompareCard, MpModeCrossPromo, MoreOptionsAccordion and the heavy
 * DailyChallengeInlineSignup were removed from this screen; the guest signup
 * is now a one-line dismissible nudge (DismissibleSignupLine) that opens a
 * minimal ResultsSignupModal. See the "subtracted from this screen" test.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock all heavy dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, locale: 'en' }),
}));
const auth = vi.hoisted(() => ({ current: { user: null, profile: null, isAuthenticated: false, loading: false } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.current }));
vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div> },
  m: { div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));
vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: () => <div data-testid="mascot" />,
}));
vi.mock('../results', () => ({
  ResultDisplay: () => <div data-testid="result-display" />,
  PastPerformanceCompare: () => <div data-testid="past-performance-compare" />,
  PerformanceSection: () => <div data-testid="performance-section" />,
  RankBadge: () => <div data-testid="rank-badge" />,
  DailyWordHuntFacts: () => <div data-testid="facts" />,
  EmojiShareCard: () => <div data-testid="emoji-share" />,
  ShareSection: () => <div data-testid="share-section" />,
  CoinUnlockCard: () => <div data-testid="coin-unlock" />,
  MoreOptionsAccordion: () => <div data-testid="more-options" />,
  MasteryRatingSection: () => <div data-testid="mastery-rating-section" />,
}));
vi.mock('../TabbedDailyLeaderboard', () => ({ default: function MockLeaderboard() { return <div data-testid="leaderboard" />; } }));
// The heavy signup card is gone from this screen (replaced by DismissibleSignupLine
// + ResultsSignupModal below). Mock kept only so the regression test can prove it
// stays gone even if a future edit re-imports it here.
vi.mock('@/components/auth/DailyChallengeInlineSignup', () => ({ default: function MockLegacyInlineSignup() { return <div data-testid="legacy-inline-signup-card" />; } }));
vi.mock('../WatchAdButton', () => ({ default: function MockWatchAdButton() { return <div data-testid="watch-ad" />; } }));
vi.mock('@/components/ads/WatchAdForRevealButton', () => ({ default: function MockWatchAdForReveal() { return <div data-testid="watch-ad-reveal" />; } }));
// Minimal signup line + modal that replaced the heavy inline signup card.
vi.mock('@/components/daily/results/DismissibleSignupLine', () => ({
  __esModule: true,
  default: ({ isVisible }: { isVisible: boolean }) => (isVisible ? <div data-testid="signup-line" /> : null),
  isSignupLineDismissedLocally: () => false,
}));
vi.mock('@/components/daily/results/ResultsSignupModal', () => ({
  __esModule: true,
  default: function MockResultsSignupModal() { return <div data-testid="signup-modal" />; },
}));
// Cross-promo / social-proof cards subtracted from this screen. Not imported by
// WordHuntResultsContent today — mocked so the "subtraction stuck" regression
// test below actually fails if one of these is ever re-imported and rendered.
vi.mock('../CatchUpSuggestion', () => ({
  default: function MockCatchUp() { return <div data-testid="catch-up" />; },
}));
vi.mock('../RivalCompareCard', () => ({
  default: function MockRivalCompare() { return <div data-testid="rival-compare" />; },
}));
vi.mock('../MpModeCrossPromo', () => ({
  default: function MockMpModeCrossPromo() { return <div data-testid="mp-cross-promo" />; },
}));
// Pass-through disclosure: this file asserts that the recap CONTENT exists, not
// that it is collapsed on first paint. WordHuntResultsContent.catchUp.test.tsx
// renders the real one and owns the collapsed-by-default behaviour.
vi.mock('@/components/ui/CollapsibleSection', () => ({
  __esModule: true,
  default: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

import { WordHuntResultsContent, type WordHuntResultsContentProps } from '../WordHuntResultsContent';

const baseProps: WordHuntResultsContentProps = {
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
  },
  puzzleNumber: 42,
  puzzleDate: '2026-03-14',
  language: 'en' as const,
  countdown: '23:59:59',
  isNewCompletion: true,
  survivalBonusTime: 2,
  rarestWord: null,
  emojiWords: [{ word: 'HELLO', found: true }],
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
    coinReward: { awarded: 15, breakdown: { base: 10, streak: 5, efficiency: 0 } },
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
  // Full recap is the registered-player screen; guests get the simplified
  // branch asserted in the "guest simplification" describe below.
  isAuthenticated: true,
  inlineSignupDismissed: false,
  onInlineSignupDismiss: vi.fn(),
  leaderboardKey: 0,
  profile: null,
  guestFingerprint: null,
  onGameLanguageChange: vi.fn(),
  onShowCreatePuzzle: vi.fn(),
  onSpendStart: vi.fn(),
  t: ((k: string) => k) as WordHuntResultsContentProps['t'],
};

// Mock storage utility so we can control wordWheelPlayed state
vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedWordWheelToday: vi.fn(() => false),
  hasPlayedWordHuntToday: vi.fn(() => false),
  getPastWordHuntPerformance: () => null,
}));

import { hasPlayedWordWheelToday } from '@/utils/dailyChallenge/storage';

describe('WordHuntResultsContent', () => {
  it('renders core sections for a solved puzzle', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.getByTestId('result-display')).toBeInTheDocument();
    expect(screen.getByTestId('mastery-rating-section')).toBeInTheDocument();
    expect(screen.getByTestId('share-section')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard')).toBeInTheDocument();
  });

  it('never renders a mascot (removed — looked weird over the score hero)', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.queryByTestId('mascot')).toBeNull();
  });

  // Reversed (2026-09-20): a prior round of this test asserted the grid was
  // gone as "redundant, info already in hero". That call was overturned — the
  // emoji grid is the spoiler-free artifact that leaves the app, not a restated
  // scoreboard, and this product's growth depends on it being shareable. See
  // DailyWordHuntResults.emojiCard.test.tsx for the pinned "must render" case.
  it('renders emoji-share-card as the shareable artifact', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.getByTestId('emoji-share')).toBeInTheDocument();
  });

  // Regression for the gauntlet subtraction: CatchUpSuggestion, RivalCompareCard,
  // MpModeCrossPromo, MoreOptionsAccordion and the heavy DailyChallengeInlineSignup
  // were deliberately removed from this screen. Each is mocked above at its real
  // import path, so if a future edit re-adds one of these imports and renders it,
  // this test starts finding the mock's testid and fails — see mutation-check
  // notes in the gauntlet report for proof this actually catches a revert.
  it('does not mount the components subtracted from this screen by the gauntlet', () => {
    render(<WordHuntResultsContent {...baseProps} />);
    expect(screen.queryByTestId('more-options')).toBeNull();
    expect(screen.queryByTestId('catch-up')).toBeNull();
    expect(screen.queryByTestId('rival-compare')).toBeNull();
    expect(screen.queryByTestId('mp-cross-promo')).toBeNull();
    expect(screen.queryByTestId('legacy-inline-signup-card')).toBeNull();
  });

  it('renders the minimal dismissible signup line for guests when not dismissed', () => {
    render(<WordHuntResultsContent {...baseProps} isAuthenticated={false} inlineSignupDismissed={false} />);
    expect(screen.getByTestId('signup-line')).toBeInTheDocument();
  });

  describe('guest simplification', () => {
    const guestProps = { ...baseProps, isAuthenticated: false, inlineSignupDismissed: false };

    it('keeps score, mastery rating, the share artifact, leaderboard and the signup line', () => {
      render(<WordHuntResultsContent {...guestProps} />);
      expect(screen.getByTestId('result-display')).toBeInTheDocument();
      expect(screen.getByTestId('mastery-rating-section')).toBeInTheDocument();
      expect(screen.getByTestId('leaderboard')).toBeInTheDocument();
      expect(screen.getByTestId('signup-line')).toBeInTheDocument();
    });

    // Pins the call that cost a round: the signup nudge must never suppress the
    // one growth mechanic that works at this size (spoiler-free shareable
    // grid). A guest who has NOT dismissed the nudge still gets the emoji grid
    // and a share action — this is the regression guard for that decision.
    it('gives a guest who has not dismissed the nudge the emoji grid and a share action', () => {
      render(<WordHuntResultsContent {...guestProps} />);
      expect(screen.getByTestId('emoji-share')).toBeInTheDocument();
      expect(screen.getByTestId('share-section')).toBeInTheDocument();
    });

    it('drops the account-only recap sections', () => {
      render(<WordHuntResultsContent {...guestProps} />);
      expect(screen.queryByTestId('more-options')).toBeNull();
      expect(screen.queryByTestId('past-performance-compare')).toBeNull();
      expect(screen.queryByTestId('performance-section')).toBeNull();
      expect(screen.queryByTestId('facts')).toBeNull();
    });

    it('still shows the answer path on a failed puzzle', () => {
      render(
        <WordHuntResultsContent
          {...guestProps}
          result={{ ...guestProps.result, solved: false }}
        />,
      );
      expect(screen.getByTestId('coin-unlock')).toBeInTheDocument();
    });

    it('does not flash the simplified screen while auth is still resolving', () => {
      auth.current = { ...auth.current, loading: true };
      try {
        // A logged-in player's first paint has isAuthenticated=false. useIsGuest
        // must stay false while loading=true, so the full recap (share-section,
        // past-performance-compare — never mounted in the guest branch) renders
        // instead of the guest-simplified branch (rules/60 Class 1).
        render(<WordHuntResultsContent {...guestProps} />);
        expect(screen.getByTestId('share-section')).toBeInTheDocument();
        expect(screen.getByTestId('past-performance-compare')).toBeInTheDocument();
      } finally {
        auth.current = { ...auth.current, loading: false };
      }
    });

    it('falls back to the full recap once the guest dismisses the CTA', () => {
      render(<WordHuntResultsContent {...guestProps} inlineSignupDismissed />);
      expect(screen.getByTestId('share-section')).toBeInTheDocument();
      expect(screen.getByTestId('past-performance-compare')).toBeInTheDocument();
    });
  });

  describe('end-of-game handoff', () => {
    /* Was a "back to daily hub" link shown as soon as the WHEEL was played.
       That answer predates Word Tower and Connections going public: with two
       modes still unplayed, sending the player back to the hub was the closest
       thing to a dead end. The handoff now names the next unplayed mode, and
       only falls back to the hub once the whole day is cleared. */
    it('offers the next unplayed mode rather than a bare hub link', () => {
      (hasPlayedWordWheelToday as ReturnType<typeof vi.fn>).mockReturnValue(true);
      render(<WordHuntResultsContent {...baseProps} onBackToLobby={vi.fn()} />);
      expect(screen.queryByTestId('back-to-daily-link')).toBeNull();
      const cta = screen.getByTestId('next-quest-cta');
      expect(cta.getAttribute('data-next-mode')).not.toBe('word-hunt');
    });

    it('never offers the mode that was just finished', () => {
      (hasPlayedWordWheelToday as ReturnType<typeof vi.fn>).mockReturnValue(false);
      render(<WordHuntResultsContent {...baseProps} onBackToLobby={vi.fn()} />);
      expect(screen.getByTestId('next-quest-cta').getAttribute('data-next-mode')).not.toBe('word-hunt');
    });
  });
});
