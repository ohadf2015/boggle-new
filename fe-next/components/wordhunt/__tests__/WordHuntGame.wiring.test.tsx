/**
 * Wiring tests: LowHPOverlay and WordHuntCategoryHint mounted in WordHuntGame
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock bridge hook with controllable state
const mockBridgeReturn = {
  lifePoints: 75,
  targetFound: false,
  targetLength: 5,
  targetCategory: 'animals',
  playerLives: { alice: 80 },
  eliminatedPlayers: [] as string[],
  attempts: [],
  accumulatedClues: new Map(),
  knownLetters: new Set<string>(),
  currentHint: { hint: '_ _ _ _ _', level: 0, unlockCost: 0 },
  showFeedbackOverlay: false,
  latestAttemptFeedback: null,
  isGameOver: false,
  wrongGuessShake: false,
  isClueGaining: false,
  targetFoundBy: null as string | null,
};

vi.mock('../hooks/useWordHuntMultiplayerBridge', () => ({
  useWordHuntMultiplayerBridge: () => mockBridgeReturn,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', locale: 'en', dir: 'ltr' }),
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

vi.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: vi.fn().mockReturnValue({ isValid: true }),
  couldBeOnBoard: vi.fn().mockReturnValue(true),
}));

vi.mock('@/hooks/useWordHuntDangerAlerts', () => ({
  useWordHuntDangerAlerts: () => ({ toasts: [], dismissToast: vi.fn() }),
}));

// Mock WordHuntGameLayout to keep things simple
vi.mock('../WordHuntGameLayout', () => ({
  WordHuntGameLayout: () => <div data-testid="wordhunt-game-layout" />,
}));

// Do NOT mock LowHPOverlay and WordHuntCategoryHint — we test their presence

import { WordHuntGame } from '../WordHuntGame';

describe('WordHuntGame wiring', () => {
  const defaultGrid = [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ];

  const defaultProps = {
    grid: defaultGrid,
    gameLanguage: 'en' as const,
    leaderboard: [{ username: 'alice', score: 300 }],
    username: 'alice',
    score: 300,
    onQuit: vi.fn(),
    onWordSubmit: vi.fn(),
    onWordHuntGuess: vi.fn(),
    gameActive: true,
    minWordLength: 3,
    socket: { emit: vi.fn() } as any,
    foundWords: [],
  };

  beforeEach(() => {
    mockBridgeReturn.lifePoints = 75;
    mockBridgeReturn.targetCategory = 'animals';
    mockBridgeReturn.targetLength = 5;
    // Mark quick rules as seen so the game renders directly
    localStorage.setItem('lexiclash_wh_rules_seen', '1');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders LowHPOverlay when HP is low', () => {
    mockBridgeReturn.lifePoints = 15;
    render(<WordHuntGame {...defaultProps} />);
    expect(screen.getByTestId('low-hp-overlay')).toBeInTheDocument();
  });

  it('does not render LowHPOverlay when HP is high', () => {
    mockBridgeReturn.lifePoints = 75;
    render(<WordHuntGame {...defaultProps} />);
    expect(screen.queryByTestId('low-hp-overlay')).not.toBeInTheDocument();
  });

  it('renders WordHuntCategoryHint with category data', () => {
    render(<WordHuntGame {...defaultProps} />);
    expect(screen.getByTestId('category-hint')).toBeInTheDocument();
  });

  it('emits requestGameState after 1.5s when targetLength is 0 and game is active (recovery)', async () => {
    vi.useFakeTimers();
    mockBridgeReturn.targetLength = 0;
    const emit = vi.fn();
    const socket = { emit } as { emit: ReturnType<typeof vi.fn> };
    render(<WordHuntGame {...defaultProps} socket={socket as never} />);
    expect(emit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1500);
    expect(emit).toHaveBeenCalledWith('requestGameState');
    vi.useRealTimers();
  });

  it('does NOT emit requestGameState once targetLength is set', async () => {
    vi.useFakeTimers();
    mockBridgeReturn.targetLength = 5;
    const emit = vi.fn();
    const socket = { emit } as { emit: ReturnType<typeof vi.fn> };
    render(<WordHuntGame {...defaultProps} socket={socket as never} />);
    await vi.advanceTimersByTimeAsync(2000);
    expect(emit).not.toHaveBeenCalledWith('requestGameState');
    vi.useRealTimers();
  });
});
