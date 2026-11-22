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
  });

  it('Given the host on an intermission, When it renders, Then NEXT MODE comes before the secondary cards', async () => {
    renderAt(1, true);
    const social = await screen.findByTestId('mp-word-showdown');
    const next = screen.getByTestId('mp-next-mode');
    expect(next.compareDocumentPosition(social) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Given the series final, When the host views it, Then the host can still change the mode for the rematch', async () => {
    renderAt(3, true);
    await waitFor(() => expect(screen.getByTestId('mp-results-stage').getAttribute('data-branch')).toBe('final'));
    expect(screen.getByTestId('mp-next-mode').tagName).toBe('BUTTON');
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
