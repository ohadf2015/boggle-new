/**
 * useSurvivalGameLogic — no auto-win on allPositionsRevealed.
 *
 * Even if every target position has a green clue, the game must NOT complete
 * automatically. The player has to submit the target word on the board.
 */

import { renderHook } from '@testing-library/react';
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

// Force allPositionsRevealed=true from the very first render so the (now
// removed) auto-win effect would fire immediately if the regression returns.
vi.mock('../useSurvivalClues', () => ({
  useSurvivalClues: () => [
    {
      accumulatedClues: new Map(),
      knownLetters: new Set<string>(),
      isClueGaining: false,
      allPositionsRevealed: true,
    },
    {
      updateCluesFromFeedback: vi.fn(),
      updateCluesFromDiscovery: vi.fn(() => 0),
      updateKnownLettersFromDiscovery: vi.fn(),
      triggerClueGainAnimation: vi.fn(),
      handleCoinRevealedLetter: vi.fn(),
    },
  ],
}));

describe('useSurvivalGameLogic — no auto-win on allPositionsRevealed', () => {
  const baseProps = {
    grid: Array(3).fill(null).map(() => Array(3).fill('A')),
    puzzleNumber: 1,
    language: 'en' as const,
    targetWord: 'TEST',
    t: (key: string) => key,
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('does NOT call onComplete when all target positions are revealed via clues', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useSurvivalGameLogic({ ...baseProps, onComplete } as any),
    );

    expect(onComplete).not.toHaveBeenCalled();
    expect(result.current[0].isGameOver).toBe(false);
    expect(result.current[0].hasWon).toBe(false);
  });
});
