import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DailyChallengeGame from '../DailyChallengeGame';
import type { LetterGrid } from '@/types';

// Controllable mock state
let mockRemainingTime = 60;
let mockComboLevel = 0;

// --- Core animation / motion mocks ---
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, whileHover, whileTap, transition, variants, ...domProps } = props as Record<string, unknown>;
      return <div {...domProps}>{children}</div>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, whileHover, whileTap, transition, variants, ...domProps } = props as Record<string, unknown>;
      return <span {...domProps}>{children}</span>;
    },
    circle: ({ ...props }: Record<string, unknown>) => {
      const { initial, animate, exit, whileHover, whileTap, transition, variants, ...domProps } = props as Record<string, unknown>;
      return <circle {...domProps} />;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// --- Mascot mock: render testid so we can assert presence ---
jest.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
  MascotWithEntrance: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
}));

// --- Timer hook (controllable) ---
jest.mock('@/hooks/useGameTimer', () => ({
  useGameTimer: () => ({
    remainingTime: mockRemainingTime,
    remainingTimeRef: { current: mockRemainingTime },
    isRunning: true,
    start: jest.fn(),
    pause: jest.fn(),
  }),
}));

// --- Combo hook (controllable) ---
jest.mock('@/hooks/useComboSystem', () => ({
  useComboSystem: () => ({
    comboLevel: mockComboLevel,
    comboTimeRemaining: 0,
    isDangerState: false,
    maxCombo: mockComboLevel,
    incrementCombo: jest.fn(),
    resetCombo: jest.fn(),
  }),
}));

// --- Context mocks ---
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: jest.fn(),
  }),
  useLanguageSafe: () => ({ t: (key: string) => key, language: 'en' }),
}));

jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: jest.fn(),
    playComboSound: jest.fn(),
    setGameActive: jest.fn(),
  }),
}));

jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    stopMusic: jest.fn(),
  }),
}));

jest.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    awardComboMilestone: jest.fn().mockResolvedValue(0),
  }),
}));

// --- Hook mocks ---
jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

jest.mock('@/hooks/useGameMusic', () => ({
  useGameMusic: jest.fn(),
}));

jest.mock('@/hooks/useCrazyGamesLifecycle', () => ({
  useCrazyGamesLifecycle: jest.fn(),
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

jest.mock('@/hooks/useNavigationGuard', () => ({
  useNavigationGuard: jest.fn(),
}));

jest.mock('@/hooks/useDirectionPatternGuidance', () => ({
  useDirectionPatternGuidance: () => ({
    showDirectionGuidance: false,
    trackWordPath: jest.fn(),
    dismissDirectionGuidance: jest.fn(),
  }),
}));

jest.mock('@/hooks/useContextualGuidance', () => ({
  useContextualGuidance: () => ({
    showSwipeTip: false,
    dismissSwipeTip: jest.fn(),
    triggerSwipeTipGuidance: jest.fn(),
  }),
  useSwipeTipGuidanceTrigger: jest.fn(),
}));

jest.mock('@/hooks/useFirstPlayTutorial', () => ({
  useFirstPlayTutorial: () => ({
    tutorialPath: null,
    tutorialWord: null,
    trackUserPath: jest.fn(),
  }),
}));

jest.mock('@/hooks/useKeyboardWordInput', () => ({
  useKeyboardWordInput: () => ({
    highlightedCells: [],
    currentWord: '',
  }),
}));

jest.mock('@/hooks/useWordSubmission', () => ({
  useWordSubmission: () => ({
    submitWord: jest.fn(),
    foundWords: [],
    validWordCount: 0,
    currentFeedback: null,
  }),
}));

// --- Heavy component mocks ---
jest.mock('@/components/GridComponent', () => ({
  __esModule: true,
  default: () => <div role="grid" data-testid="grid-component" />,
}));

jest.mock('@/components/CircularTimer', () => ({
  __esModule: true,
  default: () => <div data-testid="circular-timer" />,
}));

jest.mock('@/components/game/WordFormingArea', () => ({
  __esModule: true,
  default: () => <div data-testid="word-forming-area" />,
}));

jest.mock('@/components/game/ComboDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="combo-display" />,
}));

jest.mock('@/components/achievements/AchievementProgressTracker', () => ({
  AchievementProgressTracker: () => null,
}));

jest.mock('@/components/tutorial/TutorialCallout', () => ({
  TutorialCallout: () => null,
}));

jest.mock('@/components/game/DirectionGuidanceTooltip', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/game/SwipeTipTooltip', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/game/KeyboardHintTooltip', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props as React.ButtonHTMLAttributes<HTMLButtonElement>}>{children}</button>
  ),
}));

jest.mock('@/components/game/FloatingCoinAnimation', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: () => null,
}));

// --- Mock fetch ---
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: false }),
} as unknown as Response);

// --- Test grid ---
const mockGrid: LetterGrid = [
  ['C', 'A', 'T'],
  ['O', 'R', 'E'],
  ['D', 'O', 'G'],
];

const minimalProps = {
  grid: mockGrid,
  puzzleNumber: 1,
  language: 'en' as const,
  duration: 180,
  onComplete: jest.fn(),
  onQuit: jest.fn(),
};

describe('DailyChallengeGame - mascots', () => {
  beforeEach(() => {
    mockRemainingTime = 60;
    mockComboLevel = 0;
    jest.clearAllMocks();
  });

  it('does not show panic mascot when time is above threshold', () => {
    render(<DailyChallengeGame {...minimalProps} />);
    expect(screen.queryByTestId('mascot-panic')).not.toBeInTheDocument();
  });

  it('shows panic mascot when timer is at or below 30 seconds', () => {
    mockRemainingTime = 20;
    render(<DailyChallengeGame {...minimalProps} />);
    expect(screen.getByTestId('mascot-panic')).toBeInTheDocument();
  });

  it('shows onfire mascot when combo >= 3 and timer is safe', () => {
    mockComboLevel = 3;
    render(<DailyChallengeGame {...minimalProps} />);
    expect(screen.getByTestId('mascot-onfire')).toBeInTheDocument();
  });

  it('does not show onfire when combo is below threshold', () => {
    mockComboLevel = 2;
    render(<DailyChallengeGame {...minimalProps} />);
    expect(screen.queryByTestId('mascot-onfire')).not.toBeInTheDocument();
  });
});
