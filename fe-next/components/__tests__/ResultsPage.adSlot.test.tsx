/**
 * ResultsPage Ad Slot Tests
 *
 * Bug: Multiplayer results page was missing the `ResultsBannerSlot` component
 * that every other results page (SP, daily, challenge) uses to display the
 * native AdMob banner on the post-game screen. `/multiplayer` is also in
 * GAME_ROUTES so AnchoredNativeBanner is hidden during the whole multiplayer
 * flow including the results screen — without an inline banner slot, no ads
 * served on the MP results page and the bottom of the layout collapsed to a
 * blank white area where an ad was expected.
 *
 * The fix is to render `<ResultsBannerSlot placement="multiplayer-round-complete" />`
 * alongside the existing CrazyGamesBanner in both mobile and desktop layouts —
 * matching the pattern used by SinglePlayerResults / DailyChallengeResults /
 * DailyWordHuntResults / ChallengeResults.
 */

import React from 'react';
import { act, render, fireEvent, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { NavigationProvider } from '@/contexts/NavigationContext';

const bannerSlotMock = vi.fn();

vi.mock('@/components/ads/ResultsBannerSlot', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    bannerSlotMock(props);
    return (
      <div
        data-testid="results-banner-slot-mock"
        data-placement={String(props.placement)}
      />
    );
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));

vi.mock('@/hooks/useWinStreak', () => ({
  useWinStreak: () => ({ currentStreak: 0, bestStreak: 0, recordWin: vi.fn() }),
}));

vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

vi.mock('framer-motion', () => {
  const motionValueStub = () => ({
    set: vi.fn(),
    get: () => 0,
    on: () => () => {},
    onChange: () => () => {},
  });
  return {
    m: {
      div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <div {...props}>{children}</div>
      ),
      button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <button {...props}>{children}</button>
      ),
      span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <span {...props}>{children}</span>
      ),
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
    useReducedMotion: () => false,
    useScroll: () => ({
      scrollX: motionValueStub(),
      scrollY: motionValueStub(),
      scrollXProgress: motionValueStub(),
      scrollYProgress: motionValueStub(),
    }),
    useTransform: () => motionValueStub(),
    useMotionValue: motionValueStub,
    useVelocity: () => motionValueStub(),
    useSpring: () => motionValueStub(),
  };
});

vi.mock('canvas-confetti', () => ({ __esModule: true, default: vi.fn() }));

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    const Component = React.forwardRef((_props: any, _ref: any) => null);
    Component.displayName = 'DynamicComponent';
    return Component;
  },
}));

const mainContentPropsCapture: { current: any } = { current: null };
vi.mock('@/components/results/ResultsMainContent', () => ({
  __esModule: true,
  ResultsMainContent: (props: any) => {
    mainContentPropsCapture.current = props;
    return <div data-testid="results-main-content" />;
  },
}));

vi.mock('@/components/results/ResultsPlayerCard', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/ExitRoomButton', () => ({
  __esModule: true,
  default: () => <button data-testid="exit-button">Exit</button>,
}));

vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

vi.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/auth/FirstWinSignupModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/results/ShareWinPrompt', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/voting/WordFeedbackModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/results/useResultsSocketEvents', () => ({
  useResultsSocketEvents: () => ({
    showWordFeedback: false,
    wordToVote: null,
    wordQueue: [],
    xpGainedData: null,
    levelUpData: null,
    showLevelUpCelebration: false,
    setShowLevelUpCelebration: vi.fn(),
    setLevelUpData: vi.fn(),
    nearMisses: [],
    referralMilestone: null,
    showReferralMilestone: false,
    readyUsernames: [],
    isCurrentPlayerReady: false,
    handleVote: vi.fn(),
    handleFeedbackSkip: vi.fn(),
    handleReferralMilestoneClose: vi.fn(),
    handleMarkReady: vi.fn(),
  }),
}));

vi.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: vi.fn(),
}));

vi.mock('@/utils/guestManager', () => ({
  shouldShowUpgradePrompt: vi.fn(() => false),
  getGuestStatsSummary: vi.fn(() => ({ gamesPlayed: 5 })),
  getGuestStats: vi.fn(() => ({ games: 5, words: 0, score: 0 })),
  updateGuestStatsAfterGame: vi.fn(),
  isFirstWin: vi.fn(() => false),
}));

vi.mock('@/hooks/usePostHogFlag', () => ({
  usePostHogFlag: vi.fn(() => 'after-2nd-game'),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGameCompletion: vi.fn(),
  trackStreakMilestone: vi.fn(),
  trackGrowthEvent: vi.fn(),
}));

vi.mock('@/utils/gameHistoryManager', () => ({
  addGameToHistory: vi.fn(),
}));

vi.mock('@/utils/coinManager', () => ({
  awardGameCoins: vi.fn(() => null),
}));

vi.mock('@/hooks/useSaveCognitiveScore', () => ({
  useSaveCognitiveScore: () => ({
    saveCognitiveScore: vi.fn().mockResolvedValue(null),
    isSaving: false,
  }),
}));

vi.mock('@/hooks/useFirstWinCelebration', () => ({
  useFirstWinCelebration: vi.fn(),
}));

vi.mock('@/hooks/useCrazyGamesLifecycle', () => ({
  useCrazyGamesLifecycle: vi.fn(),
}));

vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({ refreshCoins: vi.fn() }),
}));

vi.mock('@/lib/supabase', () => ({
  syncCoinsToDatabase: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/utils/SocketContext', () => ({
  useSocket: () => ({
    socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
    isConnected: true,
  }),
  useSocketOptional: () => null,
}));

vi.mock('@/components/RoomChat', () => ({ __esModule: true, default: () => null }));

vi.mock('@/components/CrazyGamesBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="crazy-games-banner" />,
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  shouldHideExternalLogin: vi.fn(() => false),
  useCrazyGames: vi.fn(() => ({
    isAvailable: false,
    isOnCrazyGamesPlatform: false,
    showMidgameAd: vi.fn(),
    showRewardedAd: vi.fn(),
    hasAdblock: vi.fn(async () => false),
    gameplayStart: vi.fn(),
    gameplayStop: vi.fn(),
    submitLeaderboardScore: vi.fn(),
  })),
}));

vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn() }));

// Skip the pre-result fanfare overlay: for a notable rank the real page returns
// only <PreResultFanfare> and never mounts the results tree (incl. the banner
// slot + ResultsMainContent these tests assert) until onComplete fires.
vi.mock('@/components/mascot/celebrationKind', () => ({
  pickCelebrationKind: vi.fn(() => null),
}));

const showInterstitialMock = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({ showInterstitial: showInterstitialMock }),
}));

// Import after all mocks are set up
import ResultsPage from '@/components/views/ResultsPage';

const renderResultsPage = (props: {
  finalScores: Array<{ username: string; score: number; allWords?: any[] }>;
  username: string;
  isHost?: boolean;
  socket?: { emit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn> };
}) => {
  const socket = props.socket ?? { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
  return {
    socket,
    ...render(
      <NavigationProvider>
        <LanguageProvider>
          <ResultsPage
            finalScores={props.finalScores}
            username={props.username}
            gameCode="TEST123"
            onReturnToRoom={vi.fn()}
            socket={socket as any}
            duplicateRuleDisabled={false}
            playerCount={2}
            isHost={props.isHost ?? false}
            roomLanguage="en"
          />
        </LanguageProvider>
      </NavigationProvider>,
    ),
  };
};

describe('ResultsPage — AdMob banner slot', () => {
  beforeEach(() => {
    bannerSlotMock.mockClear();
    showInterstitialMock.mockClear();
    showInterstitialMock.mockResolvedValue(undefined);
    mainContentPropsCapture.current = null;
  });

  it('does not fire the AdMob interstitial on results mount', () => {
    // Bug repro: previously the MP results page fired the interstitial
    // unconditionally on mount. AdMob's prepare → show pipeline can take
    // a few seconds, so the user would see results, then a fullscreen
    // interstitial overlay paint over the page — and when the ad creative
    // partially rendered, the user was stuck on a blank white screen.
    // The fix moves the interstitial to a user-initiated transition.
    renderResultsPage({
      finalScores: [
        { username: 'PlayerOne', score: 100, allWords: [{ word: 'test', score: 5, validated: true }] },
        { username: 'PlayerTwo', score: 50, allWords: [] },
      ],
      username: 'PlayerOne',
    });

    expect(showInterstitialMock).not.toHaveBeenCalled();
  });

  it('renders ResultsBannerSlot with multiplayer-round-complete placement', () => {
    // Bug repro: prior to the fix the MP results page was the only results
    // screen missing ResultsBannerSlot, so AdMob never served on it. Asserting
    // the slot is mounted with the correct placement string locks in parity
    // with SP / Daily / Challenge results.
    renderResultsPage({
      finalScores: [
        { username: 'PlayerOne', score: 100, allWords: [{ word: 'test', score: 5, validated: true }] },
        { username: 'PlayerTwo', score: 50, allWords: [] },
      ],
      username: 'PlayerOne',
    });

    expect(bannerSlotMock).toHaveBeenCalled();
    const calls = bannerSlotMock.mock.calls;
    // At least one invocation must carry the MP placement string. Both mobile
    // and desktop layouts mount the page tree, so multiple calls are expected.
    const placements = calls.map((args) => args[0]?.placement);
    expect(placements).toContain('multiplayer-round-complete');
  });

  it('host start-game awaits the interstitial before emitting startGame (other players wait while host watches ad)', async () => {
    // Bug repro: previously the host's `socket.emit('resetGame' | 'startGame')`
    // fired immediately, so the rest of the room dropped into round 2 while
    // the host's interstitial overlay was still mid-show. Awaiting the
    // interstitial promise keeps the next-round emit gated on Dismissed so
    // everyone enters the next round together once the ad-watching host is done.
    let resolveInterstitial: () => void = () => {};
    const interstitialPromise = new Promise<void>((resolve) => {
      resolveInterstitial = resolve;
    });
    showInterstitialMock.mockReturnValueOnce(interstitialPromise);

    const { socket } = renderResultsPage({
      finalScores: [
        { username: 'Host', score: 100, allWords: [{ word: 'test', score: 5, validated: true }] },
        { username: 'Other', score: 50, allWords: [] },
      ],
      username: 'Host',
      isHost: true,
    });

    const onStartGame = mainContentPropsCapture.current?.onStartGame as undefined | (() => Promise<void> | void);
    expect(typeof onStartGame).toBe('function');

    // Kick off the host's "Play Again" while the interstitial promise is unresolved.
    const startGamePromise = act(async () => {
      void onStartGame!();
    });
    // Drain microtasks so the awaited interstitial call lands before assertions.
    await new Promise((r) => setTimeout(r, 0));

    expect(showInterstitialMock).toHaveBeenCalledWith('multiplayer-round-complete');
    // Critical assertion: while the interstitial is in flight, no game-start emits.
    const emitNamesDuringAd = socket.emit.mock.calls.map((c) => c[0]);
    expect(emitNamesDuringAd).not.toContain('resetGame');
    expect(emitNamesDuringAd).not.toContain('startGame');

    // Host dismisses the ad — now the next-round emits should land.
    await act(async () => {
      resolveInterstitial();
      await interstitialPromise;
    });
    await startGamePromise;
    await new Promise((r) => setTimeout(r, 0));

    const emitNamesAfterAd = socket.emit.mock.calls.map((c) => c[0]);
    expect(emitNamesAfterAd).toContain('resetGame');
  });
});
