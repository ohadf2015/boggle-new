/**
 * SinglePlayerGame Component Tests
 *
 * Tests for word submission, scoring, and game flow
 */

// Mock crypto.randomUUID for Node.js 18 environment
Object.defineProperty(globalThis, 'crypto', {
  value: {
    ...globalThis.crypto,
    randomUUID: () => 'test-uuid-1234-5678-9012',
  },
});

vi.mock('@/utils/consts', () => ({
  DIFFICULTIES: {
    easy: { rows: 4, cols: 4 },
    medium: { rows: 5, cols: 5 },
    hard: { rows: 6, cols: 6 },
  },
}));

vi.mock('@/utils/utils', () => ({
  generateRandomTable: vi.fn(() => [
    ['C', 'A', 'T'],
    ['D', 'O', 'G'],
    ['B', 'A', 'T'],
  ]),
  applyHebrewFinalLetters: vi.fn((grid) => grid),
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    stopMusic: vi.fn(),
  }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playComboSound: vi.fn(),
    playEarthquakeRumble: vi.fn(),
    playEarthquakeShake: vi.fn(),
    playFireRoundStart: vi.fn(),
    startFireCrackleLoop: vi.fn(),
    stopFireCrackleLoop: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));

vi.mock('@/components/GameAnnouncer', () => ({
  useAnnouncer: () => ({
    announceWordResult: vi.fn(),
    announceCombo: vi.fn(),
    announceTimer: vi.fn(),
  }),
}));

vi.mock('@/hooks/useGameMusic', () => ({
  useGameMusic: () => ({
    playGameMusic: vi.fn(),
    stopGameMusic: vi.fn(),
  }),
}));

vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

vi.mock('@/hooks/useEarthquakeFireRound', () => ({
  useEarthquakeFireRound: () => ({
    earthquakeState: 'idle',
    fireRoundActive: false,
    fireRoundRemaining: 0,
    getScoreMultiplier: () => 1,
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span {...props}>{children}</span>
    ),
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <p {...props}>{children}</p>
    ),
    circle: (props: Record<string, unknown>) => <circle {...props} />,
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
}));

vi.mock('@/utils/accessibility', () => ({
  useReducedMotion: () => false,
}));

vi.mock('@/contexts/AccessibilityContext', () => ({
  useAccessibility: () => ({
    isScreenReaderEnabled: false,
    announceToScreenReader: vi.fn(),
    highContrast: false,
    largeText: false,
  }),
  useDisableFireRoundLights: () => false,
  useShouldReduceMotion: () => false,
  useDisableEarthquakeEffects: () => false,
  useLargeLetters: () => false,
}));

vi.mock('@/hooks/useAutoScrollOnGameStart', () => ({
  useAutoScrollOnGameStart: vi.fn(),
}));

// Mock useAchievementQueue to avoid needing AchievementQueueProvider
vi.mock('@/components/achievements', () => ({
  useAchievementQueue: () => ({
    queueAchievement: vi.fn(),
  }),
}));

vi.mock('@/hooks/useComboSystem', () => ({
  useComboSystem: () => ({
    comboLevel: 0,
    comboMultiplier: 1,
    maxCombo: 0,
    addWord: vi.fn(),
    reset: vi.fn(),
    getComboBonus: () => 0,
  }),
}));

vi.mock('@/hooks/useGameTimer', () => ({
  useGameTimer: () => ({
    remainingTime: 180,
    formattedTime: '3:00',
    isRunning: true,
    pause: vi.fn(),
    resume: vi.fn(),
    reset: vi.fn(),
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LanguageProvider>
    {children}
  </LanguageProvider>
);

vi.mock('@/components/animations/ScorePopupFly', () => ({
  ScorePopupFly: () => null,
  __esModule: true,
  default: () => null,
}));

describe('SinglePlayerGame - Word Submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      json: async () => ({ isValid: true }),
    });
  });

  it('renders the game grid correctly', async () => {
    const mockSettings = {
      timerSeconds: 180,
      language: 'en' as const,
      difficulty: 'medium' as const,
      gridSize: 4,
      bots: [],
      mode: 'solo-bots' as const,
    };

    const mockOnGameEnd = vi.fn();
    const mockOnQuit = vi.fn();

    const { default: SinglePlayerGame } = await import('../singleplayer/SinglePlayerGame');

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

    // Verify the timer is shown (multiple instances for responsive layout)
    expect(screen.getAllByText('3:00').length).toBeGreaterThan(0);
  });
});
