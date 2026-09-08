/**
 * First-15-seconds fix, part 2: instrumentation. When the board flips from
 * "loading" (core.grid === null) to "interactive" (core.grid set), emit a
 * single dead-time signal carrying how much of the round clock was still
 * left. Before the useSinglePlayerCore.timerGate fix this would have shown
 * remainingTime < timerSeconds (the clock was silently ticking under the
 * loader); after the fix it must always read remainingTime === timerSeconds.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const trackGameStart = vi.fn();
const trackGameEnd = vi.fn();
const trackDeadTime = vi.fn();
const trackBoardReady = vi.fn();

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: (...args: unknown[]) => trackGameStart(...args),
  trackGameEnd: (...args: unknown[]) => trackGameEnd(...args),
  trackDeadTime: (...args: unknown[]) => trackDeadTime(...args),
  trackGrowthEvent: vi.fn(),
}));

vi.mock('@/lib/singleplayer/boardReadyTelemetry', () => ({
  trackBoardReady: (...args: unknown[]) => trackBoardReady(...args),
}));

const { coreMock } = vi.hoisted(() => {
  const coreMock: { grid: unknown; timer: { remainingTime: number } } = {
    grid: null,
    timer: { remainingTime: 60 },
  };
  return { coreMock };
});

vi.mock('../game', () => ({
  SinglePlayerShell: () => <div data-testid="layout-portrait" />,
  useSinglePlayerCore: () => ({
    grid: coreMock.grid,
    foundWords: [],
    liveAchievements: [],
    score: 0,
    isPaused: false,
    isGameOver: false,
    t: (k: string) => k,
    timer: coreMock.timer,
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
    totalBoardWords: 0,
    progressBarExpanded: false,
    handleToggleProgressBar: vi.fn(),
    showLandscapeTutorial: false,
    dismissLandscapeTutorial: vi.fn(),
    gameStatsRef: { current: null },
  }),
  LandscapeGameLayout: () => null,
  DesktopGameLayout: () => null,
}));

vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => null }));
vi.mock('@/components/achievements', () => ({ useAchievementQueue: () => ({ queueAchievement: vi.fn() }) }));
vi.mock('@/components/game/FirstTimeEncouragement', () => ({ __esModule: true, default: () => null }));
vi.mock('@/hooks/useFirstTimeEncouragement', () => ({
  useFirstTimeEncouragement: () => ({ currentTrigger: null, triggerEncouragement: vi.fn(), dismiss: vi.fn() }),
}));
vi.mock('@/hooks/useIdleDetection', () => ({ useIdleDetection: () => ({ reportActivity: vi.fn() }) }));
vi.mock('@/components/animations/ScorePopupFly', () => ({ ScorePopupFly: () => null }));

import SinglePlayerGame from '../SinglePlayerGame';
import type { SinglePlayerGameState } from '../SinglePlayerView';
import type { LetterGrid } from '@/shared/types/game';

const mockGrid: LetterGrid = [
  ['T', 'E', 'S', 'T'],
  ['W', 'O', 'R', 'D'],
];

const settings = {
  mode: 'solo-bots',
  difficulty: 'MEDIUM',
  language: 'en',
  timerSeconds: 60,
  gridSize: 4,
} as unknown as SinglePlayerGameState;

beforeEach(() => {
  trackGameStart.mockClear();
  trackGameEnd.mockClear();
  trackDeadTime.mockClear();
  trackBoardReady.mockClear();
  coreMock.grid = null;
  coreMock.timer = { remainingTime: 60 };
});

describe('SinglePlayerGame board-ready telemetry', () => {
  it('does not fire the board-ready signal while the grid is still loading', () => {
    render(
      <SinglePlayerGame settings={settings} targetHighScore={null} onGameEnd={vi.fn()} onQuit={vi.fn()} />
    );
    expect(trackBoardReady).not.toHaveBeenCalled();
  });

  it('fires exactly once, with remainingTime still at the full round length, once the grid loads', () => {
    const { rerender } = render(
      <SinglePlayerGame settings={settings} targetHighScore={null} onGameEnd={vi.fn()} onQuit={vi.fn()} />
    );

    // Simulate the async board fetch resolving.
    coreMock.grid = mockGrid;
    coreMock.timer = { remainingTime: 60 };
    rerender(
      <SinglePlayerGame settings={settings} targetHighScore={null} onGameEnd={vi.fn()} onQuit={vi.fn()} />
    );

    expect(trackBoardReady).toHaveBeenCalledTimes(1);
    expect(trackBoardReady).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'solo-bots',
        msToInteractive: expect.any(Number),
        remainingTimeAtReady: 60,
        timerSeconds: 60,
      })
    );

    // A later re-render (e.g. score change) must not re-fire it.
    coreMock.timer = { remainingTime: 55 };
    rerender(
      <SinglePlayerGame settings={settings} targetHighScore={null} onGameEnd={vi.fn()} onQuit={vi.fn()} />
    );
    expect(trackBoardReady).toHaveBeenCalledTimes(1);
  });
});
