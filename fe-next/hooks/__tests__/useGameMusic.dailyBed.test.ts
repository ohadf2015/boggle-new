import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameMusic } from '../useGameMusic';
import * as MusicContextModule from '@/contexts/MusicContext';

vi.mock('@/contexts/MusicContext');

const TRACKS = {
  LOBBY: 'lobby', BEFORE_GAME: 'beforeGame', IN_GAME: 'inGame', ALMOST_OUT_OF_TIME: 'almostOutOfTime',
  BOSSA_ARCADE: 'bossaArcade', BOSSA: 'bossa', BLAST: 'blast', DAILY: 'daily', BOSS: 'boss',
} as const;

describe('useGameMusic: fire-round bed override', () => {
  const fadeToTrack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(MusicContextModule, 'useMusic').mockReturnValue({
      currentTrack: null, volume: 0.5, isMuted: false, isPlaying: false, audioUnlocked: true,
      playTrack: vi.fn(), stopMusic: vi.fn(), fadeToTrack, setVolume: vi.fn(), toggleMute: vi.fn(),
      unlockAudio: vi.fn(), preloadMusicTrack: vi.fn(), TRACKS,
    });
  });

  const run = (extra: Record<string, unknown>) =>
    renderHook(() => useGameMusic({
      phase: 'playing', remainingTime: null, totalTime: 180, isPaused: false, enabled: true,
      earthquakeState: 'fire-round', ...extra,
    }));

  it('plays the daily bed when the caller asks for it', () => {
    run({ fireRoundBed: 'daily' });
    expect(fadeToTrack).toHaveBeenCalledWith('daily', 800, 800);
    expect(fadeToTrack).not.toHaveBeenCalledWith('bossaArcade', 800, 800);
  });

  it('keeps bossa-arcade for every other fire-round caller', () => {
    run({});
    expect(fadeToTrack).toHaveBeenCalledWith('bossaArcade', 800, 800);
  });
});
