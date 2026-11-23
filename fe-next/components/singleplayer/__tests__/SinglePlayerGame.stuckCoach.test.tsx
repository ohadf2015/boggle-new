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
type CoachArgs = { mode: string; active: boolean; grid?: unknown; deadTime?: { enabled: boolean; thresholdMs: number } };
const { coachArgs, coachVisible } = vi.hoisted(() => ({ coachArgs: [] as CoachArgs[], coachVisible: { value: false } }));
vi.mock('@/hooks/useStuckCoach', () => ({
  useStuckCoach: (args: CoachArgs) => {
    coachArgs.push(args);
    const noop = () => {};
    return {
      mode: 'singlePlayer', stage: coachVisible.value ? 'idle-nudge' : 'none', visible: coachVisible.value, exampleWord: null,
      markActivity: noop, markTap: noop, markDragStart: noop, markSubmit: noop, dismiss: noop,
    };
  },
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k, dir: 'ltr', language: 'en' }),
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
import { resetSelection } from '@/hooks/useSelectionStore';

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

const last = () => coachArgs.at(-1)!;

describe('SinglePlayerGame stuck coach', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetSelection();
    coachArgs.length = 0;
    coachVisible.value = false;
  });

  it('stays off while the first-round lesson is teaching, but dead time still counts', () => {
    renderGame();
    expect(last().active).toBe(false);
    expect(last().deadTime).toEqual(expect.objectContaining({ enabled: true, thresholdMs: 15000 }));
  });

  it('coaches a stuck player on the live board once the lesson is done', () => {
    window.localStorage.setItem(lessonStorageKey('classic'), 'done');
    renderGame();
    expect(last().mode).toBe('singlePlayer');
    expect(last().active).toBe(true);
    expect(last().grid).toEqual(settings.grid);
  });

  it('leaves practice to its tip and Quick Play to its coached board', () => {
    window.localStorage.setItem(lessonStorageKey('classic'), 'done');
    renderGame({ mode: 'practice' });
    expect(last().active).toBe(false);
    coachArgs.length = 0;
    renderGame({ hideModeCoach: true });
    expect(last().active).toBe(false);
  });

  it('renders the shared card when the coach is up', () => {
    coachVisible.value = true;
    renderGame();
    expect(screen.getByTestId('mp-stuck-coach-card')).toBeInTheDocument();
  });
});
