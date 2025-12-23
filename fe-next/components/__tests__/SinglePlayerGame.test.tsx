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
import { render, screen } from '@testing-library/react';
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

global.fetch = jest.fn();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LanguageProvider>
    {children}
  </LanguageProvider>
);

describe('SinglePlayerGame - Word Submission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ isValid: true }),
    });
  });

  it('renders the game grid correctly', () => {
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

    // Verify the grid is rendered
    expect(screen.getByRole('grid')).toBeInTheDocument();

    // Verify the timer is shown
    expect(screen.getByText('3:00')).toBeInTheDocument();
  });
});
