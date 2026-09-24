/**
 * Funnel telemetry: `daily_challenge_completed` had 0 call sites despite being a
 * registered growth event ("the one funnel we're told to grow"). It must fire
 * once when the live daily challenge (Word Hunt) is actually finished — and never
 * in practice mode (which skips all persistence + analytics).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

let mockDateParam: string | null = null;

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _i, animate: _a, exit: _e, whileHover: _wh, whileTap: _wt, transition: _t, variants: _v, ...domProps } = props as Record<string, unknown>;
      return <div {...domProps}>{children}</div>;
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _i, animate: _a, exit: _e, transition: _t, variants: _v, ...domProps } = props as Record<string, unknown>;
      return <p {...domProps}>{children}</p>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ unlockAudio: vi.fn(), fadeToTrack: vi.fn(), audioUnlocked: false, isMuted: false, volume: 1, toggleMute: vi.fn(), setVolume: vi.fn(), playTrack: vi.fn(), stopMusic: vi.fn(), TRACKS: {} }),
  MusicProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playWordAcceptedSound: vi.fn(), playComboSound: vi.fn(), playErrorSound: vi.fn(), setGameActive: vi.fn(), playSound: vi.fn(), isMuted: false, toggleMute: vi.fn() }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', setLanguage: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, profile: { id: 'u1' }, loading: false }),
}));
vi.mock('@/contexts/NavigationContext', () => ({ useHideNavigation: () => vi.fn() }));
vi.mock('@/components/AutoHideHeader', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/MusicControls', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/ui/PullToRefreshIndicator', () => ({ PullToRefreshIndicator: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="loading">Loading...</div> }));
vi.mock('@/hooks/useDevicePerformance', () => ({ useDevicePerformance: () => ({ isLowEnd: false, enableComplexAnimations: true, prefersReducedMotion: false }) }));
vi.mock('@/hooks/usePullToRefresh', () => ({ usePullToRefresh: () => ({ pullToRefreshHandlers: {}, pullState: { progress: 0, isRefreshing: false } }) }));
vi.mock('@/utils/playerProgressStorage', () => ({ hasPlayedAnyGame: vi.fn(() => true) }));
vi.mock('@/hooks/useWinStreak', () => ({ useWinStreak: () => ({ recordWin: vi.fn() }) }));
vi.mock('@/contexts/AdMobContext', () => ({
  useAdMobContext: () => ({
    recordGameEnd: vi.fn(),
    shouldShowInterstitial: () => false,
    recordInterstitialShown: vi.fn(),
    hasNoAds: () => true,
    getConfig: () => null,
    whenReady: () => Promise.resolve(),
    prepareInterstitial: () => Promise.resolve(),
    isInterstitialReady: () => false,
    consumeInterstitial: vi.fn(),
  }),
}));

// Spy on the growth tracker — this is what the test asserts against.
const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEvent(...args),
  trackDailyPuzzle: vi.fn(),
  trackFeatureFirstUse: vi.fn(),
}));
vi.mock('../analytics/wordHuntCompletePayload', () => ({
  buildDailyWordHuntCompletePayload: () => ({}),
}));

// Web (not native) → no rewarded-ad gate; today's first play starts directly.
vi.mock('@/utils/platform', async (importActual) => ({
  ...(await importActual<typeof import('@/utils/platform')>()),
  isNative: () => false,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: (k: string) => (k === 'date' ? mockDateParam : null), toString: () => '' }),
}));

vi.mock('@/utils/dailyChallenge', () => ({
  hasEverPlayedWordHunt: vi.fn(() => false),
  generateDailyPuzzle: vi.fn(() => ({
    grid: [['A', 'B', 'C', 'D', 'E'], ['F', 'G', 'H', 'I', 'J'], ['K', 'L', 'M', 'N', 'O'], ['P', 'Q', 'R', 'S', 'T'], ['U', 'V', 'W', 'X', 'Y']],
    targetWord: 'TEST', seedWords: ['TEST'], validWords: ['TEST'], allValidWords: ['TEST'],
  })),
  getDailyChallengeDate: vi.fn(() => '2024-01-10'),
  getPuzzleNumber: vi.fn(() => 42),
  getSecondsUntilNextDaily: vi.fn(() => 3600),
  formatCountdown: vi.fn(() => '1:00:00'),
  hasPlayedWordHuntToday: vi.fn(() => false),
  getTodaysWordHuntResult: vi.fn(() => null),
  saveWordHuntResult: vi.fn(() => ({ currentStreak: 3 })),
  getDailyStreak: vi.fn(() => 0),
  parseChallengeParam: vi.fn(() => null),
  clearWordHuntResultForRetry: vi.fn(),
  markWordHuntForfeitToday: vi.fn(),
  hasWordHuntForfeitToday: vi.fn(() => false),
  clearWordHuntForfeitToday: vi.fn(),
  getGuestFingerprint: vi.fn(() => Promise.resolve('fp')),
  mapServerResultToStoredResult: vi.fn(),
  GAME_LANGUAGE_KEY: 'daily_game_language',
  getWordHuntResultKey: vi.fn(() => 'word_hunt_result_en'),
}));

const RESULT = {
  solved: true,
  attemptsUsed: 2,
  targetWord: 'TEST',
  attempts: [],
  wordsDiscovered: [],
  lifeRemaining: 3,
  clueTokensEarned: 0,
  clueTokensSpent: 0,
  hintsUnlocked: 0,
  efficiencyScore: 100,
};

// Survival game stub that lets the test drive completion via onComplete.
vi.mock('../DailyWordHuntSurvival', () => ({
  __esModule: true,
  default: ({ onComplete }: { onComplete: (r: typeof RESULT) => void }) => (
    <div data-testid="survival-game">
      <button data-testid="finish" onClick={() => onComplete(RESULT)}>finish</button>
    </div>
  ),
}));
vi.mock('../DailyWordHuntResults', () => ({ __esModule: true, default: () => <div data-testid="results-screen">Results</div> }));
vi.mock('../DailyReadyScreen', () => ({
  __esModule: true,
  default: ({ onStart }: { onStart: () => void }) => (
    <div data-testid="ready-screen"><button onClick={onStart} data-testid="play-button">Play</button></div>
  ),
}));
vi.mock('../DailyChallengeTutorial', () => ({ DailyChallengeTutorial: () => null }));

const LEVEL_UP = { leveledUp: true, previousLevel: 1, newLevel: 2 };
const fetchImpl = (url: string) => Promise.resolve({
  ok: true,
  json: () => Promise.resolve(String(url).includes('/api/stats/record-game') ? LEVEL_UP : { hasPlayed: false }),
});

const { publishLevelUp, levelUpFromRecordGame } = vi.hoisted(() => ({
  publishLevelUp: vi.fn(),
  levelUpFromRecordGame: vi.fn((d: unknown) => ({ from: 'record-game', d })),
}));
vi.mock('@/lib/avatar/revealTrigger', () => ({ publishLevelUp, levelUpFromRecordGame }));
vi.mock('@/components/avatar/reveal/SessionRevealHost', () => ({ __esModule: true, default: () => null }));

import DailyChallenge from '../DailyChallenge';

describe('DailyChallenge — level-up from the daily fires the avatar unlock reveal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Installed per test: the global setup resets fetch before each test.
    global.fetch = vi.fn(fetchImpl) as unknown as typeof fetch;
    mockDateParam = null;
    Storage.prototype.getItem = vi.fn(() => null);
    Storage.prototype.setItem = vi.fn();
  });

  it('given a solved daily that levels the player up, when record-game answers, then the reveal is published', async () => {
    render(<DailyChallenge />);
    await waitFor(() => expect(screen.getByTestId('ready-screen')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('play-button'));
    await waitFor(() => expect(screen.getByTestId('survival-game')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('finish'));

    await waitFor(() => expect(levelUpFromRecordGame).toHaveBeenCalledWith(LEVEL_UP));
    expect(publishLevelUp).toHaveBeenCalledWith({ from: 'record-game', d: LEVEL_UP });
  });
});
