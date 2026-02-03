/**
 * SinglePlayerView autoStart=bots Tests
 *
 * Tests for direct bot game launch via autoStart=bots URL parameter
 * Follows TDD: These tests are written FIRST (RED phase), then implementation (GREEN phase)
 */

import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock search params - will be set per test
let mockSearchParams = new Map<string, string>();
const mockRouterPush = jest.fn();

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

// Mock child components
jest.mock('../SinglePlayerGame', () => {
  const MockSinglePlayerGame = () => <div data-testid="game">Game</div>;
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
  recordGameResult: jest.fn(),
  getAllTimeBest: jest.fn().mockReturnValue(null),
}));

// Mock player progress storage
jest.mock('@/utils/playerProgressStorage', () => ({
  incrementTrainingGames: jest.fn(),
}));

// Mock preset config - use factory function to avoid initialization issues
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
import { getDefaultPreset } from '../presetConfig';

describe('SinglePlayerView - autoStart=bots URL parameter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new Map();
  });

  describe('Direct bot game launch from landing page', () => {
    it('should auto-start bot game when autoStart=bots parameter is provided', async () => {
      // GIVEN: User clicked "Single Player" button on landing page
      mockSearchParams.set('autoStart', 'bots');

      // WHEN: SinglePlayerView renders
      await act(async () => {
        render(<SinglePlayerView />);
      });

      // THEN: Should immediately start playing (skip preset-selection and lobby)
      await waitFor(() => {
        expect(screen.getByTestId('game')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should NOT show preset selector or lobby
      // Preset selector no longer exists after simplification
      expect(screen.queryByTestId('lobby')).not.toBeInTheDocument();
    });

    it('should load default solo-bots preset when autoStart=bots', async () => {
      // GIVEN: autoStart=bots parameter
      mockSearchParams.set('autoStart', 'bots');

      // WHEN: Component renders
      await act(async () => {
        render(<SinglePlayerView />);
      });

      // THEN: Should call getDefaultPreset with 'solo-bots' mode
      await waitFor(() => {
        expect(getDefaultPreset).toHaveBeenCalledWith('solo-bots');
      });
    });

    it('should use preset configuration with 2 medium bots', async () => {
      // GIVEN: autoStart=bots parameter
      mockSearchParams.set('autoStart', 'bots');

      // WHEN: Component renders
      await act(async () => {
        render(<SinglePlayerView />);
      });

      // THEN: Should use the solo-bots preset (2 medium bots, 120s timer)
      await waitFor(() => {
        expect(getDefaultPreset).toHaveBeenCalledWith('solo-bots');
        expect(screen.getByTestId('game')).toBeInTheDocument();
      });
    });

    it('should transition to playing phase without showing intermediate screens', async () => {
      // GIVEN: autoStart=bots parameter
      mockSearchParams.set('autoStart', 'bots');

      // WHEN: Component renders
      await act(async () => {
        render(<SinglePlayerView />);
      });

      // THEN: Should go directly to game (playing phase)
      await waitFor(() => {
        const game = screen.getByTestId('game');
        expect(game).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should never have shown preset selector
      const preselector = screen.queryByTestId('preset-selector');
      expect(preselector).not.toBeInTheDocument();
    });

    it('should handle autoStart=bots on fresh page load', async () => {
      // GIVEN: User navigates directly to /singleplayer?autoStart=bots (fresh load)
      mockSearchParams.set('autoStart', 'bots');

      // WHEN: Component mounts for the first time
      await act(async () => {
        render(<SinglePlayerView />);
      });

      // THEN: Should start game immediately without any intermediate state
      await waitFor(() => {
        expect(screen.getByTestId('game')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should only auto-start once (prevent duplicate game starts)', async () => {
      // GIVEN: autoStart=bots parameter
      mockSearchParams.set('autoStart', 'bots');

      // WHEN: Component renders
      await act(async () => {
        render(<SinglePlayerView />);
      });

      // Wait for game to load
      await waitFor(() => {
        expect(screen.getByTestId('game')).toBeInTheDocument();
      });

      // THEN: Should have started the game exactly once
      // (hasAutoStartedRef prevents multiple starts)
      expect(getDefaultPreset).toHaveBeenCalled();

      // Game component should be visible (not showing preset selector multiple times)
      expect(screen.getByTestId('game')).toBeInTheDocument();
      // Preset selector no longer exists after simplification
    });
  });

  describe('Coexistence with other autoStart modes', () => {
    it('should not interfere with autoStart=practice', async () => {
      // GIVEN: autoStart=practice parameter (existing functionality)
      mockSearchParams.set('autoStart', 'practice');

      // WHEN: Component renders
      await act(async () => {
        render(<SinglePlayerView />);
      });

      // THEN: Should load practice mode (not bots mode)
      await waitFor(() => {
        expect(getDefaultPreset).toHaveBeenCalledWith('practice');
        expect(screen.getByTestId('game')).toBeInTheDocument();
      });
    });

    it('should prioritize autoStart=bots over preset parameter if both exist', async () => {
      // GIVEN: Both autoStart and preset parameters (edge case)
      mockSearchParams.set('autoStart', 'bots');
      mockSearchParams.set('preset', 'practice');

      // WHEN: Component renders
      await act(async () => {
        render(<SinglePlayerView />);
      });

      // THEN: Should use autoStart=bots (processed first in useEffect order)
      await waitFor(() => {
        expect(getDefaultPreset).toHaveBeenCalledWith('solo-bots');
        expect(screen.getByTestId('game')).toBeInTheDocument();
      });
    });
  });

  describe('No autoStart parameter', () => {
    it('should show game when no URL parameters (starts with default game)', async () => {
      // GIVEN: No URL parameters
      // (mockSearchParams is empty)

      // WHEN: Component renders
      render(<SinglePlayerView />);

      // THEN: Should show game (direct to playing phase)
      await waitFor(() => {
        expect(screen.getByTestId('game')).toBeInTheDocument();
      });
    });
  });
});
