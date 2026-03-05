/**
 * Tests for WordHuntGame orchestrator
 * Main component that integrates bridge hook + layout for MP WordHunt
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';

// Mock the bridge hook
const mockBridgeReturn = {
  lifePoints: 75,
  targetFound: false,
  targetLength: 5,
  playerLives: { alice: 80, bob: 50 },
  eliminatedPlayers: [] as string[],
  attempts: [],
  accumulatedClues: new Map(),
  knownLetters: new Set<string>(),
  currentHint: { hint: '_ _ _ _ _', level: 0, unlockCost: 0 },
  showFeedbackOverlay: false,
  latestAttemptFeedback: null,
  isGameOver: false,
};

jest.mock('../hooks/useWordHuntMultiplayerBridge', () => ({
  useWordHuntMultiplayerBridge: () => mockBridgeReturn,
}));

// Capture layout props
const capturedLayoutProps: { value: Record<string, unknown> | null } = { value: null };

jest.mock('../WordHuntGameLayout', () => ({
  WordHuntGameLayout: (props: Record<string, unknown>) => {
    capturedLayoutProps.value = props;
    return <div data-testid="wordhunt-game-layout" />;
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

jest.mock('@/hooks/useKeyboardWordInput', () => ({
  useKeyboardWordInput: () => ({
    typedWord: '',
    isValidOnGrid: false,
    highlightedCells: [],
    clearTypedWord: jest.fn(),
    submitTypedWord: jest.fn(),
    isTypingMode: false,
  }),
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ skipAnimations: false }),
}));

import { WordHuntGame } from '../WordHuntGame';

describe('WordHuntGame', () => {
  const defaultGrid = [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ];

  const defaultProps = {
    grid: defaultGrid,
    gameLanguage: 'en' as const,
    remainingTime: 120,
    totalTime: 180,
    leaderboard: [
      { username: 'alice', score: 300, wordCount: 10 },
      { username: 'bob', score: 200, wordCount: 8 },
    ],
    username: 'alice',
    score: 300,
    onQuit: jest.fn(),
    onWordSubmit: jest.fn(),
    onWordHuntGuess: jest.fn(),
    gameActive: true,
    minWordLength: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedLayoutProps.value = null;
    mockBridgeReturn.targetLength = 5;
    mockBridgeReturn.targetFound = false;
    mockBridgeReturn.isGameOver = false;
    mockBridgeReturn.lifePoints = 75;
    mockBridgeReturn.eliminatedPlayers = [];
  });

  it('should render WordHuntGameLayout', () => {
    render(<WordHuntGame {...defaultProps} />);
    expect(screen.getByTestId('wordhunt-game-layout')).toBeInTheDocument();
  });

  it('should pass bridge state to layout', () => {
    render(<WordHuntGame {...defaultProps} />);
    expect(capturedLayoutProps.value).toBeTruthy();
    expect(capturedLayoutProps.value!.lifePoints).toBe(75);
    expect(capturedLayoutProps.value!.isGameOver).toBe(false);
    expect(capturedLayoutProps.value!.showFeedbackOverlay).toBe(false);
  });

  it('should pass score and timer to layout', () => {
    render(<WordHuntGame {...defaultProps} score={999} remainingTime={60} />);
    expect(capturedLayoutProps.value!.score).toBe(999);
    expect(capturedLayoutProps.value!.remainingTime).toBe(60);
  });

  it('should pass leaderboard and username to layout', () => {
    render(<WordHuntGame {...defaultProps} />);
    expect(capturedLayoutProps.value!.currentUsername).toBe('alice');
    expect(capturedLayoutProps.value!.leaderboard).toEqual(defaultProps.leaderboard);
  });

  describe('dual word submission', () => {
    it('should call onWordSubmit for all swiped words', () => {
      render(<WordHuntGame {...defaultProps} />);
      const layoutOnWordSubmit = capturedLayoutProps.value!.onWordSubmit as (word: string) => void;

      act(() => {
        layoutOnWordSubmit('CAT');
      });

      expect(defaultProps.onWordSubmit).toHaveBeenCalledWith('CAT');
    });

    it('should also call onWordHuntGuess when word length matches target and target not found', () => {
      mockBridgeReturn.targetLength = 5;
      mockBridgeReturn.targetFound = false;

      render(<WordHuntGame {...defaultProps} />);
      const layoutOnWordSubmit = capturedLayoutProps.value!.onWordSubmit as (word: string) => void;

      act(() => {
        layoutOnWordSubmit('HELLO');
      });

      expect(defaultProps.onWordSubmit).toHaveBeenCalledWith('HELLO');
      expect(defaultProps.onWordHuntGuess).toHaveBeenCalledWith('HELLO');
    });

    it('should NOT call onWordHuntGuess when word length does not match target', () => {
      mockBridgeReturn.targetLength = 5;

      render(<WordHuntGame {...defaultProps} />);
      const layoutOnWordSubmit = capturedLayoutProps.value!.onWordSubmit as (word: string) => void;

      act(() => {
        layoutOnWordSubmit('CAT');
      });

      expect(defaultProps.onWordSubmit).toHaveBeenCalledWith('CAT');
      expect(defaultProps.onWordHuntGuess).not.toHaveBeenCalled();
    });

    it('should NOT call onWordHuntGuess when target is already found', () => {
      mockBridgeReturn.targetLength = 5;
      mockBridgeReturn.targetFound = true;

      render(<WordHuntGame {...defaultProps} />);
      const layoutOnWordSubmit = capturedLayoutProps.value!.onWordSubmit as (word: string) => void;

      act(() => {
        layoutOnWordSubmit('HELLO');
      });

      expect(defaultProps.onWordSubmit).toHaveBeenCalledWith('HELLO');
      expect(defaultProps.onWordHuntGuess).not.toHaveBeenCalled();
    });
  });

  describe('word change tracking', () => {
    it('should track formed word via onWordChange callback', () => {
      render(<WordHuntGame {...defaultProps} />);
      const layoutOnWordChange = capturedLayoutProps.value!.onWordChange as (word: string, count: number) => void;

      act(() => {
        layoutOnWordChange('HEL', 3);
      });

      // formedWord should be updated — re-render captures new props
      expect(capturedLayoutProps.value!.formedWord).toBe('HEL');
      expect(capturedLayoutProps.value!.letterCount).toBe(3);
    });
  });
});
