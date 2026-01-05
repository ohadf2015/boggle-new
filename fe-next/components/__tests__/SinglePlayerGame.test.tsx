/**
 * SinglePlayerGame Component Tests
 *
 * Tests for word submission, scoring, and game flow
 */

jest.mock('@/utils/consts', () => ({
  DIFFICULTIES: {
    easy: { rows: 4, cols: 4 },
    medium: { rows: 5, cols: 5 },
    hard: { rows: 6, cols: 6 },
  },
}));

jest.mock('@/utils/utils', () => ({
  generateRandomTable: jest.fn(() => [
    ['C', 'A', 'T'],
    ['D', 'O', 'G'],
    ['B', 'A', 'T'],
  ]),
  applyHebrewFinalLetters: jest.fn((grid) => grid),
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';

jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    stopMusic: jest.fn(),
  }),
}));

jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: jest.fn(),
    playComboSound: jest.fn(),
    playEarthquakeRumble: jest.fn(),
    playEarthquakeShake: jest.fn(),
    playFireRoundStart: jest.fn(),
    startFireCrackleLoop: jest.fn(),
    stopFireCrackleLoop: jest.fn(),
  }),
}));

jest.mock('@/components/GameAnnouncer', () => ({
  useAnnouncer: () => ({
    announceWordResult: jest.fn(),
    announceCombo: jest.fn(),
    announceTimer: jest.fn(),
  }),
}));

jest.mock('@/hooks/useGameMusic', () => ({
  useGameMusic: () => ({
    playGameMusic: jest.fn(),
    stopGameMusic: jest.fn(),
  }),
}));

jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

jest.mock('@/hooks/useEarthquakeFireRound', () => ({
  useEarthquakeFireRound: () => ({
    earthquakeState: 'idle',
    fireRoundActive: false,
    fireRoundRemaining: 0,
    getScoreMultiplier: () => 1,
  }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span {...props}>{children}</span>
    ),
    circle: (props: Record<string, unknown>) => <circle {...props} />,
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    set: jest.fn(),
  }),
}));

jest.mock('@/utils/accessibility', () => ({
  useReducedMotion: () => false,
}));

jest.mock('@/contexts/AccessibilityContext', () => ({
  useAccessibility: () => ({
    isScreenReaderEnabled: false,
    announceToScreenReader: jest.fn(),
    highContrast: false,
    largeText: false,
  }),
  useDisableFireRoundLights: () => false,
  useDisableEarthquakeEffects: () => false,
}));

jest.mock('@/hooks/useAutoScrollOnGameStart', () => ({
  useAutoScrollOnGameStart: jest.fn(),
}));

jest.mock('@/hooks/useComboSystem', () => ({
  useComboSystem: () => ({
    comboLevel: 0,
    comboMultiplier: 1,
    maxCombo: 0,
    addWord: jest.fn(),
    reset: jest.fn(),
    getComboBonus: () => 0,
  }),
}));

jest.mock('@/hooks/useGameTimer', () => ({
  useGameTimer: () => ({
    remainingTime: 180,
    formattedTime: '3:00',
    isRunning: true,
    pause: jest.fn(),
    resume: jest.fn(),
    reset: jest.fn(),
  }),
}));

// Mock GridComponent to avoid complex nested mocking
jest.mock('@/components/GridComponent', () => ({
  __esModule: true,
  default: ({ grid }: { grid: string[][] }) => (
    <div role="grid" data-testid="grid-component">
      {grid?.map((row, i) => row?.map((letter, j) => (
        <span key={`${i}-${j}`}>{letter}</span>
      )))}
    </div>
  ),
}));

// Mock other components used by SinglePlayerGame
jest.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('@/components/earthquake', () => ({
  EarthquakeWarning: () => null,
  FireRoundIndicator: () => null,
}));

jest.mock('@/components/game/WordFormingArea', () => ({
  __esModule: true,
  default: () => <div data-testid="word-forming-area" />,
}));

jest.mock('@/components/game/ComboDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="combo-display" />,
}));

jest.mock('@/components/CircularTimer', () => ({
  __esModule: true,
  default: ({ remainingTime }: { remainingTime: number }) => (
    <div data-testid="circular-timer">{Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')}</div>
  ),
}));

jest.mock('@/components/achievements/AchievementProgressTracker', () => ({
  AchievementProgressTracker: () => null,
}));

jest.mock('@/hooks/useDirectionPatternGuidance', () => ({
  useDirectionPatternGuidance: () => ({
    guidance: null,
    clearGuidance: jest.fn(),
    evaluatePath: jest.fn(),
  }),
}));

jest.mock('@/components/game/DirectionGuidanceTooltip', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/utils/wordPathFinder', () => ({
  selectRandomRevealWord: jest.fn(),
  getRevealableWordCount: jest.fn(() => 0),
}));

jest.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

jest.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: jest.fn(() => ({ isValid: true })),
  isWordOnBoard: jest.fn(() => true),
}));

jest.mock('@/components/NeoToast', () => ({
  wordErrorToast: jest.fn(),
}));

jest.mock('@/utils/coinManager', () => ({
  awardComboCoins: jest.fn(),
}));

jest.mock('@/utils/haptics', () => ({
  hapticForWordScore: jest.fn(),
  hapticError: jest.fn(),
}));

jest.mock('@/utils/singlePlayerAchievements', () => ({
  calculateFinalAchievements: jest.fn(() => []),
}));

jest.mock('@/utils/wordValidationAPI', () => ({
  finalizeWordValidation: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('lucide-react', () => ({
  ArrowLeft: () => <span>ArrowLeft</span>,
  Pause: () => <span>Pause</span>,
  Play: () => <span>Play</span>,
  Crown: () => <span>Crown</span>,
  TrendingUp: () => <span>TrendingUp</span>,
  Target: () => <span>Target</span>,
  Zap: () => <span>Zap</span>,
  Eye: () => <span>Eye</span>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}));

(global as { fetch: unknown }).fetch = jest.fn();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LanguageProvider>
    {children}
  </LanguageProvider>
);

describe('SinglePlayerGame - Word Submission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ((global as { fetch: unknown }).fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ isValid: true }),
    });
  });

  // TODO: This test requires extensive mocking of nested components - needs refactoring
  it.skip('renders the game grid correctly', async () => {
    const mockSettings = {
      timerSeconds: 180,
      language: 'en' as const,
      difficulty: 'medium' as const,
      gridSize: 4,
      bots: [],
      mode: 'solo-bots' as const,
    };

    const mockOnGameEnd = jest.fn();
    const mockOnQuit = jest.fn();

    const SinglePlayerGame = require('../singleplayer/SinglePlayerGame').default;

    render(
      <SinglePlayerGame
        settings={mockSettings}
        targetHighScore={null}
        onGameEnd={mockOnGameEnd}
        onQuit={mockOnQuit}
      />,
      { wrapper: TestWrapper }
    );

    // Wait for the grid to load (async initialization)
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    // Verify the timer is shown
    expect(screen.getByText('3:00')).toBeInTheDocument();
  });
});
