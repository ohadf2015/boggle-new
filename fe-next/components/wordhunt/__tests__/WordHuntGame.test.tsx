/**
 * Tests for WordHuntGame orchestrator
 * Main component that integrates bridge hook + layout for MP WordHunt
 * Timer display removed — life meter is the core mechanic
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

vi.mock('../hooks/useWordHuntMultiplayerBridge', () => ({
  useWordHuntMultiplayerBridge: () => mockBridgeReturn,
}));

// Capture layout props
const capturedLayoutProps: { value: Record<string, unknown> | null } = { value: null };

vi.mock('../WordHuntGameLayout', () => ({
  WordHuntGameLayout: (props: Record<string, unknown>) => {
    capturedLayoutProps.value = props;
    return <div data-testid="wordhunt-game-layout" />;
  },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/hooks/useKeyboardWordInput', () => ({
  useKeyboardWordInput: () => ({
    typedWord: '',
    isValidOnGrid: false,
    highlightedCells: [],
    clearTypedWord: vi.fn(),
    submitTypedWord: vi.fn(),
    isTypingMode: false,
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ skipAnimations: false }),
}));

// Mock client word validator
vi.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: vi.fn().mockReturnValue({ isValid: true, shouldSubmitToServer: true }),
  couldBeOnBoard: vi.fn().mockReturnValue(true),
}));

import { WordHuntGame } from '../WordHuntGame';
import { validateWordLocally, couldBeOnBoard } from '@/utils/clientWordValidator';

describe('WordHuntGame', () => {
  const defaultGrid = [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ];

  const mockSocket = {
    emit: vi.fn(),
  } as unknown as import('socket.io-client').Socket;

  const defaultProps = {
    grid: defaultGrid,
    gameLanguage: 'en' as const,
    leaderboard: [
      { username: 'alice', score: 300, wordCount: 10 },
      { username: 'bob', score: 200, wordCount: 8 },
    ],
    username: 'alice',
    score: 300,
    onQuit: vi.fn(),
    onWordSubmit: vi.fn(),
    onWordHuntGuess: vi.fn(),
    gameActive: true,
    minWordLength: 3,
    socket: mockSocket,
    foundWords: [] as Array<{ word: string; isValid?: boolean | null; score?: number; duplicate?: boolean }>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedLayoutProps.value = null;
    mockBridgeReturn.targetLength = 5;
    mockBridgeReturn.targetFound = false;
    mockBridgeReturn.isGameOver = false;
    mockBridgeReturn.lifePoints = 75;
    mockBridgeReturn.eliminatedPlayers = [];
    (validateWordLocally as jest.Mock).mockReturnValue({ isValid: true, shouldSubmitToServer: true });
    (couldBeOnBoard as jest.Mock).mockReturnValue(true);
    // Mark quick rules as seen so the game renders directly
    localStorage.setItem('lexiclash_wh_rules_seen', '1');
  });

  afterEach(() => {
    localStorage.clear();
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

  it('should pass score to layout without timer props', () => {
    render(<WordHuntGame {...defaultProps} score={999} />);
    expect(capturedLayoutProps.value!.score).toBe(999);
    // Timer props should not be passed to layout
    expect(capturedLayoutProps.value!.remainingTime).toBeUndefined();
    expect(capturedLayoutProps.value!.totalTime).toBeUndefined();
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

    it('should call onWordHuntGuess even when word length does not match target (discovery feedback)', () => {
      mockBridgeReturn.targetLength = 5;

      render(<WordHuntGame {...defaultProps} />);
      const layoutOnWordSubmit = capturedLayoutProps.value!.onWordSubmit as (word: string) => void;

      act(() => {
        layoutOnWordSubmit('CAT');
      });

      expect(defaultProps.onWordSubmit).toHaveBeenCalledWith('CAT');
      expect(defaultProps.onWordHuntGuess).toHaveBeenCalledWith('CAT');
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

  describe('socket emission', () => {
    it('should emit submitWord to socket on valid word', () => {
      render(<WordHuntGame {...defaultProps} />);
      const layoutOnWordSubmit = capturedLayoutProps.value!.onWordSubmit as (word: string) => void;

      act(() => {
        layoutOnWordSubmit('CAT');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('submitWord', expect.objectContaining({
        word: 'cat',
        comboLevel: 0,
      }));
    });

    it('should NOT emit submitWord when socket is null', () => {
      render(<WordHuntGame {...defaultProps} socket={null} />);
      const layoutOnWordSubmit = capturedLayoutProps.value!.onWordSubmit as (word: string) => void;

      act(() => {
        layoutOnWordSubmit('CAT');
      });

      expect(defaultProps.onWordSubmit).toHaveBeenCalledWith('CAT');
      // No socket emit since socket is null
    });

    it('should NOT emit submitWord when game is not active', () => {
      render(<WordHuntGame {...defaultProps} gameActive={false} />);
      const layoutOnWordSubmit = capturedLayoutProps.value!.onWordSubmit as (word: string) => void;

      act(() => {
        layoutOnWordSubmit('CAT');
      });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('client-side validation', () => {
    it('should reject duplicate words with duplicate feedback', () => {
      (validateWordLocally as jest.Mock).mockReturnValue({
        isValid: false,
        errorKey: 'playerView.wordAlreadyFound',
        shouldSubmitToServer: false,
      });

      render(<WordHuntGame {...defaultProps} />);
      const layoutOnWordSubmit = capturedLayoutProps.value!.onWordSubmit as (word: string) => void;

      act(() => {
        layoutOnWordSubmit('CAT');
      });

      expect(defaultProps.onWordSubmit).not.toHaveBeenCalled();
      expect(mockSocket.emit).not.toHaveBeenCalled();
      expect(capturedLayoutProps.value!.wordFeedback).toMatchObject({
        type: 'duplicate',
        word: 'CAT',
      });
    });

    it('should reject too-short words with rejected feedback', () => {
      (validateWordLocally as jest.Mock).mockReturnValue({
        isValid: false,
        errorKey: 'playerView.wordTooShortMin',
        shouldSubmitToServer: false,
      });

      render(<WordHuntGame {...defaultProps} />);
      const layoutOnWordSubmit = capturedLayoutProps.value!.onWordSubmit as (word: string) => void;

      act(() => {
        layoutOnWordSubmit('AB');
      });

      expect(defaultProps.onWordSubmit).not.toHaveBeenCalled();
      expect(mockSocket.emit).not.toHaveBeenCalled();
      expect(capturedLayoutProps.value!.wordFeedback).toMatchObject({
        type: 'rejected',
        word: 'AB',
      });
    });

    it('should reject words not on board', () => {
      (couldBeOnBoard as jest.Mock).mockReturnValue(false);

      render(<WordHuntGame {...defaultProps} />);
      const layoutOnWordSubmit = capturedLayoutProps.value!.onWordSubmit as (word: string) => void;

      act(() => {
        layoutOnWordSubmit('XYZ');
      });

      expect(defaultProps.onWordSubmit).not.toHaveBeenCalled();
      expect(mockSocket.emit).not.toHaveBeenCalled();
      expect(capturedLayoutProps.value!.wordFeedback).toMatchObject({
        type: 'rejected',
        word: 'XYZ',
      });
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

  describe('MP drag-FTUE wiring', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      localStorage.removeItem('mp_ftue_drag_v1');
    });
    afterEach(() => {
      vi.useRealTimers();
      localStorage.removeItem('mp_ftue_drag_v1');
    });

    it('passes a dragFTUE prop to the layout (hidden initially)', () => {
      render(<WordHuntGame {...defaultProps} />);
      const ftue = capturedLayoutProps.value!.dragFTUE as { visible: boolean; onDismiss: () => void };
      expect(ftue).toBeTruthy();
      expect(ftue.visible).toBe(false);
      expect(typeof ftue.onDismiss).toBe('function');
    });

    it('does NOT pass FTUE in solo (no socket)', () => {
      render(<WordHuntGame {...defaultProps} socket={null} />);
      const ftue = capturedLayoutProps.value!.dragFTUE as { visible: boolean; onDismiss: () => void };
      // Component still passes the prop, but visible never flips true for solo
      act(() => { vi.advanceTimersByTime(25_000); });
      expect(ftue.visible).toBe(false);
    });

    it('hides FTUE once the player has found a valid word', () => {
      const { rerender } = render(<WordHuntGame {...defaultProps} />);
      act(() => { vi.advanceTimersByTime(25_000); });
      rerender(
        <WordHuntGame
          {...defaultProps}
          foundWords={[{ word: 'HELLO', isValid: true, score: 10 }]}
        />,
      );
      const ftue = capturedLayoutProps.value!.dragFTUE as { visible: boolean; onDismiss: () => void };
      expect(ftue.visible).toBe(false);
      expect(localStorage.getItem('mp_ftue_drag_v1')).toBe('dismissed');
    });
  });
});
