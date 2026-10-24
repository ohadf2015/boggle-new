import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('@/components/practice/PracticeCoachTip', () => ({
  __esModule: true,
  default: () => <div data-testid="practice-coach-tip" />,
}));

vi.mock('../game', () => ({
  SinglePlayerShell: ({ soloChrome, soloMissions }: { soloChrome?: React.ReactNode; soloMissions?: unknown }) => (
    <div data-testid="layout-portrait">
      {soloChrome}
      <span data-testid="missions">{soloMissions ? 'on' : 'off'}</span>
    </div>
  ),
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
    letterCount: 0,
    currentFeedback: null,
    keyboardInput: null,
    availableWords: null,
    soloMissions: [{ id: 'm1' }],
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
vi.mock('@/hooks/useIdleDetection', () => ({
  useIdleDetection: () => ({ reportActivity: vi.fn() }),
}));
vi.mock('@/utils/growthTracking', () => ({
  trackDeadTime: vi.fn(),
  trackGameStart: vi.fn(),
  trackGrowthEvent: vi.fn(),
  markFirstGameActivation: vi.fn(),
}));
vi.mock('@/utils/posthogEngagement', () => ({
  createFirstMinuteSurvivalTimer: () => ({ start: vi.fn(), cancel: vi.fn() }),
  detectPlatform: () => 'web',
}));
vi.mock('../PracticeContinuePrompt', () => ({ __esModule: true, default: () => null }));
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn() }));
vi.mock('@/lib/achievements/hiddenAchievementBus', () => ({
  evaluateSelectionAchievements: vi.fn(),
}));

import SinglePlayerGame from '../SinglePlayerGame';
import type { SinglePlayerGameState } from '../SinglePlayerView';
import { lessonStorageKey } from '@/lib/tutorial/lesson/lessonStorage';
import { resetSelection, useSelectionStore } from '@/hooks/useSelectionStore';

const settings = {
  mode: 'challenge',
  difficulty: 'MEDIUM',
  language: 'en',
  grid: [['A', 'B'], ['C', 'D']],
  timerSeconds: 60,
  bots: [],
  minWordLength: 3,
} as unknown as SinglePlayerGameState;

const renderGame = (props: { hideModeCoach?: boolean; mode?: string; shortCoach?: boolean } = {}) =>
  render(
    <SinglePlayerGame
      settings={{ ...settings, mode: props.mode ?? 'challenge', shortCoach: props.shortCoach } as SinglePlayerGameState}
      targetHighScore={null}
      onGameEnd={vi.fn()}
      onQuit={vi.fn()}
      hideModeCoach={props.hideModeCoach}
    />
  );

describe('SinglePlayerGame first-round lesson', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetSelection();
  });

  it('teaches a new player with the lesson in place of the mission chips', () => {
    renderGame();
    expect(screen.getByTestId('lesson-hud')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-target')).toBeInTheDocument();
    expect(screen.getByTestId('missions')).toHaveTextContent('off');
  });

  it('stays out of Quick Play rounds', () => {
    renderGame({ hideModeCoach: true });
    expect(screen.queryByTestId('lesson-hud')).toBeNull();
    expect(screen.getByTestId('missions')).toHaveTextContent('on');
  });

  it('stays out of practice', () => {
    renderGame({ mode: 'practice' });
    expect(screen.queryByTestId('lesson-hud')).toBeNull();
  });

  it('search landers get one inline hint instead of the lesson', () => {
    renderGame({ shortCoach: true });
    expect(screen.queryByTestId('lesson-hud')).toBeNull();
    expect(screen.getByTestId('search-inline-hint')).toBeInTheDocument();
  });

  it('does not return once the player finished or skipped it', () => {
    window.localStorage.setItem(lessonStorageKey('classic'), 'skipped');
    renderGame();
    expect(screen.queryByTestId('lesson-hud')).toBeNull();
    expect(screen.getByTestId('missions')).toHaveTextContent('on');
  });

  it('fills the lesson slots from the letters the player is tracing', () => {
    renderGame();
    const filled = () => Array.from(document.querySelectorAll('[data-slot-state]'))
      .filter((el) => el.getAttribute('data-slot-state') !== 'ghost' && el.getAttribute('data-slot-state') !== 'empty');
    expect(filled()).toHaveLength(0);
    act(() => useSelectionStore.getState().setSelection('AB', 2));
    expect(filled().length).toBeGreaterThan(0);
  });
});
