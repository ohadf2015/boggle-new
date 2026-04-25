/**
 * useSurvivalGameLogic — deferGameOver + restoreLife action
 * Backs the rewarded-ad extra-life flow: while a modal offering an ad is open,
 * suppress the life-zero game-over effect so the reducer can be restored mid-flight.
 */

import { renderHook, act } from '@testing-library/react';
import { useSurvivalGameLogic } from '../useSurvivalGameLogic';
import * as MusicContextModule from '@/contexts/MusicContext';
import * as GameMusicModule from '@/hooks/useGameMusic';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAuthenticated: false }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));
vi.mock('@/contexts/MusicContext');
vi.mock('@/hooks/useGameMusic');
vi.mock('@/utils/gameLogger', () => ({
  logGameStart: vi.fn(async () => null),
  logGameEnd: vi.fn(async () => undefined),
  formatWordsForLogging: vi.fn(() => []),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGameEnd: vi.fn(), trackGameStart: vi.fn() }));
vi.mock('@/utils/trainingProgressStorage', () => ({
  isNewDailyPlayer: () => false,
  incrementDailyChallengesCompleted: vi.fn(),
}));

describe('useSurvivalGameLogic - extra life', () => {
  const baseProps = {
    grid: Array(3).fill(null).map(() => Array(3).fill('A')),
    puzzleNumber: 1,
    language: 'en' as const,
    targetWord: 'TEST',
    t: (key: string) => key,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(MusicContextModule, 'useMusic').mockReturnValue({
      currentTrack: null, volume: 0.5, isMuted: false, isPlaying: false,
      audioUnlocked: false, playTrack: vi.fn(), stopMusic: vi.fn(),
      fadeToTrack: vi.fn(), setVolume: vi.fn(), toggleMute: vi.fn(),
      unlockAudio: vi.fn(), preloadMusicTrack: vi.fn(),
      TRACKS: { LOBBY: 'lobby', BEFORE_GAME: 'beforeGame', IN_GAME: 'inGame',
        ALMOST_OUT_OF_TIME: 'almostOutOfTime', BOSSA_ARCADE: 'bossaArcade', BOSSA: 'bossa' },
    } as any);
    vi.spyOn(GameMusicModule, 'useGameMusic').mockImplementation(
      vi.fn(() => ({ resetUrgentMusic: vi.fn() })) as any
    );
  });

  afterEach(() => { vi.useRealTimers(); });

  it('suppresses game-over while deferGameOver=true, then fires when flag flips', () => {
    const onComplete = vi.fn();
    const { rerender } = renderHook(
      ({ defer }: { defer: boolean }) =>
        useSurvivalGameLogic({ ...baseProps, onComplete, deferGameOver: defer } as any),
      { initialProps: { defer: true } },
    );

    // Drain until life hits zero (drain 1.2/s × 100s > 100 HP).
    act(() => { vi.advanceTimersByTime(100_000); });

    expect(onComplete).not.toHaveBeenCalled();

    rerender({ defer: false });
    act(() => { vi.advanceTimersByTime(0); });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ solved: false });
  });

  it('keeps isGameOver=false while deferGameOver=true despite lifePoints hitting zero', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useSurvivalGameLogic({ ...baseProps, onComplete, deferGameOver: true } as any)
    );

    act(() => { vi.advanceTimersByTime(100_000); });

    expect(result.current[0].lifePoints).toBe(0);
    expect(result.current[0].isGameOver).toBe(false);
    expect(result.current[0].hasWon).toBe(false);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('fires game-over when deferGameOver is false (default) and lifePoints hit zero', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useSurvivalGameLogic({ ...baseProps, onComplete } as any)
    );

    act(() => { vi.advanceTimersByTime(100_000); });

    expect(result.current[0].isGameOver).toBe(true);
    expect(result.current[0].hasWon).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ solved: false });
  });

  it('restoreLife action resets lifePoints and keeps the game alive', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useSurvivalGameLogic({ ...baseProps, onComplete, deferGameOver: true } as any)
    );

    act(() => { vi.advanceTimersByTime(100_000); });
    expect(result.current[0].lifePoints).toBe(0);

    act(() => { (result.current[1] as any).restoreLife(50); });

    expect(result.current[0].lifePoints).toBe(50);
    expect(result.current[0].isGameOver).toBe(false);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
