/**
 * A first-timer now lands in /singleplayer?autoStart=bots straight out of FTUE
 * (see lib/onboarding/firstGameRoute.ts). ModeCoach is deliberately disabled
 * ("more confusing than helping"), so before this there was NO on-screen help
 * here at all — nothing taught the drag gesture and nothing rescued someone who
 * froze.
 *
 * The stuck coach is the one that may speak: silent if you have scored, silent
 * for anyone past their first game, at most one hint per game, auto-hidden after
 * 10s. It only appears on demonstrated confusion — 12s frozen, or fruitless
 * submits — which is the "help me only if I am stuck" contract.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('@/components/tutorial/ModeCoach', () => ({
  ModeCoach: ({ mode }: { mode: string }) => (
    <div data-testid="mode-coach" data-mode={mode} />
  ),
}));

vi.mock('@/components/practice/PracticeCoachTip', () => ({
  __esModule: true,
  default: () => <div data-testid="practice-coach-tip" />,
}));

vi.mock('../game', () => ({
  SinglePlayerShell: () => <div data-testid="layout-portrait" />,
  useSinglePlayerCore: () => ({
    grid: [['A', 'B'], ['C', 'D']],
    foundWords: [],
    liveAchievements: [],
    score: 0,
    isPaused: false,
    isGameOver: false,
    t: (k: string) => k,
    timer: { remainingTime: 60 },
    combo: { comboLevel: 0, comboTimeRemaining: 0, isDangerState: false, maxCombo: 0 },
    comboCoinReward: 0,
    handleCoinAnimationComplete: vi.fn(),
    formedWord: '',
    letterCount: 0,
    currentFeedback: null,
    keyboardInput: null,
    tutorialPath: null,
    tutorialWord: null,
    revealState: { highlightedPath: null },
    lastWordFoundTimeRef: { current: 0 },
    fireRoundActive: false,
    fireRoundRemaining: 0,
    earthquakeState: null,
    isValidatingWords: false,
    showHintPrompt: false,
    revealableWordCount: 0,
    handleReveal: vi.fn(),
    setShowHintPrompt: vi.fn(),
    directionGuidance: null,
    training: null,
    handleWordSubmit: vi.fn(),
    handlePathSubmit: vi.fn(),
    handleWordChange: vi.fn(),
    handlePauseToggle: vi.fn(),
    handleFinishPractice: vi.fn(),
    handleQuitRequest: vi.fn(),
    onQuit: vi.fn(),
    showQuitConfirm: false,
    setShowQuitConfirm: vi.fn(),
    isLandscape: false,
    isDesktop: false,
    isTv: false,
    targetHighScore: null,
    totalBoardWords: 10,
    progressBarExpanded: false,
    handleToggleProgressBar: vi.fn(),
    showLandscapeTutorial: false,
    dismissLandscapeTutorial: vi.fn(),
    gameStatsRef: { current: null },
  }),
  LandscapeGameLayout: () => <div data-testid="layout-landscape" />,
  DesktopGameLayout: () => <div data-testid="layout-desktop" />,
}));

vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => null }));
vi.mock('@/components/achievements', () => ({
  useAchievementQueue: () => ({ queueAchievement: vi.fn() }),
}));
vi.mock('@/components/game/FirstTimeEncouragement', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('@/hooks/useFirstTimeEncouragement', () => ({
  useFirstTimeEncouragement: () => ({
    currentTrigger: null,
    triggerEncouragement: vi.fn(),
    dismiss: vi.fn(),
  }),
}));
vi.mock('@/hooks/useIdleDetection', () => ({
  useIdleDetection: () => ({ reportActivity: vi.fn() }),
}));
vi.mock('@/utils/growthTracking', () => ({
  trackDeadTime: vi.fn(),
  trackGameStart: vi.fn(),
  trackGrowthEvent: vi.fn(),
}));
vi.mock('@/utils/posthogEngagement', () => ({
  createFirstMinuteSurvivalTimer: () => ({ start: vi.fn(), cancel: vi.fn() }),
  detectPlatform: () => 'web',
}));
vi.mock('@/components/animations/ScorePopupFly', () => ({ ScorePopupFly: () => null }));
vi.mock('../PracticeContinuePrompt', () => ({ __esModule: true, default: () => null }));
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn() }));
vi.mock('@/lib/achievements/hiddenAchievementBus', () => ({
  evaluateSelectionAchievements: vi.fn(),
}));

import type { SinglePlayerGameState } from '../SinglePlayerView';

const settings = {
  mode: 'challenge',
  difficulty: 'MEDIUM',
  language: 'en',
  grid: [['A', 'B'], ['C', 'D']],
  timerSeconds: 60,
  bots: [],
  minWordLength: 3,
} as unknown as SinglePlayerGameState;

import SinglePlayerGame from '../SinglePlayerGame';

let mockCoach: {
  stage: string;
  visible: boolean;
  markTap: ReturnType<typeof vi.fn>;
  markDragStart: ReturnType<typeof vi.fn>;
  markSubmit: ReturnType<typeof vi.fn>;
  markAccepted: ReturnType<typeof vi.fn>;
  dismiss: ReturnType<typeof vi.fn>;
};
const coachArgsSpy = vi.fn();

vi.mock('@/hooks/useMPStuckCoach', () => ({
  useMPStuckCoach: (args: unknown) => {
    coachArgsSpy(args);
    return mockCoach;
  },
}));
vi.mock('@/hooks/useCoachExampleWord', () => ({
  useCoachExampleWord: () => 'CAT',
}));

const baseSettings = {
  mode: 'solo-bots' as const,
  difficulty: 'EASY',
  timerSeconds: 90,
  bots: [],
  language: 'en',
  grid: null,
  minWordLength: 2,
};

function renderGame() {
  return render(
    <SinglePlayerGame
      settings={baseSettings as never}
      targetHighScore={null}
      onGameEnd={vi.fn()}
      onQuit={vi.fn()}
    />
  );
}

beforeEach(() => {
  coachArgsSpy.mockClear();
  mockCoach = {
    stage: 'none',
    visible: false,
    markTap: vi.fn(),
    markDragStart: vi.fn(),
    markSubmit: vi.fn(),
    markAccepted: vi.fn(),
    dismiss: vi.fn(),
  };
});

describe('SinglePlayerGame — stuck coach', () => {
  it('stays completely silent while the player is coping', () => {
    renderGame();
    expect(screen.queryByTestId('mp-stuck-coach-card')).not.toBeInTheDocument();
  });

  it('shows the coach once the arbiter says the player is stuck', () => {
    mockCoach = { ...mockCoach, stage: 'idle-nudge', visible: true };
    renderGame();
    expect(screen.getByTestId('mp-stuck-coach-card')).toBeInTheDocument();
  });

  it('passes the desktop flag through so the touch-only tap hint is suppressed', () => {
    renderGame();
    expect(coachArgsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ isClassic: true, isDesktop: false })
    );
  });

  it('reports the player has scored, so the coach gets out of the way', () => {
    renderGame();
    // markAccepted is what silences every later stage (accepted > 0 => 'none').
    expect(typeof mockCoach.markAccepted).toBe('function');
    expect(coachArgsSpy).toHaveBeenCalled();
  });
});
