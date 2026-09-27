/**
 * Cozy / Calm Mode: the "almost out of time" urgent-music ramp is a panic cue.
 * Calm Mode keeps the in-game bed but never escalates to the urgent track.
 * Reward-neutral — music doesn't change how many words the player finds.
 */
import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameMusic } from '../useGameMusic';

const fades: string[] = [];

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    fadeToTrack: vi.fn((trackKey: string) => { fades.push(trackKey); }),
    playTrack: vi.fn(),
    TRACKS: {
      LOBBY: 'lobby',
      BEFORE_GAME: 'beforeGame',
      IN_GAME: 'inGame',
      ALMOST_OUT_OF_TIME: 'almostOutOfTime',
      BOSSA_ARCADE: 'bossaArcade',
      BOSSA: 'bossa',
    },
  }),
}));

describe('useGameMusic — cosy urgent-music suppression', () => {
  beforeEach(() => {
    fades.length = 0;
  });

  it('ramps to the urgent track when below threshold by default', () => {
    renderHook(() =>
      useGameMusic({ phase: 'playing', remainingTime: 100, totalTime: 180, isPaused: false, enabled: true }),
    );
    expect(fades).toContain('almostOutOfTime');
  });

  it('does NOT ramp to the urgent track when suppressUrgentMusic is true (cosy)', () => {
    renderHook(() =>
      useGameMusic({
        phase: 'playing', remainingTime: 100, totalTime: 180, isPaused: false, enabled: true,
        suppressUrgentMusic: true,
      }),
    );
    expect(fades).not.toContain('almostOutOfTime');
  });
});
