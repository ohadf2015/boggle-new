/**
 * MpResultsScreen — behaviour of the one results screen (intermission + final).
 * Carries the invariants the legacy ResultsPage tests pinned (server rank,
 * interstitial-before-startGame, banner slot, exit through useMpExit) onto the
 * rebuilt screen, plus the reveal / auto-advance / details contracts.
 */
import React from 'react';
import { act, render, fireEvent, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
  reduced: false,
  mainContent: { current: null as null | Record<string, unknown> },
  banner: vi.fn(),
  showInterstitial: vi.fn(),
  markReady: vi.fn(),
  mpExit: vi.fn(),
  confetti: vi.fn(),
  win: vi.fn(),
  lose: vi.fn(),
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
vi.mock('@/components/ads/ResultsBannerSlot', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    h.banner(props);
    return <div data-testid="results-banner-slot-mock" />;
  },
}));
vi.mock('@/components/results/ResultsMainContent', () => ({
  ResultsMainContent: (props: Record<string, unknown>) => {
    h.mainContent.current = props;
    return <div data-testid="results-main-content" />;
  },
}));
vi.mock('@/components/results/ResultsDetailsContent', () => ({ ResultsDetailsContent: () => null }));
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

import MpResultsScreen from '../MpResultsScreen';
import { useGameStore } from '@/hooks/gameState/store';

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

describe('MpResultsScreen', () => {
  beforeEach(() => {
    h.reduced = false;
    h.mainContent.current = null;
    h.banner.mockClear();
    h.markReady.mockClear();
    h.mpExit.mockClear();
    h.confetti.mockClear();
    h.win.mockClear();
    h.lose.mockClear();
    h.showInterstitial.mockReset();
    h.showInterstitial.mockResolvedValue(undefined);
    sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('shows the server numbers in the server order (standings == live leaderboard)', () => {
    renderScreen();
    skip();
    const rows = screen.getAllByTestId('mp-standing-row');
    expect(rows.map((r) => within(r).getByTestId('mp-standing-score').textContent)).toEqual(['312', '300', '120']);
    expect(rows.map((r) => r.getAttribute('data-me'))).toEqual(['false', 'true', 'false']);
  });

  it('my card shows the same placement the server order gives me', () => {
    renderScreen({ username: ' me ' });
    skip();
    expect(screen.getByTestId('mp-my-rank').textContent).toContain('2');
  });

  it('the reveal plays first: no footer CTA until it ends, and a tap anywhere skips it', () => {
    renderScreen();
    expect(screen.queryByTestId('mp-primary-cta')).toBeNull();
    expect(screen.getAllByTestId('mp-standing-row').every((r) => r.getAttribute('data-revealed') === 'false')).toBe(true);
    skip();
    expect(screen.getByTestId('mp-primary-cta')).toBeTruthy();
    expect(screen.getAllByTestId('mp-standing-row').every((r) => r.getAttribute('data-revealed') === 'true')).toBe(true);
  });

  it('reduced motion: everything is on screen without a choreography', () => {
    h.reduced = true;
    vi.useFakeTimers();
    renderScreen();
    expect(screen.getAllByTestId('mp-standing-row').every((r) => r.getAttribute('data-revealed') === 'true')).toBe(true);
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByTestId('mp-primary-cta')).toBeTruthy();
  });

  it('does not fire the interstitial on mount, and mounts the MP banner slot', () => {
    renderScreen();
    expect(h.showInterstitial).not.toHaveBeenCalled();
    expect(h.banner.mock.calls.map((c) => c[0]?.placement)).toContain('multiplayer-round-complete');
  });

  it('intermission joiner: READY marks me ready', () => {
    renderScreen();
    skip();
    fireEvent.click(screen.getByTestId('mp-primary-cta'));
    expect(h.markReady).toHaveBeenCalledTimes(1);
  });

  it.each(['classic', 'random'] as const)('intermission joiner: NEXT UP never shows a guessed mode (store holds %s) — the host is picking', (stored) => {
    // Only the host device knows the next mode (the server learns it at startGame).
    // Round-1 capture: host card read CLASSIC while every joiner read SURPRISE MODE.
    useGameStore.getState().setHostSelectedGameMode(stored);
    renderScreen({ isHost: false });
    skip();
    const card = screen.getByTestId('mp-next-mode');
    expect(card.getAttribute('data-mode')).toBe('');
    expect(card.textContent).toContain('mpUi.results.hostPicking');
    useGameStore.getState().setHostSelectedGameMode('random');
  });

  it('intermission host: NEXT UP shows the mode the host picked', () => {
    useGameStore.getState().setHostSelectedGameMode('classic');
    renderScreen({ isHost: true });
    skip();
    expect(screen.getByTestId('mp-next-mode').getAttribute('data-mode')).toBe('classic');
    useGameStore.getState().setHostSelectedGameMode('random');
  });

  it('intermission host: START NEXT awaits the interstitial before resetGame/startGame', async () => {
    let resolveAd: () => void = () => {};
    h.showInterstitial.mockReturnValueOnce(new Promise<void>((r) => { resolveAd = r; }));
    const { socket } = renderScreen({ isHost: true });
    skip();
    await act(async () => {
      fireEvent.click(screen.getByTestId('mp-primary-cta'));
      await Promise.resolve();
    });
    expect(h.showInterstitial).toHaveBeenCalledWith('multiplayer-round-complete');
    expect(socket.emit.mock.calls.map((c) => c[0])).not.toContain('resetGame');
    await act(async () => { resolveAd(); await Promise.resolve(); await Promise.resolve(); });
    expect(socket.emit.mock.calls.map((c) => c[0])).toContain('resetGame');
  });

  it('intermission host: auto-advances 10s after the reveal hands over', async () => {
    vi.useFakeTimers();
    const { socket } = renderScreen({ isHost: true });
    skip();
    await act(async () => { vi.advanceTimersByTime(9_000); });
    expect(h.showInterstitial).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1_500); });
    expect(h.showInterstitial).toHaveBeenCalledTimes(1);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(socket.emit.mock.calls.map((c) => c[0])).toContain('resetGame');
  });

  it('final (series complete): host REMATCH starts a new series', async () => {
    const { socket, onResetSeries } = renderScreen({ isHost: true, seriesRoundNumber: 5 });
    skip();
    expect(screen.getByTestId('mp-results-header').textContent).toContain('mpUi.results.finalTitle');
    await act(async () => {
      fireEvent.click(screen.getByTestId('mp-primary-cta'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onResetSeries).toHaveBeenCalledTimes(1);
    expect(socket.emit.mock.calls.map((c) => c[0])).toContain('resetGame');
  });

  it('intermission header names the round', () => {
    renderScreen({ seriesRoundNumber: 2 });
    skip();
    expect(screen.getByTestId('mp-results-header').textContent).toContain('mpUi.results.roundDone');
  });

  it('DETAILS opens the deep dive with the same server rank', () => {
    renderScreen();
    skip();
    expect(screen.queryByTestId('results-main-content')).toBeNull();
    fireEvent.click(screen.getByTestId('mp-results-details-open'));
    expect(screen.getByTestId('results-main-content')).toBeTruthy();
    expect(h.mainContent.current?.currentPlayerRank).toBe(2);
  });

  it('leave goes through the confirm and then useMpExit("leave-room"), clearing the lesson payload', () => {
    sessionStorage.setItem('lessonGameData', '{"lessonId":"l1","vocabularyWords":[]}');
    renderScreen();
    fireEvent.click(screen.getByTestId('mp-back-leave'));
    fireEvent.click(screen.getByTestId('confirm-exit'));
    expect(h.mpExit).toHaveBeenCalledWith('leave-room');
    expect(sessionStorage.getItem('lessonGameData')).toBeNull();
  });

  it('holds the result modals until the reveal is over', () => {
    renderScreen();
    expect(screen.queryByTestId('results-modals')).toBeNull();
    skip();
    expect(screen.getAllByTestId('results-modals')).toHaveLength(1);
  });

  it('shows a calculating state (never a blank navy screen) when no scores arrived', () => {
    renderScreen({ finalScores: [] });
    expect(screen.getByTestId('results-empty-state')).toBeTruthy();
  });

  it('confetti only for a podium finish, and only once', () => {
    renderScreen();
    skip();
    // skip lands every beat at once without replaying beat side effects
    expect(h.confetti.mock.calls.length).toBeLessThanOrEqual(1);
  });

  describe('ties (round-3 capture: host 28, three joiners on 0)', () => {
    const TIED = [
      { username: 'Host', score: 28, allWords: [] },
      { username: 'P', score: 0, allWords: [] },
      { username: 'T', score: 0, allWords: [] },
      { username: 'H', score: 0, allWords: [] },
    ];

    it('tied rows and my card read the shared rank the live HUD showed (#2, not #3)', () => {
      renderScreen({ finalScores: TIED, username: 'T' });
      skip();
      const rows = screen.getAllByTestId('mp-standing-row');
      expect(rows.map((r) => r.getAttribute('data-rank'))).toEqual(['1', '2', '2', '2']);
      expect(screen.getByTestId('mp-my-rank').textContent).toBe('#2');
      // a shared #2 on 0 points is not a podium finish: no confetti on the skip-to-verdict
      expect(h.confetti).not.toHaveBeenCalled();
    });

    it('my gap line chases the nearest higher score, not a tied row above', () => {
      renderScreen({ finalScores: TIED, username: 'T' });
      skip();
      expect(screen.getByTestId('mp-my-card').textContent).toContain('mpUi.results.behind:{"points":28,"name":"Host"}');
    });

    it('a 0-point podium slot gets no podium treatment', () => {
      h.reduced = true;
      renderScreen({ finalScores: TIED, username: 'T' });
      const rows = screen.getAllByTestId('mp-standing-row');
      expect(rows.map((r) => r.getAttribute('data-podium'))).toEqual(['1', 'none', 'none', 'none']);
      expect(screen.getAllByTestId('mp-standing-crown')).toHaveLength(1);
    });

    it('an all-zero room crowns no one', () => {
      h.reduced = true;
      renderScreen({ finalScores: TIED.map((p) => ({ ...p, score: 0 })), username: 'T' });
      expect(screen.queryByTestId('mp-standing-crown')).toBeNull();
      expect(screen.getByTestId('mp-my-card').getAttribute('data-winner')).toBe('false');
      expect(screen.getByTestId('mp-my-card').textContent).toContain('mpUi.results.tiedWithMore:{"name":"Host","more":2}');
    });
  });
  describe('final screen of a series (r4 capture: round 5 all on 0, host 94 over the series)', () => {
    const ZERO = ['Host', 'P', 'T', 'H'].map((username) => ({ username, score: 0, allWords: [] }));
    const STANDINGS = [
      { username: 'Host', totalScore: 94, roundScores: [15, 20, 30, 29, 0], rankChange: 0 },
      { username: 'P', totalScore: 0, roundScores: [0, 0, 0, 0, 0], rankChange: 0 },
      { username: 'T', totalScore: 0, roundScores: [0, 0, 0, 0, 0], rankChange: 0 },
      { username: 'H', totalScore: 0, roundScores: [0, 0, 0, 0, 0], rankChange: 0 },
    ];
    const final = (username: string) => renderScreen({
      finalScores: ZERO, username, seriesRoundNumber: 5, seriesStandings: STANDINGS, seriesLeader: 'Host',
    });

    it('rows keep the live round numbers; my card gives my SERIES place, never "#1 tied" on 0 points', () => {
      final('T');
      skip();
      // the big row numbers are still the server's round scores (== live leaderboard)
      expect(screen.getAllByTestId('mp-standing-score').map((n) => n.textContent)).toEqual(['0', '0', '0', '0']);
      const card = screen.getByTestId('mp-my-card');
      expect(card.getAttribute('data-series')).toBe('true');
      expect(screen.getByTestId('mp-my-rank').textContent).toBe('#2');
      expect(card.textContent).not.toContain('mpUi.results.tiedWith');
      expect(card.textContent).toContain('mpUi.results.behind:{"points":94,"name":"Host"}');
      expect(card.getAttribute('data-winner')).toBe('false');
    });

    it('the champion chip and the champion card agree (one source: the series totals)', () => {
      final('Host');
      skip();
      expect(screen.getByTestId('mp-series-champion').textContent).toContain('Host');
      // the board points at the champion too (the crown is the ROUND's 1st)
      const champRows = screen.getAllByTestId('mp-standing-row').filter((r) => within(r).queryByTestId('mp-standing-champion'));
      expect(champRows.map((r) => r.textContent)).toEqual([expect.stringContaining('Host')]);
      const card = screen.getByTestId('mp-my-card');
      expect(card.getAttribute('data-winner')).toBe('true');
      expect(screen.getByTestId('mp-my-rank').textContent).toBe('#1');
      expect(screen.getByTestId('mp-my-score').textContent).toBe('94');
    });

    it('a series nobody scored in names no champion', () => {
      renderScreen({
        finalScores: ZERO, username: 'T', seriesRoundNumber: 5, seriesLeader: 'Host',
        seriesStandings: STANDINGS.map((s) => ({ ...s, totalScore: 0, roundScores: [0, 0, 0, 0, 0] })),
      });
      skip();
      expect(screen.queryByTestId('mp-series-champion')).toBeNull();
    });

    it('the intermission card stays about the round just played', () => {
      renderScreen({ finalScores: ZERO, username: 'T', seriesRoundNumber: 3, seriesStandings: STANDINGS });
      skip();
      expect(screen.getByTestId('mp-my-card').getAttribute('data-series')).toBe('false');
    });
  });
  describe('the verdict of a series final follows the SERIES (round-5 winner P lost the series to Host)', () => {
    const R5 = [
      { username: 'P', score: 30, allWords: [] },
      { username: 'Host', score: 5, allWords: [] },
      { username: 'T', score: 0, allWords: [] },
    ];
    const STANDINGS = [
      { username: 'Host', totalScore: 120, roundScores: [40, 40, 30, 5, 5], rankChange: 0 },
      { username: 'P', totalScore: 60, roundScores: [10, 10, 5, 5, 30], rankChange: 0 },
      { username: 'T', totalScore: 0, roundScores: [0, 0, 0, 0, 0], rankChange: 0 },
    ];
    const final = (username: string) => renderScreen({ finalScores: R5, username, seriesRoundNumber: 5, seriesStandings: STANDINGS });

    it('tap-to-skip: the round winner who lost the series gets 2nd-place light confetti and the defeat sound', () => {
      final('P');
      skip();
      expect(h.confetti.mock.calls).toEqual([[2, 'light']]);
      expect(h.win).not.toHaveBeenCalled();
      expect(h.lose).toHaveBeenCalledTimes(1);
    });

    it('tap-to-skip: the series champion who lost round 5 gets the full confetti and the win sound', () => {
      final('Host');
      skip();
      expect(h.confetti.mock.calls).toEqual([[1, 'full']]);
      expect(h.win).toHaveBeenCalledTimes(1);
      expect(h.lose).not.toHaveBeenCalled();
    });

    it('reduced motion: the verdict sound waits for the branch and follows the series (no confetti)', async () => {
      vi.useFakeTimers();
      h.reduced = true;
      final('P');
      await act(async () => { vi.advanceTimersByTime(1_000); });
      expect(h.win).not.toHaveBeenCalled();
      expect(h.lose).toHaveBeenCalledTimes(1);
      expect(h.confetti).not.toHaveBeenCalled();
    });

    it('the full show (no skip) lands the series verdict on 1st place\'s slam', async () => {
      vi.useFakeTimers();
      final('Host');
      await act(async () => { vi.advanceTimersByTime(6_000); });
      expect(h.confetti.mock.calls).toEqual([[1, 'full']]);
      expect(h.win).toHaveBeenCalledTimes(1);
    });
  });
});

