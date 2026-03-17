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
const mockRouterPush = jest.fn();

// Use global for callback storage to avoid module-level reassignment issues
declare global {
   
  var __testCallbackStore__: { onGameEnd: ((results: unknown) => void) | null };
}
global.__testCallbackStore__ = { onGameEnd: null };

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
  }),
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock NavigationContext
const mockSetIsInGame = jest.fn();
jest.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => mockSetIsInGame,
}));

// Mock CoinContext (needed by PracticeResults)
jest.mock('@/contexts/CoinContext', () => ({
  useCoin: () => ({
    coins: 0,
    updateCoins: jest.fn(),
  }),
  useCoinContext: () => ({
    coins: 0,
    updateCoins: jest.fn(),
    addCoins: jest.fn(),
  }),
}));

// Mock MusicContext
jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    unlockAudio: jest.fn(),
    playBackgroundMusic: jest.fn(),
    stopBackgroundMusic: jest.fn(),
    isPlaying: false,
  }),
}));

// Mock hooks
jest.mock('@/hooks/useGameMusic', () => ({
  useGameMusic: jest.fn(),
}));

jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));

// Mock SinglePlayerGame to capture onGameEnd callback
jest.mock('../SinglePlayerGame', () => {
  const React = require('react');
  const MockSinglePlayerGame = (props: { onGameEnd: (results: unknown) => void }) => {
    // Use useEffect to capture the callback (avoids render-time side effect lint error)
    React.useEffect(() => {
      global.__testCallbackStore__.onGameEnd = props.onGameEnd;
    }, [props.onGameEnd]);
    return React.createElement('div', { 'data-testid': 'game' }, 'Game');
  };
  MockSinglePlayerGame.displayName = 'MockSinglePlayerGame';
  return MockSinglePlayerGame;
});

jest.mock('../SinglePlayerResults', () => {
  const MockSinglePlayerResults = () => <div data-testid="results">Results</div>;
  MockSinglePlayerResults.displayName = 'MockSinglePlayerResults';
  return MockSinglePlayerResults;
});

jest.mock('@/components/AutoHideHeader', () => {
  const MockAutoHideHeader = () => null;
  MockAutoHideHeader.displayName = 'MockAutoHideHeader';
  return MockAutoHideHeader;
});

jest.mock('@/components/ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

// Mock high score manager
jest.mock('../highScoreManager', () => ({
  getHighScore: jest.fn().mockReturnValue(null),
  recordGameResult: jest.fn().mockReturnValue({ isNewHighScore: false }),
  getAllTimeBest: jest.fn().mockReturnValue(null),
}));

// Mock player progress storage
jest.mock('@/utils/playerProgressStorage', () => ({
  incrementTrainingGames: jest.fn(),
}));

// Mock preset config
jest.mock('../presetConfig', () => ({
  getMinWordLength: jest.fn().mockReturnValue(3),
  getDefaultPreset: jest.fn().mockImplementation((mode: string) => {
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
  getPresetById: jest.fn().mockReturnValue(null),
}));

// Import after mocks
import SinglePlayerView from '../SinglePlayerView';

describe('SinglePlayerView - Game End Loop Bug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      const getDefaultPreset = jest.requireMock('../presetConfig').getDefaultPreset;

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
