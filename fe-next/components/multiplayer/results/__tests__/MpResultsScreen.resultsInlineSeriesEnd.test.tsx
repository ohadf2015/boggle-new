/**
 * MpResultsScreen: the results_inline guest signup shows on the series-end
 * screen only, never in the auto-advance gap between rounds.
 */
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
  reduced: false, // reduced mode makes the reveal instantly `done`, which unwires the pointerDown skip — keep the choreography and skip it
  flagKeys: [] as string[],
  guest: true,
  getHeadToHead: vi.fn(),
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
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: !h.guest, user: h.guest ? null : { id: 'u-me' } }) }));
vi.mock('@/hooks/useIsGuest', () => ({ useIsGuest: () => h.guest }));
vi.mock('@/utils/friendsHeadToHead', async (orig) => ({
  ...(await orig<typeof import('@/utils/friendsHeadToHead')>()),
  getHeadToHead: h.getHeadToHead,
  updateOnlineStatus: vi.fn(),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => new Proxy({}, {
    get: (_t, k) => (k === 'playVictorySound' || k === 'playEpicVictorySound' ? h.win : k === 'playDefeatSound' ? h.lose : vi.fn()),
  }),
}));
vi.mock('framer-motion', async (orig) => ({ ...(await orig<typeof import('framer-motion')>()), useReducedMotion: () => h.reduced }));
vi.mock('@/hooks/useMasterMute', () => ({ useMasterMute: () => ({ allMuted: false, toggle: () => {}, label: 'Mute', title: 'Mute' }) }));
vi.mock('@/contexts/NavigationContext', () => ({ useRegisterHeaderAudioControl: () => {} }));
vi.mock('@/components/ui/AnimatedCounter', () => ({ __esModule: true, default: ({ value }: { value: number }) => <span>{value}</span> }));
vi.mock('next/dynamic', () => ({ __esModule: true, default: () => () => null }));
vi.mock('@/components/auth/InlineSignupCard', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) =>
    props.analyticsSource === 'results_inline' ? <div data-testid="inline-signup-card" className={String(props.className)} data-held={String(!!props.held)} /> : null,
}));
vi.mock('@/hooks/usePostHogFlag', () => ({
  usePostHogFlag: (key: string, defaultValue: unknown) => {
    h.flagKeys.push(key);
    return defaultValue;
  },
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
vi.mock('@/hooks/useFriends', () => ({ useFriends: () => ({ friends: [], pendingRequests: [], outgoingRequests: [], pendingChallenges: [], isLoading: false, error: null, refresh: vi.fn(), sendRequest: vi.fn(), acceptRequest: vi.fn(), declineRequest: vi.fn(), cancelRequest: vi.fn(), removeFriend: vi.fn(), blockUser: vi.fn(), unblockUser: vi.fn(), acceptChallenge: vi.fn() }) }));
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: () => null }));

import MpResultsScreen from '../MpResultsScreen';
import { emitRewardAdActive } from '@/hooks/useRewardAdPause';
import { __resetRivalHeadToHeadCache } from '../useRivalHeadToHead';

const slotProps = vi.hoisted(() => ({ last: null as null | { rival?: { kind: string; name: string; record?: unknown } | null; onRematch?: unknown } }));
vi.mock('@/components/results/ResultsSocialSlot', () => ({
  ResultsSocialSlot: (p: never) => { slotProps.last = p; return null; },
}));

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

describe('MpResultsScreen results_inline signup is series-end only', () => {
  beforeEach(() => {
    h.flagKeys = [];
    h.guest = true;
    h.getHeadToHead.mockReset();
    __resetRivalHeadToHeadCache();
    h.trackGrowthEvent.mockClear();
    sessionStorage.clear();
    emitRewardAdActive(false);
  });
  afterEach(() => vi.useRealTimers());

  it('the CTA does NOT render between auto-advancing rounds', () => {
    renderScreen({ seriesRoundNumber: 1, seriesTotalGames: 5 });
    skipReveal();
    expect(screen.queryByTestId('inline-signup-card')).toBeNull();
  });

  it('the CTA renders on the series-end / Leave screen', () => {
    renderScreen({ seriesRoundNumber: 5, seriesTotalGames: 5 });
    skipReveal();
    expect(screen.getByTestId('inline-signup-card')).toBeTruthy();
  });

  it('series end: the CTA is laid out (hidden, held) from the first frame, so its arrival never squeezes the screen', () => {
    renderScreen({ seriesRoundNumber: 5, seriesTotalGames: 5 });
    const card = screen.getByTestId('inline-signup-card');
    expect(card.className).toMatch(/\binvisible\b/);
    expect(card.getAttribute('data-held')).toBe('true');
    skipReveal();
    expect(screen.getByTestId('inline-signup-card').className).not.toMatch(/\binvisible\b/);
    expect(screen.getByTestId('inline-signup-card').getAttribute('data-held')).toBe('false');
  });

  it('between rounds: no CTA is laid out, even during TIME!', () => {
    renderScreen({ seriesRoundNumber: 1, seriesTotalGames: 5 });
    expect(screen.queryByTestId('inline-signup-card')).toBeNull();
  });

  it('no longer reads the ri-mp-series-end experiment flag', () => {
    renderScreen({ seriesRoundNumber: 5, seriesTotalGames: 5 });
    skipReveal();
    expect(h.flagKeys).not.toContain('ri-mp-series-end');
  });

  it('a guest never looks up a head-to-head record', () => {
    renderScreen({ finalScores: SCORES.map((p) => ({ ...p, userId: `u-${p.username}` })) as never });
    skipReveal();
    expect(h.getHeadToHead).not.toHaveBeenCalled();
  });

  it('a signed-in player trailing a signed-in rival with history sees the all-time record on the H2H strip only', async () => {
    h.guest = false;
    h.getHeadToHead.mockResolvedValue({ myWins: 2, theirWins: 4, draws: 0, totalGames: 6 });
    renderScreen({ finalScores: [{ ...SCORES[0], score: 400, userId: 'u-maya' }, SCORES[1], SCORES[2]] as never });
    await waitFor(() => expect(h.getHeadToHead).toHaveBeenCalledWith('u-maya'));
    await Promise.resolve();
    skipReveal();
    // Single source: the shared rival card owns the record (correct rival + W–L) and the rematch.
    await waitFor(() => {
      expect(slotProps.last?.rival).toMatchObject({ kind: 'h2h', name: 'Maya', record: { wins: 2, losses: 4, draws: 0 } });
      expect(typeof slotProps.last?.onRematch).toBe('function');
    });
    expect(screen.getByTestId('mp-my-callout').getAttribute('data-kind')).not.toBe('h2h');
  });

  it('a signed-in player whose rival is a guest gets the usual callout and no lookup', () => {
    h.guest = false;
    renderScreen({ finalScores: [{ ...SCORES[0], score: 400 }, SCORES[1], SCORES[2]] as never });
    skipReveal();
    expect(h.getHeadToHead).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mp-h2h-strip')).toBeNull();
    expect(screen.getByTestId('mp-my-callout').getAttribute('data-kind')).not.toBe('h2h');
  });

  it('a signed-in player with a rival but no H2H history does not show the strip', async () => {
    h.guest = false;
    h.getHeadToHead.mockResolvedValue(null);
    renderScreen({ finalScores: [{ ...SCORES[0], score: 400, userId: 'u-maya' }, SCORES[1], SCORES[2]] as never });
    await waitFor(() => expect(h.getHeadToHead).toHaveBeenCalledWith('u-maya'));
    skipReveal();
    await Promise.resolve();
    expect(screen.queryByTestId('mp-h2h-strip')).toBeNull();
    expect(screen.getByTestId('mp-my-callout').getAttribute('data-kind')).not.toBe('h2h');
  });

  it('classroom results never show the public H2H strip even with history', async () => {
    h.guest = false;
    h.getHeadToHead.mockResolvedValue({ myWins: 3, theirWins: 1, draws: 0, totalGames: 4 });
    // Host + classroomSummary ⇒ isClassroom without mounting student chest/socket paths.
    renderScreen({
      isHost: true,
      finalScores: [{ ...SCORES[0], score: 400, userId: 'u-maya' }, SCORES[1], SCORES[2]] as never,
      classroomSummary: {
        teacherName: 'Ms. T',
        lessonNames: ['L1'],
        lessonIds: ['lesson-1'],
        totalWords: 0,
        coverage: [],
        missedWords: [],
        classFoundCount: 0,
        masteryByPlayer: {},
      } as never,
    });
    skipReveal();
    expect(screen.queryByTestId('mp-h2h-strip')).toBeNull();
  });
});
