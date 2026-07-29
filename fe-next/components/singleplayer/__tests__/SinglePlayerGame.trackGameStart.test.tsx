/**
 * Funnel parity: SinglePlayerGame must emit `trackGameStart('singleplayer', { subMode })`
 * once on mount. subMode = settings.mode, matching emitSinglePlayerGameEnd(results, settings.mode)
 * in useSinglePlayerCore so PostHog can join mode_started → game_completed.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const trackGameStart = vi.fn();
const trackGameEnd = vi.fn();
const trackDeadTime = vi.fn();

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: (...args: unknown[]) => trackGameStart(...args),
  trackGameEnd: (...args: unknown[]) => trackGameEnd(...args),
  trackDeadTime: (...args: unknown[]) => trackDeadTime(...args),
}));

vi.mock('../game', () => ({
  useSinglePlayerCore: () => ({
    grid: null,
    foundWords: [],
    liveAchievements: [],
    score: 0,
    isPaused: false,
    isGameOver: false,
    t: (k: string) => k,
    timer: { remainingTime: 0 },
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
  PortraitGameLayout: () => null,
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

const settings: SinglePlayerGameState = {
  mode: 'practice',
  difficulty: 'medium',
  language: 'en',
  timerSeconds: 180,
  gridSize: 4,
} as unknown as SinglePlayerGameState;

beforeEach(() => {
  trackGameStart.mockClear();
  trackGameEnd.mockClear();
});

describe('SinglePlayerGame trackGameStart', () => {
  it("emits trackGameStart('singleplayer') once on mount with subMode=settings.mode", () => {
    render(
      <SinglePlayerGame
        settings={settings}
        targetHighScore={null}
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    expect(trackGameStart).toHaveBeenCalledTimes(1);
    expect(trackGameStart).toHaveBeenCalledWith(
      'singleplayer',
      expect.objectContaining({ subMode: 'practice', language: 'en' })
    );
  });
});
