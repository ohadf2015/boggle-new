import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DailyChallengeGame from '../DailyChallengeGame';
import type { LetterGrid } from '@/types';

// Controllable mock state
let mockRemainingTime = 60;
let mockComboLevel = 0;

// --- Core animation / motion mocks ---
vi.mock('framer-motion', () => ({
  m: {
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
vi.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
  MascotWithEntrance: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
}));

// --- Timer hook (controllable) ---
vi.mock('@/hooks/useGameTimer', () => ({
  useGameTimer: () => ({
    remainingTime: mockRemainingTime,
    remainingTimeRef: { current: mockRemainingTime },
    isRunning: true,
    start: vi.fn(),
    pause: vi.fn(),
  }),
}));

// --- Combo hook (controllable) ---
vi.mock('@/hooks/useComboSystem', () => ({
  useComboSystem: () => ({
    comboLevel: mockComboLevel,
    comboTimeRemaining: 0,
    isDangerState: false,
    maxCombo: mockComboLevel,
    incrementCombo: vi.fn(),
    resetCombo: vi.fn(),
  }),
}));

// --- Context mocks ---
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
  useLanguageSafe: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playComboSound: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    stopMusic: vi.fn(),
  }),
}));

vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    awardComboMilestone: vi.fn().mockResolvedValue(0),
  }),
}));

// --- Hook mocks ---
vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

vi.mock('@/hooks/useGameMusic', () => ({
  useGameMusic: vi.fn(),
}));

vi.mock('@/hooks/useCrazyGamesLifecycle', () => ({
  useCrazyGamesLifecycle: vi.fn(),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

vi.mock('@/hooks/useNavigationGuard', () => ({
  useNavigationGuard: vi.fn(),
}));

vi.mock('@/hooks/useDirectionPatternGuidance', () => ({
  useDirectionPatternGuidance: () => ({
    showDirectionGuidance: false,
    trackWordPath: vi.fn(),
    dismissDirectionGuidance: vi.fn(),
  }),
}));

vi.mock('@/hooks/useContextualGuidance', () => ({
  useContextualGuidance: () => ({
    showSwipeTip: false,
    dismissSwipeTip: vi.fn(),
    triggerSwipeTipGuidance: vi.fn(),
  }),
  useSwipeTipGuidanceTrigger: vi.fn(),
}));

vi.mock('@/hooks/useFirstPlayTutorial', () => ({
  useFirstPlayTutorial: () => ({
    tutorialPath: null,
    tutorialWord: null,
    trackUserPath: vi.fn(),
  }),
}));

vi.mock('@/hooks/useKeyboardWordInput', () => ({
  useKeyboardWordInput: () => ({
    highlightedCells: [],
    currentWord: '',
  }),
}));

vi.mock('@/hooks/useWordSubmission', () => ({
  useWordSubmission: () => ({
    submitWord: vi.fn(),
    foundWords: [],
    validWordCount: 0,
    currentFeedback: null,
  }),
}));

// --- Heavy component mocks ---
vi.mock('@/components/GridComponent', () => ({
  __esModule: true,
  default: () => <div role="grid" data-testid="grid-component" />,
}));

vi.mock('@/components/CircularTimer', () => ({
  __esModule: true,
  default: () => <div data-testid="circular-timer" />,
}));

vi.mock('@/components/game/WordFormingArea', () => ({
  __esModule: true,
  default: () => <div data-testid="word-forming-area" />,
}));

vi.mock('@/components/game/ComboDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="combo-display" />,
}));

vi.mock('@/components/achievements/AchievementProgressTracker', () => ({
  AchievementProgressTracker: () => null,
}));

vi.mock('@/components/tutorial/TutorialCallout', () => ({
  TutorialCallout: () => null,
}));

vi.mock('@/components/game/DirectionGuidanceTooltip', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/game/SwipeTipTooltip', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/game/KeyboardHintTooltip', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props as React.ButtonHTMLAttributes<HTMLButtonElement>}>{children}</button>
  ),
}));

vi.mock('@/components/game/FloatingCoinAnimation', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: () => null,
}));

// --- Mock fetch ---
global.fetch = vi.fn().mockResolvedValue({
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
  onComplete: vi.fn(),
  onQuit: vi.fn(),
};

describe('DailyChallengeGame - mascots', () => {
  beforeEach(() => {
    mockRemainingTime = 60;
    mockComboLevel = 0;
    vi.clearAllMocks();
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
