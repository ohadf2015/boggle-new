/** The best score the mascot races in round N+1 must include a record set in round N. */
import React, { act } from 'react';
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
  useRegisterHeaderAudioControl: () => undefined,
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
    stopMusic: vi.fn(),
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

vi.mock('../SinglePlayerGame', () => {
  const React = require('react');
  const MockSinglePlayerGame = (props: { onGameEnd: (results: unknown) => void; targetHighScore: number | null }) => {
    React.useEffect(() => {
      global.__testCallbackStore__.onGameEnd = props.onGameEnd;
    }, [props.onGameEnd]);
    return React.createElement('div', { 'data-testid': 'game', 'data-best': String(props.targetHighScore) }, 'Game');
  };
  return { default: MockSinglePlayerGame };
});

vi.mock('../SinglePlayerResults', () => ({
  default: (p: { onPlayAgain: () => void }) => <button data-testid="results" onClick={p.onPlayAgain}>again</button>,
}));

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
  getHighScore: vi.fn(),
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

import SinglePlayerView from '../SinglePlayerView';
import { getHighScore } from '../highScoreManager';

const results = {
  playerScore: 80, playerWords: ['test'], playerWordData: [], gameDuration: 120, botScores: [],
  grid: [['A', 'B'], ['C', 'D']], allPossibleWords: [], isNewHighScore: true, achievements: [],
  botWordsForValidation: [], gameSessionId: 's', language: 'en',
};

describe('SinglePlayerView - personal best stays current between rounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new Map([['autoStart', 'challenge']]);
    global.__testCallbackStore__.onGameEnd = null;
  });

  it('play again races the record the last round just set, not the one before it', async () => {
    vi.mocked(getHighScore).mockReturnValue({ score: 50, wordCount: 1, longestWord: 'a', achievedAt: 0 });
    await act(async () => {
      render(<SinglePlayerView />);
    });
    await waitFor(() => expect(screen.getByTestId('game').dataset.best).toBe('50'));

    vi.mocked(getHighScore).mockReturnValue({ score: 80, wordCount: 1, longestWord: 'a', achievedAt: 1 });
    await act(async () => {
      global.__testCallbackStore__.onGameEnd!(results);
    });
    await waitFor(() => expect(screen.getByTestId('results')).toBeInTheDocument());
    await act(async () => {
      screen.getByTestId('results').click();
    });
    await waitFor(() => expect(screen.getByTestId('game').dataset.best).toBe('80'));
  });
});
