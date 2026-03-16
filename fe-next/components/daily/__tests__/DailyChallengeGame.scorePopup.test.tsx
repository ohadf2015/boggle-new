import React from 'react';
import { render, screen, act } from '@testing-library/react';

// Mock ScorePopupFly to render a visible element when popup is not null
jest.mock('@/components/animations/ScorePopupFly', () => ({
  ScorePopupFly: ({ popup }: { popup: { value: number; word?: string } | null }) =>
    popup ? <div data-testid="score-popup">{popup.value}</div> : null,
}));

// Mock all heavy dependencies of DailyChallengeGame
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
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

jest.mock('@/hooks/useGameMusic', () => ({
  useGameMusic: jest.fn(),
}));

jest.mock('@/hooks/useComboSystem', () => ({
  useComboSystem: () => ({
    comboLevel: 0,
    comboTimeRemaining: 0,
    isDangerState: false,
    maxCombo: 0,
    incrementCombo: jest.fn(),
    resetCombo: jest.fn(),
  }),
}));

jest.mock('@/hooks/useGameTimer', () => ({
  useGameTimer: () => ({
    remainingTime: 60,
    remainingTimeRef: { current: 60 },
  }),
}));

const mockSubmitWord = jest.fn();
let capturedOnWordAccepted: ((word: string, wordScore: number) => void) | null = null;

jest.mock('@/hooks/useWordSubmission', () => ({
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

jest.mock('@/hooks/useCrazyGamesLifecycle', () => ({
  useCrazyGamesLifecycle: jest.fn(),
}));

jest.mock('@/hooks/useDirectionPatternGuidance', () => ({
  useDirectionPatternGuidance: () => ({
    showDirectionGuidance: false,
    dismissDirectionGuidance: jest.fn(),
    trackWordPath: jest.fn(),
  }),
}));

jest.mock('@/hooks/useFirstPlayTutorial', () => ({
  useFirstPlayTutorial: () => ({
    tutorialPath: null,
    tutorialWord: null,
    trackUserPath: jest.fn(),
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

jest.mock('@/hooks/useNavigationGuard', () => ({
  useNavigationGuard: jest.fn(),
}));

jest.mock('@/hooks/useKeyboardWordInput', () => ({
  useKeyboardWordInput: () => ({
    highlightedCells: [],
  }),
}));

jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

jest.mock('@/components/GridComponent', () => ({
  __esModule: true,
  default: () => <div data-testid="grid-component" />,
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

jest.mock('@/components/tutorial/TutorialCallout', () => ({
  TutorialCallout: () => null,
}));

jest.mock('@/components/achievements/AchievementProgressTracker', () => ({
  AchievementProgressTracker: () => null,
}));

jest.mock('@/components/ui/Mascot', () => ({
  Mascot: () => null,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

jest.mock('@/utils/mascotConfig', () => ({
  PANIC_TIMER_THRESHOLD: 30,
  ONFIRE_COMBO_THRESHOLD: 5,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, role, 'aria-label': ariaLabel, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div className={className} style={style} role={role} aria-label={ariaLabel}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock fetch for grid solver
global.fetch = jest.fn().mockResolvedValue({
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
  onComplete: jest.fn(),
  onQuit: jest.fn(),
};

describe('DailyChallengeGame score popup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
