import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import WordWheelChallenge from '../WordWheelChallenge';

// --- next/dynamic: actually resolve the loader ---
// TabbedDailyLeaderboard is loaded via dynamic() now, so a stub that renders
// null would hide the very component under test. React.lazy resolves the real
// loader, which vi.mock intercepts back to the capture stub below.
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>) => {
    const Lazy = React.lazy(loader);
    const Stub = (props: Record<string, unknown>) => (
      <React.Suspense fallback={null}>
        <Lazy {...props} />
      </React.Suspense>
    );
    Stub.displayName = 'DynamicStub';
    return Stub;
  },
}));

// The effects canvas is dynamic() too — keep real Pixi out of jsdom.
vi.mock('../WordWheelEffectsCanvas', () => ({
  __esModule: true,
  default: () => null,
  WordWheelEffectsCanvas: () => null,
}));

// --- framer-m: pass-through ---
vi.mock('framer-motion', () => ({
  m: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: React.ComponentProps<'div'>) => (
        <div {...props}>{children}</div>
      ),
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// --- Contexts ---
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ setGameActive: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: null, isAuthenticated: false }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useRegisterHeaderAudioControl: () => undefined,
  useHideNavigation: () => vi.fn(),
}));

// --- Utils ---
vi.mock('@/utils/dailyChallenge', () => ({
  hasEverPlayedWordWheel: () => false,
  getDailyChallengeDate: () => '2026-04-15',
  getPuzzleNumber: () => 42,
  hasPlayedWordWheelToday: () => false,
  getTodaysWordWheelResult: () => null,
  saveWordWheelResult: vi.fn(),
  hasPlayedWordHuntToday: () => false,
  getDailyStreak: () => ({ currentStreak: 0 }),
  updateDailyStreak: vi.fn(() => ({ currentStreak: 1, longestStreak: 1, lastPlayedDate: null, totalDailiesCompleted: 1 })),
}));
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  generateWordWheelPuzzle: (date?: string) => ({
    puzzleDate: date, puzzleNumber: 42, language: 'en',
    centerLetter: 'A',
    outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
    validWords: [],
  }),
}));
vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: () => 'test-fp',
}));

const prewarmDictionary = vi.fn().mockResolvedValue(undefined);
const hasWordInMemoryCache = vi.fn((word: string) => (word === 'CAB' ? true : false));
vi.mock('@/hooks/useDictionaryCache', () => ({
  prewarmDictionary: (lang: string) => prewarmDictionary(lang),
  hasWordInMemoryCache: (word: string, lang: string) => hasWordInMemoryCache(word, lang),
}));

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    canShowAd: false,
    isDailyLimitReached: false,
    showAd: vi.fn(),
    isLoading: false,
  }),
}));

// --- Child components ---
const gameProps: { onQuickVerdict?: (w: string) => boolean | null }[] = [];
vi.mock('../WordWheelGame', () => ({
  __esModule: true,
  default: (props: { onQuickVerdict?: (w: string) => boolean | null }) => {
    gameProps.push(props);
    return <div data-testid="word-wheel-game" />;
  },
}));
vi.mock('../WordWheelResults', () => ({
  __esModule: true,
  default: () => <div data-testid="word-wheel-results" />,
}));

// --- TabbedDailyLeaderboard: capture props ---
const capturedProps: { scope?: string; defaultTab?: string }[] = [];
vi.mock('../TabbedDailyLeaderboard', () => ({
  __esModule: true,
  default: (props: { scope?: string; defaultTab?: string }) => {
    capturedProps.push(props);
    return (
      <div data-testid="tabbed-daily-leaderboard" data-scope={props.scope}>
        leaderboard
      </div>
    );
  },
}));

describe('WordWheelChallenge - dictionary warm-up', () => {
  beforeEach(() => prewarmDictionary.mockClear());

  it('waits for the first touch on the ready card, keeping the download out of the page-load window', async () => {
    render(<WordWheelChallenge />);
    await screen.findByText('daily.play');
    await new Promise((r) => setTimeout(r, 400));
    expect(prewarmDictionary).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(prewarmDictionary).toHaveBeenCalledWith('en'));
  });

  it('warms it on PLAY', async () => {
    render(<WordWheelChallenge />);
    fireEvent.click(await screen.findByText('daily.play'));
    await waitFor(() => expect(prewarmDictionary).toHaveBeenCalledWith('en'));
  });

  it('hands the game the loaded dictionary so a release is judged in the same frame', async () => {
    render(<WordWheelChallenge />);
    fireEvent.click(await screen.findByText('daily.play'));
    await screen.findByTestId('word-wheel-game');
    const verdict = gameProps[gameProps.length - 1].onQuickVerdict!;
    expect(verdict('CAB')).toBe(true);
    expect(verdict('XYZ')).toBe(false);
    expect(hasWordInMemoryCache).toHaveBeenCalledWith('CAB', 'en');
  });
});
