import React from 'react';
import { render, screen, act } from '@testing-library/react';

// Mock ScorePopupFly to render a visible element when popup is not null
vi.mock('@/components/animations/ScorePopupFly', () => ({
  ScorePopupFly: ({ popup }: { popup: { value: number; word?: string } | null }) =>
    popup ? <div data-testid="score-popup">{popup.value}</div> : null,
}));

// Mock all heavy dependencies of DailyChallengeGame
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
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

vi.mock('@/hooks/useGameMusic', () => ({
  useGameMusic: vi.fn(),
}));

vi.mock('@/hooks/useComboSystem', () => ({
  useComboSystem: () => ({
    comboLevel: 0,
    comboTimeRemaining: 0,
    isDangerState: false,
    maxCombo: 0,
    incrementCombo: vi.fn(),
    resetCombo: vi.fn(),
  }),
}));

vi.mock('@/hooks/useGameTimer', () => ({
  useGameTimer: () => ({
    remainingTime: 60,
    remainingTimeRef: { current: 60 },
  }),
}));

const mockSubmitWord = vi.fn();
let capturedOnWordAccepted: ((word: string, wordScore: number) => void) | null = null;

vi.mock('@/hooks/useWordSubmission', () => ({
  useWordSubmission: (opts: { onWordAccepted?: (word: string, wordScore: number) => void }) => {
    capturedOnWordAccepted = opts.onWordAccepted ?? null;
    return {
      submitWord: mockSubmitWord,
      foundWords: [],
      validWordCount: 0,
      currentFeedback: null,
    };
  },
}));

vi.mock('@/hooks/useCrazyGamesLifecycle', () => ({
  useCrazyGamesLifecycle: vi.fn(),
}));

vi.mock('@/hooks/useDirectionPatternGuidance', () => ({
  useDirectionPatternGuidance: () => ({
    showDirectionGuidance: false,
    dismissDirectionGuidance: vi.fn(),
    trackWordPath: vi.fn(),
  }),
}));

vi.mock('@/hooks/useFirstPlayTutorial', () => ({
  useFirstPlayTutorial: () => ({
    tutorialPath: null,
    tutorialWord: null,
    trackUserPath: vi.fn(),
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

vi.mock('@/hooks/useNavigationGuard', () => ({
  useNavigationGuard: vi.fn(),
}));

vi.mock('@/hooks/useKeyboardWordInput', () => ({
  useKeyboardWordInput: () => ({
    highlightedCells: [],
  }),
}));

vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

vi.mock('@/components/GridComponent', () => ({
  __esModule: true,
  default: () => <div data-testid="grid-component" />,
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

vi.mock('@/components/tutorial/TutorialCallout', () => ({
  TutorialCallout: () => null,
}));

vi.mock('@/components/achievements/AchievementProgressTracker', () => ({
  AchievementProgressTracker: () => null,
}));

vi.mock('@/components/ui/Mascot', () => ({
  Mascot: () => null,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

vi.mock('@/utils/mascotConfig', () => ({
  PANIC_TIMER_THRESHOLD: 30,
  ONFIRE_COMBO_THRESHOLD: 5,
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, role, 'aria-label': ariaLabel, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div className={className} style={style} role={role} aria-label={ariaLabel}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock fetch for grid solver
global.fetch = vi.fn().mockResolvedValue({
  ok: false,
});

import DailyChallengeGame from '../DailyChallengeGame';

const mockGrid = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

const defaultProps = {
  grid: mockGrid,
  puzzleNumber: 1,
  language: 'en' as const,
  duration: 120,
  onComplete: vi.fn(),
  onQuit: vi.fn(),
};

describe('DailyChallengeGame score popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnWordAccepted = null;
  });

  it('renders without crashing and includes ScorePopupFly (null popup initially)', () => {
    render(<DailyChallengeGame {...defaultProps} />);
    // ScorePopupFly renders null when popup is null, so the testid won't be in DOM
    // This smoke test verifies the component renders successfully with ScorePopupFly wired in
    expect(screen.getByTestId('grid-component')).toBeInTheDocument();
    expect(screen.queryByTestId('score-popup')).not.toBeInTheDocument();
  });

  it('shows score popup when a word is accepted via onWordAccepted callback', () => {
    render(<DailyChallengeGame {...defaultProps} />);

    // Initially no popup
    expect(screen.queryByTestId('score-popup')).not.toBeInTheDocument();

    // Simulate word accepted by calling the captured callback inside act()
    // so React processes the state update synchronously
    expect(capturedOnWordAccepted).not.toBeNull();
    act(() => {
      capturedOnWordAccepted!('HELLO', 25);
    });

    // Now popup should be visible
    expect(screen.getByTestId('score-popup')).toBeInTheDocument();
    expect(screen.getByTestId('score-popup')).toHaveTextContent('25');
  });
});
