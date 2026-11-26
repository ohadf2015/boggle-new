import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const h = vi.hoisted(() => ({
  reduced: true,
  banner: vi.fn(),
  showInterstitial: vi.fn(),
  markReady: vi.fn(),
  mpExit: vi.fn(),
  confetti: vi.fn(),
  win: vi.fn(),
  lose: vi.fn(),
  trackGrowthEvent: vi.fn(),
  sendReaction: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: false, user: null }) }));
vi.mock('@/hooks/useIsGuest', () => ({ useIsGuest: () => true }));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => new Proxy({}, {
    get: (_t, k) => (k === 'playVictorySound' || k === 'playEpicVictorySound' ? h.win : k === 'playDefeatSound' ? h.lose : vi.fn()),
  }),
}));
vi.mock('framer-motion', async (orig) => ({ ...(await orig<typeof import('framer-motion')>()), useReducedMotion: () => h.reduced }));
// The header's sound toggle (new on the rebuilt screen) reads the app's MusicProvider.
vi.mock('@/hooks/useMasterMute', () => ({ useMasterMute: () => ({ allMuted: false, toggle: () => {}, label: 'Mute', title: 'Mute' }) }));
vi.mock('@/contexts/NavigationContext', () => ({ useRegisterHeaderAudioControl: () => {} }));
vi.mock('@/components/ui/AnimatedCounter', () => ({ __esModule: true, default: ({ value }: { value: number }) => <span>{value}</span> }));
vi.mock('next/dynamic', () => ({ __esModule: true, default: () => () => null }));
vi.mock('@/components/auth/InlineSignupCard', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/ads/ResultsBannerSlot', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    h.banner(props);
    return <div data-testid="results-banner-slot-mock" />;
  },
}));
vi.mock('@/components/results/ResultsModals', () => ({ ResultsModals: () => <div data-testid="results-modals" /> }));
vi.mock('@/components/results/PostRoundSummary', () => ({ PostRoundSummary: () => null }));
vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: ({ open, onConfirm }: { open: boolean; onConfirm: () => void }) =>
    open ? <button type="button" data-testid="confirm-exit" onClick={onConfirm}>confirm</button> : null,
}));
vi.mock('@/components/results/useResultsSocketEvents', () => ({
  useResultsSocketEvents: () => ({
    showWordFeedback: false, wordToVote: null, wordQueue: [], xpGainedData: null, levelUpData: null,
    showLevelUpCelebration: false, setShowLevelUpCelebration: vi.fn(), setLevelUpData: vi.fn(), nearMisses: [],
    referralMilestone: null, showReferralMilestone: false, readyUsernames: [], isCurrentPlayerReady: false,
    handleVote: vi.fn(), handleFeedbackSkip: vi.fn(), handleReferralMilestoneClose: vi.fn(), handleMarkReady: h.markReady,
  }),
}));
vi.mock('@/hooks/useResultsSideEffects', () => ({
  useResultsSideEffects: () => ({ winStreakData: null, showAuthModal: false, setShowAuthModal: vi.fn(), showFirstWinModal: false, setShowFirstWinModal: vi.fn(), coinReward: null }),
}));
vi.mock('@/hooks/useMultiplayerSignupNudge', () => ({
  useMultiplayerSignupNudge: () => ({ activeNudge: null, stats: { mpGamesThisSession: 1 }, dismissNudge: vi.fn(), recordMpGame: vi.fn() }),
}));
vi.mock('@/hooks/useQuickReactions', () => ({ useQuickReactions: () => ({ floatingReactions: [], sendReaction: h.sendReaction, dismissReaction: vi.fn() }) }));
vi.mock('@/hooks/useFirstWinCelebration', () => ({ useFirstWinCelebration: vi.fn() }));
vi.mock('@/hooks/useCrazyGamesLifecycle', () => ({ useCrazyGamesLifecycle: vi.fn() }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false, submitLeaderboardScore: vi.fn() }) }));
vi.mock('@/components/CrazyGamesBanner', () => ({ __esModule: true, default: () => null }));
vi.mock('@/hooks/useInterstitialAd', () => ({ useInterstitialAd: () => ({ showInterstitial: h.showInterstitial }) }));
vi.mock('@/hooks/useMpExit', () => ({ useMpExit: () => h.mpExit }));
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: h.confetti }));
vi.mock('@/lib/native/webViewLayerFlash', () => ({ prefersStaticFullscreenOverlay: () => false }));
vi.mock('@/utils/guestManager', async (orig) => ({ ...(await orig<object>()), getGuestStatsSummary: () => ({ gamesPlayed: 3 }) }));
vi.mock('@/lib/boardSelection', () => ({ pickRichestBoardClient: () => [['A']] }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: h.trackGrowthEvent }));


import MpResultsScreen from '../MpResultsScreen';

const SCORES = [
  { username: 'Maya', score: 312, allWords: [{ word: 'quartz', score: 24, validated: true }] },
  { username: 'Me', score: 300, allWords: [{ word: 'jumble', score: 18, validated: true }] },
];

function renderAt(seriesRoundNumber: number, isHost: boolean) {
  render(
    <MpResultsScreen
      finalScores={SCORES}
      username="Me"
      gameCode="ROOM12"
      onReturnToRoom={vi.fn()}
      socket={{ emit: vi.fn(), on: vi.fn(), off: vi.fn() } as never}
      isHost={isHost}
      roomLanguage="en"
      seriesRoundNumber={seriesRoundNumber}
      seriesTotalGames={3}
      onResetSeries={vi.fn()}
    />,
  );
}

describe('MpResultsStage layout', () => {
  it('Given a tall results column on a phone, When it renders, Then the body scrolls instead of clipping', () => {
    renderAt(1, true);
    expect(screen.getByTestId('mp-results-body').className).toMatch(/overflow-y-auto/);
    // Desktop: both columns start at the top, so the standings never begin at the fold of a scrolled body.
    expect(screen.getByTestId('mp-results-stage').className).toMatch(/lg:items-start/);
  });

  it('Given the host on an intermission, Then every next mode is one tap away in the footer, right above the primary', () => {
    renderAt(1, true);
    const next = screen.getByTestId('mp-next-mode');
    expect(screen.getByTestId('mp-results-footer')).toContainElement(next);
    expect(screen.getByTestId('mp-results-body')).not.toContainElement(next);
    expect(within(next).getAllByRole('radio')).toHaveLength(5);
    expect(next.textContent).not.toContain('hook');
  });

  it('Given a phone, Then the podium and my card own the first screen (secondary cards start below the fold)', () => {
    renderAt(1, true);
    const podium = screen.getByTestId('mp-results-stage').querySelector('[data-moment]')!;
    expect(podium.className).toMatch(/max-lg:min-h-\[calc\(100dvh/);
  });

  it('Given a bots-only round mid-series, Then the daily promo waits for the final round', async () => {
    render(
      <MpResultsScreen
        finalScores={[{ ...SCORES[0], isBot: true }, SCORES[1]]}
        username="Me"
        gameCode="ROOM12"
        onReturnToRoom={vi.fn()}
        socket={{ emit: vi.fn(), on: vi.fn(), off: vi.fn() } as never}
        isHost
        roomLanguage="en"
        seriesRoundNumber={1}
        seriesTotalGames={3}
        onResetSeries={vi.fn()}
      />,
    );
    await screen.findByTestId('mp-word-showdown');
    expect(screen.queryByTestId('mp-tomorrow-card')).toBeNull();
  });

  it('Given the series final, When the host views it, Then the host can still change the mode for the rematch', async () => {
    renderAt(3, true);
    await waitFor(() => expect(screen.getByTestId('mp-results-stage').getAttribute('data-branch')).toBe('final'));
    expect(within(screen.getByTestId('mp-next-mode')).getAllByRole('radio').length).toBeGreaterThan(0);
  });
});

describe('MpResultsStage emoji reactions', () => {
  it('Given results, When a player taps an emoji, Then it is sent to the room', () => {
    renderAt(1, false);
    const bar = screen.getByTestId('mp-results-reactions');
    const buttons = within(bar).getAllByRole('button');
    expect(buttons).toHaveLength(7);
    fireEvent.click(within(bar).getByRole('button', { name: 'reactions.fire' }));
    expect(h.sendReaction).toHaveBeenCalledWith('fire');
  });
});
