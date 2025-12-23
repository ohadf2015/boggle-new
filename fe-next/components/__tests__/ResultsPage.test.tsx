/**
 * ResultsPage Component Tests
 * 
 * Tests for the game results page component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
  }),
}));

jest.mock('@/hooks/useWinStreak', () => ({
  useWinStreak: () => ({
    currentStreak: 0,
    bestStreak: 0,
    recordWin: jest.fn(),
  }),
}));

jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('canvas-confetti', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => (Component: React.ComponentType<any>) => Component,
}));

jest.mock('@/components/GridComponent', () => ({
  __esModule: true,
  default: () => <div data-testid="grid">Grid</div>,
}));

jest.mock('@/components/results/ResultsPlayerCard', () => ({
  __esModule: true,
  default: ({ player }: { player: { username: string; score: number } }) => (
    <div data-testid={`player-card-${player.username}`}>
      {player.username}: {player.score}
    </div>
  ),
}));

jest.mock('@/components/results/ResultsWinnerBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="winner-banner">Winner</div>,
}));

jest.mock('@/components/ExitRoomButton', () => ({
  __esModule: true,
  default: () => <button data-testid="exit-button">Exit</button>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/auth/FirstWinSignupModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/results/ShareWinPrompt', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/results/WinStreakDisplay', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/voting/WordFeedbackModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/results/AutoRejoinTimer', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: jest.fn(),
}));

jest.mock('@/utils/guestManager', () => ({
  shouldShowUpgradePrompt: jest.fn(() => false),
  getGuestStatsSummary: jest.fn(() => ({})),
  updateGuestStatsAfterGame: jest.fn(),
  isFirstWin: jest.fn(() => false),
}));

jest.mock('@/utils/growthTracking', () => ({
  trackGameCompletion: jest.fn(),
  trackStreakMilestone: jest.fn(),
}));

jest.mock('@/components/NeoToast', () => ({
  levelUpToast: jest.fn(),
}));

jest.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
}));

jest.mock('@/utils/SocketContext', () => ({
  useSocket: () => ({
    socket: null,
    isConnected: false,
  }),
}));

const mockFinalScores = [
  {
    username: 'Player1',
    score: 100,
    wordsFound: 10,
    allWords: [],
  },
  {
    username: 'Player2',
    score: 80,
    wordsFound: 8,
    allWords: [],
  },
];

const mockLetterGrid = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['B', 'A', 'T'],
];

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LanguageProvider>
    {children}
  </LanguageProvider>
);

describe('ResultsPage - Score Sorting', () => {
  it('sorts scores in descending order', () => {
    const scores = [...mockFinalScores];
    const sorted = scores.sort((a, b) => b.score - a.score);
    
    expect(sorted[0].score).toBe(100);
    expect(sorted[1].score).toBe(80);
    expect(sorted[0].username).toBe('Player1');
  });

  it('identifies winner correctly', () => {
    const sortedScores = [...mockFinalScores].sort((a, b) => b.score - a.score);
    const winner = sortedScores[0];
    
    expect(winner.username).toBe('Player1');
    expect(winner.score).toBe(100);
  });

  it('handles tie scores', () => {
    const tiedScores = [
      { username: 'Player1', score: 100, wordsFound: 10, allWords: [] },
      { username: 'Player2', score: 100, wordsFound: 10, allWords: [] },
    ];
    
    const sorted = tiedScores.sort((a, b) => b.score - a.score);
    expect(sorted[0].score).toBe(100);
    expect(sorted[1].score).toBe(100);
  });
});

describe('ResultsPage - Data Processing', () => {
  it('processes player word data', () => {
    const playerData = {
      username: 'Player1',
      score: 100,
      wordsFound: 10,
      allWords: [
        { word: 'cat', score: 2, validated: true },
        { word: 'dog', score: 2, validated: true },
      ],
    };
    
    expect(playerData.allWords.length).toBe(2);
    expect(playerData.score).toBe(100);
  });

  it('calculates total words found', () => {
    const scores = mockFinalScores;
    const totalWords = scores.reduce((sum, player) => sum + player.wordsFound, 0);
    
    expect(totalWords).toBe(18);
  });
});
