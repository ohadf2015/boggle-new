/**
 * Funnel parity: exactly ONE `game_started` per SP game. The emitter lives in
 * useSinglePlayerEffects (inside useSinglePlayerCore) because Quick Play mounts that
 * core without SinglePlayerGame. This file pins that SinglePlayerGame adds no second
 * emitter — it did until 2026-09-16, and this test's own mock of useSinglePlayerCore
 * is what hid the duplicate.
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
  SinglePlayerShell: () => <div data-testid="layout-portrait" />,
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
  it('delegates game_started to useSinglePlayerCore and never emits its own', () => {
    render(
      <SinglePlayerGame
        settings={settings}
        targetHighScore={null}
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    // The real emitter lives in useSinglePlayerEffects (inside useSinglePlayerCore,
    // mocked out here), so this component must add NOTHING of its own. It used to
    // emit a second game_started, which double-counted every SP game in prod.
    expect(trackGameStart).not.toHaveBeenCalled();
  });
});
