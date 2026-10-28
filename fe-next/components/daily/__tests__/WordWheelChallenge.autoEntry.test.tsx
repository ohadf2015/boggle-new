import React, { useEffect } from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import WordWheelChallenge from '../WordWheelChallenge';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => { const Stub = () => null; Stub.displayName = 'DynamicStub'; return Stub; },
}));
vi.mock('framer-motion', () => {
  const MotionDiv = ({ children, initial, animate, exit, transition, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
    void exit; void transition;
    return (
      <div {...(props as React.ComponentProps<'div'>)} data-initial={JSON.stringify(initial ?? null)} data-animate={JSON.stringify(animate ?? null)}>
        {children}
      </div>
    );
  };
  return {
    m: new Proxy({}, { get: () => MotionDiv }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ setGameActive: vi.fn() }) }));

const authState = { isAuthenticated: true, hasProfile: true, loading: false };
const profile = { id: 'player-123', display_name: 'P', avatar_emoji: '🎯', avatar_color: '#fff' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: authState.isAuthenticated && authState.hasProfile ? profile : null,
    isAuthenticated: authState.isAuthenticated,
    loading: authState.loading,
  }),
}));
vi.mock('@/contexts/NavigationContext', () => ({ useHideNavigation: () => vi.fn() }));
vi.mock('@/hooks/usePracticeFlag', () => ({ usePracticeFlag: () => false }));
vi.mock('@/hooks/useDailyModePlayed', () => ({ useDailyModePlayed: () => false }));

const mockHasEverPlayed = vi.fn(() => true);
vi.mock('@/utils/dailyChallenge', () => ({
  getDailyChallengeDate: () => '2026-10-11',
  getPuzzleNumber: () => 200,
  hasPlayedWordWheelToday: () => false,
  getTodaysWordWheelResult: () => null,
  saveWordWheelResult: vi.fn(),
  getDailyStreak: () => ({ currentStreak: 0, totalDailiesCompleted: 0 }),
  updateDailyStreak: vi.fn(() => ({ currentStreak: 1 })),
  hasPlayedWordWheel: () => false,
  getWordWheelResultForDate: () => null,
  hasEverPlayedWordWheel: () => mockHasEverPlayed(),
}));
const generatePuzzle = vi.fn(() => ({ centerLetter: 'A', outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'], validWords: [] }));
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  generateWordWheelPuzzle: () => generatePuzzle(),
}));
vi.mock('@/utils/dailyChallenge/guestPlayer', () => ({
  getGuestFingerprint: async () => 'guest-fp',
  getGuestDailyPlayer: async () => ({ displayName: 'Guest', avatarEmoji: '🎯', avatarColor: '#fff' }),
}));
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({ showAd: vi.fn(), isAdAvailable: true, isPlaceholderCooldown: false, status: 'idle' }),
}));

const prewarm = vi.fn<(lang: string) => Promise<void>>();
vi.mock('@/hooks/useDictionaryCache', () => ({
  prewarmDictionary: (lang: string) => prewarm(lang),
  hasWordInMemoryCache: () => null,
}));

let readyMounts = 0;
vi.mock('../WordWheelReadyCard', () => {
  const ReadyCard = ({ onPlay }: { onPlay: () => void }) => {
    useEffect(() => { readyMounts += 1; }, []);
    return <button type="button" onClick={onPlay}>daily.play</button>;
  };
  return { __esModule: true, default: ReadyCard };
});

let gameMounts = 0;
vi.mock('../WordWheelGame', () => {
  const Game = ({ paused }: { paused?: boolean }) => {
    useEffect(() => { gameMounts += 1; }, []);
    return <div data-testid="word-wheel-game" data-paused={String(!!paused)} />;
  };
  return { __esModule: true, default: Game };
});
vi.mock('../WordWheelResults', () => ({ __esModule: true, default: () => <div data-testid="word-wheel-results" /> }));
vi.mock('../TabbedDailyLeaderboard', () => ({ __esModule: true, default: () => null }));
vi.mock('../WordWheelEffectsCanvas', () => ({ __esModule: true, default: () => null }));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
}

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
}

const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });

beforeEach(() => {
  readyMounts = 0;
  gameMounts = 0;
  authState.isAuthenticated = true;
  authState.hasProfile = true;
  authState.loading = false;
  generatePuzzle.mockClear();
  mockHasEverPlayed.mockReturnValue(true);
  prewarm.mockReset();
  prewarm.mockResolvedValue(undefined);
  setReducedMotion(false);
  vi.stubGlobal('fetch', vi.fn(async () =>
    new Response(JSON.stringify({ hasPlayed: false }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('WordWheelChallenge — returning players enter without the ready card', () => {
  it('GIVEN a returning player WHEN the dictionary is still warming THEN the loader stays up, the ready card never mounts, and the game starts once warm', async () => {
    const warm = deferred();
    prewarm.mockReturnValue(warm.promise);
    render(<WordWheelChallenge />);

    await waitFor(() => expect(prewarm).toHaveBeenCalledWith('en'));
    expect(screen.getByText('daily.loadingWordWheel')).toBeInTheDocument();
    expect(screen.queryByTestId('word-wheel-game')).not.toBeInTheDocument();

    await act(async () => { warm.resolve(); });
    await screen.findByTestId('word-wheel-game');
    expect(readyMounts).toBe(0);
    expect(screen.queryByText('daily.loadingWordWheel')).not.toBeInTheDocument();
  });

  it('GIVEN the dictionary warm-up hangs THEN the game still starts after the 1.5s cap', async () => {
    vi.useFakeTimers();
    prewarm.mockReturnValue(new Promise<void>(() => {}));
    render(<WordWheelChallenge />);
    await flush();
    await flush();

    await act(async () => { await vi.advanceTimersByTimeAsync(1400); });
    expect(screen.queryByTestId('word-wheel-game')).not.toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(screen.getByTestId('word-wheel-game')).toBeInTheDocument();
    expect(readyMounts).toBe(0);
  });

  it('GIVEN a first-time player THEN the ready card shows and the game starts on Play', async () => {
    mockHasEverPlayed.mockReturnValue(false);
    render(<WordWheelChallenge />);

    fireEvent.click(await screen.findByText('daily.play'));
    await screen.findByTestId('word-wheel-game');
    expect(readyMounts).toBe(1);
    expect(prewarm).toHaveBeenCalledWith('en');
  });

  it('GIVEN the board just mounted THEN the game timer stays paused until the entrance finishes', async () => {
    vi.useFakeTimers();
    render(<WordWheelChallenge />);
    await flush();
    await flush();
    await flush();

    const game = screen.getByTestId('word-wheel-game');
    expect(game).toHaveAttribute('data-paused', 'true');

    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    expect(screen.getByTestId('word-wheel-game')).toHaveAttribute('data-paused', 'true');

    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByTestId('word-wheel-game')).toHaveAttribute('data-paused', 'false');
  });

  it('GIVEN the board entrance THEN it moves by transform only, never opacity', async () => {
    render(<WordWheelChallenge />);
    const game = await screen.findByTestId('word-wheel-game');
    const layer = game.closest('[data-animate]') as HTMLElement;
    expect(layer.getAttribute('data-initial')).not.toBe('false');
    expect(layer.getAttribute('data-initial')).not.toContain('opacity');
    expect(layer.getAttribute('data-animate')).not.toContain('opacity');
  });

  it('GIVEN reduced motion THEN the board appears statically and the timer runs at once', async () => {
    setReducedMotion(true);
    render(<WordWheelChallenge />);
    const game = await screen.findByTestId('word-wheel-game');
    expect(game.closest('[data-initial]')).toHaveAttribute('data-initial', 'false');
    expect(game).toHaveAttribute('data-paused', 'false');
  });

  it('GIVEN auth resolves after the game started THEN the board is not torn down and the ready card never appears', async () => {
    authState.isAuthenticated = false;
    const { rerender } = render(<WordWheelChallenge />);
    await screen.findByTestId('word-wheel-game');

    authState.isAuthenticated = true;
    rerender(<WordWheelChallenge />);
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });

    expect(screen.getByTestId('word-wheel-game')).toBeInTheDocument();
    expect(gameMounts).toBe(1);
    expect(readyMounts).toBe(0);
    expect(generatePuzzle).toHaveBeenCalledTimes(1);
  });

  it('GIVEN auth is still resolving THEN the loader holds and no played-check runs until it settles', async () => {
    authState.loading = true;
    const { rerender } = render(<WordWheelChallenge />);
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(screen.getByText('daily.loadingWordWheel')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();

    authState.loading = false;
    rerender(<WordWheelChallenge />);
    await screen.findByTestId('word-wheel-game');
    expect(readyMounts).toBe(0);
  });

  it('GIVEN the profile lands after entry and the server says today was already played THEN the result shows, never the ready card', async () => {
    authState.hasProfile = false;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const hasPlayed = url.includes('playerId=player-123');
      return new Response(JSON.stringify(hasPlayed
        ? { hasPlayed: true, result: { score: 40, wordsFound: ['CAB'], longestWord: 'CAB', timeSeconds: 120, centerLetter: 'A', completedAt: null } }
        : { hasPlayed: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    const { rerender } = render(<WordWheelChallenge />);
    await screen.findByTestId('word-wheel-game');

    authState.hasProfile = true;
    rerender(<WordWheelChallenge />);
    await screen.findByTestId('word-wheel-results');
    expect(readyMounts).toBe(0);
  });
});
