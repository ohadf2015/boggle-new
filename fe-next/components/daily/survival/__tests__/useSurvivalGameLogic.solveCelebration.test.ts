/**
 * useSurvivalGameLogic — solving the target plays its celebration on the board
 * before the results screen takes over. Before this, onComplete fired in the
 * same tick as the win, so the confetti / "GENIUS" moment never rendered.
 */

import { renderHook, act } from '@testing-library/react';
import { useSurvivalGameLogic } from '../useSurvivalGameLogic';
import * as MusicContextModule from '@/contexts/MusicContext';
import * as GameMusicModule from '@/hooks/useGameMusic';
import { SOLVE_CELEBRATION_MS } from '../constants';

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

describe('useSurvivalGameLogic - solve celebration', () => {
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

  it('Given the target is guessed, When the game ends, Then results wait for the celebration and the solve is announced', async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useSurvivalGameLogic({ ...baseProps, onComplete } as any));

    await act(async () => { result.current[1].handleWordSubmit('TEST'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(result.current[0].isGameOver).toBe(true);
    expect(result.current[0].feedbackType).toBe('target-found');
    expect(onComplete).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(SOLVE_CELEBRATION_MS); });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ solved: true });
  });

  it('Given life runs out, When the game ends, Then results open straight away', async () => {
    const onComplete = vi.fn();
    renderHook(() => useSurvivalGameLogic({ ...baseProps, onComplete } as any));
    await act(async () => { await vi.advanceTimersByTimeAsync(100_000); });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ solved: false });
  });
});
