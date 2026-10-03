/**
 * The calm dial on the one results screen. A hidden leaderboard means NO
 * class position before the teacher's final reveal: the between-rounds
 * intermission swaps the standings board for the reveal note and strips the
 * rank off my card. The final screen of the series is the reveal — the dial
 * steps aside there.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Socket } from 'socket.io-client';
import { useClassroomPressureStore } from '@/hooks/gameState/classroomPressureStore';

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
  useSoundEffects: () => new Proxy({}, { get: () => vi.fn() }),
}));
vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));
vi.mock('@/hooks/useMasterMute', () => ({ useMasterMute: () => ({ allMuted: false, toggle: () => {}, label: 'Mute', title: 'Mute' }) }));
vi.mock('@/contexts/NavigationContext', () => ({ useRegisterHeaderAudioControl: () => {} }));
vi.mock('@/components/ui/AnimatedCounter', () => ({ __esModule: true, default: ({ value }: { value: number }) => <span>{value}</span> }));
vi.mock('next/dynamic', () => ({ __esModule: true, default: () => () => null }));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (p: Record<string, unknown>) => <img {...(p as React.ImgHTMLAttributes<HTMLImageElement>)} />,
}));
vi.mock('@/components/ads/ResultsBannerSlot', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/results/ResultsModals', () => ({ ResultsModals: () => null }));
vi.mock('@/components/results/PostRoundSummary', () => ({ PostRoundSummary: () => null }));
vi.mock('@/components/results/ResultsMainContent', () => ({ ResultsMainContent: () => null }));
vi.mock('@/components/results/ResultsDetailsContent', () => ({ ResultsDetailsContent: () => null }));
vi.mock('@/components/ui/ConfirmationDialog', () => ({ ConfirmationDialog: () => null }));
vi.mock('@/components/results/useResultsSocketEvents', () => ({
  useResultsSocketEvents: () => ({
    showWordFeedback: false, wordToVote: null, wordQueue: [], xpGainedData: null, levelUpData: null,
    showLevelUpCelebration: false, setShowLevelUpCelebration: vi.fn(), setLevelUpData: vi.fn(), nearMisses: [],
    referralMilestone: null, showReferralMilestone: false, readyUsernames: [], isCurrentPlayerReady: false,
    handleVote: vi.fn(), handleFeedbackSkip: vi.fn(), handleReferralMilestoneClose: vi.fn(), handleMarkReady: vi.fn(),
  }),
}));
vi.mock('@/hooks/useMpExit', () => ({
  useMpExit: () => ({ isExiting: false, requestExit: vi.fn(), confirmExitRoom: vi.fn(), showExitConfirm: false, setShowExitConfirm: vi.fn() }),
}));
vi.mock('@/hooks/useWinShare', () => ({ useWinShare: () => ({ showShareModal: false, setShowShareModal: vi.fn() }) }));
vi.mock('@/hooks/useCoinReward', () => ({ useCoinReward: () => ({ coinReward: null }) }));
vi.mock('@/hooks/useResultsAdGate', () => ({ useResultsAdGate: () => ({ anyAdActive: false }) }));
vi.mock('@/hooks/useShareOpenGuard', () => ({ useShareOpenGuard: () => ({ shouldFireShareOpen: () => false }) }));
vi.mock('@/hooks/useMultiplayerSignupNudge', () => ({ useMultiplayerSignupNudge: () => ({ activeNudge: null, dismissNudge: vi.fn(), stats: {} }) }));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false, submitLeaderboardScore: vi.fn() }),
}));
vi.mock('@/components/education/ClassroomResultsCard', () => ({
  ClassroomResultsCard: () => <div data-testid="classroom-results-card-mock" />,
}));

import MpResultsScreen from '../MpResultsScreen';

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

const HIDDEN = { leaderboard: 'hidden' as const, timer: 'full' as const, speedScoring: true };

const SERIES_STANDINGS = [
  { username: 'Maya', totalScore: 900, roundScores: [200, 250, 150, 200, 100], rankChange: 0 },
  { username: 'Me', totalScore: 800, roundScores: [150, 200, 150, 200, 100], rankChange: 0 },
  { username: 'Leo', totalScore: 400, roundScores: [100, 100, 100, 50, 50], rankChange: 0 },
];

const skip = () => {
  fireEvent.pointerDown(screen.getByTestId('mp-results-stage'));
  act(() => { vi.advanceTimersByTime(600); });
};

describe('MpResultsScreen — leaderboard=hidden (calm dial)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useClassroomPressureStore.getState().setClassroomPressure(HIDDEN);
  });
  afterEach(() => {
    vi.useRealTimers();
    useClassroomPressureStore.getState().setClassroomPressure(null);
  });

  it('intermission: no standings rows, the reveal note instead', () => {
    renderScreen();
    skip();
    expect(screen.queryAllByTestId('mp-standing-row')).toHaveLength(0);
    expect(screen.getByText('education.classroomGame.pressure.revealAtEnd')).toBeInTheDocument();
  });

  it('intermission: my card keeps my score without rank, winner framing or a rival gap', () => {
    renderScreen();
    skip();
    expect(screen.queryByTestId('mp-my-rank')).toBeNull();
    const card = screen.getByTestId('mp-my-card');
    expect(card).toHaveTextContent('300');
    expect(card).not.toHaveTextContent('mpUi.results.winner');
    expect(card).not.toHaveTextContent('mpUi.results.placeOf');
    expect(card).not.toHaveTextContent('mpUi.results.behind');
    expect(card).not.toHaveTextContent('mpUi.results.tiedWith');
  });

  it('final round: the reveal happens — standings and rank render under the same dial', () => {
    renderScreen({ seriesRoundNumber: 5, seriesStandings: SERIES_STANDINGS });
    skip();
    expect(screen.getAllByTestId('mp-standing-row').length).toBeGreaterThan(0);
    expect(screen.getByTestId('mp-my-rank')).toBeInTheDocument();
  });

  it('no pressure (casual room): intermission renders standings as before', () => {
    useClassroomPressureStore.getState().setClassroomPressure(null);
    renderScreen();
    skip();
    expect(screen.getAllByTestId('mp-standing-row').length).toBeGreaterThan(0);
    expect(screen.getByTestId('mp-my-rank')).toBeInTheDocument();
  });
});
