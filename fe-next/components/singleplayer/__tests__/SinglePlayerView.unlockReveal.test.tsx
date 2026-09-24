/**
 * Track C (avatar unlock reveal): singleplayer threw away record-game's
 * level-up. It must now publish it (in memory) so the results screen shows
 * the unlock reveal — the SP path is how most players reach level 2.
 */
import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { __resetRevealSessionForTests, getPublishedReveal } from '@/lib/avatar/revealTrigger';

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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1' }, isAuthenticated: true, loading: false, profile: { current_level: 1 } }),
}));

vi.mock('@/components/avatar/reveal/SessionRevealHost', () => ({
  __esModule: true,
  default: () => <div data-testid="session-reveal-host" />,
}));

import SinglePlayerView from '../SinglePlayerView';

const results = {
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

async function playOneGame(response: Record<string, unknown>) {
  global.fetch = vi.fn(async () => ({ json: async () => response })) as unknown as typeof fetch;
  mockSearchParams.set('autoStart', 'bots');
  await act(async () => { render(<SinglePlayerView />); });
  await waitFor(() => expect(screen.getByTestId('game')).toBeInTheDocument());
  await act(async () => { global.__testCallbackStore__.onGameEnd!(results); });
  await waitFor(() => expect(screen.getByTestId('results')).toBeInTheDocument());
}

describe('SinglePlayerView — avatar unlock reveal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new Map();
    global.__testCallbackStore__.onGameEnd = null;
    __resetRevealSessionForTests();
  });

  it('publishes the level-up from record-game and mounts the reveal host on results', async () => {
    await playOneGame({ success: true, xpEarned: 150, newTotalXp: 150, newLevel: 2, leveledUp: true });
    await waitFor(() => expect(getPublishedReveal()?.unlocks.map(u => u.partId)).toEqual(['headphones']));
    expect(screen.getByTestId('session-reveal-host')).toBeInTheDocument();
  });

  it('publishes nothing when the game did not level up', async () => {
    await playOneGame({ success: true, xpEarned: 20, newTotalXp: 40, newLevel: 1, leveledUp: false });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(getPublishedReveal()).toBeNull();
  });
});
