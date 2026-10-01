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
  push: vi.fn(),
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
vi.mock('@/utils/growthTracking', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/utils/growthTracking')>()), trackModalInteraction: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: h.push }) }));
vi.mock('@/lib/speech/textToSpeech', () => ({ speakWord: vi.fn(async () => true) }));
vi.mock('@/lib/boardSelection', () => ({ pickRichestBoardClient: () => [['A']] }));

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

const SUMMARY = {
  teacherName: 'Ms Levy',
  lessonNames: ['Week 3'],
  lessonIds: ['lesson-1'],
  totalWords: 3,
  coverage: [
    { word: 'bread', foundBy: ['Maya'] },
    { word: 'cloud', foundBy: ['Me'] },
    { word: 'dream', foundBy: [] },
  ],
  missedWords: ['dream'],
  classFoundCount: 2,
  masteryByPlayer: {},
};

describe('MpResultsScreen - a classroom student round end', () => {
  beforeEach(() => {
    h.reduced = false;
    h.push.mockClear();
    sessionStorage.clear();
    emitRewardAdActive(false);
  });

  it('shows the student their own missed lesson words instead of a mode picker they cannot use', () => {
    renderScreen({ classroomSummary: SUMMARY as never });
    skip();
    const card = screen.getByTestId('student-missed-words');
    expect(card.textContent).toContain('bread');
    expect(card.textContent).toContain('dream');
    expect(card.textContent).not.toContain('cloud');
    expect(screen.queryByTestId('mp-next-mode')).toBeNull();
  });

  it('practice these opens the lesson practice', () => {
    renderScreen({ classroomSummary: SUMMARY as never });
    skip();
    fireEvent.click(screen.getByRole('button', { name: /eduStudent.results.practiceThese/ }));
    expect(h.push).toHaveBeenCalledWith('/en/student/lessons/lesson-1?mode=flashcard');
  });

  it('keeps the next-mode card for the host', () => {
    renderScreen({ classroomSummary: SUMMARY as never, isHost: true });
    skip();
    expect(screen.queryByTestId('student-missed-words')).toBeNull();
  });
});

describe('MpResultsScreen - classroom student leaving', () => {
  it('asks on the dark student dialog, and leaving still goes through the room exit', () => {
    renderScreen({ classroomSummary: SUMMARY as never });
    skip();
    fireEvent.click(screen.getByTestId('mp-back-leave'));
    expect(screen.getByText('eduStudent.exit.title')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'eduStudent.exit.leave' }));
    expect(h.mpExit).toHaveBeenCalled();
  });
});

describe('MpResultsScreen - the teacher is not a classmate', () => {
  it('Given the teacher in the round scores, When a student sees results, Then the teacher is not ranked', () => {
    renderScreen({ classroomSummary: SUMMARY as never, finalScores: [...SCORES, { username: 'Ms Levy', score: 0, allWords: [] }] as never });
    skip();
    const stage = screen.getByTestId('mp-results-stage');
    expect(within(stage).queryByText('Ms Levy')).toBeNull();
    expect(stage.textContent).not.toContain('"total":4');
  });
});

describe('MpResultsScreen - what the teacher switched to next', () => {
  it('Given the teacher switched game, When the student waits on results, Then the footer names the next game', async () => {
    renderScreen({ classroomSummary: SUMMARY as never, classroomNextMode: 'vocab-quiz' } as never);
    skip();
    const footer = await screen.findByTestId('mp-teacher-paced');
    expect(footer.textContent).toContain('eduStudent.results.nextUp');
    expect(footer.textContent).toContain('teacher.classroom.gameModes.vocabQuiz');
  });

  it('Given no switch, Then the footer keeps the plain teacher-paced line', async () => {
    renderScreen({ classroomSummary: SUMMARY as never });
    skip();
    const footer = await screen.findByTestId('mp-teacher-paced');
    expect(footer.textContent).not.toContain('eduStudent.results.nextUp');
  });
});
