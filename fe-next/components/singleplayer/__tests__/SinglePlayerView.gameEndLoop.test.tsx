/**
 * SinglePlayerView - Game End Loop Bug Test
 *
 * Bug: When a game ends with autoStart parameter in URL, the game restarts
 * in an infinite loop instead of showing results.
 *
 * Root Cause: handleGameEnd resets hasAutoStartedRef to false, and the
 * auto-start useEffects have 'phase' in their dependencies. When phase
 * changes to 'results', the effects re-run and see autoStart param +
 * hasAutoStartedRef=false, triggering a new game.
 *
 * TDD: RED phase - This test should FAIL before the fix is applied.
 */

import React, { act, useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock search params - will be set per test
let mockSearchParams = new Map<string, string>();
const mockRouterPush = vi.fn();

// Use global for callback storage to avoid module-level reassignment issues
declare global {
   
  var __testCallbackStore__: { onGameEnd: ((results: unknown) => void) | null };
}
global.__testCallbackStore__ = { onGameEnd: null };

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
  }),
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock NavigationContext
const mockSetIsInGame = vi.fn();
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => mockSetIsInGame,
}));

// Mock CoinContext (needed by PracticeResults)
vi.mock('@/contexts/CoinContext', () => ({
  useCoin: () => ({
    coins: 0,
    updateCoins: vi.fn(),
  }),
  useCoinContext: () => ({
    coins: 0,
    updateCoins: vi.fn(),
    addCoins: vi.fn(),
  }),
}));

// Mock MusicContext
vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    unlockAudio: vi.fn(),
    playBackgroundMusic: vi.fn(),
    stopBackgroundMusic: vi.fn(),
    isPlaying: false,
  }),
}));

// Mock hooks
vi.mock('@/hooks/useGameMusic', () => ({
  useGameMusic: vi.fn(),
}));

vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));

// Mock SinglePlayerGame to capture onGameEnd callback
vi.mock('../SinglePlayerGame', () => {
  const React = require('react');
  const MockSinglePlayerGame = (props: { onGameEnd: (results: unknown) => void }) => {
    // Use useEffect to capture the callback (avoids render-time side effect lint error)
    React.useEffect(() => {
      global.__testCallbackStore__.onGameEnd = props.onGameEnd;
    }, [props.onGameEnd]);
    return React.createElement('div', { 'data-testid': 'game' }, 'Game');
  };
  MockSinglePlayerGame.displayName = 'MockSinglePlayerGame';
  return { default: MockSinglePlayerGame };
});

vi.mock('../SinglePlayerResults', () => {
  const MockSinglePlayerResults = () => <div data-testid="results">Results</div>;
  MockSinglePlayerResults.displayName = 'MockSinglePlayerResults';
  return { default: MockSinglePlayerResults };
});

vi.mock('../results/PracticeResults', () => {
  const MockPracticeResults = () => <div data-testid="results">Practice Results</div>;
  MockPracticeResults.displayName = 'MockPracticeResults';
  return { __esModule: true, default: MockPracticeResults };
});

vi.mock('@/components/AutoHideHeader', () => {
  const MockAutoHideHeader = () => null;
  MockAutoHideHeader.displayName = 'MockAutoHideHeader';
  return { default: MockAutoHideHeader };
});

vi.mock('@/components/ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

// Mock high score manager
vi.mock('../highScoreManager', () => ({
  getHighScore: vi.fn().mockReturnValue(null),
  recordGameResult: vi.fn().mockReturnValue({ isNewHighScore: false }),
  getAllTimeBest: vi.fn().mockReturnValue(null),
}));

// Mock player progress storage
vi.mock('@/utils/playerProgressStorage', () => ({
  incrementTrainingGames: vi.fn(),
}));

// Mock preset config
vi.mock('../presetConfig', () => ({
  getMinWordLength: vi.fn().mockReturnValue(3),
  getDefaultPreset: vi.fn().mockImplementation((mode: string) => {
    if (mode === 'solo-bots') {
      return {
        id: 'standard',
        settings: {
          difficulty: 'MEDIUM',
          timerSeconds: 120,
          bots: 2,
          botDifficulty: 'medium',
        },
      };
    }
    if (mode === 'practice') {
      return {
        id: 'explorer',
        settings: {
          difficulty: 'EASY',
          timerSeconds: 0,
          bots: 0,
          botDifficulty: 'easy',
        },
      };
    }
    return null;
  }),
  getPresetById: vi.fn().mockReturnValue(null),
}));

// Import after mocks
import SinglePlayerView from '../SinglePlayerView';
import { getDefaultPreset } from '../presetConfig';

describe('SinglePlayerView - Game End Loop Bug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new Map();
    global.__testCallbackStore__.onGameEnd = null;
  });

  const mockGameResults = {
    playerScore: 100,
    playerWords: ['test', 'word'],
    playerWordData: [
      { word: 'test', score: 50, timestamp: Date.now(), timeSinceStart: 10, isValid: true },
      { word: 'word', score: 50, timestamp: Date.now(), timeSinceStart: 20, isValid: true },
    ],
    gameDuration: 120,
    botScores: [],
    grid: [['A', 'B'], ['C', 'D']],
    allPossibleWords: [],
    isNewHighScore: false,
    achievements: [],
    botWordsForValidation: [],
    gameSessionId: 'test-session-123',
    language: 'en',
  };

  describe('Bug: Game restarts in loop after ending', () => {
    it('should show results after game ends with autoStart=bots (NOT restart game)', async () => {
      // GIVEN: User navigated with autoStart=bots and game is playing
      mockSearchParams.set('autoStart', 'bots');

      await act(async () => {
        render(<SinglePlayerView />);
      });

      // Wait for game to start
      await waitFor(() => {
        expect(screen.getByTestId('game')).toBeInTheDocument();
      });

      // Verify we captured the callback
      expect(global.__testCallbackStore__.onGameEnd).not.toBeNull();

      // WHEN: Game ends (timer runs out, calling onGameEnd)
      await act(async () => {
        global.__testCallbackStore__.onGameEnd!(mockGameResults);
      });

      // THEN: Should show results screen (NOT restart the game)
      await waitFor(() => {
        expect(screen.getByTestId('results')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Critical: Game should NOT be visible anymore
      expect(screen.queryByTestId('game')).not.toBeInTheDocument();
    });

    it('should show results after game ends with autoStart=practice (NOT restart game)', async () => {
      // GIVEN: User navigated with autoStart=practice and game is playing
      mockSearchParams.set('autoStart', 'practice');

      await act(async () => {
        render(<SinglePlayerView />);
      });

      // Wait for game to start
      await waitFor(() => {
        expect(screen.getByTestId('game')).toBeInTheDocument();
      });

      // Verify we captured the callback
      expect(global.__testCallbackStore__.onGameEnd).not.toBeNull();

      // WHEN: Game ends (user finishes practice mode)
      await act(async () => {
        global.__testCallbackStore__.onGameEnd!(mockGameResults);
      });

      // THEN: Should show results screen (NOT restart the game)
      await waitFor(() => {
        expect(screen.getByTestId('results')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Critical: Game should NOT be visible anymore
      expect(screen.queryByTestId('game')).not.toBeInTheDocument();
    });

    it('should remain on results screen even with autoStart param still in URL', async () => {
      // GIVEN: autoStart=bots in URL
      mockSearchParams.set('autoStart', 'bots');

      await act(async () => {
        render(<SinglePlayerView />);
      });

      // Wait for game to start
      await waitFor(() => {
        expect(screen.getByTestId('game')).toBeInTheDocument();
      });

      // Game ends
      await act(async () => {
        global.__testCallbackStore__.onGameEnd!(mockGameResults);
      });

      // Should show results
      await waitFor(() => {
        expect(screen.getByTestId('results')).toBeInTheDocument();
      });

      // WHEN: Wait some time (simulate React re-renders, effect re-runs)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // THEN: Should STILL be on results screen (not restarted)
      expect(screen.getByTestId('results')).toBeInTheDocument();
      expect(screen.queryByTestId('game')).not.toBeInTheDocument();
    });

    it('should not trigger auto-start when phase transitions to results', async () => {
      // GIVEN: autoStart=bots, game started and completed
      mockSearchParams.set('autoStart', 'bots');
      // getDefaultPreset is already imported and mocked above

      await act(async () => {
        render(<SinglePlayerView />);
      });

      // Game starts - getDefaultPreset called once
      await waitFor(() => {
        expect(screen.getByTestId('game')).toBeInTheDocument();
      });

      const callsBeforeGameEnd = getDefaultPreset.mock.calls.length;

      // WHEN: Game ends
      await act(async () => {
        global.__testCallbackStore__.onGameEnd!(mockGameResults);
      });

      // THEN: getDefaultPreset should NOT be called again
      // (auto-start effect should not re-trigger)
      await waitFor(() => {
        expect(screen.getByTestId('results')).toBeInTheDocument();
      });

      expect(getDefaultPreset.mock.calls.length).toBe(callsBeforeGameEnd);
    });
  });
});
