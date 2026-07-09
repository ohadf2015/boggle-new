/**
 * Classic coach gate: hideModeCoach must fully suppress ModeCoach without
 * requiring settings.mode === 'practice' (which changes other SP behavior).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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
  PortraitGameLayout: () => <div data-testid="layout-portrait" />,
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

import SinglePlayerGame from '../SinglePlayerGame';
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

describe('SinglePlayerGame hideModeCoach', () => {
  it('mounts ModeCoach in challenge mode by default', () => {
    render(
      <SinglePlayerGame
        settings={settings}
        targetHighScore={null}
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    expect(screen.getByTestId('mode-coach')).toHaveAttribute('data-mode', 'classic');
  });

  it('does not mount ModeCoach when hideModeCoach is true (quick play)', () => {
    render(
      <SinglePlayerGame
        settings={settings}
        targetHighScore={null}
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
        hideModeCoach
      />
    );
    expect(screen.queryByTestId('mode-coach')).toBeNull();
  });
});
