/**
 * MpResultsScreen — `ri-mp-series-end` flag wiring (t_561836a1).
 * Control (flag off / unresolved): results_inline CTA on every round-end, as
 * today. Treatment ('series-end'): the CTA never renders in the auto-advance
 * gap between rounds — only on the series-end / Leave screen. Harness mirrors
 * MpResultsScreen.test.tsx; next/dynamic is mocked so the lazy
 * InlineSignupCard surfaces as a marker div (keyed on its analyticsSource).
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
  reduced: false, // reduced mode makes the reveal instantly `done`, which unwires the pointerDown skip — keep the choreography and skip it
  riFlag: undefined as undefined | string | boolean,
  showInterstitial: vi.fn(),
  markReady: vi.fn(),
  mpExit: vi.fn(),
  win: vi.fn(),
  lose: vi.fn(),
  trackGrowthEvent: vi.fn(),
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
vi.mock('@/hooks/useMasterMute', () => ({ useMasterMute: () => ({ allMuted: false, toggle: () => {}, label: 'Mute', title: 'Mute' }) }));
vi.mock('@/contexts/NavigationContext', () => ({ useRegisterHeaderAudioControl: () => {} }));
vi.mock('@/components/ui/AnimatedCounter', () => ({ __esModule: true, default: ({ value }: { value: number }) => <span>{value}</span> }));
// InlineSignupCard is the only dynamic() child that takes analyticsSource —
// surface it as a marker so the flag wiring is what this file pins.
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => (props: Record<string, unknown>) =>
    props && props.analyticsSource === 'results_inline' ? <div data-testid="inline-signup-card" /> : null,
}));
vi.mock('@/hooks/usePostHogFlag', () => ({
  usePostHogFlag: (_key: string, defaultValue: unknown) => (h.riFlag !== undefined ? h.riFlag : defaultValue),
}));
vi.mock('@/components/ads/ResultsBannerSlot', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ResultsModals', () => ({ ResultsModals: () => null }));
vi.mock('@/components/results/PostRoundSummary', () => ({ PostRoundSummary: () => null }));
vi.mock('@/components/ui/ConfirmationDialog', () => ({ ConfirmationDialog: () => null }));
vi.mock('@/components/results/useResultsSocketEvents', () => ({
  useResultsSocketEvents: () => ({
    showWordFeedback: false, wordToVote: null, wordQueue: [], xpGainedData: null, levelUpData: null,
    showLevelUpCelebration: false, setShowLevelUpCelebration: vi.fn(), setLevelUpData: vi.fn(), nearMisses: [],
    referralMilestone: null, showReferralMilestone: false, readyUsernames: [], isCurrentPlayerReady: false,
    handleVote: vi.fn(), handleFeedbackSkip: vi.fn(), handleReferralMilestoneClose: vi.fn(), handleMarkReady: h.markReady,
  }),
}));
vi.mock('@/hooks/useResultsSideEffects', () => ({
  useResultsSideEffects: () => ({ winStreakData: null, showAuthModal: false, setShowAuthModal: vi.fn(), showFirstWinModal: false, coinReward: null }),
}));
vi.mock('@/hooks/useMultiplayerSignupNudge', () => ({
  useMultiplayerSignupNudge: () => ({ activeNudge: null, stats: { mpGamesThisSession: 1 }, dismissNudge: vi.fn(), recordMpGame: vi.fn() }),
}));
vi.mock('@/hooks/useQuickReactions', () => ({ useQuickReactions: () => ({ floatingReactions: [], sendReaction: vi.fn(), dismissReaction: vi.fn() }) }));
vi.mock('@/hooks/useFirstWinCelebration', () => ({ useFirstWinCelebration: vi.fn() }));
vi.mock('@/hooks/useCrazyGamesLifecycle', () => ({ useCrazyGamesLifecycle: vi.fn() }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false, submitLeaderboardScore: vi.fn() }) }));
vi.mock('@/components/CrazyGamesBanner', () => ({ __esModule: true, default: () => null }));
vi.mock('@/hooks/useInterstitialAd', () => ({ useInterstitialAd: () => ({ showInterstitial: h.showInterstitial }) }));
vi.mock('@/hooks/useMpExit', () => ({ useMpExit: () => h.mpExit }));
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn() }));
vi.mock('@/lib/native/webViewLayerFlash', () => ({ prefersStaticFullscreenOverlay: () => false }));
vi.mock('@/utils/guestManager', () => ({ getGuestStatsSummary: () => ({ gamesPlayed: 3 }) }));
vi.mock('@/lib/boardSelection', () => ({ pickRichestBoardClient: () => [['A']] }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: h.trackGrowthEvent }));

import MpResultsScreen from '../MpResultsScreen';
import { emitRewardAdActive } from '@/hooks/useRewardAdPause';

type Socket = { emit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn> };

const SCORES = [
  { username: 'Maya', score: 312, allWords: [{ word: 'quartz', score: 24, validated: true }] },
  { username: 'Me', score: 300, allWords: [{ word: 'jumble', score: 18, validated: true }] },
  { username: 'Leo', score: 120, allWords: [] },
];

function renderScreen(over: Partial<React.ComponentProps<typeof MpResultsScreen>> = {}) {
  const socket: Socket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
  return render(
    <MpResultsScreen
      finalScores={SCORES}
      username="Me"
      gameCode="ROOM12"
      onReturnToRoom={vi.fn()}
      socket={socket as never}
      isHost={false}
      roomLanguage="en"
      seriesRoundNumber={1}
      seriesTotalGames={5}
      onResetSeries={vi.fn()}
      {...over}
    />,
  );
}

const skipReveal = () => fireEvent.pointerDown(screen.getByTestId('mp-results-stage'));

describe('MpResultsScreen ri-mp-series-end flag (t_561836a1)', () => {
  beforeEach(() => {
    h.riFlag = undefined;
    h.trackGrowthEvent.mockClear();
    sessionStorage.clear();
    emitRewardAdActive(false);
  });
  afterEach(() => vi.useRealTimers());

  it('control (flag unresolved): the CTA renders mid-series, as today', () => {
    renderScreen({ seriesRoundNumber: 1, seriesTotalGames: 5 });
    skipReveal();
    expect(screen.getByTestId('inline-signup-card')).toBeTruthy();
  });

  it('control (explicit "control" variant): the CTA renders mid-series', () => {
    h.riFlag = 'control';
    renderScreen({ seriesRoundNumber: 1, seriesTotalGames: 5 });
    skipReveal();
    expect(screen.getByTestId('inline-signup-card')).toBeTruthy();
  });

  it('treatment: the CTA does NOT render between auto-advancing rounds', () => {
    h.riFlag = 'series-end';
    renderScreen({ seriesRoundNumber: 1, seriesTotalGames: 5 });
    skipReveal();
    expect(screen.queryByTestId('inline-signup-card')).toBeNull();
  });

  it('treatment: the CTA renders on the series-end / Leave screen, still capped by the card itself', () => {
    h.riFlag = 'series-end';
    renderScreen({ seriesRoundNumber: 5, seriesTotalGames: 5 });
    skipReveal();
    expect(screen.getByTestId('inline-signup-card')).toBeTruthy();
  });

  it('treatment as a boolean flag (true) also moves the CTA to series-end only', () => {
    h.riFlag = true;
    renderScreen({ seriesRoundNumber: 2, seriesTotalGames: 5 });
    skipReveal();
    expect(screen.queryByTestId('inline-signup-card')).toBeNull();
  });
});
