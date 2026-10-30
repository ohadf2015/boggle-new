/**
 * exp-mp-auto-continue-v1 on the real results screen: the existing 10s ring
 * extended to the series final, with a cancel that lasts one screen.
 */
import React from 'react';
import { act, render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
  reduced: false,
  banner: vi.fn(),
  showInterstitial: vi.fn(),
  markReady: vi.fn(),
  mpExit: vi.fn(),
  confetti: vi.fn(),
  win: vi.fn(),
  lose: vi.fn(),
  trackGrowthEvent: vi.fn(),
  variant: 'control' as string,
}));
vi.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ variant: h.variant, trackExposure: vi.fn() }) }));

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
vi.mock('@/hooks/useQuickReactions', () => ({ useQuickReactions: () => ({ floatingReactions: [], sendReaction: vi.fn(), dismissReaction: vi.fn() }) }));
vi.mock('@/hooks/useFirstWinCelebration', () => ({ useFirstWinCelebration: vi.fn() }));
vi.mock('@/hooks/useCrazyGamesLifecycle', () => ({ useCrazyGamesLifecycle: vi.fn() }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false, submitLeaderboardScore: vi.fn() }) }));
vi.mock('@/components/CrazyGamesBanner', () => ({ __esModule: true, default: () => null }));
vi.mock('@/hooks/useInterstitialAd', () => ({ useInterstitialAd: () => ({ showInterstitial: h.showInterstitial }) }));
vi.mock('@/hooks/useMpExit', () => ({ useMpExit: () => h.mpExit }));
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: h.confetti }));
vi.mock('@/lib/native/webViewLayerFlash', () => ({ prefersStaticFullscreenOverlay: () => false }));
vi.mock('@/utils/guestManager', () => ({ getGuestStatsSummary: () => ({ gamesPlayed: 3 }) }));
vi.mock('@/lib/boardSelection', () => ({ pickRichestBoardClient: () => [['A']] }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: h.trackGrowthEvent }));

import MpResultsScreen from '../MpResultsScreen';
import { useGameStore } from '@/hooks/gameState/store';
import { emitRewardAdActive } from '@/hooks/useRewardAdPause';

type Socket = { emit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn> };

const SCORES = [
  { username: 'Maya', score: 312, allWords: [{ word: 'quartz', score: 24, validated: true }] },
  { username: 'Me', score: 300, allWords: [{ word: 'jumble', score: 18, validated: true }] },
  { username: 'Leo', score: 120, allWords: [] },
];

function renderScreen(over: Partial<React.ComponentProps<typeof MpResultsScreen>> = {}) {
  const socket: Socket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
  const onResetSeries = vi.fn();
  const utils = render(
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
      onResetSeries={onResetSeries}
      {...over}
    />,
  );
  return { socket, onResetSeries, ...utils };
}

const skip = () => fireEvent.pointerDown(screen.getByTestId('mp-results-stage'));

describe('MpResultsScreen — exp-mp-auto-continue-v1', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    h.variant = 'control';
    h.markReady.mockClear();
    h.showInterstitial.mockReset();
    h.showInterstitial.mockResolvedValue(undefined);
    h.trackGrowthEvent.mockClear();
    sessionStorage.clear();
    emitRewardAdActive(false);
  });
  afterEach(() => vi.useRealTimers());

  it('control: the series final waits for REMATCH (no ring, no new series on its own)', async () => {
    const { socket, onResetSeries } = renderScreen({ isHost: true, seriesRoundNumber: 5 });
    skip();
    expect(screen.queryByTestId('mp-auto-ring')).toBeNull();
    await act(async () => { vi.advanceTimersByTime(15_000); });
    expect(onResetSeries).not.toHaveBeenCalled();
    expect(socket.emit.mock.calls.map((c) => c[0])).not.toContain('resetGame');
  });

  it('auto-continue, host on the series final: the ring counts down and a new series starts for the room', async () => {
    h.variant = 'auto-continue';
    const { socket, onResetSeries } = renderScreen({ isHost: true, seriesRoundNumber: 5 });
    skip();
    expect(screen.getByTestId('mp-auto-ring')).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(10_500); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(onResetSeries).toHaveBeenCalledTimes(1);
    expect(socket.emit.mock.calls.map((c) => c[0])).toContain('resetGame');
  });

  it('auto-continue, joiner on the series final: readies up so the room is not left waiting on them', async () => {
    h.variant = 'auto-continue';
    renderScreen({ isHost: false, seriesRoundNumber: 5 });
    skip();
    await act(async () => { vi.advanceTimersByTime(10_500); });
    expect(h.markReady).toHaveBeenCalledTimes(1);
  });

  it('auto-continue: tapping the ring stops it for this screen only', async () => {
    h.variant = 'auto-continue';
    const first = renderScreen({ isHost: true });
    skip();
    fireEvent.click(screen.getByTestId('mp-auto-ring'));
    await act(async () => { vi.advanceTimersByTime(15_000); });
    expect(h.showInterstitial).not.toHaveBeenCalled();
    expect(h.trackGrowthEvent).toHaveBeenCalledWith('results_autoplay_cancelled', expect.objectContaining({ surface: 'mp_results', variant: 'auto-continue' }));
    first.unmount();
    renderScreen({ isHost: true, seriesRoundNumber: 2 });
    skip();
    expect(screen.getByTestId('mp-auto-ring')).toBeInTheDocument();
  });

  it('classroom: no ring on the series final in either arm', () => {
    h.variant = 'auto-continue';
    renderScreen({ isHost: true, seriesRoundNumber: 5, classroomSummary: { teacherName: 'Teacher' } as never });
    skip();
    expect(screen.queryByTestId('mp-auto-ring')).toBeNull();
  });
});
